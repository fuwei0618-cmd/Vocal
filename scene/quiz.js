// 題組：在錄音室裡一題一題測，像考題一樣。四份卷：🎯 音準／📝 歌詞／🥁 進拍／🗺 架構
// 音準：每次抽 10 題（整句、句首音、句尾長音、高音句、大跳音），錄完「輪流比」＝原唱一句、我一句，聽到不對的字點起來
// 以前錯過的題目優先再考；成績單列出要練的字
const QZK='scene-pquiz-v1';
let Q=null;
const QMODE={
  hum:{n:'🎵 哼',v:'哼',t:'用哼的（嗯～），不唱詞：只剩旋律，最容易聽出音高準不準。'},
  sing:{n:'🎤 唱',v:'唱',t:'照平常唱：歌詞加旋律一起測，看咬字時音會不會跑。'},
  mind:{n:'🧠 腦內',v:'腦內唱',t:'原曲會在這裡消音，妳在心裡繼續唱；聲音回來那一刻，聽自己還在不在音上。'}};
const QCAT={
  pitch:{n:'🎯 音準',res:{ok:'✓ 準',some:'△ 幾個字不準',bad:'✗ 很多不準'},sc:['準','幾個字','很多不準'],pass:'不準的字不超過 2 個'},
  lyr:{n:'📝 歌詞',res:{ok:'✓ 全對',some:'△ 卡 1～2 個字',bad:'✗ 想不起來'},sc:['全對','卡幾個字','想不起來'],pass:'整句唱得出來，卡不超過 2 個字'},
  beat:{n:'🥁 進拍',res:{ok:'✓ 準時',some:'⏩ 搶太早',bad:'⏪ 慢半拍'},sc:['準時','搶太早','慢半拍'],pass:'跟原唱同一刻開口'},
  map:{n:'🗺 架構',res:{ok:'✓ 說對',some:'△ 說對一半',bad:'✗ 想不起來'},sc:['說對','一半','想不起來'],pass:'段落和第一句都說得出來'}};
const QTYPE={
  '':{n:'整句',t:''},
  f:{n:'句首音',t:'不先聽原唱：伴奏放到這句前，直接唱出第一個字。考的是「起音」記不記得。比的時候只比開頭。'},
  t:{n:'句尾長音',t:'這句最後的長音：撐住、不往下掉、不抖。比的時候只比句尾。'},
  h:{n:'高音句',t:'這句是整首最高的幾句之一（從原唱人聲聽出來的）：注意有沒有真的唱上去。'},
  j:{n:'大跳音',t:''}};
const QMARKS={pitch:[['u','↑','偏高'],['d','↓','偏低'],['w','〰','不穩']],lyr:[['x','✗','卡住／唱錯']]};
const qzDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function qzAll(){try{return JSON.parse(localStorage.getItem(QZK)||'{}')||{}}catch(e){return {}}}
function qzDayRec(){return (qzAll()[key]||{})[qzDay()]||{}}
function qzGet(id){const D=qzDayRec();return D[id]||(id[0]==='s'?D[id.slice(1)]:null)||{}}
function qzSet(id,o,raw){const A=qzAll(),T=A[key]=A[key]||{},D=T[qzDay()]=T[qzDay()]||{};D[id]=raw?o:Object.assign(D[id]||{},o);try{localStorage.setItem(QZK,JSON.stringify(A))}catch(e){}}
const qzLS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||'';localStorage.setItem(k,v)}catch(e){return ''}};
// ---------- 歌詞、時間 ----------
const qzAllLines=()=>blocks?blocks.flat():[];
function qzLines(s){return blocks&&blocks[s]?blocks[s]:[]}
function qzPool(){const L=getLines(),A=qzAllLines();return A.map((t,i)=>i).filter(i=>L[i]!=null&&A[i].replace(/\s/g,'').length>1)}
function qzLineRange(g){const L=getLines(),s=secOfLine(g),[,e]=secRange(s),a=L[g];let b=L[g+1];if(b==null||b<=a||secOfLine(g+1)!==s)b=e;return [a,Math.min(b,a+12)]}
// 每段開頭、或前面空很久的句子＝要自己進拍的地方
function qzEntries(){const L=getLines();return qzPool().filter(g=>g===0||L[g-1]==null||secOfLine(g)!==secOfLine(g-1)||L[g]-qzLineRange(g-1)[0]>6)}
// ---------- 原唱音高分析（有「原唱人聲」那軌才做）：找高音句、大跳音 ----------
function qzAnalyze(){const c=window._qzPA||(window._qzPA={});if(c[key])return c[key];const ln=qLane('vocal');if(!ln)return null;
  const b=ln.buf,sr0=b.sampleRate,ds=Math.max(1,Math.round(sr0/11025)),sr=sr0/ds,d0=b.getChannelData(0),hi={},jump={};
  const W=Math.round(sr*.04),hop=Math.round(sr*.03),minL=Math.floor(sr/900),maxL=Math.ceil(sr/80),K=Math.max(2,Math.round(.3/(hop/sr)));
  qzPool().forEach(g=>{const [a,e]=qzLineRange(g),n=Math.max(0,Math.floor((e-a)*sr)),o=Math.floor(a*sr0),x=new Float32Array(n);
    for(let i=0;i<n;i++){let s=0;const k=o+i*ds;for(let j=0;j<ds;j++)s+=d0[k+j]||0;x[i]=s/ds}
    const m=[];for(let s=0;s+W+maxL<x.length;s+=hop){let en=0;for(let i=0;i<W;i+=2)en+=x[s+i]*x[s+i];if(en/(W/2)<2e-5){m.push(null);continue}
      const r=new Float32Array(maxL+2);let best=0;for(let Lg=minL;Lg<=maxL;Lg++){let c2=0,e2=0;for(let i=0;i<W;i+=2){const y=x[s+i+Lg];c2+=x[s+i]*y;e2+=y*y}const v=c2/Math.sqrt(en*e2+1e-12);r[Lg]=v;if(v>best)best=v}
      if(best<.7){m.push(null);continue}let lag=maxL;for(let Lg=minL+1;Lg<maxL;Lg++)if(r[Lg]>=best*.92&&r[Lg]>=r[Lg-1]&&r[Lg]>=r[Lg+1]){lag=Lg;break}
      m.push(69+12*Math.log2(sr/lag/440))}
    const v=m.filter(z=>z!=null).sort((p,q)=>p-q);if(v.length<5)return;hi[g]=v[Math.floor(v.length*.85)];
    let bj=0,bt=0;for(let i=K+1;i<m.length;i++){const p=m[i],q=m[i-K];if(p==null||q==null||m[i-1]==null||m[i-K-1]==null)continue;
      if(Math.abs(p-m[i-1])>.8||Math.abs(q-m[i-K-1])>.8)continue;const dl=p-q;if(Math.abs(dl)>Math.abs(bj)&&Math.abs(dl)<14){bj=dl;bt=a+(i-K/2)*hop/sr}}
    if(Math.abs(bj)>=5)jump[g]={st:Math.round(bj),t:+bt.toFixed(2)}});
  return c[key]={hi,jump}}
// ---------- 出題 ----------
const QRE={pitch:/^L(\d+)([ftjh]?)$/,lyr:/^Y(\d+)$/,beat:/^B(\d+)$/};
const QSETK={pitch:'_set2',lyr:'_setY',beat:'_setB'};
// 以前（今天以前）考錯的題目
function qzWrong(cat){const T=qzAll()[key]||{},out=[];Object.keys(T).filter(d=>d<qzDay()).sort().reverse().forEach(d=>Object.keys(T[d]).forEach(id=>{const r=T[d][id];if(QRE[cat].test(id)&&r&&(r.res==='some'||r.res==='bad')&&!out.includes(id))out.push(id)}));return out}
const qzRand=a=>a.splice(Math.floor(Math.random()*a.length),1)[0];
function qzDraw(cat,n){const D=qzDayRec(),had=D[QSETK[cat]]||[],used=new Set(had.map(id=>+id.match(/\d+/)[0])),pick=[];
  const pool=(cat==='beat'?qzEntries():qzPool()).filter(g=>!used.has(g));if(!pool.length)return 0;
  const add=id=>{const g=+id.match(/\d+/)[0];if(pick.includes(id)||had.includes(id)||pick.some(x=>+x.match(/\d+/)[0]===g)||!pool.includes(g))return false;pick.push(id);return true};
  qzWrong(cat).forEach(id=>{if(pick.length<Math.ceil(n/2))add(id)});
  const P=cat==='lyr'?'Y':cat==='beat'?'B':'L';
  if(cat==='pitch'){const pa=qzAnalyze(),plan=pa?['h','f','t','j','','h','f','t','j','']:['f','t','','f','t','','f','t','',''];
    const top=o=>Object.keys(o).map(Number).filter(g=>pool.includes(g));
    const H=pa?top(pa.hi).sort((x,y)=>pa.hi[y]-pa.hi[x]).slice(0,8):[],J=pa?top(pa.jump).sort((x,y)=>Math.abs(pa.jump[y].st)-Math.abs(pa.jump[x].st)).slice(0,8):[];
    for(const t of plan){if(pick.length>=n)break;let ok=false;const src=t==='h'?H.slice():t==='j'?J.slice():pool.slice();while(!ok&&src.length)ok=add('L'+qzRand(src)+t);if(!ok){const r=pool.slice();while(!ok&&r.length)ok=add('L'+qzRand(r))}}}
  const r=pool.slice();while(pick.length<n&&r.length)add(P+qzRand(r));
  pick.sort((x,y)=>+x.match(/\d+/)[0]-+y.match(/\d+/)[0]);qzSet(QSETK[cat],[...had,...pick],true);return pick.length}
function qzQ(id,j){let m;
  if((m=id.match(QRE.pitch))){const l=+m[1],t=m[2]||'';return {id,cat:'pitch',l,s:secOfLine(l),t,m:t?(t==='f'||t==='t'?'sing':'hum'):['hum','sing','mind'][j%3]}}
  if((m=id.match(QRE.lyr)))return {id,cat:'lyr',l:+m[1],s:secOfLine(+m[1])};
  if((m=id.match(QRE.beat)))return {id,cat:'beat',l:+m[1],s:secOfLine(+m[1])};
  if((m=id.match(/^M(\d+)$/)))return {id,cat:'map',s:+m[1]};
  if((m=id.match(/^s(\d+)$/)))return {id,cat:'pitch',s:+m[1],m:'hum'};
  return null}
// 整段（舊版）：每一段一題。同一個旋律第一次出現用哼的，第二次唱，之後腦內唱
function qzSecList(){const sc=SCENES[key],st=sc.steps,mel=sc.mel&&sc.mel.length===st.length?sc.mel:null,seen={};
  return st.map((x,i)=>{const id=mel?mel[i]:x.sec,n=seen[id]=(seen[id]||0)+1;return {id:'s'+i,cat:'pitch',s:i,m:n===1?'hum':n===2?'sing':'mind'}})}
const qzCat=()=>{const c=qzLS('scene-pquiz-cat');return QCAT[c]?c:'pitch'};
const qzKind=()=>qzLS('scene-pquiz-kind')==='sec'||qzPool().length<5?'sec':'line';
function qzBuild(){Q.cat=qzCat();Q.kind=qzKind();const c=Q.cat;
  if(c==='map'){Q.list=SCENES[key].steps.map((x,i)=>qzQ('M'+i));return}
  if(c==='pitch'&&Q.kind==='sec'){Q.list=qzSecList();return}
  if(qzPool().length<3){Q.list=c==='pitch'?qzSecList():[];return}
  const D=qzDayRec();let set=D[QSETK[c]];
  if(!set&&c==='pitch'&&D._set)set=D._set.map(n=>'L'+n);   // v124 抽過的
  if(!set||!set.length){qzDraw(c,10);set=qzDayRec()[QSETK[c]]||[]}
  Q.list=set.map((id,j)=>qzQ(id,j)).filter(Boolean)}
function qzText(q){return q.l!=null?[qzAllLines()[q.l]||'']:q.cat==='map'?[]:qzLines(q.s)}
function qzGl(q,li){return q.l!=null?q.l:(blocks?lineOff(q.s):0)+li}
// 這題要比的範圍
function qzRange(q){if(q.cat==='map'||q.l==null)return secRange(q.s);const [a,b]=qzLineRange(q.l);
  if(q.cat==='beat')return [Math.max(0,a-1),a+2.5];
  if(q.cat!=='pitch')return [a,b];
  if(q.t==='f')return [a,Math.min(b,a+1.5)];
  if(q.t==='t')return [Math.max(a,b-2.4),b];
  if(q.t==='j'){const pa=qzAnalyze(),J=pa&&pa.jump[q.l];if(J)return [Math.max(a,J.t-1.3),Math.min(b,J.t+1.3)]}
  return [a,b]}
// 這題要錄的範圍
function qzRecRange(q){if(q.l==null)return secRange(q.s);const [a,b]=qzLineRange(q.l);if(q.cat==='beat')return [Math.max(0,a-2),a+2.5];if(q.t==='f')return [a,Math.min(b,a+1.5)];return [a,b]}
function qzRanges(q){if(q.l!=null||q.cat==='beat')return [qzRange(q)];const L=getLines(),n=qzText(q).length,out=[];for(let li=0;li<n;li++){const g=qzGl(q,li);if(L[g]!=null)out.push(qzLineRange(g))}return out.length?out:[qzRange(q)]}
const qLane=id=>S&&S.lanes.find(l=>l.id===id&&(id==='me'||l.buf));
const qzRef=()=>qLane('vocal')?'vocal':qLane('orig')?'orig':'inst';
const qzBack=()=>qLane('inst')?'inst':'orig';
const qzOrig=()=>qLane('orig')?['orig']:[qzBack(),qzRef()];
function qzHear(ids){S.lanes.forEach(l=>{l.solo=false;l.mute=!ids.includes(l.id)});sGains();sDraw()}
function qzHas(a,b){return sCover().some(c=>c.a<b-.2&&c.b>a+.2)}
function qzHint(t){try{sHint(t)}catch(e){}}
// ---------- 開關、播放 ----------
function qzOpen(cat){
  if(!S)return;if(getTimes().length<2){qzHint('這首還沒對拍：先在歌詞表對拍，題組才知道每一段在哪裡');return}
  if(S.recd)return;sStop();if(cat&&QCAT[cat])qzLS('scene-pquiz-cat',cat);
  Q={prev:S.lanes.map(l=>({id:l.id,mute:l.mute,solo:l.solo})),act:'',mute:null,k:-2};qzBuild();qzStart();
  S.big=false;S.noBig=1;sBig();setTimeout(sLayout,50);
}
function qzStart(){const f=Q.list.findIndex(q=>!qzGet(q.id).res);Q.i=f<0?0:f;Q.sum=f<0&&Q.list.length>0;Q.act='';Q.rev=false;Q.seq=null;if(!Q.sum&&Q.list.length)qzFocus();qzRender()}
function qzClose(){
  if(!Q)return;if(S){if(S.recd)return;sStop();Q.prev.forEach(p=>{const l=S.lanes.find(x=>x.id===p.id);if(l){l.mute=p.mute;l.solo=p.solo}});sGains();S.stopAt=0}
  if(S)S.noBig=0;Q=null;const el=document.getElementById('s-quiz');if(el)el.remove();const d=document.getElementById('studio');if(d)d.classList.remove('quiz');if(S)setTimeout(sLayout,50);
}
function qzFocus(){const q=Q.list[Q.i];if(!q)return;S.sel=qzRecRange(q);S.loop=false;S.pos=S.sel[0];sView0();sDraw()}
function qzGo(j){if(S&&S.recd)return;Q.seq=null;sStop();Q.i=Math.max(0,Math.min(Q.list.length-1,j));Q.sum=false;Q.act='';Q.rev=false;Q.k=-2;qzFocus();qzRender()}
function qzPlay(act,ids,from,until,mute){
  Q.seq=null;Q.who='';if(S.playing&&Q.act===act){sStop();Q.act='';Q.mute=null;qzRender();return}
  sStop();qzHear(ids);S.loop=false;S.stopAt=until;Q.act=act;Q.mute=mute||null;Q.inn=false;sPlay(Math.max(0,from));qzRender()}
// 輪流比：原唱一句 → 我一句 → 下一句…
function qzSeq(act,items){if(S.playing&&Q.act===act){Q.seq=null;sStop();Q.act='';Q.who='';qzRender();return}sStop();Q.seq=items.slice();Q.act=act;Q.mute=null;qzNext()}
function qzNext(){if(!Q||!S)return;const it=Q.seq&&Q.seq.shift();if(!it){Q.seq=null;Q.act='';Q.who='';qzRender();return}
  qzHear(it.ids);S.loop=false;S.stopAt=it.r[1]+.1;Q.who=it.who;sPlay(Math.max(0,it.r[0]-.15));qzRender()}
function qzAlt(q){const its=[];qzRanges(q).forEach(r=>{its.push({ids:[qzRef()],r,who:'原唱'});its.push({ids:['me'],r,who:'我'})});qzSeq('alt',its)}
function qzMind(q){const L=getLines();
  if(q.l!=null){const [a,b]=qzLineRange(q.l),pv=L[q.l-1],from=pv!=null&&pv<a&&a-pv<12?pv-.2:a-4;qzPlay('mind',qzOrig(),from,b+2.5,[a-.05,b-.1]);return}
  const [a,b]=secRange(q.s),off=lineOff(q.s),n=qzLines(q.s).length,t=[];for(let i=0;i<n;i++)t.push(L[off+i]);
  const w=n>=3&&t[1]!=null&&t[n-1]!=null&&t[n-1]>t[1]?[t[1]-.1,t[n-1]-.15]:[a+(b-a)*.3,a+(b-a)*.75];qzPlay('mind',qzOrig(),a-1.5,b+.4,w)}
function qzRec(q){if(S.recd){sRecStop();return}const [x,y]=qzRecRange(q);sStop();Q.seq=null;qzHear([qzBack()]);S.sel=[x,y];S.loop=true;S.stopAt=0;S.pos=x;Q.act='';sRecStart().then(()=>qzRender())}
// 錄完：回到題目
const _qzRecStop=sRecStop;
sRecStop=async function(c){const was=!!(S&&S.recd);await _qzRecStop(c);
  if(Q&&was&&S){S.loop=false;Q.act='';if(!c){const q=Q.list[Q.i];qzSet(q.id,{rec:1});qzHint(q.cat==='beat'?'錄好了：按「輪流比」，聽原唱和妳是不是同一刻開口':'錄好了：按「輪流比」，原唱一句、妳一句，聽到不對的字就點它')}qzRender()}};
const _qzClose=closeStudio;
closeStudio=function(){qzClose();_qzClose()};
const _qzOpenStudio=openStudio;
openStudio=async function(){await _qzOpenStudio();const top=document.querySelector('#studio .s-top');
  if(top&&!top.querySelector('.qz-open')){const b=document.createElement('button');b.className='qz-open';b.dataset.q='open';b.textContent='🎯 題組';top.insertBefore(b,document.getElementById('s-time'))}
  if(window.qzWant){const c=window.qzWant;window.qzWant=0;qzOpen(typeof c==='string'?c:'')}};
// 錄音室每一格畫面會叫這個：腦內唱的消音、亮目前這一句；p<0＝播完了
function qzTick(p){
  if(!Q||Q.sum)return;const el=document.getElementById('s-quiz');if(!el)return;
  if(p<0){el.classList.remove('hush');Q.mute=null;if(Q.seq&&Q.seq.length&&Q.act){setTimeout(()=>{if(Q&&Q.seq)qzNext()},350);return}Q.seq=null;Q.act='';Q.who='';qzRender();return}
  if(Q.mute){const inn=p>=Q.mute[0]&&p<Q.mute[1];if(inn!==Q.inn){Q.inn=inn;if(inn)S.lanes.forEach(l=>{const g=S.gains[l.id];if(g)g.gain.value=0});else sGains();el.classList.toggle('hush',inn)}}
  const q=Q.list[Q.i];if(!q)return;const L=getLines();let k=-1;qzText(q).forEach((_,li)=>{const t=L[qzGl(q,li)];if(t!=null&&p>=t-.3)k=li});
  if(k!==Q.k){Q.k=k;el.querySelectorAll('.qz-lyr p').forEach(x=>x.classList.toggle('on',+x.dataset.li===k))}
}
// ---------- 畫面 ----------
function qzMarksTxt(q,r){const L=qzText(q),MK=QMARKS[q.cat]||[],out=[];Object.keys(r.mk||{}).sort((x,y)=>{const [a,b]=x.split(':').map(Number),[c,d]=y.split(':').map(Number);return a-c||b-d}).forEach(k=>{
  const [li,ci]=k.split(':').map(Number),ch=[...(L[li]||'')][ci],M=MK.find(m=>m[0]===r.mk[k]);if(ch&&M)out.push({li,ci,ch,M})});return out}
function qzLabel(q){const sc=SCENES[key],A=qzAllLines();if(q.cat==='map')return `第 ${q.s+1} 段・${sc.steps[q.s].sec}`;if(q.l!=null)return A[q.l]||'';return sc.steps[q.s].sec}
function qzTag(q,r){if(q.cat==='pitch')return (q.t?QTYPE[q.t].n+'・':'')+QMODE[r.m||q.m].v;return ''}
function qzHead(){const c=Q.cat,n=Q.list.length;
  return `<div class="qz-h"><b>🎯 題組</b><span class="qz-cats">${Object.keys(QCAT).map(k=>`<button data-q="cat" data-cat="${k}" class="${k===c?'on':''}">${QCAT[k].n}</button>`).join('')}</span><span class="sp"></span>${Q.sum?'<button data-q="back">回到題目</button>':'<button data-q="sum">成績單</button>'}<button data-q="x">✕ 結束</button></div>
  ${Q.sum||!n?'':`<div class="qz-h2">${c==='pitch'&&qzPool().length>=5?`<span class="qz-kind"><button data-q="kind" data-kind="line" class="${Q.kind==='line'?'on':''}">🎲 抽 10 題</button><button data-q="kind" data-kind="sec" class="${Q.kind==='sec'?'on':''}">📖 整段</button></span>`:''}<span class="qz-n">第 ${Q.i+1} / ${n} 題</span><div class="qz-dots">${Q.list.map((x,j)=>`<button data-q="go" data-j="${j}" class="qd ${j===Q.i?'cur ':''}${qzGet(x.id).res||''}">${j+1}</button>`).join('')}</div></div>`}`}
function qzSumHtml(){
  const sc=SCENES[key],C=QCAT[Q.cat],rows=Q.list.map((q,j)=>({q,j,r:qzGet(q.id)})),cnt=k=>rows.filter(x=>x.r.res===k).length,todo=rows.filter(x=>!x.r.res).length;
  const words=[];rows.forEach(({q,j,r})=>qzMarksTxt(q,r).forEach(w=>words.push({j,w})));
  const firstBad=rows.find(x=>x.r.res&&x.r.res!=='ok'),canMore=Q.cat!=='map'&&!(Q.cat==='pitch'&&Q.kind==='sec');
  const how={pitch:'只練標起來的字：先慢慢哼，再跟原唱對準那個音，最後放回整句唱。',lyr:'卡住的句子：跟原唱唱 3 遍，再遮起來自己唱。',beat:'進不準的地方：按 🔁 重複那一段，跟著拍子拍手找重音，再錄一次。',map:'想不起來的段落：打開架構表的「回想」，一段一段說出下一段。'}[Q.cat];
  return `${qzHead()}
  <div class="qz-score"><div><b class="ok">${cnt('ok')}</b><span>${C.sc[0]}</span></div><div><b class="some">${cnt('some')}</b><span>${C.sc[1]}</span></div><div><b class="bad">${cnt('bad')}</b><span>${C.sc[2]}</span></div><div><b>${todo}</b><span>還沒測</span></div>
    <p>${todo?`還有 ${todo} 題沒測。`:''}${firstBad?`今天的功課：第 ${firstBad.j+1} 題開始，${how}`:todo?'':'全部過關 🎉'}${canMore?'<br><button data-q="more" class="go">🎲 再抽 10 題</button>':''}</p></div>
  <div class="qz-b sum"><div><h4>每一題</h4><div class="qz-rows">${rows.map(({q,j,r})=>`<button data-q="go" data-j="${j}" class="qz-row"><i class="qd ${r.res||''}">${j+1}</i><span>${esc(qzLabel(q))}<small>${esc(qzTag(q,r))}</small></span><em>${r.res?C.res[r.res]:'還沒測'}</em></button>`).join('')}</div></div>
    <div>${QMARKS[Q.cat]?`<h4>要練的字（點它回到那一題）</h4>${words.length?`<div class="qz-words">${words.map(({j,w})=>`<button data-q="go" data-j="${j}" class="${w.M[0]}">${esc(w.ch)}<i>${w.M[1]}</i><small>第 ${j+1} 題</small></button>`).join('')}</div>`:'<p class="qz-tip">還沒有標記的字。聽到不對，就點那個字。</p>'}`:''}
    ${rows.filter(x=>x.r.n).map(({j,r})=>`<p class="qz-note"><b>${j+1}</b>${esc(r.n)}</p>`).join('')}
    <p class="qz-tip">怎麼練：${how}</p></div></div>`}
function qzChars(q,r,cls){const mk=r.mk||{},MK=QMARKS[q.cat]||[],L=qzText(q);
  return L.map((ln,li)=>`<p data-li="${li}">${[...ln].map((ch,ci,all)=>{if(/\s/.test(ch))return ' ';const c=mk[li+':'+ci],M=MK.find(x=>x[0]===c);
    const f=q.t==='f'&&ci===all.findIndex(z=>!/\s/.test(z))||q.t==='t'&&ci>=all.length-3?' focus':'';
    return `<span data-q="mk" data-k="${li}:${ci}" class="${c||''}${f}">${esc(ch)}${M?`<i>${M[1]}</i>`:''}</span>`}).join('')}</p>`).join('')}
function qzRender(){
  const d=document.getElementById('studio');if(!d||!Q||!S)return;let el=document.getElementById('s-quiz');
  if(!el){el=document.createElement('div');el.id='s-quiz';d.querySelector('.s-pic').appendChild(el)}d.classList.add('quiz');
  if(!Q.list.length){el.innerHTML=qzHead()+'<p class="qz-tip">這首還沒貼歌詞或還沒逐句對拍，這份卷出不了題。先到歌詞表貼歌詞、對拍。</p>';return}
  if(Q.sum){el.innerHTML=qzSumHtml();return}
  const sc=SCENES[key],C=QCAT[Q.cat],n=Q.list.length,q=Q.list[Q.i],r=qzGet(q.id),m=r.m||q.m,st=sc.steps[q.s],[a,b]=qzRange(q),[ra,rb]=qzRecRange(q),
    on=x=>S.playing&&Q.act===x?' on':'',recd=!!S.recd,has=qzHas(ra,rb),A=qzAllLines(),L=getLines(),nm=Object.keys(r.mk||{}).length;
  const who=`<div class="qz-st qz-who">${Q.who?`<span class="${Q.who==='我'?'me':'ref'}">▶ 正在放：${Q.who}</span>`:`<span>${Q.cat==='beat'?'輪流比＝原唱開口、妳開口，聽是不是同一刻':'輪流比＝原唱一句、妳一句；聽到不對的字，在右邊點它'}</span>`}</div>`;
  const cmp=n0=>`<div class="qz-st"><b>${n0}</b><span>比一比</span><button data-q="alt" class="go${on('alt')}" ${has?'':'disabled'}>${on('alt')?'⏹ 停':'🔁 輪流比'}</button><button data-q="cmp" data-c="both" class="${on('both')}" ${has?'':'disabled'}>原唱＋我</button><button data-q="cmp" data-c="me" class="${on('me')}" ${has?'':'disabled'}>只聽我</button></div>${who}`;
  const recB=(n0,t)=>`<div class="qz-st"><b>${n0}</b><button data-q="rec" class="rec${recd?' on':''}">${recd?'⏹ 停止錄音':t}</button>${has&&!recd?'<span>✓ 錄好了，可以重錄</span>':''}</div>`;
  let title=esc(st.sec),tip='',steps='',right='';
  if(Q.cat==='pitch'){
    const J=q.t==='j'&&qzAnalyze()&&qzAnalyze().jump[q.l];
    title+=q.l!=null?`<small>・${q.t?QTYPE[q.t].n:'一句'}</small>`:'';
    tip=q.t==='j'?(J?`這句有一個大跳：${J.st>0?'往上':'往下'}跳 ${Math.abs(J.st)} 個半音。注意跳的那一下有沒有到位。比的時候只比跳的那附近。`:'這句有一個大跳，注意跳的那一下有沒有到位。'):q.t?QTYPE[q.t].t:QMODE[m].t;
    if(q.t)tip+=`<br>這題用${QMODE[m].v}的。`;
    steps=m==='mind'?`<div class="qz-st"><b>1</b><button data-q="mind" class="go${on('mind')}">${on('mind')?'⏹ 停':'▶ 開始'}（${q.l!=null?'這一句會消音':'中間會消音'}）</button></div>
      <div class="qz-st"><b>2</b><span>消音時在心裡繼續唱；聲音回來那一刻，妳還在音上嗎？對不上的字在右邊點它</span></div>`
     :q.t==='f'?`${recB(1,'⏺ 跟伴奏錄：前奏後直接唱第一個字')}${cmp(2)}<div class="qz-st"><b>3</b><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':'▶ 再聽一次原唱的開頭'}</button></div>`
     :`<div class="qz-st"><b>1</b><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':q.l!=null?'▶ 先聽原曲這句':'▶ 先聽原曲這段'}</button></div>${recB(2,`⏺ 跟伴奏${QMODE[m].v}一次`)}${cmp(3)}`;
    right=`<div class="qz-lyr${q.l!=null?' one':''}">${A.length?qzChars(q,r):`<p class="qz-tip">（這首還沒貼歌詞，就用提示：${esc(st.cue)}）</p>`}</div>
      <p class="qz-leg">點字標記：<span class="u">↑ 偏高</span> → <span class="d">↓ 偏低</span> → <span class="w">〰 不穩</span> → 取消${nm?`　・已標 ${nm} 個字`:''}</p>`;
  }else if(Q.cat==='lyr'){
    const pv=q.l>0?A[q.l-1]:'',len=[...A[q.l]].filter(c=>!/\s/.test(c)).length;
    title+='<small>・歌詞填空</small>';tip='詞遮起來了。伴奏從上一句開始放，輪到這句時，不看詞唱出來。唱完再對答案，卡住或唱錯的字點起來。';
    steps=`<div class="qz-st"><b>1</b><button data-q="lplay" class="go${on('lplay')}">${on('lplay')?'⏹ 停':'▶ 放伴奏，輪到時唱出這句'}</button></div>
      <div class="qz-st"><b>2</b><button data-q="rev" class="${Q.rev?'on':''}">${Q.rev?'🙈 再遮起來':'👀 對答案'}</button><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':'▶ 聽原唱這句'}</button></div>
      <div class="qz-st"><b>3</b><span>卡住、唱錯的字，在右邊點它</span></div>`;
    right=`${pv?`<p class="qz-prev">上一句：${esc(pv)}</p>`:'<p class="qz-prev">這是第一句</p>'}<div class="qz-lyr one">${Q.rev||nm?qzChars(q,r):`<p class="qz-blank">${'＿'.repeat(len)}<small>${len} 個字</small></p>`}</div>
      ${Q.rev||nm?`<p class="qz-leg">點字標記：<span class="x">✗ 卡住／唱錯</span> → 取消${nm?`　・已標 ${nm} 個字`:''}</p>`:''}`;
  }else if(Q.cat==='beat'){
    const pv=q.l>0?A[q.l-1]:'';title+='<small>・自己進來</small>';tip='伴奏會從這句前幾秒開始放，妳要在對的那一拍自己開口。錄完用「輪流比」聽原唱和妳是不是同一刻開口。';
    steps=`${recB(1,'⏺ 跟伴奏錄：自己準時進來')}${cmp(2)}<div class="qz-st"><b>3</b><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':'▶ 聽原唱怎麼進'}</button></div>`;
    right=`${pv?`<p class="qz-prev">上一句：${esc(pv)}</p>`:''}<div class="qz-lyr one"><p class="qz-entry"><b>${esc([...A[q.l]][0]||'')}</b>${esc([...A[q.l]].slice(1).join(''))}</p></div><p class="qz-leg">第一個字要準時：慢半拍、搶太早都算沒過。</p>`;
  }else{
    const sts=sc.steps,prev=sts.slice(0,q.s);title=`第 ${q.s+1} 段是？`;tip=q.s?'聽上一段的結尾，說出：下一段是什麼段落？第一句怎麼唱？說完再對答案。':'這首歌一開頭是什麼？第一句怎麼唱？說完再對答案。';
    steps=`<div class="qz-st"><b>1</b><button data-q="mprev" class="go${on('mprev')}">${on('mprev')?'⏹ 停':q.s?'▶ 聽上一段的結尾':'▶ 聽前奏'}</button></div>
      <div class="qz-st"><b>2</b><span>說出來：什麼段落？第一句是？</span></div>
      <div class="qz-st"><b>3</b><button data-q="rev" class="${Q.rev?'on':''}">${Q.rev?'🙈 再遮起來':'👀 對答案'}</button><button data-q="mplay" class="${on('mplay')}">${on('mplay')?'⏹ 停':'▶ 聽這段開頭'}</button></div>`;
    const fl=qzLines(q.s)[0]||'';
    right=`<div class="qz-chain">${prev.slice(-4).map((x,i)=>`<span>${q.s-Math.min(4,prev.length)+i+1}・${esc(x.sec)}</span>`).join('<i>→</i>')}${prev.length?'<i>→</i>':''}<span class="cur">？</span></div>
      <div class="qz-lyr one">${Q.rev?`<p class="qz-ans"><b>${esc(sts[q.s].sec)}</b><small>${esc(sts[q.s].word)}・${esc(sts[q.s].cue)}</small></p><p>${esc(fl)}</p>`:'<p class="qz-blank">？？？</p>'}</div>`;
  }
  el.innerHTML=`<div class="qz-hush">🤫 在心裡繼續唱…</div>${qzHead()}
  <div class="qz-t"><span class="qz-sec">${title}</span><span class="qz-time">${mmss(a)}–${mmss(b)}</span>${Q.cat==='pitch'?`<span class="qz-modes">${Object.keys(QMODE).filter(k=>q.t!=='f'||k!=='mind').map(k=>`<button data-q="mode" data-m="${k}" class="${k===m?'on':''}">${QMODE[k].n}</button>`).join('')}</span>`:''}</div>
  <p class="qz-tip">${tip}</p>
  <div class="qz-b"><div class="qz-steps">${steps}
      <div class="qz-res"><span>這題的結果<small>過關＝${C.pass}</small></span>${Object.keys(C.res).map(k=>`<button data-q="res" data-v="${k}" class="${k}${r.res===k?' on':''}">${C.res[k]}</button>`).join('')}</div>
      <div class="qz-nav"><button data-q="go" data-j="${Q.i-1}" ${Q.i?'':'disabled'}>← 上一題</button>${Q.i<n-1?`<button data-q="go" data-j="${Q.i+1}" class="go">下一題 →</button>`:'<button data-q="sum" class="go">看成績單 →</button>'}</div></div>
    <div class="qz-r">${right}<input class="qz-in" data-q="note" placeholder="筆記：例如「人海」的海掉下來" value="${esc(r.n||'')}"></div></div>`;
  Q.k=-2;
}
app.addEventListener('click',e=>{
  const t=e.target.closest('#studio [data-q]');if(!t||!S)return;const a=t.dataset.q;
  if(a==='open'){Q?qzClose():qzOpen();return}
  if(!Q||a==='note')return;const q=Q.list[Q.i];
  if(a==='x'){qzClose();return}
  if(a==='cat'){if(S.recd)return;sStop();qzLS('scene-pquiz-cat',t.dataset.cat);qzBuild();qzStart();return}
  if(a==='kind'){if(S.recd)return;sStop();qzLS('scene-pquiz-kind',t.dataset.kind);qzBuild();qzStart();return}
  if(a==='sum'){if(S.recd)return;Q.seq=null;sStop();Q.sum=true;qzRender();return}
  if(a==='back'){Q.sum=false;if(Q.list.length)qzFocus();qzRender();return}
  if(a==='go'){qzGo(+t.dataset.j);return}
  if(a==='more'){const n0=Q.list.length;if(!qzDraw(Q.cat,10)){qzHint('這首的句子都抽過了');return}qzBuild();qzGo(Math.min(n0,Q.list.length-1));return}
  if(!q)return;
  if(a==='mode'){if(S.recd)return;sStop();qzSet(q.id,{m:t.dataset.m});Q.act='';qzRender()}
  else if(a==='listen'){const [x,y]=q.cat==='beat'?qzRange(q):qzRecRange(q);qzPlay('listen',q.cat==='lyr'?[qzRef()]:qzOrig(),q.cat==='beat'?x-2:x-1.5,y+.4)}
  else if(a==='mind')qzMind(q);
  else if(a==='alt')qzAlt(q);
  else if(a==='cmp'){const c=t.dataset.c,[x,y]=qzRange(q);qzPlay(c,c==='both'?[qzRef(),'me']:['me'],x-.5,y+.3)}
  else if(a==='rec')qzRec(q);
  else if(a==='lplay'){const [x,y]=qzLineRange(q.l),pv=getLines()[q.l-1],from=pv!=null&&pv<x&&x-pv<12?pv-.3:x-4;qzPlay('lplay',[qzBack()],from,y+.5)}
  else if(a==='rev'){Q.rev=!Q.rev;qzRender()}
  else if(a==='mprev'){const [x]=secRange(q.s);qzPlay('mprev',qzOrig(),q.s?x-6:0,x+.05)}
  else if(a==='mplay'){const [x,y]=secRange(q.s);qzPlay('mplay',qzOrig(),x-.3,Math.min(y,x+8))}
  else if(a==='mk'){const MK=QMARKS[q.cat];if(!MK)return;const r=qzGet(q.id),mk=Object.assign({},r.mk||{}),k=t.dataset.k,o=['',...MK.map(x=>x[0])],nx=o[(o.indexOf(mk[k]||'')+1)%o.length];if(nx)mk[k]=nx;else delete mk[k];qzSet(q.id,{mk});
    const M=MK.find(x=>x[0]===nx);t.className=(nx||'')+(t.classList.contains('focus')?' focus':'');const i=t.querySelector('i');if(i)i.remove();if(M)t.insertAdjacentHTML('beforeend',`<i>${M[1]}</i>`);
    const lg=document.querySelector('#s-quiz .qz-leg');if(lg){const n=Object.keys(mk).length;lg.lastChild.nodeType===3&&/已標/.test(lg.lastChild.textContent)&&lg.lastChild.remove();if(n)lg.insertAdjacentText('beforeend',`　・已標 ${n} 個字`)}}
  else if(a==='res'){const v=t.dataset.v;qzSet(q.id,{res:qzGet(q.id).res===v?null:v});qzRender()}
},true);
app.addEventListener('input',e=>{const t=e.target;if(!Q||t.dataset.q!=='note'||!Q.list[Q.i])return;qzSet(Q.list[Q.i].id,{n:t.value})});
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
.qz-modes{display:flex;gap:6px;margin-left:auto}.qz-kind{display:flex;gap:4px}#studio .qz-kind button{padding:5px 10px;font-size:12px}.qz-sec small{font-size:13px;color:var(--muted);font-weight:400}
.qz-lyr.one p{font-size:32px;line-height:1.7;padding:10px 8px}.qz-who span.ref{color:#8cc8ff}.qz-who span.me{color:#ff8a80;font-weight:600}.qz-who span{font-size:13px}
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
.qz-cats{display:flex;gap:4px;flex-wrap:wrap}#studio .qz-cats button{padding:6px 12px}
.qz-h2{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.qz-prev{margin:0 0 6px;color:var(--muted);font-size:14px}
.qz-blank{font-size:30px;letter-spacing:.12em;color:rgba(255,255,255,.35)}.qz-blank small{white-space:nowrap;font-size:12px;letter-spacing:0;margin-left:10px;color:var(--muted)}
.qz-entry b{color:var(--glow);font-size:1.25em;border-bottom:3px solid var(--glow)}
.qz-chain{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:8px;font-size:13px;color:var(--muted)}.qz-chain span{border:1px solid var(--line);border-radius:99px;padding:3px 10px}.qz-chain span.cur{border-color:var(--glow);color:var(--glow);font-weight:700}.qz-chain i{font-style:normal}
.qz-ans b{color:var(--glow);font-size:30px;margin-right:12px}.qz-ans small{font-size:14px;color:var(--muted)}
.qz-lyr span.focus{box-shadow:inset 0 -3px 0 var(--glow)}
.qz-lyr span.x,.qz-leg .x,.qz-words .x{background:rgba(232,128,111,.38)}
@media (max-width:820px){#studio.quiz{grid-template-rows:auto minmax(0,1fr) auto 120px auto auto}#studio.quiz .s-lane:not(.me){flex:0 0 24px!important}.qz-b{grid-template-columns:1fr;gap:10px}.qz-modes{margin-left:0}.qz-lyr p{font-size:19px}#s-quiz{padding:10px 12px}.qz-dots{order:5;flex-basis:100%}.qz-r{order:-1}.qz-blank{font-size:20px;letter-spacing:.06em}.qz-lyr.one p{font-size:24px}.qz-ans b{font-size:24px}.qz-lyr p{font-size:18px;line-height:1.5}#studio.quiz .s-take{display:none}#studio.quiz{grid-template-rows:auto minmax(0,1fr) auto 130px auto auto}#studio.quiz .s-lanes{overflow:hidden}}
`;document.head.appendChild(s)})();
