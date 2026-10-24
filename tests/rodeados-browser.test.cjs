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
 await page.goto(base+'/rodeados.html',{waitUntil:'load'});
 await page.waitForFunction(()=>!!globalThis.__RodeadosDebug,null,{timeout:25000});
 assert.equal((await page.locator('h1').innerText()).replace(/\s+/g,' ').trim(),'RODEADOS 360°');
 await page.locator('#startDemo').click();
 await page.waitForTimeout(650);
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.stage),'playing');
 assert.ok((await page.evaluate(()=>globalThis.__RodeadosDebug.game.elapsed))>.3,'clock advances');
 assert(await page.locator('canvas').count()>0,'Three.js created renderer');
 assert(await page.locator('#fire').isVisible(),'shoot visible');
 assert(await page.locator('#radarWrap').isVisible(),'360-degree radar is active');
 await page.waitForTimeout(300);
 assert(await page.locator('#radar').evaluate(c=>{
  const d=c.getContext('2d').getImageData(108,108,1,1).data;
  return d[3]>0;
 }),'radar displays player orientation marker');
 await page.locator('#fire').click();
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.game.shots),1,'fire updates ammo and shot count');
 await page.locator('#reload').click();
 assert.ok((await page.evaluate(()=>globalThis.__RodeadosDebug.game.reload))>0,'reloading works');
 await page.locator('#pause').click();
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.game.paused),true,'pauses');
 await page.locator('#resume').click();
 assert.equal(await page.evaluate(()=>globalThis.__RodeadosDebug.game.paused),false,'resumes');
 await page.locator('#sound').click();
 assert.equal(await page.locator('#sound').textContent(),'🔇','muted');
 assert.equal(issues.length,0,'browser runtime exceptions: '+issues.join(' | '));
 await page.goto(base+'/index.html');assert.equal(await page.locator('a[href="/rodeados.html"]').count(),1);
 await page.goto(base+'/salas.html');assert.equal(await page.locator('option[value="rodeados-360"]').count(),1);
 console.log('PASS: WebGL browser, game loop, gun, reload, pause, menu and salas. Physical AR NOT tested.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
