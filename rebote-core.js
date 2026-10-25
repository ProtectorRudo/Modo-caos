'use strict';
/* REBOTE MORTAL — simulation deterministic, independiente de WebXR y gráficos.
   Todas las unidades son metros y segundos. STEP fijo, colisiones barridas para FPS bajos. */
(function(root){
const V=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z),
 sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a,s)=>V(a.x*s,a.y*s,a.z*s),
 dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,len=a=>Math.hypot(a.x,a.y,a.z),
 norm=a=>mul(a,1/Math.max(1e-8,len(a))),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const STEP=1/90,DURATION=88,DUEL_DURATION=210,PHASES=['APRENDIZ','RITMO','REFLEJOS','CAOS','JEFE FINAL'];
// Six distinct, progressively more skilled opponents. One opponent AND one active real
// incoming ball at a time; higher tiers win through timing, aim and tactics, not spam.
const DUEL_RIVALS=Object.freeze([
 {name:'CHISPA',title:'EL APRENDIZ',hint:'Pelotas al centro · ritmo tranquilo',hp:2,interval:3.4,speed:1.67,drift:.07,types:['normal'],tactic:'centro'},
 {name:'RAYO',title:'EL VELOZ',hint:'Alterna izquierda y derecha',hp:3,interval:2.85,speed:2.10,drift:.16,types:['normal','veloz','normal'],tactic:'lados'},
 {name:'PIXEL',title:'EL TRAMPOSO',hint:'Señuelos violetas · mirá bien',hp:3,interval:2.55,speed:2.38,drift:.22,types:['normal','fantasma','curva'],tactic:'fintas'},
 {name:'VECTOR',title:'EL TIRADOR',hint:'Arriba, abajo y diagonales',hp:4,interval:2.35,speed:2.55,drift:.29,types:['normal','curva','veloz'],tactic:'altura'},
 {name:'TURBO',title:'EL IMPARABLE',hint:'Cambios de ritmo · tiros pesados',hp:4,interval:2.08,speed:2.90,drift:.36,types:['pesada','veloz','curva','normal'],tactic:'ritmo'},
 {name:'NÉMESIS',title:'EL CAMPEÓN',hint:'Lee tus golpes · escudo ocasional',hp:5,interval:1.90,speed:3.15,drift:.44,types:['veloz','curva','explosiva','pesada'],tactic:'campeon'}
]);
function duelConfig(g){return DUEL_RIVALS[Math.min(DUEL_RIVALS.length-1,Math.max(0,g.duelLevel))]}
const TIMINGS=[14,28,45,62,88];
const TYPES=['normal','veloz','curva','pesada','doble','fantasma','explosiva'];
function random(g){let x=g.seed>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;g.seed=x>>>0;return g.seed/4294967296}
function make(opts={}){
 const seed=(Number(opts.seed)>>>0)||0xCA052026,mode=['clasico','supervivencia','precision','caos','duelo'].includes(opts.mode)?opts.mode:'clasico';
 return {seed,initialSeed:seed,mode,state:'ready',elapsed:0,acc:0,paused:false,phase:0,
  lives:3,score:0,combo:0,perfectStreak:0,bestCombo:0,perfect:0,returns:0,attempts:0,
  enemiesKilled:0,shotIndex:0,nextShot:2.25,projectiles:[],delayed:[],enemies:[],effects:[],
  eye:V(0,1.55,.05),aim:V(0,0,-1),enemyId:0,projectileId:0,
  protection:0,lastResult:'',reason:'',bossSpawned:false,bossDefeated:false,stats:{missed:0,grazed:0},lastShotAt:-100,
  duelLevel:0,duelWins:0,nextDuelAt:null,duelChampion:false};
}
function begin(g){
 if(g.state!=='ready')return false;
 g.state='playing';
 if(g.mode==='duelo'){
  g.phase=0;g.duelLevel=0;g.duelWins=0;g.nextDuelAt=null;
  spawnEnemy(g,false);
  g.nextShot=2.60;return true;
 }
 g.nextShot=2.25;spawnEnemy(g,false);return true;
}
function setView(g,eye,dir){
 if(!eye||!dir||![eye.x,eye.y,eye.z,dir.x,dir.y,dir.z].every(Number.isFinite))return;
 if(len(dir)<.1)return;
 const next=V(clamp(eye.x,-6,6),clamp(eye.y,.7,2.3),clamp(eye.z,-6,6));
 if(len(sub(next,g.eye))<1.15)g.eye=next;
 g.aim=norm(dir);
}
function phaseAt(t){return t<14?0:t<28?1:t<45?2:t<62?3:4}
function typeAt(g){
 if(g.mode==='duelo'){
  const types=duelConfig(g).types;
  return types[g.shotIndex%types.length];
 }
 const p=g.phase,r=random(g);
 if(p===0)return 'normal';
 if(p===1)return r<.64?'normal':'veloz';
 if(p===2)return r<.34?'normal':r<.57?'curva':r<.77?'pesada':'doble';
 if(p===3)return r<.27?'veloz':r<.47?'curva':r<.63?'explosiva':r<.81?'fantasma':'doble';
 return r<.20?'pesada':r<.42?'curva':r<.64?'veloz':r<.82?'explosiva':'normal';
}
function spawnEnemy(g,boss=false){
 const idx=g.enemyId++;
 if(g.mode==='duelo'){
  // No two opponents coexist: dead models have finished their falling animation
  // before this function is called from the between-round transition.
  if(g.enemies.some(e=>e.alive))return null;
  const cfg=duelConfig(g),last=g.duelLevel===DUEL_RIVALS.length-1;
  const side=g.duelLevel%2===0?-.14:.14;
  const z=-2.30;
  const e={id:idx,boss:last,duel:true,duelLevel:g.duelLevel,name:cfg.name,
   x:side,z,homeX:side,health:cfg.hp,maxHealth:cfg.hp,damage:0,hitTime:-10,
   shield:false,alive:true,phase:idx*.76,stagger:0};
  g.enemies.push(e);
  g.effects.push({type:'duel-intro',t:g.elapsed,level:g.duelLevel,name:cfg.name,title:cfg.title,hint:cfg.hint,x:e.x,z:e.z});
  return e;
 }
 const side=Math.sin(idx*2.3)*(g.phase===3?2.0:g.phase>=2?1.07:.43);
 const z=g.phase===3?-1.84+(idx%3)*-.18:-2.25+(idx%3)*-.16;
 const e={id:idx,boss,x:side,z,homeX:side,health:boss?11:g.phase<2?3:4,
   maxHealth:boss?11:g.phase<2?3:4,damage:0,hitTime:-10,shield:false,alive:true,
   phase:idx*.76,stagger:0.0};
 g.enemies.push(e);g.effects.push({type:boss?'boss':'spawn',t:g.elapsed,x:e.x,z:e.z});
 return e;
}
function activeEnemy(g){return g.enemies.find(e=>e.alive&&e.boss)||g.enemies.find(e=>e.alive)}
// Safe, phone-sized aiming offsets; no need to run, crouch or leap while viewing AR.
// First shot is centered; then alternate upper/lower/left/right/diagonal trajectories.
const ATTACK_LANES=[
 {name:'CENTRO',x:0,y:0}, {name:'DERECHA',x:.43,y:.04},
 {name:'ALTA',x:-.09,y:.39}, {name:'IZQUIERDA',x:-.43,y:-.04},
 {name:'BAJA',x:.08,y:-.37}, {name:'ALTA DERECHA',x:.34,y:.29},
 {name:'BAJA IZQUIERDA',x:-.33,y:-.27}
];
function laneAt(index){return ATTACK_LANES[index%ATTACK_LANES.length]}
function launch(g,type=typeAt(g),target=activeEnemy(g)){
 if(!target)return false;
 const inbound=g.projectiles.filter(p=>!p.returning&&!p.dead&&p.type!=='fake');
 const limit=g.mode==='duelo'?1:g.phase<2?1:g.phase<4?2:2;
 if(inbound.length>=limit)return false;
 if(inbound.some(p=>len(sub(p.pos,g.eye))<1.25))return false;
 const cfg=g.mode==='duelo'?duelConfig(g):null;
 // Each rival has an attack identity: Chispa aims center, Rayo sweeps sideways,
 // Pixel feints, Vector targets diagonals, Turbo varies and Némesis mixes everything.
 const pattern=g.mode==='duelo'?
  (cfg.tactic==='centro'?[0,0,1,0][g.shotIndex%4]:
   cfg.tactic==='lados'?[1,3,0,1,3][g.shotIndex%5]:
   cfg.tactic==='fintas'?[0,5,3,6][g.shotIndex%4]:
   cfg.tactic==='altura'?[2,4,5,6,2,4][g.shotIndex%6]:
   cfg.tactic==='ritmo'?[1,4,2,6,3][g.shotIndex%5]:
   [5,4,1,6,2,3][g.shotIndex%6]):g.shotIndex;
 const lane=laneAt(pattern);
 // Fire from different parts of the enemy's armored body, instead of one flat y-level.
 const muzzleY=clamp(1.48+lane.y*.95,1.06,1.99);
 const origin=V(target.x+(Math.sin(g.shotIndex*1.76)*.18),muzzleY,target.z+.08);
 // The player uses the phone as the controller: moving it sideways or tilting
 // to intercept a high/low shot improves precision. Offsets stay within arm reach.
 const destination=add(g.eye,V(lane.x,lane.y,0));
 const direction=norm(sub(destination,origin));
 const speed=cfg?
   cfg.speed*(type==='pesada'?.80:type==='veloz'?1.18:1):
   type==='pesada'?1.65:type==='veloz'?3.65:g.phase===0?1.67:g.phase===1?2.0:g.phase===2?2.45:2.72;
 const id=++g.projectileId;
 const p={id,type,pos:origin,prev:origin,velocity:mul(direction,speed),speed,
   radius:type==='pesada'?.22:.17,age:0,returning:false,dead:false,targetId:target.id,
   bend:type==='curva'?.22:0,curvePhase:random(g)*6.28,hit:false,warning:0.50,
   lane:lane.name,aimOffset:V(lane.x,lane.y,0),muzzleY,
   hasDouble:type==='doble'};
 g.projectiles.push(p);
 if(type==='doble')g.delayed.push({at:g.elapsed+.90,created:g.elapsed,type:'normal',targetId:target.id});
 if(type==='fantasma'){
  const fake={...p,id:++g.projectileId,type:'fake',pos:add(origin,V(.32,0,0)),prev:add(origin,V(.32,0,0)),radius:.125,hasDouble:false};
  g.projectiles.push(fake);
 }
 g.effects.push({type:'launch',t:g.elapsed,id,x:origin.x,y:origin.y,z:origin.z,style:type,lane:lane.name});
 g.shotIndex++;
 return true;
}
function sweptPoint(a,b,c){const ab=sub(b,a),t=clamp(dot(sub(c,a),ab)/Math.max(1e-9,dot(ab,ab)),0,1);return len(sub(add(a,mul(ab,t)),c))}
function targetPoint(e){return V(e.x,1.54,e.z)}
function quality(g,p){
 const delta=sub(p.pos,g.eye),distance=len(delta);
 if(distance>1.18)return {ok:false,reason:'ESPERÁ',distance};
 if(distance<.19)return {ok:false,reason:'MUY TARDE',distance};
 const aimDistance=sweptPoint(g.eye,add(g.eye,mul(g.aim,Math.max(.25,distance)+.25)),p.pos);
 if(aimDistance>Math.max(.27,distance*.15))return {ok:false,reason:'APUNTÁ A LA ESFERA',distance,aimDistance};
 const perfect=distance>=.42&&distance<=.74&&aimDistance<.23;
 const graze=distance<.28||distance>1.02||aimDistance>.235;
 return {ok:true,grade:perfect?'PERFECTO':graze?'ROCE':'BUENO',distance,aimDistance};
}
function returnShot(g){
 if(g.state!=='playing'||g.paused)return {ok:false,reason:'NO DISPONIBLE'};
 if(g.elapsed-g.lastShotAt<.18)return {ok:false,reason:'ESPERÁ'};
 g.lastShotAt=g.elapsed;g.attempts++;
 const inbound=g.projectiles.filter(p=>!p.dead&&!p.returning&&p.type!=='fake');
 let best=null,bestResult=null;
 for(const p of inbound){
   const q=quality(g,p);
   if(!best||q.ok&&!bestResult.ok||q.ok===bestResult.ok&&q.distance<bestResult.distance){best=p;bestResult=q}
 }
 if(!best){g.lastResult='SIN ESFERA';return {ok:false,reason:'SIN ESFERA'}}
 if(!bestResult.ok){
  g.lastResult=bestResult.reason;
  g.effects.push({type:'early',t:g.elapsed,reason:bestResult.reason});
  return {ok:false,reason:bestResult.reason};
 }
 const grade=bestResult.grade;
 const target=g.enemies.find(e=>e.id===best.targetId&&e.alive)||activeEnemy(g);
 best.returning=true;best.age=0;best.prev=best.pos;best.bend=0;best.hasDouble=false;
 // Snapshot of the physical contact point for an actual ricochet ring and path.
 best.bounceFrom=V(best.pos.x,best.pos.y,best.pos.z);best.bounceGrade=grade;
 best.grade=grade;best.radius=grade==='PERFECTO'?.215:.16;best.targetEnemy=target?.id;
 best.speed=grade==='PERFECTO'?6.2:grade==='BUENO'?4.8:3.3;
 best.velocity=mul(norm(sub(target?targetPoint(target):V(0,1.5,-2.5),best.pos)),best.speed);
 g.returns++;g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);
 if(grade==='PERFECTO'){g.perfect++;g.perfectStreak++}else g.perfectStreak=0;
 if(grade==='ROCE')g.stats.grazed++;
 const comboBoost=1+Math.min(7,Math.floor(g.combo/3));
 const points=(grade==='PERFECTO'?175:grade==='BUENO'?90:40)*comboBoost;
 g.score+=points;g.lastResult=grade;
 if(g.perfectStreak===13){g.effects.push({type:'legend',t:g.elapsed});g.score+=1200}
 g.effects.push({type:'return',t:g.elapsed,grade,id:best.id,combo:g.combo,points,
  x:best.pos.x,y:best.pos.y,z:best.pos.z,
  incoming:V(-best.velocity.x,-best.velocity.y,-best.velocity.z),lane:best.lane||'CENTRO'});
 return {ok:true,grade,points,combo:g.combo,distance:bestResult.distance};
}
function damage(g,p){
 // A blocked hit still consumes its projectile; it must not collide again.
 p.dead=true;
 if(g.elapsed<g.protection)return;g.lives=Math.max(0,g.lives-1);g.combo=0;g.perfectStreak=0;g.protection=g.elapsed+.85;
 g.stats.missed++;g.effects.push({type:'damage',t:g.elapsed,lives:g.lives});
 if(!g.lives)finish(g,false,'sin_vidas');
}
function hitRobot(g,p,e){
 p.dead=true;
 const amount=(p.grade==='PERFECTO'?(g.perfectStreak===13?5:2):1)+(p.type==='explosiva'||p.type==='pesada'?1:0);
 const guard=e.boss?Math.sin(g.elapsed*1.75):0;
 if(e.boss&&guard>.96){
  p.dead=false;p.returning=false;p.age=0;p.prev=p.pos;p.type='veloz';p.radius=.19;
  p.velocity=mul(norm(sub(g.eye,p.pos)),2.65);p.speed=2.65;
  g.effects.push({type:'boss-parry',t:g.elapsed,x:e.x,z:e.z});return;
 }
 const shield=e.boss&&guard>.80;
 e.health-=shield?Math.max(1,amount-1):amount;e.damage=1-e.health/e.maxHealth;e.hitTime=g.elapsed;
 g.score+=shield?25:100*amount;
 g.effects.push({type:'enemy-hit',t:g.elapsed,x:e.x,z:e.z,boss:e.boss,shield,amount});
 if(e.health<=0){e.alive=false;g.enemiesKilled++;g.score+=e.boss?2500:400;
   g.effects.push({type:'enemy-down',t:g.elapsed,x:e.x,z:e.z,boss:e.boss});
   if(g.mode==='duelo'){
    g.duelWins++;
    // Give the player a breather and prevent orphaned shots hitting during a KO.
    g.projectiles.forEach(q=>{q.dead=true});
    g.delayed.length=0;g.nextShot=Infinity;
    g.protection=Math.max(g.protection,g.elapsed+2.1);
    g.effects.push({type:'duel-ko',t:g.elapsed,level:g.duelLevel,name:e.name});
    if(g.duelWins===DUEL_RIVALS.length){
     g.duelChampion=true;g.bossDefeated=true;finish(g,true,'seis_rivales');
    }else g.nextDuelAt=g.elapsed+2.15;
   }else if(e.boss){g.bossDefeated=true;finish(g,true,'jefe_derrotado')}
 }
}
function finish(g,win,reason){if(g.state==='finished')return;
 g.state='finished';g.reason=reason;g.victory=!!win;g.effects.push({type:win?'victory':'defeat',t:g.elapsed});
}
function step(g,dt){
 if(g.state!=='playing'||g.paused)return;
 g.elapsed+=dt;
 const oldPhase=g.phase;
 if(g.mode==='duelo'){
  g.phase=Math.min(4,g.duelLevel);
  if(g.elapsed>=DUEL_DURATION){finish(g,false,'tiempo');return}
  if(g.nextDuelAt!==null&&g.elapsed>=g.nextDuelAt){
   g.nextDuelAt=null;g.duelLevel++;
   g.enemies=g.enemies.filter(e=>e.alive);
   spawnEnemy(g,false);
   g.nextShot=g.elapsed+1.85;
   g.protection=Math.max(g.protection,g.elapsed+1.2);
  }
 }else{
  g.phase=phaseAt(g.elapsed);
  if(g.phase!==oldPhase){g.effects.push({type:'phase',t:g.elapsed,value:g.phase});if(g.phase===4){
     g.enemies=g.enemies.filter(e=>e.boss||!e.alive);
     spawnEnemy(g,true);g.bossSpawned=true;
  }}
  if(g.mode==='supervivencia'&&g.elapsed>DURATION){g.phase=4}
  if(g.elapsed>=DURATION&&g.mode!=='supervivencia'){finish(g,g.bossDefeated,'tiempo');return}
 }
 for(const e of g.enemies)if(e.alive){
  if(e.boss)e.shield=Math.sin(g.elapsed*1.75)>.80;
  const drift=g.mode==='duelo'?duelConfig(g).drift:Math.min(.48,.11+g.phase*.095);
  const tempo=g.mode==='duelo'?.45+g.duelLevel*.16:.65;
  e.x=e.homeX+Math.sin(g.elapsed*tempo+e.phase)*drift;
 }
 for(const d of [...g.delayed])if(g.elapsed>=d.at){
  const enemy=g.enemies.find(e=>e.id===d.targetId&&e.alive)||activeEnemy(g);
  const success=enemy&&g.projectiles.filter(p=>!p.dead&&!p.returning&&p.type!=='fake').length<2&&launch(g,d.type,enemy);
  if(success||!enemy||g.elapsed-d.created>3.5)g.delayed.splice(g.delayed.indexOf(d),1);
  else d.at=g.elapsed+.19;
 }
 if(g.elapsed>=g.nextShot){
   if(!activeEnemy(g)&&g.mode!=='duelo')spawnEnemy(g,g.phase===4);
   const ok=launch(g);
   g.nextShot=g.elapsed+(g.mode==='duelo'?duelConfig(g).interval:g.phase===0?3.0:g.phase===1?2.5:g.phase===2?2.08:g.phase===3?1.69:1.87);
   if(!ok)g.nextShot=g.elapsed+.27;
 }
 for(const p of g.projectiles){
  if(p.dead)continue;
  p.age+=dt;p.prev=p.pos;
  if(!p.returning&&p.type==='curva'){
   const offset=Math.sin(p.age*3.7+p.curvePhase)*p.bend;
   const toEye=norm(sub(g.eye,p.pos));const sideways=V(-toEye.z,0,toEye.x);
   p.velocity=mul(norm(add(toEye,mul(sideways,offset))),p.speed);
  }
  if(p.returning){
   const enemy=g.enemies.find(e=>e.id===p.targetEnemy&&e.alive);
   if(enemy)p.velocity=mul(norm(sub(targetPoint(enemy),p.pos)),p.speed);
  }
  p.pos=add(p.pos,mul(p.velocity,dt));
  if(p.type==='fake'){if(p.age>2.8)p.dead=true;continue}
  if(p.returning){
   const e=g.enemies.find(v=>v.id===p.targetEnemy&&v.alive);
   if(e&&sweptPoint(p.prev,p.pos,targetPoint(e))<.55+p.radius)hitRobot(g,p,e);
   else if(p.age>2.5)p.dead=true;
  }else{
   if(sweptPoint(p.prev,p.pos,g.eye)<.17+p.radius)damage(g,p);
   else if(p.age>6.5||len(sub(p.pos,g.eye))>8)p.dead=true;
  }
 }
 g.projectiles=g.projectiles.filter(p=>!p.dead);
 g.enemies=g.enemies.filter(e=>e.alive||g.elapsed-e.hitTime<1.15);
 g.effects=g.effects.filter(e=>g.elapsed-e.t<2.3);
}
function tick(g,dt){if(!Number.isFinite(dt)||dt<=0)return;
 g.acc+=clamp(dt,0,.15);let count=0;
 while(g.acc>=STEP&&count<18){step(g,STEP);g.acc-=STEP;count++;if(g.state!=='playing'){g.acc=0;break}}
}
function snapshot(g){return {state:g.state,phase:PHASES[g.phase],remaining:Math.max(0,Math.ceil((g.mode==='duelo'?DUEL_DURATION:DURATION)-g.elapsed)),
  mode:g.mode,duelLevel:g.duelLevel,duelWins:g.duelWins,duelTotal:DUEL_RIVALS.length,
  rival:g.mode==='duelo'?duelConfig(g).name:null,transition:g.mode==='duelo'&&g.nextDuelAt!==null,
  elapsed:g.elapsed,score:g.score,lives:g.lives,combo:g.combo,bestCombo:g.bestCombo,
  perfect:g.perfect,returns:g.returns,accuracy:g.returns?Math.round(g.perfect*100/g.returns):0,
  kills:g.enemiesKilled,victory:g.victory,reason:g.reason}}
const api=Object.freeze({make,begin,tick,setView,returnShot,quality,launch,spawnEnemy,phaseAt,sweptPoint,snapshot,laneAt,ATTACK_LANES,
 STEP,DURATION,DUEL_DURATION,DUEL_RIVALS,PHASES,TYPES,V,add,sub,mul,len,norm,clamp});
root.ReboteCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
