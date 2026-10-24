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
  await page.locator('#enter').click();
  await page.waitForFunction(()=>{
   const b=document.getElementById('lock');return b&&!b.disabled&&getComputedStyle(b).display!=='none';
  },{timeout:7000});
  assert(await page.locator('#lock').isVisible(),'place-arena action visible');
  await page.locator('#lock').click();
  await page.waitForFunction(()=>{
   const b=document.getElementById('begin');return b&&!b.disabled&&getComputedStyle(b).display!=='none';
  },{timeout:6500});
  assert(await page.locator('#begin').isEnabled(),'one-second calibration completes');
  const before=await page.evaluate(()=>window.__xrDrawCalls);
  assert(before>0,'XR WebGL made draw calls before gameplay');
  const fixed=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(fixed.placement&&fixed.origin&&fixed.calibrated,'placement and motion reference calibrated');
  await page.locator('#begin').click();
  await page.waitForTimeout(4200);
  const remaining=Number(await page.locator('#time').innerText());
  const after=await page.evaluate(()=>window.__xrDrawCalls);
  assert(remaining<72,'simulated XR clock advances: '+remaining);
  assert(after>before+100,'XR 3D geometry keeps drawing after scene lock ('+before+' -> '+after+')');
  await page.evaluate(()=>window.__xrPos.x=.19);
  await page.waitForTimeout(450);
  const moved=await page.evaluate(()=>window.__meteorTestSnapshot());
  assert(Math.abs(moved.avatar.x-fixed.avatar.x)>.07,'avatar VOS follows simulated phone displacement');
  assert.deepEqual(moved.placement,fixed.placement,'world-locked arena never moved after phone displacement');
  assert(fixed.arenaWorld&&moved.arenaWorld,'renderer exposes ground-locked matrix');
  for(const axis of ['x','y','z'])assert(Math.abs(moved.arenaWorld[axis]-fixed.arenaWorld[axis])<.0005,'world XR center '+axis+' remains fixed');
  const fatal=pageErrors.filter(e=>!e.includes('No runtimes supported the requested configuration'));
  assert.equal(fatal.length,0,'no XR JavaScript errors: '+fatal.join(' / '));
  assert(!((await page.locator('#toast').innerText()).includes('RENDER AR')),'no render failures');
  console.log('PASS: mocked Hit Test / placement / 1s calibration / start / WebGL geometry / simulated phone move.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})();
