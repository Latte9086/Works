export function explainGmailError(status,payload={}){
  const error=payload.error||{};
  const reason=error.errors?.[0]?.reason||error.details?.find(d=>d.reason)?.reason||error.status||'unknown';
  const retryable=status===429||[500,502,503,504].includes(status)||(status===403&&['userRateLimitExceeded','rateLimitExceeded','RATE_LIMIT_EXCEEDED'].includes(reason));
  const auth=status===401||['insufficientPermissions','ACCESS_TOKEN_SCOPE_INSUFFICIENT','authError'].includes(reason);
  let message=auth?'Gmailの読み取り許可を確認して再接続してください。':retryable?'Gmailの取得制限または一時エラーです。時間を置いて再取得できます。':['dailyLimitExceeded','quotaExceeded','RESOURCE_EXHAUSTED'].includes(reason)?'Gmailの利用上限です。Google Cloudの割り当てを確認してください。':['accessNotConfigured','SERVICE_DISABLED'].includes(reason)?'このクライアントのGoogle CloudプロジェクトでGmail APIを有効にしてください。':'Gmailが取得を拒否しました。Google側のエラー詳細を確認してください。';
  const detail=String(error.message||'').slice(0,350);
  return {status,reason,retryable,auth,message:`${message}（${status} / ${reason}）${detail?' '+detail:''}`};
}
export function createGmailClient({getToken,onAuthError=()=>{},onWait=()=>{},fetchFn=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,minInterval=850}){
  let lastStarted=-Infinity;
  return async function request(resource,params={}){
    const url=new URL('https://gmail.googleapis.com/gmail/v1/users/me/'+resource);for(const [k,v]of Object.entries(params))url.searchParams.set(k,v);
    for(let attempt=0;attempt<4;attempt++){
      const delay=Math.max(0,lastStarted+minInterval-now());if(delay)await sleep(delay);
      const token=getToken();if(!token)throw Error('Gmailへの再接続が必要です。');lastStarted=now();
      const response=await fetchFn(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
      if(response.ok)return response.json();
      const error=explainGmailError(response.status,await response.json().catch(()=>({})));
      if(error.auth)onAuthError();
      if(!error.retryable||attempt===3)throw Object.assign(Error(error.message),error);
      const retryAfter=response.headers.get('Retry-After');
      const requested=retryAfter?(Number.isFinite(Number(retryAfter))?Number(retryAfter)*1000:Date.parse(retryAfter)-now()):0;
      const backoff=Math.max(15000*2**attempt,Number.isFinite(requested)?requested:0);
      // Long server-specified waits are reported instead of retrying prematurely.
      if(backoff>60000)throw Object.assign(Error(error.message+' 1分以上待ってから再取得してください。'),error);
      onWait(Math.ceil(backoff/1000),error);await sleep(backoff);
    }
  };
}
export async function collectGmailMessages({api,query,isKnown,decodeMessage,commit,onProgress=()=>{}}){
  let pending=[],fetched=0,pageToken;
  const seen=new Set();
  async function flush(){if(!pending.length)return;const batch=pending;pending=[];await commit(batch);}
  try{
    do{
      const page=await api('messages',{q:query,maxResults:'100',...(pageToken?{pageToken}:{})});
      for(const item of page.messages||[]){
        if(seen.has(item.id)||isKnown(item.id))continue;
        seen.add(item.id);
        let msg;try{msg=await api('messages/'+item.id,{format:'full'});}catch(e){if(e.status===404)continue;throw e;}
        pending.push(decodeMessage(msg));fetched++;onProgress(fetched);
        if(pending.length>=10)await flush();
      }
      await flush();pageToken=page.nextPageToken;
    }while(pageToken);
  }catch(e){await flush();throw e;}
  return fetched;
}
