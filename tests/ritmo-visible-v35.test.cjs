'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const skin=read('ritmo-skinning.js'),loader=read('ritmo-glb-props.js'),ext=read('ritmo-exterior.js'),html=read('ritmo.html'),floor=read('ritmo-stage-showtime.js');
function world(){const w={fetch:async url=>{
 assert.ok(url.startsWith('/assets/ritmo/'));
 return {ok:true,arrayBuffer:async()=>Uint8Array.from(fs.readFileSync(path.join(root,url.slice(1)))).buffer};
}};new Function('window',loader)(w);new Function('window',skin)(w);return w}
test('v35 is an actual different design instead of an old cached stage',()=>{
 assert.ok(html.includes('/ritmo-glb-props.js?v=35'));
 assert.ok(html.includes('/ritmo-skinning.js?v=35'));
 assert.ok(html.includes('/ritmo-exterior.js?v=35'));
 assert.ok(html.includes('/ritmo-stage-showtime.js?v=35'));
 assert.ok(ext.includes("HORSE DJ V35"));
 assert.ok(ext.includes('for(let i=0;i<17;i++)'),'17 animated booth equalizer columns');
 assert.ok(ext.includes('const side=size*1.45+.045,z=-1.89,roof=.99'),'compact backdrop truss');
 assert.ok(!ext.includes('beam([x,.035,z],[x,roof,z]'),'no long skinny antenna poles');
 assert.ok(ext.includes("annulus(illum,sign*.168,controlsY+.020,-1.42,.060,.070"));
 assert.ok(ext.includes('const hands=skeletal?.hands?.(t,low,combo)'));
});
test('wrist changes visibly over the real Quaternius CDJs',async()=>{
 const w=world(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'ready');
 const tracks={L:[],R:[]};
 for(let i=0;i<=24;i++){
  const hands=dj.hands(i*.089,.74,0);
  for(const k of ['L','R']){const p=hands[k];
   assert.ok(p.every(Number.isFinite));
   assert.ok(Math.abs(p[0])>=.132&&Math.abs(p[0])<=.170);
   assert.ok(p[1]>.36&&p[1]<.48);
   tracks[k].push(p);
  }
 }
 for(const k of ['L','R']){
  const range=dim=>Math.max(...tracks[k].map(p=>p[dim]))-Math.min(...tracks[k].map(p=>p[dim]));
  assert.ok(range(0)>.023,'visible platter scrubbing');
  assert.ok(range(1)>.052,'visible hand tapping');
 }
 const vertices=[];dj.draw([],(_m,A,B,C,D)=>{
   vertices.push(...A,...B,...C);assert.deepEqual(D,C);
 },1.2,.8,0,15);
 assert.equal(vertices.length,2958*9);
 assert.ok(vertices.every(Number.isFinite));
});
test('different exterior before game still never alters scoring floor',()=>{
 assert.ok(floor.includes('const trails=quality===0?3:5'));
 assert.ok(floor.includes('const back=-1.15,front=.94'));
 const source=read('ritmo-core.js');
 assert.ok(!ext.includes('RitmoCore.tick'));
 assert.ok(!skin.includes('RitmoCore.tick'));
 assert.ok(source.length>100);
 const calls=[];
 const api={
  mesh:[],illum:[],getQuality:()=>1,
  surface:(_m,A,B,C,D)=>calls.push({kind:'face',points:[A,B,C,D]}),
  cuboid:(_m,x,y,z,w,h,d)=>calls.push({kind:'box',points:[[x-w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z+d/2]]}),
  annulus:(_m,x,y,z)=>calls.push({kind:'disc',points:[[x,y,z]]}),
  disc:(_m,x,y,z)=>calls.push({kind:'disc',points:[[x,y,z]]})
 };
 const w={RitmoImportedProps:{create:()=>({ready:()=>false,has:()=>false,drawPart:()=>false})},RitmoSkeletalDJ:{create:()=>({draw:()=>false,hands:()=>null})}};
 new Function('window',ext)(w);
 const stage=w.RitmoExterior.create(api);
 stage.render(.25,0,{combo:0},{low:.5,mid:.5});
 assert.ok(calls.length>110,'distinct stage still renders before gameplay');
 for(const c of calls)for(const p of c.points){
   assert.ok(p.every(Number.isFinite));
   assert.ok(p[2]<-1.15,'exterior is behind protected note lane');
 }
});
