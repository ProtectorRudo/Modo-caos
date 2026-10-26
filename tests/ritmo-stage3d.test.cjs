'use strict';
/* node tests/ritmo-stage3d.test.cjs — simulated WebGL draw contract.
 * Does not claim physical ARCore/FPS on Android. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=globalThis;
global.innerWidth=390;global.innerHeight=844;
require('../ritmo-core.js');
require('../ritmo-catalog.js');
require('../ritmo-licensed.js');
require('../ritmo-despacito.js');
require('../ritmo-stage3d.js');
const gl={
 VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
 ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,TRIANGLES:4,FLOAT:5126,BLEND:3042,
 CULL_FACE:2884,DEPTH_TEST:2929,ONE:1,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,
 draws:[],bufferSizes:[]
};
for(const name of ['createShader','createProgram','createBuffer','shaderSource','compileShader',
'attachShader','linkProgram','bindBuffer','enableVertexAttribArray','vertexAttribPointer',
'blendFunc','useProgram','uniformMatrix4fv','uniform1f','enable','disable','depthMask']){
 gl[name]=()=>({});
}
gl.getShaderParameter=()=>true;gl.getProgramParameter=()=>true;
gl.getUniformLocation=()=>({});gl.getAttribLocation=()=>0;
gl.bufferData=(type,data)=>{assert(data instanceof Float32Array,'Typed buffer required');gl.bufferSizes.push(data.length)};
gl.drawArrays=(mode,first,count)=>{assert(count>0);assert.equal(mode,gl.TRIANGLES);gl.draws.push(count)};
const M=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const view={projectionMatrix:M,transform:{inverse:{matrix:M}}};
const stage=RitmoStage3D.create();
const game=RitmoCore.make('despacito_remix_justin','normal',.25);
RitmoCore.start(game);
game.elapsed=8;
assert(stage.render(gl,view,M,1000,game,.25,()=>({low:.76,mid:.30,high:.22})),stage.status());
assert.equal(gl.draws.length,2,'Only two batched draw calls');
assert(gl.draws.reduce((a,b)=>a+b,0)>1700,'Stage has physical geometric volume, not flat tiles');
for(let i=0;i<4;i++)assert(stage.spot(i)?.length===2,'Projected color receptor missing '+i);
assert(stage.spot(0)[0]<stage.spot(3)[0],'Color order wrong');
game.holdActive={note:{lane:2},progress:.77};
assert(stage.render(gl,view,M,1016,game,.25,()=>({low:.30,mid:.85,high:.53})));
assert.equal(gl.draws.length,4,'Render calls must stay batched');
assert.equal(stage.status(),'3D ACTIVO');
const runtime=fs.readFileSync('ritmo-runtime.js','utf8');
const engine=fs.readFileSync('ritmo-engine.js','utf8');
const html=fs.readFileSync('ritmo.html','utf8');
assert(runtime.includes('window.modoCaosCustomRender'),'Custom renderer must integrate into runtime');
assert(engine.includes("if(window.modoCaosCustomRender(gl,view,W,time))"),'Native WebXR framebuffer hook missing');
assert(runtime.includes("E('hud').style.display='none';E('forecast').style.display='none'"),
 'Calibration must not show gameplay HUD');
assert(/src="\/ritmo-stage3d\.js\?v=\d+"/.test(html));
assert(html.includes('id="playerBadge"'));
const fallback=RitmoStage3D.create();
assert.equal(fallback.render(null,view,M,1000,game,.25),false,'No GL must gracefully fall back');
console.log('OK: holographic 4-lane AR geometry, speaker/equalizer/pads, two batches, native XR GL hook, HUD clean and fallback');
