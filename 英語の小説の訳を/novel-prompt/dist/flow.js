// ページ間の移動は同一ドキュメント内で行い、入力をメモリーに保持する。
// 個人情報はlocalStorage/sessionStorage/履歴のstateへ書き込まない。
const flowMain=document.querySelector('main');
const flowForm=document.querySelector('form');
const flowResult=document.querySelector('.result');
const flowWorkspace=document.querySelector('.workspace');
const flowIntro=document.querySelector('.intro');
const flowNav=document.querySelector('.page-nav');
const topicLabel=topic==='skin'?'肌分析':'小説翻訳';
flowMain.classList.add('step-layout');
const levelPage=document.createElement('section');levelPage.className='level-page';
levelPage.innerHTML=`<h2>レベルを選択</h2><div class="level-options">${tiers.map(([id,label],i)=>`<a href="${topic}.html?level=${id}&step=input"><strong>${label}</strong><span>${topic==='skin'?['基本的な状態を入力','部位・経過・生活環境も入力','記録と撮影条件を含めて比較'][i]:['基礎から解説','文の構造と語感を解説','文体と細かなニュアンスを解説'][i]}</span></a>`).join('')}</div>`;
flowIntro.after(levelPage);
const stepBar=document.createElement('ol');stepBar.className='step-bar';stepBar.setAttribute('aria-label','作成手順');
stepBar.innerHTML='<li>1. レベル選択</li><li>2. 入力</li><li>3. プロンプト</li>';
flowNav.replaceChildren();const homeLink=document.createElement('a');homeLink.href='index.html';homeLink.textContent='← 用途を選ぶ';homeLink.className='flow-back';flowNav.append(homeLink,stepBar);
const inputActions=document.createElement('div');inputActions.className='step-actions';
const levelBack=document.createElement('button');levelBack.type='button';levelBack.className='secondary';levelBack.textContent='レベル選択へ';
const make=document.createElement('button');make.type='button';make.className='primary';make.textContent='プロンプトを生成';inputActions.append(levelBack,make);flowForm.append(inputActions);
const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='入力内容を修正';flowResult.querySelector('.actions').prepend(edit);
const flowStatus=document.querySelector('#status');flowWorkspace.after(flowStatus);
const badge=flowResult.querySelector('.badge');if(badge)badge.remove();
const source=document.querySelector('.source-note');
let ready=false;
function showStep(step,push=false){
 if(!['level','input','result'].includes(step))step='level';
 if(step==='result'&&!ready)step='input';
 const url=new URL(location.href);url.searchParams.set('step',step);url.searchParams.set('level',tier);
 if(push)history.pushState(null,'',url);else history.replaceState(null,'',url);
 flowMain.dataset.step=step;
 levelPage.hidden=step!=='level';flowWorkspace.hidden=step==='level';flowForm.hidden=step!=='input';flowResult.hidden=step!=='result';
 if(source)source.hidden=step!=='input';
 flowIntro.querySelector('h1').textContent=topicLabel+'：'+{level:'レベル選択',input:'入力',result:'プロンプト'}[step];
 const introNote=flowIntro.querySelector('p:not(.eyebrow)');if(introNote){introNote.textContent=step==='level'?'':tiers.find(t=>t[0]===tier)[1];introNote.hidden=step==='level';}
 [...stepBar.children].forEach((li,i)=>{if(i===['level','input','result'].indexOf(step))li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
 document.title=topicLabel+'・'+{level:'レベル選択',input:'入力',result:'プロンプト'}[step]+' | プロンプト作成';
 flowStatus.textContent='';window.scrollTo(0,0);
 const heading=flowIntro.querySelector('h1');heading.tabIndex=-1;heading.focus({preventScroll:true});
}
levelBack.onclick=()=>showStep('level',true);
make.onclick=()=>{
 if(!flowForm.checkValidity()){
  const invalid=[...flowForm.elements].find(el=>el.willValidate&&!el.checkValidity());
  if(invalid){let parent=invalid.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}invalid.reportValidity();invalid.focus();}
  flowStatus.textContent='入力値を確認してください。';return;
 }
 flowForm.dispatchEvent(new Event('input'));ready=true;showStep('result',true);
};
edit.onclick=()=>showStep('input',true);
window.addEventListener('popstate',()=>showStep(new URLSearchParams(location.search).get('step')));
showStep(params.get('step')||'level');
