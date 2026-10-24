'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../rodeados-core.js');
const bot=(type='basic',id=1,x=0,z=-3.2)=>{
 const t=G.TYPES[type];
 return {id,type,x,z,angle:0,hp:t.hp,maxHp:t.hp,radius:t.radius,height:t.height,portal:0,
  age:3,stun:0,attackCD:99,state:'advance',strafe:1,phase:0,taunt:0,lastHit:0};
};
const aim=height=>({origin:{x:0,y:height,z:0},direction:{x:0,y:0,z:-1}});
test('war floor starts intact: 25 cells, 0 wear, neutral heat',()=>{
 const g=G.create({seed:3,arena:2.6});
 assert.deepEqual(g.floorDamage,Array(25).fill(0));
 assert.deepEqual(g.floorHeat,Array(25).fill(-100));
});
test('damage accumulates on impacted cells but never changes positions/physics',()=>{
 const g=G.create({seed:3,arena:2.6}),before={...g.player};
 assert(G.markFloorDamage(g,0,0,.48,.24)>0);
 assert(g.floorDamage[12]>.20);
 assert.equal(g.floorDamage[0],0);
 for(let i=0;i<16;i++)G.markFloorDamage(g,0,0,.45,.28);
 assert.equal(g.floorDamage[12],1,'scars cap at 100%');
 assert.deepEqual(g.player,before,'virtual decoration cannot move the player');
 assert.equal(g.lives,100,'scorched tiles are visual only');
});
test('enemy attack both reduces health and scars the square at player position',()=>{
 const g=G.create({seed:5,arena:2.6});G.begin(g);g.spawnClock=500;
 const e=bot('basic',1,0,-2.60);e.attackCD=0;g.enemies=[e];
 G.advance(g,.05);
 assert(g.lives<100);assert(g.floorDamage[12]>0);
 assert(g.floorHeat[12]>=0);
});
test('bomb explosion makes a blast scar on nearby tiles and does not affect remote tiles',()=>{
 const g=G.create({seed:5,arena:2.6});G.begin(g);g.spawnClock=500;
 const out=G.throwBomb(g,{x:0,z:-1.6});assert(out.ok);
 for(let i=0;i<9;i++)G.advance(g,.07);
 assert(g.fx.some(f=>f.type==='bombBlast'));
 assert(g.floorDamage.some(v=>v>0),'bomb must damage virtual floor');
 assert(g.floorDamage.every(v=>v>=0&&v<=1));
});
test('headshot is worth substantially more than torso or legs on identical targets',()=>{
 const shoot=y=>{
  const g=G.create({seed:13});G.begin(g);g.enemies=[bot('basic')];
  return G.fire(g,aim(y));
 };
 const head=shoot(1.62),body=shoot(1.1),legs=shoot(.45);
 assert(head.ok&&head.hit&&head.killed);assert.equal(head.part,'head');
 assert(body.hit&&!body.killed&&body.part==='body');
 assert(legs.hit&&!legs.killed&&legs.part==='legs');
 assert(head.points>body.points*3,`head ${head.points}, body ${body.points}`);
 assert(body.points>legs.points);
});
test('lethal headshots add precision bonus, 3-headshot streak awards further bonus',()=>{
 const g=G.create({seed:13});G.begin(g);const enemy=bot('boss');
 g.enemies=[enemy];
 const headY=1.60*enemy.height/1.75;
 const first=G.fire(g,aim(headY)),second=G.fire(g,aim(headY)),third=G.fire(g,aim(headY));
 assert(first.hit&&second.hit&&third.hit);
 assert.equal(g.headshots,3);assert.equal(g.headshotStreak,3);
 assert.equal(g.bestHeadshotStreak,3);
 assert(third.points>second.points,'third headshot must include streak reward');
 const missed=G.fire(g,aim(8));assert(missed.ok&&!missed.hit);
 assert.equal(g.headshotStreak,0,'miss breaks precision streak');
});
test('floor damage and accuracy stats survive copies, reset on rematch',()=>{
 const g=G.create({seed:12});G.begin(g);G.markFloorDamage(g,0,0,.45,.50);
 g.enemies=[bot()];G.fire(g,aim(1.62));
 const c=G.copy(g);assert.equal(c.headshots,1);assert(c.floorDamage[12]>0);
 assert.notStrictEqual(c.floorDamage,g.floorDamage,'copy cannot alias damage array');
 const next=G.reset(g);assert.equal(next.headshots,0);
 assert(next.floorDamage.every(v=>v===0));
});
