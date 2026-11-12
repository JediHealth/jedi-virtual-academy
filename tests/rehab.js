// 康复馆回归：经地图走到康复馆 → 逐个动作、逐个变体播放 → 控件 → 进度保存
const {chromium,devices}=require('/opt/npm-tools/node_modules/playwright');
const URL=process.env.URL||'http://127.0.0.1:8765/',OUT=process.env.OUT||'/home/claude/shots';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const [name,opt] of [['mac',{viewport:{width:1440,height:820},deviceScaleFactor:2}],['iphone',{...devices['iPhone 14'],defaultBrowserType:undefined}],['se',{viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,isMobile:true}]]){
  const ctx=await b.newContext(opt);const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
  const tap=s=>p.locator(s).first().click();
  await p.goto(URL);await p.waitForTimeout(600);await tap('#go');await tap('#enter');await p.waitForTimeout(1000);
  for(let i=0;i<3;i++){await tap('#dlg');await p.waitForTimeout(150)}
  await tap('#bMap');await p.screenshot({path:`${OUT}/r-${name}-map.png`});
  await p.locator('[data-go="4"]').click();
  for(let i=0;i<40;i++){await p.waitForTimeout(500);if(await p.evaluate(()=>near&&near.id==='rehab'))break}
  console.log(name,'arrived',await p.evaluate(()=>[Math.round(P.x),Math.round(P.y),near&&near.id]));
  await p.waitForTimeout(600);await p.screenshot({path:`${OUT}/r-${name}-world.png`});
  await tap('#act');await p.waitForTimeout(300);await tap('#dlg');await tap('#dlg');await p.waitForTimeout(300);
  console.log(name,'home',await p.locator('#pzh').textContent(),'regions',await p.locator('.rreg').count(),'locked',await p.locator('.rreg.locked').count());
  await p.screenshot({path:`${OUT}/r-${name}-home.png`});
  await p.locator('.rreg[data-r="neck"]').click();await p.waitForTimeout(200);await p.screenshot({path:`${OUT}/r-${name}-neck.png`});
  const ids=await p.evaluate(()=>REHAB_REGIONS[0].exercises);
  for(const id of ids){
    await p.locator(`.rex[data-e="${id}"]`).click();await p.waitForTimeout(300);
    const vs=await p.evaluate(id=>Object.keys(REHAB_MOTIONS[id].variants).map(k=>[k,!!REHAB_MOTIONS[id].variants[k].error]),id);
    // 控件
    await tap('#rplay');const paused=await p.locator('#rplay').textContent();await tap('#rplay');await tap('#rslow');const slow=await p.evaluate(()=>document.querySelector('#rslow').classList.contains('on'));await tap('#rslow');await tap('#rre');
    await p.locator('#rdots i').nth(1).click();const afterSeek=await p.locator('#rplay').textContent();await tap('#rplay');
    console.log(name,id,'variants',vs.length,'pause→',paused,'slow',slow,'seek→',afterSeek);
    for(const [v,err] of vs){
      await p.locator(`.rseg button[data-m="${err?'err':'ok'}"]`).click();
      if(await p.locator(`#rvar button[data-v="${v}"]`).count())await p.locator(`#rvar button[data-v="${v}"]`).click();
      await p.evaluate(([id,v])=>{const V=REHAB_MOTIONS[id].variants[v];let t=0;for(const k of V.keys){t+=k.t+k.hold;if(k.peak)break}const P=Rehab.player;P.st.tau=t-.3;P.st.playing=false;P.render()},[id,v]);await p.waitForTimeout(120);
      if(name!=='se'||!err)await p.locator('.rstage').screenshot({path:`${OUT}/x-${name}-${id}-${v}.png`});
    }
    if(name!=='mac')await p.screenshot({path:`${OUT}/r-${name}-${id}.png`});
    // 看完一遍标准动作 → 记为已学习
    await p.locator('.rseg button[data-m="ok"]').click();
    await p.evaluate(()=>{const P=Rehab.player;P.st.tau=RehabPlayer.total(P.st.v)-.4;P.st.playing=true});await p.waitForTimeout(900);
    if(id===ids[0]){await p.evaluate(()=>document.getElementById('pbody').scrollTop=520);await p.waitForTimeout(150);await p.screenshot({path:`${OUT}/r-${name}-card.png`});await p.locator('.rsee').first().click();await p.waitForTimeout(200);console.log(name,'看演示→',await p.locator('#rbad').textContent())}
    await tap('#rlist');
  }
  console.log(name,'seen',await p.evaluate(()=>S.rehab.join(',')),'xp',await p.evaluate(()=>S.xp));
  await tap('#px');await p.reload();await p.waitForTimeout(500);await tap('#cont');await p.waitForTimeout(500);
  console.log(name,'after reload seen',await p.evaluate(()=>S.rehab.length),'ERRORS',errs);
  await ctx.close();
 }
 await b.close();
})().catch(e=>{console.error('TESTFAIL',e.message);process.exit(1)});
