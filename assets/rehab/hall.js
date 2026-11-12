'use strict';
/* 康复馆 · 界面：馆内首页 → 部位模块 → 单个动作（演示 + 教学卡）。
   依赖 app.js 提供的 S / save / say / openPanel / closePanel / on / addXP。 */
const Rehab=(function(){
const esc=s=>String(s).replace(/[<>&]/g,'');
const tag=src=>'<i class="src s-'+src+'" title="'+REHAB_SRC[src].full+'">'+REHAB_SRC[src].zh+'</i>';
const li=x=>'<li>'+x.t+' '+tag(x.src)+'</li>';
const banner='<div class="rv"><b>预览版 · 专业内容审核中</b>　演示用于帮助理解动作，不是个体化的运动处方。</div>';
const neck=()=>REHAB_REGIONS.find(r=>r.id==='neck');
const seen=id=>S.rehab.indexOf(id)>=0;

function enter(){
  if(!S.rehabMet){S.rehabMet=true;save();say(['这里是运动康复馆。学院把康复运动拆成看得见的动作：怎么做、做到哪里、哪里容易做错。','现在开放的是颈椎的四个动作。记住——演示是为了看懂动作；适不适合你、做多少，要由专业人员判断。'],home)}
  else home();
}
function home(){
  const n=S.rehab.length,tot=neck().exercises.length;
  openPanel('绝地运动康复馆','Jedi Movement Rehabilitation Hall',banner+
  '<p class="lead">从动作开始学康复。每个动作都有动态演示、口令、常见错误和注意事项。</p>'+
  '<div class="rgrid">'+REHAB_REGIONS.map(r=>r.open
    ?'<button class="card rreg" data-r="'+r.id+'" style="--c:#7fd0ff"><h4>'+r.zh+'<span class="tagok" style="color:#7fd0ff;border-color:rgba(127,208,255,.5)">已开放</span></h4><p>'+r.en+'<br>'+tot+' 个动作 · 已学习 '+n+' / '+tot+'</p></button>'
    :'<div class="card rreg locked"><h4>'+r.zh+'</h4><p>'+r.en+'<br>筹建中</p></div>').join('')+'</div>'+
  '<h5 class="rh">康复服务流程（规划）</h5><ol class="rpipe">'+REHAB_PIPELINE.map(p=>'<li class="'+(p.now?'now':'')+'">'+p.zh+(p.now?'<small>'+p.now+'</small>':'')+'</li>').join('')+'</ol>'+
  '<p class="note">询问、筛查、评估、处方、反馈与复评将在后续版本逐步开放；当前版本只做动作教学。</p>');
  document.querySelectorAll('#pbody .rreg[data-r]').forEach(b=>b.addEventListener('click',()=>region(b.dataset.r)));
}
function region(id){
  const R=REHAB_REGIONS.find(r=>r.id===id),I=REHAB_NECK_INTRO;
  openPanel(R.zh+'运动康复',R.en+' · Module',banner+
  '<div class="rstop"><b>'+I.stop.title+'</b> '+tag(I.stop.src)+'<div>'+I.stop.list.join(' · ')+'</div><small>'+I.stop.tail+'</small></div>'+
  '<div class="rlist">'+R.exercises.map((e,i)=>{const x=REHAB_LIBRARY[e];return'<button class="card rex" data-e="'+e+'" style="--c:#7fd0ff"><span class="rnum">'+(i+1)+'</span><span class="rt"><b>'+x.zh+'</b><em>'+x.en+'</em><small>'+x.role+'</small></span>'+(seen(e)?'<span class="tagok">已学习</span>':'<span class="rgo">看演示 ›</span>')+'</button>'}).join('')+'</div>'+
  '<details class="rintro"><summary>模块导读：先理解，再练习</summary><ul>'+I.points.map(li).join('')+'</ul>'+
  '<p><b>'+I.steps.title+'</b> '+tag(I.steps.src)+'<br>'+I.steps.list.map((s,i)=>(i+1)+'. '+s).join('　→　')+'</p></details>'+
  legend()+'<div class="row"><button class="btn ghost sm" id="rb">‹ 返回康复馆</button></div>');
  document.querySelectorAll('#pbody .rex').forEach(b=>b.addEventListener('click',()=>exercise(b.dataset.e)));
  on('#rb',home);
}
function legend(){return'<p class="rlegend">来源标注：'+Object.keys(REHAB_SRC).map(k=>tag(k)+' '+REHAB_SRC[k].full).join('　')+'</p>'}
function sec(title,body,extra){return body?'<section><h5 class="rh">'+title+(extra||'')+'</h5>'+body+'</section>':''}

function exercise(id){
  const X=REHAB_LIBRARY[id],M=REHAB_MOTIONS[id],DS=REHAB_DOSAGE[id],list=neck().exercises,ix=list.indexOf(id);
  const okV=Object.keys(M.variants).filter(k=>!M.variants[k].error),errV=Object.keys(M.variants).filter(k=>M.variants[k].error);
  const pend='<span class="rpend">待专业审核</span>';
  openPanel(X.zh,X.en,banner+
  '<div class="rstage"><canvas id="rc"></canvas><div class="rview" id="rview"></div><div class="rbad" id="rbad" hidden></div><div class="rghost" id="rghost" hidden>绿色虚影 = 正确位置</div></div>'+
  '<div class="rcap" id="rcap"></div><div class="rdots" id="rdots"></div>'+
  '<div class="rctl"><button id="rplay" class="on">暂停</button><button id="rslow">慢放 0.5×</button><button id="rre">重新播放</button>'+('speechSynthesis'in window?'<button id="rsay">朗读口令</button>':'')+'</div>'+
  '<div class="rseg"><button data-m="ok" class="on">正确动作</button><button data-m="err">常见错误（'+errV.length+'）</button></div>'+
  '<div class="chips" id="rvar"></div><div id="rfix"></div>'+
  '<div class="rcard">'+
  sec('关键口令','<blockquote>“'+X.cue.t+'” '+tag(X.cue.src)+'</blockquote>'+(X.cue2?'<p class="rsub">'+X.cue2.t+' '+tag(X.cue2.src)+'</p>':''))+
  sec('训练目标','<ul>'+X.goal.map(li).join('')+'</ul>')+
  sec('起始位','<ul>'+X.start.map(li).join('')+'</ul>')+
  sec('动作步骤','<ol>'+X.steps.map(li).join('')+'</ol>')+
  sec('应有的感觉','<ul>'+X.feel.map(li).join('')+'</ul>')+
  sec('常见代偿与纠正','<ul class="rerr">'+X.errors.map(e=>'<li><b>'+e.t+'</b> '+tag(e.src)+(e.v?' <button class="rsee" data-v="'+e.v+'">看演示</button>':'')+'<br><span>'+e.fix+'</span></li>').join('')+'</ul>')+
  sec('注意事项','<div class="rstop"><b>'+REHAB_NECK_INTRO.stop.title+'</b> '+tag(REHAB_NECK_INTRO.stop.src)+'<div>'+REHAB_NECK_INTRO.stop.list.join(' · ')+'</div><small>'+REHAB_NECK_INTRO.stop.tail+'</small></div>')+
  sec('资料中的参考参数','<ul>'+DS.items.map(li).join('')+'</ul><p class="rsub">以上为内部资料中的参数，尚未作为正式运动处方发布；实际做多少应由专业人员根据个人情况决定。</p>',DS.review==='pending'?pend:'')+
  sec('复测',X.retest.length?'<p class="rsub">练习前后可以对比：</p><ul>'+X.retest.map(li).join('')+'</ul>':'<p class="rsub">资料中未提供此动作的复测项目，待补充。</p>')+
  sec('补充说明','<ul>'+X.notes.map(li).join('')+'</ul>')+legend()+'</div>'+
  '<div class="row rnav"><button class="btn ghost sm" id="rprev"'+(ix>0?'':' disabled')+'>‹ 上一个</button><button class="btn ghost sm" id="rlist">动作列表</button><button class="btn sm" id="rnext"'+(ix<list.length-1?'':' disabled')+'>下一个 ›</button></div>');

  const cap=document.getElementById('rcap'),dots=document.getElementById('rdots');let mode='ok',lastCue='',lastI=-1,curKeys=null;
  const P=RehabPlayer.create(document.getElementById('rc'),M,{
    onFrame(s,st){
      if(curKeys!==st.v.keys){curKeys=st.v.keys;dots.innerHTML=curKeys.map((_,i)=>'<i data-i="'+i+'"></i>').join('');lastI=-1}
      const txt=s.cue+((s.key.peak&&!s.moving)?'<small>演示中的保持时间已缩短</small>':'');
      if(txt!==lastCue){lastCue=txt;cap.innerHTML=txt;cap.classList.toggle('bad',!!st.v.error&&!!s.key.peak)}
      if(s.i!==lastI){lastI=s.i;dots.querySelectorAll('i').forEach((d,i)=>d.className=i<s.i?'done':i===s.i?'cur':'')}
    },
    onState(st){const b=document.getElementById('rplay');if(!b)return;b.textContent=st.playing?'暂停':'播放';b.classList.toggle('on',st.playing);
      document.getElementById('rslow').classList.toggle('on',st.speed<1)},
    onLoop(st){if(!st.v.error&&!seen(id)){S.rehab.push(id);save();addXP(10,'看懂动作：'+X.zh)}}
  });
  api.player=P;
  cleanup=()=>{api.player=null;P.destroy();try{window.speechSynthesis&&window.speechSynthesis.cancel()}catch(e){}};
  function chips(){const ids=mode==='ok'?okV:errV,box=document.getElementById('rvar');
    box.innerHTML=(ids.length>1||mode==='err')?ids.map(k=>'<button data-v="'+k+'" class="'+(k===P.st.vid?'on':'')+'">'+M.variants[k].label+'</button>').join(''):'';
    box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>pick(b.dataset.v)))}
  function pick(v){const V=M.variants[v];mode=V.error?'err':'ok';P.setVariant(v);
    document.querySelectorAll('#pbody .rseg button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));chips();
    const fr=V.frame||M.frame;document.getElementById('rview').textContent=fr.view>=60?'侧面视角':fr.view>5?'正面略偏视角':'正面视角';
    const bad=document.getElementById('rbad'),gh=document.getElementById('rghost'),fix=document.getElementById('rfix');bad.hidden=gh.hidden=!V.error;
    if(V.error){const e=X.errors.find(q=>q.v===v)||{t:V.label,fix:'',src:'jks'};bad.textContent='✕ 错误示范：'+V.label;
      fix.innerHTML='<div class="rfix"><b>✕ '+e.t+'</b> '+tag(e.src)+'<br><span>✓ 纠正：'+e.fix+'</span></div>'}else fix.innerHTML=''}
  pick(okV[0]);
  on('#rplay',()=>P.toggle());on('#rslow',()=>P.setSpeed(P.st.speed<1?1:.5));on('#rre',()=>P.restart());
  on('#rsay',()=>{try{const u=new SpeechSynthesisUtterance(X.cue.t);u.lang='zh-CN';u.rate=.9;window.speechSynthesis.cancel();window.speechSynthesis.speak(u)}catch(e){}});
  document.querySelectorAll('#pbody .rseg button').forEach(b=>b.addEventListener('click',()=>pick(b.dataset.m==='ok'?okV[0]:errV[0])));
  document.querySelectorAll('#pbody .rsee').forEach(b=>b.addEventListener('click',()=>{pick(b.dataset.v);document.getElementById('pbody').scrollTop=0}));
  dots.addEventListener('click',e=>{const i=e.target.dataset&&e.target.dataset.i;if(i!=null){if(P.st.playing)P.toggle();P.seekKey(+i)}});
  on('#rprev',()=>exercise(list[ix-1]));on('#rnext',()=>exercise(list[ix+1]));on('#rlist',()=>region('neck'));
}
const api={enter,home,region,exercise,player:null};return api;
})();
