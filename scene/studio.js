const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
/* ---------- 錄音室：像 Cubasis 一樣，原曲／伴奏／人聲／我的聲音一條一條排開 ---------- */
// 所有聲音都用同一個 Web Audio 引擎排好時間一起播；錄音用 iPad 內建錄音器，錄完靠錄進去的喇叭聲對齊
// 兩指捏合：左右＝放大縮小時間，上下＝把軌道拉高拉矮；一指左右拖＝移動畫面；點一下＝從那裡播
const LATKEY='scene-lat-v1',STKEY='scene-studio-v1';
let S=null;
const sGet=()=>{try{return +localStorage.getItem(LATKEY)||0}catch(e){return 0}};
function stPrefs(){let o={};try{o=JSON.parse(localStorage.getItem(STKEY)||'{}')||{}}catch(e){}return Object.assign({mute:{},vol:{},h:{}},o)}
function stSave(){if(!S)return;const o={mute:{},vol:{},h:{}};S.lanes.forEach(l=>{o.mute[l.id]=l.mute;o.vol[l.id]=l.vol;o.h[l.id]=l.h});try{localStorage.setItem(STKEY,JSON.stringify(o))}catch(e){}}
const LANE_NAME={orig:'原曲',inst:'伴奏',vocal:'原唱人聲',me:'我的聲音'};
async function openStudio(){
  if(!au){hint('先在右上「⋯」放原曲或伴奏');hintT=setTimeout(()=>hint(''),2500);return}
  au.pause();closeMenu();if(rec)finishRec();
  const pf=stPrefs(),ids=[];
  if(have.orig)ids.push('orig');if(have.inst)ids.push('inst');if(hasVocal)ids.push('vocal');ids.push('me');
  const lanes=ids.map(id=>({id,name:LANE_NAME[id],buf:null,peaks:null,solo:false,
    mute:pf.mute[id]!=null?pf.mute[id]:(id==='me'?false:id==='vocal'?true:id!==track),
    vol:pf.vol[id]!=null?pf.vol[id]:1,h:pf.h[id]||(id==='me'?0:58)}));
  const [a,b]=secRange(cur),hasT=getTimes().length>1;
  S={ctx:audioCtx(),lanes,dur:au.duration||0,sel:hasT?[a,b]:null,view:null,pos:hasT?Math.max(0,a-2):au.currentTime,
     playing:false,srcs:[],gains:{},T:0,from:0,loop:true,recd:null,selTake:null,bufs:new Map(),raf:0};
  const d=document.createElement('div');d.id='studio';d.innerHTML=`
    <div class="s-top"><button data-act="sx">← 歌詞</button><b>${esc(SCENES[key].title)}</b><span class="s-time" id="s-time">0:00</span></div>
    <div class="s-pic" style="background-image:url('${SCENES[key].img}')"><div class="s-lyr" id="s-lyr"></div></div>
    <div class="s-ruler" id="s-ruler"></div>
    <div class="s-lanes" id="s-lanes">${lanes.map(l=>`
      <div class="s-lane${l.id==='me'?' me':''}" data-l="${l.id}"><div class="s-h"><b>${l.name}</b><div class="s-ms"><button data-act="smute" data-l="${l.id}" aria-label="靜音">M</button><button data-act="ssolo" data-l="${l.id}" aria-label="只聽這條">S</button></div><input type="range" min="0" max="${l.id==='me'?2:1.5}" step=".05" value="${l.vol}" data-act="svol" data-l="${l.id}"></div><canvas data-l="${l.id}"></canvas></div>`).join('')}
      <div class="s-ph" id="s-ph"></div><div class="s-rb" id="s-rb" hidden></div>
    </div>
    <div class="s-take" id="s-take" hidden></div>
    <div class="s-bot">
      <div class="s-l"><button data-act="spic" id="s-picb">🖼 大畫面</button><button data-act="szoom" id="s-zoom">整首</button><button data-act="sloop" id="s-loop" class="on">🔁 重複</button></div>
      <div class="s-c"><button data-act="shome" aria-label="回到開頭">⏮</button><button data-act="srec0" class="s-rec0" aria-label="從頭錄">⏺ 從頭錄</button><button data-act="splay" class="s-pp" id="s-pp">▶</button><button data-act="srec" class="s-rec" id="s-rec" aria-label="錄音"><i></i></button></div>
      <div class="s-r"><span class="s-tip" id="s-tip">點波形或歌詞選從哪裡開始錄</span></div>
    </div>
    <div class="s-msg" id="s-msg">載入中…</div>`;
  app.appendChild(d);document.body.classList.add('studio');
  sView0();sLayout();
  try{
    for(const l of lanes){if(l.id==='me')continue;
      const f=l.id==='inst'?await getFile(key+'|inst')||await getFile(key):await getFile(key+'|'+l.id);if(!f)continue;
      let buf=await decodeHead(await playable(key+'|'+l.id,f));
      if(l.id!==track&&buf.numberOfChannels>1)buf=toMono(buf);  // 不是正在用的那軌存單聲道，省記憶體
      l.buf=buf;l.peaks=peaksOf(buf);S.dur=Math.max(S.dur,buf.duration);sDraw()}
    for(const k of takes)await takeBuf(k);
  }catch(e){sMsg('這首的音檔讀不出來');return}
  if(!S.view)sView0();sMsg('');sLayout();addEventListener('resize',sLayout);
}
function toMono(b){const o=S.ctx.createBuffer(1,b.length,b.sampleRate),d=o.getChannelData(0),c0=b.getChannelData(0),c1=b.getChannelData(1);for(let i=0;i<b.length;i++)d[i]=(c0[i]+c1[i])/2;return o}
function closeStudio(){
  if(!S)return;if(S.recd)sRecStop(true);sStop();stSave();
  const p=S.pos;removeEventListener('resize',sLayout);
  const d=document.getElementById('studio');if(d)d.remove();document.body.classList.remove('studio','studio-big');S=null;
  if(au){au.currentTime=p;show(secAt(p+.05))}drawPlayer();
}
// 大畫面：軌道收成一條細的，情境圖撐滿；錄音時自動切過去，錄完回來
function sBig(){const d=document.getElementById('studio');if(!d)return;const on=!!(S.big||S.recd);S.bigOn=on;d.classList.toggle('big',on);document.body.classList.toggle('studio-big',on);if(on){const p=sNow();show(secAt(p+.05),false);lightLine()}const b=document.getElementById('s-picb');if(b){b.classList.toggle('on',on);b.textContent=on?'🎚 軌道':'🖼 大畫面'}setTimeout(sLayout,320)}
function sMsg(t){const e=document.getElementById('s-msg');if(e){e.textContent=t;e.hidden=!t}}
function peaksOf(buf){
  const hop=Math.round(buf.sampleRate*.02),n=Math.ceil(buf.length/hop),p=new Float32Array(n),ch=[];
  for(let c=0;c<Math.min(2,buf.numberOfChannels);c++)ch.push(buf.getChannelData(c));
  for(let i=0;i<n;i++){let m=0;const a=i*hop,b=Math.min(buf.length,a+hop);for(const d of ch)for(let j=a;j<b;j+=4){const v=d[j]<0?-d[j]:d[j];if(v>m)m=v}p[i]=m}
  return p;
}
async function takeBuf(k){if(S.bufs.has(k.id))return S.bufs.get(k.id);let b=null;try{b=await decodeHead(k.blob)}catch(e){}const v=b?{buf:b,peaks:peaksOf(b)}:null;S.bufs.set(k.id,v);return v}
// 看到的時間範圍
function sView0(){if(S.sel){const [a,b]=S.sel,pad=Math.max(2,(b-a)*.08);S.view=[Math.max(0,a-pad),Math.min(S.dur||b+pad,b+pad)]}else S.view=[0,S.dur||60]}
function sX(t,w){const [v0,v1]=S.view;return (t-v0)/(v1-v0)*w}
function sT(x,w){const [v0,v1]=S.view;return v0+x/w*(v1-v0)}
function cvs(){return [...document.querySelectorAll('#studio canvas')].filter(c=>c.offsetParent)}
function sLayout(){
  if(!S)return;
  // 軌道高度：歌的軌用記住的高度，我的聲音填滿剩下的
  document.querySelectorAll('#studio .s-lane').forEach(el=>{const l=S.lanes.find(x=>x.id===el.dataset.l);el.style.flex=l.id==='me'?'1 1 0':`0 0 ${l.h}px`});
  cvs().forEach(c=>{const r=c.getBoundingClientRect(),dpr=devicePixelRatio||1;c.width=Math.max(1,r.width*dpr);c.height=Math.max(1,r.height*dpr)});
  sDraw();
}
// 每個時間點用最新的那次錄音；kd＝這次錄音要往前後挪多少（自動對齊＋手動微調）
const kd=k=>(k.adj||0)-sGet();
function sCover(){
  const out=[],ks=takes.slice().sort((x,y)=>y.at-x.at),taken=[];
  for(const k of ks){const d=kd(k),A=k.start+d,B=k.end+d;let segs=[[A,B]];
    for(const [a,b] of taken)segs=segs.flatMap(([x,y])=>b<=x||a>=y?[[x,y]]:[...(a>x?[[x,a]]:[]),...(b<y?[[b,y]]:[])]);
    segs.forEach(([x,y])=>{if(y-x>.02)out.push({k,a:x,b:y,o:A-(k.lead||0)})});taken.push([A,B]);}
  return out;
}
const audible=l=>{const anySolo=S.lanes.some(x=>x.solo);return anySolo?l.solo:!l.mute};
function sDraw(){
  if(!S)return;
  const t=getTimes(),ru=document.getElementById('s-ruler'),c0=cvs()[0];if(!ru||!c0)return;const W=c0.clientWidth,[v0,v1]=S.view;
  ru.style.marginLeft=(c0.getBoundingClientRect().left-ru.parentNode.getBoundingClientRect().left)+'px';
  ru.innerHTML=t.length>1?SCENES[key].steps.map((st,i)=>{const a=t[i]!=null?t[i]:0,b=t[i+1]!=null?t[i+1]:S.dur;if(b<v0||a>v1)return '';const x=Math.max(0,sX(a,W)),x2=Math.min(W,sX(b,W));
    const on=S.sel&&Math.abs(S.sel[0]-a)<.01;return `<button data-act="ssec" data-i="${i}" class="${on?'on':''}" style="left:${x}px;width:${Math.max(0,x2-x-2)}px">${esc(st.sec)}</button>`}).join(''):'<span class="s-nosec">還沒對拍，沒有段落可選；直接點波形決定從哪裡開始</span>';
  const wave=(g,w,h,pk,t0,a,b,col)=>{const y0=h/2;g.fillStyle=col;
    const xa=Math.max(0,Math.floor(sX(a,w))),xb=Math.min(w,Math.ceil(sX(b,w)));
    for(let x=xa;x<xb;x++){const ta=sT(x,w)-t0,tb=sT(x+1,w)-t0;let m=0;for(let i=Math.max(0,Math.floor(ta/.02));i<=Math.min(pk.length-1,Math.floor(tb/.02));i++)if(pk[i]>m)m=pk[i];
      const hh=Math.max(1,Math.min(1,m*1.6)*h*.46);g.fillRect(x,y0-hh,1,hh*2)}};
  cvs().forEach(c=>{const l=S.lanes.find(x=>x.id===c.dataset.l),g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    if(S.sel){g.fillStyle='rgba(242,194,123,.10)';const x=sX(S.sel[0],w),x2=sX(S.sel[1],w);g.fillRect(x,0,x2-x,h)}
    const on=audible(l);
    if(l.id!=='me'){if(l.peaks)wave(g,w,h,l.peaks,0,0,S.dur,on?(l.id==='vocal'?'rgba(140,200,255,.8)':'rgba(242,194,123,.75)'):'rgba(255,255,255,.16)');return}
    sCover().forEach(({k,a,b,o})=>{const v=S.bufs.get(k.id),x=sX(a,w),x2=sX(b,w);
      g.fillStyle=S.selTake===k.id?'rgba(255,138,128,.3)':'rgba(255,138,128,.12)';g.fillRect(x,2,x2-x,h-4);
      if(v)wave(g,w,h,v.peaks,o,a,b,on?'#ff8a80':'rgba(255,255,255,.18)')});
    if(!takes.length&&!S.recd){const dpr=devicePixelRatio||1;g.fillStyle='rgba(255,255,255,.35)';g.font=`${13*dpr}px sans-serif`;g.fillText('按下面紅色的鍵開始錄',12*dpr,h/2+5*dpr)}});
  const z=document.getElementById('s-zoom');z.textContent=S.view[0]>0.5||S.view[1]<S.dur-.5?'整首':'放大這段';z.disabled=!S.sel&&!(S.view[0]>0.5||S.view[1]<S.dur-.5);
  document.getElementById('s-loop').classList.toggle('on',S.loop);
  document.querySelectorAll('#studio [data-act=smute]').forEach(b=>b.classList.toggle('on',S.lanes.find(x=>x.id===b.dataset.l).mute));
  document.querySelectorAll('#studio [data-act=ssolo]').forEach(b=>b.classList.toggle('on',S.lanes.find(x=>x.id===b.dataset.l).solo));
  sHead();sTake();
}
function sNow(){return S.playing?S.from+(S.ctx.currentTime-S.T):S.pos}
function sHead(){
  if(!S)return;const p=sNow(),c=cvs()[0];if(!c)return;
  const x=c.offsetLeft+sX(p,c.clientWidth),ph=document.getElementById('s-ph');ph.style.transform=`translateX(${x}px)`;ph.style.display=x<c.offsetLeft-1||x>c.offsetLeft+c.clientWidth+1?'none':'';
  const tm=document.getElementById('s-time');if(tm)tm.textContent=`${mmss(p)} / ${mmss(S.dur)}`;
  // 錄音中：紅色區塊跟著長，不重畫波形（省力，錄音才不會被拖累）
  const rb=document.getElementById('s-rb');if(S.recd&&S.recd.from!=null){const me=document.querySelector('#studio canvas[data-l=me]'),a=Math.max(S.recd.keep,S.view[0]);
    rb.hidden=false;rb.style.left=(me.offsetLeft+sX(a,me.clientWidth))+'px';rb.style.top=me.offsetTop+'px';rb.style.height=me.clientHeight+'px';rb.style.width=Math.max(0,sX(p,me.clientWidth)-sX(a,me.clientWidth))+'px'}else rb.hidden=true;
  if(S.bigOn&&getTimes().length>1){const k=secAt(p+.05);if(k!==cur)show(k);lightLine()}
  const ly=document.getElementById('s-lyr');if(ly&&blocks){const s=secAt(p+.05),L=getLines(),off=lineOff(s);let k=-1;L.forEach((x,j)=>{if(x!=null&&p>=x-.3)k=j});
    const html=`<small>${esc(SCENES[key].steps[s].sec)}</small>`+(blocks[s]||[]).map((l,j)=>`<p class="${off+j===k?'on':off+j<k?'past':''}">${esc(l)}</p>`).join('');
    if(ly.dataset.h!==html){ly.innerHTML=html;ly.dataset.h=html}}
}
function sTake(){
  const e=document.getElementById('s-take');if(!e)return;const k=takes.find(x=>x.id===S.selTake);
  if(!k){e.hidden=true;return}e.hidden=false;
  const full=k.start<2&&k.end>S.dur*.85,adj=k.adj||0;
  e.innerHTML=`<span>這次錄音 ${mmss(k.start)}–${mmss(k.end)}${adj?`・已挪 ${adj>0?'晚':'早'} ${Math.abs(adj).toFixed(2)} 秒`:''}</span><button data-act="sauto">自動對齊</button><button data-act="sadj" data-d="-1">早一點</button><button data-act="sadj" data-d="1">晚一點</button><a class="btn" data-act="tdl" download="${esc(SCENES[key].title)}-${mmss(k.start).replace(':','')}.${/webm/.test(k.blob.type)?'webm':/wav/.test(k.blob.type)?'wav':'m4a'}" href="${URL.createObjectURL(k.blob)}">存到檔案</a>${full?'<button data-act="talign">用這次對歌詞拍</button>':''}<button data-act="sdel">🗑 刪掉</button><button data-act="sdesel">✕</button>`;
}
function sGains(){S.lanes.forEach(l=>{const g=S.gains[l.id];if(g)g.gain.value=audible(l)?l.vol:0})}
function sPlay(from){
  sStop();const c=S.ctx;if(c.state==='suspended')c.resume();
  const T=c.currentTime+.08;S.T=T;S.from=from;S.playing=true;S.srcs=[];S.gains={};
  S.lanes.forEach(l=>{const g=c.createGain();g.connect(c.destination);S.gains[l.id]=g;
    if(l.id!=='me'){if(l.buf&&from<l.buf.duration){const s=c.createBufferSource();s.buffer=l.buf;s.connect(g);s.start(T,from);S.srcs.push(s)}return}
    if(S.recd)return;  // 錄音時不放舊的錄音
    sCover().forEach(({k,a,b,o})=>{const v=S.bufs.get(k.id);if(!v||b<=from)return;const st=Math.max(a,from),off=st-o;if(off<0||off>=v.buf.duration)return;
      const s=c.createBufferSource();s.buffer=v.buf;s.connect(g);s.start(T+(st-from),off,b-st);S.srcs.push(s)})});
  sGains();document.getElementById('s-pp').textContent='❚❚';sLoop();
}
function sStop(){if(!S)return;if(S.playing)S.pos=Math.min(S.dur,sNow());S.srcs.forEach(s=>{try{s.stop()}catch(e){}});S.srcs=[];Object.values(S.gains).forEach(g=>{try{g.disconnect()}catch(e){}});S.gains={};S.playing=false;cancelAnimationFrame(S.raf);S.raf=0;const pp=document.getElementById('s-pp');if(pp)pp.textContent='▶';sHead()}
function sLoop(){
  S.raf=requestAnimationFrame(()=>{if(!S||!S.playing)return;const p=sNow();
    if(S.recd){if((S.recd.until&&p>=S.recd.until)||p>=S.dur){sRecStop();return}
      const tp=document.getElementById('s-tip');if(tp){const kb=S.recd.chunks.reduce((a,b)=>a+b.size,0)/1024|0;tp.textContent=S.recd.bad()?'⚠️ 麥克風被關掉了':`● 錄音中 ${mmss(Math.max(0,p-S.recd.p0))}　已收到 ${kb} KB`}}
    else if(S.sel&&S.loop&&p>=S.sel[1]){sPlay(Math.max(0,S.sel[0]-1));return}
    else if(p>=S.dur){sStop();S.pos=S.sel?S.sel[0]:0;sHead();return}
    sHead();sLoop()});
}
// 錄音
async function sRecStart(){
  if(S.recd)return sRecStop();sStop();
  const m=mix();let st;
  // 她的 iPad 不開消除回音就錄成靜音（v43、v44、v47 都是），只能用 iPad 預設的錄音設定。
  // 之前關掉「自動音量」會讓大聲唱的地方爆掉（破音），所以全部用預設
  const ec=true;
  try{st=await navigator.mediaDevices.getUserMedia({audio:true})}
  catch(e){alert('沒辦法用麥克風：到「設定 → Safari → 麥克風」允許，或重新打開再按一次');return}
  const c=S.ctx;if(c.state==='suspended')await c.resume();
  // 從播放頭開始錄（前面多播 2 秒預備）；播放頭在選的段落裡，唱到段尾自動停
  const p0=S.pos,keep=Math.max(0,p0-.3),from=Math.max(0,p0-2),until=S.sel&&p0<S.sel[1]-.5?Math.min(S.dur,S.sel[1]+.5):0;
  // 用 iPad 自己的錄音器（MediaRecorder）錄，Web Audio 直接收麥克風在 iPad 上會收到一片靜音
  const type=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
  const mr=new MediaRecorder(st,type?{mimeType:type}:{});
  const r={ec,st,mr,type,chunks:[],t0:null,until,keep,from,p0,heard:S.lanes.filter(l=>l.id!=='me'&&l.buf&&audible(l)).map(l=>l.id)};S.recd=r;
  mr.ondataavailable=e=>{if(e.data&&e.data.size)r.chunks.push(e.data)};
  const tr0=st.getAudioTracks()[0];r.bad=()=>!tr0||tr0.readyState==='ended'||tr0.muted;
  await new Promise(ok=>{mr.onstart=()=>{r.t0=c.currentTime;ok()};mr.start(1000);setTimeout(ok,1500)});
  if(r.t0==null)r.t0=c.currentTime;
  document.getElementById('s-rec').classList.add('on');document.getElementById('studio').classList.add('recording');sBig();
  sPlay(from);
}
async function sRecStop(cancel){
  const r=S&&S.recd;if(!r)return;S.recd=null;sStop();
  const done=new Promise(ok=>{r.mr.onstop=ok;setTimeout(ok,3000)});try{r.mr.stop()}catch(e){}await done;r.st.getTracks().forEach(t=>t.stop());
  document.getElementById('s-rec').classList.remove('on');document.getElementById('studio').classList.remove('recording');sBig();
  const T=S.T,c0=S.ctx;
  // 麥克風關掉後 iPad 又換回一般音訊設定，再換一個新的引擎
  try{const old=actx;actx=null;S.ctx=audioCtx();old&&old.close&&old.close()}catch(e){}
  const tp=document.getElementById('s-tip');if(tp)tp.textContent='點波形或歌詞選從哪裡開始錄';
  if(cancel){sDraw();return}
  if(!r.chunks.length){alert('iPad 的錄音器沒有給任何資料：請關掉 Vocal 重新打開再錄一次；如果還是一樣，告訴我');sDraw();return}
  sMsg('整理錄音…');
  let all;try{all=await decodeHead(new Blob(r.chunks,{type:r.mr.mimeType||r.type||'audio/mp4'}))}catch(e){sMsg('');alert('這次錄音讀不出來，再錄一次試試');sDraw();return}
  sMsg('');
  // 錄音器開始的那一刻＝歌的第幾秒（之後再用錄進去的喇叭聲精準對齊）
  const sr=all.sampleRate,lat=Math.min(.5,(c0.outputLatency||0)+(c0.baseLatency||0)),start0=r.from+(r.t0-T)-lat,d0=all.getChannelData(0);
  let pk=0;for(let i=0;i<d0.length;i+=64){const v=Math.abs(d0[i]);if(v>pk)pk=v}
  if(pk<.002){alert('錄到的是靜音：請到 iPad「設定 → Safari → 麥克風」確認是「允許」，再錄一次');sDraw();return}
  const cut=Math.max(0,Math.round((r.keep-start0)*sr)),data=new Float32Array(d0.subarray(cut));if(data.length<sr*.5){sDraw();return}
  const buf=S.ctx.createBuffer(1,data.length,sr);buf.copyToChannel(data,0);
  const take={id:Date.now(),blob:toWav(buf),start:r2(start0+cut/sr),lead:0,track,end:r2(start0+(cut+data.length)/sr),at:Date.now(),heard:r.heard,adj:0};
  takes.push(take);S.bufs.set(take.id,{buf,peaks:peaksOf(buf)});
  // 自動對不出來，就用她上次手動挪好的量
  let lag=sAutoAdj(take);if(lag==null&&lsGet('scene-recadj-v1')){take.adj=+lsGet('scene-recadj-v1')||0;if(take.adj)lag=take.adj}await saveTakes();
  S.pos=Math.max(0,r.p0-1);S.selTake=null;sDraw();
  hint(lag!=null?`錄好了，已經自動對齊。按 ▶ 聽聽看`:'錄好了，但這次對不太出來，點你的錄音用「早一點／晚一點」調');hintT=setTimeout(()=>hint(''),3500);
}
// 自動對齊：
// 1. 錄音裡會有一點喇叭放出來的歌，跟原本的歌比對，找出差幾毫秒（最準）
// 2. 對不出來（戴耳機）就拿你的聲音跟原唱比開口的節奏
function sAutoAdj(k){
  const v=S.bufs.get(k.id);if(!v)return null;
  const env=(buf,t0,t1,dt)=>{const sr=buf.sampleRate,hop=Math.max(1,Math.round(sr*dt)),a=Math.max(0,Math.round(t0*sr)),n=Math.max(0,Math.floor((Math.min(buf.length,Math.round(t1*sr))-a)/hop)),e=new Float32Array(n),C=[];
    for(let c=0;c<Math.min(2,buf.numberOfChannels);c++)C.push(buf.getChannelData(c));
    for(let f=0;f<n;f++){let s=0;const b=a+f*hop;for(let i=b;i<b+hop;i++){let x=0;for(const d of C)x+=d[i];s+=x*x}e[f]=Math.log(1e-9+s/hop)}
    const o=new Float32Array(n);for(let f=1;f<n;f++)o[f]=Math.max(0,e[f]-e[f-1]);let m=0;for(const x of o)m+=x;m/=n||1;let q=0;for(let f=0;f<n;f++){o[f]-=m;q+=o[f]*o[f]}q=Math.sqrt(q/(n||1))||1;for(let f=0;f<n;f++)o[f]/=q;return o};
  const lagOf=(ref,dt,R)=>{const A=k.start,B=k.end,x=env(v.buf,0,v.buf.duration,dt),a0=Math.max(0,A-R),y=env(ref,a0,B+R,dt),base=Math.round((A-a0)/dt);
    let best=0,bv=-Infinity,sum=0,s2=0,cnt=0;
    for(let L=-Math.round(R/dt);L<=Math.round(R/dt);L++){let s=0,n=0;for(let i=0;i<x.length;i+=2){const j=i+base+L;if(j<0||j>=y.length)continue;s+=x[i]*y[j];n++}if(!n)continue;s/=n;sum+=s;s2+=s*s;cnt++;if(s>bv){bv=s;best=L}}
    if(!cnt)return null;const mu=sum/cnt,sd=Math.sqrt(Math.max(1e-9,s2/cnt-mu*mu));return (bv-mu)/sd>8?best*dt:null};
  // 1. 錄音當下有在播的那幾軌混在一起
  const heard=(k.heard||[k.track]).map(id=>S.lanes.find(l=>l.id===id&&l.buf)).filter(Boolean);
  if(heard.length){const b0=heard[0].buf,sr=b0.sampleRate,a=Math.max(0,Math.floor((k.start-1)*sr)),b=Math.min(b0.length,Math.ceil((k.end+1)*sr)),mixd=S.ctx.createBuffer(1,Math.max(1,b-a),sr),d=mixd.getChannelData(0);
    // 只取錄音前後那一段來混（整首太大）
    heard.forEach(l=>{const c=l.buf.getChannelData(0),c1=l.buf.numberOfChannels>1?l.buf.getChannelData(1):c,g=l.vol;for(let i=a;i<b&&i<l.buf.length;i++)d[i-a]+=(c[i]+c1[i])/2*g});
    const shift=a/sr,kk={start:k.start-shift,end:k.end-shift},save=k.start;
    const lg=(()=>{const o=k.start,oe=k.end;k.start=kk.start;k.end=kk.end;try{return lagOf(mixd,.005,.9)}finally{k.start=o;k.end=oe}})();
    if(lg!=null){k.adj=r2(lg);return k.adj}}
  // 2. 跟原唱比
  const ref=S.lanes.find(l=>l.id==='vocal'&&l.buf)||S.lanes.find(l=>l.id==='orig'&&l.buf);if(!ref)return null;
  const lg=lagOf(ref.buf,.01,.8);if(lg==null)return null;k.adj=r2(lg);return k.adj;
}
// 給情境頁用：錄音室在「大畫面」時，情境頁的換段、逐句亮跟著錄音室的時間走
function studioClock(){return S&&S.bigOn?sNow():null}
// 手勢
const pts=new Map();let g0=null;
function laneAt(y){return [...document.querySelectorAll('#studio .s-lane')].find(el=>{const r=el.getBoundingClientRect();return y>=r.top&&y<=r.bottom})}
app.addEventListener('pointerdown',e=>{if(!S||!e.target.closest('#studio canvas'))return;e.preventDefault();try{e.target.setPointerCapture(e.pointerId)}catch(_){}
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const c=cvs()[0],w=c.clientWidth;
  if(pts.size===1){g0={mode:'tap',x:e.clientX,y:e.clientY,view:S.view.slice(),w,target:e.target};
    // 按在「我的聲音」的某次錄音上左右拖＝把那次錄音往前／往後挪（對齊用）
    if(e.target.dataset.l==='me'&&!S.recd){const r=e.target.getBoundingClientRect(),x=sT(e.clientX-r.left,r.width),hit=sCover().find(({a,b})=>x>=a&&x<=b);
      if(hit)g0.take={k:hit.k,adj0:hit.k.adj||0}}}
  else if(pts.size===2){const [p,q]=[...pts.values()];g0={mode:'pinch',dx:Math.abs(p.x-q.x)||1,dy:Math.abs(p.y-q.y)||1,cx:(p.x+q.x)/2,view:S.view.slice(),w,
    lane:(laneAt((p.y+q.y)/2)||{}).dataset,hs:Object.fromEntries(S.lanes.map(l=>[l.id,l.h]))}}
});
app.addEventListener('pointermove',e=>{if(!S||!pts.has(e.pointerId)||!g0)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const c=cvs()[0],left=c.getBoundingClientRect().left;
  if(g0.mode==='tap'&&Math.abs(e.clientX-g0.x)>8){g0.mode=g0.take?'move':'pan';if(g0.take){S.selTake=g0.take.k.id;sTake()}}
  if(g0.mode==='move'){const [v0,v1]=g0.view,k=g0.take.k;k.adj=r2(g0.take.adj0+(e.clientX-g0.x)/g0.w*(v1-v0));sDraw();sTake();return}
  if(g0.mode==='pan'){const [v0,v1]=g0.view,sp=v1-v0,d=-(e.clientX-g0.x)/g0.w*sp,a=Math.max(0,Math.min(S.dur-sp,v0+d));S.view=[a,a+sp];sDraw()}
  else if(g0.mode==='pinch'&&pts.size>=2){const [p,q]=[...pts.values()],dx=Math.abs(p.x-q.x)||1,dy=Math.abs(p.y-q.y)||1;
    const [v0,v1]=g0.view,sp=v1-v0,ct=v0+(g0.cx-left)/g0.w*sp,nsp=Math.max(2,Math.min(S.dur,sp*g0.dx/dx)),f=(g0.cx-left)/g0.w;
    let a=Math.max(0,Math.min(S.dur-nsp,ct-f*nsp));S.view=[a,a+nsp];
    // 上下捏：拉高拉矮那一條（在我的聲音上捏，就是把歌的軌一起縮小）
    if(Math.abs(dy-g0.dy)>Math.abs(dx-g0.dx)*.7&&g0.lane){const r=dy/g0.dy;S.lanes.forEach(l=>{if(l.id==='me')return;const h0=g0.hs[l.id];
      l.h=Math.round(Math.max(28,Math.min(240,g0.lane.l==='me'?h0/r:l.id===g0.lane.l?h0*r:h0)))});}
    sLayout()}
});
['pointerup','pointercancel'].forEach(t=>app.addEventListener(t,e=>{if(!S||!pts.has(e.pointerId))return;pts.delete(e.pointerId);
  if(g0&&g0.mode==='tap'&&t==='pointerup'&&!S.recd){const c=g0.target,r=c.getBoundingClientRect(),x=Math.max(0,Math.min(S.dur,sT(e.clientX-r.left,r.width)));
    if(c.dataset.l==='me'){const hit=sCover().find(({a,b})=>x>=a&&x<=b);S.selTake=hit?hit.k.id:null}
    const was=S.playing;S.pos=x;if(was)sPlay(x);else sHead();sDraw()}
  if(g0&&g0.mode==='move'){saveTakes();lsSet('scene-recadj-v1',String(g0.take.k.adj||0));if(S.playing)sPlay(sNow())}
  if(!pts.size){if(g0&&g0.mode==='pinch')stSave();g0=null}else if(g0&&g0.mode==='pinch')g0=null;
}));
app.addEventListener('click',e=>{
  if(!S)return;const a=e.target.closest('#studio [data-act]');if(!a)return;const act=a.dataset.act;
  const lane=id=>S.lanes.find(x=>x.id===id);
  if(act==='sx')closeStudio();
  else if(act==='splay'){if(S.recd)sRecStop();else if(S.playing)sStop();else sPlay(S.pos)}
  else if(act==='srec')sRecStart();
  else if(act==='srec0'){if(S.recd)return sRecStop();S.sel=null;S.loop=false;S.pos=0;sRecStart()}
  else if(act==='shome'){const was=S.playing;S.pos=S.sel?Math.max(0,S.sel[0]-1):0;if(was)sPlay(S.pos);else sHead()}
  else if(act==='ssec'){const i=+a.dataset.i,[x,y]=secRange(i);if(S.sel&&Math.abs(S.sel[0]-x)<.01){S.sel=null}else{S.sel=[x,y];sView0();S.pos=x;if(S.playing)sPlay(S.pos)}sDraw()}
  else if(act==='szoom'){const whole=S.view[0]>0.5||S.view[1]<S.dur-.5;if(whole)S.view=[0,S.dur];else sView0();sDraw()}
  else if(act==='sloop'){S.loop=!S.loop;sDraw()}
  else if(act==='spic'){S.big=!S.big;sBig()}
  else if(act==='smute'){const l=lane(a.dataset.l);l.mute=!l.mute;if(l.mute)l.solo=false;sGains();sDraw();stSave()}
  else if(act==='ssolo'){const l=lane(a.dataset.l);l.solo=!l.solo;if(l.solo)l.mute=false;sGains();sDraw()}
  else if(act==='sadj'){const k=takes.find(x=>x.id===S.selTake);if(!k)return;k.adj=r2((k.adj||0)+(+a.dataset.d)*.02);saveTakes();lsSet('scene-recadj-v1',String(k.adj));if(S.playing)sPlay(sNow());sDraw()}
  else if(act==='sauto'){const k=takes.find(x=>x.id===S.selTake);if(!k)return;const old=k.adj;k.adj=0;const lag=sAutoAdj(k);if(lag==null){k.adj=old;hint(S.lanes.some(l=>(l.id==='orig'||l.id==='vocal')&&l.buf)?'這次聽不出來，用早一點／晚一點手動調':'要先放原曲（或人聲檔）才能自動對齊')}else{hint(`對齊了（挪了 ${Math.abs(lag).toFixed(2)} 秒）`);saveTakes()}hintT=setTimeout(()=>hint(''),2500);if(S.playing)sPlay(sNow());sDraw()}
  else if(act==='sdel'){if(!confirm('刪掉這次錄音？'))return;takes=takes.filter(k=>k.id!==S.selTake);S.selTake=null;saveTakes();if(S.playing)sPlay(sNow());sDraw()}
  else if(act==='sdesel'){S.selTake=null;sDraw()}
  else if(act==='talign'){const k=takes.find(x=>x.id===S.selTake);if(k)alignTake(k)}
},true);
app.addEventListener('input',e=>{if(!S)return;const a=e.target;if(a.dataset.act!=='svol')return;const l=S.lanes.find(x=>x.id===a.dataset.l);l.vol=+a.value;sGains();stSave()});
// 大畫面時點情境頁上的歌詞：從那句開始（錄音也從那句錄）
function studioPickLine(l){if(!S||S.recd)return;const L=getLines(),t=getTimes(),sec=secOfLine(l);const x=L[l]!=null?Math.max(0,L[l]-.4):(t[sec]||0);const was=S.playing;S.pos=x;if(was)sPlay(x);else{sHead();show(sec);lightLine()}
  const tp=document.getElementById('s-tip');if(tp)tp.textContent=`從 ${mmss(x)} 開始`}
