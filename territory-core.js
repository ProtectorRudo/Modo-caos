"use strict";
(function(root){
const N=22,SIZE=N*N,EMPTY=-1,ROUND=105,GOAL=48;
const SPAWNS=[[11,18],[18,3],[3,3],[3,18]];
const COLORS=["#37f7c8","#ff537c","#ffc247","#995eff"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rand=(a,b)=>a+Math.random()*(b-a);
const index=(x,y)=>x+y*N,inside=(x,y)=>x>=0&&x<N&&y>=0&&y<N;
function emit(g,type,id=0,x=0,y=0,value=0){
 g.eventSeq++;g.lastEvent={seq:g.eventSeq,type,id,x,y,value};
}
function player(id){
 const [x,y]=SPAWNS[id];
 return{id,name:["VOS","ROJO","ORO","VIOLETA"][id],x,y,birthX:x,birthY:y,
   trail:[],hp:3,protected:2.1,shield:0,cooldown:-99,
   captures:0,best:0,area:0,score:0,dead:false,
   waypoint:null,phase:0,heading:0,botClock:0};
}
function newGame(opts={}){
 const g={n:N,owners:Array(SIZE).fill(EMPTY),players:Array.from({length:4},(_,i)=>player(i)),
 state:"ready",time:0,remaining:ROUND,winner:-1,combo:0,lastCapture:0,stars:0,
 eventSeq:0,lastEvent:{seq:0,type:"ready",id:0,x:11,y:18,value:0},
 pickups:[],lastPickup:0,humans:opts.humans===2?2:1};
 for(const p of g.players)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  if(dx*dx+dy*dy>3)continue;
  const xx=p.birthX+dx,yy=p.birthY+dy;
  if(inside(xx,yy))g.owners[index(xx,yy)]=p.id;
 }
 count(g);return g;
}
function count(g){
 let sums=[0,0,0,0];
 for(const v of g.owners)if(v>=0)sums[v]++;
 for(const p of g.players){p.area=sums[p.id];p.score=Math.round(1000*p.area/SIZE)/10;}
 return sums;
}
function start(g){g.state="playing";emit(g,"start",0,11,18);}
function owner(g,x,y){return inside(x,y)?g.owners[index(x,y)]:EMPTY;}
function nearest(g,id,x,y){
 let candidate=null,d=Infinity;
 for(let j=0;j<SIZE;j++)if(g.owners[j]===id){
  const xx=j%N,yy=(j/N)|0,dist=(xx-x)**2+(yy-y)**2;
  if(dist<d){d=dist;candidate={x:xx,y:yy};}
 }
 return candidate||{x:g.players[id].birthX,y:g.players[id].birthY};
}
function breakTrail(g,victim,aggressor,x,y){
 const p=g.players[victim];
 if(p.dead||p.protected>0)return false;
 if(p.shield>0){p.shield=0;emit(g,"saved",victim,x,y);return false;}
 p.hp--;p.trail=[];p.protected=2.5;p.x=p.birthX;p.y=p.birthY;
 p.waypoint=null;p.phase=0;
 if(p.hp<=0){p.dead=true;emit(g,"eliminated",victim,x,y,aggressor);}
 else emit(g,"cut",victim,x,y,aggressor);
 return true;
}
function capture(g,id){
 const p=g.players[id];if(!p.trail.length)return 0;
 const before=p.area;
 for(const k of p.trail)g.owners[k]=id;
 p.trail=[];
 const outside=new Uint8Array(SIZE),q=new Int16Array(SIZE);let head=0,tail=0;
 function visit(k){
  if(!outside[k]&&g.owners[k]!==id){outside[k]=1;q[tail++]=k;}
 }
 for(let i=0;i<N;i++){visit(i);visit(index(i,N-1));visit(index(0,i));visit(index(N-1,i));}
 while(head<tail){
  const k=q[head++],x=k%N,y=(k/N)|0;
  if(x>0)visit(k-1);if(x<N-1)visit(k+1);if(y>0)visit(k-N);if(y<N-1)visit(k+N);
 }
 for(let k=0;k<SIZE;k++)if(g.owners[k]!==id&&!outside[k])g.owners[k]=id;
 count(g);const gained=p.area-before;
 p.captures++;p.best=Math.max(p.best,gained);
 if(id===0){g.combo=g.time-g.lastCapture<12?g.combo+1:1;g.lastCapture=g.time;}
 emit(g,"capture",id,Math.round(p.x),Math.round(p.y),gained);
 if(p.score>=GOAL)finish(g,"domination");return gained;
}
function enter(g,id,cx,cy){
 const p=g.players[id];if(p.dead||!inside(cx,cy))return;
 const key=index(cx,cy);
 for(const opp of g.players){
  if(opp.id===id||opp.dead)continue;
  if(opp.trail.indexOf(key)>=0)breakTrail(g,opp.id,id,cx,cy);
 }
 if(g.owners[key]===id){
  if(p.trail.length)capture(g,id);
 }else if(p.trail.indexOf(key)<0){
  p.trail.push(key);
  if(p.trail.length>SIZE*.65)breakTrail(g,id,-1,cx,cy);
 }
 for(let i=g.pickups.length-1;i>=0;i--){
  const s=g.pickups[i];
  if(s.x===cx&&s.y===cy){p.shield=1;g.pickups.splice(i,1);emit(g,"pickup",id,cx,cy);}
 }
}
function move(g,id,x,y,max=2.4){
 if(g.state!=="playing"||g.players[id]?.dead)return false;
 const p=g.players[id];
 x=clamp(Number(x)||0,.08,N-1.08);y=clamp(Number(y)||0,.08,N-1.08);
 let dx=x-p.x,dy=y-p.y,len=Math.hypot(dx,dy);
 if(len<.0001)return false;
 const ratio=Math.min(1,max/len),tx=p.x+dx*ratio,ty=p.y+dy*ratio;
 const divisions=Math.max(1,Math.ceil(Math.hypot(tx-p.x,ty-p.y)*5));
 const prevX=p.x,prevY=p.y;
 for(let n=1;n<=divisions;n++){
  const cx=Math.round(prevX+(tx-prevX)*n/divisions);
  const cy=Math.round(prevY+(ty-prevY)*n/divisions);
  enter(g,id,cx,cy);
  if(p.dead||p.hp<=0)break;
 }
 if(!p.dead){p.x=tx;p.y=ty;}
 return true;
}
function selectBot(g,p){
 const d=rand(4.2,6.5);
 if(p.phase===0){
  p.heading=rand(-Math.PI,Math.PI);
  p.waypoint={x:clamp(p.x+Math.cos(p.heading)*d,1,N-2),
    y:clamp(p.y+Math.sin(p.heading)*d,1,N-2)};
  p.phase=1;
 }else if(p.phase===1){
  const a=p.heading+(Math.random()<.5?-1:1)*rand(1.25,1.8);
  p.waypoint={x:clamp(p.x+Math.cos(a)*d*.9,1,N-2),
    y:clamp(p.y+Math.sin(a)*d*.9,1,N-2)};
  p.phase=2;
 }else{
  p.waypoint=nearest(g,p.id,p.x,p.y);p.phase=0;
 }
 p.botClock=0;
}
function bot(g,id,dt){
 const p=g.players[id];if(p.dead)return;
 p.botClock+=dt;
 if(!p.waypoint)selectBot(g,p);
 if(p.trail.length>23&&p.phase!==0){p.phase=2;p.waypoint=nearest(g,id,p.x,p.y);}
 const deltaX=p.waypoint.x-p.x,deltaY=p.waypoint.y-p.y,dist=Math.hypot(deltaX,deltaY);
 if(dist<.5||p.botClock>7.2){selectBot(g,p);return;}
 const step=Math.min(dist,dt*(2.7+id*.17));
 move(g,id,p.x+deltaX/dist*step,p.y+deltaY/dist*step,step+.01);
}
function addPickup(g){
 for(let t=0;t<25;t++){
  const x=2+Math.floor(rand(0,N-4)),y=2+Math.floor(rand(0,N-4));
  if(owner(g,x,y)===EMPTY&&!g.pickups.some(p=>p.x===x&&p.y===y)){
   g.pickups.push({x,y});emit(g,"star",0,x,y);return;
  }
 }
}
function shield(g,id){
 const p=g.players[id];
 if(g.state!=="playing"||p.dead||g.time-p.cooldown<17)return false;
 p.shield=1;p.cooldown=g.time;p.protected=Math.max(1,p.protected);
 emit(g,"shield",id,Math.round(p.x),Math.round(p.y));return true;
}
function finish(g,why="time"){
 if(g.state==="done")return;
 count(g);g.state="done";
 const rank=ranking(g);g.winner=rank[0]?.id??-1;
 emit(g,"end",g.winner,0,0,why);
}
function tick(g,dt,bots=[1,2,3]){
 if(g.state!=="playing")return;
 dt=clamp(dt,0,.06);g.time+=dt;g.remaining=Math.max(0,ROUND-g.time);
 for(const p of g.players)p.protected=Math.max(0,p.protected-dt);
 for(const id of bots){bot(g,id,dt);if(g.state==="done")break;}
 if(g.time-g.lastPickup>16){g.lastPickup=g.time;if(g.pickups.length<3)addPickup(g);}
 if(g.remaining<=0)finish(g,"time");
 if(g.players[0].hp<=0)finish(g,"eliminated");
}
function ranking(g){return g.players.map(p=>({id:p.id,name:p.name,score:p.score,area:p.area,hp:p.hp,dead:p.dead}))
 .sort((a,b)=>b.area-a.area||b.hp-a.hp);}
function snapshot(g){return{n:g.n,owners:g.owners,players:g.players,state:g.state,time:g.time,
 remaining:g.remaining,winner:g.winner,eventSeq:g.eventSeq,lastEvent:g.lastEvent,
 pickups:g.pickups,combo:g.combo,stars:g.stars,humans:g.humans};}
root.TerritoryCore={N,SIZE,EMPTY,ROUND,GOAL,SPAWNS,COLORS,newGame,start,move,tick,shield,breakTrail,
 capture,enter,finish,owner,ranking,snapshot,index,nearest,inside,addPickup};
})(window);
