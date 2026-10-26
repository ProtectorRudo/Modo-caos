/* MINI WORLDS regression: real side jumps, standable boxes, ocean and rewards.
 * Run with: node tests/mini-worlds-physics-polish.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../mini-worlds-core.js');
const art=fs.readFileSync(path.join(__dirname,'../mini-worlds-art.js'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../mini-worlds-runtime.js'),'utf8');
const make=(n=0)=>{const s=C.create(n);C.start(s);s.map.enemies.forEach(e=>e.alive=false);s.map.boxes.forEach(b=>b.alive=false);C.drain(s);return s};
let landings=0;
for(let n=0;n<2;n++){
 const s=make(n),p=s.player;
 for(const path of s.map.walkways.filter(w=>w.b>=8)){
  const tt=.44,goal=s.map.platforms[path.b];
  p.x=path.x1+(path.x2-path.x1)*tt;
  p.z=path.z1+(path.z2-path.z1)*tt;
  p.y=C.platformY(s,p.x,p.z);p.vx=p.vy=p.vz=0;p.grounded=true;p.onBox=null;
  let reached=false;
  for(let k=0;k<120;k++){
   const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
   C.tick(s,{x:dx/Math.max(.001,d),z:dz/Math.max(.001,d),jump:k===1},1/60);
   assert(!C.drain(s).some(e=>e.type==='fall'),'false side-island fall '+n+':'+path.b);
   if(d<.29&&p.grounded&&k>10){reached=true;break}
  }
  assert(reached,'side island cannot be reached by jump '+n+':'+path.b);landings++;
 }
}
{
 const s=make(),b=s.map.boxes[0];b.alive=true;
 const p=s.player;p.x=b.x;p.z=b.z+.72;p.y=0;p.vx=p.vy=p.vz=0;p.grounded=true;
 let stood=0;
 for(let k=0;k<102;k++){
  C.tick(s,{jump:k===1,z:k<18?-.85:0},1/60);
  if(p.onBox===b.id)stood++;
 }
 assert(stood>40,'must stand on crate for an extended period');
 assert(Math.abs(p.y-C.BOX_TOP)<.015,'crate standing height must match visible lid');
 assert(p.grounded,'crate must count as solid ground');
 C.tick(s,{jump:true},1/60);
 assert(p.vy>0&&!p.grounded,'must jump from crate normally');
 // Once the crate is destroyed it cannot continue carrying the player.
 p.y=C.BOX_TOP;p.vy=0;p.grounded=true;p.onBox=b.id;b.alive=false;
 for(let k=0;k<50;k++)C.tick(s,{},1/60);
 assert.equal(p.onBox,null,'destroyed crate must not remain a floor');
 assert(Math.abs(p.y)<.001,'the player must return to the island underneath');
}
{
 const s=make();const p=s.player;p.x=9;p.z=-11;p.y=0;p.vy=0;p.grounded=false;
 let falls=0;
 for(let k=0;k<120;k++){C.tick(s,{},1/60);falls+=C.drain(s).filter(e=>e.type==='fall').length}
 assert(falls>=1,'real water fall still matters');
}
{
 const s=make(),c=s.map.coins[0],p=s.player;
 p.x=c.x;p.z=c.z;p.y=0;
 C.tick(s,{},1/60);
 const event=C.drain(s).find(e=>e.type==='coin');
 assert(event,'coin event missing');assert.equal(event.x,c.x);assert.equal(event.z,c.z);
}
assert(art.includes('new T.ShaderMaterial'),'moving ocean shader missing');
assert(art.includes('uTime.value=elapsed'),'water time uniform must animate every frame');
assert(art.includes('makeShoreFoam(root,map)'),'seafoam effect missing');
assert(!art.includes('const plate=mesh(cube(width,.54,length)'),'uncollidable fake islands must not resemble playable land');
assert(art.includes("evt.reward===2?'+2':'+1'"),'normal/fury coin visual reaction missing');
assert(art.includes('crateShards(evt.x,evt.y,evt.z)'),'crate fragments missing');
assert(art.includes("rewardPop('KO! +3'"),'enemy reward pop missing');
assert(runtime.includes('stage.combatFx?.(e,game.player)'),'combat fx not connected');
console.log('MINI WORLDS: 12 side jump landings, solid crate lids, crate jumping/breaking, genuine sea falls, animated ocean and spatial rewards — PASS');
