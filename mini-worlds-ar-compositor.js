/* MINI WORLDS — Android AR transparent overlay compositor.
 * Adapted from MODO CAOS / rodeados-ar-compositor.js (proven Blackzone
 * workaround). WebXR supplies absolute tracked poses and floor hit-tests;
 * a second non-XR WebGL renderer draws world-locked geometry into the
 * transparent DOM overlay, not in the unreliable native XR framebuffer.
 * No camera-locked scenery and no false "AR" based on screen coordinates.
 */
(function(root){
'use strict';
root.MiniWorldsARCompositor=function(T,host,maxRatio=1.12){
 if(!T||!host)throw Error('Falta THREE o capa AR');
 const renderer=new T.WebGLRenderer({
  alpha:true,antialias:false,premultipliedAlpha:true,
  powerPreference:'low-power'
 });
 renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.18;
 renderer.setPixelRatio(Math.min(maxRatio,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight));
 renderer.domElement.className='mw-ar-3d-canvas';
 renderer.domElement.setAttribute('aria-hidden','true');
 renderer.domElement.style.background='transparent';
 renderer.domElement.style.pointerEvents='none';
 host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera();
 camera.matrixAutoUpdate=false;
 let frames=0,drawCalls=0,lastError='',visible=true,failedFrames=0;
 function render(world,xrCamera){
  if(!visible||!world)return false;
  const eye=xrCamera?.cameras?.[0]||xrCamera;
  if(!eye?.matrixWorld||!eye?.projectionMatrix){lastError='Falta pose de cámara XR';failedFrames++;return false}
  camera.matrix.copy(eye.matrixWorld);
  camera.matrixWorld.copy(eye.matrixWorld);
  camera.matrixWorldInverse.copy(eye.matrixWorldInverse);
  camera.projectionMatrix.copy(eye.projectionMatrix);
  camera.projectionMatrixInverse.copy(eye.projectionMatrixInverse);
  camera.layers.mask=eye.layers.mask;
  camera.near=eye.near||.02;
  camera.far=eye.far||160;
  camera.matrixWorldNeedsUpdate=false;
  try{
   renderer.render(world,camera);
   drawCalls=renderer.info.render.calls;
   frames++;
   lastError='';
   return true;
  }catch(e){
   failedFrames++;lastError=e?.message||String(e);
   if(failedFrames===1||failedFrames%90===0)console.error('[MINI WORLDS AR compositor]',e);
   return false;
  }
 }
 function resize(w=innerWidth,h=innerHeight){
  if(w>0&&h>0)renderer.setSize(w,h);
 }
 function setQuality(ratio){
  renderer.setPixelRatio(Math.min(Math.max(.75,ratio),1.35));
  resize();
 }
 function dispose(){
  visible=false;renderer.dispose();renderer.domElement.remove();
 }
 return {render,resize,setQuality,dispose,
  get frames(){return frames},
  get drawCalls(){return drawCalls},
  get error(){return lastError},
  get failedFrames(){return failedFrames},
  get canvas(){return renderer.domElement},
  get camera(){return camera}};
};
})(typeof window!=='undefined'?window:globalThis);
