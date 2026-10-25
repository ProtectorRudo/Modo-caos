'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../rodeados-core.js');
test('3m enemies visibly walk toward the player before attacking, but never crowd camera',()=>{
 const g=G.create({seed:123});G.begin(g);g.spawnClock=999;
 const enemy=G.spawn(g,'basic');
 assert(enemy,'test needs real seeded robot');
 enemy.x=0;enemy.z=-3.35;enemy.portal=0;enemy.stun=0;enemy.attackCD=999;
 const originalDist=Math.hypot(enemy.x-g.player.x,enemy.z-g.player.z);
 let walked=false,attacking=false,minDist=Infinity;
 for(let i=0;i<120;i++){
  G.advance(g,.05);
  const dist=Math.hypot(enemy.x-g.player.x,enemy.z-g.player.z);
  if(enemy.state==='advance')walked=true;
  if(enemy.state==='attack')attacking=true;
  minDist=Math.min(dist,minDist);
 }
 assert(walked,'robot should walk on floor');
 assert(attacking,'robot should reach attack perimeter on its own');
 assert(originalDist-minDist>=.7,'approach must be visible; old setup only moved a few centimeters: '+(originalDist-minDist));
 assert(minDist>=2.45-.001,'keep physical XR eye clearance >= 2.45m');
 assert.equal(g.lives,100,'test enemy has delayed attack; no unfair instant damage');
});
test('every archetype attacks after a meaningful approach, not from spawn range',()=>{
 for(const [name,def] of Object.entries(G.TYPES)){
  assert(def.range<2.95,'attack range must be within minimum 2.95m spawn ring for '+name);
  assert(def.range>2.45,'attack must still work outside protected camera circle for '+name);
  assert(def.speed>=.30,'robot should visibly move, not slide centimeters per second: '+name);
 }
});
