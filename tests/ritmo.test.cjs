'use strict';
/* Ejecutar: node tests/ritmo.test.cjs */
const assert=require('node:assert/strict');
require('../ritmo-core.js');
require('../ritmo-catalog.js');
const C=globalThis.RitmoCore;
assert(C,'RitmoCore no inicializado');
for(const name of Object.keys(C.SONGS))for(const difficulty of ['facil','normal','dificil','caos'])for(const width of [.22,.32,.40]){
 const first=C.chart(name,difficulty,width),second=C.chart(name,difficulty,width);
 assert.deepEqual(first.notes,second.notes,'Mapa reproducible');
 assert(first.duration>=60&&first.duration<=90,'Duración de concierto');
 assert(first.notes.length>25,'Sin suficientes notas');
 for(let i=0;i<first.notes.length;i++){
  const n=first.notes[i];
  assert(first.active.includes(n.lane),'Carril fuera de rango');
  if(i){const p=first.notes[i-1],available=(n.at-p.at)*.70;
   assert(Math.abs(n.lane-p.lane)*width+.12<=available+.000001,'Salto físicamente injusto');}
 }
 let g=C.make(name,difficulty,width);C.start(g);
 const n=g.notes[0];
 C.setPosition(g,n.lane,n.at-.05);C.tick(g,n.at);
 assert.equal(g.judged,1);assert.equal(g.miss,0,'Acierto sin tocar pantalla');
 assert.equal(g.combo,1,'Combo');
 g=C.make(name,difficulty,width);C.start(g);
 C.setPosition(g,n.lane===0?4:0,n.at);C.tick(g,n.at+.25);
 assert.equal(g.miss,1,'Fallo al estar en otro carril');
 assert.equal(g.combo,0);
 g=C.make(name,difficulty,width);C.start(g);
 g.paused=true;C.tick(g,5);assert.equal(g.elapsed,0,'Pausa bloquea el reloj');
 g.paused=false;C.tick(g,5);assert(g.elapsed>0);
 C.tick(g,g.duration+.5);assert.equal(g.state,'finished','Canción finaliza');
 const preserved=C.make(name,difficulty,width);C.start(preserved);C.tick(preserved,3);C.reset(preserved);
 assert.equal(preserved.elapsed,0);assert.equal(preserved.score,0);
}
const g=C.make('neon','normal',.30);const hold=g.notes.find(n=>n.type==='hold');
assert(hold,'Debe existir al menos una sostenida');
C.start(g);for(let i=0;i<g.notes.length&&g.notes[i].id<hold.id;i++){const n=g.notes[i];C.setPosition(g,n.lane,n.at);C.tick(g,n.at+.3)}
C.setPosition(g,hold.lane,hold.at);C.tick(g,hold.at);assert(g.holdActive,'La nota se mantiene');
C.tick(g,hold.at+hold.hold+.02);assert.equal(hold.status,'PERFECTO');

for(const path of ['correct','skip-motion']){
 const s=C.make('neon','caos',.32);C.start(s);
 const slide=s.notes.find(n=>n.type==='slide');assert(slide,'Faltan notas deslizantes');
 for(const n of s.notes.slice(0,slide.id)){C.setPosition(s,n.lane,n.at);C.tick(s,n.at)}
 const st=slide.at-slide.slideDuration;
 C.setPosition(s,path==='correct'?slide.fromLane:slide.lane,st);C.tick(s,st);
 C.setPosition(s,path==='correct'?(slide.fromLane+slide.lane)/2:slide.lane,st+slide.slideDuration*.5);C.tick(s,st+slide.slideDuration*.5);
 C.setPosition(s,slide.lane,slide.at);C.tick(s,slide.at);C.tick(s,slide.at+.16);
 assert.equal(slide.status,path==='correct'?'PERFECTO':'FALLO','Validación del deslizamiento');
}
assert(C.chart('neon','caos',.32).notes.some(n=>n.type==='caos'),'Notas CAOS');
console.log('OK: 108 mapas (9 canciones x 4 dificultades x 3 anchos), distancias, aciertos, fallos, sostenidas, slides, notas CAOS, pausa y fin');

