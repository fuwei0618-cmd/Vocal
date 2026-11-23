// 題組：在錄音室裡一題一題測，像考題一樣。四份卷：🎯 音準／📝 歌詞／🥁 進拍／🗺 架構
// 音準：每次抽 10 題（整句、句首音、句尾長音、高音句、大跳音），錄完「輪流比」＝原唱一句、我一句，聽到不對的字點起來
// 以前錯過的題目優先再考；成績單列出要練的字
const QZK='scene-pquiz-v1';
let Q=null;
const QMODE={
  sing:{n:'🎤 唱',v:'唱',t:'照平常唱：歌詞加旋律一起測，看咬字時音會不會跑。'},
  hum:{n:'🎵 哼',v:'哼',t:'用哼的（嗯～），不唱詞：只剩旋律，最容易聽出音高準不準。'},
  mind:{n:'🧠 腦內',v:'腦內唱',t:'原曲會在這裡消音，妳在心裡繼續唱；聲音回來那一刻，聽自己還在不在音上。'}};
const QCAT={
  pitch:{n:'🎯 音準',res:{ok:'✓ 準',some:'△ 低空飛過',bad:'✗ 不及格'},sc:['準','低空飛過','不及格'],pass:'不準的字不超過 2 個'},
  lyr:{n:'📝 歌詞',res:{ok:'✓ 全對',some:'△ 卡 1～2 個字',bad:'✗ 想不起來'},sc:['全對','卡幾個字','想不起來'],pass:'整句唱得出來，卡不超過 2 個字'},
  beat:{n:'🥁 進拍',res:{ok:'✓ 準時',some:'⏩ 搶太早',bad:'⏪ 慢半拍'},sc:['準時','搶太早','慢半拍'],pass:'跟原唱同一刻開口'},
  map:{n:'🗺 架構',res:{ok:'✓ 說對',some:'△ 說對一半',bad:'✗ 想不起來'},sc:['說對','一半','想不起來'],pass:'段落和第一句都說得出來'}};
const QTYPE={
  '':{n:'整句',t:''},
  f:{n:'句首音',t:'不先聽原唱：伴奏放到這句前，直接唱出第一個字。考的是「起音」記不記得。比的時候只比開頭。'},
  t:{n:'句尾長音',t:'這句最後的長音：撐住、不往下掉、不抖。想只聽句尾，用右邊「✂️ 框選幾個字」。'},
  h:{n:'高音句',t:'這句是整首最高的幾句之一（從原唱人聲聽出來的）：注意有沒有真的唱上去。'},
  j:{n:'大跳音',t:''},
  s:{n:'整段連唱',t:'這個 Part 一句一句考完了，最後整段連起來唱一次：換句、換氣的地方音有沒有跑掉。'}};
const qzBrush=()=>qzLS('scene-qbrush')||'d';
const QMARKS={pitch:[['d','↑','再高'],['u','↓','再低'],['w','〰','穩定'],['r','♫','轉音'],['k','😬','咬字'],['a','⚠','注意']],lyr:[['x','✗','卡住／唱錯'],['k','😬','咬字'],['a','⚠','注意']]};
const qzDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function qzAll(){try{return JSON.parse(localStorage.getItem(QZK)||'{}')||{}}catch(e){return {}}}
function qzDayRec(){return (qzAll()[key]||{})[qzDay()]||{}}
function qzGet(id){const T=qzAll()[key]||{},D=T[qzDay()]||{};if(D[id])return D[id];const ds=Object.keys(T).filter(d=>d<qzDay()).sort().reverse();for(const d of ds)if(T[d][id]&&T[d][id].res)return T[d][id];return {}}
function qzSet(id,o,raw){const A=qzAll(),T=A[key]=A[key]||{},D=T[qzDay()]=T[qzDay()]||{};D[id]=raw?o:Object.assign(D[id]||{},o);try{localStorage.setItem(QZK,JSON.stringify(A))}catch(e){}}
const qzLS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||'';localStorage.setItem(k,v)}catch(e){return ''}};
// ---------- 歌詞、時間 ----------
const qzAllLines=()=>blocks?blocks.flat():[];
function qzLines(s){return blocks&&blocks[s]?blocks[s]:[]}
function qzPool(){const L=getLines(),A=qzAllLines();return A.map((t,i)=>i).filter(i=>L[i]!=null&&A[i].replace(/\s/g,'').length>1)}
function qzLineRange0(g){const L=getLines(),s=secOfLine(g),[,e]=secRange(s),a=L[g];let b=L[g+1];if(b==null||b<=a||secOfLine(g+1)!==s)b=e;return [a,Math.min(b,a+12)]}
// 每句的範圍：先用原唱人聲檔把句尾沒在唱的部分剪掉（間奏、換氣很長的地方），再套她自己調過的
const qzRngAll=()=>{try{return JSON.parse(qzLS('scene-qrng')||'{}')||{}}catch(e){return {}}};
const qzTrimC=new Map();
function qzTrimEnd(a,b){const l=qLane('vocal');if(!l||b-a<1.5)return b;const k=key+'|'+a.toFixed(2)+'|'+b.toFixed(2);if(qzTrimC.has(k))return qzTrimC.get(k);
  const bf=l.buf,sr=bf.sampleRate,d=bf.getChannelData(0),d1=bf.numberOfChannels>1?bf.getChannelData(1):d,W=Math.round(sr*.02),th=laneLoud(bf)*.22;
  const en=i=>{let s2=0;for(let k2=i;k2<i+W&&k2<d.length;k2++){const x=(d[k2]+d1[k2])/2;s2+=x*x}return Math.sqrt(s2/W)};
  let last=null;for(let i=Math.min(d.length-W,Math.round(b*sr)-W);i>Math.round((a+.5)*sr);i-=W){if(en(i)>=th){last=(i+W)/sr;break}}
  const nb=last==null?b:Math.min(b,last+.6),r=b-nb>.8?nb:b;qzTrimC.set(k,r);return r}
function qzLineAuto(g){const [a,b]=qzLineRange0(g);return [a,qzTrimEnd(a,b)]}
function qzWholeAuto(sec){const L=getLines(),[sa,sb]=secRange(sec),f=L[lineOff(sec)],a=f!=null&&f>=sa&&f<sb?f:sa;return [a,qzTrimEnd(a,sb)]}
// 幾句一組連唱（她自己選的，例如第 1–3 句）：從第一句開頭到最後一句結束
function qzGrpAuto(q){const L=getLines(),[,sb]=secRange(q.s),o=lineOff(q.s),g0=o+q.a-1,g1=o+q.b-1,a=L[g0];if(a==null)return qzWholeAuto(q.s);
  let e=L[g1+1];if(e==null||e<=a||secOfLine(g1+1)!==q.s)e=sb;return [a,qzTrimEnd(a,e)]}
function qzMultiAuto(q){return [qzWholeAuto(q.s0)[0],qzWholeAuto(q.s)[1]]}
function qzWholeRange(sec,q){const o=(qzRngAll()[key]||{})[q&&(q.a||q.R)?qzRk(q):'S'+sec];if(o&&o.length===2&&o[1]>o[0])return o;return q&&q.R?qzMultiAuto(q):q&&q.a?qzGrpAuto(q):qzWholeAuto(sec)}
const qzRk=q=>q.l!=null?q.l:q.R?'R'+q.s0+'-'+q.s:q.a?'S'+q.s+'.'+q.a+'-'+q.b:'S'+q.s,qzRAuto=q=>q.l!=null?qzLineAuto(q.l):q.R?qzMultiAuto(q):q.a?qzGrpAuto(q):qzWholeAuto(q.s),qzRCur=q=>q.l!=null?qzLineRange(q.l):qzWholeRange(q.s,q);
function qzLineRange(g){const o=(qzRngAll()[key]||{})[g];if(o&&o.length===2&&o[1]>o[0])return o;return qzLineAuto(g)}
// 每段開頭、或前面空很久的句子＝要自己進拍的地方
function qzEntries(){const L=getLines();return qzPool().filter(g=>g===0||L[g-1]==null||secOfLine(g)!==secOfLine(g-1)||L[g]-qzLineRange(g-1)[0]>6)}
// ---------- 原唱音高分析（有「原唱人聲」那軌才做）：找高音句、大跳音 ----------
// 人聲分析（哪幾句最高、哪裡有大跳）很花時間：算好存起來，句子時間沒改就直接用
const qzPASig=()=>qzPool().map(g=>qzLineRange0(g).map(x=>x.toFixed(1)).join('-')).join(',');
function qzAnalyze(){const c=window._qzPA||(window._qzPA={});if(c[key])return c[key];
  let sv;try{sv=(JSON.parse(localStorage.getItem('scene-qpa')||'{}')||{})[key]}catch(e){}const sig=qzPASig();if(sv&&sv.sig===sig)return c[key]={hi:sv.hi,jump:sv.jump};
  const r=qzAnalyze0();if(r){try{const A=JSON.parse(localStorage.getItem('scene-qpa')||'{}')||{};A[key]={sig,hi:r.hi,jump:r.jump};localStorage.setItem('scene-qpa',JSON.stringify(A))}catch(e){}}return r}
// 人聲軌晚一點才解好：題庫（高音句、大跳）重算一次
function qzLaneReady(id){if(id!=='vocal'||!Q)return;window._qzPA&&delete window._qzPA[key];qzTrimC.clear&&qzTrimC.clear();Q.bank=null;if(Q.home)qzRender()}
function qzAnalyze0(){const c=window._qzPA;const ln=qLane('vocal');if(!ln)return null;
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
// ---------- 題庫（像考照 App）：整首每一句都出題；每份卷可以照順序或隨機，Part 照段落分 ----------
const QRE={whole:/^P(\d+)(?:\.(\d+)-(\d+))?$/,multi:/^R(\d+)-(\d+)$/,pitch:/^L(\d+)([ftjh]?)$/,lyr:/^Y(\d+)$/,beat:/^B(\d+)$/};
const QCATS=['pitch','lyr','beat','map'];
const QPAPER={all:{n:'🔀 全部混合'},pitch:{n:'🎯 音準'},lyr:{n:'📝 歌詞'},beat:{n:'🥁 進拍'},map:{n:'🗺 架構'},wrong:{n:'❌ 錯題本'}}; // 「今天練什麼」健檢跟這個同順序
function qzQ(id,j){let m;
  if((m=id.match(QRE.pitch))){const l=+m[1],t=m[2]||'';return {id,cat:'pitch',l,s:secOfLine(l),t,m:'sing'}/* 每題都先唱 */}
  if((m=id.match(QRE.multi)))return {id,cat:'pitch',l:null,s:+m[2],s0:+m[1],R:1,t:'s',m:'sing'}; // 好幾個 Part 一起連唱
  if((m=id.match(QRE.whole)))return m[2]?{id,cat:'pitch',l:null,s:+m[1],t:'s',m:'sing',a:+m[2],b:+m[3]}:{id,cat:'pitch',l:null,s:+m[1],t:'s',m:'sing'}; // 整段連唱：這個 Part 每句考完，最後整段唱一次
  if((m=id.match(QRE.lyr)))return {id,cat:'lyr',l:+m[1],s:secOfLine(+m[1])};
  if((m=id.match(QRE.beat)))return {id,cat:'beat',l:+m[1],s:secOfLine(+m[1])};
  if((m=id.match(/^M(\d+)$/)))return {id,cat:'map',s:+m[1]};
  return null}
// 音準題的題型：大跳音、高音句（有原唱人聲才分析得出來）＞每段第一句＝句首音＞每段最後一句＝句尾長音＞其他整句
const qzGrpAll=()=>{try{return JSON.parse(qzLS('scene-qgrp')||'{}')||{}}catch(e){return {}}};
function qzGrps(s){return ((qzGrpAll()[key]||{})[s]||[]).filter(g=>g[1]<=qzLines(s).length).sort((x,y)=>x[0]-y[0]||x[1]-y[1])}
function qzGrpSave(s,f){const A=qzGrpAll(),B=A[key]=A[key]||{};B[s]=f(B[s]||[]);qzLS('scene-qgrp',JSON.stringify(A))}
// 幾句一組：點第一句、再點最後一句，就多一題「第 a–b 句連唱」（放在這個 Part 的整段連唱前面）
function qzGrpRow(q){const n=qzLines(q.s).length,gs=qzGrps(q.s),sel=Q.gsel;
  return `<div class="qz-tr qz-grp"><span class="qz-tl">幾句一組</span>${Array.from({length:n},(_,i)=>i+1).map(k=>`<button data-q="grp" data-n="${k}" class="${sel===k?'on':q.a&&k>=q.a&&k<=q.b?'in':''}">${k}</button>`).join('')}<span class="qz-tg">${sel?`再點最後一句（從第 ${sel} 句）`:'點第一句、再點最後一句'}</span></div>
  ${gs.length||q.a?`<div class="qz-tr qz-grp"><span class="qz-tl">已經組好</span>${gs.map(([a,b])=>{const id=`P${q.s}.${a}-${b}`;return `<span class="qz-gc${q.id===id?' cur':''}"><button data-q="grpgo" data-id="${id}">${a}–${b}</button><button data-q="grpdel" data-id="${id}" aria-label="刪掉這組">✕</button></span>`}).join('')}<button data-q="grpgo" data-id="P${q.s}" class="${q.a?'':'cur'}">整段</button></div>`:''}`}
function qzGoId(id){let i=Q.list.findIndex(x=>x.id===id);if(i<0){const nq=qzQ(id);if(!nq)return;const w=Q.list.findIndex(x=>x.id==='P'+nq.s);i=w<0?Q.i+1:w;Q.list.splice(i,0,nq)}
  sStop();Q.seq=null;Q.act='';Q.i=i;qzSaveLast();qzFocus();qzRender()}
function qzBank(){const pool=qzPool(),pa=qzAnalyze(),out=[],L=getLines(),ent=new Set(qzEntries());
  const H=pa?Object.keys(pa.hi).map(Number).sort((x,y)=>pa.hi[y]-pa.hi[x]).slice(0,Math.max(4,Math.round(pool.length/6))):[];
  const lastOf=g=>secOfLine(g+1)!==secOfLine(g)||g===qzAllLines().length-1,firstOf=g=>g===0||secOfLine(g-1)!==secOfLine(g);
  let sec=-1;
  pool.forEach(g=>{const s=secOfLine(g);
    for(let k=sec+1;k<=s;k++)out.push(qzQ('M'+k));sec=Math.max(sec,s);
    if(ent.has(g))out.push(qzQ('B'+g));
    out.push(qzQ('Y'+g));
    const t=pa&&pa.jump[g]?'j':H.includes(g)?'h':firstOf(g)?'f':lastOf(g)?'t':'';out.push(qzQ('L'+g+t));
    if(lastOf(g)&&qzLines(s).length>=2){qzGrps(s).forEach(([a,b])=>out.push(qzQ(`P${s}.${a}-${b}`)));out.push(qzQ('P'+s))}});
  for(let k=sec+1;k<SCENES[key].steps.length;k++)out.push(qzQ('M'+k));
  qzMultis().forEach(([a,b])=>{const q=qzQ(`R${a}-${b}`);let i=-1;out.forEach((x,j)=>{if(x.cat==='pitch'&&x.s<=b)i=j});out.splice(i+1,0,q)});
  return out}
const qzMultis=()=>((qzGrpAll()[key]||{}).R||[]).filter(g=>g[1]<SCENES[key].steps.length);
// 每一題最近一次的作答（今天的優先）
function qzLatest(){const T=qzAll()[key]||{},o={};Object.keys(T).sort().forEach(d=>Object.keys(T[d]).forEach(id=>{const r=T[d][id];if(r&&r.res)o[id.replace(/^(L\d+)[ftjh]$/,'$1')]=r.res}));return o}
const qzBase=id=>id.replace(/^(L\d+)[ftjh]$/,'$1');
// 錯題本分類：單句／幾句一組／整段／幾個 Part
const QKIND={line:'單句',grp:'幾句一組',whole:'整段',multi:'幾個 Part'};
const qzKind=q=>q.R?'multi':q.t==='s'&&q.a?'grp':q.t==='s'||q.l==null?'whole':'line';
// 每一卷都能切「只考錯題」（最近一次 △ 或 ✗）和題型（單句／幾句一組／整段／幾個 Part）；plain=1 不套這兩個
function qzPaperList(cat,part,plain){const bank=Q.bank||(Q.bank=qzBank()),lt=qzLatest(),wo=cat==='wrong'||(!plain&&Q.wo),wk=plain?'all':Q.wk||'all';
  return bank.filter(q=>(cat==='all'||cat==='wrong'||q.cat===cat)&&(!wo||lt[qzBase(q.id)]==='some'||lt[qzBase(q.id)]==='bad')&&(part==='all'||q.s===+part)&&(wk==='all'||qzKind(q)===wk))}
function qzDoneN(list){const lt=qzLatest();return list.filter(q=>lt[qzBase(q.id)]).length}
function qzPct(list){const lt=qzLatest();if(!list.length)return 0;return Math.round(list.filter(q=>lt[qzBase(q.id)]==='ok').length/list.length*100)}
function qzShuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const qzLastAll=()=>{try{return JSON.parse(qzLS('scene-pquiz-last')||'{}')||{}}catch(e){return {}}};
function qzSaveLast(){if(!Q||!Q.paper)return;const A=qzLastAll();A[key]=Object.assign({},Q.paper,{ids:Q.list.map(q=>q.id),i:Q.i,t:Date.now(),song:SCENES[key].title,name:qzPaperName(Q.paper)});qzLS('scene-pquiz-last',JSON.stringify(A))}
function qzPaperName(p){const sc=SCENES[key];return QPAPER[p.cat].n+(p.part==='all'?'':`・Part ${+p.part+1} ${sc.steps[+p.part].sec}`)+(p.wo?'・只考錯題':'')+(p.wk&&QKIND[p.wk]?'・'+QKIND[p.wk]:'')+(p.ord==='rand'?'・隨機':'・照順序')}
function qzBegin(cat,part,ord,ids,i){const list=ids?ids.map(id=>qzQ(id)).filter(Boolean):qzPaperList(cat,part);if(!list.length){qzHint('這份卷現在沒有題目');return}
  Q.paper={cat,part,ord,wk:!ids&&Q.wk&&Q.wk!=='all'?Q.wk:undefined,wo:!ids&&Q.wo?1:undefined};Q.list=ord==='rand'&&!ids?qzShuffle(list):list;Q.home=false;Q.sum=false;Q.i=Math.min(i||0,Q.list.length-1);Q.act='';Q.rev=false;Q.seq=null;Q.k=-2;qzSaveLast();qzFocus();qzRender()}
function qzText(q){if(q.R){let o=[];for(let k=q.s0;k<=q.s;k++)o=o.concat(qzLines(k));return o}return q.l!=null?[qzAllLines()[q.l]||'']:q.cat==='map'?[]:q.a?qzLines(q.s).slice(q.a-1,q.b):qzLines(q.s)}
function qzGl(q,li){if(q.R)return (blocks?lineOff(q.s0):0)+li;return q.l!=null?q.l:(blocks?lineOff(q.s):0)+(q.a?q.a-1:0)+li}
// 這題要比的範圍
function qzRange(q){if(q.t==='s')return qzWholeRange(q.s,q);if(q.cat==='map'||q.l==null)return secRange(q.s);const [a,b]=qzLineRange(q.l);
  if(q.cat==='beat')return [Math.max(0,a-1),a+2.5];
  if(q.cat!=='pitch')return [a,b];
  if(q.t==='f')return [a,Math.min(b,a+1.5)];
  return [a,b]}
// 這題要錄的範圍
function qzRecRange(q){if(q.t==='s')return qzWholeRange(q.s,q);if(q.l==null)return secRange(q.s);const [a,b]=qzLineRange(q.l);if(q.cat==='beat')return [Math.max(0,a-2),a+2.5];if(q.t==='f')return [a,Math.min(b,a+1.5)];return [a,b]}
const qzCut=q=>Q&&Q.cut&&Q.cutQ===q.id?Q.cut:null;
function qzRanges(q){if(qzCut(q))return [qzCut(q)];if(q.l!=null||q.cat==='beat'||q.t==='s')return [qzRange(q)];const L=getLines(),n=qzText(q).length,out=[];for(let li=0;li<n;li++){const g=qzGl(q,li);if(L[g]!=null)out.push(qzLineRange(g))}return out.length?out:[qzRange(q)]}
const qLane=id=>S&&S.lanes.find(l=>l.id===id&&(id==='me'||l.buf));
const qzRef=()=>qLane('vocal')?'vocal':qLane('orig')?'orig':'inst';
const qzBack=()=>qLane('inst')?'inst':'orig';
const qzOrig=()=>qLane('orig')?(qLane('vocal')?['orig','vocal']:['orig']):[qzBack(),qzRef()];/* 原曲裡人聲常被伴奏蓋住：有人聲軌就疊上去 */
function qzHear(ids){S.lanes.forEach(l=>{l.solo=false;l.mute=!ids.includes(l.id)});sGains();sDraw()}
function qzHas(a,b){return sCover().some(c=>c.a<b-.2&&c.b>a+.2)}
function qzHint(t){if(Q){Q.tip=t;const e=document.querySelector('#s-quiz .qz-tipbar');if(e){e.textContent=t;e.hidden=!t}clearTimeout(Q.tipT);Q.tipT=setTimeout(()=>{if(Q){Q.tip='';const e2=document.querySelector('#s-quiz .qz-tipbar');if(e2)e2.hidden=true}},6000)}else try{sHint(t)}catch(e){}}
// ---------- 開關、播放 ----------
function qzOpen(cat){
  if(!S)return;if(getTimes().length<2){qzHint('這首還沒對拍：先在歌詞表對拍，題組才知道每一段在哪裡');return}
  if(S.recd)return;sStop();
  Q={prev:S.lanes.map(l=>({id:l.id,mute:l.mute,solo:l.solo})),act:'',mute:null,k:-2,home:true,hc:QPAPER[cat]?cat:(qzLS('scene-pquiz-hc')||'pitch'),list:[],i:0};
  if(!QPAPER[Q.hc])Q.hc='pitch';Q.wo=qzLS('scene-pquiz-wo')==='1';if(Q.hc==='wrong'){Q.hc='all';Q.wo=true}
  S.big=false;S.noBig=1;sBig();qzRender();setTimeout(sLayout,50);
}
function qzClose(){
  if(!Q)return;qzSlowStop();if(S){if(S.recd)_qzRecStop(true);sStop();Q.prev.forEach(p=>{const l=S.lanes.find(x=>x.id===p.id);if(l){l.mute=p.mute;l.solo=p.solo}});sGains();S.stopAt=0}
  if(S)S.noBig=0;Q=null;const el=document.getElementById('s-quiz');if(el)el.remove();document.querySelector('#studio .qz-x')?.remove();const d=document.getElementById('studio');if(d)d.classList.remove('quiz');if(S)setTimeout(sLayout,50);qzTdel();
}
function qzFocus(){const q=Q.list[Q.i];if(!q)return;S.sel=qzRecRange(q);{const [x,y]=S.sel,k=takes.slice().sort((u,v)=>v.at-u.at).find(k=>k.start<y&&k.end>x);S.selTake=k?k.id:null}S.loop=false;S.pos=S.sel[0];sView0();sDraw()}
function qzGo(j){if(S&&S.recd)return;Q.seq=null;sStop();Q.i=Math.max(0,Math.min(Q.list.length-1,j));Q.sum=false;Q.act='';Q.rev=false;Q.k=-2;qzSaveLast();qzFocus();qzRender()}

// ---------- 音高提示：照她給的簡譜，一個字一個音（原調 Eb，跟著升降 Key）。預設收起來，免得太依賴 ----------
// 每個字：字 音(用 - 連，.＝低八度，'＝高八度，b＝降) 拍數
const QNOTES={houlai:{base:63,bpm:75,song:'後 3-2 .5|來 1 1.5|我 1 .5|總 1 .5|算 2 .5|學 3 .5|會 4 .5|了 3 1.5|如 3-4 .5|何 2 .25|去 1 .25|愛 2 .75|可 7. .25|惜 7. .25|你 1 1.25|早 6. .25|已 6. .25|遠 7. .25|去 1 1|消 1 .5|失 2 .5|在 3 .25|人 7. .25|海 7. 3|後 1-7. .5|來 6. 1.5|終 6 .5|於 5 .5|在 4 .5|眼 3 .5|淚 4 .5|中 5 1.5|明 7. .5|白 1 1.5|有 4 .25|些 3 .25|人 4 1.5|一 4 .25|旦 4 .25|錯 3 .5|過 2 .5|就 1 .25|不 7. .25|再 2-1 3.5|梔 1 .25|子 7. .25|花 1 1.5|白 3. .25|花 4. .25|瓣 5. 2.5|落 6. .25|在 6. .25|我 6. 1|藍 5. .5|色 4. .5|百 6. .5|褶 5. .25|裙 2. .25|上 3. 3|愛 4.-5. 2|你 5. 1.5|你 3. .5|輕 5. 1.5|聲 6. .5|說 6. 2|我 4. .25|低 6. .25|下 6. .25|頭 1 .75|聞 1 .25|見 2 .25|一 7. .5|陣 6. .5|芬 6. .5|芳 5. 2.5|那 1 .25|個 7. .25|永 1 1|恆 1 .5|的 3. .5|夜 4. .5|晚 5. 2|十 6. .5|七 5. .5|歲 4. .5|仲 3. .5|夏 4. 1.5|你 4. .25|吻 4. .25|我 b6. .5|的 b6. 1|那 5. .25|個 4. .25|夜 b6. .5|晚 5. 3|讓 6. .5|我 7. .5|往 1 .5|後 1 .5|的 1 .5|時 2 .5|光 3 1.5|每 3 .5|當 4 .5|有 3 .5|感 2-1 .5|嘆 2 2|總 6. .25|想 6. .25|起 7. 1|當 7. .25|天 1 .25|的 2 .5|星 2-1 .5|光 1 3|那 1 .25|時 7. .25|候 1 1.5|的 3. .25|愛 4. .25|情 5. 4|為 6. .25|什 6. .25|麼 6. 1|就 5. .5|能 4. .5|那 6. .5|樣 5. .5|簡 2. .5|單 3. 2.5|而 3. .5|又 4. .5|是 4. .5|為 4. .5|什 5. .5|麼 5. 1.5|人 3. .5|年 5. 1.5|少 6. .5|時 6. 2|一 4. .5|定 6. .5|要 6. .5|讓 1 .5|深 1 .5|愛 2 .5|的 7. .5|人 6. .5|受 6. .5|傷 5. 2.5|在 1 .5|這 1 .5|相 7. .5|似 1 .5|的 1 .5|深 3. .5|夜 4. .5|裡 5. 2|你 6. .5|是 5. .5|否 4. .5|一 3. .5|樣 4. 1.5|也 4. .25|在 4. .25|靜 b6. .5|靜 b6. 1|追 5. .25|悔 4. .25|感 b6. .5|傷 5. 3|如 6. .5|果 7. .5|當 1 .5|時 1 .5|我 1 .5|們 2 .5|能 3 1.5|不 3 .5|那 4 .5|麼 3 .5|倔 2-1 1|強 2 1.5|現 6. .25|在 6. .25|也 7. 1|不 7. .25|那 1 .25|麼 2 .5|遺 2-1 .5|憾 1 2.5|你 6. .25|都 6. .25|如 4 .5|何 3 .5|回 4 .25|憶 1 .25|我 7. 1.5|帶 6. .25|著 6. .25|笑 6. .25|或 5 .5|是 4 .5|很 5 .25|沈 4 .25|默 3 1.5|這 3 .25|些 3 .25|年 2 .5|來 1 1.25|有 6. .25|沒 6. .25|有 7. .25|人 1 .5|能 6. .5|讓 1 .5|你 3 .5|不 3 .25|寂 2 .25|寞 2 2.5|後 3-2 .5|來 1 1.5|我 1 .5|總 1 .5|算 2 .5|學 3 .5|會 4 .5|了 3 1.5|如 3-4 .5|何 2 .25|去 1 .25|愛 2 .75|可 7. .25|惜 7. .25|你 1 1.25|早 6. .25|已 6. .25|遠 7. .25|去 1 1|消 1 .5|失 2 .5|在 3 .25|人 7. .25|海 7. 3|後 1-7. .5|來 6. 1.5|終 6 .5|於 5 .5|在 4 .5|眼 3 .5|淚 4 .5|中 5 1.5|明 7. .5|白 1 1.5|有 4 .25|些 3 .25|人 4 1.5|一 4 .25|旦 4 .25|錯 3 .5|過 2 .5|就 1 .25|不 7. .25|再 2-1 3.5|永 5. 1.5|遠 1 .5|不 1-5. .5|會 5. .25|再 5 .25|重 4-3 .5|來 4 2.5|有 1 .25|一 1 .25|個 4 .25|男 4 .25|孩 4 1.5|愛 4 .75|著 3 1|那 2 .25|個 1 .25|女 1 .25|孩 1 3'}};
const QNORM={'妳':'你','沉':'沈','裏':'裡','着':'著','歎':'嘆'};
const qzNorm=t=>[...t].map(c=>QNORM[c]||c).filter(c=>/\p{Script=Han}/u.test(c)).join('');
const qzSongT=k=>{const d=QNOTES[k];if(!d)return null;if(!d.tk)d.tk=d.song.split('|').map(x=>{const [c,n,b]=x.split(' ');return [c,n,+b]});return d.tk};
function qzNotes(q){const tk=qzSongT(key);if(!tk)return null;const t=qzNorm(qzText(q).join(''));if(!t)return null;const all=tk.map(x=>x[0]).join('');let i=all.indexOf(t);if(i<0)return null;
  return {k:t,i0:i,w:tk.slice(i,i+t.length),base:QNOTES[key].base,bpm:QNOTES[key].bpm}}
const QSEMI=[0,0,2,4,5,7,9,11];
const qzMidi=(n,base)=>{const m=n.match(/^(b|#)?(\d)(\.|')?$/);if(!m)return base;return base+QSEMI[+m[2]]+(m[1]==='b'?-1:m[1]==='#'?1:0)+(m[3]==='.'?-12:m[3]==="'"?12:0)+((typeof getKey==='function')?getKey():0)};
const qzSol=n=>{const m=n.match(/^(b|#)?(\d)(\.|')?$/);if(!m)return n;return (m[1]==='b'?'♭':m[1]==='#'?'♯':'')+m[2]+(m[3]==='.'?'̣':m[3]==="'"?'̇':'')};
const qzNs=ns=>ns.split('-');
function qzToneAt(c,list,base,T,vol){const out=c.createGain();out.gain.value=vol;out.connect(c.destination);const nodes=[];
  for(const [n,d] of list){const hz=440*Math.pow(2,(qzMidi(n,base)-69)/12),g0=.9;
    [[1,'triangle',1],[2,'sine',.3],[3,'sine',.08]].forEach(([mul,ty,g])=>{const o=c.createOscillator(),e=c.createGain();o.type=ty;o.frequency.value=hz*mul;e.gain.setValueAtTime(0,T);e.gain.linearRampToValueAtTime(g*g0,T+.012);e.gain.setTargetAtTime(g*g0*.35,T+.02,Math.max(.05,d*.5));e.gain.setTargetAtTime(0,T+Math.max(.03,d-.03),.012);o.connect(e);e.connect(out);o.start(T);o.stop(T+d+.08);nodes.push(o)});
    T+=d}return {nodes,end:T}}
async function qzTone(list,base){qzSlowStop();sStop();await sWake();const c=S.ctx,f=qzSpeed();const r=qzToneAt(c,list.map(([n,d])=>[n,d/f]),base,c.currentTime+.05,.4);
  Q.slow={srcs:r.nodes,t:setTimeout(()=>{if(Q&&Q.slow&&Q.slow.srcs===r.nodes){Q.slow=null}},(r.end-c.currentTime)*1000+100)}}
async function qzMix(q){ // 鋼琴音疊在原唱上，用這句的開頭到結尾去對（簡譜的拍子按比例攤開，大約對得上）
  const N=qzNotes(q);if(!N)return;if(Q.slow&&Q.act==='mix'){qzSlowStop();Q.act='';qzRender();return}
  qzSlowStop();sStop();Q.seq=null;Q.lastRun=null;const f=qzSpeed();await sWake();const c=S.ctx,[from,until]=qzRange(q),id=qzRef();
  const k=[id,from.toFixed(2),until.toFixed(2),f].join('|');let v=qzSlowCache.get(k);
  if(!v){const sg=qzSeg(id,Math.max(0,from),until);if(!sg||!sg.x.length)return;const y=qzStretch(sg.x,sg.sr,f),bf=c.createBuffer(1,y.length,sg.sr);bf.copyToChannel(y,0);v=bf;qzSlowCache.set(k,v)}
  const T=c.currentTime+.08,s=c.createBufferSource(),g=c.createGain();g.gain.value=.9*laneNorm(S.lanes.find(z=>z.id===id));g.connect(id==='me'?meOut(c,c.destination):c.destination);s.buffer=v;s.connect(g);s.start(T);
  const tot=N.w.reduce((a,x)=>a+x[2],0),sec=(until-from)/f/tot,L=[];N.w.forEach(([ch,ns,b])=>{const a=qzNs(ns);a.forEach(n=>L.push([n,b*sec/a.length]))});
  const r=qzToneAt(c,L,N.base,T,.3),srcs=[s,...r.nodes];Q.act='mix';Q.who='';
  Q.slow={srcs,t:setTimeout(()=>{if(!Q||!Q.slow||Q.slow.srcs!==srcs)return;Q.slow=null;Q.act='';qzRender()},(until-from)/f*1000+150)};qzRender()}
const qzBadAll=()=>{try{return JSON.parse(qzLS('scene-tonebad')||'{}')||{}}catch(e){return {}}};
function qzToneSel(N){return (Q.toneSel&&Q.toneSel.k===N.k)?Q.toneSel.i:[]}
function qzToneRow(q){const N=qzNotes(q);if(!N)return '';
  if(Q.toneOpen!==q.id)return `<div class="qz-tr"><span class="qz-tl">音高提示</span><button data-q="topen">💡 打開提示（簡譜音）</button><span class="qz-tg">先自己聽原唱，真的卡住再打開</span></div>`;
  const sel=qzToneSel(N),bad=(qzBadAll()[key]||{}),lab=sel.length?sel.map(i=>N.w[i][0]).join(''):'整句',on=x=>Q.slow&&Q.act===x;
  return `<div class="qz-tr qz-tw"><span class="qz-tl">音高提示</span><div class="qz-chips">${N.w.map(([ch,ns],i)=>`<button data-q="tone" data-w="${i}" class="qz-nt${sel.includes(i)?' on':''}${bad[N.i0+i]?' bad':''}"><b>${esc(ch)}</b><small>${qzNs(ns).map(qzSol).join('→')}</small></button>`).join('')}<span class="qz-tact"><button data-q="tone" data-w="-1">▶ ${esc(lab)}</button>${sel.length?'<button data-q="tone" data-w="-2">全部</button>':''}<button data-q="tmix" class="${on('mix')?'on':''}">${on('mix')?'⏹ 停':'🎹＋原唱'}</button><button data-q="tbad" class="${Q.toneBad?'on':''}">${Q.toneBad?'點聽起來怪的字…':'標「怪」'}</button><button data-q="tclose" class="qz-sr">收起</button></span></div></div>`}
// ---------- 放慢（音高不變）：把那一小段先拉長（WSOLA），再自己播 ----------
const qzSpeed=()=>{const v=Math.round(+(qzLS('scene-pquiz-speed')||1)*100)/100;return v>=.3&&v<=1?v:1};
function qzStretch(x,sr,f){ // x 單聲道，f＝速度（0.5＝慢一倍）→ 長度變 1/f 倍
  if(f>=1)return x;const r=1/f,W=2*Math.round(1024*sr/44100),Hs=W/2,Ha=Hs/r,S2=Math.round(512*sr/44100),len=x.length;
  if(len<W*2)return x;const frames=Math.floor((len-W)/Ha)+1,maxP=len-W,out=new Float32Array((frames-1)*Hs+W);
  const win=new Float32Array(W);for(let i=0;i<W;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/W);let prev=0;
  for(let k=0;k<frames;k++){let p=Math.min(maxP,Math.round(k*Ha));
    if(k>0){const tgt=prev+Hs;if(tgt<=maxP){let best=p,bv=-Infinity;for(let q=Math.max(0,p-S2);q<=Math.min(maxP,p+S2);q+=2){let s=0;for(let i=0;i<Hs;i+=4)s+=x[q+i]*x[tgt+i];if(s>bv){bv=s;best=q}}p=best}}
    prev=p;const o=k*Hs;for(let i=0;i<W;i++)out[o+i]+=x[p+i]*win[i]}
  return out}
const qzSlowCache=new Map();
function qzSeg(id,from,until){ // 這條軌在 from–until 的聲音（單聲道）
  if(id==='me'){const cs=sCover().filter(c=>c.b>from&&c.a<until);if(!cs.length)return null;const v0=S.bufs.get(cs[0].k.id);if(!v0)return null;const sr=v0.buf.sampleRate,n=Math.round((until-from)*sr),y=new Float32Array(n);
    cs.forEach(c=>{const v=S.bufs.get(c.k.id);if(!v)return;const b=v.buf,ch=b.getChannelData(0);if(b.sampleRate!==sr)return;const a=Math.max(c.a,from),e=Math.min(c.b,until);
      for(let t=Math.round((a-from)*sr),j=Math.round((a-c.o)*sr),te=Math.round((e-from)*sr);t<te;t++,j++)if(j>=0&&j<ch.length)y[t]=ch[j]});return {x:y,sr}}
  const l=S.lanes.find(z=>z.id===id);if(!l||!l.buf)return null;const b=l.buf,sr=b.sampleRate,a=Math.max(0,Math.round(from*sr)),e=Math.min(b.length,Math.round(until*sr)),y=new Float32Array(Math.max(0,e-a));
  for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<y.length;i++)y[i]+=d[a+i]/b.numberOfChannels}return {x:y,sr}}
function qzSlowStop(){if(Q&&Q.slow){Q.slow.srcs.forEach(s=>{try{s.stop()}catch(e){}});clearTimeout(Q.slow.t);Q.slow=null}}
async function qzSlow(act,ids,from,until,who,done){
  qzSlowStop();sStop();const f=qzSpeed();await sWake();const c=S.ctx,T=c.currentTime+.06,srcs=[];
  for(const id of ids){const k=[id,from.toFixed(2),until.toFixed(2),f,id==='me'?takes.map(t=>t.id+':'+(t.adj||0)).join(','):''].join('|');
    let v=qzSlowCache.get(k);if(!v){const sg=qzSeg(id,Math.max(0,from),until);if(!sg||!sg.x.length)continue;const y=qzStretch(sg.x,sg.sr,f),b=c.createBuffer(1,y.length,sg.sr);b.copyToChannel(y,0);v=b;if(qzSlowCache.size>40)qzSlowCache.clear();qzSlowCache.set(k,v)}
    const l=S.lanes.find(z=>z.id===id),g=c.createGain();g.gain.value=l?(l.vol==null?1:l.vol)*laneNorm(l):1;g.connect(id==='me'?meOut(c,c.destination):c.destination);const s=c.createBufferSource();s.buffer=v;s.connect(g);s.start(T);srcs.push(s)}
  const dur=(until-from)/f;Q.act=act;Q.who=who||'';Q.slow={srcs,t:setTimeout(()=>{if(!Q||!Q.slow||Q.slow.srcs!==srcs)return;Q.slow=null;done?done():qzSlowEnd()},dur*1000+120)};qzRender()}
function qzSlowEnd(){if(!Q)return;if(Q.seq&&Q.seq.length&&Q.act){setTimeout(()=>{if(Q&&Q.seq)qzNext()},350);return}
  if(Q.lastRun){const fn=Q.lastRun;Q.seq=null;setTimeout(()=>{if(Q&&Q.lastRun===fn){fn();Q.lastRun=fn}},400);return}
  Q.seq=null;Q.act='';Q.who='';qzRender()}
function qzPlay(act,ids,from,until,mute){
  Q.seq=null;Q.lastRun=null;Q.who='';
  if(Q.slow){const same=Q.act===act;qzSlowStop();Q.act='';if(same){qzRender();return}}
  if(qzSpeed()<1&&!mute){qzSlow(act,ids,from,until);return}
  if(S.playing&&Q.act===act){sStop();Q.act='';Q.mute=null;qzRender();return}
  sStop();qzHear(ids);S.loop=false;S.stopAt=until;Q.act=act;Q.mute=mute||null;Q.inn=false;sPlay(Math.max(0,from));qzRender()}
// 輪流比：原唱一句 → 我一句 → 下一句…
function qzSeq(act,items){Q.lastRun=null;if(Q.slow){const same=Q.act===act;qzSlowStop();if(same){Q.seq=null;Q.act='';Q.who='';qzRender();return}}if(S.playing&&Q.act===act){Q.seq=null;sStop();Q.act='';Q.who='';qzRender();return}sStop();Q.seq=items.slice();Q.act=act;Q.mute=null;qzNext()}
function qzNext(){if(!Q||!S)return;const it=Q.seq&&Q.seq.shift();if(!it){Q.seq=null;Q.act='';Q.who='';qzRender();return}
  if(qzSpeed()<1){qzSlow(Q.act,it.ids,Math.max(0,it.r[0]-.15),it.r[1]+.1,it.who);return}
  qzHear(it.ids);S.loop=false;S.stopAt=it.r[1]+.1;Q.who=it.who;sPlay(Math.max(0,it.r[0]-.15));qzRender()}
function qzAlt(q){const its=[];qzRanges(q).forEach(r=>{its.push({ids:[qzRef()],r,who:'原唱'});its.push({ids:['me'],r,who:'我'})});qzSeq('alt',its)}
// 拍歌詞時常點在重拍（例：「後來」點在「來」），但「後」是前一小節的弱起拍、早就開始唱了。
// 用原唱人聲檔往前找：t 那時候如果已經在唱，就往回找到這口氣真正開口的地方（最多 1.5 秒）
function qzOnset(t){const l=qLane('vocal');if(!l)return t-.3;const b=l.buf,sr=b.sampleRate,d=b.getChannelData(0),d1=b.numberOfChannels>1?b.getChannelData(1):d,W=Math.round(sr*.02);
  const en=i=>{let s2=0;for(let k=i;k<i+W&&k<d.length;k++){const x=(d[k]+d1[k])/2;s2+=x*x}return Math.sqrt(s2/W)};const th=laneLoud(b)*.22;
  let i=Math.round(t*sr)-W,quiet=0,lastLoud=t;if(i<0||en(i)<th&&en(i-W)<th)return t;
  for(let n=0;n<75&&i>0;n++,i-=W){if(en(i)<th){quiet++;if(quiet>=6)break}else{quiet=0;lastLoud=i/sr}}
  return Math.max(t-1.5,lastLoud-.03)}
function qzMind(q){const L=getLines();
  const cu=qzCut(q);if(cu){/* 有框選：只考框起來那段；框裡有好幾句就消到最後一句前，聲音回來對對看；只有一句就消中間 */const [x,y]=cu,ts=L.filter(t=>t!=null&&t>x+.3&&t<y-.5);
    const w=[x-.05,y];qzPlay('mind',qzOrig(),Math.max(0,x-1.5),y+2.5,w);return}
  if(q.l!=null){const [a,b]=qzLineRange(q.l),pv=L[q.l-1],from=Math.max(0,Math.min(pv!=null&&pv<a&&a-pv<12?pv-.2:a,a-5));qzPlay('mind',qzOrig(),Math.min(from,qzOnset(a)-1),b+2.5,[Math.min(a-.05,qzOnset(a)),b-.1]);return}
  const [a,b]=secRange(q.s),off=lineOff(q.s),n=qzLines(q.s).length,t=[];for(let i=0;i<n;i++)t.push(L[off+i]);
  /* 整段都消音（只剩伴奏），唱完後原唱回來對對看 */const t0=t[0]!=null?Math.min(t[0]-.05,qzOnset(t[0])):a,w=[t0,b-.1];qzPlay('mind',qzOrig(),a-1.5,b+2.5,w)}
function qzRec(q){qzSlowStop();if(S.recd){sRecStop();return}const [x,y]=qzCut(q)||qzRecRange(q);/* 有框選就只錄框起來那段 */sStop();Q.seq=null;// 接唱：前奏放原唱（有人聲）帶妳進來，輪到妳就只剩伴奏；句首音題只放伴奏，練自己找音
  const sw=q.t!=='f'&&q.cat!=='beat'&&qLane('inst')&&qLane('orig');qzHear([sw?'orig':qzBack()]);Q.swAt=sw?Math.max(0,Math.min(x,qzOnset(q.l!=null?qzLineRange(q.l)[0]:x))):null;S.sel=[x,y];S.loop=true;S.stopAt=0;S.pos=x;Q.act='';
  // 一定唱到題目結尾就自動停（不靠段落長度判斷）
  Q.recR=[x,y];S.pre=4;sRecStart().then(()=>{S.pre=0;const r=S&&S.recd;if(!r)return qzRender();r.until=Math.min(S.dur,y+.5);
    // 保險：畫面時間沒在走（iPad 背景/省電）也照真實秒數停
    const ms=(r.until-r.from+1.5)*1000;setTimeout(()=>{if(S&&S.recd===r)sRecStop()},ms);qzRender()})}
// 題組的錄音：同一題只留最新一次，舊的自動丟掉，裝置才不會被塞滿
const _qzSave=saveTakes;
saveTakes=async function(){
  if(Q&&Q.recR&&takes.length){const nw=takes[takes.length-1],[x,y]=Q.recR;
    if(!nw.qz&&Date.now()-nw.at<60000){nw.qz=1;takes=takes.filter(k=>k===nw||!(k.qz&&k.start<y&&k.end>x))}Q.recR=null}
  try{await putFile(key+'|takes',takes)}catch(e){
    // 空間不夠：先丟掉題組的舊錄音（只留最新一次）再存一次
    const nw=takes[takes.length-1],n0=takes.length;takes=takes.filter(k=>k===nw||!k.qz);
    try{if(takes.length<n0){await putFile(key+'|takes',takes);qzHint&&qzHint('裝置空間快滿了，已經把題組的舊錄音清掉');return}}catch(e2){}
    if(takes.length>3&&confirm(`這台裝置空間不夠，這次錄音還沒存到。\n\n這首歌有 ${takes.length} 次錄音，要刪掉舊的、只留最新 3 次，再存一次嗎？`)){
      takes=takes.slice().sort((a,b)=>a.at-b.at).slice(-3);try{await putFile(key+'|takes',takes);if(S)sDraw();qzHint('存好了，舊錄音已經清掉');return}catch(e3){}}
    alert('這台裝置空間不夠，錄音沒存到')}};
// 錄完：回到題目
const _qzRecStop=sRecStop;
sRecStop=async function(c){const was=!!(S&&S.recd);await _qzRecStop(c);
  if(Q&&was&&S){S.loop=false;Q.act='';if(!c){const q=Q.list[Q.i];qzSet(q.id,{rec:1});qzHint(q.cat==='beat'?'錄好了：按「輪流比」，聽原唱和妳是不是同一刻開口':'錄好了：按「輪流比」，原唱一句、妳一句，聽到不對的字就點它')}qzRender()}};
const _qzClose=closeStudio;
closeStudio=function(){qzClose();_qzClose()};
const _qzOpenStudio=openStudio;
openStudio=async function(){await _qzOpenStudio();const top=document.querySelector('#studio .s-top');
  if(top&&!top.querySelector('.qz-open')){const b=document.createElement('button');b.className='qz-open';b.dataset.q='open';b.textContent='🎯 題組';top.insertBefore(b,document.getElementById('s-time'))}
  if(window.qzWant){const c=window.qzWant;window.qzWant=0;if(c==='cont'){qzOpen('');const l=qzLastAll()[key];if(l&&l.ids&&Q)qzBegin(l.cat,l.part,l.ord,l.ids,l.i)}else qzOpen(typeof c==='string'?c:'')}if(document.getElementById('qz-load'))qzLog('題組打開了');document.getElementById('qz-load')?.remove()};

// 錄音軌上點一段錄音（選到）→ 右上角出現刪除鍵，不管是不是這一題的
const _qzDraw=sDraw;
sDraw=function(){_qzDraw.apply(this,arguments);qzTdel()};
// 框選⇄歌詞：每句的時間、框到哪幾句就讓那幾句亮起來
function qzLineSpan(q,li){const L=getLines(),g=qzGl(q,li),n=qzText(q).length,a=L[g];if(a==null)return null;let b=li<n-1?L[g+1]:null;if(b==null||b<=a)b=qzRange(q)[1];return [a,b]}
function qzCutLyr(q,c){const ly=document.querySelector('#s-quiz .qz-lyr');if(ly)ly.classList.toggle('cutting',!!c);if(ly&&c&&!qzBx)setTimeout(()=>{const f=ly.querySelector('p.incut');if(f&&ly.scrollHeight>ly.clientHeight+4){const t=f.offsetTop-ly.offsetTop-30;if(t<ly.scrollTop||t>ly.scrollTop+ly.clientHeight-40)ly.scrollTop=t}},0);document.querySelectorAll('#s-quiz .qz-lyr p[data-li]').forEach(p=>{const sp=c&&qzLineSpan(q,+p.dataset.li);p.classList.toggle('incut',!!(sp&&Math.min(sp[1],c[1])-Math.max(sp[0],c[0])>Math.min(.6,(sp[1]-sp[0])*.4)))})}
// 歌詞框撐滿右邊剩下的高度；放不下才捲動
function qzFitLyr(){const box=document.getElementById('s-quiz'),ly=box&&box.querySelector('.qz-lyr.many');if(!ly)return;ly.style.removeProperty('--lf');
  let f=17;while(ly.scrollHeight>ly.clientHeight&&f>14){f-=.5;ly.style.setProperty('--lf',f+'px')}}  // 歌詞框放不下：字縮小一點（最小 14px），還是不夠才捲
let qzRO=null;function qzWatch(el){if(!window.ResizeObserver||!el)return;if(!qzRO)qzRO=new ResizeObserver(()=>{if(typeof Q!=='undefined'&&Q&&!Q.home&&!Q.sum)qzFitLyr()});qzRO.disconnect();qzRO.observe(el)}
addEventListener('resize',()=>{if(typeof Q!=='undefined'&&Q&&!Q.home&&!Q.sum)setTimeout(qzFitLyr,150)});
function qzCutGo(){sDraw();qzRender();const b=document.querySelector('#s-quiz [data-q=alt]');if(b&&!b.disabled){b.click();qzHint('框好了：原唱、妳輪流放這一段，會一直重複；按「⏹ 停」停下來')}else{const r=document.querySelector('#s-quiz [data-q=cmp][data-c=ref]');if(r)r.click();qzHint('框好了：原唱這一段會一直重複；按「⏹ 停」停下來')}}
function qzCutDraw(){const q=Q&&Q.list&&Q.list[Q.i],c=q&&qzCut(q);if(q)qzCutLyr(q,c);if(!c||!S)return;
  document.querySelectorAll('#studio canvas[data-l]').forEach(cv=>{const g=cv.getContext('2d'),w=cv.width,h=cv.height,x=sX(c[0],w),x2=sX(c[1],w);
    g.fillStyle='rgba(120,200,255,.18)';g.fillRect(x,0,x2-x,h);g.fillStyle='rgba(120,200,255,.9)';g.fillRect(x,0,2,h);g.fillRect(x2-2,0,2,h)})}
let qzBx=null;
addEventListener('pointerdown',e=>{if(!Q||!S||Q.boxing||!e.target.closest||!e.target.closest('#studio canvas'))return;const q=Q.list&&Q.list[Q.i],c=q&&qzCut(q);if(!c||S.recd)return;
  const r=e.target.getBoundingClientRect(),x=e.clientX-r.left,xa=sX(c[0],r.width),xb=sX(c[1],r.width),near=Math.max(18,(xb-xa)/4);
  let edge=Math.abs(x-xa)<=near&&Math.abs(x-xa)<=Math.abs(x-xb)?0:Math.abs(x-xb)<=near?1:-1;if(edge<0)return;
  e.stopImmediatePropagation();e.preventDefault();qzBx={r,edge,id:e.pointerId}},true);
addEventListener('pointerdown',e=>{if(!Q||!Q.boxing||!S||!e.target.closest||!e.target.closest('#studio canvas'))return;e.stopImmediatePropagation();e.preventDefault();
  const r=e.target.getBoundingClientRect(),t=sT(e.clientX-r.left,r.width);qzBx={r,t0:t,id:e.pointerId};Q.cut=[t,t];Q.cutQ=Q.list[Q.i].id;sDraw()},true);
addEventListener('pointermove',e=>{if(!qzBx||e.pointerId!==qzBx.id)return;e.stopImmediatePropagation();e.preventDefault();const t=sT(e.clientX-qzBx.r.left,qzBx.r.width);
  if(qzBx.edge!=null){const c=Q.cut.slice();c[qzBx.edge]=qzBx.edge?Math.max(c[0]+.15,Math.min(S.dur,t)):Math.max(0,Math.min(c[1]-.15,t));Q.cut=c;sDraw();return}Q.cut=[Math.max(0,Math.min(qzBx.t0,t)),Math.min(S.dur,Math.max(qzBx.t0,t))];sDraw()},true);
['pointerup','pointercancel'].forEach(n=>addEventListener(n,e=>{if(!qzBx||e.pointerId!==qzBx.id)return;e.stopImmediatePropagation();if(qzBx.edge!=null){qzBx=null;qzRender();return}qzBx=null;Q.boxing=false;
  if(!Q.cut||Q.cut[1]-Q.cut[0]<.25){Q.cut=null;qzHint('範圍太短，再拖長一點');sDraw();qzRender();return}
  qzCutGo()},true));
function qzUndo(){const u=tkUndo.pop();if(!u||!S)return;sStop();
  if(u.t==='move'){const k=takes.find(x=>x.id===u.id);if(k){k.adj=u.adj;S.selTake=k.id}}
  else if(u.t==='del'){takes.push(u.k);S.selTake=u.k.id;S.bufs.delete(u.k.id);takeBuf(u.k).then(()=>{sDraw();qzRender()})}
  saveTakes();sDraw();qzRender();qzHint(u.t==='move'?'已經移回原本的位置':'錄音救回來了')}
function qzTdel(){qzCutDraw();{const d=document.getElementById('studio');let u=document.getElementById('qz-undo');
  if(d&&!u){u=document.createElement('button');u.id='qz-undo';u.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>復原';u.onclick=qzUndo;d.appendChild(u)}
  if(u){const ln=d&&d.querySelector('.s-lane.me');if(ln){const r=ln.getBoundingClientRect();u.style.top=(r.top+52)+'px'}u.hidden=!(Q&&!Q.home&&!Q.sum&&S&&!S.recd&&tkUndo.length)}}const d=document.getElementById('studio');if(!d)return;let b=document.getElementById('qz-tdel');
  const k=Q&&!Q.home&&!Q.sum&&S&&!S.recd&&S.selTake&&takes.find(x=>x.id===S.selTake);
  if(!k){if(b)b.hidden=true;return}
  if(!b){b=document.createElement('button');b.id='qz-tdel';b.textContent='🗑 刪掉選到的錄音';d.appendChild(b);
    b.onclick=()=>{const k=takes.find(x=>x.id===S.selTake);if(!k||!confirm('刪掉選到的這段錄音？'))return;sStop();tkUndo.push({t:'del',k});takes=takes.filter(t=>t!==k);S.bufs.delete(k.id);S.selTake=null;saveTakes();sDraw();qzRender();qzHint('刪掉了')}}
  const ln=d.querySelector('.s-lane.me');if(ln){const r=ln.getBoundingClientRect();b.style.top=(r.top+8)+'px'}b.hidden=false}
// 錄音室每一格畫面會叫這個：腦內唱的消音、亮目前這一句；p<0＝播完了
function qzTick(p){
  if(Q&&Q.swAt!=null&&S.recd&&p>=Q.swAt-.05){Q.swAt=null;qzHear(['inst'])}
  if(!Q||Q.sum)return;const el=document.getElementById('s-quiz');if(!el)return;
  if(p<0){el.classList.remove('hush');Q.mute=null;if(Q.seq&&Q.seq.length&&Q.act){setTimeout(()=>{if(Q&&Q.seq)qzNext()},350);return}
    if(Q.lastRun){const f=Q.lastRun;Q.seq=null;setTimeout(()=>{if(Q&&Q.lastRun===f){f();Q.lastRun=f}},400);return}Q.seq=null;Q.act='';Q.who='';qzRender();return}
  if(Q.mute){const inn=p>=Q.mute[0]&&p<Q.mute[1];if(inn!==Q.inn){Q.inn=inn;if(inn)S.lanes.forEach(l=>{const g=S.gains[l.id];if(g)g.gain.value=l.id==='inst'&&l.buf?(l.vol||1)*laneNorm(l):0});else sGains();el.classList.toggle('hush',inn);if(!inn&&p<Q.mute[1]+1)qzHint('🎧 聲音回來了：妳還在音上嗎？')}}
  const q=Q.list[Q.i];if(!q)return;const L=getLines();let k=-1;qzText(q).forEach((_,li)=>{const t=L[qzGl(q,li)];if(t!=null&&p>=t-.3)k=li});
  if(k!==Q.k){Q.k=k;el.querySelectorAll('.qz-lyr p').forEach(x=>x.classList.toggle('on',+x.dataset.li===k))}
}
// ---------- 畫面 ----------
// ---------- 字的記號（再高/再低…/音高）：同一個字只有一份，單句、幾句一組、連唱都讀寫同一份 ----------
// scene-qword {song:{cat:{mk:{'全曲第幾句:第幾個字':記號}, pn:{'句:字':1}}}}
const QWK='scene-qword';
function qzWAll(){try{return JSON.parse(qzLS(QWK)||'{}')||{}}catch(e){return {}}}
function qzW(cat){qzWMig();const A=qzWAll(),B=A[key]=A[key]||{},c=B[cat]=B[cat]||{};c.mk=c.mk||{};c.pn=c.pn||{};return {A,c}}
// 第一次：把以前各題分開存的記號搬過來（舊資料留著不刪）。先搬連唱/幾句一組，再搬單句，單句的蓋過去；同類新的蓋舊的
function qzWMig(){const A=qzWAll();if(A[key]&&A[key]._mig)return;const B=A[key]=A[key]||{};const T=qzAll()[key]||{},days=Object.keys(T).sort();
  const put=(id,r)=>{const q=qzQ(id);if(!q||!QMARKS[q.cat]||(!r.mk&&!r.pn))return;const c=B[q.cat]=B[q.cat]||{mk:{},pn:{}};
    Object.entries(r.mk||{}).forEach(([k,v])=>{const [li,ci]=k.split(':').map(Number);c.mk[qzGl(q,li)+':'+ci]=v});Object.keys(r.pn||{}).forEach(k=>{const [li,ci]=k.split(':').map(Number);c.pn[qzGl(q,li)+':'+ci]=1})};
  try{[false,true].forEach(single=>days.forEach(d=>Object.entries(T[d]).forEach(([id,r])=>{const q=qzQ(id);if(q&&(q.l!=null)===single)put(id,r)})))}catch(e){}
  B._mig=1;qzLS(QWK,JSON.stringify(A))}
// 這題看到的記號（key 換成題目裡的「第幾行:第幾個字」）
function qzMkOf(q){const {c}=qzW(q.cat),mk={},pn={};qzText(q).forEach((ln,li)=>{const g=qzGl(q,li);[...ln].forEach((_,ci)=>{const k=g+':'+ci;if(c.mk[k])mk[li+':'+ci]=c.mk[k];if(c.pn[k])pn[li+':'+ci]=1})});return {mk,pn}}
function qzMkPut(q,lk,f){const [li,ci]=lk.split(':').map(Number),{A,c}=qzW(q.cat);f(c,qzGl(q,li)+':'+ci);qzLS(QWK,JSON.stringify(A))}
const qzLineHasMk=(cat,g)=>{const {c}=qzW(cat),pre=g+':';return Object.keys(c.mk).some(k=>k.startsWith(pre))||Object.keys(c.pn).some(k=>k.startsWith(pre))};
function qzMarksTxt(q,r0){const r=qzMkOf(q),L=qzText(q),MK=QMARKS[q.cat]||[],out=[];Object.keys(r.mk||{}).sort((x,y)=>{const [a,b]=x.split(':').map(Number),[c,d]=y.split(':').map(Number);return a-c||b-d}).forEach(k=>{
  const [li,ci]=k.split(':').map(Number),ch=[...(L[li]||'')][ci],M=MK.find(m=>m[0]===r.mk[k]);if(ch&&M)out.push({li,ci,ch,M})});return out}
function qzLabel(q){const sc=SCENES[key],A=qzAllLines();if(q.cat==='map')return `第 ${q.s+1} 段・${sc.steps[q.s].sec}`;if(q.l!=null)return A[q.l]||'';if(q.R)return `Part ${q.s0+1}–${q.s+1}`;return sc.steps[q.s].sec+(q.a?`・第 ${q.a}–${q.b} 句`:'')}
function qzTag(q,r){if(q.cat==='pitch')return (q.R?'幾段連唱・':q.a?'幾句連唱・':q.t?QTYPE[q.t].n+'・':'')+QMODE[r.m||q.m].v;return ''}
// 三頁共用的頂列：左邊固定三個分頁（題組首頁｜題目｜成績單，現在在哪頁就亮哪個），中間標題，最右邊 ✕ 結束
function qzNav(cur,title,right){qzXBtn();const last=qzLastAll()[key],hasQ=!!(Q.list&&Q.list.length)||!!(last&&last.ids&&last.ids.length);
  const tb=(id,a,l)=>`<button data-q="${cur===id?'':a}" class="${cur===id?'on':''}"${cur!==id&&id!=='home'&&!hasQ?' disabled':''}>${l}</button>`;
  return `<div class="qz-h"><div class="qz-tabs"><button data-q="songs">🎵 歌單</button>${tb('home','home','🏠 題組首頁')}${tb('q','tabq','✏️ 題目')}${tb('sum','tabs','📋 成績單')}</div><b class="qz-tt">${title}</b><span class="sp"></span>${right||''}</div>`}
// ✕ 結束 放在最上面那條（時間旁邊），題組每一頁都在同一個位置
function qzXBtn(){const top=document.querySelector('#studio .s-top');if(!top||top.querySelector('.qz-x'))return;const b=document.createElement('button');b.className='qz-x';b.dataset.q='x';b.textContent='✕ 結束題組';top.appendChild(b)}
function qzH2(){const n=Q.list.length,w=3,lo=Math.max(0,Math.min(Q.i-w,n-2*w-1)),hi=Math.min(n,lo+2*w+1);
  return `<div class="qz-h2"><span class="qz-n">第 ${Q.i+1} / ${n} 題</span><div class="qz-dots">${lo?'<span class="qz-more">…</span>':''}${Q.list.slice(lo,hi).map((x,k)=>{const j=lo+k;return `<button data-q="go" data-j="${j}" class="qd ${j===Q.i?'cur ':''}${qzGet(x.id).res||''}">${j+1}</button>`}).join('')}${hi<n?'<span class="qz-more">…</span>':''}</div></div>`}
function qzHead(extra){return qzNav(Q.sum?'sum':'q',qzPaperName(Q.paper),extra)}
// 題組首頁：左邊每份卷（⭐ 答對率），右邊這份卷的 Part（照段落分），每個都可以照順序或隨機
// 首頁：幾個 Part 一起連唱（點第一個 Part、再點最後一個）
function qzMultiHtml(){const sc=SCENES[key],ks=sc.steps.map((_,k)=>k).filter(k=>qzLines(k).length),sel=Q.hsel,lt=qzLatest(),ms=qzMultis();
  return `<div class="qz-multi"><h4>幾個 Part 一起連唱<small>${sel!=null?`再點最後一個 Part（從 Part ${sel+1}）`:'點第一個 Part、再點最後一個，就多一題'}</small></h4>
    <div class="qz-grp">${ks.map(k=>`<button data-q="msel" data-n="${k}" class="${sel===k?'on':''}">${k+1}</button>`).join('')}</div>
    <div class="qz-mlist">${ms.map(([a,b],i)=>{const id=`R${a}-${b}`,res=lt[id];return `<div class="qz-pr sm qz-drag" data-id="${id}"><i class="qz-grip" aria-label="拖曳排順序">⠿</i><span>Part ${a+1}–${b+1} 連唱<small>${res?'做過':''}</small></span><em>${res==='ok'?'⭐ 準':res==='some'?'△ 低空飛過':res==='bad'?'✗ 不及格':''}</em><button data-q="mbeg" data-id="${id}">開始</button><button data-q="mdel" data-id="${id}" aria-label="刪掉這組">✕</button></div>`}).join('')}</div></div>`}
// 連唱題：把一句一句練的時候標的記號和筆記收在一個可以打開的摺疊頁
function qzLineMk(g){const T=qzAll()[key]||{},re=new RegExp('^L'+g+'[ftjh]?$');for(const d of Object.keys(T).sort().reverse()){const D=T[d];for(const id in D)if(re.test(id)){const r=D[id];if((r.mk&&Object.keys(r.mk).length)||(r.pn&&Object.keys(r.pn).length)||r.n)return r}}return null}
function qzFoldHtml(q){const n=qzText(q).filter((_,li)=>qzLineHasMk(q.cat,qzGl(q,li))||(qzLineMk(qzGl(q,li))||{}).n).length;
  return `<div class="qz-lyt"><button data-q="fold" class="qz-mkt${Q.fold?' on':''}"${n?'':' disabled'}>📌 記號＋音高${n?`（${n} 句）`:'：還沒有'}・${Q.fold?'顯示':'不顯示'}</button></div>`}
function qzHomeHtml(){const sc=SCENES[key],bank=Q.bank||(Q.bank=qzBank()),last=qzLastAll()[key],hc=Q.hc;
  const rows=Object.keys(QPAPER).filter(k=>k!=='wrong').map(k=>{const l=qzPaperList(k,'all',1);return `<button data-q="hc" data-cat="${k}" class="qz-cr${k===hc?' on':''}"><span>${QPAPER[k].n}</span><small>${qzDoneN(l)?`做過 ${qzDoneN(l)}/${l.length}`:`${l.length} 題`}</small><em>⭐ ${qzPct(l)}%</em></button>`}).join('');
  const all=qzPaperList(hc,'all'),parts=[...new Set(all.map(q=>q.s))].sort((x,y)=>x-y);
  const btns=(part,n,sm)=>n?`<button data-q="begin" data-cat="${hc}" data-part="${part}" data-ord="seq">${sm?'順序':'照順序'}</button><button data-q="begin" data-cat="${hc}" data-part="${part}" data-ord="rand">隨機</button>`:'';
  const wr=!!Q.wo,prow=(part,label,l,sm)=>wr&&sm&&!l.length?'':`<div class="qz-pr${sm?' sm':''}"><span data-q="psum" data-part="${part}" class="qz-psum">${label}<small>${wr?`${l.length} 題要再考`:qzDoneN(l)?(sm?`${qzDoneN(l)}/${l.length}`:`做過 ${qzDoneN(l)}/${l.length}`):`${l.length} 題`}</small></span><em data-q="psum" data-part="${part}" class="qz-psum">${wr?'':`⭐ ${qzPct(l)}% `}›</em>${btns(part,l.length,sm)}</div>`;
  return `${qzNav('home','🎯 '+esc(sc.title))}${(()=>{try{const g=JSON.parse(localStorage.getItem('scene-loadlog')||'null');if(!g||g.song!==key||!g.log.length)return '';const sec=parseFloat(g.log[g.log.length-1]);if(!(sec>5))return '';return `<details class="qz-ll"><summary>⏱ 上次打開題組花了 ${Math.round(sec)} 秒（點開看慢在哪，截圖給 Claude）</summary><pre>${esc(g.log.join('\n'))}</pre></details>`}catch(e){return ''}})()}<div class="qz-h2"><span class="qz-n">選上面的卷、下面的 Part 開始考・做過＝有選「這題的結果」・⭐＝選了「準」的比例・點 ⭐ 看那份成績單</span></div>
  <div class="qz-home2"><div class="qz-crs2">${rows}</div>${last&&last.ids&&last.ids.length?`<button class="qz-cont" data-q="cont">繼續測驗<small>${esc(qzPaperName(last))}・第 ${last.i+1} / ${last.ids.length} 題</small></button>`:''}</div>
    <div class="qz-parts">${(()=>{const W=qzPaperList(hc,'all',1).filter(q=>{const r=qzLatest()[qzBase(q.id)];return r==='some'||r==='bad'}),wk=Q.wk||'all',kinds=hc==='pitch'||hc==='all';
        const pool=Q.wo?W:qzPaperList(hc,'all',1);
        return `<div class="qz-wk"><button data-q="wo" data-v="0" class="${Q.wo?'':'on'}">全部題目</button><button data-q="wo" data-v="1" class="wr${Q.wo?' on':''}"${W.length?'':' disabled'}>❌ 只考錯題<small>${W.length}</small></button>${kinds?`<span class="sep"></span>${[['all','全部題型',pool.length],...Object.keys(QKIND).map(k=>[k,QKIND[k],pool.filter(q=>qzKind(q)===k).length])].map(([k,n,c])=>`<button data-q="wk" data-k="${k}" class="${k===wk?'on':''}"${c?'':' disabled'}>${n}<small>${c}</small></button>`).join('')}`:''}</div>${Q.wo?'<p class="qz-n">錯題＝最近一次選了「△」或「✗」，之後選到「✓」才會離開</p>':''}`})()}
      ${all.length?prow('all','整份',all)+qzPartCols(parts,p=>prow(p,`<b>${p+1}</b>${esc(sc.steps[p].sec)}`,qzPaperList(hc,p),1))+((hc==='pitch'||hc==='all')&&!Q.wo?qzMultiHtml():''):`<p class="qz-tip">${Q.wo?'目前沒有錯題 🎉':'這首還沒貼歌詞或還沒逐句對拍，出不了題。'}</p>`}</div>`}
// 題組首頁的 Part：照歌詞「一頁」排版分欄（每一輪一欄），排不出來就一欄
function qzPartCols(parts,cell){const sc=SCENES[key];let pos=null;try{pos=typeof tocGrid==='function'&&typeof blocks!=='undefined'&&blocks.length===sc.steps.length?tocGrid():null}catch(e){pos=null}
  const cols=[];parts.forEach(p=>{const c=pos&&pos[p]?pos[p].c:0;(cols[c]=cols[c]||[]).push(p)});const cs=cols.filter(Boolean);
  return `<div class="qz-pcols" style="grid-template-columns:repeat(${cs.length},1fr)">${cols.map((l,c)=>l?`<div class="qz-pcol">${sc.rounds&&sc.rounds[c]&&cs.length>1?`<h5>${esc(sc.rounds[c].t)}</h5>`:''}${l.map(cell).join('')}</div>`:'').join('')}</div>`}
// 成績單上的題目名稱：標過的字直接在字上亮顏色＋箭頭（跟題目頁一樣），不另外列
function qzLabelMk(q,r){const mk=qzMkOf(q).mk,MK=QMARKS[q.cat]||[];if(q.l==null||q.t==='s'||!Object.keys(mk).length)return esc(qzLabel(q));
  return `<span class="qz-lm">${[...(qzText(q)[0]||'')].map((ch,ci)=>{const M=MK.find(x=>x[0]===mk['0:'+ci]);return M?`<b class="${M[0]}">${esc(ch)}<i>${M[1]}</i></b>`:esc(ch)}).join('')}</span>`}
function qzSumHtml(){
  const sc=SCENES[key],pc=Q.paper.cat,C=QCAT[pc]||{sc:['過關','差一點','沒過'],res:null},rows=Q.list.map((q,j)=>({q,j,r:qzGet(q.id)})),cnt=k=>rows.filter(x=>x.r.res===k).length,todo=rows.filter(x=>!x.r.res).length;
  const words=[];rows.forEach(({q,j,r})=>q.t!=='s'&&qzMarksTxt(q,r).forEach(w=>words.push({j,w})));
  const firstBad=rows.find(x=>x.r.res&&x.r.res!=='ok'),nb=rows.filter(x=>x.r.res&&x.r.res!=='ok').length;
  const how={pitch:'只練標起來的字：先慢慢哼，再跟原唱對準那個音，最後放回整句唱。',lyr:'卡住的句子：跟原唱唱 3 遍，再遮起來自己唱。',beat:'進不準的地方：按 🔁 重複那一段，跟著拍子拍手找重音，再錄一次。',map:'想不起來的段落：打開架構表的「回想」，一段一段說出下一段。'}[pc]||'沒過的題目都進了錯題本，回首頁按「❌ 錯題本」再考一次。';
  return `${qzHead()}
  <div class="qz-score"><div><b class="ok">${cnt('ok')}</b><span>${C.sc[0]}</span></div><div><b class="some">${cnt('some')}</b><span>${C.sc[1]}</span></div><div><b class="bad">${cnt('bad')}</b><span>${C.sc[2]}</span></div><div><b>${todo}</b><span>還沒測</span></div>
    <p>${todo?`還有 ${todo} 題沒測。`:''}${firstBad?`今天的功課：第 ${firstBad.j+1} 題開始，${how}`:todo?'':'全部過關 🎉'}${rows.some(x=>x.r.hint)?'<br><small>💡＝這題今天有開提示。改天不開提示再過一次，才算真的會。</small>':''}${nb?`<br><button data-q="redo" class="go">❌ 重考這份錯的 ${nb} 題</button>`:''}</p></div>
  <div class="qz-b sum"><div><h4>每一題</h4><div class="qz-rows">${rows.map(({q,j,r})=>`<button data-q="go" data-j="${j}" class="qz-row"><i class="qd ${r.res||''}">${j+1}</i><span>${qzLabelMk(q,r)}<small>${QCAT[q.cat].n.split(' ')[0]} ${esc(qzTag(q,r))}</small></span><em>${r.res?QCAT[q.cat].res[r.res]:'還沒測'}${r.hint?' 💡':''}</em></button>`).join('')}</div></div>
    <div>${pc!=='beat'&&pc!=='map'&&!words.length?'<p class="qz-tip">還沒有標記的字。聽到不對，就點那個字，它會出現在左邊那題的卡片上。</p>':''}
    ${rows.filter(x=>x.r.n).map(({j,r})=>`<p class="qz-note"><b>${j+1}</b>${esc(r.n)}</p>`).join('')}
    <p class="qz-tip">怎麼練：${how}</p></div></div>`}
function qzChars(q,r,cls){const W=qzMkOf(q),hide=q.t==='s'&&!Q.fold,mk=hide?{}:W.mk,pn=hide?{}:W.pn,MK=QMARKS[q.cat]||[],L=qzText(q),PN=q.cat==='pitch'?qzNotes(q):null;let pk=0;
  return L.map((ln,li)=>{const lm=q.t==='s'&&Q.fold?qzLineMk(qzGl(q,li)):null,hasP=[...ln].some((_,ci)=>pn[li+':'+ci]);return `<p data-li="${li}"${hasP?' class="pn"':''}>${L.length>1&&q.cat==='pitch'?`<b class="qz-lno${Q.lsel===li?' on':''}" data-q="lsel" data-li="${li}">${li+1}</b>`:''}${[...ln].map((ch,ci,all)=>{if(/\s/.test(ch))return ' ';const c=mk[li+':'+ci],M=MK.find(x=>x[0]===c);
    const f=q.t==='f'&&ci===all.findIndex(z=>!/\s/.test(z))||q.t==='t'&&ci>=all.length-3?' focus':'';
    const pw0=PN&&qzNorm(ch)?PN.w[pk++]:null,pw=pw0&&pn[li+':'+ci]?pw0:null;
    return `<span data-q="mk" data-k="${li}:${ci}" class="${c||''}${f}">${esc(ch)}${M?`<i>${M[1]}</i>`:''}${pw?`<em class="qn">${qzNs(pw[1]).map(qzSol).join('<s>→</s>')}</em>`:''}</span>`}).join('')}${lm&&lm.n?`<small class="qz-ln">📝 ${esc(lm.n)}</small>`:''}</p>`}).join('')}
// ---------- 每題自動計時：進到題目就開始算，離開 App 會暫停；5 分鐘到提醒先跳下一題 ----------
const QZ_LIMIT=300;
// 每題計時：每次進來從 0 開始（不累計）；按了播放或錄音才開始算，只是點進來看看不算
setInterval(()=>{if(!Q)return;if(Q.home||Q.sum||!Q.list||!Q.list.length){Q.qt=null;document.getElementById('qz-tover')?.remove();return}
  if(document.hidden)return;const q=Q.list[Q.i];if(!q)return;
  if(!Q.qt||Q.qt.id!==q.id){Q.qt={id:q.id,acc:0,lim:QZ_LIMIT,warned:false,on:false};document.getElementById('qz-tover')?.remove()}
  const t=Q.qt;if(!t.on&&S&&(S.playing||S.recd))t.on=true;if(t.on)t.acc++;
  const el=document.getElementById('qz-timer'),mm=x=>Math.floor(x/60)+':'+String(x%60).padStart(2,'0');
  if(el){el.textContent=t.on?'⏱ '+mm(t.acc)+' / '+mm(t.lim):'⏱ 播放後開始計時';el.classList.toggle('idle',!t.on);el.classList.toggle('over',t.acc>=t.lim)}
  if(t.on&&t.acc>=t.lim&&!t.warned){t.warned=true;t.show=true}
  if(t.show&&!document.getElementById('qz-tover')){const box=document.getElementById('s-quiz');if(!box)return;const d=document.createElement('div');d.id='qz-tover';
    d.innerHTML=`<b>這題已經練 ${Math.round(t.acc/60)} 分鐘了</b><span>耳朵會累、越聽越分不出來。${q.cat==='beat'?'先跳下一題':'先記成沒過、跳下一題'}，它會進錯題本，明天再考。</span><div><button data-q="tskip" class="go">先跳下一題</button><button data-q="tmore">再練 2 分鐘</button></div>`;box.appendChild(d)}
},1000);
function qzRender(){
  const d=document.getElementById('studio');if(!d||!Q||!S)return;let el=document.getElementById('s-quiz');
  if(!el){el=document.createElement('div');el.id='s-quiz';d.querySelector('.s-pic').appendChild(el)}d.classList.add('quiz');
  if(Q.home){el.innerHTML=qzHomeHtml();return}
  if(Q.sum){el.innerHTML=qzSumHtml();return}
  const sc=SCENES[key],n=Q.list.length,q=Q.list[Q.i],C=QCAT[q.cat],r=qzGet(q.id),m=r.m||q.m,st=sc.steps[q.s],[a,b]=qzRange(q),[ra,rb]=qzRecRange(q),
    on=x=>(S.playing||Q.slow)&&Q.act===x?' on':'',recd=!!S.recd,has=qzHas(ra,rb),A=qzAllLines(),L=getLines(),nm=Object.keys(qzMkOf(q).mk).length;
  const who=`<div class="qz-st qz-who">${Q.who?`<span class="${Q.who==='我'?'me':'ref'}">▶ 正在放：${Q.who}</span>`:`<span>${q.cat==='beat'?'輪流比＝原唱開口、妳開口，聽是不是同一刻':'輪流比＝原唱一句、妳一句；聽到不對的字，在右邊點它'}</span>`}</div>`;
  const cmp=n0=>`<div class="qz-st qz-cmp"><b>${n0}</b><span>比一比</span><div class="qz-seg"><button data-q="alt" class="${on('alt')}" ${has?'':'disabled'}>${on('alt')?'⏹ 停':'輪流比'}</button><button data-q="cmp" data-c="both" class="${on('both')}" ${has?'':'disabled'}>${on('both')?'⏹ 停':'原唱＋我'}</button><button data-q="cmp" data-c="me" class="${on('me')}" ${has?'':'disabled'}>${on('me')?'⏹ 停':'只聽我'}</button><button data-q="cmp" data-c="ref" class="${on('ref')}">${on('ref')?'⏹ 停':'只聽原唱'}</button></div></div>${Q.who?who:''}`;
  // 右下角工具：對齊、框選（只有錄好之後才出現）
  const cutC=qzCut(q),tools=!recd&&(q.cat==='pitch'||q.cat==='beat')?`<div class="qz-tools">
    ${q.t==='s'&&!q.R?qzGrpRow(q):''}
    ${qzToneRow(q)}
    ${(q.l!=null||q.t==='s')&&q.cat==='pitch'&&!cutC?(()=>{const [ra,rb]=qzRCur(q),own=!!(qzRngAll()[key]||{})[qzRk(q)];return `<div class="qz-tr"><span class="qz-tl">${q.t==='s'?'這段範圍':'這題範圍'}</span><span class="qz-tg">開頭</span><button data-q="qrng" data-e="0" data-d="-1">◀</button><button data-q="qrng" data-e="0" data-d="1">▶</button><span class="qz-tg">結尾</span><button data-q="qrng" data-e="1" data-d="-1">◀</button><button data-q="qrng" data-e="1" data-d="1">▶</button><span class="qz-tg">${mmss(ra)}.${Math.floor(ra*10)%10}–${mmss(rb)}.${Math.floor(rb*10)%10}</span>${own?'<button data-q="qrng0" class="qz-sr">還原</button>':''}</div>`})():''}
    <div class="qz-tr"><span class="qz-tl">速度</span><div class="qz-seg qz-spd">${[-.1,-.05].map(d=>`<button data-q="spd" data-d="${d}" ${qzSpeed()+d<.299?'disabled':''}>${d}</button>`).join('')}<b class="qz-sv">${qzSpeed()===1?'原速':qzSpeed().toFixed(2)+'×'}</b>${[.05,.1].map(d=>`<button data-q="spd" data-d="${d}" ${qzSpeed()+d>1.001?'disabled':''}>+${d}</button>`).join('')}</div>${qzSpeed()<1?'<button data-q="spd" data-d="9" class="qz-sr">原速</button>':''}<button data-q="box" class="qz-boxb${Q.boxing?' on':''}">${Q.boxing?'在下面波形上拖一段…':'✂️ 框選幾個字'}</button></div>

    ${cutC?`<div class="qz-tr"><span class="qz-tl">框選範圍</span><span class="qz-tg">開頭</span><button data-q="cutn" data-e="0" data-d="-1">◀</button><button data-q="cutn" data-e="0" data-d="1">▶</button><span class="qz-tg">結尾</span><button data-q="cutn" data-e="1" data-d="-1">◀</button><button data-q="cutn" data-e="1" data-d="1">▶</button><span class="qz-tg">${cutC[0].toFixed(1)}–${cutC[1].toFixed(1)} 秒</span><button data-q="uncut">✕ 取消框選</button></div>`:''}</div>`:'';
  const recB=(n0,t)=>`<div class="qz-st"><b>${n0}</b><button data-q="rec" class="rec${recd?' on':''}">${recd?'⏹ 停止錄音':t}</button>${has&&!recd?'<span>✓ 錄好了</span><button data-q="del" class="qz-del">🗑 刪掉</button>':''}</div>`;
  const qzAdjRow=has&&!recd&&(q.cat==='pitch'||q.cat==='beat')?`<div class="qz-tr qz-adj"><span class="qz-tl">錄音對不齊</span><button data-act="sadj" data-d="-1">◀ 早一點</button><button data-act="sadj" data-d="1">晚一點 ▶</button></div>`:'';
  let title=q.R?`Part ${q.s0+1}–${q.s+1}`:esc(st.sec),tip='',steps='',right='';
  if(q.cat==='pitch'){
    const J=q.t==='j'&&qzAnalyze()&&qzAnalyze().jump[q.l];
    title+=q.l!=null?`<small>・${q.t?QTYPE[q.t].n:'一句'}</small>`:q.t==='s'?`<small>・${q.R?'幾段連唱':q.a?`第 ${q.a}–${q.b} 句連唱`:'整段連唱'}</small>`:'';
    tip=q.t==='j'?(J?`這句有一個大跳：${J.st>0?'往上':'往下'}跳 ${Math.abs(J.st)} 個半音。注意跳的那一下有沒有到位。想只聽跳的那幾個字，用右邊「✂️ 框選幾個字」。`:'這句有一個大跳，注意跳的那一下有沒有到位。'):q.R?'好幾個 Part 從頭連到尾唱一次：段落之間怎麼接、換氣的地方、後面有沒有累到掉音。':q.t?QTYPE[q.t].t:QMODE[m].t;
    steps=m==='mind'?`<div class="qz-st"><b>1</b><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':q.l!=null?'▶ 先聽原曲這句':'▶ 先聽原曲這段'}</button></div>
      <div class="qz-st"><b>2</b><button data-q="mind" class="go${on('mind')}">${on('mind')?'⏹ 停':'▶ 開始'}（${q.l!=null?'這一句會消音':'整段會消音'}）</button></div>
      <div class="qz-st"><b>3</b><span>消音時在心裡繼續唱；聲音回來那一刻，妳還在音上嗎？對不上的字在右邊點它</span></div>`
     :q.t==='f'?`${recB(1,'⏺ 跟伴奏錄：直接唱第一個字')}${cmp(2)}<div class="qz-st"><b>3</b><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':'▶ 再聽一次原唱的開頭'}</button></div>`
     :`<div class="qz-st"><b>1</b><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':q.l!=null?'▶ 先聽原曲這句':'▶ 先聽原曲這段'}</button></div>${recB(2,`⏺ 跟伴奏${QMODE[m].v}一次`)}${cmp(3)}`;
    right=`<div class="qz-lyr${q.l!=null?' one':''}${q.t==='s'?' many':''}">${q.t==='s'?qzFoldHtml(q):''}${A.length?(q.t==='s'?`<div class="qz-lp">${qzChars(q,r)}</div>`:qzChars(q,r)):`<p class="qz-tip">（這首還沒貼歌詞，就用提示：${esc(st.cue)}）</p>`}</div>
      <p class="qz-leg qz-brush" title="先選筆、再點字">${QMARKS.pitch.map(([k,i,n])=>`<button data-q="brush" data-b="${k}" class="${k}${qzBrush()===k?' on':''}">${i} ${n}</button>`).join('')}<button data-q="brush" data-b="p" class="p${qzBrush()==='p'?' on':''}">🎵 音高</button><button data-q="brush" data-b="e" class="e${qzBrush()==='e'?' on':''}">⌫ 擦掉</button>${nm?`　・已標 ${nm} 個字`:''}</p>`;
  }else if(q.cat==='lyr'){
    const pv=q.l>0?A[q.l-1]:'',len=[...A[q.l]].filter(c=>!/\s/.test(c)).length;
    title+='<small>・歌詞填空</small>';tip='詞遮起來了。伴奏從上一句開始放，輪到這句時，不看詞唱出來。唱完再對答案，卡住或唱錯的字點起來。';
    steps=`<div class="qz-st"><b>1</b><button data-q="lplay" class="go${on('lplay')}">${on('lplay')?'⏹ 停':'▶ 放伴奏，輪到時唱出這句'}</button></div>
      <div class="qz-st"><b>2</b><button data-q="rev" class="${Q.rev?'on':''}">${Q.rev?'🙈 再遮起來':'👀 對答案'}</button><button data-q="listen" class="${on('listen')}">${on('listen')?'⏹ 停':'▶ 聽原唱這句'}</button></div>
      <div class="qz-st"><b>3</b><span>卡住、唱錯的字，在右邊點它</span></div>`;
    right=`${pv?`<p class="qz-prev">上一句：${esc(pv)}</p>`:'<p class="qz-prev">這是第一句</p>'}<div class="qz-lyr one">${Q.rev||nm?qzChars(q,r):`<p class="qz-blank">${'＿'.repeat(len)}<small>${len} 個字</small></p>`}</div>
      ${Q.rev||nm?`<p class="qz-leg">點字標記：<span class="x">✗ 卡住／唱錯</span> → 取消${nm?`　・已標 ${nm} 個字`:''}</p>`:''}`;
  }else if(q.cat==='beat'){
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
  el.innerHTML=`<div class="qz-hush">🤫 在心裡繼續唱…</div>${qzHead(q.cat==='pitch'?`<span class="qz-modes">${Object.keys(QMODE).filter(k=>q.t!=='f'||k!=='mind').map(k=>`<button data-q="mode" data-m="${k}" class="${k===m?'on':''}">${QMODE[k].n}</button>`).join('')}</span>`:'')}
  <div class="qz-b"><div class="qz-steps">${qzH2()}<div class="qz-t">${Q.paper&&(Q.paper.cat==='all'||Q.paper.cat==='wrong')?`<span class="qz-catb">${C.n}</span>`:''}<span class="qz-sec">${title}</span><span class="qz-time">${mmss(a)}–${mmss(b)}</span><span id="qz-timer" class="qz-timer"></span><p class="qz-tip">${tip}</p></div>${steps}
      <div class="qz-res"><span>這題的結果<small>過關＝${C.pass}</small></span>${Object.keys(C.res).map(k=>`<button data-q="res" data-v="${k}" class="${k}${r.res===k?' on':''}">${C.res[k]}</button>`).join('')}</div>
      <div class="qz-nav"><button data-q="go" data-j="${Q.i-1}" ${Q.i?'':'disabled'}>← 上一題</button><input class="qz-in" data-q="note" placeholder="筆記：例如「人海」的海掉下來" value="${esc(r.n||'')}">${Q.i<n-1?`<button data-q="go" data-j="${Q.i+1}" class="go">下一題 →</button>`:'<button data-q="sum" class="go">看成績單 →</button>'}</div>${qzAdjRow}</div>
    <div class="qz-r">${right}${tools}</div></div><div class="qz-tipbar"${Q.tip?'':' hidden'}>${esc(Q.tip||'')}</div>`;
  qzCutLyr(q,qzCut(q));qzFitLyr();qzWatch(el);
  Q.k=-2;
}
app.addEventListener('click',e=>{
  const t=e.target.closest('#studio [data-q]');if(!t||!S)return;const a=t.dataset.q;
  if(a==='open'){Q?qzClose():qzOpen();return}
  if(!Q||a==='note')return;const q=Q.list[Q.i];
  if(a==='x'){qzClose();return}
  if(a==='home'){if(S.recd)return;Q.seq=null;sStop();Q.home=true;Q.bank=null;qzRender();return}
  if(a==='hc'){Q.hc=t.dataset.cat;if(Q.hc!=='pitch'&&Q.hc!=='all')Q.wk='all';qzLS('scene-pquiz-hc',Q.hc);qzRender();return}
  if(a==='psum'){const hc=Q.hc||'pitch',part=t.dataset.part,list=qzPaperList(hc,part);if(!list.length)return;Q.paper={cat:hc,part,ord:'seq'};Q.list=list;Q.i=0;Q.home=false;Q.sum=true;Q.act='';sStop();qzRender();return}
  if(a==='begin'){Q.bank=null;qzBegin(t.dataset.cat,t.dataset.part,t.dataset.ord);return}
  if(a==='cont'){const l=qzLastAll()[key];if(l)qzBegin(l.cat,l.part,l.ord,l.ids,l.i);return}
  if(a==='redo'){const ids=Q.list.filter(x=>{const r=qzGet(x.id).res;return r&&r!=='ok'}).map(x=>x.id);if(ids.length)qzBegin('wrong','all','seq',ids,0);return}
  if(a==='lsel'){if(S.recd)return;const li=+t.dataset.li;if(Q.lsel==null){Q.lsel=li;document.querySelectorAll('#s-quiz .qz-lno').forEach(x=>x.classList.toggle('on',+x.dataset.li===li));qzHint(`從第 ${li+1} 句：再點最後一句的號碼（同一句再點一次＝只練這句）`);return}
    const x=Math.min(Q.lsel,li),y=Math.max(Q.lsel,li);Q.lsel=null;const A=qzLineSpan(q,x),B=qzLineSpan(q,y);if(!A||!B){qzRender();return}
    sStop();Q.act='';Q.cut=[Math.max(0,A[0]-.15),B[1]];Q.cutQ=q.id;Q.boxing=false;qzCutGo();return}
  if(a==='wk'){Q.wk=t.dataset.k;qzRender();return}
  if(a==='wo'){Q.wo=t.dataset.v==='1';qzLS('scene-pquiz-wo',Q.wo?'1':'');qzRender();return}
  if(a==='songs'){sStop();location.href='../#songs';return}
  if(a==='fold'){Q.fold=!Q.fold;qzRender();return}
  if(a==='msel'){const k=+t.dataset.n;if(Q.hsel==null){Q.hsel=k;qzRender();return}
    const x=Math.min(Q.hsel,k),y=Math.max(Q.hsel,k);Q.hsel=null;if(x===y){qzHint('至少兩個 Part：點第一個、再點最後一個');qzRender();return}
    qzGrpSave('R',l=>l.some(g=>g[0]===x&&g[1]===y)?l:l.concat([[x,y]]));Q.bank=null;qzRender();qzHint(`多了一題：Part ${x+1}–${y+1} 連唱`);return}
  if(a==='mbeg'){qzBegin('pitch','all','seq',[t.dataset.id],0);return}
  if(a==='mmv'){const nq=qzQ(t.dataset.id);if(!nq)return;const d=+t.dataset.d;qzGrpSave('R',l=>{const i=l.findIndex(g=>g[0]===nq.s0&&g[1]===nq.s),j=i+d;if(i<0||j<0||j>=l.length)return l;const m=l.slice();[m[i],m[j]]=[m[j],m[i]];return m});Q.bank=null;qzRender();return}
  if(a==='mdel'){const nq=qzQ(t.dataset.id);if(!nq)return;qzGrpSave('R',l=>l.filter(g=>!(g[0]===nq.s0&&g[1]===nq.s)));Q.bank=null;qzRender();return}
  if(a==='grp'){if(S.recd)return;const k=+t.dataset.n;if(!Q.gsel){Q.gsel=k;qzRender();return}
    const x=Math.min(Q.gsel,k),y=Math.max(Q.gsel,k),n=qzLines(q.s).length;Q.gsel=0;
    if(x===y){qzHint('一組至少兩句：點第一句、再點最後一句');qzRender();return}
    if(x===1&&y===n){qzGoId('P'+q.s);return}
    qzGrpSave(q.s,l=>l.some(g=>g[0]===x&&g[1]===y)?l:l.concat([[x,y]]));Q.bank=null;qzGoId(`P${q.s}.${x}-${y}`);qzHint(`多了一題：第 ${x}–${y} 句連唱`);return}
  if(a==='grpgo'){if(S.recd)return;Q.gsel=0;qzGoId(t.dataset.id);return}
  if(a==='grpdel'){if(S.recd)return;const nq=qzQ(t.dataset.id);if(!nq||!nq.a)return;qzGrpSave(nq.s,l=>l.filter(g=>!(g[0]===nq.a&&g[1]===nq.b)));Q.bank=null;
    const cur=Q.list[Q.i]&&Q.list[Q.i].id===nq.id,j=Q.list.findIndex(x=>x.id===nq.id);if(j>=0){Q.list.splice(j,1);if(j<Q.i)Q.i--}
    if(cur)qzGoId('P'+nq.s);else{qzSaveLast();qzRender()}return}
  if(a==='tabq'){if(S.recd)return;if(Q.list&&Q.list.length){Q.home=false;Q.sum=false;qzFocus();qzRender()}else{const l=qzLastAll()[key];if(l&&l.ids)qzBegin(l.cat,l.part,l.ord,l.ids,l.i)}return}
  if(a==='tabs'){if(S.recd)return;if(!(Q.list&&Q.list.length)){const l=qzLastAll()[key];if(!(l&&l.ids))return;qzBegin(l.cat,l.part,l.ord,l.ids,l.i)}Q.seq=null;sStop();Q.home=false;Q.sum=true;qzRender();return}
  if(a==='sum'){if(S.recd)return;Q.seq=null;sStop();Q.sum=true;qzRender();return}
  if(a==='back'){Q.sum=false;if(Q.list.length)qzFocus();qzRender();return}
  if(Q.home)return;
  if(a==='go'){const cq=!Q.sum&&Q.list[Q.i],miss=cq&&!qzGet(cq.id).res&&+t.dataset.j>Q.i;qzGo(+t.dataset.j);if(miss)qzHint(`上一題還沒選「這題的結果」，進度和 ⭐ 不會算到它；可以按「← 上一題」回去選`);return}
  if(!q)return;
  if(a==='mode'){if(S.recd)return;sStop();qzSet(q.id,{m:t.dataset.m});Q.act='';qzRender()}
  else if(a==='listen'){const c=qzCut(q);if(c){const run=()=>qzPlay('listen',qzOrig(),c[0]-.05,c[1]+.05);run();if(Q.act)Q.lastRun=run;return}const [x,y]=q.cat==='beat'?qzRange(q):qzRecRange(q);qzPlay('listen',q.cat==='lyr'?[qzRef()]:qzOrig(),q.cat==='beat'?x-2:x-1.5,y+.4)}
  else if(a==='mind')qzMind(q);
  else if(a==='alt'){qzAlt(q);if(qzCut(q)&&Q.act)Q.lastRun=()=>qzAlt(q)}
  else if(a==='cmp'){const c=t.dataset.c,run=()=>{const [x,y]=qzCut(q)||qzRange(q),k=qzCut(q)?.05:.5;qzPlay(c,c==='both'?[qzRef(),'me']:c==='ref'?[qzRef()]:['me'],x-k,y+(qzCut(q)?.05:.3))};run();if(qzCut(q)&&Q.act)Q.lastRun=run}
  else if(a==='box'){sStop();Q.seq=null;Q.act='';Q.boxing=!Q.boxing;qzRender();if(Q.boxing)qzHint('在下面的波形上，手指從要重複的第一個字拖到最後一個字')}
  else if(a==='topen'){Q.toneOpen=q.id;qzSet(q.id,{hint:1});qzRender();qzHint('點字聽那個音；對準了就收起來，回去跟原唱比')}
  else if(a==='tclose'){Q.toneOpen=null;Q.toneBad=false;qzSlowStop();Q.act='';qzRender()}
  else if(a==='tmix'){qzMix(q);qzHint('鋼琴音疊在原唱上：哪個字聽起來打架，按「標怪」再點那個字')}
  else if(a==='tbad'){Q.toneBad=!Q.toneBad;qzRender()}
  else if(a==='tone'){const N=qzNotes(q);if(!N)return;const w=+t.dataset.w;let sel=qzToneSel(N).slice();
    if(w===-2){Q.toneSel=null;qzRender();return}
    if(w>=0&&Q.toneBad){const A=qzBadAll(),B=A[key]=A[key]||{},g=N.i0+w;if(B[g])delete B[g];else B[g]=N.w[w][0]+' '+N.w[w][1];qzLS('scene-tonebad',JSON.stringify(A));qzRender();qzHint(B[g]?`「${N.w[w][0]}」標成怪：截圖給 Claude，我再對一次簡譜`:'取消標記');return}
    if(w>=0){sel=sel.includes(w)?sel.filter(x=>x!==w):sel.concat(w).sort((x,y)=>x-y);Q.toneSel={k:N.k,i:sel}}
    const ws=w>=0?[N.w[w]]:(sel.length?sel.map(i=>N.w[i]):N.w),bt=60/(N.bpm||75),Ls=[];
    ws.forEach(([ch,ns,b])=>{const a=qzNs(ns),d=Math.max(w>=0?.35:.15,(b||.5)*bt/a.length);a.forEach(n=>Ls.push([n,Math.min(d,w>=0?1.2:1.6)]))});
    Q.act='';Q.lastRun=null;qzTone(Ls,N.base);qzRender();qzHint(ws.map(x=>x[0]+' '+qzNs(x[1]).map(qzSol).join('→')).join('　'))}
  else if(a==='spd'){const fn=Q.lastRun,v=+t.dataset.d===9?1:Math.max(.3,Math.min(1,Math.round((qzSpeed()+ +t.dataset.d)*100)/100));qzSlowStop();sStop();Q.act='';Q.seq=null;Q.lastRun=null;qzLS('scene-pquiz-speed',String(v));qzRender();qzHint(v<1?`速度 ${v.toFixed(2)} 倍（音高不變）`:'回到原速');if(fn){fn();if(Q.act)Q.lastRun=fn}}
  else if(a==='cutn'){const c=qzCut(q);if(!c)return;const e2=+t.dataset.e,d=+t.dataset.d*.1,n=c.slice();n[e2]=Math.max(0,Math.min(S.dur,n[e2]+d));if(n[1]-n[0]<.15)return;Q.cut=n;sDraw();qzRender()}
  else if(a==='uncut'){Q.cut=null;Q.lastRun=null;sStop();Q.act='';sDraw();qzRender()}
  else if(a==='rec')qzRec(q);
  else if(a==='del'){const [x,y]=qzCut(q)||qzRecRange(q),k=takes.find(t=>t.id===S.selTake)||takes.slice().sort((u,v)=>v.at-u.at).find(k=>k.start<y&&k.end>x);if(!k||!confirm('刪掉這題最新的這次錄音？'))return;sStop();tkUndo.push({t:'del',k});takes=takes.filter(t=>t!==k);if(S.selTake===k.id)S.selTake=null;S.bufs.delete(k.id);saveTakes();qzSet(q.id,{rec:0});sDraw();qzRender();qzHint('刪掉了，按紅色的鍵再錄一次')}
  else if(a==='lplay'){const [x,y]=qzLineRange(q.l),pv=getLines()[q.l-1],from=pv!=null&&pv<x&&x-pv<12?pv-.3:x-4;qzPlay('lplay',[qzBack()],from,y+.5)}
  else if(a==='rev'){Q.rev=!Q.rev;qzRender()}
  else if(a==='mprev'){const [x]=secRange(q.s);qzPlay('mprev',qzOrig(),q.s?x-6:0,x+.05)}
  else if(a==='mplay'){const [x,y]=secRange(q.s);qzPlay('mplay',qzOrig(),x-.3,Math.min(y,x+8))}
  else if(a==='brush'){qzLS('scene-qbrush',t.dataset.b);document.querySelectorAll('#s-quiz [data-q=brush]').forEach(b=>b.classList.toggle('on',b.dataset.b===t.dataset.b));return}
  else if(a==='mk'&&q.cat==='pitch'&&(qzBrush()==='p'||qzBrush()==='e')&&(qzBrush()==='p'||qzMkOf(q).pn[t.dataset.k])){const k=t.dataset.k;
    if(qzBrush()==='p'&&!qzNotes(q)){qzHint('這句還沒有簡譜音可以顯示');return}if(q.t==='s')Q.fold=true;
    qzMkPut(q,k,(c,gk)=>{if(qzBrush()==='e'){delete c.pn[gk];delete c.mk[gk]}else if(c.pn[gk])delete c.pn[gk];else c.pn[gk]=1});if(qzBrush()==='p')qzSet(q.id,{hint:1});qzRender();return}
  else if(a==='mk'){const MK=QMARKS[q.cat];if(!MK)return;const mk=qzMkOf(q).mk,k=t.dataset.k,o=['',...MK.map(x=>x[0])],br=MK.length>1?qzBrush():'',nx=br==='e'?'':br?(mk[k]===br?'':br):o[(o.indexOf(mk[k]||'')+1)%o.length];qzMkPut(q,k,(c,gk)=>{if(nx)c.mk[gk]=nx;else delete c.mk[gk]});if(q.t==='s'&&!Q.fold){Q.fold=true;qzRender();return}
    const M=MK.find(x=>x[0]===nx);t.className=(nx||'')+(t.classList.contains('focus')?' focus':'');const i=t.querySelector('i');if(i)i.remove();if(M)t.insertAdjacentHTML('beforeend',`<i>${M[1]}</i>`);
    const lg=document.querySelector('#s-quiz .qz-leg');if(lg){const n=Object.keys(qzMkOf(q).mk).length;lg.lastChild.nodeType===3&&/已標/.test(lg.lastChild.textContent)&&lg.lastChild.remove();if(n)lg.insertAdjacentText('beforeend',`　・已標 ${n} 個字`)}}
  else if(a==='tskip'){document.getElementById('qz-tover')?.remove();if(S.recd)return;const C=QCAT[q.cat]||{};if(Q.qt)Q.qt.show=false;const bad=q.cat==='beat'?null:'bad';if(bad&&!qzGet(q.id).res)qzSet(q.id,{res:bad});if(Q.i<Q.list.length-1)qzGo(Q.i+1);else{Q.sum=true;sStop();qzRender()}return}
  else if(a==='tmore'){document.getElementById('qz-tover')?.remove();if(Q.qt){Q.qt.lim=Q.qt.acc+120;Q.qt.warned=false;Q.qt.show=false}return}
  else if(a==='qrng'){const A=qzRngAll(),B=A[key]=A[key]||{},rk=qzRk(q),r=(B[rk]||qzRAuto(q)).slice(),e=+t.dataset.e;r[e]=Math.round((r[e]+ +t.dataset.d*.2)*100)/100;if(r[1]-r[0]<.5)return;B[rk]=r;qzLS('scene-qrng',JSON.stringify(A));qzSlowStop();sStop();Q.act='';qzFocus();qzRender();qzHint(`範圍改成 ${r[0].toFixed(1)}–${r[1].toFixed(1)} 秒（每按一下 0.2 秒），先聽原曲、錄音、比一比都會照這個`);return}
  else if(a==='qrng0'){const A=qzRngAll();if(A[key])delete A[key][qzRk(q)];qzLS('scene-qrng',JSON.stringify(A));qzFocus();qzRender();return}
  else if(a==='res'){const v=t.dataset.v;qzSet(q.id,{res:qzGet(q.id).res===v?null:v});qzRender()}
},true);
app.addEventListener('input',e=>{const t=e.target;if(!Q||t.dataset.q!=='note'||!Q.list[Q.i])return;qzSet(Q.list[Q.i].id,{n:t.value})});
(()=>{const s=document.createElement('style');s.textContent=`
#studio.quiz{grid-template-rows:auto minmax(0,1fr) auto minmax(76px,14vh) 0 0}#qz-tdel{position:fixed;right:20px;z-index:60;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,138,128,.6);background:rgba(40,20,18,.92);color:#ffb3ab;font-size:14px}#qz-tdel[hidden]{display:none}#qz-undo{display:inline-flex;align-items:center;gap:6px;position:fixed;right:20px;z-index:60;padding:6px 12px;border-radius:999px;border:1px solid rgba(242,194,123,.6);background:rgba(40,30,18,.92);color:#f2c27b;font-size:14px}#qz-undo[hidden]{display:none}#studio.quiz>.s-take,#studio.quiz>.s-bot{display:none}#studio.quiz .s-lane:not(.me):not([data-l=vocal]){display:none}#studio.quiz .s-pic{margin-bottom:12px}
.qz-tw{align-items:flex-start}.qz-chips{display:flex;flex-wrap:wrap;gap:5px;flex:1}.qz-nt.bad{background:rgba(232,90,80,.35)!important;border-color:#e8806f!important}.qz-nt.on{background:rgba(242,194,123,.25)!important;border-color:#e8c27a!important}.qz-nt{display:inline-flex;flex-direction:column;align-items:center;line-height:1.1;padding:4px 10px!important}.qz-nt b{font-size:16px}.qz-nt small{font-size:14px;opacity:.85;font-weight:600}.qz-psum{cursor:pointer}.qz-psum:hover{color:#f2c27b}.qz-rw{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.qz-rw b{font-weight:500;font-size:16px;padding:1px 7px;border-radius:7px;background:rgba(255,255,255,.06)}.qz-rw b i{font-style:normal;font-size:12px;margin-left:2px}.qz-rw .u{background:rgba(232,128,111,.38)}.qz-rw .d{background:rgba(120,165,255,.38)}.qz-rw .w{background:rgba(242,194,123,.38)}.qz-lm b{position:relative;font-weight:inherit;padding:0 2px;border-radius:5px}.qz-lm b i{position:absolute;top:-.85em;right:-.15em;font-style:normal;font-size:12px}.qz-lm .u{background:rgba(232,128,111,.38)}.qz-lm .d{background:rgba(120,165,255,.38)}.qz-lm .w{background:rgba(242,194,123,.38)}.qz-sv{display:inline-flex;align-items:center;justify-content:center;min-width:58px;padding:0 6px;font-size:14px;color:var(--gold,#e8c27a);border-left:1px solid var(--line);border-right:1px solid var(--line)}.qz-sr{margin-left:6px;padding:6px 10px;font-size:12px}.qz-seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}.qz-seg button{border:0!important;border-radius:0!important;padding:7px 12px;font-size:13px;background:transparent}.qz-seg button+button{border-left:1px solid var(--line)!important}#s-quiz .qz-seg button.on{background:var(--glow);color:#1a130c;font-weight:600}.qz-tools{margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:8px 12px;background:rgba(255,255,255,.03);display:grid;gap:6px}.qz-tr{display:flex;align-items:center;gap:6px;flex-wrap:wrap}#s-quiz .qz-tr button{padding:3px 10px;font-size:12px;min-height:0;line-height:1.5}.qz-tl{width:84px;font-size:13px;color:var(--muted);flex:none}.qz-tg{font-size:12px;color:var(--muted)}.qz-th{margin:0;font-size:12px;color:var(--muted)}#s-quiz .qz-tools button.on{background:rgba(120,200,255,.2);border-color:rgba(120,200,255,.8);color:#bfe3ff}.qz-tipbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(19vh + 24px);z-index:5;max-width:90vw;background:var(--glow);color:#1a130c;border-radius:99px;padding:8px 18px;font-size:14px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.5)}.qz-tipbar[hidden]{display:none}.qz-adj span{font-size:12px!important}#studio .qz-adj button{padding:4px 10px;font-size:12px}
#studio.quiz .s-lane:not(.me){flex:0 0 32px!important}#studio.quiz .s-lyr{display:none}#studio.quiz .s-pic::before{display:none}
#studio .qz-open{margin-left:auto}#studio.quiz .qz-open{background:rgba(242,194,123,.22);border-color:var(--glow);color:var(--glow)}
#qz-tover{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;width:min(440px,90%);background:#2a231a;border:1px solid #e8c27a;border-radius:16px;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:10px}#qz-tover b{font-size:18px;color:#f2c27b}#qz-tover span{font-size:14px;line-height:1.6;opacity:.9}#qz-tover div{display:flex;gap:8px;justify-content:flex-end}.qz-timer{font-size:13px;opacity:.75;margin-left:8px;font-variant-numeric:tabular-nums}.qz-tabs{display:flex;border:1px solid rgba(255,255,255,.16);border-radius:999px;overflow:hidden;flex:none}.qz-tabs button{border:0!important;border-radius:0!important;background:transparent;padding:7px 13px;margin:0!important;font-size:14px}.qz-tabs button+button{border-left:1px solid rgba(255,255,255,.16)!important}.qz-tabs button.on{background:rgba(232,194,122,.22);color:#f5c451;font-weight:600}.qz-tabs button:disabled{opacity:.35}.qz-tt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.qz-grp button{min-width:34px}.qz-grp button.on{background:#f5c451!important;color:#1a1408!important}.qz-grp button.in{background:rgba(232,194,122,.3)!important;border-color:#e8c27a!important}.qz-gc{display:inline-flex;border:1px solid rgba(255,255,255,.18);border-radius:999px;overflow:hidden}.qz-gc button{border:0!important;border-radius:0!important;margin:0!important}.qz-gc.cur,.qz-grp button.cur{background:rgba(232,194,122,.25)}
#studio #s-quiz{gap:6px;padding-bottom:8px}.qz-t{row-gap:2px}.qz-t .qz-tip{flex-basis:100%;font-size:12.5px;line-height:1.45}.qz-sec{font-size:19px}
.qz-lyr.one p{font-size:26px;line-height:1.35;padding:4px 8px}.qz-res{margin-top:10px;padding-top:8px}.qz-nav{margin-top:10px}
.qz-steps>.qz-in{margin-top:12px}.qz-adj{margin-top:8px}.qz-tools{margin-top:6px;padding:6px 10px;gap:4px}#studio .qz-tools button{padding:4px 10px;font-size:13px}
#studio .qz-nt{padding:2px 7px!important}.qz-nt b{font-size:15px}.qz-nt small{font-size:12px}.qz-leg{margin:4px 0}#studio .qz-brush button{padding:4px 8px}
.qz-tl{width:68px!important}.qz-boxb{margin-left:auto!important}.qz-h{margin-bottom:0}
.qz-tact{display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap}.qz-chips{align-items:center}
.qz-st{margin:0 0 7px}.qz-adj .qz-tl{width:auto!important;margin-right:4px}.qz-res{margin-top:6px}.qz-res>span{margin-bottom:2px}
.qz-nav{gap:8px;align-items:center}.qz-nav .qz-in{flex:1;min-width:0;padding:7px 9px;font-size:13px}.qz-nav button{flex:none}
.qz-lyr{padding:4px 10px}.qz-lyr.one p{font-size:25px}.qz-tools{gap:3px}#studio .qz-tools button{padding:3px 10px}.qz-t .qz-tip{margin-top:-2px}
#studio.quiz{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}
.qz-multi{margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)}.qz-multi h4 small{font-weight:400;font-size:12px;color:var(--muted);margin-left:8px}.qz-multi .qz-grp{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
.qz-lyr.many{overflow:auto}.qz-lyr.many p{font-size:16px;line-height:1.5;margin:0}
.qz-lyr{position:relative}#studio .qz-mkt{position:absolute;top:6px;right:8px;font-size:12px;padding:3px 10px;background:rgba(0,0,0,.35);border:1px solid rgba(232,194,122,.4);z-index:2}#studio .qz-mkt.on{background:rgba(232,194,122,.25);color:#f5c451}.qz-lyr span.gh{outline:1.5px dashed rgba(255,255,255,.45);outline-offset:-1px}.qz-ln{font-size:12px;color:var(--muted);margin-left:10px;letter-spacing:0}.qz-lyr.many .qz-mkt{position:sticky;float:right;top:0}.qz-r.fo .qz-lyr{max-height:66px;overflow:auto}.qz-r.fo .qz-lyr p{font-size:15px;line-height:1.45}#studio .qz-fold>button{width:100%;text-align:left;background:rgba(232,194,122,.1);border:1px solid rgba(232,194,122,.35);padding:5px 10px;font-size:13px}.qz-fl{max-height:min(120px,18vh);overflow:auto;margin-top:4px;padding:4px 8px;border:1px solid var(--line);border-radius:10px;background:rgba(0,0,0,.25)}.qz-fr{display:flex;align-items:baseline;gap:8px;padding:3px 0;font-size:16px;flex-wrap:wrap}.qz-fr>b{color:var(--muted);font-size:12px;width:16px}.qz-fr small{color:var(--muted);font-size:12px}.qz-fold0{margin:4px 0 0;font-size:12px;color:var(--muted)}
.qz-lno{display:inline-block;min-width:20px;margin-right:8px;padding:0 5px;border-radius:6px;font-size:12px;font-weight:600;color:var(--muted);border:1px solid var(--line);text-align:center;cursor:pointer;vertical-align:middle;letter-spacing:0;line-height:1.6}.qz-lno.on{background:#78c8ff;color:#06202e;border-color:#78c8ff}.qz-lyr p.incut{background:rgba(120,200,255,.14);box-shadow:inset 3px 0 0 rgba(120,200,255,.9);border-radius:6px}
.qz-lyt{position:sticky;top:-4px;z-index:2;display:flex;justify-content:flex-end;gap:6px;margin:0 -6px 2px;padding:2px 0;background:linear-gradient(rgba(26,22,17,.97),rgba(26,22,17,.85))}#studio .qz-lyt .qz-mkt{position:static}
.qz-lyr p.pn{line-height:2.2!important}#studio .qz-lyr.many p,#studio .qz-lyr.many p.pn{line-height:1.75!important;padding-top:0;padding-bottom:0;white-space:nowrap;overflow:visible}#studio .qz-lyr.many .qz-ln{display:inline-block;max-width:45%;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom}#studio .qz-lyr.many .qn{top:calc(100% - 4px);font-size:10px}#studio .qz-lyr.many .qz-lno{line-height:1.3;font-size:11px;padding:0 4px;min-width:18px}.qz-lyr.many .qz-lp p{font-size:var(--lf,17px)}.qz-lyr.two .qz-lp{column-count:2;column-gap:18px}.qz-lyr.two .qz-lp p{break-inside:avoid;white-space:nowrap;letter-spacing:.06em;font-size:16px}.qz-lyr.many p{font-size:17px}.qz-lyr span{position:relative}.qz-lyr .qn{position:absolute;left:50%;transform:translateX(-50%);top:calc(100% - 1px);font-style:normal;font-size:11px;line-height:1;color:#9fd0ff;white-space:nowrap;letter-spacing:0;pointer-events:none}.qz-lyr .qn s{text-decoration:none;opacity:.6;font-size:9px}
.qz-steps>.qz-t{margin-bottom:8px}.qz-b{grid-template-columns:minmax(300px,.8fr) minmax(0,1.2fr)}.qz-r{min-width:0}
@media (min-width:821px){
  #studio .qz-b{grid-template-columns:minmax(300px,.8fr) minmax(0,1.2fr);align-items:stretch;flex:1 1 auto;min-height:0}
  #studio .qz-steps{display:flex;flex-direction:column;min-height:0}#studio .qz-steps>.qz-nav{margin-top:auto;padding-top:10px}
  #studio .qz-r{display:flex;flex-direction:column;min-height:0}#studio .qz-r>.qz-lyr{flex:1 1 auto;min-height:90px;display:flex;flex-direction:column;justify-content:center}
  #studio .qz-r>.qz-lyr.many{min-height:120px;justify-content:flex-start;overflow:auto}#studio .qz-r>.qz-lyr.many .qz-lp{margin:0;padding-bottom:9px}#studio .qz-lyr.many{position:relative}#studio .qz-lyr.many .qz-lyt{position:absolute;top:6px;right:8px;margin:0;padding:0;background:none}
  #studio .qz-r>.qz-tools{flex:none}
}
#studio .qz-x{margin-left:10px;font-size:13px;padding:5px 12px}.qz-steps>.qz-h2{margin-bottom:6px}.qz-t .qz-timer{margin-left:4px}
.qz-ll{font-size:12px;color:#e8a06f;margin:2px 0}.qz-ll pre{font:12px/1.5 ui-monospace,monospace;color:var(--muted);white-space:pre-wrap;margin:4px 0}
.qz-timer.idle{opacity:.45;font-size:12px}.qz-timer.over{color:#e8806f;opacity:1;font-weight:600}
#s-quiz{position:absolute;inset:0;background:rgba(18,15,11,.95);overflow:auto;padding:12px 18px 16px;display:flex;flex-direction:column;gap:8px;-webkit-user-select:none;user-select:none}
#s-quiz .sp{flex:1}
.qz-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.qz-h>b{color:var(--glow);font-size:15px}.qz-n{color:var(--muted);font-size:13px}
.qz-dots{display:flex;gap:4px;flex-wrap:wrap;flex:1}
#studio .qd{width:28px;height:28px;padding:0;font-size:12px;border-radius:50%;display:inline-grid;place-items:center;font-style:normal;flex:none;border:1px solid var(--line)}
#studio .qd.cur{border:2px solid var(--glow);color:var(--glow)}
#studio .qd.ok{background:#7fc28a;border-color:#7fc28a;color:#10200f}#studio .qd.some{background:#f2c27b;border-color:#f2c27b;color:#2a1c08}#studio .qd.bad{background:#e8806f;border-color:#e8806f;color:#2a0d06}
.qz-t{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.qz-sec{font-size:22px;font-weight:700}.qz-time{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.qz-modes{display:flex;gap:6px;margin-left:auto}.qz-kind{display:flex;gap:4px}#studio .qz-kind button{padding:5px 10px;font-size:12px}.qz-sec small{font-size:13px;color:var(--muted);font-weight:400}
.qz-lyr.one p{font-size:30px;line-height:1.5;padding:6px 8px}.qz-who span.ref{color:#8cc8ff}.qz-who span.me{color:#ff8a80;font-weight:600}.qz-who span{font-size:13px}
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
.qz-lyr span.u,.qz-leg .u,.qz-words .u{background:rgba(232,128,111,.38)}.qz-lyr span.d,.qz-leg .d,.qz-words .d{background:rgba(120,165,255,.38)}.qz-lyr span.w,.qz-leg .w,.qz-words .w{background:rgba(242,194,123,.38)}.qz-lyr span.r,.qz-lm .r,.qz-rw .r,.qz-leg .r,.qz-words .r{background:rgba(176,140,240,.4)}.qz-lyr span.a,.qz-lm .a,.qz-rw .a,.qz-leg .a,.qz-words .a{background:rgba(110,200,150,.38)}.qz-lyr span.k,.qz-lm .k,.qz-rw .k,.qz-leg .k,.qz-words .k{background:rgba(240,140,190,.38)}
.qz-brush{display:flex;flex-wrap:wrap;align-items:center;gap:5px}.qz-brush button{font-size:13px;padding:5px 7px;border-radius:999px;border:1.5px solid transparent!important;margin:0!important;color:var(--ink)}.qz-brush button.d{background:rgba(120,165,255,.38)!important}.qz-brush button.u{background:rgba(232,128,111,.38)!important}.qz-brush button.w{background:rgba(242,194,123,.38)!important}.qz-brush button.r{background:rgba(176,140,240,.4)!important}.qz-brush button.a{background:rgba(110,200,150,.38)!important}.qz-brush button.k{background:rgba(240,140,190,.38)!important}.qz-brush button.p{background:rgba(159,208,255,.25)!important}.qz-brush button.e{background:rgba(255,255,255,.08)!important}.qz-brush button.on{border-color:#f5c451!important;box-shadow:0 0 0 2px rgba(245,196,81,.35);font-weight:600}
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
.qz-h2{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.qz-bar{width:80px;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.qz-bar i{display:block;height:100%;background:var(--glow)}.qz-more{color:var(--muted)}
.qz-h>b{font-size:15px}.qz-catb{border:1px solid var(--glow);color:var(--glow);border-radius:99px;padding:2px 10px;font-size:13px}
.qz-home{display:grid;grid-template-columns:minmax(240px,.8fr) 1.4fr;gap:18px;align-items:start}
.qz-crs{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:14px;overflow:hidden}
#studio .qz-cr{display:flex;align-items:center;gap:8px;border-radius:0;border:0;border-bottom:1px solid var(--line);background:transparent;padding:12px 14px;text-align:left;font-size:16px}
#studio .qz-cr:last-child{border-bottom:0}#studio .qz-cr span{flex:1}#studio .qz-cr small{color:var(--muted);font-size:12px}#studio .qz-cr em{font-style:normal;color:#f2c27b;font-size:14px;min-width:64px;text-align:right}
#studio .qz-cr.on{background:rgba(242,194,123,.16)}#studio .qz-cr.wr span{color:#ffb3ab}
#studio .qz-cont{width:100%;margin-top:12px;border-radius:14px;padding:14px;background:var(--glow);border-color:var(--glow);color:#1a130c;font-size:18px;font-weight:700;display:flex;flex-direction:column;gap:2px;align-items:center}.qz-cont small{font-size:12px;font-weight:400}
.qz-parts h4{margin:4px 0 8px;font-size:14px;color:var(--glow);font-weight:600}
.qz-pr{display:flex;align-items:center;gap:8px;padding:9px 4px;border-bottom:1px solid var(--line)}.qz-pr span{flex:1;font-size:15px}.qz-pr small{color:var(--muted);font-size:12px;margin-left:8px}.qz-pr em{font-style:normal;color:#f2c27b;font-size:14px;min-width:64px}
#studio .qz-pr button{padding:5px 12px;font-size:13px}
.qz-pg{display:grid;grid-template-columns:1fr 1fr;column-gap:14px}.qz-pr.sm{gap:5px;padding:6px 2px}.qz-pr.sm span{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qz-pr.sm span b{display:inline-block;min-width:20px;color:var(--glow);font-weight:700;margin-right:4px}.qz-pr.sm small{margin-left:5px}.qz-pr.sm em{font-size:12px;white-space:nowrap}#studio .qz-pr.sm button{padding:4px 8px;font-size:12px}#studio .qz-pr button.mv{padding:4px 7px;font-size:11px}
@media (max-width:700px){.qz-pg{grid-template-columns:1fr}}
.qz-home2{display:flex;align-items:stretch;gap:10px;margin-bottom:8px}.qz-crs2{flex:1;display:flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}
#studio .qz-crs2 .qz-cr{flex:1;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:7px 4px;border-bottom:0;border-right:1px solid var(--line);font-size:15px;text-align:center}#studio .qz-crs2 .qz-cr:last-child{border-right:0}#studio .qz-crs2 .qz-cr span{flex:0}#studio .qz-crs2 .qz-cr em{min-width:0;text-align:center;font-size:12px}#studio .qz-crs2 .qz-cr small{font-size:11px}
#studio .qz-home2 .qz-cont{width:auto;margin:0;padding:8px 18px;font-size:16px}
.qz-grip{font-style:normal;font-size:18px;color:var(--muted);padding:2px 8px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}.qz-drag.dragging{background:rgba(242,194,123,.14);border-radius:8px;position:relative;z-index:3;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.qz-wk{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:2px 0 8px}.qz-wk .sep{width:1px;height:20px;background:var(--line);margin:0 4px}#studio .qz-wk button.wr.on{background:rgba(232,128,111,.22);border-color:#e8806f;color:#ffb3ab}.qz-parts .qz-n{margin:-2px 0 6px;font-size:12px;color:var(--muted)}#studio .qz-wk button{padding:5px 12px;font-size:13px;border-radius:999px}#studio .qz-wk button.on{background:rgba(242,194,123,.2);border-color:#f2c27b;color:#f2c27b}.qz-wk small{margin-left:5px;color:var(--muted);font-size:11px}
.qz-pcols{display:grid;gap:14px;align-items:start}.qz-pcol h5{margin:6px 0 2px;font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.1em}
.qz-pcol .qz-pr.sm{gap:4px}
@media (max-width:820px){.qz-home2{flex-direction:column}.qz-crs2{flex-wrap:wrap}.qz-pcols{grid-template-columns:1fr!important}}

.qz-prev{margin:0 0 6px;color:var(--muted);font-size:14px}
.qz-blank{font-size:30px;letter-spacing:.12em;color:rgba(255,255,255,.35)}.qz-blank small{white-space:nowrap;font-size:12px;letter-spacing:0;margin-left:10px;color:var(--muted)}
.qz-entry b{color:var(--glow);font-size:1.25em;border-bottom:3px solid var(--glow)}
.qz-chain{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:8px;font-size:13px;color:var(--muted)}.qz-chain span{border:1px solid var(--line);border-radius:99px;padding:3px 10px}.qz-chain span.cur{border-color:var(--glow);color:var(--glow);font-weight:700}.qz-chain i{font-style:normal}
.qz-ans b{color:var(--glow);font-size:30px;margin-right:12px}.qz-ans small{font-size:14px;color:var(--muted)}
.qz-lyr span.focus{box-shadow:inset 0 -3px 0 var(--glow)}
.qz-lyr span.x,.qz-leg .x,.qz-words .x{background:rgba(232,128,111,.38)}
@media (max-width:820px){.qz-home{grid-template-columns:1fr}.qz-b{grid-template-columns:1fr;gap:10px}.qz-modes{margin-left:0}.qz-lyr p{font-size:19px}#s-quiz{padding:10px 12px}.qz-dots{order:5;flex-basis:100%}.qz-r{order:-1}.qz-blank{font-size:20px;letter-spacing:.06em}.qz-lyr.one p{font-size:24px}.qz-ans b{font-size:24px}.qz-lyr p{font-size:18px;line-height:1.5}}
`;document.head.appendChild(s)})();

// 連唱組合：按住 ⠿ 上下拖曳排順序
document.addEventListener('pointerdown',e=>{const g=e.target.closest&&e.target.closest('#s-quiz .qz-grip');if(!g)return;e.preventDefault();
  const row=g.closest('.qz-drag'),list=row.parentNode;row.classList.add('dragging');
  const mv=ev=>{const y=ev.clientY;for(const r of [...list.children]){if(r===row)continue;const b=r.getBoundingClientRect();if(y>b.top&&y<b.bottom){list.insertBefore(row,y<b.top+b.height/2?r:r.nextSibling);break}}};
  const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);row.classList.remove('dragging');
    const ids=[...list.children].map(r=>r.dataset.id);qzGrpSave('R',l=>ids.map(id=>{const m=/^R(\d+)-(\d+)$/.exec(id);return m?l.find(x=>x[0]===+m[1]&&x[1]===+m[2]):null}).filter(Boolean).concat(l.filter(x=>!ids.includes(`R${x[0]}-${x[1]}`))));Q.bank=null;qzRender()};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up)},{passive:false});
