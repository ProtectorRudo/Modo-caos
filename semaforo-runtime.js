'use strict';
/* SEMÁFORO TRAICIONERO — device controller.
 * /engine.js remains the owner of the world-locked WebXR hit-test/anchor.
 * No foot tracking. Short phone gestures, with filtered red-light checks,
 * plus persistent tactile controls. Network mode is an experimental client,
 * NOT server-authoritative score validation.
 */
(function(){
 const $=id=>document.getElementById(id),G=window.SemaforoCore,A=window.SemaforoArt;
 if(!G||!A)throw Error('Faltan los módulos de Semáforo Traicionero');
 const art=A.create($('arenaSvg')),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const params=new URLSearchParams(location.search),roomCode=(params.get('room')||'').toUpperCase();
 const hasRoom=/^[A-F0-9]{8}$/.test(roomCode);
 let seed=(Math.random()*0xffffffff)>>>0,game=G.make({seed}),status='home',demo=false;
 let calibrated=false,sampling=false,samples=[],sampleAt=0,reference=null,trackLast=null;
 let filtered=null,redAnchor=null,lockTime=0,lastTrack=0,lastFrame=0,lastHUD=0,lastFX=0;
 let running=false,buttons={forward:false,left:false,right:false},keys=new Set();
 let mode='hybrid',calForce=false,demoCtx=null,lastEvent=0,lastGreenMove=0,rewardedRound=-1;
 let audio=null,lastSfx=0,muted=false,best=0,arStarted=false,frameId=0;
 let online=null,onlineTimer=null,onlineConnecting=false,onlineActive=false,peerLast=0;
 try{best=Number(localStorage.getItem('mc-semaforo-best')||0)}catch(e){}
 $('introRecords').textContent=(best?'🏆 RÉCORD: '+best.toLocaleString('es-AR')+' PTS · ':'')+'4 COMPETIDORES · 3 VIDAS · 76 SEGUNDOS';
 if(hasRoom)$('onlineLink').textContent='SALA '+roomCode+' · VER ESTADO';
 function notify(message){$('status').textContent=message;$('message').textContent=message}
 function fx(text,bad=false){
  const n=$('fx');n.textContent=text;n.style.color=bad?'#ff8daa':'#bdfff1';
  n.classList.remove('show');void n.offsetWidth;n.classList.add('show');
 }
 function sound(freq=600,lasting=.13,kind='sine'){
  if(muted)return;
  const now=performance.now();if(now-lastSfx<80)return;lastSfx=now;
  try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume?.();
   const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;
   o.type=kind;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(110,freq*.66),t+lasting);
   v.gain.setValueAtTime(.065,t);v.gain.exponentialRampToValueAtTime(.0001,t+lasting);
   o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+lasting+.02);
  }catch(e){}
 }
 function voice(s){
  if(muted||!window.speechSynthesis)return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s);
   u.lang='es-AR';u.rate=1.18;u.pitch=.94;u.volume=.72;speechSynthesis.speak(u)}catch(e){}
 }
 function vibrate(ms){try{navigator.vibrate?.(ms)}catch(e){}}
 function make(){
  const competitors=online?.room?.players?.length?[
   ...online.room.players.filter(p=>p.userId===online.me).map(p=>({id:p.userId,name:'VOS',kind:'human',color:'#50ffe0'})),
   ...online.room.players.filter(p=>p.userId!==online.me).map((p,i)=>({
    id:p.userId,name:p.name,kind:'remote',color:['#ffcf62','#fa74cf','#96a5ff'][i%3]}))
  ]:null;
  const s=online?.room?.id?hash(online.room.id):seed;
  return G.make({seed:s,players:competitors});
 }
 function hash(text){let a=2166136261;for(const c of text){a^=c.charCodeAt(0);a=Math.imul(a,16777619)}return a>>>0}
 function hud(){
  const p=game.players[0];
  $('clock').textContent=Math.max(0,Math.ceil(G.LIMIT-game.raceTime));
  $('distance').textContent=Math.round(p.progress)+'%';
  $('lives').textContent='♥'.repeat(Math.max(0,p.lives))||'0';
  $('points').textContent=Math.round(p.score).toLocaleString('es-AR');
  $('progressFill').style.width=clamp(p.progress,0,100)+'%';
  const badge=$('signalBadge');badge.className=game.signal==='red'?'red':game.signal==='amber'?'amber':'';
  badge.textContent=game.state==='countdown'?'⏳ '+Math.max(1,Math.ceil(game.startDelay-game.clock)):
   game.signal==='green'?'🟢 VERDE':game.signal==='amber'?'🟡 AMARILLO':'🔴 ROJO';
  const label=game.signal==='red'&&game.state==='playing'&&game.signalTime<game.warning?
    '¡FRENÁ! · TIEMPO DE REACCIÓN':game.comment;
  if(running)$('message').textContent=label;
 }
 function renderEvents(){
  for(const ev of game.events){
   if(ev.id<=lastEvent)continue;lastEvent=ev.id;
   if(ev.type==='signal'){
    redAnchor=null;
    if(ev.signal==='amber'){
     sound(640,.24);voice('¡Amarillo! ¿Te confiás?');
    }else if(ev.signal==='red'){
     sound(270,.38,'sawtooth');voice('¡Rojo! Ni respires.');
     vibrate([80,30,65]);
    }else{
     lastGreenMove=0;rewardedRound=-1;
     sound(950,.17);voice(ev.trap==='turbo'?'¡Verde turbo!':'¡Verde, avanzá!');
    }
   }else if(ev.type==='penalty'&&ev.id===game.players[0].id){
    fx('💥 ¡TE DESCUBRIÓ! −11%',true);vibrate([95,30,105]);sound(230,.42,'square');
   }else if(ev.type==='combo'&&ev.id===game.players[0].id){
    fx('⚡ COMBO ×'+ev.combo+' · +'+ev.bonus);sound(1090,.23);vibrate(35);
   }else if(ev.type==='bump'&&ev.id===game.players[0].id){
    fx('💫 ¡CHOCARON LOS CASCOS!');sound(380,.12);vibrate(25);
   }else if(ev.type==='goal'){
    if(ev.id===game.players[0].id){fx('🏁 ¡LLEGASTE A META!');sound(1220,.32)}
   }else if(ev.type==='finish'){showResult()}
  }
 }
 function showResult(){
  if(status==='finished')return;running=false;status='finished';buttons.forward=false;
  const ranking=game.result?.ranking||[],p=game.players[0];
  const won=ranking[0]?.id===p.id;
  $('resultTitle').textContent=won?'¡SOS EL CAMPEÓN!':p.eliminated?'¡TE PESCÓ EL SEMÁFORO!':'¡CARRERA TERMINADA!';
  const score=Math.round(p.score);
  if(!online&&score>best){best=score;try{localStorage.setItem('mc-semaforo-best',String(best))}catch(e){}}
  $('resultMeta').textContent=Math.round(p.progress)+'% RECORRIDO · '+score.toLocaleString('es-AR')+
   ' PUNTOS · '+p.penalties+' PENALIZACIONES · RÉCORD: '+best.toLocaleString('es-AR')+
   (online?' · ONLINE EXPERIMENTAL (RESULTADO LOCAL)':'');
  $('ranking').replaceChildren();
  ranking.forEach((r,i)=>{
   const row=document.createElement('div');row.className='rank';
   const a=document.createElement('span');a.textContent=['🥇','🥈','🥉','4º'][i]+' '+r.name+(r.id===p.id?' (VOS)':'');
   const b=document.createElement('b');b.textContent=r.progress+'% · '+r.score+' pts';
   row.append(a,b);$('ranking').appendChild(row);
  });
  $('result').style.display='flex';
  if(won){confetti();sound(1200,.45);vibrate([80,80,90])}
  if(online?.host){online.mc.finishRoom(online.room.id).catch(e=>console.warn('Fin online:',e))}
 }
 function confetti(){
  const layer=$('confettiLayer');if(!layer)return;layer.replaceChildren();
  for(let i=0;i<55;i++){
   const bit=document.createElement('i');bit.className='party';
   bit.style.left=(8+Math.random()*84)+'%';
   bit.style.top=(-7-Math.random()*35)+'%';
   bit.style.background=['#4affd3','#ffd665','#ff649f','#64b9ff','#f7ffff'][i%5];
   bit.style.animationDelay=(Math.random()*.65)+'s';
   bit.style.animationDuration=(2+Math.random()*1.3)+'s';
   bit.style.setProperty('--spin',(Math.random()*900-450)+'deg');
   layer.appendChild(bit);
  }
  setTimeout(()=>layer.replaceChildren(),3700);
 }
 function setup(){
  $('home').style.display='none';$('overlay').style.display='block';
  $('status').style.display='block';$('actionbar').style.display='flex';
  $('scorebar').style.display='flex';$('signalBadge').style.display='block';
  $('progressTrack').style.display='block';$('movePad').style.display='none';
  $('startRace').style.display='block';$('startRace').disabled=true;
  $('play').style.display='none';
  $('result').style.display='none';hud();
  if(hasRoom)$('onlinePanel').style.display='block';
 }
 function fixed(){
  if(demo||status==='fixed'||status==='running'||status==='finished')return;
  status='fixed';running=false;calibrated=false;trackLast=null;
  $('overlay').classList.add('sf-fixed');
  $('actionbar').style.display='flex';$('calPanel').style.display='block';
  $('startRace').disabled=true;
  notify('📍 CALIBRANDO · QUIETO UN SEGUNDO');startSampling();
 }
 function startSampling(){
  if(demo||status==='home')return;
  if(running){G.input(game,{});game.paused=true;buttons.forward=false}
  sampling=true;calibrated=false;samples=[];sampleAt=0;filtered=null;reference=null;
  $('calPanel').style.display='block';$('calTitle').textContent='📍 MANTENÉ EL TELÉFONO QUIETO · 1 S';
  $('calFill').style.width='0%';
  $('startRace').disabled=true;
 }
 function calibrate(t,pos){
  if(!sampling||demo)return;
  if(!pos){sampleAt=0;samples=[];return}
  if(!sampleAt)sampleAt=t;
  samples.push(pos);if(samples.length>45)samples.shift();
  const xx=samples.map(a=>a.x),zz=samples.map(a=>a.z);
  if(Math.max(...xx)-Math.min(...xx)>.09||Math.max(...zz)-Math.min(...zz)>.09){
   samples=samples.slice(-3);sampleAt=t;return;
  }
  $('calFill').style.width=Math.round(clamp((t-sampleAt)/1050,0,1)*100)+'%';
  if(t-sampleAt>1050&&samples.length>=12){
   const x=samples.reduce((a,b)=>a+b.x,0)/samples.length,
     z=samples.reduce((a,b)=>a+b.z,0)/samples.length;
   reference={x,z};filtered={x,z};trackLast={x,z};sampling=false;calibrated=true;game.paused=false;
   $('calTitle').textContent='✅ ¡LISTO! · TU CENTRO ESTÁ FIJO';$('calFill').style.width='100%';
   $('startRace').disabled=!!(hasRoom&&online?.room?.status!=='playing');
   notify('✅ LISTO · AVANZÁ CON ▲ O EMPUJES CORTOS DEL TELÉFONO');
   sound(1000,.23);vibrate(50);
  }
 }
 function posePosition(frame,W){
  try{
   const pose=frame.getViewerPose(ref);if(!pose||pose.emulatedPosition||!W)return null;
   const v=pose.transform.position,dx=v.x-W[12],dy=v.y-W[13],dz=v.z-W[14];
   const x=W[0]*dx+W[1]*dy+W[2]*dz;
   const z=-(W[8]*dx+W[9]*dy+W[10]*dz);
   return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:null;
  }catch(e){return null}
 }
 function pointerDown(id,value){
  const b=$(id);b.addEventListener('pointerdown',e=>{
   e.preventDefault();b.setPointerCapture(e.pointerId);buttons[value]=true;
   if(value==='forward')audio?.resume?.();
  });
  const release=()=>{if(value==='forward')award();
   buttons[value]=false};
  b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);
  b.addEventListener('lostpointercapture',release);
 }
 [['forward','forward'],['left','left'],['right','right']].forEach(x=>pointerDown(...x));
 window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowLeft','ArrowRight','w','a','d',' '].includes(e.key)){
  e.preventDefault();keys.add(e.key);
 }});
 window.addEventListener('keyup',e=>{
  if(['ArrowUp','w',' '].includes(e.key))award();
  keys.delete(e.key);
 });
 window.addEventListener('blur',()=>{buttons={forward:false,left:false,right:false};keys.clear()});
 function award(){
  if(!running||game.signal!=='amber'||game.signalTime>.66||rewardedRound===game.round||lastGreenMove<.25)return;
  rewardedRound=game.round;G.react(game,game.signalTime<.42?'perfect':'good');renderEvents();
 }
 function controls(dt,pos){
  const p=game.players[0],fwd=buttons.forward||keys.has('ArrowUp')||keys.has('w')||keys.has(' ');
  let forward=fwd?1:0,lat=Number(buttons.right||keys.has('ArrowRight')||keys.has('d'))-
                          Number(buttons.left||keys.has('ArrowLeft')||keys.has('a'));
  let motion=0;
  if(!demo&&mode==='hybrid'&&calibrated&&pos&&reference){
   if(trackLast){
    const dx=pos.x-trackLast.x,dz=pos.z-trackLast.z;
    if(Math.hypot(dx,dz)>.38){
     // XR relocalization jump is NOT a player action.
     reference.x+=dx;reference.z+=dz;redAnchor=null;
    }else{
     const lerp=1-Math.exp(-dt/.14);
     if(!filtered)filtered={...pos};
     filtered.x+=(pos.x-filtered.x)*lerp;
     filtered.z+=(pos.z-filtered.z)*lerp;
     const zDelta=filtered.z-(trackLast.filteredZ??filtered.z);
     if(game.signal==='green')forward=Math.max(forward,clamp((zDelta-.001)/Math.max(.012,dt*.18),0,1));
     // Lateral is deliberately small: safe within arm's reach, not walking.
     lat=clamp(lat+(filtered.x-reference.x)*1.4,-1,1);
     if(game.signal==='red'&&game.signalTime>game.warning){
      if(!redAnchor)redAnchor={...filtered};
      const redDistance=Math.hypot(filtered.x-redAnchor.x,filtered.z-redAnchor.z);
      motion=redDistance>.085?.24:0; // >8.5cm after .74s grace
     }
    }
   }
   trackLast={...pos,filteredZ:filtered?.z??pos.z};
  }
  if(game.signal==='green'&&forward>.11)lastGreenMove+=dt*forward;
  if(game.signal==='amber'&&!fwd)award();
  G.input(game,{forward,lateral:lat,motion});
  return p;
 }
 function begin(){
  if(status!=='fixed'&&status!=='finished')return;
  if(!demo&&!calibrated){notify('📍 CALIBRACIÓN INCOMPLETA · MANTENÉ EL CELULAR QUIETO');return}
  if(hasRoom&&(!online?.room||online.room.status!=='playing')){
   notify('👥 ESPERANDO A QUE EL ANFITRIÓN INICIE LA SALA');return;
  }
  const preserved=reference;
  game=make();reference=preserved;G.start(game);lastEvent=0;
  rewardedRound=-1;lastGreenMove=0;redAnchor=null;
  status='running';running=true;
  $('result').style.display='none';$('startRace').style.display='none';
  $('calPanel').style.display='none';$('overlay').classList.add('sf-running','sf-fixed');
  $('movePad').style.display='flex';$('signalBadge').style.display='block';
  $('actionbar').style.display='flex';$('toggleControls').style.display=demo?'none':'block';
  $('status').style.display='none';if(online)$('onlinePanel').style.display='none';
  notify('🎮 VERDE AVANZAR · AMARILLO SOLTAR · ROJO QUIETO');
  hud();sound(780,.35);renderEvents();
  if(online)onlineActive=true;
 }
 function demoMode(){
  demo=true;status='fixed';calibrated=true;setup();
  $('overlay').classList.add('sf-demo','sf-fixed');
  $('demoCanvas').style.display='block';demoCtx=$('demoCanvas').getContext('2d',{alpha:false});
  $('actionbar').style.display='flex';$('startRace').disabled=false;
  $('calPanel').style.display='none';$('toggleControls').style.display='none';
  $('recenter').style.display='none';notify('LISTO · PRESIONÁ ¡A JUGAR! · ▲ AVANZAR · ◀ ▶ CARRILES');
  requestAnimationFrame(demoFrame);
 }
 function syncedTick(dt){
  if(game.paused)return;
  if(!online?.room?.startedAt){G.tick(game,dt);return}
  const start=Date.parse(online.room.startedAt);
  if(!Number.isFinite(start)){G.tick(game,dt);return}
  // Common server timestamp drives the light schedule. Never trust client
  // reports for permanent scores or authoritative winners.
  const target=clamp((Date.now()+online.skew-start)/1000,0,G.LIMIT+game.startDelay);
  const elapsed=()=>game.state==='countdown'?game.clock:game.startDelay+game.raceTime;
  let gap=target-elapsed();
  if(gap<=-.08)return; // too far ahead: wait for shared clock
  if(gap>.10){
   const restore={...game.input};G.input(game,{});
   let loops=0;
   while(gap>.08&&loops++<260&&game.state!=='finished'){
    G.tick(game,Math.min(.32,gap-.06));
    gap=target-elapsed();
   }
   G.input(game,restore);
  }else G.tick(game,Math.max(.001,Math.min(dt,gap+.04)));
 }
 function demoFrame(t){
  if(!demo)return;const dt=lastFrame?clamp((t-lastFrame)/1000,.001,.07):.016;lastFrame=t;
  const c=$('demoCanvas'),dpr=Math.min(devicePixelRatio||1,2);
  const w=innerWidth,h=innerHeight;
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  if(running){controls(dt,null);syncedTick(dt);renderEvents();if(t-lastHUD>130){hud();lastHUD=t}}
  try{A.drawDemo(demoCtx,w,h,game,t)}catch(e){console.warn('Arte demo:',e)}
  requestAnimationFrame(demoFrame);
 }
 function arFrame(t,frame){
  if(!sess)return;sess.requestAnimationFrame(arFrame);
  const dt=lastFrame?clamp((t-lastFrame)/1000,.001,.065):.016;lastFrame=t;
  try{
   const W=typeof buildWorld==='function'?buildWorld():null;if(!W)return;
   const pos=posePosition(frame,W);
   if(sampling)calibrate(t,pos);
   if(running){
    if(pos)lastTrack=t;
    if(!pos&&t-lastTrack>1300){
     notify('📡 SEGUIMIENTO PERDIDO · SOSTENÉ QUIETO EL TELÉFONO');
     G.input(game,{}); // prevents a false red-light penalty
    }else{
     controls(dt,pos);syncedTick(dt);renderEvents();
    }
   }
   if(t-lastHUD>125){lastHUD=t;hud()}
   if(t-(arFrame.drawAt||0)>38){
    arFrame.drawAt=t;
    const out=art.renderAR(frame,W,game,{tile:typeof boardSize==='number'?boardSize:.45});
    const arrow=$('youArrow'),p=out?.player;
    const lost=!p||p[0]<innerWidth*.05||p[0]>innerWidth*.95||p[1]<0||p[1]>innerHeight*.72;
    arrow.style.display=running&&lost?'block':'none';
    if(lost){arrow.textContent=!p?'◈ APUNTÁ A LA PISTA':p[0]<innerWidth/2?'◀ VOS POR ACÁ':'VOS POR ACÁ ▶';
     arrow.style.left=p&&p[0]>innerWidth/2?'auto':'9px';arrow.style.right=p&&p[0]>innerWidth/2?'9px':'auto'}
    
   }
  }catch(e){if(!arFrame.warned){console.warn('Semáforo AR:',e);arFrame.warned=true;notify('PROBLEMA DE RENDER AR · '+e.message)}}
 }
 function bootAR(){
  if(demo||arStarted||typeof sess==='undefined'||!sess||typeof ref==='undefined'||!ref)return;
  arStarted=true;lastFrame=0;sess.requestAnimationFrame(arFrame);
  sess.addEventListener('end',()=>{arStarted=false;running=false});
 }
 setInterval(()=>{
  if(demo)return;bootAR();
  if(typeof stage!=='undefined'&&stage==='fixed'&&status!=='fixed'&&status!=='running'&&status!=='finished'){setup();fixed()}
 },145);
 $('demo').onclick=()=>{sound(710);demoMode()};
 $('startRace').onclick=()=>{sound(820);begin()};
 $('recenter').onclick=()=>{if(!demo&&['fixed','running'].includes(status)){running&&fx('🎯 RECENTRANDO');startSampling()}};
 $('toggleControls').onclick=()=>{
  mode=mode==='hybrid'?'buttons':'hybrid';
  $('toggleControls').textContent=mode==='hybrid'?'📱 GESTOS + BOTONES':'🎮 SOLO BOTONES';
  notify(mode==='hybrid'?'GESTOS DEL TELÉFONO + CONTROLES ACTIVOS':'SOLO CONTROLES TÁCTILES · SIN PENALIZAR EL TELÉFONO');
 };
 $('lock').addEventListener('click',()=>setTimeout(()=>{
  if(typeof stage!=='undefined'&&stage==='fixed'&&!demo)fixed();
 },250));
 $('edit').addEventListener('click',()=>{status='preview';calibrated=false;running=false;$('overlay').classList.remove('sf-fixed','sf-running');$('calPanel').style.display='none'});
 $('returnMenu').onclick=()=>{if(demo)location.href='/';else{try{sess?.end()}catch(e){}location.href='/'}};
 $('goHome').onclick=()=>{try{sess?.end()}catch(e){}location.href='/'};
 $('rematch').onclick=()=>{
  if(online){notify('ONLINE: la revancha necesita una sala nueva');$('result').style.display='none';location.href='/salas.html?game=semaforo-traicionero';return}
  seed=(Math.random()*0xffffffff)>>>0;status='fixed';running=false;
  $('result').style.display='none';$('startRace').style.display='block';
  $('startRace').disabled=!calibrated;game=make();lastEvent=0;
  $('overlay').classList.remove('sf-running');
  $('actionbar').style.display='flex';$('status').style.display='block';
  if(demo){$('startRace').disabled=false;$('movePad').style.display='none'}
  notify('¡REVANCHA! · ¡ESTE SEMÁFORO NO PERDONA!');hud();
 };
 $('shareResult').onclick=async()=>{
  const p=game.players[0],s='🏆 '+Math.round(p.score)+' puntos en SEMÁFORO TRAICIONERO de MODO CAOS. ¿Me ganás? '+location.origin+'/semaforo.html';
  try{if(navigator.share){await navigator.share({text:s});return}}catch(e){}
  try{await navigator.clipboard.writeText(s);$('shareResult').textContent='✅ COPIADO'}
  catch(e){prompt('Compartir:',s)}
 };
 // Room integration: private Supabase channel plus polling fallback.
 // Broadcast values are untrusted client reports, never verified leaderboard results.
 function onlineLabel(s){$('onlineStatus').textContent=s}
 function onlineShow(){
  if(!online?.room)return;
  const r=online.room,p=r.players?.find(p=>p.userId===online.me);
  $('onlineReady').style.display=r.status==='lobby'?'inline-block':'none';
  $('onlineReady').textContent=p?.ready?'↻ NO LISTO':'✓ ESTOY LISTO';
  $('onlineStart').style.display=online.host&&r.status==='lobby'?'inline-block':'none';
  $('onlineStart').disabled=!(r.players?.length>=2&&r.players.every(p=>p.ready));
  onlineLabel('SALA '+r.code+' · '+(r.players?.length||0)+'/'+r.maxPlayers+' · '+
    (r.status==='playing'?'¡PARTIDA INICIADA!':r.status==='finished'?'TERMINADA':'PREPARÁ TU CÁMARA'));
 }
 async function onlineRefresh(){
  if(!online?.mc||!online?.room)return;
  const now=Date.now(),r=await online.mc.getRoom(online.room.id);
  if(r.id!==online.room.id)return;
  const server=Date.parse(r.serverTime||'');
  if(Number.isFinite(server))online.skew=server-now;
  online.room=r;online.host=r.hostUserId===online.me;onlineShow();
  if(r.status==='playing'&&!running&&status==='fixed'&&calibrated&&
     (!r.startedAt||Date.now()+online.skew>=Date.parse(r.startedAt)))begin();
 }
 async function initOnline(){
  if(!hasRoom||onlineConnecting)return;
  onlineConnecting=true;onlineLabel('CONECTANDO SALA…');
  try{
   const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm');
   const config=window.ModoCaosConfig;
   const supa=createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
   const mc=window.ModoCaosRooms.createClient(supa);
   const resumed=await mc.resumeRoom(roomCode);
   if(!resumed)throw Error('No pertenecés a esta sala; primero unite desde SALAS.');
   const me=await mc.userId();
   online={mc,room:{id:resumed.room_id,code:roomCode,players:[],status:'lobby'},me,
    host:false,conn:null,skew:0};
   await onlineRefresh();
   if(online.room.game!=='semaforo-traicionero')throw Error('Esta sala corresponde a otro juego.');
   online.conn=await mc.connectRoom(online.room.id,{
    onRefresh:()=>onlineRefresh().catch(console.warn),
    onGameEvent:data=>{
     if(!data||data.userId===online.me||!onlineActive)return;
     if(data.type==='move'){
      const p=game.players.find(p=>p.id===data.userId);
      if(!p||p.kind!=='remote')return;
      if(!Number.isFinite(data.progress)||!Number.isFinite(data.lane))return;
      p.progress=clamp(data.progress,0,100);p.lane=clamp(data.lane,-.83,.83);
      p.lives=clamp(Number(data.lives)||0,0,3);p.penalties=clamp(Number(data.penalties)||0,0,99);
      p.score=clamp(Number(data.score)||0,0,100000);
      p.finishedAt=data.finishedAt===null?null:clamp(Number(data.finishedAt)||0,0,100);
      p.eliminated=!!data.eliminated;
     }
    },
    onStatus:(s)=>{onlineLabel(s==='SUBSCRIBED'?'🟢 REaltime privado conectado · '+roomCode:'ONLINE '+s+' · POLLING ACTIVO')}
   });
   onlineTimer=setInterval(()=>{
    if(!online?.room)return;
    onlineRefresh().catch(e=>onlineLabel('SINCRONIZACIÓN: '+e.message));
    if(running&&online.conn?.connected&&Date.now()-peerLast>220){
     peerLast=Date.now();const p=game.players[0];
     online.conn.sendGameEvent({type:'move',progress:p.progress,lane:p.lane,
      lives:p.lives,penalties:p.penalties,score:Math.round(p.score),
      finishedAt:p.finishedAt,eliminated:p.eliminated}).catch(()=>{});
    }
   },450);
  }catch(e){onlineLabel('⚠ '+e.message+' · Abrí SALAS');console.warn('Sala semáforo:',e)}
 }
 $('onlineReady').onclick=async()=>{
  if(!online)return;
  try{const p=online.room.players?.find(x=>x.userId===online.me);
   await online.mc.setReady(online.room.id,!p?.ready);
   await onlineRefresh();await online.conn?.notify();
  }catch(e){onlineLabel('⚠ '+e.message)}
 };
 $('onlineStart').onclick=async()=>{
  if(!online?.host)return;
  try{await online.mc.startRoom(online.room.id);await onlineRefresh();await online.conn?.notify()}
  catch(e){onlineLabel('⚠ '+e.message)}
 };
 if(hasRoom)initOnline();
 window.addEventListener('pagehide',()=>{clearInterval(onlineTimer);online?.conn?.close().catch(()=>{})});
})();
