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
 assert(await p.locator('#flagPlanner').isVisible(),'custom flag map displays only for CTF');
 assert.equal((await p.locator('#flagMap text').allTextContents()).filter(s=>/^[1-7]$/.test(s)).length,7);
 await p.locator('#flagSix').click();
 assert.equal(await p.evaluate(()=>RodeadosFlagPlanner.getPlan().spots.length),6);
 await p.locator('[data-flag-tool="spawn"]').click();
 await p.locator('#flagMap').click({position:{x:265,y:95}});
 assert.equal(await p.evaluate(()=>RodeadosFlagPlanner.getPlan().spots.length),6);
 const expected=await p.evaluate(()=>RodeadosFlagPlanner.getPlan());
 await p.locator('#startDemo').click();
 await p.waitForFunction(()=>__RodeadosDebug.stage==='playing',null,{timeout:8000});
 const current=await p.evaluate(()=>__RodeadosDebug.game);
 assert.equal(current.mode,'ctf');
 assert.equal(current.mission.spawnPoints.length,6);
 assert.equal(current.mission.plan.spots[0].x,expected.spots[0].x);
 assert(await p.locator('#missionObjective').isVisible(),'mission-specific objective HUD');
 assert(await p.locator('#missionAction').isVisible(),'flag interaction is available');
 assert(await p.locator('#demoMove').isVisible(),'demo has safe virtual walk buttons');
 assert((await p.locator('#missionTitle').textContent()).includes('CAPTURAS'));
 await p.locator('#missionAction').click();
 assert((await p.locator('#notice').textContent()).includes('ACERCATE'));
 await p.reload({waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>!!window.__RodeadosDebug,null,{timeout:30000});
 await p.selectOption('#mode','loot');
 assert(!await p.locator('#flagPlanner').isVisible());
 await p.locator('#startDemo').click();
 await p.waitForFunction(()=>__RodeadosDebug.stage==='playing',null,{timeout:8000});
 assert.equal(await p.evaluate(()=>__RodeadosDebug.game.mission.crates.length),5);
 assert((await p.locator('#missionTitle').textContent()).includes('BOTÍN'));
 assert(await p.locator('#missionAction').isDisabled(),'cannot extract an empty bag');
 assert.equal(errors.length,0,'no browser exceptions: '+errors.join(' | '));
 console.log('PASS: custom 6-spawn CTF planning, in-game anchored mission + loot HUD and movement controls. Android ARCore not physically tested.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
