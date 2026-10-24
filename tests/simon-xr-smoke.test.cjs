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
  await page.locator('#seed').fill('7184'); // primera secuencia: celda 5, luego celda 6
  await page.locator('#seed').dispatchEvent('change');
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
  assert(!await page.locator('#confirmRow').isVisible(),'no gameplay confirmation during Simon playback');
  assert(await page.locator('#simonMap').isVisible(),'overhead AR board visible even when physical tiles leave the camera');
  assert.equal(await page.locator('#mapCells .mapTile').count(),9,'overhead map shows all nine tiles');
  assert((await page.locator('#mapHeading').textContent()).includes('SECUENCIA COMPLETA'),'watch indicator in map');
  await page.waitForFunction(()=>document.querySelector('#mapCells .mapTile.on')!==null,null,{timeout:4500});
  assert.equal(await page.locator('#mapCells .mapTile.on').count(),1,'exactly one tile highlighted on the overhead map');
  await page.waitForFunction(()=>document.getElementById('phase').textContent.includes('AHORA VOS'),null,{timeout:14000});
  assert.equal(await page.locator('#mapCells .mapTile.on').count(),0,'map does not leak the remembered sequence during player's turn');
  await page.waitForFunction(()=>!document.getElementById('confirmCell').disabled,null,{timeout:3000});
  assert((await page.locator('#confirmCell').textContent()).includes('CELDA 5'),'center confirmed and button names current cell');
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#progress').textContent(),'0/2','waiting on a cell does NOT auto-confirm a step');
  await page.locator('#confirmCell').click();
  assert.equal(await page.locator('#progress').textContent(),'1/2','explicit tap registers first tile');
  assert(await page.locator('#confirmCell').isDisabled(),'cannot confirm same tile twice');
  // La posición XR puede no coincidir con los pies: corrección manual sin recalibración.
  await page.locator('#mapCorrection').click();
  assert((await page.locator('#mapCaption').textContent()).includes('Tocá en el mapa'),'manual correction invitation');
  await page.locator('#mapCells .mapTile').nth(5).click();
  assert((await page.locator('#position').textContent()).includes('MODO MANUAL'),'manual mode explicitly disclosed');
  assert((await page.locator('#confirmCell').textContent()).includes('CELDA 6'),'manual correction selects tile six');
  assert.equal(await page.locator('#progress').textContent(),'1/2','manual selection alone never scores');
  await page.locator('#confirmCell').click();
  await page.waitForFunction(()=>document.getElementById('round').textContent==='2',null,{timeout:12000});
  await page.waitForFunction(()=>document.getElementById('phase').textContent.includes('AHORA VOS'),null,{timeout:15000});
  await page.evaluate(()=>{window.__xrPos.x=.55});
  await page.waitForFunction(()=>document.getElementById('position').textContent.includes('CELDA 6'),null,{timeout:4500});
  assert.equal(await page.locator('#mapCells .mapTile.here').count(),1,'green dot moves on map with XR phone position');
  assert.deepEqual(errors,[],'no uncaught page errors');
  console.log('PASS simulated XR: fixed AR board, full 3x3 map, watch playback, explicit confirm, manual position correction, round 2');
 }finally{
  if(browser)await browser.close();server.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
