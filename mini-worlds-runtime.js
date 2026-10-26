/* MINI WORLDS — game orchestration: native WebXR / independent 3D camera, tactile controls, persistence. */
(function(){
'use strict';
const C=window.MiniWorldsCore,S=window.MiniWorldsSpatial,$=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const debugAR=new URLSearchParams(location.search).get('debug')==='1';
let T,renderer,camera,view,game,stage,session,hitSource,lastHit=null,anchor=null,mode='demo',phase='home',placing=false,hasHit=false;
let yaw=0,scale=.215,offset={x:0,z:0},lockedPose=null,worldYaw=0,headingSet=false;
let spatialLock=null,placementSerial=0,steeringYaw=null,heldSteeringYaw=null;
let anchorPoseAtLock=null,anchorDriftWarned=false,trackingResetWarned=false;
let old=0,acc=0,elapsed=0,animFrames=0,toastUntil=0,source=null,ctx=null,lastNote=0,musicAt=0,musicStep=0;
let orbitYaw=.36,orbitHeight=4.2,orbitZoom=1,orbitFingers=new Map(),orbitPinch=null;
let pixelTarget=Math.min(devicePixelRatio||1,innerWidth<700?1.5:1.8),slowFrames=0,fastFrames=0;
let input={x:0,z:0},jumpQueued=false,punchQueued=false,joyPointer=null,placePointers=new Map(),pinch=null;
let arGuide=null,guideState={visible:0,pose:false},webglCalls=-1,frameFaults=0,lastFault='',lastDiagnostics=0,arDebugVisible=false;
let mapOpen=false,arQuality=1.12,comboVisibleUntil=0,coinPulseUntil=0,portalHoldUntil=0;
let arCompositor=null,xrEmptyScene=null,arCompositorError='',arFpsTotal=0,arFpsFrames=0;
let level=0,progress={unlocked:0,best:[null,null],coins:0},settings={sound:true,music:true};
try{progress={...progress,...JSON.parse(localStorage.getItem('mc-mini-worlds-save-v1')||'{}')}}catch(_){}
try{settings={...settings,...JSON.parse(localStorage.getItem('mc-mini-worlds-config-v1')||'{}')}}catch(_){}
const save=()=>{try{localStorage.setItem('mc-mini-worlds-save-v1',JSON.stringify(progress));localStorage.setItem('mc-mini-worlds-config-v1',JSON.stringify(settings))}catch(_){}};
function notice(t,time=1700){$('toast').textContent=t;$('toast').classList.add('show');toastUntil=performance.now()+time}
function haptic(ms){try{navigator.vibrate?.(ms)}catch(_){}}
function audioInit(){try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{})}catch(_){}}
function beep(name){
 if(!settings.sound||!ctx)return;const now=ctx.currentTime;
 const notes={coin:[880,1250,.085,'sine'],star:[630,1380,.31,'triangle'],jump:[180,450,.11,'triangle'],double:[230,690,.16,'triangle'],smash:[140,53,.15,'sawtooth'],attack:[390,160,.09,'sawtooth'],hit:[250,90,.18,'sawtooth'],damage:[170,74,.27,'sawtooth'],checkpoint:[430,900,.35,'triangle'],win:[520,1150,.55,'triangle'],fail:[180,90,.4,'sawtooth'],boss:[96,55,.5,'sawtooth']};
 const a=notes[name]||notes.coin,o=ctx.createOscillator(),g=ctx.createGain();o.type=a[3];o.frequency.setValueAtTime(a[0],now);o.frequency.exponentialRampToValueAtTime(Math.max(35,a[1]),now+a[2]);
 g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.065,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+a[2]);
 o.connect(g).connect(ctx.destination);o.start(now);o.stop(now+a[2]+.03);
 // A quiet second transient adds a real impact/collection identity without
 // requiring large sample files or making the phone speakers harsh.
 if(name==='coin'||name==='smash'||name==='hit'){
  const extra=ctx.createOscillator(),env=ctx.createGain(),delay=name==='coin'?.045:.018,duration=name==='coin'?.095:.12;
  extra.type=name==='coin'?'sine':'triangle';
  const f=name==='coin'?1760:name==='smash'?210:540;
  extra.frequency.setValueAtTime(f,now+delay);
  extra.frequency.exponentialRampToValueAtTime(name==='coin'?2220:Math.max(65,f*.39),now+delay+duration);
  env.gain.setValueAtTime(.0001,now+delay);
  env.gain.linearRampToValueAtTime(name==='coin'?.024:.036,now+delay+.01);
  env.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);
  extra.connect(env).connect(ctx.destination);extra.start(now+delay);extra.stop(now+delay+duration+.02);
 }
}
function song(){
 if(!ctx||!settings.music||phase!=='playing'||ctx.currentTime<musicAt)return;
 const fury=game.chaos?.fury>0;
 const boss=game.map.boss.active,seq=boss?[110,146,130,164,123,164,196,146]:[220,277,330,277,247,330,370,330,220,247,294,330,247,277,330,440];
 const beat=boss?.205:fury?.18:.265,now=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=boss||fury?'sawtooth':'triangle';o.frequency.value=seq[musicStep++%seq.length]*(fury?1.25:1);
 g.gain.setValueAtTime(.0001,now);g.gain.linearRampToValueAtTime(boss?.027:fury?.027:.022,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+beat*.82);
 o.connect(g).connect(ctx.destination);o.start(now);o.stop(now+beat*.84);musicAt=now+beat;
}
function showModal(tag,title,desc,buttons){
 const modal=$('modal'),actions=$('actions');$('modalTag').textContent=tag;$('modalTitle').textContent=title;$('modalDesc').textContent=desc;
 actions.innerHTML='';for(let opt of buttons){let b=document.createElement('button');b.textContent=opt.label;b.className=opt.secondary?'secondary':'';b.addEventListener('click',opt.action);actions.appendChild(b)}
 modal.hidden=false;
}
function hideModal(){$('modal').hidden=true}
function error(text){notice(text,6500);$('load').hidden=true;console.error('MINI WORLDS',text)}
async function import3D(){
 if(T)return T;
 try{T=await Promise.race([import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js'),new Promise((_,r)=>setTimeout(()=>r(Error('El motor 3D no respondió')),9000))])}
 catch(e){T=await import('https://unpkg.com/three@0.160.1/build/three.module.js')}
 return T;
}
function clear(){
 placementSerial++;try{anchor?.delete?.()}catch(_){}
 anchor=null;anchorPoseAtLock=null;anchorDriftWarned=false;trackingResetWarned=false;
 spatialLock=null;lockedPose=null;steeringYaw=null;heldSteeringYaw=null;
 arCompositor?.dispose();arCompositor=null;arCompositorError='';
 $('arWorldOverlay').style.display='none';xrEmptyScene=null;
 renderer?.setAnimationLoop(null);document.body.classList.remove('mw-immersive-ar');if(renderer?.domElement)renderer.domElement.style.display='';arGuide?.hide();arGuide=null;if(stage){stage.disposePremium?.();stage.disposeAssets?.();stage.disposeCharacters?.();stage.dispose();stage=null}if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null}
 camera=null;view=null;game=null;placing=false;lockedPose=null;source=null;hasHit=false;
}
function renderSetup(){
 renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(pixelTarget);
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=false;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');renderer.setClearColor(0x000000,0);
 $('viewport').appendChild(renderer.domElement);
 camera=new T.PerspectiveCamera(60,innerWidth/innerHeight,.018,160);
 xrEmptyScene=new T.Scene(); // native framebuffer keeps WebXR pose in sync
 newStage();
 arGuide=window.MiniWorldsARGuide?window.MiniWorldsARGuide(T,$('arFloorGuide')):null;
 renderer.setAnimationLoop(frame);
}
function newStage(){
 if(stage){stage.disposePremium?.();stage.disposeAssets?.();stage.disposeCharacters?.();stage.dispose()}
 game=C.create(level);stage=window.MiniWorldsArt(T).makeStage(game.map);
 stage.pocket=window.MiniWorldsPocket?.create(T,stage)||null;
 const stageRef=stage;
 // Native, bundled CC0 assets never block controls. Keep the original art if any GLB cannot load.
 if(window.MiniWorldsAssets){
  Promise.resolve().then(()=>window.MiniWorldsAssets(T).decorate(stageRef,level)).then(stats=>{
   if(stage===stageRef&&stats?.count){
    console.info('[MINI WORLDS] Imported '+stats.loaded+' licensed GLB models, '+stats.count+' decorative instances.');
   }
  }).catch(e=>console.warn('[MINI WORLDS] Procedural world remains available:',e.message));
 }
 // Quaternius (genuine CC0 GLBs): visually distinct premium biomes,
 // with automatic Kenney/procedural fallback on any failed download.
 // This decoration never owns physics, spatial pose or controls.
 if(window.MiniWorldsPremium){
  Promise.resolve().then(()=>window.MiniWorldsPremium(T).decorate(stageRef,level)).then(stats=>{
   if(stage!==stageRef)return;
   if(stats?.placed)console.info('[MINI WORLDS] Real Quaternius nature scene:',stats);
   else console.info('[MINI WORLDS] Kenney/procedural fallback retained:',stats);
  }).catch(e=>console.warn('[MINI WORLDS] Optional Quaternius scenery not available:',e.message));
 }
 // Animated characters are optional and NEVER delay or replace physics.
 if(window.MiniWorldsCharacters){
  Promise.resolve().then(()=>window.MiniWorldsCharacters(T).setup(stageRef,level)).then(stats=>{
   if(stage!==stageRef)return;
   if(stageRef.updateCharacterAnimations)stageRef.bindCharacters(stageRef.updateCharacterAnimations);
   console.info('[MINI WORLDS] Character rigs ready:',stats);
  }).catch(e=>console.warn('[MINI WORLDS] Procedural hero/enemies preserved:',e.message));
 }
 view=stage.scene;view.background=mode==='ar'?null:new T.Color(level?0x9ea6cf:0xa5dadd);
 stage.root.rotation.y=mode==='ar'?worldYaw:0;
 stage.root.scale.setScalar(mode==='ar'?scale:1);
 if(mode==='ar'&&spatialLock)S.restoreWorld(stage,spatialLock);
 else if(mode==='ar'&&lockedPose)stage.root.position.copy(lockedPose);
 else stage.root.position.set(0,0,0);
 if(mode==='demo')setCamera(true);
 elapsed=0;acc=0;updateHUD();$('zoneTitle').textContent='MUNDO 1 · '+game.map.definition.name;
}
function setCamera(first=false){
 if(!camera||!game)return;
 const p=game.player;
 const reach=5.0*orbitZoom;
 const rz=stage?.pocket?.localZ(p.z)??p.z,ry=p.y+(stage?.worldRoot?.position.y||0);
 const want=new T.Vector3(p.x+Math.sin(orbitYaw)*reach,ry+orbitHeight*orbitZoom,rz+Math.cos(orbitYaw)*reach);
 if(first)camera.position.copy(want);else camera.position.lerp(want,.11);
 const focus=new T.Vector3(p.x,ry+.6,rz-1.45);
 camera.lookAt(focus);
}
function drawMiniMap(){
 if(!mapOpen||!game)return;
 const canvas=$('miniMap'),g=canvas.getContext('2d');if(!g)return;
 const W=canvas.width,H=canvas.height;
 const X=x=>8+(x+8.5)/17*(W-16),Z=z=>8+(z+26)/29*(H-16);
 g.clearRect(0,0,W,H);
 g.fillStyle='#0b2939';g.fillRect(0,0,W,H);
 g.strokeStyle='#55bdac';g.lineCap='round';g.lineWidth=5;
 for(const r of game.map.walkways||[]){g.beginPath();g.moveTo(X(r.x1),Z(r.z1));g.lineTo(X(r.x2),Z(r.z2));g.stroke()}
 for(const p of game.map.platforms){g.fillStyle=p.kind==='bridge'?'#c5ab7c':p.kind==='beach'?'#e1ca91':'#73b79b';
  g.fillRect(X(p.x-p.w/2),Z(p.z+p.d/2),p.w*(W-16)/17,p.d*(H-16)/29)}
 for(const e of game.map.enemies)if(e.alive){g.fillStyle='#ff9874';g.beginPath();g.arc(X(e.x),Z(e.z),2.3,0,Math.PI*2);g.fill()}
 const b=game.map.boss;if(b.alive){g.fillStyle='#f2bf65';g.beginPath();g.arc(X(b.x),Z(b.z),4,0,Math.PI*2);g.fill()}
 const p=game.player;g.save();g.translate(X(p.x),Z(p.z));g.rotate(-p.face+Math.PI);
 g.fillStyle='#faffff';g.beginPath();g.moveTo(0,-6);g.lineTo(4,5);g.lineTo(-4,5);g.closePath();g.fill();g.restore();
 g.font='bold 9px system-ui';g.fillStyle='#e9fff6';g.fillText('TU AVENTURA',8,12);
}
function layout(state){
 phase=state;const active=state==='playing'||state==='paused'||state==='ready'||state==='placing'||state==='won';
 $('landing').hidden=state!=='home';$('viewport').hidden=!active;$('hud').hidden=state==='home'||state==='placing';
 $('gameUI').hidden=state==='home';$('controls').hidden=state!=='playing';
 $('chaosMeter').hidden=state==='home'||state==='placing';
 if(state==='home')document.body.classList.remove('fury-mode','boss-encounter');
 $('placement').hidden=state!=='placing';$('ready').hidden=state!=='ready';$('pause').hidden=state!=='playing';
 $('recenter').hidden=mode!=='ar'||(state!=='playing'&&state!=='paused');
 $('mapToggle').hidden=state!=='playing'&&state!=='paused';
 $('miniMap').hidden=!mapOpen||(state!=='playing'&&state!=='paused');
 $('arStatus').hidden=!debugAR||mode!=='ar'||(state!=='playing'&&state!=='paused');
 $('positionPad').style.pointerEvents=state==='placing'?'auto':'none';
 if(state==='home')hideModal();
}
function demoCameraPlacement(){lockedPose=null;worldYaw=0;layout('ready');notice('¡TU AVENTURA COMIENZA!',1400);$('readyTitle').textContent='¡BIENVENIDO A ISLA SALVAJE!'}
async function play(modeRequested){
 if(phase!=='home')return;
 audioInit();mode=modeRequested;level=clamp(level,0,progress.unlocked);
 let xrPending=null;
 if(mode==='ar'&&navigator.xr){
   try{xrPending=navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors'],domOverlay:{root:document.body}});xrPending.catch(()=>{})}
   catch(e){error('No se puede iniciar AR: '+e.message);return}
 }
 $('load').hidden=false;
 try{
  await import3D();
  if(mode==='ar'&&!xrPending)throw Error('AR espacial no compatible con este navegador.');
  renderSetup();
  if(mode==='ar'){
   session=await xrPending;
   await renderer.xr.setSession(session);
   renderer.xr.getReferenceSpace()?.addEventListener?.('reset',()=>{
    if(phase!=='home'&&!placing&&!trackingResetWarned){
     trackingResetWarned=true;
     notice('ARCORE RECALIBRÓ EL ESPACIO · SI CAMBIÓ LA PISTA, TOCÁ RECENTRAR',3600);
    }
   });
   // THREE draws to XRWebGLLayer, not the DOM-overlay canvas. Keeping
   // that canvas visible can obscure the native 3D over camera passthrough.
   document.body.classList.add('mw-immersive-ar');
   renderer.domElement.style.display='none';
   // Same proven compositor path as Rodeados 360. Native framebuffer
   // stays empty; the tracked virtual world is rendered into a transparent
   // DOM-overlay WebGL canvas (never stuck to the phone).
   try{
    arCompositor=window.MiniWorldsARCompositor(T,$('arWorldOverlay'),1.12);
    $('arWorldOverlay').style.display='block';
    arCompositorError='';
    console.info('[MINI WORLDS] Rodeados-style AR compositor ready.');
   }catch(e){
    arCompositor=null;arCompositorError=e?.message||String(e);
    console.error('[MINI WORLDS] Compositor initialization:',e);
    $('arWorldOverlay').style.display='none';
    notice('CAPA AR NO DISPONIBLE · REINTENTÁ EN CHROME',3500);
   }
   const viewer=await session.requestReferenceSpace('viewer');
   hitSource=await session.requestHitTestSource({space:viewer});
   session.addEventListener('end',()=>{if(phase!=='home'){error('El seguimiento AR terminó. Regresando al menú.');home(true)}});
   spatialLock=null;lockedPose=null;steeringYaw=null;heldSteeringYaw=null;
   placing=true;hasHit=false;headingSet=false;layout('placing');$('fixWorld').disabled=true;notice('BUSCÁ UNA SUPERFICIE PLANA',2400);
  }else{layout('ready');demoCameraPlacement()}
 }catch(e){
  error(e.message||String(e));
  try{await xrPending?.then?.(s=>s.end())}catch(_){}
  if(mode==='ar'){await home(true);showModal('COMPATIBILIDAD','AR NO DISPONIBLE','Tu dispositivo o navegador no permite iniciar seguimiento espacial. Podés jugar la aventura completa en 3D.',[{label:'JUGAR EN 3D',action:()=>{hideModal();play('demo')}},{label:'VOLVER AL MENÚ',secondary:true,action:hideModal}])}
  else{await home(true);showModal('ERROR','NO SE PUDO CARGAR','No se pudo iniciar el motor Three.js. Comprobá la conexión a internet e intentá nuevamente.',[{label:'VOLVER',action:hideModal}])}
 }finally{$('load').hidden=true}
}
async function home(skipSession=false){
 // Mark navigation before ending XR to avoid a second async cleanup from its 'end' listener.
 phase='home';
 if(session&&!skipSession){const s=session;session=null;try{await s.end()}catch(_){}}session=null;
 try{hitSource?.cancel?.()}catch(_){}
 hitSource=null;anchor=null;clear();layout('home');fillLanding();
}
function detectXR(){
 const btn=$('arPlay');
 if(!navigator.xr){btn.disabled=true;btn.textContent='AR · REQUIERE ANDROID COMPATIBLE';return}
 navigator.xr.isSessionSupported('immersive-ar').then(ok=>{btn.disabled=!ok;btn.textContent=ok?'◈ JUGAR EN MI PISO · AR':'AR · NO COMPATIBLE CON ESTE TELÉFONO'}).catch(()=>{btn.disabled=true;btn.textContent='AR NO DISPONIBLE'});
}
function applyHit(frame){
 if(!placing||mode!=='ar'||!frame||!hitSource)return;
 let hit=frame.getHitTestResults(hitSource)[0];
 if(!hit){hasHit=false;$('fixWorld').disabled=true;return}
 let pose=hit.getPose(renderer.xr.getReferenceSpace());if(!pose)return;
 hasHit=true;lastHit=hit;
 const pos=pose.transform.position;
 // Orientation from native XR viewer pose, not an uninitialized Three camera.
 // Freeze compass on first valid hit so phone rotation won't spin the island.
 if(!headingSet){
  const viewerPose=frame.getViewerPose(renderer.xr.getReferenceSpace());
  const heading=S.headingFromQuaternion(viewerPose?.views?.[0]?.transform?.orientation);
  if(heading!==null){worldYaw=heading+yaw;headingSet=true;steeringYaw=heading}
 }
 // Start tile stays at hit-tested floor center; never follows the phone.
 stage.root.position.set(pos.x+offset.x,pos.y,pos.z+offset.z);
 stage.root.rotation.y=worldYaw;stage.root.scale.setScalar(scale);
 $('fixWorld').disabled=false;
 const footprint=window.MiniWorldsPocket?.displayLength(scale)||{length:8.8*scale,width:11.5*scale};
 $('placementHint').textContent='PISO DETECTADO · MUNDO COMPACTO '+footprint.length.toFixed(1)+' m × '+footprint.width.toFixed(1)+' m · 4 ZONAS CON PORTALES';
}
function maintainWorldLock(frame){
 if(placing||mode!=='ar'||!spatialLock||!stage)return;
 // Preserve the EXACT pose chosen by the user, independent of subsequent
 // anchor refinements, phone translation and phone rotation.
 S.restoreWorld(stage,spatialLock);
 if(!frame||!anchor)return;
 const pose=frame.getPose(anchor.anchorSpace,renderer.xr.getReferenceSpace());
 if(!pose)return;
 const pos=pose.transform.position;
 const current={x:pos.x,y:pos.y,z:pos.z};
 if(!anchorPoseAtLock){anchorPoseAtLock=current;return}
 if(!anchorDriftWarned&&S.trackedAnchorDeviation(anchorPoseAtLock,current)>.42){
  anchorDriftWarned=true;
  notice('SEGUIMIENTO AR CAMBIÓ · RECENTRAR SI LA PISTA SE DESALINEÓ',3600);
 }
}
async function fixWorld(){
 if(!hasHit||!placing||!stage)return;
 if(guideState.pose&&guideState.visible===0){
  notice('EL INICIO QUEDÓ FUERA DE PANTALLA · APUNTÁ AL PISO',2700);
  return;
 }
 placing=false;lockedPose=stage.root.position.clone();
 spatialLock=Object.freeze(S.snapshotWorld(stage));
 worldYaw=spatialLock.yaw;scale=spatialLock.scale;
 anchorPoseAtLock=null;anchorDriftWarned=false;trackingResetWarned=false;
 const placeNonce=++placementSerial;
 const hitAtLock=lastHit;
 $('fixWorld').disabled=true;layout('ready');$('readyTitle').textContent='¡MUNDO FIJADO!';
 notice('¡LISTO! · PISTA FIJA EN EL PISO',1800);haptic(18);
 if(hitAtLock?.createAnchor)try{
  const created=await hitAtLock.createAnchor();
  if(placementSerial===placeNonce&&!placing&&mode==='ar')anchor=created;
  else created.delete?.();
 }catch(_){}
}
function recenter(){
 if(mode!=='ar'||!session)return;
 if(phase==='playing')C.pause(game);
 placementSerial++;placing=true;hasHit=false;headingSet=false;lockedPose=null;spatialLock=null;
 anchorPoseAtLock=null;anchorDriftWarned=false;trackingResetWarned=false;
 heldSteeringYaw=null;steeringYaw=null;
 input.x=0;input.z=0;$('stick').style.transform='translate(0,0)';
 anchor?.delete?.();anchor=null;
 layout('placing');notice('RECENTRÁ SIN PERDER TUS MONEDAS',2500);$('placementHint').textContent='ENCONTRÁ EL PISO OTRA VEZ';
}
function startGame(){
 if(phase!=='ready')return;
 C.start(game);layout('playing');hideModal();notice('✨ BRUJITA · MOVETE, SALTÁ Y LANZÁ MAGIA',2400);haptic(15);
}
function pause(){
 if(!game||phase==='home')return;
 if(phase==='playing'){C.pause(game);layout('paused');showModal('AVENTURA EN PAUSA','ISLA SALVAJE','Seguís desde el mismo lugar, con tus monedas y estrellas guardadas en la partida.',[
 {label:'▶ CONTINUAR',action:()=>{C.pause(game);hideModal();layout('playing')}},
 {label:settings.music?'♫ MÚSICA: SÍ':'♫ MÚSICA: NO',secondary:true,action:()=>{settings.music=!settings.music;save();hideModal();C.pause(game);layout('playing');pause()}},
 {label:'↻ REINICIAR NIVEL',secondary:true,action:()=>{hideModal();newStage();layout('ready')}},
 {label:'SALIR AL MENÚ',secondary:true,action:()=>home()}
 ])}
}
function next(){
 level=Math.min(1,level+1);hideModal();newStage();layout('ready');
 $('readyTitle').textContent='NUEVA AVENTURA DESBLOQUEADA';notice(game.map.definition.name,2400);
}
function victory(){
 if(phase==='won')return;
 layout('won');beep('win');haptic([30,70,30,70,90]);const stars='★'.repeat(game.stars)+'☆'.repeat(3-game.stars);
 progress.coins+=game.coins;progress.unlocked=Math.max(progress.unlocked,Math.min(1,level+1));
 const previous=progress.best[level];if(!previous||game.stars>previous.stars||(game.stars===previous.stars&&game.clock<previous.time))progress.best[level]={stars:game.stars,time:Math.round(game.clock),coins:game.coins};
 save();
 const options=level===0?[{label:'✨ CONTINUAR · ACANTILADO PERDIDO',action:next},{label:'↻ REPETIR',secondary:true,action:()=>{hideModal();newStage();layout('ready')}}]:
 [{label:'↻ VOLVER A JUGAR',action:()=>{hideModal();newStage();layout('ready')}},{label:'⛺ VOLVER A ISLA SALVAJE',secondary:true,action:()=>{level=0;hideModal();newStage();layout('ready')}}];
 options.push({label:'SALIR AL MENÚ',secondary:true,action:()=>home()});
 showModal('NIVEL SUPERADO','¡ISLA CONQUISTADA!',stars+' · '+game.coins+' MONEDAS · '+Math.round(game.clock)+' SEGUNDOS. '+(level===0?'Se abrió una nueva aventura.':'¡Completaste las dos aventuras de esta primera entrega!'),options);
}
function updateHUD(){
 if(!game)return;
 $('health').textContent='♥'.repeat(game.player.hearts)+'♡'.repeat(3-game.player.hearts);
 $('coinCount').textContent=String(game.coins).padStart(2,'0');$('starCount').textContent=game.stars+'/3';
 $('clock').textContent=Math.floor(game.clock/60)+':'+String(Math.floor(game.clock%60)).padStart(2,'0');
 const b=game.map.boss;$('bossHud').hidden=!b.active||!b.alive;
 document.body.classList.toggle('boss-encounter',b.active&&b.alive&&phase==='playing');
 $('bossLabel').textContent=game.map.definition.boss+' · FASE '+b.phase;
 $('bossFill').style.width=(b.hp/b.maxHp*100)+'%';
 const q=game.chaos;
 if(q){
  const fury=q.fury>0;
  $('chaosFill').style.width=(fury?q.fury/7*100:q.charge)+'%';
  $('chaosCaption').textContent=fury?'⚡ FURIA · '+q.fury.toFixed(1)+'s':'⚡ CAOS '+Math.floor(q.charge)+'%';
  document.body.classList.toggle('fury-mode',fury&&phase==='playing');
  const comboVisible=q.chain>=2&&q.window>.01&&phase==='playing';
  if(comboVisible){
   $('comboBanner').textContent='COMBO ×'+q.chain+(q.chain>=5?' ¡IMPARABLE!':'');
   $('comboBanner').classList.add('show');
  }else $('comboBanner').classList.remove('show');
 }
 const counter=$('coinCount');counter.classList.toggle('pop',performance.now()<coinPulseUntil);
}
function events(){
 for(const e of C.drain(game)){
  const x=game.player.x,y=game.player.y+.7,z=game.player.z;
  // Spatially accurate FX at the impact target instead of the avatar.
  stage.combatFx?.(e,game.player);
  if(e.type==='coin'){beep('coin');haptic(7);coinPulseUntil=performance.now()+190;
    if(e.combo%15===0)notice('¡'+e.combo+' MONEDAS!',800)}
  else if(e.type==='star'){beep('star');haptic([15,35,25]);notice('✦ ESTRELLA SECRETA '+game.stars+'/3',2200);stage.impact(x,y,z,'#ffe56b',25)}
  else if(e.type==='jump')beep(e.double?'double':'jump');
  else if(e.type==='swing'){beep('attack');haptic(8)}
  else if(e.type==='boxHit'){beep('hit');haptic(12)}
  else if(e.type==='boxBreak'){beep('smash');haptic([18,25,20])}
  else if(e.type==='treasure'){beep('star');haptic(22)}
  else if(e.type==='orb'){beep('star');haptic([10,30,10])}
  else if(e.type==='enemyHit'){beep('hit');haptic(17)}
  else if(e.type==='enemyDown'){beep('smash');haptic([23,28,34]);if(e.combo%3===0)notice('¡TRIPLE CAOS! · '+e.combo+' ENEMIGOS',930)}
  else if(e.type==='combo'){beep('checkpoint');haptic([12,28,12])}
  else if(e.type==='furyStart'){beep('star');haptic([30,50,40,50,60]);notice('⚡ ¡MODO FURIA ACTIVADO!',1450)}
  else if(e.type==='furyEnd'){beep('checkpoint');notice('FURIA TERMINADA · ¡SEGUÍ SUMANDO!',850)}
  else if(e.type==='hurt'){beep('damage');haptic([40,50,30]);notice('¡CUIDADO! · '+game.player.hearts+' CORAZONES',1050)}
  else if(e.type==='fall'){beep('fail');notice('¡AL AGUA! · VOLVÉS AL CHECKPOINT',1300)}
  else if(e.type==='checkpoint'){beep('checkpoint');haptic(20);notice('⚑ CHECKPOINT · CORAZÓN RECUPERADO',1800);stage.impact(x,y,z,'#b5ffec',24)}
  else if(e.type==='bossIntro'){beep('boss');haptic([32,60,38]);notice('⚠ ¡APARECE '+game.map.definition.boss+'!',2400)}
  else if(e.type==='bossWarn'){notice('⚠ ¡SALTÁ O ESQUIVÁ!',700)}
  else if(e.type==='bossSmash'){beep('smash');haptic(20);stage.impact(game.map.boss.x,2,-23.2,'#ff7050',20)}
  else if(e.type==='bossPhase'){beep('boss');haptic([25,35,25]);notice('¡FASE '+e.phase+' · SE ENFURECE!',1750)}
  else if(e.type==='bossHit'){beep('hit');haptic(32);stage.impact(game.map.boss.x,2,-24,'#b9fcf4',20)}
  else if(e.type==='bossDown'){beep('win');haptic([40,65,35,65,90]);stage.impact(0,2,-24,'#f4df87',45)}
  else if(e.type==='win')victory();
 }
}
function frame(t,xrFrame){
 if(!renderer||!game)return;
 const dt=clamp((t-old)/1000||.016,0,.05);old=t;elapsed+=dt;animFrames++;
 // A gentle mobile quality governor reduces GPU pressure without changing the simulation tick.
 if(mode==='ar'&&phase==='playing'&&arCompositor){
   arFpsTotal+=dt;arFpsFrames++;
   if(arFpsFrames>=180){
    const fps=arFpsFrames/Math.max(.001,arFpsTotal);
    const next=fps<27?.83:fps<36?.95:fps>47?1.12:arQuality;
    if(Math.abs(next-arQuality)>.04){arQuality=next;arCompositor.setQuality(next)}
    arFpsTotal=0;arFpsFrames=0;
   }
  }
  if(mode==='demo'&&phase==='playing'&&animFrames%4===0){
  if(dt>.035){slowFrames++;fastFrames=Math.max(0,fastFrames-2)}
  else if(dt<.022){fastFrames++;slowFrames=Math.max(0,slowFrames-1)}
  if(slowFrames>50&&pixelTarget>1.01){
   pixelTarget=Math.max(1,pixelTarget-.2);renderer.setPixelRatio(pixelTarget);slowFrames=0;
  }else if(fastFrames>210&&pixelTarget<Math.min(devicePixelRatio||1,1.5)){
   pixelTarget=Math.min(Math.min(devicePixelRatio||1,1.5),pixelTarget+.1);renderer.setPixelRatio(pixelTarget);fastFrames=0;
  }
 }
 if(placing&&mode==='ar')applyHit(xrFrame);
 if(mode==='ar'&&xrFrame){
  const pose=xrFrame.getViewerPose(renderer.xr.getReferenceSpace());
  const heading=S.headingFromQuaternion(pose?.views?.[0]?.transform?.orientation);
  if(heading!==null)steeringYaw=heading;
  maintainWorldLock(xrFrame);
 }
 if(phase==='playing'){
  acc+=dt;let loops=0;
  while(acc>=1/60&&loops++<4){
   // During a thumb hold, retain the sampled camera heading: turning
   // the phone to look at the avatar does not rotate the input vector.
   const move=mode==='demo'
     ?{x:input.x*Math.cos(orbitYaw)+input.z*Math.sin(orbitYaw),
       z:input.z*Math.cos(orbitYaw)-input.x*Math.sin(orbitYaw)}
     :S.cameraRelative(input.x,input.z,heldSteeringYaw??steeringYaw??worldYaw,spatialLock?.yaw??worldYaw);
   C.tick(game,{x:move.x,z:move.z,jump:jumpQueued,punch:punchQueued},1/60);
   jumpQueued=false;punchQueued=false;acc-=1/60;
  }
  if(loops>=4)acc=0;
  const portal=stage.pocket?.sync(game.player.z);
  if(portal){
   game.player.vx=0;game.player.vz=0;
   input.x=0;input.z=0;heldSteeringYaw=null;
   $('stick').style.transform='translate(0,0)';
   portalHoldUntil=performance.now()+520;
   $('portalFlash')?.classList.add('active');
   notice('✨ PORTAL · '+portal.info.title+(portal.info.floor?' · PISO SUPERIOR':''),1800);
   haptic([12,40,20]);beep('star');
   $('zoneTitle').textContent='ZONA '+(portal.room+1)+'/4 · '+portal.info.title;
  }
  if(portalHoldUntil&&performance.now()>portalHoldUntil){
   portalHoldUntil=0;$('portalFlash')?.classList.remove('active');
  }
  events();song();
 }else{acc=0;jumpQueued=false;punchQueued=false}
 // Animation errors never prevent drawing or conceal the whole world.
 try{stage.update(game,dt,elapsed)}catch(e){
  if(lastFault!==String(e)){lastFault=String(e);console.error('[MINI WORLDS] Animation error:',e)}
  frameFaults++;
 }
 if(stage.previewBeacon)stage.previewBeacon.visible=mode==='ar'&&(placing||phase==='ready');
 if(mode==='demo')setCamera();
 if(animFrames%6===0){updateHUD();drawMiniMap()}
 if(toastUntil&&performance.now()>toastUntil){$('toast').classList.remove('show');toastUntil=0}
 try{
  if(mode==='ar'&&renderer.xr.isPresenting){
   // Three.js updates the XR camera here while rendering an empty native
   // scene, so Android can composite passthrough behind the DOM overlay.
   renderer.render(xrEmptyScene,camera);
   if(arCompositor){
    const ok=arCompositor.render(view,renderer.xr.getCamera(camera));
    webglCalls=ok?arCompositor.drawCalls:0;
    if(!ok){
     frameFaults++;
     arCompositorError=arCompositor.error;
     if(frameFaults===1||frameFaults%90===0)console.error('[MINI WORLDS] AR compositor:',arCompositorError);
    }
   }else{
    // Platform-safe fallback; visibly report missing compositing path.
    renderer.render(view,camera);
    webglCalls=renderer.info.render.calls;
   }
  }else{
   renderer.render(view,camera);
   webglCalls=renderer.info.render.calls;
  }
 }catch(e){frameFaults++;if(lastFault!==String(e)){lastFault=String(e);console.error('[MINI WORLDS] XR WebGL:',e)}}
 if(mode==='ar'&&xrFrame&&arGuide&&animFrames%3===0){
  guideState=arGuide.draw(xrFrame,renderer.xr.getReferenceSpace(),stage,placing||phase==='ready'||arDebugVisible,webglCalls===0);
 }
 if(mode==='ar'&&(phase==='playing'||phase==='paused')&&animFrames%30===0){
  const presenting=renderer.xr.isPresenting;
  const layer=!!renderer.xr.getBaseLayer?.();
  const actual=webglCalls<0?'—':webglCalls;
  const composite=!!arCompositor&&arCompositor.frames>0;
  $('arStatus').textContent=(composite?'AR VISIBLE':presenting&&layer?'AR SIN COMPOSITOR':'AR SIN CAPA')+
  ' · DIBUJO 3D '+actual+(arCompositorError?' · ERROR CAPA':'')+
  ' · '+(arDebugVisible?'OCULTAR GUÍA':'MOSTRAR GUÍA');
  $('arStatus').style.borderColor=composite&&webglCalls>0?'#6effc9':'#ffb38a';
 }
 if(mode==='ar'&&placing&&hasHit&&performance.now()-lastDiagnostics>900){
  lastDiagnostics=performance.now();
  const n=guideState.visible;
  if(webglCalls===0)$('placementHint').textContent='⚠ EL MOTOR 3D NO DIBUJA · GUÍA AR '+n+' ZONAS · REINICIÁ SI SIGUE VACÍO';
  else if(n===0)$('placementHint').textContent='PISO DETECTADO · APUNTÁ LENTAMENTE AL CONTORNO VERDE';
  else $('placementHint').textContent='ISLA EN PISO ✓ · '+(33*scale).toFixed(1)+' × '+(18.5*scale).toFixed(1)+' m · '+(webglCalls<0?'CARGANDO':webglCalls+' OBJETOS 3D');
 }
}
function fillLanding(){
 $('unlocked').textContent=progress.unlocked>0?'2 AVENTURAS DESBLOQUEADAS':'AVENTURA 1 DISPONIBLE';
 $('levelChoice').innerHTML='';
 for(let i=0;i<2;i++){let b=document.createElement('button');b.className='levelChoice'+(level===i?' picked':'');b.disabled=i>progress.unlocked;b.textContent=(i>progress.unlocked?'🔒 ':'')+(i+1)+'. '+C.LEVELS[i].name;b.onclick=()=>{level=i;fillLanding()};$('levelChoice').appendChild(b)}
 $('saveLabel').textContent=progress.coins+' MONEDAS GANADAS EN TOTAL';$('sounds').textContent=settings.sound?'SONIDO: SÍ':'SONIDO: NO';
}
$('demoPlay').addEventListener('click',()=>play('demo'));$('arPlay').addEventListener('click',()=>play('ar'));
$('fixWorld').onclick=fixWorld;$('begin').onclick=startGame;
$('pause').onclick=pause;$('recenter').onclick=recenter;$('menuBtn').onclick=()=>home();
$('mapToggle').onclick=()=>{
 mapOpen=!mapOpen;$('miniMap').hidden=!mapOpen;
 $('mapToggle').textContent=mapOpen?'✕':'🗺';drawMiniMap();
};
$('arStatus').onclick=()=>{
 if(mode!=='ar')return;
 arDebugVisible=!arDebugVisible;
 notice(arDebugVisible?'GUÍA VERDE ACTIVADA SOBRE EL PISO':'GUÍA VERDE OCULTA',1500);
};
$('scaleLess').onclick=()=>{scale=clamp(scale*.84,.155,.345);notice('ZONA AR '+(scale*8.8).toFixed(1)+' m DE LARGO',1400)};
$('scaleMore').onclick=()=>{scale=clamp(scale*1.16,.155,.345);notice('ZONA AR '+(scale*8.8).toFixed(1)+' m DE LARGO',1400)};
$('turnLeft').onclick=()=>{yaw-=P()/12;worldYaw-=P()/12};
$('turnRight').onclick=()=>{yaw+=P()/12;worldYaw+=P()/12};
function P(){return Math.PI}
$('sounds').onclick=()=>{settings.sound=!settings.sound;save();fillLanding()};
const pad=$('joystick'),stick=$('stick');
function joyAt(e){
 const box=pad.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
 let xx=(e.clientX-cx)/(box.width*.36),zz=(e.clientY-cy)/(box.height*.36),len=Math.hypot(xx,zz);
 if(len>1){xx/=len;zz/=len}
 if(len<.11){xx=0;zz=0}
 input.x=xx;input.z=zz;
 stick.style.transform='translate('+Math.round(xx*39)+'px,'+Math.round(zz*39)+'px)';
}
pad.addEventListener('pointerdown',e=>{
 e.preventDefault();if(joyPointer!==null)return;
 heldSteeringYaw=mode==='ar'?(steeringYaw??worldYaw):null;
 joyPointer=e.pointerId;pad.setPointerCapture(e.pointerId);joyAt(e)
});
pad.addEventListener('pointermove',e=>{if(joyPointer===e.pointerId){e.preventDefault();joyAt(e)}});
function resetJoy(e){if(joyPointer===e.pointerId){joyPointer=null;heldSteeringYaw=null;input.x=0;input.z=0;stick.style.transform='translate(0,0)'}}
pad.addEventListener('pointerup',resetJoy);pad.addEventListener('pointercancel',resetJoy);pad.addEventListener('lostpointercapture',resetJoy);
for(const [id,event] of [['jumpBtn','jump'],['punchBtn','punch']]){$(id).addEventListener('pointerdown',e=>{
 e.preventDefault();if(phase!=='playing')return;if(event==='jump')jumpQueued=true;else punchQueued=true;
 $(id).classList.add('pressed');$(id).setPointerCapture(e.pointerId);
 });for(const ev of ['pointerup','pointercancel','lostpointercapture'])$(id).addEventListener(ev,()=>$(id).classList.remove('pressed'))}
window.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
 if(e.code==='Space')jumpQueued=true;if(e.code==='KeyJ'||e.code==='KeyK')punchQueued=true;
 const arrows={'ArrowLeft':[-1,0],'KeyA':[-1,0],'ArrowRight':[1,0],'KeyD':[1,0],'ArrowUp':[0,-1],'KeyW':[0,-1],'ArrowDown':[0,1],'KeyS':[0,1]};
 if(arrows[e.code]){input.x=arrows[e.code][0];input.z=arrows[e.code][1]}
 if(e.code==='Escape'&&phase==='playing')pause();
});
window.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){input.x=0;input.z=0}});
// Drag the 3D environment to orbit the camera; never rotates an anchored AR scene.
const orbit=$('viewport');
orbit.addEventListener('pointerdown',e=>{
 if(mode!=='demo'||!['playing','ready'].includes(phase))return;
 orbit.setPointerCapture(e.pointerId);orbitFingers.set(e.pointerId,{x:e.clientX,y:e.clientY});orbitPinch=null;
});
orbit.addEventListener('pointermove',e=>{
 if(mode!=='demo'||!orbitFingers.has(e.pointerId))return;
 const before=orbitFingers.get(e.pointerId);orbitFingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(orbitFingers.size===1){
  orbitYaw-=(e.clientX-before.x)*.006;
  orbitHeight=clamp(orbitHeight+(e.clientY-before.y)*.012,2.6,7.5);
 }else{
  const p=[...orbitFingers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
  if(orbitPinch)orbitZoom=clamp(orbitZoom*orbitPinch/dist,.60,1.45);
  orbitPinch=dist;
 }
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])orbit.addEventListener(type,e=>{
 orbitFingers.delete(e.pointerId);orbitPinch=null;
});
const touch=$('positionPad');touch.addEventListener('pointerdown',e=>{
 if(!placing)return;e.preventDefault();touch.setPointerCapture(e.pointerId);placePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=null});
touch.addEventListener('pointermove',e=>{
 if(!placing||!placePointers.has(e.pointerId))return;e.preventDefault();let prev=placePointers.get(e.pointerId);
 placePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(placePointers.size===1){offset.x+=(e.clientX-prev.x)*.0015;offset.z+=(e.clientY-prev.y)*.0015}
 else{let ps=[...placePointers.values()],dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),a=Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x);
 if(pinch){scale=clamp(scale*dist/Math.max(1,pinch.dist),.155,.345);worldYaw+=a-pinch.a;yaw+=a-pinch.a}pinch={dist,a}}
});
for(const ev of ['pointerup','pointercancel'])touch.addEventListener(ev,e=>{placePointers.delete(e.pointerId);pinch=null});
document.body.addEventListener('beforexrselect',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')pause()});
window.addEventListener('resize',()=>{if(!renderer||!camera)return;renderer.setSize(innerWidth,innerHeight,false);arCompositor?.resize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});
fillLanding();detectXR();
})();