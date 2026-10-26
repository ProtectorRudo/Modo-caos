/* CUADRANTE | controls, AR hit testing, fallback camera, HUD and feedback */
(function(){
'use strict';
const $=id=>document.getElementById(id),C=window.CuadranteCore;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let THREE,renderer,stage,camera,session,hitSource,referenceSpace,videoStream,state,modePlay='circuit';
let arCompositor=null,nativeXRScene=null,arDrawFrames=0,arVisibleOutline=false,arCompositorReady=false,arRenderFaultAt=0;
let inputMode='demo',placing=false,hasHit=false,recentering=false,yaw=0,offset={x:0,z:0},arenaScale=.66;
let floorSeconds=0,lastFloorHit=null;
let aimNeutral=null,aimFiltered={x:0,y:1.2},aimInvalidTime=0,aimPausedForTracking=false;
let aimVector=null,aimOrigin=null,aimQuat=null,aimInv=null;
let playing=false,prev=0,acc=0,notified=false,toastUntil=0,quality='auto',autoQuality='high',slowFrames=0,stableFrames=0;
let bank=null,assetsPromise=null,pointers=new Map(),placeDistance=0,placeAngle=0,warningAt=0,records={games:0,wins:0,bestCombo:0,bestRally:0,bestArcade:0},audioCtx=null,audioAt=0;
try{records={...records,...JSON.parse(localStorage.getItem('cuadrante-records')||'{}')}}catch(e){}
const opts={music:.24,sfx:.65,sensitivity:1};
try{
 const saved=Number(localStorage.getItem('cuadrante-sensitivity'));
 if(Number.isFinite(saved)&&saved>=.6&&saved<=1.45)opts.sensitivity=saved;
}catch(e){}
function save(){try{localStorage.setItem('cuadrante-records',JSON.stringify(records))}catch(e){}}
function report(e){$('error').textContent='CUADRANTE: '+(e&&e.message||String(e));$('error').style.display='block';setTimeout(()=>$('error').style.display='none',7500)}
function note(t,ms=1500){$('ticker').textContent=t;$('ticker').style.opacity='1';toastUntil=performance.now()+ms}
function sound(name){
 if(!audioCtx||opts.sfx<=0)return;
 if(bank?.play(name,audioCtx,opts.sfx,state?state.ball.x/1.76:0))return;
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
function initAudio(){
 try{
  audioCtx??=new(window.AudioContext||window.webkitAudioContext)();
  audioCtx.resume().catch(()=>{});
  if(!bank&&window.CuadrantePremium)bank=window.CuadrantePremium.createAudio();
  bank?.prime(audioCtx); // prefetch only after user's own JUGAR gesture
 }catch(e){}
}
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
$('sfxVol').oninput=e=>opts.sfx=+e.target.value/100;$('musicVol').oninput=e=>opts.music=+e.target.value/100;
$('touchSense').value=String(Math.round(opts.sensitivity*100));
$('senseVal').textContent=Math.round(opts.sensitivity*100)+'%';
$('touchSense').oninput=e=>{
 opts.sensitivity=+e.target.value/100;$('senseVal').textContent=e.target.value+'%';
 try{localStorage.setItem('cuadrante-sensitivity',String(opts.sensitivity))}catch(_){}
};
$('quality').onchange=e=>{quality=e.target.value;applyQuality()};
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
 nativeXRScene=new THREE.Scene();
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
 renderer.setClearColor(0x080d14,0);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
 applyQuality();renderer.setSize(window.innerWidth,window.innerHeight,false);container.appendChild(renderer.domElement);
 stage=window.CuadranteArt(THREE).makeStage();applyQuality();camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.025,90);
 // Non-blocking licensed visual pack: 3D objects appear as they load. A slow
 // connection must never delay startup, collisions, AR anchoring or scores.
 assetsPromise=window.CuadrantePremium?.decorate(THREE,stage).then(stats=>{
  if(renderer&&!renderer.isLite&&stage?.root?.parent){
   container.dataset.premiumModels=String(stats?.models||0);
   container.dataset.pbrChannels=String(stats?.textures||0);
   container.dispatchEvent(new CustomEvent('cuadrante-assets-ready',{detail:stats}));
  }
  return stats;
 }).catch(()=>null)||null;
 setDemoCamera();renderer.setAnimationLoop(frame);
}
function buildLite(){
 if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement?.remove()}
 $('stage').innerHTML='';
 const kit=window.CuadranteLite($('stage'),()=>state);
 renderer=kit.renderer;stage=kit.stage;camera=kit.camera;
 renderer.setAnimationLoop(frame);
}
function closeArWorld(){
 arCompositor?.dispose();arCompositor=null;arCompositorReady=false;
 arDrawFrames=0;arVisibleOutline=false;arRenderFaultAt=0;
 $('arWorldOverlay').style.display='none';
 $('placementSvg').style.display='none';$('arDrawStatus').style.display='none';
}
async function openArWorld(){
 closeArWorld();
 const {createCuadranteArCompositor}=await import('./cuadrante-ar-compositor.js');
 if(!THREE||!stage?.scene)throw Error('Arena 3D no iniciada');
 arCompositor=createCuadranteArCompositor(THREE,$('arWorldOverlay'),1.15);
 $('arWorldOverlay').style.display='block';arCompositorReady=true;
}
function showArOutline(frame){
 if(!session||!frame||!stage||!placing||!stage.root.visible){
  arVisibleOutline=false;$('placementSvg').style.display='none';return;
 }
 const pose=frame.getViewerPose(renderer.xr.getReferenceSpace());
 const view=pose?.views?.[0];
 if(!view?.projectionMatrix||!view.transform?.inverse?.matrix){
  arVisibleOutline=false;$('placementSvg').style.display='none';return;
 }
 stage.root.updateMatrixWorld(true);
 const mvp=new THREE.Matrix4().fromArray(view.projectionMatrix)
   .multiply(new THREE.Matrix4().fromArray(view.transform.inverse.matrix))
   .multiply(stage.root.matrixWorld);
 const width=innerWidth,height=innerHeight;
 const project=(x,y,z)=>{
  const v=new THREE.Vector4(x,y,z,1).applyMatrix4(mvp);
  if(!Number.isFinite(v.w)||v.w<=.04)return null;
  const px=(v.x/v.w*.5+.5)*width,py=(.5-v.y/v.w*.5)*height;
  return Number.isFinite(px)&&Number.isFinite(py)?[px,py]:null;
 };
 const corners=[
  [-1.74,.17,2.9],[1.74,.17,2.9],
  [1.74,.17,-2.75],[-1.74,.17,-2.75]
 ].map(q=>project(...q));
 const center=project(0,.185,2.9);
 const visible=corners.filter(p=>p&&p[0]>-width*.35&&p[0]<width*1.35&&p[1]>-height*.35&&p[1]<height*1.35).length;
 const nearScreen=!!center&&center[0]>=0&&center[0]<=width&&center[1]>=0&&center[1]<=height;
 arVisibleOutline=nearScreen||visible>=2;
 const path=[],point=p=>p[0].toFixed(1)+','+p[1].toFixed(1);
 for(let i=0;i<4;i++)if(corners[i]&&corners[(i+1)%4])path.push('M'+point(corners[i])+'L'+point(corners[(i+1)%4]));
 const svg=$('placementSvg');svg.setAttribute('viewBox','0 0 '+width+' '+height);
 $('placementBorder').setAttribute('d',path.join(''));
 if(center){$('placementTarget').setAttribute('cx',center[0]);$('placementTarget').setAttribute('cy',center[1]);$('placementTarget').style.display='block'}
 else $('placementTarget').style.display='none';
 svg.style.display=arVisibleOutline?'block':'none';
 $('placementBorder').style.stroke=hasHit?'#41ffd3':'#ffbe74';
 $('placementTarget').style.fill=hasHit?'#41ffd3':'#ffbe74';
}
function setDemoCamera(){if(!camera||renderer?.isLite)return;const aspect=innerWidth/innerHeight;
 camera.fov=aspect<1?66:57;camera.aspect=aspect;camera.position.set(0,1.68,aspect<1?7.5:6.6);camera.lookAt(0,1.2,-.65);camera.updateProjectionMatrix()}
function resize(){
 arCompositor?.resize();
 if(!renderer||!camera)return;
 // WebXR owns the camera and drawing-buffer resolution while presenting.
 // Resizing the native XR canvas can silently break Android camera composition.
 if(renderer.xr?.isPresenting)return;
 renderer.setSize(innerWidth,innerHeight,false);applyQuality();setDemoCamera();
}
window.addEventListener('resize',resize);
function enter(mode){inputMode=mode;state=C.create({modePlay});playing=true;notified=false;placing=false;hasHit=false;recentering=false;offset={x:0,z:0};arenaScale=.66;floorSeconds=0;lastFloorHit=null;
 aimNeutral=null;aimFiltered={x:0,y:1.2};aimInvalidTime=0;aimPausedForTracking=false;
 stage?.setAimMode?.(mode==='ar');pointers.clear();
 $('home').style.display='none';$('stage').style.display='block';$('ui').style.display='block';
 $('ui').classList.toggle('ar-placing',mode==='ar');$('ui').classList.remove('ar-aim');$('aimReticle').classList.remove('lost');
 $('recenterBtn').style.display='none';$('hitFlash').className='';
 stage?.setPlacementPreview?.(false);$('fixArena').disabled=true;
 $('overlay').style.display='none';$('ticker').style.opacity='0';$('placeControls').style.display='none';$('placeTitle').style.display='none';
 $('labelPhase').style.display='block';$('hud').style.display='flex';$('pauseBtn').style.display='block';$('touchLayer').style.pointerEvents='auto';
 $('cameraFeed').style.display='none';$('labelPhase').textContent=(renderer?.isLite?'MODO LIGERO · ARRASTRÁ PARA DEFENDER':'ARRASTRÁ PARA MOVER EL CUADRADO');$('load').style.display='none';
 if(inputMode==='demo'){stage.root.visible=true;stage.root.position.set(0,0,0);stage.root.scale.setScalar(1);C.start(state);note('ARRASTRÁ PARA DEFENDER',2100)}
 else{placing=true;stage.root.visible=false;stage.root.position.set(0,0,-1);stage.root.scale.setScalar(arenaScale);
 $('placeControls').style.display='flex';$('placeTitle').style.display='block';$('hud').style.display='none';$('pauseBtn').style.display='none';
 $('labelPhase').textContent=inputMode==='ar'?'BUSCANDO EL PISO · APUNTÁ EL CELULAR':'CÁMARA SIN SEGUIMIENTO ESPACIAL';}
}
function placeFromFrame(frame,dt){
 if(!placing||inputMode!=='ar'||!frame||!hitSource||!renderer?.xr?.isPresenting)return;
 const hits=frame.getHitTestResults(hitSource);
 let pose=null;
 for(const hit of hits){
  const candidate=hit.getPose(renderer.xr.getReferenceSpace());
  if(C.horizontalHit(candidate)){pose=candidate;break}
 }
 if(!pose){
  hasHit=false;floorSeconds=0;lastFloorHit=null;
  stage.root.visible=false;$('fixArena').disabled=true;stage.setPlacementPreview?.(false);
  $('labelPhase').textContent=hits.length?'APUNTÁ A UNA SUPERFICIE HORIZONTAL':'BUSCANDO PISO REAL · MOVÉ EL CELULAR DESPACIO';
  return;
 }
 const pos=pose.transform.position;
 const next={x:pos.x,y:pos.y,z:pos.z};
 const dist=lastFloorHit?Math.hypot(pos.x-lastFloorHit.x,pos.y-lastFloorHit.y,pos.z-lastFloorHit.z):Infinity;
 if(!lastFloorHit||dist>.055){
  floorSeconds=0;lastFloorHit=next;hasHit=false;
 }else{
  // Small floor-pose jitter is filtered without making the world follow the phone.
  floorSeconds=Math.min(1,floorSeconds+Math.min(dt,.05));
  lastFloorHit.x+=(pos.x-lastFloorHit.x)*.16;
  lastFloorHit.y+=(pos.y-lastFloorHit.y)*.16;
  lastFloorHit.z+=(pos.z-lastFloorHit.z)*.16;
 }
 const cam=renderer.xr.getCamera(camera),dir=new THREE.Vector3();
 cam.getWorldDirection(dir);
 const baseYaw=Math.atan2(-dir.x,-dir.z);yaw=baseYaw;
 const world=C.anchoredArena(lastFloorHit,baseYaw,offset.rot||0,offset,arenaScale);
 stage.root.visible=true;stage.root.rotation.y=world.rotation;
 stage.root.position.set(world.x,world.y,world.z);
 stage.root.scale.setScalar(arenaScale);
 hasHit=floorSeconds>=.60;
 stage.setPlacementPreview?.(true,hasHit);
 $('fixArena').disabled=!hasHit;
 $('labelPhase').textContent=hasHit?'PISO DETECTADO ✓ · AHORA FIJÁ LA ARENA':'PISO ENCONTRADO · CALIBRANDO '+Math.round(floorSeconds/.6*100)+'%';
}
// The real phone camera pose drives the hidden collision plane. No body,
// hand or foot tracking is inferred from ARCore: only the camera orientation.
function aimFromXR(frame,dt){
 if(!state||placing||inputMode!=='ar'||!stage?.root?.visible||!frame||!session||!renderer?.xr?.isPresenting)return;
 const space=renderer.xr.getReferenceSpace();
 let pose;
 try{pose=space&&frame.getViewerPose(space)}catch(_){pose=null}
 let raw=null;
 if(pose?.transform){
  const p=pose.transform.position,q=pose.transform.orientation;
  if(p&&q&&[p.x,p.y,p.z,q.x,q.y,q.z,q.w].every(Number.isFinite)){
   aimOrigin??=new THREE.Vector3();
   aimVector??=new THREE.Vector3();
   aimQuat??=new THREE.Quaternion();
   aimInv??=new THREE.Quaternion();
   aimOrigin.set(p.x,p.y,p.z);
   aimQuat.set(q.x,q.y,q.z,q.w);
   aimVector.set(0,0,-1).applyQuaternion(aimQuat).normalize();
   // The collider remains in arena-local coordinates while the world stays
   // spatially anchored. No objects follow the phone's view matrix.
   stage.root.updateWorldMatrix(true,false);
   stage.root.getWorldQuaternion(aimInv).invert();
   const localOrigin=stage.root.worldToLocal(aimOrigin);
   const localDirection=aimVector.applyQuaternion(aimInv);
   raw=C.aimRayToArena(localOrigin,localDirection,0);
  }
 }
 if(raw){
  aimInvalidTime=0;$('aimReticle').classList.remove('lost');
  if(!aimNeutral){aimNeutral={x:raw.x,y:raw.y};aimFiltered={x:0,y:1.2}}
  const target=C.aimedDefense(raw,aimNeutral,opts.sensitivity);
  if(target){
   // Gentle low-latency smoothing with an explicit per-frame jump ceiling.
   const blend=1-Math.exp(-Math.min(dt,.05)/.045);
   const maxStep=Math.min(.24,Math.max(.07,dt*8));
   aimFiltered.x+=clamp((target.x-aimFiltered.x)*blend,-maxStep,maxStep);
   aimFiltered.y+=clamp((target.y-aimFiltered.y)*blend,-maxStep,maxStep);
   C.target(state,aimFiltered.x,aimFiltered.y);
  }
  if(aimPausedForTracking){
   aimPausedForTracking=false;C.resume(state);
   $('labelPhase').textContent='AR REAL · APUNTÁ CON EL CELULAR';
   note('✓ MIRA RECUPERADA · ¡CONTINUÁ!',900);
  }
 }else{
  aimInvalidTime+=dt;$('aimReticle').classList.add('lost');
  if(aimInvalidTime>1.25&&state.phase!=='paused'&&state.phase!=='finished'){
   C.pause(state);aimPausedForTracking=true;
   $('labelPhase').textContent='MIRA PERDIDA · GIRÁ HACIA LA ARENA · PARTIDA PAUSADA';
  }
 }
}
function frame(t,xrFrame){
 if(!renderer||!stage||!camera)return;
 const dt=clamp((t-prev)/1000||.016,0,.07);prev=t;measureFrame(dt);
 if(placing&&inputMode==='ar')placeFromFrame(xrFrame,dt);
 else if(inputMode==='ar'&&!placing)aimFromXR(xrFrame,dt);
 if(state&&state.phase!=='ready'&&state.phase!=='paused'&&state.phase!=='finished'){
  acc+=dt;let steps=0;while(acc>=1/120&&steps++<9){C.step(state,1/120);acc-=1/120}if(steps>=9)acc=0;
  const events=C.drain(state);handleEvents(events);music();
 }else if(state&&state.phase==='paused'){acc=0}
 if(state)stage.update(state,dt);
 if(state)refreshHud();
 if(toastUntil&&performance.now()>toastUntil){$('ticker').style.opacity='0';toastUntil=0}
 if(session&&renderer.xr.isPresenting){
  // Same camera-matched DOM-overlay approach proven in Rodeados 360 and Rebote.
  // Native XR keeps the real camera feed; the independently transparent canvas
  // uses the native XR eye view/projection. World remains anchored to the floor.
  renderer.render(nativeXRScene,camera);
  if(arCompositor){
   const good=arCompositor.render(stage.scene,renderer.xr.getCamera(camera));
   if(good&&arCompositor.drawCalls>0){
    arDrawFrames++;arRenderFaultAt=0;
    if(placing){
     showArOutline(xrFrame);
     $('fixArena').disabled=!(hasHit&&arVisibleOutline);
     if(hasHit&&!arVisibleOutline)$('labelPhase').textContent='ARENA FUERA DE LA VISTA · APUNTÁ AL MARCADOR';
    }
    $('arDrawStatus').style.display='none';
   }else{
    if(placing){$('fixArena').disabled=true;hasHit=false;arVisibleOutline=false;$('placementSvg').style.display='none'}
    arRenderFaultAt ||= t;
    if(t-arRenderFaultAt>700){
     $('arDrawStatus').style.display='block';
     $('arDrawStatus').textContent='⚠ ARENA 3D NO VISIBLE · RECENTRÁ O VOLVÉ A MODO 3D';
    }
    if(!placing&&t-arRenderFaultAt>2800&&state&&state.phase!=='paused'&&state.phase!=='finished'){
     C.pause(state);$('labelPhase').textContent='GRÁFICOS AR NO VISIBLES · RECENTRÁ PARA RECUPERAR';
    }
   }
  }else if(placing)$('fixArena').disabled=true;
 }else renderer.render(stage.scene,camera);
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
 if(modePlay==='survival'&&state.phase!=='ready'&&!placing)$('labelPhase').textContent='SUPERVIVENCIA · '+state.survivalLives+' VIDAS · '+(inputMode==='ar'?'APUNTÁ CON EL CELULAR':'ARRASTRÁ PARA DEFENDER');
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
 C.pause(state);stage.root.visible=false;recentering=true;placing=true;hasHit=false;aimNeutral=null;aimPausedForTracking=false;aimInvalidTime=0;$('ui').classList.remove('ar-aim');floorSeconds=0;lastFloorHit=null;offset={x:0,z:0,rot:0};$('ui').classList.add('ar-placing');
 pointers.clear();stage?.setPlacementPreview?.(false);$('overlay').style.display='none';$('pauseBtn').textContent='Ⅱ';$('pauseBtn').style.display='none';
 $('recenterBtn').style.display='none';$('hud').style.display='none';
 $('placeTitle').style.display='block';$('placeTitle').firstChild.textContent='RECENTRAR ARENA';
 $('placeControls').style.display='flex';$('fixArena').disabled=true;$('fixArena').textContent='FIJAR Y CONTINUAR';
 $('labelPhase').textContent='BUSCANDO NUEVA SUPERFICIE · SIN PERDER TUS PUNTOS';
 note('REUBICÁ LA ARENA · PUNTOS CONSERVADOS',1500);
}
$('recenterBtn').onclick=recenter;
async function back(){
 if(!playing)return;playing=false;placing=false;recentering=false;closeArWorld();$('ui').classList.remove('ar-placing','ar-aim');
 try{if(session){const old=session;session=null;await old.end()}}catch(e){}
 if(hitSource){try{hitSource.cancel()}catch(e){}hitSource=null}
 if(videoStream){videoStream.getTracks().forEach(t=>t.stop());videoStream=null}
 const v=$('cameraFeed');v.pause();v.srcObject=null;v.style.display='none';
 $('overlay').style.display='none';$('ui').style.display='none';$('stage').style.display='none';$('home').style.display='flex';
 if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();renderer=null}if(stage)stage.dispose();stage=null;state=null;audioAt=0;prev=0;acc=0;
}
async function init(mode){
 if(playing)await back();closeArWorld();$('load').style.display='flex';initAudio();autoQuality=window.innerWidth<700?'medium':'high';slowFrames=0;stableFrames=0;
 let requestedXR=null;
 if(mode==='ar'&&navigator.xr){
  requestedXR=navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['local-floor'],domOverlay:{root:document.body}});
  requestedXR.catch(()=>{});
 }
 try{
  await load();build();
  if(mode==='ar')await beginAR(requestedXR);else enter('demo');
 }catch(e){
  // Ordinary 3D has its own genuine playable Canvas2D fallback if GPU/CDNs
  // fail. The AR warning below is exclusively for an AR button request.
  if(mode!=='ar'){
   try{
    buildLite();enter('demo');
    $('labelPhase').textContent='MODO LIGERO · FÍSICA COMPLETA';
    note('MODO LIGERO · LISTO PARA JUGAR',2200);
   }catch(fail){report(fail);if(playing)await back();else $('load').style.display='none'}
   return;
  }
  // A failed immersive session must NEVER pretend a camera stream has
  // spatial tracking. Report the exact failure, clean XR, offer real 3D.
  const reason=(e?.message||String(e)).slice(0,190);
  $('load').style.display='none';
  inputMode='demo';
  if(hitSource){try{hitSource.cancel()}catch(_){}hitSource=null}
  if(session){const old=session;session=null;try{await old.end()}catch(_){}}
  else if(requestedXR)requestedXR.then(s=>s.end().catch(()=>{})).catch(()=>{});
  try{
   if(!renderer||!stage||renderer.isLite){buildLite()}
   else if(renderer.xr.isPresenting){build()} // discard any partially active XR framebuffer
   enter('demo');C.pause(state);
   modal('AR ESPACIAL NO INICIADA','NO SE PUDO DETECTAR EL PISO',
    'No se activó WebXR con seguimiento de superficies. La cámara sola no detecta el piso. Revisá Chrome y Servicios de Google Play para RA. Detalle: '+reason);
   button('JUGAR EN MODO 3D',()=>{C.resume(state);$('overlay').style.display='none'},'blue');
   button('VOLVER Y REINTENTAR AR',()=>back(),'alt');
  }catch(fail){report(fail);if(playing)await back()}
 }
}
async function beginAR(requestedXR){
 if(!navigator.xr||!requestedXR)throw Error('Tu navegador no ofrece WebXR immersive-ar.');
 session=await requestedXR;
 session.addEventListener('end',()=>{closeArWorld();if(playing&&inputMode==='ar'&&!placing){C.pause(state);modal('AR DESCONECTADA','SE CERRÓ LA CÁMARA','Reiniciá la arena para recuperar el seguimiento espacial.');button('VOLVER AL MENÚ',back,'blue')}})
 await renderer.xr.setSession(session);
 const viewer=await session.requestReferenceSpace('viewer');
 hitSource=await session.requestHitTestSource({space:viewer});
 await openArWorld();
 enter('ar');$('fixArena').disabled=true;note('BUSCÁ UNA SUPERFICIE',1850);
}
$('startAr').onclick=()=>init('ar');$('startDemo').onclick=()=>init('demo');
function doFix(){
 if(!placing)return;
 if(inputMode==='ar'&&(!hasHit||!arCompositorReady||!arVisibleOutline||floorSeconds<.60)){note('APUNTÁ A LA MARCA VERDE Y ESPERÁ QUE APAREZCA LA ARENA',1800);return}
 placing=false;hasHit=false;stage.root.visible=true;stage?.setPlacementPreview?.(false);$('placementSvg').style.display='none';$('ui').classList.remove('ar-placing');
 aimNeutral=null;aimFiltered={x:0,y:1.2};aimInvalidTime=0;aimPausedForTracking=false;
 if(inputMode==='ar'){
  $('ui').classList.add('ar-aim');
  $('aimReticle').classList.remove('lost');
  C.target(state,0,1.2);
 }$('placeControls').style.display='none';$('placeTitle').style.display='none';$('hud').style.display='flex';$('pauseBtn').style.display='block';
 $('labelPhase').textContent=inputMode==='ar'?'AR REAL · APUNTÁ CON EL CELULAR':'MODO 3D · ARRASTRÁ PARA DEFENDER';
 $('recenterBtn').style.display=inputMode==='ar'?'block':'none';
 if(recentering){
  recentering=false;C.resume(state);acc=0;prev=0;
  note('ARENA RECENTRADA · ¡SEGUÍ JUGANDO!',1550);
 }else{
  C.start(state);note(inputMode==='ar'?'🎯 MOVÉ EL CELULAR PARA APUNTAR':'¡ARRASTRÁ PARA DEFENDER!',1700);
 }
 $('placeTitle').firstChild.textContent='DETECTÁ EL PISO';
 $('fixArena').textContent='FIJAR ARENA';
}
$('fixArena').onclick=doFix;
function adjustScale(k){arenaScale=clamp(arenaScale*k,.4,1.12);if(stage)stage.root.scale.setScalar(arenaScale)}
$('sizeMinus').onclick=()=>adjustScale(.89);$('sizePlus').onclick=()=>adjustScale(1.12);
$('rotateLeft').onclick=()=>{offset.rot=(offset.rot||0)-.14;if(stage)stage.root.rotation.y+=-.14};
$('rotateRight').onclick=()=>{offset.rot=(offset.rot||0)+.14;if(stage)stage.root.rotation.y+=.14};
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
const layer=$('touchLayer');
layer.addEventListener('pointerdown',e=>{if(!playing||(inputMode==='ar'&&!placing))return;e.preventDefault();try{layer.setPointerCapture(e.pointerId)}catch(_){}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(placing&&pointers.size===2){const [a,b]=[...pointers.values()];placeDistance=distance(a,b);placeAngle=Math.atan2(b.y-a.y,b.x-a.x)}});
layer.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!playing||!state||(inputMode==='ar'&&!placing))return;e.preventDefault();
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
   const move=C.touchDelta(dx,dy,innerWidth,innerHeight,opts.sensitivity);
   C.target(state,state.player.x+move.x,state.player.y+move.y);
 }
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])layer.addEventListener(type,e=>{pointers.delete(e.pointerId);placeDistance=0});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&state&&!placing&&state.phase!=='paused'&&state.phase!=='finished')pause()});
// The HTML is visible before network-delivered scripts finish; prevent dead early taps.
$('startAr').disabled=false;$('startDemo').disabled=false;
})();
