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
console.log('TORRE CAOS: geometrías, RNG, progresión, colapsos y puntos OK');
