// 音準題組：在錄音室裡一題一題測。每題＝指定一段＋指定方式（唱／哼／腦內）
// 錄完直接跟原唱比（原唱＋我／只聽我／只聽原唱），歌詞每個字可以點來標「偏高／偏低／不穩」，最後出成績單
const QZK='scene-pquiz-v1';
let Q=null;
const QMODE={
  hum:{n:'🎵 哼',v:'哼',t:'用哼的（嗯～），不唱詞：只剩旋律，最容易聽出音高準不準。'},
  sing:{n:'🎤 唱',v:'唱',t:'照平常唱：歌詞加旋律一起測，看咬字時音會不會跑。'},
  mind:{n:'🧠 腦內',v:'腦內唱',t:'原曲放到一半會消音，妳在心裡繼續唱；聲音回來那一刻，聽自己還在不在音上。'}};
const QMARK=[['u','↑','偏高'],['d','↓','偏低'],['w','〰','不穩']];
const QRES={ok:'✓ 準',some:'△ 幾個字不準',bad:'✗ 很多不準'};
const qzDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function qzAll(){try{return JSON.parse(localStorage.getItem(QZK)||'{}')||{}}catch(e){return {}}}
function qzGet(s){const A=qzAll();return ((A[key]||{})[qzDay()]||{})[s]||{}}
function qzSet(s,o){const A=qzAll(),T=A[key]=A[key]||{},D=T[qzDay()]=T[qzDay()]||{};D[s]=Object.assign(D[s]||{},o);try{localStorage.setItem(QZK,JSON.stringify(A))}catch(e){}}
// 出題：每一段一題。同一個旋律第一次出現用哼的（先抓音），第二次用唱的，之後用腦內唱（考有沒有真的記住）
function qzList(){const sc=SCENES[key],st=sc.steps,mel=sc.mel&&sc.mel.length===st.length?sc.mel:null,seen={};
  return st.map((x,i)=>{const id=mel?mel[i]:x.sec,n=seen[id]=(seen[id]||0)+1;return {s:i,m:n===1?'hum':n===2?'sing':'mind'}})}
const qLane=id=>S&&S.lanes.find(l=>l.id===id&&(id==='me'||l.buf));
const qzRef=()=>qLane('vocal')?'vocal':qLane('orig')?'orig':'inst';
const qzBack=()=>qLane('inst')?'inst':'orig';
function qzHear(ids){S.lanes.forEach(l=>{l.solo=false;l.mute=!ids.includes(l.id)});sGains();sDraw()}
function qzLines(s){return blocks&&blocks[s]?blocks[s]:[]}
function qzHas(a,b){return sCover().some(c=>c.a<b-.3&&c.b>a+.3)}
function qzHint(t){try{sHint(t)}catch(e){}}

function qzOpen(){
  if(!S)return;if(getTimes().length<2){qzHint('這首還沒對拍：先在歌詞表對拍，題組才知道每一段在哪裡');return}
  if(S.recd)return;sStop();
  const list=qzList(),first=list.findIndex(q=>!qzGet(q.s).res);
  Q={list,i:first<0?0:first,sum:first<0,prev:S.lanes.map(l=>({id:l.id,mute:l.mute,solo:l.solo})),act:'',mute:null,k:-2};
  S.big=false;S.noBig=1;sBig();if(!Q.sum)qzFocus();qzRender();setTimeout(sLayout,50);
}
function qzClose(){
  if(!Q)return;if(S){if(S.recd)return;sStop();Q.prev.forEach(p=>{const l=S.lanes.find(x=>x.id===p.id);if(l){l.mute=p.mute;l.solo=p.solo}});sGains();S.stopAt=0}
  if(S)S.noBig=0;Q=null;const el=document.getElementById('s-quiz');if(el)el.remove();const d=document.getElementById('studio');if(d)d.classList.remove('quiz');if(S)setTimeout(sLayout,50);
}
function qzFocus(){const q=Q.list[Q.i];S.sel=secRange(q.s);S.loop=false;S.pos=S.sel[0];sView0();sDraw()}
function qzGo(j){if(S&&S.recd)return;sStop();Q.i=Math.max(0,Math.min(Q.list.length-1,j));Q.sum=false;Q.act='';Q.k=-2;qzFocus();qzRender()}
function qzPlay(act,ids,mute){
  const q=Q.list[Q.i],[a,b]=secRange(q.s);
  if(S.playing&&Q.act===act){sStop();Q.act='';Q.mute=null;qzRender();return}
  sStop();qzHear(ids);S.sel=[a,b];S.loop=false;S.stopAt=b+.4;Q.act=act;Q.mute=mute||null;Q.inn=false;
  sPlay(Math.max(0,a-1.5));qzRender();
}
function qzMindWin(s){const [a,b]=secRange(s),L=getLines(),off=lineOff(s),n=qzLines(s).length,t=[];
  for(let i=0;i<n;i++)t.push(L[off+i]);
  if(n>=3&&t[1]!=null&&t[n-1]!=null&&t[n-1]>t[1])return [t[1]-.1,t[n-1]-.15];
  return [a+(b-a)*.3,a+(b-a)*.75]}
// 錄完：回到題目，提示去比
const _qzRecStop=sRecStop;
sRecStop=async function(c){const was=!!(S&&S.recd);await _qzRecStop(c);
  if(Q&&was&&S){S.loop=false;Q.act='';if(!c){qzSet(Q.list[Q.i].s,{rec:1});qzHint('錄好了：按 ③「原唱＋我」一起聽，聽到打架的字就點它')}qzRender()}};
const _qzClose=closeStudio;
closeStudio=function(){qzClose();_qzClose()};
const _qzOpenStudio=openStudio;
openStudio=async function(){await _qzOpenStudio();const top=document.querySelector('#studio .s-top');
  if(top&&!top.querySelector('.qz-open')){const b=document.createElement('button');b.className='qz-open';b.dataset.q='open';b.textContent='🎯 音準題組';top.insertBefore(b,document.getElementById('s-time'))}
  if(window.qzWant){window.qzWant=0;qzOpen()}};
// 錄音室每一格畫面會叫這個：腦內唱的消音、亮目前這一句；p<0＝播完了
function qzTick(p){
  if(!Q||Q.sum)return;const el=document.getElementById('s-quiz');if(!el)return;
  if(p<0){Q.act='';Q.mute=null;el.classList.remove('hush');qzRender();return}
  if(Q.mute){const inn=p>=Q.mute[0]&&p<Q.mute[1];if(inn!==Q.inn){Q.inn=inn;if(inn)S.lanes.forEach(l=>{const g=S.gains[l.id];if(g)g.gain.value=0});else sGains();el.classList.toggle('hush',inn)}}
  const q=Q.list[Q.i],L=getLines(),off=blocks?lineOff(q.s):0;let k=-1;qzLines(q.s).forEach((_,li)=>{const t=L[off+li];if(t!=null&&p>=t-.3)k=li});
  if(k!==Q.k){Q.k=k;el.querySelectorAll('.qz-lyr p').forEach(x=>x.classList.toggle('on',+x.dataset.li===k))}
}
function qzMarksTxt(s,r){const L=qzLines(s),out=[];Object.keys(r.mk||{}).sort((x,y)=>{const [a,b]=x.split(':').map(Number),[c,d]=y.split(':').map(Number);return a-c||b-d}).forEach(k=>{
  const [li,ci]=k.split(':').map(Number),ch=[...(L[li]||'')][ci],M=QMARK.find(m=>m[0]===r.mk[k]);if(ch&&M)out.push({li,ci,ch,M})});return out}
function qzSumHtml(){
  const sc=SCENES[key],rows=Q.list.map((q,j)=>({q,j,r:qzGet(q.s)})),cnt=k=>rows.filter(x=>x.r.res===k).length,todo=rows.filter(x=>!x.r.res).length;
  const words=[];rows.forEach(({q,j,r})=>qzMarksTxt(q.s,r).forEach(w=>words.push({j,w,sec:sc.steps[q.s].sec})));
  const firstBad=rows.find(x=>x.r.res&&x.r.res!=='ok');
  return `<div class="qz-h"><b>🎯 音準題組・成績單</b><span class="qz-n">${esc(sc.title)}・今天</span><span class="sp"></span><button data-q="back">回到題目</button><button data-q="x">✕ 結束</button></div>
  <div class="qz-score"><div><b class="ok">${cnt('ok')}</b><span>準</span></div><div><b class="some">${cnt('some')}</b><span>幾個字</span></div><div><b class="bad">${cnt('bad')}</b><span>很多不準</span></div><div><b>${todo}</b><span>還沒測</span></div>
    <p>${todo?`還有 ${todo} 題沒測。`:''}${firstBad?`今天的功課：從第 ${firstBad.j+1} 題（${esc(sc.steps[firstBad.q.s].sec)}）開始，只練標起來的字。`:todo?'':'全部都準 🎉 下次換腦內唱多測幾段。'}</p></div>
  <div class="qz-b sum"><div><h4>每一題</h4><div class="qz-rows">${rows.map(({q,j,r})=>`<button data-q="go" data-j="${j}" class="qz-row"><i class="qd ${r.res||''}">${j+1}</i><span>${esc(sc.steps[q.s].sec)}<small>${QMODE[r.m||q.m].v}</small></span><em>${r.res?QRES[r.res]:'還沒測'}</em></button>`).join('')}</div></div>
    <div><h4>要練的字（點它回到那一題）</h4>${words.length?`<div class="qz-words">${words.map(({j,w,sec})=>`<button data-q="go" data-j="${j}" class="${w.M[0]}">${esc(w.ch)}<i>${w.M[1]}</i><small>${j+1}・${esc(sec)}</small></button>`).join('')}</div>`:'<p class="qz-tip">還沒有標記的字。比對時聽到不對，就點那個字。</p>'}
    ${rows.filter(x=>x.r.n).map(({j,r})=>`<p class="qz-note"><b>${j+1}</b>${esc(r.n)}</p>`).join('')}
    <p class="qz-tip">怎麼練：只練標起來的字。先慢慢哼，再用原唱對準那個音，最後放回整句唱。</p></div></div>`}
function qzRender(){
  const d=document.getElementById('studio');if(!d||!Q||!S)return;let el=document.getElementById('s-quiz');
  if(!el){el=document.createElement('div');el.id='s-quiz';d.querySelector('.s-pic').appendChild(el)}d.classList.add('quiz');
  if(Q.sum){el.innerHTML=qzSumHtml();return}
  const n=Q.list.length,q=Q.list[Q.i],r=qzGet(q.s),m=r.m||q.m,st=SCENES[key].steps[q.s],[a,b]=secRange(q.s),L=qzLines(q.s),mk=r.mk||{},on=x=>S.playing&&Q.act===x?' on':'',recd=!!S.recd,has=qzHas(a,b),nm=Object.keys(mk).length;
  const dots=Q.list.map((x,j)=>`<button data-q="go" data-j="${j}" class="qd ${j===Q.i?'cur ':''}${qzGet(x.s).res||''}">${j+1}</button>`).join('');
  const lyr=L.length?L.map((ln,li)=>`<p data-li="${li}">${[...ln].map((ch,ci)=>{if(/\s/.test(ch))return ' ';const c=mk[li+':'+ci],M=QMARK.find(x=>x[0]===c);return `<span data-q="mk" data-k="${li}:${ci}" class="${c||''}">${esc(ch)}${M?`<i>${M[1]}</i>`:''}</span>`}).join('')}</p>`).join('')
    :`<p class="qz-tip">（這首還沒貼歌詞，就用提示：${esc(st.cue)}）</p>`;
  const steps=m==='mind'?`
    <div class="qz-st"><b>1</b><button data-q="mind" class="go${on('mind')}">${on('mind')?'⏹ 停':'▶ 開始'}（中間會消音）</button></div>
    <div class="qz-st"><b>2</b><span>消音時在心裡繼續唱；聲音回來那一刻，妳還在音上嗎？</span></div>
    <div class="qz-st"><b>3</b><span>回來時對不上的字，在右邊點它</span></div>`:`
    <div class="qz-st"><b>1</b><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':'▶ 先聽原曲這段'}</button></div>
    <div class="qz-st"><b>2</b><button data-q="rec" class="rec${recd?' on':''}">${recd?'⏹ 停止錄音':`⏺ 跟伴奏${QMODE[m].v}一次`}</button>${has&&!recd?'<span>✓ 錄好了，可以重錄</span>':''}</div>
    <div class="qz-st"><b>3</b><span>比一比</span><button data-q="cmp" data-c="both" class="go${on('both')}" ${has?'':'disabled'}>原唱＋我</button><button data-q="cmp" data-c="me" class="${on('me')}" ${has?'':'disabled'}>只聽我</button><button data-q="cmp" data-c="ref" class="${on('ref')}">只聽原唱</button></div>
    <div class="qz-st"><b>4</b><span>聽到打架、不對的字，在右邊點它</span></div>`;
  el.innerHTML=`<div class="qz-hush">🤫 在心裡繼續唱…</div>
  <div class="qz-h"><b>🎯 音準題組</b><span class="qz-n">第 ${Q.i+1} / ${n} 題</span><div class="qz-dots">${dots}</div><button data-q="sum">成績單</button><button data-q="x">✕ 結束</button></div>
  <div class="qz-t"><span class="qz-sec">${esc(st.sec)}</span><span class="qz-time">${mmss(a)}–${mmss(b)}</span><span class="qz-modes">${Object.keys(QMODE).map(k=>`<button data-q="mode" data-m="${k}" class="${k===m?'on':''}">${QMODE[k].n}</button>`).join('')}</span></div>
  <p class="qz-tip">${QMODE[m].t}</p>
  <div class="qz-b"><div class="qz-steps">${steps}
      <div class="qz-res"><span>這題的結果<small>過關＝不準的字不超過 2 個</small></span>${Object.keys(QRES).map(k=>`<button data-q="res" data-v="${k}" class="${k}${r.res===k?' on':''}">${QRES[k]}</button>`).join('')}</div>
      <div class="qz-nav"><button data-q="go" data-j="${Q.i-1}" ${Q.i?'':'disabled'}>← 上一題</button>${Q.i<n-1?`<button data-q="go" data-j="${Q.i+1}" class="go">下一題 →</button>`:'<button data-q="sum" class="go">看成績單 →</button>'}</div></div>
    <div class="qz-r"><div class="qz-lyr">${lyr}</div>
      <p class="qz-leg">點字標記：<span class="u">↑ 偏高</span> → <span class="d">↓ 偏低</span> → <span class="w">〰 不穩</span> → 取消${nm?`　・已標 ${nm} 個字`:''}</p>
      <input class="qz-in" data-q="note" placeholder="筆記：例如「人海」的海掉下來" value="${esc(r.n||'')}"></div></div>`;
  Q.k=-2;
}
app.addEventListener('click',e=>{
  const t=e.target.closest('#studio [data-q]');if(!t||!S)return;const a=t.dataset.q;
  if(a==='open'){Q?qzClose():qzOpen();return}
  if(!Q||a==='note')return;const q=Q.list[Q.i];
  if(a==='x')qzClose();
  else if(a==='sum'){if(S.recd)return;sStop();Q.sum=true;qzRender()}
  else if(a==='back'){Q.sum=false;qzRender()}
  else if(a==='go')qzGo(+t.dataset.j);
  else if(a==='mode'){if(S.recd)return;sStop();qzSet(q.s,{m:t.dataset.m});Q.act='';qzRender()}
  else if(a==='listen')qzPlay('listen',[qLane('orig')?'orig':qzRef()]);
  else if(a==='mind')qzPlay('mind',qLane('orig')?['orig']:[qzBack(),qzRef()],qzMindWin(q.s));
  else if(a==='cmp'){const c=t.dataset.c;qzPlay(c,c==='both'?[qzRef(),'me']:c==='me'?['me']:[qzRef()])}
  else if(a==='rec'){if(S.recd){sRecStop();return}const [x,y]=secRange(q.s);sStop();qzHear([qzBack()]);S.sel=[x,y];S.loop=true;S.stopAt=0;S.pos=x;Q.act='';sRecStart().then(()=>qzRender())}
  else if(a==='mk'){const r=qzGet(q.s),mk=Object.assign({},r.mk||{}),k=t.dataset.k,o=['','u','d','w'],nx=o[(o.indexOf(mk[k]||'')+1)%4];if(nx)mk[k]=nx;else delete mk[k];qzSet(q.s,{mk});
    const M=QMARK.find(x=>x[0]===nx);t.className=nx;const i=t.querySelector('i');if(i)i.remove();if(M)t.insertAdjacentHTML('beforeend',`<i>${M[1]}</i>`);
    const lg=document.querySelector('#s-quiz .qz-leg');if(lg){const n=Object.keys(mk).length;lg.lastChild.nodeType===3&&/已標/.test(lg.lastChild.textContent)&&lg.lastChild.remove();if(n)lg.insertAdjacentText('beforeend',`　・已標 ${n} 個字`)}}
  else if(a==='res'){const v=t.dataset.v;qzSet(q.s,{res:qzGet(q.s).res===v?null:v});qzRender()}
},true);
app.addEventListener('input',e=>{const t=e.target;if(!Q||t.dataset.q!=='note')return;qzSet(Q.list[Q.i].s,{n:t.value})});
(()=>{const s=document.createElement('style');s.textContent=`
#studio.quiz{grid-template-rows:auto minmax(0,1fr) auto 170px auto auto}
#studio.quiz .s-lane:not(.me){flex:0 0 32px!important}#studio.quiz .s-lyr{display:none}#studio.quiz .s-pic::before{display:none}
#studio .qz-open{margin-left:auto}#studio.quiz .qz-open{background:rgba(242,194,123,.22);border-color:var(--glow);color:var(--glow)}
#s-quiz{position:absolute;inset:0;background:rgba(18,15,11,.95);overflow:auto;padding:12px 18px 16px;display:flex;flex-direction:column;gap:8px;-webkit-user-select:none;user-select:none}
#s-quiz .sp{flex:1}
.qz-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.qz-h>b{color:var(--glow);font-size:15px}.qz-n{color:var(--muted);font-size:13px}
.qz-dots{display:flex;gap:4px;flex-wrap:wrap;flex:1}
#studio .qd{width:28px;height:28px;padding:0;font-size:12px;border-radius:50%;display:inline-grid;place-items:center;font-style:normal;flex:none;border:1px solid var(--line)}
#studio .qd.cur{border:2px solid var(--glow);color:var(--glow)}
#studio .qd.ok{background:#7fc28a;border-color:#7fc28a;color:#10200f}#studio .qd.some{background:#f2c27b;border-color:#f2c27b;color:#2a1c08}#studio .qd.bad{background:#e8806f;border-color:#e8806f;color:#2a0d06}
.qz-t{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.qz-sec{font-size:22px;font-weight:700}.qz-time{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.qz-modes{display:flex;gap:6px;margin-left:auto}
.qz-tip{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
.qz-b{display:grid;grid-template-columns:minmax(250px,.8fr) 1.2fr;gap:20px;align-items:start}
.qz-st{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px}.qz-st>b{width:22px;height:22px;border-radius:50%;background:rgba(242,194,123,.18);color:var(--glow);display:grid;place-items:center;font-size:12px;flex:none}.qz-st span{font-size:13px;color:var(--muted)}
#studio .qz-st button.rec{border-color:#e05a4e;color:#ffb3ab}#studio .qz-st button.rec.on{background:#e05a4e;color:#fff}
#studio #s-quiz button.go{background:var(--glow);border-color:var(--glow);color:#1a130c;font-weight:600}
#studio #s-quiz button.go.on{background:rgba(242,194,123,.22);color:var(--glow)}
#studio #s-quiz button:disabled{opacity:.35}
.qz-lyr{border:1px solid var(--line);border-radius:12px;padding:8px 12px;background:rgba(255,255,255,.03)}
.qz-lyr p{margin:0;padding:1px 6px;font-size:21px;line-height:1.6;letter-spacing:.05em;border-radius:8px}.qz-lyr p.on{background:rgba(242,194,123,.14)}
.qz-lyr span,.qz-leg span{position:relative;padding:1px 2px;border-radius:5px;cursor:pointer}
.qz-lyr span.u,.qz-leg .u,.qz-words .u{background:rgba(232,128,111,.38)}.qz-lyr span.d,.qz-leg .d,.qz-words .d{background:rgba(120,165,255,.38)}.qz-lyr span.w,.qz-leg .w,.qz-words .w{background:rgba(242,194,123,.38)}
.qz-lyr span i{position:absolute;top:-11px;right:-5px;font-style:normal;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 3px #000}
.qz-leg{margin:6px 0;font-size:12px;color:var(--muted)}.qz-leg span{cursor:default}
.qz-in{width:100%;box-sizing:border-box;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;color:var(--ink);font:inherit;font-size:14px;padding:8px 10px;-webkit-user-select:text;user-select:text}
.qz-res{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}.qz-res>span{flex-basis:100%}.qz-res>span{font-size:13px;display:flex;gap:8px;align-items:baseline}.qz-res small{color:var(--muted);font-size:11px}
#studio .qz-res button.ok.on{background:#7fc28a;border-color:#7fc28a;color:#10200f}#studio .qz-res button.some.on{background:#f2c27b;border-color:#f2c27b;color:#2a1c08}#studio .qz-res button.bad.on{background:#e8806f;border-color:#e8806f;color:#2a0d06}
.qz-nav{display:flex;justify-content:space-between;margin-top:12px}
.qz-hush{display:none}
#s-quiz.hush .qz-hush{display:block;position:absolute;left:14px;right:14px;top:10px;z-index:2;box-shadow:0 6px 24px rgba(0,0,0,.5);text-align:center;font-size:22px;font-weight:700;color:#1a130c;background:var(--glow);border-radius:12px;padding:10px;margin-bottom:4px}
.qz-score{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.qz-score>div{border:1px solid var(--line);border-radius:12px;padding:6px 14px;text-align:center;min-width:64px}.qz-score b{display:block;font-size:24px}.qz-score span{font-size:12px;color:var(--muted)}
.qz-score b.ok{color:#7fc28a}.qz-score b.some{color:#f2c27b}.qz-score b.bad{color:#e8806f}.qz-score p{margin:0;font-size:14px;flex:1;min-width:200px}
.qz-b.sum h4{margin:6px 0;font-size:13px;color:var(--muted);font-weight:500}
.qz-rows{display:flex;flex-direction:column;gap:4px}#studio .qz-row{display:flex;align-items:center;gap:10px;border-radius:10px;text-align:left;padding:6px 10px}.qz-row span{flex:1;font-size:14px}.qz-row small{color:var(--muted);margin-left:8px;font-size:12px}.qz-row em{font-style:normal;font-size:13px;color:var(--muted)}
.qz-words{display:flex;flex-wrap:wrap;gap:6px}#studio .qz-words button{border-radius:10px;font-size:20px;padding:4px 10px;display:flex;align-items:baseline;gap:3px}.qz-words i{font-style:normal;font-size:13px;font-weight:700}.qz-words small{font-size:11px;color:var(--ink);opacity:.7;margin-left:4px}
.qz-note{margin:6px 0 0;font-size:14px}.qz-note b{color:var(--glow);margin-right:8px}
@media (max-width:820px){#studio.quiz{grid-template-rows:auto minmax(0,1fr) auto 120px auto auto}#studio.quiz .s-lane:not(.me){flex:0 0 24px!important}.qz-b{grid-template-columns:1fr;gap:10px}.qz-modes{margin-left:0}.qz-lyr p{font-size:19px}#s-quiz{padding:10px 12px}.qz-dots{order:5;flex-basis:100%}.qz-r{order:-1}.qz-lyr p{font-size:18px;line-height:1.5}#studio.quiz .s-take{display:none}#studio.quiz{grid-template-rows:auto minmax(0,1fr) auto 130px auto auto}#studio.quiz .s-lanes{overflow:hidden}}
`;document.head.appendChild(s)})();
