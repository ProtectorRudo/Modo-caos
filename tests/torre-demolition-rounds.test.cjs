const assert=require('node:assert/strict');
const D=require('../torre-demolition.js');
const G=require('../torre-core.js');
assert.equal(D.FIGURES.length,40,'40 authored structures');
assert.equal(D.ROUNDS,10,'ten consecutive rounds');
assert.equal(D.ROUND_SECONDS,42);
const known=new Set([...G.SHAPES,...D.DEMOLITION_SHAPES].map(s=>s.id));
const signatures=new Set(D.FIGURES.map(f=>f.blocks.map(b=>b.shape+'@'+b.x+','+b.y).join('|')));
assert.equal(signatures.size,40,'40 geometrically unique authored structures');
assert.equal(D.DEMOLITION_SHAPES.length,11,'eleven physical supports, beams and split blocks');
const families=new Set(D.FIGURES.map(f=>f.family));
assert.equal(families.size,10,'ten visibly different architectural families');
for(const [i,f] of D.FIGURES.entries()){
 assert.equal(f.id,i);
 assert.equal(f.tier,Math.floor(i/10)+1);
 assert.ok(f.blocks.length>=16&&f.blocks.length<=29,'dense 3-move puzzle rather than tiny 4-8 cube silhouette');
 assert.ok(f.blocks.every(b=>known.has(b.shape)&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&b.angle===0));
 assert.ok(f.blocks.some(b=>['viga','techo','plano','gran_viga'].includes(b.shape)),'load-bearing bridge appears');
 assert.ok(f.blocks.some(b=>['pil','soporte','medio_pilar','medio_soporte','media_piedra'].includes(b.shape)),'multiple removable structural supports appear');
 assert.ok(f.blocks.some(b=>b.y>.72),'there is an overhead section');
 assert.ok(f.blocks.every(b=>Math.abs(b.x)<=.85),'mobile-friendly footprint');
 assert.ok(f.blocks.filter(b=>b.shape==='media_piedra'&&b.y<.55).length>=8,'four independent 2-brick supports create multiple options');
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
console.log('Torre demolition campaign: 40 authored physically supported architectures, 10 varied rounds, difficulty and chain points PASS');
