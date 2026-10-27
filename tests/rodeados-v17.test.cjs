'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('../rodeados-core.js');

test('weapon progression is automatic and does not consume bullets',()=>{
 const g=G.create({mode:'survival',seed:1717});
 assert.equal(G.weaponTier(g),'pistol');
 g.elapsed=29.9; assert.equal(G.weaponTier(g),'pistol');
 g.elapsed=30; assert.equal(G.weaponTier(g),'tactical');
 g.elapsed=60; assert.equal(G.weaponTier(g),'plasma');
 assert.equal(g.infiniteAmmo,true);
});

test('creep arrives on wave three and boss on wave five, away from player',()=>{
 const g=G.create({mode:'survival',seed:903});
 G.begin(g);
 g.elapsed=30.01;
 G.advance(g,.04);
 assert.ok(g.creepIntroduced,'creep should be introduced');
 const creature=g.enemies.find(e=>e.type==='creep');
 assert.ok(creature);
 assert.ok(Math.hypot(creature.x-g.player.x,creature.z-g.player.z)>=2.45);
 g.enemies.length=0;
 g.elapsed=60.01;
 G.advance(g,.04);
 assert.ok(g.minotaurIntroduced,'fifth-wave boss should appear');
 const boss=g.enemies.find(e=>e.type==='minotaur');
 assert.ok(boss&&boss.hp===G.TYPES.minotaur.hp);
 assert.ok(Math.hypot(boss.x-g.player.x,boss.z-g.player.z)>=2.45);
});

test('minotaur head hits and weapon upgrade damage remain mathematically aligned',()=>{
 const g=G.create({mode:'survival',seed:44});
 G.begin(g);g.elapsed=62;
 const boss=G.spawn(g,'minotaur');
 assert.ok(boss);
 g.enemies=[boss];boss.portal=0;boss.x=0;boss.z=-3;boss.angle=0;
 const origin={x:0,y:2.05,z:0},direction={x:0,y:0,z:-1};
 assert.equal(G.rayHit(g,origin,direction)?.part,'head');
 const r=G.fire(g,{origin,direction});
 assert.equal(r.hit,true);
 assert.equal(r.weapon,'plasma');
 assert.equal(r.damage,4);
 assert.equal(boss.hp,G.TYPES.minotaur.hp-r.damage);
});

test('reflex and joker mode durations remain unchanged',()=>{
 assert.equal(G.create({mode:'reflex'}).duration,60);
 assert.equal(G.create({mode:'joker'}).duration,75);
});
