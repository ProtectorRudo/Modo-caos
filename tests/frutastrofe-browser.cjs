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
  const resp=await page.goto(url+'/frutastrofe.html?qa=1',{waitUntil:'domcontentloaded',timeout:40000});
  console.log('FRUTÁSTROFE browser initial:',JSON.stringify({url:page.url(),status:resp?.status(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,230)}));
  if((await page.title()).includes('External Content Notice')){await page.getByText('Open the page',{exact:true}).click({timeout:12000});console.log('AFTER WARNING',page.url(),await page.title())}
  try{await page.locator('#view canvas').waitFor({state:'visible',timeout:35000})}
  catch(err){console.log('GAME RENDER DIAG',JSON.stringify({url:page.url(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,700),errors}));throw err}
  assert(await page.locator('#campaign').isVisible());assert(await page.locator('#arcade').isVisible());
  await page.screenshot({path:'frutastrofe-menu-mobile.png',animations:'disabled'});
  await page.locator('#campaign').click();
  assert(await page.locator('#selector').isVisible());
  assert.equal(await page.locator('.lvl:enabled').count(),1);
  await page.locator('#levelPlay').click();assert(await page.locator('#readyOverlay').isVisible());
  await page.locator('#goBtn').click();assert(await page.locator('#hud').isVisible());
  await page.waitForFunction(()=>window.__frutaQA?.state().elapsed>1,null,{timeout:12000});
  const time=Number(await page.locator('#hudTime').textContent());assert(time<54&&time>43,'game clock ticks: '+time+' '+JSON.stringify(await page.evaluate(()=>window.__frutaQA.state())));
  await page.screenshot({path:'frutastrofe-game-mobile.png',animations:'disabled'});
  await page.locator('#fireBtn').click();await page.locator('#pauseBtn').click();
  assert(await page.locator('#pausePanel').isVisible());
  const before=await page.locator('#hudTime').textContent();await page.waitForTimeout(300);assert.equal(await page.locator('#hudTime').textContent(),before);
  await page.locator('#resumeBtn').click();assert(await page.locator('#hud').isVisible());
  await page.locator('#pauseBtn').click();await page.locator('#quitBtn').click();assert(await page.locator('#home').isVisible());
  // Githack injects its own external advertisement script; a blocked external ad is unrelated to our game.
  const adBlocked=errors.some(x=>x.includes('server.ethicalads.io/')&&x.includes('ERR_BLOCKED_BY_RESPONSE'));
  const appErrors=errors.filter(x=>!x.includes('server.ethicalads.io/')&&!(Boolean(process.env.FRUTA_BROWSER_BASE)&&adBlocked&&x==='CONSOLE Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin'));
  assert.equal(appErrors.length,0,appErrors.join(' | '));
  await page.goto(url+'/index.html');assert.equal(await page.locator('a[href="/frutastrofe.html"]').count(),1);
  console.log('PASS FRUTÁSTROFE: 3D canvas, mobile gameplay, timer, pause/resume, menu, screenshot; no JS errors');
 }catch(err){console.error(err.stack||err);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
