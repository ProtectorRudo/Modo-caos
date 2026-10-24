'use strict';
/* Verifies a THIRD-PARTY static HTML mirror directly, not Vercel publication.
 * This preview host is outside our control and should not be considered production. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const URL=process.env.OLA_PUBLIC_URL||'https://raw.githack.com/ProtectorRudo/Modo-caos/main/ola.html';
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[],failed=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')consoleErrors.push(m.text())});
  page.on('requestfailed',r=>failed.push(r.url()+' '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url())});
  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:35000});
  assert(response?.ok(),'public HTTP '+response?.status());
  if((await page.title()).includes('External Content Notice')){
   await page.getByText('Open the page',{exact:true}).click();
  }
  try{await page.locator('#demo').waitFor({state:'visible',timeout:12000})}
  catch(error){console.error('PUBLIC DIAG',JSON.stringify({
   url:page.url(),status:response?.status(),title:await page.title(),
   body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1200),
   html:(await page.content()).slice(0,600)}));throw error}
  const title=await page.title();assert(title.includes('OLA ROJA'),'right public game');
  // El HTML puede estar visible varios segundos ANTES de sus 4 scripts externos.
  // Esperar que el motor AR/2D exista realmente; nunca simular un click exitoso.
  await page.waitForFunction(()=>window.OlaRojaCore&&window.OlaRojaArt&&
   document.querySelector('#demo')&&!document.querySelector('#demo').disabled,
   null,{timeout:30000});
  await page.locator('#demo').click();
  if(!await page.locator('#canvas2D').isVisible()){
   console.error('PUBLIC DEMO DIAG',JSON.stringify({
    page:page.url(),errors,failed,consoleErrors,
    scripts:await page.evaluate(()=>[...document.scripts].map(s=>({src:s.src,ready:s.readyState}))),
    jsState:await page.evaluate(()=>({
     core:!!window.OlaRojaCore,art:!!window.OlaRojaArt,callback:!!window.modoCaosXRFrame,
     csp:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content||null
    })),
    button:await page.locator('#demo').isVisible(),
    html:(await page.locator('body').innerText()).slice(0,800)
   }));
  }
  assert(await page.locator('#canvas2D').isVisible(),'public 2D canvas visible');
  await page.locator('#begin').click();
  await page.waitForTimeout(4100);
  assert(Number(await page.locator('#time').innerText())<90,'live game clock advances');
  assert.equal(errors.length,0,'no broken public script URLs or JS: '+errors.join(' / '));
  console.log('LIVE PREVIEW PASS (with third-party safety notice):',URL,'title:',title);
 }catch(e){console.error('LIVE PREVIEW FAILED',URL,e.stack||e);process.exitCode=1}
 finally{await browser?.close()}
})();
