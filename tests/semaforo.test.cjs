'use strict';
/* node tests/semaforo.test.cjs — no dependencies, no browser, deterministic. */
const assert=require('node:assert/strict'),G=require('../semaforo-core.js');
const step=(g,seconds,controls=()=>({}))=>{
 const n=Math.ceil(seconds/.02);
 for(let i=0;i<n;i++){G.input(g,controls(g,i));G.tick(g,.02)}
};
const enter=seed=>{const g=G.make({seed});assert.equal(G.start(g),true);step(g,2.5);assert.equal(g.state,'playing');return g};
const until=(g,signal)=>{let n=0;while(g.signal!==signal&&n++<2000)step(g,.02);
 assert.equal(g.signal,signal,'la señal debe llegar');};
function test(){
 {
  const g=enter(1);assert.equal(g.signal,'green');
  G.input(g,{forward:1});step(g,1,()=>({forward:1}));
  assert.ok(g.players[0].progress>0,'verde permite avanzar');
 }
 {
  const g=enter(2);until(g,'amber');
  step(g,.45,()=>({forward:1,motion:1}));
  assert.equal(g.players[0].penalties,0,'amarillo no penaliza');
  until(g,'red');
  step(g,.40,()=>({forward:1,motion:1}));
  assert.equal(g.players[0].penalties,0,'gracia en rojo');
  step(g,.62,()=>({forward:1,motion:1}));
  assert.equal(g.players[0].penalties,1,'rojo penaliza tras ventana justa');
  assert.ok(g.players[0].progress>=0,'no se sale de la pista');
 }
 {
  const g=enter(3);until(g,'amber');
  const before=g.players[0].score;
  assert.ok(G.react(g,'perfect')>0,'premio por parar');
  assert.ok(g.players[0].score>before);
 }
 {
  const a=enter(333),b=enter(333);
  for(let i=0;i<3700;i++){
   const controls={forward:a.signal==='green'?1:0,lateral:(i%23<11)?.6:-.4};
   G.input(a,controls);G.input(b,controls);G.tick(a,.02);G.tick(b,.02);
  }
  assert.deepEqual(G.snapshot(a),G.snapshot(b),'replay idéntico con misma semilla');
 }
 let wins=0,finishes=0,elapsed=[];
 for(let seed=1;seed<=50;seed++){
  const g=enter(seed*1234);let count=0;
  while(g.state!=='finished'&&count++<5000){
   G.input(g,{forward:g.signal==='green'?1:0,motion:0});
   G.tick(g,.02);
  }
  assert.equal(g.state,'finished','la partida termina siempre');
  assert.ok(g.raceTime<=G.LIMIT+.1,'no supera el límite');
  assert.equal(g.result.ranking.length,4);
  for(const p of g.players)assert.ok(p.progress>=0&&p.progress<=100,'progreso acotado');
  if(g.result.winner==='0')wins++;
  if(g.players[0].finishedAt!==null)finishes++;
  elapsed.push(g.raceTime);
 }
 assert.ok(finishes>=30,'una persona atenta puede llegar con frecuencia: '+finishes);
 // Premios justos: una victoria no está garantizada.
 assert.ok(wins<50,'debe haber rivales competitivos');
 const summary={scenarios:55,seeds:50,arrivals:finishes,wins,
  minDuration:Math.min(...elapsed).toFixed(1),maxDuration:Math.max(...elapsed).toFixed(1)};
 return summary;
}
const result=test();console.log('SEMÁFORO TRAICIONERO · CORE OK',result);
