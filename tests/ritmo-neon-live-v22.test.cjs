'use strict';
/* node tests/ritmo-neon-live-v22.test.cjs
 * Render and release regressions for the procedurally modelled 3D AR stage.
 * Simulator; NEVER a substitute for Android ARCore/fps validation. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=globalThis;
global.innerWidth=390;global.innerHeight=850;
require('../ritmo-core.js');require('../ritmo-catalog.js');
require('../ritmo-licensed.js');require('../ritmo-despacito.js');
require('../ritmo-stage3d.js');
const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
 ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,TRIANGLES:4,FLOAT:5126,BLEND:3042,
 CULL_FACE:2884,DEPTH_TEST:2929,LEQUAL:515,ONE:1,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,
 calls:[],uploads:[],depthEvents:[]};
for(const k of ['createShader','createProgram','createBuffer','shaderSource','compileShader','attachShader',
 'linkProgram','bindBuffer','enableVertexAttribArray','vertexAttribPointer','blendFunc','useProgram',
 'uniformMatrix4fv','uniform1f','enable','disable','depthMask','depthFunc'])gl[k]=(...a)=>{
 if(k==='enable'||k==='disable'||k==='depthMask'||k==='depthFunc')gl.depthEvents.push([k,...a]);
 return {};
};
gl.getShaderParameter=()=>true;gl.getProgramParameter=()=>true;gl.getAttribLocation=()=>0;gl.getUniformLocation=()=>({});
gl.bufferData=(type,b)=>{assert(b instanceof Float32Array);gl.uploads.push(b.length)};
gl.drawArrays=(mode,offset,count)=>{assert.equal(mode,gl.TRIANGLES);assert(count>0);gl.calls.push(count)};
const M=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const view={projectionMatrix:M,transform:{inverse:{matrix:M}}};
const game=RitmoCore.make('despacito_remix_justin','normal',.25);
RitmoCore.start(game);game.elapsed=11;
const stage=RitmoStage3D.create();
const sound=()=>({low:.84,mid:.48,high:.39});
assert(stage.render(gl,view,M,995,game,.25,sound));
assert.equal(gl.calls.length,2,'Keep geometry at TWO GPU batches per view');
const baseGlow=gl.calls.at(-1);
assert(gl.depthEvents.some(e=>e[0]==='enable'&&e[1]===gl.DEPTH_TEST),'3D hardware needs depth buffer');
assert(gl.depthEvents.some(e=>e[0]==='depthMask'&&e[1]===false),'Light glow must not write depth');
for(let lane=0;lane<4;lane++)assert(stage.spot(lane),'Missing projected receiver');
const perf=global.performance;
global.performance={now:()=>1000};
stage.hit(2,'PERFECTO');
global.performance=perf;
assert(stage.render(gl,view,M,1016,game,.25,sound));
assert(gl.calls.at(-1)>baseGlow,'World-space hit wave must emit actual geometry at 16 ms');
assert.equal(gl.calls.length,4);
const h=game.notes.find(n=>n.type==='hold');
assert(h);
game.elapsed=h.at+.43;game.cursor=h.id;game.holdActive=null;
assert(stage.render(gl,view,M,1100,game,.25,sound));
const noHold=gl.calls.at(-1);
game.holdActive={id:h.id,note:h,progress:.61};
assert(stage.render(gl,view,M,1116,game,.25,sound));
assert(gl.calls.at(-1)>noHold,'Active long note must keep 3D tail visible after tap deadline');
stage.setQuality('low');
assert.equal(stage.mode(),'low');
assert(stage.render(gl,view,M,1132,game,.25,sound));
assert.equal(stage.quality(),0);
stage.setQuality('high');assert.equal(stage.mode(),'high');
stage.setQuality('auto');assert.equal(stage.mode(),'auto');
assert.equal(stage.render(null,view,M,1200,game,.25,sound),false,'SVG fallback still available');
const html=fs.readFileSync('ritmo.html','utf8');
const runtime=fs.readFileSync('ritmo-runtime.js','utf8');
const engine=fs.readFileSync('ritmo-engine.js','utf8');
assert(html.includes('src="/ritmo-stage3d.js?v=22"'));
assert(html.includes('id="quality"'));
assert(html.includes('src="/ritmo-despacito.js?v=22"'));
assert(runtime.includes("stage3d?.hit(ev.lane,'HOLD')"));
assert(runtime.includes("stage3d?.hit(ev.lane,ev.rating)"));
assert(engine.includes('modoCaosCustomRender'));
assert(html.includes('<option value="despacito_remix_justin" selected>'));
console.log('OK: NEON LIVE v22; depth, 3D hit VFX, hold tails, quality modes, 2 batches, fallback, Despacito default');
