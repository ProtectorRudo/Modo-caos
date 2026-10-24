'use strict';
/* MODO CAOS · LLUVIA DE METEOROS
 * Engine.js owns hit testing and floor anchor; this runtime NEVER screen-locks objects.
 * AR movement observes only the phone pose, not the user's feet or body.
 * Multiplayer is a clearly marked beta: peer results are not server-authoritative. */
(function(){
const $=id=>document.getElementById(id),G=window.MeteorosCore,A=window.MeteorosArt;
if(!G||!A){console.error('Meteoros: faltan dependencias');return}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const params=new URLSearchParams(location.search),roomCode=(params.get('room')||'').toUpperCase(),hasRoom=/^[A-F0-9]{8}$/.test(roomCode);
const K='mc-meteoros-record-v1';
let best=0;try{best=Math.max(0,Number(localStorage.getItem(K))||0)}catch(_){}
$('record').textContent='🏆 RÉCORD PERSONAL: '+Math.round(best).toLocaleString('es-AR')+' PUNTOS';
let demo=false,calibrated=false,sampling=false,origin=null,placement=null,avg=null,calSamples=[],calStart=0;
let game=G.make((Math.random()*4294967295)>>>0),running=false,finished=false,renderer=null,trackLast=0;
let lastFrame=0,lastHud=0,trackingLast=null,arLoop=false,status='intro',mode='motion';
let muted=false,audio=null,impactBuffer=null,buttons={up:false,down:false,left:false,right:false},keys=new Set(),target=null;
let eventKeys=new Set(),online=null,onlineConnecting=false,onlineBusy=false,onlineTimer=null,lastPeer=0;
let lostShown=false,toastAt=0,lastAlert=0;
function beep(f=500,d=.12,wave='sine',volume=.07){
 if(muted)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();
 audio.resume?.();const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
 osc.type=wave;osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(Math.max(80,f*.54),t+d);
 gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+d);
 osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+d+.01);
 }catch(_){}}
function boom(big=false){
 if(muted)return;
 try{
  audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume?.();
  const rate=audio.sampleRate;
  if(!impactBuffer){
   impactBuffer=audio.createBuffer(1,Math.ceil(rate*.52),rate);
   const data=impactBuffer.getChannelData(0);
   for(let i=0;i<data.length;i++){
    const env=Math.pow(1-i/data.length,2.3);
    const rumble=(Math.random()*2-1)*.75+Math.sin(i*.021)*.16;
    data[i]=rumble*env;
   }
  }
  const t=audio.currentTime,source=audio.createBufferSource();
  source.buffer=impactBuffer;source.playbackRate.value=big?.72:1.1;
  const low=audio.createBiquadFilter();low.type='lowpass';low.frequency.setValueAtTime(big?650:1050,t);
  low.frequency.exponentialRampToValueAtTime(big?145:260,t+.35);
  const gain=audio.createGain();gain.gain.setValueAtTime(big?.18:.105,t);
  gain.gain.exponentialRampToValueAtTime(.0001,t+.52);
  source.connect(low);low.connect(gain);gain.connect(audio.destination);
  source.start(t);
 }catch(e){console.warn('Audio de impactos no disponible:',e.message)}
}
function vibrate(pattern){if(!muted)try{navigator.vibrate?.(pattern)}catch(_){}}
function toast(msg,ms=1600){$('toast').textContent=msg;toastAt=performance.now()+ms}
function statusText(msg){$('safety').textContent=msg}
function hud(){
 const you=game.players[0];
 $('time').textContent=Math.max(0,Math.ceil(game.duration-game.elapsed));
 $('lives').textContent=Array.from({length:3},(_,i)=>i<you.lives?'♥':'♡').join('');
 $('score').textContent=Math.round(you.score).toLocaleString('es-AR');
 $('combo').textContent='×'+you.combo+(you.shield?' 🛡':'');
 const phases={aprendizaje:'☄️ ¡ESQUIVÁ EL CÍRCULO!',lluvia:'⚠️ ¡LLUVIA MÚLTIPLE!',caos:'🔥 CUIDADO CON LOS GIGANTES',apocalipsis:'🌋 TORMENTA APOCALÍPTICA'};
 $('phase').textContent=game.stage==='countdown'?'EMPEZAMOS EN '+Math.ceil(game.countdown):phases[G.phase(game)]||'';
 if(game.stage==='countdown')toast('☄️ '+Math.ceil(game.countdown),160);
}
function consumeFX(){
 for(const f of game.fx){
  const key=f.type+':'+f.at+':'+(f.who||'')+':'+(f.x||'');
  if(eventKeys.has(key))continue;eventKeys.add(key);
  if(eventKeys.size>300)eventKeys.clear();
  if(['impact','hit','ko','siren','trick','bonus','near','shield','start','fake'].includes(f.type)){
   const text=f.text||'';if(text&&(!f.who||f.who==='you'))toast(text,f.type==='siren'?2000:1250);
   if(f.type==='impact'){boom(!!f.giant);beep(f.giant?96:155,.29,'sawtooth',.045);vibrate(f.giant?[90,30,65]:55)}
   else if(f.type==='hit'){beep(190,.42,'square',.12);if(f.who==='you')vibrate([150,50,160])}
   else if(f.type==='near'){beep(880,.15,'triangle');vibrate(28)}
   else if(f.type==='bonus'||f.type==='shield'){beep(1080,.2)}
   else if(f.type==='siren'){beep(460,.45,'sawtooth')}
   else if(f.type==='trick'){beep(760,.30,'sawtooth')}
   else if(f.type==='fake'){beep(990,.16,'triangle')}
  }
 }
}
function ranking(){
 const result=G.leaderboard(game),you=game.players[0],place=result.findIndex(p=>p.id==='you')+1;
 $('resultTitle').textContent=place===1?'🏆 ¡SOS EL CAMPEÓN!':you.alive?'☄️ ¡SOBREVIVISTE!':'💥 ¡TE ALCANZARON!';
 const s=Math.round(you.score);
 if(!online&&s>best){best=s;try{localStorage.setItem(K,String(best))}catch(_){}}
 $('resultsMeta').textContent='PUESTO '+place+' DE '+result.length+' · '+s.toLocaleString('es-AR')+
 ' PUNTOS · '+you.dodges+' ESQUIVADOS · '+you.near+' ESCAPES AL LÍMITE · RÉCORD '+Math.round(best).toLocaleString('es-AR')+
 (online?' · ONLINE BETA: resultados declarados por cada dispositivo':'');
 const out=$('ranking');out.replaceChildren();
 result.forEach((p,i)=>{
  const div=document.createElement('div');div.className='rank';
  const name=document.createElement('b');name.textContent=(i+1)+'º · '+p.name+(p.id==='you'?' (VOS)':'');
  const number=document.createElement('span');number.textContent=p.lives+' ♥ · '+Math.round(p.score)+' pts';
  div.append(name,number);out.appendChild(div);
 });
 $('result').style.display='flex';$('pad').style.display='none';
 $('actions').style.display='none';$('statusPanel').style.display='none';
 beep(place===1?850:325,.65,'triangle',.08);if(place===1)vibrate([75,75,75,75,140]);
 if(online?.host)online.mc.finishRoom(online.room.id).catch(()=>{});
}
function finishIfNeeded(){if(game.stage==='finished'&&!finished){finished=true;running=false;ranking()}}
function reset(nextSeed){
 game=G.make(nextSeed??((Math.random()*4294967295)>>>0));
 if(online?.room)onlineRoster();
 finished=false;running=false;eventKeys=new Set();lastFrame=0;lastHud=0;
 $('result').style.display='none';$('statusPanel').style.display='flex';$('actions').style.display='flex';
 $('begin').style.display='block';$('begin').disabled=!calibrated||!!online;
 $('pad').style.display='none';$('gameHud').style.display='flex';$('phase').style.display='block';
 status='fixed';hud();statusText(online?'Esperando al anfitrión de tu sala':'¡LISTO! Esquivá las zonas rojas sin correr.');
}
function begin(){
 if(!calibrated||running||finished||status!=='fixed')return;
 if(online&&(!online.room||online.room.status!=='playing')){toast('👥 ESPERÁ AL ANFITRIÓN');return}
 if(online&&online.room?.startedAt){
  const initial=seedOnline(online.room);game=G.make(initial,{online:true});onlineRoster();
 }
 G.start(game);running=true;status='playing';lastFrame=0;eventKeys.clear();lostShown=false;
 $('begin').style.display='none';$('calBox').style.display='none';
 $('pad').style.display=(demo||mode==='buttons')?'flex':'none';
 statusText(demo?'USÁ LAS FLECHAS O TOCÁ LA PISTA PARA MOVERTE':'MOVÉ EL TELÉFONO SUAVEMENTE · EVITÁ EL ROJO');
 $('gameHud').style.display='flex';$('phase').style.display='block';
 beep(930,.22);hud();
}
function uiFixed(){
 if(status==='fixed'||status==='playing'||finished||demo)return;
 status='fixed';sampling=false;calibrated=false;avg=null;
 $('statusPanel').style.display='flex';$('actions').style.display='flex';
 $('gameHud').style.display='flex';$('begin').disabled=true;
 $('phase').style.display='block';$('head').style.display='none';
 statusText('📍 Arena fijada · calibrando posición del teléfono.');
 startSampling();
}
function startSampling(){
 if(demo)return;
 if(game.stage==='playing')game.paused=true;
 sampling=true;calibrated=false;avg=null;calSamples=[];calStart=0;
 $('calBox').style.display='block';$('calTitle').textContent='📍 MANTENÉ EL TELÉFONO QUIETO · 1 SEGUNDO';
 $('calFill').style.width='0%';$('begin').disabled=true;
 toast('📍 CALIBRACIÓN AUTOMÁTICA');
}
function sample(t,pos){
 if(!sampling||!pos){calStart=0;calSamples=[];return}
 if(!calStart)calStart=t;
 calSamples.push(pos);if(calSamples.length>45)calSamples.shift();
 const xs=calSamples.map(a=>a.x),zs=calSamples.map(a=>a.z);
 if(Math.max(...xs)-Math.min(...xs)>.075||Math.max(...zs)-Math.min(...zs)>.075){
  calSamples=calSamples.slice(-3);calStart=t;return;
 }
 $('calFill').style.width=Math.round(clamp((t-calStart)/1000,0,1)*100)+'%';
 if(t-calStart>=1050&&calSamples.length>=12){
  avg={x:calSamples.reduce((a,b)=>a+b.x,0)/calSamples.length,z:calSamples.reduce((a,b)=>a+b.z,0)/calSamples.length};
  // Important: world origin is ONLY set on initial calibration. Recenter never teleports the arena.
  if(!origin)origin={...avg};
  trackingLast={...avg};trackLast=t;sampling=false;calibrated=true;game.paused=false;
  $('calTitle').textContent='✅ LISTO · MOVETE SUAVEMENTE';
  $('calFill').style.width='100%';$('begin').disabled=!!online;
  statusText('✅ LISTO · LA ARENA PERMANECE EN EL PISO · ¡A JUGAR!');
  setTimeout(()=>{if(calibrated&&!sampling)$('calBox').style.display='none'},600);
  beep(1050,.21);vibrate(45);if(online)showOnline();
 }
}
function localPose(frame,W){
 try{
  const pose=frame.getViewerPose(ref);if(!pose||pose.emulatedPosition||!W)return null;
  const v=pose.transform.position,dx=v.x-W[12],dz=v.z-W[14];
  const x=W[0]*dx+W[2]*dz,z=W[8]*dx+W[10]*dz;
  return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:null;
 }catch(_){return null}
}
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let k=0;k<4;k++)for(let r=0;r<4;r++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function translate(x,z){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,0,z,1])}
function motion(t,pos){
 if(!pos)return false;
 if(!trackingLast){trackingLast={...pos};return false}
 const jump=Math.hypot(pos.x-trackingLast.x,pos.z-trackingLast.z);
 // Protect against ARCore relocations/jumps; do not punish an implausible teleport.
 if(jump>.30){trackingLast={...pos};return false}
 const blend=.23;trackingLast={x:trackingLast.x+(pos.x-trackingLast.x)*blend,z:trackingLast.z+(pos.z-trackingLast.z)*blend};
 const dx=trackingLast.x-origin.x,dz=trackingLast.z-origin.z;
 if(Math.hypot(dx,dz)>G.R+.22){statusText('⚠️ LÍMITE DE ARENA · VOLVÉ A UN ÁREA DESPEJADA');return false}
 G.setPosition(game,Math.abs(dx)<.018?0:dx,Math.abs(dz)<.018?0:dz);return true;
}
function inputTick(dt,t){
 const dir={
  x:Number(buttons.right||keys.has('ArrowRight')||keys.has('d'))-Number(buttons.left||keys.has('ArrowLeft')||keys.has('a')),
  z:Number(buttons.down||keys.has('ArrowDown')||keys.has('s'))-Number(buttons.up||keys.has('ArrowUp')||keys.has('w'))
 };
 const p=game.players[0];
 if(target&&demo){const v={x:target.x-p.x,z:target.z-p.z},len=Math.hypot(v.x,v.z);
  if(len<.03)target=null;else{const s=Math.min(len,dt*.65);G.setPosition(game,p.x+v.x/len*s,p.z+v.z/len*s)}}
 const m=Math.hypot(dir.x,dir.z);
 if(m>0)G.setPosition(game,p.x+dt*.63*dir.x/m,p.z+dt*.63*dir.z/m);
}
function tick(dt,t){
 if(!running)return;
 if(demo||mode==='buttons')inputTick(dt,t);
 if(game.paused)return;
 // Shared server timestamp and deterministic seed; server does NOT validate collisions.
 if(online?.room?.startedAt&&game.stage==='playing'){
  const start=Date.parse(online.room.startedAt),targetTime=clamp((Date.now()+online.skew-start)/1000,0,game.duration);
  let n=0;while(game.elapsed+.0001<targetTime&&n++<240){
   G.tick(game,Math.min(.065,targetTime-game.elapsed));
  }
 }else G.tick(game,dt);
 if(game.stage==='playing'&&t-lastAlert>480){
  const v=game.players[0],danger=game.events.some(e=>!e.cancelled&&e.impact>game.elapsed&&e.impact-game.elapsed<.82&&Math.hypot(v.x-e.x,v.z-e.z)<e.radius+.20);
  if(danger){lastAlert=t;beep(620,.10,'triangle',.035);vibrate(14)}
 }
 consumeFX();finishIfNeeded();
 if(t-lastHud>110){lastHud=t;hud()}
 if(toastAt&&t>toastAt){$('toast').textContent='';toastAt=0}
}
function arFrame(t,frame,W){
 if(!sess)return;
 const dt=lastFrame?clamp((t-lastFrame)/1000,.001,.07):.016;lastFrame=t;
 try{
  if(!W)return;
  const pos=localPose(frame,W);
  if(typeof stage!=='undefined'&&stage==='fixed'&&!placement&&pos)placement={...pos};
  if(sampling)sample(t,pos);
  if(running&&mode==='motion'&&calibrated){
   if(pos&&motion(t,pos)){trackLast=t;lostShown=false;game.paused=false}
   else if(t-trackLast>1000){game.paused=true;
    if(!lostShown){lostShown=true;toast('📡 SEGUIMIENTO PERDIDO · PAUSA');statusText('Volvé a enfocar la arena, sin correr.');}}
  }
  if(running)tick(dt,t);
  if(renderer){
   // Preview follows the tracked phone footprint. FIXAR captures the footprint once.
   // Calibration and RECENTRAR NEVER change this fixed world-space placement.
   const preview=(typeof stage!=='undefined'&&stage==='preview');
   const shift=placement||(preview&&pos)||{x:0,z:0};
   renderer.render(frame,multiply(W,translate(shift.x,shift.z)),game);
  }
  if(!running&&t-lastHud>160){lastHud=t;hud()}
 }catch(e){if(!arFrame.warned){console.error('Meteoros AR:',e);arFrame.warned=true;toast('⚠️ PROBLEMA CON EL RENDER AR')}}
}
function bootAR(){
 if(demo||arLoop||typeof sess==='undefined'||!sess||typeof ref==='undefined'||!ref)return;
 arLoop=true;lastFrame=0;
 try{renderer=A.create3D(gl);shader=null;}catch(e){console.error('Error arte AR',e);toast('AR WEBGL NO DISPONIBLE · USÁ MODO 2D')}
 window.modoCaosXRFrame=arFrame;
 sess.addEventListener('end',()=>{arLoop=false;running=false;if(window.modoCaosXRFrame===arFrame)window.modoCaosXRFrame=null});
}
setInterval(()=>{
 if(demo)return;bootAR();
 if(typeof stage!=='undefined'&&stage==='fixed'&&status==='intro')uiFixed();
},145);
function demoFrame(t){
 if(!demo)return;
 const dt=lastFrame?clamp((t-lastFrame)/1000,.001,.07):.016;lastFrame=t;
 if(running)tick(dt,t);
 const canvas=$('canvas2D');A.draw2D(canvas.getContext('2d'),innerWidth,innerHeight,game,t);
 requestAnimationFrame(demoFrame);
}
function beginDemo(){
 demo=true;calibrated=true;status='fixed';$('home').style.display='none';$('overlay').style.display='block';
 $('canvas2D').style.display='block';$('head').style.display='none';$('lock').style.display='none';
 $('statusPanel').style.display='flex';$('actions').style.display='flex';
 $('gameHud').style.display='flex';$('phase').style.display='block';$('begin').disabled=false;
 $('recenter').style.display='none';$('toggle').style.display='none';
 statusText('¡LISTO! Tocá la arena para moverte, o usá las flechas.');
 requestAnimationFrame(demoFrame);hud();beep(900,.21);
}
$('demo').addEventListener('click',beginDemo);
$('begin').addEventListener('click',begin);
$('recenter').addEventListener('click',()=>{if(demo)return;startSampling()});
$('toggle').addEventListener('click',()=>{
 mode=mode==='motion'?'buttons':'motion';buttons={up:false,down:false,left:false,right:false};
 $('toggle').textContent=mode==='motion'?'🎮 BOTONES':'🚶 MOVIMIENTO';
 $('pad').style.display=running&&mode==='buttons'?'flex':'none';
 if(mode==='motion')trackingLast=null;toast(mode==='motion'?'📍 MOVIMIENTO REAL':'🎮 BOTONES ACTIVADOS');
});
$('music').addEventListener('click',()=>{muted=!muted;$('music').textContent=muted?'🔇':'🔊'});
$('exit').addEventListener('click',()=>{try{sess?.end?.()}catch(_){}location.href='/'});
$('leave').addEventListener('click',()=>{try{sess?.end?.()}catch(_){}location.href='/'});
$('rematch').addEventListener('click',()=>{
 if(online){location.href='/salas.html?game=lluvia-meteoros';return}
 reset();if(demo){$('begin').disabled=false;statusText('¡REVANCHA! ¿AGUANTÁS LA TORMENTA?')}
 else if(calibrated){$('begin').disabled=false;statusText('¡REVANCHA! LA ARENA SIGUE FIJA EN SU LUGAR')}
});
$('share').addEventListener('click',async()=>{
 const p=game.players[0],txt='☄️ ¡Hice '+Math.round(p.score)+' puntos en LLUVIA DE METEOROS de MODO CAOS! ¿Me superás? '+location.origin+'/meteoros.html';
 try{if(navigator.share)await navigator.share({text:txt});else{await navigator.clipboard.writeText(txt);toast('✅ RESULTADO COPIADO')}}catch(_){prompt('Compartir:',txt)}
});
for(const key of ['up','down','left','right']){
 const b=document.querySelector('[data-dir="'+key+'"]'),off=()=>{buttons[key]=false};
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);buttons[key]=true;target=null;beep(360,.05)});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,off);
}
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(e.key)){e.preventDefault();keys.add(e.key);target=null}});
window.addEventListener('keyup',e=>keys.delete(e.key));
window.addEventListener('blur',()=>{keys.clear();buttons={up:false,down:false,left:false,right:false}});
$('canvas2D').addEventListener('pointerdown',e=>{
 if(!demo||!running)return;
 const scale=Math.min(innerWidth*.73/1.28,innerHeight*.49/1.28);
 const x=(e.clientX-innerWidth*.5)/scale,z=(e.clientY-innerHeight*.52)/(scale*.68);
 target=G.clampPoint({x,z});
});
$('overlay').addEventListener('beforexrselect',e=>e.preventDefault());
// Multiplayer: private authenticated room, synchronized start/waves, peer positions.
// NO authoritative server-side scoring yet. Physical Android device verification pending.
const hash=s=>{let n=2166136261;for(const c of s){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const seedOnline=r=>hash(r.id+':'+r.startedAt);
function onlineRoster(){
 if(!online?.room?.players)return;
 const you=game.players[0];const others=online.room.players.filter(p=>p.userId!==online.me).slice(0,3);
 const remotes=others.map(p=>({id:p.userId,name:p.name,kind:'remote',color:['#6cfbe8','#ffd362','#c292ff'][p.slot%3],
 x:(p.slot-2)*.19,z:-.24,lives:3,shield:0,score:0,combo:0,dodges:0,hits:0,near:0,alive:true,dist:0,decision:0,goal:null}));
 game.players=[you,...remotes];game.online=true;
}
function showOnline(){
 if(!online?.room)return;
 const room=online.room;const you=room.players?.find(p=>p.userId===online.me),host=room.hostUserId===online.me;
 $('onlineBar').style.display='block';
 $('onlineStatus').textContent='👥 '+room.code+' · '+room.players.length+'/'+room.maxPlayers+
 ' · '+(room.status==='playing'?'PARTIDA EN CURSO':room.status==='finished'?'FIN':'ESPERANDO')+' · BETA';
 $('readyOnline').style.display=room.status==='lobby'?'inline-block':'none';
 $('readyOnline').disabled=!calibrated&&!you?.ready;
 $('readyOnline').textContent=you?.ready?'↻ NO LISTO':'✓ ESTOY LISTO';
 $('startOnline').style.display=host&&room.status==='lobby'?'inline-block':'none';
 $('startOnline').disabled=!(room.players.length>=2&&room.players.every(p=>p.ready));
 if(room.status==='playing')$('begin').disabled=!calibrated;
}
async function refreshRoom(){
 if(!online||onlineBusy)return;onlineBusy=true;
 try{
  const from=Date.now(),r=await online.mc.getRoom(online.room.id);
  online.skew=Date.parse(r.serverTime||'')-(from+(Date.now()-from)*.5);
  online.room=r;online.host=r.hostUserId===online.me;
  showOnline();
  if(r.status==='playing'&&calibrated&&!running&&!finished&&Date.now()+online.skew>=Date.parse(r.startedAt||'')-3000){
   begin();if(game.stage==='countdown')game.countdown=clamp((Date.parse(r.startedAt)-Date.now()-online.skew)/1000,0,3);
  }
 }catch(e){$('onlineStatus').textContent='⚠️ '+e.message}finally{onlineBusy=false}
}
async function connectOnline(){
 if(onlineConnecting)return;onlineConnecting=true;
 $('onlineBar').style.display='block';
 try{
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm');
  const config=window.ModoCaosConfig;if(!config)throw Error('No hay configuración Supabase');
  const supa=createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const mc=window.ModoCaosRooms.createClient(supa);
  const existing=await mc.resumeRoom(roomCode);if(!existing)throw Error('Primero unite a la sala desde SALAS ONLINE');
  const me=await mc.userId();
  online={mc,me,room:{id:existing.room_id,code:roomCode,players:[],status:'lobby'},host:false,skew:0,conn:null};
  await refreshRoom();if(online.room.game!=='lluvia-meteoros')throw Error('Esta sala es de otro juego');
  online.conn=await mc.connectRoom(online.room.id,{
   onRefresh:()=>refreshRoom(),
   onGameEvent:m=>{
    if(!m||m.userId===online.me||m.type!=='meteor-state'||!online)return;
    const p=game.players.find(x=>x.id===m.userId);if(!p||p.kind!=='remote')return;
    if(![m.x,m.z,m.lives,m.score].every(Number.isFinite))return;
    p.x=G.clampPoint({x:m.x,z:m.z}).x;p.z=G.clampPoint({x:m.x,z:m.z}).z;
    p.score=clamp(m.score,0,1e6);p.lives=clamp(m.lives,0,3);p.shield=clamp(Number(m.shield)||0,0,2);
    p.combo=clamp(Number(m.combo)||0,0,99);p.dodges=clamp(Number(m.dodges)||0,0,200);p.alive=!!m.alive;
   },
   onStatus:s=>{$('onlineStatus').textContent='👥 '+roomCode+' · '+(s==='SUBSCRIBED'?'CONECTADO':'RECONECTANDO')+' · BETA'}
  });
  onlineTimer=setInterval(()=>{
   if(!online)return;refreshRoom().catch(()=>{});
   if(running&&online.conn?.connected&&Date.now()-lastPeer>250){
    lastPeer=Date.now();const p=game.players[0];
    online.conn.sendGameEvent({type:'meteor-state',x:p.x,z:p.z,lives:p.lives,score:Math.round(p.score),shield:p.shield,combo:p.combo,dodges:p.dodges,alive:p.alive}).catch(()=>{});
   }
  },520);
 }catch(e){$('onlineStatus').textContent='⚠️ '+e.message;console.warn('Meteoros online:',e)}
}
$('readyOnline').addEventListener('click',async()=>{
 if(!online)return;try{
  const p=online.room.players.find(v=>v.userId===online.me);
  await online.mc.setReady(online.room.id,!p?.ready);await refreshRoom();await online.conn?.notify();
 }catch(e){toast('⚠️ '+e.message)}
});
$('startOnline').addEventListener('click',async()=>{
 if(!online?.host)return;try{await online.mc.startRoom(online.room.id);await refreshRoom();await online.conn?.notify()}
 catch(e){toast('⚠️ '+e.message)}
});
window.addEventListener('pagehide',()=>{clearInterval(onlineTimer);online?.conn?.close().catch(()=>{})});
if(hasRoom)connectOnline();
})();
