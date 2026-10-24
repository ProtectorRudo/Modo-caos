'use strict';
/* MODO CAOS · LLUVIA DE METEOROS — deterministic, render-independent game.
   Coordinates are meters in a world-locked arena; never infer body/feet tracking. */
(function(root){
const R=1.12,PLAYER=.072,DURATION=72,TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const profiles=[
 {name:'PRUDENCIA',kind:'cautious',color:'#72f3f2',speed:.44,lookahead:2.0,skill:.95},
 {name:'CHISPA',kind:'bold',color:'#ffdd63',speed:.52,lookahead:.85,skill:.80},
 {name:'NOVA',kind:'expert',color:'#c29cff',speed:.57,lookahead:1.7,skill:1},
 {name:'PAPAFRITA',kind:'silly',color:'#ffa0bb',speed:.40,lookahead:.68,skill:.55}
];
function random(g){let s=g.seed>>>0;s^=s<<13;s^=s>>>17;s^=s<<5;g.seed=s>>>0;return g.seed/4294967296}
function rnd(g,a,b){return a+(b-a)*random(g)}
function make(seed=0xCA052026,opts={}){
 const original=Number(seed)>>>0||1,offset=original%profiles.length;
 const bots=Array.from({length:3},(_,i)=>{
  const p=profiles[(i+offset)%4];
  return {id:'bot'+i,name:p.name,kind:p.kind,color:p.color,x:(i-1)*.24,z:-.31,lives:3,shield:0,score:0,combo:0,dodges:0,hits:0,near:0,alive:true,dist:0,decision:0,goal:null};
 });
 return {initialSeed:original,seed:original,stage:'ready',elapsed:0,countdown:3,
 duration:clamp(Number(opts.duration)||DURATION,45,90),online:!!opts.online,nextWave:1.75,wave:0,events:[],bonuses:[],fx:[],
 players:[{id:'you',name:'VOS',kind:'human',color:'#55ffcb',x:0,z:0,lives:3,shield:0,score:0,combo:0,dodges:0,hits:0,near:0,alive:true,dist:0,decision:0,goal:null},...bots],
 ranking:[],maxActive:0,lastPhase:'intro',finishReason:''};
}
function start(g){if(g.stage!=='ready'&&g.stage!=='finished')return false;
 if(g.stage==='finished'){const fresh=make(g.initialSeed+1,{duration:g.duration});Object.assign(g,fresh)}
 g.stage='countdown';g.countdown=3;return true}
function setPosition(g,x,z){
 const p=g.players[0];if(!p.alive||!Number.isFinite(x)||!Number.isFinite(z))return;
 const safe=clampPoint({x,z});p.dist+=distance(p,safe);p.x=safe.x;p.z=safe.z;
}
function clampPoint(p){return{x:clamp(p.x,-R,R),z:clamp(p.z,-R,R)}}
function phase(g){return g.elapsed<8?'aprendizaje':g.elapsed<27?'lluvia':g.elapsed<54?'caos':'apocalipsis'}
function affected(e,t){
 return t>=e.impact-.05&&t<=e.impact+.27+(e.crater?e.craterTime:0);
}
function threatens(e,pos,t,margin=.08){
 if(e.cancelled||!affected(e,t))return false;
 return distance(e,pos)<e.radius+margin;
}
function futureSafe(g,pos,t,extra=[]){
 if(Math.abs(pos.x)>R-.055||Math.abs(pos.z)>R-.055)return false;
 for(const e of [...g.events,...extra]){
  if(e.cancelled)continue;
  if(Math.abs(e.impact-t)<.75||affected(e,t)){
   if(distance(e,pos)<e.radius+PLAYER+.055)return false;
  }
 }
 return true;
}
function sampleSafe(g,t,extra=[],from=g.players[0]){
 let best=null,cost=Infinity;
 const points=[{x:from.x,z:from.z}];
 for(let i=0;i<18;i++){const a=i*TAU/18;for(const d of [.16,.28,.40,.52]){
  points.push({x:from.x+Math.cos(a)*d,z:from.z+Math.sin(a)*d});
 }}
 for(const p of points){if(!futureSafe(g,p,t,extra))continue;
  const score=distance(from,p);if(score<cost){cost=score;best=p}
 }
 return best;
}
function planWave(g){
 const f=phase(g),big=f==='caos'||f==='apocalipsis';
 // Start demanding attention within a few seconds, then scale wave density gradually.
 // A safety check below rejects combinations needing sudden sprints.
 const count=f==='aprendizaje'?1+Number(g.wave%3===2):
   f==='lluvia'?2+Number(g.wave%3===0):
   f==='caos'?3+Number(g.wave%3===1):3+Number(g.wave%2===0)+Number(g.wave%5===0);
 const lead=f==='aprendizaje'?2.30:f==='lluvia'?2.13:f==='caos'?1.98:1.82;
 const impact=g.elapsed+lead;
 // Solo: chase the tracked PHONE position; online: choose shared, deterministic targets.
 // Independently moving phones can NOT be used to seed a common online wave.
 const planner=g.online?(g.wave<3?{x:0,z:0}:{x:Math.sin(g.wave*1.34)*.21,z:Math.cos(g.wave*1.34)*.21}):g.players[0];
 const reachable=trial=>{
  const safe=sampleSafe(g,impact,trial,planner);
  return safe&&distance(planner,safe)<=Math.min(.33,lead*.20);
 };
 const made=[],gx=[-.96,-.48,0,.48,.96],candidate=[];
 const targeted=random(g)<(f==='aprendizaje'?1:f==='lluvia'?.97:.93);
 if(targeted){
  const direction=rnd(g,0,TAU),offset=big?.17:rnd(g,0,.045);
  candidate.push({x:planner.x+Math.cos(direction)*offset,z:planner.z+Math.sin(direction)*offset,priority:true});
 }
 const other=[];
 for(const x of gx)for(const z of gx){
  const pt={x:x+rnd(g,-.055,.055),z:z+rnd(g,-.055,.055)};
  if(Math.max(Math.abs(pt.x),Math.abs(pt.z))<R-.08)other.push(pt);
 }
 for(let i=other.length-1;i>0;i--){const j=Math.floor(random(g)*(i+1));[other[i],other[j]]=[other[j],other[i]]}
 candidate.push(...other);
 for(const p of candidate){
  if(made.length>=count)break;
  let giant=big&&made.length===0&&random(g)<(f==='apocalipsis'?.43:.23);
  let radius=giant?.23:.135,point=clampPoint(p);
  if(made.some(e=>distance(e,point)<e.radius+radius+.035))continue;
  const isCrater=f!=='aprendizaje'&&random(g)<.20;
  const tricky=!giant&&(f==='lluvia'||f==='caos'||f==='apocalipsis')&&random(g)<(f==='lluvia'?.09:.20);
  const event={id:'m'+g.wave+'-'+made.length,kind:giant?'giant':tricky?'tricky':'normal',
   x:point.x,z:point.z,originalX:point.x,originalZ:point.z,radius,spawn:g.elapsed,impact,lead,
   crater:isCrater||giant,craterTime:giant?1.0:isCrater?1.35:0,
   moved:false,cancelled:false,scored:false,hits:{},near:{},color:'#ffbf65'};
  if(!reachable([...made,event])){
   if(!p.priority||!giant)continue;
   // A gigantic direct hit cannot force an unsafe dash: downgrade its footprint.
   event.kind='normal';event.radius=.135;event.crater=isCrater;event.craterTime=isCrater?1.35:0;
   if(!reachable([...made,event]))continue;
  }
  made.push(event);
 }
 if(!made.length)return [];
 const safeHint=sampleSafe(g,impact,made,planner);
 if(safeHint)g.safeHint={x:safeHint.x,z:safeHint.z,until:impact+.15};
 if(g.elapsed>11&&random(g)<.095)made[Math.floor(random(g)*made.length)].fake=true;
 g.events.push(...made);g.wave++;g.maxActive=Math.max(g.maxActive,made.length);
 // Distinct recognizable attack rhythms, without hiding the actual strike zones.
 if(g.wave===1)g.fx.push({type:'cue',at:g.elapsed,text:'☄️ ¡PRIMER IMPACTO!'});
 else if(g.wave===4)g.fx.push({type:'cue',at:g.elapsed,text:'🔥 ¡AHORA VIENE LA LLUVIA!'});
 else if(g.wave===11)g.fx.push({type:'cue',at:g.elapsed,text:'⚡ ¡DOBLE PRESIÓN!'});
 else if(g.wave===23)g.fx.push({type:'cue',at:g.elapsed,text:'🌋 ¡SE VIENE EL CAOS!'});
 if(g.wave%7===0)g.fx.push({type:'siren',at:g.elapsed,text:'⚠️ ¡RÁFAGA DE METEORITOS!'});
 if(f==='apocalipsis'&&g.wave%4===0)g.fx.push({type:'siren',at:g.elapsed,text:'☄️ ¡TORMENTA FINAL!'});
 return made;
}
function moveTrick(g,e){
 if(e.moved||e.cancelled||e.kind!=='tricky'||g.elapsed<e.impact-1.27)return;
 e.moved=true;
 const planner=g.online?{x:Math.sin((g.wave-1)*1.34)*.21,z:Math.cos((g.wave-1)*1.34)*.21}:g.players[0];
 const options=[
  {x:planner.x,z:planner.z},
  {x:e.x+.22,z:e.z},{x:e.x-.22,z:e.z},
  {x:e.x,z:e.z+.22},{x:e.x,z:e.z-.22}
 ];
 const others=g.events.filter(v=>v!==e),reference={...g,events:others};
 for(const p of options){
  if(Math.abs(p.x)>R-.05||Math.abs(p.z)>R-.05||distance(p,e)<.12)continue;
  const safe=sampleSafe(reference,e.impact,[{...e,x:p.x,z:p.z}],planner);
  if(!safe||distance(planner,safe)>Math.min(.31,(e.impact-g.elapsed)*.23))continue;
  if(!futureSafe(reference,safe,e.impact,[{...e,x:p.x,z:p.z}]))continue;
  e.x=p.x;e.z=p.z;
  g.safeHint={x:safe.x,z:safe.z,until:e.impact+.15};
  g.fx.push({type:'trick',at:g.elapsed,text:'☄️ ¡CAMBIÓ DE RUMBO!'});return;
 }
 e.kind='normal';
}
function botTick(g,p,dt){
 if(!p.alive||p.kind==='remote')return;
 p.decision-=dt;
 if(p.decision<=0){
  const speed=p.kind==='expert'? .22:p.kind==='cautious'?.30:p.kind==='bold'?.46:.63;
  p.decision=speed+rnd(g,.01,.12);
  const upcoming=g.events.filter(e=>!e.cancelled&&e.impact>=g.elapsed-.1&&e.impact-g.elapsed<profiles.find(a=>a.kind===p.kind).lookahead);
  if(upcoming.length){
   const soon=upcoming.reduce((a,b)=>a.impact<b.impact?a:b);
   p.goal=sampleSafe(g,soon.impact,[],p)||{x:0,z:0};
  }else if(!p.goal||distance(p,p.goal)<.08){
   p.goal=clampPoint({x:rnd(g,-R+.12,R-.12),z:rnd(g,-R+.12,R-.12)});
  }
 }
 if(!p.goal)return;
 let vx=p.goal.x-p.x,vz=p.goal.z-p.z,l=Math.hypot(vx,vz);
 if(l>.015){
  const spec=profiles.find(v=>v.kind===p.kind),step=Math.min(l,dt*spec.speed);
  const before={x:p.x,z:p.z};
  const to=clampPoint({x:p.x+vx/l*step,z:p.z+vz/l*step});
  // Soft avoidance (teammates and the player are not solid walls).
  for(const other of g.players){if(other===p||!other.alive)continue;
   const gap=distance(to,other);if(gap<.135&&gap>.001){
    to.x+=((to.x-other.x)/gap)*(.135-gap)*.7;
    to.z+=((to.z-other.z)/gap)*(.135-gap)*.7;
   }}
  const next=clampPoint(to);p.x=next.x;p.z=next.z;p.dist+=distance(before,next);
 }
}
function hit(g,p,e){
 if(e.hits[p.id]||!p.alive||p.kind==='remote'||g.elapsed<(p.graceUntil||0))return;
 e.hits[p.id]=true;p.combo=0;p.hits++;
 if(p.shield>0){p.shield--;g.fx.push({type:'shield',at:g.elapsed,x:p.x,z:p.z,who:p.id,text:p.name+' ACTIVÓ ESCUDO'});return}
 p.lives=Math.max(0,p.lives-1);p.graceUntil=g.elapsed+.72;g.fx.push({type:'hit',at:g.elapsed,x:p.x,z:p.z,who:p.id,text:p.id==='you'?'💥 ¡TE ALCANZÓ!':'💥 '+p.name+' FUE ALCANZADO'});
 if(p.lives===0){p.alive=false;g.fx.push({type:'ko',at:g.elapsed,who:p.id,text:p.name+' ELIMINADO'})}
}
function impactTick(g){
 for(const e of g.events){
  if(e.cancelled)continue;
  if(e.fake&&g.elapsed>=e.impact-.80){e.cancelled=true;g.fx.push({type:'fake',at:g.elapsed,text:'😂 ¡ERA UNA FALSA ALARMA!'});continue}
  moveTrick(g,e);
  if(g.elapsed>=e.impact&&!e.impactDone){e.impactDone=true;
   g.fx.push({type:'impact',at:g.elapsed,x:e.x,z:e.z,giant:e.kind==='giant',text:e.kind==='giant'?'☄️ ¡METEORITO GIGANTE!':'💥 IMPACTO'});
   if(g.wave%3===0&&random(g)<.73){
    const spot=sampleSafe(g,g.elapsed+.7,[],g.online?{x:0,z:0}:g.players[0]);
    if(spot)g.bonuses.push({id:'b'+e.id,type:random(g)<.32?'shield':'fragment',x:spot.x,z:spot.z,spawn:g.elapsed,until:g.elapsed+5});
   }
  }
  if(affected(e,g.elapsed)){
   for(const p of g.players)if(p.kind!=='remote'&&distance(e,p)<e.radius+PLAYER-.018)hit(g,p,e);
  }
  if(g.elapsed>=e.impact+.36+(e.crater?e.craterTime:0)&&!e.scored){
   e.scored=true;
   for(const p of g.players){
    if(e.hits[p.id]||!p.alive||p.kind==='remote')continue;
    const d=distance(e,p);
    p.dodges++;p.combo++;const near=d<e.radius+PLAYER+.12;
    if(near)p.near++;
    p.score+=Math.round(55+Math.min(12,p.combo)*9+(near?40:0)+(e.kind==='giant'?45:0));
    if(near&&p.id==='you')g.fx.push({type:'near',at:g.elapsed,text:'😱 ¡POR UN PELO! +40'});
    if(p.id==='you'&&(p.combo===6||p.combo===12||p.combo===20)){
     const bonus=p.combo===6?120:p.combo===12?260:500;
     p.score+=bonus;
     g.fx.push({type:'streak',at:g.elapsed,who:p.id,text:'🔥 RACHA x'+p.combo+' · +'+bonus});
    }
   }
  }
 }
 for(const b of g.bonuses){
  for(const p of g.players){if(b.taken||!p.alive||p.kind==='remote'||distance(b,p)>.12)continue;
   b.taken=true;if(b.type==='shield')p.shield=Math.min(p.shield+1,2);else p.score+=170;
   g.fx.push({type:'bonus',at:g.elapsed,who:p.id,text:b.type==='shield'?'🛡 ESCUDO CONSEGUIDO':'💎 +170 FRAGMENTO'});
  }
 }
 g.events=g.events.filter(e=>g.elapsed<e.impact+2.3);
 g.bonuses=g.bonuses.filter(b=>!b.taken&&g.elapsed<b.until);
 g.fx=g.fx.filter(f=>g.elapsed-f.at<2.7);
}
function finish(g){
 g.stage='finished';g.finishReason=g.players[0].alive?'survived':'eliminated';
 g.ranking=[...g.players].sort((a,b)=>b.lives-a.lives||b.score-a.score||b.dodges-a.dodges).map((p,i)=>({...p,rank:i+1}));
}
function tick(g,dt){
 if(g.stage==='countdown'){g.countdown-=clamp(dt,0,.10);if(g.countdown<=0){g.stage='playing';g.countdown=0;g.fx.push({type:'start',at:g.elapsed,text:'☄️ ¡A SOBREVIVIR!'})}return}
 if(g.stage!=='playing'||g.paused)return;
 const step=clamp(dt,0,.08);g.elapsed=Math.min(g.duration,g.elapsed+step);
 if(g.elapsed>=g.nextWave&&g.elapsed<g.duration-1.1){
  const wave=planWave(g);// A controlled ramp: ~2.65s initially → 2.40s at 18s → 2s at 50s → 1.67s in finale.
  // No abrupt difficulty cliff; each explosion has a >=1.82s warning.
  const interval=g.elapsed<8?2.65:Math.max(1.65,2.54-Math.max(0,g.elapsed-8)*.014);
  g.nextWave+=interval+(wave.length?0:.23);
 }
 for(const p of g.players.slice(1))botTick(g,p,step);
 for(const p of g.players)if(p.alive&&p.kind!=='remote')p.score+=step*3.5;
 impactTick(g);
 if(g.elapsed>=g.duration)finish(g);
}
function leaderboard(g){return g.stage==='finished'?g.ranking:[...g.players].sort((a,b)=>b.lives-a.lives||b.score-a.score)}
const returnValue={make,start,tick,setPosition,phase,planWave,sampleSafe,leaderboard,clampPoint,futureSafe,R,PLAYER,DURATION};
root.MeteorosCore=Object.freeze(returnValue);
if(typeof module!=='undefined'&&module.exports)module.exports=returnValue;
})(typeof window!=='undefined'?window:globalThis);
