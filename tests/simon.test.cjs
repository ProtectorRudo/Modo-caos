'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'simon-core.js'),'utf8'),context);
const C=context.window.SimonCore;
assert(C&&C.make&&C.input,'Simón core no cargó');
const types=new Set();
for(const mode of ['clasica','mortal','panico']){
 const g=C.make({seed:0xDAEDBEEF,mode,maxRounds:12});
 assert(C.begin(g));
 for(let round=1;round<=g.maxRounds;round++){
  assert.equal(g.round,round);assert.equal(g.phase,'show');
  assert.equal(g.sequence.length,g.expected.length);
  if(g.trap)types.add(g.trap);
  assert(C.arm(g));
  for(const tile of Array.from(g.expected)){
   const result=C.input(g,tile,2000);
   assert.notEqual(result.type,'wrong',mode+' round '+round);
   assert.notEqual(result.type,'electric',mode+' electric test uses safe window');
  }
  if(g.phase==='won')assert(C.next(g));
 }
 assert.equal(g.phase,'finished');
 assert.equal(g.completed,g.maxRounds);
 assert(C.stats(g).score>0);
 console.log('PASS '+mode+' '+g.maxRounds+' rondas, '+g.score+' puntos');
}
const miss=C.make({mode:'mortal',seed:120});C.begin(miss);C.arm(miss);
let got=C.input(miss,(miss.expected[0]+1)%9,2000);
assert.equal(got.type,'wrong');assert.equal(miss.lives,2);assert(C.retry(miss));assert.equal(miss.phase,'show');
const timeout=C.make({mode:'clasica',seed:3});C.begin(timeout);C.arm(timeout);
for(let n=0;n<500&&timeout.phase==='act';n++)C.tick(timeout,.15);
assert.equal(timeout.phase,'finished');assert.equal(timeout.lives,0);
const seedA=C.make({seed:1234}),seedB=C.make({seed:1234});
for(let i=0;i<10;i++){
 if(i===0){C.begin(seedA);C.begin(seedB)}else{seedA.phase='won';seedB.phase='won';C.next(seedA);C.next(seedB)}
 assert.deepEqual([...seedA.sequence],[...seedB.sequence]);assert.equal(seedA.trap,seedB.trap);
}
for(let i=1;i<20000&&types.size<8;i++){
 const g=C.make({mode:'mortal',seed:i,maxRounds:12});C.begin(g);
 for(let round=1;round<12;round++){g.phase='won';C.next(g);if(g.trap)types.add(g.trap)}
}
assert.equal(types.size,8,'Faltan trampas');
assert.equal(C.positionFromPoint(0,0,.45),4);
assert.equal(C.positionFromPoint(-.45,-.45,.45),0);
assert.equal(C.positionFromPoint(.45,.45,.45),8);
assert(C.isCentered(.45,.45,8,.45));
assert(!C.isCentered(0,0,8,.45));
const html=fs.readFileSync(path.join(root,'simon.html'),'utf8');
for(const asset of ['engine.js','simon-core.js','simon-art.js','simon-runtime.js'])
 assert(html.includes('/'+asset+'?'),'Falta '+asset);
for(const id of ['lock','calPanel','picker','touchpad','startGame','recal','grid','result'])
 assert(html.includes('id="'+id+'"'),'Falta id '+id);
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="/simon.html"'));
assert(fs.readFileSync(path.join(root,'engine.js'),'utf8').includes('modoCaosXRCustomBoard'));
console.log('PASS 8 trampas, calibración matemática, timeout, derrota, error, semilla, interfaz e integración');
