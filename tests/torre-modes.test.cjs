const assert=require('node:assert/strict');
const M=require('../torre-modes.js');
assert.deepEqual(M.MODE_ORDER,['infinite','balance','heavy','copy','five','demolition']);
for(const id of M.MODE_ORDER)assert.equal(M.get(id).id,id);
assert.equal(M.boardHalfWidth('balance',0),1.05);
assert.ok(M.boardHalfWidth('balance',4)<M.boardHalfWidth('balance',2));
assert.ok(M.boardHalfWidth('balance',100)>=.42);
assert.equal(M.boardHalfWidth('infinite',100),1.25);
const target=[
 {id:1,shape:'cubo',x:-.21,y:.307,angle:0},
 {id:2,shape:'cubo',x:.21,y:.307,angle:.08},
 {id:3,shape:'ancho',x:0,y:.607,angle:.07}
];
assert.deepEqual(M.matchTarget(target),{won:true,matched:3,total:3});
assert.equal(M.matchTarget(target.slice(0,2)).won,false);
assert.equal(M.matchTarget([...target.slice(0,2),{...target[2],x:.46}]).won,false);
assert.equal(M.outcome('five',{height:.89,placed:5}).won,false);
assert.equal(M.outcome('five',{height:.95,placed:5}).won,true);
assert.equal(M.outcome('copy',{matched:2}).won,false);
assert.equal(M.outcome('copy',{matched:3}).won,true);
const original=[{id:1,x:0,y:.3,angle:0},{id:2,x:0,y:.7,angle:0},{id:3,x:0,y:1.1,angle:0}];
assert.deepEqual(M.demolitionScore(original,[{id:2,x:.5,y:.2,angle:1},{id:3,x:0,y:1.1,angle:0}],[1]),{fallen:1,removed:1,points:120});
assert.equal(M.outcome('demolition',{fallen:4}).won,true);
assert.equal(M.outcome('demolition',{fallen:3}).won,false);
console.log('Torre Caos: 6 modalidades, estrechamiento, silueta, 5 piezas y demolición OK');
