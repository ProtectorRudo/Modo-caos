'use strict';
/* Synthetic WebXR test: actual Chromium/WebGL; mocked XR tracking/planes.
   DOES NOT replace a physical Android ARCore test. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(p==='/')p='/index.html';const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end('Not found');
  res.writeHead(200,{'content-type':p.endsWith('.html')?'text/html':'text/javascript'}).end(data)});
});
(async()=>{let browser;
 try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const matrix=(x=0,y=0,z=0)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
  const ori={x:0,y:0,z:0,w:1};
  window.__simPhone={x:0,y:1.56,z:-1.0};window.__simLostTracking=false;window.__mockFrameActive=false;window.__simDrawCalls=0;
  const draw=WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays=function(...args){window.__simDrawCalls++;return draw.apply(this,args)};
  const drawElements=WebGLRenderingContext.prototype.drawElements;
  WebGLRenderingContext.prototype.drawElements=function(...args){window.__simDrawCalls++;return drawElements.apply(this,args)};
  if(window.WebGL2RenderingContext){const d2=WebGL2RenderingContext.prototype.drawElements;WebGL2RenderingContext.prototype.drawElements=function(...args){window.__simDrawCalls++;return d2.apply(this,args)}}
  WebGLRenderingContext.prototype.makeXRCompatible=async()=>{};
  if(window.WebGL2RenderingContext)WebGL2RenderingContext.prototype.makeXRCompatible=async()=>{};
  const floor={transform:{matrix:matrix(0,0,-2.1),position:{x:0,y:0,z:-2.1},orientation:ori}};
  const hit={getPose:()=>floor,createAnchor:async()=>({anchorSpace:{name:'anchor'},delete(){}})};
  const projection=new Float32Array([3.0,0,0,0,0,1.6,0,0,0,0,-1.003,-1,0,0,-.10,0]);
  const frame={
   getViewerPose(){
    if(!window.__mockFrameActive)throw new DOMException('expired XRFrame','InvalidStateError');
    if(window.__simLostTracking)return null;
    const p=window.__simPhone;
    return {emulatedPosition:false,transform:{position:{...p},orientation:ori,matrix:matrix(p.x,p.y,p.z)},
     views:[{eye:'none',projectionMatrix:projection,transform:{position:{...p},orientation:ori,matrix:matrix(p.x,p.y,p.z),inverse:{matrix:matrix(-p.x,-p.y,-p.z)}}}]};
   },
   getHitTestResults:()=>[hit],
   getPose:()=>floor
  };
  const session={
   renderState:{baseLayer:null,depthNear:.03,depthFar:40},
   visibilityState:'visible',inputSources:[],listeners:{},
   updateRenderState(o){Object.assign(this.renderState,o)},
   async requestReferenceSpace(type){return {type}},
   async requestHitTestSource(){return {cancel(){}}},
   addEventListener(event,cb){(this.listeners[event]||=[]).push(cb)},
   removeEventListener(){},
   requestAnimationFrame(cb){return requestAnimationFrame(t=>{window.__mockFrameActive=true;try{cb(t,frame)}finally{window.__mockFrameActive=false}})},
   cancelAnimationFrame(id){cancelAnimationFrame(id)},
   async end(){for(const cb of this.listeners.end||[])cb()}
  };
  class Layer{constructor(_s,gl){this.framebuffer=null;this.framebufferWidth=gl.drawingBufferWidth||393;this.framebufferHeight=gl.drawingBufferHeight||852}getViewport(){return{x:0,y:0,width:this.framebufferWidth,height:this.framebufferHeight}}}
  Object.defineProperty(window,'XRWebGLLayer',{configurable:true,value:Layer});
  Object.defineProperty(navigator,'xr',{configurable:true,value:{isSessionSupported:async()=>true,requestSession:async()=>session}});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/rebote.html',{waitUntil:'load'});
 await page.waitForFunction(()=>!!__ReboteDebug,null,{timeout:30000});
 await page.locator('#startAR').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='edit',null,{timeout:7500});
 assert(await page.locator('#editbar').isVisible(),'AR edit controls visible');
 const a=await page.evaluate(()=>({scale:__ReboteDebug.scale,root:__ReboteDebug.root}));
 await page.locator('#plus').click();
 assert((await page.evaluate(()=>__ReboteDebug.scale))>a.scale,'scale edited');
 await page.locator('#turn').click();
 await page.locator('#fix').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='calibrate',null,{timeout:3000});
 await page.waitForFunction(()=>__ReboteDebug.calibrated,null,{timeout:7500});
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'ready','calibration completes');
 const before=await page.evaluate(()=>__ReboteDebug.root);
 await page.evaluate(()=>window.__simPhone.x=.17);
 await page.waitForTimeout(330);
 const after=await page.evaluate(()=>__ReboteDebug.root);
 assert.deepEqual(after,before,'floor root remains spatially fixed while phone moves');
 await page.locator('#begin').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='playing',null,{timeout:2000});
 await page.waitForFunction(()=>__ReboteDebug.renderedRobots>0,null,{timeout:5000});
 assert(await page.locator('#returnBtn').isVisible(),'return button active in real XR overlay');
 assert(await page.evaluate(()=>__simDrawCalls)>0,'3D is rendered in AR XR frames');
 assert(await page.evaluate(()=>__ReboteDebug.tracking),'active XRFrame samples reliable phone ray');
 await page.locator('#returnBtn').tap();
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'playing','touch controls do not reset game');
 await page.locator('#center').tap();
 await page.waitForFunction(()=>__ReboteDebug.stage==='ready',null,{timeout:7000});
 assert.deepEqual(await page.evaluate(()=>__ReboteDebug.root),after,'recalibration keeps arena fixed');
 await page.locator('#begin').tap();
 await page.waitForFunction(()=>__ReboteDebug.stage==='playing',null,{timeout:3000});
 await page.evaluate(()=>window.__simLostTracking=true);
 await page.waitForFunction(()=>__ReboteDebug.stage==='paused',null,{timeout:5000});
 await page.evaluate(()=>window.__simLostTracking=false);
 await page.locator('#begin').tap();
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'playing','game resumes after tracking recovery');
 assert.equal(errors.length,0,'no XR JavaScript exceptions: '+errors.join(' | '));
 console.log('PASS: simulated XR detect/fix/scale/calibrate/aim/return/recalibrate/track-loss/resume. NOT PHYSICAL AR.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
