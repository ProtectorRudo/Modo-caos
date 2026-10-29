'use strict';
/* node tests/ritmo-premium-v27.test.cjs
 * WebGL1 mock checks real geometry and resilience. A simulated frame is not
 * physical Android ARCore validation or a visual screenshot.
 */
const assert=require('node:assert/strict'),fs=require('node:fs');
global.window=globalThis;global.innerWidth=390;global.innerHeight=840;
require('../ritmo-core.js');require('../ritmo-catalog.js');require('../ritmo-licensed.js');
require('../ritmo-despacito.js');require('../ritmo-stage-premium.js');
const GL={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
 ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,TRIANGLES:4,FLOAT:5126,BLEND:3042,
 CULL_FACE:2884,DEPTH_TEST:2929,LEQUAL:515,ONE:1,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,
 calls:[],gpu:[],shaders:[],stride:[]};
for(const key of ['createShader','createProgram','createBuffer','shaderSource','compileShader','attachShader',
 'linkProgram','bindBuffer','enableVertexAttribArray','blendFunc','useProgram','uniformMatrix4fv',
 'uniform1f','enable','disable','depthMask','depthFunc'])GL[key]=(...args)=>{
 if(key==='shaderSource')GL.shaders.push(args[1]);return {};
};
GL.getShaderParameter=()=>true;GL.getProgramParameter=()=>true;
GL.getUniformLocation=()=>({});GL.getAttribLocation=()=>0;
GL.vertexAttribPointer=(i,len,type,norm,stride,offset)=>{assert.equal(stride,44);GL.stride.push(offset)};
GL.bufferData=(target,bytes)=>{assert(bytes instanceof Float32Array);GL.gpu.push(bytes.length)};
GL.drawArrays=(mode,first,vertices)=>{assert.equal(mode,GL.TRIANGLES);assert(vertices>0);GL.calls.push(vertices)};
const M=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],view={projectionMatrix:M,transform:{inverse:{matrix:M}}};
const stage=RitmoStagePremium.create(),g=RitmoCore.make('despacito_remix_justin','normal',.25);
RitmoCore.start(g);g.elapsed=12;
const spectrum=()=>({low:.8,mid:.47,high:.3});
assert(stage.render(GL,view,M,1000,g,.25,spectrum),stage.status());
assert.equal(GL.calls.length,2,'Only two batched GPU draws per frame');
assert(GL.shaders.some(s=>s.includes('attribute vec3 aNormal')),'Normal-lit shader needed');
assert(GL.shaders.some(s=>s.includes('float jewel')),'Material-specific crystal required');
assert(GL.gpu.every(length=>length%11===0),'11 float interleaved vertex format');
assert(GL.stride.includes(40),'Material attribute binding missing');
for(let i=0;i<4;i++)assert(stage.spot(i),'4 color targets required');
assert(stage.spot(0)[0]<stage.spot(3)[0],'Lane order needs to remain stable');
const initialGlow=GL.calls.at(-1);
const oldPerf=global.performance;global.performance={now:()=>1010};
stage.hit(2,'PERFECTO');global.performance=oldPerf;
assert(stage.render(GL,view,M,1030,g,.25,spectrum));
assert(GL.calls.at(-1)>initialGlow,'Physical impact must create spatial geometry');
const hold=g.notes.find(n=>n.type==='hold');
g.elapsed=hold.at+.43;g.cursor=hold.id;g.holdActive={id:hold.id,note:hold,progress:.55};
assert(stage.render(GL,view,M,1046,g,.25,spectrum),'Sustained note should draw past tap deadline');
assert(stage.setQuality('low')==='low');assert(stage.render(GL,view,M,1062,g,.25,spectrum));
assert(stage.setQuality('high')==='high');assert(stage.setQuality('auto')==='auto');
assert(!stage.render(null,view,M,1078,g,.25,spectrum),'Lack of GL should activate legacy backup');
const html=fs.readFileSync('ritmo.html','utf8'),runtime=fs.readFileSync('ritmo-runtime.js','utf8');
assert(html.includes('src="/ritmo-stage-premium.js?v=27"'));
assert(html.includes('src="/ritmo-stage3d.js?v=27"'));
assert(html.includes('value="despacito_remix_justin" selected'));
assert(runtime.includes('if(!success&&stage3d)'), 'Legacy WebGL backup must remain intact');
assert(runtime.includes("E('rtSvg').style.display=success?'none':'block'"),'SVG fallback missing');
assert(runtime.includes('haptics?.scored(ev.note)'), '18 ms haptics retained');
console.log('OK: NEON STUDIO V27 material shader, 4 receivers, GPU batches, progress, world hit, fallback, Despacito and haptics');
