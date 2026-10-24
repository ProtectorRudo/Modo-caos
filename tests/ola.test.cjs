'use strict';
const assert=require('node:assert/strict');
const G=require('../ola-core.js');
const g=G.make({seed:4821,tileMeters:.45});
assert.equal(G.N,6);assert.equal(g.duration,90);assert.equal(g.lives,3);assert.equal(g.stage,'ready');
assert.equal(G.start(g),true);
for(let i=0;i<60;i++)G.tick(g,.06);
assert.equal(g.stage,'playing');
const kinds=['frontal','trasera','lateral','doble','serpiente','corredor','falsa','caos'];
for(const kind of kinds){
 const a=G.pattern(g,kind);assert.ok(a.length>=3,kind);
 for(const mask of a){assert.equal(typeof mask,'bigint');
  const count=Array.from({length:36},(_,i)=>!!(mask&(1n<<BigInt(i)))).filter(Boolean).length;
  assert.ok(count<36,'No wave may block the entire board');
 }
}
while(g.waves===0)G.tick(g,.04);
const wave=g.active[0];
assert.ok(wave.start>g.elapsed+1,'Each wave must be announced');
assert.ok(wave.end>wave.start);
let row=0,col=0;
for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(G.has(wave.steps[0],r,c)){row=r;col=c;break}
G.setPosition(g,col+.5,row+.5);
g.elapsed=wave.start-1.02;
assert.equal(G.cells(g)[row*6+col],'yellow','warning before red');
g.elapsed=wave.start+.03;
assert.equal(G.cells(g)[row*6+col],'red','red moves onto warned tile');
const before=g.lives;
G.tick(g,.02);assert.equal(g.lives,before-1,'red removes one life');
for(let i=0;i<10;i++)G.tick(g,.02);
assert.equal(g.lives,before-1,'invulnerability prevents unfair double hit');
g.paused=true;const time=g.elapsed;G.tick(g,.07);
assert.equal(g.elapsed,time,'paused game never simulates collisions');
g.paused=false;
const infinite=G.make({mode:'infinito'});assert.equal(infinite.duration,Infinity);
const checks=G.make({seed:5});
for(let k=0;k<160;k++){
 checks.elapsed=k*.43;G.setPosition(checks,3.5,3.5);
 for(const name of kinds){
  const m=G.pattern(checks,name);
  for(const mask of m)assert.ok(mask>=0n&&mask<(1n<<36n));
 }
}
const win=G.make({seed:8});
G.start(win);for(let i=0;i<60;i++)G.tick(win,.06);
win.elapsed=89.98;win.nextAt=Infinity;G.setPosition(win,5.5,5.5);
G.tick(win,.05);assert.equal(win.stage,'finished');assert.equal(win.finishReason,'victoria');
const end=G.make({seed:9});G.start(end);for(let i=0;i<60;i++)G.tick(end,.06);
end.lives=1;end.active=[{id:1,name:'frontal',start:end.elapsed-1,step:2,end:end.elapsed+2,steps:[G.bit(3,3)],credited:false}];
G.setPosition(end,3.5,3.5);G.tick(end,.01);
assert.equal(end.stage,'finished');assert.equal(end.finishReason,'eliminado');
console.log('OLA ROJA: pruebas de 8 patrones, warnings, vidas, tracking pausa, modos y final PASS');

/* Fairness and replayability regression: dozens of deterministic runs, three room sizes.
   Static player intentionally does not dodge; immortality is only test instrumentation. */
for(const tileMeters of [.30,.45,.64])for(let seed=1;seed<=12;seed++){
 const q=G.make({seed,tileMeters});G.setPosition(q,3.5,3.5);G.start(q);
 q.lives=200;q.invuln=10000;
 const seen=new Map();
 for(let i=0;i<1500;i++){
  const before=q.waves,origin={...q.cell};
  G.tick(q,.07);
  if(q.waves!==before){
   const w=q.active.find(x=>x.id===q.waves);
   assert(w,'a planned wave must exist');
   assert(G.ensureRoute({...q,cell:origin},w.steps,w.start-(q.elapsed),w.step),
     'every generated wave has a reachable safe route: seed '+seed+' '+tileMeters+' '+w.name);
   assert(w.start-q.elapsed>=1.59,'warnings always precede red');
   if(seen.has(w.id-1)){const old=seen.get(w.id-1);
    assert(w.start>=old.end+.35,'red waves must never unfairly overlap');
   }
   seen.set(w.id,w);
  }
  if(q.stage==='finished')break;
 }
 assert.equal(q.stage,'finished','90 seconds must always end');
 assert(q.waves>=9,'90-second game needs varied encounters: '+q.waves);
}
for(let seed=1;seed<250;seed++){
 const q=G.make({seed});q.elapsed=23;G.spawn(q);
 const w=q.active[0];if(w.name!=='falsa')continue;
 const i=w.steps.findIndex((m,k)=>m===0n&&w.teases?.[k]);
 assert(i>=0,'false alerts must have a warning-only step');
 const mask=w.teases[i],cell=Array.from({length:36},(_,n)=>n).find(n=>mask&(1n<<BigInt(n)));
 assert(Number.isInteger(cell));
 assert.equal(G.cells(q,w.start+i*w.step-.55)[cell],'yellow','warning-only appears yellow');
 assert.equal(G.cells(q,w.start+i*w.step+.04)[cell],'safe','fake alert never becomes red');
 break;
}
console.log('OLA ROJA: 36 partidas simuladas, 3 escalas, rutas alcanzables, intensidad y falsas alarmas PASS');

/* 2026-10-24 · Revisión de tamaño/anticipación.
   El aviso aparece >=2.7s antes; radar muestra origen y siguientes posiciones
   reales sin confundirlas con peligro presente. */
for (const tile of [.3,.4,.55]) for(let seed=41;seed<51;seed++){
 const g=G.make({tileMeters:tile,seed});G.start(g);
 for(let i=0;i<60;i++)G.tick(g,.06);
 while(g.waves===0)G.tick(g,.04);
 const w=g.active[0];
 assert(w.start-g.elapsed>2.5,'early warning must allow walking: '+tile);
 const r=G.radar(g,3.9);
 assert(r.seconds>2.5&&r.seconds<3.9,'first red countdown known in advance');
 assert(r.direction&&r.direction.length>4,'each wave has visible incoming direction');
 assert(r.forecast.some(Boolean),'radar projects upcoming hazardous cells');
 assert(!r.state.includes('red'),'orange forecast is not red danger now');
 const highlighted=r.forecast.findIndex(Boolean);
 const yellowAt=G.cells(g,w.start-2.05);
 assert(yellowAt.some(v=>v==='yellow'),'physical floor warns >2 s before wave');
 assert(highlighted>=0);

 const index=r.forecast.findIndex(Boolean);
 assert.equal(typeof index,'number');
 G.setPosition(g,index%6+.5,Math.floor(index/6)+.5);
 g.elapsed=w.start+.03;
 const after=G.radar(g,3.9);
 assert(after.state.includes('red'),'red tiles still become dangerous on schedule');
}
console.log('OLA ROJA: 30 seeds, three tile sizes, advance warning, radar and side directions PASS');

/* V3 · cada BALDOSA permanece naranja 3 segundos, nunca solo durante
   la fracción de segundo de desplazamiento de la ola. */
assert.equal(G.WARNING_SECONDS,3);
for(const scale of [.30,.40,.60])for(let seed=21;seed<=50;seed++){
 const h=G.make({seed,tileMeters:scale});h.elapsed=0;G.setPosition(h,3.5,3.5);
 G.spawn(h);const w=h.active[0];
 const first=Array.from({length:36},(_,i)=>i).find(i=>!!(w.steps[0]&(1n<<BigInt(i))));
 assert(Number.isInteger(first),'first wave must contain danger');
 const impact=w.start;
 assert(impact-h.elapsed>=3.3,'telegraph can start before wave moves');
 assert.equal(G.cells(h,impact-3.12)[first],'safe','still safe >3s before red');
 for(const secs of [2.99,2.5,2.05,1.25,.2,.02])
  assert.equal(G.cells(h,impact-secs)[first],'yellow',
   '3-second orange warning for seed '+seed+', scale '+scale+', remaining '+secs);
 assert.equal(G.cells(h,impact+.02)[first],'red','red happens after full orange warning');
 const radar=G.radar(h,5);
 assert.equal(radar.eta.length,36,'all 36 cells have an independent countdown');
 assert(radar.eta[first]>3.2&&radar.eta[first]<4.0,'per-tile ETA includes warning');
 assert(radar.direction?.length>2,'offscreen hazard direction is available');
}
{
 const h=G.make({seed:412});h.elapsed=12;
 h.active=[{id:1,name:'frontal',direction:'⬇ DESDE ARRIBA',start:14,step:1,
  steps:[G.bit(3,3),G.bit(3,4),G.bit(4,4)],end:17,credited:false}];
 G.setPosition(h,3.5,3.5);
 const r=G.radar(h,5);
 assert.equal(r.playerEta,2,'player cell has an explicit danger ETA');
 assert.equal(r.eta[3*6+4],3,'second cell has a different ETA');
 assert.equal(r.eta[4*6+4],4,'third cell has an independent ETA');
 assert(r.forecast.filter(Boolean).length>=3,'full look-ahead rather than two cells');
 h.elapsed=14.1;
 assert.equal(G.radar(h).playerEta,0,'a currently red player cell announces immediate risk');
}
console.log('OLA ROJA V3: 90 seed/scale wavechecks, >=3s naranja y 36 cuentas regresivas PASS');
