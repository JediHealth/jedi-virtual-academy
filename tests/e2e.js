const {chromium,webkit,devices}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const [name,opt] of [['mac',{viewport:{width:1440,height:820},deviceScaleFactor:2}],['iphone',{...devices['iPhone 14'],defaultBrowserType:undefined}],['wechat-ios',{...devices['iPhone SE'],defaultBrowserType:undefined,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x18003233) NetType/WIFI Language/zh_CN'}]]){
  const ctx=await b.newContext(opt);const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
  await p.goto(process.env.URL||'http://127.0.0.1:8765/');await p.waitForTimeout(800);
  await p.screenshot({path:`/home/claude/shots/${name}-1title.png`});
  const tap=async sel=>{await p.locator(sel).first().click()};
  await tap('#go');await p.waitForTimeout(500);await tap('.path[data-i="1"]');await tap('#reroll');await p.waitForTimeout(300);
  await p.screenshot({path:`/home/claude/shots/${name}-2choose.png`});
  await tap('#enter');await p.waitForTimeout(1200);
  await p.screenshot({path:`/home/claude/shots/${name}-3enter.png`});
  for(let i=0;i<3;i++){await tap('#dlg');await p.waitForTimeout(200)}
  console.log(name,'dlg hidden',await p.locator('#dlg').isHidden());
  // walk by tapping ground toward plaza
  const st=()=>p.evaluate(()=>({x:Math.round(P.x),y:Math.round(P.y),near:near&&near.id,xp:S.xp,S:JSON.stringify(S)}));
  console.log(name,'pos0',await st());
  const vp=p.viewportSize();
  await p.mouse.click(vp.width/2,vp.height/2-120);await p.waitForTimeout(1500);
  console.log(name,'after tap',await st());
  // click core hotspot via world->screen
  const clickHS=async id=>{for(let k=0;k<12;k++){const r=await p.evaluate(id=>{const h=HS.find(h=>h.id===id);const [sx,sy]=w2s(h.x,h.y);return {sx,sy:sy-30*Z,near:near&&near.id,vw,vh}},id);
     if(r.near===id||await p.locator('#panel').isVisible())break;const x=Math.max(20,Math.min(r.vw-20,r.sx)),y=Math.max(140,Math.min(r.vh-130,r.sy));await p.mouse.click(x,y);await p.waitForTimeout(1300)}};
  await clickHS('core');await p.waitForTimeout(500);if(await p.locator('#dlg').isHidden())await tap('#act');await p.waitForTimeout(400);
  console.log(name,'core: dlg visible',await p.locator('#dlg').isVisible());
  await p.screenshot({path:`/home/claude/shots/${name}-4core.png`});
  for(let i=0;i<4;i++){await tap('#dlg');await p.waitForTimeout(200)}
  console.log(name,'panel',await p.locator('#pzh').textContent(),await st().then(s=>s.xp));
  await p.screenshot({path:`/home/claude/shots/${name}-5plaza.png`});
  // breathing
  await tap('#br');const bb=await p.locator('#breath').boundingBox();
  for(let i=0;i<3;i++){await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();await p.waitForTimeout(3200);if(i==1)await p.screenshot({path:`/home/claude/shots/${name}-6breath.png`});await p.mouse.up();await p.waitForTimeout(3200)}
  console.log(name,'breath result',await p.locator('.result h3').textContent(),(await st()).xp);
  await tap('#nx');await tap('#ok');
  // hall
  await clickHS('spine');await p.waitForTimeout(300);
  if(await p.locator('#panel').isHidden())await tap('#act');
  await p.waitForTimeout(400);
  for(const r of ['c','t','l'])await p.locator(`#regs button[data-r="${r}"]`).click();
  await p.locator('#spine g[data-r="s"]').first().click({force:true});
  await p.screenshot({path:`/home/claude/shots/${name}-7hall.png`});
  await tap('#qz');
  for(let i=0;i<5;i++){const a=await p.evaluate(()=>{const q=document.querySelector('.q').textContent;return QUIZ.find(x=>x.q===q).a});
    await p.locator('#opts .opt').nth(i==4?(a+1)%4:a).click();if(i==0)await p.screenshot({path:`/home/claude/shots/${name}-8quiz.png`});await tap('#nx')}
  console.log(name,'quiz',await p.locator('.result h3').textContent(),await p.locator('.ring b').textContent(),(await st()).xp);
  await p.screenshot({path:`/home/claude/shots/${name}-9result.png`});
  await tap('#nx');
  // training
  await clickHS('train');await p.waitForTimeout(300);if(await p.locator('#panel').isHidden())await tap('#act');
  await p.screenshot({path:`/home/claude/shots/${name}-10world.png`}).catch(()=>{});
  await tap('#t1');
  for(let i=0;i<6;i++){const a=await p.evaluate(i=>JOINTS[i].a,i);await p.locator('#opts .opt').nth(a).click();if(i==2)await p.screenshot({path:`/home/claude/shots/${name}-11joint.png`});await tap('#nx')}
  console.log(name,'joint',await p.locator('.ring b').textContent(),(await st()).xp);
  await tap('#nx');await tap('#t2');await tap('#st');
  // balance: simple controller driving pointer opposite to dot (reads internal? not exposed) -> just hold center drag pattern
  const cb=await p.locator('#bal').boundingBox();await p.mouse.move(cb.x+cb.width/2,cb.y+cb.height/2);await p.mouse.down();
  await p.waitForTimeout(3000);await p.screenshot({path:`/home/claude/shots/${name}-12bal.png`});
  await p.waitForTimeout(18000);await p.mouse.up();
  console.log(name,'balance',await p.locator('.ring b').textContent(),await p.locator('.result h3').textContent());
  await tap('#nx');await tap('#px');await p.waitForTimeout(600);
  console.log(name,'grad dlg',await p.locator('#dlg').isVisible());
  await tap('#dlg');await tap('#dlg');await p.waitForTimeout(400);
  await p.screenshot({path:`/home/claude/shots/${name}-13grad.png`});
  await tap('#ok');
  // mentor
  await tap('#bMentor');await p.locator('#chips button').nth(3).click();await p.fill('#aski','核心是什么');await p.locator('#askf button').click();
  console.log(name,'mentor ans',(await p.locator('#ans .a').textContent()).slice(0,40));
  await p.fill('#aski','今天天气');await p.locator('#askf button').click();console.log(name,'fallback',(await p.locator('#ans .a').textContent()).slice(0,30));
  await p.screenshot({path:`/home/claude/shots/${name}-14mentor.png`});await tap('#px');
  // shard
  await clickHS('shard3');await p.waitForTimeout(300);if(await p.locator('#panel').isHidden()&&await p.locator('#act').isVisible())await tap('#act');
  console.log(name,'shard panel',await p.locator('#pzh').textContent());await tap('#ok');
  await tap('#bMap');await p.screenshot({path:`/home/claude/shots/${name}-15map.png`});await p.locator('[data-go="0"]').click();await p.waitForTimeout(2500);
  // keyboard
  if(name==='mac'){const a=await st();await p.keyboard.down('d');await p.waitForTimeout(500);await p.keyboard.up('d');const c=await st();console.log('kbd dx',c.x-a.x)}
  await p.screenshot({path:`/home/claude/shots/${name}-16world.png`});
  console.log(name,'final',(await st()).S);
  // reload persistence
  await p.reload();await p.waitForTimeout(500);console.log(name,'cont visible',await p.locator('#cont').isVisible());await tap('#cont');await p.waitForTimeout(800);
  await p.screenshot({path:`/home/claude/shots/${name}-17resume.png`});
  console.log(name,'wx tip',await p.locator('#wx').count(),'oops',await p.locator('#oops').count());console.log(name,'ERRORS',errs);
  await ctx.close();
 }
 await b.close();
})().catch(e=>{console.error('TESTFAIL',e.message);process.exit(1)});
