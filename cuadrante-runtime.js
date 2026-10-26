/* CUADRANTE | controls, AR hit testing, fallback camera, HUD and feedback */
(function(){
'use strict';
const $=id=>document.getElementById(id),C=window.CuadranteCore;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let THREE,renderer,stage,camera,session,hitSource,referenceSpace,videoStream,state,modePlay='circuit';
let inputMode='demo',placing=false,hasHit=false,recentering=false,yaw=0,offset={x:0,z:0},arenaScale=.66;
let playing=false,prev=0,acc=0,notified=false,toastUntil=0,quality='auto',autoQuality='high',slowFrames=0,stableFrames=0;
let pointers=new Map(),placeDistance=0,placeAngle=0,warningAt=0,records={games:0,wins:0,bestCombo:0,bestRally:0,bestArcade:0},audioCtx=null,audioAt=0;
try{records={...records,...JSON.parse(localStorage.getItem('cuadrante-records')||'{}')}}catch(e){}
const opts={music:.24,sfx:.65};
function save(){try{localStorage.setItem('cuadrante-records',JSON.stringify(records))}catch(e){}}
function report(e){$('error').textContent='CUADRANTE: '+(e&&e.message||String(e));$('error').style.display='block';setTimeout(()=>$('error').style.display='none',7500)}
function note(t,ms=1500){$('ticker').textContent=t;$('ticker').style.opacity='1';toastUntil=performance.now()+ms}
function sound(name){
 if(!audioCtx||opts.sfx<=0)return;
 const now=audioCtx.currentTime;
 const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
 const types={smash:[790,160,.23],transformWarning:[220,280,.17],hit:[280,125,.11],perfect:[570,280,.19],rivalHit:[195,105,.10],wall:[145,85,.055],geometryHit:[220,75,.13],goal:[520,900,.32],conceded:[230,75,.31],transform:[94,250,.27],victory:[420,850,.42],launch:[145,250,.10],click:[200,290,.07]};
 const p=types[name]||types.click;
 osc.type=name==='goal'||name==='victory'?'triangle':'sawtooth';
 osc.frequency.setValueAtTime(p[0],now);osc.frequency.exponentialRampToValueAtTime(p[1],now+p[2]);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.001,.095*opts.sfx),now+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,now+p[2]);
 // A quiet stereo position cue makes angled returns readable with headphones.
 if(audioCtx.createStereoPanner&&state&&name!=='click'&&name!=='launch'){
  const pan=audioCtx.createStereoPanner();pan.pan.value=clamp(state.ball.x/1.76,-.72,.72);
  osc.connect(gain).connect(pan).connect(audioCtx.destination);
 }else osc.connect(gain).connect(audioCtx.destination);
 osc.start(now);osc.stop(now+p[2]+.03);
}
function initAudio(){try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume().catch(()=>{})}catch(e){}}
function haptic(ms){if(navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}}
function impactFlash(variant){
 const fx=$('hitFlash');fx.className='';
 // Restart a tiny CSS animation, without allocating particles or DOM nodes.
 void fx.offsetWidth;fx.className=variant;
}
function music(){
 if(!audioCtx||opts.music<=0||!state||state.phase==='paused'||state.phase==='finished'||state.phase==='ready')return;
 if(audioCtx.currentTime<audioAt)return;
 audioAt=audioCtx.currentTime+.34;
 const steps=[110,130.81,146.83,98,110,164.81,146.83,130.81],i=(Math.floor(state.clock/.34))%8,urgent=state.score.some(v=>v===4);
 const freq=steps[i]*(urgent?1.14:1);
 const o=audioCtx.createOscillator(),g=audioCtx.createGain();
 o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,audioCtx.currentTime);
 g.gain.linearRampToValueAtTime(.033*opts.music,audioCtx.currentTime+.015);
 g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.24);
 o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.26);
}
function selectMode(m){modePlay=m;$('modeCircuit').classList.toggle('active',m==='circuit');$('modeSurvive').classList.toggle('active',m==='survival')}
$('modeCircuit').onclick=()=>selectMode('circuit');$('modeSurvive').onclick=()=>selectMode('survival');
$('settingsBtn').onclick=()=>{$('settings').style.display=$('settings').style.display==='block'?'none':'block';displayRecords()};
function displayRecords(){$('records').textContent='PARTIDAS '+records.games+' · VICTORIAS '+records.wins+' · COMBO '+records.bestCombo+' · MEJOR INTERCAMBIO '+records.bestRally+' · PUNTOS '+records.bestArcade}
$('sfxVol').oninput=e=>opts.sfx=+e.target.value/100;$('musicVol').oninput=e=>opts.music=+e.target.value/100;$('quality').onchange=e=>{quality=e.target.value;applyQuality()};
function applyQuality(){
 if(!renderer)return;
 const mobile=window.innerWidth<950;
 const level=quality==='auto'?autoQuality:quality;
 const ratio=level==='high'?Math.min(devicePixelRatio,mobile?1.55:2):level==='low'?Math.min(devicePixelRatio,1):Math.min(devicePixelRatio,mobile?1.25:1.5);
 renderer.setPixelRatio(ratio);
 stage?.setQuality(level);
}
function measureFrame(dt){
 if(quality!=='auto'||!playing||placing||!dt||renderer?.xr?.isPresenting)return;
 if(dt>.033){slowFrames++;stableFrames=Math.max(0,stableFrames-2)}
 else if(dt<.023){stableFrames++;slowFrames=Math.max(0,slowFrames-1)}
 if(slowFrames>115&&autoQuality!=='low'){autoQuality=autoQuality==='high'?'medium':'low';applyQuality();slowFrames=0;stableFrames=0;}
 if(stableFrames>900&&autoQuality!=='high'){autoQuality=autoQuality==='low'?'medium':'high';applyQuality();slowFrames=0;stableFrames=0;}
}
async function load(){
 if(THREE)return;
 const bounded=(url,ms)=>Promise.race([
  import(url),
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('El CDN tardó demasiado')),ms))
 ]);
 try{THREE=await bounded('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js',6500)}
 catch(e){try{THREE=await bounded('https://unpkg.com/three@0.160.1/build/three.module.js',6500)}
 catch(err){throw Error('Motor 3D no disponible, habilitando modo ligero. '+err.message)}}
}
function build(){
 if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();renderer=null}
 const container=$('stage');container.innerHTML='';
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
 renderer.setClearColor(0x080d14,0);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
 applyQuality();renderer.setSize(window.innerWidth,window.innerHeight,false);container.appendChild(renderer.domElement);
 stage=window.CuadranteArt(THREE).makeStage();applyQuality();camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.025,90);
 setDemoCamera();renderer.setAnimationLoop(frame);
}
function buildLite(){
 if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement?.remove()}
 $('stage').innerHTML='';
 const kit=window.CuadranteLite($('stage'),()=>state);
 renderer=kit.renderer;stage=kit.stage;camera=kit.camera;
 renderer.setAnimationLoop(frame);
}
function setDemoCamera(){if(!camera||renderer?.isLite)return;const aspect=innerWidth/innerHeight;
 camera.fov=aspect<1?66:57;camera.aspect=aspect;camera.position.set(0,1.68,aspect<1?7.5:6.6);camera.lookAt(0,1.2,-.65);camera.updateProjectionMatrix()}
function resize(){if(!renderer||!camera)return;renderer.setSize(innerWidth,innerHeight,false);applyQuality();if(!renderer.xr.isPresenting)setDemoCamera()}
window.addEventListener('resize',resize);
function enter(mode){inputMode=mode;state=C.create({modePlay});playing=true;notified=false;placing=false;hasHit=false;recentering=false;offset={x:0,z:0};arenaScale=.66;pointers.clear();
 $('home').style.display='none';$('stage').style.display='block';$('ui').style.display='block';
 $('recenterBtn').style.display='none';$('hitFlash').className='';
 $('overlay').style.display='none';$('ticker').style.opacity='0';$('placeControls').style.display='none';$('placeTitle').style.display='none';
 $('labelPhase').style.display='block';$('hud').style.display='flex';$('pauseBtn').style.display='block';$('touchLayer').style.pointerEvents='auto';
 $('cameraFeed').style.display='none';$('labelPhase').textContent='ARRASTRÁ PARA MOVER EL CUADRADO';$('load').style.display='none';
 if(inputMode==='demo'){stage.root.position.set(0,0,0);stage.root.scale.setScalar(1);C.start(state);note('ARRASTRÁ PARA DEFENDER',2100)}
 else{placing=true;stage.root.position.set(0,0,-1);stage.root.scale.setScalar(arenaScale);
 $('placeControls').style.display='flex';$('placeTitle').style.display='block';$('hud').style.display='none';$('pauseBtn').style.display='none';
 $('labelPhase').textContent=inputMode==='ar'?'BUSCANDO EL PISO · APUNTÁ EL CELULAR':'CÁMARA SIN SEGUIMIENTO ESPACIAL';}
}
function placeFromFrame(frame){
 if(!placing||!frame||!hitSource||!renderer?.xr?.isPresenting)return;
 const hits=frame.getHitTestResults(hitSource);if(!hits.length){hasHit=false;return}
 const p=hits[0].getPose(renderer.xr.getReferenceSpace());if(!p)return;
 hasHit=true;
 const pos=p.transform.position,cam=renderer.xr.getCamera(camera);let dir=new THREE.Vector3();cam.getWorldDirection(dir);
 let baseYaw=Math.atan2(-dir.x,-dir.z);yaw=baseYaw;
 const world=C.anchoredArena(pos,baseYaw,offset.rot||0,offset,arenaScale);
 stage.root.rotation.y=world.rotation;
 stage.root.position.set(world.x,world.y,world.z);
 stage.root.scale.setScalar(arenaScale);
 $('fixArena').disabled=false;$('labelPhase').textContent='SUPERFICIE DETECTADA · AJUSTÁ TU ARENA';
}
function frame(t,xrFrame){
 if(!renderer||!stage||!camera)return;
 const dt=clamp((t-prev)/1000||.016,0,.07);prev=t;measureFrame(dt);
 if(placing&&inputMode==='ar')placeFromFrame(xrFrame);
 if(state&&state.phase!=='ready'&&state.phase!=='paused'&&state.phase!=='finished'){
  acc+=dt;let steps=0;while(acc>=1/120&&steps++<9){C.step(state,1/120);acc-=1/120}if(steps>=9)acc=0;
  const events=C.drain(state);handleEvents(events);music();
 }else if(state&&state.phase==='paused'){acc=0}
 if(state)stage.update(state,dt);
 if(state)refreshHud();
 if(toastUntil&&performance.now()>toastUntil){$('ticker').style.opacity='0';toastUntil=0}
 renderer.render(stage.scene,camera);
}
function refreshHud(){
 $('youScore').textContent=state.score[0];$('rivalScore').textContent=state.score[1];
 $('rivalName').innerHTML='RIVAL '+(state.duel+1)+'<b>'+C.profiles[state.duel].name+'</b>';
 const n=state.combo;$('combo').style.display=n>=3?'block':'none';$('combo').textContent=n>=3?'COMBO ×'+n:'';
 // Contact-pressure meter uses proximity, not an unreliable future intercept
 // through moving obstacles; it never lies about the projected landing.
 const approaching=state.phase==='playing'&&state.ball.vz>.05;
 const danger=approaching?clamp((state.ball.z+.2)/3.1,0,1):0;
 const meter=$('contactFill');
 meter.style.transform='scaleX('+danger.toFixed(3)+')';
 meter.style.opacity=danger>.03?'1':'0';
 if(modePlay==='survival'&&state.phase!=='ready'&&!placing)$('labelPhase').textContent='SUPERVIVENCIA · '+state.survivalLives+' VIDAS · ARRASTRÁ PARA DEFENDER';
}
function handleEvents(events){
 for(const ev of events){const type=ev.type;
  if(type==='hit'||type==='perfect'||type==='smash'){
   stage.spawnImpact(state.ball.x,state.ball.y,state.ball.z,type==='smash'?'smash':'you');sound(type);haptic(type==='smash'?[20,16,35]:type==='perfect'?28:12);impactFlash(type==='smash'?'smash':'hit');
   if(type==='smash')note('⚡ ¡SMASH GEOMÉTRICO!',920);else if(type==='perfect')note('¡DEVOLUCIÓN PERFECTA!',820);else if(ev.info?.edge)note('¡SALVADA!',650);
   if(state.combo===5)note('¡COMBO DE 5!',900);if(state.combo===10)note('¡INTERCAMBIO ÉPICO!',950);
  }
  if(type==='rivalHit'){stage.spawnImpact(state.ball.x,state.ball.y,state.ball.z,'rival');sound(type)}
  if(type==='geometryHit'){if(performance.now()-warningAt>180){sound('geometryHit');warningAt=performance.now()}}
  if(type==='wall'){if(performance.now()-warningAt>200){sound('wall');warningAt=performance.now()}}
  if(type==='transformWarning'){sound('transformWarning');note('⚠ LA ARENA VA A CAMBIAR',680)}
  if(type==='transform'){sound('transform');note('ARENA: '+ev.info,1150)}
  if(type==='goal'){sound('goal');haptic([35,30,55]);impactFlash('goal');note('¡PUNTO PARA VOS!',1100)}
  if(type==='conceded'){sound('conceded');haptic(70);impactFlash('miss');note('PUNTO DEL RIVAL',850)}
  if(type==='launch')sound('launch');
  if(type==='nextRival')note('¡SUBE LA DIFICULTAD! '+ev.info,1200);
 }
 if(state.phase==='finished'&&!notified){notified=true;finish()}
}
function rememberResult(){
 records.games++;if(state.winner==='player')records.wins++;
 records.bestCombo=Math.max(records.bestCombo,state.bestCombo);records.bestRally=Math.max(records.bestRally,state.bestRally);
 records.bestArcade=Math.max(records.bestArcade,state.arcade);save();
}
function button(label,fn,kind){const b=document.createElement('button');b.textContent=label;b.className=kind||'';b.onclick=fn;$('modalButtons').appendChild(b)}
function modal(tag,title,desc){$('modalTag').textContent=tag;$('modalTitle').textContent=title;$('modalDesc').textContent=desc;$('modalButtons').replaceChildren();$('modalStats').textContent='';$('overlay').style.display='flex'}
function finish(){
 rememberResult();const won=state.winner==='player';const done=state.duel===5&&won&&modePlay==='circuit';
 const text=modePlay==='survival'?'¡AGUANTASTE '+state.score[0]+' PUNTOS! Volvé a jugar para superar tu marca.':won?(done?'¡SOS EL CAMPEÓN DEL CIRCUITO!':'RIVAL SUPERADO'):'EL RIVAL SE LLEVÓ ESTE DUELO';
 modal('CUADRANTE · '+C.profiles[state.duel].name,modePlay==='survival'?'FIN DE SUPERVIVENCIA':won?'¡VICTORIA!':'REVANCHA',text);
 $('modalStats').textContent=modePlay==='survival'?('PUNTOS '+state.score[0]+' · RIVALES '+(state.duel+1)+' · COMBO '+state.bestCombo+' · '+state.arcade+' PTS'):('VOS '+state.score[0]+' — '+state.score[1]+' RIVAL · '+state.arcade+' PTS · COMBO '+state.bestCombo+' · '+state.bestRally+' REBOTES');
 if(won&&state.duel<5&&modePlay==='circuit'){button('SIGUIENTE RIVAL →',()=>{notified=false;C.next(state);$('overlay').style.display='none';note('RIVAL '+(state.duel+1)+': '+C.profiles[state.duel].name,1450)},'blue')}
 button('VOLVER A JUGAR',()=>{state=C.retry(state);notified=false;$('overlay').style.display='none';note('¡A DEFENDER!',1000)},'');
 button('MENÚ DE MODO CAOS',()=>back(),'alt');
}
function pause(){if(!state||placing)return;if(state.phase==='paused'){C.resume(state);$('overlay').style.display='none';$('pauseBtn').textContent='Ⅱ';return}
 if(state.phase==='finished'){finish();return}
 C.pause(state);$('pauseBtn').textContent='▶';
 modal('PARTIDA DETENIDA','PAUSA','Tomate un segundo. El rebote te está esperando.');
 button('CONTINUAR',()=>{C.resume(state);$('overlay').style.display='none';$('pauseBtn').textContent='Ⅱ'},'blue');
 button('REINICIAR DUELO',()=>{state=C.retry(state);notified=false;$('overlay').style.display='none';$('pauseBtn').textContent='Ⅱ'},'');
 button('SALIR AL MENÚ',()=>back(),'alt');
}
$('pauseBtn').onclick=pause;$('exitBtn').onclick=()=>back();
function recenter(){
 if(!playing||placing||inputMode!=='ar'||!renderer?.xr?.isPresenting||!state||state.phase==='finished')return;
 C.pause(state);recentering=true;placing=true;hasHit=false;offset={x:0,z:0,rot:0};
 pointers.clear();$('overlay').style.display='none';$('pauseBtn').textContent='Ⅱ';$('pauseBtn').style.display='none';
 $('recenterBtn').style.display='none';$('hud').style.display='none';
 $('placeTitle').style.display='block';$('placeTitle').firstChild.textContent='RECENTRAR ARENA';
 $('placeControls').style.display='flex';$('fixArena').disabled=true;$('fixArena').textContent='FIJAR Y CONTINUAR';
 $('labelPhase').textContent='BUSCANDO NUEVA SUPERFICIE · SIN PERDER TUS PUNTOS';
 note('REUBICÁ LA ARENA · PUNTOS CONSERVADOS',1500);
}
$('recenterBtn').onclick=recenter;
async function back(){
 if(!playing)return;playing=false;placing=false;recentering=false;
 try{if(session){const old=session;session=null;await old.end()}}catch(e){}
 if(hitSource){try{hitSource.cancel()}catch(e){}hitSource=null}
 if(videoStream){videoStream.getTracks().forEach(t=>t.stop());videoStream=null}
 const v=$('cameraFeed');v.pause();v.srcObject=null;v.style.display='none';
 $('overlay').style.display='none';$('ui').style.display='none';$('stage').style.display='none';$('home').style.display='flex';
 if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();renderer=null}if(stage)stage.dispose();stage=null;state=null;audioAt=0;prev=0;acc=0;
}
async function init(mode){
 if(playing)await back();$('load').style.display='flex';initAudio();autoQuality=window.innerWidth<700?'medium':'high';slowFrames=0;stableFrames=0;
 let requestedXR=null;
 if(mode==='ar'&&navigator.xr){
  requestedXR=navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['local-floor'],domOverlay:{root:document.body}});
  requestedXR.catch(()=>{});
 }
 try{
  await load();build();
  if(mode==='ar')await beginAR(requestedXR);else enter('demo');
 }catch(e){
  $('load').style.display='none';
  if(!renderer||!stage||renderer.isLite){
   // An unavailable third-party CDN or GPU must never strand the Play button.
   if(requestedXR)requestedXR.then(s=>s.end().catch(()=>{})).catch(()=>{});
   try{buildLite();enter('demo');$('labelPhase').textContent='MODO LIGERO · CONTROLES Y FÍSICA COMPLETOS';
    note('MODO LIGERO · LISTO PARA JUGAR',2600)}
   catch(fail){report(fail);await back()}
  }else if(mode==='ar'){
   report(e);
   try{await fallbackCamera()}catch(err){report(err);enter('demo')}
  }else{
   // Rendering may have failed after initialization; recover with 2D graphics.
   try{buildLite();enter('demo');$('labelPhase').textContent='MODO LIGERO · FÍSICA ORIGINAL';
    note('MODO LIGERO · LISTO PARA JUGAR',2400)}
   catch(err){report(err);await back()}
  }
 }
}
async function beginAR(requestedXR){
 if(!navigator.xr||!requestedXR)throw Error('WebXR no está disponible. Se abrirá modo cámara alternativo.');
 session=await requestedXR;
 session.addEventListener('end',()=>{if(playing&&inputMode==='ar'&&!placing){C.pause(state);modal('AR DESCONECTADA','SE CERRÓ LA CÁMARA','Reiniciá la arena para recuperar el seguimiento espacial.');button('VOLVER AL MENÚ',back,'blue')}})
 await renderer.xr.setSession(session);
 const viewer=await session.requestReferenceSpace('viewer');
 hitSource=await session.requestHitTestSource({space:viewer});
 enter('ar');$('fixArena').disabled=true;note('BUSCÁ UNA SUPERFICIE',1850);
}
async function fallbackCamera(){
 try{videoStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
 $('cameraFeed').srcObject=videoStream;$('cameraFeed').style.display='block';await $('cameraFeed').play()}
 catch(e){report('No se pudo activar la cámara. Podés jugar en el modo 3D sin cámara.');enter('demo');return}
 enter('camera');$('cameraFeed').style.display='block';stage.root.position.set(0,0,0);stage.root.scale.setScalar(.9);
 $('labelPhase').textContent='CÁMARA SIN TRACKING ESPACIAL · CALIBRACIÓN MANUAL';$('fixArena').disabled=false;
}
$('startAr').onclick=()=>init('ar');$('startDemo').onclick=()=>init('demo');
function doFix(){
 if(!placing)return;
 if(inputMode==='ar'&&!hasHit){note('APUNTÁ A UN PISO DESPEJADO',1250);return}
 placing=false;$('placeControls').style.display='none';$('placeTitle').style.display='none';$('hud').style.display='flex';$('pauseBtn').style.display='block';
 $('labelPhase').textContent=inputMode==='ar'?'AR REAL · ARRASTRÁ PARA DEFENDER':'CÁMARA SIN TRACKING · ARRASTRÁ PARA DEFENDER';
 $('recenterBtn').style.display=inputMode==='ar'?'block':'none';
 if(recentering){
  recentering=false;C.resume(state);acc=0;prev=0;
  note('ARENA RECENTRADA · ¡SEGUÍ JUGANDO!',1550);
 }else{
  C.start(state);note('¡ARRASTRÁ PARA MOVER EL CUADRADO!',1700);
 }
 $('placeTitle').firstChild.textContent='FIJÁ TU ARENA';
 $('fixArena').textContent='FIJAR ARENA';
}
$('fixArena').onclick=doFix;
function adjustScale(k){arenaScale=clamp(arenaScale*k,.4,1.12);if(stage)stage.root.scale.setScalar(arenaScale)}
$('sizeMinus').onclick=()=>adjustScale(.89);$('sizePlus').onclick=()=>adjustScale(1.12);
$('rotateLeft').onclick=()=>{offset.rot=(offset.rot||0)-.14;if(stage)stage.root.rotation.y+=-.14};
$('rotateRight').onclick=()=>{offset.rot=(offset.rot||0)+.14;if(stage)stage.root.rotation.y+=.14};
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
const layer=$('touchLayer');
layer.addEventListener('pointerdown',e=>{if(!playing)return;e.preventDefault();try{layer.setPointerCapture(e.pointerId)}catch(_){}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(placing&&pointers.size===2){const [a,b]=[...pointers.values()];placeDistance=distance(a,b);placeAngle=Math.atan2(b.y-a.y,b.x-a.x)}});
layer.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!playing||!state)return;e.preventDefault();
 const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(placing){
  if(pointers.size===2){const [a,b]=[...pointers.values()],dist=distance(a,b),ang=Math.atan2(b.y-a.y,b.x-a.x);
   if(placeDistance>8)adjustScale(dist/placeDistance);
   let turn=ang-placeAngle;if(turn>Math.PI)turn-=2*Math.PI;if(turn< -Math.PI)turn+=2*Math.PI;
   if(Math.abs(turn)<.45){offset.rot=(offset.rot||0)+turn;if(stage)stage.root.rotation.y+=turn}
   placeDistance=dist;placeAngle=ang;
  }else{
   offset.x+=dx/innerWidth*2.6;offset.z+=dy/innerHeight*1.4;
   if(inputMode==='camera'&&stage){stage.root.position.x=offset.x;stage.root.position.y=offset.z*.35}
  }return;
 }
 if(state.phase==='playing'||state.phase==='serve'){
   const aspect=innerWidth/innerHeight;
   C.target(state,state.player.x+dx/innerWidth*(aspect>1?4.6:5.1),state.player.y-dy/innerHeight*(aspect>1?3.2:3.4));
 }
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])layer.addEventListener(type,e=>{pointers.delete(e.pointerId);placeDistance=0});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&state&&!placing&&state.phase!=='paused'&&state.phase!=='finished')pause()});
// The HTML is visible before network-delivered scripts finish; prevent dead early taps.
$('startAr').disabled=false;$('startDemo').disabled=false;
})();
