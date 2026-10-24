'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
  '--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto('https://modo-caos-eta.vercel.app/rodeados.html',{waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.__RodeadosDebug,{timeout:30000});
  await page.getByRole('button',{name:/ENTRENAMIENTO 3D SIN CÁMARA/}).click();
  await page.waitForFunction(()=>window.__RodeadosDebug.stage==='playing',{timeout:10000});
  await page.waitForTimeout(1100);
  const before=await page.evaluate(()=>window.__RodeadosDebug.game);
  assert(before.elapsed>.1,'game clock must advance');
  assert(await page.locator('#radarWrap').isVisible(),'radar must be visible');
  assert(await page.locator('#fire').isVisible(),'shoot button must be visible');
  await page.locator('#fire').click();
  await page.waitForTimeout(250);
  const after=await page.evaluate(()=>window.__RodeadosDebug.game);
  assert(after.shots>=before.shots+1,'shot must be recorded');
  assert(after.ammo===before.ammo-1,'ammo decreases on shot');
  assert.equal(errors.length,0,'no unhandled JS errors: '+errors.join(' | '));
  const canvas=await page.locator('#world canvas').evaluate(el=>({w:el.width,h:el.height}));
  assert(canvas.w>100&&canvas.h>100,'rendering canvas must have dimensions');
  console.log(JSON.stringify({result:'LIVE 3D GAME WORKS',url:page.url(),elapsed:after.elapsed,shots:after.shots,ammo:after.ammo,radar:'visible',webgl:'rendering',javascriptErrors:errors.length,canvas},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
