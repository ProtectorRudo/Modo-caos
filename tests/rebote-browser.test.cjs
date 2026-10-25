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
 const diagnostics=[];
 page.on('console',msg=>{if(msg.type()==='error')diagnostics.push('console: '+msg.text())});
 page.on('requestfailed',req=>diagnostics.push('failed '+req.url()+' '+(req.failure()?.errorText||'')));
 page.on('response',resp=>{if(resp.status()>=400)diagnostics.push('HTTP '+resp.status()+' '+resp.url())});
 
 const cdnSha=process.env.REBOTE_CDN_SHA;
 const remote=cdnSha?'https://rawcdn.githack.com/ProtectorRudo/Modo-caos/'+cdnSha+'/rebote.html':null;
 await page.goto(remote||'http://127.0.0.1:'+server.address().port+'/rebote.html',{waitUntil:'load',timeout:45000});
 if(remote&&(await page.title()).includes('External Content Notice')){
  console.log('EXTERNAL HOST NOTICE',JSON.stringify({
   links:await page.locator('a').evaluateAll(els=>els.map(a=>({text:a.textContent?.trim(),href:a.href}))).catch(()=>[]),
   buttons:await page.locator('button').allTextContents().catch(()=>[])
  }));
  const proceed=page.getByRole('link',{name:/open the page/i});
  if(await proceed.count())await proceed.first().click();
  else{
   const proceedButton=page.getByRole('button',{name:/open the page/i});
   if(await proceedButton.count())await proceedButton.first().click();
  }
 }

 try{await page.waitForFunction(()=>!!globalThis.__ReboteDebug,null,{timeout:18000})}
 catch(e){
  console.error('BOOT DIAGNOSTICS',JSON.stringify({
   url:page.url(),loaded:await page.locator('title').innerText().catch(()=>''),support:await page.locator('#arProblemText').innerText().catch(()=>''),problems:diagnostics.slice(-22),
   secure:await page.evaluate(()=>isSecureContext).catch(()=>false)
  },null,2));throw e;
 }
 assert.match(await page.title(),/REBOTE MORTAL/);
 assert(await page.locator('#startAR').isVisible());
 assert.equal(await page.locator('script[src^="./rebote-core.js"]').count(),1,'core URL relative for external HTTPS mirrors');
 assert.equal(await page.locator('script[src^="./rebote-runtime.js"]').count(),1,'WebXR runtime URL relative for CDN and Pages');
 assert.equal(await page.locator('a[href="https://modo-caos-eta.vercel.app/"]').count(),1,'fallback play links back to original arcade menu');
 // An embedded Android WebView may not expose navigator.xr at all.
 await page.evaluate(()=>Object.defineProperty(navigator,'xr',{configurable:true,value:undefined}));
 await page.locator('#startAR').click();
 assert(await page.locator('#arProblem').isVisible(),'unsupported AR must show a prominent explanation');
 assert.match(await page.locator('#arProblemTitle').innerText(),/NO PUEDE ABRIR LA CÁMARA AR/);
 assert(await page.locator('#copyArLink').isVisible(),'one-tap Chrome link assistance exists');
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'home','unsupported AR does not hide the menu');
 await page.locator('#startDemo').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='playing',null,{timeout:11000});
 await page.waitForFunction(()=>__ReboteDebug.game.elapsed>.15,null,{timeout:12000});
 assert.equal(await page.locator('#returnBtn').isVisible(),true);
 assert.equal(await page.locator('#reticle').isVisible(),true);
 assert.equal(await page.locator('#upArrow').count(),1,'vertical AR threat guidance exists');
 assert.equal(await page.locator('#downArrow').count(),1,'low AR threat guidance exists');
 await page.waitForFunction(()=>document.querySelector('#strikeGauge')?.style.display==='block',null,{timeout:8500});
 assert.match(await page.locator('#strikeGauge').evaluate(el=>el.style.getPropertyValue('--charge')),/%$/,'timing meter reacts to incoming 3D shot');
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
