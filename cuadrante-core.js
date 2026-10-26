/* CUADRANTE | deterministic arcade engine. No DOM, GPU or AR dependency. */
(function(root){
'use strict';
const W=1.76, LOW=.17, HIGH=2.23, FRONT=3.0, BACK=-3.0, R=.117;
const EPS=.012;
const CLAMP=(v,a,b)=>Math.max(a,Math.min(b,v));
const profiles=[
{name:'PULSO',reaction:.33,skill:.48,speed:2.0,error:.27,pace:4.15,mode:0},
{name:'ÁNGULO',reaction:.28,skill:.59,speed:2.30,error:.19,pace:4.45,mode:1},
{name:'ECO',reaction:.24,skill:.70,speed:2.58,error:.16,pace:4.68,mode:2},
{name:'ESPEJO',reaction:.21,skill:.75,speed:2.83,error:.13,pace:4.86,mode:3},
{name:'VECTOR',reaction:.16,skill:.86,speed:3.10,error:.10,pace:5.06,mode:4},
{name:'NÚCLEO',reaction:.12,skill:.91,speed:3.35,error:.07,pace:5.22,mode:5}
];
const modes=['CLÁSICA','MARCOS','DIAGONALES','VENTANAS','DESPLAZAMIENTO','LABERINTO','TRANSFORMACIÓN'];
const rand=(s)=>{s.rng=(1664525*s.rng+1013904223)>>>0;return s.rng/4294967296};
function ballSpeed(b){return Math.hypot(b.vx,b.vy,b.vz)}
function speedLimit(s){return Math.min(9,6.6+s.level*.28)}
function setSpeed(b,v){const n=ballSpeed(b)||1;b.vx*=v/n;b.vy*=v/n;b.vz*=v/n}
function configMode(s){
 // Make the arena feel alive even if rallies are short; initial rival teaches plain Pong.
 if(s.duel===0)return 0;
 const base=profiles[s.duel].mode;
 const interval=14-Math.min(4,s.duel); // telegraphed changes around every 10–13 s
 const phase=Math.floor(Math.max(0,s.clock-s.startedAt)/interval);
 return Math.min(6,base+(phase%2));
}
function safeGeometry(s,mode){
 if(Math.abs(s.ball.z)<.48)return false;
 const preview=geometry({...s,mode});
 for(const o of preview){
  // Do not materialize a panel around the energy ball.
  const theta=o.ang||0,cs=Math.cos(theta),sn=Math.sin(theta);
  const dx=s.ball.x-o.x,dy=s.ball.y-o.y;
  const xx=dx*cs+dy*sn,yy=-dx*sn+dy*cs;
  if(Math.abs(xx)<o.w/2+R+EPS&&Math.abs(yy)<o.h/2+R+EPS&&Math.abs(s.ball.z-o.z)<o.d/2+R+EPS)return false;
 }
 return true;
}
function geometry(s){
 let mode=s.mode, phase=s.clock, arr=[];
 if(mode===0)return arr;
 const push=(id,x,y,z,w,h,d,ang=0)=>arr.push({id,x,y,z,w,h,d,ang,visible:true});
 if(mode===1){push('frameL',-.99,1.2,-.55,.20,1.72,.23);push('frameR',.99,1.2,-.55,.20,1.72,.23)}
 if(mode===2){push('angleL',-1.29,.62,-.55,.30,.76,.24,.38);push('angleR',1.29,1.77,.45,.30,.76,.24,-.38)}
 if(mode===3){let t=Math.sin(phase*.55)*.34;push('gateL',-1.1+t,1.2,0,.21,1.7,.22);push('gateR',1.1-t,1.2,0,.21,1.7,.22)}
 if(mode===4){let t=Math.sin(phase*.68)*.63;push('slider',t,1.19,.0,.38,.55,.25)}
 if(mode===5){push('mazeA',-1.14,.58,-.82,.30,.70,.23);push('mazeB',1.14,1.82,.57,.30,.68,.23);push('mazeC',0,1.19,0,.57,.20,.25)}
 if(mode===6){let t=Math.sin(phase*.75)*.55;push('coreA',-1.15+t,.58,-.7,.26,.63,.23);push('coreB',1.15-t,1.83,.7,.26,.63,.23);push('coreC',0,1.22,0,.30,.22,.24)}
 return arr;
}
function create(opts={}){
 const s={rng:opts.seed||493801,clock:0,phase:'ready',mode:0,modeName:'CLÁSICA',duel:0,
  player:{x:0,y:1.2,lastX:0,lastY:1.2,vx:0,vy:0,motionAge:0},enemy:{x:0,y:1.2,targetX:0,targetY:1.2,think:0},
  ball:{x:0,y:1.2,z:0,vx:0,vy:0,vz:0},score:[0,0],rally:0,combo:0,bestCombo:0,
  totalHits:0,bestRally:0,arcade:0,scoreServe:0,serveTimer:0,level:0,winner:null,
  modePlay:opts.modePlay==='survival'?'survival':'circuit',tick:0,events:[],warning:0,
  wins:0,matches:0,startedAt:0,autoplay:false,survivalLives:3,pendingMode:-1};
 s.mode=0;return s;
}
function event(s,type,info){s.events.push({type,info,tick:s.tick});if(s.events.length>50)s.events.shift()}
function start(s){s.phase='serve';s.startedAt=s.clock;newServe(s,true);event(s,'begin');return s}
function newServe(s,initial=false){
 s.ball.x=0;s.ball.y=1.20;s.ball.z=0;
 let p=profiles[s.duel],fromOpponent=initial||s.scoreServe===1;
 let dir=fromOpponent?1:-1,spd=p.pace+(rand(s)-.5)*.45;
 s.ball.vz=dir*spd;s.ball.vx=(rand(s)-.5)*1.32;s.ball.vy=(rand(s)-.5)*.79;
 setSpeed(s.ball,spd);s.rally=0;s.combo=0;s.serveTimer=initial?.85:.52;s.phase='serve';
 s.enemy.think=0;s.warning=0;s.pendingMode=-1;event(s,'serve',fromOpponent?'enemy':'player');
}
function target(s,x,y){s.player.x=CLAMP(x,-W+.37,W-.37);s.player.y=CLAMP(y,LOW+.37,HIGH-.37)}
function returnBall(s,isPlayer){
 const b=s.ball,p=isPlayer?s.player:s.enemy;
 const ux=CLAMP((b.x-p.x)/.43,-1,1),uy=CLAMP((b.y-p.y)/.43,-1,1), prof=profiles[s.duel];
 const previous=ballSpeed(b),side=isPlayer?-.1:.12;
 const smash=isPlayer&&Math.abs(p.vx)+Math.abs(p.vy)>3.8&&Math.abs(ux)<.7&&Math.abs(uy)<.7;
 let vx=ux*2.20 + (isPlayer?s.player.vx*.21:(rand(s)-.5)*(.8+s.duel*.08));
 let vy=uy*1.48 + (isPlayer?s.player.vy*.14:(rand(s)-.5)*(.65+s.duel*.06));
 if(!isPlayer){
  if(s.duel===1)vx+=Math.sign(ux||rand(s)-.5)*.9;
  if(s.duel===2)vx+=(rand(s)<.55?1:-1)*1.25;
  if(s.duel===4||s.duel===5){vx+=CLAMP((s.player.x-b.x)*-.32,-.8,.8);vy+=CLAMP((s.player.y-b.y)*-.32,-.5,.5)}
 }
 b.vz=(isPlayer?-1:1)*Math.max(3.35,Math.abs(b.vz)*.92);
 b.vx=CLAMP(vx+side,-3.15,3.15);b.vy=CLAMP(vy,-2.05,2.05);
 const spd=Math.min(speedLimit(s),Math.max(prof.pace,previous*1.018+.07+(smash?.38:0)));
 if(smash){b.vx+=p.vx*.1;b.vy+=p.vy*.08}
 setSpeed(b,spd);
 if(Math.abs(b.vz)<2.4){b.vz=Math.sign(b.vz)*2.4;setSpeed(b,spd)}
 s.rally++;s.bestRally=Math.max(s.bestRally,s.rally);
 if(isPlayer){s.totalHits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);
  const perfect=Math.abs(ux)<.25&&Math.abs(uy)<.25;
  s.arcade+=100+Math.min(300,s.combo*18)+(perfect?100:0);
  event(s,smash?'smash':perfect?'perfect':'hit',{combo:s.combo,rally:s.rally,edge:Math.max(Math.abs(ux),Math.abs(uy))>.76,smash});
 } else event(s,'rivalHit',{rally:s.rally});
}
function collisionAABB(b,v,dt,o){
 // Continuous swept sphere versus an oriented box. Rotate velocity and
 // start point into the solid's local coordinates before slab intersection.
 const theta=o.ang||0,cs=Math.cos(theta),sn=Math.sin(theta);
 const dx=b.x-o.x,dy=b.y-o.y;
 const p=[dx*cs+dy*sn,-dx*sn+dy*cs,b.z-o.z];
 const vel=[v.vx*cs+v.vy*sn,-v.vx*sn+v.vy*cs,v.vz];
 const min=[-o.w/2-R,-o.h/2-R,-o.d/2-R],max=[o.w/2+R,o.h/2+R,o.d/2+R];
 let enter=0,exit=dt,axis=-1,normal=0;
 for(let k=0;k<3;k++){
  if(Math.abs(vel[k])<1e-9){if(p[k]<min[k]||p[k]>max[k])return null;continue}
  let ta=(min[k]-p[k])/vel[k],tb=(max[k]-p[k])/vel[k],norm=vel[k]>0?-1:1;
  if(ta>tb){const t=ta;ta=tb;tb=t}
  if(ta>enter){enter=ta;axis=k;normal=norm}
  exit=Math.min(exit,tb);if(enter>exit+1e-9)return null;
 }
 if(axis<0)return null;
 const nx=(axis===0?cs:axis===1?-sn:0)*normal;
 const ny=(axis===0?sn:axis===1?cs:0)*normal;
 const nz=(axis===2?1:0)*normal;
 return {t:enter,axis,normal,nx,ny,nz,kind:'obstacle',id:o.id};
}
function advance(s,dt){
 const b=s.ball,profile=profiles[s.duel];const ob=geometry(s);
 const wall=[
  {t:(b.vx>0?(W-R-b.x)/b.vx:(b.vx<0?(-W+R-b.x)/b.vx:Infinity)),axis:0,normal:b.vx>0?-1:1,kind:'wall'},
  {t:(b.vy>0?(HIGH-R-b.y)/b.vy:(b.vy<0?(LOW+R-b.y)/b.vy:Infinity)),axis:1,normal:b.vy>0?-1:1,kind:'wall'}];
 let remain=dt,n=0;
 while(remain>1e-7&&n++<10){
  let hit=null;
  const candidates=[];
  for(const c of wall){
   // recompute because velocity and position change between collisions
   const vel=c.axis===0?b.vx:b.vy,coord=c.axis===0?b.x:b.y;
   const lo=c.axis===0?-W+R:LOW+R,hi=c.axis===0?W-R:HIGH-R;
   if(Math.abs(vel)>1e-9){let t=((vel>0?hi:lo)-coord)/vel;
    if(t>=-1e-7&&t<=remain+1e-7)candidates.push({t:Math.max(0,t),axis:c.axis,normal:vel>0?-1:1,kind:'wall'});}
  }
  if(b.vz>0){let t=(FRONT-R-b.z)/b.vz;if(t>=-1e-7&&t<=remain)candidates.push({t:Math.max(0,t),axis:2,kind:'front'});}
  if(b.vz<0){let t=(BACK+R-b.z)/b.vz;if(t>=-1e-7&&t<=remain)candidates.push({t:Math.max(0,t),axis:2,kind:'back'});}
  for(const o of ob){let c=collisionAABB(b,b,remain,o);if(c)candidates.push(c)}
  for(const c of candidates)if(!hit||c.t<hit.t)hit=c;
  if(!hit){b.x+=b.vx*remain;b.y+=b.vy*remain;b.z+=b.vz*remain;remain=0;break}
  b.x+=b.vx*hit.t;b.y+=b.vy*hit.t;b.z+=b.vz*hit.t;remain-=hit.t;
  if(hit.kind==='front'||hit.kind==='back'){
   const isPlayer=hit.kind==='front';const p=isPlayer?s.player:s.enemy;
   const caught=Math.abs(b.x-p.x)<(.375+R)&&Math.abs(b.y-p.y)<(.375+R);
   if(!caught){point(s,!isPlayer);return}
   returnBall(s,isPlayer);if(!isPlayer&&s.duel>=3&&rand(s)<.20)event(s,'feint'); 
  }else {
   if(hit.kind==='obstacle'){
    const dot=b.vx*hit.nx+b.vy*hit.ny+b.vz*hit.nz;
    b.vx=(b.vx-2*dot*hit.nx)*.995;
    b.vy=(b.vy-2*dot*hit.ny)*.995;
    b.vz=(b.vz-2*dot*hit.nz)*.995;
    b.x+=hit.nx*.002;b.y+=hit.ny*.002;b.z+=hit.nz*.002;
   }else{
    let vel=hit.axis===0?'vx':hit.axis===1?'vy':'vz';
    b[vel]=Math.abs(b[vel])*hit.normal*.995;
    b.x+=hit.axis===0?hit.normal*.002:0;
    b.y+=hit.axis===1?hit.normal*.002:0;
    b.z+=hit.axis===2?hit.normal*.002:0;
   }
   if(hit.kind==='obstacle')event(s,'geometryHit',{id:hit.id});
   else if(rand(s)<.16)event(s,'wall');
  }
  remain=Math.max(0,remain-.00001);
  if(n===10){event(s,'physicsLimit');break}
 }
}
function point(s,playerWon){
 s.score[playerWon?0:1]++;s.scoreServe=playerWon?1:0;s.arcade+=playerWon?350:0;
 event(s,playerWon?'goal':'conceded',{score:[...s.score]});
 if(s.modePlay==='survival'){
  if(!playerWon)s.survivalLives--;
  if(playerWon&&s.score[0]>0&&s.score[0]%4===0){
   s.duel=Math.min(5,s.duel+1);s.level=s.duel;s.mode=profiles[s.duel].mode;
   event(s,'nextRival',profiles[s.duel].name);
  }
  if(s.survivalLives<=0){s.winner='enemy';s.phase='finished';s.matches++;event(s,'matchEnd',{winner:'enemy',survival:true});return}
  newServe(s);return
 }
 if(s.score[0]>=5||s.score[1]>=5){
  s.winner=s.score[0]>=5?'player':'enemy';s.phase='finished';s.matches++;
  if(s.winner==='player'){s.wins++;if(s.modePlay==='circuit'&&s.duel<profiles.length-1){event(s,'duelWon',{next:s.duel+1});return}}
  event(s,'matchEnd',{winner:s.winner,duel:s.duel});return;
 }
 newServe(s);
}
function next(s){if(s.phase!=='finished'||s.winner!=='player'||s.duel>=profiles.length-1)return false;
 s.duel++;s.level=s.duel;s.score=[0,0];s.winner=null;s.mode=profiles[s.duel].mode;s.modeName=modes[s.mode];s.phase='ready';
 start(s);event(s,'nextRival',profiles[s.duel].name);return true}
function retry(s){const fresh=create({seed:(s.rng+777)>>>0,modePlay:s.modePlay});
 fresh.duel=s.duel;fresh.level=s.level;fresh.wins=s.wins;fresh.arcade=s.arcade;
 fresh.mode=profiles[fresh.duel].mode;start(fresh);return fresh}
function step(s,dt=1/120){
 if(s.phase==='paused'||s.phase==='ready'||s.phase==='finished')return;
 dt=CLAMP(dt,0,1/30);s.clock+=dt;s.tick++;
 const p=s.player;
 const mx=p.x-p.lastX,my=p.y-p.lastY;
 if(Math.abs(mx)+Math.abs(my)>1e-5){
  p.vx=CLAMP(mx/dt,-11,11);p.vy=CLAMP(my/dt,-11,11);p.motionAge=0;
 }else{
  p.motionAge+=dt;
  const fade=Math.exp(-dt/0.065);
  p.vx*=fade;p.vy*=fade;
  if(p.motionAge>.20){p.vx=0;p.vy=0}
 }
 p.lastX=p.x;p.lastY=p.y;
 const e=s.enemy,b=s.ball,pr=profiles[s.duel];e.think-=dt;
 if(e.think<=0){
  e.think=pr.reaction;
  // Linear interception estimate, with wall folds (does not allow teleporting).
  const time=b.vz<-.2?CLAMP((BACK+R-b.z)/b.vz,.0,2.4):.5;
  const fold=(v,low,high)=>{const size=high-low,period=2*size;let t=((v-low)%period+period)%period;return low+(t>size?period-t:t)};
  e.targetX=CLAMP(fold(b.x+b.vx*time,-W+R,W-R)+(rand(s)-.5)*pr.error*2,-W+.37,W-.37);
  e.targetY=CLAMP(fold(b.y+b.vy*time,LOW+R,HIGH-R)+(rand(s)-.5)*pr.error*2,LOW+.37,HIGH-.37);
  if(b.vz>0){e.targetX=CLAMP(b.x,-W+.37,W-.37);e.targetY=CLAMP(b.y,LOW+.37,HIGH-.37)}
 }
 let max=pr.speed*dt;
 e.x+=CLAMP(e.targetX-e.x,-max,max);e.y+=CLAMP(e.targetY-e.y,-max,max);
 if(s.phase==='serve'){s.serveTimer-=dt;if(s.serveTimer<=0){s.phase='playing';event(s,'launch')}return}
 // Telegraph arena shifts and wait until moving solid geometry cannot trap the ball.
 const nextMode=configMode(s);
 if(nextMode!==s.mode){
  if(s.pendingMode!==nextMode){s.pendingMode=nextMode;s.warning=0;event(s,'transformWarning',modes[nextMode]);}
  s.warning+=dt;
  if(s.warning>.72&&safeGeometry(s,nextMode)){
   s.mode=nextMode;s.modeName=modes[nextMode];s.warning=0;s.pendingMode=-1;
   event(s,'transform',s.modeName);
  }
 }else{s.warning=0;s.pendingMode=-1;}
 advance(s,dt);
}
function pause(s){if(s.phase==='playing'||s.phase==='serve'){s.oldPhase=s.phase;s.phase='paused';event(s,'pause')}}
function resume(s){if(s.phase==='paused'){s.phase=s.oldPhase||'playing';event(s,'resume')}}
function drain(s){return s.events.splice(0)}
function anchoredArena(hit,baseYaw,rotation,offset,scale){
 // The player's defending plane is at local z=+3; position the room
 // so that plane coincides with the detected floor target, not behind us.
 const theta=baseYaw+rotation;
 const depth=3*scale+(offset.z||0);
 const side=offset.x||0;
 return {
  x:hit.x+Math.cos(theta)*side-Math.sin(theta)*depth,
  y:hit.y+.06,
  z:hit.z-Math.sin(theta)*side-Math.cos(theta)*depth,
  rotation:theta
 };
}
function touchDelta(dx,dy,width,height,sensitivity=1){
 // Same physical swipe has comparable steering at different screen sizes.
 // Saturate huge pointer jumps, not slow deliberate fine movements.
 const w=Math.max(260,width),h=Math.max(260,height);
 const portrait=h>=w;
 const factor=CLAMP(Number(sensitivity)||1,.60,1.45);
 return {
  x:CLAMP(dx/w*(portrait?4.02:4.38)*factor,-.92,.92),
  y:CLAMP(-dy/h*(portrait?2.92:3.1)*factor,-.55,.55)
 };
}
function predictedLanding(s){
 const b=s.ball;if(b.vz<=.03)return null;
 const t=(FRONT-R-b.z)/b.vz;
 if(t<=0||t>3.4)return null;
 const bounce=(v,lo,hi)=>{const size=hi-lo,w=2*size;const z=((v-lo)%w+w)%w;return lo+(z>size?w-z:z)};
 return {x:bounce(b.x+b.vx*t,-W+R,W-R),y:bounce(b.y+b.vy*t,LOW+R,HIGH-R),seconds:t,
  // Obstacles can alter the future trajectory: only promise precision in the empty arena.
  reliable:s.mode===0};
}
root.CuadranteCore={create,start,step,target,pause,resume,next,retry,drain,geometry,predictedLanding,anchoredArena,touchDelta,profiles,modes,bounds:{W,LOW,HIGH,FRONT,BACK,R}};
})(typeof window!=='undefined'?window:globalThis);
