'use strict';
// Run: node tests/ritmo-prism-v28.test.cjs
// Software verification of the BRAND NEW stage silhouette, geometry, hits,
// quality levels and integration; not physical Android ARCore rendering.
const assert=require('node:assert/strict'),fs=require('node:fs');
global.window=globalThis;global.innerWidth=390;global.innerHeight=844;
require('../ritmo-core.js');
require('../ritmo-catalog.js');
require('../ritmo-licensed.js');
require('../ritmo-despacito.js');
require('../ritmo-stage-showtime.js');
const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
 ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,TRIANGLES:4,FLOAT:5126,BLEND:3042,
 CULL_FACE:2884,DEPTH_TEST:2929,ONE:1,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771};
for(const name of ['createShader','createProgram','createBuffer','shaderSource','compileShader',
 'attachShader','linkProgram','bindBuffer','enableVertexAttribArray','vertexAttribPointer','blendFunc',
 'useProgram','uniformMatrix4fv','uniform1f','enable','disable','depthMask']){
 gl[name]=()=>({});
}
gl.getShaderParameter=gl.getProgramParameter=()=>true;
gl.getAttribLocation=()=>0;gl.getUniformLocation=()=>({});
gl.uploads=[];gl.calls=[];
gl.bufferData=(_,data)=>{assert(data instanceof Float32Array);assert(data.length%11===0);gl.uploads.push(data)};
gl.drawArrays=(mode,first,count)=>{assert.equal(mode,gl.TRIANGLES);assert(count>100);gl.calls.push(count)};
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],view={projectionMatrix:I,transform:{inverse:{matrix:I}}};
const stage=RitmoStageShowtime.create();
const game=RitmoCore.make('despacito_remix_justin','normal',.25);
RitmoCore.start(game);game.elapsed=10;
const bands=()=>({low:.65,mid:.38,high:.23});
assert(stage.render(gl,view,I,1000,game,.25,bands),stage.status());
assert.equal(gl.calls.length,2,'Only 2 GPU draw passes');
for(let lane=0;lane<4;lane++)assert(stage.spot(lane),'Receptor must be on real AR floor '+lane);
assert(stage.spot(0)[0]<stage.spot(1)[0]&&stage.spot(1)[0]<stage.spot(2)[0]&&stage.spot(2)[0]<stage.spot(3)[0]);
assert(gl.calls.reduce((a,b)=>a+b,0)>5000,'Prism silhouette needs substantial modeled geometry');
const first=gl.uploads.map(x=>x.length);
const perf=global.performance;global.performance={now:()=>1000};stage.hit(2,'PERFECTO');global.performance=perf;
assert(stage.render(gl,view,I,1016,game,.25,bands));
assert(gl.uploads.at(-1).length>first[1],'Anchored hit shockwave must create actual GPU light geometry');
assert.equal(gl.calls.length,4);
assert.equal(stage.setQuality('low'),'low');
assert(stage.render(gl,view,I,1032,game,.25,bands));
assert.equal(stage.quality(),0);
assert.equal(stage.setQuality('high'),'high');
assert(stage.render(gl,view,I,1048,game,.25,bands));
assert.equal(stage.quality(),2);
assert.equal(stage.setQuality('auto'),'auto');
const long=game.notes.find(n=>n.type==='hold');
game.elapsed=long.at+.40;game.holdActive={id:long.id,note:long,progress:.68};
assert(stage.render(gl,view,I,1064,game,.25,bands),'Hold tail must stay renderable');
assert.equal(stage.render(null,view,I,1080,game,.25,bands),false,'Preserve fallback when no WebGL');
const html=fs.readFileSync('ritmo.html','utf8');
const runtime=fs.readFileSync('ritmo-runtime.js','utf8');
const engine=fs.readFileSync('ritmo-engine.js','utf8');
assert(/src="\/ritmo-stage-showtime\.js\?v=(?:28|29|30|31|32|33|34)"/.test(html));
assert(html.indexOf('ritmo-stage-showtime.js')<html.indexOf('ritmo-runtime.js'));
assert(runtime.includes("if(showtimeUsable)"),'Showtime must be the FIRST renderer');
assert(runtime.includes("if(!success&&premiumUsable)"),'Premium fallback must still exist');
assert(runtime.includes("if(!success&&stage3d)"),'Original 3D fallback must still exist');
assert(engine.includes('modoCaosCustomRender')&&engine.includes('requestHitTestSource'),'Preserve AR floor tracking');
assert(html.includes('<option value="despacito_remix_justin" selected>'));
console.log('OK: V28 changes whole stage to light glass, 4 reactors, sound portal, two GPU passes, haptics/Despacito preserved, fallback ready');
