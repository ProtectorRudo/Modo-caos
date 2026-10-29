'use strict';
/* node tests/ritmo-haptics-assets.test.cjs
 * Kenney CC0 source assets + exactly-one-short-vibration-per-successful-note.
 * Physical device vibration remains subject to Android/Chrome support/settings.
 */
const assert=require('node:assert/strict');
global.window=globalThis;
require('../ritmo-haptics.js');
const pulses=[];
const h=RitmoHaptics.create({vibrate(ms){pulses.push(ms);return true}});
assert.equal(RitmoHaptics.durationMs,18);
for(const id of [0,1,2,3,4])assert.equal(h.scored(id),true);
assert.deepEqual(pulses,[18,18,18,18,18],'one single 18ms buzz per hit');
assert.equal(h.scored(1),false,'sustained head + completion must not double buzz');
assert.equal(h.scored(-1),false);
assert.equal(h.scored(NaN),false);
h.setEnabled(false);assert.equal(h.scored(5),false);
h.setEnabled(true);assert.equal(h.scored(5),true);
assert.deepEqual(pulses,[18,18,18,18,18,18]);
h.reset();assert.equal(h.scored(0),true,'replay must vibrate again');
assert.deepEqual(pulses,[18,18,18,18,18,18,18]);
let srcs=[],drawCalls=0,colorCalls=0;
class FakeImage{
 constructor(){this.complete=true;this.onload=null;}
 set src(value){srcs.push(value);if(this.onload)this.onload();}
}
global.Image=FakeImage;
global.document={createElement(tag){
 assert.equal(tag,'canvas');
 return{width:0,height:0,getContext(){return {
  drawImage(){drawCalls++},clearRect(){},fillRect(){colorCalls++},
  set globalCompositeOperation(x){},set fillStyle(x){}
 }}};
}};
require('../ritmo-kenney-vfx.js');
RitmoKenneyVFX.load();
assert.equal(RitmoKenneyVFX.loaded(),2);
assert.equal(srcs.length,2);
for(const uri of srcs){
 assert(uri.startsWith('data:image/png;base64,iVBORw0KGgo'));
 assert(uri.length>10000,'embedded asset truncated');
}
assert(RitmoKenneyVFX.colored('spark','#4cff85'),'missing spark texture');
assert(RitmoKenneyVFX.colored('light','#ffd34c'),'missing light cookie');
const before=drawCalls;
assert(RitmoKenneyVFX.colored('spark','#4cff85'),'cache result missing');
assert.equal(drawCalls,before,'tinted sprite should be cached');
assert.equal(colorCalls,2);
const fs=require('node:fs');
const runtime=fs.readFileSync('ritmo-runtime.js','utf8');
const html=fs.readFileSync('ritmo.html','utf8');
assert(runtime.includes('haptics?.scored(ev.note)'));
assert(runtime.includes('haptics?.reset()'));
assert(!runtime.includes("navigator.vibrate?.([30,25,30])"),'no stacked combo buzzes');
assert(new RegExp('src="/ritmo-kenney-vfx\\.js\\?v=\\d+"').test(html));
assert(new RegExp('src="/ritmo-haptics\\.js\\?v=\\d+"').test(html));
assert(html.indexOf('ritmo-kenney-vfx.js')<html.indexOf('ritmo-fx.js'));
console.log('OK: Kenney original CC0 light/spark, self-hosted data sprites, tinted canvas cache, 18ms haptic once per score');
