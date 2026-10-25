'use strict';
/* REBOTE MORTAL — simulation deterministic, independiente de WebXR y gráficos.
   Todas las unidades son metros y segundos. STEP fijo, colisiones barridas para FPS bajos. */
(function(root){
const V=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z),
 sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a,s)=>V(a.x*s,a.y*s,a.z*s),
 dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,len=a=>Math.hypot(a.x,a.y,a.z),
 norm=a=>mul(a,1/Math.max(1e-8,len(a))),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const STEP=1/90,DURATION=88,PHASES=['APRENDIZ','RITMO','REFLEJOS','CAOS','JEFE FINAL'];
const TIMINGS=[14,28,45,62,88];
const TYPES=['normal','veloz','curva','pesada','doble','fantasma','explosiva'];
function random(g){let x=g.seed>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;g.seed=x>>>0;return g.seed/4294967296}
function make(opts={}){
 const seed=(Number(opts.seed)>>>0)||0xCA052026,mode=['clasico','supervivencia','precision','caos'].includes(opts.mode)?opts.mode:'clasico';
 return {seed,initialSeed:seed,mode,state:'ready',elapsed:0,acc:0,paused:false,phase:0,
  lives:3,score:0,combo:0,perfectStreak:0,bestCombo:0,perfect:0,returns:0,attempts:0,
  enemiesKilled:0,shotIndex:0,nextShot:2.25,projectiles:[],delayed:[],enemies:[],effects:[],
  eye:V(0,1.55,.05),aim:V(0,0,-1),enemyId:0,projectileId:0,
  protection:0,lastResult:'',reason:'',bossSpawned:false,bossDefeated:false,stats:{missed:0,grazed:0},lastShotAt:-100};
}
function begin(g){if(g.state!=='ready')return false;g.state='playing';g.nextShot=2.25;spawnEnemy(g,false);return true}
function setView(g,eye,dir){
 if(!eye||!dir||![eye.x,eye.y,eye.z,dir.x,dir.y,dir.z].every(Number.isFinite))return;
 if(len(dir)<.1)return;
 const next=V(clamp(eye.x,-6,6),clamp(eye.y,.7,2.3),clamp(eye.z,-6,6));
 if(len(sub(next,g.eye))<1.15)g.eye=next;
 g.aim=norm(dir);
}
function phaseAt(t){return t<14?0:t<28?1:t<45?2:t<62?3:4}
function typeAt(g){
 const p=g.phase,r=random(g);
 if(p===0)return 'normal';
 if(p===1)return r<.64?'normal':'veloz';
 if(p===2)return r<.34?'normal':r<.57?'curva':r<.77?'pesada':'doble';
 if(p===3)return r<.27?'veloz':r<.47?'curva':r<.63?'explosiva':r<.81?'fantasma':'doble';
 return r<.20?'pesada':r<.42?'curva':r<.64?'veloz':r<.82?'explosiva':'normal';
}
function spawnEnemy(g,boss=false){
 const idx=g.enemyId++,side=Math.sin(idx*2.3)*(g.phase===3?2.0:g.phase>=2?1.07:.43);
 const z=g.phase===3?-1.84+(idx%3)*-.18:-2.65+(idx%3)*-.21;
 const e={id:idx,boss,x:side,z,homeX:side,health:boss?11:g.phase<2?3:4,
   maxHealth:boss?11:g.phase<2?3:4,damage:0,hitTime:-10,shield:false,alive:true,
   phase:idx*.76,stagger:0.0};
 g.enemies.push(e);g.effects.push({type:boss?'boss':'spawn',t:g.elapsed,x:e.x,z:e.z});
 return e;
}
function activeEnemy(g){return g.enemies.find(e=>e.alive&&e.boss)||g.enemies.find(e=>e.alive)}
function launch(g,type=typeAt(g),target=activeEnemy(g)){
 if(!target)return false;
 const inbound=g.projectiles.filter(p=>!p.returning&&!p.dead&&p.type!=='fake');
 const limit=g.phase<2?1:g.phase<4?2:2;
 if(inbound.length>=limit)return false;
 if(inbound.some(p=>len(sub(p.pos,g.eye))<1.25))return false;
 const origin=V(target.x+(Math.sin(g.shotIndex*1.76)*.16),1.53,target.z+.08);
 const destination=add(g.eye,V(Math.sin(g.shotIndex*1.71)*(.08+(g.phase>2?.12:0)),0,0));
 const direction=norm(sub(destination,origin));
 const speed=type==='pesada'?1.65:type==='veloz'?3.65:g.phase===0?1.67:g.phase===1?2.0:g.phase===2?2.45:2.72;
 const id=++g.projectileId;
 const p={id,type,pos:origin,prev:origin,velocity:mul(direction,speed),speed,
   radius:type==='pesada'?.22:.17,age:0,returning:false,dead:false,targetId:target.id,
   bend:type==='curva'?.22:0,curvePhase:random(g)*6.28,hit:false,warning:0.50,hasDouble:type==='doble'};
 g.projectiles.push(p);
 if(type==='doble')g.delayed.push({at:g.elapsed+1.12,type:'normal',targetId:target.id});
 if(type==='fantasma'){
  const fake={...p,id:++g.projectileId,type:'fake',pos:add(origin,V(.32,0,0)),prev:add(origin,V(.32,0,0)),radius:.125,hasDouble:false};
  g.projectiles.push(fake);
 }
 g.effects.push({type:'launch',t:g.elapsed,id,x:origin.x,z:origin.z,style:type});
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
 g.effects.push({type:'return',t:g.elapsed,grade,id:best.id,combo:g.combo,points});
 return {ok:true,grade,points,combo:g.combo,distance:bestResult.distance};
}
function damage(g,p){
 if(g.elapsed<g.protection)return;
 p.dead=true;g.lives=Math.max(0,g.lives-1);g.combo=0;g.perfectStreak=0;g.protection=g.elapsed+.85;
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
   if(e.boss){g.bossDefeated=true;finish(g,true,'jefe_derrotado')}
 }
}
function finish(g,win,reason){if(g.state==='finished')return;
 g.state='finished';g.reason=reason;g.victory=!!win;g.effects.push({type:win?'victory':'defeat',t:g.elapsed});
}
function step(g,dt){
 if(g.state!=='playing'||g.paused)return;
 g.elapsed+=dt;
 const oldPhase=g.phase;g.phase=phaseAt(g.elapsed);
 if(g.phase!==oldPhase){g.effects.push({type:'phase',t:g.elapsed,value:g.phase});if(g.phase===4){
    g.enemies=g.enemies.filter(e=>e.boss||!e.alive);
    spawnEnemy(g,true);g.bossSpawned=true;
 }}
 if(g.mode==='supervivencia'&&g.elapsed>DURATION){g.phase=4}
 if(g.elapsed>=DURATION&&g.mode!=='supervivencia'){finish(g,g.bossDefeated,'tiempo');return}
 for(const e of g.enemies)if(e.alive&&!e.boss){
   e.x=e.homeX+Math.sin(g.elapsed*.65+e.phase)*Math.min(.48,.11+g.phase*.095);
 }
 for(const d of [...g.delayed])if(g.elapsed>=d.at){
  const enemy=g.enemies.find(e=>e.id===d.targetId&&e.alive)||activeEnemy(g);
  if(enemy&&g.projectiles.filter(p=>!p.dead&&!p.returning&&p.type!=='fake').length<2)launch(g,d.type,enemy);
  g.delayed.splice(g.delayed.indexOf(d),1);
 }
 if(g.elapsed>=g.nextShot){
   if(!activeEnemy(g))spawnEnemy(g,g.phase===4);
   const ok=launch(g);g.nextShot=g.elapsed+(g.phase===0?3.0:g.phase===1?2.5:g.phase===2?2.08:g.phase===3?1.69:1.87);
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
function snapshot(g){return {state:g.state,phase:PHASES[g.phase],remaining:Math.max(0,Math.ceil(DURATION-g.elapsed)),
  elapsed:g.elapsed,score:g.score,lives:g.lives,combo:g.combo,bestCombo:g.bestCombo,
  perfect:g.perfect,returns:g.returns,accuracy:g.returns?Math.round(g.perfect*100/g.returns):0,
  kills:g.enemiesKilled,victory:g.victory,reason:g.reason}}
const api=Object.freeze({make,begin,tick,setView,returnShot,quality,launch,spawnEnemy,phaseAt,sweptPoint,snapshot,
 STEP,DURATION,PHASES,TYPES,V,add,sub,mul,len,norm,clamp});
root.ReboteCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
