'use strict';
/* Synthetic WebXR test for RODEADOS 360.
   Chrome and WebGL are real. XR viewer, plane, anchors and camera are mocked;
   this DOES NOT validate Android ARCore sensor tracking or a physical room. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(p==='/')p='/index.html';const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end('Not found');
  res.writeHead(200,{'content-type':p.endsWith('.html')?'text/html':'text/javascript'}).end(data)});
});
(async()=>{
 let browser;
 try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const matrix=(x=0,y=0,z=0)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
  window.__simPhone={x:0,y:1.54,z:0};
  window.__simDrawCalls=0;window.__simEmulated=false;window.__mockFrameActive=false;window.__strictXRFrame=false;
  const draw=WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays=function(...args){window.__simDrawCalls++;return draw.apply(this,args)};
  const draw2=WebGL2RenderingContext?.prototype.drawArrays;
  if(draw2)WebGL2RenderingContext.prototype.drawArrays=function(...args){window.__simDrawCalls++;return draw2.apply(this,args)};
  WebGLRenderingContext.prototype.makeXRCompatible=async()=>{};
  if(window.WebGL2RenderingContext)WebGL2RenderingContext.prototype.makeXRCompatible=async()=>{};
  window.__simTilt=0;
  const orientation=()=>{const a=window.__simTilt/2;return {x:Math.sin(a),y:0,z:0,w:Math.cos(a)}};
  const ori={x:0,y:0,z:0,w:1};
  const floorPose={transform:{matrix:matrix(0,0,-2.8),position:{x:0,y:0,z:-2.8},orientation:ori}};
  const hit={getPose:()=>floorPose,createAnchor:async()=>({anchorSpace:{name:'anchor'},delete(){}})};
  const proj=new Float32Array([3.1,0,0,0,0,1.58,0,0,0,0,-1.003,-1,0,0,-.10,0]);
  const frame={
   getViewerPose:()=>{
    if(window.__strictXRFrame&&!window.__mockFrameActive)throw new DOMException('XRFrame is no longer active','InvalidStateError');
    const p=window.__simPhone;
    return {emulatedPosition:!!window.__simEmulated,transform:{position:{...p},orientation:orientation(),matrix:matrix(p.x,p.y,p.z)},
     views:[{eye:'none',projectionMatrix:proj,transform:{position:{...p},orientation:orientation(),matrix:matrix(p.x,p.y,p.z),inverse:{matrix:matrix(-p.x,-p.y,-p.z)}}}]};
   },
   getHitTestResults:()=>[hit],
   getPose:()=>floorPose
  };
  const session={
   renderState:{baseLayer:null,depthNear:.03,depthFar:35},
   visibilityState:'visible',inputSources:[],listeners:{},
   updateRenderState(o){Object.assign(this.renderState,o)},
   async requestReferenceSpace(type){return{type}},
   async requestHitTestSource(){return{cancel(){}}},
   addEventListener(ev,cb){(this.listeners[ev]||=[]).push(cb)},
   removeEventListener(){},
   requestAnimationFrame(cb){return requestAnimationFrame(t=>{window.__mockFrameActive=true;try{cb(t,frame)}finally{window.__mockFrameActive=false}})},
   cancelAnimationFrame(id){cancelAnimationFrame(id)},
   async end(){for(const fn of this.listeners.end||[])fn()}
  };
  class Layer{
   constructor(s,gl){this.framebuffer=null;this.framebufferWidth=gl.drawingBufferWidth||393;this.framebufferHeight=gl.drawingBufferHeight||852;}
   getViewport(){return{x:0,y:0,width:this.framebufferWidth,height:this.framebufferHeight}}
  }
  Object.defineProperty(window,'XRWebGLLayer',{configurable:true,value:Layer});
  Object.defineProperty(navigator,'xr',{configurable:true,value:{isSessionSupported:async()=>true,requestSession:async()=>session}});
 });
 const url='http://127.0.0.1:'+server.address().port+'/rodeados.html';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__RodeadosDebug,null,{timeout:30000});
 await page.selectOption('#mode','ctf');
 await page.locator('#startAR').click();
 await page.waitForFunction(()=>__RodeadosDebug.stage==='edit',null,{timeout:10000});
 await page.locator('#lock').click();
 await page.waitForFunction(()=>__RodeadosDebug.stage==='tactical',null,{timeout:10000});
 assert(await page.locator('#tacticalPanel').isVisible(),'real AR stage with manually placed markers');
 assert(!await page.locator('#cellControls').isVisible(),'no meaningless old cell-selection screen');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.phase),'ready','no auto-start or default AI map');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.mission.configured),false);
 const world=await page.evaluate(()=>__RodeadosDebug.floorTransform);
 await page.locator('#tacticalMark').tap();
 assert.equal(await page.evaluate(()=>__RodeadosDebug.tacticalPlan.base),null,'cannot place without pointing to floor');
 await page.evaluate(()=>window.__simTilt=-.54);
 await page.waitForFunction(()=>__RodeadosDebug.tacticalAim!==null,null,{timeout:6000});
 await page.locator('#tacticalMark').tap();
 const base=await page.evaluate(()=>__RodeadosDebug.tacticalPlan.base);
 assert(base&&Math.abs(base.z)<1.22,'user explicitly marked the starting base on the anchored arena: '+JSON.stringify(base));
 await page.evaluate(()=>window.__simTilt=-.23);
 await page.waitForFunction(v=>__RodeadosDebug.tacticalAim&&Math.abs(__RodeadosDebug.tacticalAim.z-v)>2.45,base.z,{timeout:6000});
 await page.locator('#tacticalMark').tap();
 let plan=await page.evaluate(()=>__RodeadosDebug.tacticalPlan);
 assert(plan.flag,'flag placed by different actual AR reticle ray');
 assert(Math.hypot(plan.base.x-plan.flag.x,plan.base.z-plan.flag.z)>=2.35,'base and flag safely separated');
 await page.locator('#tacticalUndo').tap();
 assert.equal(await page.evaluate(()=>__RodeadosDebug.tacticalPlan.flag),null,'undo previous AR marker');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.mission.configured),false);
 const fixed=await page.evaluate(()=>__RodeadosDebug.floorTransform);
 assert.deepEqual(fixed,world,'placing floor-anchored tactical markers never resets the anchor');
 assert.equal(errors.length,0,'no JS errors: '+errors.join(' | '));
 console.log('PASS: synthetic WebXR actual AR-stage planning, floor aim, manual base and flag, undo, unchanged world anchor. Physical Android ARCore still UNTESTED.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
