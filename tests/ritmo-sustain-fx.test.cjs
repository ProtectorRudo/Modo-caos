'use strict';
// Regression suite for live four-lane rhythm hold gameplay, AR jitter and satisfaction feedback.
// Run: node tests/ritmo-sustain-fx.test.cjs
const assert=require('node:assert/strict');
require('../ritmo-core.js');
require('../ritmo-catalog.js');
require('../ritmo-licensed.js');
require('../ritmo-despacito.js');
const C=globalThis.RitmoCore;
let scenarios=0;
const eps=1e-6;
function prepare(id,level,width){
 const g=C.make(id,level,width);
 const note=g.notes.find(n=>n.type==='hold');
 assert(note,'Missing sustained notes: '+id+'/'+level);
 assert(note.hold>=.47,'Sustain must be long enough to be fun');
 C.start(g);g.cursor=note.id;g.elapsed=note.at-.3;
 C.setPosition(g,note.lane,note.at-.15);C.tick(g,note.at-.15);
 assert(g.holdActive,'Standing still over lane must begin sustain, no press required');
 assert(g.events.some(e=>e.type==='hold_start'));
 return {g,note};
}
for(const id of Object.keys(C.SONGS))for(const level of ['facil','normal','dificil','caos'])for(const width of [.2,.25,.32]){
 const {g,note}=prepare(id,level,width);
 // Test crossing the nominal .36-second TAP deadline while still sustaining:
 // it MUST NOT mark a hold as missed; this was the reproducible original bug.
 C.setPosition(g,note.lane,note.at+.38);
 C.tick(g,note.at+.38);
 assert.equal(note.status,'pending','Expired as short-tap while sustain was active');
 for(let i=0;i<14;i++){
  const time=note.at+.39+(note.hold+.05-.39)*i/13;
  // Tracking can report the opposite adjacent lane for a frame,
  // while the smoothed physical offset is still almost on this lane.
  C.setPosition(g,note.lane+(i%2?.53:-.53),time);
  C.tick(g,time);
 }
 assert.equal(note.status,'PERFECTO','Phone holding color must complete on '+id+'/'+level);
 assert(g.events.some(e=>e.type==='hold_complete'),'No completion cue');
 const judgement=g.events.find(e=>e.type==='judgement'&&e.note===note.id);
 assert(judgement?.points>0,'No points rewarded for hold');
 const complete=g.events.find(e=>e.type==='hold_complete');
 assert.equal(complete.points,judgement.points);
 scenarios++;
}
// Real exit should be penalized, but a brief crossing is fair and recoverable.
{
 const {g,note}=prepare('despacito_remix_justin','normal',.25);
 const wrong=note.lane<=1?note.lane+1.1:note.lane-1.1;
 C.setPosition(g,wrong,note.at+.10);C.tick(g,note.at+.10);
 C.tick(g,note.at+.20);
 C.setPosition(g,note.lane,note.at+.21);C.tick(g,note.at+.21);
 C.tick(g,note.at+note.hold+.03);
 assert.equal(note.status,'PERFECTO','Brief track jitter should be recoverable');
}
{
 const {g,note}=prepare('neon','normal',.25);
 const wrong=note.lane<=1?note.lane+1.1:note.lane-1.1;
 C.setPosition(g,wrong,note.at+.09);C.tick(g,note.at+.09);
 C.tick(g,note.at+.35);
 assert.equal(note.status,'FALLO','Leaving color >240 ms must still fail');
 assert(g.events.some(e=>e.type==='hold_break'));
}
// Starting before the hit moment has to be accepted; no additional button press.
{
 const {g,note}=prepare('neon','normal',.25);
 C.setPosition(g,note.lane,note.at+.11);C.tick(g,note.at+.11);
 C.tick(g,note.at+note.hold+.04);
 assert.equal(note.status,'PERFECTO');
}
console.log('OK: '+scenarios+' cross-song sustained notes, early stays, jitter, actual exits, 4 lanes and points/FX events');
