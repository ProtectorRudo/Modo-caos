'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../rodeados-missions.js');
function step(g,seconds,dt=.04){for(let t=0;t<seconds;t+=dt)G.advance(g,Math.min(dt,seconds-t))}
function rescue(seed=2718){const g=G.create({mode:'rescue',seed});G.movePlayer(g,{x:0,z:0});G.begin(g);assert.equal(G.prepareRescue(g),true);return g}
test('10 levels: randomized guard entry positions, rescue -> escort -> extraction -> boss completion',()=>{
 const g=rescue();let old=null;
 for(let level=1;level<=10;level++){
  const m=g.mission;
  assert.equal(m.level,level);
  assert.equal(m.hostageActive,true);
  assert.equal(m.spawnPoints.length,7);
  assert.equal(new Set(m.spawnPoints.map(p=>p.x+':'+p.z)).size,7);
  assert.ok(Math.hypot(m.object.x-m.base.x,m.object.z-m.base.z)>2.4);
  if(old)assert.notDeepEqual(m.spawnPoints,old,'every level randomizes 7 spawn positions');
  old=m.spawnPoints.map(x=>({...x}));
  assert(g.enemies.length>=2,'real guards present in every level');
  assert.equal(G.missionAction(g).ok,false,'cannot liberate hostage remotely');
  const fixed={...m.object};
  G.movePlayer(g,{x:.8,z:.8});
  assert.deepEqual(m.object,fixed,'unrescued hostage never follows phone/camera');
  G.movePlayer(g,m.object);
  const free=G.missionAction(g);
  assert.equal(free.ok,true);assert.equal(free.kind,'liberar');assert.equal(m.carry,true);
  assert.equal(G.missionAction(g).ok,false,'cannot deliver at hostage location');
  G.movePlayer(g,m.base);
  const back=G.missionAction(g);assert.equal(back.ok,true);
  assert.equal(m.rescued,level);
  if(level===10){assert.equal(g.phase,'finished');assert.equal(m.completed,true);assert.equal(g.finishedReason,'diez_rehenes_rescatados');break}
  assert.equal(m.hostageActive,false,'transition hides last hostage');
  g.spawnClock=10000;
  step(g,2.65);
  assert.equal(g.phase,'playing','next level starts without resetting arena or score');
 }
});
test('stages reproducible by seed, but different levels and seeds have different entrances',()=>{
 const a=rescue(150),b=rescue(150),c=rescue(151);
 assert.deepEqual(a.mission.spawnPoints,b.mission.spawnPoints);
 assert.notDeepEqual(a.mission.spawnPoints,c.mission.spawnPoints);
});
test('hostage can be lost to mission timeout, player damage during escort, and cannot be rescued from far away',()=>{
 const a=rescue();a.spawnClock=10000;
 a.elapsed=a.mission.levelDeadline-.03;step(a,.06);
 assert.equal(a.phase,'finished');assert.equal(a.finishedReason,'tiempo_de_rescate');assert.equal(a.mission.completed,false);
 const b=rescue();G.movePlayer(b,b.mission.object);assert(G.missionAction(b).ok);
 b.mission.hostageHealth=2;b.lives=90;b.spawnClock=10000;
 const e=b.enemies[0];e.portal=0;e.stun=0;e.x=b.player.x+.1;e.z=b.player.z+.1;e.attackCD=0;
 step(b,.07);
 assert(b.mission.hostageHealth<=2,'hostage health is tracked independently while escorted');
});
test('timewarp automatically freezes enemies and shows 3 seconds of fracture every 12 seconds',()=>{
 const g=G.create({mode:'timewarp',seed:49});G.begin(g);g.spawnClock=10000;
 const e=G.spawn(g,'basic');assert(e);e.portal=0;e.stun=0;
 g.elapsed=5.95;step(g,.08);assert.equal(g.mission.timePhase,'FRACTURA');
 assert(g.mission.timeCycles>=1);const frozen={x:e.x,z:e.z};
 step(g,.12);
 assert(Math.hypot(e.x-frozen.x,e.z-frozen.z)<.1,'actual enemy physics nearly stopped');
 assert(G.missionStatus(g).text.includes('CONGELADO'));
 g.elapsed=8.96;step(g,.08);assert.equal(g.mission.timePhase,'ACELERADO');
 assert(G.missionStatus(g).text.includes('REBOTE'));
 g.elapsed=11.97;step(g,.08);assert.equal(g.mission.timePhase,'NORMAL');
});
test('TIME ROTO manual ability fractures time for four seconds without pausing the clock',()=>{
 const g=G.create({mode:'timewarp',seed:6});G.begin(g);g.spawnClock=10000;
 assert(G.pulse(g));assert.equal(g.skillCooldown,11);assert.equal(g.mission.slowUntil,4);
 step(g,.04);assert.equal(g.mission.timePhase,'FRACTURA');
 const before=g.elapsed;step(g,.24);assert(g.elapsed>before);
 assert.equal(G.pulse(g),false,'ability has cooldown, not unlimited spam');
});
test('classic CTF world-anchored capture behavior is unaffected',()=>{
 const g=G.create({mode:'ctf',seed:4}),p=G.normalizeFlagPlan();
 const cfg={base:{x:0,z:0},flag:{x:0,z:-3.5},spots:p.spots.slice(0,6)};
 assert(G.configureFlagPlan(g,cfg).ok);G.begin(g);g.spawnClock=10000;
 const original=G.flagLocation(g);G.movePlayer(g,{x:2,z:2});
 assert.deepEqual(G.flagLocation(g),original,'flag stays anchored when walking');
 G.movePlayer(g,cfg.flag);assert(G.missionAction(g).ok);
 G.movePlayer(g,cfg.base);assert(G.missionAction(g).ok);assert.equal(g.mission.captures,1);
});
