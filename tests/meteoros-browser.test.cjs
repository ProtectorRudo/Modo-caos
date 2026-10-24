'use strict';
/* Browser smoke test on local static server: real DOM, Canvas, controls and HUD.
 * This does NOT claim physical ARCore/WebXR testing. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
 let file;try{file=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
 if(file==='/')file='/index.html';
 const absolute=path.resolve(root,'.'+file);
 if(!absolute.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(absolute,(err,data)=>{
  if(err){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'content-type':mime[path.extname(absolute)]||'application/octet-stream','cache-control':'no-store'});
  res.end(data);
 });
});
(async()=>{
 let browser;
 try{
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',err=>err?reject(err):resolve()));
  const url='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(url+'/meteoros.html',{waitUntil:'load'});
  assert(await page.locator('#demo').isVisible(),'2D demo button visible');
  assert(await page.locator('#enter').isVisible(),'AR camera entry visible');
  await page.locator('#demo').click();
  assert(await page.locator('#canvas2D').isVisible(),'demo canvas available');
  assert(await page.locator('#begin').isEnabled(),'calibrated demo can begin');
  await page.locator('#begin').click();
  await page.waitForTimeout(4150); // countdown ~3 s, first score and warnings.
  const remaining=Number(await page.locator('#time').innerText());
  assert(remaining<72&&remaining>=66,'timer decremented in a real browser: '+remaining);
  const score=Number((await page.locator('#score').innerText()).replace(/[^0-9]/g,''));
  assert(score>0,'survival scoring advances');
  const canvas=await page.locator('#canvas2D').evaluate(c=>{
   const ctx=c.getContext('2d'),w=c.width,h=c.height,p=ctx.getImageData(Math.floor(w*.50),Math.floor(h*.5),1,1).data;
   return{width:w,height:h,alpha:p[3],color:[...p.slice(0,3)]};
  });
  assert(canvas.width>=393&&canvas.height>=852&&canvas.alpha>0,'canvas draws actual imagery');
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  await page.locator('#canvas2D').click({position:{x:230,y:400}});
  await page.locator('#music').click();
  assert.equal(await page.locator('#music').innerText(),'🔇','sound toggles');
  assert.equal(errors.length,0,'no browser runtime errors: '+errors.join(' / '));
  await page.goto(url+'/meteoros.html',{waitUntil:'load'});
  await page.locator('#enter').click();
  await page.waitForTimeout(200);
  assert((await page.locator('#precheck').innerText()).includes('Fallo al iniciar') ||
         (await page.locator('#precheck').innerText()).includes('no ofrece WebXR'),
         'unsupported desktop WebXR gives a clear fallback');
  assert.equal(errors.length,0,'no errors while entering AR without WebXR');
  await page.goto(url+'/index.html',{waitUntil:'load'});
  assert((await page.locator('a[href="/meteoros.html"]').count())===1,'game appears in arcade');
  await page.goto(url+'/salas.html',{waitUntil:'load'});
  assert((await page.locator('#gameChoice option[value="lluvia-meteoros"]').count())===1,'game selectable in room lobby');
  console.log('PASS: Chromium mobile viewport, game entry, full Canvas render, countdown, scoring, movement, sound, fallback, arcade and rooms.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
