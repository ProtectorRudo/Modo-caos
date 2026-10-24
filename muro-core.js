'use strict';
/* MURO RUSH: CAOS V2. Backwards compatible with muro-runtime.js and muro-art.js.
   WebXR uses the handset position, not physical feet or body recognition.
 */
(function(root){
const COUNT=15,LANES=5,COLORS=['#45f2d6','#59bdff','#ffdb68','#ff6eab','#b88bff'];
const CENTERS=[-.8,-.4,0,.4,.8],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const MODES={
 tranquilo:{duration:5.6,min:3.7,step:.11},normal:{duration:4.85,min:2.8,step:.12},
 intenso:{duration:4.1,min:2.45,step:.11},caos:{duration:3.9,min:2.5,step:.11}
};
const lane=x=>clamp(Math.floor((clamp(Number(x)||0,-.999,.999)+1)/.4),0,4);
function rng(seed){let v=(seed>>>0)||7331;return()=>{v^=v<<13;v^=v>>>17;v^=v<<5;return(v>>>0)/4294967296}}
function make(options={}){
 const level=Object.hasOwn(MODES,options.level)?options.level:'normal';
 return{level,seed:options.seed??((Math.random()*0xffffffff)>>>0),
  cfg:MODES[level],random:null,state:'ready',phase:'idle',wall:null,wave:0,wallId:0,
  life:3,score:0,combo:0,bestCombo:0,dodges:0,best:0,perfects:0,shields:1,
  shieldActive:false,playerX:0,lane:2,paused:false,clock:0,remaining:0,wait:0,
  result:null,misses:0,seq:0,lastEvent:{seq:0,type:'ready'},lastLane:2,
  bonuses:0,stars:0,bossBeaten:false,nearMisses:0,challenge:''};
}
function event(g,type,data={}){
 const e={seq:++g.seq,type,wave:g.wave,...data};g.lastEvent=e;
 if(typeof CustomEvent!=='undefined'&&typeof root.dispatchEvent==='function'){
  try{root.dispatchEvent(new CustomEvent('murorush-v2',{detail:{game:g,event:e}}))}catch(err){}
 }
}
const pick=(g,n)=>Math.floor(g.random()*n);
function blueprint(g){
 const i=g.wave,r=g.random;
 if(i<=3)return{kind:'single',special:'tutorial',open:[i===1?2:i===2?1:3],shifts:[]};
 if(i===15){const d=r()<.5?-1:1;return{kind:'switch',special:'boss',open:[2],shifts:[{at:.24,to:[2+d]},{at:.42,to:[2+2*d]}]}}
 if(i===7||i===12){
  const p=1+pick(g,3),d=p===1?1:p===3?-1:r()<.5?-1:1;
  return{kind:'switch',special:'zigzag',open:[p],shifts:[{at:.23,to:[p+d]},{at:.42,to:[p]}]};
 }
 if(i===5||i===10)return{kind:'single',special:'gold',open:[pick(g,5)],shifts:[]};
 const types=i<7?['single','wide','shift']:i<11?['single','wide','shift','closing','turbo','mirage']:
 ['single','wide','shift','closing','turbo','mirage','edge'];
 const kind=types[pick(g,types.length)];
 if(kind==='closing'){const p=pick(g,4),end=r()<.5?p:p+1;return{kind:'wide',special:'closing',open:[p,p+1],shifts:[{at:.35,to:[end]}]}}
 if(kind==='shift'){const p=1+pick(g,3),d=p===1?1:p===3?-1:r()<.5?-1:1;return{kind:'switch',special:'shift',open:[p],shifts:[{at:.33,to:[p+d]}]}}
 if(kind==='wide'){const p=pick(g,4);return{kind:'wide',special:'wide',open:[p,p+1],shifts:[]}}
 if(kind==='edge')return{kind:'edge',special:'edge',open:[r()<.5?0:4],shifts:[]};
 if(kind==='turbo')return{kind:'single',special:'turbo',open:[pick(g,5)],shifts:[]};
 if(kind==='mirage')return{kind:'single',special:'mirage',open:[pick(g,5)],shifts:[]};
 return{kind:'single',special:'standard',open:[pick(g,5)],shifts:[]};
}
function spawn(g){
 if(g.wave>=COUNT){finish(g,'complete');return}
 g.wave++;
 const s=blueprint(g);
 let duration=Math.max(g.cfg.min,g.cfg.duration-(g.wave-1)*g.cfg.step);
 if(s.special==='turbo')duration=Math.max(g.cfg.min,duration*.79);
 if(s.special==='boss')duration+=.85;
 if(s.special==='edge')duration+=.4;
 g.wall={id:++g.wallId,kind:s.kind,special:s.special,open:s.open.slice(),
  initial:s.open.slice(),shifts:s.shifts.map(q=>({...q,to:q.to.slice(),done:false})),
  shiftTo:s.shifts[0]?.to?.[0]??null,shifted:false,progress:0,duration,
  color:s.special==='gold'||s.special==='boss'?'#ffe07e':
    s.special==='turbo'?'#ff657e':s.special==='mirage'?'#ca91ff':COLORS[(g.wave-1)%5],
  bonus:s.special==='gold'||s.special==='boss',gold:s.special==='gold'||s.special==='boss'};
 g.remaining=duration;g.wait=0;g.shieldActive=false;g.phase='wave';g.lastLane=g.wall.open[0];
 if(g.wave===4)g.challenge='¡AHORA EMPIEZAN LAS SORPRESAS!';
 if(g.wave===9)g.challenge='¡MÁS VELOCIDAD!';
 if(g.wave===15)g.challenge='JEFE FINAL';
 event(g,'wall',{kind:s.kind,special:s.special,open:g.wall.open.slice(),duration});
}
function start(g){
 if(g.state!=='ready'&&g.state!=='finished')return false;
 const {level,seed}=g;Object.assign(g,make({level,seed}));
 g.random=rng(seed);g.state='playing';g.phase='countdown';g.wait=2.4;g.lane=2;
 event(g,'start');return true;
}
function setX(g,value){if(!Number.isFinite(value))return false;g.playerX=clamp(value,-.999,.999);g.lane=lane(g.playerX);return true}
function shield(g){
 if(g.state!=='playing'||g.phase!=='wave'||g.shields<=0||g.shieldActive)return false;
 g.shields--;g.shieldActive=true;event(g,'shield');return true;
}
function collide(g){
 if(g.state!=='playing'||g.phase!=='wave'||!g.wall)return;
 const w=g.wall,safe=w.open.some(i=>Math.abs(g.playerX-CENTERS[i])<=.22);
 if(safe){
  const dis=Math.min(...w.open.map(i=>Math.abs(g.playerX-CENTERS[i])));
  const perfect=dis<=.11,nearMiss=!perfect&&dis>.176;
  let points=Math.round((perfect?170:120)*(1+Math.min(g.combo,9)*.16));
  if(w.gold)points=Math.round(points*1.4)+300;
  if(w.special==='turbo')points+=75;
  if(nearMiss){points+=35;g.nearMisses++}
  g.combo++;g.bestCombo=Math.max(g.combo,g.bestCombo);
  if(g.combo%5===0){points+=200;g.bonuses++}
  g.score+=points;g.dodges++;
  if(perfect){g.perfects++;g.stars++;if(g.perfects%4===0)g.shields=Math.min(2,g.shields+1)}
  if(w.special==='boss')g.bossBeaten=true;
  event(g,'dodge',{points,perfect,nearMiss,special:w.special,streak:g.combo,lane:g.lane});
 }else if(g.shieldActive){g.shieldActive=false;event(g,'saved',{special:w.special,lane:g.lane})}
 else{
  g.life--;g.misses++;g.combo=0;event(g,'hit',{life:g.life,special:w.special,lane:g.lane});
  if(g.life<=0){finish(g,'eliminated');return}
 }
 g.phase='between';g.wait=w.gold?1.15:.8;g.wall.progress=1;
}
function finish(g,reason){g.state='finished';g.phase='finished';g.paused=false;g.result=reason;g.remaining=0;event(g,'finish',{reason,score:g.score,dodges:g.dodges})}
function pause(g,p){if(g.state!=='playing')return;const v=!!p;if(g.paused!==v){g.paused=v;event(g,v?'pause':'resume')}}
function tick(g,dt){
 if(g.state!=='playing'||g.paused)return;
 dt=clamp(Number(dt)||0,0,.08);g.clock+=dt;
 if(g.phase==='countdown'||g.phase==='between'){g.wait=Math.max(0,g.wait-dt);if(g.wait<=0)spawn(g)}
 else if(g.phase==='wave'){
  const w=g.wall;g.remaining=Math.max(0,g.remaining-dt);w.progress=clamp(1-g.remaining/w.duration,0,1);
  for(const step of w.shifts)if(!step.done&&w.progress>=step.at){
   step.done=true;w.open=step.to.slice();w.shifted=true;g.lastLane=w.open[0];
   event(g,'shift',{open:w.open.slice(),special:w.special});
  }
  if(g.remaining<=0)collide(g);
 }
}
function scorecard(g){return{state:g.state,phase:g.phase,paused:g.paused,wave:g.wave,total:COUNT,
 time:g.remaining,wall:g.wall,life:g.life,score:g.score,combo:g.combo,
 dodges:g.dodges,perfects:g.perfects,shield:g.shields,active:g.shieldActive,
 player:g.playerX,lane:g.lane,result:g.result,lastEvent:g.lastEvent,
 bonuses:g.bonuses,bossBeaten:g.bossBeaten,nearMisses:g.nearMisses,
 challenge:g.challenge,bestCombo:g.bestCombo}}
root.MuroRushCore={COUNT,LANES,MODES,COLORS,CENTERS,make,start,tick,pause,collide,shield,setX,scorecard,lane,finish};
if(typeof document==='undefined'||!document.getElementById)return;
const difficulty=document.getElementById('difficulty');
if(difficulty&&!Array.from(difficulty.options).some(o=>o.value==='caos')){
 const o=document.createElement('option');o.value='caos';o.textContent='🌪 Caos · Expertos';difficulty.appendChild(o);
}
const sheet=document.createElement('style');
sheet.textContent=[
 '#mrAlert{display:none;position:absolute;z-index:23;top:18%;left:12%;right:12%;padding:10px 9px;border-radius:13px;border:1px solid #4effd7;background:#082d40e8;text-align:center;color:#e6fff5;pointer-events:none;font:1000 14px/1.2 system-ui;text-shadow:0 1px 9px #061622}',
 '#mrAlert.active{display:block;animation:mrPop 1.6s ease-out both}',
 '#mrAlert.gold{border-color:#ffe27e;color:#ffebaf;background:#473c24df}',
 '#mrAlert.danger{border-color:#ff6398;color:#ffccdb;background:#4b1e34df}',
 '@keyframes mrPop{0%{opacity:0;transform:scale(.8) translateY(15px)}19%{opacity:1;transform:scale(1.1)}77%{opacity:1}100%{opacity:0;transform:translateY(-13px)}}',
 '#mrFlash{position:absolute;inset:0;z-index:22;pointer-events:none;display:none;background:radial-gradient(ellipse,#42ffbc77,transparent 74%)}',
 '#mrFlash.active{display:block;animation:mrF .32s ease-out both}',
 '@keyframes mrF{0%{opacity:.8}100%{opacity:0}}',
 '#mrTag{display:none;position:absolute;top:112px;left:50%;transform:translateX(-50%);z-index:12;pointer-events:none;padding:7px 9px;border-radius:10px;border:1px solid #57d7bb;background:#092b40e5;white-space:nowrap;color:#c9ffe6;font:950 10px/1.2 system-ui}',
 '#mrTag.gold{color:#ffebaf;border-color:#ffdb77;background:#594127e8}',
 '#mrTag.boss{color:#fff2ae;border-color:#fc6b9b;background:#55263de6}',
 '#mrTag.turbo{color:#ffe2e8;border-color:#ff7394;background:#512333e6}',
 '#mrStreakBar{display:none;gap:8px;justify-content:center;align-items:center;border-radius:9px;border:1px solid #2f7e89;background:#071f33ca;padding:7px;text-align:center;color:#b9ffe4;font:900 10px system-ui}',
 '#mrStreakBar b{font-size:14px;color:#ffe18a}',
 '#mrModeLine{font-size:10px;text-align:center;color:#b8ebdd;margin:0 0 11px;font-weight:850;letter-spacing:.3px}',
 '#mrEnergyFx{pointer-events:none;filter:drop-shadow(0 0 4px #30ebd8)}',
 '#mrEnergyFx polyline{fill:none;stroke-linecap:round;stroke-linejoin:round}'
].join('');
document.head.appendChild(sheet);
const overlay=document.getElementById('overlay'),optionPanel=document.getElementById('options');
let notification=0,audio=null;
function alertText(text,type=''){
 const e=document.getElementById('mrAlert');if(!e)return;
 e.textContent=text;e.className='';void e.offsetWidth;e.className='active '+type;
 const id=++notification;setTimeout(()=>{if(id===notification)e.className=''},1700);
}
function flash(type){
 const e=document.getElementById('mrFlash');if(!e)return;
 e.style.background=type==='red'?'radial-gradient(ellipse,#ff5f7b77,transparent 70%)':
 type==='gold'?'radial-gradient(ellipse,#ffe97a66,transparent 70%)':'radial-gradient(ellipse,#42ffbc77,transparent 70%)';
 e.classList.remove('active');void e.offsetWidth;e.classList.add('active');
}
function fanfare(notes){
 try{
  audio=audio||new(root.AudioContext||root.webkitAudioContext)();audio.resume?.();
  notes.forEach((f,i)=>{
   const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*.10;
   osc.type='triangle';osc.frequency.value=f;gain.gain.setValueAtTime(.025,t);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.095);
   osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.10);
  });
 }catch(e){}
}
if(overlay){
 const a=document.createElement('div');a.id='mrAlert';overlay.appendChild(a);
 const glare=document.createElement('div');glare.id='mrFlash';overlay.appendChild(glare);
 const tag=document.createElement('div');tag.id='mrTag';overlay.appendChild(tag);
 const bar=document.createElement('div');bar.id='mrStreakBar';
 bar.innerHTML='🔥 RACHA <b id="mrStreak">0</b> · ⭐ PERFECTOS <b id="mrPerfect">0</b> · 🛡 4 PERFECTOS = ESCUDO';
 const guide=document.getElementById('wallGuide');
 if(guide)guide.insertAdjacentElement('afterend',bar);
}
if(optionPanel){const o=document.createElement('div');o.id='mrModeLine';
 o.textContent='NUEVO · ORO · AMAGOS · MUROS TURBO · JEFE FINAL';
 optionPanel.insertAdjacentElement('afterend',o);
}
const labels={
 tutorial:'🎯 CALENTAMIENTO',standard:'⚡ MURO EN CAMINO',
 wide:'🟢 HUECO DOBLE',shift:'🔄 ¡EL HUECO VA A CAMBIAR!',
 closing:'🔒 ¡EL HUECO SE CIERRA!',turbo:'🚀 ¡MURO TURBO!',
 mirage:'👁 ¡CUIDADO CON EL ESPEJISMO!',edge:'↔ ¡HUECO EN UN EXTREMO!',
 gold:'⭐ MURO DORADO · +300 PUNTOS',zigzag:'⚡ ¡DOBLE AMAGO!',
 boss:'👑 JEFE FINAL · DOS CAMBIOS'
};
root.addEventListener('murorush-v2',evt=>{
 const {event:e}=evt.detail,tag=document.getElementById('mrTag');
 if(e.type==='wall'){
  if(tag){tag.style.display='block';tag.textContent=labels[e.special]||labels.standard;
   tag.className=e.special==='gold'?'gold':e.special==='boss'?'boss':e.special==='turbo'?'turbo':'';
  }
  if(['gold','turbo','mirage','zigzag','boss','closing'].includes(e.special)){
   alertText(labels[e.special],['boss','turbo'].includes(e.special)?'danger':e.special==='gold'?'gold':'');
   if(['gold','boss'].includes(e.special))fanfare([590,790,1080]);
  }
 }
 if(e.type==='shift'){alertText(e.special==='closing'?'🔒 ¡AHORA SOLO UN HUECO!':'⚡ ¡CAMBIÓ EL HUECO!','danger');fanfare([870,540]);}
 if(e.type==='dodge'){
  flash(e.special==='gold'||e.special==='boss'?'gold':'mint');
  if(e.special==='gold'||e.special==='boss')alertText('⭐ ¡BONUS +'+e.points+'!','gold');
  else if(e.perfect)alertText('✨ PERFECTO +'+e.points,'gold');
  if(e.streak>2&&e.streak%3===0)alertText('🔥 ¡RACHA ×'+e.streak+'!','gold');
  if(e.nearMiss)alertText('😱 ¡POR UN PELO! +'+e.points);
 }
 if(e.type==='hit')flash('red');
 if(e.type==='saved')alertText('🛡 ¡EL ESCUDO TE SALVÓ!');
 if(e.type==='finish'&&tag)tag.style.display='none';
});
setInterval(()=>{
 const d=root.MuroRushDebug?.getState?.();if(!d)return;
 const a=document.getElementById('mrStreak'),b=document.getElementById('mrPerfect'),bar=document.getElementById('mrStreakBar');
 if(a)a.textContent=d.combo||0;if(b)b.textContent=d.perfects||0;
 if(bar)bar.style.display=d.state==='playing'?'flex':'none';
},225);
let artCtor=null;
Object.defineProperty(root,'MuroRushArt',{configurable:true,enumerable:true,
 get(){return artCtor;},
 set(original){
  if(typeof original!=='function'){artCtor=original;return}
  artCtor=function(svg){
   const legacy=original.apply(this,arguments),ns='http://www.w3.org/2000/svg';
   const group=document.createElementNS(ns,'g');group.setAttribute('id','mrEnergyFx');svg.appendChild(group);
   const beams=Array.from({length:6},()=>{const p=document.createElementNS(ns,'polyline');group.appendChild(p);return p});
   const sparks=Array.from({length:5},()=>{const c=document.createElementNS(ns,'circle');group.appendChild(c);return c});
   function fx(frame,world,g,options){
    const pose=frame?.getViewerPose(ref),view=pose?.views?.[0],w=g.wall;
    if(!pose||!view||!world||!w||g.phase!=='wave'){group.style.display='none';return}
    const m=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,world));
    const s=options?.tile||.45,half=2.5*s,z=half*.88*(2*w.progress-1);
    const proj=(x,y,z0)=>{
     const p=projected(m,x,y,z0,innerWidth,innerHeight);
     return p&&Number.isFinite(p[0])&&Number.isFinite(p[1])?p:null;
    };
    group.style.display='';
    for(let i=0;i<beams.length;i++){
     const p=beams[i],x=-half+s*i,bob=Math.sin(g.clock*12+i)*.13;
     const pts=[proj(x,.07,z),proj(x,.34+bob,z),proj(x,.72+bob,z)];
     if(pts.some(q=>!q)){p.style.display='none';continue}
     p.style.display='';p.setAttribute('points',pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' '));
     p.setAttribute('stroke',w.gold?'#ffe380':w.special==='turbo'?'#ff5f9b':'#72ffe8');
     p.setAttribute('stroke-width',w.special==='boss'?4:2.5);
     p.setAttribute('opacity',(.6+.1*Math.cos(g.clock*13+i)).toFixed(2));
    }
    for(let i=0;i<5;i++){
     const p=sparks[i],x=-half+(i+.5)*s,q=proj(x,.48+.09*Math.cos(g.clock*9+i*3),z);
     if(!q||w.open.includes(i)){p.style.display='none';continue}
     p.style.display='';p.setAttribute('cx',q[0]);p.setAttribute('cy',q[1]);p.setAttribute('r',w.special==='boss'?5:3.2);
     p.setAttribute('fill',w.gold?'#fff39e':w.special==='turbo'?'#ff789c':'#adffec');
    }
   }
   return{...legacy,render(frame,world,g,options){
    const result=legacy.render(frame,world,g,options);
    try{fx(frame,world,g,options)}catch(e){group.style.display='none'}
    return result;
   },clear(){group.style.display='none';legacy.clear?.()}};
  };
 }
});
})(window);
