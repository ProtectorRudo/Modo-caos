'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../rebote-core.js');
function step(g,s){for(let t=0;t<s;t+=.016)G.tick(g,Math.min(.016,s-t))}
test('simulación de 90Hz, tutorial y fase progresiva',()=>{
 const g=G.make({seed:1234});assert.equal(g.state,'ready');assert.equal(g.lives,3);
 assert(G.begin(g));assert.equal(g.state,'playing');assert.equal(g.enemies.length,1);
 g.protection=100;step(g,14.1);assert.equal(g.phase,1);
 assert.equal(G.phaseAt(29),2);assert.equal(G.phaseAt(49),3);assert.equal(G.phaseAt(68),4);
});
test('devolución perfecta exige mira y ventana',()=>{
 const g=G.make({seed:3});G.begin(g);
 let p={...g.projectiles[0]};
 const e=g.enemies[0];
 assert.equal(G.returnShot(g).ok,false,'no devuelve sin esfera');
 g.lastShotAt=-100;
 p={id:111,type:'normal',pos:G.V(0,1.55,-.49),prev:G.V(0,1.55,-.49),velocity:G.V(0,0,2),speed:2,radius:.17,age:.5,returning:false,dead:false,targetId:e.id,bend:0};
 g.projectiles=[p];G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 let r=G.returnShot(g);assert.equal(r.grade,'PERFECTO');assert.equal(g.combo,1);
 assert.equal(g.returns,1);assert.equal(g.perfect,1);assert(p.returning);
 step(g,.75);assert(e.health<e.maxHealth,'real 3D projectile impacts enemy');
});
test('mira desviada no concede golpes; esferas lejanas no se golpean',()=>{
 const g=G.make();G.begin(g);const e=g.enemies[0];
 const p={id:1,type:'normal',pos:G.V(0,1.55,-.55),prev:G.V(0,1.55,-.55),
  velocity:G.V(0,0,2),speed:2,radius:.17,age:0,returning:false,dead:false,targetId:e.id};
 g.projectiles=[p];
 G.setView(g,G.V(0,1.55,.05),G.V(1,0,0));
 assert.equal(G.returnShot(g).reason,'APUNTÁ A LA ESFERA');
 g.lastShotAt=-100;G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 p.pos.z=-1.8;assert.equal(G.returnShot(g).reason,'ESPERÁ');
});
test('detección continua impide atravesar colisiones al perder FPS',()=>{
 assert.equal(G.sweptPoint(G.V(0,0,-2),G.V(0,0,2),G.V(0,0,0)),0);
 assert(G.sweptPoint(G.V(1,0,-2),G.V(1,0,2),G.V(0,0,0))>.9);
});
test('impactos consumen escudos con invulnerabilidad',()=>{
 const g=G.make();G.begin(g);g.nextShot=999;g.projectiles=[];const t=G.V(g.eye.x,g.eye.y,g.eye.z);
 const ball=id=>({id,type:'normal',pos:G.V(t.x,t.y,t.z-.55),prev:G.V(t.x,t.y,t.z-.55),
  velocity:G.V(0,0,20),speed:20,radius:.17,age:0,returning:false,dead:false,targetId:0});
 g.projectiles=[ball(10),ball(11)];step(g,.12);
 assert.equal(g.lives,2,'two simultaneous attacks cannot drain both shields');
 step(g,.9);g.projectiles=[ball(12)];step(g,.08);
 assert.equal(g.lives,1);
});
test('jefe final aparece, puede recibir daños y se alcanza victoria',()=>{
 const g=G.make();G.begin(g);g.elapsed=61.99;g.nextShot=999;g.projectiles=[];
 step(g,.07);const boss=g.enemies.find(e=>e.boss);
 assert(boss&&g.bossSpawned,'boss is real entity');
 boss.health=1;g.elapsed=63.49;
 const p={id:90,type:'normal',pos:G.V(boss.x,1.54,boss.z+.9),prev:G.V(boss.x,1.54,boss.z+.9),
  velocity:G.V(0,0,-5),speed:5,radius:.2,age:0,returning:true,dead:false,targetId:boss.id,
  targetEnemy:boss.id,grade:'PERFECTO'};
 g.projectiles=[p];step(g,.4);
 assert.equal(g.victory,true);assert.equal(g.state,'finished');
});
test('ataques especiales dobles y señuelos nunca dañan sin proyectil real',()=>{
 const g=G.make();G.begin(g);g.projectiles=[];G.launch(g,'doble');
 assert.equal(g.delayed.length,1);
 step(g,2.10);assert(g.shotIndex>=2,'el segundo lanzamiento no desaparece por congestión');
 const h=G.make();G.begin(h);h.projectiles=[];G.launch(h,'fantasma');
 const fake=h.projectiles.find(p=>p.type==='fake');assert(fake,'fantasma identificable');
 h.projectiles=[fake];h.nextShot=999;fake.pos=G.V(h.eye.x,h.eye.y,h.eye.z-.31);
 fake.velocity=G.V(0,0,8);step(h,.10);assert.equal(h.lives,3);
});
test('revancha crea partida sin reaprovechar estados anteriores',()=>{
 const a=G.make(),b=G.make();G.begin(a);a.score=1299;
 assert.equal(b.score,0);assert.equal(b.state,'ready');assert.equal(G.snapshot(b).lives,3);
});
