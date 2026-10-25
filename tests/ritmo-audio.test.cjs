'use strict';
/* Ejecutar desde la raíz: node tests/ritmo-audio.test.cjs
 * Pruebas de WebAudio con señal sintética, no se distribuye música comercial. */
const assert=require('node:assert/strict');
global.window=globalThis;
require('../ritmo-core.js');
require('../ritmo-catalog.js');
let nodes=[],timers=[],scheduled=[],context=null;
function stub(kind){
 const n={kind,connect(){},disconnect(){},start(t=0){nodes.push({kind,t})},stop(){},
   frequency:{value:440,setValueAtTime(v,t){scheduled.push({kind,v,t})},exponentialRampToValueAtTime(){}},
   gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}};
 return n;
}
class FakeAudioContext{
 constructor(){context=this;this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination={}}
 createGain(){return stub('gain')}
 createOscillator(){return stub('synth')}
 createBiquadFilter(){return stub('filter')}
 createBufferSource(){return stub('local')}
 createBuffer(channels,len){return {getChannelData(){return new Float32Array(len)}}}
 async resume(){this.state='running'}
 async suspend(){this.state='suspended'}
 async decodeAudioData(){
  const bpm=107,length=82*8000,samples=new Float32Array(length);
  for(let t=.14;t<82;t+=60/bpm){
   const start=Math.round(t*8000);
   for(let i=0;i<160&&start+i<length;i++)samples[start+i]=Math.exp(-i/26);
  }
  return {duration:82,sampleRate:8000,getChannelData(){return samples}};
 }
}
global.AudioContext=FakeAudioContext;
const realInterval=global.setInterval,realClear=global.clearInterval;
global.setInterval=(fn)=>{timers.push(fn);return timers.length};
global.clearInterval=()=>{};
require('../ritmo-audio.js');
(async()=>{
 const audio=RitmoAudio.create();
 await audio.start('elise');
 assert(nodes.some(n=>n.kind==='synth'),'Melodía clásica inicia por síntesis');
 context.currentTime=3;
 timers[0]();
 assert(scheduled.some(s=>s.v>300),'Melodía programada en transport de audio');
 audio.stop();
 await assert.rejects(()=>audio.start('titi'),/archivo/i,'No se puede reproducir un hit sin archivo propio');
 const info=await audio.loadLocal({name:'titi.mp3',size:520000,type:'audio/mpeg',arrayBuffer:async()=>new ArrayBuffer(32)},'titi');
 assert(info.beatPhase>=0&&info.beatPhase<60/107,'Detecta fase de pulso');
 assert(info.rhythmAccents>=12,'Acentos y cuadrícula generados');
 const chart=RitmoCore.chart('titi','normal',.32);
 assert(chart.notes.length>25,'La pista tiene notas durante toda la ronda');
 assert(chart.notes.every(n=>RitmoCore.SONGS.titi.rhythmBeats.includes(n.beat)),'Notas caen sobre pulsos musicales');
 nodes=[];context.currentTime=0;
 await audio.start('titi');
 assert(nodes.some(n=>n.kind==='local'),'Reproducción del archivo local');
 assert(!nodes.some(n=>n.kind==='synth'),'No superpone otra banda sonora');
 await audio.pause();assert.equal(context.state,'suspended');
 await audio.resume();assert.equal(context.state,'running');
 audio.stop();
 console.log('OK: 3 temas clásicos sintetizados, audio personal, fase, acentos, pausa y pista alineada');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
 global.setInterval=realInterval;global.clearInterval=realClear;
});
