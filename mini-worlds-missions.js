/* MINI WORLDS — fully deterministic rescue/defense/heist mission layer.
 * Pure JS, no WebGL / DOM / AR dependencies. Never reanchors a room.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 root.MiniWorldsMissions=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const MISSIONS=Object.freeze([
 Object.freeze({id:0,title:'RESCATE EN EL VACÍO',short:'RESCATÁ Y ESCAPÁ',subtitle:'Rescatá a dos habitantes y encendé el portal antes de que el Vacío avance.',steps:Object.freeze(['Encontrá y rescatá a LUMI y FLOR en las islas.','Apuntá y dispará a las dos balizas para activarlas.','Volvé al portal de extracción y escapá a tiempo.']),bonus:'EXTRA: rescatá también a NIX y ganá más estrellas.',level:0,seconds:260,icon:'🦊'}),
 Object.freeze({id:1,title:'DEFENDÉ EL CORAZÓN',short:'SOBREVIVÍ A 3 OLEADAS',subtitle:'El reactor está bajo ataque. Protegelo: si pierde toda su energía, perdés.',steps:Object.freeze(['Derrotá a los enemigos antes de que lleguen al reactor.','Resistí las tres oleadas durante 65 segundos.','Regresá al corazón del mundo para asegurar la victoria.']),bonus:'EXTRA: rescatá al técnico y conservá la energía del reactor.',level:1,seconds:90,icon:'💠'}),
 Object.freeze({id:2,title:'EL LADRÓN DE CRISTALES',short:'RECUPERÁ LOS 3 FRAGMENTOS',subtitle:'Robaron tres cristales. Sin ellos el jefe no puede ser derrotado.',steps:Object.freeze(['Encontrá y derrotá a los tres guardianes de cristales.','Recogé cada cristal que hayan soltado.','Con los tres reunidos, enfrentá y derrotá al jefe.']),bonus:'EXTRA: rescatá al explorador PIPA y terminá con tres corazones.',level:1,seconds:300,icon:'⚡'})
]);
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
function emit(s,type,fields){s.mission.events.push({type,...fields})}
function resident(id,name,x,z,y,optional=false){return {id,name,x,z,y,rescued:false,optional}}
const waveSpawns=Object.freeze([{x:-.7,z:-.45},{x:3.15,z:-3.40},{x:-.52,z:-6.55}]);
function init(s,id=0){
 if(!s?.map||!s?.player)throw Error('Mission requires active platformer state');
 const def=MISSIONS[id];if(!def)throw Error('Unknown mission '+id);
 const m=s.mission={
  id,def,events:[],rescues:[],fragments:[],relays:[],completed:false,failed:false,
  reactor:null,wave:0,waveClock:0,seconds:def.seconds,exit:{x:-.45,z:-18.9,y:1.18,active:false},
  damageTaken:0
 };
 if(id===0){
  s.map.boss.alive=false; // Boss fight belongs to the heist mission only.
  m.rescues=[
   resident('explorer','LUMI',3.18,-3.42,.22),
   resident('gardener','FLOR',-3.05,-9.50,.55),
   resident('astronomer','NIX',-3.25,-18.87,1.18,true)
  ];
  m.relays=[0,1];
 }else if(id===1){
  s.map.boss.alive=false;
  s.player.x=-1.0;s.player.z=-2.9;s.player.y=.22;
  s.checkpoint={x:-1.0,z:-2.9,y:.22};
  m.rescues=[resident('technician','TUCO',3.2,-3.42,.22,true)];
  m.reactor={x:.2,z:-3.30,y:.22,health:12,maxHealth:12,pressure:0};
  m.exit={x:.2,z:-3.30,y:.22,active:false};
  s.map.enemies.forEach(e=>{e.alive=false;e.armed=false;e.attack=0;e.stun=0});
 }else{
  m.rescues=[resident('scout','PIPA',3.28,-20.15,1.15,true)];
  m.guards=[0,3,8];
  m.fragments=m.guards.map(id=>{
   const e=s.map.enemies[id];
   return {id,x:e.x,z:e.z,y:e.y+.65,dropped:false,claimed:false};
  });
  s.map.boss.invuln=10; // Cannot defeat the boss before recovering the stolen cores.
  m.exit={x:0,z:-22.7,y:1.15,active:false};
 }
 return m;
}
function sendWave(s,wave){
 const m=s.mission;if(!m||m.id!==1||m.wave>=wave||wave>3)return;
 m.wave=wave;m.waveClock=0;
 for(let i=0;i<3;i++){
  const e=s.map.enemies[(wave-1)*3+i],sp=waveSpawns[(i+wave-1)%3];
  e.x=sp.x;e.z=sp.z;e.baseX=sp.x;e.baseZ=sp.z;
  e.hp=e.type==='defender'?3:2;e.alive=true;e.attack=0;e.stun=.65;e.flash=0;e.armed=false;e.t=0;
 }
 emit(s,'missionWave',{wave});
}
function defeat(s,reason){
 const m=s.mission;if(!m||m.completed||m.failed)return;
 m.failed=true;m.failReason=reason;s.phase='failed';emit(s,'missionFail',{reason});
}
function win(s){
 const m=s.mission;if(!m||m.completed||m.failed)return;
 m.completed=true;m.exit.active=true;s.phase='won';s.won=true;
 emit(s,'missionWin',{id:m.id,medal:medal(s),rescued:m.rescues.filter(r=>r.rescued).map(r=>r.id)});
}
function tick(s,dt){
 const m=s?.mission;if(!m)return;
 if(s.phase==='won'&&m.id===2&&!m.completed){
  if(m.fragments.every(f=>f.claimed)){m.completed=true;emit(s,'missionWin',{id:m.id,medal:medal(s),rescued:m.rescues.filter(r=>r.rescued).map(r=>r.id)})}
  return;
 }
 if(s.phase!=='playing'||m.failed||m.completed)return;
 if(s.clock>=m.seconds)return defeat(s,'SE AGOTÓ EL TIEMPO');
 for(const r of m.rescues){
  if(!r.rescued&&near(s.player,r,.88)&&Math.abs(s.player.y-r.y)<1.65){
   r.rescued=true;emit(s,'missionRescue',{id:r.id,name:r.name,x:r.x,y:r.y,z:r.z,optional:r.optional});
  }
 }
 if(m.id===0){
  const rescueCount=m.rescues.filter(r=>r.rescued).length;
  const relays=m.relays.filter(i=>s.map.runes[i].restored).length;
  const ready=rescueCount>=2&&relays===2;
  if(ready&&!m.exit.active){m.exit.active=true;emit(s,'missionExitOpen',{x:m.exit.x,y:m.exit.y,z:m.exit.z})}
  if(ready&&near(s.player,m.exit,1.05)&&Math.abs(s.player.y-m.exit.y)<1.65)win(s);
 }else if(m.id===1){
  // Enemies really walk toward the reactor on the same collidable platforms
  // where the blaster hits are evaluated by the existing core.
  const wave=Math.min(3,Math.floor(s.clock/22)+1);
  if(wave>m.wave)sendWave(s,wave);
  const reactor=m.reactor;
  for(let i=0;i<m.wave*3;i++){
   const e=s.map.enemies[i];if(!e.alive)continue;
   const dist=Math.hypot(e.x-reactor.x,e.z-reactor.z);
   if(dist>0.001&&e.stun<=0){
    const speed=(.39+.055*m.wave)*dt;
    e.x+=(reactor.x-e.x)/dist*speed;e.z+=(reactor.z-e.z)/dist*speed;
   }
   if(dist<.73){
    // Each attacker deals exactly one hit, then is knocked back to its
    // original spawn; no invisible damage-over-time while player is absent.
    reactor.health--;
    emit(s,'missionReactorHit',{health:reactor.health,x:reactor.x,y:reactor.y,z:reactor.z});
    const spawn=waveSpawns[(i+m.wave-1)%3];
    e.x=spawn.x;e.z=spawn.z;e.baseX=e.x;e.baseZ=e.z;e.stun=.85;
    if(reactor.health<=0)return defeat(s,'EL REACTOR FUE DESTRUIDO');
   }
  }
  if(s.clock>=65&&!m.exit.active){m.exit.active=true;emit(s,'missionExitOpen',{x:reactor.x,y:reactor.y,z:reactor.z})}
  if(m.exit.active&&near(s.player,m.exit,1.1))win(s);
 }else{
  for(const f of m.fragments){
   const guard=s.map.enemies[f.id];
   if(!guard.alive&&!f.dropped){
    f.dropped=true;f.x=guard.x;f.z=guard.z;
    f.y=(s.map.platforms.reduce((a,p)=>{
      const xx=Math.max(p.x-p.w/2,Math.min(f.x,p.x+p.w/2));
      const zz=Math.max(p.z-p.d/2,Math.min(f.z,p.z+p.d/2));
      return Math.hypot(xx-f.x,zz-f.z)<a.dist?{dist:Math.hypot(xx-f.x,zz-f.z),y:p.y}:a;
    },{dist:1e4,y:0})).y+.67;
    emit(s,'missionFragmentDrop',{id:f.id,x:f.x,y:f.y,z:f.z});
   }
   if(f.dropped&&!f.claimed&&near(s.player,f,.82)&&Math.abs(s.player.y+.55-f.y)<1.5){
    f.claimed=true;emit(s,'missionFragment',{id:f.id,x:f.x,y:f.y,z:f.z});
   }
  }
  const all=m.fragments.every(f=>f.claimed);
  if(!all)s.map.boss.invuln=Math.max(1.5,s.map.boss.invuln);
  else if(!m.exit.active){m.exit.active=true;s.map.boss.invuln=0;emit(s,'missionBossUnlocked',{})}
 }
}
function medal(s){
 const m=s.mission;if(!m)return 0;
 const main=m.id===0?(m.rescues.filter(r=>r.rescued).length>=2&&m.relays.every(i=>s.map.runes[i].restored)):
  m.id===1?(m.reactor.health>0&&s.clock>=65):m.fragments.every(f=>f.claimed);
 if(!main)return 0;
 let stars=1;
 if(m.id===0?m.rescues.length===3&&m.rescues.every(r=>r.rescued):
    m.id===1?m.reactor.health>=7:m.rescues.every(r=>r.rescued))stars++;
 if(m.id===0?s.clock<185:m.id===1?m.reactor.health===m.reactor.maxHealth:s.player.hearts===3&&s.clock<240)stars++;
 return stars;
}
function status(s){
 const m=s?.mission;if(!m)return '';
 if(m.id===0){
  const r=m.rescues.filter(x=>x.rescued).length,relays=m.relays.filter(i=>s.map.runes[i].restored).length;
  return m.exit.active?'PORTAL ABIERTO · ESCAPÁ': 'RESCATES '+r+'/2 · BALIZAS '+relays+'/2';
 }
 if(m.id===1)return m.exit.active?'¡REACTOR SALVADO! · VOLVÉ AL NÚCLEO':'REACTOR '+m.reactor.health+'/12 · OLEADA '+m.wave+'/3';
 return m.exit.active?'¡JEFE VULNERABLE! · DERROTALO':'CRISTALES '+m.fragments.filter(f=>f.claimed).length+'/3 · VENCÉ A LOS LADRONES';
}
// Next actionable target lives in the same logical world as collisions.
// Guidance is only a hint; missions never auto-complete when an arrow points.
function guidance(s){
 const m=s?.mission,p=s?.player;if(!m||!p)return null;
 function closest(items){return items.reduce((a,b)=>{
  const d=Math.hypot(b.x-p.x,b.z-p.z);
  return d<(a?.dist??Infinity)?{...b,dist:d}:a;
 },null)}
 let target=null;
 if(m.id===0){
  if(m.exit.active)target={...m.exit,label:'ENTRÁ AL PORTAL'};
  else{
   const missing=m.rescues.filter(r=>!r.rescued&&!r.optional);
   if(missing.length)target=closest(missing.map(r=>({...r,label:'RESCATÁ A '+r.name})));
   else{
    const unlit=m.relays.filter(id=>!s.map.runes[id].restored).map(id=>({...s.map.runes[id],label:'ACTIVÁ LA BALIZA'}));
    target=closest(unlit);
   }
  }
 }else if(m.id===1){
  const nearby=s.map.enemies.slice(0,m.wave*3).filter(e=>e.alive);
  const danger=closest(nearby.map(e=>({...e,label:'DETENÉ AL INVASOR'})));
  target=m.exit.active?{...m.exit,label:'VOLVÉ AL REACTOR'}:danger||{...m.reactor,label:'PROTEGÉ EL REACTOR'};
 }else{
  const dropped=m.fragments.filter(f=>f.dropped&&!f.claimed).map(f=>({...f,label:'RECOGÉ EL CRISTAL'}));
  const guards=m.fragments.filter(f=>!f.dropped).map(f=>{
   const e=s.map.enemies[f.id];return {...e,label:'DERROTÁ AL GUARDIÁN'};
  });
  target=closest(dropped)||closest(guards)||{...s.map.boss,label:'ENFRENTÁ AL JEFE'};
 }
 if(!target)return null;
 const dx=target.x-p.x,dz=target.z-p.z,dist=Math.hypot(dx,dz);
 const heading=Math.atan2(dx,dz)-p.face;
 const theta=Math.atan2(Math.sin(heading),Math.cos(heading));
 const arrows=['↑','↗','→','↘','↓','↙','←','↖'];
 const arrow=arrows[(Math.round(theta/(Math.PI/4))+8)%8];
 return {label:target.label,arrow,near:dist<2.1,distance:dist};
}
function drain(s){return s?.mission?.events.splice(0)||[]}
return Object.freeze({MISSIONS,init,tick,drain,medal,status,guidance,win,defeat});
});
