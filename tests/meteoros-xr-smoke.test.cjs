'use strict';
/* Synthetic WebXR browser integration test.
 * Only the browser and WebGL are real; poses/Hit Test are simulated.
 * NEVER report as a physical phone/ARCore verification. */
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const base=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400).end();return}
 if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return}
 let pathName=url.pathname==='/'?'/index.html':url.pathname;
 const full=path.resolve(base,'.'+pathName);
 if(!full.startsWith(base+path.sep)){res.writeHead(403).end();return}
 fs.readFile(full,(err,data)=>{
  if(err){res.writeHead(404).end();return}
  res.writeHead(200,{'content-type':path.extname(full)==='.html'?'text/html':'text/javascript'});
  res.end(data);
 });
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push('PAGE: '+e.message));
  page.on('console',m=>{
   if(m.type()==='error'&&!m.text().includes('WebGL'))pageErrors.push('CONSOLE: '+m.text());
  });
  await page.addInitScript(()=>{
   const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
   const floor=identity();floor[14]=-.28;
   window.__xrPos={x:0,y:1.12,z:0};
   window.__xrDrawCalls=0;
   const orig=WebGLRenderingContext.prototype.drawArrays;
   WebGLRenderingContext.prototype.drawArrays=function(...args){
    window.__xrDrawCalls++;return orig.apply(this,args);
   };
   WebGLRenderingContext.prototype.makeXRCompatible=async function(){};
   const view={projectionMatrix:identity(),transform:{inverse:{matrix:identity()}}};
   const hit={getPose:()=>({transform:{matrix:floor}}),createAnchor:async()=>({anchorSpace:{},delete(){}})};
   const frame={
    getViewerPose:()=>({views:[view],transform:{position:window.__xrPos},emulatedPosition:false}),
    getHitTestResults:()=>[hit],
    getPose:()=>({transform:{matrix:floor}})
   };
   const session={
    renderState:{baseLayer:null},
    listeners:{},
    requestAnimationFrame(cb){return window.requestAnimationFrame(t=>cb(t,frame))},
    updateRenderState(state){Object.assign(this.renderState,state)},
    async requestReferenceSpace(type){return{type}},
    async requestHitTestSource(){return{}},
    addEventListener(event,cb){(this.listeners[event]||=[]).push(cb)},
    async end(){for(const cb of this.listeners.end||[])cb()}
   };
   class FakeLayer{
    constructor(_session,gl){this.framebuffer=null;this.gl=gl}
    getViewport(){return{x:0,y:0,width:this.gl.drawingBufferWidth||1,height:this.gl.drawingBufferHeight||1}}
   }
   Object.defineProperty(window,'XRWebGLLayer',{configurable:true,value:FakeLayer});
   Object.defineProperty(navigator,'xr',{configurable:true,value:{
    isSessionSupported:async()=>true,
    requestSession:async()=>session
   }});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+''+(process.env.METEORS_PAGE||'/meteoros.html')+'?mc_test=1',{waitUntil:'load'});
  await page.evaluate(()=>window.__xrPos.x=.38); // nonzero floor offset catches rotation orbiting
  await page.locator('#enter').click();
  await page.waitForFunction(()=>{
   const b=document.getElementById('lock');return b&&!b.disabled&&getComputedStyle(b).display!=='none';
  },{timeout:7000});
  await page.waitForFunction(()=>window.__meteorTestSnapshot?.()?.previewCenter,{timeout:7000});
  assert(await page.locator('#lock').isVisible(),'place-arena action visible');
  assert(await page.locator('#touchpad').isVisible(),'drag and pinch surface is interactive');
  assert(await page.locator('#toolbar').isVisible(),'size and rotate controls visible');
  const initial=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(initial.previewCenter,'pre-placement world anchor is captured');
  const initSize=initial.gestures.size;
  await page.locator('#plus').click();
  const larger=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(larger.gestures.size>initSize,'plus enlarges square playing field');
  await page.locator('#minus').click();
  const same=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(Math.abs(same.gestures.size-initSize)<.001,'minus shrinks square playing field');
  await page.locator('#rotate').click();
  await page.waitForTimeout(100);
  const turned=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(turned.gestures.yaw>initial.gestures.yaw+.20,'rotate button changes actual XR yaw');
  assert(Math.abs(turned.arenaWorld.x-same.arenaWorld.x)<.002 &&
         Math.abs(turned.arenaWorld.z-same.arenaWorld.z)<.002,
         'rotating the square preserves its center on the floor');
  await page.mouse.move(155,385);
  await page.mouse.down();
  await page.mouse.move(203,408,{steps:5});
  await page.mouse.up();
  const dragged=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(Math.hypot(dragged.gestures.dx-turned.gestures.dx,dragged.gestures.dz-turned.gestures.dz)>.05,
    'single-finger drag moves placement before locking');
  // Actual two-pointer touch gesture through Chromium's Input dispatcher.
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:375,id:1},{x:252,y:375,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:117,y:360,id:1},{x:270,y:395,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:105,y:347,id:1},{x:286,y:410,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const pinched=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(pinched.gestures.size>dragged.gestures.size+.01,'two-finger pinch enlarges actual physical arena');
  assert(Math.abs(pinched.gestures.yaw-dragged.gestures.yaw)>.12,'two-finger twist rotates actual arena');
  assert(/m/.test(await page.locator('#size').innerText()),'size label uses full square width in meters');
  const side=2*1.12*(pinched.gestures.size/.45);
  assert(side>=1.59&&side<=3.25,'playable physical square is bounded to safe size range');
  await page.locator('#lock').click();
  await page.waitForFunction(()=>window.__meteorTestSnapshot?.()?.pickerActive,{timeout:6500});
  assert(await page.locator('#arenaSvg').isVisible(),'floor-cell picking grid is visible after floor lock');
  assert(await page.locator('#begin').isDisabled(),'game cannot start before explicit cell selection');
  assert.equal(await page.locator('#arenaSvg polygon').count(),25,'5x5 projected calibration squares');
  // Pick a NON-central cell to prove a specific real-world foot position maps to gameplay.
  await page.locator('#calCell-13').click({timeout:5500});
  await page.waitForFunction(()=>{
   const b=document.getElementById('begin');return b&&!b.disabled&&getComputedStyle(b).display!=='none';
  },{timeout:6500});
  assert(await page.locator('#begin').isEnabled(),'one-second calibration completes');
  const before=await page.evaluate(()=>window.__xrDrawCalls);
  assert(before>0,'XR WebGL made draw calls before gameplay');
  const fixed=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(fixed.placement&&fixed.origin&&fixed.calibrated,'placement and motion reference calibrated');
  assert.equal(fixed.selectedCell,13,'physical standing cell chosen from camera view');
  assert(Math.abs(fixed.marker.x-.448)<.015,'human floor marker starts in the chosen column');
  assert(await page.locator('#whereAmI').isVisible(),'live row and column tracking readout visible');
  await page.locator('#begin').click();
  await page.waitForTimeout(4200);
  const remaining=Number(await page.locator('#time').innerText());
  const after=await page.evaluate(()=>window.__xrDrawCalls);
  assert(remaining<72,'simulated XR clock advances: '+remaining);
  assert(after>before+100,'XR 3D geometry keeps drawing after scene lock ('+before+' -> '+after+')');
  await page.evaluate(()=>window.__xrPos.x=.57);
  await page.waitForTimeout(450);
  const moved=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(Math.abs(moved.marker.x-fixed.marker.x)>.07,'floor-locked YO dot moves with physical phone displacement');
  assert(Math.abs(moved.marker.x-fixed.marker.x)<.35,'movement matches phone movement without jumping across tiles');
  assert((await page.locator('#whereAmI').innerText()).includes('YO'),'current physical tile is continuously reported');
  assert.deepEqual(moved.placement,fixed.placement,'world-locked arena never moved after phone displacement');
  assert(Math.abs(fixed.arenaWorld.edge-side)<.035,'rendered square width equals size chosen with fingers');
  assert(!await page.locator('#touchpad').isVisible(),'gestures stop moving the floor after placement');
  assert(!await page.locator('#toolbar').isVisible(),'adjustment controls disappear after placement');
  assert(fixed.arenaWorld&&moved.arenaWorld,'renderer exposes ground-locked matrix');
  for(const axis of ['x','y','z'])assert(Math.abs(moved.arenaWorld[axis]-fixed.arenaWorld[axis])<.0005,'world XR center '+axis+' remains fixed');
  const fatal=pageErrors.filter(e=>!e.includes('No runtimes supported the requested configuration'));
  assert.equal(fatal.length,0,'no XR JavaScript errors: '+fatal.join(' / '));
  assert(!((await page.locator('#toast').innerText()).includes('RENDER AR')),'no render failures');
  console.log('PASS: 5x5 pick, selected physical cell, XR world-locked YO dot, real-motion tracking and 1s calibration.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
