'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../rodeados-core.js');
function bot(x=0,z=-3.2,angle=0){
 const type='basic',t=G.TYPES[type];
 return {id:1,type,x,z,angle,hp:t.hp,maxHp:t.hp,radius:t.radius,height:t.height,
 state:'advance',age:1,stun:0,attackCD:3,strafe:1,phase:0,portal:0,taunt:0,lastHit:0};
}
test('enemies spawn OUTSIDE 2.6m playable calibration board, in 3m+ combat ring',()=>{
 for(let seed=1;seed<=85;seed++){
  const g=G.create({seed,arena:2.6}),e=G.spawn(g,'basic');
  assert(e,'a robot can spawn in world space even when player floor is small');
  const d=Math.hypot(e.x-g.player.x,e.z-g.player.z);
  assert(d>=2.9&&d<=4.3,`seed ${seed}: distance ${d}`);
 }
});
test('actors are never allowed inside physical XR camera 2.45m clearance',()=>{
 const g=G.create({seed:2,arena:2.6});G.begin(g);g.spawnClock=300;
 const e=bot(.8,-.3);g.enemies=[e];
 G.advance(g,.04);
 const d=Math.hypot(e.x-g.player.x,e.z-g.player.z);
 assert(d>=2.449,`enemy near camera at ${d}m`);
});
test('head, chest and legs hitboxes match 1.75m visible humanoid',()=>{
 const g=G.create();g.enemies=[bot()];
 const front=z=>({origin:{x:0,y:z,z:-5},direction:{x:0,y:0,z:1}});
 for(const [name,height] of [['head',1.62],['body',1.15],['legs',.44]]){
  const ray=front(height),h=G.rayHit(g,ray.origin,ray.direction);
  assert(h,`visible ${name} must have a hitbox`);
  assert.equal(h.part,name);
 }
});
test('hitboxes rotate with robot yaw and are hittable from side',()=>{
 const g=G.create();g.enemies=[bot(0,0,Math.PI/2)];
 const h=G.rayHit(g,{x:-3,y:1.12,z:0},{x:1,y:0,z:0});
 assert(h);assert.equal(h.part,'body');
});
test('shooting through aligned reticle scores and removes enemy',()=>{
 const g=G.create({seed:10});G.begin(g);g.enemies=[bot()];
 const ray={origin:{x:0,y:1.62,z:0},direction:{x:0,y:0,z:-1}};
 const out=G.fire(g,ray);
 assert(out.ok);assert(out.hit);assert.equal(out.part,'head');
 assert.equal(g.ammo,28);assert.equal(g.hits,1);assert.equal(g.kills,1);
 assert(g.score>0);assert.equal(g.enemies.length,0);
});
test('a missed reticle records a shot without consuming ammo; paused shots do not',()=>{
 const g=G.create();G.begin(g);g.enemies=[bot()];
 const miss=G.fire(g,{origin:{x:0,y:1.62,z:0},direction:{x:1,y:0,z:0}});
 assert(miss.ok);assert(!miss.hit);assert.equal(g.ammo,28);assert.equal(g.shots,1);
 g.paused=true;const blocked=G.fire(g,{origin:{x:0,y:1.62,z:0},direction:{x:0,y:0,z:-1}});
 assert(!blocked.ok);assert.equal(g.ammo,28);
});
