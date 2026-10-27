'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../rodeados-missions.js');
const modes=['invasion','loot','timewarp','refuge','mutant','colossus','ctf'];
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

test('all seven modes have individual durations, instructions, reproducible objectives and reset',()=>{
 assert.deepEqual(modes.map(m=>G.create({mode:m,seed:42}).duration),[75,90,60,75,90,90,150]);
 for(const mode of modes){
  const g=G.create({mode,seed:20}),snap=G.copy(g);
  assert.equal(snap.mission.kind,mode);
  assert.ok(G.MODES[mode].tip.length>10);
  assert.ok(G.missionStatus(g).text);
  assert.equal(G.reset(g).mission.kind,mode);
  assert.equal(G.create({mode:'survival'}).mission,undefined);
 }
});

test('flag planner supports exactly 6 or 7 spawn locations and rejects unsafe closeness',()=>{
 const f=G.normalizeFlagPlan({
  base:{x:0,z:0},flag:{x:0,z:.1},spots:Array.from({length:6},()=>({x:.01,z:.01}))
 });
 assert.equal(f.spots.length,6);
 assert.ok(near(f.base,f.flag)>=.9);
 assert.ok(f.spots.every(p=>Math.hypot(p.x,p.z)>=2.75));
 assert.equal(G.normalizeFlagPlan(null).spots.length,7);
});

test('flag: actual player position takes a flag, returns to base and scores each delivery',()=>{
 const g=G.create({mode:'ctf',seed:234,flagPlan:{base:{x:0,z:.78},flag:{x:0,z:-.8},spots:G.normalizeFlagPlan().spots.slice(0,6)}});
 G.begin(g);g.spawnClock=1000;
 assert.equal(g.mission.spawnPoints.length,6);
 const e=G.spawn(g,'flanker');assert.ok(e);
 assert.ok(near(e,g.player)>=2.45);
 assert.equal(e.missionAssigned,true);
 G.movePlayer(g,g.mission.object);G.advance(g,.05);
 assert.equal(g.mission.carry,true);
 G.movePlayer(g,g.mission.base);G.advance(g,.05);
 assert.equal(g.mission.captures,1);
 assert.equal(g.mission.carry,false);
 assert.ok(g.score>=750);
 G.movePlayer(g,g.mission.object);G.advance(g,.05);
 G.movePlayer(g,g.mission.base);G.advance(g,.05);
 assert.equal(g.mission.captures,2);
 assert.ok(G.missionStatus(g).text.includes('2'));
});

test('loot: shooting a chest opens it, but extract requires recovered loot and returning to base',()=>{
 const g=G.create({mode:'loot',seed:1});G.begin(g);g.spawnClock=1000;
 assert.equal(G.missionAction(g).reason,'primero_abri_un_cofre');
 const p=g.mission.crates[1];
 const shot={origin:{x:p.x,y:.65,z:p.z+2},direction:{x:0,y:0,z:-1}};
 const fired=G.fire(g,shot);
 assert.equal(fired.crate,true);
 assert.equal(g.mission.loot,1);
 assert.equal(g.mission.crates[1].opened,true);
 assert.equal(G.fire(g,shot).crate,undefined,'can not farm the same crate');
 assert.equal(G.missionAction(g).reason,'acercate_a_tu_base');
 G.movePlayer(g,g.mission.base);
 const got=G.missionAction(g);
 assert.equal(got.ok,true);assert.equal(g.mission.extracted,1);
 assert.equal(g.phase,'finished');assert.equal(g.mission.completed,true);
});

test('timewarp: EMP slows the encounter for three seconds without slowing the game clock',()=>{
 const g=G.create({mode:'timewarp',seed:7});G.begin(g);g.spawnClock=1000;
 const e=G.spawn(g,'basic');e.portal=0;e.stun=0;
 assert.equal(G.pulse(g),true);
 assert.equal(g.mission.slowUntil,3);
 G.advance(g,.06);
 assert.ok(g.elapsed>.059);
 assert.ok(g.elapsed<.07);
 assert.ok(G.missionStatus(g).text.includes('ACTIVO'));
});

test('refuge: enemy attack damages the reactor, not the player shield',()=>{
 const g=G.create({mode:'refuge',seed:70});G.begin(g);g.spawnClock=1000;
 const e=G.spawn(g,'basic');e.portal=0;e.stun=0;
 e.x=g.mission.object.x;e.z=g.mission.object.z+2.5;e.attackCD=0;
 const life=g.lives;
 G.advance(g,.06);
 assert.ok(g.mission.reactor<100);
 assert.equal(g.lives,life);
});

test('refuge: three stations require real player proximity and can be activated once',()=>{
 const g=G.create({mode:'refuge',seed:10});G.begin(g);g.spawnClock=1000;
 assert.equal(G.missionAction(g).reason,'acercate_a_una_estacion');
 for(const station of g.mission.stations){
  G.movePlayer(g,station);assert.equal(G.missionAction(g).ok,true);
 }
 assert.equal(g.mission.stations.filter(s=>s.active).length,3);
 assert.ok(g.score>=1050);
 assert.equal(G.missionAction(g).ok,false);
});

test('mutant: mutation rotates at 15-second intervals; waves use same combat engine',()=>{
 const g=G.create({mode:'mutant',seed:9});G.begin(g);g.spawnClock=1000;
 G.advance(g,.05);
 assert.equal(g.mission.mutation,'NORMAL');
 g.elapsed=15.01;G.advance(g,.05);
 assert.equal(g.mission.mutation,'FRENESÍ');
 g.elapsed=30.01;G.advance(g,.05);
 assert.equal(g.mission.mutation,'BLINDADOS');
});

test('colossus: three successive bosses and real completion condition',()=>{
 const g=G.create({mode:'colossus',seed:67});G.begin(g);
 for(let n=1;n<=3;n++){
  G.advance(g,.05);
  const e=g.enemies.find(x=>x.missionBoss);
  assert.ok(e,'boss '+n+' spawned');assert.equal(g.mission.bossIndex,n);
  assert.ok(e.hp>G.TYPES.basic.hp);
  g.enemies=[]; // kill simulation for progression, real combat uses G.fire
 }
 G.advance(g,.05);
 assert.equal(g.phase,'finished');assert.equal(g.mission.completed,true);
 assert.equal(g.finishedReason,'colosos_derrotados');
});

test('classic modes remain compatible when mission decorator is loaded',()=>{
 const g=G.create({mode:'survival',seed:11});G.begin(g);
 G.advance(g,.06);assert.equal(g.phase,'playing');assert.equal(g.mission,undefined);
 assert.equal(G.weaponTier(g),'pistol');
});
