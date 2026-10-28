'use strict';
const assert=require('node:assert/strict'),C=require('../frutastrofe-core.js');
for(let level=1;level<=10;level++){
 const g=C.create({level,seed:776+level});g.begin();
 assert.equal(g.duration,60,'all campaign rounds use the full 60-second timer');
 assert.equal(g.phase,1);
 // A high score or completed objective must NEVER interrupt the clock.
 g.score=99999;g.chains=20;g.citrus=100;g.goalsMet=true;
 for(let i=0;i<1198;i++){g.update(.05);if(g.state==='finished')throw Error('round finished early at '+g.elapsed+'s level '+level)}
 assert.equal(g.phase,6,'difficulty ramps through six stages');
 assert(g.events.filter(x=>x.type==='phase').length===5,'one visible stage alert every ten seconds');
 while(g.state==='playing')g.update(.05);
 assert.equal(g.elapsed,60);assert.equal(g.state,'finished');
 const finishes=g.events.filter(x=>x.type==='finish');assert.equal(finishes.length,1);
}
const timed=C.create({level:1,seed:321});timed.begin();
timed.score=500;timed.goalsMet=true;timed.update(.05);
assert.equal(timed.state,'playing','reaching score does not abruptly finish a round');
const clean=C.create({level:5,seed:321});clean.begin();clean.score=9999;
clean.shoot(clean.spawn('bomb').id);clean.shoot(clean.spawn('rotten').id);
assert.equal(clean.state,'playing','two penalty hits cannot end round early');
for(let i=0;i<1200&&clean.state==='playing';i++)clean.update(.05);
assert.equal(clean.goalsMet,false,'clean round judged fairly at time expiry');
console.log('PASS timed rounds 60 seconds, six increasing difficulty phases, late penalties and single finalization');
