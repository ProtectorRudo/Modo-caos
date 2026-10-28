/* FRUTÁSTROFE · core determinista v1 · reglas aisladas del render y AR */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FrutaCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TYPES=['strawberry','orange','apple','watermelon','lemon'];
const COLORS={strawberry:0xf04469,orange:0xffa83e,apple:0xe95153,watermelon:0x36d7a2,lemon:0xf8dc58,gold:0xffcf58,ice:0x74eaff,rainbow:0xb68aff,bomb:0x34354b,rotten:0x607b38,boss:0x49dd9c};
const LEVELS=[
 {name:'PRIMER CHORRO',goal:'score',target:420,duration:54,rank:[420,700,980],speed:1.0,rate:1.05,trap:.025,special:.055},
 {name:'FRUTAS EN FUGA',goal:'score',target:720,duration:55,rank:[720,1040,1420],speed:1.15,rate:.97,trap:.035,special:.06},
 {name:'CADENA DELICIOSA',goal:'combos',target:3,duration:60,rank:[3,4,5],speed:1.05,rate:.85,trap:.04,special:.055},
 {name:'DULCE RESPIRO',goal:'score',target:920,duration:56,rank:[920,1250,1690],speed:1.0,rate:.72,trap:.035,special:.09},
 {name:'NO TOQUES LA BOMBA',goal:'clean',target:1150,duration:63,rank:[1150,1650,2200],speed:1.14,rate:.77,trap:.14,special:.065,maxErrors:1},
 {name:'TORMENTA DE CITRICOS',goal:'citrus',target:18,duration:65,rank:[18,24,30],speed:1.3,rate:.7,trap:.075,special:.08},
 {name:'FIESTA FRUTAL',goal:'score',target:1650,duration:65,rank:[1650,2150,2800],speed:1.12,rate:.64,trap:.065,special:.13},
 {name:'PRECISION DE ORO',goal:'clean',target:2000,duration:65,rank:[2000,2600,3500],speed:1.32,rate:.66,trap:.15,special:.095,maxErrors:1},
 {name:'JUICE FEVER',goal:'combos',target:6,duration:65,rank:[6,8,10],speed:1.25,rate:.56,trap:.11,special:.12},
 {name:'LA GRAN SANDIA',goal:'boss',target:12,duration:75,rank:[12,12,12],speed:1.26,rate:.75,trap:.11,special:.09}
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function seeded(seed){let a=(seed>>>0)||1;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const pick=(a,rng)=>a[Math.floor(rng()*a.length)];
function challengeSeed(date){const s=String(date||new Date().toISOString().slice(0,10));let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function create(opts={}){
 const mode=opts.mode==='arcade'?'arcade':'campaign',level=clamp(Math.floor(opts.level||1),1,10),cfg=mode==='arcade'?{name:'MODO ARCADE',goal:'score',target:1250,duration:60,rank:[1250,2100,3200],speed:1.18,rate:.72,trap:.09,special:.105}:LEVELS[level-1];
 const seed=(Number(opts.seed)||((Date.now()^0x73b91c)>>>0))>>>0,rng=seeded(seed);
 const g={mode,level,seed,cfg,elapsed:0,duration:cfg.duration,state:'ready',score:0,shots:0,hits:0,misses:0,errors:0,combo:0,maxCombo:0,chains:0,citrus:0,bossHits:0,streakType:null,streakCount:0,streakUntil:0,multiplier:1,slowUntil:0,fever:false,nextSpawn:1.65,nextCluster:8.5,launchQueue:[],launchIndex:0,objects:[],events:[],nextId:1,goalsMet:false,stars:0,best:0,locked:false};
 const emit=(type,extra={})=>g.events.push(Object.assign({type,at:g.elapsed},extra));
 function spawn(override){
  const r=rng(),kind=override||(r<cfg.trap?'bomb':r<cfg.trap+.045?'rotten':r<cfg.trap+cfg.special+.045?pick(['gold','ice','rainbow'],rng):pick(TYPES,rng));
  // Sky shower: a high visible portal above the arena; no fruit launches from the floor.
  // Five lanes, shuffled with a coprime stride so consecutive drops don't overlap.
  const lane=(g.launchIndex*2+1)%5;g.launchIndex++;
  const x=(lane-2)*1.05+(rng()-.5)*.23;
  const z=-.65+(g.launchIndex%3)*.34+(rng()-.5)*.10;
  const y=9.25+rng()*.42;
  const obj={id:g.nextId++,kind,x,y,z,baseY:y,r:.26+rng()*.09,
   vx:(rng()-.5)*.24,vy:-.14-rng()*.13,vz:(rng()-.5)*.16,
   gravity:4.4*cfg.speed,age:0,rot:rng()*Math.PI*2,spin:(rng()-.5)*1.8,dead:false};
  if(kind==='boss'){obj.x=0;obj.y=5.55;obj.z=-.35;obj.r=.82;obj.vx=0;obj.vy=0;obj.vz=0;obj.gravity=0;obj.hp=12;obj.spin=.35}
  g.objects.push(obj);emit('spawn',{id:obj.id,kind,x:obj.x,y:obj.y,z:obj.z});return obj;
 }
 function begin(){
  if(g.state==='ready'){
   g.state='playing';emit('start');
   if(g.level===10&&g.mode==='campaign')spawn('boss');
   else{
    const intro=pick(TYPES,rng);
    for(let j=0;j<3;j++)g.launchQueue.push({at:j*.57,kind:intro});
    g.nextSpawn=1.65;g.nextCluster=8.5;
   }
  }
  return g
 }
 function remove(o){o.dead=true}
 function award(points,reason,x,y,z){const n=Math.round(points*g.multiplier*(g.fever?2:1));g.score+=n;emit('points',{points:n,reason,x,y,z});return n}
 function punish(o){g.errors++;g.combo=0;g.streakCount=0;g.streakType=null;g.multiplier=1;g.score=Math.max(0,g.score-(o.kind==='bomb'?85:40));emit('trap',{kind:o.kind,score:g.score,x:o.x,y:o.y,z:o.z});if(g.cfg.goal==='clean'&&g.errors>g.cfg.maxErrors)finish(false)}
 function chain(o){
  g.chains++;g.combo++;g.maxCombo=Math.max(g.maxCombo,g.combo);
  g.multiplier=clamp(1+Math.floor(g.combo/2),1,5);
  award(110+g.combo*35,'chain',o.x,o.y,o.z);emit('chain',{combo:g.combo,x:o.x,y:o.y,z:o.z});
  // Small, bounded splash: no recursive cascade loops, no invisible traps harmed.
  for(const other of g.objects){
   if(other.dead||other.id===o.id||other.kind==='bomb'||other.kind==='rotten'||other.kind==='boss')continue;
   if(Math.hypot(other.x-o.x,other.y-o.y)<1.05){other.dead=true;award(30,'splash',other.x,other.y,other.z);emit('splash',{id:other.id,kind:other.kind,x:other.x,y:other.y,z:other.z})}
  }
 }
 function shoot(id){
  if(g.state!=='playing')return {ok:false,reason:'inactive'};
  g.shots++;
  const o=g.objects.find(q=>q.id===id&&!q.dead);
  if(!o){g.misses++;g.streakCount=0;g.streakType=null;emit('miss');return {ok:false,reason:'miss'};}
  g.hits++;
  if(o.kind==='bomb'||o.kind==='rotten'){remove(o);punish(o);return {ok:true,trap:true};}
  if(o.kind==='boss'){
   o.hp--;g.bossHits++;award(85,'boss',o.x,o.y,o.z);emit('boss-hit',{remaining:o.hp,x:o.x,y:o.y,z:o.z});
   if(o.hp<=0){remove(o);g.goalsMet=true;award(900,'boss-defeat',o.x,o.y,o.z);emit('boss-down');finish(true)}
   return {ok:true,boss:true};
  }
  remove(o);
  const base=o.kind==='gold'?180:o.kind==='rainbow'?130:o.kind==='ice'?90:35;
  award(base,o.kind,o.x,o.y,o.z);emit('hit',{id:o.id,kind:o.kind,x:o.x,y:o.y,z:o.z});
  if(o.kind==='ice'){g.slowUntil=g.elapsed+5;emit('slow',{until:g.slowUntil})}
  if(o.kind==='rainbow'){
   const same=pick(TYPES,rng);for(const t of g.objects){if(!t.dead&&t.kind===same){t.dead=true;award(36,'rainbow',t.x,t.y,t.z);emit('splash',{id:t.id,kind:t.kind,x:t.x,y:t.y,z:t.z})}}
   emit('rainbow',{kind:same})
  }
  if(o.kind==='gold'){g.multiplier=clamp(g.multiplier+1,1,5);emit('gold')}
  if(o.kind==='orange'||o.kind==='lemon')g.citrus++;
  if(TYPES.includes(o.kind)){
   if(g.streakType===o.kind&&g.elapsed<=g.streakUntil)g.streakCount++;else g.streakCount=1;
   g.streakType=o.kind;g.streakUntil=g.elapsed+5.3;
   if(g.streakCount>=3){g.streakCount=0;chain(o)}
  }
  if(g.cfg.goal==='score'&&g.score>=g.cfg.target)g.goalsMet=true;
  if(g.cfg.goal==='combos'&&g.chains>=g.cfg.target)g.goalsMet=true;
  if(g.cfg.goal==='citrus'&&g.citrus>=g.cfg.target)g.goalsMet=true;
  if(g.cfg.goal==='clean'&&g.score>=g.cfg.target&&g.errors<=g.cfg.maxErrors)g.goalsMet=true;
  return {ok:true,kind:o.kind};
 }
 function finish(win){
  if(g.state!=='playing')return;
  g.state='finished';g.goalsMet=!!win;
  const value=g.cfg.goal==='combos'?g.chains:g.cfg.goal==='citrus'?g.citrus:g.cfg.goal==='boss'?g.bossHits:g.score;
  const accuracy=g.hits/Math.max(1,g.shots);
  g.stars=win?1+(g.elapsed<=g.duration*.62||accuracy>=.80?1:0)+(g.elapsed<=g.duration*.42&&g.errors===0&&accuracy>=.70?1:0):0;
  if(g.cfg.goal==='boss'&&win)g.stars=3;
  emit('finish',{win,stars:g.stars,score:g.score});
 }
 function update(dt){
  if(g.state!=='playing')return g;
  dt=clamp(Number(dt)||0,0,.07);g.elapsed+=dt;g.fever=g.elapsed>=g.duration-12;
  if(g.elapsed>=g.duration){finish(g.goalsMet||g.mode==='arcade');return g;}
  const slow=g.elapsed<g.slowUntil ? 0.48 : 1;
  if(g.elapsed>=g.nextCluster&&g.cfg.goal!=='boss'){
   const fruit=pick(TYPES,rng);
   for(let j=0;j<3;j++)g.launchQueue.push({at:g.elapsed+j*.52,kind:fruit});
   emit('opportunity',{kind:fruit});g.nextCluster+=8.5;
  }
  if(g.elapsed>=g.nextSpawn){
   if(g.objects.length<13&&g.launchQueue.length<7)spawn();
   const period=Math.max(.36,cfg.rate*.48*(g.fever ? .76 : 1));
   g.nextSpawn=g.elapsed+period*(.88+rng()*.29);
  }
  while(g.launchQueue.length&&g.launchQueue[0].at<=g.elapsed&&g.objects.length<13){
   const wave=g.launchQueue.shift();spawn(wave.kind);
  }
  for(const o of g.objects){
   if(o.dead)continue;
   o.age+=dt;o.rot+=dt*o.spin;
   if(o.kind==='boss'){o.x=Math.sin(g.elapsed*.75)*1.35;o.y=5.45+Math.sin(g.elapsed*1.6)*.40;continue}
   const d=dt*slow;o.x+=o.vx*d;o.z+=o.vz*d;o.y+=o.vy*d;o.vy-=o.gravity*d;
   if(o.y<.18){remove(o);emit('drop',{kind:o.kind,x:o.x,y:.18,z:o.z});}
  }
  g.objects=g.objects.filter(o=>!o.dead);
  if(g.goalsMet&&g.mode==='campaign'&&g.cfg.goal!=='boss')finish(true);
  return g;
 }
 function goalStatus(){
  const val=cfg.goal==='combos'?g.chains:cfg.goal==='citrus'?g.citrus:cfg.goal==='boss'?g.bossHits:g.score;
  const label=cfg.goal==='combos'?'CADENAS':cfg.goal==='citrus'?'CÍTRICOS':cfg.goal==='boss'?'JEFE':cfg.goal==='clean'?'SIN ERRORES':'PUNTOS';
  return {label,current:val,target:cfg.target,progress:clamp(val/cfg.target,0,1)};
 }
 return Object.assign(g,{begin,update,shoot,finish,goalStatus,spawn});
}
return Object.freeze({create,LEVELS,TYPES,COLORS,challengeSeed,seeded});
});