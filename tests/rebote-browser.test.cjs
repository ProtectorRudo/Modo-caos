'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(url==='/')url='/index.html';const p=path.resolve(root,'.'+url);
 if(!p.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(p,(err,data)=>{if(err)return res.writeHead(404).end('Missing '+url);
  res.writeHead(200,{'content-type':path.extname(p)==='.js'?'application/javascript':'text/html; charset=utf-8'}).end(data)});
});
(async()=>{let browser;
 try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-web-security']});
 const page=await browser.newPage({viewport:{width:393,height:850},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/rebote.html',{waitUntil:'load'});
 await page.waitForFunction(()=>!!globalThis.__ReboteDebug,null,{timeout:35000});
 assert.match(await page.title(),/REBOTE MORTAL/);
 assert(await page.locator('#startAR').isVisible());
 await page.locator('#startDemo').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='playing',null,{timeout:11000});
 await page.waitForFunction(()=>__ReboteDebug.game.elapsed>.15,null,{timeout:12000});
 assert.equal(await page.locator('#returnBtn').isVisible(),true);
 assert.equal(await page.locator('#reticle').isVisible(),true);
 assert(await page.evaluate(()=>__ReboteDebug.renderedRobots)>0,'articulated 3D enemy appears');
 assert(await page.locator('#hud').isVisible(),'HUD active');
 await page.locator('#pauseBtn').click();
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'paused');
 await page.locator('#begin').click();
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'playing');
 await page.locator('#sound').click();
 assert.equal(await page.locator('#sound').innerText(),'🔇');
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
 assert.equal(await page.locator('a[href="/rebote.html"]').count(),1,'menu link');
 assert.equal(errors.length,0,errors.join(' | '));
 console.log('PASS: 3D demo, robot mesh, HUD, pause/resume, sound, menu. NOT a physical AR test.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
