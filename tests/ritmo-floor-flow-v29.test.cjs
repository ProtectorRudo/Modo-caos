'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../ritmo-stage-showtime.js'),'utf8');
const old=fs.readFileSync(path.join(__dirname,'../ritmo-stage-premium.js'),'utf8');
const original=['size*4.025','.025,2.20','const back=-1.15,front=.94','let z=.65,r=size*.44','(lane-1.5)*size'];
test('V29 preserves glass lanes, receptor positions and camera-independent WebXR matrices',()=>{
 for(const pattern of original)assert.ok(src.includes(pattern),pattern);
 assert.match(src,/view\.projectionMatrix/);
 assert.match(src,/view\.transform\.inverse\.matrix/);
 assert.match(src,/const trails=quality===0\?3:5/);
 assert.match(src,/const phase=\(time\*\(\.25\+\.33\*low\)\)%1/);
 assert.match(src,/floor\(illum,a\+\.038,b-\.038,z,z\+\.022,\.065/);
});
function gpu(){
 const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
 ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,TRIANGLES:4,FLOAT:5126,BLEND:3042,
 CULL_FACE:2884,DEPTH_TEST:2929,ONE:1,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,uploads:[]};
 for(const name of ['createShader','createProgram','createBuffer','shaderSource','compileShader','attachShader','linkProgram',
 'bindBuffer','enableVertexAttribArray','vertexAttribPointer','blendFunc','useProgram','uniformMatrix4fv','uniform1f','enable','disable','depthMask'])gl[name]=()=>({});
 gl.getShaderParameter=gl.getProgramParameter=()=>true;
 gl.getAttribLocation=()=>0;gl.getUniformLocation=()=>({});
 gl.bufferData=(_,a)=>gl.uploads.push(a.slice());
 gl.drawArrays=()=>{};
 return gl;
}
test('moving floor light trails advance in low mode without moving the anchored lane mesh',()=>{
 const W=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],view={projectionMatrix:W,transform:{inverse:{matrix:W}}};
 const sandbox={window:{innerWidth:400,innerHeight:800},Float32Array,Math,performance:{now:()=>2000}};
 vm.runInNewContext(src,sandbox,{timeout:5000});
 const stage=sandbox.window.RitmoStageShowtime.create(),gl=gpu();
 stage.setQuality('low');
 const draw=t=>{gl.uploads.length=0;assert.ok(stage.render(gl,view,W,t,{state:'playing',paused:false,lane:0,notes:[],elapsed:t/1000},.25,()=>({low:.6,mid:.5,high:.4})));return gl.uploads.map(a=>Array.from(a));};
 function strips(draw){
  const vertices=draw[1]||[],result=[];
  for(let i=0;i<vertices.length;i+=11){
   const x=vertices[i],y=vertices[i+1],z=vertices[i+2],r=vertices[i+6],g=vertices[i+7],b=vertices[i+8];
   if(Math.abs(y-.065)<.0001&&Math.abs(r-.72)<.001&&Math.abs(g-1)<.001&&Math.abs(b-1)<.001)result.push([x,z]);
  }
  return result;
 }
 const a=draw(2000),b=draw(2400);
 assert.deepEqual(a[0],b[0],'machined stage base must remain static during animation');
 const aa=strips(a),bb=strips(b);
 assert.equal(aa.length,72,'3 active moving strips in each of 4 lanes, 6 vertices per strip');
 assert.equal(bb.length,aa.length);
 assert.notDeepEqual(aa,bb,'LEDs move across the floor even in graphics quality LOW');
});
