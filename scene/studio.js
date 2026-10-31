/* ---------- 錄音室：像 Cubasis 一樣，原曲／伴奏／人聲／我的聲音一條一條排開 ---------- */
// 所有聲音都用同一個 Web Audio 引擎排好時間一起播；錄音在音訊執行緒收（AudioWorklet），畫面忙的時候也不會切聲
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
      <div class="s-c"><button data-act="shome" aria-label="回到開頭">⏮</button><button data-act="splay" class="s-pp" id="s-pp">▶</button><button data-act="srec" class="s-rec" id="s-rec" aria-label="錄音"><i></i></button></div>
      <div class="s-r"><label class="s-hp"><input type="checkbox" data-act="shp" ${mix().hp?'checked':''}> 🎧 有戴耳機</label></div>
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
  const d=document.getElementById('studio');if(d)d.remove();document.body.classList.remove('studio');S=null;
  if(au){au.currentTime=p;show(secAt(p+.05))}drawPlayer();
}
// 大畫面：軌道收成一條細的，情境圖撐滿；錄音時自動切過去，錄完回來
function sBig(){const d=document.getElementById('studio');if(!d)return;const on=!!(S.big||S.recd);d.classList.toggle('big',on);const b=document.getElementById('s-picb');if(b){b.classList.toggle('on',on);b.textContent=on?'🎚 軌道':'🖼 大畫面'}setTimeout(sLayout,320)}
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
    if(S.recd){if((S.recd.until&&p>=S.recd.until)||p>=S.dur){sRecStop();return}}
    else if(S.sel&&S.loop&&p>=S.sel[1]){sPlay(Math.max(0,S.sel[0]-1));return}
    else if(p>=S.dur){sStop();S.pos=S.sel?S.sel[0]:0;sHead();return}
    sHead();sLoop()});
}
// 錄音：在音訊執行緒收麥克風，每 4096 個取樣送一包回來，附上那包的時間
const WORKLET=`class R extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(4096);this.n=0;this.t=0}
process(i){const c=i[0]&&i[0][0];if(!c)return true;if(this.n===0)this.t=currentTime;this.b.set(c,this.n);this.n+=c.length;
if(this.n>=4096){this.port.postMessage({t:this.t,d:this.b.slice(0,this.n)});this.n=0}return true}}registerProcessor('rec-proc',R)`;
async function sRecStart(){
  if(S.recd)return sRecStop();sStop();
  const m=mix();let st;
  try{st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!m.hp,noiseSuppression:false,autoGainControl:false,channelCount:1}})}
  catch(e){alert('沒辦法用麥克風：到「設定 → Safari → 麥克風」允許，或重新打開再按一次');return}
  const c=S.ctx;if(c.state==='suspended')await c.resume();
  const keep=S.sel?Math.max(0,S.sel[0]-.5):S.pos,from=Math.max(0,(S.sel?S.sel[0]:S.pos)-2),until=S.sel?Math.min(S.dur,S.sel[1]+.5):0;
  const inp=c.createMediaStreamSource(st),z=c.createGain();z.gain.value=0;z.connect(c.destination);
  const r={st,inp,z,node:null,chunks:[],start:null,len:0,until,keep,from};S.recd=r;
  // 你聽到的歌比引擎晚 outputLatency，麥克風收到的聲音又晚一點；先估一個，錄完再用原曲自動對齊
  const lat=(c.outputLatency||0)+(c.baseLatency||0)*2;
  const onChunk=(t,d)=>{if(S&&S.recd===r){if(r.start==null)r.start=S.from+(t-S.T)-lat;r.chunks.push(d);r.len+=d.length}};
  try{
    if(!c.__rec){await c.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET],{type:'application/javascript'})));c.__rec=1}
    const n=new AudioWorkletNode(c,'rec-proc',{numberOfInputs:1,numberOfOutputs:1,channelCount:1});n.port.onmessage=e=>onChunk(e.data.t,e.data.d);inp.connect(n);n.connect(z);r.node=n;
  }catch(e){
    const pr=c.createScriptProcessor(4096,1,1);pr.onaudioprocess=e=>{const d=e.inputBuffer.getChannelData(0);onChunk((e.playbackTime||c.currentTime)-d.length/c.sampleRate*2,new Float32Array(d))};inp.connect(pr);pr.connect(z);r.node=pr;
  }
  document.getElementById('s-rec').classList.add('on');document.getElementById('studio').classList.add('recording');sBig();
  sPlay(from);
}
async function sRecStop(cancel){
  const r=S&&S.recd;if(!r)return;S.recd=null;sStop();
  try{r.inp.disconnect();r.node.disconnect();r.z.disconnect()}catch(e){}r.st.getTracks().forEach(t=>t.stop());
  document.getElementById('s-rec').classList.remove('on');document.getElementById('studio').classList.remove('recording');sBig();
  // iPad 用過麥克風後聲音會一直停在「通話模式」（音質差、會切），換一個新的音訊引擎就恢復
  try{const old=actx;actx=null;S.ctx=audioCtx();old&&old.close&&old.close()}catch(e){}
  if(cancel||!r.len||r.start==null){sDraw();return}
  const sr=r.node&&r.node.context?r.node.context.sampleRate:44100,all=new Float32Array(r.len);let o=0;r.chunks.forEach(ch=>{all.set(ch,o);o+=ch.length});
  const cut=Math.max(0,Math.round((r.keep-r.start)*sr)),data=all.subarray(cut);if(data.length<sr*.5){sDraw();return}
  const buf=S.ctx.createBuffer(1,data.length,sr);buf.copyToChannel(data,0);
  const take={id:Date.now(),blob:toWav(buf),start:r2(r.start+cut/sr),lead:0,track,end:r2(r.start+(cut+data.length)/sr),at:Date.now(),ec:!mix().hp,adj:0};
  takes.push(take);S.bufs.set(take.id,{buf,peaks:peaksOf(buf)});
  const lag=sAutoAdj(take);await saveTakes();
  S.pos=Math.max(0,(S.sel?S.sel[0]:take.start)-1);S.selTake=null;sDraw();
  hint(lag!=null?`錄好了，已經自動對齊（挪了 ${Math.abs(lag).toFixed(2)} 秒）。按 ▶ 聽聽看`:'錄好了！按 ▶ 聽你和歌一起');hintT=setTimeout(()=>hint(''),3500);
}
// 自動對齊：拿你的聲音跟原唱（有放人聲檔用人聲，沒有就用原曲）比每個字開口的節奏，找出差幾秒
function sAutoAdj(k){
  const ref=S.lanes.find(l=>l.id==='vocal'&&l.buf)||S.lanes.find(l=>l.id==='orig'&&l.buf);const v=S.bufs.get(k.id);if(!ref||!v)return null;
  const dt=.01,on=(buf,t0,t1)=>{const sr=buf.sampleRate,hop=Math.round(sr*dt),a=Math.max(0,Math.round(t0*sr)),n=Math.max(0,Math.floor((Math.min(buf.length,Math.round(t1*sr))-a)/hop)),ch=buf.getChannelData(0),e=new Float32Array(n),o=new Float32Array(n);
    for(let f=0;f<n;f++){let s=0;const b=a+f*hop;for(let i=b;i<b+hop;i+=2)s+=ch[i]*ch[i];e[f]=Math.log(1e-7+s/(hop/2))}
    for(let f=1;f<n;f++)o[f]=Math.max(0,e[f]-e[f-1]);let m=0;for(const x of o)m+=x;m/=n||1;for(let f=0;f<n;f++)o[f]-=m;return o};
  const R=.5,A=k.start,B=k.end,x=on(v.buf,0,v.buf.duration),y=on(ref.buf,Math.max(0,A-R),B+R),base=Math.round((A-Math.max(0,A-R))/dt);
  let best=0,bv=-Infinity,sum=0,cnt=0;
  for(let L=-Math.round(R/dt);L<=Math.round(R/dt);L++){let s=0,n=0;for(let i=0;i<x.length;i++){const j=i+base+L;if(j<0||j>=y.length)continue;s+=x[i]*y[j];n++}if(!n)continue;s/=n;sum+=s;cnt++;if(s>bv){bv=s;best=L}}
  if(!cnt||bv<=0||bv<(sum/cnt)*4)return null;
  k.adj=r2(best*dt);return k.adj;
}
// 手勢
const pts=new Map();let g0=null;
function laneAt(y){return [...document.querySelectorAll('#studio .s-lane')].find(el=>{const r=el.getBoundingClientRect();return y>=r.top&&y<=r.bottom})}
app.addEventListener('pointerdown',e=>{if(!S||!e.target.closest('#studio canvas'))return;e.preventDefault();try{e.target.setPointerCapture(e.pointerId)}catch(_){}
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const c=cvs()[0],w=c.clientWidth;
  if(pts.size===1)g0={mode:'tap',x:e.clientX,y:e.clientY,view:S.view.slice(),w,target:e.target};
  else if(pts.size===2){const [p,q]=[...pts.values()];g0={mode:'pinch',dx:Math.abs(p.x-q.x)||1,dy:Math.abs(p.y-q.y)||1,cx:(p.x+q.x)/2,view:S.view.slice(),w,
    lane:(laneAt((p.y+q.y)/2)||{}).dataset,hs:Object.fromEntries(S.lanes.map(l=>[l.id,l.h]))}}
});
app.addEventListener('pointermove',e=>{if(!S||!pts.has(e.pointerId)||!g0)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const c=cvs()[0],left=c.getBoundingClientRect().left;
  if(g0.mode==='tap'&&Math.abs(e.clientX-g0.x)>8)g0.mode='pan';
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
  if(!pts.size){if(g0&&g0.mode==='pinch')stSave();g0=null}else if(g0&&g0.mode==='pinch')g0=null;
}));
app.addEventListener('click',e=>{
  if(!S)return;const a=e.target.closest('#studio [data-act]');if(!a)return;const act=a.dataset.act;
  const lane=id=>S.lanes.find(x=>x.id===id);
  if(act==='sx')closeStudio();
  else if(act==='splay'){if(S.recd)sRecStop();else if(S.playing)sStop();else sPlay(S.pos)}
  else if(act==='srec')sRecStart();
  else if(act==='shome'){const was=S.playing;S.pos=S.sel?Math.max(0,S.sel[0]-1):0;if(was)sPlay(S.pos);else sHead()}
  else if(act==='ssec'){const i=+a.dataset.i,[x,y]=secRange(i);if(S.sel&&Math.abs(S.sel[0]-x)<.01){S.sel=null}else{S.sel=[x,y];sView0();S.pos=Math.max(0,x-1);if(S.playing)sPlay(S.pos)}sDraw()}
  else if(act==='szoom'){const whole=S.view[0]>0.5||S.view[1]<S.dur-.5;if(whole)S.view=[0,S.dur];else sView0();sDraw()}
  else if(act==='sloop'){S.loop=!S.loop;sDraw()}
  else if(act==='spic'){S.big=!S.big;sBig()}
  else if(act==='smute'){const l=lane(a.dataset.l);l.mute=!l.mute;if(l.mute)l.solo=false;sGains();sDraw();stSave()}
  else if(act==='ssolo'){const l=lane(a.dataset.l);l.solo=!l.solo;if(l.solo)l.mute=false;sGains();sDraw()}
  else if(act==='shp')setMix({hp:a.checked});
  else if(act==='sadj'){const k=takes.find(x=>x.id===S.selTake);if(!k)return;k.adj=r2((k.adj||0)+(+a.dataset.d)*.02);saveTakes();if(S.playing)sPlay(sNow());sDraw()}
  else if(act==='sauto'){const k=takes.find(x=>x.id===S.selTake);if(!k)return;const old=k.adj;k.adj=0;const lag=sAutoAdj(k);if(lag==null){k.adj=old;hint(S.lanes.some(l=>(l.id==='orig'||l.id==='vocal')&&l.buf)?'這次聽不出來，用早一點／晚一點手動調':'要先放原曲（或人聲檔）才能自動對齊')}else{hint(`對齊了（挪了 ${Math.abs(lag).toFixed(2)} 秒）`);saveTakes()}hintT=setTimeout(()=>hint(''),2500);if(S.playing)sPlay(sNow());sDraw()}
  else if(act==='sdel'){if(!confirm('刪掉這次錄音？'))return;takes=takes.filter(k=>k.id!==S.selTake);S.selTake=null;saveTakes();if(S.playing)sPlay(sNow());sDraw()}
  else if(act==='sdesel'){S.selTake=null;sDraw()}
  else if(act==='talign'){const k=takes.find(x=>x.id===S.selTake);if(k)alignTake(k)}
},true);
app.addEventListener('input',e=>{if(!S)return;const a=e.target;if(a.dataset.act!=='svol')return;const l=S.lanes.find(x=>x.id===a.dataset.l);l.vol=+a.value;sGains();stSave()});
