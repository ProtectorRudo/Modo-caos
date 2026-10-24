import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.17.3/rapier.es.js';
import {THREE,TorreArt,BLOCK,DEPTH} from './torre-art.js';
const G=window.TorreCore,$=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), PI=Math.PI;
const ui={home:$('home'),overlay:$('overlay'),notice:$('notice'),hud:$('hud'),tip:$('tip'),stage:$('stage'),hudHeight:$('height'),hudRecord:$('recordHud'),hudPieces:$('pieces'),blockName:$('blockName'),mini:$('mini'),results:$('results'),status:$('status'),arControls:$('arControls'),gesture:$('gesture'),replay:$('replay'),setup:$('setup')};
let art=null,world=null,queue=null,states=[],active=null,random=G.rng(2026),nextId=1,settleTime=0,stillTime=0,lastTop=0,top=0,hi=0,steps=0,acc=0,lastTime=0,mode='demo',phase='home',paused=false,trackSource=null,ref=null,session=null,latestHit=null,hitSeen=0,anchor=null,fixedPose=null,rawPose=null,shift={x:0,z:0},yaw=0,scale=1,drag=null,pinch=null,frames=[],replayTime=0,replayFrames=[],replaying=false,record=0,sound=true,haptic=true,audio=null,noticeTimer=0,miniTimer=0,lastHit=null,lastSound=0,editing=false,resumePhase='playing';
try{record=Number(localStorage.getItem('mc_torre_record')||0)||0}catch(_){}
$('introRecord').textContent='RÉCORD: '+record+' CM';
function showText(text,t=2500){ui.notice.textContent=text;ui.notice.style.opacity='1';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.notice.style.opacity='0',t)}
function phaseTo(p){phase=p;ui.stage.dataset.phase=p;ui.hud.hidden=!(p==='playing'||p==='settling'||p==='replay'||p==='finished'||p==='paused');ui.arControls.hidden=!(p==='placing');ui.results.hidden=p!=='finished';ui.replay.hidden=p!=='replay';ui.setup.hidden=p!=='placing';ui.blockName.hidden=p!=='playing';ui.tip.hidden=p!=='playing';ui.gesture.style.pointerEvents=(p==='placing'||p==='playing')?'auto':'none';}
function updateHUD(){ui.hudHeight.textContent=G.score(phase==='settling'?lastTop:top).toString();ui.hudPieces.textContent=states.length.toString();ui.hudRecord.textContent=Math.max(record,G.score(top)).toString()}
function startPhysics(){
 if(world){world.free();world=null}if(queue){queue.free();queue=null}
 world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;world.integrationParameters.maxVelocityIterations=8;world.integrationParameters.maxPositionIterations=3;queue=new RAPIER.EventQueue(true);
 const floor=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,.039,0));
 world.createCollider(RAPIER.ColliderDesc.cuboid(1.25,.079,.36).setFriction(.98).setRestitution(.035),floor);
 states=[];nextId=1;random=G.rng((Date.now()>>>0)^0x524f334);settleTime=0;stillTime=0;lastTop=0;top=0;hi=0;steps=0;acc=0;frames=[];replaying=false;art.reset();updateHUD();
}
function updateLanding(){
 if(!active||!world)return;
 const ray=new RAPIER.Ray({x:active.x,y:Math.max(active.y+.35,top+1),z:0},{x:0,y:-1,z:0});
 const hit=world.castRay(ray,50,true);
 art.setGhostLanding(active.x,hit?ray.origin.y-hit.timeOfImpact:.14);
}
function makeActive(){
 if(states.length>=65){finish('¡TORRE LEGENDARIA!');return}
 const shape=G.select(states.length,random);active={shape,x:0,y:Math.max(.92,top+.52),angle:0};
 art.setActive(shape);art.moveActive(active.x,active.y,active.angle);updateLanding();ui.blockName.textContent=shape.name.toUpperCase();phaseTo('playing');
 if(states.length===0)showText('TOCÁ PARA GIRAR · ARRASTRÁ Y SOLTÁ PARA SOLTAR',4500);
 updateHUD();
}
function drop(){
 if(phase!=='playing'||!active||!world)return;
 let {shape,x,y,angle}=active;
 const desc=RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,0).setLinearDamping(.075).setAngularDamping(.11).setCcdEnabled(true);
 const body=world.createRigidBody(desc);
 body.setEnabledTranslations(true,true,false,true);body.setEnabledRotations(false,false,true,true);
 const q={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};body.setRotation(q,true);
 let attached=0;
 for(const poly of shape.parts){
  const vertices=[];
  for(const z of [-DEPTH*.5,DEPTH*.5])for(const [xx,yy] of poly)vertices.push(xx*BLOCK,yy*BLOCK,z);
  const col=RAPIER.ColliderDesc.convexHull(new Float32Array(vertices));
  if(!col)continue;
  col.setDensity(3.5*shape.weight).setFriction(.89).setRestitution(.048).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  world.createCollider(col,body);attached++;
 }
 if(!attached){world.removeRigidBody(body);showText('No se pudo cargar esa figura');return}
 const id=nextId++;states.push({id,shape,body});art.releaseActive();art.startBlock(id,shape);
 active=null;lastTop=top;settleTime=0;stillTime=0;frames=[];phaseTo('settling');showText('EQUILIBRANDO...',700);
 soundFX(370,.04,.11,'triangle');vibe(9);
}
function soundFX(freq,duration,amp=.11,type='sine'){
 if(!sound)return;
 try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
  const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(48,freq*.56),t+duration);
  v.gain.setValueAtTime(Math.min(.18,amp),t);v.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(v).connect(audio.destination);o.start(t);o.stop(t+duration+.01)}catch(_){}
}
function vibe(ms){try{if(haptic)navigator.vibrate?.(ms)}catch(_){}}
function collisionAudio(){
 const now=performance.now();
 queue.drainCollisionEvents((h1,h2,started)=>{
  if(!started||now-lastSound<95)return;
  const a=world.getCollider(h1)?.parent?.(),b=world.getCollider(h2)?.parent?.();
  const moving=[a,b].filter(Boolean).map(x=>{const v=x.linvel();return Math.hypot(v.x,v.y,v.z)});const impact=Math.max(...moving,0);
  if(impact<.18)return;lastSound=now;
  soundFX(80+Math.min(380,impact*90),.075+Math.min(.12,impact*.022),.055+Math.min(.12,impact*.022),'triangle');
  if(impact>.9)vibe(Math.round(Math.min(28,impact*6)));
  const s=states.find(s=>s.body.handle===(a?.handle??-1))||states.at(-1);
  if(s){const p=s.body.translation();art.impact(p.x,p.y,impact)}
 });
}
function readStates(){
 let max=.14;const pieces=[];
 for(const s of states){
  const b=s.body,p=b.translation(),q=b.rotation(),angle=2*Math.atan2(q.z,q.w);
  const bounds=G.bounds(s.shape,angle);const pieceTop=p.y+bounds.maxY*BLOCK;
  max=Math.max(max,pieceTop);
  art.sync(s.id,p.x,p.y,angle);pieces.push({id:s.id,x:p.x,y:p.y,top:pieceTop,angle});
 }
 top=Math.max(0,max-.14);
 return pieces;
}
function saveRecord(){
 const points=G.score(top);if(points>record){record=points;try{localStorage.setItem('mc_torre_record',String(record))}catch(_){}}
}
function physicsStep(){
 if(!world||paused||replaying)return;
 world.step(queue);steps++;collisionAudio();
 const pieces=readStates();
 if(phase==='settling'){
  settleTime+=1/60;
  frames.push(pieces.map(p=>({id:p.id,x:p.x,y:p.y,angle:p.angle})));if(frames.length>180)frames.shift();
  const latest=states.at(-1);
  const fast=states.some(s=>{const v=s.body.linvel(),a=s.body.angvel();return Math.hypot(v.x,v.y)>.24||Math.abs(a.z)>.45});
  stillTime=fast?0:stillTime+1/60;
  if(settleTime>1.15&&G.collapsed(pieces,lastTop,latest.id)){fail();return}
  if(settleTime>1.2&&(stillTime>.5||settleTime>5.5)){
   if(G.collapsed(pieces,lastTop,latest.id)){fail();return}
   hi=Math.max(hi,top);saveRecord();updateHUD();
   if(G.score(top)>=100&&Math.floor(G.score(top)/100)>Math.floor(G.score(lastTop)/100)){soundFX(860,.25,.1);showText('¡'+G.score(top)+' CM! ALTURA IMPARABLE',1100)}
   makeActive();
  }
 }
 if(steps%6===0)updateHUD();
}
function fail(){
 top=lastTop;saveRecord();phaseTo('replay');replayFrames=frames.slice(-90);replayTime=0;replaying=true;showText('¡SE VIENE ABAJO!',1800);soundFX(90,.32,.17,'sawtooth');vibe(45);
 if(!replayFrames.length){endReplay();return}
}
function endReplay(){replaying=false;phaseTo('finished');const pts=G.score(hi);$('finalHeight').textContent=pts+' cm';$('finalPieces').textContent=states.length;$('finalRecord').textContent=record+' cm';$('resultTitle').textContent=pts>=record&&pts>0?'¡NUEVO RÉCORD!':'TORRE DERRUMBADA';updateHUD()}
function finish(title){saveRecord();phaseTo('finished');$('finalHeight').textContent=G.score(hi)+' cm';$('finalPieces').textContent=states.length;$('finalRecord').textContent=record+' cm';$('resultTitle').textContent=title}
function paintReplay(dt){
 replayTime+=dt*.61;const i=Math.min(replayFrames.length-1,Math.floor(replayTime*60));
 const snapshot=replayFrames[i];for(const s of snapshot||[])art.sync(s.id,s.x,s.y,s.angle);
 if(i>=replayFrames.length-1||replayTime>3){endReplay()}
}
function newGame(){
 editing=false;paused=false;startPhysics();ui.results.hidden=true;makeActive();$('introRecord').textContent='RÉCORD: '+record+' CM';
}
function tick(time,frame){
 const dt=Math.min(.05,Math.max(0,(time-lastTime)/1000||.016));lastTime=time;
 if(session&&frame)xrFrame(time,frame);
 if(phase==='playing'||phase==='settling'){if(!paused){acc=Math.min(.12,acc+dt);let k=0;while(acc>=1/60&&k++<6){physicsStep();acc-=1/60}}}
 if(replaying)paintReplay(dt);
 if(art)art.frame(Math.max(top,hi*.8),dt);
 if(time-miniTimer>160){drawMini();miniTimer=time}
}
function drawMini(){
 if(!art||!(phase==='playing'||phase==='settling'||phase==='replay'||phase==='finished'))return;
 const ctx=ui.mini.getContext('2d');const w=ui.mini.width,h=ui.mini.height;ctx.clearRect(0,0,w,h);
 const replaySnapshot=replaying?replayFrames[Math.min(replayFrames.length-1,Math.floor(replayTime*60))]:null;
 ctx.fillStyle='#0c2436dd';ctx.fillRect(0,0,w,h);
 const viewHeight=Math.max(2.6,top+.65,hi+.65);const px=Math.min(w/2.9,(h-20)/viewHeight);
 const X=x=>w/2+x*px, Y=y=>h-15-(y+.04)*px;
 ctx.strokeStyle='#84f7e8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(-1.25),Y(.14));ctx.lineTo(X(1.25),Y(.14));ctx.stroke();
 for(const s of states){const snap=replaySnapshot?.find(b=>b.id===s.id),p=snap||s.body.translation(),q=s.body.rotation(),a=snap?snap.angle:2*Math.atan2(q.z,q.w);const c=['#34e1c1','#ffb952','#7da3ff','#ff769a','#b184ff','#ffa17a','#c3ea65'][s.shape.tone%7];
 ctx.fillStyle=c;ctx.strokeStyle='#ffffffa0';ctx.lineWidth=.85;
 for(const poly of s.shape.parts){ctx.beginPath();G.rotated(poly,a).forEach(([xx,yy],i)=>{const xxw=X(p.x+xx*BLOCK),yyw=Y(p.y+yy*BLOCK);i?ctx.lineTo(xxw,yyw):ctx.moveTo(xxw,yyw)});ctx.closePath();ctx.fill();ctx.stroke()}
 }
 if(active){ctx.save();ctx.globalAlpha=.74;ctx.fillStyle='#68ffe4';for(const poly of active.shape.parts){ctx.beginPath();G.rotated(poly,active.angle).forEach(([xx,yy],i)=>{i?ctx.lineTo(X(active.x+xx*BLOCK),Y(active.y+yy*BLOCK)):ctx.moveTo(X(active.x+xx*BLOCK),Y(active.y+yy*BLOCK))});ctx.closePath();ctx.fill()}ctx.restore()}
 ctx.fillStyle='#b3ebe4';ctx.font='bold 10px system-ui';ctx.fillText('VISTA TORRE',8,14);
}
function gestureDown(e){
 if(phase!=='playing'&&phase!=='placing')return;
 e.preventDefault();ui.gesture.setPointerCapture(e.pointerId);
 if(phase==='placing'){const p={id:e.pointerId,x:e.clientX,y:e.clientY};pointers.set(e.pointerId,p);if(pointers.size===2){let a=[...pointers.values()];pinch={dist:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),angle:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x),scale,yaw}}return}
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:active?.x||0,moved:false};soundFX(540,.028,.034);
}
const pointers=new Map();
function gestureMove(e){
 if(phase==='placing'){
  if(!pointers.has(e.pointerId))return;e.preventDefault();const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
  if(pointers.size===1){const c=Math.cos(yaw),sn=Math.sin(yaw);shift.x=clamp(shift.x+(dx*c+dy*sn)*.0016,-1.7,1.7);shift.z=clamp(shift.z+(-dx*sn+dy*c)*.0016,-1.7,1.7)}
  else{const a=[...pointers.values()],dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),ang=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
   if(pinch){scale=clamp(pinch.scale*(dist/Math.max(20,pinch.dist)),.30,1.15);yaw=pinch.yaw+ang-pinch.angle;art?.setScale(scale)}
  }updateScale();return;
 }
 if(!drag||!active||drag.id!==e.pointerId||phase!=='playing')return;e.preventDefault();
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(Math.hypot(dx,dy)>12)drag.moved=true;
 if(drag.moved){active.x=clamp(drag.startX+dx/(innerWidth||360)*2.8,-1.08,1.08);art.moveActive(active.x,active.y,active.angle);updateLanding()}
}
function gestureUp(e){
 if(phase==='placing'){pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;return}
 if(!drag||drag.id!==e.pointerId||phase!=='playing'||!active)return;
 const moved=drag.moved;drag=null;
 if(moved)drop();else{active.angle=(active.angle+PI/2)%(2*PI);art.moveActive(active.x,active.y,active.angle);updateLanding();soundFX(710,.05,.045);vibe(7)}
}
ui.gesture.addEventListener('pointerdown',gestureDown);ui.gesture.addEventListener('pointermove',gestureMove);ui.gesture.addEventListener('pointerup',gestureUp);ui.gesture.addEventListener('pointercancel',e=>{if(phase==='placing'){pointers.delete(e.pointerId);pinch=null}else drag=null});
function updateScale(){$('sizeText').textContent=Math.round(scale*100)+'%'}
function setARMode(ar){mode=ar?'ar':'demo';art.setAR(ar);ui.home.hidden=true;ui.overlay.hidden=false;if(!ar){session=null;scale=1;art.setScale(1);art.group.visible=true;$('recenter').hidden=true;newGame();return}$('recenter').hidden=false;scale=.48;art.setScale(scale);updateScale();phaseTo('placing');art.group.visible=false;showText('APUNTÁ AL PISO Y AJUSTÁ TU PLATAFORMA',3600)}
function arReady(){return !!navigator.xr&&window.isSecureContext}
async function startAR(){
 if(!art){showText('Motor todavía cargando');return}
 if(!arReady()){showText('Usá Chrome Android compatible con WebXR / ARCore',4800);return}
 $('arBtn').disabled=true;
 try{
  if(!(await navigator.xr.isSessionSupported('immersive-ar')))throw Error('Este celular no admite AR espacial. Probá el modo 3D.');
  art.renderer.xr.enabled=true;art.renderer.xr.setReferenceSpaceType('local');art.renderer.xr.setFramebufferScaleFactor(Math.min(1.0,1/(devicePixelRatio||1)*1.5));
  const s=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors','light-estimation'],domOverlay:{root:ui.overlay}});
  session=s;
  s.addEventListener('end',()=>{session=null;trackSource?.cancel?.();trackSource=null;anchor?.delete?.();anchor=null;art.setAR(false);art.renderer.xr.enabled=false;art.group.position.set(0,0,0);art.group.rotation.set(0,0,0);scale=1;art.setScale(1);setARMode(false);});
  await art.renderer.xr.setSession(s);
  ref=await s.requestReferenceSpace('local');
  const viewer=await s.requestReferenceSpace('viewer');
  trackSource=await s.requestHitTestSource({space:viewer});
  yaw=0;scale=.48;shift={x:0,z:0};fixedPose=null;art.setScale(scale);setARMode(true);
 }catch(e){showText('No se pudo abrir AR: '+(e.message||e),6500);$('precheck').textContent='AR: '+e.message;try{await session?.end()}catch(_){} session=null;art.setAR(false)}
 $('arBtn').disabled=false;
}
function xrFrame(time,frame){
 if(!ref||!trackSource)return;
 const hit=frame.getHitTestResults(trackSource);
 if(phase==='placing'){
  if(hit.length){const p=hit[0].getPose(ref);if(p){latestHit=hit[0];hitSeen=time;rawPose={x:p.transform.position.x,y:p.transform.position.y,z:p.transform.position.z};if(!fixedPose){const view=frame.getViewerPose(ref)?.transform.position;if(view)yaw=Math.atan2(view.x-rawPose.x,view.z-rawPose.z);fixedPose={...rawPose};}
   art.group.visible=true;art.setPreviewPose({x:rawPose.x+shift.x,y:rawPose.y,z:rawPose.z+shift.z},yaw);$('fix').disabled=false;
  }}
  if(time-hitSeen>950){$('fix').disabled=true;if(!latestHit)art.group.visible=false}
  art.aim.visible=true;
 }else if(anchor){
  const p=frame.getPose(anchor.anchorSpace,ref);
  if(p){art.group.position.set(p.transform.position.x+shift.x,p.transform.position.y,p.transform.position.z+shift.z)}
  art.aim.visible=false;
 }else art.aim.visible=false;
}
async function fix(){
 if(phase!=='placing'||!rawPose||performance.now()-hitSeen>1800)return;
 const cp={x:rawPose.x+shift.x,y:rawPose.y,z:rawPose.z+shift.z};
 art.setPreviewPose(cp,yaw);art.group.visible=true;fixedPose={...cp};
 try{if(latestHit?.createAnchor){anchor=await latestHit.createAnchor();}}catch(_){}
 art.aim.visible=false;ui.setup.hidden=true;
 if(editing){editing=false;paused=false;phaseTo(resumePhase);showText('TORRE REUBICADA · ¡SEGUÍ CONSTRUYENDO!',3200)}
 else{newGame();showText('¡LISTO! TOCÁ, ARRASTRÁ Y SOLTÁ',3200)}
}
function pause(){if(phase!=='playing'&&phase!=='settling')return;paused=true;$('pauseMenu').hidden=false;showText('PAUSA')}
function resume(){paused=false;$('pauseMenu').hidden=true}
function retry(){resume();replaying=false;newGame()}
function edit(){if(!session)return;resumePhase=phase;editing=true;paused=true;drag=null;$('pauseMenu').hidden=true;phaseTo('placing');shift={x:0,z:0};latestHit=null;hitSeen=0;rawPose=null;fixedPose=null;anchor?.delete?.();anchor=null;showText('REUBICÁ LA TORRE SIN PERDER TU CONSTRUCCIÓN');}
function miniToggle(){ui.mini.classList.toggle('expanded')}
$('demoBtn').addEventListener('click',()=>{if(!art)return;setARMode(false)});
$('arBtn').addEventListener('click',startAR);
$('fix').addEventListener('click',fix);
$('minus').addEventListener('click',()=>{scale=clamp(scale-.07,.30,1.15);art.setScale(scale);updateScale()});
$('plus').addEventListener('click',()=>{scale=clamp(scale+.07,.30,1.15);art.setScale(scale);updateScale()});
$('turn').addEventListener('click',()=>{yaw+=PI/12;art.setPreviewPose({x:rawPose?.x+shift.x||0,y:rawPose?.y||0,z:rawPose?.z+shift.z||0},yaw)});
$('pause').addEventListener('click',pause);
$('resume').addEventListener('click',resume);
$('retry').addEventListener('click',retry);
$('resultRetry').addEventListener('click',retry);
$('skipReplay').addEventListener('click',endReplay);
$('recenter').addEventListener('click',edit);
$('quit').addEventListener('click',()=>{location.href='/'});
$('miniBtn').addEventListener('click',miniToggle);
ui.mini.addEventListener('click',miniToggle);
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').textContent=sound?'🔊 Sonido':'🔇 Sonido'});
$('vibration').addEventListener('click',()=>{haptic=!haptic;$('vibration').textContent=haptic?'📳 Vibración':'— Vibración'});
addEventListener('keydown',e=>{if(phase==='playing'&&active){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){active.x=clamp(active.x+(e.key==='ArrowLeft'?-.09:.09),-1.08,1.08);art.moveActive(active.x,active.y,active.angle)}else if(e.key==='r'||e.key==='R'){active.angle+=PI/2;art.moveActive(active.x,active.y,active.angle)}else if(e.key===' '||e.key==='Enter'){e.preventDefault();drop()}}});
async function boot(){
 try{
  $('precheck').textContent='Cargando física 3D…';
  await RAPIER.init();
  art=new TorreArt($('arena'));art.renderer.setAnimationLoop(tick);phaseTo('home');
  const supportsAR=arReady()&&await navigator.xr.isSessionSupported('immersive-ar').catch(()=>false);
  $('precheck').textContent=supportsAR?'AR espacial compatible · También podés jugar en 3D.':'Modo 3D disponible · La AR espacial requiere Chrome Android y ARCore compatibles.';
  $('demoBtn').disabled=false;$('arBtn').disabled=!supportsAR;
 }catch(e){$('precheck').textContent='Error cargando motor físico: '+(e.message||e);$('demoBtn').disabled=true;$('arBtn').disabled=true;console.error(e)}
}
ui.overlay.addEventListener('beforexrselect',e=>e.preventDefault());
boot();
