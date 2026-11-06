// Vpass credit-card statement format. No names, card numbers or raw files are stored.
export function readCsv(text){
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell||closed)throw Error('CSVの引用符が不正です');quoted=true;}
    else if(c===','||c==='\n'||c==='\r'){
      row.push(cell);cell='';closed=false;
      if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}
    }else{if(closed)throw Error('CSVの引用符の後に不正な文字があります');cell+=c;}
  }
  if(quoted)throw Error('CSVの引用符が閉じられていません');
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(v=>v.trim()));
}
export function decodeCsv(bytes){
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return new TextDecoder('shift_jis',{fatal:true}).decode(bytes);}
}
const norm=s=>String(s||'').normalize('NFKC').trim();
const money=s=>/^-?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(norm(s))?Number(norm(s).replaceAll(',','')):NaN;
export function parseStatementCsv(text){
  const lines=readCsv(text),records=[],occurrences=new Map();let cardKey='',headers=0,totals=0;
  for(const [index,raw]of lines.entries()){
    const r=raw.map(norm);
    if(r.length===3&&/^\d{4}[-*][\d*\-]+$/.test(r[1])&&/クレジット/.test(r[2])){cardKey=r[1]+'|'+r[2];headers++;continue;}
    if(r.length===7&&r.slice(0,5).every(v=>!v)&&Number.isSafeInteger(money(r[5]))&&!r[6]){totals++;continue;}
    const date=r[0]?.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if(!cardKey||r.length!==7||!date)throw Error(`${index+1}行目は対応していない形式です。三井住友カードのクレジット明細CSVを選んでください。`);
    const [,y,m,d]=date,amount=money(r[2]);
    if(+m<1||+m>12||+d<1||+d>new Date(Date.UTC(+y,+m,0)).getUTCDate()||!r[1]||!Number.isSafeInteger(amount)||!Number.isSafeInteger(money(r[5])))throw Error(`${index+1}行目の利用日・利用先・金額を確認できません。取り込みは行いません。`);
    const original=r[6].match(/^(-?[\d,]+(?:\.\d+)?)\s+([A-Z]{3})\s+/);
    const key=JSON.stringify([cardKey,...r]),occurrence=(occurrences.get(key)||0)+1;occurrences.set(key,occurrence);
    const reason=amount<=0?'返金・調整の明細です。減額の確認が必要です':r[3]!=='1'||r[4]!=='1'?'分割・リボ等の明細です。重複と利用総額の確認が必要です':null;
    records.push({csvKey:key+'|'+occurrence,source:'csv',mode:'credit',kind:'settlement',date:`${y}-${m}-${d}T00:00:00+09:00`,datePrecision:'day',month:`${y}-${m}`,merchant:r[1],currency:'JPY',amount:amount>0?amount:undefined,reportedAmount:amount,...(original?{originalCurrency:original[2],originalAmount:original[1].replaceAll(',','')}:{}),status:reason?'review':'accepted',reason:reason||'CSVの利用明細'});
  }
  if(!headers||!records.length)throw Error('利用明細がありません。対応形式は三井住友カードのクレジット明細CSVです。');
  return {records,summary:{count:records.length,total:records.filter(r=>r.status==='accepted').reduce((s,r)=>s+r.amount,0),skipped:headers+totals,months:[...new Set(records.map(r=>r.month))].sort()}};
}
export function csvCandidates(row,records){
  const merchant=s=>norm(s).toUpperCase().replace(/\s|[●◆◇]/g,'');
  return records.filter(r=>r.id!==row.id&&r.account===row.account&&r.status==='accepted'&&r.mode===row.mode&&r.date?.slice(0,10)===row.date?.slice(0,10)&&(r.amount===row.amount||merchant(r.merchant)&&merchant(r.merchant)===merchant(row.merchant))&&!row.csvDistinctAgainst?.includes(r.id)&&!r.csvDistinctAgainst?.includes(row.id));
}
export function prepareCsvImport(existing,incoming){
  const known=new Set(existing.map(r=>r.id));
  return incoming.filter(r=>!known.has(r.id)).map(row=>{
    const candidates=csvCandidates(row,existing);
    return row.status==='accepted'&&candidates.length?{...row,status:'review',csvDuplicate:true,reason:'同日の同額または同じ利用先の記録があります。重複を確認してください'}:row;
  });
}
// A later email must not silently add a second copy of a CSV expense.
export function guardCsvDuplicates(records){
  return records.map(row=>{
    if(row.source==='csv'||row.status!=='accepted')return row;
    const candidates=csvCandidates(row,records).filter(r=>r.source==='csv');
    return candidates.length?{...row,status:'review',csvDuplicate:true,reason:'CSVに同日の同額または同じ利用先の記録があります。重複を確認してください'}:row;
  });
}
