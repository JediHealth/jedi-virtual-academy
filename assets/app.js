'use strict';
/* =====================================================================
   绝地虚拟学院 — 引擎与界面（无外部依赖）
   结构：assets/data.js 数据 → 状态 → 世界渲染 → 输入与移动 → 界面与各区域活动
   ===================================================================== */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;

/* ---------------------------- 状态 ---------------------------- */
const DEF={v:1,started:false,name:'',path:2,xp:0,intro:false,met:false,breath:false,regions:[],quiz:-1,joint:-1,balance:-1,shards:[],grad:false};
let S=Object.assign({},DEF);
try{const r=JSON.parse(localStorage.getItem('jva_v1')||'null');if(r&&r.v===1)S=Object.assign({},DEF,r)}catch(e){}
let storeOK=true;try{localStorage.setItem('jva_t','1');localStorage.removeItem('jva_t')}catch(e){storeOK=false}
const save=()=>{try{localStorage.setItem('jva_v1',JSON.stringify(S))}catch(e){storeOK=false}};
const rankOf=xp=>{let i=0;RANKS.forEach((r,j)=>{if(xp>=r.xp)i=j});return i};
const hallOK=()=>S.quiz>=3, trainOK=()=>S.joint>=4||S.balance>=50;

let mode='title';
const P={x:900,y:1745,tx:null,ty:null,face:1,moving:false};
const cam={x:900,y:950};
let pending=null,near=null,ripple=null,T=0;
const keys={};

/* 伪随机（固定种子，保证每次场景一致） */
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const DECO=[];
(function(){let n=0,guard=0;while(n<30&&guard++<900){const a=rnd()*TAU,d=.35+rnd()*.6,x=ISLE.x+Math.cos(a)*ISLE.rx*d,y=ISLE.y+Math.sin(a)*ISLE.ry*d;
  let ok=true;for(const z of Object.values(ZONES))if(Math.hypot(x-z.x,y-z.y)<z.r+70)ok=false;
  for(const s of SHARDS)if(Math.hypot(x-s.x,y-s.y)<90)ok=false;
  for(const [a1,b1] of PATHLINES)if(segDist(x,y,a1,b1)<70)ok=false;
  for(const o of DECO)if(Math.hypot(x-o.x,y-o.y)<90)ok=false;
  if(ok){DECO.push({x,y,type:rnd()<.6?0:1,s:.8+rnd()*.6,ph:rnd()*TAU});n++}}})();
function segDist(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=clamp(((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(px-a[0]-dx*t,py-a[1]-dy*t)}
const STARS=Array.from({length:110},()=>({x:rnd(),y:rnd()*.9,s:.5+rnd()*1.4,p:rnd()*TAU}));
const NPCS=Array.from({length:5},(_,i)=>({x:700+rnd()*400,y:1000+rnd()*400,tx:null,ty:null,wait:rnd()*4,path:i%3,name:NAMES[(i*3+11)%NAMES.length],face:1,moving:false,ph:rnd()*9}));
const OBST=[{x:900,y:1250,r:52},{x:430,y:620,r:50},{x:1370,y:620,r:44},{x:1050,y:1110,r:30}];

/* ---------------------------- 画布 ---------------------------- */
const cv=$('#world'),G0=cv.getContext('2d');let g=G0;
let vw=0,vh=0,dpr=1,Z=1;
const MOBILE=/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
let dirty=true;
function resize(){dirty=true;dpr=Math.min(window.devicePixelRatio||1,MOBILE?2:2.5);vw=window.innerWidth;vh=window.innerHeight;cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,250));if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);resize();
const zoom=()=>clamp(Math.max(vw,vh)/1100,.62,1.1)*(mode==='play'?1:.78);
const w2s=(x,y)=>[(x-cam.x)*Z+vw/2,(y-cam.y)*K*Z+vh/2];
const s2w=(x,y)=>[(x-vw/2)/Z+cam.x,(y-vh/2)/(K*Z)+cam.y];
const ground=()=>g.setTransform(dpr*Z,0,0,dpr*Z*K,dpr*(vw/2-cam.x*Z),dpr*(vh/2-cam.y*K*Z));
const upright=(x,y)=>{const [sx,sy]=w2s(x,y);g.setTransform(dpr*Z,0,0,dpr*Z,dpr*sx,dpr*sy)};
const screen=()=>g.setTransform(dpr,0,0,dpr,0,0);
function ell(x,y,rx,ry){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU)}
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function glow(x,y,r,c,a){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=a;g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.globalAlpha=1}

function drawSky(){
  screen();
  const gr=g.createLinearGradient(0,0,0,vh);gr.addColorStop(0,'#050817');gr.addColorStop(.55,'#0b1730');gr.addColorStop(1,'#113142');
  g.fillStyle=gr;g.fillRect(0,0,vw,vh);
  for(let i=0;i<3;i++){ // 极光
    g.beginPath();const base=vh*(.16+i*.09)-cam.y*.02;g.moveTo(0,vh*.6);
    for(let x=0;x<=vw+40;x+=40)g.lineTo(x,base+Math.sin(x*.004+T*.12+i*2)*38+Math.sin(x*.011-T*.2+i)*14);
    g.lineTo(vw,vh*.6);g.closePath();
    const a=g.createLinearGradient(0,base-50,0,vh*.6);a.addColorStop(0,['rgba(94,230,200,.16)','rgba(169,155,255,.13)','rgba(127,184,255,.10)'][i]);a.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=a;g.fill();
  }
  g.fillStyle='#fff';
  for(const s of STARS){const x=((s.x*vw-cam.x*.03)%vw+vw)%vw,y=s.y*vh*.8;g.globalAlpha=.35+.45*Math.sin(T*1.3+s.p);g.fillRect(x,y,s.s,s.s)}
  g.globalAlpha=1;
}

function drawGround(){
  ground();
  // 岛体厚度
  g.fillStyle='#050c16';ell(ISLE.x,ISLE.y+150,ISLE.rx*.9,ISLE.ry*.9);g.fill();
  g.fillStyle='#0a1826';ell(ISLE.x,ISLE.y+78,ISLE.rx*.97,ISLE.ry*.97);g.fill();
  const gr=g.createRadialGradient(ISLE.x,ISLE.y,80,ISLE.x,ISLE.y,ISLE.ry);gr.addColorStop(0,'#1e4050');gr.addColorStop(.7,'#173245');gr.addColorStop(1,'#10232f');
  g.fillStyle=gr;ell(ISLE.x,ISLE.y,ISLE.rx,ISLE.ry);g.fill();
  g.strokeStyle='rgba(120,235,215,.5)';g.lineWidth=3;g.stroke();
  g.strokeStyle='rgba(120,235,215,.07)';g.lineWidth=2;
  for(let i=1;i<6;i++){ell(ISLE.x,ISLE.y,ISLE.rx*i/6,ISLE.ry*i/6);g.stroke()}
  // 光之路径
  g.lineCap='round';
  for(const [a,b] of PATHLINES){
    g.strokeStyle='rgba(94,230,200,.08)';g.lineWidth=54;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
    g.strokeStyle='rgba(160,255,235,.5)';g.lineWidth=3;g.setLineDash([4,26]);g.lineDashOffset=-T*24;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();g.setLineDash([]);
  }
  // 三大区域地台
  const floor=(z,fill,n)=>{
    g.fillStyle=fill;ell(z.x,z.y,z.r,z.r);g.fill();
    g.strokeStyle=z.c;g.globalAlpha=.55;g.lineWidth=3;g.stroke();
    g.globalAlpha=.22;g.lineWidth=2;ell(z.x,z.y,z.r*.72,z.r*.72);g.stroke();ell(z.x,z.y,z.r*.42,z.r*.42);g.stroke();
    g.globalAlpha=.5;g.lineWidth=4;g.setLineDash([z.r*.72*TAU/n*.5,z.r*.72*TAU/n*.5]);g.lineDashOffset=T*14;ell(z.x,z.y,z.r*.86,z.r*.86);g.stroke();g.setLineDash([]);g.globalAlpha=1;
  };
  floor(ZONES.plaza,'#1d4450',16);floor(ZONES.hall,'#262b52',24);floor(ZONES.train,'#3a3327',12);
  // 特训场地标线
  const t=ZONES.train;g.strokeStyle='rgba(255,196,107,.3)';g.lineWidth=2;
  g.beginPath();g.moveTo(t.x-t.r*.7,t.y);g.lineTo(t.x+t.r*.7,t.y);g.moveTo(t.x,t.y-t.r*.7);g.lineTo(t.x,t.y+t.r*.7);g.stroke();
  // 晶石底座
  SHARDS.forEach((s,i)=>{const got=S.shards.includes(i);g.strokeStyle=got?'rgba(255,255,255,.15)':'rgba(169,155,255,.6)';g.lineWidth=2;ell(s.x,s.y,30,30);g.stroke();
    if(!got){g.globalAlpha=.25+.2*Math.sin(T*2+i);g.fillStyle='#a99bff';ell(s.x,s.y,30,30);g.fill();g.globalAlpha=1}});
  // 点击涟漪
  if(ripple){const k=(T-ripple.t)/.6;if(k>1)ripple=null;else{g.strokeStyle='rgba(200,255,245,'+(1-k)+')';g.lineWidth=3;ell(ripple.x,ripple.y,10+k*34,10+k*34);g.stroke()}}
  // 交互范围提示
  if(near&&mode==='play'){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.setLineDash([10,10]);g.lineDashOffset=-T*30;ell(near.x,near.y,near.r*.62,near.r*.62);g.stroke();g.setLineDash([])}
}

/* ---- 立体物件（原点在脚底） ---- */
const SERIF='"Songti SC","STSong","Noto Serif SC",serif';
function zlabel(zh,en,y,c){g.textAlign='center';g.font='700 22px '+SERIF;const w=Math.max(g.measureText(zh).width,en.length*8.2)+36;
  g.fillStyle='rgba(5,10,22,.72)';rr(-w/2,y-25,w,48,14);g.fill();g.strokeStyle=c;g.globalAlpha=.4;g.lineWidth=1;g.stroke();g.globalAlpha=1;
  g.fillStyle=c;g.fillText(zh,0,y);g.font='600 9px -apple-system,"PingFang SC",sans-serif';g.fillStyle='rgba(255,255,255,.62)';g.fillText(en.split('').join(' '),0,y+15)}
function nameTag(t,y,c,a){g.textAlign='center';g.font='600 12px -apple-system,"PingFang SC",sans-serif';const w=g.measureText(t).width+14;g.globalAlpha=a*.7;g.fillStyle='#050a16';rr(-w/2,y-12,w,17,8);g.fill();g.globalAlpha=a;g.fillStyle=c;g.fillText(t,0,y+1);g.globalAlpha=1}

function drawChar(col,dark,moving,face,ph,scale,alpha){
  g.save();g.scale(scale,scale);g.globalAlpha=alpha;
  g.fillStyle='rgba(0,0,0,.35)';ell(0,0,17,6);g.fill();
  const bob=moving?Math.abs(Math.sin(ph*9))*-4:Math.sin(ph*2)*-1;
  if(moving){const s=Math.sin(ph*9)*6;g.fillStyle='#1a2233';ell(-6+s,-2,5,3);g.fill();ell(6-s,-2,5,3);g.fill()}
  g.translate(0,bob);
  const gr=g.createLinearGradient(0,-38,0,-2);gr.addColorStop(0,col);gr.addColorStop(1,dark);
  g.fillStyle=gr;g.beginPath();g.moveTo(-10,-36);g.quadraticCurveTo(-19,-14,-16,-4);g.quadraticCurveTo(0,1,16,-4);g.quadraticCurveTo(19,-14,10,-36);g.closePath();g.fill();
  g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2.4;g.beginPath();g.moveTo(-9*face,-34);g.lineTo(9*face,-13);g.stroke();
  g.fillStyle='#fff';g.globalAlpha=alpha*(.6+.4*Math.sin(T*3));g.beginPath();g.arc(2*face,-23,2.6,0,TAU);g.fill();g.globalAlpha=alpha;
  g.fillStyle='#f3dcc6';g.beginPath();g.arc(0,-46,11.5,0,TAU);g.fill();
  g.fillStyle='#18203a';g.beginPath();g.arc(0,-48,12,Math.PI*1.02,Math.PI*1.98);g.quadraticCurveTo(6*-face,-50,-12*face,-44);g.closePath();g.fill();
  g.strokeStyle=col;g.lineWidth=2.5;g.beginPath();g.arc(0,-48,12.4,Math.PI*1.12,Math.PI*1.88);g.stroke();
  g.fillStyle='#1b2233';g.beginPath();g.arc(-3+face*3,-44,1.6,0,TAU);g.arc(4+face*3,-44,1.6,0,TAU);g.fill();
  g.restore();g.globalAlpha=1;
}
function drawMentor(){
  const b=Math.sin(T*1.6)*4;
  g.fillStyle='rgba(0,0,0,.3)';ell(0,0,22,8);g.fill();glow(0,-50,80,'rgba(94,230,200,.5)',.35);
  g.translate(0,-10+b);
  g.strokeStyle='rgba(190,255,240,.8)';g.lineWidth=2;g.beginPath();g.arc(0,-76,20,0,TAU);g.stroke();
  const gr=g.createLinearGradient(0,-66,0,0);gr.addColorStop(0,'#f4fffc');gr.addColorStop(1,'#6fb9b6');
  g.fillStyle=gr;g.beginPath();g.moveTo(-12,-62);g.quadraticCurveTo(-26,-24,-20,0);g.quadraticCurveTo(0,7,20,0);g.quadraticCurveTo(26,-24,12,-62);g.closePath();g.fill();
  g.strokeStyle='#2b8f85';g.lineWidth=3;g.beginPath();g.moveTo(0,-60);g.lineTo(0,2);g.stroke();
  g.fillStyle='#f3dcc6';g.beginPath();g.arc(0,-74,12,0,TAU);g.fill();
  g.fillStyle='#e9eef2';g.beginPath();g.arc(0,-77,12.5,Math.PI,TAU);g.closePath();g.fill();
  g.beginPath();g.moveTo(-5,-66);g.quadraticCurveTo(0,-52,5,-66);g.closePath();g.fill();
  g.fillStyle='#1b2233';g.beginPath();g.arc(-4,-73,1.5,0,TAU);g.arc(4,-73,1.5,0,TAU);g.fill();
  const oa=T*1.2;glow(Math.cos(oa)*30,-40+Math.sin(oa)*10,12,'#eafffa',.9);
  g.translate(0,10-b);nameTag('澄一导师',-112,'#bff6ea',1);
}
function drawCore(){
  g.fillStyle='#0d2530';ell(0,0,50,50*K);g.fill();g.strokeStyle='#5ee6c8';g.lineWidth=3;g.stroke();
  g.fillStyle='rgba(94,230,200,.35)';ell(0,0,36,36*K);g.fill();
  const col=g.createLinearGradient(0,-260,0,0);col.addColorStop(0,'rgba(94,230,200,0)');col.addColorStop(1,'rgba(94,230,200,.3)');g.fillStyle=col;g.fillRect(-26,-260,52,260);
  for(let i=0;i<9;i++){const k=((T*.25+i/9)%1);g.globalAlpha=1-k;g.fillStyle='#d6fff5';g.fillRect(Math.sin(i*2.4+T)*24,-k*220,2.5,2.5)}g.globalAlpha=1;
  const y=-92+Math.sin(T*1.4)*7;glow(0,y,70,'rgba(94,230,200,.9)',.5);
  const gr=g.createRadialGradient(-6,y-7,2,0,y,24);gr.addColorStop(0,'#fff');gr.addColorStop(.5,'#8ff5df');gr.addColorStop(1,'#1f9d88');g.fillStyle=gr;g.beginPath();g.arc(0,y,24,0,TAU);g.fill();
  g.strokeStyle='rgba(220,255,248,.8)';g.lineWidth=2;
  g.beginPath();g.ellipse(0,y,42,Math.abs(Math.sin(T*.7))*16+3,T*.3,0,TAU);g.stroke();
  g.beginPath();g.ellipse(0,y,54,Math.abs(Math.cos(T*.5))*20+3,-T*.2,0,TAU);g.stroke();
  zlabel(ZONES.plaza.zh,ZONES.plaza.en,-190,'#8ff5df');
}
function drawSpinePillar(){
  g.fillStyle='#1a1d40';ell(0,0,52,52*K);g.fill();g.strokeStyle='#a99bff';g.lineWidth=3;g.stroke();
  glow(0,-110,150,'rgba(169,155,255,.7)',.3);
  const cols=['#ff9db0','#a99bff','#ffc46b','#ffc46b','#7fb8ff','#7fb8ff','#7fb8ff','#7fb8ff','#5ee6c8','#5ee6c8','#5ee6c8'];
  for(let i=0;i<11;i++){const y=-14-i*18,w=40-i*1.7,x=Math.sin(i*.62+.4)*9,pulse=.55+.45*Math.sin(T*2.4-i*.5);
    g.fillStyle='#e8ecff';rr(x-w/2,y-12,w,12,5);g.fill();
    g.globalAlpha=pulse;g.fillStyle=cols[i];rr(x-w/2,y-12,w,12,5);g.fill();g.globalAlpha=1;
    g.fillStyle='rgba(255,255,255,.6)';g.fillRect(x-w/2+4,y-10,w-8,2)}
  g.strokeStyle='rgba(190,180,255,.55)';g.lineWidth=2.5;g.beginPath();g.ellipse(0,-232,120,30,0,0,TAU);g.stroke();
  g.setLineDash([6,14]);g.lineDashOffset=T*20;g.beginPath();g.ellipse(0,-232,140,36,0,0,TAU);g.stroke();g.setLineDash([]);
  zlabel(ZONES.hall.zh,ZONES.hall.en,-282,'#cfc7ff');
}
function drawColumn(h){
  g.fillStyle='rgba(0,0,0,.3)';ell(0,0,16,6);g.fill();
  const gr=g.createLinearGradient(-10,0,10,0);gr.addColorStop(0,'#3d4480');gr.addColorStop(.5,'#8f97d8');gr.addColorStop(1,'#2c3166');
  g.fillStyle=gr;rr(-9,-h,18,h,3);g.fill();g.fillStyle='#b9bff5';rr(-13,-h-8,26,9,3);g.fill();rr(-12,-6,24,7,2);g.fill();
  glow(0,-h-20,22,'#cfc7ff',.5+.3*Math.sin(T*2));
}
function drawPylon(i){
  g.fillStyle='rgba(0,0,0,.3)';ell(0,0,14,5);g.fill();
  g.fillStyle='#4a3d26';g.beginPath();g.moveTo(-10,0);g.lineTo(-6,-64);g.lineTo(6,-64);g.lineTo(10,0);g.closePath();g.fill();
  g.fillStyle='#ffc46b';g.fillRect(-1.5,-58,3,50);glow(0,-74,26,'#ffd691',.6+.3*Math.sin(T*3+i));
  g.fillStyle='#fff3d6';g.beginPath();g.moveTo(0,-86);g.lineTo(7,-74);g.lineTo(0,-62);g.lineTo(-7,-74);g.closePath();g.fill();
}
function drawHolo(){
  g.fillStyle='#2a2314';ell(0,0,46,46*K);g.fill();g.strokeStyle='#ffc46b';g.lineWidth=3;g.stroke();
  const col=g.createLinearGradient(0,-130,0,0);col.addColorStop(0,'rgba(255,196,107,0)');col.addColorStop(1,'rgba(255,196,107,.25)');g.fillStyle=col;g.beginPath();g.moveTo(-40,0);g.lineTo(-30,-130);g.lineTo(30,-130);g.lineTo(40,0);g.closePath();g.fill();
  const s=(Math.sin(T*1.5)+1)/2,hip=-52+s*20,knee=-26+s*4;      // 全息人形做缓慢深蹲
  g.strokeStyle='rgba(255,220,160,'+(.75+.2*Math.sin(T*17))+')';g.lineWidth=4;g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(-8,-4);g.lineTo(-8-s*10,knee);g.lineTo(-4,hip);g.moveTo(8,-4);g.lineTo(8+s*10,knee);g.lineTo(4,hip);
  g.moveTo(0,hip);g.lineTo(0,hip-34);g.moveTo(0,hip-28);g.lineTo(-20,hip-22-s*8);g.moveTo(0,hip-28);g.lineTo(20,hip-22-s*8);g.stroke();
  g.beginPath();g.arc(0,hip-44,8,0,TAU);g.stroke();
  zlabel(ZONES.train.zh,ZONES.train.en,-170,'#ffd691');
}
function drawGate(){
  for(const sx of[-1,1]){g.save();g.translate(sx*92,0);g.fillStyle='rgba(0,0,0,.3)';ell(0,0,18,6);g.fill();
    const gr=g.createLinearGradient(0,-130,0,0);gr.addColorStop(0,'#3b6c7c');gr.addColorStop(1,'#152a38');g.fillStyle=gr;
    g.beginPath();g.moveTo(-14,0);g.lineTo(-8,-130);g.lineTo(8,-130);g.lineTo(14,0);g.closePath();g.fill();g.fillStyle='#8ff5df';g.fillRect(-1.5,-120,3,110);g.restore()}
  g.strokeStyle='rgba(143,245,223,'+(.5+.25*Math.sin(T*2))+')';g.lineWidth=3;g.beginPath();g.ellipse(0,-130,92,46,0,Math.PI,TAU);g.stroke();
  glow(0,-176,30,'#8ff5df',.7);g.textAlign='center';g.font='700 15px '+SERIF;g.fillStyle='#d9fff6';g.fillText('学 院 之 门',0,-150);
}
function drawTree(o){
  const sw=Math.sin(T*.8+o.ph)*2;g.scale(o.s,o.s);g.fillStyle='rgba(0,0,0,.28)';ell(0,0,18,6);g.fill();
  if(o.type===0){g.fillStyle='#22404a';g.fillRect(-3,-28,6,28);
    for(let i=0;i<3;i++){const y=-22-i*20,w=26-i*6;g.fillStyle=['#1f6f6a','#2a8f84','#49c2ab'][i];g.beginPath();g.moveTo(-w+sw*i*.3,y);g.lineTo(sw*(i+1)*.5,y-34);g.lineTo(w+sw*i*.3,y);g.closePath();g.fill()}
    glow(sw*1.5,-96,10,'#d6fff5',.5+.4*Math.sin(T*2+o.ph));
  }else{for(const [dx,h,w,c] of[[-10,34,9,'#5b6fd6'],[2,56,12,'#8f9dff'],[13,28,8,'#6fd6c8']]){g.fillStyle=c;g.globalAlpha=.85;g.beginPath();g.moveTo(dx-w,0);g.lineTo(dx-w*.6,-h*.8);g.lineTo(dx,-h);g.lineTo(dx+w*.6,-h*.8);g.lineTo(dx+w,0);g.closePath();g.fill();
      g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.moveTo(dx,-h);g.lineTo(dx+w*.6,-h*.8);g.lineTo(dx+w,0);g.lineTo(dx,0);g.closePath();g.fill()}g.globalAlpha=1}
}
function drawShard(i){
  if(S.shards.includes(i))return;
  const y=-46+Math.sin(T*2+i)*6,w=Math.abs(Math.cos(T*1.3+i))*11+3;glow(0,y,34,'#c9c0ff',.55);
  g.fillStyle='#efeaff';g.beginPath();g.moveTo(0,y-20);g.lineTo(w,y);g.lineTo(0,y+20);g.lineTo(-w,y);g.closePath();g.fill();
  g.fillStyle='#a99bff';g.beginPath();g.moveTo(0,y-20);g.lineTo(w,y);g.lineTo(0,y+20);g.closePath();g.fill();
}
function drawMarker(h){ // 当前指引标记
  const y=-h-36+Math.sin(T*4)*7;g.fillStyle='#ffc46b';g.beginPath();g.moveTo(0,y+16);g.lineTo(-11,y);g.lineTo(11,y);g.closePath();g.fill();glow(0,y+4,22,'#ffc46b',.5);
}

function objective(){
  if(!S.intro)return HS[0];
  if(S.quiz<0||!hallOK())return HS[2];
  if(!trainOK())return HS[3];
  return null;
}
function guideText(){
  if(!S.intro)return '前往 <b>原力之井</b>，聆听学院缘起';
  if(!hallOK())return '前往 <b>脊骨神经殿堂</b>，完成殿堂试炼';
  if(!trainOK())return '前往 <b>绝地特训场</b>，完成一次特训';
  return '第一阶修习已完成 · 自由探索，收集 <b>知识晶石</b> '+S.shards.length+'/'+SHARDS.length;
}

function draw(){
  Z=zoom();drawSky();drawGround();
  const L=[];
  const hz=ZONES.hall,tz=ZONES.train;
  for(let i=0;i<7;i++){const a=Math.PI*(1.08+i*.84/6);L.push({y:hz.y+Math.sin(a)*185,x:hz.x+Math.cos(a)*185,f:()=>drawColumn(120+(i===3?30:i%2*12))})}
  for(const a of[.22,.78]){const an=Math.PI*a;L.push({y:hz.y+Math.sin(an)*185,x:hz.x+Math.cos(an)*185,f:()=>drawColumn(60)})}
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;L.push({x:tz.x+Math.cos(a)*195,y:tz.y+Math.sin(a)*195,f:()=>drawPylon(i)})}
  L.push({x:900,y:1250,f:drawCore},{x:430,y:620,f:drawSpinePillar},{x:1370,y:620,f:drawHolo},{x:900,y:1690,f:drawGate},{x:1050,y:1110,f:drawMentor});
  DECO.forEach(o=>L.push({x:o.x,y:o.y,f:()=>drawTree(o)}));
  SHARDS.forEach((s,i)=>L.push({x:s.x,y:s.y,f:()=>drawShard(i)}));
  NPCS.forEach(n=>L.push({x:n.x,y:n.y,f:()=>{const p=PATHS[n.path];drawChar(p.c,p.d,n.moving,n.face,T+n.ph,.92,.8);nameTag(n.name,-66,'#b8c9d4',.75)}}));
  if(mode==='play')L.push({x:P.x,y:P.y,f:()=>{const p=PATHS[S.path];glow(0,-24,46,p.c,.22);drawChar(p.c,p.d,P.moving,P.face,T,1,1);nameTag(S.name,-70,'#fff',1)}});
  L.sort((a,b)=>a.y-b.y);
  for(const o of L){const [sx,sy]=w2s(o.x,o.y);if(sx<-260||sx>vw+260||sy<-80||sy>vh+420)continue;upright(o.x,o.y);o.f()}
  // 指引
  const ob=mode==='play'?objective():null;
  if(ob){const [sx,sy]=w2s(ob.x,ob.y);const m=54;
    if(sx>m&&sx<vw-m&&sy-ob.h*Z>90&&sy<vh-70){upright(ob.x,ob.y);drawMarker(ob.h)}
    else{screen();const cxs=vw/2,cys=vh/2,a=Math.atan2(sy-cys,sx-cxs);const ex=clamp(sx,m,vw-m),ey=clamp(sy,130,vh-120);
      g.save();g.translate(ex,ey);glow(0,0,34,'#ffc46b',.45);g.rotate(a);g.fillStyle='#ffc46b';g.beginPath();g.moveTo(16,0);g.lineTo(-9,-11);g.lineTo(-4,0);g.lineTo(-9,11);g.closePath();g.fill();g.restore();
      g.font='600 12px -apple-system,"PingFang SC",sans-serif';g.textAlign='center';g.fillStyle='#ffe2b0';g.fillText(ob.label,clamp(ex,60,vw-60),ey+(ey>vh/2?-26:36))}}
  screen();
}

/* ---------------------------- 更新 ---------------------------- */
const busy=()=>!$('#dlg').hidden||!$('#panel').hidden;
function inIsle(o){const dx=(o.x-ISLE.x)/(ISLE.rx-40),dy=(o.y-ISLE.y)/(ISLE.ry-40),d=Math.hypot(dx,dy);if(d>1){o.x=ISLE.x+dx/d*(ISLE.rx-40);o.y=ISLE.y+dy/d*(ISLE.ry-40);return false}return true}
function update(dt){
  T+=dt;
  if(mode!=='play'){const a=T*.08;cam.x=lerp(cam.x,900+Math.cos(a)*220,.02);cam.y=lerp(cam.y,900+Math.sin(a)*240,.02)}
  else{
    let vx=0,vy=0;
    if(!busy()){
      if(keys.ArrowLeft||keys.a)vx-=1;if(keys.ArrowRight||keys.d)vx+=1;if(keys.ArrowUp||keys.w)vy-=1;if(keys.ArrowDown||keys.s)vy+=1;
      if(vx||vy){P.tx=null;pending=null}
      else if(P.tx!=null){const dx=P.tx-P.x,dy=P.ty-P.y,d=Math.hypot(dx,dy);if(d<8){P.tx=null}else{vx=dx/d;vy=dy/d}}
    }
    const sp=270;const m=Math.hypot(vx,vy);P.moving=m>0;
    if(m>0){P.x+=vx/m*sp*dt;P.y+=vy/m*sp*dt;if(Math.abs(vx)>.15)P.face=vx>0?1:-1;
      for(const o of OBST){const dx=P.x-o.x,dy=P.y-o.y,d=Math.hypot(dx,dy)||1;if(d<o.r){P.x=o.x+dx/d*o.r;P.y=o.y+dy/d*o.r}}
      if(!inIsle(P))P.tx=null;
      if(!hintGone){hintGone=true;setTimeout(()=>$('#hint').style.opacity=0,1500)}
    }
    cam.x=lerp(cam.x,P.x,1-Math.pow(.002,dt));cam.y=lerp(cam.y,P.y-40,1-Math.pow(.002,dt));
    // 靠近交互点
    let best=null,bd=1e9;
    for(const h of HS){if(h.shard!=null&&S.shards.includes(h.shard))continue;const d=Math.hypot(P.x-h.x,P.y-h.y);if(d<h.r&&d<bd){bd=d;best=h}}
    if(best!==near){near=best;const b=$('#act');if(near){b.textContent=near.act;b.hidden=false;b.classList.toggle('amber',near.id==='train')}else b.hidden=true}
    if(pending&&near===pending&&!busy()){const p=pending;pending=null;P.tx=null;interact(p)}
  }
  for(const n of NPCS){
    if(n.tx==null){n.wait-=dt;n.moving=false;if(n.wait<=0){const z=Object.values(ZONES)[Math.floor(Math.random()*3)],a=Math.random()*TAU,d=70+Math.random()*(z.r-40);n.tx=z.x+Math.cos(a)*d;n.ty=z.y+Math.sin(a)*d}}
    else{const dx=n.tx-n.x,dy=n.ty-n.y,d=Math.hypot(dx,dy);if(d<6){n.tx=null;n.wait=3+Math.random()*7}else{n.x+=dx/d*120*dt;n.y+=dy/d*120*dt;n.moving=true;if(Math.abs(dx)>4)n.face=dx>0?1:-1}}
  }
}
let hintGone=false,last=0;
function frame(t){const dt=Math.min(.1,(t-last)/1000||0);last=t;
  // 面板打开或页面不可见时暂停世界渲染（省电；面板内的小游戏有自己的循环）
  if(document.hidden||(!$('#panel').hidden&&!dirty)){requestAnimationFrame(frame);return}
  dirty=false;update(dt);draw();requestAnimationFrame(frame)}
requestAnimationFrame(frame);

/* ---------------------------- 输入 ---------------------------- */
function goTo(h){const dx=P.x-h.x,dy=P.y-h.y,d=Math.hypot(dx,dy)||1;P.tx=h.x+dx/d*h.r*.6;P.ty=h.y+dy/d*h.r*.6;if(h.id==='mentor'||h.id==='core'||h.id==='spine'||h.id==='train'){if(Math.abs(dy)<20&&d>h.r){P.ty=h.y+h.r*.55;P.tx=h.x}}pending=h}
let down=false;
function pointAt(e){
  const [wx,wy]=s2w(e.clientX,e.clientY);
  let hit=null;
  for(const h of HS){if(h.shard!=null&&S.shards.includes(h.shard))continue;const [sx,sy]=w2s(h.x,h.y);
    if(Math.abs(e.clientX-sx)<46*Z+14&&e.clientY<sy+26*Z&&e.clientY>sy-(h.h+30)*Z)hit=h}
  if(hit){if(near===hit){interact(hit);return}goTo(hit);ripple={x:hit.x,y:hit.y,t:T};return}
  const o={x:wx,y:wy};inIsle(o);P.tx=o.x;P.ty=o.y;pending=null;ripple={x:o.x,y:o.y,t:T};
}
cv.addEventListener('pointerdown',e=>{if(mode!=='play'||busy())return;down=true;try{cv.setPointerCapture(e.pointerId)}catch(_){}pointAt(e)});
cv.addEventListener('pointermove',e=>{if(!down||mode!=='play'||busy()||pending)return;const [wx,wy]=s2w(e.clientX,e.clientY);const o={x:wx,y:wy};inIsle(o);P.tx=o.x;P.ty=o.y});
const up=()=>down=false;cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('touchmove',e=>{if(!e.target.closest('#pbody,.screen'))e.preventDefault()},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  if(k==='Escape'&&!$('#panel').hidden)closePanel();
  if((k==='Enter'||k===' '||k==='e')&&!e.repeat){if(!$('#dlg').hidden)nextLine();else if(mode==='play'&&!busy()&&near)interact(near)}
});
window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false});

/* ---------------------------- 界面基础 ---------------------------- */
function hud(){
  const p=PATHS[S.path],r=rankOf(S.xp),nx=RANKS[r+1];
  $('#meDot').textContent=p.k;$('#meDot').style.background=p.c;$('#meNm').textContent=S.name;
  $('#meRk').textContent=RANKS[r].n+' · 修习值 '+S.xp;
  $('#meBar').style.width=(nx?clamp((S.xp-RANKS[r].xp)/(nx.xp-RANKS[r].xp),0,1)*100:100)+'%';
  $('#guide').innerHTML=guideText();
}
function toast(html){const d=document.createElement('div');d.innerHTML=html;$('#toast').appendChild(d);setTimeout(()=>d.remove(),2900)}
function addXP(n,why){
  if(n<=0)return;const r0=rankOf(S.xp);S.xp+=n;save();hud();toast('<b>+'+n+'</b> 修习值 · '+why);
  const r1=rankOf(S.xp);if(r1>r0)setTimeout(()=>rankUp(r1),900);
}
function rankUp(r){const el=document.createElement('div');el.id='rank';el.innerHTML='<div><small>学徒晋阶</small><b>'+RANKS[r].n+'</b></div>';document.body.appendChild(el);setTimeout(()=>el.remove(),3000)}
let dq=[],dDone=null;
function say(lines,done){document.body.classList.add('talk');dq=lines.slice();dDone=done||null;$('#dlg').hidden=false;$('#act').hidden=true;nextLine(true)}
function nextLine(first){
  if(!dq.length){$('#dlg').hidden=true;document.body.classList.remove('talk');if(near)$('#act').hidden=false;const f=dDone;dDone=null;if(f)f();return}
  $('#dtxt').textContent=dq.shift();if(!first){const b=$('#dlg .box');b.style.animation='none';b.offsetWidth;b.style.animation=''}
}
$('#dlg').addEventListener('click',()=>nextLine());
let cleanup=null;
function openPanel(zh,en,html){if(cleanup){cleanup();cleanup=null}$('#pzh').textContent=zh;$('#pen').textContent=en;$('#pbody').innerHTML=html;$('#pbody').scrollTop=0;$('#panel').hidden=false;P.tx=null;pending=null;dirty=true}
function closePanel(){if(cleanup){cleanup();cleanup=null}$('#panel').hidden=true;$('#pbody').innerHTML='';hud();checkGrad()}
$('#px').addEventListener('click',closePanel);
$('#panel').addEventListener('click',e=>{if(e.target.id==='panel')closePanel()});
const on=(sel,fn)=>{const el=$('#pbody').querySelector(sel);if(el)el.addEventListener('click',fn);return el};

function interact(h){
  if(busy())return;
  if(h.id==='core')core();else if(h.id==='mentor')mentor();else if(h.id==='spine')hall();else if(h.id==='train')training();
  else if(h.shard!=null){S.shards.push(h.shard);save();near=null;$('#act').hidden=true;
    openPanel('知识晶石','Knowledge Shard · '+S.shards.length+' / '+SHARDS.length,'<p class="lead" style="font-size:17px;line-height:1.9">'+SHARDS[h.shard].t+'</p><div class="row"><button class="btn" id="ok">收入行囊</button></div>');
    on('#ok',closePanel);addXP(10,'拾得知识晶石')}
}
$('#act').addEventListener('click',()=>{if(near)interact(near)});

/* ---------------------------- 原力广场 ---------------------------- */
function core(){
  if(!S.intro){say([
    S.name+'，你来到了原力之井。学院的一切，从这里开始。',
    '在这座学院里，“原力”不是超能力。它是身体自我调节与适应的潜能。',
    '结构决定功能，神经驱动动作，训练重塑能力——这三句话，是学院的根基。',
    '读懂它们的人，我们称为学徒。现在，看看学院的三条修习之路吧。'
  ],()=>{S.intro=true;save();addXP(20,'聆听学院缘起');corePanel()})}else corePanel();
}
function corePanel(){
  openPanel('原力广场','Force Plaza · 学院缘起',
  '<p class="lead">学院悬浮于静海之上。这里相信：身体是一套可以被读懂的系统。</p>'+
  '<div class="cards">'+
  '<div class="card" style="--c:#a99bff"><h4>知 · 结构</h4><p>骨骼、关节与神经如何构成身体。去 <b>脊骨神经殿堂</b> 认识脊柱。</p></div>'+
  '<div class="card" style="--c:#ffc46b"><h4>行 · 动作</h4><p>身体如何控制、协调与发力。去 <b>绝地特训场</b> 亲身体验。</p></div>'+
  '<div class="card" style="--c:#5ee6c8"><h4>衡 · 整合</h4><p>让结构与动作回到平衡。从一次安静的呼吸开始。</p></div></div>'+
  '<button class="card" id="br" style="--c:#5ee6c8"><h4>静心呼吸'+(S.breath?'<span class="tagok">已完成</span>':'')+'</h4><p>井边的入门功课：跟随光球完成三次缓慢的呼吸。约半分钟。</p></button>'+
  '<div class="row"><button class="btn ghost" id="ask">请教澄一导师</button><button class="btn" id="ok">继续探索</button></div>');
  on('#br',breathing);on('#ask',askPanel);on('#ok',closePanel);
}
function breathing(){
  openPanel('静心呼吸','Centering Breath',
  '<p class="lead">按住光球时<b>缓缓吸气</b>，松开时<b>慢慢呼气</b>。每次吸、呼各保持约 3 秒，完成 3 次。</p>'+
  '<div class="stage"><div id="breath"><i></i><span id="bt">按住</span></div></div>'+
  '<div class="meter"><span>已完成 <b id="bc">0</b> / 3 次</span><span id="bs">用鼻子吸气，肩膀放松</span></div>'+
  '<p class="note">用自己舒服的节奏即可，不要憋气。如感到头晕，请恢复自然呼吸。</p>');
  const el=$('#breath'),ball=el.querySelector('i');let hold=false,lv=0,inOK=false,cnt=0,lt=performance.now(),raf,doneFlag=false;
  const dn=e=>{e.preventDefault();hold=true},upf=()=>{hold=false};
  el.addEventListener('pointerdown',dn);window.addEventListener('pointerup',upf);window.addEventListener('pointercancel',upf);
  const kd=e=>{if(e.key===' '){hold=true}},ku=e=>{if(e.key===' ')hold=false};window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);
  function tick(t){const dt=Math.min(.3,(t-lt)/1000);lt=t;
    lv=clamp(lv+(hold?dt/3:-dt/3),0,1);ball.style.setProperty('--s',1+lv*1.9);
    if(lv>=1)inOK=true;
    if(inOK&&lv<=0){inOK=false;cnt++;$('#bc').textContent=cnt;if(cnt>=3&&!doneFlag){doneFlag=true;finish();return}}
    $('#bt').textContent=hold?(lv>=1?'松开':'吸气'):(lv>0?'呼气':'按住');
    $('#bs').textContent=hold?'让气息沉到腹部和两侧肋骨':(lv>0?'慢慢地、完整地呼出去':'用鼻子吸气，肩膀放松');
    raf=requestAnimationFrame(tick)}
  raf=requestAnimationFrame(tick);
  cleanup=()=>{cancelAnimationFrame(raf);window.removeEventListener('pointerup',upf);window.removeEventListener('pointercancel',upf);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku)};
  function finish(){const first=!S.breath;S.breath=true;save();
    result({c:'#5ee6c8',p:100,big:'静',title:'心已安住',xp:first?20:0,why:'完成静心呼吸',
      tip:'<b>学徒成长提示</b>　缓慢的呼吸能帮助身体从紧张状态中平复下来。膈肌既是主要的呼吸肌，也参与躯干的稳定——在特训场，你会再次遇到它。',
      again:breathing,next:['回到广场',corePanel]})}
}

/* ---------------------------- 脊骨神经殿堂 ---------------------------- */
function spineSVG(){
  let out='',i=0;const N=27;
  const X=t=>70+(t<.24?-13*Math.sin(Math.PI*t/.24):t<.68?17*Math.sin(Math.PI*(t-.24)/.44):t<.9?-12*Math.sin(Math.PI*(t-.68)/.22):12*Math.sin(Math.PI*(t-.9)/.1*.7));
  const seg=(reg,t0,t1,n)=>{let s='<g data-r="'+reg.id+'">';
    for(let j=0;j<n;j++){const t=t0+(t1-t0)*(j+.5)/n,y=18+t*386,x=X(t),ang=Math.atan2(X(t+.01)-X(t-.01),.02*386)*-30;
      const w=20+t*26,h=Math.min(16,(t1-t0)*386/n-3.5);
      s+='<g transform="translate('+x.toFixed(1)+','+y.toFixed(1)+') rotate('+ang.toFixed(1)+')"><rect x="'+(-w/2)+'" y="'+(-h/2)+'" width="'+w+'" height="'+h+'" rx="4" fill="'+reg.c+'"/><rect x="'+(w/2-1)+'" y="-2.5" width="'+(10+t*6)+'" height="5" rx="2.5" fill="'+reg.c+'" opacity=".55"/></g>'}
    return s+'</g>'};
  out+=seg(REGIONS[0],0,.24,7)+seg(REGIONS[1],.24,.68,12)+seg(REGIONS[2],.68,.9,5);
  const sy=18+.9*386,sx=X(.9);
  out+='<g data-r="s"><path d="M'+(sx-24)+' '+(sy+1)+' L'+(sx+24)+' '+(sy+1)+' L'+(sx+20)+' '+(sy+34)+' Q'+(sx+16)+' '+(sy+48)+' '+(sx+12)+' '+(sy+50)+' L'+(sx+2)+' '+(sy+50)+' Z" fill="'+REGIONS[3].c+'"/></g>';
  out+='<g data-r="x"><path d="M'+(sx+3)+' '+(sy+53)+' L'+(sx+13)+' '+(sy+53)+' Q'+(sx+6)+' '+(sy+70)+' '+(sx-6)+' '+(sy+72)+' Z" fill="'+REGIONS[4].c+'"/></g>';
  return '<svg id="spine" viewBox="0 0 150 500" role="img" aria-label="脊柱侧面示意图"><text x="6" y="14" fill="#93a9b8" font-size="9">← 前　　后 →</text>'+out+'</svg>';
}
function hall(){
  openPanel('脊骨神经殿堂','Hall of Spine & Nerve',
  '<p class="lead">脊柱是身体的中轴：支撑体重、保护脊髓，也让躯干得以活动。<b>点击光柱上的每一段</b>，认识它。</p>'+
  '<div class="spinewrap"><div>'+spineSVG()+'</div><div><div class="regs" id="regs">'+REGIONS.map(r=>'<button data-r="'+r.id+'" style="--c:'+r.c+'">'+r.zh+'</button>').join('')+'</div><div id="rinfo"></div></div></div>'+
  '<div class="row"><button class="btn" id="qz"></button><span id="seen" style="font-size:13px;color:var(--dim)"></span></div>'+
  '<p class="note">本殿堂为示意教学。Chiropractic（脊骨神经医学）是关注神经肌肉骨骼系统功能的健康专业；这里的内容不用于自我诊断。</p>');
  const sel=id=>{
    const r=REGIONS.find(x=>x.id===id);
    if(!S.regions.includes(id)){S.regions.push(id);save();addXP(5,'认识'+r.zh)}
    $('#rinfo').innerHTML='<h4 style="color:'+r.c+'">'+r.zh+' <span style="font-size:13px;color:var(--dim);font-family:var(--sans)">'+r.code+'</span></h4><ul>'+r.pts.map(p=>'<li>'+p+'</li>').join('')+'</ul>';
    document.querySelectorAll('#regs button').forEach(b=>{b.classList.toggle('on',b.dataset.r===id);b.classList.toggle('seen',S.regions.includes(b.dataset.r))});
    document.querySelectorAll('#spine>g').forEach(x=>x.classList.toggle('dimmed',x.dataset.r!==id));
    refresh()};
  const refresh=()=>{const n=S.regions.length,ok=n>=3;$('#qz').disabled=!ok;$('#qz').textContent=S.quiz>=0?'再次挑战殿堂试炼':'开始殿堂试炼';
    $('#seen').textContent=ok?(S.quiz>=0?'最佳成绩 '+S.quiz+' / 5':'已认识 '+n+' / 5 段，可以开始'):'先认识至少 3 段（'+n+' / 3）'};
  document.querySelectorAll('#regs button').forEach(b=>b.addEventListener('click',()=>sel(b.dataset.r)));
  document.querySelectorAll('#spine>g').forEach(x=>x.addEventListener('click',()=>sel(x.dataset.r)));
  on('#qz',hallQuiz);
  if(S.regions.length){const id=S.regions[S.regions.length-1];sel(id)}else{$('#rinfo').innerHTML='<p style="color:var(--dim)">从上到下依次是：颈椎、胸椎、腰椎、骶骨、尾骨。选一段开始。</p>';refresh()}
}
function hallQuiz(){
  const qs=QUIZ.slice().sort(()=>Math.random()-.5).slice(0,5);let i=0,score=0;const marks=[];
  const show=()=>{const q=qs[i];
    openPanel('殿堂试炼','Trial of the Hall',
    '<div class="qhead"><span>第 '+(i+1)+' / 5 题</span><span class="pips">'+qs.map((_,j)=>'<i class="'+(j<i?(marks[j]?'ok':'no'):j===i?'cur':'')+'"></i>').join('')+'</span></div>'+
    '<p class="q">'+q.q+'</p><div class="opts" id="opts">'+q.o.map((o,j)=>'<button class="opt" data-i="'+j+'">'+o+'</button>').join('')+'</div><div id="exp"></div>');
    document.querySelectorAll('#opts .opt').forEach(b=>b.addEventListener('click',()=>{
      const c=+b.dataset.i===q.a;marks[i]=c;if(c)score++;$('#opts').classList.add('locked');
      b.classList.add(c?'ok':'no');document.querySelectorAll('#opts .opt')[q.a].classList.add('ok');
      $('#exp').innerHTML='<div class="exp'+(c?'':' bad')+'"><b>'+(c?'正确。':'再想想——')+'</b>'+q.e+'</div><div class="row"><button class="btn" id="nx">'+(i<4?'下一题':'查看结果')+'</button></div>';
      on('#nx',()=>{i++;i<5?show():done()});$('#pbody').scrollTop=9999}))};
  const done=()=>{const best=Math.max(S.quiz,0),gain=Math.max(0,score-best)*10+(S.quiz<0?10:0);S.quiz=Math.max(S.quiz,score);save();const pass=score>=3;
    result({c:'#a99bff',p:score*20,big:score+'/5',title:pass?(score===5?'殿堂全通':'试炼通过'):'尚需修习',xp:gain,why:'殿堂试炼',
      tip:pass?'<b>学徒成长提示</b>　你已掌握脊柱的基本结构。记住这条主线：<b>7 颈 · 12 胸 · 5 腰</b>，前凸与后凸交替，31 对脊神经从椎骨之间穿出。带着它去特训场，看看结构如何变成动作。'
             :'<b>导师的话</b>　不必着急。回到光柱前，把每一段再看一遍——尤其是各段的块数和弯曲方向，然后再来试炼。答对 3 题即可通过。',
      again:hallQuiz,next:pass?['继续探索',closePanel]:['回到光柱',hall]})};
  show();
}

/* ---------------------------- 绝地特训场 ---------------------------- */
function training(){
  openPanel('绝地特训场','Training Ground',
  '<p class="lead">好的动作不靠蛮力，而靠控制。选择一项特训。</p>'+
  '<button class="card" id="t1" style="--c:#ffc46b"><h4>特训一 · 关节的角色'+(S.joint>=4?'<span class="tagok">已通过</span>':'')+'</h4><p>沿着身体自下而上，判断每个关节更需要“灵活”还是“稳定”。6 题。'+(S.joint>=0?'　最佳 '+S.joint+' / 6':'')+'</p></button>'+
  '<div style="height:10px"></div>'+
  '<button class="card" id="t2" style="--c:#ffc46b"><h4>特训二 · 重心控制'+(S.balance>=50?'<span class="tagok">已通过</span>':'')+'</h4><p>在 20 秒的干扰中，把重心光点稳在支撑圈内。体验“小而早”的修正。'+(S.balance>=0?'　最佳 '+S.balance+'%':'')+'</p></button>'+
  '<p class="note">特训为知识与手眼协调体验，不是运动处方。实际训练请在专业人员指导下进行；出现疼痛应立即停止。</p>');
  on('#t1',jointGame);on('#t2',balanceIntro);
}
function figSVG(k){
  const dots=JOINTS.map((j,i)=>j.p.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(i===k?9:4.5)+'" fill="'+(i===k?'#ffc46b':i<k?'#5ee6c8':'#42566a')+'"'+(i===k?' stroke="#fff" stroke-width="2"><animate attributeName="r" values="8;11;8" dur="1.2s" repeatCount="indefinite"/></circle>':'/>')).join('')).join('');
  return '<svg id="fig" viewBox="40 8 120 280"><g stroke="#7f95a8" stroke-width="5" stroke-linecap="round" fill="none"><circle cx="100" cy="30" r="14"/><path d="M100 46V154M72 68H128M72 68L60 118 58 150M128 68L140 118 142 150M84 154H116M84 154L78 212 76 270M116 154L122 212 124 270M76 270H64M124 270H136"/></g>'+dots+'</svg>';
}
function jointGame(){
  let i=0,score=0;const marks=[];
  const show=()=>{const j=JOINTS[i];
    openPanel('关节的角色','Mobility or Stability',
    '<div class="qhead"><span>第 '+(i+1)+' / 6 题 · 自下而上</span><span class="pips">'+JOINTS.map((_,n)=>'<i class="'+(n<i?(marks[n]?'ok':'no'):n===i?'cur':'')+'"></i>').join('')+'</span></div>'+
    '<div class="jwrap"><div>'+figSVG(i)+'</div><div><p class="q">在这个教学模型里，<span style="color:var(--amber)">'+j.zh+'</span> 更需要的是？</p>'+
    '<div class="opts two" id="opts"><button class="opt" data-i="0">灵活性</button><button class="opt" data-i="1">稳定性</button></div></div></div><div id="exp"></div>');
    document.querySelectorAll('#opts .opt').forEach(b=>b.addEventListener('click',()=>{
      const c=+b.dataset.i===j.a;marks[i]=c;if(c)score++;$('#opts').classList.add('locked');b.classList.add(c?'ok':'no');document.querySelectorAll('#opts .opt')[j.a].classList.add('ok');
      $('#exp').innerHTML='<div class="exp'+(c?'':' bad')+'"><b>'+j.zh+' → '+(j.a?'稳定性':'灵活性')+'。</b>'+j.e+'</div><div class="row"><button class="btn amber" id="nx">'+(i<5?'下一个关节':'查看结果')+'</button></div>';
      on('#nx',()=>{i++;i<6?show():done()});$('#pbody').scrollTop=9999}))};
  const done=()=>{const best=Math.max(S.joint,0),gain=Math.max(0,score-best)*10;S.joint=Math.max(S.joint,score);save();const pass=score>=4;
    result({c:'#ffc46b',p:Math.round(score/6*100),big:score+'/6',title:pass?'特训通过':'再练一次',xp:gain,why:'关节的角色',
      tip:'<b>学徒成长提示</b>　踝灵活、膝稳定、髋灵活、腰稳定、胸椎灵活、肩胛稳定——灵活与稳定<b>交替出现</b>。这是一个帮助观察动作的简化教学模型，不是绝对规律：每个关节其实两者都需要，只是侧重不同。某一处该动的不动，相邻的部位往往会被迫代偿。',
      again:jointGame,next:['返回特训场',training]})};
  show();
}
function balanceIntro(){
  openPanel('重心控制','Center of Mass Control',
  '<p class="lead">站立时，身体的重心需要落在<b>支撑面</b>之上。神经系统一刻不停地做着微小修正——这就是平衡。</p>'+
  '<div class="cards"><div class="card" style="--c:#ffc46b"><h4>怎么玩</h4><p>光点代表重心，会被干扰推开。<b>按住圆台并拖动</b>，朝你想让它去的方向用力；电脑也可用方向键。</p></div>'+
  '<div class="card" style="--c:#ffc46b"><h4>目标</h4><p>20 秒内，让光点尽量留在中央的支撑圈里。留在圈内的时间达到 50% 即通过。</p></div></div>'+
  '<div class="row"><button class="btn amber" id="st">开始</button><button class="btn ghost" id="bk">返回</button></div>');
  on('#st',balanceGame);on('#bk',training);
}
function balanceGame(){
  openPanel('重心控制','Center of Mass Control','<div class="stage"><canvas id="bal"></canvas></div><div class="meter"><span>剩余 <b id="bt2">20.0</b> 秒</span><span>圈内 <b id="bi">100</b>%</span></div><p class="note" style="text-align:center;border:0;padding:0">按住并拖动：朝想去的方向用力　·　小幅、提前地修正</p>');
  const c=$('#bal'),x=c.getContext('2d');const size=c.getBoundingClientRect().width||260,d=Math.min(window.devicePixelRatio||1,2.5);c.width=c.height=Math.round(size*d);
  const R=size/2,ring=R*.36;let px=0,py=0,vx=0,vy=0,fx=0,fy=0,t=0,inT=0,lt=performance.now(),raf,ended=false;const ph=[Math.random()*9,Math.random()*9,Math.random()*9,Math.random()*9];
  const setF=e=>{const r=c.getBoundingClientRect();fx=clamp((e.clientX-r.left-R)/R,-1,1);fy=clamp((e.clientY-r.top-R)/R,-1,1)};
  let dn=false;const pd=e=>{e.preventDefault();dn=true;try{c.setPointerCapture(e.pointerId)}catch(_){}setF(e)},pm=e=>{if(dn)setF(e)},pu=()=>{dn=false;fx=fy=0};
  c.addEventListener('pointerdown',pd);c.addEventListener('pointermove',pm);c.addEventListener('pointerup',pu);c.addEventListener('pointercancel',pu);
  function tick(now){const dt=Math.min(.1,(now-lt)/1000);lt=now;t+=dt;
    const A=R*(.55+t*.035);
    let ax=A*(Math.sin(t*.9+ph[0])+.6*Math.sin(t*2.1+ph[1])),ay=A*(Math.cos(t*.75+ph[2])+.6*Math.sin(t*1.8+ph[3]));
    let kx=fx,ky=fy;if(!dn){kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0)}
    ax+=kx*R*2.6;ay+=ky*R*2.6;vx=(vx+ax*dt)*Math.pow(.25,dt);vy=(vy+ay*dt)*Math.pow(.25,dt);px+=vx*dt;py+=vy*dt;
    const m=Math.hypot(px,py);if(m>R-12){px*=(R-12)/m;py*=(R-12)/m;vx*=-.3;vy*=-.3}
    const inside=m<ring;if(inside)inT+=dt;
    x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,size,size);x.translate(R,R);
    x.fillStyle='#1b1a16';x.beginPath();x.arc(0,0,R-2,0,TAU);x.fill();x.strokeStyle='rgba(255,196,107,.5)';x.lineWidth=2;x.stroke();
    x.strokeStyle='rgba(255,255,255,.08)';for(let r=.6;r<1;r+=.2){x.beginPath();x.arc(0,0,R*r,0,TAU);x.stroke()}
    x.fillStyle=inside?'rgba(94,230,200,.18)':'rgba(255,157,176,.14)';x.beginPath();x.arc(0,0,ring,0,TAU);x.fill();x.strokeStyle=inside?'#5ee6c8':'#ff9db0';x.lineWidth=3;x.stroke();
    if(kx||ky){x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=3;x.beginPath();x.moveTo(px,py);x.lineTo(px+kx*34,py+ky*34);x.stroke()}
    const gr=x.createRadialGradient(px,py,0,px,py,26);gr.addColorStop(0,'#fff');gr.addColorStop(.35,'#ffd691');gr.addColorStop(1,'rgba(255,196,107,0)');x.fillStyle=gr;x.beginPath();x.arc(px,py,26,0,TAU);x.fill();
    $('#bt2').textContent=Math.max(0,20-t).toFixed(1);$('#bi').textContent=Math.round(inT/Math.max(t,.01)*100);
    if(t>=20){ended=true;finish();return}raf=requestAnimationFrame(tick)}
  raf=requestAnimationFrame(tick);cleanup=()=>cancelAnimationFrame(raf);
  function finish(){const pct=Math.round(inT/20*100),first=S.balance<50,pass=pct>=50;const gain=pass&&first?40:(S.balance<0?10:0);S.balance=Math.max(S.balance,pct);save();
    result({c:'#ffc46b',p:pct,big:pct+'%',title:pass?'重心在握':'再稳一些',xp:gain,why:'重心控制',
      tip:pass?'<b>学徒成长提示</b>　你大概已经发现：等光点冲出去再猛拉，往往会来回过冲；<b>小幅、提前的修正</b>最省力。人体的平衡也是如此——它依靠视觉、前庭和本体感觉持续地做微调。'
             :'<b>导师的话</b>　不要追着光点跑。看它<b>将要</b>去的方向，提前给一点点相反的力，然后松手。再试一次。',
      again:balanceGame,next:['返回特训场',training]})}
}

/* ---------------------------- 结果 / 结业 ---------------------------- */
function result(o){
  openPanel('修习反馈','Feedback',
  '<div class="result"><div class="ring" style="--c:'+o.c+';--p:'+o.p+'"><b>'+o.big+'</b></div><h3>'+o.title+'</h3>'+
  (o.xp>0?'<div class="gain">+'+o.xp+' 修习值</div>':'<div class="gain" style="color:var(--dim);background:var(--soft)">已记录本次修习</div>')+
  '<div class="tip">'+o.tip+'</div><div class="row"><button class="btn ghost" id="ag">再来一次</button><button class="btn" id="nx">'+o.next[0]+'</button></div></div>');
  on('#ag',o.again);on('#nx',o.next[1]);if(o.xp>0)addXP(o.xp,o.why);
}
function checkGrad(){
  if(S.grad||!S.intro||!hallOK()||!trainOK()||busy())return;
  S.grad=true;save();
  say(['做得好，'+S.name+'。广场、殿堂、特训场——学院的第一阶，你已走完。','知其结构，行其动作，衡其整体。这只是开始。'],()=>{
    openPanel('第一阶修习完成','Stage One Complete',
    '<div class="result"><div class="ring" style="--c:#5ee6c8;--p:100"><b>'+PATHS[S.path].k+'</b></div><h3>'+S.name+' · '+RANKS[rankOf(S.xp)].n+'</h3>'+
    '<div class="gain">修习值 '+S.xp+'</div><div class="tip"><b>你已掌握</b><br>· 学院的根基：结构决定功能，神经驱动动作，训练重塑能力<br>· 脊柱的分段、弯曲与脊神经<br>· 灵活与稳定、重心与支撑面<br><br><b>接下来</b>　学院各处还散落着 '+(SHARDS.length-S.shards.length)+' 枚知识晶石；你也可以随时向澄一导师请教，或回去刷新试炼成绩。</div>'+
    '<div class="row"><button class="btn" id="ok">继续探索学院</button></div></div>');on('#ok',closePanel);addXP(30,'完成第一阶修习')});
}

/* ---------------------------- 导师 ---------------------------- */
function mentor(){
  if(!S.met){S.met=true;save();say(['我是澄一，学院的引路人。','关于身体、脊柱与动作，你有什么想问的，尽管开口。'],askPanel)}else askPanel();
}
function nextStepText(){
  if(!S.intro)return '先去广场中央的原力之井吧，学院的缘起在那里。';
  if(!hallOK())return '沿着西北方向的光路走，去脊骨神经殿堂，认识脊柱并完成殿堂试炼。';
  if(!trainOK())return '东北方向是绝地特训场。去完成一项特训，把知识变成身体的感觉。';
  return S.shards.length<SHARDS.length?'第一阶你已完成。学院里还有 '+(SHARDS.length-S.shards.length)+' 枚知识晶石等你发现——试试岛的边缘和最北端。':'你已走遍学院。新的殿堂正在建造中，敬请期待第二阶段。';
}
function askPanel(){
  openPanel('澄一导师','Mentor · 预设知识引导',
  '<div id="ans"><div class="sage">澄</div><div class="a"><div class="qq">导师</div>选一个问题，或在下方输入你想了解的内容。</div></div>'+
  '<form class="ask" id="askf"><input id="aski" type="text" placeholder="例如：椎间盘、核心、灵活性…" autocomplete="off" enterkeyhint="send"><button class="btn sm" type="submit">请教</button></form>'+
  '<div class="chips" id="chips"><button data-i="-1">我接下来该去哪？</button>'+QA.map((q,i)=>'<button data-i="'+i+'">'+q.q+'</button>').join('')+'</div>'+
  '<p class="note">当前版本的导师基于预设知识库回答，并非实时 AI；内容仅用于健康教育。</p>');
  const answer=(q,a)=>{$('#ans .a').innerHTML='<div class="qq">'+q.replace(/[<>&]/g,'')+'</div>'+a;$('#pbody').scrollTop=0};
  document.querySelectorAll('#chips button').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;i<0?answer('我接下来该去哪？',nextStepText()):answer(QA[i].q,QA[i].a)}));
  $('#askf').addEventListener('submit',e=>{e.preventDefault();const v=$('#aski').value.trim();if(!v)return;const low=v.toLowerCase();
    if(/去哪|下一步|接下来|做什么|怎么玩/.test(low)){answer(v,nextStepText())}
    else{let best=null,bs=0;for(const q of QA){let s=0;for(const k of q.k)if(low.includes(k))s+=k.length;if(s>bs){bs=s;best=q}}
      answer(v,best?best.a:'这个问题，我的藏书里还没有答案。你可以换个说法，或从上面的问题里选一个。随着学院扩建，我能回答的会越来越多。')}
    $('#aski').value='';$('#aski').blur()});
  // iOS / 微信：键盘收起后页面可能停在偏移位置，拉回原位
  $('#aski').addEventListener('blur',()=>setTimeout(()=>{window.scrollTo(0,0);resize()},120));
}
$('#bMentor').addEventListener('click',()=>{if(!busy())askPanel()});

/* ---------------------------- 地图 ---------------------------- */
function mapPanel(){
  const row=(h,z,g1,st)=>'<div class="zone" style="--c:'+z.c+'"><div class="g">'+g1+'</div><div class="t"><b>'+z.zh+'</b><span>'+st+'</span></div><button class="btn ghost sm" data-go="'+h+'">前往</button></div>';
  openPanel('学院地图','Academy Map',
  row(0,ZONES.plaza,'原',(S.intro?'已聆听缘起':'尚未聆听缘起')+' · '+(S.breath?'已完成静心呼吸':'静心呼吸未完成'))+
  row(2,ZONES.hall,'脊','已认识 '+S.regions.length+' / 5 段 · '+(S.quiz<0?'试炼未开始':'试炼最佳 '+S.quiz+' / 5'+(hallOK()?' ✓':'')))+
  row(3,ZONES.train,'训',(S.joint<0?'关节的角色 未开始':'关节的角色 '+S.joint+' / 6')+' · '+(S.balance<0?'重心控制 未开始':'重心控制 '+S.balance+'%'))+
  '<div class="zone" style="--c:#c9c0ff"><div class="g">晶</div><div class="t"><b>知识晶石</b><span>已拾得 '+S.shards.length+' / '+SHARDS.length+' · 散落在学院各处</span></div></div>'+
  '<p class="note">身边走动的其他学徒是模拟角色，用于营造同修氛围；当前版本没有真实的多人联机。</p>'+
  '<div class="row"><button class="btn ghost sm" id="rs">重置全部进度</button></div>');
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{const h=HS[+b.dataset.go];closePanel();goTo(h);pending=null;P.ty=h.y+h.r*.6;P.tx=h.x}));
  let armed=false;on('#rs',e=>{if(!armed){armed=true;e.target.textContent='再点一次确认重置';return}try{localStorage.removeItem('jva_v1')}catch(_){}location.reload()});
}
$('#bMap').addEventListener('click',()=>{if(!busy())mapPanel()});

/* ---------------------------- 开场流程 ---------------------------- */
let pick=S.path,pname=NAMES[Math.floor(Math.random()*NAMES.length)];
function buildPaths(){
  $('#paths').innerHTML=PATHS.map((p,i)=>'<button class="path'+(i===pick?' on':'')+'" data-i="'+i+'" style="--c:'+p.c+'"><canvas width="168" height="192"></canvas><b>'+p.k+'</b><span>'+'<em>'+p.en+'</em><br>'+p.desc+'</span></button>').join('');
  document.querySelectorAll('.path').forEach(b=>{b.addEventListener('click',()=>{pick=+b.dataset.i;document.querySelectorAll('.path').forEach(x=>x.classList.toggle('on',x===b))})});
  $('#nm').textContent=pname;
}
(function avatarLoop(){ // 选择页上的小人预览
  if(mode==='choose'){document.querySelectorAll('.path canvas').forEach((c,i)=>{const x=c.getContext('2d'),p=PATHS[i];x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,168,192);
    x.setTransform(2.6,0,0,2.6,84,172);g=x;try{drawChar(p.c,p.d,i===pick,1,T,1,1)}finally{g=G0}})}
  if(mode!=='play')requestAnimationFrame(avatarLoop)})();
function start(){
  mode='play';$('#title').hidden=true;$('#choose').hidden=true;$('#hud').hidden=false;hud();
  cam.x=P.x;cam.y=P.y-200;
  if(!storeOK)setTimeout(()=>toast('当前浏览器无法保存进度'+(WX?'，可改用 Safari 打开':'（可能处于无痕模式）')),2500);
}
$('#go').addEventListener('click',()=>{$('#title').hidden=true;$('#choose').hidden=false;mode='choose';buildPaths()});
$('#reroll').addEventListener('click',()=>{let n;do{n=NAMES[Math.floor(Math.random()*NAMES.length)]}while(n===pname);pname=n;$('#nm').textContent=n});
$('#enter').addEventListener('click',()=>{
  S=Object.assign({},DEF,{started:true,name:pname,path:pick,regions:[],shards:[]});save();start();
  P.tx=900;P.ty=1570;
  setTimeout(()=>say(['欢迎，'+S.name+'。你已穿过学院之门。','我是澄一，学院的引路人。点击地面即可行走；靠近发光的地方，就能与之互动。','沿着光路向前，到广场中央的原力之井来。我在井边等你。']),700);
});
if(S.started&&S.name){$('#cont').hidden=false;$('#cont').textContent='继续修习 · '+S.name;$('#go').textContent='以新学徒进入';
  $('#cont').addEventListener('click',()=>{P.x=900;P.y=1420;start();toast('欢迎回来，'+S.name)})}

/* ---------------------------- 1.0.1：微信与兼容处理 ---------------------------- */
const WX=/MicroMessenger/i.test(navigator.userAgent);
if(WX){
  const IOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
  const tip=document.createElement('div');tip.id='wx';
  tip.innerHTML='你正在微信中访问，可直接体验。<br>如遇画面异常、无法操作或进度丢失：点右上角 <b>···</b> → <b>'+(IOS?'在 Safari 中打开':'在浏览器打开')+'</b>。';
  $('#title .fine').before(tip);
  // 安卓微信会按系统设置放大网页字体，导致布局错位：固定为 100%
  const fix=()=>{try{WeixinJSBridge.invoke('setFontSizeCallback',{fontSize:0});WeixinJSBridge.on('menu:setfont',()=>WeixinJSBridge.invoke('setFontSizeCallback',{fontSize:0}))}catch(e){}};
  if(typeof WeixinJSBridge==='object')fix();else document.addEventListener('WeixinJSBridgeReady',fix,false);
}
$('#title .fine').firstChild.textContent='JediHealth · 绝地虚拟学院 '+VERSION;
