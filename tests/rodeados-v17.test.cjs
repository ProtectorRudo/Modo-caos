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

test('tactical rounds are faster and upgrade body hits without headshot inflation',()=>{
 const g=G.create({mode:'survival',seed:290});G.begin(g);g.elapsed=35;
 const enemy=G.spawn(g,'basic');assert.ok(enemy);
 enemy.portal=0;enemy.x=0;enemy.z=-3;enemy.angle=0;
 const ray={origin:{x:0,y:1.15,z:0},direction:{x:0,y:0,z:-1}};
 const result=G.fire(g,ray);
 assert.equal(result.weapon,'tactical');
 assert.equal(result.hit,true);
 assert.equal(result.damage,2);
});
test('purple stalker never spawns, including former 30s scripted arrival; spider and boss remain',()=>{
 const g=G.create({mode:'survival',seed:903});
 G.begin(g);g.elapsed=12.01;G.advance(g,.04);
 assert.ok(g.spiderIntroduced,'wolf-spider still introduces tactical variety');
 assert.ok(g.enemies.some(e=>e.type==='spider'),'spider remains playable');
 g.elapsed=30.01;G.advance(g,.04);
 assert.equal(g.enemies.some(e=>e.type==='creep'),false,'no purple monster on wave three');
 const legacy=G.spawn(g,'creep');
 assert.ok(legacy&&legacy.type==='spider','even explicit old creep requests spawn a spider instead');
 g.enemies.length=0;
 g.elapsed=60.01;G.advance(g,.04);
 assert.ok(g.minotaurIntroduced,'fifth-wave boss should still appear');
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
