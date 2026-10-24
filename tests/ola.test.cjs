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
