export const CREDIT='statement@vpass.ne.jp', DEBIT='smbc-debit@smbc-card.com';
export const PARSER_VERSION=3;
const normal = s => String(s||'').normalize('NFKC').replace(/\r/g,'');
export function parseMail(mail) {
  const subject=normal(mail.subject).replace(/\s/g,'');
  const body=normal(mail.body);
  const from=normal(mail.from).toLowerCase();
  const address=(from.match(/<([^>]+)>/)?.[1]||from).trim();
  const review=reason=>({status:'review',reason});
  if (![CREDIT,DEBIT].includes(address)) return review('対応していない送信元です');
  if (subject==='カードがご利用いただけませんでした【三井住友カード】')
    return {status:'excluded',reason:'利用不可のため支出に含めません'};
  if (address===CREDIT && ['お支払い金額のお知らせ','一定金額到達のお知らせ【三井住友カード】'].includes(subject))
    return {status:'excluded',reason:'請求額・累計額のお知らせのため、個別の支出には加算しません'};
  const kind=subject==='ご利用明細のお知らせ【三井住友カード】'?'settlement':'authorization';
  if (!['ご利用のお知らせ【三井住友カード】','ご利用明細のお知らせ【三井住友カード】'].includes(subject)) return review('未対応の通知形式です（取消・変更の可能性）');
  // Only inspect the transaction portion: the footer itself mentions amount changes.
  const block=body.split(/※|本メール|ご利用にお心当たり|身に覚えのない利用通知/)[0];
  if (/取消|取り消|返金|変更|差額|キャンセル/.test(block)) return review('取消・返金・金額変更の確認が必要です');
  const mode=address===DEBIT && /デビットモード/.test(block)?'debit':address===CREDIT && /Olive\s*[/／]\s*クレジット/i.test(block.replace(/\s/g,''))?'credit':null;
  if (!mode) return review('支払いモードを確認できません');
  const date=block.match(/(?:ご利用日時|利用日)\s*[:：]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[ \t]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(!date) return review('利用日時を確認できません');
  const [,y,m,d,h='00',min='00',sec='00']=date;
  const stamp=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${h.padStart(2,'0')}:${min}:${sec}+09:00`;
  const parsed=new Date(stamp);
  if (!Number.isFinite(+parsed) || +m<1 || +m>12 || +d<1 || +d>new Date(Date.UTC(+y,+m,0)).getUTCDate() || +h>23 || +min>59 || +sec>59) return review('利用日時が不正です');
  const transaction=block.slice((date.index||0)+date[0].length);
  const merchant=mode==='debit'?block.match(/利用先\s*[:：]\s*([^\n]+)/)?.[1]?.trim():transaction.split(/\n/).map(x=>x.trim()).find(x=>x && !/^-?[\d,]+(?:\.\d+)?\s*(?:円|[A-Z]{3})$/i.test(x))?.replace(/\s+-?[\d,]+(?:\.\d+)?\s*(?:円|[A-Z]{3}).*$/i,'').replace(/^[◇◆]?\s*利用先\s*[:：]\s*/,'').trim();
  const context={mode,kind,date:stamp,month:stamp.slice(0,7),datePrecision:date[4]?'time':'day',merchant,
    approval:block.match(/承認番号\s*[:：]\s*(\d+)/)?.[1]||null,
    reference:block.match(/(?:取引番号|取引ID|照会番号)\s*[:：]\s*([A-Za-z0-9-]+)/i)?.[1]||null};
  const pending=reason=>({...context,status:'review',reason});
  const moneyText=mode==='debit'?transaction.match(/利用金額\s*[:：]\s*([^\n]+)/)?.[1]||'':transaction;
  const amounts=[...moneyText.matchAll(/(?:^|[\s:：])(-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(円|[A-Z]{3})(?=$|\s)/gim)];
  const yenAmounts=amounts.filter(m=>m[2]==='円'||m[2].toUpperCase()==='JPY');
  if (!yenAmounts.length && amounts.length===1) return {...pending('円換算待ち：カード会社の日本円額が必要です'),currency:amounts[0][2].toUpperCase(),originalAmount:amounts[0][1].replace(/,/g,'')};
  if (yenAmounts.length>1) return pending('日本円の金額が複数あるため確認が必要です');
  const money=yenAmounts[0];
  const amount=money?Number(money[1].replace(/,/g,'')):NaN;
  if (Number.isFinite(amount) && !Number.isInteger(amount)) return pending('日本円額に端数があります。請求額の確認が必要です');
  if (Number.isSafeInteger(amount)&&amount<0) return {...pending('返金・調整の通知です。反映済みの記録と照合してください'),currency:'JPY',originalAmount:String(amount)};
  if (!Number.isSafeInteger(amount)||amount<=0) return pending('金額を確認できません');
  if (!merchant) return review('利用先を確認できません');
  if(kind==='settlement')return {...context,status:'review',reason:'利用明細です。利用時の通知との重複を確認してください',currency:'JPY',reportedAmount:amount};
  return {...context,status:'accepted',currency:'JPY',amount};
}
export const samples=[
 {id:'sample-credit',from:CREDIT,subject:'ご利用のお知らせ【三井住友カード】',body:'Olive／クレジットについてカードの利用内容をお知らせします。\nご利用日時：2026/11/04 19:53\nAMAZON CO JP（買物）\n786円\n本メールは承認照会に基づく通知です。'},
 {id:'sample-debit',from:DEBIT,subject:'ご利用のお知らせ【三井住友カード】',body:'カードご利用内容（デビットモード）をお知らせいたします。\n◇利用日 ：2026/11/05 09:57:36\n◇利用先 ：STARBUCKS COFFEE JAPAN\n◇利用金額：1,000円\n◇承認番号：123456\n※金額が変更となる場合は再度メールにてご連絡します。'},
 {id:'sample-declined',from:CREDIT,subject:'カードがご利用いただけませんでした【三井住友カード】',body:'カードがご利用いただけませんでした\n利用金額 1,000円\n利用日 2026/11/05 09:56\nご利用カード Olive／クレジット'}
];
export function sumMonth(rows,month){return rows.filter(r=>r.status==='accepted'&&r.month===month).reduce((sum,r)=>sum+r.amount,0);}
