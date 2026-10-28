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
  // Simulate one deterministic AR projection in QA mode, not a physical ARCore test.
  await page.evaluate(()=>window.__frutaQA.simulateAR());
  assert(await page.locator('#readyOverlay').isVisible());
  // Software WebGL can be slow to satisfy Playwright's layout stability wait; click via DOM in simulation.
  await page.evaluate(()=>document.getElementById('goBtn').click());
  console.log('QA BEGIN STATE',JSON.stringify(await page.evaluate(()=>({state:window.__frutaQA.state(),hud:document.getElementById('hud').style.display,ready:document.getElementById('readyOverlay').style.display,handler:typeof document.getElementById('goBtn').onclick,btn:document.getElementById('goBtn').outerHTML}))),errors);
  assert(await page.locator('#hud').isVisible());
  await page.waitForFunction(()=>window.__frutaQA.state().elapsed>1,null,{timeout:14000});
  const t=Number(await page.locator('#hudTime').textContent());assert(t<60&&t>=40,'60-second core clock runs during AR simulation: '+t);
  const before=await page.evaluate(()=>window.__frutaQA.previewWorld(0));
  assert(before.length>=1,'sky fruit is projected from physical XR coordinates');
  assert(await page.locator('#frutastrofe-canvas').isVisible(),'spatial Canvas 2D compositor must appear');
  const after=await page.evaluate(()=>window.__frutaQA.previewWorld(.3));
  assert(after.length>=1&&after[0].x<before[0].x,'moving viewer changes image projection, never world placement');
  assert((await page.evaluate(()=>window.__frutaQA.diagnostics())).engine==='canvas2d','canvas compositor replaces DOM-intensive SVG');
  const premium=await page.evaluate(()=>{
   const art=window.FrutaPremiumArt;if(!art)return null;
   const types=['strawberry','orange','apple','watermelon','lemon','bomb','rotten','gold','ice','rainbow','boss'];
   return {types:types.map(type=>{const image=art.sprite(type);return {type,w:image.width,h:image.height}}),count:art.stats().spriteCount};
  });
  assert(premium&&premium.count===11&&premium.types.every(x=>x.w>=256&&x.h>=256),'all premium offline prelit sprites must exist at full 256px resolution '+JSON.stringify(premium));

  assert.equal(await page.locator('#arWorld #fx-scene').count(),0,'no rebuilt SVG scene remains');
  assert(await page.locator('#weapon').isVisible(),'first-person Juice Blaster must be visible');
  await page.screenshot({path:'frutastrofe-ar-world-projection-mobile.png',animations:'disabled'});
  await page.waitForFunction(()=>window.__frutaQA.state().elapsed>7,null,{timeout:16000});
  const wave=await page.evaluate(()=>({objects:window.__frutaQA.state().objects,targets:window.__frutaQA.previewWorld(0).length}));
  assert(wave.objects>=3&&wave.objects<=12,'sky fruit must arrive in spaced manageable waves '+JSON.stringify(wave));
  await page.screenshot({path:'frutastrofe-ar-dense-volley-mobile.png',animations:'disabled'});
  assert(await page.evaluate(()=>window.__frutaQA.shootTest()),'hitting a spawned fruit in AR must succeed');
  await page.waitForTimeout(135);
  await page.evaluate(()=>window.__frutaQA.previewWorld());
  assert(await page.locator('#frutastrofe-canvas').isVisible(),'impact should be drawn on canvas');
  const fx=await page.evaluate(()=>window.__frutaQA.diagnostics());
  assert(fx.particles>=4&&fx.particles<=24&&fx.shotsEver>=1&&fx.svgNodes===0,'canvas blast must render without an SVG subtree '+JSON.stringify(fx));
  await page.screenshot({path:'frutastrofe-ar-impact-mobile.png',animations:'disabled'});
  // Real pointer hold on the actual button, not a simulated direct core call.
  const beforeShots=await page.evaluate(()=>window.__frutaQA.state().shots);
  const fireRect=await page.locator('#fireBtn').boundingBox();
  assert(fireRect,'fire trigger must be in viewport');
  await page.mouse.move(fireRect.x+fireRect.width*.5,fireRect.y+fireRect.height*.5);
  await page.mouse.down();await page.waitForTimeout(540);await page.mouse.up();
  const afterShots=await page.evaluate(()=>window.__frutaQA.state().shots);
  assert(afterShots-beforeShots>=3,'holding the trigger should emit a real rapid barrage: '+(afterShots-beforeShots));
  await page.waitForTimeout(200);
  assert(!await page.locator('#fireBtn').evaluate(el=>el.classList.contains('is-firing')),'auto fire must stop after release');
  const perfBefore=await page.evaluate(()=>({elapsed:window.__frutaQA.state().elapsed,render:window.__frutaQA.diagnostics().renders}));
  // Actual real AR drives draw() from XR frames. In headless Chrome, emulate those
  // real-world projection frames at 20 FPS throughout the continuous trigger hold.
  await page.evaluate(()=>{window.__frutaProjectionLoop=setInterval(()=>window.__frutaQA.previewWorld(0),50)});
  await page.mouse.down();await page.waitForTimeout(1800);await page.mouse.up();
  await page.evaluate(()=>{clearInterval(window.__frutaProjectionLoop);window.__frutaProjectionLoop=null});
  const perfAfter=await page.evaluate(()=>({elapsed:window.__frutaQA.state().elapsed,render:window.__frutaQA.diagnostics().renders,fx:window.__frutaQA.diagnostics()}));
  assert(perfAfter.elapsed-perfBefore.elapsed>=1.15,'game simulation must continue during extended rapid fire '+JSON.stringify({perfBefore,perfAfter}));
  assert(perfAfter.render-perfBefore.render>=15,'scene must keep rendering in sustained firing '+JSON.stringify({perfBefore,perfAfter}));
  assert(perfAfter.fx.svgNodes===0&&perfAfter.fx.particles<=24&&perfAfter.fx.shots<=2&&perfAfter.fx.averageDrawMs<20,'long burst must not accumulate effects or slow painting '+JSON.stringify(perfAfter.fx));
  console.log('AR CANVAS RAPID FIRE METRICS',JSON.stringify({perfBefore,perfAfter}));
  await page.locator('#pauseBtn').click();
  assert(await page.locator('#pausePanel').isVisible());
  const paused=await page.locator('#hudTime').textContent();await page.waitForTimeout(250);assert.equal(await page.locator('#hudTime').textContent(),paused);
  await page.locator('#resumeBtn').click();assert(await page.locator('#hud').isVisible());
  await page.locator('#pauseBtn').click();await page.locator('#quitBtn').click();assert(await page.locator('#home').isVisible());
  await page.locator('#campaign').click();
  await page.locator('#levelPlay').click();
  await page.waitForTimeout(500);
  assert(!await page.locator('#hud').isVisible(),'unsupported XR must not start a hidden non-AR game');
  const adHostError=x=>x.includes('server.ethicalads.io/')||x.includes('srv.carbonads.net/')||x.includes('ad.doubleclick.net/ddm/trackimp/');
  const blockedAd=errors.some(adHostError);
  const appErrors=errors.filter(x=>!x.includes('No runtimes supported the requested configuration')&&!adHostError(x)&&!(Boolean(process.env.FRUTA_BROWSER_BASE)&&blockedAd&&x==='CONSOLE Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin'));
  assert.equal(appErrors.length,0,appErrors.join(' | '));
  await page.goto(url+'/index.html');if((await page.title()).includes('External Content Notice'))await page.getByText('Open the page',{exact:true}).click();
  assert.equal(await page.locator('a[href="/frutastrofe.html"]').count(),1);
  console.log('PASS FRUTÁSTROFE: AR-only menus, unsupported XR guard, anchored projected fruit sprites, viewer parallax, timer, pause, exit');
 }catch(err){console.error(err.stack||err);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
