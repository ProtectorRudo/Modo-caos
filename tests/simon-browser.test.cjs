'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');
const {setTimeout:wait}=require('node:timers/promises');
(async()=>{
 let web=null,browser=null;const port=19021;
 try{
  web=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.join(__dirname,'..'),stdio:'ignore'});
  await wait(850);
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/simon.html');
  await page.locator('#demo').click();
  await page.locator('#grid .tile2d').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#grid .tile2d').count(),9,'9 baldosas 2D');
  await page.evaluate(()=>{window.__steps=[];window.__cueErrors=[];window.__prev=-1;window.__watch=setInterval(()=>{
   const lit=document.querySelector('#grid .tile2d.lit'),n=lit?Number(lit.dataset.cell):-1;
   if(n>=0&&n!==window.__prev){
    window.__steps.push(n);
    const expected='PASO '+window.__steps.length+'/2';
    const cue=document.getElementById('seqMain').textContent;
    if(!cue.includes(expected)||!cue.includes(window.SimonCore.COLORS[n].name))
     window.__cueErrors.push({expected,n,cue});
   }
   window.__prev=n;
  },15)});
  await page.locator('#startGame').click();
  assert(await page.locator('#sequenceGuide').isVisible(),'sequence guide appears during playback');
  assert((await page.locator('#seqTop').textContent()).includes('MIRÁ'),'explicit WATCH instruction');
  await page.waitForFunction(()=>document.getElementById('phase').textContent.includes('AHORA VOS'),{timeout:9000});
  const {seq,cueErrors}=await page.evaluate(()=>{clearInterval(window.__watch);return{seq:window.__steps,cueErrors:window.__cueErrors}});
  assert.equal(seq.length,2,'round 1 shows exactly two tiles: '+JSON.stringify(seq));
  assert.deepEqual(cueErrors,[],'each lit tile matches the visible ordinal and color name');
  assert((await page.locator('#seqTop').textContent()).includes('TU TURNO'),'clear turn handoff');
  assert((await page.locator('#seqMain').textContent()).includes('PASO 1/2'),'turn starts at 1/2');
  await page.locator('#grid .tile2d').nth(seq[0]).click();
  assert((await page.locator('#seqMain').textContent()).includes('PASO 2/2'),'progress increments after correct first step');
  await page.locator('#grid .tile2d').nth(seq[1]).click();
  await page.waitForFunction(()=>document.getElementById('round').textContent==='2',{timeout:9000});
  assert((Number((await page.locator('#score').textContent()).replace(/\D/g,''))||0)>0,'score raised');
  assert.deepEqual(errors,[],'no browser JS errors');
  console.log('PASS Chromium móvil: render 9 baldosas, reproducción, entrada 2D, aciertos, puntuación, siguiente ronda');
 }finally{
  if(browser)await browser.close();
  if(web)web.kill('SIGTERM');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
