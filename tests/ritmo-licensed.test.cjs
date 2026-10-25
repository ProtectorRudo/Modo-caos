'use strict';
/* node tests/ritmo-licensed.test.cjs
 * La pista inventada QA SOLO existe durante esta prueba. NO otorga ningún
 * derecho a distribuir canciones comerciales reales.
 */
const assert=require('node:assert/strict');
global.window=globalThis;
require('../ritmo-core.js');
require('../ritmo-catalog.js');
require('../ritmo-licensed.js');
require('../ritmo-audio.js');
assert.equal(RitmoLicensed.available().length,0,'No debe activarse ningún hit sin licencia');
const cues=Array.from({length:90},(_,i)=>+(2+i*.67).toFixed(3));
const entry={id:'qa_master_demo',title:'Grabación de prueba sintética',bpm:90,duration:70,
 audioUrl:'/media/ritmo/qa_master_demo.mp3',cueSeconds:cues,
 rights:{masterLicenseId:'QA-TEST-NO-LICENSE',compositionSyncLicenseId:'QA-TEST-NO-LICENSE',
 approvedForInteractiveGame:true,approvedForWebDistribution:true,territories:['QA ONLY'],validUntil:'2099-01-01'}};
assert.throws(()=>RitmoLicensed.register({...entry,id:'qa_missing_rights',rights:{}}),/Licencia/);
assert.throws(()=>RitmoLicensed.register({...entry,id:'qa_wrong_host',audioUrl:'https://spotify.com/track.mp3'}),/ruta propia/);
assert.throws(()=>RitmoLicensed.register({...entry,id:'qa_bad_cues',cueSeconds:[2,3]}),/marcadas/);
const licensed=RitmoLicensed.register(entry);
assert(licensed.licensedRecording);
assert.equal(RitmoLicensed.available().length,1);
for(const level of ['facil','normal','dificil','caos']){
 const g=RitmoCore.make('qa_master_demo',level,.25);
 assert(g.notes.length>20,'Mapa vacío');
 for(const n of g.notes){
  assert(cues.some(t=>Math.abs(t-n.at)<.001),'Nota no coincide con timestamp');
  assert(n.lane>=0&&n.lane<4,'Quinto carril');
 }
}
const scheduled=[],sources=[];
function nodetype(type){const n={kind:type,connect(){},disconnect(){},start(t){scheduled.push({type,t})},stop(){},
 frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
 gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}};sources.push(n);return n}
class FakeAudioContext {
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={}}
 createGain(){return nodetype('gain')}
 createBufferSource(){return nodetype('recording')}
 createOscillator(){return nodetype('oscillator')}
 createBiquadFilter(){return nodetype('filter')}
 createBuffer(n,length){return{getChannelData(){return new Float32Array(length)}}}
 async decodeAudioData(){return{duration:72}}
 async resume(){this.state='running'}
 async suspend(){this.state='suspended'}
}
global.AudioContext=FakeAudioContext;
let fetches=0;
global.fetch=async path=>{fetches++;assert.equal(path,'/media/ritmo/qa_master_demo.mp3');return{ok:true,arrayBuffer:async()=>new ArrayBuffer(48)}};
(async()=>{
 const a=RitmoAudio.create();
 await a.preload('qa_master_demo');
 await a.preload('qa_master_demo');
 assert.equal(fetches,1,'Una sola carga en caché');
 await a.start('qa_master_demo');
 assert(scheduled.some(e=>e.type==='recording'),'No empezó el master');
 assert(!scheduled.some(e=>e.type==='oscillator'),'No debe mezclar música sintetizada con master');
 assert.equal(fetches,1);
 assert.equal(a.now(),0,'Reloj arranca en cero antes del playback');
 a.stop();
 console.log('OK: masters sin derechos bloqueados, 4 carriles, timestamps precisos, caché y reloj Web Audio');
})().catch(err=>{console.error(err);process.exitCode=1});
