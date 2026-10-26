/* MINI WORLDS — high-impact arcade loop regression.
 * Run: node tests/mini-worlds-juice.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../mini-worlds-core.js');
const art=fs.readFileSync(path.join(__dirname,'../mini-worlds-art.js'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../mini-worlds-runtime.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../mini-worlds.html'),'utf8');
function make(){
 const s=C.create(0);C.start(s);C.drain(s);
 s.map.enemies.forEach(e=>e.alive=false);
 s.map.boxes.forEach(b=>b.alive=false);
 s.map.coins.forEach(c=>c.taken=true);
 s.player.x=0;s.player.z=.8;s.player.y=0;s.player.face=Math.PI;
 return s;
}
function smash(s,id){
 const b=s.map.boxes[id];b.alive=true;b.hp=1;b.x=0;b.z=0;
 s.player.attack=0;
 assert(C.attack(s),'attack should succeed');
 assert(!b.alive,'crate must break');
 return C.drain(s);
}
{
 const a=make(),b=make();
 assert.deepEqual(a.chaos,b.chaos,'fresh meters must be deterministic');
 for(let id=0;id<6;id++){
  const ae=smash(a,id),be=smash(b,id);
  assert.deepEqual(ae,be,'crate prizes must be repeatable for same ID and level');
 }
 assert(a.chaos.chain>=3,'successful streak increases');
 assert(a.chaos.best>=a.chaos.chain,'best combo is tracked');
 assert(a.coins>0,'crate coins awarded');
 const q=a.chaos;
 assert(q.charge>0||q.fury>0,'regular hits fill chaos meter');
}
{
 const s=make(),events=[];
 for(let id=0;id<10;id++){
  events.push(...smash(s,id));
  if(s.chaos.fury>0)break;
 }
 assert(s.chaos.fury>6.9,'Fury should activate after earning points');
 assert.equal(s.chaos.charge,0,'charge resets on Fury');
 assert.equal(events.filter(e=>e.type==='furyStart').length,1,'one start trigger');
 assert(events.some(e=>e.type==='combo'),'multi-crate chain should grant combo bonus');
 // Fury grants double ordinary coin rewards, no extra recharge while active.
 const coin=s.map.coins[0];coin.taken=false;coin.x=0;coin.z=.8;coin.y=.53;
 const before=s.coins;
 C.tick(s,{},1/60);
 const e=C.drain(s).find(e=>e.type==='coin');
 assert(e&&e.reward===2,'Fury doubles ground coins');
 assert.equal(s.coins-before,2,'Fury should pay exactly two per coin');
 assert.equal(s.chaos.charge,0,'Fury cannot refill itself');
 assert(s.chaos.fury>0,'Fury stays active');
 let endings=0;
 for(let i=0;i<470;i++){
  C.tick(s,{},1/60);
  endings+=C.drain(s).filter(e=>e.type==='furyEnd').length;
 }
 assert.equal(s.chaos.fury,0,'Fury lasts finite duration');
 assert.equal(endings,1,'end event must fire just once');
}
{
 const s=make();
 smash(s,0);smash(s,1);
 assert(s.chaos.chain>=2);
 s.player.invuln=0;
 C.damage(s,'enemy');
 assert.equal(s.chaos.chain,0,'hurt should break chain');
 assert.equal(s.chaos.window,0,'hurt should clear chain timer');
}
{
 const s=make();
 const star=s.map.stars[0];star.x=0;star.z=.8;star.y=.55;
 C.tick(s,{},1/60);
 const event=C.drain(s).find(e=>e.type==='star');
 assert(event&&event.x===0&&event.z===.8,'star effects require world coords');
}
for(const q of ['chaosMeter','chaosFill','chaosCaption','comboBanner'])assert(html.includes('id="'+q+'"'),'missing '+q);
assert(html.includes('body.fury-mode'),'fury visual theme missing');
assert(runtime.includes("e.type==='furyStart'"),'audio/haptics must respond to Fury');
assert(runtime.includes('game.chaos'),'HUD must display meter');
assert(art.includes('furySparks'),'3D aura must include sparks');
assert(art.includes('shockwave('),'3D combat waves missing');
assert(art.includes('rewardPop('),'pickup feedback missing');
assert(art.includes('windTargets'),'ambient wind motion missing');
assert(art.includes('particleMaterials'),'particles must use shared materials');
console.log('MINI WORLDS: deterministic chests, 1 Fury trigger, 7s timer, double coins, combo rewards, no Fury farming, damage resets and FX wiring — PASS');
