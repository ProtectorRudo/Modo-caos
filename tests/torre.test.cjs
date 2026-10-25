const assert=require('node:assert/strict');
const G=require('../torre-core.js');
assert.equal(G.SHAPES.length,14);
assert.equal(G.select(0,()=>.9).id,'cubo');
assert.equal(G.select(1,()=>.9).id,'ancho');
assert.equal(G.select(2,()=>.9).id,'triangulo');
for(const s of G.SHAPES){assert.ok(s.parts.length>0);for(const p of s.parts){assert.ok(p.length>=3);assert.ok(G.polygonArea(p)>.01, s.id);}}
const a=G.rng(123),b=G.rng(123);for(let i=0;i<50;i++)assert.equal(a(),b());
const rotated=G.bounds(G.SHAPES[1],Math.PI/2); assert.ok(rotated.maxY-rotated.minY>rotated.maxX-rotated.minX);
assert.equal(G.score(.736),74);
assert.equal(G.collapsed([{id:1,x:0,y:.6,top:1}],0,1),false);
assert.equal(G.collapsed([{id:1,x:0,y:-.5,top:0}],0,1),true);
assert.equal(G.collapsed([{id:1,x:0,y:.4,top:.55},{id:2,x:0,y:.4,top:.56}],1.4,2),true);
// Piece-kit gameplay regression: four choices are visible at once, deterministic,
 // and each pack changes the shape set without imposing a random next-piece order.
const kitA=G.makePack(0,G.rng(1));
assert.equal(kitA.length,4);
assert.deepEqual(kitA.map(p=>p.id),['cubo','ancho','triangulo','trapecio']);
const kitB=G.makePack(1,G.rng(1));
assert.deepEqual(kitB.map(p=>p.id),['cubo','alto','ele','fino']);
for(let n=0;n<100;n++){
 const pack=G.makePack(n,G.rng(9001));
 assert.equal(pack.length,4);
 assert.equal(new Set(pack.map(x=>x.id)).size,4);
}
assert.ok(Math.abs(G.angleDelta(Math.PI*179/180,-Math.PI*179/180)-2*Math.PI/180)<.00001);
assert.ok(Math.abs(G.angleDelta(-Math.PI*179/180,Math.PI*179/180)+2*Math.PI/180)<.00001);

// Collapse regression: screenshot shows four separate solids resting on floor,
// which must be game over even when one upright column preserves some height.
const pile=[
 {id:1,x:-.51,y:.31,minY:.119,top:.50,angle:0},
 {id:2,x:.07,y:.33,minY:.118,top:.70,angle:.12},
 {id:3,x:.47,y:.29,minY:.120,top:.52,angle:1.43},
 {id:4,x:.83,y:.25,minY:.116,top:.45,angle:-.8}
];
assert.equal(G.diagnoseCollapse(pile,.64,4).reason,'piezas_desparramadas');
assert.equal(G.collapsed(pile,.64,4),true);
// A lean that is still balanced and raised must not lose.
const stable=[
 {id:1,x:-.03,y:.32,minY:.117,top:.53,angle:.10},
 {id:2,x:.02,y:.72,minY:.53,top:.95,angle:.13},
 {id:3,x:.05,y:1.12,minY:.94,top:1.34,angle:-.24},
 {id:4,x:.07,y:1.52,minY:1.35,top:1.75,angle:.20}
];
assert.equal(G.diagnoseCollapse(stable,1.35,4).failed,false);
assert.equal(G.diagnoseCollapse(stable.map(v=>({...v,angle:v.angle+.12})),1.35,4,stable).failed,false);
// After a block knocks its support loose, detectable relative to PREVIOUS
// stable poses, not merely current maximum height.
const shifted=stable.map(v=>({...v}));
shifted[0].x+=.53;shifted[0].angle+=1.08;
shifted[1].x+=.14;shifted[1].minY=.13;
assert.equal(G.diagnoseCollapse(shifted,1.35,4,stable).failed,true);
// One or two independent foundation blocks are allowed before an actual fall.
assert.equal(G.diagnoseCollapse(pile.slice(0,2),.42,2).failed,false);
// An older piece falling off the platform must count, not just the last one.
assert.equal(G.diagnoseCollapse([{id:1,x:1.52,y:0,minY:.12,top:.22},{id:2,x:0,y:.32,minY:.118,top:.55}],.55,2).reason,'pieza_fuera');
// Height loss over .2m with a prior 80cm tower is fatal.
assert.equal(G.diagnoseCollapse([{id:1,x:0,y:.27,minY:.118,top:.52},{id:2,x:.25,y:.22,minY:.117,top:.4}],.83,2).reason,'altura_perdida');
console.log('TORRE CAOS: geometrías, RNG, progresión, colapsos y puntos OK');
