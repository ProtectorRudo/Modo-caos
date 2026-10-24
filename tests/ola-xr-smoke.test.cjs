'use strict';
/* XR simulado en Chromium con GPU WebGL real.
 * La pose, superficie, hit-test y anchor son simulados: NO verifica ARCore físico. */
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://local.test').pathname,rel=route==='/'?'/index.html':route;
 if(rel==='/favicon.ico'){res.writeHead(204).end();return}
 const file=path.resolve(root,'.'+rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return}
  res.writeHead(200,{'content-type':path.extname(file)==='.html'?'text/html':'text/javascript'});res.end(body)});
});
(async()=>{
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
   const base=I();base[14]=-.45;
   const projection=I();projection[9]=.70;
   window.__position={x:0,y:1.30,z:0};window.__draws=0;window.__tracked=true;
   const orig=WebGLRenderingContext.prototype.drawArrays;
   WebGLRenderingContext.prototype.drawArrays=function(...args){window.__draws++;return orig.apply(this,args)};
   WebGLRenderingContext.prototype.makeXRCompatible=async function(){};
   const view={projectionMatrix:projection,transform:{inverse:{matrix:I()}}};
   const hit={getPose:()=>({transform:{matrix:base}}),createAnchor:async()=>({anchorSpace:{},delete(){}})};
   const sess={renderState:{baseLayer:null},callbacks:{},
    requestAnimationFrame(cb){return window.requestAnimationFrame(t=>cb(t,frame))},
    updateRenderState(v){Object.assign(this.renderState,v)},
    async requestReferenceSpace(type){return{type}},
    async requestHitTestSource(){return{}},
    addEventListener(name,cb){(this.callbacks[name]||=[]).push(cb)},
    async end(){for(const cb of this.callbacks.end||[])cb()}
   };
   const frame={session:sess,getViewerPose:()=>window.__tracked?{views:[view],transform:{position:window.__position},emulatedPosition:false}:null,
    getHitTestResults:()=>[hit],getPose:()=>({transform:{matrix:base}})};
   class Layer{constructor(_,gl){this.framebuffer=null;this.gl=gl}
    getViewport(){return{x:0,y:0,width:this.gl.drawingBufferWidth||1,height:this.gl.drawingBufferHeight||1}}}
   Object.defineProperty(window,'XRWebGLLayer',{configurable:true,value:Layer});
   Object.defineProperty(navigator,'xr',{configurable:true,value:{isSessionSupported:async()=>true,requestSession:async()=>sess}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/ola.html?mc_test=1');
  await page.locator('#enter').click();
  await page.waitForFunction(()=>{const b=document.querySelector('#lock');return b&&!b.disabled&&getComputedStyle(b).display!=='none'},null,{timeout:12000});
  assert(await page.locator('#touchpad').isVisible(),'surface can be moved before lock');
  const size0=await page.locator('#size').innerText();
  assert(size0.includes('2,40'),'compact 2.40m default instead of previous 2.70m: '+size0);
  assert(await page.locator('#autoCenter').isVisible(),'one-touch align-and-lock placement visible');
  await page.locator('#plus').click();
  assert.notEqual(await page.locator('#size').innerText(),size0,'arena size really changes');
  await page.locator('#rotate').click();
  const preDraws=await page.evaluate(()=>window.__draws);
  assert(preDraws>0,'WebGL draws anchored 6x6 field');
  if(process.env.OLA_AUTOCENTER==='1'){
   await page.locator('#autoCenter').click();
   await page.waitForFunction(()=>document.querySelector('#calBox')?.offsetParent!==null,null,{timeout:5000});
   assert(!await page.locator('#autoCenter').isVisible(),'auto center also locks the floor');
   const local=await page.evaluate(()=>{
    const W=worldMatrix,dX=window.__position.x-W[12],dZ=window.__position.z-W[14];
    return {x:W[0]*dX+W[2]*dZ,z:W[8]*dX+W[10]*dZ,tile:boardSize};
   });
   assert(Math.abs(local.x-local.tile*.5)<.065&&Math.abs(local.z-local.tile*.5)<.065,
     'physical phone is centered over cell 4-4 after auto place '+JSON.stringify(local));
   await page.locator('#calCenter').click();
   await page.waitForFunction(()=>document.querySelector('#begin')?.disabled===false,null,{timeout:6500});
   assert.equal(errors.length,0,'no auto-center XR errors: '+errors.join(' / '));
   console.log('PASS: 2.40m, un toque CENTRAR Y FIJAR, móvil situado sobre casilla 4-4 sin reposicionar al calibrar');
   return;
  }
  await page.locator('#lock').click();
  await page.waitForFunction(()=>document.querySelector('#calBox')?.offsetParent!==null,null,{timeout:5000});
  assert.equal(await page.locator('#arenaSvg polygon').count(),36,'36 physically projected selectable tiles');
  assert(await page.locator('#begin').isDisabled(),'cannot start without calibrating');
  await page.locator('#calCenter').click();
  await page.waitForFunction(()=>document.querySelector('#begin')?.disabled===false,null,{timeout:6500});
  assert((await page.locator('#whereAmI').innerText()).includes('COLUMNA 4'),'initial cell aligned to 4-4');
  await page.locator('#begin').click();
  await page.waitForTimeout(4450);
  assert(Number(await page.locator('#time').innerText())<90,'90 s AR clock advances');
  assert(await page.locator('#radar').isVisible(),'top-down radar visible while playing AR');
  assert.equal(await page.locator('#radarCells i').count(),36,'radar has 6x6 tiles');
  assert((await page.locator('#radarTime').innerText()).length>0,'hazard anticipation displayed');
  const before=await page.evaluate(()=>window.__draws);
  assert(before>preDraws+100,'real WebGL keeps painting after lock');
  for(let i=0;i<9;i++){await page.evaluate(()=>window.__position.x+=.07);await page.waitForTimeout(85)}
  await page.waitForTimeout(280);
  assert((await page.locator('#whereAmI').innerText()).includes('COLUMNA 5'),
   'moving phone in world physically changes selected tile');
  await page.locator('#pause').click();
  const time=await page.locator('#time').innerText();await page.waitForTimeout(320);
  assert.equal(await page.locator('#time').innerText(),time,'pause freezes XR hazards');
  await page.locator('#resume').click();
  const beforeLoss=await page.evaluate(()=>window.__olaTestSnapshot());
  await page.evaluate(()=>{window.__tracked=false});
  await page.waitForTimeout(950);
  const duringLoss=await page.evaluate(()=>window.__olaTestSnapshot());
  assert(Math.abs(duringLoss.elapsed-beforeLoss.elapsed)<.12,'tracking loss freezes game clock');
  assert.equal(duringLoss.paused,true,'watchdog marks game paused even without XR frames');
  assert.equal(duringLoss.lives,beforeLoss.lives,'tracking loss never deducts a life');
  await page.evaluate(()=>{window.__tracked=true});
  await page.waitForTimeout(180);
  const recovery=await page.evaluate(()=>window.__olaTestSnapshot());
  assert.equal(recovery.paused,true,'game remains paused after returning XR frames');
  await page.waitForTimeout(620);
  const stable=await page.evaluate(()=>window.__olaTestSnapshot());
  assert.equal(stable.trackingFrozen,false,'stable tracking resumes after half a second');
  assert(Math.hypot(stable.world.x-beforeLoss.world.x,stable.world.z-beforeLoss.world.z)<.01,
    'phone movement and temporary tracking loss never shift the floor anchor');
  await page.locator('#recalibrateLive').click();
  assert(await page.locator('#calBox').isVisible(),'position recalibration available');
  assert.equal(errors.length,0,'no XR runtime exceptions: '+errors.join(' / '));
  console.log('PASS: 6x6 simulated WebXR hit-test, scene placement, 1s calibration, phone motion, WebGL, pause, tracking recovery and recalibration');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
