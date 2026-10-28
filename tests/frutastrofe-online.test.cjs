'use strict';
const assert=require('node:assert/strict'),C=require('../frutastrofe-core.js');
const make=()=>C.create({mode:'arcade',level:1,seed:3892026409,syncWave:true});
const a=make(),b=make();a.begin();b.begin();
let listA=[],listB=[],maxA=0,maxB=0;
for(let tick=0;tick<1200;tick++){
 a.update(.05);b.update(.05);
 // A plays aggressively. B does not shoot. Spawn timeline MUST stay equal.
 if(tick%4===0){
  const fruit=a.objects.find(o=>!o.dead&&!['bomb','rotten'].includes(o.kind));
  if(fruit)a.shoot(fruit.id);
 }
 if(tick%18===0){ // Avoid growing event arrays in browser; test snapshots by filtering
  listA.push(...a.events.filter(e=>e.type==='spawn').map(e=>[Math.round(e.at*100),e.kind,Number(e.x.toFixed(4)),Number(e.y.toFixed(4)),Number(e.z.toFixed(4))]));
  listB.push(...b.events.filter(e=>e.type==='spawn').map(e=>[Math.round(e.at*100),e.kind,Number(e.x.toFixed(4)),Number(e.y.toFixed(4)),Number(e.z.toFixed(4))]));
  a.events.length=b.events.length=0;
 }
 maxA=Math.max(maxA,a.objects.length);maxB=Math.max(maxB,b.objects.length);
}
listA.push(...a.events.filter(e=>e.type==='spawn').map(e=>[Math.round(e.at*100),e.kind]));
listB.push(...b.events.filter(e=>e.type==='spawn').map(e=>[Math.round(e.at*100),e.kind]));
assert.deepEqual(listA,listB,'online 1v1 should present identical seeded sky drops independent of shooting');
assert.equal(a.duration,60);assert.equal(b.duration,60);
assert.equal(a.state,'finished');assert.equal(b.state,'finished');assert(a.score>b.score);
assert(maxB<=32,'unshot sky cannot swamp AR compositor');
console.log('PASS Frutastrofe online: 60s shared seeded drops, consistent physics, independent scores, bounded population');
