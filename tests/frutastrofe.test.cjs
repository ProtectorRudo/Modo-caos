'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../frutastrofe-core.js');
const sim=(g,{seconds=90,fireEvery=11}={})=>{
 g.begin();for(let i=0;i<seconds*60&&g.state==='playing';i++){
  g.update(1/60);
  if(i%fireEvery===0){const o=g.objects.find(x=>!['bomb','rotten'].includes(x.kind));if(o)g.shoot(o.id)}
 }
 return g;
};
const a=C.create({seed:1234}),b=C.create({seed:1234});a.begin();b.begin();
for(let i=0;i<100;i++){a.update(.05);b.update(.05)}
assert.deepEqual(a.objects,b.objects,'same seed produces same wave');
assert.equal(a.duration,b.duration);
const bad=C.create({seed:77});bad.begin();const bomb=bad.spawn('bomb');bad.score=200;
assert.equal(bad.shoot(bomb.id).trap,true);assert.equal(bad.errors,1);assert.equal(bad.score,115);
assert.equal(bad.shoot(bomb.id).ok,false,'double hit never awards points');
const combo=C.create({seed:99});combo.begin();
for(let i=0;i<3;i++){const o=combo.spawn('apple');combo.shoot(o.id)}
assert.equal(combo.chains,1,'three equal fruit activate chain');assert.ok(combo.score>=110);
const ice=combo.spawn('ice');combo.shoot(ice.id);assert.ok(combo.slowUntil>combo.elapsed);
const rainbow=combo.spawn('rainbow');combo.shoot(rainbow.id);assert.ok(combo.events.some(e=>e.type==='rainbow'));
const lvl3=sim(C.create({level:3,seed:321}),{fireEvery:12});
assert.equal(lvl3.goalsMet,true,'three chain level attainable');assert.ok(lvl3.chains>=3);
const boss=C.create({level:10,seed:7});boss.begin();const giant=boss.objects.find(x=>x.kind==='boss');
assert.ok(giant);for(let i=0;i<12;i++)boss.shoot(giant.id);
assert.equal(boss.state,'playing','boss defeat must not end timed round');
for(let i=0;i<1250&&boss.state==='playing';i++)boss.update(.05);
assert.equal(boss.state,'finished');assert.equal(boss.goalsMet,true);assert.equal(boss.stars,3);
const arcade=sim(C.create({mode:'arcade',seed:42}),{fireEvery:100000});
assert.equal(arcade.state,'finished');assert.ok(Math.abs(arcade.elapsed-60)<.09);
const cleaned=C.create({level:5,seed:41});cleaned.begin();cleaned.shoot(cleaned.spawn('bomb').id);cleaned.shoot(cleaned.spawn('bomb').id);assert.equal(cleaned.state,'playing','trap should penalize, not end round');
for(let i=0;i<1250&&cleaned.state==='playing';i++)cleaned.update(.05);
assert.equal(cleaned.state,'finished');assert.equal(cleaned.goalsMet,false);
for(let l=1;l<=10;l++){const g=sim(C.create({level:l,seed:123}),{fireEvery:10});assert.equal(g.state,'finished','level '+l+' terminates');assert.ok(Number.isFinite(g.score)&&g.score>=0)}
const files=['frutastrofe.html','frutastrofe-core.js','frutastrofe-art.js','frutastrofe-runtime.js','index.html'];
for(const f of files)assert.ok(fs.existsSync(path.join(__dirname,'..',f)),f+' exists');
const html=fs.readFileSync(path.join(__dirname,'..','frutastrofe.html'),'utf8');
for(const f of files.slice(1,4))assert.ok(html.includes(f),'HTML includes '+f);
assert.ok(fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').includes('/frutastrofe.html'));
console.log('FRUTÁSTROFE TESTS OK: deterministic waves, fairness, chains, traps, boss, arcade and integration');