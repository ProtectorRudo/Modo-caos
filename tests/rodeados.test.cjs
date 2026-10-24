'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../rodeados-core.js');
const ray={origin:{x:0,y:1.55,z:-3},direction:{x:0,y:0,z:1}};
const mkEnemy=(type='basic',x=0,z=0)=>({id:1,type,x,z,angle:0,hp:G.TYPES[type].hp,maxHp:G.TYPES[type].hp,
 radius:G.TYPES[type].radius,height:G.TYPES[type].height,state:'advance',age:0,stun:0,attackCD:1,strafe:1,phase:0,portal:0,taunt:0,lastHit:0});
test('modes 90 seconds, 60 seconds, infinite and boss are configured',()=>{
 assert.equal(G.create({mode:'survival'}).duration,90);
 assert.equal(G.create({mode:'reflex'}).duration,60);
 assert.equal(G.create({mode:'joker'}).duration,75);
 assert.equal(G.create({mode:'boss'}).duration,90);
 assert.equal(G.create({mode:'infinite'}).duration,Infinity);
});
test('same seed creates reproducible spawn distribution',()=>{
 const a=G.create({seed:12345}),b=G.create({seed:12345});
 for(let i=0;i<3;i++){let ea=G.spawn(a,'basic'),eb=G.spawn(b,'basic');
  assert.deepEqual(ea&&[ea.x,ea.z,ea.sector],eb&&[eb.x,eb.z,eb.sector])}
});
test('all 8 sectors can spawn across games without appearing inside player',()=>{
 const seen=new Set();
 for(let seed=1;seed<400;seed++){
  const g=G.create({seed,arena:3.7}),e=G.spawn(g,'basic');
  if(e){seen.add(e.sector);assert.ok(Math.hypot(e.x,e.z)>1.09)}
 }
 assert.equal(seen.size,8);
});
test('ray misses and hits only actual active robots',()=>{
 const g=G.create({seed:2});g.enemies=[mkEnemy()];
 assert.equal(G.rayHit(g,ray.origin,ray.direction).id,1);
 assert.equal(G.rayHit(g,ray.origin,{x:1,y:0,z:0}),null);
 g.enemies[0].portal=.6;assert.equal(G.rayHit(g,ray.origin,ray.direction),null);
});
test('headshot deals extra damage and awards combo, kill and points',()=>{
 const g=G.create({seed:2});G.begin(g);g.enemies=[mkEnemy()];
 const r=G.fire(g,ray,'player1');
 assert.equal(r.ok,true);assert.equal(r.hit,true);assert.equal(r.killed,true);
 assert.equal(g.kills,1);assert.equal(g.hits,1);assert.equal(g.shots,1);
 assert.equal(g.ammo,27);assert.ok(g.score>100);assert.equal(g.scores.player1,g.score);
});
test('empty magazine requires reload, reload honors 1.35s',()=>{
 const g=G.create();G.begin(g);g.ammo=0;
 assert.equal(G.fire(g,ray).ok,false);
 assert.equal(G.reload(g),true);assert.equal(G.reload(g),false);
 G.advance(g,.07);for(let i=0;i<19;i++)G.advance(g,.07);
 assert.equal(g.ammo,g.mag);assert.equal(g.reload,0);
});
test('EMP stuns bots and has cooldown',()=>{
 const g=G.create();G.begin(g);g.enemies=[mkEnemy()];
 assert.equal(G.pulse(g),true);assert.ok(g.enemies[0].stun>=2);
 assert.equal(G.pulse(g),false);
});
test('no phantom changes while paused',()=>{
 const g=G.create();G.begin(g);g.paused=true;
 const before=g.elapsed;G.advance(g,.07);
 assert.equal(g.elapsed,before);
});
test('failing hit breaks combo without inventing damage',()=>{
 const g=G.create();G.begin(g);g.enemies=[mkEnemy()];g.combo=4;
 const r=G.fire(g,{origin:{x:0,y:1.5,z:-3},direction:{x:1,y:0,z:0}});
 assert.equal(r.hit,false);assert.equal(g.combo,0);assert.equal(g.lives,100);
});
test('auto timeout ends with correct results',()=>{
 const g=G.create({mode:'reflex',seed:123});G.begin(g);g.elapsed=59.97;G.advance(g,.07);
 assert.equal(g.phase,'finished');assert.equal(g.finishedReason,'tiempo');
});
test('collision resolver separates humanoids',()=>{
 const g=G.create({seed:91,arena:3.5});G.begin(g);
 const a=mkEnemy('basic',.8,0),b=mkEnemy('basic',.8,0);b.id=2;
 g.enemies=[a,b];G.advance(g,.04);
 assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>0.60);
});
test('no teleport to camera during spawn',()=>{
 const g=G.create({seed:456});
 for(let i=0;i<10;i++){const e=G.spawn(g,'basic');
  if(e)assert.ok(Math.hypot(e.x-g.player.x,e.z-g.player.z)>1)}
});
