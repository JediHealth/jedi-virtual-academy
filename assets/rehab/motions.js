'use strict';
/* =====================================================================
   康复馆 · 动作数据（只描述“身体怎么动”，不含文字知识与剂量）
   每个动作：frame（取景）+ variants（标准动作 / 方向 / 常见错误）。
   每个 variant 是一串关键帧 keys：
     t     过渡到这一帧用的秒数      hold  停留秒数（演示用，已比真实保持时间缩短）
     pose  姿态通道（见 rig.js 顶部说明，未写的通道为 0）
     hands 手的位置：rest 放腿上 / seat 抓椅边 / forehead / occiput / sideSame / cheekSame / overTop / backTop
     cue   这一步显示的文字提示     holdCue 停留时改显示的提示
     arrows 箭头  hl 高亮  peak:true 表示“动作到位”的那一帧（用作正确位置虚影）
   error:true 的 variant 是错误示范；ref 指定与哪个标准动作对比；mark 圈出出错部位。
   ===================================================================== */
const REHAB_MOTIONS=(function(){
const J='#5ee6c8',A='#ffc46b',R='#ff6b81';
const FRONT={view:0,sc:3.9,cx:.5,cy:.94},SIDE={view:90,sc:3.9,cx:.42,cy:.94};

/* ---------- 1 下颌后缩（侧面） ---------- */
const crFrame={view:90,sc:5.4,cx:.44,cy:1.33};
const crStart={t:.01,hold:1.3,pose:{tr:-.6},cue:'起始位：坐直，眼睛平视前方'};
const crBack={t:1.5,hold:.9,pose:{tr:-.6},cue:'放松，回到起始位'};
const chin={frame:crFrame,guides:{gaze:1,plumb:1},ghostStart:true,variants:{
  main:{label:'标准动作',keys:[crStart,
    {t:1.7,hold:2.2,pose:{tr:.75},cue:'下巴轻轻后收，头沿水平方向向后滑',holdCue:'保持：不低头、不仰头、不耸肩',peak:true,hl:['subocc'],
     arrows:[{at:'chin',dir:[0,0,-1],len:8,off:[0,-3.5,0],c:J,label:'水平向后',lp:'mid',ly:24}]},crBack]},
  'err-nod':{error:true,label:'变成低头',mark:{at:'chin',r:6},keys:[crStart,
    {t:1.7,hold:2.2,pose:{tr:-.35,flex:24},cue:'错误：下巴朝胸口低下去——这是颈椎屈曲，不是后缩',peak:true,
     arrows:[{at:'chin',dir:[0,-1,-.5],len:7,c:R}]},crBack]},
  'err-ext':{error:true,label:'变成仰头',mark:{at:'chin',r:6},keys:[crStart,
    {t:1.7,hold:2.2,pose:{tr:.6,nod:-20},cue:'错误：为了后缩而抬下巴——变成上颈椎伸展',peak:true,
     arrows:[{at:'chin',dir:[0,1,.4],len:6,c:R}]},crBack]},
  'err-shrug':{error:true,label:'耸肩 / 夹肩过度',mark:{at:'shoulderR',r:7},keys:[crStart,
    {t:1.7,hold:2.2,pose:{tr:.7,shL:.95,shR:.95},cue:'错误：肩膀跟着耸起、后夹——肩胛带应自然放松',peak:true,
     arrows:[{at:'shoulderR',dir:[0,1,0],len:6,off:[0,3,0],c:R}]},crBack]}
}};

/* ---------- 2 颈椎多方向等长（头不动） ---------- */
const isoKeys=(hands,arrows,cueOn,cuePush,extra)=>{const E=extra||{};return[
  {t:.01,hold:1,cue:'起始位：坐直，头在中立位'},
  {t:1.1,hold:.6,hands:hands,cue:cueOn},
  {t:.5,hold:3.2,hands:hands,pose:E.pose||{},cue:E.cue||cuePush,holdCue:E.holdCue||'轻轻顶住，头不动；肩膀放松，正常呼吸',peak:true,hl:E.pose?[]:['neck'],arrows:arrows},
  {t:.6,hold:.5,hands:hands,cue:'放松'},
  {t:1,hold:.5,cue:'还原'}]};
const push=(dir,label,o)=>Object.assign({at:'head',dir:dir,len:9,c:J,label:label,lp:'mid'},o||{});
const resist=(at,dir,label,o)=>Object.assign({at:at,dir:dir,len:10,mode:'in',c:A,label:label,lp:'start',off:[dir[0]*4,0,dir[2]*4]},o||{});
const side=s=>{const n=s>0?'L':'R',zh=s>0?'左':'右',h={};h[n]='sideSame';
  return{label:'向'+zh+'侧屈',frame:FRONT,keys:isoKeys(h,[push([s,0,0],'头：向'+zh+'轻顶',{off:[0,7,0]}),resist('side'+n,[s,0,0],'手：顶住',{ls:'center'})],
    '手掌放在头的'+zh+'侧','头尝试向'+zh+'侧屈，手给相反的阻力')}};
const rot=s=>{const n=s>0?'L':'R',zh=s>0?'左':'右',h={};h[n]='cheekSame';
  return{label:'向'+zh+'旋转',frame:FRONT,keys:isoKeys(h,[Object.assign(push([s,0,0],'头：尝试向'+zh+'转',{at:'nose',len:7,off:[0,9,0]})),resist('cheek'+n,[s,0,.2],'手：顶住',{ls:'center'})],
    '手放在'+zh+'侧颞部 / 面颊附近','头尝试向'+zh+'旋转，手给阻力')}};
const iso={frame:SIDE,ghostStart:true,variants:{
  flex:{label:'屈曲',frame:SIDE,keys:isoKeys({R:'forehead'},[push([0,0,1],'头：向前轻顶',{off:[0,9,-6]}),resist('forehead',[0,0,1],'手：顶住',{ls:'center'})],'手掌放在前额','头尝试向前屈，手给相反的阻力')},
  ext:{label:'伸展',frame:SIDE,keys:isoKeys({L:'occiput',R:'occiput'},[push([0,0,-1],'头：向后轻顶',{off:[0,9,6]}),resist('occiput',[0,0,-1],'手：顶住',{ls:'center'})],'双手放在头后部','头尝试向后伸，双手给向前的阻力')},
  latL:side(1),latR:side(-1),rotL:rot(1),rotR:rot(-1),
  'err-shrug':{error:true,label:'耸肩',ref:'latR',frame:FRONT,mark:{at:'shoulderR',r:7},keys:isoKeys({R:'sideSame'},[{at:'shoulderR',dir:[0,1,0],len:6,off:[0,3,0],c:R}],'手掌放在头的右侧','',{pose:{shR:1},cue:'错误：用力时肩膀耸起（侧屈训练时很常见）',holdCue:'错误：肩膀耸起——应保持肩膀放松'})},
  'err-poke':{error:true,label:'下巴前伸',ref:'flex',frame:SIDE,mark:{at:'chin',r:6},keys:isoKeys({R:'forehead'},[{at:'chin',dir:[0,0,1],len:6,c:R}],'手掌放在前额','',{pose:{tr:-1},cue:'错误：前方抗阻时下巴向前探出',holdCue:'错误：下巴前伸——头应保持在中立位'})},
  'err-lean':{error:true,label:'身体跟着移动',ref:'latR',frame:FRONT,mark:{at:'c7',r:9},keys:isoKeys({R:'sideSame'},[{at:'c7',dir:[-1,0,0],len:7,off:[0,-8,0],c:R}],'手掌放在头的右侧','',{pose:{tLat:-9},cue:'错误：整个躯干推向手，而不是颈部在用力',holdCue:'错误：身体跟着移动——躯干应保持不动'})}
}};

/* ---------- 3 上斜方肌牵伸（示范牵伸右侧：头倒向左） ---------- */
const utSeq=(peak,extra)=>[
  {t:.01,hold:1,cue:'起始位：坐直（示范牵伸右侧）'},
  {t:1,hold:.8,hands:{R:'seat'},pose:{shR:-1},cue:'右手抓住椅子边缘，右肩下沉固定',arrows:[{at:'shoulderR',dir:[0,-1,0],len:7,off:[-5,0,0],c:A,label:'肩膀沉下去'}]},
  {t:1.1,hold:.5,hands:{R:'seat',L:'overTop'},pose:{shR:-1},cue:'左手轻放在头上——只做轻微引导'},
  Object.assign({t:1.9,hold:3,hands:{R:'seat',L:'overTop'},peak:true},peak),
  {t:1.6,hold:.4,hands:{R:'seat',L:'overTop'},pose:{shR:-1},cue:'缓慢回正'},
  {t:1.1,hold:.7,cue:'放松，再换另一侧'}];
const ut={frame:FRONT,variants:{
  main:{label:'标准动作',keys:utSeq({pose:{shR:-1,lat:32,flex:8},cue:'头轻轻倒向左侧，可轻微低头',holdCue:'保持：右侧颈肩有明显但可耐受的牵伸感',hl:['utR'],
    arrows:[{at:'shoulderR',dir:[0,-1,0],len:7,off:[-5,0,0],c:A,label:'肩膀下沉'},{at:'headTop',dir:[1,-.35,0],len:8,off:[4,2,0],c:J,label:'倒向对侧'}]})},
  'err-shrug':{error:true,label:'肩膀耸起',mark:{at:'shoulderR',r:7},keys:utSeq({pose:{shR:1,lat:32,flex:8},cue:'错误：被牵伸侧的肩膀跟着抬起来',holdCue:'错误：肩膀耸起——牵伸效果明显变差',
    arrows:[{at:'shoulderR',dir:[0,1,0],len:6,off:[0,3,0],c:R}]})},
  'err-trunk':{error:true,label:'躯干侧弯',mark:{at:'c7',r:10},keys:utSeq({pose:{shR:-.3,lat:12,tLat:17},cue:'错误：不是颈椎侧屈，而是整个身体歪向一侧',holdCue:'错误：躯干侧弯——躯干应基本直立',
    arrows:[{at:'c7',dir:[1,-.2,0],len:7,off:[0,-10,0],c:R}]})},
  'err-rot':{error:true,label:'头转得太多',mark:{at:'nose',r:6},keys:utSeq({pose:{shR:-1,lat:22,rot:42,flex:8},cue:'错误：头部旋转过多',holdCue:'错误：基础牵伸不需要把头转得很夸张',
    arrows:[{at:'nose',dir:[1,0,0],len:6,c:R}]})},
  'err-pull':{error:true,label:'用手硬压',mark:{at:'headTop',r:7},keys:utSeq({pose:{shR:-1,lat:50,flex:12},cue:'错误：用手大力把头压下去',holdCue:'错误：用手猛拉——手只需轻微引导',
    arrows:[{at:'headTop',dir:[.9,-.6,0],len:9,off:[-3,3,0],c:R,label:'过度用力'}]})}
}};

/* ---------- 4 肩胛提肌牵伸（示范牵伸右侧：头先向左转，再轻度低头） ---------- */
const lsFrame={view:14,sc:3.9,cx:.5,cy:.94};
const lsSeq=(turn,peak)=>[
  {t:.01,hold:1,cue:'起始位：坐直（示范牵伸右侧）'},
  {t:1,hold:.8,hands:{R:'seat'},pose:{shR:-1},cue:'右手抓住椅子边缘，右肩保持下沉',arrows:[{at:'shoulderR',dir:[0,-1,0],len:7,off:[-5,0,0],c:A,label:'肩膀下沉'}]},
  Object.assign({t:1.5,hold:.9,hands:{R:'seat'}},turn),
  Object.assign({t:1.7,hold:3,hands:{R:'seat',L:'backTop'},peak:true},peak),
  {t:1.6,hold:.4,hands:{R:'seat'},pose:{shR:-1},cue:'缓慢抬头、回正'},
  {t:1.1,hold:.7,cue:'放松，再换另一侧'}];
const lsTurn={pose:{shR:-1,rot:40},cue:'头先向左转（约 30–45°）',arrows:[{at:'nose',dir:[1,0,0],len:6,off:[0,10,0],c:J,label:'先旋转',lp:'mid'}]};
const ls={frame:lsFrame,variants:{
  main:{label:'标准动作',keys:lsSeq(lsTurn,{pose:{shR:-1,rot:40,flex:28},cue:'再轻轻低头，视线朝向左侧腋窝；左手轻扶',holdCue:'保持：右侧颈后外侧至肩胛骨上角有牵伸感',hl:['lsR'],
    arrows:[{at:'nose',dir:[.3,-1,0],len:7,off:[1,-2,0],c:J,label:'看向对侧腋窝'}]})},
  'err-norot':{error:true,label:'只低头不旋转',mark:{at:'nose',r:6},keys:lsSeq({pose:{shR:-1},cue:'错误：没有先把头转过去'},{pose:{shR:-1,flex:42},cue:'错误：只是猛低头',holdCue:'错误：只低头不旋转——牵伸感会变成整个颈后部',
    arrows:[{at:'nose',dir:[0,-1,0],len:7,c:R}]})},
  'err-shrug':{error:true,label:'肩膀耸起',mark:{at:'shoulderR',r:7},keys:lsSeq(lsTurn,{pose:{shR:1,rot:40,flex:28},cue:'错误：被牵伸侧的肩膀跟着起来',holdCue:'错误：肩膀耸起——“肩膀别跟着起来”',
    arrows:[{at:'shoulderR',dir:[0,1,0],len:6,off:[0,3,0],c:R}]})},
  'err-trunk':{error:true,label:'躯干跟着转',mark:{at:'c7',r:10},keys:lsSeq({pose:{shR:-.4,rot:12,tRot:28},cue:'错误：整个躯干跟着转过去'},{pose:{shR:-.4,rot:12,tRot:28,flex:28},cue:'错误：整个躯干跟着转',holdCue:'错误：躯干跟着转——应是头颈在转，躯干不动',
    arrows:[{at:'c7',dir:[1,0,0],len:7,off:[0,-10,6],c:R}]})},
  'err-pull':{error:true,label:'用手猛压 / 幅度过大',mark:{at:'headTop',r:7},keys:lsSeq(lsTurn,{pose:{shR:-1,rot:42,flex:56},cue:'错误：用手猛压头，追求过大的幅度',holdCue:'错误：幅度过大——手只轻轻增加一点牵伸',
    arrows:[{at:'headTop',dir:[.3,-1,.3],len:9,off:[0,4,0],c:R,label:'过度用力'}]})}
}};
return{'chin-retraction':chin,'cervical-isometrics':iso,'ut-stretch':ut,'ls-stretch':ls};
})();
