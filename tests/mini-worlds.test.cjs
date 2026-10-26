/* Execute with: node tests/mini-worlds.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const C=require('../mini-worlds-core.js');
const run=(name,fn)=>{try{fn();console.log('✓ '+name)}catch(e){console.error('✗ '+name);throw e}};
run('two unique, loadable levels with all required entity classes',()=>{
 for(let n=0;n<2;n++){let a=C.create(n);assert.equal(a.phase,'ready');assert.equal(a.map.platforms.length,8);assert.ok(a.map.coins.length>=30);
 assert.ok(a.map.boxes.length>=10);assert.equal(a.map.stars.length,3);assert.equal(new Set(a.map.enemies.map(x=>x.type)).size,4);
 assert.equal(a.map.boss.phase,1)}assert.notEqual(C.LEVELS[0].name,C.LEVELS[1].name);
});
run('grounded movement and input response',()=>{
 let s=C.create();C.start(s);for(let i=0;i<26;i++)C.tick(s,{x:.8},1/60);
 assert.ok(s.player.x>0.55);assert.equal(s.player.y,0);assert.ok(s.player.grounded);
});
run('jump buffering, apex, landing and double jump',()=>{
 let s=C.create();C.start(s);C.tick(s,{jump:true},1/60);assert.equal(s.player.jumps,1);
 for(let i=0;i<12;i++)C.tick(s,{},1/60);C.tick(s,{jump:true},1/60);assert.equal(s.player.jumps,2);
 for(let i=0;i<110;i++)C.tick(s,{},1/60);assert.ok(s.player.grounded);assert.equal(s.player.jumps,0);
});
run('boxes are solid and vanish after an attack',()=>{
 let s=C.create();C.start(s);s.player.z=-.55;s.player.face=Math.PI;C.tick(s,{z:-1},1/60);
 assert.ok(s.player.z>=-.68);C.attack(s);assert.ok(!s.map.boxes[0].alive);assert.ok(s.coins>=2);
});
run('coins and stars are unique pickups',()=>{
 let s=C.create();C.start(s);s.player.x=-.62;s.player.z=-.65;C.tick(s,{},1/60);assert.equal(s.coins,1);
 C.tick(s,{},1/60);assert.equal(s.coins,1);
 s.player.x=-1.1;s.player.z=-10.35;s.player.y=1.18;C.tick(s,{},1/60);assert.equal(s.stars,1);
 C.tick(s,{},1/60);assert.equal(s.stars,1);
});
run('enemies patrol, throw visible projectiles and take hits',()=>{
 let s=C.create();C.start(s);s.player.x=.7;s.player.z=-14.8;s.player.y=1.08;
 for(let i=0;i<2;i++)C.tick(s,{},1/60);
 assert.ok(s.map.enemies[3].alive);assert.ok(s.projectiles.length>0);
 let guard=s.map.enemies[2];s.player.x=.6;s.player.z=-10.9;s.player.y=.78;s.player.face=Math.PI;
 C.attack(s);assert.equal(guard.hp,2);
});
run('damage invulnerability and checkpoint recovery',()=>{
 let s=C.create();C.start(s);C.damage(s,'test');assert.equal(s.player.hearts,2);
 C.damage(s,'test');assert.equal(s.player.hearts,2);s.coins=42;s.checkpoint={x:1,z:-12,y:.78};
 s.player.y=-8;C.tick(s,{},1/60);assert.equal(s.player.x,1);assert.equal(s.coins,42);
});
run('telegraphed boss attacks and three health phases',()=>{
 let s=C.create();C.start(s);s.player.z=-22.6;s.player.y=1.15;s.player.invuln=99;
 let events=[];for(let i=0;i<280;i++){C.tick(s,{},1/60);events.push(...C.drain(s).map(e=>e.type))}
 assert.ok(events.includes('bossIntro'));assert.ok(events.includes('bossWarn'));assert.ok(events.includes('bossSmash'));
 const b=s.map.boss;for(let next of [6,3,1]){
 b.hp=next;b.weak=2;b.invuln=0;s.player.face=Math.PI;C.attack(s);s.player.attack=0;
 if(next===6)assert.equal(b.phase,2);if(next===3)assert.equal(b.phase,3);
 }
 assert.ok(s.won);assert.equal(s.phase,'won');
});
run('pause freezes timers and supports resuming',()=>{
 let s=C.create();C.start(s);C.tick(s,{},1/60);let prev=s.clock;C.pause(s);C.tick(s,{},1/60);assert.equal(s.clock,prev);C.pause(s);C.tick(s,{},1/60);assert.ok(s.clock>prev);
});
console.log('MINI WORLDS · ALL CORE TESTS PASSED');
