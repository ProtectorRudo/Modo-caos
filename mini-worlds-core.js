/* MINI WORLDS — deterministic platform adventure core. No DOM, Three.js or AR dependency. */
(function(root,factory){const C=factory();if(typeof module==='object'&&module.exports)module.exports=C;root.MiniWorldsCore=C})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<r;
const BOX_TOP=.59; // matches makeBox GLB dimensions and procedural mesh above the ground
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
 // Cursed flowers can be restored by the witch's light spell; inspired by
 // transformation puzzles, using 100% original rune/scenario visuals.
 const runes=[3,4,6].map((id,i)=>{
  const p=platforms[id];return {id:i,x:p.x+(i%2?-.55:.55),z:p.z-.37,y:p.y+.95,restored:false};
 });
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
 return {n,definition:LEVELS[n],platforms,walkways,boxes,coins,enemies,stars,checkpoints,boss,runes};
}
function create(n=0){
 const map=level(n);map.scenery=[];
 const player={x:0,z:1.2,y:0,vy:0,vx:0,vz:0,face:Math.PI,hearts:3,invuln:0,grounded:true,jumps:0,attack:0,attackId:0,coyote:0,buffer:0,onBox:null};
 return {map,player,phase:'ready',clock:0,coins:0,stars:0,kills:0,combo:0,chaos:{charge:0,fury:0,chain:0,window:0,best:0,bonusCoins:0},checkpoint:{x:0,z:1.2,y:0},events:[],hazards:[],projectiles:[],magicShots:[],lastInput:{x:0,z:0},won:false,deadCount:0,travel:0};
}
function emit(s,type,data={}){s.events.push({...data,type})} // event name always wins over entity.kind
// The arcade loop rewards skilled consecutive actions, not merely elapsed
// time. A meter fills from pickups, broken crates and enemy defeats.
function gainChaos(s,amount,kind){
 const q=s.chaos;if(!q||s.phase!=='playing')return;
 if(q.fury>0)return; // Fury cannot refill itself indefinitely
 q.charge=clamp(q.charge+amount,0,100);
 if(q.charge>=100){
  q.charge=0;q.fury=7.0;q.chain=0;q.window=0;
  emit(s,'furyStart',{seconds:7,kind});
 }
}
function advanceChain(s,kind){
 const q=s.chaos;
 q.chain=(q.window>0?q.chain:0)+1;
 q.best=Math.max(q.best,q.chain);
 q.window=kind==='coin'?1.55:3.3;
 if(q.chain===3||q.chain===5||q.chain===8){
  const amount=q.chain===3?3:q.chain===5?5:8;
  s.coins+=amount;q.bonusCoins+=amount;
  emit(s,'combo',{chain:q.chain,coins:amount,kind});
 }
}
function prizeBox(s,b){
 // A seeded, repeatable surprise (no remote service and no casino-style
 // spending): the same chest produces the same reward for a given level.
 const hash=(b.id*13+s.map.n*7+19)%12;
 if(hash===0&&s.player.hearts<3){s.player.hearts++;emit(s,'heart',{source:'box',x:b.x,z:b.z});return}
 if(hash<=3){
  s.coins+=5;s.chaos.bonusCoins+=5;
  emit(s,'treasure',{id:b.id,coins:5,x:b.x,z:b.z});
 }else if(hash===4){
  gainChaos(s,18,'box');
  emit(s,'orb',{id:b.id,x:b.x,z:b.z,charge:18});
 }
}

function damage(s,source){
 const p=s.player;if(p.invuln>0||s.phase!=='playing')return;
 s.chaos.chain=0;s.chaos.window=0;
 p.hearts--;p.invuln=1.45;p.vy=3.5;p.grounded=false;emit(s,'hurt',{source,hearts:p.hearts});
 if(p.hearts<=0){s.deadCount++;emit(s,'down');respawn(s,true)}
}
function respawn(s,full=false){
 const p=s.player;p.x=s.checkpoint.x;p.z=s.checkpoint.z;p.y=s.checkpoint.y+.06;p.vx=p.vz=p.vy=0;p.grounded=false;p.jumps=0;p.onBox=null;p.invuln=2;
 if(full){p.hearts=3;emit(s,'retry')}else emit(s,'respawn');
}
// A compact wand spell replaces the old contact sword. Bolts travel through
// logical space and are checked against actual 3D targets. Close hits are
// registered instantly so input still feels responsive on Android.
function spellDamage(s,target,kind,shot){
 const fury=s.chaos.fury>0,amount=fury?2:1;
 if(kind==='box'){
  if(!target.alive)return false;
  target.hp-=amount;target.flash=.25;
  const y=platformY(s,target.x,target.z)??0;
  emit(s,'boxHit',{id:target.id,kind:target.type,x:target.x,z:target.z,y,spell:true,fury});
  if(target.hp<=0){
   target.alive=false;emit(s,'boxBreak',{id:target.id,kind:target.type,x:target.x,z:target.z,y});
   const bounty=(target.type==='coins'?6:target.type==='reinforced'?4:2)*(fury?2:1);
   s.coins+=bounty;emit(s,'bonus',{count:bounty,x:target.x,z:target.z,y});
   advanceChain(s,'box');gainChaos(s,16,'box');prizeBox(s,target);
   if(target.type==='mystery'&&s.player.hearts<3&&target.id%2===0){s.player.hearts++;emit(s,'heart')}
   if(target.type==='secret'&&!s.map.stars[2].taken){
    const st=s.map.stars[2];st.taken=true;s.stars++;gainChaos(s,32,'star');emit(s,'star',{id:2,x:st.x,y:st.y,z:st.z});
   }
  }
 }else if(kind==='enemy'){
  if(!target.alive)return false;
  target.hp-=amount;target.stun=.45;target.flash=.22;
  emit(s,'enemyHit',{id:target.id,kind:target.type,x:target.x,y:target.y,z:target.z,hp:target.hp,spell:true});
  if(target.hp<=0){
   target.alive=false;s.kills++;
   const reward=fury?6:3;s.coins+=reward;
   emit(s,'enemyDown',{id:target.id,kind:target.type,x:target.x,y:target.y,z:target.z,reward,combo:s.kills,fury});
   advanceChain(s,'enemy');gainChaos(s,25,'enemy');
  }
 }else if(kind==='rune'){
  if(target.restored)return false;
  target.restored=true;
  s.coins+=5;gainChaos(s,14,'restore');
  emit(s,'runeRestored',{id:target.id,x:target.x,y:target.y,z:target.z,reward:5});
 }else if(kind==='boss'){
  if(!target.active||!target.alive||target.weak<=0||target.invuln>0)return false;
  target.hp-=amount;target.invuln=.38;target.weak=Math.max(.25,target.weak-.22);
  emit(s,'bossHit',{hp:target.hp,x:target.x,y:target.y+1.5,z:target.z,spell:true});
  if(target.hp<=0){
   target.alive=false;s.phase='won';s.won=true;s.coins+=25;
   emit(s,'bossDown',{x:target.x,y:target.y,z:target.z});
   emit(s,'win',{level:s.map.n,coins:s.coins,stars:s.stars,time:s.clock});
  }else{
   const next=target.hp<=3?3:target.hp<=6?2:1;
   if(next!==target.phase){target.phase=next;emit(s,'bossPhase',{phase:next})}
  }
 }
 emit(s,'spellHit',{x:target.x,y:kind==='boss'?target.y+1.3:kind==='enemy'?target.y+1.1:(platformY(s,target.x,target.z)??0)+.45,z:target.z,kind});
 return true;
}
// Narrow, deterministic aim assistance solves small mobile-screen targets.
// Player must still FACE the target, fire, and let the projectile physically
// travel and collide. It never shoots through objects or behind the fox.
function chooseShotAim(s,forward){
 const p=s.player,dir=forward||{x:Math.sin(p.face),z:Math.cos(p.face)};
 let best=null,bestScore=Infinity;
 function consider(target,kind,priority=0){
  if(!target)return;
  const x=target.x-p.x,z=target.z-p.z,d=Math.hypot(x,z);
  if(d<.45||d>7.0)return;
  const dot=(x*dir.x+z*dir.z)/d;
  if(dot<.88)return; // 28° cone; never snap behind or sideways
  const height=kind==='boss'?1.2:kind==='rune'?.4:kind==='box'?.5:.5;
  if(Math.abs(p.y+.76-(target.y+height))>2.6)return;
  const miss=1-dot,score=miss*5+d*.065+priority;
  if(score<bestScore){bestScore=score;best={kind,id:target.id,x:target.x,z:target.z,distance:d,dx:x/d,dz:z/d}}
 }
 const mission=s.mission;
 // Prioritize objectives over decoration, especially crystal mechanisms.
 for(const r of s.map.runes)if(!r.restored)consider(r,'rune',mission?.id===0?-.40:.30);
 for(const e of s.map.enemies)if(e.alive)consider(e,'enemy',mission?.id===1?-.14:0);
 for(const b of s.map.boxes)if(b.alive)consider(b,'box',.35);
 const boss=s.map.boss;
 if(boss.active&&boss.alive&&boss.weak>0&&boss.invuln<=0)consider(boss,'boss',-.15);
 return best;
}
function attack(s){
 const p=s.player;if(s.phase!=='playing'||p.attack>.05)return false;
 const fury=s.chaos.fury>0,face=p.face,forward={x:Math.sin(face),z:Math.cos(face)};
 const locked=chooseShotAim(s,forward),dir=locked||forward;
 p.attack=(fury?.23:.32)-Math.min(.075,Math.max(0,p.blasterBoost||0));p.attackId++;
 p.lastShotAim=locked?{kind:locked.kind,id:locked.id,dx:dir.dx,dz:dir.dz,time:s.clock}:null;
 const vx=Number.isFinite(dir.dx)?dir.dx:dir.x,vz=Number.isFinite(dir.dz)?dir.dz:dir.z;
 const shot={id:p.attackId,x:p.x+vx*.40,z:p.z+vz*.40,y:p.y+.76,
  dx:vx,dz:vz,ttl:1.10,speed:fury?10.1:8.3,ignore:[]};
 s.magicShots.push(shot);
 emit(s,'spellCast',{id:shot.id,x:shot.x,y:shot.y,z:shot.z,dx:vx,dz:vz,fury,aim:locked?.kind||null});
 // Tiny immediate magic cone fixes close-contact responsiveness.
 let hits=0;
 const veryNear=(obj,r)=>Math.hypot(obj.x-p.x,obj.z-p.z)<r;
 for(const b of s.map.boxes)if(b.alive&&veryNear(b,.95)&&Math.abs(p.y-(platformY(s,b.x,b.z)??0))<1.3){
  if(spellDamage(s,b,'box',shot)){shot.ignore.push('box'+b.id);hits++}
 }
 for(const e of s.map.enemies)if(e.alive&&veryNear(e,1.04)&&Math.abs(e.y-p.y)<2.1){
  if(spellDamage(s,e,'enemy',shot)){shot.ignore.push('enemy'+e.id);hits++}
 }
 const b=s.map.boss;
 if(b.active&&b.alive&&b.weak>0&&veryNear(b,2.0)&&spellDamage(s,b,'boss',shot)){
  shot.ignore.push('boss');hits++;
 }
 if(hits)emit(s,'hit',{count:hits});
 return true;
}
function updateMagicShots(s,dt){
 const shots=s.magicShots;
 for(let i=shots.length-1;i>=0;i--){
  const q=shots[i];q.ttl-=dt;
  // Substeps avoid tunneling through narrow crates on low FPS phones.
  const travel=q.speed*dt,n=Math.max(1,Math.ceil(travel/.18)),step=travel/n;
  let collided=false;
  for(let k=0;k<n&&!collided;k++){
   q.x+=q.dx*step;q.z+=q.dz*step;
   for(const box of s.map.boxes){
    if(!box.alive||q.ignore.includes('box'+box.id))continue;
    const floor=platformY(s,box.x,box.z)??0;
    if(Math.hypot(q.x-box.x,q.z-box.z)<.42&&Math.abs(q.y-(floor+.52))<.98){
     collided=spellDamage(s,box,'box',q);if(collided)break;
    }
   }
   if(collided)break;
   // A solid tree or rock stops physical projectiles, too.
   for(const o of s.map.scenery||[]){
    if(o.enabled===false)continue;
    if(Math.hypot(q.x-o.x,q.z-o.z)<o.radius+.04&&q.y>o.y+.04&&q.y<o.y+o.height){
     collided=true;emit(s,'spellHit',{x:q.x,z:q.z,y:q.y,kind:'scenery'});break;
    }
   }
   if(collided)break;
   for(const enemy of s.map.enemies){
    if(!enemy.alive||q.ignore.includes('enemy'+enemy.id))continue;
    if(Math.hypot(q.x-enemy.x,q.z-enemy.z)<.54&&Math.abs(q.y-(enemy.y+.5))<1.5){
     collided=spellDamage(s,enemy,'enemy',q);if(collided)break;
    }
   }
   if(collided)break;
   for(const rune of s.map.runes){
    if(rune.restored)continue;
    if(Math.hypot(q.x-rune.x,q.z-rune.z)<.52&&Math.abs(q.y-rune.y)<1.6){
     collided=spellDamage(s,rune,'rune',q);if(collided)break;
    }
   }
   if(collided)break;
   const boss=s.map.boss;
   if(boss.active&&boss.alive&&boss.weak>0&&!q.ignore.includes('boss')&&
      Math.hypot(q.x-boss.x,q.z-boss.z)<1.25&&Math.abs(q.y-(boss.y+1))<2.1){
    collided=spellDamage(s,boss,'boss',q);
   }
  }
  if(collided||q.ttl<=0){
   if(!collided)emit(s,'spellFade',{x:q.x,y:q.y,z:q.z});
   shots.splice(i,1);
  }
 }
}
function platformY(s,x,z,margin=0){
 let yy=null;
 // The visual platform top and the physics surface use the SAME footprint.
 for(const f of s.map.platforms)
  if(Math.abs(x-f.x)<=f.w/2-.02+margin&&Math.abs(z-f.z)<=f.d/2-.02+margin)yy=Math.max(yy??-100,f.y);
 // Explicit connector corridors are tested with the very same capsule
 // projection as their rendered bridge meshes.
 if(yy!==null)return yy;
 for(const w of s.map.walkways||[]){
  const dx=w.x2-w.x1,dz=w.z2-w.z1,len2=dx*dx+dz*dz;
  const t=clamp(((x-w.x1)*dx+(z-w.z1)*dz)/Math.max(.0001,len2),0,1);
  const px=w.x1+dx*t,pz=w.z1+dz*t;
  if(Math.hypot(x-px,z-pz)<=w.width/2-.06+margin)yy=Math.max(yy??-100,w.y1+(w.y2-w.y1)*t);
 }
 return yy;
}
// Pure logical colliders: artists provide the visible footprint; WebXR does
// not affect physics. Small decorative flowers/grass stay walk-through.
function addScenery(s,def){
 const list=s?.map?.scenery;if(!list||!def)return null;
 const x=Number(def.x),z=Number(def.z),y=Number(def.y);
 if(![x,z,y].every(Number.isFinite))return null;
 const radius=clamp(Number(def.radius)||.22,.13,.52),height=clamp(Number(def.height)||.7,.20,3.2);
 const avoid=[{x:0,z:1.2,r:.75},s.checkpoint&&{...s.checkpoint,r:.65},
  ...(s.mission?.rescues||[]).map(r=>({...r,r:.68})),
  ...s.map.runes.map(r=>({...r,r:.62})),
  ...s.map.boxes.filter(b=>b.alive).map(b=>({...b,r:.52})),
  s.mission?.exit&&{...s.mission.exit,r:.58},
  s.mission?.reactor&&{...s.mission.reactor,r:.66},
  ...s.map.checkpoints.map(c=>({...c,r:.46}))].filter(Boolean);
 if(avoid.some(p=>Math.hypot(p.x-x,p.z-z)<radius+p.r))return null;
 if(s.map.walkways.some(w=>{
  const dx=w.x2-w.x1,dz=w.z2-w.z1,len2=dx*dx+dz*dz;
  const t=clamp(((x-w.x1)*dx+(z-w.z1)*dz)/Math.max(.001,len2),0,1);
  return Math.hypot(x-(w.x1+dx*t),z-(w.z1+dz*t))<Math.min(.39,w.width*.23)+radius;
 }))return null;
 if(list.some(o=>Math.hypot(o.x-x,o.z-z)<o.radius+radius+.05))return null;
 if(y<-1.4||y>4.8)return null;
 const o={id:list.length,x,z,y,radius,height,kind:String(def.kind||'rock'),enabled:true};
 list.push(o);return o;
}
function solveScenery(s,oldX,oldZ){
 const p=s.player;
 for(const o of s.map.scenery||[]){
  if(o.enabled===false||p.y>=o.y+o.height-.01||p.y+1.06<=o.y+.03)continue;
  const r=o.radius+.25;
  let dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz);
  if(d>=r)continue;
  if(d<.00001){dx=oldX-o.x;dz=oldZ-o.z;d=Math.hypot(dx,dz);
   if(d<.00001){dx=1;dz=0;d=1}}
  const nx=dx/d,nz=dz/d;
  p.x=o.x+nx*r;p.z=o.z+nz*r;
  const inward=p.vx*nx+p.vz*nz;
  if(inward<0){p.vx-=nx*inward;p.vz-=nz*inward}
 }
}
function moveEnemies(s,dt){
 const p=s.player;
 for(const e of s.map.enemies){if(!e.alive)continue;e.t+=dt;e.stun=Math.max(0,e.stun-dt);e.flash=Math.max(0,e.flash-dt);e.attack=Math.max(0,e.attack-dt);
 const d=Math.hypot(p.x-e.x,p.z-e.z),focus=d<3.8;
 if(focus&&!e.armed){e.armed=true;emit(s,'enemyAlert',{id:e.id,kind:e.type,x:e.x,y:e.y,z:e.z})}
 if(e.type==='flying'){e.y=1.7+Math.sin(e.t*3+e.id)*.45;e.x=e.baseX+Math.cos(e.t*1.55)*.55;e.z=e.baseZ+Math.sin(e.t*1.2)*.55;}
 else if(e.stun<=0){
 if(e.type==='patrol'){let tx=focus?p.x:e.baseX+Math.sin(e.t)*.75,tz=focus?p.z:e.baseZ;let len=Math.hypot(tx-e.x,tz-e.z)||1;e.x+=clamp((tx-e.x)/len*.74*dt,-.1,.1);e.z+=clamp((tz-e.z)/len*.74*dt,-.1,.1)}
 else if(e.type==='defender'){e.x=e.baseX+Math.sin(e.t*.7)*.25;e.z=e.baseZ}
 }
 // Ground enemies also have physical bodies: KAI slides around them
  // instead of visibly passing through their chest.
  if(p.invuln<=0&&e.type!=='flying'&&Math.abs(p.y-(platformY(s,e.x,e.z)??e.y))<.94){
   const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);
   if(d<.51){
    const nx=d>.0001?dx/d:1,nz=d>.0001?dz/d:0;
    p.x=e.x+nx*.51;p.z=e.z+nz*.51;
    const toward=p.vx*nx+p.vz*nz;
    if(toward<0){p.vx-=toward*nx;p.vz-=toward*nz}
   }
  }
  if(focus&&e.type==='thrower'&&e.attack<=0){e.attack=2.8;emit(s,'enemyFire',{id:e.id});s.projectiles.push({x:e.x,y:1.35,z:e.z,vx:(p.x-e.x)/Math.max(.5,d)*2.9,vz:(p.z-e.z)/Math.max(.5,d)*2.9,life:2.9})}
 if(d<(e.type==='flying'?.62:.58)&&p.y<e.y+.9&&e.stun<=0)damage(s,e.type);
 }
 for(const q of s.projectiles){
  q.x+=q.vx*dt;q.z+=q.vz*dt;q.life-=dt;
  // Enemy bolts hit stone and tree trunks, never magically pass through.
  if((s.map.scenery||[]).some(o=>o.enabled!==false&&
   Math.hypot(q.x-o.x,q.z-o.z)<o.radius+.08&&q.y>o.y&&q.y<o.y+o.height)){
    q.life=0;continue;
  }
  if(Math.hypot(p.x-q.x,p.z-q.z)<.35&&Math.abs(p.y+.4-q.y)<1){damage(s,'projectile');q.life=0}
 }
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
 const chaos=s.chaos;
 if(chaos.window>0){chaos.window=Math.max(0,chaos.window-dt);if(chaos.window===0)chaos.chain=0}
 if(chaos.fury>0){
  chaos.fury=Math.max(0,chaos.fury-dt);
  if(chaos.fury===0)emit(s,'furyEnd');
 }
 const p=s.player;
 p.invuln=Math.max(0,p.invuln-dt);p.attack=Math.max(0,p.attack-dt);
 let ax=clamp(Number(input.x)||0,-1,1),az=clamp(Number(input.z)||0,-1,1),mag=Math.hypot(ax,az);
 if(mag>1){ax/=mag;az/=mag}
 const speed=chaos.fury>0?3.65:3.1;
 p.vx+=((ax*speed)-p.vx)*Math.min(1,dt*13);p.vz+=((az*speed)-p.vz)*Math.min(1,dt*13);
 if(mag>.12)p.face=Math.atan2(ax,az);
 if(input.jump)p.buffer=.14;else p.buffer=Math.max(0,p.buffer-dt);
 if(p.grounded)p.coyote=.10;else p.coyote=Math.max(0,p.coyote-dt);
 if(p.buffer>0&&(p.coyote>0||p.jumps<2&&p.jumps===1)){
  p.vy=p.jumps===1?5.35:6.3;p.jumps++;p.grounded=false;p.coyote=0;p.buffer=0;emit(s,'jump',{double:p.jumps===2});
 }
 if(input.punch)attack(s);
 updateMagicShots(s,dt);
 let oldY=p.y,oldX=p.x,oldZ=p.z;p.x+=p.vx*dt;p.z+=p.vz*dt;p.vy-=16.5*dt;p.y+=p.vy*dt;
 solveScenery(s,oldX,oldZ);
 // Axis-resolved crate collision, with a generous player radius and the option to leap over boxes.
 for(const box of s.map.boxes){
   if(!box.alive)continue;
   const floor=platformY(s,box.x,box.z)??0;
   // Crates are climbable: never apply side blocking when already above
   // their lid, or during the downward arc of a landing on the lid.
   if(p.y>=floor+BOX_TOP-.025||p.y+.65<floor)continue;
   // The collision on a descending crossing must be resolved as a lid
   // landing *before* side blocking would shove the knight outside.
   if(p.vy<=0&&oldY>=floor+BOX_TOP-.035&&p.y<=floor+BOX_TOP)continue;
   const dx=p.x-box.x,dz=p.z-box.z;
   if(Math.abs(dx)>.47||Math.abs(dz)>.47)continue;
   const wasOutsideX=Math.abs(oldX-box.x)>=.47,wasOutsideZ=Math.abs(oldZ-box.z)>=.47;
   if(wasOutsideX&&!wasOutsideZ){p.x=box.x+Math.sign(oldX-box.x)*.47;p.vx=0}
   else if(wasOutsideZ&&!wasOutsideX){p.z=box.z+Math.sign(oldZ-box.z)*.47;p.vz=0}
   else if(Math.abs(dx)>.0&&Math.abs(dx)>Math.abs(dz)){p.x=box.x+Math.sign(dx)*.47;p.vx=0}
   else{p.z=box.z+Math.sign(dz||1)*.47;p.vz=0}
 }
 // Capsule-radius edge assist works during descending jumps only; the
 // broad landing lip is visible terrain, not a new hidden floating floor.
 const normalGround=platformY(s,p.x,p.z);
 const edgeGround=p.vy<=0&&!p.grounded?platformY(s,p.x,p.z,.17):null;
 let ground=normalGround??edgeGround;
 let landedBox=null;
 if(p.vy<=0){
  for(const box of s.map.boxes){
   if(!box.alive)continue;
   const boxFloor=platformY(s,box.x,box.z);
   if(boxFloor===null)continue;
   const top=boxFloor+BOX_TOP;
   const inFootprint=Math.abs(p.x-box.x)<=.36&&Math.abs(p.z-box.z)<=.36;
   const lidHeld=p.onBox===box.id&&Math.abs(oldY-top)<.10;
   // Require the feet to cross the lid from above, or already be standing
   // on it. Side impact cannot teleport the knight onto a crate.
   if(inFootprint&&(lidHeld||oldY>=top-.035&&p.y<=top)&&
      (landedBox===null||top>landedBox.top))landedBox={id:box.id,top};
  }
 }
 const previouslyGrounded=p.grounded;
 p.grounded=false;p.onBox=null;
 if(landedBox&&(ground===null||landedBox.top>=ground-.01)){
  p.y=landedBox.top;p.vy=0;p.grounded=true;p.jumps=0;p.onBox=landedBox.id;
  if(oldY>p.y+.10)emit(s,'land',{surface:'crate',id:landedBox.id});
 }else if(ground!==null&&p.vy<=0){
  const easyStep=previouslyGrounded&&ground>=oldY-.55&&ground<=oldY+.46;
  // Forgiving at the lip, but no floor underneath when truly in open sea.
  const landing=oldY>=ground-.11&&p.y<=ground;
  if(easyStep||landing){
   p.y=ground;p.vy=0;p.grounded=true;p.jumps=0;
   if(!easyStep&&oldY>ground+.10)emit(s,'land',{surface:'soil'});
  }
 }
 if(p.y<-2.8){emit(s,'fall',{x:p.x,y:p.y,z:p.z});respawn(s)}
 for(const c of s.map.coins){
 if(c.taken)continue;
 const dist=Math.hypot(p.x-c.x,p.z-c.z),vertical=Math.abs(p.y+.48-c.y);
 // Gently magnetize loose coins only within clear pickup range. No teleport
 // of distant objects or collision-affecting motion.
 if(dist<.92&&vertical<1.15&&dist>.12){
  const pull=Math.min(dist*.35,dt*(chaos.fury>0?2.2:1.05));
  c.x+=(p.x-c.x)/dist*pull;c.z+=(p.z-c.z)/dist*pull;
 }
 if(Math.hypot(p.x-c.x,p.z-c.z)<.47&&vertical<1.05){
  c.taken=true;s.coins+=chaos.fury>0?2:1;s.combo++;
  advanceChain(s,'coin');gainChaos(s,3,'coin');
  emit(s,'coin',{id:c.id,combo:s.combo,x:c.x,y:c.y,z:c.z,reward:chaos.fury>0?2:1})
 }
}
 for(const a of s.map.stars){if(!a.taken&&Math.hypot(p.x-a.x,p.z-a.z)<.56&&Math.abs(p.y+.35-a.y)<1.18){
 a.taken=true;s.stars++;gainChaos(s,32,'star');emit(s,'star',{id:a.id,x:a.x,y:a.y,z:a.z})}}
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
return {LEVELS,level,create,tick,start,pause,attack,drain,damage,platformY,addScenery,solveScenery,BOX_TOP};
});