'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../rodeados-core.js');
function bot(id,x,z,type='basic'){
 const def=G.TYPES[type];
 return {id,type,x,z,hp:def.hp,maxHp:def.hp,height:def.height,radius:def.radius,
  angle:0,portal:0,age:2,stun:10,attackCD:99,state:'stunned',strafe:1,phase:0,taunt:0,lastHit:0};
}
function progress(g,secs){for(let i=0;i<Math.ceil(secs/.05);i++)G.advance(g,.05);}
test('Bomba Caos: one initial charge, limited range, non-spammable',()=>{
 const g=G.create({seed:42});G.begin(g);
 assert.equal(g.bombCharges,1);assert.equal(g.bombCooldown,0);
 assert.equal(G.throwBomb(g,{x:999,z:0}).ok,false);
 assert.equal(g.bombCharges,1);
 assert.equal(G.throwBomb(g,{x:0,z:-3.2}).ok,true);
 assert.equal(g.bombCharges,0);assert.equal(g.bombsUsed,1);
 assert.equal(g.bombCooldown,32);assert.equal(g.bombs.length,1);
 assert.equal(G.throwBomb(g,{x:0,z:-3}).reason,'recargando');
 progress(g,.55);assert.equal(g.bombs.length,0);
 assert(g.fx.some(f=>f.type==='bombBlast'),'blast must fire after short fuse');
 assert.equal(g.bombCharges,0);
});
test('zone blast destroys basic enemies, stuns armored and leaves enemies outside radius',()=>{
 const g=G.create({seed:27});G.begin(g);g.spawnClock=300;
 g.enemies=[bot(1,0,-3.1),bot(2,.8,-3.4),bot(3,1.2,-3.1,'tank'),
  bot(4,0,2.5),bot(5,0,-3.5,'boss')];
 const life=g.lives;const res=G.throwBomb(g,{x:0,z:-3.25},'vos');
 assert(res.ok);progress(g,.55);
 assert.equal(g.bombHits,4);
 assert.equal(g.kills,2);
 assert.equal(g.enemies.length,3);
 const tank=g.enemies.find(e=>e.type==='tank'),boss=g.enemies.find(e=>e.type==='boss');
 assert.equal(tank.hp,G.TYPES.tank.hp-2);
 assert.equal(boss.hp,G.TYPES.boss.hp-2);
 assert(tank.stun>2&&boss.stun>2);
 assert.equal(g.enemies.find(e=>e.id===4).hp,2,'outside the area untouched');
 assert.equal(g.lives,life,'players do not get friendly-fire damage');
 assert(g.score>200&&g.scores.vos>200);
});
test('recharge after 32 active seconds OR 10 new kills, without instant chain from own blast',()=>{
 const g=G.create({seed:91});G.begin(g);g.spawnClock=300;
 g.enemies=[bot(1,0,-3)];G.throwBomb(g,{x:0,z:-3});
 progress(g,.55);
 assert.equal(g.bombCharges,0);
 assert.equal(g.bombKillsAt,g.kills,'bomb kills do not immediately charge next bomb');
 g.kills+=9;G.advance(g,.03);assert.equal(g.bombCharges,0);
 g.kills++;G.advance(g,.03);assert.equal(g.bombCharges,1);
 assert.equal(G.throwBomb(g,{x:0,z:-3}).ok,true);
 g.bombCooldown=.02;G.advance(g,.04);assert.equal(g.bombCharges,1);
});
test('EMP remains independent and cannot reset bomb cooldown',()=>{
 const g=G.create();G.begin(g);
 G.throwBomb(g,{x:0,z:-3.1});
 assert.equal(G.pulse(g),true);assert(g.skillCooldown>0);
 assert.equal(g.bombCharges,0);assert(g.bombCooldown>0);
});
test('the bomb cannot fire while paused or after game over',()=>{
 const g=G.create();G.begin(g);g.paused=true;
 assert.equal(G.throwBomb(g,{x:0,z:-3}).ok,false);assert.equal(g.bombCharges,1);
 g.paused=false;G.finish(g,'tiempo');assert.equal(G.throwBomb(g,{x:0,z:-3}).ok,false);
});
test('copy and reset serialize the blast state for UI and rematches',()=>{
 const g=G.create({seed:9});G.begin(g);G.throwBomb(g,{x:0,z:-3});
 const c=G.copy(g);
 assert.equal(c.bombCharges,0);assert.equal(c.bombs.length,1);
 assert.equal(c.bombCooldown,32);
 const n=G.reset(g);assert.equal(n.bombCharges,1);assert.equal(n.bombsUsed,0);
});
