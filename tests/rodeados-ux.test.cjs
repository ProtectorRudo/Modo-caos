'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),UX=require('../rodeados-ux.js');
const close=(v,w)=>assert.ok(Math.abs(v-w)<1e-6,`${v} !== ${w}`);
test('bearing detects 360-degree targets relative to phone forward',()=>{
 close(UX.bearing(0,-1,0,-1),0);
 close(UX.bearing(0,-1,1,0),Math.PI/2);
 close(Math.abs(UX.bearing(0,-1,0,1)),Math.PI);
 close(UX.bearing(0,-1,-1,0),-Math.PI/2);
});
test('radar renders enemies left right behind and near',()=>{
 const enemies=[
 {id:1,type:'basic',x:0,z:-2,hp:2,portal:0},
 {id:2,type:'joker',x:2,z:0,hp:3,portal:0},
 {id:3,type:'boss',x:0,z:1,hp:22,portal:0},
 {id:4,type:'fast',x:-2,z:0,hp:1,portal:0},
 {id:5,type:'basic',x:0,z:-1,hp:0,portal:0},
 {id:6,type:'basic',x:0,z:-1,hp:1,portal:.9}
 ];
 const r=UX.radar(enemies,{x:0,z:0},0,4);
 assert.equal(r.length,4);
 close(r.find(x=>x.id===1).y,-.5);
 close(r.find(x=>x.id===2).x,.5);
 close(r.find(x=>x.id===3).y,.25);
 close(r.find(x=>x.id===4).x,-.5);
 assert.equal(r[0].id,3);assert.equal(UX.shouldShowDanger(r),true);
});
test('rotate phone physically: north robot moves from top to left',()=>{
 const enemy=[{id:2,type:'basic',x:0,z:-2,hp:1,portal:0}];
 const r=UX.radar(enemy,{x:0,z:0},Math.PI/2,4);
 close(r[0].x,-.5);close(r[0].y,0);
});
test('wave and damage state transitions are only emitted in actual game',()=>{
 const prev={wave:1,lives:100,combo:3},g={phase:'playing',wave:2,lives:94,combo:5};
 assert.deepEqual(UX.statePulse(g,prev,'playing'),{wave:true,damaged:true,combo:true,finished:false});
 assert.equal(UX.statePulse(g,prev,'paused').wave,false);
});
