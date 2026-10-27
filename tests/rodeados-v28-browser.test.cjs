'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(p==='/')p='/index.html';const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,buf)=>e?res.writeHead(404).end('404'):res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':'application/octet-stream'}).end(buf));
});
(async()=>{
 let browser;try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port+'/rodeados.html?v=28';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__RodeadosDebug,null,{timeout:30000});
  assert.equal(await page.locator('#mode option').count(),13,'8 missions and 5 classics including rescue');
  await page.selectOption('#mode','rescue');
  assert(!await page.locator('#flagIntro').isVisible(),'hostage rescue automatically configures enemies, no CTF field editor');
  await page.locator('#startDemo').click();
  await page.waitForFunction(()=>window.__RodeadosDebug?.stage==='playing',null,{timeout:12000});
  await page.waitForFunction(()=>window.__RodeadosDebug?.hostageRender?.visible&&window.__RodeadosDebug?.hostageRender?.guardMarkers===7&&Math.abs(window.__RodeadosDebug.hostageRender.x-window.__RodeadosDebug.game.mission.object.x)<.001,null,{timeout:9000});
  const m=await page.evaluate(()=>({mission:__RodeadosDebug.game.mission,render:__RodeadosDebug.hostageRender}));
  assert.equal(m.mission.level,1);assert.equal(m.mission.spawnPoints.length,7);
  assert(Math.abs(m.render.x-m.mission.object.x)<.001&&Math.abs(m.render.z-m.mission.object.z)<.001,'hostage is anchored to chosen world coords, not phone');
  assert(await page.locator('#missionAction').isVisible(),'FREE button available when close');
  assert(await page.locator('#missionAction').isDisabled(),'cannot free the hostage across the map');
  assert((await page.locator('#missionTitle').textContent()).includes('RESCATE NIVEL 1/10'));
  assert.equal(await page.locator('#waveLabel').textContent(),'NIVEL');
  assert.equal((await page.locator('#wave').textContent()).trim(),'1');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RodeadosDebug!==undefined,null,{timeout:30000});
  await page.selectOption('#mode','timewarp');
  await page.locator('#startDemo').click();
  await page.waitForFunction(()=>__RodeadosDebug.stage==='playing',null,{timeout:15000});
  assert.equal(await page.locator('#special').textContent(),'⏳ ROMPER TIEMPO');
  await page.locator('#special').click();
  await page.waitForFunction(()=>document.querySelector('#timeWarpFX').classList.contains('fracture'),null,{timeout:3000});
  assert((await page.locator('#timeWarpText').textContent()).includes('CONGELADO'));
  const state=await page.evaluate(()=>__RodeadosDebug.game.mission);
  assert.equal(state.timePhase,'FRACTURA');assert(state.slowUntil>0);
  await page.waitForFunction(()=>window.__RodeadosDebug.game.mission.timeCycles>=1,null,{timeout:3000});
  assert.deepEqual(errors,[],'JS/browser errors: '+errors.join(' | '));
  console.log('PASS: anchored civilian hostage, auto seven portals, level HUD, manual rescue action, real timewarp EMP overlay. ARCore physical UNTESTED.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
