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
 assert.equal(await page.evaluate(()=>__ReboteDebug.clearAlpha),0,'AR framebuffer must preserve transparent camera passthrough');
 // Permission rejection is an expected real-world failure, not a silent click.
 await page.evaluate(()=>{
  window.__XRRequest= navigator.xr.requestSession;
  navigator.xr.requestSession=()=>Promise.reject(new DOMException('Camara denegada','NotAllowedError'));
 });
 await page.locator('#startAR').click();
 await page.waitForFunction(()=>!document.querySelector('#arProblem').hidden,null,{timeout:4000});
 assert.match(await page.locator('#arProblemTitle').innerText(),/FALTA PERMISO/);
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'home','denied camera leaves menu usable');
 // Pending system permission must show visible progress and a cancel route.
 await page.evaluate(()=>{navigator.xr.requestSession=()=>new Promise(()=>{})});
 await page.locator('#startAR').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='connecting',null,{timeout:2000});
 assert(await page.locator('#arConnecting').isVisible(),'loading UI is visible while permission is pending');
 await page.locator('#cancelStartAR').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='home',null,{timeout:2000});
 await page.evaluate(()=>{navigator.xr.requestSession=window.__XRRequest});
 await page.locator('#startAR').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='edit',null,{timeout:7500});
 assert.equal(await page.evaluate(()=>__ReboteDebug.floorStable),true,'fix should only unlock after stable ground samples');
 assert((await page.evaluate(()=>__ReboteDebug.floorSamples))>=8,'floor plane is validated over multiple XR hits');
 const initial=await page.evaluate(()=>({z:__ReboteDebug.root[2],phoneZ:__simPhone.z,yaw:__ReboteDebug.previewYaw}));
 assert(initial.z<initial.phoneZ-.48&&initial.z>initial.phoneZ-1.3,'arena placement starts ahead of the camera');
 assert(Math.abs(initial.yaw)<.2,'phone yaw defines arena orientation');

 assert(await page.locator('#editbar').isVisible(),'AR edit controls visible');
 await page.waitForFunction(()=>__ReboteDebug.arFrames>3&&__ReboteDebug.arDrawCalls>0,null,{timeout:9000});
 assert.equal(await page.locator('#arWorldOverlay canvas').count(),1,'independent WebGL canvas INSIDE the XR DOM overlay');
 assert(await page.locator('#arWorldOverlay canvas').isVisible(),'AR world canvas must be visible, not an offscreen native-only buffer');
 await page.waitForFunction(()=>document.querySelector('#placementSvg')?.style.display==='block',null,{timeout:4500});
 assert.match(await page.locator('#placementBorder').getAttribute('d'),/^M/,'world-anchored SVG floor outline is projected from XR eye, even if WebGL compositor is invisible on device');
 assert.match(await page.locator('#placementGridSvg').getAttribute('d'),/L/,'SVG fallback grid is projected spatially, not screen-fixed');
 assert(await page.evaluate(()=>__ReboteDebug.arCanvas),'composited world canvas remains connected');
 assert.equal(await page.locator('#fix').isDisabled(),false,'fix placement only after visible renderer emitted draw calls');
 const a=await page.evaluate(()=>({scale:__ReboteDebug.scale,root:__ReboteDebug.root}));
 await page.locator('#plus').click();
 assert((await page.evaluate(()=>__ReboteDebug.scale))>a.scale,'scale edited');
 await page.locator('#turn').click();
 await page.locator('#fix').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='calibrate',null,{timeout:3000});
 await page.waitForFunction(()=>__ReboteDebug.calibrated,null,{timeout:7500});
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'ready','calibration completes');
 assert((await page.evaluate(()=>__ReboteDebug.calibrationRms))<.045,'calibration accepts a steady phone, not tracking jitter');
 const hero=await page.evaluate(()=>__ReboteDebug.game);
 assert.equal(hero.phase,'APRENDIZ','premium AR calibration preserves the initial phase');

 const before=await page.evaluate(()=>__ReboteDebug.root);
 await page.evaluate(()=>window.__simPhone.x=.17);
 await page.waitForTimeout(330);
 const after=await page.evaluate(()=>__ReboteDebug.root);
 assert.deepEqual(after,before,'floor root remains spatially fixed while phone moves');
 await page.locator('#begin').click();
 await page.waitForFunction(()=>__ReboteDebug.stage==='playing',null,{timeout:2000});
 await page.waitForFunction(()=>__ReboteDebug.renderedRobots>0,null,{timeout:5000});
 assert(await page.evaluate(()=>__ReboteDebug.arDrawCalls)>8,'rounded mech and arena contribute visible WebGL geometry');

 assert(await page.locator('#returnBtn').isVisible(),'return button active in real XR overlay');
 assert(await page.locator('#tapZone').isVisible(),'AR can parry by tapping anywhere in the lower zone');
 assert.equal(await page.locator('#duelMedals i').count(),6,'progress indicators are in the XR overlay');


 assert(await page.locator('#radar').isVisible(),'AR radar shows orientation information for offscreen robots');
 assert(await page.locator('#duelHud').isVisible(),'AR duel HUD exists after physical calibration');
 assert.equal(await page.evaluate(()=>__ReboteDebug.duelEnemies),1,'one physical opponent in AR');

 assert(await page.evaluate(()=>__ReboteDebug.robotFacingDot>.95),'robot faces physical tracked phone from its fixed AR position');

 assert(await page.evaluate(()=>__simDrawCalls)>0,'3D is rendered in AR XR frames');
 assert(await page.evaluate(()=>__ReboteDebug.arDrawCalls)>0,'visible XR DOM overlay draws world geometry independently');
 assert(await page.locator('#hud .stat').count()>=4,'compact HUD retains score, health, combo and clock');

 assert(await page.evaluate(()=>__ReboteDebug.tracking),'active XRFrame samples reliable phone ray');
 const beforeTap=await page.evaluate(()=>__ReboteDebug.returnAttempts);
 await page.locator('#returnBtn').tap();
 assert.equal(await page.evaluate(()=>__ReboteDebug.returnAttempts),beforeTap+1,'one physical tap must count one return attempt');
 assert.equal(await page.locator('#status').innerText(),'SIN ESFERA','touch-generated click must not overwrite first response');
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'playing','touch controls do not reset game');
 await page.evaluate(()=>window.__simPhone.x=1.05);
 await page.waitForFunction(()=>document.querySelector('#leftArrow')?.style.opacity==='1',null,{timeout:8000});
 assert(await page.locator('#strikeGauge').isVisible(),'incoming spatial projectile charges the timing ring');
 assert.equal(await page.locator('#rightArrow').evaluate(el=>el.style.opacity),'0','threat on camera left must not show right arrow');
 await page.evaluate(()=>window.__simPhone.x=.17);
 await page.locator('#center').tap();
 await page.waitForFunction(()=>__ReboteDebug.stage==='ready',null,{timeout:7000});
 assert.deepEqual(await page.evaluate(()=>__ReboteDebug.root),after,'recalibration keeps arena fixed');
 await page.locator('#begin').tap();
 await page.waitForFunction(()=>__ReboteDebug.stage==='playing',null,{timeout:3000});
 await page.evaluate(()=>window.__simLostTracking=true);
 await page.waitForFunction(()=>__ReboteDebug.stage==='paused',null,{timeout:5000});
 assert(await page.locator('#begin').isDisabled(),'no unsafe resume with an expired camera pose');
 await page.evaluate(()=>window.__simLostTracking=false);
 await page.waitForFunction(()=>!document.querySelector('#begin').disabled,null,{timeout:4000});
 await page.locator('#begin').tap();
 assert.equal(await page.evaluate(()=>__ReboteDebug.stage),'playing','game resumes after tracking recovery');
 assert.equal(errors.length,0,'no XR JavaScript exceptions: '+errors.join(' | '));
 console.log('PASS: simulated XR detect/fix/scale/calibrate/aim/return/recalibrate/track-loss/resume. NOT PHYSICAL AR.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
