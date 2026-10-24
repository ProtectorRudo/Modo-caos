'use strict';
/* SEMÁFORO TRAICIONERO — deterministic, device-independent game rules.
 * Progress is VIRTUAL. No body/foot tracking. Never require running.
 * Multiplayer inputs/scores remain provisional until server validation.
 */
(function(root){
const LIMIT=76,GOAL=100,MAX_DT=.05;
const PERSONALITIES=[
 {name:'VOS',kind:'human',color:'#50ffe0'},
 {name:'RAYO',kind:'speed',color:'#ffcf62'},
 {name:'TITO',kind:'confused',color:'#fa74cf'},
 {name:'ZEN',kind:'cautious',color:'#96a5ff'}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let n=(seed>>>0)||42;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296}}
function make({seed=0xC0A5,difficulty='normal',players=null}={}){
 const cfg=difficulty==='facil'?{grace:.83,pace:3.65}:difficulty==='caos'?{grace:.66,pace:4.0}:{grace:.74,pace:3.8};
 const starts=[0,-.48,.48,.76];
 const people=(Array.isArray(players)&&players.length?players:PERSONALITIES).slice(0,4).map((p,i)=>({
  id:String(p.id??i),name:String(p.name||PERSONALITIES[i].name).slice(0,22),
  kind:p.kind||(i===0?'human':PERSONALITIES[i].kind),
  color:p.color||PERSONALITIES[i].color,progress:0,lane:starts[i],score:0,
  penalties:0,lives:3,combo:0,bestCombo:0,finishedAt:null,eliminated:false,
  streak:0,accuracy:0,decision:0,lastPunish:-99,lastBump:-99,distraction:0
 }));
 const g={state:'ready',phase:'ready',clock:0,raceTime:0,signalTime:0,signalTotal:0,
  signal:'green',visual:'green',round:0,trap:'none',trapCount:0,seed:seed>>>0,random:rng(seed),
  cfg,difficulty,players:people,input:{forward:0,lateral:0,motion:0},
  events:[],eventSeq:0,result:null,endedBy:null,timeLimit:LIMIT,goal:GOAL,
  startDelay:2.4,warning:0,comment:'¡PREPARATE!',fakeSignal:false,online:false};
 return g;
}
function emit(g,type,data={}){
 const entry={id:++g.eventSeq,type,time:+g.raceTime.toFixed(2),...data};
 g.events.push(entry);if(g.events.length>24)g.events.shift();
 return entry;
}
function choose(g,a){return a[Math.floor(g.random()*a.length)]}
function signal(g,next){
 g.signal=next;g.phase=next;g.signalTime=0;g.round+=next==='green'?1:0;
 if(next==='green'){
  g.trap=g.round<2?'none':choose(g,['none','none','turbo','fake','gold','shuffle','blink']);
  g.signalTotal=3.8+g.random()*1.8+(g.trap==='turbo'?.5:0);
  g.comment=g.trap==='turbo'?'¡VERDE TURBO!':g.trap==='gold'?'¡BONO DORADO!':
    g.trap==='fake'?'¡OJO CON LOS FALSOS!':'¡AVANZÁ!';
 }else if(next==='amber'){
  g.signalTotal=.95+g.random()*.64;
  g.trap='warning';
  g.comment=choose(g,['¿VERDE O ROJO?','TE ESTOY MIRANDO…','¡NO TE CONFÍES!']);
 }else{
  g.signalTotal=1.65+g.random()*1.35;
  g.trap=choose(g,['none','none','fake','blink','shuffle']);
  g.comment='¡ROJO! ¡QUIETO!';
  g.warning=g.cfg.grace;
 }
 g.visual=next;g.fakeSignal=g.trap==='fake';emit(g,'signal',{signal:next,round:g.round,trap:g.trap,grace:g.warning});
}
function start(g){
 if(g.state!=='ready')return false;
 g.state='countdown';g.phase='countdown';g.clock=0;g.raceTime=0;g.events.length=0;
 emit(g,'countdown');return true;
}
function input(g,{forward=0,lateral=0,motion=0}={}){
 g.input.forward=clamp(Number(forward)||0,0,1);
 g.input.lateral=clamp(Number(lateral)||0,-1,1);
 g.input.motion=clamp(Number(motion)||0,0,2); // filtered handset motion, not body motion
}
function punish(g,p,reason='red'){
 if(g.state!=='playing'||p.eliminated||p.finishedAt!==null||g.raceTime-p.lastPunish<.94)return false;
 p.lastPunish=g.raceTime;p.penalties++;p.combo=0;p.lives--;
 p.progress=clamp(p.progress-11,0,GOAL);p.score=Math.max(0,p.score-110);
 emit(g,'penalty',{id:p.id,reason,remaining:p.lives,progress:p.progress});
 if(p.lives<=0){p.eliminated=true;emit(g,'eliminated',{id:p.id})}
 return true;
}
function finishPlayer(g,p){
 if(p.finishedAt!==null||p.eliminated)return;
 p.progress=GOAL;p.finishedAt=g.raceTime;
 p.score+=Math.max(100,Math.floor(1200-g.raceTime*9))+(p.lives*100);
 emit(g,'goal',{id:p.id,name:p.name,score:p.score});
}
function updateBots(g,dt){
 for(const p of g.players){
  if(p.kind==='human'||p.kind==='remote'||p.finishedAt!==null||p.eliminated)continue;
  p.decision-=dt;
  if(p.decision<=0){
   p.decision=.35+g.random()*.6;
   p.distraction=g.random();
   p.lane=clamp(p.lane+(g.random()-.5)*.18,-.80,.80);
  }
  const speed=p.kind==='speed'?4.1:p.kind==='cautious'?3.70:3.82;
  if(g.signal==='green'){
   const hesitation=p.kind==='cautious'&&g.signalTime<.32;
   if(!hesitation)p.progress+=dt*speed*(g.trap==='turbo'?1.23:1);
  }else if(g.signal==='amber'){
   if(p.kind==='speed'&&p.distraction<.21)p.progress+=dt*1.8;
  }else if(g.signalTime>g.warning){
   const mistake=p.kind==='confused'?.13:p.kind==='speed'?.038:.008;
   if(p.distraction<mistake&&p.decision>.3)punish(g,p,'despistado');
  }
  if(p.progress>=GOAL)finishPlayer(g,p);
 }
}
function advance(g,dt){
 g.clock+=dt;
 if(g.state==='countdown'){
  if(g.clock>=g.startDelay){
   g.clock=0;g.state='playing';g.raceTime=0;signal(g,'green');emit(g,'go');
  }
  return;
 }
 if(g.state!=='playing')return;
 g.raceTime+=dt;g.signalTime+=dt;
 if(g.signalTime>=g.signalTotal){
  const nxt=g.signal==='green'?'amber':g.signal==='amber'?'red':'green';
  signal(g,nxt);
 }
 const p=g.players[0];
 if(p?.kind==='human'&&p.finishedAt===null&&!p.eliminated){
  p.lane=clamp(p.lane+dt*g.input.lateral*1.15,-.83,.83);
  if(g.signal==='green'){
   if(g.input.forward>.08){
    const boost=g.trap==='turbo'?1.27:g.trap==='gold'?1.16:1;
    const speed=g.cfg.pace*g.input.forward*boost;
    p.progress=clamp(p.progress+dt*speed,0,GOAL);
    p.score+=dt*(23+p.combo*1.2)*g.input.forward*(g.trap==='gold'?2.2:1);
   }
  }else if(g.signal==='amber'){
    // Yellow always signals release; it never directly punishes movement.
  }else if(g.signalTime>g.warning){
   if(g.input.forward>.18||g.input.motion>.14)punish(g,p,'rojo');
  }
  if(p.progress>=GOAL)finishPlayer(g,p);
 }
 updateBots(g,dt);
 // Soft lane collision (local bots only). Never an instant elimination.
 if(p?.kind==='human'&&!p.eliminated&&p.finishedAt===null&&g.raceTime-p.lastBump>2.25){
  const other=g.players.find(q=>q!==p&&q.kind!=='remote'&&!q.eliminated&&q.finishedAt===null&&
   Math.abs(q.progress-p.progress)<2.4&&Math.abs(q.lane-p.lane)<.11);
  if(other){
   p.lastBump=g.raceTime;p.lane=clamp(p.lane+(p.lane>=other.lane ? .16 : -.16),-.83,.83);
   p.progress=Math.max(0,p.progress-.75);emit(g,'bump',{id:p.id,other:other.id});
  }
 }
 if(g.raceTime>=LIMIT||g.players.every(p=>p.finishedAt!==null||p.eliminated)){
  end(g,g.raceTime>=LIMIT?'timeout':'all-finished');
 }
}
function tick(g,dt){
 if(!Number.isFinite(dt)||dt<=0||g.state==='finished'||g.state==='ready'||g.state==='paused')return;
 let left=Math.min(dt,.35);
 while(left>1e-8){let h=Math.min(left,MAX_DT);advance(g,h);left-=h;if(g.state==='finished')break}
}
function end(g,reason='timeout'){
 if(g.state==='finished')return;
 g.state='finished';g.phase='finished';g.endedBy=reason;
 const ranked=g.players.slice().sort((a,b)=>{
  const doneA=a.finishedAt!==null,doneB=b.finishedAt!==null;
  if(doneA!==doneB)return doneA?-1:1;
  if(doneA&&doneB)return a.finishedAt-b.finishedAt||b.score-a.score;
  return b.progress-a.progress||b.score-a.score;
 });
 g.result={winner:ranked[0]?.id,ranking:ranked.map(p=>({id:p.id,name:p.name,
  progress:Math.round(p.progress),score:Math.round(p.score),
  finishedAt:p.finishedAt,lives:p.lives,penalties:p.penalties,eliminated:p.eliminated}))};
 emit(g,'finish',{winner:g.result.winner,reason});
}
function react(g,quality='perfect'){
 const p=g.players[0];
 if(g.state!=='playing'||!['green','amber'].includes(g.signal)||p.kind!=='human'||p.eliminated||p.finishedAt!==null)return 0;
 p.combo=Math.min(12,p.combo+1);p.bestCombo=Math.max(p.bestCombo,p.combo);
 const bonus=(quality==='perfect'?35:16)*Math.max(1,p.combo);
 p.score+=bonus;p.progress=clamp(p.progress+(quality==='perfect'?1.5:.7),0,GOAL);
 if(p.progress>=GOAL)finishPlayer(g,p);
 emit(g,'combo',{id:p.id,combo:p.combo,bonus});return bonus;
}
const snapshot=g=>({state:g.state,signal:g.signal,signalTime:g.signalTime,
 raceTime:g.raceTime,round:g.round,trap:g.trap,players:g.players.map(p=>({
 id:p.id,progress:p.progress,lane:p.lane,score:Math.round(p.score),
 penalties:p.penalties,lives:p.lives,finishedAt:p.finishedAt,eliminated:p.eliminated
 }))});
const api=Object.freeze({make,start,input,tick,end,react,punish,snapshot,GOAL,LIMIT});
root.SemaforoCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
