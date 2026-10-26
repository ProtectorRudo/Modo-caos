/* CUADRANTE automated core smoke tests — no browser or AR hardware claimed. */
'use strict';
const assert=require('node:assert/strict');
global.window=global;require('../cuadrante-core.js');
const C=global.CuadranteCore,tests=[];
function caseOf(name,fn){fn();tests.push(name);console.log('✓',name)}
caseOf('six finite-speed AI profiles and seven arena forms',()=>{assert.equal(C.profiles.length,6);assert.equal(C.modes.length,7);for(const p of C.profiles)assert.ok(p.speed>0&&p.error>=0)});
caseOf('deterministic fixed-step simulation',()=>{const a=C.create({seed:17}),b=C.create({seed:17});C.start(a);C.start(b);for(let i=0;i<1000;i++){C.step(a);C.step(b)}assert.deepEqual(a.ball,b.ball)});
caseOf('player center strike reverses ball',()=>{const s=C.create();C.start(s);s.phase='playing';s.ball={x:0,y:1.2,z:2.878,vx:0,vy:0,vz:6};C.step(s);assert.ok(s.ball.vz<0);assert.equal(s.rally,1)});
caseOf('edge strike adjusts the ball angle',()=>{const s=C.create();C.start(s);s.phase='playing';s.ball={x:.28,y:1.39,z:2.878,vx:0,vy:0,vz:6};C.step(s);assert.ok(s.ball.vx>0&&s.ball.vy>0)});
caseOf('five points wins and advances to next of six opponents',()=>{const s=C.create();C.start(s);for(let i=0;i<5;i++){s.ball={x:1.6,y:1.2,z:-2.878,vx:0,vy:0,vz:-5};s.phase='playing';C.step(s);C.step(s)}assert.equal(s.phase,'finished');assert.equal(s.score[0],5);assert.ok(C.next(s));assert.equal(s.duel,1)});
caseOf('three survival misses end run',()=>{const s=C.create({modePlay:'survival'});C.start(s);for(let i=0;i<3;i++){s.ball={x:1.6,y:1.2,z:2.878,vx:0,vy:0,vz:5};s.phase='playing';C.step(s);C.step(s)}assert.equal(s.survivalLives,0);assert.equal(s.phase,'finished')});
caseOf('obstacles and arena walls prevent tunneling under velocity',()=>{for(let mode=0;mode<7;mode++){const s=C.create({seed:41+mode});C.start(s);s.phase='playing';s.mode=mode;s.ball={x:1.55,y:1.1,z:.3,vx:8,vy:5,vz:-7};for(let k=0;k<180;k++){C.step(s);assert.ok(Math.abs(s.ball.x)<=C.bounds.W+.015,'wall x escaped');assert.ok(s.ball.y>=C.bounds.LOW-.015&&s.ball.y<=C.bounds.HIGH+.015,'wall y escaped')}}});

caseOf('controlled moving strike triggers smash with faster feedback',()=>{
 const s=C.create();C.start(s);s.phase='playing';C.target(s,.23,1.26);C.step(s);
 s.ball={x:.25,y:1.26,z:2.878,vx:0,vy:0,vz:5};C.step(s);
 assert.equal(s.ball.vz<0,true);
 assert.ok(C.drain(s).some(e=>e.type==='smash'));
});
caseOf('time-based geometry shift is warned and applied only away from ball',()=>{
 const s=C.create();s.duel=1;s.mode=1;C.start(s);s.phase='playing';
 s.clock=15;s.startedAt=0;s.ball={x:0,y:1.2,z:2.1,vx:0,vy:0,vz:-4};
 for(let i=0;i<110;i++){C.step(s);if(s.mode===2)break;}
 assert.equal(s.mode,2);assert.ok(C.drain(s).some(e=>e.type==='transformWarning'));
});
caseOf('prediction offers bounded hint only for unobstructed beginner arena',()=>{
 const s=C.create();C.start(s);
 s.ball={x:.2,y:1.3,z:0,vx:1,vy:.2,vz:5};
 const p=C.predictedLanding(s);assert.ok(p&&p.reliable&&p.x<1.76&&p.y<2.23);
 s.mode=2;assert.equal(C.predictedLanding(s).reliable,false);
});

caseOf('AR stage is placed ahead of phone, with player paddle on detected target',()=>{
 for(const yaw of [0,Math.PI/3,-Math.PI/2,Math.PI]){
  const hit={x:2,y:0,z:3},scale=.66,world=C.anchoredArena(hit,yaw,0,{x:0,z:0},scale);
  const frontal={x:world.x+Math.sin(yaw)*3*scale,z:world.z+Math.cos(yaw)*3*scale};
  assert.ok(Math.abs(frontal.x-hit.x)<1e-6&&Math.abs(frontal.z-hit.z)<1e-6);
 }
});
caseOf('AR recenter preserves the same duel, scoring and ball trajectory',()=>{
 const s=C.create({seed:1234});s.duel=3;C.start(s);
 for(let i=0;i<150;i++)C.step(s);
 s.score=[3,2];s.arcade=2300;s.combo=4;
 const prior={clock:s.clock,ball:{...s.ball},score:[...s.score],duel:s.duel,arcade:s.arcade,combo:s.combo};
 C.pause(s);const pose=C.anchoredArena({x:1.5,y:0,z:-2},.4,.2,{x:.1,z:.1},.65);
 assert.ok(Number.isFinite(pose.x)&&Number.isFinite(pose.z));
 for(let i=0;i<120;i++)C.step(s);
 assert.equal(s.clock,prior.clock);assert.deepEqual(s.ball,prior.ball);
 C.resume(s);assert.deepEqual(s.score,prior.score);
 assert.equal(s.duel,prior.duel);assert.equal(s.arcade,prior.arcade);assert.equal(s.combo,prior.combo);
 C.step(s);assert.ok(s.clock>prior.clock);
});
caseOf('touch input is precise, resolution-independent, and jump bounded',()=>{
 const a=C.touchDelta(80,-80,390,780,1),b=C.touchDelta(160,-160,780,1560,1);
 assert.ok(Math.abs(a.x-b.x)<1e-12);assert.ok(Math.abs(a.y-b.y)<1e-12);
 const gentle=C.touchDelta(80,-80,390,780,.60);
 assert.ok(gentle.x<a.x&&gentle.y<a.y);
 const fast=C.touchDelta(80,-80,390,780,1.45);
 assert.ok(fast.x>a.x);
 const jump=C.touchDelta(1800,-1800,390,780,1);
 assert.ok(jump.x<=.92&&jump.y<=.55);
});
caseOf('XR hit-test floor gate rejects walls, bad poses and missing camera-only hits',()=>{
 const good={transform:{position:{x:0,y:0,z:-1},orientation:{x:0,y:0,z:0,w:1}}};
 assert.equal(C.horizontalHit(good),true);
 const wall={transform:{position:{x:0,y:0,z:-1},orientation:{x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2}}};
 assert.equal(C.horizontalHit(wall),false);
 const tilted={transform:{position:{x:0,y:0,z:-1},orientation:{x:.25,y:0,z:0,w:Math.sqrt(1-.25*.25)}}};
 assert.equal(C.horizontalHit(tilted),true);
 assert.equal(C.horizontalHit({transform:{position:{x:0,y:0,z:0}}}),false);
 assert.equal(C.horizontalHit(null),false);
 const invalid={transform:{position:{x:Infinity,y:0,z:0},orientation:{x:0,y:0,z:0,w:1}}};
 assert.equal(C.horizontalHit(invalid),false);
});
caseOf('phone aim calibrates to defender center then moves with ray in both axes',()=>{
 const origin={x:0,y:1.8,z:3.25},neutral=C.aimRayToArena(origin,{x:0,y:-.13,z:-1});
 assert.ok(neutral&&Number.isFinite(neutral.x)&&Number.isFinite(neutral.y));
 const centered=C.aimedDefense(neutral,neutral);
 assert.deepEqual({x:centered.x,y:centered.y},{x:0,y:1.2});
 const right=C.aimRayToArena(origin,{x:.15,y:-.13,z:-1});
 const up=C.aimRayToArena(origin,{x:0,y:0,z:-1});
 const a=C.aimedDefense(right,neutral,1),b=C.aimedDefense(up,neutral,1);
 assert.ok(a.x>0&&Math.abs(a.y-1.2)<.001);
 assert.ok(b.y>1.2);
 assert.equal(C.aimedDefense(right,neutral,.6).x<a.x,true);
 assert.equal(C.aimedDefense(right,neutral,1.45).x>a.x,true);
});
caseOf('phone aim ignores backwards, missing or invalid camera poses',()=>{
 const o={x:0,y:1,z:3};
 assert.equal(C.aimRayToArena(o,{x:0,y:0,z:1}),null);
 assert.equal(C.aimRayToArena(o,{x:0,y:0,z:0}),null);
 assert.equal(C.aimRayToArena(o,{x:NaN,y:0,z:-1}),null);
 assert.equal(C.aimRayToArena(null,{x:0,y:0,z:-1}),null);
 assert.equal(C.aimRayToArena(o,{x:1,y:0,z:-.01}),null);
});
caseOf('invisible collider still reflects near-center shots and misses outside its area',()=>{
 const s=C.create();C.start(s);s.phase='playing';C.target(s,.8,1.5);
 s.ball={x:.8,y:1.5,z:2.878,vx:0,vy:0,vz:5};C.step(s);
 assert.ok(s.ball.vz<0,'hidden collider must still rebound');
 C.drain(s);
 s.ball={x:-1.6,y:.35,z:2.878,vx:0,vy:0,vz:5};s.phase='playing';C.step(s);
 assert.equal(s.score[1],1,'collider remains fair and does not cover the entire arena');
});
caseOf('long-court anchor pins near goal to one real-world hit under rotation',()=>{
 for(const yaw of [-2,-.3,0,.95,2.6]){
  const hit={x:.31,y:-.04,z:-.88},scale=.56,depthStretch=1.18;
  const pose=C.anchoredArena(hit,yaw,0,{x:0,z:0},scale,depthStretch);
  const depth=C.bounds.FRONT*scale*depthStretch;
  assert.ok(Math.abs(pose.x+Math.sin(yaw)*depth-hit.x)<1e-8);
  assert.ok(Math.abs(pose.z+Math.cos(yaw)*depth-hit.z)<1e-8);
  assert.ok(Number.isFinite(pose.rotation));
 }
});
caseOf('first rival is more readable and slower ball offers time to react',()=>{
 assert.ok(C.profiles[0].pace<=3.65,'beginner flight should be tuned for real phone aiming');
 assert.ok(C.profiles[0].pace<C.profiles[3].pace);
 for(const pr of C.profiles)assert.ok(pr.pace<=5&&pr.pace>=3.5);
 const s=C.create();C.start(s);s.phase='playing';
 s.ball={x:0,y:1.2,z:0,vx:0,vy:0,vz:C.profiles[0].pace};
 const expected=(C.bounds.FRONT-C.bounds.R)/C.profiles[0].pace;
 assert.ok(expected>.79&&expected<.84,'first half of a center serve should provide ~.80 s to react');
});
console.log('CUADRANTE core PASS:',tests.length,'simulations');
