'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(dir,f),'utf8');
function ctx(){
 const w={};for(const f of ['ritmo-core.js','ritmo-catalog.js','ritmo-licensed.js','ritmo-despacito.js','ritmo-stage-showtime.js'])vm.runInNewContext(read(f),{window:w}, {timeout:2500});
 return w;
}
test('84 Despacito cues belong to existing recording and all are bounded corrections',()=>{
 const doc=JSON.parse(read('docs/ritmo-despacito-remix-map.json'));
 const w=ctx(),times=w.RitmoCore.SONGS.despacito_remix_justin.noteTimes;
 assert.equal(times.length,84);assert.equal(doc.previousCueTimes.length,84);
 assert.deepEqual(Array.from(times),doc.noteTimes);
 for(let i=0;i<times.length;i++){
  assert.ok(Math.abs(times[i]-doc.previousCueTimes[i])<=.076,'cue correction bounded');
  if(i)assert.ok(times[i]-times[i-1]>.50,'avoid overlapping hits');
 }
});
test('recording-driven shader and LED pulse peaks on actual cues',()=>{
 const w=ctx(),pulse=w.RitmoStageShowtime.beatPulse;
 const song=w.RitmoCore.SONGS.despacito_remix_justin;
 assert.ok(pulse({state:'playing',elapsed:4.36,song})>.99);
 assert.ok(pulse({state:'playing',elapsed:4.46,song})<.29);
 assert.ok(pulse({state:'playing',elapsed:5.68,song})>.99);
 assert.ok(pulse({state:'playing',elapsed:5.1,song})<.02);
 const stage=read('ritmo-stage-showtime.js');
 assert.ok(stage.includes('gl.uniform1f(gpu.beat,beatPulse(game,t*.001))'));
 assert.ok(stage.includes('const beat=beatPulse(game,time)'));
 assert.ok(!stage.includes('(game?.bpm||106)'));
});
test('WebAudio output-latency estimation makes screen and score follow audible speaker time',()=>{
 const core=ctx();
 class MockAudio {
  constructor(){this.currentTime=1.2;this.baseLatency=.043;this.outputLatency=.062;this.destination={};this.state='running';}
  createGain(){return {gain:{value:0},connect(){}}}
 }
 const w={RitmoCore:core.RitmoCore,AudioContext:MockAudio};
 vm.runInNewContext(read('ritmo-audio.js'),{window:w}, {timeout:2500});
 const audio=w.RitmoAudio.create();audio.init();
 assert.ok(Math.abs(audio.now()-1.2)<1e-6);
 assert.ok(Math.abs(audio.outputDelay()-.105)<1e-6);
 assert.ok(Math.abs(audio.audibleNow()-1.095)<1e-6);
 const runtime=read('ritmo-runtime.js');
 assert.equal((runtime.match(/audio\.audibleNow\?\.\(\)\?\?audio\.now\(\)/g)||[]).length,2);
});
test('licensed audio note map remains deterministic and reachable across all widths',()=>{
 const w=ctx(),C=w.RitmoCore;
 for(const diff of ['facil','normal','dificil','caos'])for(const size of [.20,.25,.32]){
  const map=C.chart('despacito_remix_justin',diff,size);
  assert.ok(map.notes.length>=30);
  const cues=C.SONGS.despacito_remix_justin.noteTimes;
  for(const n of map.notes)assert.ok(cues.some(at=>Math.abs(at-n.at)<1e-6));
  for(let i=1;i<map.notes.length;i++){
   const prev=map.notes[i-1],n=map.notes[i];
   if(diff==='normal'||diff==='facil'||diff==='dificil')
    assert.ok(Math.abs(n.lane-prev.lane)<=1,'audible song should request adjacent lane only');
   assert.ok(Math.abs(n.lane-prev.lane)*size+.12<=(n.at-prev.at)*.70+.000001,'impossible jump');
  }
 }
});
