'use strict';
/* 康复馆 · 动作播放器：把 motions.js 的关键帧按时间插值，交给 Rig 绘制。 */
const RehabPlayer=(function(){
const ease=k=>k*k*(3-2*k);
const mergePose=p=>Object.assign({},Rig.BASE,p||{});
function total(v){return v.keys.reduce((s,k)=>s+k.t+k.hold,0)}
/* 取某一时刻的状态 */
function sample(v,tau){
  const keys=v.keys;let t=0,i=0;
  for(;i<keys.length;i++){const d=keys[i].t+keys[i].hold;if(tau<t+d||i===keys.length-1)break;t+=d}
  const k=keys[i],prev=keys[Math.max(0,i-1)],loc=tau-t,moving=loc<k.t,f=moving?ease(loc/k.t):1;
  const a=mergePose(prev.pose),b=mergePose(k.pose),pose={};for(const n in b)pose[n]=a[n]+(b[n]-a[n])*f;
  const hand=s=>{const from=(prev.hands||{})[s]||'rest',to=(k.hands||{})[s]||'rest';return from===to?{a:to}:{a:from,b:to,k:f}};
  return{pose,hands:{L:hand('L'),R:hand('R')},i,moving,f,cue:(!moving&&k.holdCue)?k.holdCue:k.cue,
    arrows:(k.arrows||[]).map(x=>Object.assign({},x,{a:f})),hl:(k.hl||[]).map(id=>({id,a:f})),holdLeft:moving?null:(k.hold-(loc-k.t)),key:k};
}
function peakOf(v){const k=v.keys.find(x=>x.peak)||v.keys[0];const hands={};for(const s of['L','R'])hands[s]={a:(k.hands||{})[s]||'rest'};return{pose:mergePose(k.pose),hands}}

function create(canvas,motion,opts){
  const g=canvas.getContext('2d');let W=0,H=0,dpr=1,off=null;
  const st={vid:null,v:null,tau:0,playing:true,speed:1,raf:0,last:0,loops:0,dead:false};
  function fit(){const r=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);W=r.width||320;H=r.height||350;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr)}
  function setVariant(id){st.vid=id;st.v=motion.variants[id];st.tau=0;st.loops=0;st.playing=true;render();opts.onState&&opts.onState(st)}
  function render(){
    if(!W)fit();const v=st.v,fr=v.frame||motion.frame,s=sample(v,st.tau),sc=fr.sc*(W/320);
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    const bg=g.createRadialGradient(W/2,H*.45,10,W/2,H*.5,H*.75);bg.addColorStop(0,'rgba(127,208,255,.13)');bg.addColorStop(1,'rgba(127,208,255,0)');g.fillStyle=bg;g.fillRect(0,0,W,H);
    const base={W,view:fr.view,sc,cx:W*fr.cx,cy:H*fr.cy,t:performance.now()/1000};
    if(v.error){const ref=motion.variants[v.ref||'main']||motion.variants[Object.keys(motion.variants)[0]],pk=peakOf(ref);
      if(!off){off=document.createElement('canvas')}
      if(off.width!==canvas.width||off.height!==canvas.height){off.width=canvas.width;off.height=canvas.height}
      const og=off.getContext('2d');og.setTransform(dpr,0,0,dpr,0,0);og.clearRect(0,0,W,H);
      Rig.draw(og,Rig.solve(pk.pose,pk.hands),Object.assign({},base,{mono:'#5ee6c8'}));
      g.globalAlpha=.24;g.setTransform(1,0,0,1,0,0);g.drawImage(off,0,0);g.setTransform(dpr,0,0,dpr,0,0);g.globalAlpha=1}
    const K=Rig.solve(s.pose,s.hands);
    let ghost=null;if(motion.ghostStart&&!v.error){ghost=Rig.solve(mergePose(v.keys[0].pose),{}).hc}
    Rig.draw(g,K,Object.assign({},base,{hl:s.hl,arrows:s.arrows,guides:motion.guides,ghostHead:ghost,mark:v.error&&v.mark?Object.assign({a:s.key.peak?s.f:0},v.mark):null}));
    opts.onFrame&&opts.onFrame(s,st);
  }
  function tick(now){
    if(st.dead)return;const dt=Math.min(.1,(now-st.last)/1000||0);st.last=now;
    if(st.playing&&!document.hidden){st.tau+=dt*st.speed;const T=total(st.v);
      if(st.tau>=T){st.tau=0;st.loops++;opts.onLoop&&opts.onLoop(st)}}
    render();st.raf=requestAnimationFrame(tick)}
  fit();st.raf=requestAnimationFrame(tick);
  const onRz=()=>{fit()};window.addEventListener('resize',onRz);
  return{st,setVariant,render,fit,
    toggle(){st.playing=!st.playing;opts.onState&&opts.onState(st)},
    setSpeed(x){st.speed=x;opts.onState&&opts.onState(st)},
    restart(){st.tau=0;st.playing=true;opts.onState&&opts.onState(st)},
    seekKey(i){let t=0;for(let n=0;n<i;n++)t+=st.v.keys[n].t+st.v.keys[n].hold;st.tau=t+st.v.keys[i].t+.01;render();opts.onState&&opts.onState(st)},
    destroy(){st.dead=true;cancelAnimationFrame(st.raf);window.removeEventListener('resize',onRz)}};
}
return{create,sample,total};
})();
