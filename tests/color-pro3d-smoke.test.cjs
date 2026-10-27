'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'color-pro-3d.js'),'utf8');
const html=fs.readFileSync(path.join(root,'color-solo.html'),'utf8');
const skin=fs.readFileSync(path.join(root,'color-premium.css'),'utf8');
assert.match(html,/color-pro-3d\.js\?v=pro20/);
assert.ok(html.indexOf('survivor.js')<html.indexOf('color-pro-3d.js'));
assert.match(skin,/#overlay\.crp3d-ready #tiles > polygon/);
assert.match(skin,/#overlay\.crp3d-ready #crp-visual-layer/);
assert.doesNotMatch(script,/\.createAnchor\s*\(|\.requestSession\s*\(|\.requestHitTestSource\s*\(/);
assert.doesNotMatch(script,/\.addEventListener\s*\(\s*['"]pointer|setInterval\s*\(/);
let draws=0,reads=0,failed=false,buffers=0,wire=false;
const G={
  VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
  ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,STATIC_DRAW:35044,FRAMEBUFFER:36160,
  TRIANGLES:4,POINTS:0,FLOAT:5126,DEPTH_TEST:2929,CULL_FACE:2884,BLEND:3042,
  SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,LEQUAL:515
};
const g=Object.assign({},G,{
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>!failed,
  getShaderInfoLog:()=> 'shader rejected',createProgram:()=>({}),attachShader(){},
  bindAttribLocation(){},linkProgram(){},getProgramParameter:()=>!failed,
  getProgramInfoLog:()=> 'program rejected',deleteShader(){},
  getUniformLocation:(p,k)=>k,uniformMatrix4fv(){},uniform1f(){},uniform3f(){},
  createBuffer:()=>({id:++buffers}),bindBuffer(){},bufferData(target,arr){assert.ok(arr.length>0);},
  enableVertexAttribArray(){},vertexAttribPointer(){},disableVertexAttribArray(){},
  useProgram(){},viewport(){},enable(){},disable(){},depthFunc(){},depthMask(){},
  blendFunc(){},bindFramebuffer(){},drawArrays(mode,first,count){assert.ok(count>0);draws++;},
  getAttribLocation:()=>0
});
const poly={};const classNames=new Set();
const overlay={classList:{add:x=>classNames.add(x),remove:x=>classNames.delete(x)}};
const heading={textContent:'¡VERDE!'},burst={style:{display:'none'},textContent:''};
const elements={'overlay':overlay,'headline':heading,'tiles':poly,'burst':burst};
const window={addEventListener(){},modoCaosXRFrame:null};
const doc={getElementById:x=>elements[x]||null};
const I=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const pose={transform:{position:{x:0,y:1.5,z:1.4}},views:[{projectionMatrix:I,transform:{inverse:{matrix:I}}}]};
const frame={getViewerPose(){reads++;return pose}};
const sess={renderState:{baseLayer:{framebuffer:null,getViewport:()=>({x:0,y:0,width:640,height:480})}}};
const tiles=Array.from({length:25},(_,i)=>i%6);
const ctx={
  document:doc,window,location:{search:''},performance:{now:()=>100},
  URLSearchParams,gl:g,sess,ref:{},tiles,boardSize:.45,stage:'playing',
  shader:{},glBuffer:{},devicePixelRatio:1.3,console:{warn(){}}
};
vm.runInNewContext(script,ctx,{timeout:3000,filename:'color-pro-3d.js'});
assert.equal(window.ColorRushPro3D.visualOnly,true);
assert.equal(window.ColorRushPro3D.status,'waiting-xr');
assert.equal(typeof window.modoCaosXRFrame,'function');
window.modoCaosXRFrame(130,frame,I);
assert.equal(window.ColorRushPro3D.status,'active');
assert.ok(classNames.has('crp3d-ready'));
assert.ok(draws>=5,'multiple geometries rendered');
const draws1=draws;
heading.textContent='¡AZUL!';
tiles[2]=3;window.modoCaosXRFrame(450,frame,I);
assert.ok(draws>draws1);
burst.textContent='+20 PUNTOS';burst.style.display='block';
window.modoCaosXRFrame(680,frame,I);
assert.ok(reads>=3);
// Inject GPU failure; the fallback must never modify gameplay or throw.
const oldDraw=g.drawArrays;
g.drawArrays=()=>{throw Error('GPU lost');};
window.modoCaosXRFrame(900,frame,I);
assert.equal(window.ColorRushPro3D.status,'fallback');
assert.equal(classNames.has('crp3d-ready'),false);
assert.equal(tiles.length,25);
assert.equal(tiles[2],3);
g.drawArrays=oldDraw;
console.log('PASS: real 3D hook, 5+ geometry passes, shader setup, board updates, recovery to old visuals');
