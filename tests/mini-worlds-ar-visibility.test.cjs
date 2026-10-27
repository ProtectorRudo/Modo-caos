/* MINI WORLDS AR guide projection and no-invisible-island regression.
 * Run: node tests/mini-worlds-ar-visibility.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(dir,'mini-worlds-ar-guide.js'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'mini-worlds-runtime.js'),'utf8');
const art=fs.readFileSync(path.join(dir,'mini-worlds-art.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'mini-worlds.html'),'utf8');
class M4{
 constructor(){this.e=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
 fromArray(a){this.e=[...a];return this}
 multiply(b){let A=this.e,B=b.e,out=new Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=A[k*4+row]*B[col*4+k];this.e=out;return this}
}
class V4{
 constructor(x,y,z,w){Object.assign(this,{x,y,z,w})}
 applyMatrix4(mat){let m=mat.e,[x,y,z,w]=[this.x,this.y,this.z,this.w];this.x=m[0]*x+m[4]*y+m[8]*z+m[12]*w;this.y=m[1]*x+m[5]*y+m[9]*z+m[13]*w;this.z=m[2]*x+m[6]*y+m[10]*z+m[14]*w;this.w=m[3]*x+m[7]*y+m[11]*z+m[15]*w;return this}
}
const makeEl=()=>({hidden:true,style:{},attributes:{},children:[],setAttribute(a,b){this.attributes[a]=b},appendChild(el){this.children.push(el)}});
const svg=makeEl();const sandbox={window:{},innerWidth:400,innerHeight:800,performance:{now:()=>123},document:{createElementNS:()=>makeEl()}};
vm.runInNewContext(src,sandbox);
assert.equal(typeof sandbox.window.MiniWorldsARGuide,'function');
const guide=sandbox.window.MiniWorldsARGuide({Matrix4:M4,Vector4:V4},svg);
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const P=[1,0,0,0,0,1,0,0,0,0,-1.002,-1,0,0,-.2,0];
const view=[...I];view[14]=-3;
const frame={getViewerPose:()=>({views:[{projectionMatrix:P,transform:{inverse:{matrix:view}}}]})};
const stage={root:{matrixWorld:new M4(),updateWorldMatrix(){}},map:{platforms:[{id:0,x:0,z:0,w:4.7,d:4.4,y:0}]}};
let out=guide.draw(frame,{},stage,true,false);
assert(out.pose,'native XR pose must project');
assert(out.visible>=1,'first playable island must appear where detected floor marker is');
assert(!svg.hidden,'SVG must be visible during placement');
assert(svg.children.length>=6,'placement SVG needs four local floor polygons and start indicator, no gameplay debug polygons');
stage.root.matrixWorld.e[12]=100;
out=guide.draw(frame,{},stage,true,false);
assert.equal(out.visible,0,'island outside camera must not be reported visible');
guide.hide();assert(svg.hidden);
assert(html.includes('mini-worlds-ar-guide.js')&&html.includes('id="arFloorGuide"'));
assert(art.includes('previewBeacon')&&art.includes('depthTest:false'));
assert(runtime.includes('frame.getViewerPose(renderer.xr.getReferenceSpace())'));
assert(runtime.includes('try{stage.update(game,dt,elapsed)}catch(e)'),'render loop must survive animation errors');
assert(runtime.includes('renderer.info.render.calls'),'WebGL draw diagnostics missing');
assert(html.includes('body.mw-immersive-ar #viewport canvas{display:none!important}'),'XR canvas must not cover native framebuffer');
assert(html.includes('id="arStatus"'),'status overlay must be present in AR gameplay');
assert(runtime.includes("document.body.classList.add('mw-immersive-ar')"),'native XR session must hide DOM canvas');
assert(/document\.body\.classList\.remove\('mw-immersive-ar'(?:,'mw-defense')?\)/.test(runtime),'home must restore DOM canvas, including defense HUD cleanup');
assert(runtime.includes("renderer.domElement.style.display='none'"),'browser canvas must be hidden on XR launch');
assert(runtime.includes('renderer.xr.getBaseLayer?.()'),'must detect native XR framebuffer presence');
assert(runtime.includes('arDebugVisible'),'AR guide must be togglable during gameplay');
console.log('MINI WORLDS: AR floor projection, native framebuffer compositor isolation, draw diagnostics — PASS');
