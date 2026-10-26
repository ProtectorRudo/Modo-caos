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

console.log('CUADRANTE core PASS:',tests.length,'simulations');
