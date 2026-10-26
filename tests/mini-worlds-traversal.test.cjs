/* Execute with: node tests/mini-worlds-traversal.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../mini-worlds-core.js');
const file=path.join(__dirname,'../mini-worlds-art.js'),art=fs.readFileSync(file,'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../mini-worlds-runtime.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../mini-worlds.html'),'utf8');
function clean(s){s.map.boxes.forEach(b=>b.alive=false);s.map.enemies.forEach(e=>e.alive=false);C.drain(s)}
function walkTo(s,target,limit=600){
 const p=s.player;let maxAir=0,events=[];
 for(let i=0;i<limit;i++){
  const dx=target.x-p.x,dz=target.z-p.z,dist=Math.hypot(dx,dz);
  if(dist<.27)return {reached:true,maxAir,events};
  C.tick(s,{x:dx/Math.max(.001,dist),z:dz/Math.max(.001,dist)},1/60);
  if(!p.grounded)maxAir++;
  events.push(...C.drain(s));
 }
 return {reached:false,maxAir,events};
}
for(let n=0;n<2;n++){
 const s=C.create(n);C.start(s);clean(s);
 assert.equal(s.map.walkways.length,13,'each transition needs an explicit traversable visual path');
 assert(s.map.walkways.every(w=>w.width>=1.6),'paths too narrow for the knight');
 for(let i=1;i<8;i++){
  const v=walkTo(s,s.map.platforms[i]);
  assert(v.reached,'failed walking to main island '+i);
  assert.equal(v.maxAir,0,'unexpected airborne frames on connected soil at '+i);
  assert(!v.events.some(e=>e.type==='fall'),'fell while walking a marked road');
 }
 for(const w of s.map.walkways.filter(w=>w.b>=8)){
  const a=s.map.platforms[w.a],b=s.map.platforms[w.b],p=s.player;
  p.x=a.x;p.z=a.z;p.y=a.y;p.vx=p.vz=p.vy=0;p.grounded=true;
  const v=walkTo(s,b);
  assert(v.reached,'branch '+w.b+' unreachable');
  assert.equal(v.maxAir,0,'false fall on side island '+w.b);
  assert(!v.events.some(e=>e.type==='fall'),'fell walking side island');
 }
}
{
 const s=C.create();C.start(s);
 s.map.boxes.forEach(b=>b.alive=false);
 s.map.enemies.forEach(e=>e.alive=false);
 const enemy=s.map.enemies[0];enemy.alive=true;enemy.hp=1;enemy.x=0;enemy.z=0;enemy.y=0;
 s.player.x=0;s.player.z=.65;s.player.face=Math.PI;
 assert(C.attack(s),'attack action not emitted');
 const events=C.drain(s);
 const hit=events.find(e=>e.type==='enemyHit'),ko=events.find(e=>e.type==='enemyDown');
 assert(hit&&ko,'a lethal hit must emit two distinct combat events');
 assert.equal(ko.x,enemy.x);assert.equal(ko.z,enemy.z);
 assert.equal(ko.reward,3);
 assert.equal(s.kills,1);assert.equal(s.coins,3);
}
assert(art.includes('causeway(root,map.walkways[i],i)'),'walkways must visibly render');
assert(art.includes('function combatFx('),'sword/KO graphics missing');
assert(art.includes('koTimers.set(evt.id,.55)'),'KO animation must not instantly disappear');
assert(art.includes('heroShadow'),'the knight needs a contact shadow');
assert(runtime.includes('stage.combatFx?.(e,game.player)'),'FX must be wired to runtime');
assert(runtime.includes('drawMiniMap()'),'minimap must be updated');
assert(html.includes('id="miniMap"')&&html.includes('id="mapToggle"'));
console.log('MINI WORLDS: 2 levels, 7 connected main crossings, 6 branches each, 0 false falls, spatial KO feedback and minimap — PASS');
