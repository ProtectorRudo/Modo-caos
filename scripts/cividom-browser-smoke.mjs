import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const root='http://127.0.0.1:4173';
const browser=await chromium.launch({
 headless:true,
 args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:412,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error'&&errors.length<30)errors.push('console: '+m.text());});
 const res=await page.goto(root+'/paper.html?qa=1',{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(res.status(),200,'the actual paper.html must load over HTTP');
 await page.evaluate(()=>document.getElementById('start').click());
 await page.waitForFunction(()=>window.territoryQA?.mode==='play',{timeout:10000});
 const started=Date.now();
 let maxTrail=0,everOutside=false,dead=false;
 let samples=[],lastClock=0,estimatedFps=0;
 while(Date.now()-started<8500){
  await page.waitForTimeout(230);
  const sample=await page.evaluate(()=>({
   t:Math.round(performance.now()),
   mode:window.territoryQA?.mode,
   clock:window.territoryQA?.clock,
   x:window.territoryQA?.x,
   y:window.territoryQA?.y,
   alive:window.territoryQA?.alive,
   outside:window.territoryQA?.outside,
   trail:window.territoryQA?.trail,
   players:window.territoryQA?.players,
   canvas:{
    w:document.getElementById('game').width,
    h:document.getElementById('game').height
   }
  }));
  samples.push(sample);
  maxTrail=Math.max(maxTrail,sample.trail||0);
  everOutside=everOutside||!!sample.outside;
  dead=dead||(sample.alive===false);
  lastClock=sample.clock||0;
  if(maxTrail>=4&&lastClock>1.25)break;
 }
 const elapsed=(Date.now()-started)/1000;
 const frames=await page.evaluate(async()=>new Promise(resolve=>{
  let n=0,first=performance.now();
  const f=()=>{n++;if(performance.now()-first<1200)requestAnimationFrame(f);
  else resolve({fps:n/((performance.now()-first)/1000),frames:n});};
  requestAnimationFrame(f);
 }));
 estimatedFps=Math.round(frames.fps*10)/10;
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/cividom-mobile-qa.png'});
 const diagnostic={version:'rollback-before-visual-v2',samples,errors,maxTrail,everOutside,dead,gameClock:lastClock,estimatedFps,elapsed};
 await writeFile('artifacts/cividom-browser-audit.json',JSON.stringify(diagnostic,null,2));
 console.log('CIVIDOM_BROWSER_AUDIT='+JSON.stringify({maxTrail,everOutside,gameClock:lastClock,estimatedFps,elapsed,errors:errors.slice(0,6),samples:samples.length,dead}));
 assert.ok(lastClock>=1.1,'gameplay must advance past 1 second');
 assert.ok(everOutside,'player must leave the starting territory when moving');
 assert.ok(maxTrail>=3,'user trail must be generated after leaving the starting territory');
 assert.ok(estimatedFps>3,'the browser must not be totally frozen');
 assert.equal(errors.filter(x=>x.startsWith('pageerror:')).length,0,'no unhandled page JavaScript errors');
 await context.close();
}catch(e){console.error('CIVIDOM_BROWSER_QA_FAILURE',e.stack||e);process.exitCode=1;}
finally{await browser.close();}
