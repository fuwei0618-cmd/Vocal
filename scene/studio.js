/* ---------- 錄音室：像 Cubasis 一樣，一條歌、一條你的聲音，點上面的段落選範圍，大紅鍵錄音 ---------- */
// 歌和你的聲音都用同一個 Web Audio 引擎播（解碼好、排好時間一起開始），不會互相追、不會卡
// 錄音也直接從 Web Audio 收麥克風的聲音，每一個取樣都知道對到歌的第幾秒
const LATKEY='scene-lat-v1';
let S=null;
const sGet=()=>{try{return +localStorage.getItem(LATKEY)||0}catch(e){return 0}};
async function openStudio(){
  if(!au){hint('先在右上「⋯」放原曲或伴奏');hintT=setTimeout(()=>hint(''),2500);return}
  au.pause();closeMenu();if(rec)finishRec();
  const ctx=audioCtx();
  const [a,b]=secRange(cur);
  S={ctx,song:null,peaks:null,dur:au.duration||0,sel:getTimes().length>1?[a,b]:null,zoom:true,pos:getTimes().length>1?Math.max(0,a-2):au.currentTime,
     playing:false,srcs:[],T:0,from:0,loop:true,mute:{song:false,me:false},recd:null,selTake:null,bufs:new Map(),raf:0};
  const d=document.createElement('div');d.id='studio';d.innerHTML=`
    <div class="s-top"><button data-act="sx">← 歌詞</button><b>${esc(SCENES[key].title)}</b><span class="s-tr">${TRACK[track]}</span><span class="s-time" id="s-time">0:00</span></div>
    <div class="s-lyr" id="s-lyr"></div>
    <div class="s-ruler" id="s-ruler"></div>
    <div class="s-lanes">
      <div class="s-lane"><div class="s-h"><b>${TRACK[track]}</b><button data-act="smute" data-l="song">M</button><input type="range" min="0" max="1.5" step=".05" data-act="svol" data-l="song"></div><canvas id="s-c1"></canvas></div>
      <div class="s-lane me"><div class="s-h"><b>我的聲音</b><button data-act="smute" data-l="me">M</button><input type="range" min="0" max="2" step=".05" data-act="svol" data-l="me"></div><canvas id="s-c2"></canvas></div>
      <div class="s-ph" id="s-ph"></div>
    </div>
    <div class="s-take" id="s-take" hidden></div>
    <div class="s-bot">
      <div class="s-l"><button data-act="szoom" id="s-zoom">整首</button><button data-act="sloop" id="s-loop" class="on">🔁 重複</button></div>
      <div class="s-c"><button data-act="shome" aria-label="回到開頭">⏮</button><button data-act="splay" class="s-pp" id="s-pp">▶</button><button data-act="srec" class="s-rec" id="s-rec" aria-label="錄音"><i></i></button></div>
      <div class="s-r"><label class="s-hp"><input type="checkbox" data-act="shp" ${mix().hp?'checked':''}> 🎧 有戴耳機</label></div>
    </div>
    <div class="s-msg" id="s-msg">載入中…</div>`;
  app.appendChild(d);document.body.classList.add('studio');
  const m=mix();d.querySelector('[data-l=song][data-act=svol]').value=m.song;d.querySelector('[data-l=me][data-act=svol]').value=m.me;
  try{
    const f=(track==='inst'?await getFile(key+'|inst')||await getFile(key):await getFile(key+'|orig'));
    S.song=await decodeHead(await playable(key+'|'+track,f));S.dur=S.song.duration;S.peaks=peaksOf(S.song);
    for(const k of takes)await takeBuf(k);
  }catch(e){sMsg('這首的音檔讀不出來');return}
  sMsg('');sLayout();addEventListener('resize',sLayout);
}
function closeStudio(){
  if(!S)return;sStop();if(S.recd)sRecStop(true);
  const p=S.pos;removeEventListener('resize',sLayout);
  const d=document.getElementById('studio');if(d)d.remove();document.body.classList.remove('studio');S=null;
  if(au){au.currentTime=p;show(secAt(p+.05))}drawPlayer();
}
function sMsg(t){const e=document.getElementById('s-msg');if(e){e.textContent=t;e.hidden=!t}}
// 波形：每 20 毫秒取最大音量，畫的時候再依畫面寬度合併
function peaksOf(buf){
  const hop=Math.round(buf.sampleRate*.02),n=Math.ceil(buf.length/hop),p=new Float32Array(n),ch=[];
  for(let c=0;c<Math.min(2,buf.numberOfChannels);c++)ch.push(buf.getChannelData(c));
  for(let i=0;i<n;i++){let m=0;const a=i*hop,b=Math.min(buf.length,a+hop);for(const d of ch)for(let j=a;j<b;j+=4){const v=d[j]<0?-d[j]:d[j];if(v>m)m=v}p[i]=m}
  return p;
}
async function takeBuf(k){if(S.bufs.has(k.id))return S.bufs.get(k.id);let b=null;try{b=await decodeHead(k.blob)}catch(e){}const v=b?{buf:b,peaks:peaksOf(b)}:null;S.bufs.set(k.id,v);return v}
// 畫面看到的範圍：有選段落就放大到那段（前後多留一點），不然整首
function sView(){if(S.sel&&S.zoom){const [a,b]=S.sel,pad=Math.max(2,(b-a)*.08);return [Math.max(0,a-pad),Math.min(S.dur,b+pad)]}return [0,S.dur||1]}
function sX(t,w){const [v0,v1]=sView();return (t-v0)/(v1-v0)*w}
function sT(x,w){const [v0,v1]=sView();return v0+x/w*(v1-v0)}
function sLayout(){
  if(!S)return;['s-c1','s-c2'].forEach(id=>{const c=document.getElementById(id),r=c.getBoundingClientRect(),dpr=devicePixelRatio||1;c.width=r.width*dpr;c.height=r.height*dpr});
  sDraw();
}
// 誰在那一秒算數：同一個時間有好幾次錄音，用最新錄的
function sCover(){
  const out=[],ks=takes.slice().sort((x,y)=>y.at-x.at),taken=[];
  for(const k of ks){let segs=[[k.start,k.end]];
    for(const [a,b] of taken)segs=segs.flatMap(([x,y])=>b<=x||a>=y?[[x,y]]:[...(a>x?[[x,a]]:[]),...(b<y?[[b,y]]:[])]);
    segs.forEach(([x,y])=>{if(y-x>.02)out.push({k,a:x,b:y})});taken.push([k.start,k.end]);}
  return out;
}
function sDraw(){
  if(!S||!S.song)return;
  const t=getTimes(),n=SCENES[key].steps.length,ru=document.getElementById('s-ruler'),W=ru.clientWidth,[v0,v1]=sView();
  ru.innerHTML=t.length>1?SCENES[key].steps.map((st,i)=>{const a=t[i]!=null?t[i]:0,b=t[i+1]!=null?t[i+1]:S.dur;if(b<v0||a>v1)return '';const x=Math.max(0,sX(a,W)),x2=Math.min(W,sX(b,W));
    const on=S.sel&&Math.abs(S.sel[0]-a)<.01;return `<button data-act="ssec" data-i="${i}" class="${on?'on':''}" style="left:${x}px;width:${Math.max(0,x2-x-2)}px">${esc(st.sec)}</button>`}).join(''):'<span class="s-nosec">還沒對拍，所以沒有段落可選；直接點波形決定從哪裡開始</span>';
  const draw=(id,fn)=>{const c=document.getElementById(id),g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    if(S.sel){g.fillStyle='rgba(242,194,123,.10)';const x=sX(S.sel[0],w),x2=sX(S.sel[1],w);g.fillRect(x,0,x2-x,h)}fn(g,w,h)};
  const wave=(g,w,h,pk,t0,a,b,col)=>{const [q0,q1]=sView(),y0=h/2;g.fillStyle=col;
    const xa=Math.max(0,Math.floor(sX(a,w))),xb=Math.min(w,Math.ceil(sX(b,w)));
    for(let x=xa;x<xb;x++){const ta=q0+x/w*(q1-q0)-t0,tb=q0+(x+1)/w*(q1-q0)-t0;let m=0;for(let i=Math.max(0,Math.floor(ta/.02));i<=Math.min(pk.length-1,Math.floor(tb/.02));i++)if(pk[i]>m)m=pk[i];
      const hh=Math.max(1,Math.min(1,m*1.6)*h*.46);g.fillRect(x,y0-hh,1,hh*2)}};
  draw('s-c1',(g,w,h)=>wave(g,w,h,S.peaks,0,0,S.dur,S.mute.song?'rgba(255,255,255,.18)':'rgba(242,194,123,.75)'));
  draw('s-c2',(g,w,h)=>{
    sCover().forEach(({k,a,b})=>{const v=S.bufs.get(k.id);const x=sX(a,w),x2=sX(b,w);
      g.fillStyle=S.selTake===k.id?'rgba(255,138,128,.28)':'rgba(255,138,128,.12)';g.fillRect(x,2,x2-x,h-4);
      if(v)wave(g,w,h,v.peaks,k.start-(k.lead||0)+sGet(),a,b,S.mute.me?'rgba(255,255,255,.18)':'#ff8a80')});
    if(S.recd&&S.recd.len){const a=S.recd.start,b=a+S.recd.len/S.ctx.sampleRate;g.fillStyle='rgba(224,90,78,.45)';g.fillRect(sX(a,w),2,sX(b,w)-sX(a,w),h-4)}
    if(!takes.length&&!S.recd){g.fillStyle='rgba(255,255,255,.35)';g.font=`${13*(devicePixelRatio||1)}px sans-serif`;g.fillText('按下面紅色的鍵開始錄',12*(devicePixelRatio||1),h/2+5)}});
  document.getElementById('s-zoom').textContent=S.zoom&&S.sel?'整首':'放大這段';document.getElementById('s-zoom').disabled=!S.sel;
  document.getElementById('s-loop').classList.toggle('on',S.loop);
  document.querySelectorAll('#studio [data-act=smute]').forEach(b=>b.classList.toggle('on',S.mute[b.dataset.l]));
  sHead();sTake();
}
function sNow(){return S.playing?S.from+(S.ctx.currentTime-S.T):S.pos}
function sHead(){
  if(!S)return;const p=sNow(),lanes=document.querySelector('#studio .s-lanes'),c=document.getElementById('s-c1');if(!lanes||!c)return;
  const x=c.offsetLeft+sX(p,c.clientWidth),ph=document.getElementById('s-ph');ph.style.transform=`translateX(${x}px)`;ph.style.display=x<c.offsetLeft||x>c.offsetLeft+c.clientWidth?'none':'';
  const tm=document.getElementById('s-time');if(tm)tm.textContent=`${mmss(p)} / ${mmss(S.dur)}`;
  // 歌詞：現在這段，唱到的那句亮
  const ly=document.getElementById('s-lyr');if(ly&&blocks){const s=secAt(p+.05),L=getLines(),off=lineOff(s);let k=-1;L.forEach((x,j)=>{if(x!=null&&p>=x-.3)k=j});
    const html=`<small>${esc(SCENES[key].steps[s].sec)}</small>`+(blocks[s]||[]).map((l,j)=>`<p class="${off+j===k?'on':off+j<k?'past':''}">${esc(l)}</p>`).join('');
    if(ly.dataset.h!==html){ly.innerHTML=html;ly.dataset.h=html}}
}
function sTake(){
  const e=document.getElementById('s-take');if(!e)return;const k=takes.find(x=>x.id===S.selTake);
  if(!k){e.hidden=true;return}e.hidden=false;
  const full=k.start<2&&k.end>S.dur*.85;
  e.innerHTML=`<span>這次錄音 ${mmss(k.start)}–${mmss(k.end)}</span><button data-act="slat" data-d="-1">我的聲音早一點</button><button data-act="slat" data-d="1">晚一點</button><a class="btn" data-act="tdl" download="${esc(SCENES[key].title)}-${mmss(k.start).replace(':','')}.${/webm/.test(k.blob.type)?'webm':/wav/.test(k.blob.type)?'wav':'m4a'}" href="${URL.createObjectURL(k.blob)}">存到檔案</a>${full?'<button data-act="talign">用這次自動對拍</button>':''}<button data-act="sdel">🗑 刪掉</button><button data-act="sdesel">✕</button>`;
}
// 播放：歌和每一段錄音都排在同一個時間點開始
function sPlay(from){
  sStop();const c=S.ctx;audioCtx();const m=mix();
  const T=c.currentTime+.06;S.T=T;S.from=from;S.playing=true;
  const gs=c.createGain();gs.gain.value=S.mute.song?0:m.song;gs.connect(c.destination);
  const src=c.createBufferSource();src.buffer=S.song;src.connect(gs);if(from<S.dur)src.start(T,from);S.srcs=[src];S.gs=gs;
  const gm=c.createGain();gm.gain.value=S.mute.me?0:m.me;gm.connect(c.destination);S.gm=gm;
  const lat=sGet();
  if(!S.recd)sCover().forEach(({k,a,b})=>{const v=S.bufs.get(k.id);if(!v||b<=from)return;const st=Math.max(a,from),o=st-k.start+(k.lead||0)-lat;if(o<0||o>=v.buf.duration)return;
    const s=c.createBufferSource();s.buffer=v.buf;s.connect(gm);s.start(T+(st-from),o,b-st);S.srcs.push(s)});
  document.getElementById('s-pp').textContent='❚❚';sLoop();
}
function sStop(){if(!S)return;if(S.playing)S.pos=Math.min(S.dur,sNow());S.srcs.forEach(s=>{try{s.stop()}catch(e){}});S.srcs=[];S.playing=false;cancelAnimationFrame(S.raf);S.raf=0;const pp=document.getElementById('s-pp');if(pp)pp.textContent='▶';sHead()}
function sLoop(){
  S.raf=requestAnimationFrame(()=>{if(!S||!S.playing)return;const p=sNow();
    if(S.recd){if(S.recd.until&&p>=S.recd.until){sRecStop();return}if(p>=S.dur){sRecStop();return}}
    else if(S.sel&&S.loop&&p>=S.sel[1]){sPlay(Math.max(0,S.sel[0]-1));return}
    else if(p>=S.dur){sStop();S.pos=S.sel?S.sel[0]:0;sHead();return}
    sHead();if(S.recd)sDrawRec();sLoop()});
}
let sRecDrawT=0;function sDrawRec(){const n=performance.now();if(n-sRecDrawT>250){sRecDrawT=n;sDraw()}}
// 錄音：從選的段落前 2 秒開始播，到段尾自動停；沒選段落就從播放頭前 2 秒開始，按停才停
async function sRecStart(){
  if(S.recd)return sRecStop();sStop();
  const m=mix();let st;
  try{st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!m.hp,noiseSuppression:false,autoGainControl:false}})}
  catch(e){alert('沒辦法用麥克風：到「設定 → Safari → 麥克風」允許，或重新打開再按一次');return}
  const c=S.ctx;audioCtx();
  const keep=S.sel?Math.max(0,S.sel[0]-.5):S.pos,from=Math.max(0,(S.sel?S.sel[0]:S.pos)-2),until=S.sel?Math.min(S.dur,S.sel[1]+.5):0;
  const inp=c.createMediaStreamSource(st),pr=c.createScriptProcessor(4096,1,1),z=c.createGain();z.gain.value=0;
  inp.connect(pr);pr.connect(z);z.connect(c.destination);
  S.recd={st,inp,pr,z,chunks:[],start:null,len:0,until,keep,from};
  pr.onaudioprocess=e=>{const r=S&&S.recd;if(!r)return;const d=e.inputBuffer.getChannelData(0);
    // 這一塊聲音是在 Web Audio 時鐘的哪個時間收到的 → 換成歌的第幾秒
    const at=(e.playbackTime||c.currentTime)-d.length/c.sampleRate*2;
    if(r.start==null)r.start=S.from+(at-S.T);r.chunks.push(new Float32Array(d));r.len+=d.length};
  document.getElementById('s-rec').classList.add('on');document.getElementById('studio').classList.add('recording');
  sPlay(from);
}
async function sRecStop(cancel){
  const r=S&&S.recd;if(!r)return;S.recd=null;sStop();
  try{r.inp.disconnect();r.pr.disconnect();r.z.disconnect()}catch(e){}r.st.getTracks().forEach(t=>t.stop());
  document.getElementById('s-rec').classList.remove('on');document.getElementById('studio').classList.remove('recording');
  if(cancel||!r.len||r.start==null){sDraw();return}
  const sr=S.ctx.sampleRate,all=new Float32Array(r.len);let o=0;r.chunks.forEach(ch=>{all.set(ch,o);o+=ch.length});
  // 前面預備的那 1.5 秒不留（不然會蓋掉上一段的尾巴）
  const cut=Math.max(0,Math.round((r.keep-r.start)*sr)),data=all.subarray(cut);if(data.length<sr*.5){sDraw();return}
  const buf=S.ctx.createBuffer(1,data.length,sr);buf.copyToChannel(data,0);
  const take={id:Date.now(),blob:toWav(buf),start:r2(r.start+cut/sr),lead:0,track,end:r2(r.start+(cut+data.length)/sr),at:Date.now(),ec:!mix().hp};
  takes.push(take);S.bufs.set(take.id,{buf,peaks:peaksOf(buf)});await saveTakes();
  S.pos=Math.max(0,(S.sel?S.sel[0]:take.start)-1);S.selTake=null;sDraw();
  sMsg('');hint('錄好了！按 ▶ 聽你和歌一起');hintT=setTimeout(()=>hint(''),3000);
}
function sTap(e){
  const c=e.target.closest('#s-c1,#s-c2');if(!c||!S||S.recd)return;const r=c.getBoundingClientRect(),t=Math.max(0,Math.min(S.dur,sT(e.clientX-r.left,r.width)));
  if(c.id==='s-c2'){const hit=sCover().find(({a,b})=>t>=a&&t<=b);S.selTake=hit?hit.k.id:null}
  const was=S.playing;S.pos=t;if(was)sPlay(t);else sHead();sDraw();
}
app.addEventListener('pointerdown',e=>{if(S&&e.target.closest('#s-c1,#s-c2'))sTap(e)});
app.addEventListener('click',e=>{
  if(!S)return;const a=e.target.closest('#studio [data-act]');if(!a)return;const act=a.dataset.act;
  if(act==='sx')closeStudio();
  else if(act==='splay'){if(S.recd)sRecStop();else if(S.playing)sStop();else sPlay(S.pos)}
  else if(act==='srec')sRecStart();
  else if(act==='shome'){const was=S.playing;S.pos=S.sel?Math.max(0,S.sel[0]-1):0;if(was)sPlay(S.pos);else sHead()}
  else if(act==='ssec'){const i=+a.dataset.i,[x,y]=secRange(i);if(S.sel&&Math.abs(S.sel[0]-x)<.01){S.sel=null}else{S.sel=[x,y];S.zoom=true;S.pos=Math.max(0,x-1);if(S.playing)sPlay(S.pos)}sDraw()}
  else if(act==='szoom'){S.zoom=!S.zoom;sDraw()}
  else if(act==='sloop'){S.loop=!S.loop;sDraw()}
  else if(act==='smute'){const l=a.dataset.l;S.mute[l]=!S.mute[l];const g=l==='song'?S.gs:S.gm;if(g)g.gain.value=S.mute[l]?0:mix()[l];sDraw()}
  else if(act==='shp')setMix({hp:a.checked});
  else if(act==='slat'){try{localStorage.setItem(LATKEY,r2(sGet()+(+a.dataset.d)*.02))}catch(_){}if(S.playing)sPlay(sNow());sDraw();hint(`我的聲音 ${sGet()>0?'提早':'延後'} ${Math.abs(sGet()).toFixed(2)} 秒`);hintT=setTimeout(()=>hint(''),1500)}
  else if(act==='sdel'){if(!confirm('刪掉這次錄音？'))return;takes=takes.filter(k=>k.id!==S.selTake);S.selTake=null;saveTakes();if(S.playing)sPlay(sNow());sDraw()}
  else if(act==='sdesel'){S.selTake=null;sDraw()}
  else if(act==='talign'){const k=takes.find(x=>x.id===S.selTake);if(k)alignTake(k)}
},true);
app.addEventListener('input',e=>{if(!S)return;const a=e.target;if(a.dataset.act!=='svol')return;const l=a.dataset.l,v=+a.value;setMix({[l]:v});const g=l==='song'?S.gs:S.gm;if(g&&!S.mute[l])g.gain.value=v});
