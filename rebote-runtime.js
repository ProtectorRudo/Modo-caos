import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import {createReboteArt} from './rebote-art.js?v=9';
import {createRodeadosArCompositor} from './rodeados-ar-compositor.js?v=9';
/* REBOTE MORTAL · WebXR immersive-ar con Hit Test y anclaje opcional.
   La matriz AR no depende del HUD. El "jugador" es la posición del TELÉFONO, nunca pies/cuerpo. */
const $=id=>document.getElementById(id),G=globalThis.ReboteCore;
if(!G)throw Error('REBOTE: falta motor core');
const clamp=G.clamp,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.025,45);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
// AR camera passthrough must see through every pixel outside world geometry.
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(innerWidth,innerHeight);
$('world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc4f8ff,0x123447,2.5));
const sun=new THREE.DirectionalLight(0xdfffff,2.15);sun.position.set(-2,5,1);scene.add(sun);
const redLight=new THREE.PointLight(0xff785a,2.3,8);redLight.position.set(0,2,-2.5);scene.add(redLight);
const art=createReboteArt(THREE,scene);
const nativeXRScene=new THREE.Scene(); // Android ARCore can omit native framebuffer geometry.
let arCompositor=null,arFrames=0,lastComposited=0,arRenderError='';
function closeArWorld(){
 arCompositor?.dispose();arCompositor=null;arFrames=0;lastComposited=0;arRenderError='';
 $('arWorldOverlay').style.display='none';
}
function openArWorld(){
 closeArWorld();
 arCompositor=createRodeadosArCompositor(THREE,$('arWorldOverlay'),1.15);
 $('arWorldOverlay').style.display='block';
 return true;
}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
let game=G.make(),stage='home',demo=false,session=null,space=null,hitSource=null,anchor=null,anchorDelta=null;
let latestHit=null,pendingAnchorHit=null,lastFrame=null,trackedEye=null,calStart=0,samples=[],calibrated=false,calibrationMotion=null;
let fixed=false,previewPosition=V(),previewYaw=0,move=V(),yaw=0,arenaScale=1,fixPending=false;
let floorSamples=[],floorStable=false,placementWarmup=0,previewInitialized=false,calibrationRms=0;
let timePrev=0,hudPrev=0,demoYaw=0,demoPitch=0,lastAim=null,lastAimAt=0,trackingAt=0;
let viewRight=G.V(1,0,0),viewUp=G.V(0,1,0);
let effectsSeen=new WeakSet(),audioCtx=null,sounds=true,beeped=new Set(),pausedForTracking=false,beatAt=0,qualityFrames=0,qualityCost=0;
const fingers=new Map();let gesture=null,toastEnd=0,phaseAt=-1,resultShown=false;
function ui(){
 $('home').style.display=stage==='home'?'flex':'none';
 $('arena').style.display=stage==='home'?'none':'block';
 $('overlay').classList.toggle('edit',stage==='search'||stage==='edit');
 $('hud').style.display=['ready','playing','paused','finished'].includes(stage)?'flex':'none';
 $('editbar').style.display=stage==='search'||stage==='edit'?'flex':'none';
 $('readybar').style.display=stage==='ready'||stage==='paused'?'flex':'none';
 $('controls').style.display=stage==='playing'?'flex':'none';
 $('reticle').style.display=stage==='playing'?'block':'none';
 $('direction').style.display=stage==='playing'?'flex':'none';
 $('radar').style.display=stage==='playing'?'block':'none';
 $('center').style.display=!demo&&['ready','playing','paused'].includes(stage)?'block':'none';
 $('result').style.display=stage==='finished'?'flex':'none';
 $('begin').textContent=stage==='paused'?'▶ CONTINUAR':'⚡ ¡EMPEZAR!';
 $('begin').disabled=stage==='paused'&&pausedForTracking&&(!lastAim||performance.now()-lastAimAt>550);
 $('fix').disabled=!latestHit||!floorStable||!arCompositor||lastComposited===0;
 $('arConnecting').style.display=stage==='connecting'?'flex':'none';
}
function setStage(next){stage=next;ui()}
function toast(value,seconds=1.6){$('notice').textContent=value;toastEnd=performance.now()+seconds*1000}
function status(t){$('status').textContent=t}
function vibration(arr){if(navigator.vibrate)try{navigator.vibrate(arr)}catch(_){}}
function sound(freq=400,duration=.12,wave='sine',gain=.08){
 if(!sounds)return;
 try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();
   const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
   o.type=wave;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(55,freq*.43),t+duration);
   g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
   o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration+.018);
 }catch(_){}
}
function flash(kind){const node=$('screenFx');node.className='';void node.offsetWidth;node.className=kind}
function soundtrack(){
 if(stage!=='playing'||!sounds||!audioCtx)return;
 if(game.elapsed<beatAt)return;
 const pace=game.phase>=4?.33:game.phase>=3?.39:game.phase>=2?.44:.50;
 beatAt=game.elapsed+pace;
 const pulse=Math.floor(game.elapsed/pace);
 if(pulse%4===0)sound(game.phase===4?82:110,.16,'triangle',.026);
 else if(pulse%2===0)sound(180,.048,'sine',.014);
 else if(game.phase>=2)sound(680,.023,'triangle',.006);
}
function audioEvent(e){
 if(e.type==='launch'){
  const pitch=e.lane?.includes('ALTA')?530:e.lane?.includes('BAJA')?220:360;
  sound(pitch,.17,'sawtooth',.035);
 }
 if(e.type==='return'){
  // Clear two-tone boing / ricochet, not a generic hit beep.
  sound(e.grade==='PERFECTO'?710:470,.16,'sine',.10);
  setTimeout(()=>sound(e.grade==='PERFECTO'?450:300,.12,'triangle',.045),55);
  if(e.grade==='PERFECTO'){flash('perfect');sound(1050,.23,'triangle',.11);setTimeout(()=>sound(1450,.21,'triangle',.065),75);vibration([32,15,43]);status('✦ PERFECTO · +'+e.points)}
  else{sound(e.grade==='ROCE'?310:650,.17,'triangle',.08);vibration(38);status(e.grade+' · +'+e.points)}
 }
 if(e.type==='damage'){flash('damage');sound(160,.42,'sawtooth',.10);vibration([70,35,80]);status('¡ESCUDO DAÑADO!')}
 if(e.type==='enemy-hit'){sound(185,.23,'square',.055);vibration(26)}
 if(e.type==='enemy-down'){sound(175,.5,'sawtooth',.1);status(e.boss?'¡JEFE DERROTADO!':'¡ROBOT DESTRUIDO!')}
 if(e.type==='legend'){sound(1380,.65,'triangle',.11);status('⚡ ¡SOS UNA MÁQUINA! ⚡');vibration([80,40,110])}
 if(e.type==='phase'){sound(680,.4,'sawtooth',.08);status('FASE '+(e.value+1)+' · '+G.PHASES[e.value])}
 if(e.type==='boss'){sound(115,.65,'sawtooth',.13);status('⚠ JEFE FINAL · ¡DERROTALO!')}
 if(e.type==='boss-parry'){sound(370,.32,'sawtooth',.10);status('⚠ ¡EL JEFE TE LA DEVOLVIÓ!');vibration([28,28,35])}
 if(e.type==='victory'){sound(1450,.5,'triangle',.13);vibration([30,30,30,30,110])}
 if(e.type==='defeat'){sound(170,.5,'triangle',.13)}
}
function resetGame(reuse){
 game=G.make({seed:Math.floor(Math.random()*4294967295),mode:'clasico'});
 effectsSeen=new WeakSet();beeped.clear();resultShown=false;phaseAt=-1;trackingAt=0;pausedForTracking=false;beatAt=0;
 if(reuse){G.setView(game,game.eye,game.aim)}
}
function startRound(){
 if(stage==='paused'){
  // A stale XR ray cannot resume combat: wait for a fresh tracked frame.
  if(session&&pausedForTracking&&(!lastAim||performance.now()-lastAimAt>550)){
   status('⚠ RECUPERÁ EL SEGUIMIENTO DE LA CÁMARA');return;
  }
  game.paused=false;pausedForTracking=false;setStage('playing');status('¡DEVOLVÉ LOS ATAQUES!');return
 }
 if(stage!=='ready'||!calibrated)return;
 G.begin(game);setStage('playing');$('cue').textContent='APUNTÁ. ESPERÁ. ¡DEVOLVÉ!';
 status('⚡ ¡APUNTÁ A LA ESFERA!');sound(800,.23,'triangle',.08);
}
function results(){
 if(resultShown)return;resultShown=true;setStage('finished');
 let old=0;try{old=Number(localStorage.getItem('mc-rebote-record'))||0}catch(_){}
 if(game.score>old)try{localStorage.setItem('mc-rebote-record',String(game.score))}catch(_){}
 const s=G.snapshot(game);
 $('outcome').textContent=s.victory?'🏆 ¡JEFE DERROTADO!':'💥 ¡FIN DEL COMBATE!';
 $('summary').textContent=(s.score>old?'✨ NUEVO RÉCORD · ':'')+'FASE '+(game.phase+1)+' · '+Math.ceil(game.elapsed)+' SEGUNDOS';
 $('stats').innerHTML=[['PUNTOS',s.score.toLocaleString('es-AR')],['DEVOLUCIONES',s.returns],['PERFECTOS',s.perfect],['MEJOR COMBO','×'+s.bestCombo],['ROBOTS',s.kills],['PRECISIÓN',s.accuracy+'%']].map(row=>'<div><b>'+row[1]+'</b><span>'+row[0]+'</span></div>').join('');
 sound(s.victory?950:235,.6,'triangle',.1);
}
// Camera-relative radar. The world stays anchored; only this 2D compass rotates.
function updateRadar(){
 const botLayer=$('radarBots'),ball=$('radarBall');
 const dx=game.aim.x,dz=game.aim.z,length=Math.hypot(dx,dz);
 const fw=length>.07?{x:dx/length,z:dz/length}:{x:0,z:-1};
 const rightLength=Math.hypot(viewRight.x,viewRight.z);
 const right=rightLength>.07?{x:viewRight.x/rightLength,z:viewRight.z/rightLength}:{x:-fw.z,z:fw.x};
 const project=(p)=>{
  const x=p.x-game.eye.x,z=p.z-game.eye.z;
  const lateral=x*right.x+z*right.z;
  const forward=x*fw.x+z*fw.z;
  return {x:clamp(lateral*12,-31,31),y:clamp(-forward*12,-31,31),behind:forward<-.25};
 };
 const enemies=game.enemies.filter(e=>e.alive).slice(0,6);
 botLayer.innerHTML=enemies.map(e=>{
  const v=project(e);
  return '<i class="radarBot'+(e.boss?' boss':'')+(v.behind?' behind':'')+
   '" style="transform:translate('+v.x.toFixed(1)+'px,'+v.y.toFixed(1)+'px)"></i>';
 }).join('');
 const inbound=game.projectiles.filter(p=>!p.dead&&!p.returning&&p.type!=='fake');
 if(inbound.length){
  const p=inbound.reduce((a,b)=>!a||G.len(G.sub(b.pos,game.eye))<G.len(G.sub(a.pos,game.eye))?b:a,null);
  const v=project(p.pos);
  ball.style.display='block';
  ball.style.transform='translate('+v.x.toFixed(1)+'px,'+v.y.toFixed(1)+'px)';
  ball.classList.toggle('behind',v.behind);
 }else ball.style.display='none';
}
function updateHud(){
 const s=G.snapshot(game);
 $('score').textContent=s.score.toLocaleString('es-AR');
 $('lives').textContent='♥'.repeat(s.lives)+'♡'.repeat(3-s.lives);
 $('combo').textContent='×'+s.combo;
 $('clock').textContent=s.remaining;
 $('phase').textContent='FASE '+(game.phase+1)+' / 5 · '+s.phase;
 if(stage==='playing')updateRadar();
}
function yawFromPose(pose){
 if(!pose)return 0;
 const q=pose.transform.orientation,dir=V(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));
 return Math.atan2(-dir.x,-dir.z);
}
function currentViewer(frame){
 if(!frame||!space)return null;
 try{return frame.getViewerPose(space)}catch(_){return null}
}
function checkHit(frame){
 if(!frame||!hitSource)return null;
 try{const hits=frame.getHitTestResults(hitSource);
  if(!hits.length)return null;
  const h=hits[0],pose=h.getPose(space);
  return pose?{h,pose}:null;
 }catch(_){return null}
}
const svgMvp=new THREE.Matrix4(),svgView=new THREE.Matrix4(),svgRoot=new THREE.Vector4();
function projectArenaPoint(x,z,screenW,screenH){
 svgRoot.set(x,.105,z,1).applyMatrix4(svgMvp);
 if(svgRoot.w<.03)return null;
 const px=(svgRoot.x/svgRoot.w*.5+.5)*screenW;
 const py=(.5-svgRoot.y/svgRoot.w*.5)*screenH;
 if(!Number.isFinite(px)||!Number.isFinite(py))return null;
 return [px,py];
}
function drawPlacementOutline(frame){
 const svg=$('placementSvg');
 if(!session||!frame||!['search','edit'].includes(stage)||!latestHit){
  svg.style.display='none';return;
 }
 const viewer=currentViewer(frame),view=viewer?.views?.[0];
 if(!view?.projectionMatrix||!view.transform?.inverse?.matrix){
  svg.style.display='none';return;
 }
 const w=innerWidth,h=innerHeight;
 svg.setAttribute('viewBox','0 0 '+w+' '+h);
 art.root.updateMatrixWorld(true);
 svgMvp.fromArray(view.projectionMatrix);
 svgView.fromArray(view.transform.inverse.matrix);
 svgMvp.multiply(svgView).multiply(art.root.matrixWorld);
 const s=1.28*arenaScale,corners=[[-s,-s],[s,-s],[s,s],[-s,s]].map(p=>projectArenaPoint(p[0],p[1],w,h));
 const pair=p=>p.map(v=>v.toFixed(1)).join(',');
 // The player may stand INSIDE the arena. Front corners can be behind the
 // viewer, but the visible rear outline must not disappear with them.
 let border='';
 for(let i=0;i<4;i++){
  const a=corners[i],b=corners[(i+1)%4];
  if(a&&b)border+='M'+pair(a)+'L'+pair(b);
 }
 // Never fill a partially clipped polygon across the phone's viewport.
 $('placementBorder').style.fill=corners.every(Boolean)?'#07364639':'none';
 $('placementBorder').setAttribute('d',border);
 let d='';
 for(const q of [-.66,-.33,0,.33,.66]){
  const x=q*s;
  for(const edge of [[[x,-s],[x,s]],[[-s,x],[s,x]]]){
   const a=projectArenaPoint(...edge[0],w,h),b=projectArenaPoint(...edge[1],w,h);
   if(a&&b)d+='M'+pair(a)+'L'+pair(b);
  }
 }
 $('placementGridSvg').setAttribute('d',d);
 const center=projectArenaPoint(0,0,w,h);
 if(center){$('placementCross').setAttribute('cx',center[0]);$('placementCross').setAttribute('cy',center[1])}
 svg.style.display=border||d||center?'block':'none';
}
function stableFloor(hit,viewer,t){
 const p=hit?.pose?.transform?.position;
 if(!p||![p.x,p.y,p.z].every(Number.isFinite))return false;
 if(!viewer?.transform?.position||viewer.emulatedPosition===true)return false;
 const eye=viewer.transform.position,horizontal=Math.hypot(p.x-eye.x,p.z-eye.z);
 if(horizontal>.05&&horizontal<4.5&&Math.abs(eye.y-p.y)>.55&&Math.abs(eye.y-p.y)<2.4){
  if(floorSamples.length&&Math.abs(p.y-floorSamples[floorSamples.length-1].y)>.22){
   floorSamples=[];placementWarmup=t;
  }
  floorSamples.push({x:p.x,y:p.y,z:p.z});
  if(floorSamples.length>24)floorSamples.shift();
 }
 const ys=floorSamples.map(q=>q.y).sort((x,y)=>x-y);
 const median=ys.length?ys[Math.floor(ys.length/2)]:0;
 floorStable=ys.length>=8&&ys[ys.length-1]-ys[0]<.10&&t-placementWarmup>=220;
 if(!floorStable)return false;
 const first=!previewInitialized,desiredYaw=yawFromPose(viewer);
 if(first){previewYaw=desiredYaw;previewInitialized=true}
 else previewYaw+=clamp(Math.atan2(Math.sin(desiredYaw-previewYaw),Math.cos(desiredYaw-previewYaw)),-.07,.07);
 const facing=V(0,0,-.78).applyAxisAngle(V(0,1,0),previewYaw);
 const target=V(eye.x+facing.x,median,eye.z+facing.z);
 if(first||previewPosition.distanceTo(target)>1.65)previewPosition.copy(target);
 else previewPosition.lerp(target,.17);
 return true;
}
function updatePreview(frame){
 const h=checkHit(frame),viewer=currentViewer(frame);
 if(h){latestHit=h.h;stableFloor(h,viewer,performance.now())}
 if(!floorStable||!latestHit){
  $('fix').disabled=true;
  if(stage==='search')status('🔎 ESCANEÁ EL PISO · MOVÉ LA CÁMARA DESPACIO');
  return;
 }
 const q=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),previewYaw+yaw);
 const offset=move.clone().applyQuaternion(q);
 art.root.position.copy(previewPosition).add(offset);
 art.root.position.y+=.035;art.root.quaternion.copy(q);
 art.setSize(arenaScale);
 if(stage==='search')setStage('edit');
 $('fix').disabled=!arCompositor||lastComposited===0;
}
function fixArena(){
 if(stage!=='edit'||!floorStable||!latestHit||!arCompositor||lastComposited===0){
  toast('ESPERÁ A QUE LA PISTA SE VEA ESTABLE',2);return;
 }
 fixed=true;fixPending=true;pendingAnchorHit=latestHit;latestHit=null;
 setStage('calibrate');calStart=0;samples=[];calibrationMotion=null;
 status('📍 ARENA FIJADA · CALIBRANDO');$('message').textContent='MANTENÉ EL TELÉFONO QUIETO UN SEGUNDO';
 vibration(40);
}
function startCalibration(){
 if(demo){calibrated=true;setStage('ready');return}
 calStart=0;samples=[];calibrationMotion=null;calibrationRms=0;calibrated=false;
 game.paused=true;setStage('calibrate');
 status('CALIBRANDO POSICIÓN DEL TELÉFONO');
 $('message').textContent='MANTENÉ EL TELÉFONO QUIETO UN SEGUNDO';
}
function calibrate(t,pose){
 if(!pose?.transform?.position||pose.emulatedPosition===true){calStart=0;samples=[];return}
 const {x,y,z}=pose.transform.position,p=V(x,y,z);
 if(calibrationMotion&&calibrationMotion.distanceTo(p)>.06){calStart=0;samples=[]}
 calibrationMotion=p;
 if(!calStart)calStart=t;
 samples.push(p);if(samples.length>100)samples.shift();
 if(t-calStart<1000||samples.length<12)return;
 const avg=samples.reduce((a,b)=>a.add(b),V()).multiplyScalar(1/samples.length);
 calibrationRms=Math.sqrt(samples.reduce((sum,sample)=>sum+sample.distanceToSquared(avg),0)/samples.length);
 if(calibrationRms>.045){calStart=0;samples=[];status('📱 QUIETO UN SEGUNDO PARA CALIBRAR');return}
 art.root.updateMatrixWorld(true);
 const local=art.root.worldToLocal(avg);
 game.eye=G.V(local.x,local.y,local.z);
 calibrated=true;game.paused=false;setStage('ready');
 $('message').textContent='';status('✅ LISTO · VOS ESTÁS ACÁ');
 toast('TU TELÉFONO ES TU POSICIÓN · LA PISTA NO SE MUEVE',3);
 vibration([30,35,50]);sound(960,.23);
}
function updateAim(pose,t){
 if(!pose?.transform?.position||!pose.transform.orientation)return;
 const pos=pose.transform.position,q=pose.transform.orientation;
 art.root.updateMatrixWorld(true);
 const eye=art.root.worldToLocal(V(pos.x,pos.y,pos.z));
 const worldQ=new THREE.Quaternion(q.x,q.y,q.z,q.w);
 const inverseRoot=art.root.getWorldQuaternion(new THREE.Quaternion()).invert();
 const localDirection=V(0,0,-1).applyQuaternion(worldQ).applyQuaternion(inverseRoot).normalize();
 const right=V(1,0,0).applyQuaternion(worldQ).applyQuaternion(inverseRoot).normalize();
 const up=V(0,1,0).applyQuaternion(worldQ).applyQuaternion(inverseRoot).normalize();
 const dir=G.V(localDirection.x,localDirection.y,localDirection.z);
 viewRight=G.V(right.x,right.y,right.z);viewUp=G.V(up.x,up.y,up.z);
 lastAim={eye:G.V(eye.x,eye.y,eye.z),dir};
 lastAimAt=t;G.setView(game,lastAim.eye,lastAim.dir);
}
function aimFeedback(t){
 if(stage!=='playing')return;
 // Urgency is measured along the incoming velocity, never by a fake decoy.
 const arrival=p=>{
   const toEye=G.sub(game.eye,p.pos),distance=G.len(toEye);
   const towards=(p.velocity.x*toEye.x+p.velocity.y*toEye.y+p.velocity.z*toEye.z)/Math.max(distance,.001);
   return towards>.15?distance/towards:1000+distance;
 };
 const inbound=game.projectiles.filter(v=>!v.dead&&!v.returning&&v.type!=='fake');
 const p=inbound.sort((a,b)=>arrival(a)-arrival(b))[0];
 const ret=$('reticle'),cue=$('cue'),button=$('returnBtn'),gauge=$('strikeGauge');
 ret.className='';button.classList.remove('hot');
 for(const id of ['leftArrow','rightArrow','upArrow','downArrow'])$(id).style.opacity='0';
 if(!p){gauge.style.display='none';cue.textContent='PREPARATE · EL ROBOT ESTÁ CARGANDO';return}
 const diff=G.sub(p.pos,game.eye),dist=G.len(diff),q=G.quality(game,p);
 const unit=G.norm(diff);
 const forward=unit.x*game.aim.x+unit.y*game.aim.y+unit.z*game.aim.z;
 const lateral=unit.x*viewRight.x+unit.y*viewRight.y+unit.z*viewRight.z;
 const vertical=unit.x*viewUp.x+unit.y*viewUp.y+unit.z*viewUp.z;
 const behind=forward<-.18;
 if(forward<.94){
  // Full camera-local direction: still correct after turning or tilting an AR phone.
  if(behind&&Math.abs(lateral)<.18){
   $('leftArrow').style.opacity='1';$('rightArrow').style.opacity='1';
  }else if(Math.abs(lateral)>.13){
   $(lateral>0?'rightArrow':'leftArrow').style.opacity='1';
  }
  if(Math.abs(vertical)>.16)$(vertical>0?'upArrow':'downArrow').style.opacity='1';
 }
 gauge.style.display='block';
 const fill=Math.round(clamp((1.72-dist)/(1.72-.58),0,1)*100);
 gauge.style.setProperty('--charge',fill+'%');
 if(q.ok){ret.classList.add('ready');button.classList.add('hot');cue.textContent='⚡ ¡AHORA! · '+q.grade;
   if(!beeped.has(p.id)){beeped.add(p.id);sound(960,.065,'triangle',.04)}
 }else if(behind){ret.classList.add('aim');cue.textContent='↻ ATAQUE DETRÁS · GIRÁ DESPACIO'}
 else if(q.reason==='APUNTÁ A LA ESFERA'){ret.classList.add('aim');cue.textContent='🎯 SEGUÍ LA FLECHA · CENTRÁ LA MIRA'}
 else if(dist<.31){ret.classList.add('aim');cue.textContent='¡MUY TARDE! · PREPARATE'}
 else if(dist<1.5){ret.classList.add('aim');cue.textContent='ENERGÍA CARGÁNDOSE · ¡ESPERÁ!'}
 else{
  const lane=p.lane&&p.lane!=='CENTRO'?p.lane+' · ':'';
  cue.textContent=p.type==='veloz'?'⚡ '+lane+'VELOCIDAD':
   p.type==='pesada'?'🟡 '+lane+'PESADA':lane+'PELOTA EN CAMINO · SEGUÍ LA MIRA';
 }
}
function onReturn(){
 if(stage!=='playing'||game.paused)return;
 if(!demo&&(!lastAim||performance.now()-lastAimAt>550)){toast('SIN SEGUIMIENTO · ORIENTÁ LA CÁMARA',1);return}
 const res=G.returnShot(game);if(res.ok)status(res.grade+' · +'+res.points);
 else{status(res.reason);if(res.reason!=='ESPERÁ')sound(150,.1,'sine',.029)}
}
function pause(){if(stage==='playing'){game.paused=true;setStage('paused');$('message').textContent='PAUSA · RESPIRÁ';status('PARTIDA PAUSADA')}}
function updateAnchor(frame){
 if(fixPending){
  fixPending=false;
  if(typeof pendingAnchorHit?.createAnchor==='function'){
   try{Promise.resolve(pendingAnchorHit.createAnchor()).then(a=>{if(!session){a.delete?.();return}anchor=a;anchorDelta=null}).catch(()=>{})}catch(_){}
  }
  pendingAnchorHit=null;
 }
 if(!anchor||!space)return;
 try{
  const pose=frame.getPose(anchor.anchorSpace,space);if(!pose)return;
  const anchorM=new THREE.Matrix4().fromArray(pose.transform.matrix);
  if(!anchorDelta){art.root.updateMatrixWorld(true);anchorDelta=anchorM.clone().invert().multiply(art.root.matrixWorld)}
  const final=anchorM.multiply(anchorDelta);
  final.decompose(art.root.position,art.root.quaternion,new THREE.Vector3());
 }catch(_){}
}
function animate(t,frame){
 const dt=timePrev?clamp((t-timePrev)/1000,0,.08):.016;timePrev=t;
 if(session&&frame){
  lastFrame=frame;const pose=currentViewer(frame);
  if(stage==='search'||stage==='edit')updatePreview(frame);
  else if(fixed){updateAnchor(frame);if(stage==='calibrate')calibrate(t,pose);if(pose)updateAim(pose,t)}
  if(stage==='playing'&&!pose){
    if(!trackingAt)trackingAt=t;
    if(t-trackingAt>1400){game.paused=true;pausedForTracking=true;setStage('paused');status('⚠ TRACKING PERDIDO · VOLVÉ A ENFOCAR EL PISO');$('message').textContent='SEGUIMIENTO INTERRUMPIDO'}
  }else if(pose)trackingAt=0;
  if(stage==='paused'&&pausedForTracking){
   $('begin').disabled=!pose||!lastAim||performance.now()-lastAimAt>550;
   if(pose)status('✅ SEGUIMIENTO RECUPERADO · CONTINUÁ');
  }
 }else if(demo){
  camera.position.set(0,1.61,1.2);
  camera.rotation.order='YXZ';camera.rotation.set(demoPitch,demoYaw,0,'YXZ');
  camera.updateMatrixWorld(true);
  const eye=camera.getWorldPosition(V()),dir=camera.getWorldDirection(V());
  const camQ=camera.getWorldQuaternion(new THREE.Quaternion());
  const right=V(1,0,0).applyQuaternion(camQ),up=V(0,1,0).applyQuaternion(camQ);
  viewRight=G.V(right.x,right.y,right.z);viewUp=G.V(up.x,up.y,up.z);
  G.setView(game,G.V(eye.x,eye.y,eye.z),G.V(dir.x,dir.y,dir.z));
 }
 if(stage==='playing'){
  G.tick(game,dt);soundtrack();
  for(const e of game.effects)if(!effectsSeen.has(e)){effectsSeen.add(e);art.effect(e);audioEvent(e)}
  if(game.state==='finished')results();
 }
 art.update(game,t/1000,dt,stage==='search'||stage==='edit');
 drawPlacementOutline(frame);
 if(stage==='playing'&&!session){qualityFrames++;qualityCost+=dt;if(qualityFrames>=180){
  if(qualityCost/qualityFrames>.038&&renderer.getPixelRatio()>1.1)renderer.setPixelRatio(1.05);
  qualityFrames=0;qualityCost=0;
 }}
 if(t-hudPrev>80){hudPrev=t;updateHud();aimFeedback(t)}
 if(t>toastEnd)$('notice').textContent='';
 if(session){
  // Mirrors the working RODEADOS 360 path: native XR renders a transparent,
  // empty scene; anchored Three.js geometry uses the actual XR eye matrices
  // in a transparent canvas INSIDE the XR DOM overlay.
  renderer.render(nativeXRScene,camera);
  if(arCompositor){
   const ok=arCompositor.render(scene,renderer.xr.getCamera(camera));
   if(ok){
    arFrames++;
    lastComposited=arCompositor.drawCalls;
    if(['search','edit'].includes(stage)){
     $('fix').disabled=!latestHit||!floorStable||lastComposited===0;
     if(lastComposited>0&&stage==='edit')status('✅ ARENA EN EL PISO · AJUSTÁ Y FIJÁ');
    }
   }else{
    arRenderError=arCompositor.error||'NO SE PUDO DIBUJAR EL ESCENARIO 3D';
    if(['search','edit'].includes(stage)){
     $('fix').disabled=true;
     status('⚠ ERROR AL MOSTRAR LA ARENA');
     $('notice').textContent=arRenderError;
    }else if(stage==='playing'){
     game.paused=true;pausedForTracking=true;setStage('paused');
     status('⚠ ERROR DE GRÁFICOS AR · RECENTRÁ');
    }
   }
  }
 }else if(stage!=='home')renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
function editSize(delta){if(stage!=='edit')return;arenaScale=clamp(arenaScale+delta,.7,1.45);art.setSize(arenaScale)}
$('minus').onclick=()=>editSize(-.1);$('plus').onclick=()=>editSize(.1);
$('turn').onclick=()=>{if(stage==='edit')yaw+=Math.PI/12};
$('fix').onclick=fixArena;
$('begin').onclick=startRound;
$('adjust').onclick=()=>{if(demo)return;game.paused=true;fixed=false;anchor?.delete?.();anchor=null;anchorDelta=null;latestHit=null;
 floorSamples=[];floorStable=false;placementWarmup=performance.now();previewInitialized=false;
 setStage('search');status('AJUSTÁ EL PISO');$('message').textContent=''};
$('pauseBtn').onclick=pause;
$('center').onclick=()=>{if(stage==='playing')pause();if(!demo)startCalibration()};
$('sound').onclick=()=>{sounds=!sounds;$('sound').textContent=sounds?'🔊':'🔇'};
function leave(){session?.end?.().catch(()=>{});location.href='https://modo-caos-eta.vercel.app/'}
$('exit').onclick=leave;$('quit').onclick=leave;
$('rematch').onclick=()=>{
 const wasDemo=demo,eye=game.eye,aim=game.aim;
 resetGame(true);game.eye=eye;game.aim=aim;calibrated=true;
 if(wasDemo){G.begin(game);setStage('playing');status('¡REVANCHA!')}else{setStage('ready');status('✅ ARENA CONSERVADA · REVANCHA')}
 $('message').textContent='';
};
$('share').onclick=async()=>{
 const txt='⚡ REBOTE MORTAL · '+game.score+' puntos, '+game.perfect+' perfectos y combo ×'+game.bestCombo+'. ¿Me superás? '+location.origin+'/rebote.html';
 if(navigator.share){try{await navigator.share({text:txt})}catch(_){}}
 else if(navigator.clipboard){try{await navigator.clipboard.writeText(txt);toast('RESULTADO COPIADO',2)}catch(_){}}
};
let pointerReturnClickUntil=0;
$('returnBtn').addEventListener('pointerdown',e=>{
 if(!e.isPrimary)return;
 e.preventDefault();e.stopPropagation();
 // Android dispatches click AFTER pointerdown. Handle the touch immediately, once.
 pointerReturnClickUntil=performance.now()+650;
 onReturn();
});
$('returnBtn').addEventListener('click',e=>{
 e.preventDefault();
 // Keep keyboard/assistive-tech click usable; suppress only the pointer-generated click.
 if(performance.now()>=pointerReturnClickUntil)onReturn();
});
$('overlay').addEventListener('beforexrselect',e=>e.preventDefault());
$('touch').addEventListener('pointerdown',e=>{
 if(stage!=='edit')return;
 e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
 fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=null;
});
$('touch').addEventListener('pointermove',e=>{
 if(stage!=='edit'||!fingers.has(e.pointerId))return;e.preventDefault();
 const prev=fingers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;
 fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(fingers.size===1){move.x=clamp(move.x+dx*.0025,-2,2);move.z=clamp(move.z+dy*.0025,-2,2)}
 else{const [a,b]=[...fingers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),angle=Math.atan2(b.y-a.y,b.x-a.x);
  if(gesture){arenaScale=clamp(arenaScale*d/Math.max(5,gesture.d),.7,1.45);let diff=angle-gesture.angle;
   if(diff>Math.PI)diff-=Math.PI*2;if(diff< -Math.PI)diff+=Math.PI*2;yaw+=diff}
  gesture={d,angle};
 }
});
for(const k of ['pointerup','pointercancel','lostpointercapture'])$('touch').addEventListener(k,e=>{fingers.delete(e.pointerId);gesture=null});
let drag=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(!demo||stage!=='playing')return;drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!demo||!drag)return;
 demoYaw-=.0058*(e.clientX-drag.x);demoPitch=clamp(demoPitch-.004*(e.clientY-drag.y),-.68,.63);
 drag={x:e.clientX,y:e.clientY};
});
['pointerup','pointercancel'].forEach(ev=>renderer.domElement.addEventListener(ev,()=>drag=null));
document.addEventListener('keydown',e=>{
 if(!demo)return;if(e.code==='Space'){e.preventDefault();onReturn()}if(e.code==='Escape')pause();
});
$('startDemo').onclick=()=>{
 demo=true;resetGame();calibrated=true;fixed=true;art.root.position.set(0,0,0);art.root.quaternion.identity();art.setSize(1);
 demoYaw=0;demoPitch=0;game.eye=G.V(0,1.61,1.2);setStage('ready');startRound();
 toast('ARRASTRÁ PARA APUNTAR · TOCÁ DEVOLVER CUANDO ESTÉ CERCA',4);
};
let xrStartVersion=0;
function arStartError(error){
 const name=error?.name||'',message=String(error?.message||error||'').slice(0,230);
 let title='NO SE PUDO INICIAR LA CÁMARA AR';
 let detail='Probá abrir el juego directamente en Chrome Android, con Google Play Services for AR actualizado.';
 if(name==='NotAllowedError'||name==='SecurityError'){
  title='FALTA PERMISO PARA REALIDAD AUMENTADA';
  detail='Permití el acceso a cámara y movimiento del dispositivo desde Chrome, y volvé a intentar.';
 }else if(name==='NotSupportedError'||name==='NotFoundError'){
  title='AR NO DISPONIBLE EN ESTE NAVEGADOR';
  detail='Necesitás Chrome en Android, un teléfono compatible con ARCore y Servicios de Google Play para RA.';
 }else if(name==='InvalidStateError'){
  title='YA HAY UNA SESIÓN AR ABIERTA';
  detail='Cerrá la otra sesión de cámara y volvé a intentar desde Chrome.';
 }else if(name==='NO_WEBXR'){
  title='ESTE NAVEGADOR NO PUEDE ABRIR LA CÁMARA AR';
  detail='Si abriste el juego dentro de ChatGPT, WhatsApp u otra aplicación, abrilo directamente en Chrome Android.';
 }else if(name==='INSECURE'){
  title='REALIDAD AUMENTADA REQUIERE HTTPS';
  detail='Ingresá desde el enlace seguro https://modo-caos-eta.vercel.app/rebote.html';
 }
 window.ReboteBoot?.show(title,detail+(name==='NO_WEBXR'||name==='INSECURE'?'':' Detalle: '+(message||name||'AR no disponible')));
 $('support').textContent=title;
 $('startAR').disabled=false;
}
function resetXRSession(s){
 if(s)try{s.end()?.catch?.(()=>{})}catch(_){}
}
async function startXR(){
 if(stage!=='home')return;
 window.ReboteBoot?.clear();
 if(!window.isSecureContext){arStartError({name:'INSECURE'});return}
 if(!navigator.xr||typeof navigator.xr.requestSession!=='function'){
  arStartError({name:'NO_WEBXR'});return;
 }
 const ticket=++xrStartVersion;
 let requested,created=null;
 // The XR DOM overlay must be mounted and visible when the session is requested.
 $('arena').style.display='block';
 // Request the session synchronously inside the click; awaiting first loses user activation.
 try{
  requested=navigator.xr.requestSession('immersive-ar',{
   requiredFeatures:['hit-test','dom-overlay'],
   optionalFeatures:['anchors','local-floor'],
   domOverlay:{root:$('overlay')}
  });
 }catch(err){$('arena').style.display='none';arStartError(err);return}
 setStage('connecting');$('startAR').disabled=true;
 $('arConnectingTitle').textContent='ABRIENDO CÁMARA AR';
 $('arConnectingHelp').textContent='Si Chrome solicita permiso de cámara o seguimiento, tocá Permitir.';
 status('SOLICITANDO REALIDAD AUMENTADA...');
 const watchdog=setTimeout(()=>{
  if(ticket===xrStartVersion&&stage==='connecting'){
   $('arConnectingTitle').textContent='ESPERANDO RESPUESTA DE LA CÁMARA';
   $('arConnectingHelp').textContent='Comprobá si hay un permiso pendiente. Si no avanza, volvé y abrí el enlace en Chrome Android.';
  }
 },6500);
 try{
  const s=await requested;created=s;
  if(ticket!==xrStartVersion){resetXRSession(s);return}
  session=s;demo=false;
  // Install cleanup before potentially failing asynchronous renderer setup.
  s.addEventListener('end',()=>{
   if(session!==s)return;
   ++xrStartVersion;
   closeArWorld();
   session=null;hitSource?.cancel?.();hitSource=null;
   anchor?.delete?.();anchor=null;anchorDelta=null;
   fixed=false;calibrated=false;lastAim=null;latestHit=null;
   resetGame();setStage('home');$('startAR').disabled=false;
   window.ReboteBoot?.show('SE CERRÓ LA SESIÓN AR','Podés volver a intentarlo desde Chrome Android o jugar en Entrenamiento 3D.');
  });
  s.addEventListener('visibilitychange',()=>{
   if(s.visibilityState!=='visible'&&stage==='playing')pause();
  });
  $('arConnectingTitle').textContent='PREPARANDO ESCENARIO 3D';
  await renderer.xr.setSession(s);
  if(ticket!==xrStartVersion){resetXRSession(s);return}
  space=renderer.xr.getReferenceSpace()||await s.requestReferenceSpace('local');
  const viewer=await s.requestReferenceSpace('viewer');
  hitSource=await s.requestHitTestSource({space:viewer});
  if(ticket!==xrStartVersion){resetXRSession(s);return}
  openArWorld();
  resetGame();fixed=false;calibrated=false;latestHit=null;
  floorSamples=[];floorStable=false;placementWarmup=performance.now();previewInitialized=false;
  arenaScale=.86;move.set(0,0,0);yaw=0;
  setStage('search');status('BUSCÁ EL PISO CON LA CÁMARA');$('message').textContent='';
  $('startAR').disabled=false;
 }catch(err){
  console.warn('REBOTE: error real al iniciar WebXR',err);
  if(ticket!==xrStartVersion)return;
  ++xrStartVersion;
  const active=session||created;
  session=null;hitSource?.cancel?.();hitSource=null;
  closeArWorld();
  resetXRSession(active);
  fixed=false;calibrated=false;lastAim=null;
  setStage('home');arStartError(err);
 }finally{
  clearTimeout(watchdog);
 }
}
$('startAR').addEventListener('click',startXR);
$('cancelStartAR').addEventListener('click',()=>{
 if(stage!=='connecting')return;
 ++xrStartVersion;
 const s=session;session=null;closeArWorld();resetXRSession(s);
 setStage('home');$('startAR').disabled=false;
 window.ReboteBoot?.show('AR CANCELADA','Podés reintentar desde Chrome Android o elegir el modo de entrenamiento 3D.');
});
if(window.isSecureContext&&navigator.xr)navigator.xr.isSessionSupported('immersive-ar').then(ok=>{
 if(stage==='home'&&$('arProblem').hidden)$('support').textContent=ok?'✅ AR DETECTADA · Buscá un piso despejado para fijar la arena.':'⚠ Este dispositivo no admite WebXR immersive-ar. Podés usar Entrenamiento 3D.';
}).catch(()=>{});
try{$('record').textContent='🏆 RÉCORD: '+(Number(localStorage.getItem('mc-rebote-record'))||0).toLocaleString('es-AR')}catch(_){}
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);arCompositor?.resize(innerWidth,innerHeight);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&stage==='playing')pause()});
if(window.__reboteEarlyTap)window.ReboteBoot?.show('MOTOR LISTO','Ahora tocá otra vez JUGAR EN REALIDAD AUMENTADA para abrir la cámara.');
else window.ReboteBoot?.clear();
globalThis.__ReboteDebug={get stage(){return stage},get game(){return G.snapshot(game)},get ar(){return !!session},get calibrated(){return calibrated},get root(){return art.root.position.toArray()},get renderedRobots(){return art.getRobotCount()},get renderedShots(){return art.getShotCount()},get tracking(){return !!lastAim&&performance.now()-lastAimAt<550},get clearAlpha(){return renderer.getClearAlpha()},get returnAttempts(){return game.attempts},get scale(){return arenaScale},get arDrawCalls(){return arCompositor?.drawCalls||0},get arFrames(){return arFrames},get arCanvas(){return !!arCompositor?.canvas?.isConnected},get arRenderError(){return arRenderError},get radarVisible(){return $('radar').style.display==='block'},get floorStable(){return floorStable},get floorSamples(){return floorSamples.length},get calibrationRms(){return calibrationRms},get previewYaw(){return previewYaw}};
