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
  loot:{duration:120,label:'BOTÍN MALDITO',tip:'Recorré tus 5 cofres, abrilos y regresá a extraer antes de que se acabe el tiempo'},
  timewarp:{duration:75,label:'TIEMPO ROTO',tip:'Congelación y rebote temporal cada 12 segundos, más un poder manual.'},
  refuge:{duration:75,label:'EL ÚLTIMO REFUGIO',tip:'Defendé el reactor 75 segundos'},
  mutant:{duration:90,label:'CAOS MUTANTE',tip:'Una mutación distinta cada 15 segundos'},
  colossus:{duration:90,label:'COLOSOS 360',tip:'Derrotá a los 3 gigantes antes de que termine el tiempo'},
  ctf:{duration:150,label:'CAPTURA LA BANDERA',tip:'Robá la bandera y entregala en tu base tantas veces como puedas'},
  rescue:{duration:420,label:'RESCATE DEL REHÉN',tip:'LIBERÁ al rehén y escoltalo a tu base. ¡10 niveles!'}
 };
 Object.assign(G.MODES,definitions);
 const orig={create:G.create,reset:G.reset,advance:G.advance,fire:G.fire,pulse:G.pulse,movePlayer:G.movePlayer,spawn:G.spawn,copy:G.copy};
 const ring=(count=7)=>Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return {x:+(Math.sin(a)*3.35).toFixed(3),z:+(Math.cos(a)*3.35).toFixed(3)};});
 const point=(p,fallback,bound)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?
  {x:+clamp(p.x,-bound,bound).toFixed(3),z:+clamp(p.z,-bound,bound).toFixed(3)}:{...fallback};
 function normalizeFlagPlan(plan,arena=2.6){
  const limit=Math.max(.72,arena/2-.08);
  const base=point(plan?.base,{x:0,z:0},limit);
  // Flag is OUTSIDE the home board, world-anchored at the exact point selected.
  const flag=point(plan?.flag,{x:0,z:-3.3},8);
  const spots=Array.isArray(plan?.spots)?plan.spots:ring(7);
  return {base,flag,kinds:(Array.isArray(plan?.kinds)?plan.kinds:[]).slice(0,7).map(v=>v==='creep'?'spider':['basic','flanker','spider','tank','random'].includes(v)?v:'random'),spots:spots.slice(0,7).map((p,i)=>{
    const fallback=ring(7)[i];
    return point(p,fallback,8);
  }).concat(spots.length<6?ring(7).slice(spots.length,6):[])};
 }
 const boxCoords=[{x:-.83,z:-.88},{x:.0,z:-1.02},{x:.83,z:-.88},{x:-.73,z:.20},{x:.73,z:.20}];
 // Enemy guard positions orbit PLAYER-PLACED chest locations, not the player's feet.
 // All points remain in anchored arena coordinates, never in camera/HUD space.
 function lootGuardPoints(plan){
  const spots=[];
  for(let i=0;i<7;i++){
   const box=plan.crates[i%plan.crates.length],a=(i*.81+2.3)*Math.PI/2;
   let x=box.x+Math.cos(a)*1.5,z=box.z+Math.sin(a)*1.5;
   let d0=Math.hypot(x-plan.base.x,z-plan.base.z);
   if(d0<3.1){const dx=box.x-plan.base.x,dz=box.z-plan.base.z,L=Math.hypot(dx,dz)||1;
    x=plan.base.x+dx/L*3.45;z=plan.base.z+dz/L*3.45;}
   x=clamp(x,-7.8,7.8);z=clamp(z,-7.8,7.8);
   if(spots.some(p=>d(p,{x,z})<.7)){x=clamp(x+.65,-7.8,7.8);z=clamp(z+.55,-7.8,7.8)}
   spots.push({x:+x.toFixed(2),z:+z.toFixed(2)});
  }
  return spots;
 }
 function validateLootPlan(plan,arena=2.6){
  if(!plan||!Number.isFinite(plan.base?.x)||!Number.isFinite(plan.base?.z))return {ok:false,reason:'falta_base'};
  if(Math.max(Math.abs(plan.base.x),Math.abs(plan.base.z))>arena/2-.08)return {ok:false,reason:'base_fuera_de_la_pista'};
  if(!Array.isArray(plan.crates)||plan.crates.length!==5)return {ok:false,reason:'marca_cinco_botines'};
  for(let i=0;i<5;i++){
   const p=plan.crates[i];
   if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z)||Math.max(Math.abs(p.x),Math.abs(p.z))>8)return {ok:false,reason:'botin_fuera_de_rango'};
   if(d(p,plan.base)<2.35)return {ok:false,reason:'botin_demasiado_cerca_de_tu_base'};
   if(plan.crates.slice(0,i).some(q=>d(q,p)<.85))return {ok:false,reason:'separa_los_botines'};
  }
  return {ok:true};
 }
 function setupMission(g,config={}){
  if(!definitions[g.mode])return g;
  const m={kind:g.mode,signal:'',event:0,completed:false,object:{x:0,z:-.65},base:{x:0,z:.75},
   captures:0,carry:false,flagDropped:0,dropAt:null,loot:0,extracted:0,crates:[],
   reactor:100,slowUntil:0,timePhase:'NORMAL',phaseRemaining:6,timeCycles:0,mutation:'NORMAL',mutationIndex:-1,
   bossIndex:0,bossPhase:1,spawnPoints:[],enemyCursor:0,bonus:0,locked:false,stations:[],pickupBlockedUntil:0,stormTick:-1};
  if(g.mode==='ctf'){
   m.plan=normalizeFlagPlan(config.flagPlan,g.arena);m.base={...m.plan.base};m.object={...m.plan.flag};
   m.spawnPoints=m.plan.spots.map(p=>({...p}));m.spawnTypes=m.plan.kinds.slice();m.configured=!!config.flagPlan?.confirmed;m.signal='ANDÁ A LA BANDERA ENEMIGA';
  }
  if(g.mode==='rescue'){
    m.level=1;m.rescued=0;m.carry=false;m.hostageHealth=100;m.levelDeadline=0;
    m.hostageActive=false;m.hostageLost=false;m.nextLevelAt=0;m.phase='RESCATÁ';
    m.spawnPoints=[];m.spawnTypes=[];m.enemyCursor=0;
    m.base={x:0,z:0};m.object={x:0,z:-3};
    m.signal='NIVEL 1/10 · LOCALIZÁ AL REHÉN';
   }
   if(g.mode==='loot'){
   const plan=config.lootPlan,valid=validateLootPlan(plan,g.arena);
   m.configured=!!plan?.confirmed&&valid.ok;
   m.base=m.configured?{x:plan.base.x,z:plan.base.z}:{x:0,z:0};
   m.crates=m.configured?plan.crates.map((p,i)=>({x:p.x,z:p.z,id:i,opened:false})):[];
   m.spawnPoints=m.configured?lootGuardPoints(plan):[];
   m.spawnTypes=[];m.enemyCursor=0;
   m.plan=m.configured?{base:{...m.base},crates:plan.crates.map(p=>({...p})),confirmed:true}:null;
   m.signal=m.configured?'BUSCÁ LOS COFRES · ABRILOS Y REGRESÁ A TU BASE':'ELEGÍ DÓNDE ESTARÁN TUS 5 BOTINES';
  }
  if(g.mode==='refuge'){m.object={x:0,z:-.40};m.stations=[{x:-.96,z:-.82,active:false},{x:.96,z:-.82,active:false},{x:0,z:1.0,active:false}];m.signal='DEFENDÉ EL REACTOR Y ACTIVÁ 3 ESTACIONES'}
  if(g.mode==='colossus'){m.signal='GIGANTE 1 DE 3';g.creepIntroduced=true;g.spiderIntroduced=true;g.minotaurIntroduced=true;g.spawnClock=10000;}
  if(g.mode==='timewarp')m.signal='USÁ EMP PARA CONTROLAR EL TIEMPO';
  if(g.mode==='mutant')m.signal='MUTACIÓN EN 15 SEGUNDOS';
  if(g.mode==='invasion')m.signal='¡INVASIÓN INMINENTE!';
  // Other missions do not unexpectedly spawn scripted legacy boss waves.
  if(['loot','timewarp','refuge','mutant','ctf','rescue'].includes(g.mode)){
   g.creepIntroduced=true;g.minotaurIntroduced=true;
  }
  g.mission=m;return g;
 }
 G.create=function(config={}){return setupMission(orig.create(config),config)};
 G.reset=function(g,config={}){return G.create({...config,mode:config.mode||g.mode,arena:config.arena||g.arena,flagPlan:config.flagPlan||g.mission?.plan,lootPlan:config.lootPlan||(g.mode==='loot'?g.mission?.plan:null),ownerId:config.ownerId??g.ownerId})};
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
 function beginRescueStage(g,{first=false}={}){
   const m=g.mission;if(m?.kind!=='rescue')return;
   m.base={...g.player};m.carry=false;m.hostageActive=true;m.hostageLost=false;
   m.hostageHealth=Math.min(100,76+m.level*2);
   m.phase='RESCATÁ';m.nextLevelAt=0;m.levelDeadline=g.elapsed+Math.max(28,42-m.level*1.3);
   const angle=-Math.PI*.5+(g.rand()-.5)*1.3,radius=2.5+Math.min(1,m.level*.1);
   m.object={x:+(m.base.x+Math.sin(angle)*radius).toFixed(3),
     z:+(m.base.z+Math.cos(angle)*radius).toFixed(3)};
   const angle0=g.rand()*Math.PI*2;
   m.spawnPoints=Array.from({length:7},(_,i)=>{
    const a=angle0+i*Math.PI*2/7+(g.rand()-.5)*.2,dist=1.25+g.rand()*.65;
    return {x:+(m.object.x+Math.sin(a)*dist).toFixed(3),
     z:+(m.object.z+Math.cos(a)*dist).toFixed(3)};
   });
   m.enemyCursor=0;g.enemies.length=0;g.spawnClock=.6;
   if(!first)g.lives=Math.min(100,g.lives+14);
   for(let i=0;i<Math.min(6,1+Math.ceil(m.level/2));i++){
    const kind=m.level>=8&&i===0?'tank':m.level>=5&&i===1?'flanker':'basic';
    G.spawn(g,kind);
   }
   event(m,'🚨 NIVEL '+m.level+'/10 · '+(m.level>=8?'GUARDIAS DE ÉLITE':'LIBERÁ AL REHÉN'));
  }
  G.prepareRescue=function(g){
   if(g.mode!=='rescue'||g.mission.hostageActive)return false;
   beginRescueStage(g,{first:true});return true;
  };
 function assignSpawn(g,e){
  const m=g.mission;
  if(!m||e.missionAssigned)return;
  e.missionAssigned=true;
  if(m.kind==='loot'&&m.configured&&m.spawnPoints.length){
   const p=m.spawnPoints[m.enemyCursor++%m.spawnPoints.length];
   e.x=p.x;e.z=p.z;e.role=m.enemyCursor%3===0?'interceptor':'guardián';
  }
  if(m.kind==='ctf'&&m.spawnPoints.length){
   const p=m.spawnPoints[m.enemyCursor++%m.spawnPoints.length];
   // Maintain >=2.45m of separation from the tracked phone.
   // The exact user-confirmed world-space spawn, not a hidden random point.
   e.x=p.x;e.z=p.z;
   e.role=m.enemyCursor%3===0?'guardián':m.enemyCursor%3===1?'interceptor':'cazador';
  }
  if(m.kind==='rescue'&&m.spawnPoints.length){
    const p=m.spawnPoints[m.enemyCursor++%m.spawnPoints.length];
    e.x=p.x;e.z=p.z;e.role='guardia';
    const bonus=Math.floor((m.level-1)/3);e.hp+=bonus;e.maxHp+=bonus;
    e.attackCD=Math.max(.55,e.attackCD-(m.level-1)*.05);
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
 G.movePlayer=function(g,p){
  if(!['ctf','rescue','loot'].includes(g.mode))return orig.movePlayer(g,p);
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
  // CTF needs roaming beyond the 2.6 m cosmetic tile board to retrieve the flag.
  // A 2.6 m base and an enemy flag up to 8 m away must not impose
  // an invisible 8 m player boundary. Permit normal real-world walking.
  // 40 m is only a catastrophic-invalid-pose guard, never a CTF play area.
  g.player.x=clamp(p.x,-40,40);g.player.z=clamp(p.z,-40,40);return true;
 };
 function objectiveDistance(g,point){return d(g.player,point)}
 G.flagLocation=function(g){
  const m=g?.mission;if(!m||m.kind!=='ctf')return null;
  if(m.carry)return {x:g.player.x,z:g.player.z,y:1.02,state:'carried'};
  const p=m.dropAt||m.object;
  return {x:p.x,z:p.z,y:0,state:m.dropAt?'dropped':'fixed'};
 };
 function pickupOrDeliver(g){
  const m=g.mission;if(!m||m.kind!=='ctf')return;
  if(m.flagDropped&&g.elapsed>m.flagDropped){
   m.flagDropped=0;m.dropAt=null;event(m,'BANDERA DEVUELTA A LA BASE ENEMIGA');
  }
  if(!m.carry){
   const dest=m.dropAt||m.object;
   if(m.configured&&g.elapsed>=m.pickupBlockedUntil&&objectiveDistance(g,dest)<.58){
    m.carry=true;m.flagDropped=0;m.dropAt=null;event(m,'🚩 ¡BANDERA ROBADA! REGRESÁ A TU BASE');
    g.fx.push({type:'flagTake',t:g.elapsed,x:dest.x,z:dest.z});
   }
  }else if(m.configured&&objectiveDistance(g,m.base)<.65){
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
  if(m.kind==='loot'&&!m.configured){g.paused=true;return g}
  if(m.kind==='rescue'&&!m.hostageActive&&!m.nextLevelAt)beginRescueStage(g,{first:true});
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
  if(m.kind==='timewarp'){
   const cycle=g.elapsed%12;
   const phase=g.elapsed<m.slowUntil||cycle>=6&&cycle<9?'FRACTURA':cycle>=9?'ACELERADO':'NORMAL';
   m.phaseRemaining=phase==='FRACTURA'?g.elapsed<m.slowUntil?m.slowUntil-g.elapsed:9-cycle:
     phase==='ACELERADO'?12-cycle:6-cycle;
   if(m.timePhase!==phase){
    m.timePhase=phase;m.timeCycles+=phase==='FRACTURA'?1:0;
    event(m,phase==='FRACTURA'?'⏳ ¡TIEMPO ROTO! · ENEMIGOS CONGELADOS':
      phase==='ACELERADO'?'⚠ REBOTE TEMPORAL · ENEMIGOS VELOCES':'⌛ TIEMPO NORMAL');
    g.fx.push({type:'timeRift',phase,t:g.elapsed});
   }
   for(const e of g.enemies){
    const was=previous.get(e.id);if(!was)continue;
    if(phase==='FRACTURA'){
     e.x=was.x+(e.x-was.x)*.025;e.z=was.z+(e.z-was.z)*.025;
     e.attackCD=Math.max(e.attackCD,was.cd-dt*.025);
     e.stun=Math.max(e.stun,.17);
    }else if(phase==='ACELERADO'&&e.portal<=0&&e.stun<=0){
     e.x+=(e.x-was.x)*.45;e.z+=(e.z-was.z)*.45;
    }
   }
   if(phase==='FRACTURA')g.lives=Math.min(100,g.lives+Math.max(0,life-g.lives)*.85);
  }
  if(m.kind==='rescue'){
   if(!m.hostageActive&&!m.nextLevelAt)beginRescueStage(g,{first:true});
   if(m.carry){
    m.hostageHealth=Math.max(0,m.hostageHealth-Math.max(0,life-g.lives)*(m.level>=8?1.3:1));
    if(m.hostageHealth<=0){m.hostageLost=true;G.finish(g,'rehen_perdido');event(m,'💔 EL REHÉN FUE ALCANZADO')}
   }
   if(g.elapsed>=m.levelDeadline&&m.hostageActive){m.hostageLost=true;G.finish(g,'tiempo_de_rescate');event(m,'⏱️ NO LLEGASTE A TIEMPO')}
   if(m.nextLevelAt&&g.elapsed>=m.nextLevelAt&&g.phase==='playing')beginRescueStage(g);
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
   if(g.elapsed>=g.duration-15&&m.loot&&m.signal!=='⚠ ÚLTIMOS 15 S · REGRESÁ A EXTRAER')event(m,'⚠ ÚLTIMOS 15 S · REGRESÁ A EXTRAER');
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
    // Distinct pressure curve: recovery + aggression, never a cosmetic-only phase.
    if(m.bossPhase===2)boss.attackCD=Math.min(boss.attackCD,1.2);
    else if(m.bossPhase===3){boss.attackCD=Math.min(boss.attackCD,.82);
     if(boss.portal<=0&&boss.stun<=0){const dx=g.player.x-boss.x,dz=g.player.z-boss.z,L=Math.hypot(dx,dz);
      if(L>2.65){boss.x+=dx/L*.20*dt;boss.z+=dz/L*.20*dt;orientAwayFromPhone(g,boss)}
     }
    }
   }else if(m.bossIndex>=3)missionWin(g,'colosos_derrotados');
  }
  if(g.phase==='finished'&&g.finishedReason==='tiempo'){
   if(['invasion','refuge','timewarp','mutant','ctf'].includes(m.kind)&&g.lives>0&&
      (m.kind!=='refuge'||m.reactor>0&&m.stations.every(x=>x.active))&&
      (m.kind!=='ctf'||m.captures>0))m.completed=true;
  }
  return g;
 };
 G.fire=function(g,ray,shooter='vos'){
  const m=g.mission;
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
   g.skillCooldown=11;
   g.mission.slowUntil=g.elapsed+4;
   event(g.mission,'⏳ TIEMPO ROTO · 4 SEGUNDOS');
  }
  return done;
 };
 G.missionAction=function(g){
  const m=g.mission;
  if(!m||g.phase!=='playing'||g.paused)return {ok:false,reason:'no_disponible'};
  if(m.kind==='loot'){
   if(!m.configured)return {ok:false,reason:'sin_configurar'};
   const box=m.crates.filter(b=>!b.opened).sort((a,b)=>d(g.player,a)-d(g.player,b))[0];
   if(box&&d(g.player,box)<.82){
    box.opened=true;m.loot++;grant(g,250+m.loot*75);
    event(m,m.loot===5?'💰 CINCO BOTINES · ¡REGRESÁ A EXTRAER!':'📦 BOTÍN '+m.loot+'/5 · CONTINUÁ O REGRESÁ');
    g.fx.push({type:'crateOpen',t:g.elapsed,x:box.x,z:box.z});
    return {ok:true,kind:'abrir',count:m.loot};
   }
   if(m.loot&&objectiveDistance(g,m.base)<.80){
    m.extracted=m.loot;grant(g,m.extracted*350);
    missionWin(g,'botin_extraido');return {ok:true,kind:'extraer',count:m.extracted};
   }
   return {ok:false,reason:m.loot?'acercate_a_un_botin_o_base':'acercate_a_un_botin'};
  }
  if(m.kind==='refuge'){
   const station=m.stations.find(p=>!p.active&&objectiveDistance(g,p)<.46);
   if(!station)return {ok:false,reason:'acercate_a_una_estacion'};
   station.active=true;m.reactor=Math.min(100,m.reactor+8);grant(g,350);
   event(m,'⚡ ESTACIONES '+m.stations.filter(x=>x.active).length+'/3 ACTIVADAS');
   return {ok:true,kind:'activar',active:m.stations.filter(x=>x.active).length};
  }
  if(m.kind==='rescue'){
   if(!m.hostageActive||m.nextLevelAt)return {ok:false,reason:'espera_siguiente_nivel'};
   if(!m.carry){
    if(objectiveDistance(g,m.object)>.75)return {ok:false,reason:'acercate_al_rehen'};
    m.carry=true;m.phase='ESCOLTÁ';m.hostageHealth=Math.max(m.hostageHealth,68);
    event(m,'🤝 ¡REHÉN LIBERADO! ESCOLTALO A TU BASE');
    g.fx.push({type:'hostageLiberated',t:g.elapsed,x:m.object.x,z:m.object.z});
    return {ok:true,kind:'liberar',level:m.level};
   }
   if(objectiveDistance(g,m.base)>.85)return {ok:false,reason:'volvé_a_tu_base'};
   m.carry=false;m.hostageActive=false;m.rescued++;grant(g,550+m.level*230);
   g.fx.push({type:'hostageSaved',t:g.elapsed,level:m.level,x:m.base.x,z:m.base.z});
   if(m.level===10){missionWin(g,'diez_rehenes_rescatados');event(m,'🏆 ¡NIVEL 10 SUPERADO!');return {ok:true,kind:'final',level:10}}
   m.level++;m.nextLevelAt=g.elapsed+2.5;m.phase='TRANSICIÓN';
   event(m,'🏆 REHÉN SALVADO · SIGUIENTE NIVEL '+m.level+'/10');
   return {ok:true,kind:'rescatado',level:m.level-1};
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
   case 'loot':{
     const left=m.crates.filter(b=>!b.opened);
     const nearest=left.slice().sort((a,b)=>d(g.player,a)-d(g.player,b))[0];
     const nearChest=nearest&&d(g.player,nearest)<.82,nearBase=m.loot>0&&d(g.player,m.base)<.80;
     const distance=nearest?d(g.player,nearest):null;
     return {text:'📦 BOTÍN '+m.loot+'/5 · '+remain+'s',
       detail:nearChest?'✅ COFRE CERCA · TOCÁ ABRIR':nearBase?'✅ EN TU BASE · TOCÁ EXTRAER':left.length?
       'BUSCÁ EL SIGUIENTE COFRE · '+distance.toFixed(1)+' m':'REGRESÁ A TU BASE · '+d(g.player,m.base).toFixed(1)+' m',
       button:nearBase?'💰 EXTRAER':'📦 ABRIR',canAct:!!(nearChest||nearBase)};
   }
   case 'timewarp':return {text:m.timePhase==='FRACTURA'?'⏳ TIEMPO CONGELADO · '+Math.ceil(m.phaseRemaining)+'s':
      m.timePhase==='ACELERADO'?'⚠ REBOTE TEMPORAL · '+Math.ceil(m.phaseRemaining)+'s':
      '⌛ PRÓXIMA FRACTURA · '+Math.ceil(m.phaseRemaining||6)+'s',
     detail:m.timePhase==='FRACTURA'?'¡DISPARÁ! ENEMIGOS CONGELADOS':m.timePhase==='ACELERADO'?'¡CUIDADO! ENEMIGOS MÁS RÁPIDOS':'PULSÁ ⏳ ROMPER TIEMPO PARA CONGELARLOS'};
   case 'refuge':{
     const left=m.stations.filter(p=>!p.active),closest=left.length?Math.min(...left.map(p=>objectiveDistance(g,p))):Infinity;
     return {text:'REACTOR '+Math.ceil(m.reactor)+'% · '+m.stations.filter(x=>x.active).length+'/3',detail:left.length?(closest<.46?'⚡ ESTACIÓN ALCANZADA · ACTIVÁ':'ACERCATE A ESTACIÓN · '+closest.toFixed(1)+' m'):'✅ 3 ESTACIONES ACTIVADAS · DEFENDÉ EL NÚCLEO',button:'⚡ ACTIVAR',canAct:closest<.46};
   }
   case 'mutant':return {text:'⚡ '+m.mutation,detail:m.signal};
   case 'colossus':return {text:'COLOSOS '+Math.min(3,m.bossIndex)+'/3 · FASE '+m.bossPhase,detail:m.signal};
   case 'rescue':{
    const target=m.carry?m.base:m.object,dist=objectiveDistance(g,target),close=dist<(m.carry?.85:.75);
    return {text:m.nextLevelAt?'✅ NIVEL '+(m.level-1)+'/10 COMPLETADO':
      '🆘 RESCATE NIVEL '+m.level+'/10 · '+Math.max(0,Math.ceil(m.levelDeadline-g.elapsed))+'s',
     detail:m.nextLevelAt?'PRÓXIMO NIVEL EN '+Math.ceil(m.nextLevelAt-g.elapsed)+'s':
      m.carry?'ESCOLTÁ AL REHÉN · SALUD '+Math.ceil(m.hostageHealth)+'% · '+dist.toFixed(1)+'m':
      'LLEGÁ HASTA EL REHÉN · '+dist.toFixed(1)+'m',
     button:m.carry?'🤝 ENTREGAR REHÉN':'🆘 LIBERAR REHÉN',canAct:close&&!m.nextLevelAt};
   }
   case 'ctf':{
    const target=m.carry?m.base:(m.dropAt||m.object),dist=objectiveDistance(g,target),close=dist<(m.carry?.65:.58);
    return {text:m.carry?'🚩 LLEVÁS LA BANDERA':'🚩 CAPTURAS '+m.captures,
     detail:close?(m.carry?'✅ EN TU BASE · TOCÁ ENTREGAR':'✅ BANDERA CERCA · TOCÁ RECOGER'):(m.carry?'VOLVÉ A TU BASE':'BUSCÁ LA BANDERA')+' · '+dist.toFixed(1)+' m',
     button:m.carry?'🚩 ENTREGAR':'🚩 RECOGER',canAct:close};
   }
  }
  return null;
 };
 G.configureLootPlan=function(g,plan){
  if(!g.mission||g.mode!=='loot'||g.phase!=='ready')return {ok:false,reason:'fuera_de_preparacion'};
  const valid=validateLootPlan(plan,g.arena);if(!valid.ok)return valid;
  const m=g.mission;
  m.base={x:+plan.base.x.toFixed(2),z:+plan.base.z.toFixed(2)};
  m.crates=plan.crates.map((p,i)=>({x:+p.x.toFixed(2),z:+p.z.toFixed(2),id:i,opened:false}));
  m.spawnPoints=lootGuardPoints({base:m.base,crates:m.crates});
  m.spawnTypes=[];m.enemyCursor=0;m.configured=true;
  m.plan={base:{...m.base},crates:m.crates.map(({x,z})=>({x,z})),confirmed:true};
  event(m,'✅ 5 COFRES EN EL MUNDO · LOS GUARDIAS LOS DEFENDERÁN');
  return {ok:true,plan:m.plan};
 };
 G.validateLootPlan=validateLootPlan;
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
  if(Math.max(Math.abs(plan.base.x),Math.abs(plan.base.z))>bound)
   return {ok:false,reason:'base_fuera_del_tablero'};
  if(Math.max(Math.abs(plan.flag.x),Math.abs(plan.flag.z))>8)
   return {ok:false,reason:'bandera_fuera_del_mundo'};
  // Unlike the previous 1 m minimum, the enemy flag must be OUTSIDE the home
  // board, at a meaningful travel distance, so capture is not automatic/easy.
  if(d(plan.base,plan.flag)<2.35)return {ok:false,reason:'aleja_bandera_al_menos_2_35_metros'};
  if(Math.max(Math.abs(plan.flag.x),Math.abs(plan.flag.z))<=arena/2+.12)
   return {ok:false,reason:'bandera_debe_quedar_fuera_de_tu_base'};
  for(let i=0;i<plan.spots.length;i++){
   const p=plan.spots[i];if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z)||Math.max(Math.abs(p.x),Math.abs(p.z))>8)return {ok:false,reason:'spawn_fuera_del_mundo'};
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
