'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css'};
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(url==='/')url='/index.html';
 const p=path.resolve(root,'.'+url);
 if(!p.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(p,(err,data)=>{if(err)return res.writeHead(404).end('Missing '+url);
  res.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}).end(data)});
});
(async()=>{
 let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-web-security']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const issues=[];page.on('pageerror',e=>issues.push(e.message));
 await page.goto(base+'/rodeados.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!globalThis.__RodeadosDebug,null,{timeout:25000});
 assert.equal((await page.locator('h1').innerText()).replace(/\s+/g,' ').trim(),'RODEADOS 360°');
 await page.locator('#startDemo').click();
 await page.waitForFunction(()=>globalThis.__RodeadosDebug.stage==='playing',null,{timeout:7000});
 // SwiftShader/WebGL screenshot workers can render a frame much slower than a
 // real mobile GPU. Wait for SIMULATED time, never guess 650ms of wall time.
 await page.waitForFunction(()=>globalThis.__RodeadosDebug.game.elapsed>.32,null,{timeout:7500});
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.stage),'playing');
 assert(await page.locator('canvas').count()>0,'Three.js created renderer');
 assert(await page.locator('#fire').isVisible(),'shoot visible');
 const floorStart=await page.evaluate(()=>globalThis.__RodeadosDebug.floorRendering);
 assert.equal(floorStart.plates,25);
 assert.equal(floorStart.darkPlates,25,'all 25 cells are tactical graphite war plates in battle mode');
 assert.equal(floorStart.visible,25,'combat deck visible over camera');
 assert.equal(floorStart.textured,true,'all 25 military tiles share a real CanvasTexture PBR atlas');
 assert.equal(floorStart.perimeterPosts,4,'four low grounded combat markers appear during play');
 assert.equal(floorStart.ashCount,26,'only one tiny controlled ash-particle batch exists');

 assert(await page.locator('#radarWrap').isVisible(),'360-degree radar is active');
 await page.waitForTimeout(300);
 assert(await page.locator('#radar').evaluate(c=>{
  const d=c.getContext('2d').getImageData(108,108,1,1).data;
  return d[3]>0;
 }),'radar displays player orientation marker');
 await page.locator('#fire').click();
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.game.shots),1,'fire updates shot count');
 assert.equal((await page.locator('#ammo').innerText()).replace(/\s+/g,' ').trim(),'∞ BALAS','no finite bullets displayed');
 assert.equal(await page.locator('#reload').count(),0,'reload button removed entirely');
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.game.ammo),28,'shooting never reduces magazine');
 assert(await page.locator('#bomb').isVisible(),'Bomba Caos button appears during 3D battle');
 assert(await page.locator('#bomb').isEnabled(),'starts with one bomb charge');
 await page.locator('#bomb').click();
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.bombsUsed),1,'click throws exactly one area bomb');
 assert(await page.locator('#bomb').isDisabled(),'area bombs cannot be spammed while cooldown runs');
 // Simulated world clock advances at capped dt under software WebGL: wait for the
 // actual 480ms fuse to resolve, never assume 700ms of wall-clock is enough.
 await page.waitForFunction(()=>__RodeadosDebug.game.bombsUsed>0&&__RodeadosDebug.game.bombs.length===0,null,{timeout:8500});
 const blastDebug=await page.evaluate(()=>({bomb:__RodeadosDebug.game.bombs,bombHits:__RodeadosDebug.game.bombHits,
  enemies:__RodeadosDebug.game.enemies,elapsed:__RodeadosDebug.game.elapsed,stage:__RodeadosDebug.stage,
  charges:__RodeadosDebug.game.bombCharges,phase:__RodeadosDebug.game.phase,fx:__RodeadosDebug.game.fx}));
 const warStatus=await page.evaluate(()=>({core:globalThis.__RodeadosDebug.game.floorDamage,
  art:globalThis.__RodeadosDebug.floorRendering}));
 assert(warStatus.core.some(v=>v>0),'bomb must leave accumulated cosmetic damage on 5x5 deck');
 assert(warStatus.art.scars.some(v=>v>0),'damage must show an actual scorched texture in 3D');
 assert(blastDebug.bombHits>=1,
  'bomb blast actually affects robots in its world-space radius '+JSON.stringify(blastDebug));
 await page.locator('#pause').click();
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.game.paused),true,'pauses');
 await page.locator('#resume').click();
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.game.paused),false,'resumes');
 await page.locator('#sound').click();
 assert.equal(await page.locator('#sound').textContent(),'🔇','muted');
 assert.equal(issues.length,0,'browser runtime exceptions: '+issues.join(' | '));
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});assert.equal(await page.locator('a[href="/rodeados.html"]').count(),1);
 await page.goto(base+'/salas.html',{waitUntil:'domcontentloaded'});assert.equal(await page.locator('option[value="rodeados-360"]').count(),1);
 console.log('PASS: WebGL browser, game loop, gun, infinite ammo, pause, menu and salas. Physical AR NOT tested.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
