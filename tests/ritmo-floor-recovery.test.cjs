'use strict';
// node tests/ritmo-floor-recovery.test.cjs
// Simulates real WebXR hit-test sources (no fabricated floor), UI recovery,
// floor/wall discrimination, and suppression of 3D during placement.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('ritmo-engine.js','utf8');
const els={};
function el(id){
 return els[id]||(els[id]={id,textContent:'',style:{display:''},disabled:false,
  events:{},children:[],setAttribute(){},appendChild(e){this.children.push(e)},
  addEventListener(name,f){this.events[name]=f},setPointerCapture(){},classList:{toggle(){}}});
}
const gl=new Proxy({
 FRAMEBUFFER:1,COLOR_BUFFER_BIT:2,DEPTH_BUFFER_BIT:4,ARRAY_BUFFER:5,
 VERTEX_SHADER:6,FRAGMENT_SHADER:7,COMPILE_STATUS:8,LINK_STATUS:9,
 FLOAT:10,STATIC_DRAW:11,BLEND:12,CULL_FACE:13,DEPTH_TEST:14,
 SRC_ALPHA:15,ONE_MINUS_SRC_ALPHA:16,TRIANGLES:17
},{get(obj,key){
 if(key in obj)return obj[key];
 if(key==='getShaderParameter'||key==='getProgramParameter')return()=>true;
 if(key==='getAttribLocation')return()=>0;
 return()=>({});
}});
const doc={
 getElementById:el,createElementNS:(ns,tag)=>({style:{},setAttribute(){}}),
 createElement:tag=>tag==='canvas'?{style:{},getContext:()=>gl}:{style:{},appendChild(){},setAttribute(){}},
 body:{appendChild(){}}
};
const win={innerWidth:390,innerHeight:840,isSecureContext:true,modoCaosRuntimeReady:true,modoCaosCustomArena:true};
let renders=0,rayCreated=0,hitsOn=false,hitsAreWall=false;
win.modoCaosCustomRender=()=>{renders++;return true};
class Ray{
 constructor(origin,direction){
  assert.equal(origin.w,1);
  assert.equal(direction.w,0,'XRRay requires direction.w=0');
  rayCreated++;
 }
}
const mat=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-1,1]);
function hit(){let mm=new Float32Array(mat);mm[5]=hitsAreWall?0:1;return{getPose(){return{transform:{matrix:mm}}}}}
const layer={framebuffer:{},getViewport(){return{x:0,y:0,width:390,height:840}}};
let callback,sourceCount=0;
const session={
 renderState:{baseLayer:layer},
 requestAnimationFrame(f){callback=f},
 updateRenderState(){},
 addEventListener(){},
 async requestReferenceSpace(type){return{type}},
 async requestHitTestSource(options){sourceCount++;return{tilted:!!options.offsetRay,cancel(){}}},
 async end(){}
};
const navigator={userAgent:'Android Chrome',xr:{isSessionSupported:async()=>true,requestSession(){return session}}};
const winFrame={
 getViewerPose(){return{views:[{projectionMatrix:mat,transform:{inverse:{matrix:mat}}}]}},
 getHitTestResults(source){return hitsOn&&source?.tilted?[hit()]:[]}
};
Function('document','window','navigator','XRRay','XRWebGLLayer','location',
 'setInterval','clearInterval','speechSynthesis','SpeechSynthesisUtterance',js)(
 doc,win,navigator,Ray,class{constructor(){return layer}}, {reload(){}},
 ()=>0,()=>{}, {cancel(){},speak(){}},class{});
const tick=ms=>callback(ms,winFrame);
async function flush(){for(let i=0;i<25;i++)await Promise.resolve()}
(async()=>{
 el('enter').events.click();await flush();
 assert.equal(sourceCount,2,'Must create center + downward real hit tests');
 assert.equal(rayCreated,1);
 tick(1000);tick(7200);
 assert.equal(el('headline').textContent,'BUSCÁ EL PISO');
 assert.equal(el('rescan').style.display,'block','Explain and allow retry if no floor');
 assert.equal(renders,0,'Do not render 3D while finding floor');
 await el('rescan').events.click();await flush();
 assert.equal(sourceCount,4,'Retry should renew BOTH sources');
 hitsOn=true;hitsAreWall=true;tick(7800);
 assert.equal(el('headline').textContent,'BUSCÁ EL PISO','Do not anchor track to wall');
 hitsAreWall=false;tick(8200);
 assert.equal(el('headline').textContent,'PISTA DETECTADA');
 assert.equal(el('lock').disabled,false);
 assert.equal(renders,0,'No 3D during positioning, maintain preview via SVG');
 el('lock').events.click();await flush();
 tick(8500);assert(renders>0,'3D starts only after real floor FIXED');
 console.log('OK: real floor requires horizontal hit, 2 rays, rescan feedback, preview lightweight, 3D after FIX');
})().catch(e=>{console.error(e);process.exitCode=1});
