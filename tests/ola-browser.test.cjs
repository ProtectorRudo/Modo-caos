'use strict';
/* Chromium smoke: DOM, 2D mobile canvas, 90s countdown, collision UI, controls.
 * This is not a real ARCore or phone movement certification. */
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname,rel=route==='/'?'/index.html':route;
 if(rel==='/favicon.ico'){res.writeHead(204);res.end();return}
 const full=path.resolve(root,'.'+rel);
 if(!full.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(full,(err,bytes)=>{if(err){res.writeHead(404);res.end();return}
  res.writeHead(200,{'content-type':path.extname(full)==='.html'?'text/html':'text/javascript'});res.end(bytes)});
});
(async()=>{
 let browser;try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push('JS '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('LOG '+m.text())});
  await page.goto(base+'/ola.html?mc_test=1',{waitUntil:'load'});
  assert(await page.locator('#enter').isVisible(),'AR entry visible');
  assert(await page.locator('#demo').isVisible(),'full 2D demo button visible');
  await page.locator('#demo').click();
  assert(await page.locator('#canvas2D').isVisible(),'2D board visible');
  assert(await page.locator('#begin').isEnabled(),'demo can begin');
  await page.locator('#begin').click();
  await page.waitForTimeout(4250);
  const seconds=Number(await page.locator('#time').innerText());
  assert(seconds<90&&seconds>84,'90 s timer running: '+seconds);
  const score=Number((await page.locator('#score').innerText()).replace(/[^0-9]/g,''));
  assert(score>0,'score grows during survival');
  const pixels=await page.locator('#canvas2D').evaluate(c=>{
   const s=c.getContext('2d'),v=s.getImageData(c.width/2|0,c.height/2|0,1,1).data;
   return{w:c.width,h:c.height,alpha:v[3]}
  });
  assert(pixels.w>380&&pixels.h>800&&pixels.alpha>0,'visible game board painted');
  const before=await page.evaluate(()=>({p:window.OlaRojaCore?.N}));
  assert.equal(before.p,6,'six by six rules imported');
  await page.locator('#canvas2D').click({position:{x:290,y:390}});
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(240);await page.keyboard.up('ArrowLeft');
  await page.locator('#music').click();
  assert.equal(await page.locator('#music').innerText(),'🔇','mute works');
  await page.locator('#pause').click();
  assert(await page.locator('#pauseDialog').isVisible(),'pause UI');
  const paused=await page.locator('#time').innerText();
  await page.waitForTimeout(280);
  assert.equal(await page.locator('#time').innerText(),paused,'pausing stops timer');
  await page.locator('#resume').click();
  assert(!await page.locator('#pauseDialog').isVisible(),'resumed correctly');
  assert(await page.evaluate(()=>window.__olaTestFinish('victoria')),'finish game after 90s simulation');
  assert(await page.locator('#result').isVisible(),'result screen visible');
  assert((await page.locator('#resultTitle').innerText()).includes('SOBREVIVISTE'),'victory is celebrated');
  await page.locator('#infinite').click();
  assert(!await page.locator('#result').isVisible(),'infinite mode resets results');
  assert.equal((await page.evaluate(()=>window.__olaTestSnapshot())).mode,'infinito','infinite mode initialized');
  assert(await page.locator('#begin').isEnabled(),'infinite retry is playable');
  await page.locator('#begin').click();
  assert((await page.evaluate(()=>window.__olaTestSnapshot())).running,'infinite game restarts cleanly');
  assert.equal(errors.length,0,'no JavaScript errors: '+errors.join(' / '));
  await page.goto(base+'/index.html');
  assert.equal(await page.locator('a[href="/ola.html"]').count(),1,'OLA ROJA in central menu');
  console.log('PASS: Chromium móvil, 6x6, canvas visible, reloj, score, controles demo, sonido, pausa y menú');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
