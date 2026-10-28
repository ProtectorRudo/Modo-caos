/* FRUTÁSTROFE · runtime 3D / WebXR floor-locked / save / local versus */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
const $=id=>document.getElementById(id),C=window.FrutaCore,A=window.FrutaArt;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),number=x=>Math.round(x).toLocaleString('es-AR');
if(!C||!A){throw new Error('Frutástrofe: faltan core o arte')}
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0x070b23,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
$('view').append(renderer.domElement);
const art=A.create(THREE,renderer),ray=new THREE.Raycaster(),point=new THREE.Vector2(),look=new THREE.Vector3();
const arMarker=new THREE.Mesh(new THREE.RingGeometry(.11,.16,48),new THREE.MeshBasicMaterial({color:0xd9ff62,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));arMarker.rotation.x=-Math.PI/2;arMarker.visible=false;art.scene.add(arMarker);
const params=new URLSearchParams(location.search);
let progress={unlocked:1,stars:{},coins:0,best:0,scores:{}};
try{const o=JSON.parse(localStorage.getItem('mc-frutastrofe-save-v1')||'{}');if(o&&typeof o==='object')progress={...progress,...o,stars:o.stars||{},scores:o.scores||{}}}catch(e){}
const save=()=>{try{localStorage.setItem('mc-frutastrofe-save-v1',JSON.stringify(progress))}catch(e){}};
let g=null,view='home',selected=1,preferAR=false,isAR=false,arSession=null,hitSource=null,anchor=null,placement=null,reticle=null,glHit=false,arHitResult=null,arViewerSpace=null;
let lastTime=0,lastHud=0,toastUntil=0,pulseUntil=0,paused=false,musicEnabled=true,lastMusic=0,wasLost=false;
let duel=null,musicCtx=null,touchAim=new THREE.Vector2(0,0),lastPointer=null;
const show=name=>{view=name;for(const n of ['home','selector','hud','readyOverlay','pausePanel','results','arPanel'])$(n).style.display=n===name?(n==='hud'||n==='home'?'flex':'flex'):'none';};
function progressUI(){
 $('coinsHome').textContent='◉ '+number(progress.coins);
 $('levelGrid').innerHTML='';
 for(let i=1;i<=10;i++){
  const b=document.createElement('button');b.className='lvl'+(i===selected?' current':'');b.disabled=i>progress.unlocked;b.innerHTML='<b>'+(i===10?'♛':String(i).padStart(2,'0'))+'</b><em>'+(i<=progress.unlocked?'★'.repeat(progress.stars[i]||0)||'· · ·':'🔒')+'</em>';
  b.onclick=()=>{selected=i;progressUI()};$('levelGrid').append(b);
 }
 const cfg=C.LEVELS[selected-1];
 $('levelInfo').textContent='NIVEL '+selected+' · '+cfg.name+' · '+(cfg.goal==='combos'?'Completá '+cfg.target+' cadenas':cfg.goal==='citrus'?'Destruí '+cfg.target+' cítricos':cfg.goal==='boss'?'Derrotá a la Sandía Gigante':cfg.goal==='clean'?'Sumá '+number(cfg.target)+' puntos sin más de '+cfg.maxErrors+' fallo(s)':'Alcanzá '+number(cfg.target)+' puntos')+' · '+cfg.duration+' segundos';
 $('choose3D').classList.toggle('on',!preferAR);$('chooseAR').classList.toggle('on',preferAR);
}
function alertTxt(text,ms=1350){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+ms}
function tone(freq=600,duration=.10,type='sine',vol=.08,offset=0){
 if(!musicEnabled)return;
 try{musicCtx=musicCtx||new(window.AudioContext||window.webkitAudioContext)();musicCtx.resume?.();const t=musicCtx.currentTime+offset,osc=musicCtx.createOscillator(),gain=musicCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.67),t+duration);gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.0002,t+duration);osc.connect(gain);gain.connect(musicCtx.destination);osc.start(t);osc.stop(t+duration+.01)}catch(e){}
}
function fxSound(type){if(type==='shot')tone(280,.085,'triangle',.07);if(type==='hit')tone(440,.095,'sine',.075);if(type==='trap'){tone(160,.3,'sawtooth',.1);navigator.vibrate?.([45,40,45])}if(type==='chain'){tone(600,.16,'sine',.11);tone(800,.14,'sine',.08,.09);tone(1040,.18,'sine',.10,.18);navigator.vibrate?.([18,26,28])}if(type==='boss'){tone(180,.25,'sawtooth',.12);tone(440,.32,'triangle',.12,.11)}}
function moodMusic(t){if(!musicEnabled||!g||g.state!=='playing'||t-lastMusic<.34)return;lastMusic=t;const beat=Math.floor(g.elapsed*3);if(beat%2===0)tone([220,247,277,330][Math.floor(beat/2)%4],.07,'triangle',.018)}
function events(){
 if(!g)return;for(const ev of g.events.splice(0)){
  if(ev.type==='hit'){art.burst(ev.x,ev.y,ev.z,ev.kind,14);fxSound('hit')}
  if(ev.type==='splash')art.burst(ev.x,ev.y,ev.z,ev.kind,9);
  if(ev.type==='trap'){art.burst(ev.x,ev.y,ev.z,'bomb',22);fxSound('trap');alertTxt('¡TRAMPA! − PUNTOS',900)}
  if(ev.type==='chain'){art.burst(ev.x,ev.y,ev.z,'rainbow',30);fxSound('chain');alertTxt('JUICE CHAIN ×'+Math.min(5,1+Math.floor(ev.combo/2)),1300)}
  if(ev.type==='rainbow')alertTxt('¡EXPLOSIÓN ARCOÍRIS!',1100);
  if(ev.type==='slow')alertTxt('¡TIEMPO HELADO!',950);
  if(ev.type==='gold')alertTxt('¡FRUTA DORADA!',950);
  if(ev.type==='boss-hit'){art.burst(ev.x,ev.y,ev.z,'boss',28);fxSound('boss')}
  if(ev.type==='boss-down'){fxSound('chain');alertTxt('¡SANDÍA DERROTADA!',1800)}
  if(ev.type==='finish')handleFinish(ev);
 }
}
function getSeed(){const s=params.get('seed');return s&&/^\d+$/.test(s)?Number(s)>>>0:undefined}
function createGame(mode='campaign',level=selected,seed){
 if(isAR&&arSession&&!placement){throw new Error('Primero fijá la pista AR')}
 g=C.create({mode,level,seed:seed??getSeed()});art.reset();paused=false;lastHud=0;
 $('readyEyebrow').textContent=mode==='arcade'?'DESAFÍO ARCADE':'NIVEL '+String(level).padStart(2,'0');
 $('readyTitle').textContent=duel?'JUGADOR '+duel.turn+' · '+g.cfg.name:g.cfg.name;
 $('readyDescription').textContent=g.cfg.goal==='boss'?'La Sandía Gigante tiene 12 puntos débiles. ¡Apuntá con precisión!':g.cfg.goal==='combos'?'¡Conseguí '+g.cfg.target+' cadenas de tres frutas iguales!':'Dispará a las frutas, encadená tres iguales y evitá las bombas. ¡Completá el objetivo antes de que acabe el tiempo!';
 $('playTip').textContent=isAR?'APUNTÁ CON EL TELÉFONO · TOCÁ ¡PUM!':'TOCÁ FRUTAS O APUNTÁ Y TOCÁ ¡PUM!';$('recenterBtn').style.display=isAR?'inline-block':'none';
 $('hudBest').textContent=number(progress.best);
 show('readyOverlay');
}
function play(mode='campaign',level=selected,seed){createGame(mode,level,seed)}
function hudUpdate(){
 if(!g||view!=='hud')return;
 const goal=g.goalStatus();
 $('hudScore').textContent=number(g.score);$('hudCombo').textContent='×'+g.multiplier;
 $('hudTime').textContent=Math.max(0,Math.ceil(g.duration-g.elapsed));
 $('goalName').textContent=goal.label+' · '+g.cfg.name;
 $('goalNums').textContent=number(goal.current)+' / '+number(goal.target);
 $('goalBar').style.width=(100*goal.progress).toFixed(1)+'%';
 $('hudBest').textContent=number(Math.max(progress.best,g.score));
}
function handleFinish(ev){
 paused=false;
 if(!duel){
  progress.best=Math.max(progress.best,g.score);
  if(g.mode==='campaign'){const prev=progress.stars[g.level]||0;if(ev.win){progress.stars[g.level]=Math.max(prev,g.stars);progress.unlocked=Math.max(progress.unlocked,Math.min(10,g.level+1))}}
  const k=g.mode==='arcade'?'arcade':'level'+g.level;progress.scores[k]=Math.max(progress.scores[k]||0,g.score);
  const coins=Math.max(5,Math.floor(g.score/65))+g.stars*12;progress.coins+=coins;save();$('resultCoins').textContent='+'+coins;
 }else{$('resultCoins').textContent='—';if(duel.turn===1){duel.first=g.score}else{duel.second=g.score}}
 $('resultTop').textContent=duel?'DUELO LOCAL · TURNO '+duel.turn:g.mode==='arcade'?'FIN DEL ARCADE':'NIVEL '+g.level+' COMPLETADO';
 $('resultStars').textContent=g.stars?'★'.repeat(g.stars)+'☆'.repeat(3-g.stars):'☆☆☆';
 $('resultTitle').textContent=duel&&duel.turn===2?(duel.second===duel.first?'¡EMPATE!':(duel.second>duel.first?'¡GANA JUGADOR 2!':'¡GANA JUGADOR 1!')):ev.win?'¡SÚPER JUGADA!':'¡CASI LO TENÉS!';
 $('resultScore').textContent=number(g.score);$('resultAccuracy').textContent=Math.round(g.hits/Math.max(1,g.shots)*100)+'%';$('resultChains').textContent=g.chains;
 if(duel&&duel.turn===2)$('resultTop').textContent='JUGADOR 1: '+number(duel.first)+' · JUGADOR 2: '+number(duel.second);
 $('nextBtn').style.display=duel&&duel.turn===1?'block':(!duel&&ev.win&&g.mode==='campaign'&&g.level<10?'block':'none');
 if(duel&&duel.turn===1)$('nextBtn').textContent='▶ TURNO JUGADOR 2';else $('nextBtn').textContent='▶ SIGUIENTE NIVEL';
 show('results');progressUI();
}
function resetToMenu(){arMarker.visible=false;$('recenterBtn').style.display='none';if(arSession){arSession.end().catch(()=>{});arSession=null}isAR=false;placement=null;hitSource=null;anchor=null;duel=null;g=null;paused=false;art.world.scale.setScalar(1);art.world.position.set(0,0,0);renderer.setClearColor(0x070b23,1);art.scene.background=new THREE.Color(0x070b23);art.reset();show('home');}
function matchFromResults(){
 if(duel&&duel.turn===1){duel.turn=2;play('arcade',1,duel.seed);return}
 if(!duel&&g?.mode==='campaign'&&g.level<10){selected=g.level+1;play('campaign',selected);return}
 resetToMenu();
}
function shareChallenge(){
 if(!g)return;const link=new URL(location.pathname,location.origin);link.searchParams.set('seed',g.seed);link.searchParams.set('mode',g.mode);if(g.mode==='campaign')link.searchParams.set('level',g.level);
 const txt='🍓 FRUTÁSTROFE · Hice '+number(g.score)+' puntos. ¿Me superás? '+link.toString();
 if(navigator.share){navigator.share({title:'FRUTÁSTROFE',text:txt}).catch(()=>{})}else{navigator.clipboard?.writeText(txt).then(()=>alertTxt('¡RETO COPIADO!',1300)).catch(()=>prompt('Compartí el enlace:',txt))}
}
function startPlay(){if(!g)return;g.begin();show('hud');hudUpdate();tone(610,.16,'triangle',.1);tone(850,.16,'triangle',.08,.12)}
function fireAt(x,y){
 if(!g||g.state!=='playing'||paused||view!=='hud')return;
 point.set(x,y);const cam=isAR&&renderer.xr.isPresenting?renderer.xr.getCamera(art.camera):art.camera;
 ray.setFromCamera(point,cam);
 const targets=[...art.bodies.values()];const hits=ray.intersectObjects(targets,true);
 let id=null;
 if(hits.length)id=hits[0].object.userData.targetId;
 if(!id){
  // Limited assistance for touch/controller jitter; rejects behind-camera and offscreen targets.
  let best=.072;
  for(const [k,mesh] of art.bodies){
   const p=mesh.getWorldPosition(new THREE.Vector3()).project(cam);if(p.z<0||p.z>1)continue;
   const dist=Math.hypot(p.x-x,p.y-y);if(dist<best){best=dist;id=k}
  }
 }
 const result=g.shoot(id);fxSound('shot');pulseUntil=performance.now()+80;const ret=$('crosshair');ret.style.transform='translate(-50%,-50%) scale(.8)';setTimeout(()=>{ret.style.transform='translate(-50%,-50%)'},80);
 events();hudUpdate();return result;
}
function cursorShoot(e){if(view!=='hud'||isAR)return;const rect=renderer.domElement.getBoundingClientRect();const nx=((e.clientX-rect.left)/rect.width)*2-1,ny=-((e.clientY-rect.top)/rect.height)*2+1;touchAim.set(nx,ny);fireAt(nx,ny)}
renderer.domElement.addEventListener('pointerdown',cursorShoot);
renderer.domElement.addEventListener('pointermove',e=>{if(isAR||view!=='hud')return;const rect=renderer.domElement.getBoundingClientRect();touchAim.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));const h=$('crosshair');h.style.left=e.clientX+'px';h.style.top=e.clientY+'px'});
$('fireBtn').onpointerdown=e=>{e.preventDefault();fireAt(isAR?0:touchAim.x,isAR?0:touchAim.y)};
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();fireAt(isAR?0:touchAim.x,isAR?0:touchAim.y)}if(e.code==='Escape'&&view==='hud')pauseGame()});
function pauseGame(){if(!g||g.state!=='playing')return;paused=true;show('pausePanel')}
$('pauseBtn').onclick=pauseGame;
$('resumeBtn').onclick=()=>{paused=false;show('hud')};
$('quitBtn').onclick=resetToMenu;
$('soundHome').onclick=()=>{musicEnabled=!musicEnabled;$('soundHome').textContent=musicEnabled?'♫ SONIDO':'♫ SILENCIO';tone(660)};
$('campaign').onclick=()=>{duel=null;preferAR=false;progressUI();show('selector')};
$('arcade').onclick=()=>{duel=null;preferAR=false;play('arcade',1)};
$('versus').onclick=()=>{duel={seed:C.challengeSeed(new Date().toISOString().slice(0,10))^((Math.random()*1e7)|0),turn:1,first:0,second:0};preferAR=false;play('arcade',1,duel.seed)};
$('selectorBack').onclick=e=>{e.preventDefault();show('home')};
$('choose3D').onclick=()=>{preferAR=false;progressUI()};
$('chooseAR').onclick=()=>{preferAR=true;progressUI()};
$('levelPlay').onclick=()=>{if(preferAR)startAR('campaign',selected);else play('campaign',selected)};
$('arStart').onclick=()=>{duel=null;startAR('arcade',1)};
$('goBtn').onclick=startPlay;
$('readyBack').onclick=resetToMenu;
$('nextBtn').onclick=matchFromResults;
$('replayBtn').onclick=()=>{if(duel){duel.turn=1;duel.first=duel.second=0;play('arcade',1,duel.seed)}else play(g.mode,g.level,g.seed)};
$('menuBtn').onclick=resetToMenu;
$('shareBtn').onclick=shareChallenge;
let nextAR={mode:'arcade',level:1};
async function startAR(mode,level){
 nextAR={mode,level};
 if(!navigator.xr||!window.isSecureContext){alert('La realidad aumentada requiere HTTPS y Chrome Android con WebXR/ARCore. Podés jugar en 3D sin instalar nada.');return}
 try{
  if(!await navigator.xr.isSessionSupported('immersive-ar'))throw Error('Este dispositivo no es compatible con AR inmersiva.');
  art.reset();art.world.visible=false;renderer.setClearColor(0,0);art.scene.background=null;art.scene.fog=null;
  const opts={requiredFeatures:['hit-test','local-floor','dom-overlay'],optionalFeatures:['anchors'],domOverlay:{root:document.body}};
  arSession=await navigator.xr.requestSession('immersive-ar',opts);
  isAR=true;await renderer.xr.setSession(arSession);
  renderer.xr.getReferenceSpace();
  const viewerSpace=await arSession.requestReferenceSpace('viewer');arViewerSpace=viewerSpace;
  hitSource=await arSession.requestHitTestSource({space:viewerSpace});
  placement=null;glHit=false;anchor=null;arHitResult=null;arMarker.visible=false;art.world.scale.setScalar(.43);
  show('arPanel');$('arLock').disabled=true;
  $('arTitle').textContent='BUSCÁ EL PISO';$('arMessage').textContent='Apuntá a un suelo despejado. Cuando aparezca LISTO PARA FIJAR, tocá el botón.';
  Object.assign($('arPanel').style,{background:'transparent',alignItems:'flex-end',backdropFilter:'none'});
  Object.assign($('arPanel').querySelector('.modal').style,{background:'#100c2bd9',maxWidth:'440px',padding:'13px',marginBottom:'12px'});
  arSession.addEventListener('end',()=>{isAR=false;arSession=null;hitSource=null;anchor=null;placement=null;art.world.visible=true;art.world.scale.setScalar(1);art.world.position.set(0,0,0);art.scene.background=new THREE.Color(0x070b23);art.scene.fog=new THREE.FogExp2(0x090d25,.021);$('arPanel').removeAttribute('style');$('arPanel').querySelector('.modal').removeAttribute('style');if(view==='hud'||view==='arPanel'||view==='readyOverlay'||view==='pausePanel')resetToMenu()},{once:true});
 }catch(err){console.warn('Frutástrofe AR:',err);isAR=false;art.world.visible=true;art.scene.background=new THREE.Color(0x070b23);art.world.scale.setScalar(1);alert('No se pudo abrir AR: '+err.message+'\nEl modo 3D sigue disponible.');show('home')}
}
$('arLock').onclick=async()=>{
 if(!glHit||!reticle||!arSession)return;
 placement=reticle.clone();art.world.position.copy(placement.position);art.world.quaternion.identity();art.world.visible=true;arMarker.visible=false;
 if(arHitResult&&typeof arHitResult.createAnchor==='function'){try{anchor=await arHitResult.createAnchor()}catch(e){console.warn('Ancla no disponible, usando pose fija del piso:',e.message)}}
 $('arLock').disabled=true;hitSource?.cancel?.();hitSource=null;
 // The scene is fixed in local-floor coordinates; moving the device NEVER rewrites the anchor transform.
 if(g&&paused){paused=false;show('hud');}else createGame(nextAR.mode,nextAR.level);
};
$('arCancel').onclick=resetToMenu;
$('recenterBtn').onclick=async()=>{
 if(!arSession||!isAR)return;
 paused=true;anchor?.delete?.();anchor=null;placement=null;arHitResult=null;art.world.visible=false;arMarker.visible=false;glHit=false;
 try{hitSource=await arSession.requestHitTestSource({space:arViewerSpace})}catch(e){alertTxt('NO SE PUDO RECENTRAR');paused=false;show('hud');return}
 $('arLock').disabled=true;$('arTitle').textContent='RECENTRANDO PISTA';
 $('arMessage').textContent='Apuntá a un nuevo sector despejado y fijá otra vez. La puntuación y el reloj se conservan.';show('arPanel');
};
function arFrame(frame){
 if(!isAR||!frame)return;
 const ref=renderer.xr.getReferenceSpace();if(!ref)return;
 if(anchor){const pose=frame.getPose(anchor.anchorSpace,ref);if(pose&&placement)art.world.position.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z)}
 if(!hitSource||placement)return;
 const hits=frame.getHitTestResults(hitSource);
 if(hits.length){
  const p=hits[0].getPose(ref);
  if(p){arHitResult=hits[0];reticle=new THREE.Object3D();reticle.position.set(p.transform.position.x,p.transform.position.y,p.transform.position.z);arMarker.position.copy(reticle.position);arMarker.position.y+=.025;arMarker.visible=true;glHit=true;$('arLock').disabled=false;$('arTitle').textContent='LISTO PARA FIJAR';$('arMessage').textContent='Fijá la arena delante tuyo. El escenario quedará anclado al piso; jugá sin caminar.'}
 }else{glHit=false;arHitResult=null;arMarker.visible=false;$('arLock').disabled=true;$('arTitle').textContent='BUSCÁ EL PISO'}
}
function onFrame(t,frame){
 const sec=t/1000,dt=clamp(lastTime?sec-lastTime:0,0,.35);lastTime=sec;
 if(isAR)arFrame(frame);
 if(g&&view==='hud'&&g.state==='playing'&&!paused){let simulationRemaining=dt;while(simulationRemaining>.0001&&g.state==='playing'){const step=Math.min(.05,simulationRemaining);g.update(step);simulationRemaining-=step}events();if(t-lastHud>95){hudUpdate();lastHud=t}moodMusic(sec)}
 if(!g&&view==='home'&&!isAR){
  const kinds=['strawberry','orange','watermelon','apple','lemon','gold','ice','rainbow','strawberry','orange','apple','lemon'];
  const mock=kinds.map((kind,i)=>({id:10000+i,kind,x:Math.sin(i*2.4)*2.65,y:1.1+(i%4)*.82+Math.sin(sec*.9+i)*.28,z:Math.cos(i*2.3)*.35,rot:sec*(.42+(i%3)*.14),dead:false}));
  art.sync(mock,sec);
 }else if(g){art.sync(g.objects,g.elapsed)}
 if(!isAR&&view!=='home'&&!g)art.sync([],sec);
 if(view==='hud'&&g?.fever&&Math.floor(g.elapsed)===g.duration-12&&t-lastHud<110)alertTxt('⚡ ¡JUICE FEVER!',1250);
 art.updateFx(Math.min(dt,.08),sec);
 if(toastUntil&&performance.now()>toastUntil){$('toast').classList.remove('show');toastUntil=0}
 if(view==='home'&&!isAR)art.camera.position.x=Math.sin(sec*.18)*.45;
 renderer.render(art.scene,art.camera);
}
renderer.setAnimationLoop(onFrame);
function resize(){const w=innerWidth,h=innerHeight;art.camera.aspect=w/h;art.camera.fov=h>w?52:48;art.camera.updateProjectionMatrix();renderer.setSize(w,h);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7))}
addEventListener('resize',resize);resize();
progressUI();show('home');
if(params.has('qa'))window.__frutaQA={state:()=>({view,elapsed:g?.elapsed,score:g?.score,objects:g?.objects.length,status:g?.state,frames:renderer.info.render.frame}),finish:()=>g?.finish(true)};
if(params.has('seed')){const l=clamp(Number(params.get('level')||1),1,10),m=params.get('mode')==='arcade'?'arcade':'campaign';if(m==='arcade'||l<=progress.unlocked){duel=null;play(m,l,getSeed())}}
