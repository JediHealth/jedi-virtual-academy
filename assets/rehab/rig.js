'use strict';
/* =====================================================================
   康复馆 · 人体骨架与渲染器
   - 姿态（pose）只用解剖学通道描述：角度单位为“度”，与画法无关。
   - 这里先在 3D 空间里解出骨架，再正交投影画到 Canvas 2D。
   - 将来升级三维：保留 solve() 的通道定义，把 draw() 换成 3D 模型驱动即可，
     motions.js 里的动作数据不需要改。
   坐标：x = 人物的左侧(+)，y = 向上，z = 人物的前方。人物的右侧 = -x。
   姿态通道：
     flex  颈屈(+)/伸(-)      lat  向左侧屈(+)/向右(-)     rot  向左旋转(+)/向右(-)
     tr    头颈前后平移：后缩(+)/前伸(-)，范围约 -1..1（头保持水平）
     nod   仅上颈椎点头(+)/仰头(-)
     shL/shR  肩带上提(+)/下沉(-)，范围约 -1..1
     tLat/tRot/tFlex  躯干侧弯(向左+)/旋转(向左+)/前屈(+)
   ===================================================================== */
const Rig=(function(){
const D=Math.PI/180,TAU=Math.PI*2;
const rx=(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return[p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c]};
const ry=(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return[p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c]};
const rz=(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return[p[0]*c+p[1]*s,-p[0]*s+p[1]*c,p[2]]};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.sqrt(dot(a,a)),nrm=a=>{const l=len(a)||1;return mul(a,1/l)};
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const BASE={flex:0,lat:0,rot:0,tr:0,nod:0,shL:0,shR:0,tLat:0,tRot:0,tFlex:0};
const UP=20,FORE=18.5;                       // 上臂、前臂长度
const COL={skin:'#f1d2b6',skinD:'#d9b294',hair:'#262d4a',shirt:'#3f93a3',shirtD:'#2f7482',pants:'#2e3d5c',chair:'#5a6884',eye:'#1c2236'};

/* 解算骨架：返回各关节与锚点的 3D 位置 */
function solve(pose,hands){
  const p=Object.assign({},BASE,pose||{});
  const T=q=>rz(ry(rx(q,p.tFlex*D),p.tRot*D),p.tLat*D);
  const sh=s=>{const e=s>0?p.shL:p.shR;return T([s*(15.5-Math.max(e,0)*1.6),41+(e>0?e*5.2:e*2.6),0])};
  const c7=T([0,45,-1]);
  const nv=T(rz(rx([0,8.2,0],(12-p.tr*23+p.flex*.45)*D),p.lat*.5*D));
  const c1=add(c7,nv);
  const H=q=>T(rz(ry(rx(q,(p.flex+p.nod)*D),p.rot*D),p.lat*D));
  const hc=add(c1,H([0,8.4,2.3]));
  const hp=q=>add(hc,H(q));
  const K={p,T,H,hp,c7,c1,hc,shL:sh(1),shR:sh(-1),
    hipL:[8.5,2,0],hipR:[-8.5,2,0],kneeL:[9.5,1,36],kneeR:[-9.5,1,36],ankL:[9.5,-38,36],ankR:[-9.5,-38,36]};
  K.a={head:hc,forehead:hp([0,4,10.4]),occiput:hp([0,1,-11]),headTop:hp([0,11.6,-1]),sideL:hp([10.4,2,0]),sideR:hp([-10.4,2,0]),
    cheekL:hp([8.4,-3,6.4]),cheekR:hp([-8.4,-3,6.4]),nose:hp([0,-2.6,12.6]),chin:hp([0,-11.8,7]),eye:hp([0,.5,10.2]),
    shoulderL:K.shL,shoulderR:K.shR,neck:add(c7,mul(nv,.55)),c7:c7,
    neckSideL:add(add(c7,mul(nv,.8)),T([3.4,0,-.5])),neckSideR:add(add(c7,mul(nv,.8)),T([-3.4,0,-.5])),
    scapL:T([8.5,39.5,-5.5]),scapR:T([-8.5,39.5,-5.5]),subocc:add(c1,H([0,1.5,-3.5]))};
  // 手的目标点（world）与肘部朝向提示
  const tgt=(name,s)=>{switch(name){
    case'seat':return{t:[s*19.5,1,1],pole:[s*.5,0,-1]};
    case'forehead':return{t:hp([s*1.5,4,11.6]),pole:[s*1,-.8,.4]};
    case'occiput':return{t:hp([s*3.2,1,-11.8]),pole:[s*1,.15,-.3]};
    case'sideSame':return{t:hp([s*11,2.5,0]),pole:[s*1,-.6,.3]};
    case'cheekSame':return{t:hp([s*9.4,-2.5,6.8]),pole:[s*1,-.8,.5]};
    case'overTop':return{t:hp([-s*4,11.6,.5]),pole:[s*.7,1,.35]};
    case'backTop':return{t:hp([-s*2,10.6,-5]),pole:[s*.8,.9,.1]};
    default:return{t:[s*10,4.5,25],pole:[s*.7,-.4,-1]}}};
  const arm=(s,spec)=>{const S=s>0?K.shL:K.shR;let A=tgt(spec.a,s),hand=A.t,pole=A.pole;
    if(spec.b&&spec.k>0){const B=tgt(spec.b,s);hand=mix(A.t,B.t,spec.k);pole=mix(A.pole,B.pole,spec.k)}
    let v=sub(hand,S),d=len(v);const max=UP+FORE-.2;if(d>max){hand=add(S,mul(v,max/d));v=sub(hand,S);d=max}
    const dir=nrm(v),a=(UP*UP-FORE*FORE+d*d)/(2*d),h=Math.sqrt(Math.max(0,UP*UP-a*a));
    const pp=nrm(sub(pole,mul(dir,dot(pole,dir))));return{s:S,e:add(add(S,mul(dir,a)),mul(pp,h)),h:hand}};
  const hd=hands||{};K.armL=arm(1,hd.L||{a:'rest'});K.armR=arm(-1,hd.R||{a:'rest'});
  return K;
}

/* 绘制。opt：{view 度, sc 像素/单位, cx, cy, mono 颜色(虚影), hl:[{id,a}], arrows:[...], guides:{gaze,plumb}, ghostHead:[x,y,z], mark:{at,label}, t 秒} */
function draw(g,K,opt){
  const v=(opt.view||0)*D,sc=opt.sc,cx=opt.cx,cy=opt.cy,mono=opt.mono||null,t=opt.t||0;
  const C=q=>{const r=ry(q,v);return[cx+r[0]*sc,cy-r[1]*sc,r[2]]};
  const col=c=>mono||c;
  const seg=(a,b,w,c)=>{const A=C(a),B=C(b);g.strokeStyle=col(c);g.lineWidth=w*sc;g.lineCap='round';g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke()};
  const dotc=(a,r,c)=>{const A=C(a);g.fillStyle=col(c);g.beginPath();g.arc(A[0],A[1],r*sc,0,TAU);g.fill()};
  const items=[],labels=[];
  const z=q=>C(q)[2];
  if(!mono){ // 椅子
    items.push({d:-99,f:()=>{g.strokeStyle=COL.chair;g.lineCap='round';g.lineWidth=4*sc;g.beginPath();g.moveTo(cx-17*sc,cy+2.5*sc);g.lineTo(cx+17*sc,cy+2.5*sc);g.stroke();
      g.lineWidth=2.6*sc;for(const s of[-1,1]){g.beginPath();g.moveTo(cx+s*13*sc,cy+4*sc);g.lineTo(cx+s*14.5*sc,cy+44*sc);g.stroke()}}});
  }
  // 腿
  for(const s of['L','R'])items.push({d:(z(K['hip'+s])+z(K['knee'+s]))/2-.5,f:()=>{seg(K['hip'+s],K['knee'+s],9.5,COL.pants);seg(K['knee'+s],K['ank'+s],7.5,COL.pants)}});
  // 躯干
  items.push({d:0,f:()=>{
    seg(K.hipL,K.hipR,10,COL.pants);
    const P=[K.shL,K.shR,K.hipR,K.hipL].map(C);g.fillStyle=col(COL.shirt);g.strokeStyle=col(COL.shirt);g.lineWidth=10*sc;g.lineJoin='round';
    g.beginPath();g.moveTo(P[0][0],P[0][1]);for(let i=1;i<4;i++)g.lineTo(P[i][0],P[i][1]);g.closePath();g.fill();g.stroke();
    const nb=add(K.c7,[0,1.5,0]);seg(nb,K.shL,7.5,COL.shirt);seg(nb,K.shR,7.5,COL.shirt);
  }});
  // 颈
  items.push({d:z(K.a.neck)-.2,f:()=>{seg(add(K.c7,[0,-1,0]),add(K.c1,mul(sub(K.hc,K.c1),.4)),8.6,COL.skin);
    for(const h of(opt.hl||[]))if(h.id==='neck'&&!mono){g.globalAlpha=h.a*(.45+.25*Math.sin(t*5));seg(K.c7,K.c1,8.4,'#ffc46b');g.globalAlpha=1}}});
  // 肌肉高亮带
  if(!mono)for(const h of(opt.hl||[])){
    const band=(pts,label)=>items.push({d:Math.max.apply(null,pts.map(z))+1.2,f:()=>{
      const P=pts.map(C);g.lineCap='round';g.lineJoin='round';
      g.globalAlpha=h.a*(.28+.12*Math.sin(t*4));g.strokeStyle='#ff9d6b';g.lineWidth=7.5*sc;g.beginPath();g.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++)g.lineTo(P[i][0],P[i][1]);g.stroke();
      g.globalAlpha=h.a*.95;g.strokeStyle='#ffd0a0';g.lineWidth=2.2*sc;g.setLineDash([sc*2.2,sc*2.2]);g.lineDashOffset=-t*sc*5;g.stroke();g.setLineDash([]);g.globalAlpha=1;
      if(label)labels.push(()=>{const m=P[P.length-1];txt(label,m[0]+(m[0]<cx?-8:8),m[1]-12,'#ffd0a0',m[0]<cx?'right':'left',h.a)})}});
    if(h.id==='utR')band([K.a.neckSideR,add(K.shR,[1.5,2.6,0])],'上斜方肌');
    if(h.id==='utL')band([K.a.neckSideL,add(K.shL,[-1.5,2.6,0])],'上斜方肌');
    if(h.id==='lsR')band([add(K.a.neckSideR,[0,0,-1.5]),K.a.scapR],'肩胛提肌');
    if(h.id==='lsL')band([add(K.a.neckSideL,[0,0,-1.5]),K.a.scapL],'肩胛提肌');
    if(h.id==='subocc')items.push({d:z(K.hc)+20,f:()=>{const A=C(K.a.subocc);g.globalAlpha=h.a*(.35+.15*Math.sin(t*4));g.fillStyle='#ff9d6b';g.beginPath();g.arc(A[0],A[1],2.6*sc,0,TAU);g.fill();g.globalAlpha=1}});
  }
  // 手臂
  for(const s of['L','R']){const A=K['arm'+s];items.push({d:Math.max(z(A.e),z(A.h))+.3,f:()=>{dotc(A.s,4.9,COL.shirt);seg(A.s,A.e,6.6,COL.shirt);seg(A.e,A.h,5.2,COL.skin);dotc(A.h,3.5,COL.skin)}})}
  // 头
  items.push({d:z(K.hc),f:()=>{
    const hp=K.hp,ear=s=>{const e=hp([s*9.7,-1,-.6]);return{e,front:z(e)>z(K.hc)+3}};
    const eL=ear(1),eR=ear(-1);
    for(const e of[eL,eR])if(!e.front)dotc(e.e,2.3,COL.skinD);
    dotc(hp([0,2.3,-2.3]),10.9,COL.hair);
    const cr=hp([0,-.6,.9]),jw=hp([0,-5.6,3.3]);dotc(cr,9.6,COL.skin);seg(cr,jw,15,COL.skin);dotc(jw,7.6,COL.skin);
    for(const e of[eL,eR])if(e.front)dotc(e.e,2.5,COL.skinD);
    if(mono)return;
    const vis=q=>{const n=ry(K.H(q),v);return n[2]/len(q)};
    for(const s of[-1,1]){const q=[s*3.5,.5,9.6];if(vis(q)>.12)dotc(hp(q),1.15,COL.eye)}
    if(vis([0,-2,10])>-.25)seg(hp([0,-.6,10.2]),hp([0,-3,12.4]),1.5,COL.skinD);
    if(vis([0,-7,10])>.2)seg(hp([-2,-7.4,10.1]),hp([2,-7.4,10.1]),1,'#b8846c');
  }});
  items.sort((a,b)=>a.d-b.d);for(const it of items)it.f();
  if(mono)return;
  function txt(s,x,y,c,al,a){g.font='600 '+Math.round(11.5)+'px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';g.textAlign=al||'center';g.globalAlpha=(a==null?1:a);
    if(opt.W){const w=g.measureText(s).width,L=g.textAlign==='left'?x:g.textAlign==='right'?x-w:x-w/2;if(L<4)x+=4-L;else if(L+w>opt.W-4)x-=L+w-(opt.W-4)}
    g.lineWidth=3.5;g.strokeStyle='rgba(8,14,28,.85)';g.strokeText(s,x,y);g.fillStyle=c;g.fillText(s,x,y);g.globalAlpha=1}
  // 参考线
  const G=opt.guides||{};
  if(G.plumb){const A=C([0,30,0]),B=C([0,84,0]);g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;g.setLineDash([4,5]);g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke();g.setLineDash([])}
  if(G.gaze){const A=C(K.a.eye),B=C(K.hp([0,.5,24]));g.strokeStyle='rgba(94,230,200,.85)';g.lineWidth=1.6;g.setLineDash([5,4]);g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke();g.setLineDash([]);txt('视线',B[0],B[1]-6,'#8ff5df','center')}
  if(opt.ghostHead){const A=C(opt.ghostHead);g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1.3;g.setLineDash([3,4]);g.beginPath();g.arc(A[0],A[1],10.4*sc,0,TAU);g.stroke();g.setLineDash([])}
  // 箭头
  for(const a of(opt.arrows||[])){const base=K.a[a.at];if(!base)continue;const dir=nrm(a.dir),pulse=a.len*(.86+.14*Math.sin(t*6));
    const off=a.off?add(base,a.off):base;const p0=a.mode==='in'?add(off,mul(dir,a.len+2)):off,p1=a.mode==='in'?add(off,mul(dir,a.len+2-pulse)):add(off,mul(dir,pulse));
    const A=C(p0),B=C(p1),c=a.c||'#5ee6c8',al=a.a==null?1:a.a;const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy);if(L<4)continue;
    g.globalAlpha=al;g.strokeStyle='rgba(8,14,28,.8)';g.lineWidth=6.5;g.lineCap='round';g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke();
    g.strokeStyle=c;g.lineWidth=3.6;g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke();
    const ux=dx/L,uy=dy/L;g.fillStyle=c;g.beginPath();g.moveTo(B[0]+ux*7,B[1]+uy*7);g.lineTo(B[0]-ux*5-uy*6.5,B[1]-uy*5+ux*6.5);g.lineTo(B[0]-ux*5+uy*6.5,B[1]-uy*5-ux*6.5);g.closePath();g.fill();g.globalAlpha=1;
    if(a.label)labels.push(()=>{const lp=a.lp||'end';let px,py,al2='center';
      if(lp==='mid'){px=(A[0]+B[0])/2;py=(A[1]+B[1])/2-9}
      else{const e=lp==='start'?A:B,k=lp==='start'?-1:1;px=e[0]+ux*k*13;py=e[1]+uy*k*15+4;al2=ux*k>.5?'left':ux*k<-.5?'right':'center'}
      txt(a.label,px+(a.lx||0),py+(a.ly||0),c,al2,al)})}
  for(const f of labels)f();
  // 错误标记
  if(opt.mark&&K.a[opt.mark.at]){const A=C(K.a[opt.mark.at]),r=(opt.mark.r||7)*sc*(1+.08*Math.sin(t*7));g.globalAlpha=opt.mark.a==null?1:opt.mark.a;g.strokeStyle='#ff6b81';g.lineWidth=2.6;g.beginPath();g.arc(A[0],A[1],r,0,TAU);g.stroke();g.globalAlpha=1}
}
return{solve,draw,BASE};
})();
