'use strict';
/* WebXR simulado: comprobación de integración en Chromium real, NO test físico ARCore. */
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),name=u.pathname==='/'?'/index.html':u.pathname,full=path.resolve(base,'.'+name);
 if(!full.startsWith(base+path.sep)){res.writeHead(403).end();return}
 fs.readFile(full,(e,data)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{'content-type':path.extname(full)==='.html'?'text/html':'text/javascript'});res.end(data)});
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
   const floor=identity();floor[14]=-.28;
   window.__xrPos={x:0,y:1.12,z:0};window.__xrDrawCalls=0;
   const orig=WebGLRenderingContext.prototype.drawArrays;
   WebGLRenderingContext.prototype.drawArrays=function(...args){window.__xrDrawCalls++;return orig.apply(this,args)};
   WebGLRenderingContext.prototype.makeXRCompatible=async function(){};
   const projected=identity();projected[9]=.65;
   const view={projectionMatrix:projected,transform:{inverse:{matrix:identity()}}};
   const hit={getPose:()=>({transform:{matrix:floor}}),createAnchor:async()=>({anchorSpace:{},delete(){}})};
   const frame={getViewerPose:()=>({views:[view],transform:{position:window.__xrPos},emulatedPosition:false}),getHitTestResults:()=>[hit],getPose:()=>({transform:{matrix:floor}})};
   const session={
    renderState:{baseLayer:null},requestAnimationFrame(cb){return window.requestAnimationFrame(t=>cb(t,frame))},
    updateRenderState(x){Object.assign(this.renderState,x)},
    async requestReferenceSpace(type){return{type}},
    async requestHitTestSource(){return{}},
    addEventListener(){},
    async end(){}
   };
   class FakeLayer{
    constructor(_,gl){this.gl=gl;this.framebuffer=null}
    getViewport(){return{x:0,y:0,width:this.gl.drawingBufferWidth||1,height:this.gl.drawingBufferHeight||1}}
   }
   Object.defineProperty(window,'XRWebGLLayer',{configurable:true,value:FakeLayer});
   Object.defineProperty(navigator,'xr',{configurable:true,value:{isSessionSupported:async()=>true,requestSession:async()=>session}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/simon.html');
  await page.locator('#enter').click();
  await page.waitForFunction(()=>{const b=document.getElementById('lock');return b&&!b.disabled&&getComputedStyle(b).display!=='none'},{timeout:10000});
  assert(await page.locator('#touchpad').isVisible(),'AR adjustment input is visible');
  const size=await page.locator('#size').textContent();
  await page.locator('#plus').click();
  assert.notEqual(await page.locator('#size').textContent(),size,'AR size control works');
  await page.locator('#rotate').click();
  await page.locator('#lock').click();
  await page.locator('#picker [data-pick="4"]').click();
  await page.waitForFunction(()=>document.getElementById('calTitle').textContent.includes('LISTO'),null,{timeout:8000});
  assert((await page.locator('#position').textContent()).includes('CELDA 5'),'calibration origin maps to selected center');
  assert((await page.evaluate(()=>window.__xrDrawCalls))>0,'nine tiles are WebGL draw calls');
  assert(await page.locator('#startGame').isVisible(),'calibrated start button visible');
  await page.locator('#startGame').click();
  await page.waitForFunction(()=>document.getElementById('phase').textContent.includes('AHORA VOS'),null,{timeout:12000});
  await page.evaluate(()=>{window.__xrPos.x=.55});
  await page.waitForFunction(()=>document.getElementById('position').textContent.includes('CELDA 6'),null,{timeout:4500});
  assert.deepEqual(errors,[],'no uncaught page errors');
  console.log('PASS simulated XR: floor lock, size, rotation, chosen cell, stable calibration, 3D draw, play and tracked phone move');
 }finally{
  if(browser)await browser.close();server.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
