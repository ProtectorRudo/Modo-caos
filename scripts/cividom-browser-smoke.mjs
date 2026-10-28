import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const root='http://127.0.0.1:4173';
const twoDOnly=process.argv.includes('--2d');
const browser=await chromium.launch({
 headless:true,
 args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:412,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 if(twoDOnly)await page.route('**/paper-3d.mjs*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'/* 2D-only controlled benchmark: no GLB renderer */'}));
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
 const compactHUD=await page.evaluate(()=>{
  const panel=document.getElementById('survivalPanel')?.getBoundingClientRect();
  const map=document.querySelector('.cvMiniMapFrame')?.getBoundingClientRect();
  const stats=document.querySelector('#survivalPanel .survivalStats')?.getBoundingClientRect();
  const canvas=document.getElementById('mini')?.getBoundingClientRect();
  const metrics=Array.from(document.querySelectorAll('#survivalPanel .miniMetric')).map(el=>el.getBoundingClientRect().toJSON());
  return {panel:panel?.toJSON(),map:map?.toJSON(),stats:stats?.toJSON(),canvas:canvas?.toJSON(),metrics,
   text:document.getElementById('nextZoneLabel')?.textContent,
   background:getComputedStyle(document.getElementById('mini')).backgroundColor,
   labels:Array.from(document.querySelectorAll('#survivalPanel .miniMetricLabel')).map(el=>({
    text:el.textContent,font:parseFloat(getComputedStyle(el).fontSize),width:el.clientWidth,scrollWidth:el.scrollWidth
   })),
   statsFont:parseFloat(getComputedStyle(document.getElementById('survivalKills')).fontSize),
   values:Array.from(document.querySelectorAll('#survivalPanel .miniMetricValue')).map(el=>({
    rect:el.getBoundingClientRect().toJSON(),
    scrollWidth:el.scrollWidth,
    clientWidth:el.clientWidth
   })),
   viewport:window.innerWidth};
 });
 assert.ok(compactHUD.map&&compactHUD.stats,'mini map and status strip must render');
 assert.ok(compactHUD.map.width>=100&&compactHUD.map.width<=136,'map must be compact on mobile: '+compactHUD.map.width);
 assert.ok(compactHUD.map.height<=136,'map must not cover too much gameplay space');
 assert.ok(compactHUD.stats.top>=compactHUD.map.bottom-2,'status strip must be BELOW map, never at left');
 assert.ok(compactHUD.panel.height<178,'combined HUD must occupy less than 178px');
 assert.ok(compactHUD.viewport-compactHUD.panel.right<=16,'map must sit in top-right corner');
 assert.equal(compactHUD.metrics.length,3,'clock, live players, and eliminations on a single strip');
 assert.equal(compactHUD.background,'rgb(255, 255, 255)','the mini map canvas background must stay white');
 assert.ok(compactHUD.stats.width>=143,'3 metric ribbon must be wide enough to read: '+compactHUD.stats.width);
 assert.ok(compactHUD.statsFont>=13,'elimination count must be clearly readable');
 assert.deepEqual(compactHUD.labels.map(x=>x.text),['TORMENTA','VIVOS','BAJAS']);
 assert.equal(compactHUD.values.length,3);
 assert.ok(compactHUD.values.every(x=>x.scrollWidth<=x.clientWidth+1),'numbers and icons must not clip');
 assert.ok(compactHUD.values.every((x,i)=>x.rect.left>=compactHUD.metrics[i].left-2&&
  x.rect.right<=compactHUD.metrics[i].right+2),'legacy icon paddings must not overflow metric cells');
 assert.ok(compactHUD.labels.every(x=>x.font>=7.5&&x.scrollWidth<=x.width+1),'all metric names fit without clipping');
 assert.ok(compactHUD.stats.right<=compactHUD.viewport-4,'expanded ribbon must remain on screen');
 for(let i=0;i<2;i++)assert.ok(compactHUD.metrics[i].right<=compactHUD.metrics[i+1].left+1,'HUD metrics must not overlap');
 assert.match(compactHUD.text||'',/^\d+:\d{2}$/,'the zone countdown must fit mm:ss');
 console.log('CIVIDOM_COMPACT_HUD='+JSON.stringify(compactHUD));
 const elapsed=(Date.now()-started)/1000;
 const frames=await page.evaluate(async()=>new Promise(resolve=>{
  let n=0,first=performance.now();
  const f=()=>{n++;if(performance.now()-first<1200)requestAnimationFrame(f);
  else resolve({fps:n/((performance.now()-first)/1000),frames:n});};
  requestAnimationFrame(f);
 }));
 estimatedFps=Math.round(frames.fps*10)/10;
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/cividom-mobile-'+(twoDOnly?'2d':'3d')+'.png'});
 const diagnostic={version:'rollback-before-visual-v2',mode:twoDOnly?'2D_ONLY':'2D_PLUS_3D',samples,errors,maxTrail,everOutside,dead,gameClock:lastClock,estimatedFps,elapsed,compactHUD};
 await writeFile('artifacts/cividom-browser-audit-'+(twoDOnly?'2d':'3d')+'.json',JSON.stringify(diagnostic,null,2));
 console.log('CIVIDOM_BROWSER_AUDIT='+JSON.stringify({mode:twoDOnly?'2D_ONLY':'2D_PLUS_3D',maxTrail,everOutside,gameClock:lastClock,estimatedFps,elapsed,errors:errors.slice(0,6),samples:samples.length,dead}));
 assert.ok(lastClock>=.6,'gameplay must advance past initial island exit even under software GPU emulation');
 assert.ok(everOutside,'player must leave the starting territory when moving');
 assert.ok(maxTrail>=3,'user trail must be generated after leaving the starting territory');
 assert.ok(estimatedFps>2,'the browser must not be totally frozen');
 assert.equal(errors.filter(x=>x.startsWith('pageerror:')).length,0,'no unhandled page JavaScript errors');
 await context.close();
}catch(e){console.error('CIVIDOM_BROWSER_QA_FAILURE',e.stack||e);process.exitCode=1;}
finally{await browser.close();}
