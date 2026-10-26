'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../ritmo-tracking.js');
const C=globalThis.RitmoTracking;
const ramp=(tracker,start,end,from,to,step=16)=>{
 let result=null;
 for(let t=start;t<=end;t+=step){
  const x=from+(to-from)*(t-start)/(end-start);
  result=tracker.update(x,t,step/1000);
 }
 return result;
};
test('still phone under realistic 2-6cm tracking jitter stays green',()=>{
 const t=C.create(0,0,.25);
 let state=t.snapshot();
 for(let i=0;i<320;i++){
  const value=.027*Math.sin(i*1.3)+.014*Math.sin(i*.42);
  state=t.update(value,1000+i*16,.016);
  assert.equal(state.lane,0,'false jump at sample '+i);
 }
 assert.equal(state.transitions,0);
});
test('single-frame 60cm tracking teleport is discarded then anchored if persistent',()=>{
 const t=C.create(0,0,.25);
 ramp(t,0,200,0,0);
 let s=t.update(.62,216,.016);assert.equal(s.lane,0);
 s=t.update(0,232,.016);assert.equal(s.lane,0);
 for(const time of [248,264,280,296,312,328,344,360,376])s=t.update(.62,time,.016);
 assert.equal(s.lane,0);
 assert.equal(s.relocalized,1);
});
test('deliberate lateral walk advances to red and yellow without skipping',()=>{
 const t=C.create(0,0,.25);
 let state=ramp(t,0,680,0,.54);
 assert.ok(state.lane>=1,'real walk should register');
 state=ramp(t,700,1350,.54,.54);
 assert.equal(state.lane,2);
 assert.ok(state.transitions<=2);
});
test('lane-border swaying does not ping-pong on small oscillations',()=>{
 const t=C.create(1,0,.25);
 let s;
 for(let i=0;i<180;i++){
  const x=.116 + .025*Math.sin(i*.81);
  s=t.update(x,1000+i*16,.016);
 }
 assert.equal(s.lane,1);assert.equal(s.transitions,0);
});
test('tracking recovery never invents new starting color',()=>{
 const t=C.create(2,0,.25);
 for(let i=0;i<30;i++)t.update(.005*Math.sin(i),i*16,.016);
 let s=t.recover(.93,1200);
 assert.equal(s.lane,2);
 for(let i=0;i<50;i++)s=t.update(.93+Math.sin(i)*.006,1200+i*16,.016);
 assert.equal(s.lane,2);
});
test('calibrating different lanes preserves selected position',()=>{
 for(let lane=0;lane<4;lane++){
  const t=C.create(lane,.45,.27);
  let s;
  for(let i=0;i<30;i++)s=t.update(.45,200+i*16,.016);
  assert.equal(s.lane,lane);
  assert.ok(Math.abs(s.offset-lane)<.01);
 }
});
