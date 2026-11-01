// 升降 Key（速度不變）：先把聲音拉長／縮短（WSOLA：一小段一小段接起來，接縫挑波形最像的地方），
// 再整首加速／減速回原本長度，音高就跟著升降。整首先算好再播，播起來跟原檔一樣順。
// keyShift(buf, 半音, 進度回呼) → 新的 AudioBuffer（原本那份不動）
(function(){
  const pause=()=>new Promise(r=>setTimeout(r,0));
  function newBuf(nc,len,sr){
    try{return new AudioBuffer({numberOfChannels:nc,length:len,sampleRate:sr})}
    catch(e){const C=window.AudioContext||window.webkitAudioContext,c=new C();const b=c.createBuffer(nc,len,sr);c.close&&c.close();return b}
  }
  async function keyShift(buf,semis,onProg){
    const nc=buf.numberOfChannels,len=buf.length,sr=buf.sampleRate,out=newBuf(nc,len,sr);
    if(!semis){for(let c=0;c<nc;c++)out.getChannelData(c).set(buf.getChannelData(c));return out}
    const r=Math.pow(2,semis/12);                       // 先拉長 r 倍，再用 r 倍速讀回來
    const sc=sr/44100,W=2*Math.round(1024*sc),Hs=W/2,Ha=Hs/r,S=Math.round(512*sc),D=4;
    const chs=[];for(let c=0;c<nc;c++)chs.push(buf.getChannelData(c));
    // 找接縫用的單聲道縮小版（每 4 點取平均）
    const dl=Math.floor(len/D),d=new Float32Array(dl);
    for(let j=0;j<dl;j++){let s=0;for(let c=0;c<nc;c++){const x=chs[c];const i=j*D;s+=x[i]+x[i+1]+x[i+2]+x[i+3]}d[j]=s}
    const frames=Math.max(1,Math.floor((len-W)/Ha)+1),pos=new Int32Array(frames);
    const hd=Hs/D,sd=Math.round(S/D),maxP=len-W;let prev=0;
    for(let k=1;k<frames;k++){
      const nom=Math.round(k*Ha),tgt=prev+Hs;
      let lo=Math.max(0,nom-S),hi=Math.min(maxP,nom+S);
      if(tgt>maxP||hi<lo){pos[k]=Math.min(maxP,Math.max(0,nom));prev=pos[k];continue}
      // 粗找（縮小版）
      const t0=Math.round(tgt/D);let best=Math.round(nom/D),bv=-Infinity;
      for(let p=Math.ceil(lo/D);p<=Math.floor(hi/D);p++){let s=0,e=1e-9;for(let i=0;i<hd;i++){const v=d[p+i];s+=v*d[t0+i];e+=v*v}s/=Math.sqrt(e);if(s>bv){bv=s;best=p}}
      // 細找（原本取樣率，前後 3 點）
      let fb=best*D,fv=-Infinity;
      for(let p=Math.max(lo,best*D-3);p<=Math.min(hi,best*D+3);p++){let s=0;for(let i=0;i<Hs;i+=2){let a=0,b=0;for(let c=0;c<nc;c++){a+=chs[c][p+i];b+=chs[c][tgt+i]}s+=a*b}if(s>fv){fv=s;fb=p}}
      pos[k]=fb;prev=fb;
      if(k%400===0){onProg&&onProg(k/frames*.6);await pause()}
    }
    const win=new Float32Array(W);for(let i=0;i<W;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/W);
    const sl=(frames-1)*Hs+W;
    for(let c=0;c<nc;c++){
      const x=chs[c],st=new Float32Array(sl);
      for(let k=0;k<frames;k++){const p=pos[k],o=k*Hs;for(let i=0;i<W;i++)st[o+i]+=x[p+i]*win[i]}
      for(let i=0;i<Hs;i++)st[i]=x[i];                  // 開頭不要淡入
      const y=out.getChannelData(c);
      for(let i=0;i<len;i++){const t=i*r,j=Math.floor(t),f=t-j;y[i]=j+1<sl?st[j]+(st[j+1]-st[j])*f:0}
      onProg&&onProg(.6+.4*(c+1)/nc);await pause();
    }
    return out;
  }
  // AudioBuffer → wav 檔（給 <audio> 播放器用）
  function keyWav(buf){
    const nc=Math.min(2,buf.numberOfChannels),len=buf.length,sr=buf.sampleRate,ab=new ArrayBuffer(44+len*nc*2),v=new DataView(ab);
    const w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
    w(0,'RIFF');v.setUint32(4,36+len*nc*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nc,true);
    v.setUint32(24,sr,true);v.setUint32(28,sr*nc*2,true);v.setUint16(32,nc*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,len*nc*2,true);
    const ch=[];for(let c=0;c<nc;c++)ch.push(buf.getChannelData(c));const out=new Int16Array(ab,44);let o=0;
    for(let i=0;i<len;i++)for(let c=0;c<nc;c++){const x=Math.max(-1,Math.min(1,ch[c][i]));out[o++]=x<0?x*32768:x*32767}
    return new Blob([ab],{type:'audio/wav'});
  }
  window.keyShift=keyShift;window.keyWav=keyWav;
})();
