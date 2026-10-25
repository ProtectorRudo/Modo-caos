const assert=require('node:assert/strict');
const D=require('../torre-demolition.js');
const G=require('../torre-core.js');
assert.equal(D.FIGURES.length,40,'40 authored structures');
assert.equal(D.ROUNDS,10,'ten consecutive rounds');
assert.equal(D.ROUND_SECONDS,32);
assert.equal(new Set(D.FIGURES.map(f=>f.heights.join('-'))).size,40,'40 distinct silhouettes');
for(const [i,f] of D.FIGURES.entries()){
 assert.equal(f.id,i);
 assert.equal(f.tier,Math.floor(i/10)+1);
 assert.ok(f.blocks.length>=4&&f.blocks.length<=16);
 assert.equal(f.blocks.length,f.heights.reduce((a,b)=>a+b,0));
 assert.ok(f.blocks.every(b=>b.shape==='cubo'&&b.x<=1.1&&b.x>=-1.1));
 const groups=new Map();
 for(const b of f.blocks){if(!groups.has(b.x))groups.set(b.x,[]);groups.get(b.x).push(b.y)}
 for(const heights of groups.values()){const levels=heights.sort((a,b)=>a-b);assert.ok(Math.abs(levels[0]-.307)<1e-9);for(let k=1;k<levels.length;k++)assert.ok(Math.abs(levels[k]-levels[k-1]-.384)<1e-8)}
}
function seeded(seed){return G.rng(seed)}
let variedFirst=new Set();
for(let i=1;i<=220;i++){
 const deck=D.plan(seeded(i));
 assert.equal(deck.length,D.ROUNDS);
 assert.equal(new Set(deck.map(f=>f.id)).size,D.ROUNDS);
 assert.deepEqual(deck.map(f=>f.tier),[1,1,2,2,2,3,3,3,4,4]);
 variedFirst.add(deck[0].id);
}
assert.ok(variedFirst.size>=6,'round one must rotate between silhouettes');
assert.equal(D.roundPoints(0,3),60,'every extraction earns points');
assert.equal(D.roundPoints(2,3),310,'chain combo rewarded');
assert.equal(D.roundPoints(4,1),570);
assert.equal(D.timeBonus(13.1,3),28);
assert.equal(D.timeBonus(13.1,2),0,'no free time bonus unless all three moves');
console.log('Torre demolition campaign: 40 stable geometry profiles, 10 varied rounds, difficulty and chain points PASS');
