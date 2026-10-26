'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const source=n=>fs.readFileSync(path.join(base,n),'utf8');
const file=n=>Uint8Array.from(fs.readFileSync(path.join(base,n))).buffer;
const loader=source('ritmo-glb-props.js'),skin=source('ritmo-skinning.js'),ext=source('ritmo-exterior.js'),html=source('ritmo.html');
function world(){
 const w={fetch:async url=>({
  ok:true,arrayBuffer:async()=>file(url.replace(/^\/+/,''))
 })};
 new Function('window',loader)(w);
 new Function('window',skin)(w);
 return w;
}
test('V34 real GLB IK reaches both CDJ decks without disjoint mesh',async()=>{
 const w=world(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'ready');
 const p=dj.hands(2.5,.62,0);
 assert.ok(p&&p.L&&p.R);
 for(const hand of [p.L,p.R]){
  assert.ok(hand.every(Number.isFinite));
  assert.ok(Math.abs(hand[0])>.12&&Math.abs(hand[0])<.24,'CDJ x not reached '+hand);
  assert.ok(hand[1]>.29&&hand[1]<.49,'worktop y not reached '+hand);
  assert.ok(hand[2]<-1.32&&hand[2]>-1.60,'deck depth not reached '+hand);
 }
 assert.ok(p.L[0]>0&&p.R[0]<0);
 let triangles=0,largest=0,positions=[];
 const scene=[];
 dj.draw(scene,(mesh,A,B,C,D,color)=>{
  assert.equal(mesh,scene);
  assert.deepEqual(C,D);
  triangles++;
  for(const q of [A,B,C]){assert.ok(q.every(Number.isFinite));positions.push(q)}
  largest=Math.max(largest,Math.hypot(...A.map((x,k)=>x-B[k])),
     Math.hypot(...B.map((x,k)=>x-C[k])),Math.hypot(...C.map((x,k)=>x-A[k])));
 },2.5,.62,2,0);
 assert.equal(triangles,2958);
 assert.ok(largest<.32,'IK produced stretched/shredded triangles: '+largest);
 assert.ok(positions.every(p=>p[2]<-1.20),'no body pieces intrude on note lanes');
});
test('beat produces actual wrist motion; combos change right hand',async()=>{
 const w=world(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 const a=dj.hands(.38,.4,0),b=dj.hands(.98,.9,0),c=dj.hands(.38,.4,35);
 assert.ok(Math.hypot(...a.L.map((x,i)=>x-b.L[i]))>.002,'left DJ must move on beat');
 assert.ok(Math.hypot(...a.R.map((x,i)=>x-c.R[i]))>.002,'right DJ must react to combo');
});
test('V34 cabina, stage feet, and four game-lane invariants',()=>{
 assert.ok(ext.includes("const workY=.355,workZ=-1.437,workWidth=.605"));
 assert.ok(ext.includes("props.draw(mesh,surface,{deskOnly:true})"));
 assert.ok(ext.includes("const hands=skeletal?.hands?.(t,low,combo)"));
 assert.ok(ext.includes("for(const sign of [-1,1])for(const depth of [-1,1])"));
 assert.ok(ext.includes("const BACK=.22"));
 assert.ok(ext.includes("const stageZ=-1.57,stageWidth=size*4+.29"));
 assert.ok(ext.includes("HORSE DJ V34"));
 const floor=source('ritmo-stage-showtime.js');
 assert.ok(floor.includes('const trails=quality===0?3:5'));
 assert.ok(floor.includes('const back=-1.15,front=.94'));
 for(const name of ['ritmo-glb-props','ritmo-skinning','ritmo-exterior','ritmo-stage-showtime'])
  assert.ok(html.includes('/'+name+'.js?v=34'),name);
 assert.ok(html.indexOf('ritmo-skinning.js?v=34')<html.indexOf('ritmo-exterior.js?v=34'));
 assert.ok(html.indexOf('ritmo-stage-showtime.js?v=34')<html.indexOf('ritmo-runtime.js?v=31'));
});
