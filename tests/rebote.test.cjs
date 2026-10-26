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

test('escudo temporal consume proyectiles extra sin acumular daño diferido',()=>{
 const g=G.make({seed:30});G.begin(g);g.nextShot=999;g.projectiles=[];
 const ball=id=>({id,type:'normal',pos:G.V(0,1.55,-.6),prev:G.V(0,1.55,-.6),
  velocity:G.V(0,0,24),speed:24,radius:.17,age:0,returning:false,dead:false,targetId:0});
 g.projectiles=[ball(1),ball(2),ball(3)];
 step(g,.2);
 assert.equal(g.lives,2,'one shield lost regardless of concurrent hits');
 assert.equal(g.projectiles.length,0,'all blocked projectiles are consumed and cannot hit later');
 step(g,1.1);
 assert.equal(g.lives,2,'no latent hit after invulnerability');
});

test('escudo del jefe se anuncia en core durante las ventanas de bloqueo',()=>{
 const g=G.make({seed:42});G.begin(g);
 g.elapsed=61.99;g.projectiles=[];g.nextShot=999;g.protection=100;
 step(g,.07);
 const boss=g.enemies.find(e=>e.boss);
 assert(boss,'boss spawns after final phase starts');
 for(let i=0;i<16;i++){
  step(g,.25);
  assert.equal(boss.shield,Math.sin(g.elapsed*1.75)>.80,'visual shield matches actual parry window');
 }
});

test('7 trayectorias de pelota: centro, lateral, alta, baja y diagonal, sin giros inseguros',()=>{
 const expected=['CENTRO','DERECHA','ALTA','IZQUIERDA','BAJA','ALTA DERECHA','BAJA IZQUIERDA'];
 assert.deepEqual(G.ATTACK_LANES.map(x=>x.name),expected);
 const g=G.make({seed:16});G.begin(g);g.projectiles=[];
 const origins=[],aims=[];
 for(let i=0;i<7;i++){
  const lane=G.laneAt(i);
  assert(Math.abs(lane.x)<=.45&&Math.abs(lane.y)<=.41,'desplazamiento alcanzable con el teléfono');
  g.projectiles=[];assert(G.launch(g,'normal'));
  const p=g.projectiles.find(p=>p.type==='normal');
  assert.equal(p.lane,lane.name);
  assert(Math.abs(p.muzzleY-(1.48+lane.y*.95))<.03,'la altura del emisor varía con cada patrón');
  origins.push(p.pos.y);aims.push(p.aimOffset);
 }
 assert(Math.max(...origins)-Math.min(...origins)>.55,'las pelotas parten físicamente desde alturas distintas');
 assert(aims.some(a=>a.x>.3)&&aims.some(a=>a.x<-.3),'ataques laterales reales');
 assert(aims.some(a=>a.y>.3)&&aims.some(a=>a.y<-.3),'ataques altos y bajos reales');
});
test('DEVOLVER genera ricochet físico con punto de contacto para animación',()=>{
 const g=G.make({seed:7});G.begin(g);g.projectiles=[];g.nextShot=999;
 const e=g.enemies[0],ball={id:501,type:'normal',pos:G.V(0,1.55,-.52),prev:G.V(0,1.55,-.52),velocity:G.V(0,0,1.8),speed:1.8,radius:.17,age:.7,returning:false,dead:false,targetId:e.id,lane:'ALTA'};
 g.projectiles=[ball];G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 const original={...ball.pos},r=G.returnShot(g);
 assert.equal(r.ok,true);assert.equal(ball.returning,true);
 assert.deepEqual(ball.bounceFrom,original);
 assert.equal(ball.bounceGrade,r.grade);
 assert(ball.velocity.z<0,'rebote invierte el trayecto hacia el robot');
 const fx=g.effects.find(e=>e.type==='return'&&e.id===501);
 assert(fx&&fx.y===original.y&&fx.z===original.z,'efecto visual en el punto de contacto real');
 G.tick(g,.14);
 assert(ball.pos.z<original.z,'la pelota realmente regresa por el espacio 3D');
});

test('modo DUELO inicia con un solo rival y conserva el clásico original',()=>{
 const d=G.make({seed:51,mode:'duelo'}),c=G.make({seed:51,mode:'clasico'});
 assert.equal(d.mode,'duelo');assert.equal(c.mode,'clasico');
 assert.equal(G.DUEL_RIVALS.length,6,'seis rivales jugables');
 assert.equal(G.begin(d),true);assert.equal(G.begin(c),true);
 assert.equal(d.enemies.filter(e=>e.alive).length,1);
 assert.equal(d.enemies[0].name,'CHISPA');
 assert.equal(d.enemies[0].health,2);
 assert.equal(G.snapshot(d).duelTotal,6);
 assert.equal(G.snapshot(d).rival,'CHISPA');
 assert.equal(G.snapshot(c).mode,'clasico');
 assert.equal(G.snapshot(c).remaining,G.DURATION);
 for(let i=1;i<G.DUEL_RIVALS.length;i++){
  assert(G.DUEL_RIVALS[i].speed>G.DUEL_RIVALS[i-1].speed,'cada rival tira más rápido');
  assert(G.DUEL_RIVALS[i].interval<G.DUEL_RIVALS[i-1].interval,'cada rival ataca con mayor frecuencia');
 }
});
test('seis victorias duelos en orden sin dos enemigos simultáneos ni reset de vida/posición',()=>{
 const g=G.make({mode:'duelo',seed:2026});G.begin(g);
 g.protection=999;
 const pos=G.V(.14,1.55,.45),dir=G.V(0,0,-1);
 G.setView(g,pos,dir);
 for(let level=0;level<6;level++){
  const cfg=G.DUEL_RIVALS[level],e=g.enemies.find(x=>x.alive);
  assert(e,'rival presente en nivel '+level);
  assert.equal(e.name,cfg.name);
  assert.equal(e.health,cfg.hp);
  assert.equal(g.duelLevel,level);
  assert.equal(g.enemies.filter(x=>x.alive).length,1);
  g.nextShot=Infinity;g.projectiles=[];g.delayed=[];
  for(let n=0;n<12&&e.alive;n++){
   // Test the same swept 3D collision the returning player projectile uses.
   // The champion's parry has real cooldown; don't confuse defense with death.
   if(e.boss&&Math.sin(g.elapsed*1.75)>.79){g.elapsed+=.40;continue}
   const ball={id:3000+level*20+n,type:'normal',pos:G.V(e.x,1.54,e.z+.64),
    prev:G.V(e.x,1.54,e.z+.64),velocity:G.V(0,0,-20),speed:20,
    radius:.215,age:0,returning:true,dead:false,targetId:e.id,targetEnemy:e.id,grade:'PERFECTO'};
   g.projectiles=[ball];G.tick(g,.06);
  }
  assert.equal(e.alive,false,'el robot de nivel '+level+' es derrotado con pelotas reales');
  assert.equal(g.duelWins,level+1);
  assert.equal(g.projectiles.filter(x=>!x.dead&&!x.returning).length,0,'sin proyectiles huérfanos');
  if(level<5){
   assert.equal(g.nextDuelAt!==null,true,'se anuncia una transición después del KO');
   assert.equal(g.enemies.filter(x=>x.alive).length,0,'el robot viejo desaparece');
   g.elapsed=g.nextDuelAt-.03;G.tick(g,.06);
   assert.equal(g.duelLevel,level+1,'progresión automática de rival');
   assert.equal(g.enemies.filter(x=>x.alive).length,1,'solo entra el siguiente rival');
   assert.equal(g.nextDuelAt,null,'transición limpiada');
   assert.equal(g.lives,3,'misma partida conserva vidas');
   assert.equal(g.eye.x,pos.x,'AR conserva posición del usuario');
  }
 }
 assert.equal(g.state,'finished');assert.equal(g.victory,true);
 assert.equal(g.reason,'seis_rivales');assert.equal(G.snapshot(g).duelWins,6);
});
test('ningún duelo lanza múltiples pelotas reales simultáneas, aun en niveles altos',()=>{
 const g=G.make({mode:'duelo'});G.begin(g);
 for(let level=0;level<6;level++){
  g.duelLevel=level;g.projectiles=[];
  let types=G.DUEL_RIVALS[level].types;
  for(const type of types){
   g.projectiles=[];
   assert(G.launch(g,type),'puede disparar '+type);
   assert.equal(G.launch(g,'normal'),false,'solo una pelota real simultánea');
   assert.equal(g.projectiles.filter(p=>!p.returning&&p.type!=='fake').length,1);
  }
 }
});
test('tiempo y derrota en duelos; el clásico mantiene sus fases y sus 88 segundos',()=>{
 const d=G.make({mode:'duelo'});G.begin(d);
 assert.equal(G.snapshot(d).remaining,G.DUEL_DURATION);
 d.elapsed=G.DUEL_DURATION-.03;G.tick(d,.1);
 assert.equal(d.state,'finished');assert.equal(d.reason,'tiempo');assert.equal(d.victory,false);
 const c=G.make({mode:'clasico'});G.begin(c);
 assert.equal(G.snapshot(c).remaining,88);
 c.protection=999;c.elapsed=44.97;G.tick(c,.08);
 assert.equal(c.phase,3,'el juego clásico continúa con fases cronometradas');
});

test('toque anticipado se guarda brevemente y devuelve la MISMA pelota al entrar en ventana',()=>{
 const g=G.make({seed:600,mode:'duelo'});G.begin(g);g.projectiles=[];g.nextShot=999;
 const target=g.enemies[0];const ball={id:410,type:'normal',
  pos:G.V(0,1.55,-1.54),prev:G.V(0,1.55,-1.54),
  velocity:G.V(0,0,2.4),speed:2.4,radius:.17,age:.4,
  returning:false,dead:false,targetId:target.id};
 g.projectiles=[ball];G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 const res=G.returnShot(g);
 assert.equal(res.ok,false);assert.equal(res.queued,true);
 assert.equal(res.reason,'CARGANDO REBOTE');
 assert.equal(g.attempts,1,'one tap registered');
 assert.equal(g.returns,0,'do not auto-score before the ball arrives');
 step(g,.19);
 assert.equal(ball.returning,true,'buffered shot becomes an actual physical return');
 assert.equal(g.attempts,1,'automatic resolution must never double-count a tap');
 assert.equal(g.returns,1);assert.equal(g.bufferedHits,1);
 assert.equal(g.bufferedShot,null);
});
test('asistencia no devuelve pelotas fuera de mira, lejanas o alejándose',()=>{
 const g=G.make({seed:7,mode:'duelo'});G.begin(g);g.projectiles=[];g.nextShot=999;
 const e=g.enemies[0],ball={id:311,type:'normal',pos:G.V(0,1.55,-1.60),
  prev:G.V(0,1.55,-1.60),velocity:G.V(0,0,2),speed:2,radius:.17,
  age:.4,returning:false,dead:false,targetId:e.id};
 g.projectiles=[ball];G.setView(g,G.V(0,1.55,.05),G.V(1,0,0));
 let r=G.returnShot(g);assert.equal(r.queued,undefined);
 assert.equal(r.reason,'ESPERÁ');assert.equal(g.bufferedShot,null);
 g.elapsed+=.15;G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 ball.pos=G.V(0,1.55,-2.2);r=G.returnShot(g);
 assert.equal(r.queued,undefined,'too-far ball never queues');
 g.elapsed+=.15;ball.pos=G.V(0,1.55,-1.65);ball.velocity=G.V(0,0,-2);
 r=G.returnShot(g);assert.equal(r.queued,undefined,'receding ball never queues');
 step(g,.65);assert.equal(g.returns,0);
});
test('toque en ventana más generosa salva desviación moderada; perfectos siguen precisos',()=>{
 const g=G.make({mode:'duelo'});G.begin(g);g.nextShot=999;
 const e=g.enemies[0];
 const p={id:666,type:'normal',pos:G.V(.30,1.55,-.65),prev:G.V(.30,1.55,-.65),
  velocity:G.V(0,0,2),speed:2,radius:.17,age:.2,returning:false,
  dead:false,targetId:e.id};
 g.projectiles=[p];G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 const res=G.returnShot(g);
 assert.equal(res.ok,true,'30cm lateral aim error is forgiving on mobile');
 assert.notEqual(res.grade,'PERFECTO','precision grade still requires a centered return');
});
test('el buffer no permite un rebote fantasma al cambiar de rival',()=>{
 const g=G.make({mode:'duelo'});G.begin(g);g.nextShot=999;
 const p={id:777,type:'normal',pos:G.V(0,1.55,-1.50),prev:G.V(0,1.55,-1.50),
 velocity:G.V(0,0,2.0),speed:2,radius:.17,age:0,returning:false,dead:false,targetId:0};
 g.projectiles=[p];G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 assert.equal(G.returnShot(g).queued,true);
 g.projectiles=[];step(g,.1);
 assert.equal(g.bufferedShot,null);
 assert.equal(g.returns,0);
});

test('pulsar nuevamente NO cancela un rebote cargado y nunca duplica intentos',()=>{
 const g=G.make({mode:'duelo',seed:92});G.begin(g);g.nextShot=999;g.projectiles=[];
 const e=g.enemies[0],ball={id:871,type:'normal',pos:G.V(0,1.55,-1.59),
  prev:G.V(0,1.55,-1.59),velocity:G.V(0,0,2.1),speed:2.1,
  radius:.17,age:.3,returning:false,dead:false,targetId:e.id};
 g.projectiles=[ball];G.setView(g,G.V(0,1.55,.05),G.V(0,0,-1));
 const first=G.returnShot(g);assert.equal(first.queued,true);
 const token=g.bufferedShot;
 g.elapsed+=.155;
 const second=G.returnShot(g);
 assert.equal(second.queued,true);
 assert.equal(g.bufferedShot,token,'same ball buffer remains armed after second tap');
 assert.equal(g.attempts,1,'double tap cannot create a second attempt');
 for(let i=0;i<35;i++)G.tick(g,.011);
 assert.equal(g.bufferedHits,1,'one actual ricochet');
 assert.equal(g.returns,1,'one scoring event');
});
test('el robot avisa antes de lanzar, sin alertas duplicadas ni falsos ataques',()=>{
 const g=G.make({mode:'duelo',seed:42});G.begin(g);g.projectiles=[];
 g.nextShot=g.elapsed+.35;g.lastTelegraphFor=null;
 for(let i=0;i<22;i++)G.tick(g,.012);
 const e=g.effects.filter(x=>x.type==='telegraph');
 assert.equal(e.length,1,'one charge warning for one incoming shot');
 assert.equal(e[0].enemyId,g.enemies.find(x=>x.alive).id);
 G.tick(g,.02);
 assert.equal(g.effects.filter(x=>x.type==='telegraph').length,1);
});
test('KO otorga recompensa creciente y recupera un escudo al tercer campeón',()=>{
 const g=G.make({mode:'duelo',seed:42});G.begin(g);
 g.protection=999;g.lives=2;
 for(let level=0;level<3;level++){
  const e=g.enemies.find(x=>x.alive);
  e.health=1;e.shield=false;
  g.nextShot=999;g.projectiles=[];
  const ball={id:910+level,type:'normal',pos:G.V(e.x,1.54,e.z+.44),
    prev:G.V(e.x,1.54,e.z+.44),velocity:G.V(0,0,-20),speed:20,
    radius:.2,age:.1,returning:true,dead:false,targetEnemy:e.id,
    targetId:e.id,grade:'BUENO'};
  g.projectiles.push(ball);G.tick(g,.04);
  assert.equal(e.alive,false);
  assert.equal(g.duelWins,level+1);
  if(level<2){g.elapsed=g.nextDuelAt-.02;G.tick(g,.045)}
 }
 assert.equal(g.lives,3,'one shield recovered halfway through duel run');
 assert.equal(g.effects.filter(x=>x.type==='shield-recover').length,1);
 assert.equal(g.duelReward,310+420+530,'level KO score grows with the rivals');
});
