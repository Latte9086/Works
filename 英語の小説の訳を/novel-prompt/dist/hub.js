const tiers=[['beginner','初心者','まずは基本から'],['intermediate','中級者','観察と理解を深める'],['advanced','上級者','詳しく記録・比較する']];
const params=new URLSearchParams(location.search);const tier=tiers.some(t=>t[0]===params.get('level'))?params.get('level'):'beginner';
const topic=/\/skin(?:\.html)?\/?$/.test(location.pathname)?'skin':'novel';
const nav=document.createElement('nav');nav.className='page-nav';nav.setAttribute('aria-label','用途とレベル');
nav.innerHTML=`<div class="topic-nav"><a href="index.html">← 用途を選ぶ</a><a href="novel.html?level=${tier}" ${topic==='novel'?'aria-current="page"':''}>小説翻訳</a><a href="skin.html?level=${tier}" ${topic==='skin'?'aria-current="page"':''}>肌分析</a></div><div class="tier-nav">${tiers.map(([id,label,note])=>`<a href="${topic}.html?level=${id}" ${id===tier?'aria-current="page"':''}><strong>${label}</strong></a>`).join('')}</div>`;
document.querySelector('main').prepend(nav);
if(topic==='novel'){
 const index=tiers.findIndex(t=>t[0]===tier);const f=document.querySelector('form');
 f.elements.level.selectedIndex=index;f.elements.depth.selectedIndex=index;
 document.querySelector('.intro').dataset.levelLabel=`NOVEL / ${tiers[index][1]}向け`;
 document.title=`小説翻訳・${tiers[index][1]} | ことばの栞`;
 f.dispatchEvent(new Event('input'));
 document.querySelector('#reset').onclick=()=>{HTMLFormElement.prototype.reset.call(f);f.elements.level.selectedIndex=index;f.elements.depth.selectedIndex=index;f.dispatchEvent(new Event('input'));document.querySelector('#status').textContent='このレベルの初期設定に戻しました。';};
}


