'use strict';
/* node tests/ritmo-despacito.test.cjs
 * Checks the 84 cues extracted from the user-uploaded remix sample, 55s–135s.
 * MP3 is not in Git and this test never assumes CDN upload completed.
 */
const assert=require('node:assert/strict');
const map=require('../docs/ritmo-despacito-remix-map.json');
require('../ritmo-core.js');
require('../ritmo-catalog.js');
require('../ritmo-licensed.js');
const C=globalThis.RitmoCore;
assert.equal(map.id,'despacito_remix_justin');
assert.equal(map.sourceClip.startSeconds,55);
assert.equal(map.sourceClip.durationSeconds,80);
assert.equal(map.noteTimes.length,84);
assert.equal(map.audioDistributionStatus.startsWith('not-hosted'),true);
for(let i=1;i<map.noteTimes.length;i++)assert(map.noteTimes[i]-map.noteTimes[i-1]>.5,'Overlapping real audio beats');
const mockLegalOnlyForTest={masterLicenseId:'TEST-DUMMY',compositionSyncLicenseId:'TEST-DUMMY',
 approvedForInteractiveGame:true,approvedForWebDistribution:true,validUntil:'2099-01-01',territories:['QA ONLY']};
RitmoLicensed.register({id:map.id,title:map.title,bpm:map.bpm,
 duration:map.sourceClip.durationSeconds,audioUrl:'/media/ritmo/despacito-remix-80s.mp3',
 cueSeconds:map.noteTimes,rights:mockLegalOnlyForTest});
for(const width of [.20,.25,.32])for(const difficulty of ['facil','normal','dificil','caos']){
 const chart=C.chart(map.id,difficulty,width);
 assert(chart.notes.length>30);
 assert.equal(chart.duration,80);
 for(let i=0;i<chart.notes.length;i++){
  const n=chart.notes[i];
  assert(n.lane>=0&&n.lane<4,'Fifth lane');
  assert(map.noteTimes.some(c=>Math.abs(n.at-c)<.0005),'Nonmatching timestamp');
  if(i){
   const p=chart.notes[i-1];
   assert(Math.abs(n.lane-p.lane)*width+.12<=(n.at-p.at)*.70+.000001,'Unfair physical transition');
  }
 }
}
console.log('OK: 84 verified Despacito remix timestamps, 4 lanes, 12 difficulty/width maps, 80-second round');
