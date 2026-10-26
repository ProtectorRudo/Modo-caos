/* MINI WORLDS — deterministic platform adventure core. No DOM, Three.js or AR dependency. */
(function(root,factory){const C=factory();if(typeof module==='object'&&module.exports)module.exports=C;root.MiniWorldsCore=C})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<r;
const LEVELS=[
{name:'LA ISLA DESPIERTA',zone:'ISLA SALVAJE',theme:'lagoon',boss:'DRAGÓN DORADO',description:'Playas, selva, ruinas y el despertar de un dragón colosal.'},
{name:'EL ACANTILADO PERDIDO',zone:'ISLA SALVAJE',theme:'sunset',boss:'REY YETI',description:'Puentes suspendidos, trampas y un gigante de hielo bajo la tormenta.'}
];
function level(n=0){
 n=clamp(n,0,1);
 const shift=n?1.3:0;
 const P=[
 [0,0,4.7,4.4,0,'beach'],[.2,-3.5,3.4,3.2,.22,'beach'],
 [-.55,-6.7,2.2,3,.45,'bridge'],[-1.0,-9.5,2.6,2.9,.55,'jungle'],
 [.65,-12.35,3.5,3.1,.78,'jungle'],[.9,-15.75,3.1,3.1,1.08,'ruins'],
 [-.45,-18.9,2.75,3.0,1.18,'waterfall'],[0,-22.7,5.5,5.2,1.15,'arena'],
 // Optional islands connect to the main route and fill a whole floor, not a narrow ribbon.
 [3.20,-3.40,3.35,3.10,.22,'beach'],
 [-3.05,-9.50,3.20,3.00,.55,'jungle'],
 [3.48,-12.35,3.30,3.12,.78,'jungle'],
 [-2.30,-15.75,3.20,3.05,1.08,'ruins'],
 [-3.28,-18.88,3.22,3.20,1.18,'waterfall'],
 [3.25,-20.18,3.05,3.05,1.15,'ruins']];
 if(n){
  P[0][5]='ruins';P[1][5]='bridge';P[2][5]='bridge';
  P[3][5]='ruins';P[4][5]='bridge';P[5][5]='ruins';P[6][5]='jungle';
  P[1][4]=.36;P[2][4]=.53;P[3][4]=.65;P[4][4]=.88;P[5][4]=1.14;
 }
 // Shift optional islands alongside main-route cliffs, preserving entry paths.
 P[10][0]=n?2.85:3.0;P[11][0]=n?-1.15:-1.75;P[12][0]=n?-1.9:-2.7;
 const platforms=P.map(([x,z,w,d,y,kind],i)=>({id:i,x:x+(i>1&&i<7?shift*Math.sin(i*1.4):0),z,w,d,y,kind,move:i===5?(.6):0}));
 // Every visible transition has a REAL matching collision corridor. Routes
 // are wider than the avatar and graded rather than requiring hidden jumps.
 const walkways=[];
 function link(a,b,width=1.85){
  const p=platforms[a],q=platforms[b];
  walkways.push({id:walkways.length,a,b,x1:p.x,z1:p.z,y1:p.y,x2:q.x,z2:q.z,y2:q.y,width});
 }
 for(let i=0;i<7;i++)link(i,i+1,2.25);
 // The side islands are actual explorable land, with traversable branches.
 for(let i=8;i<14;i++){
  const p=platforms[i],nearest=platforms.slice(0,8).reduce((a,b)=>
   Math.hypot(p.x-b.x,p.z-b.z)<Math.hypot(p.x-a.x,p.z-a.z)?b:a);
  link(nearest.id,i,1.70);
 }
 const boxes=[
 [0,-1.15,'normal'],[.9,-2.35,'coins'],[-.8,-3.9,'normal'],
 [-1.0,-7.4,'reinforced'],[-.25,-9.2,'mystery'],
 [.95,-11.8,'normal'],[-.55,-12.7,'coins'],[1.1,-14.8,'reinforced'],
 [-.1,-16.15,'normal'],[-.5,-18.65,'secret'],[.5,-19.65,'mystery'],
 [-1.7,-22.65,'normal'],[1.7,-22.65,'coins'],
 [3.28,-3.45,'mystery'],[-3.3,-9.6,'coins'],
 [3.5,-12.55,'reinforced'],[-3.1,-18.75,'secret'],
 [3.35,-20.3,'mystery']
 ].map(([x,z,type],i)=>({id:i,x:x+(i>3&&i<11?shift*.25:0),z,type,hp:type==='reinforced'?3:1,alive:true,flash:0}));
 const coins=[];
 const push=(x,z,y=.53)=>coins.push({id:coins.length,x,z,y,taken:false});
 for(let k=0;k<6;k++)push(-.62+(k%3)*.55,-.65-k*.59);
 for(let k=0;k<5;k++)push(-.62+(k%2)*.7,-5.6-k*.62,.95);
 for(let k=0;k<6;k++)push(-1+(k%3)*.72,-9-k*.65,1.08);
 for(let k=0;k<6;k++)push(-.4+(k%3)*.68,-12.1-k*.6,1.40);
 for(let k=0;k<6;k++)push(-.1+(k%3)*.63,-15.1-k*.63,1.68);
 for(let k=0;k<6;k++)push(-.7+(k%3)*.70,-18.1-k*.65,1.78);
 for(let k=0;k<5;k++)push(-1+(k%5)*.5,-21.55,1.78);
 // Collectibles reward lateral exploration of the 6 extra land masses.
 const branches=platforms.slice(8).map(p=>[p.x,p.z,p.y]);
 for(const [bx,bz,by] of branches)for(let i=0;i<4;i++)push(bx-.68+i*.43,bz+(i%2?-.42:.44),by+.59);
 const enemies=(n?[
 [0,-4.15,'flying'],[-1.0,-9.15,'thrower'],[.6,-11.7,'defender'],
 [.7,-15.3,'flying'],[-.2,-18.55,'patrol'],[-1.1,-20.1,'defender'],
 [3.15,-3.65,'patrol'],[-3.1,-18.8,'thrower'],[3.4,-20.3,'defender']
 ]:[
 [0,-4.15,'patrol'],[-1.0,-9.15,'flying'],[.6,-11.7,'defender'],
 [.7,-15.3,'thrower'],[-.2,-18.55,'patrol'],[-1.1,-20.1,'flying'],
 [3.15,-3.65,'patrol'],[3.5,-12.5,'thrower'],[-3.1,-18.8,'defender']
 ]).map(([x,z,type],i)=>({id:i,x,z,baseX:x,baseZ:z,y:type==='flying'?1.75:0,hp:type==='defender'?3:type==='flying'?2:2,type,alive:true,t:0,attack:0,stun:0,flash:0,armed:false}));
 const stars=[{id:0,x:-3.0,z:-10.0,y:1.55,taken:false},{id:1,x:3.9,z:-13.1,y:1.78,taken:false},{id:2,x:-3.0,z:-18.8,y:1.7,taken:false}];
 const checkpoints=[{x:.5,z:-12.3,y:.78},{x:0,z:-19.0,y:1.18}];
 const boss={x:0,z:-24.2,y:1.15,hp:9,maxHp:9,phase:1,active:false,alive:true,weak:0,telegraph:0,attack:0,t:0,invuln:0};
 // Protect collection gameplay from objects stranded between winding islands.
 function ensureLand(obj){
  const pad=.14;
  const available=platforms.map(p=>{
   const x=clamp(obj.x,p.x-p.w/2+pad,p.x+p.w/2-pad),z=clamp(obj.z,p.z-p.d/2+pad,p.z+p.d/2-pad);
   return {x,z,d:Math.hypot(x-obj.x,z-obj.z)};
  });
  const best=available.reduce((a,b)=>b.d<a.d?b:a);
  if(best.d<.00001)return;
  obj.x=best.x;obj.z=best.z;
  if('baseX' in obj){obj.baseX=obj.x;obj.baseZ=obj.z}
 }
 boxes.forEach(ensureLand);coins.forEach(ensureLand);
 enemies.filter(e=>e.type!=='flying').forEach(ensureLand);
 return {n,definition:LEVELS[n],platforms,walkways,boxes,coins,enemies,stars,checkpoints,boss};
}
function create(n=0){
 const map=level(n);
 const player={x:0,z:1.2,y:0,vy:0,vx:0,vz:0,face:Math.PI,hearts:3,invuln:0,grounded:true,jumps:0,attack:0,attackId:0,coyote:0,buffer:0};
 return {map,player,phase:'ready',clock:0,coins:0,stars:0,kills:0,combo:0,checkpoint:{x:0,z:1.2,y:0},events:[],hazards:[],projectiles:[],lastInput:{x:0,z:0},won:false,deadCount:0,travel:0};
}
function emit(s,type,data={}){s.events.push({type,...data})}
function damage(s,source){
 const p=s.player;if(p.invuln>0||s.phase!=='playing')return;
 p.hearts--;p.invuln=1.45;p.vy=3.5;p.grounded=false;emit(s,'hurt',{source,hearts:p.hearts});
 if(p.hearts<=0){s.deadCount++;emit(s,'down');respawn(s,true)}
}
function respawn(s,full=false){
 const p=s.player;p.x=s.checkpoint.x;p.z=s.checkpoint.z;p.y=s.checkpoint.y+.06;p.vx=p.vz=p.vy=0;p.grounded=false;p.jumps=0;p.invuln=2;
 if(full){p.hearts=3;emit(s,'retry')}else emit(s,'respawn');
}
function attack(s){
 const p=s.player;if(s.phase!=='playing'||p.attack>.05)return false;
 p.attack=.36;p.attackId++;emit(s,'swing');
 const dir={x:Math.sin(p.face),z:Math.cos(p.face)};
 function inArc(obj,r=1.10){let dx=obj.x-p.x,dz=obj.z-p.z,dist=Math.hypot(dx,dz);return dist<r&&(dist<.5||(dx*dir.x+dz*dir.z)/Math.max(.01,dist)>.08)}
 let hit=0;
 for(const b of s.map.boxes)if(b.alive&&inArc(b,.94)&&Math.abs(p.y-(platformY(s,b.x,b.z)||0))<2){
 b.hp--;b.flash=.25;hit++;emit(s,'boxHit',{id:b.id,type:b.type,x:b.x,z:b.z,y:platformY(s,b.x,b.z)??0});
 if(b.hp<=0){b.alive=false;emit(s,'boxBreak',{id:b.id,type:b.type,x:b.x,z:b.z,y:platformY(s,b.x,b.z)??0});
 const bounty=b.type==='coins'?6:b.type==='reinforced'?4:2;
 s.coins+=bounty;emit(s,'bonus',{count:bounty});
 if(b.type==='mystery'&&p.hearts<3&&b.id%2===0){p.hearts++;emit(s,'heart')}
 if(b.type==='secret'&&!s.map.stars[2].taken){s.map.stars[2].taken=true;s.stars++;emit(s,'star',{id:2})}
 }}
 for(const e of s.map.enemies)if(e.alive&&inArc(e,1.05)&&Math.abs(e.y-p.y)<2.1){
 e.hp--;e.stun=.45;e.flash=.22;hit++;
 emit(s,'enemyHit',{id:e.id,type:e.type,x:e.x,y:e.y,z:e.z,hp:e.hp});
 if(e.hp<=0){e.alive=false;s.kills++;s.coins+=3;
  emit(s,'enemyDown',{id:e.id,type:e.type,x:e.x,y:e.y,z:e.z,reward:3,combo:s.kills})}
 }
 const b=s.map.boss;if(b.active&&b.alive&&b.weak>0&&b.invuln<=0&&inArc(b,2.0)){
 b.hp--;b.invuln=.38;b.weak=Math.max(.25,b.weak-.22);hit++;emit(s,'bossHit',{hp:b.hp});
 if(b.hp<=0){b.alive=false;s.phase='won';s.won=true;s.coins+=25;emit(s,'bossDown');emit(s,'win',{level:s.map.n,coins:s.coins,stars:s.stars,time:s.clock})}
 else{let next=b.hp<=3?3:b.hp<=6?2:1;if(next!==b.phase){b.phase=next;emit(s,'bossPhase',{phase:next})}}
 }
 if(hit)emit(s,'hit',{count:hit});return true;
}
function platformY(s,x,z){
 let yy=null;
 // The visual platform top and the physics surface use the SAME footprint.
 for(const f of s.map.platforms)
  if(Math.abs(x-f.x)<=f.w/2-.02&&Math.abs(z-f.z)<=f.d/2-.02)yy=Math.max(yy??-100,f.y);
 // Explicit connector corridors are tested with the very same capsule
 // projection as their rendered bridge meshes.
 if(yy!==null)return yy;
 for(const w of s.map.walkways||[]){
  const dx=w.x2-w.x1,dz=w.z2-w.z1,len2=dx*dx+dz*dz;
  const t=clamp(((x-w.x1)*dx+(z-w.z1)*dz)/Math.max(.0001,len2),0,1);
  const px=w.x1+dx*t,pz=w.z1+dz*t;
  if(Math.hypot(x-px,z-pz)<=w.width/2-.06)yy=Math.max(yy??-100,w.y1+(w.y2-w.y1)*t);
 }
 return yy;
}
function moveEnemies(s,dt){
 const p=s.player;
 for(const e of s.map.enemies){if(!e.alive)continue;e.t+=dt;e.stun=Math.max(0,e.stun-dt);e.flash=Math.max(0,e.flash-dt);e.attack=Math.max(0,e.attack-dt);
 const d=Math.hypot(p.x-e.x,p.z-e.z),focus=d<3.8;
 if(e.type==='flying'){e.y=1.7+Math.sin(e.t*3+e.id)*.45;e.x=e.baseX+Math.cos(e.t*1.55)*.55;e.z=e.baseZ+Math.sin(e.t*1.2)*.55;}
 else if(e.stun<=0){
 if(e.type==='patrol'){let tx=focus?p.x:e.baseX+Math.sin(e.t)*.75,tz=focus?p.z:e.baseZ;let len=Math.hypot(tx-e.x,tz-e.z)||1;e.x+=clamp((tx-e.x)/len*.74*dt,-.1,.1);e.z+=clamp((tz-e.z)/len*.74*dt,-.1,.1)}
 else if(e.type==='defender'){e.x=e.baseX+Math.sin(e.t*.7)*.25;e.z=e.baseZ}
 }
 if(focus&&e.type==='thrower'&&e.attack<=0){e.attack=2.8;emit(s,'enemyFire',{id:e.id});s.projectiles.push({x:e.x,y:1.35,z:e.z,vx:(p.x-e.x)/Math.max(.5,d)*2.9,vz:(p.z-e.z)/Math.max(.5,d)*2.9,life:2.9})}
 if(d<(e.type==='flying'?.62:.58)&&p.y<e.y+.9&&e.stun<=0)damage(s,e.type);
 }
 for(const q of s.projectiles){q.x+=q.vx*dt;q.z+=q.vz*dt;q.life-=dt;if(Math.hypot(p.x-q.x,p.z-q.z)<.35&&Math.abs(p.y+.4-q.y)<1){damage(s,'projectile');q.life=0}}
 s.projectiles=s.projectiles.filter(q=>q.life>0);
}
function updateBoss(s,dt){
 const b=s.map.boss,p=s.player;
 if(!b.alive||s.phase!=='playing')return;
 if(!b.active){if(p.z< -20.8){b.active=true;b.t=0;emit(s,'bossIntro')}else return}
 b.t+=dt;b.invuln=Math.max(0,b.invuln-dt);b.weak=Math.max(0,b.weak-dt);b.telegraph=Math.max(0,b.telegraph-dt);b.attack=Math.max(0,b.attack-dt);
 b.x=Math.sin(b.t*(.8+b.phase*.35))*Math.min(1.1,.4+b.phase*.23);
 if(b.attack<=0){
   b.attack=Math.max(1.7,3.3-b.phase*.35);
   b.telegraph=.9;emit(s,'bossWarn',{phase:b.phase});
 }
 if(b.telegraph>0&&b.telegraph-dt<=0){
  b.weak=1.75-b.phase*.12;emit(s,'bossSmash',{phase:b.phase});
  if(Math.hypot(p.x-b.x,p.z-(b.z+1.0))<1.35&&p.y<1.75)damage(s,'boss');
  if(b.phase>=2){s.hazards.push({x:b.x>0?-1.2:1.2,z:-22.6,life:1.6,active:.65});emit(s,'hazard')}
 }
}
function tick(s,input={},dt=1/60){
 if(s.phase!=='playing')return s;
 dt=clamp(dt,0,.034);s.clock+=dt;
 const p=s.player;
 p.invuln=Math.max(0,p.invuln-dt);p.attack=Math.max(0,p.attack-dt);
 let ax=clamp(Number(input.x)||0,-1,1),az=clamp(Number(input.z)||0,-1,1),mag=Math.hypot(ax,az);
 if(mag>1){ax/=mag;az/=mag}
 p.vx+=((ax*3.1)-p.vx)*Math.min(1,dt*13);p.vz+=((az*3.1)-p.vz)*Math.min(1,dt*13);
 if(mag>.12)p.face=Math.atan2(ax,az);
 if(input.jump)p.buffer=.14;else p.buffer=Math.max(0,p.buffer-dt);
 if(p.grounded)p.coyote=.10;else p.coyote=Math.max(0,p.coyote-dt);
 if(p.buffer>0&&(p.coyote>0||p.jumps<2&&p.jumps===1)){
  p.vy=p.jumps===1?5.35:6.3;p.jumps++;p.grounded=false;p.coyote=0;p.buffer=0;emit(s,'jump',{double:p.jumps===2});
 }
 if(input.punch)attack(s);
 let oldY=p.y,oldX=p.x,oldZ=p.z;p.x+=p.vx*dt;p.z+=p.vz*dt;p.vy-=16.5*dt;p.y+=p.vy*dt;
 // Axis-resolved crate collision, with a generous player radius and the option to leap over boxes.
 for(const box of s.map.boxes){
   if(!box.alive)continue;
   const floor=platformY(s,box.x,box.z)??0;
   if(p.y>=floor+.60||p.y+.65<floor)continue;
   const dx=p.x-box.x,dz=p.z-box.z;
   if(Math.abs(dx)>.47||Math.abs(dz)>.47)continue;
   const wasOutsideX=Math.abs(oldX-box.x)>=.47,wasOutsideZ=Math.abs(oldZ-box.z)>=.47;
   if(wasOutsideX&&!wasOutsideZ){p.x=box.x+Math.sign(oldX-box.x)*.47;p.vx=0}
   else if(wasOutsideZ&&!wasOutsideX){p.z=box.z+Math.sign(oldZ-box.z)*.47;p.vz=0}
   else if(Math.abs(dx)>.0&&Math.abs(dx)>Math.abs(dz)){p.x=box.x+Math.sign(dx)*.47;p.vx=0}
   else{p.z=box.z+Math.sign(dz||1)*.47;p.vz=0}
 }
 const ground=platformY(s,p.x,p.z);
 const previouslyGrounded=p.grounded;
 p.grounded=false;
 if(ground!==null&&p.vy<=0){
  // Auto-step small height changes while walking. Without this, entering
  // a perfectly solid 22cm raised platform can make the knight fall THROUGH
  // the island because oldY<ground-.2 forever.
  const easyStep=previouslyGrounded&&ground>=oldY-.55&&ground<=oldY+.46;
  const landFromAbove=oldY>=ground-.24&&p.y<=ground;
  if(easyStep||landFromAbove){
   p.y=ground;p.vy=0;p.grounded=true;p.jumps=0;
   if(!easyStep&&oldY>ground+.10)emit(s,'land');
  }
 }
 if(p.y<-2.8){emit(s,'fall');respawn(s)}
 for(const c of s.map.coins){if(!c.taken&&Math.hypot(p.x-c.x,p.z-c.z)<.44&&Math.abs(p.y+.48-c.y)<1.05){
 c.taken=true;s.coins++;s.combo++;emit(s,'coin',{id:c.id,combo:s.combo})}}
 for(const a of s.map.stars){if(!a.taken&&Math.hypot(p.x-a.x,p.z-a.z)<.56&&Math.abs(p.y+.35-a.y)<1.18){
 a.taken=true;s.stars++;emit(s,'star',{id:a.id})}}
 for(let i=0;i<s.map.checkpoints.length;i++){const c=s.map.checkpoints[i];if(p.z<c.z+.7&&s.checkpoint.z>c.z){s.checkpoint={...c};p.hearts=Math.min(3,p.hearts+1);emit(s,'checkpoint',{id:i})}}
 moveEnemies(s,dt);updateBoss(s,dt);
 for(const h of s.hazards){h.life-=dt;h.active-=dt;if(h.active<=0&&h.active>-dt*1.5&&Math.hypot(h.x-p.x,h.z-p.z)<.75&&p.y<1.8)damage(s,'spikes')}
 s.hazards=s.hazards.filter(h=>h.life>0);
 for(const bx of s.map.boxes)bx.flash=Math.max(0,bx.flash-dt);
 return s;
}
function start(s){if(s.phase==='ready'||s.phase==='paused'){s.phase='playing';emit(s,'start')}return s}
function pause(s){if(s.phase==='playing')s.phase='paused';else if(s.phase==='paused')s.phase='playing'}
function drain(s){return s.events.splice(0)}
return {LEVELS,level,create,tick,start,pause,attack,drain,damage,platformY};
});