'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'ritmo-glb-props.js'),'utf8');
const fixture=[
 {name:'dj-booth-desk.glb',expected:688,size:32688},
 {name:'dj-mixer.glb',expected:1338,size:57268}
];
function bytes(name){const p=path.join(root,'assets','ritmo',name);return Uint8Array.from(fs.readFileSync(p)).buffer}
function make(world){new Function('window',script)(world);return world.RitmoImportedProps}
test('real licensed CC0 3D assets have valid GLB format and parse within triangle budget',()=>{
 const adapter=make({});
 for(const f of fixture){
  const buf=bytes(f.name);
  assert.equal(buf.byteLength,f.size);
  const triangles=adapter.parse(buf);
  assert.equal(triangles.length,f.expected);
  for(const t of triangles)for(const v of [t.A,t.B,t.C])assert.ok(v.every(Number.isFinite));
 }
});
test('load two locally vendored GLBs and draw them with original WebXR batch surface API',async()=>{
 const visited=[];
 const world={fetch:async url=>{
  visited.push(url);
  const name=url.split('/').pop();
  return{ok:true,arrayBuffer:async()=>bytes(name)};
 }};
 const props=make(world).create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(props.ready(),true);
 assert.deepEqual(props.status(),{desk:'local',mixer:'local'});
 assert.equal(visited.length,2);
 assert.ok(visited.every(url=>url.startsWith('/assets/ritmo/')));
 let vertices=0;
 const mesh=[];
 const drawn=props.draw(mesh,(target,A,B,C,D,color,alpha,mat)=>{
  assert.equal(target,mesh);
  assert.deepEqual(C,D);
  assert.equal(mat,0);
  assert.ok([A,B,C].every(p=>p.every(Number.isFinite)));
  vertices++;
 });
 assert.equal(drawn,true);
 assert.equal(vertices,688+1338);
});
test('when GLBs are unavailable, renderer returns false to keep procedural decks',async()=>{
 const world={fetch:async()=>({ok:false,status:404})};
 const props=make(world).create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(props.ready(),false);
 assert.equal(props.draw([],()=>{throw Error('No draw expected')}),false);
});
test('reject invalid glTF header and undersized file',()=>{
 const adapter=make({});
 assert.throws(()=>adapter.parse(new ArrayBuffer(3)),/GLB size invalid/);
 assert.throws(()=>adapter.parse(new ArrayBuffer(60)),/Not glTF 2.0/);
});
