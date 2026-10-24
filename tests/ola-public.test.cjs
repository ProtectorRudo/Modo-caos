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
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:35000});
  assert(response?.ok(),'public HTTP '+response?.status());
  try{await page.locator('#demo').waitFor({state:'visible',timeout:12000})}
  catch(error){console.error('PUBLIC DIAG',JSON.stringify({
   url:page.url(),status:response?.status(),title:await page.title(),
   body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1200),
   html:(await page.content()).slice(0,600)}));throw error}
  const title=await page.title();assert(title.includes('OLA ROJA'),'right public game');
  await page.locator('#demo').click();
  assert(await page.locator('#canvas2D').isVisible(),'public 2D canvas visible');
  await page.locator('#begin').click();
  await page.waitForTimeout(4100);
  assert(Number(await page.locator('#time').innerText())<90,'live game clock advances');
  assert.equal(errors.length,0,'no broken public script URLs or JS: '+errors.join(' / '));
  console.log('LIVE PREVIEW PASS:',URL,'title:',title);
 }catch(e){console.error('LIVE PREVIEW FAILED',URL,e.stack||e);process.exitCode=1}
 finally{await browser?.close()}
})();
