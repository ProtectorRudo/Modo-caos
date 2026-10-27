'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(pathname==='/')pathname='/index.html';
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,buf)=>err?res.writeHead(404).end():res.writeHead(200,{'content-type':pathname.endsWith('.html')?'text/html':pathname.endsWith('.js')?'application/javascript':'application/octet-stream'}).end(buf));
});
(async()=>{
 let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:'+server.address().port+'/rodeados.html';
 await p.goto(url,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>!!window.__RodeadosDebug,null,{timeout:30000});
 assert.equal(await p.locator('#mode option').count(),12,'7 fresh + 5 classic modes');
 await p.selectOption('#mode','ctf');
 assert(await p.locator('#flagIntro').isVisible(),'instructions for REAL XR map editing visible');
 assert(!await p.locator('#flagPlanner').isVisible(),'deceptive preset planner is hidden');
 await p.selectOption('#tacticalCount','6');
 await p.locator('#startDemo').click();
 await p.waitForFunction(()=>__RodeadosDebug.stage==='tactical',null,{timeout:8000});
 assert(await p.locator('#tacticalPanel').isVisible(),'must place field before game starts');
 assert.equal(await p.evaluate(()=>__RodeadosDebug.game.phase),'ready','cannot start with default plan');
 await p.locator('#tacticalMark').click(); // starting base, at 0.08m in front of camera
 assert(await p.evaluate(()=>!!__RodeadosDebug.tacticalPlan.base));
 await p.locator('#tacticalMark').click(); // enemy flag 1.12m ahead
 assert(await p.evaluate(()=>!!__RodeadosDebug.tacticalPlan.flag));
 await p.selectOption('#tacticalKind','spider');
 await p.locator('#tacticalMark').click();
 assert.equal(await p.evaluate(()=>__RodeadosDebug.tacticalPlan.kinds[0]),'spider');
 await p.locator('#tacticalUndo').click();
 assert.equal(await p.evaluate(()=>__RodeadosDebug.tacticalPlan.spots.length),0,'undo removes visual spawn');
 await p.locator('#tacticalMark').click();
 for(let i=1;i<6;i++){
  await p.mouse.move(230,425);await p.mouse.down();
  await p.mouse.move(188,425,{steps:3});await p.mouse.up();
  await p.waitForTimeout(40);
  await p.locator('#tacticalMark').click();
 }
 const expected=await p.evaluate(()=>__RodeadosDebug.tacticalPlan);
 assert.equal(expected.spots.length,6,'all six points placed manually with independent rays');
 assert(await p.locator('#tacticalConfirm').isVisible(),'confirmation appears only after 6 points');
 await p.locator('#tacticalConfirm').click();
 await p.waitForFunction(()=>__RodeadosDebug.stage==='playing',null,{timeout:10000});
 const current=await p.evaluate(()=>__RodeadosDebug.game);
 const flag=await p.evaluate(()=>__RodeadosDebug.flagRender);
 assert(Math.hypot(expected.base.x-expected.flag.x,expected.base.z-expected.flag.z)>=2.35,
  'flag must be clearly outside starting base');
 assert.equal(flag.x,expected.flag.x,'flag render keeps exact confirmed world-local x');
 assert.equal(flag.z,expected.flag.z,'flag render keeps exact confirmed world-local z');
 const worldBefore=await p.evaluate(()=>__RodeadosDebug.flagWorldRender);
 await p.locator('[data-demo-move="forward"]').tap();
 await p.waitForTimeout(180);
 const after=await p.evaluate(()=>({player:__RodeadosDebug.player,flag:__RodeadosDebug.flagRender,world:__RodeadosDebug.flagWorldRender}));
 assert(Math.hypot(after.player.x-expected.base.x,after.player.z-expected.base.z)>.04,
  'player moved through game world');
 assert(Math.hypot(after.flag.x-flag.x,after.flag.z-flag.z)<.001,
  'the flag remains anchored independently of player movement');
 assert(Math.hypot(after.world.x-worldBefore.x,after.world.z-worldBefore.z)<.001,
  'world renderer keeps flag fixed while camera moves');

 assert.equal(current.mode,'ctf');assert.equal(current.mission.configured,true);
 assert.deepEqual(current.mission.spawnPoints,expected.spots,'actual enemy points match the visible manual pins');
 assert.equal(current.mission.spawnTypes[0],'spider');
 assert(await p.locator('#missionObjective').isVisible());
 assert(await p.locator('#missionAction').isVisible());
 assert(await p.locator('#demoMove').isVisible());
 assert(await p.locator('#missionAction').isDisabled(),'retrieve disabled when not near the flag');
 assert((await p.locator('#missionTitle').textContent()).includes('BANDERA'),'HUD focuses on destination without duplicate captures');
 assert((await p.locator('#waveLabel').textContent()).includes('CAPTURAS'),'top HUD shows captured count');
 await p.reload({waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>!!window.__RodeadosDebug,null,{timeout:30000});
 await p.selectOption('#mode','loot');
 assert(!await p.locator('#flagIntro').isVisible());
 await p.locator('#startDemo').click();
 await p.waitForFunction(()=>__RodeadosDebug.stage==='playing',null,{timeout:8000});
 assert.equal(await p.evaluate(()=>__RodeadosDebug.game.mission.crates.length),5);
 assert((await p.locator('#missionTitle').textContent()).includes('BOTÍN'));
 assert(await p.locator('#missionAction').isDisabled(),'cannot extract an empty bag');
 assert.equal(errors.length,0,'no browser exceptions: '+errors.join(' | '));
 console.log('PASS: 6 individual CTF spawn points, user-selected start/flag, enemy type and nonautomatic placement. ARCore physical tracking NOT tested.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
