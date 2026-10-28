'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css'};
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://127.0.0.1').pathname;const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(buf)})});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=process.env.FRUTA_BROWSER_BASE||'http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push('JS '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});page.on('requestfailed',r=>errors.push('REQUEST '+r.url()+' '+r.failure()?.errorText));
  page.on('dialog',async d=>await d.dismiss());
  const resp=await page.goto(url+'/frutastrofe.html?qa=1',{waitUntil:'domcontentloaded',timeout:40000});
  if((await page.title()).includes('External Content Notice')){await page.getByText('Open the page',{exact:true}).click({timeout:12000})}
  await page.locator('#view canvas').waitFor({state:'visible',timeout:35000});
  assert(await page.locator('#campaign').isVisible());assert(await page.locator('#arcade').isVisible());
  assert.equal(await page.locator('#choose3D').count(),0,'2D/3D selection removed');
  assert.equal(await page.locator('#arStart').count(),0,'duplicate 3D/AR selection removed');
  assert((await page.locator('#home').innerText()).includes('EXCLUSIVO AR'));
  await page.screenshot({path:'frutastrofe-ar-menu-mobile.png',animations:'disabled'});
  await page.locator('#campaign').click();
  assert(await page.locator('#selector').isVisible());assert.equal(await page.locator('.lvl:enabled').count(),1);
  assert((await page.locator('#levelPlay').innerText()).includes('CÁMARA'));
  // In ordinary Chromium, camera AR is unsupported: no 2D fallback is secretly started.
  await page.locator('#levelPlay').click();
  assert(!await page.locator('#hud').isVisible(),'AR-only app cannot accidentally start gameplay without XR');
  // Simulate one deterministic AR projection in QA mode, not a physical ARCore test.
  await page.evaluate(()=>window.__frutaQA.simulateAR());
  assert(await page.locator('#readyOverlay').isVisible());
  // Software WebGL can be slow to satisfy Playwright's layout stability wait; click via DOM in simulation.
  await page.evaluate(()=>document.getElementById('goBtn').click());
  console.log('QA BEGIN STATE',JSON.stringify(await page.evaluate(()=>({state:window.__frutaQA.state(),hud:document.getElementById('hud').style.display,ready:document.getElementById('readyOverlay').style.display,handler:typeof document.getElementById('goBtn').onclick,btn:document.getElementById('goBtn').outerHTML}))),errors);
  assert(await page.locator('#hud').isVisible());
  await page.waitForFunction(()=>window.__frutaQA.state().elapsed>1,null,{timeout:14000});
  const t=Number(await page.locator('#hudTime').textContent());assert(t<54&&t>=36,'core clock runs during AR simulation: '+t);
  const before=await page.evaluate(()=>window.__frutaQA.previewWorld(0));
  assert(before.length>=2,'multiple actual fruits projected into anchored AR SVG');
  assert((await page.locator('#arWorld g').count())>=2,'AR SVG contains visible graphical fruits');
  const after=await page.evaluate(()=>window.__frutaQA.previewWorld(.3));
  assert(after.length>=2&&after[0].x<before[0].x,'moving viewer changes image projection, never world placement');
  await page.screenshot({path:'frutastrofe-ar-world-projection-mobile.png',animations:'disabled'});
  await page.locator('#fireBtn').click();await page.locator('#pauseBtn').click();
  assert(await page.locator('#pausePanel').isVisible());
  const paused=await page.locator('#hudTime').textContent();await page.waitForTimeout(250);assert.equal(await page.locator('#hudTime').textContent(),paused);
  await page.locator('#resumeBtn').click();assert(await page.locator('#hud').isVisible());
  await page.locator('#pauseBtn').click();await page.locator('#quitBtn').click();assert(await page.locator('#home').isVisible());
  const adHostError=x=>x.includes('server.ethicalads.io/')||x.includes('srv.carbonads.net/');
  const blockedAd=errors.some(adHostError);
  const appErrors=errors.filter(x=>!adHostError(x)&&!(Boolean(process.env.FRUTA_BROWSER_BASE)&&blockedAd&&x==='CONSOLE Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin'));
  assert.equal(appErrors.length,0,appErrors.join(' | '));
  await page.goto(url+'/index.html');if((await page.title()).includes('External Content Notice'))await page.getByText('Open the page',{exact:true}).click();
  assert.equal(await page.locator('a[href="/frutastrofe.html"]').count(),1);
  console.log('PASS FRUTÁSTROFE: AR-only menus, unsupported XR guard, anchored projected fruit sprites, viewer parallax, timer, pause, exit');
 }catch(err){console.error(err.stack||err);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
