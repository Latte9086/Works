import {parseMail,samples,sumMonth,CREDIT,DEBIT,PARSER_VERSION} from './parser.js';
import {mergeRecords,reconcileRecords,resolveReview} from './reconcile.js';
import {createGmailClient,collectGmailMessages} from './gmail-client.js';
import {decodeCsv,parseStatementCsv,prepareCsvImport,csvCandidates} from './csv-import.js';
const $=id=>document.getElementById(id);
const yen=new Intl.NumberFormat('ja-JP');
const jstMonth=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).format(new Date());
let db,rows=[],settings={},tab='accepted',token=null,expires=0,busy=false;
let resolvingId=null,lastSyncAttempt=0,lastSyncFailed=false;
let csvPreview=null;
const scope='https://www.googleapis.com/auth/gmail.readonly';
function report(text,error=false){
  $('notice').textContent=text;$('notice').classList.toggle('error',error);
  const status=$('homeStatus');status.hidden=false;status.classList.toggle('error',error);
  status.textContent=error?text:text.startsWith('取得完了')?'最新の記録を取得しました。':text.includes('休止')?'取得制限のため、少し待って再試行します。':text;
  $('settingsStatus').textContent=text;$('settingsStatus').hidden=false;$('settingsStatus').classList.toggle('error',error);
  $('historyStatus').textContent=error?text:text.startsWith('取得完了')?'最新の記録を取得しました。':text;$('historyStatus').hidden=false;$('historyStatus').classList.toggle('error',error);
}
function navigatePage(page){if(location.hash!==`#${page}`)location.hash=page;else showPage();}
function showPage(){
  const requested=location.hash.slice(1).split('/'),page=['home','history','settings'].includes(requested[0])?requested[0]:'home';
  if(page==='history'&&['accepted','review','excluded'].includes(requested[1]))tab=requested[1];
  document.querySelectorAll('[data-page]').forEach(section=>section.hidden=section.dataset.page!==page);
  document.querySelectorAll('[data-nav]').forEach(link=>{if(link.dataset.nav===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  document.querySelectorAll('[data-tab]').forEach(button=>button.classList.toggle('active',button.dataset.tab===tab));
  document.title=`${({home:'ホーム',history:'履歴',settings:'設定'})[page]} — 家計簿`;
  render();window.scrollTo(0,0);$(`${page}Heading`).focus({preventScroll:true});
}
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
function done(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('保存が中断されました'));tx.onerror=()=>{};});}
async function saveSettings(){const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(settings,'config');await done(tx);}
async function reload(){rows=await req(db.transaction('rows').objectStore('rows').getAll());render();}
function account(){return settings.dataset==='gmail'?`gmail:${settings.email||''}`:settings.dataset==='csv'?'csv:local':'demo';}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function render(){
  const month=$('month').value,all=rows.filter(r=>r.account===account());
  const filtered=all.filter(r=>r.status==='accepted'?r.month===month:true);
  $('total').textContent=yen.format(sumMonth(all,month));
  $('count').textContent=`${filtered.filter(r=>r.status==='accepted').length}件の利用`;
  for(const status of ['accepted','review','excluded']) $(status+'Count').textContent=filtered.filter(r=>r.status===status).length;
  const list=$('list');list.replaceChildren();
  const shown=filtered.filter(r=>r.status===tab).sort((a,b)=>(b.date||b.importedAt).localeCompare(a.date||a.importedAt));
  if(!shown.length){const empty=el('div',undefined,'empty');empty.append(el('strong',tab==='accepted'?'まだ利用の記録がありません':tab==='review'?'確認が必要な通知はありません':'除外された通知はありません'),el('p',tab==='accepted'?'ホームで新着を取得すると、ここに表示されます。':'要確認・除外済みは表示月にかかわらず表示します。'));list.append(empty);}
  for(const r of shown){const row=el('article',undefined,'row');const detail=el('div',undefined,'row-text');detail.append(el('div',r.merchant||r.subject,'row-title'));const meta=el('div',r.status==='accepted'?`${r.date.slice(5,10).replace('-','/')} ${r.date.slice(11,16)}`:r.reason,'row-meta');if(r.mode)meta.append(el('span',r.mode==='credit'?'クレジット':'デビット','tag'));detail.append(meta);
    if(r.status==='review'){const button=el('button','ほかの記録で解決済み','resolve-button');button.disabled=busy;button.onclick=()=>openResolution(r);detail.append(button);}
    if(r.status==='review'&&r.csvDuplicate){const button=el('button','別の支出として計上','resolve-button');button.disabled=busy;button.onclick=()=>confirmDistinct(r).catch(e=>report(e.message,true));detail.append(button);}
    if(r.source==='csv')detail.append(el('span','CSV','tag'));
    if(r.resolvedBy){const button=el('button','要確認に戻す','resolve-button');button.disabled=busy;button.onclick=()=>restoreReview(r).catch(e=>report(e.message,true));detail.append(button);}
    row.append(detail,el('div',r.status==='accepted'?`¥${yen.format(r.amount)}`:'集計対象外','row-amount'));list.append(row);}
  $('connectionLabel').textContent=token?'Gmail 接続中':settings.email?'Gmail 再接続が必要':'Gmail 未接続';
  $('lastSync').textContent=settings.lastSync?`最終取得 ${new Date(settings.lastSync).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}`:'まだ取得していません';
  $('sync').textContent=busy?'取得中…':token?'新着を取得':'Gmailを接続';$('sync').disabled=busy;
  $('dataset').value=settings.dataset||'demo';
  $('demoHint').hidden=settings.dataset!=='demo';$('historyMonth').value=month;
  $('csvPreviewButton').disabled=busy;$('confirmCsvImport').disabled=busy;
}
async function confirmDistinct(row){
  if(!confirm('同日・同額の記録とは別の支出であることを確認しましたか？ 合計に加算します。'))return;
  await updateRecord(row.id,(current,all)=>({...current,status:'accepted',csvDistinctAgainst:[...new Set([...(current.csvDistinctAgainst||[]),...csvCandidates(current,all).map(r=>r.id)])],reason:'別の支出であることを確認済み'}));report('別の支出として計上しました。');
}
async function writeRows(incoming){
  const tx=db.transaction('rows','readwrite'),store=tx.objectStore('rows'),read=store.getAll();
  read.onsuccess=()=>{for(const r of mergeRecords(read.result,incoming))store.put(r);};
  await done(tx);await reload();
}
async function previewCsv(){
  if(busy)return;csvPreview=null;
  const file=$('csvFile').files[0];if(!file)throw Error('CSVファイルを選んでください。');
  if(file.size>5*1024*1024)throw Error('CSVは5MB以下のファイルを選んでください。');
  const {records,summary}=parseStatementCsv(decodeCsv(await file.arrayBuffer()));
  const acct=settings.email?`gmail:${settings.email}`:'csv:local';
  const incoming=await Promise.all(records.map(async({csvKey,...r})=>{
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(csvKey));
    return {...r,id:'csv:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),account:acct,importedAt:new Date().toISOString()};
  }));
  const fresh=prepareCsvImport(rows,incoming);csvPreview={incoming,fresh,summary,acct};
  $('csvSummary').textContent=`対象月 ${summary.months.join('、')} / 利用 ${summary.count}件。新規の支出 ${fresh.filter(r=>r.status==='accepted').length}件・${yen.format(fresh.filter(r=>r.status==='accepted').reduce((s,r)=>s+r.amount,0))}円、要確認 ${fresh.filter(r=>r.status==='review').length}件、取り込み済み ${incoming.length-fresh.length}件。合計行・名義行は集計しません。`;
  $('csvTarget').textContent=settings.email?`保存先：${settings.email} の利用記録`:'保存先：この端末のCSV記録。今後Gmailに接続すると、同じ利用者の記録としてまとめます。';
  $('csvImportDialog').showModal();
}
async function importCsv(){
  if(busy||!csvPreview)return;
  const preview=csvPreview;busy=true;render();
  try{
    // Recompute after preview in case another import or Gmail sync changed the data.
    await reload();const fresh=prepareCsvImport(rows,preview.incoming);
    await writeRows(fresh);settings.dataset=preview.acct==='csv:local'?'csv':'gmail';settings.linkCsv=true;await saveSettings();
    $('month').value=preview.summary.months.at(-1);$('csvImportDialog').close();csvPreview=null;$('csvFile').value='';navigatePage('home');
    report(`CSV取り込み完了：新規 ${fresh.length}件。重複候補・返金等は要確認に残しています。`);
  }finally{busy=false;render();}
}
async function ingest(mails,acct){
  // Parse before opening a transaction: all writes and processed IDs commit together.
  const incoming=mails.map(m=>({id:`${acct}:${m.id}`,account:acct,subject:m.subject,...parseMail(m),parserVersion:PARSER_VERSION,importedAt:new Date().toISOString()}));
  const tx=db.transaction('rows','readwrite'),store=tx.objectStore('rows');
  let summary='';
  const get=store.getAll();get.onsuccess=()=>{
    const existing=get.result,merged=mergeRecords(existing,incoming),oldById=new Map(existing.map(r=>[r.id,r]));
    for(const r of merged)store.put(r);
    const processed=incoming.filter(r=>{const old=oldById.get(r.id);return !old||old.status==='review'||(old.parserVersion||0)<PARSER_VERSION;});
    const final=new Map(merged.map(r=>[r.id,r]));
    summary=`支出 ${processed.filter(r=>final.get(r.id).status==='accepted').length}件 / 除外 ${processed.filter(r=>final.get(r.id).status==='excluded').length}件 / 要確認 ${processed.filter(r=>final.get(r.id).status==='review').length}件 / 取り込み済み ${incoming.length-processed.length}件`;
  };
  await done(tx);await reload();return summary;
}
async function updateRecord(id,change){
  if(busy)throw Error('取り込みが完了してから操作してください');
  const tx=db.transaction('rows','readwrite'),store=tx.objectStore('rows');const read=store.getAll();
  read.onsuccess=()=>{try{const all=read.result,current=all.find(r=>r.id===id);if(!current)throw Error('通知が見つかりません');const updated=change(current,all);for(const r of reconcileRecords(all.map(r=>r.id===id?updated:r)))store.put(r);}catch(e){report(e.message,true);tx.abort();}};
  await done(tx);await reload();
}
function openResolution(row){
  resolvingId=row.id;$('resolutionInfo').textContent=`${row.merchant||row.subject}：${row.reason}`;
  $('resolutionTarget').replaceChildren(el('option','反映済みの記録を選ぶ'));$('resolutionTarget').firstElementChild.value='';
  for(const r of rows.filter(r=>r.account===row.account&&r.status==='accepted').sort((a,b)=>b.date.localeCompare(a.date))){const option=el('option',`${r.date.slice(0,10)} ${r.merchant} / ${yen.format(r.amount)}円`);option.value=r.id;$('resolutionTarget').append(option);}
  $('resolutionChecked').checked=false;$('resolution').showModal();
}
async function restoreReview(row){
  await updateRecord(row.id,current=>{const {resolvedBy,resolution,previousReason,...rest}=current;return {...rest,status:'review',reason:previousReason||'解決済みの判定を取り消しました',autoResolveDisabled:true};});report('要確認に戻しました。自動で再除外はしません。');
}
function decode(data){return new TextDecoder().decode(Uint8Array.from(atob(data.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));}
function bodyOf(payload){
  const plain=[],html=[];
  function walk(p){if(p.body?.data){if(p.mimeType==='text/plain')plain.push(decode(p.body.data));else if(p.mimeType==='text/html')html.push(decode(p.body.data));}for(const child of p.parts||[])walk(child);}
  walk(payload);if(plain.length)return plain.join('\n');
  const doc=new DOMParser().parseFromString(html.join('\n'),'text/html');doc.querySelectorAll('script,style').forEach(e=>e.remove());doc.querySelectorAll('br').forEach(e=>e.replaceWith('\n'));doc.querySelectorAll('div,p,tr,td,table').forEach(e=>e.append('\n'));return doc.body.textContent||'';
}
const api=createGmailClient({getToken:()=>token,onAuthError:()=>{token=null;},onWait:(seconds,error)=>report(`Gmailの取得を${seconds}秒休止し、自動で再試行します（${error.reason}）。取得済みの通知は順次保存します。`)});
async function sync(){
  if(busy)return;if(!token||Date.now()>=expires){token=null;render();report('Gmailへの接続が必要です。接続ボタンを押してください。');return;}
  busy=true;lastSyncAttempt=Date.now();lastSyncFailed=false;render();let fetched=0;try{
    const profile=await api('profile');
    if(settings.linkCsv&&rows.some(r=>r.account==='csv:local')){
      const tx=db.transaction('rows','readwrite'),store=tx.objectStore('rows'),read=store.getAll();
      read.onsuccess=()=>{const moved=read.result.map(r=>r.account==='csv:local'?{...r,account:`gmail:${profile.emailAddress}`}:r);for(const r of reconcileRecords(moved))store.put(r);};
      await done(tx);await reload();
    }
    settings.email=profile.emailAddress;settings.dataset='gmail';await saveSettings();
    const acct=`gmail:${profile.emailAddress}`,known=new Set(rows.filter(r=>r.account===acct&&(r.parserVersion||0)>=PARSER_VERSION).map(r=>r.id));
    await collectGmailMessages({api,query:`{from:${CREDIT} from:${DEBIT}} after:${settings.since.replaceAll('-','/')}`,isKnown:id=>known.has(`${acct}:${id}`),
      decodeMessage:msg=>{const headers=msg.payload.headers||[],header=n=>headers.find(h=>h.name.toLowerCase()===n)?.value||'';return {id:msg.id,from:header('from'),subject:header('subject'),body:bodyOf(msg.payload)};},
      commit:async mails=>{await ingest(mails,acct);for(const mail of mails)known.add(`${acct}:${mail.id}`);},
      onProgress:count=>{fetched=count;report(`通知を取得中… ${count}件。まとめて再解析する場合は数分かかります。`);}});
    // Reconcile stored reviews even when there are no new messages.
    await ingest([],acct);settings.lastSync=new Date().toISOString();await saveSettings();
    const all=rows.filter(r=>r.account===acct);report(`取得完了：${fetched}件を取得・保存。全期間の記録：支出 ${all.filter(r=>r.status==='accepted').length}件 / 除外 ${all.filter(r=>r.status==='excluded').length}件 / 要確認 ${all.filter(r=>r.status==='review').length}件。`);
  }catch(e){lastSyncFailed=true;report(`${e.message} 保存できた記録は保持しています。再取得すると未処理分から続けます。`,true);}finally{busy=false;render();}
}
let gisPromise;
function loadGoogle(){return gisPromise||=(new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>{gisPromise=null;reject(Error('Google認証を読み込めません。通信を確認してください。'));};document.head.append(s);}));}
function authorize(){
  if(!settings.clientId){navigatePage('settings');report('先にGoogle OAuthクライアントIDを設定してください。');return;}
  if(!globalThis.google?.accounts?.oauth2){report('Google認証を準備中です。数秒後にもう一度接続してください。');loadGoogle().catch(e=>report(e.message,true));return;}
  google.accounts.oauth2.initTokenClient({client_id:settings.clientId,scope,callback:r=>{if(r.error){report(`Google接続に失敗しました：${r.error}`,true);return;}if(!google.accounts.oauth2.hasGrantedAllScopes(r,scope)){report('メール読み取り権限が必要です。',true);return;}token=r.access_token;expires=Date.now()+Number(r.expires_in)*1000;sync();},error_callback:()=>report('接続が完了しませんでした。再度お試しください。',true)}).requestAccessToken();
}
function action(id,fn){$(id).addEventListener('click',()=>Promise.resolve().then(fn).catch(e=>report(e.message,true)));}
async function init(){
  const open=indexedDB.open('monthly-spend-prototype',1);open.onupgradeneeded=()=>{open.result.createObjectStore('rows',{keyPath:'id'});open.result.createObjectStore('settings');};db=await req(open);
  settings=await req(db.transaction('settings').objectStore('settings').get('config'))||{dataset:'demo',since:'2026-10-01'};
  $('month').value=jstMonth();$('since').value=settings.since;$('clientId').value=settings.clientId||'';await reload();
  $('month').onchange=render;$('historyMonth').onchange=()=>{$('month').value=$('historyMonth').value;render();};
  window.addEventListener('hashchange',showPage);showPage();
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;navigatePage(`history/${tab}`);});
  action('pasteButton',()=>$('paste').showModal());
  action('sample',async()=>{settings.dataset='demo';$('month').value='2026-11';await saveSettings();report(await ingest(samples,'demo'));});
  action('saveSettings',async()=>{const id=$('clientId').value.trim(),since=$('since').value;if(!since||id&&!id.endsWith('.apps.googleusercontent.com'))throw Error('クライアントIDと開始日を確認してください。');if(settings.clientId!==id){token=null;expires=0;}settings.clientId=id;settings.since=since;await saveSettings();navigatePage('home');report('設定を保存しました。');render();if(id)loadGoogle().catch(e=>report(e.message,true));});
  action('sync',()=>token&&Date.now()<expires?sync():authorize());
  action('csvPreviewButton',previewCsv);action('confirmCsvImport',importCsv);
  action('confirmResolution',async()=>{if(!$('resolutionChecked').checked||!$('resolutionTarget').value)throw Error('反映済みの記録を選び、確認欄にチェックしてください');
    const targetId=$('resolutionTarget').value;await updateRecord(resolvingId,(current,all)=>resolveReview(current,all.find(r=>r.id===targetId)||{}));$('resolution').close();report('解決済みの通知を除外済みに移しました。支出合計は変わりません。');});
  $('dataset').onchange=async()=>{try{settings.dataset=$('dataset').value;await saveSettings();render();}catch(e){report(e.message,true);}};
  action('importPaste',async()=>{const body=$('body').value;if(!body.trim())throw Error('メール本文を入力してください。');const mail={from:$('from').value,subject:$('subject').value,body};const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(mail)));mail.id='paste-'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');settings.dataset='demo';await saveSettings();report(await ingest([mail],'demo'));$('paste').close();});
  action('export',()=>{const blob=new Blob([JSON.stringify({version:1,records:rows},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='monthly-spend-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  action('reset',async()=>{if(!confirm('このブラウザに保存した全記録を削除します。よろしいですか？'))return;const tx=db.transaction('rows','readwrite');tx.objectStore('rows').clear();await done(tx);delete settings.lastSync;await saveSettings();await reload();report('記録を削除しました。次回取得時に再取り込みできます。');navigatePage('home');});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&token&&Date.now()<expires&&!lastSyncFailed&&Date.now()-lastSyncAttempt>60000)sync();});
  if(settings.clientId)loadGoogle().catch(e=>report(e.message,true));
}init().catch(e=>{report(`初期化できません：${e.message}。ブラウザの保存領域を確認してください。`,true);document.querySelectorAll('button').forEach(b=>b.disabled=true);});
