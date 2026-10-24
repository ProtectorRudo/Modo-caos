'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),P=require('../rodeados-progression.js');
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}}
test('daily mission deterministic per calendar date',()=>{
 assert.deepEqual(P.daily(new Date('2026-10-24T12:00:00')),P.daily(new Date('2026-10-24T15:00:00')));
});
test('persists a personal top five and stats without remote claims',()=>{
 const s=storage();let r;
 for(let k=1;k<=7;k++)r=P.finish({mode:'survival',score:k*100,kills:k,shots:5,hits:3,bestCombo:k,elapsed:k,lives:100,enemies:[]},s);
 assert.equal(r.progress.plays,7);assert.equal(r.ranking.length,5);assert.equal(r.ranking[0].score,700);
 assert.equal(r.progress.totalKills,28);
});
test('local achievements are awarded once',()=>{
 const s=storage();const g={mode:'survival',score:100,kills:22,shots:10,hits:9,bestCombo:10,elapsed:90,lives:99,enemies:[]};
 const a=P.finish(g,s);assert.ok(a.unlocked.length>=4);assert.equal(P.finish(g,s).unlocked.length,0);
});
test('boss achievement cannot be earned without actual boss spawn',()=>{
 const s=storage(),g={mode:'boss',kills:1,score:50,shots:1,hits:1,bestCombo:1,elapsed:10,lives:100,enemies:[]};
 let a=P.finish(g,s);assert.ok(!a.progress.achievements.includes('boss'));
 a=P.finish({...g,announcedBoss:true},s);assert.ok(a.progress.achievements.includes('boss'));
});
