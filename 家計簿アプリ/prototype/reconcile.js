const merchantKey=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/^[◇◆]?\s*利用先\s*[:：]\s*/,'').replace(/\((?:買物|買い物)\)/g,'').replace(/\s+/g,'');
function sameTransaction(a,b){
  if(!a.account||a.account!==b.account||a.mode!==b.mode||!a.date||a.date.slice(0,10)!==b.date?.slice(0,10))return false;
  if(!merchantKey(a.merchant)||merchantKey(a.merchant)!==merchantKey(b.merchant))return false;
  // Never infer an exchange rate, or match on merchant/date/amount alone.
  if(a.reference&&b.reference)return a.reference===b.reference;
  return !!(a.approval&&a.approval===b.approval);
}
function eligible(a,b){
  if(!sameTransaction(a,b))return false;
  if(a.currency==='JPY') return a.reportedAmount>0&&a.reportedAmount===b.amount;
  return !!a.currency && a.originalAmount && Number(a.originalAmount)>0 && b.currency==='JPY';
}
export function resolveReview(row,target,method='manual'){
  if(row.status!=='review'||target.status!=='accepted'||row.account!==target.account||row.id===target.id)throw Error('同じデータ内の計上済み記録を選んでください');
  return {...row,status:'excluded',previousReason:row.reason,resolution:method,resolvedBy:target.id,
    reason:`別の記録で解決済み（${method==='auto'?'取引識別情報が一致':'確認済み'}）：${target.date.slice(0,10)} ${target.merchant} / ${target.amount.toLocaleString('ja-JP')}円`};
}
export function reconcileRecords(records){
  const rows=guardCsvDuplicates(records).map(r=>({...r}));
  // Re-check links, so missing or no-longer-counted targets do not hide unresolved mail.
  for(let i=0;i<rows.length;i++){
    const r=rows[i];if(!r.resolvedBy)continue;
    const target=rows.find(t=>t.id===r.resolvedBy&&t.account===r.account&&t.status==='accepted');
    if(!target||r.resolution==='auto'){
      const {resolvedBy,resolution,previousReason,...rest}=r;
      rows[i]={...rest,status:'review',reason:previousReason||'対応する計上済み記録を確認できません'};
    }
  }
  const accepted=rows.filter(r=>r.status==='accepted');
  const candidates=rows.filter(r=>r.status==='review'&&!r.autoResolveDisabled).map(row=>({row,matches:accepted.filter(t=>eligible(row,t))}));
  for(const {row,matches}of candidates){
    if(matches.length!==1)continue;
    const target=matches[0];
    if(candidates.filter(c=>c.matches.some(t=>t.id===target.id)).length!==1)continue;
    rows[rows.indexOf(row)]=resolveReview(row,target,'auto');
  }
  return rows;
}
import {guardCsvDuplicates} from './csv-import.js';
export function mergeRecords(existing,incoming){
  const byId=new Map(existing.map(r=>[r.id,r]));
  for(const r of incoming){const previous=byId.get(r.id);
    // Manual confirmation survives repeat imports. New parser versions refresh other records.
    if(previous?.resolution==='manual')continue;
    if(previous&&previous.status!=='review'&&(previous.parserVersion||0)>=(r.parserVersion||0))continue;
    byId.set(r.id,{...r,...(previous?.autoResolveDisabled?{autoResolveDisabled:true}:{}),...(previous?.csvDistinctAgainst?{csvDistinctAgainst:previous.csvDistinctAgainst}:{})});
  }
  return reconcileRecords([...byId.values()]);
}
