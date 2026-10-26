'use strict';
/* Align note-timing visual with four receptors on real AR floor.
 * This is a unit/regression simulation, not a physical ARCore device test.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../ritmo-core.js');
require('../ritmo-catalog.js');
require('../ritmo-licensed.js');
require('../ritmo-despacito.js');
const core=globalThis.RitmoCore;
const stage=fs.readFileSync('ritmo-stage3d.js','utf8');
const art=fs.readFileSync('ritmo-art.js','utf8');
const html=fs.readFileSync('ritmo.html','utf8');
const numbers=(text,rx,label)=>{const m=text.match(rx);assert(m,'Missing '+label);return Number(m[1])};
const receiverZ=numbers(stage,/let z=(\.\d+),r=size\*\.39/, 'physical four-lane receptor z');
const noteZ=numbers(stage,/z=(\.\d+)-clamp\(dt\/lead/, '3D musical note at hit time');
const stageLineZ=numbers(stage,/box\(glow,0,\.088,(\.\d+),R-L\+\.19/, 'world-space scoring light line');
const svgNoteZ=numbers(art,/const z=(\.\d+)-clamp\(delta\/lead/, 'SVG backup note head');
assert(Math.abs(noteZ-receiverZ)<.011,'3D note must land in center of target');
assert(Math.abs(stageLineZ-receiverZ)<.011,'Scoring bar must match target center');
assert(Math.abs(svgNoteZ-receiverZ)<.011,'SVG backup note must match target center');
assert(art.includes('.644,1.99*size,.656'), 'SVG gate must remain narrow and centered');
assert(html.includes('ENERGÍA<strong id="energy">100%</strong>'));
for(const id of ['neon','fuego','solar','despacito_remix_justin']){
 const game=core.make(id,'normal',.25);
 assert.equal(game.energy,100,id+' should start 100% not nearly defeated');
 core.start(game);
 const first=game.notes[0],second=game.notes[1];
 core.setPosition(game,(first.lane+1)%4,first.at+.31);
 core.tick(game,first.at+.31);
 assert.equal(first.status,'FALLO');
 assert.equal(game.energy,93,'One beginner mistake should not remove 12% from 55%');
 core.setPosition(game,second.lane,second.at);
 core.tick(game,second.at);
 assert.notEqual(second.status,'FALLO','On-time color must score');
 assert(game.score>0, 'Standing on matching note must reward points');
 assert(game.energy>=95,'Hitting must recover some energy');
}
console.log('OK: 3D/SVG scoring gate/notes centered on receptors; fair 100% energy and first note scoring');
