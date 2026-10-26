/* MINI WORLDS AR compositor regression. Run node tests/mini-worlds-ar-compositor.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'mini-worlds-ar-compositor.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'mini-worlds-runtime.js'),'utf8');
const html=fs.readFileSync(path.join(root,'mini-worlds.html'),'utf8');
class Matrix{
 constructor(){this.a=null}
 copy(v){this.a=v;return this}
}
let mainRenderer;
class FakeWebGL{
 constructor(props){this.props=props;this.info={render:{calls:0}};
 this.domElement={className:'',style:{},setAttribute(){},remove(){this.removed=true}};
 mainRenderer=this}
 setClearColor(v,a){this.clear=[v,a]}
 setPixelRatio(r){this.ratio=r}
 setSize(w,h){this.size=[w,h]}
 render(scene,camera){this.rendered={scene,camera};this.info.render.calls=42}
 dispose(){this.disposed=true}
}
class FakeCamera{
 constructor(){this.matrix=new Matrix();this.matrixWorld=new Matrix();this.matrixWorldInverse=new Matrix();
 this.projectionMatrix=new Matrix();this.projectionMatrixInverse=new Matrix();this.layers={mask:1};}
}
const T={WebGLRenderer:FakeWebGL,PerspectiveCamera:FakeCamera,SRGBColorSpace:'srgb',ACESFilmicToneMapping:'filmic'};
const host={appendChild(el){this.child=el}};
const sandbox={window:{},devicePixelRatio:2,innerWidth:400,innerHeight:800,console};
vm.runInNewContext(code,sandbox);
const compositor=sandbox.window.MiniWorldsARCompositor(T,host,1.1);
assert.equal(mainRenderer.props.alpha,true);
assert.equal(mainRenderer.props.premultipliedAlpha,true);
assert.equal(mainRenderer.props.antialias,false);
assert.deepEqual(mainRenderer.clear,[0,0]);
assert.equal(mainRenderer.ratio,1.1);
assert.equal(host.child,mainRenderer.domElement);
const eye={matrixWorld:{tag:'WORLD'},matrixWorldInverse:{tag:'VIEW'},
 projectionMatrix:{tag:'PROJECTION'},projectionMatrixInverse:{tag:'INV'},
 layers:{mask:5},near:.03,far:150};
const world={name:'world locked island'};
assert.equal(compositor.render(world,{cameras:[eye]}),true);
assert.equal(mainRenderer.rendered.scene,world,'real world scene must render in transparent compositor');
assert.equal(mainRenderer.rendered.camera.matrixWorld.a,eye.matrixWorld,'copy native tracked eye');
assert.equal(mainRenderer.rendered.camera.matrixWorldInverse.a,eye.matrixWorldInverse);
assert.equal(mainRenderer.rendered.camera.projectionMatrix.a,eye.projectionMatrix);
assert.equal(mainRenderer.rendered.camera.layers.mask,5);
assert.equal(compositor.drawCalls,42);
assert.equal(compositor.frames,1);
assert.equal(compositor.render(world,null),false,'missing viewer pose blocks output');
compositor.resize(500,920);assert.deepEqual(mainRenderer.size,[500,920]);
compositor.dispose();assert(mainRenderer.disposed&&mainRenderer.domElement.removed);
assert(html.includes('id="arWorldOverlay"'),'overlay host missing');
assert(html.includes('mini-worlds-ar-compositor.js'),'compositor script missing');
assert(html.includes('background:transparent!important'),'world overlay must be transparent');
assert(runtime.includes('arCompositor.render(view,renderer.xr.getCamera(camera))'),'native pose must drive world renderer');
assert(runtime.includes('renderer.render(xrEmptyScene,camera)'),'native WebXR must update camera without rendering world');
assert(runtime.includes("arCompositor?.dispose()"),'cleanup when exiting AR');
assert(runtime.includes('arCompositor?.resize('),'resize transparent canvas');
console.log('MINI WORLDS AR compositor: tracked XR poses, transparent layer, correct scene, dispose — PASS');
