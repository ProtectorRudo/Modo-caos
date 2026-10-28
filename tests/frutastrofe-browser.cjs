'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css'};
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://127.0.0.1').pathname;const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(buf)})});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push('JS '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});page.on('requestfailed',r=>errors.push('REQUEST '+r.url()+' '+r.failure()?.errorText));
  await page.goto(url+'/frutastrofe.html',{waitUntil:'load',timeout:40000});
  await page.locator('#view canvas').waitFor({state:'visible',timeout:35000});
  assert(await page.locator('#campaign').isVisible());assert(await page.locator('#arcade').isVisible());
  await page.screenshot({path:'frutastrofe-menu-mobile.png',animations:'disabled'});
  await page.locator('#campaign').click();
  assert(await page.locator('#selector').isVisible());
  assert.equal(await page.locator('.lvl:enabled').count(),1);
  await page.locator('#levelPlay').click();assert(await page.locator('#readyOverlay').isVisible());
  await page.locator('#goBtn').click();assert(await page.locator('#hud').isVisible());
  await page.waitForTimeout(1600);
  const time=Number(await page.locator('#hudTime').textContent());assert(time<54&&time>50,'game clock ticks: '+time);
  await page.screenshot({path:'frutastrofe-game-mobile.png',animations:'disabled'});
  await page.locator('#fireBtn').click();await page.locator('#pauseBtn').click();
  assert(await page.locator('#pausePanel').isVisible());
  const before=await page.locator('#hudTime').textContent();await page.waitForTimeout(300);assert.equal(await page.locator('#hudTime').textContent(),before);
  await page.locator('#resumeBtn').click();assert(await page.locator('#hud').isVisible());
  await page.locator('#pauseBtn').click();await page.locator('#quitBtn').click();assert(await page.locator('#home').isVisible());
  assert.equal(errors.length,0,errors.join(' | '));
  await page.goto(url+'/index.html');assert.equal(await page.locator('a[href="/frutastrofe.html"]').count(),1);
  console.log('PASS FRUTÁSTROFE: 3D canvas, mobile gameplay, timer, pause/resume, menu, screenshot; no JS errors');
 }catch(err){console.error(err.stack||err);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
