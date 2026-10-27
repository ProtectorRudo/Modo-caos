'use strict';
/* RODEADOS 360 · V18 mission rules. No XR or DOM dependencies.
 * Decorates the existing deterministic combat core rather than forking it.
 * Mode-specific logic owns objective/scoring and never changes the AR anchor.
 */
(function(root){
 const G=typeof module!=='undefined'&&module.exports?require('./rodeados-core.js'):root.RodeadosCore;
 if(!G)throw Error('RODEADOS core required before missions');
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const definitions={
  invasion:{duration:75,label:'INVASIÓN EN CASA',tip:'Resistí 75 segundos y detené la invasión'},
  loot:{duration:90,label:'BOTÍN MALDITO',tip:'Abrí cofres, volvé a la base y extraé tu botín'},
  timewarp:{duration:60,label:'TIEMPO ROTO',tip:'EMP ralentiza a los enemigos durante 3 segundos'},
  refuge:{duration:75,label:'EL ÚLTIMO REFUGIO',tip:'Defendé el reactor 75 segundos'},
  mutant:{duration:90,label:'CAOS MUTANTE',tip:'Una mutación distinta cada 15 segundos'},
  colossus:{duration:90,label:'COLOSOS 360',tip:'Derrotá a los 3 gigantes antes de que termine el tiempo'},
  ctf:{duration:150,label:'CAPTURA LA BANDERA',tip:'Robá la bandera y entregala en tu base tantas veces como puedas'}
 };
 Object.assign(G.MODES,definitions);
 const orig={create:G.create,reset:G.reset,advance:G.advance,fire:G.fire,pulse:G.pulse,movePlayer:G.movePlayer,spawn:G.spawn,copy:G.copy};
 const ring=(count=7)=>Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return {x:+(Math.sin(a)*3.35).toFixed(3),z:+(Math.cos(a)*3.35).toFixed(3)};});
 const point=(p,fallback,bound)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?
  {x:+clamp(p.x,-bound,bound).toFixed(3),z:+clamp(p.z,-bound,bound).toFixed(3)}:{...fallback};
 function normalizeFlagPlan(plan,arena=2.6){
  const limit=Math.max(.72,arena/2-.19);
  const base=point(plan?.base,{x:0,z:limit*.72},limit);
  let flag=point(plan?.flag,{x:0,z:-limit*.72},limit);
  if(d(base,flag)<.9)flag={x:0,z:base.z>0?-limit:limit};
  const spots=Array.isArray(plan?.spots)?plan.spots:ring(7);
  return {base,flag,kinds:(Array.isArray(plan?.kinds)?plan.kinds:[]).slice(0,7).map(v=>['basic','flanker','spider','creep','tank','random'].includes(v)?v:'random'),spots:spots.slice(0,7).map((p,i)=>{
    const fallback=ring(7)[i];
    const v=point(p,fallback,4.8),radius=Math.hypot(v.x,v.z);
    return radius<2.75?{x:+(v.x/(radius||1)*3.15).toFixed(3),z:+(v.z/(radius||1)*3.15).toFixed(3)}:v;
  }).concat(spots.length<6?ring(7).slice(spots.length,6):[])};
 }
 const boxCoords=[{x:-.83,z:-.88},{x:.0,z:-1.02},{x:.83,z:-.88},{x:-.73,z:.20},{x:.73,z:.20}];
 function setupMission(g,config={}){
  if(!definitions[g.mode])return g;
  const m={kind:g.mode,signal:'',event:0,completed:false,object:{x:0,z:-.65},base:{x:0,z:.75},
   captures:0,carry:false,flagDropped:0,dropAt:null,loot:0,extracted:0,crates:[],
   reactor:100,slowUntil:0,mutation:'NORMAL',mutationIndex:-1,
   bossIndex:0,bossPhase:1,spawnPoints:[],enemyCursor:0,bonus:0,locked:false,stations:[],pickupBlockedUntil:0,stormTick:-1};
  if(g.mode==='ctf'){
   m.plan=normalizeFlagPlan(config.flagPlan,g.arena);m.base={...m.plan.base};m.object={...m.plan.flag};
   m.spawnPoints=m.plan.spots.map(p=>({...p}));m.spawnTypes=m.plan.kinds.slice();m.configured=!!config.flagPlan?.confirmed;m.signal='ANDÁ A LA BANDERA ENEMIGA';
  }
  if(g.mode==='loot'){
   m.crates=boxCoords.map((p,i)=>({...p,id:i,opened:false}));
   m.base={x:0,z:.83};m.signal='DISPARÁ A LOS 5 COFRES';
  }
  if(g.mode==='refuge'){m.object={x:0,z:-.40};m.stations=[{x:-.96,z:-.82,active:false},{x:.96,z:-.82,active:false},{x:0,z:1.0,active:false}];m.signal='DEFENDÉ EL REACTOR Y ACTIVÁ 3 ESTACIONES'}
  if(g.mode==='colossus'){m.signal='GIGANTE 1 DE 3';g.creepIntroduced=true;g.spiderIntroduced=true;g.minotaurIntroduced=true;g.spawnClock=10000;}
  if(g.mode==='timewarp')m.signal='USÁ EMP PARA CONTROLAR EL TIEMPO';
  if(g.mode==='mutant')m.signal='MUTACIÓN EN 15 SEGUNDOS';
  if(g.mode==='invasion')m.signal='¡INVASIÓN INMINENTE!';
  // Other missions do not unexpectedly spawn scripted legacy boss waves.
  if(['loot','timewarp','refuge','mutant','ctf'].includes(g.mode)){
   g.creepIntroduced=true;g.minotaurIntroduced=true;
  }
  g.mission=m;return g;
 }
 G.create=function(config={}){return setupMission(orig.create(config),config)};
 G.reset=function(g,config={}){return G.create({...config,mode:config.mode||g.mode,arena:config.arena||g.arena,flagPlan:config.flagPlan||g.mission?.plan,ownerId:config.ownerId??g.ownerId})};
 G.copy=function(g){
  const data=orig.copy(g);
  if(g.mission)data.mission=JSON.parse(JSON.stringify(g.mission));
  return data;
 };
 function event(m,signal){if(m.signal!==signal){m.signal=signal;m.event++}}
 function grant(g,points){g.score+=points;g.mission.bonus+=points;g.fx.push({type:'mission',t:g.elapsed,points})}
 function missionWin(g,reason){if(g.phase!=='playing')return;g.mission.completed=true;G.finish(g,reason||'objetivo')}
 function spawnColossus(g){
  const m=g.mission;if(m.bossIndex>=3)return;
  const e=orig.spawn(g,'minotaur');if(!e)return;
  m.bossIndex++;e.portal=.65;
  e.hp=Math.round(15+8*m.bossIndex);e.maxHp=e.hp;e.stun=.6;
  e.missionBoss=true;m.bossPhase=1;
  event(m,'GIGANTE '+m.bossIndex+' DE 3 · APUNTÁ A SU CABEZA');
 }
 function assignSpawn(g,e){
  const m=g.mission;
  if(!m||e.missionAssigned)return;
  e.missionAssigned=true;
  if(m.kind==='ctf'&&m.spawnPoints.length){
   const p=m.spawnPoints[m.enemyCursor++%m.spawnPoints.length];
   // Maintain >=2.45m of separation from the tracked phone.
   // The exact user-confirmed world-space spawn, not a hidden random point.
   e.x=p.x;e.z=p.z;
   e.role=m.enemyCursor%3===0?'guardián':m.enemyCursor%3===1?'interceptor':'cazador';
  }
  if(m.kind==='invasion'){
   const a=(m.enemyCursor++%6)*Math.PI/3,gap=3.15;
   e.x=Math.sin(a)*gap;e.z=Math.cos(a)*gap;
  }
  if(m.kind==='mutant'&&m.mutation==='BLINDADOS'){
   e.hp=Math.max(1,Math.ceil(e.hp*1.7));e.maxHp=e.hp;
  }
 }
 function orientAwayFromPhone(g,e){
  const dx=e.x-g.player.x,dz=e.z-g.player.z,L=Math.hypot(dx,dz);
  if(L<2.45){e.x=g.player.x+dx/(L||1)*2.45;e.z=g.player.z+dz/(L||1)*2.45}
  e.angle=Math.atan2(g.player.x-e.x,g.player.z-e.z);
 }
 G.spawn=function(g,type){
  const m=g.mission;
  if(m?.kind==='ctf'&&m.spawnTypes?.length){const selected=m.spawnTypes[m.enemyCursor%m.spawnPoints.length];if(selected&&selected!=='random')type=selected}
  const e=orig.spawn(g,type);if(e&&m){assignSpawn(g,e);orientAwayFromPhone(g,e)}return e
 };
 G.movePlayer=function(g,p){return orig.movePlayer(g,p)};
 function objectiveDistance(g,point){return d(g.player,point)}
 function pickupOrDeliver(g){
  const m=g.mission;if(!m||m.kind!=='ctf')return;
  if(m.flagDropped&&g.elapsed>m.flagDropped){
   m.flagDropped=0;m.dropAt=null;event(m,'BANDERA DEVUELTA A LA BASE ENEMIGA');
  }
  if(!m.carry){
   const dest=m.dropAt||m.object;
   if(g.elapsed>=m.pickupBlockedUntil&&objectiveDistance(g,dest)<.52){
    m.carry=true;m.flagDropped=0;m.dropAt=null;event(m,'🚩 ¡BANDERA ROBADA! REGRESÁ A TU BASE');
    g.fx.push({type:'flagTake',t:g.elapsed,x:dest.x,z:dest.z});
   }
  }else if(objectiveDistance(g,m.base)<.55){
   m.carry=false;m.captures++;grant(g,650+m.captures*100);
   event(m,'🏆 ¡CAPTURA '+m.captures+'! VOLVÉ A BUSCAR LA BANDERA');
   g.fx.push({type:'flagScore',t:g.elapsed,x:m.base.x,z:m.base.z});
  }
 }
 const mutations=['FRENESÍ','BLINDADOS','PUNTOS DOBLES','RESTABLECIMIENTO','TORMENTA'];
 G.advance=function(g,dt){
  if(!g.mission)return orig.advance(g,dt);
  if(g.phase!=='playing'||g.paused)return g;
  dt=clamp(Number(dt)||0,0,.07);if(dt<=0)return g;
  const m=g.mission,life=g.lives,previous=new Map(g.enemies.map(e=>[e.id,{x:e.x,z:e.z,cd:e.attackCD}]));
  const oldPlayer={...g.player};
  if(m.kind==='colossus'){
   g.spawnClock=10000;
   if(!g.enemies.some(e=>e.missionBoss)&&m.bossIndex<3)spawnColossus(g);
  }
  if(m.kind==='refuge')g.player={...m.object};
  orig.advance(g,dt);
  g.player=oldPlayer;
  for(const e of g.enemies)if(!e.missionAssigned){
   if(m.kind==='ctf'&&m.spawnTypes?.length){const kind=m.spawnTypes[m.enemyCursor%m.spawnPoints.length];
    if(kind&&kind!=='random'&&G.TYPES[kind]){e.type=kind;const def=G.TYPES[kind];e.hp=def.hp;e.maxHp=def.hp;e.radius=def.radius;e.height=def.height}
   }
   assignSpawn(g,e);orientAwayFromPhone(g,e);
  }
  if(m.kind==='refuge'){
   // The reactor is the target; enough shield to endure a multi-enemy hit.
   const hurt=Math.max(0,life-g.lives);
   if(hurt){m.reactor=Math.max(0,m.reactor-hurt*1.65);g.lives=life;event(m,'⚠ NÚCLEO AL '+Math.ceil(m.reactor)+'%')}
   if(m.reactor<=0)G.finish(g,'reactor_destruido');
  }
  if(m.kind==='timewarp'&&g.elapsed<m.slowUntil){
   for(const e of g.enemies){const was=previous.get(e.id);if(!was)continue;
    e.x=was.x+(e.x-was.x)*.23;e.z=was.z+(e.z-was.z)*.23;
    e.attackCD=Math.max(e.attackCD,was.cd-dt*.23);
   }
   g.lives=Math.min(100,g.lives+(Math.max(0,life-g.lives)*.75));
  }
  if(m.kind==='mutant'){
   const index=Math.floor(g.elapsed/15);
   if(index!==m.mutationIndex){
    m.mutationIndex=index;m.mutation=index===0?'NORMAL':mutations[(index-1)%mutations.length];
    event(m,'⚡ MUTACIÓN: '+m.mutation);
    if(m.mutation==='RESTABLECIMIENTO')g.lives=Math.min(100,g.lives+18);
   }
   if(m.mutation==='TORMENTA'){
    const n=Math.floor(g.elapsed/4);
    if(n!==m.stormTick){m.stormTick=n;if(g.enemies.length<7)G.spawn(g,'fast')}
   }
   if(m.mutation==='FRENESÍ'){
    for(const e of g.enemies){const was=previous.get(e.id);if(was){
     e.x+=(e.x-was.x)*.35;e.z+=(e.z-was.z)*.35;orientAwayFromPhone(g,e);
    }}
   }
  }
  if(m.kind==='invasion'&&Math.floor(g.elapsed/25)>Math.floor((g.elapsed-dt)/25)){
   event(m,'🚨 BRECHA '+(1+Math.floor(g.elapsed/25))+' · MÁS ENEMIGOS');
   for(let k=0;k<2;k++)G.spawn(g,g.elapsed>=50?'creep':'flanker');
  }
  if(m.kind==='loot'){
   if(g.elapsed>=75&&m.loot&&m.signal!=='⚠ ÚLTIMOS 15 S · REGRESÁ A EXTRAER')event(m,'⚠ ÚLTIMOS 15 S · REGRESÁ A EXTRAER');
  }
  if(m.kind==='ctf'){
   if(!m.configured){g.paused=true;return g}
   const damaged=life-g.lives;
   if(m.carry&&damaged>=9){
    m.carry=false;m.dropAt={...g.player};m.flagDropped=g.elapsed+8;m.pickupBlockedUntil=g.elapsed+1.6;
    event(m,'¡BANDERA CAÍDA! RECUPERALA EN 8 S');
   }
   if(m.flagDropped&&g.elapsed>m.flagDropped){m.flagDropped=0;m.dropAt=null;event(m,'BANDERA DEVUELTA AL ORIGEN')}
   // Guards cover the enemy flag; interceptors cut the return route.
   for(const e of g.enemies){
    const target=e.role==='guardián'?m.object:e.role==='interceptor'&&m.carry?m.base:null;
    if(!target||e.portal>0||e.stun>0)continue;
    const dx=target.x-e.x,dz=target.z-e.z,D=Math.hypot(dx,dz)||1;
    e.x+=dx/D*.24*dt;e.z+=dz/D*.24*dt;orientAwayFromPhone(g,e);
   }
  }
  if(m.kind==='colossus'){
   const boss=g.enemies.find(e=>e.missionBoss);
   if(boss){
    const phase=boss.hp>boss.maxHp*.62?1:boss.hp>boss.maxHp*.27?2:3;
    if(phase>m.bossPhase){m.bossPhase=phase;event(m,'⚠ GIGANTE EN FASE '+phase);boss.stun=.25}
   }else if(m.bossIndex>=3)missionWin(g,'colosos_derrotados');
  }
  if(g.phase==='finished'&&g.finishedReason==='tiempo'){
   if(['invasion','refuge','timewarp','mutant','ctf'].includes(m.kind)&&g.lives>0&&
      (m.kind!=='refuge'||m.reactor>0&&m.stations.every(x=>x.active))&&
      (m.kind!=='ctf'||m.captures>0))m.completed=true;
  }
  return g;
 };
 function crateHit(m,ray){
  if(!ray?.origin||!ray?.direction)return null;
  const o=ray.origin,v=ray.direction,L=Math.hypot(v.x,v.y,v.z);
  if(!Number.isFinite(L)||L<.5)return null;
  let best=null;
  for(const box of m.crates){
   if(box.opened)continue;
   const dy=v.y/L,dx=v.x/L,dz=v.z/L;
   // Ray-sphere check: 50cm lock target floating above each supply crate.
   const cx=box.x- o.x,cy=.65-o.y,cz=box.z-o.z,t=(cx*dx+cy*dy+cz*dz);
   if(t<.15||t>12)continue;
   const miss=Math.hypot(cx-t*dx,cy-t*dy,cz-t*dz);
   if(miss<.34&&(!best||t<best.distance))best={box,distance:t};
  }
  return best;
 }
 G.fire=function(g,ray,shooter='vos'){
  const m=g.mission;
  if(m?.kind==='loot'&&g.phase==='playing'&&!g.paused){
   const hit=crateHit(m,ray),enemy=G.rayHit(g,ray?.origin,ray?.direction);
   if(hit&&(!enemy||hit.distance<enemy.distance)){
    const result=orig.fire(g,ray,shooter);
    if(!result.ok)return result;
    hit.box.opened=true;m.loot++;grant(g,250+m.loot*50);
    event(m,m.loot===5?'💰 BOTÍN COMPLETO · ¡REGRESÁ A TU BASE!':'📦 BOTÍN '+m.loot+'/5 · VOLVÉ O ARRIESGÁ MÁS');
    g.fx.push({type:'crateOpen',t:g.elapsed,x:hit.box.x,z:hit.box.z});
    return {ok:true,hit:true,crate:true,points:250+m.loot*50,distance:hit.distance};
   }
  }
  const before=g.kills,r=orig.fire(g,ray,shooter);
  if(r.ok&&r.killed&&m){
   if(m.kind==='colossus'&&g.kills>before&&m.bossIndex>=3&&!g.enemies.some(e=>e.missionBoss))missionWin(g,'colosos_derrotados');
   if(m.kind==='mutant'&&m.mutation==='PUNTOS DOBLES'&&r.points)grant(g,r.points);
  }
  return r;
 };
 G.pulse=function(g){
  const done=orig.pulse(g);
  if(done&&g.mission?.kind==='timewarp'){
   g.skillCooldown=13;
   g.mission.slowUntil=g.elapsed+3;
   event(g.mission,'⏳ TIEMPO ROTO · 3 SEGUNDOS');
  }
  return done;
 };
 G.missionAction=function(g){
  const m=g.mission;
  if(!m||g.phase!=='playing'||g.paused)return {ok:false,reason:'no_disponible'};
  if(m.kind==='loot'){
   if(!m.loot)return {ok:false,reason:'primero_abri_un_cofre'};
   if(objectiveDistance(g,m.base)>.53)return {ok:false,reason:'acercate_a_tu_base'};
   m.extracted=m.loot;grant(g,m.extracted*350);
   missionWin(g,'botin_extraido');return {ok:true,kind:'extraer',count:m.extracted};
  }
  if(m.kind==='refuge'){
   const station=m.stations.find(p=>!p.active&&objectiveDistance(g,p)<.46);
   if(!station)return {ok:false,reason:'acercate_a_una_estacion'};
   station.active=true;m.reactor=Math.min(100,m.reactor+8);grant(g,350);
   event(m,'⚡ ESTACIONES '+m.stations.filter(x=>x.active).length+'/3 ACTIVADAS');
   return {ok:true,kind:'activar',active:m.stations.filter(x=>x.active).length};
  }
  if(m.kind==='ctf'){
   if(!m.configured)return {ok:false,reason:'sin_configurar'};
   const carry=m.carry,captures=m.captures;
   pickupOrDeliver(g);
   if(carry===m.carry&&captures===m.captures)return {ok:false,reason:'acercate_al_objetivo'};
   return {ok:true,kind:'bandera',carrying:m.carry,captures:m.captures};
  }
  return {ok:false,reason:'no_disponible'};
 };
 G.missionStatus=function(g){
  const m=g.mission;if(!m)return null;
  const remain=Math.max(0,Math.ceil(g.duration-g.elapsed));
  switch(m.kind){
   case 'invasion':return {text:'PORTALES · OLEADA '+(g.wave||1),detail:m.signal};
   case 'loot':return {text:'BOTÍN '+m.loot+'/5 · '+remain+'s',detail:m.signal,button:'💰 EXTRAER',canAct:m.loot>0};
   case 'timewarp':return {text:g.elapsed<m.slowUntil?'⏳ TIEMPO ROTO ACTIVO':'⏳ ACTIVÁ EMP',detail:m.signal};
   case 'refuge':return {text:'REACTOR '+Math.ceil(m.reactor)+'% · '+m.stations.filter(x=>x.active).length+'/3',detail:m.signal,button:'⚡ ACTIVAR',canAct:true};
   case 'mutant':return {text:'⚡ '+m.mutation,detail:m.signal};
   case 'colossus':return {text:'COLOSOS '+Math.min(3,m.bossIndex)+'/3 · FASE '+m.bossPhase,detail:m.signal};
   case 'ctf':{
    const target=m.carry?m.base:(m.dropAt||m.object),dist=objectiveDistance(g,target);
    return {text:'🚩 CAPTURAS '+m.captures+' · '+dist.toFixed(1)+' m',detail:dist<.55?(m.carry?'✅ ESTÁS EN TU BASE · ENTREGÁ':'✅ BANDERA CERCA · RECOGÉ'):m.carry?'REGRESÁ A TU BASE · '+m.signal:'BUSCÁ LA BANDERA · '+m.signal,button:m.carry?'🚩 ENTREGAR':'🚩 RECOGER',canAct:dist<.55};
   }
  }
  return null;
 };
 G.configureFlagPlan=function(g,plan){
  if(!g.mission||g.mode!=='ctf'||g.phase!=='ready')return {ok:false,reason:'fuera_de_preparacion'};
  const valid=validateFlagPlan(plan,g.arena);
  if(!valid.ok)return valid;
  const p=normalizeFlagPlan(plan,g.arena),m=g.mission;
  m.plan={...p,confirmed:true};m.base={...p.base};m.object={...p.flag};
  m.spawnPoints=p.spots.map(v=>({...v}));m.spawnTypes=p.kinds.slice();m.configured=true;m.enemyCursor=0;
  event(m,'CAMPO CONFIRMADO · '+p.spots.length+' PUNTOS ENEMIGOS');return {ok:true,plan:m.plan}
 };
 function validateFlagPlan(plan,arena){
  if(!plan||!Number.isFinite(plan.base?.x)||!Number.isFinite(plan.base?.z)||!Number.isFinite(plan.flag?.x)||!Number.isFinite(plan.flag?.z))
   return {ok:false,reason:'falta_base_o_bandera'};
  if(!Array.isArray(plan.spots)||![6,7].includes(plan.spots.length))return {ok:false,reason:'elegi_6_o_7_spawns'};
  const bound=arena/2-.08;
  if(Math.max(Math.abs(plan.base.x),Math.abs(plan.base.z),Math.abs(plan.flag.x),Math.abs(plan.flag.z))>bound)
   return {ok:false,reason:'base_o_bandera_fuera_del_tablero'};
  if(d(plan.base,plan.flag)<1.0)return {ok:false,reason:'separa_base_y_bandera'};
  for(let i=0;i<plan.spots.length;i++){
   const p=plan.spots[i];if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z)||Math.max(Math.abs(p.x),Math.abs(p.z))>5.1)return {ok:false,reason:'spawn_fuera_del_mundo'};
   if(d(p,plan.base)<2.65)return {ok:false,reason:'spawn_muy_cerca_de_la_base'};
   if(plan.spots.slice(0,i).some(x=>d(x,p)<.40))return {ok:false,reason:'separa_puntos_enemigos'};
  }
  return {ok:true};
 }
 G.validateFlagPlan=validateFlagPlan;
 G.normalizeFlagPlan=normalizeFlagPlan;
 G.MISSION_DEFINITIONS=definitions;
 if(typeof module!=='undefined'&&module.exports)module.exports=G;
 root.RodeadosCore=G;
})(typeof globalThis!=='undefined'?globalThis:this);
