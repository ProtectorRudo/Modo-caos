'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../rodeados-missions.js');
const modes=['invasion','loot','timewarp','refuge','mutant','colossus','ctf'];
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

test('all seven modes have individual durations, instructions, reproducible objectives and reset',()=>{
 assert.deepEqual(modes.map(m=>G.create({mode:m,seed:42}).duration),[75,120,75,75,90,90,150]);
 for(const mode of modes){
  const g=G.create({mode,seed:20}),snap=G.copy(g);
  assert.equal(snap.mission.kind,mode);
  assert.ok(G.MODES[mode].tip.length>10);
  assert.ok(G.missionStatus(g).text);
  assert.equal(G.reset(g).mission.kind,mode);
  assert.equal(G.create({mode:'survival'}).mission,undefined);
 }
});

test('CTF must have six or seven individually confirmed points with types and no silent relocation',()=>{
 const g=G.create({mode:'ctf',seed:31});
 assert.equal(g.mission.configured,false);
 assert.equal(G.missionAction(g).ok,false);
 const points=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return {x:+(Math.sin(a)*3.35).toFixed(2),z:+(Math.cos(a)*3.35).toFixed(2)}});
 const invalid={base:{x:0,z:.6},flag:{x:0,z:-3.45},spots:points.slice(0,5)};
 assert.equal(G.configureFlagPlan(g,invalid).ok,false);
 const plan={base:{x:0,z:.6},flag:{x:0,z:-3.45},spots:points,kinds:['basic','flanker','spider','creep','tank','random']};
 const saved=G.configureFlagPlan(g,plan);
 assert.equal(saved.ok,true);assert.equal(g.mission.configured,true);
 assert.deepEqual(g.mission.spawnPoints,points,'markers never silently migrate');
 assert.deepEqual(g.mission.spawnTypes,plan.kinds.map(x=>x==='creep'?'spider':x),'deprecated purple monster replaced with spider in saved plans');
 G.begin(g);g.spawnClock=1000;G.movePlayer(g,g.mission.base);
 const e=G.spawn(g,'fast');
 assert.equal(e.type,'basic','type of spawn number one overrides unrelated default random kind');
 assert.equal(e.x,points[0].x);assert.equal(e.z,points[0].z);
 assert.equal(e.role,'interceptor');
 assert.equal(G.configureFlagPlan(g,plan).ok,false,'cannot change map during combat');
});

test('flag: manual retrieval and delivery requires explicit button AND player proximity',()=>{
 const g=G.create({mode:'ctf',seed:234}),points=G.normalizeFlagPlan().spots.slice(0,6);
 const plan={base:{x:0,z:.60},flag:{x:0,z:-3.45},spots:points};
 assert.equal(G.configureFlagPlan(g,plan).ok,true);
 G.begin(g);g.spawnClock=1000;
 assert.equal(g.mission.captures,0);
 assert.equal(G.missionAction(g).reason,'acercate_al_objetivo');
 G.movePlayer(g,g.mission.object);G.advance(g,.05);
 assert.equal(g.mission.carry,false,'walking past flag cannot auto-pickup');
 assert.equal(G.missionAction(g).ok,true);assert.equal(g.mission.carry,true);
 G.movePlayer(g,g.mission.base);G.advance(g,.05);
 assert.equal(g.mission.captures,0,'walking onto base cannot auto-score');
 assert.equal(G.missionAction(g).ok,true);assert.equal(g.mission.captures,1);
 assert.equal(g.mission.carry,false);
 G.movePlayer(g,g.mission.object);
 assert.equal(G.missionAction(g).ok,true);
 G.movePlayer(g,g.mission.base);
 assert.equal(G.missionAction(g).ok,true);
 assert.equal(g.mission.captures,2);
 assert.ok(G.missionStatus(g).text.includes('2'));
});

test('loot: user places five remote anchored chests, enemy guards defend them, and opening/extraction requires physical proximity',()=>{
 const g=G.create({mode:'loot',seed:1});
 const crates=[{x:0,z:-3},{x:2,z:-3},{x:-2,z:-3},{x:3.5,z:-1},{x:-3.5,z:-1}];
 const plan={base:{x:0,z:0},crates};
 assert.equal(g.mission.configured,false);
 assert.equal(g.mission.crates.length,0,'no nearby automatic loot');
 assert.equal(G.configureLootPlan(g,{base:plan.base,crates:crates.slice(0,4)}).ok,false);
 assert.equal(G.configureLootPlan(g,{base:plan.base,crates:[{x:0,z:.5},...crates.slice(1)]}).ok,false);
 assert.equal(G.configureLootPlan(g,plan).ok,true);
 assert.equal(g.mission.configured,true);
 assert.deepEqual(g.mission.crates.map(c=>({x:c.x,z:c.z})),crates,'selected points preserved');
 assert.equal(g.mission.spawnPoints.length,7);
 for(const p of g.mission.spawnPoints)assert.ok(Math.hypot(p.x-plan.base.x,p.z-plan.base.z)>=3.05,'guards spawn away from base');
 G.begin(g);g.spawnClock=10000;
 const e=G.spawn(g,'basic');assert.ok(e);
 assert.equal(e.x,g.mission.spawnPoints[0].x);
 assert.equal(e.z,g.mission.spawnPoints[0].z);
 assert.equal(G.missionAction(g).reason,'acercate_a_un_botin');
 assert.equal(G.missionStatus(g).canAct,false);
 assert.equal(G.missionAction(g).ok,false,'cannot open loot from the starting point');
 assert.equal(G.configureLootPlan(g,plan).ok,false,'cannot relocate loot in active round');
 assert.equal(G.movePlayer(g,crates[0]),true);
 assert.equal(g.player.z,-3,'world roaming beyond cosmetic arena must work');
 assert.equal(G.missionStatus(g).canAct,true);
 const opened=G.missionAction(g);
 assert.equal(opened.ok,true);assert.equal(opened.kind,'abrir');
 assert.equal(g.mission.crates[0].opened,true);
 assert.equal(g.mission.loot,1);
 assert.equal(G.missionAction(g).ok,false,'same chest cannot be farmed');
 assert.equal(g.phase,'playing');
 G.movePlayer(g,plan.base);
 const extracted=G.missionAction(g);
 assert.equal(extracted.ok,true);assert.equal(extracted.kind,'extraer');
 assert.equal(g.mission.extracted,1);assert.equal(g.phase,'finished');assert.equal(g.mission.completed,true);
 const replay=G.reset(g,{lootPlan:g.mission.plan});
 assert.equal(replay.mission.configured,true);
 assert.equal(replay.mission.crates.filter(x=>x.opened).length,0);
});

test('timewarp: EMP freezes encounter for four seconds without slowing the game clock',()=>{
 const g=G.create({mode:'timewarp',seed:7});G.begin(g);g.spawnClock=1000;
 const e=G.spawn(g,'basic');e.portal=0;e.stun=0;
 assert.equal(G.pulse(g),true);
 assert.equal(g.mission.slowUntil,4);
 assert.equal(g.skillCooldown,11,'timewarp refreshes EMP faster than classic');
 G.advance(g,.06);
 assert.ok(g.elapsed>.059);
 assert.ok(g.elapsed<.07);
 assert.ok(G.missionStatus(g).text.includes('CONGELADO'));
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

test('invasion portals are stable in fixed AR world even if camera/player moves',()=>{
 const g=G.create({mode:'invasion',seed:71});G.begin(g);g.spawnClock=10000;
 G.movePlayer(g,{x:1,z:-1});
 const p=G.spawn(g,'basic');
 assert.equal(p.x,0);
 assert.equal(p.z,3.15);
});

test('loot cannot be won by surviving without extracting',()=>{
 const g=G.create({mode:'loot',seed:44});G.begin(g);g.spawnClock=10000;
 g.elapsed=119.99;G.advance(g,.03);
 assert.equal(g.phase,'finished');assert.equal(g.mission.completed,false);
});

test('refuge victory requires intact reactor AND three actual station activations',()=>{
 const g=G.create({mode:'refuge',seed:32});G.begin(g);g.spawnClock=10000;
 g.elapsed=74.99;G.advance(g,.04);
 assert.equal(g.phase,'finished');assert.equal(g.mission.completed,false);
 const h=G.create({mode:'refuge',seed:32});G.begin(h);h.spawnClock=10000;
 h.mission.stations.forEach(st=>st.active=true);
 h.elapsed=74.99;G.advance(h,.04);
 assert.equal(h.phase,'finished');assert.equal(h.mission.completed,true);
});

test('colossus has real HP phases and a timed loss condition',()=>{
 const g=G.create({mode:'colossus',seed:14});G.begin(g);G.advance(g,.04);
 const boss=g.enemies.find(e=>e.missionBoss);assert.ok(boss);
 boss.hp=Math.floor(boss.maxHp*.25);
 G.advance(g,.04);
 assert.equal(g.mission.bossPhase,3);
 const fail=G.create({mode:'colossus',seed:14});G.begin(fail);fail.elapsed=89.99;G.advance(fail,.05);
 assert.equal(fail.phase,'finished');assert.equal(fail.mission.completed,false);
});

test('Capture the Flag timeout counts completed captures, not combat kills',()=>{
 const g=G.create({mode:'ctf',seed:17});const p=G.normalizeFlagPlan();
 const cfg={base:{x:0,z:.6},flag:{x:0,z:-3.45},spots:p.spots.slice(0,6)};
 assert(G.configureFlagPlan(g,cfg).ok);G.begin(g);g.spawnClock=10000;
 g.elapsed=149.99;G.advance(g,.04);assert.equal(g.mission.completed,false);
 const h=G.create({mode:'ctf',seed:17});assert(G.configureFlagPlan(h,cfg).ok);
 G.begin(h);h.spawnClock=10000;h.mission.captures=2;h.elapsed=149.99;G.advance(h,.04);
 assert.equal(h.mission.completed,true);
});

test('enemy flag stays exactly where placed until pickup, then follows player and resets when delivered',()=>{
 const g=G.create({mode:'ctf',seed:123});
 const plan={base:{x:0,z:0},flag:{x:3.8,z:-1.7},spots:G.normalizeFlagPlan().spots.slice(0,6)};
 assert.equal(G.configureFlagPlan(g,plan).ok,true);
 assert.deepEqual(g.mission.object,plan.flag,'outside home platform exact user coordinates');
 G.begin(g);g.spawnClock=10000;
 const fixed=G.flagLocation(g);
 assert.deepEqual(fixed,{...plan.flag,y:0,state:'fixed'});
 G.movePlayer(g,{x:2,z:-1});
 assert.deepEqual(G.flagLocation(g),fixed,'uncollected flag must NEVER follow phone');
 assert.equal(G.missionAction(g).ok,false,'cannot pick up remotely');
 G.movePlayer(g,plan.flag);
 assert.equal(G.flagLocation(g).state,'fixed','simply approaching must not pick it up');
 assert.equal(G.missionAction(g).ok,true);
 assert.equal(G.flagLocation(g).state,'carried');
 G.movePlayer(g,{x:1.75,z:-.45});
 assert.equal(G.flagLocation(g).x,1.75,'the carried flag follows mobile tracked position');
 assert.equal(G.flagLocation(g).z,-.45);
 G.movePlayer(g,plan.base);
 assert.equal(G.flagLocation(g).state,'carried','entering base does not auto-score');
 assert.equal(G.missionAction(g).ok,true);
 assert.equal(g.mission.captures,1);
 assert.deepEqual(G.flagLocation(g),fixed,'flag respawns at ORIGINAL location after delivery');
 assert.deepEqual(g.mission.object,plan.flag,'immutable logical flag target');
});

test('flag must be outside base perimeter and player movement can reach it',()=>{
 const pts=G.normalizeFlagPlan().spots.slice(0,6);
 const g=G.create({mode:'ctf'});
 assert.equal(G.validateFlagPlan({base:{x:0,z:0},flag:{x:0,z:-1.4},spots:pts},g.arena).ok,false);
 assert.equal(G.validateFlagPlan({base:{x:0,z:0},flag:{x:0,z:-2.34},spots:pts},g.arena).ok,false);
 const far={base:{x:0,z:0},flag:{x:0,z:-5.7},spots:pts};
 assert.equal(G.configureFlagPlan(g,far).ok,true);
 G.begin(g);G.movePlayer(g,{x:0,z:-5.7});
 assert.equal(g.player.z,-5.7,'phone/player no longer clipped to the original 2.6m platform');
 assert.equal(G.missionAction(g).ok,true);
});

test('CTF physical movement does not stop at 2.6m home platform or the obsolete 8m boundary',()=>{
 const g=G.create({mode:'ctf',seed:221});
 const plan={base:{x:0,z:0},flag:{x:0,z:-7.9},spots:G.normalizeFlagPlan().spots.slice(0,6)};
 assert.equal(G.configureFlagPlan(g,plan).ok,true);
 G.begin(g);
 assert(G.movePlayer(g,{x:0,z:-2.7}));assert.equal(g.player.z,-2.7);
 assert(G.movePlayer(g,{x:0,z:-8.6}));assert.equal(g.player.z,-8.6,'no invisible 8m clip');
 assert(G.movePlayer(g,plan.flag));assert.equal(G.missionAction(g).ok,true,'flag can be taken at target');
 assert(G.movePlayer(g,plan.base));assert.equal(G.missionAction(g).ok,true,'one delivery scored');
 assert.equal(g.mission.captures,1);
 assert.equal(g.paused,false,'CTF never forces recalibration on leaving base');
});
test('legacy creep selection, random spawn, and forced wave are all purple-monster-free',()=>{
 const g=G.create({mode:'ctf',seed:155});
 const plan={base:{x:0,z:0},flag:{x:0,z:-4},spots:G.normalizeFlagPlan().spots.slice(0,6),kinds:['creep','random','basic','tank','spider','flanker']};
 assert(G.configureFlagPlan(g,plan).ok);
 assert.equal(g.mission.spawnTypes[0],'spider','saved purple choice becomes spider');
 G.begin(g);
 for(let i=0;i<6;i++)assert.notEqual(G.spawn(g,'creep')?.type,'creep');
 g.enemies=[];g.elapsed=30.01;G.advance(g,.05);
 assert.equal(g.enemies.some(e=>e.type==='creep'),false);
});
