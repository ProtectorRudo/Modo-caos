'use strict';
/* OLA ROJA — controlador AR + laboratorio 2D.
 * La pista queda fijada por /engine.js. WebXR rastrea el teléfono, NO los pies.
 * El motor de reglas jamás depende de la proyección o de los FPS. */
(function(){
const $=id=>document.getElementById(id),G=window.OlaRojaCore,A=window.OlaRojaArt;
if(!G||!A){console.error('OLA ROJA: dependencias ausentes');return}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),TAU=Math.PI*2;
let tileMeters=.45,renderer=null,canvas=null,demo=false,mode='clasico';
window.modoCaosGestureConfig=Object.freeze({
 min:.30,max:.64,step:.025,label:value=>{tileMeters=value;return (value*6).toFixed(2).replace('.',',')+' m'}
});
window.modoCaosLockReady=()=>!!renderer;
let game=G.make({tileMeters}),calibrated=false,selectedCell=null,sampling=false,
 sampleStart=0,samples=[],origin=null,smoothed=null,previous=null,lastGood=0,invalidSince=0,
 status='intro',running=false,finished=false,lastFrame=0,lastHUD=0,lastEvent=0,noticeUntil=0,
 picker=false,arBooted=false,muted=false,audio=null,best=0,target=null,keys=new Set(),trackingFrozen=false,recoverySince=0;
const KEY='modo-caos-ola-roja-records-v1';
try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');best=Number(r.clasico)||0}catch(_){}
$('record').textContent='🏆 RÉCORD PERSONAL: '+Math.round(best).toLocaleString('es-AR')+' PUNTOS';
function speak(f=680,d=.12,type='sine',volume=.06){
 if(muted)return;
 try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume?.();
 const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
 osc.type=type;osc.frequency.setValueAtTime(f,t);
 osc.frequency.exponentialRampToValueAtTime(Math.max(80,f*.62),t+d);
 gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+d);
 osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+d+.01);
 }catch(_){}
}
function vibrate(p){try{navigator.vibrate?.(p)}catch(_){}}
function toast(msg,d=1200){$('toast').textContent=msg;noticeUntil=performance.now()+d}
function label(text){$('safety').textContent=text}
function hud(){
 $('time').textContent=mode==='infinito'?Math.floor(game.elapsed)+'″':Math.max(0,Math.ceil(90-game.elapsed));
 $('lives').textContent='♥'.repeat(game.lives)+'♡'.repeat(3-game.lives);
 $('score').textContent=Math.round(game.score).toLocaleString('es-AR');
 $('banner').textContent=game.stage==='countdown'?'ARRANCAMOS EN '+Math.ceil(game.countdown):
  (game.stage==='playing'?G.phases(game.elapsed)+(game.shield?' · 🛡 ESCUDO':''):'');
 if(demo&&game.stage==='playing')$('whereAmI').textContent='📍 VOS · FILA '+(game.cell.r+1)+' · COLUMNA '+(game.cell.c+1);
}
function consume(){
 for(const e of game.fx){
  if(e.id<=lastEvent)continue;lastEvent=e.id;
  if(e.type==='hit'){toast(e.label,950);speak(180,.36,'sawtooth',.12);vibrate([90,30,120]);$('overlay').classList.add('hit');setTimeout(()=>$('overlay').classList.remove('hit'),260)}
  if(e.type==='shield'){toast(e.label,1100);speak(1120,.29,'triangle');vibrate(65)}
  if(e.type==='bonus'||e.type==='warning'){toast(e.label,1050);speak(910,.20,'triangle')}
  if(e.type==='dodge'){if(game.combo%3===0){toast('⚡ '+game.combo+' OLAS ESQUIVADAS',750);speak(1100,.15)}}
  if(e.type==='wave'){speak(485,.08,'triangle',.035)}
  if(e.type==='start'){toast('🔴 ESQUIVÁ LAS BALDOSAS ROJAS',1300);speak(820,.22)}
  if(e.type==='finish')showResult();
 }
}
function record(){
 const value=mode==='infinito'?Math.floor(game.elapsed):Math.round(game.score);
 try{const all=JSON.parse(localStorage.getItem(KEY)||'{}');all[mode]=Math.max(value,Number(all[mode])||0);localStorage.setItem(KEY,JSON.stringify(all));best=all[mode]}catch(_){best=Math.max(best,value)}
}
function showResult(){
 if(finished)return;finished=true;running=false;record();
 $('result').style.display='flex';$('pause').style.display='none';$('recalibrateLive').style.display='none';$('statusPanel').style.display='none';
 $('resultTitle').textContent=game.finishReason==='victoria'?'🏆 ¡SOBREVIVISTE!':'💥 ¡TE ATRAPÓ LA OLA!';
 $('resultsMeta').textContent='SOBREVIVISTE '+Math.floor(game.elapsed)+' SEGUNDOS · '+Math.round(game.score).toLocaleString('es-AR')+
 ' PUNTOS · '+game.dodges+' OLAS ESQUIVADAS · RÉCORD '+Math.round(best).toLocaleString('es-AR')+
 (demo?' · DEMO 2D':'');
 speak(game.finishReason==='victoria'?1100:270,.43,'triangle',.09);
}
function reset(nextMode=mode){
 mode=nextMode;game=G.make({mode,tileMeters,seed:Math.floor(Math.random()*4294967295)});
 running=false;finished=false;lastFrame=0;lastEvent=0;trackingFrozen=false;recoverySince=0;target=null;status='fixed';
 $('result').style.display='none';$('pauseDialog').style.display='none';
 $('gameHud').style.display='flex';$('statusPanel').style.display='flex';
 $('gameActions').style.display='flex';$('begin').disabled=!calibrated;
 $('pause').style.display='none';$('recalibrateLive').style.display='none';picker=false;sampling=false;hidePicker();
 if(calibrated&&selectedCell!==null)G.setPosition(game,selectedCell%6+.5,Math.floor(selectedCell/6)+.5);
 label(calibrated?'Pista fija · MOVETE DE VERDAD para esquivar.':'Tocá dónde estás sobre la pista para calibrar');
 hud();
}
function begin(){
 if(!calibrated||running||finished||sampling||picker)return;
 game.tileMeters=tileMeters;if(!G.start(game))return;
 running=true;status='playing';lastFrame=0;trackingFrozen=false;recoverySince=0;
 $('gameActions').style.display='none';$('calBox').style.display='none';
 $('pause').style.display='block';$('recalibrateLive').style.display=demo?'none':'block';$('gameHud').style.display='flex';
 $('head').style.display='none';$('banner').style.display='block';
 label('ESQUIVÁ LAS BALDOSAS ROJAS. ¡MOVETE DE VERDAD!');
 toast('🔴 ¡ESQUIVÁ LAS ROJAS!',1800);speak(830,.2);
}
function pauseGame(){
 if(!running)return;game.paused=true;$('pauseDialog').style.display='flex';
}
function resumeGame(){
 if(!running)return;game.paused=false;$('pauseDialog').style.display='none';lastFrame=0;
}
function uiFixed(){
 if(demo||status==='fixed'||status==='playing'||status==='finished')return;
 status='fixed';$('head').style.display='none';$('lock').style.display='none';
 $('statusPanel').style.display='flex';$('gameActions').style.display='flex';
 $('gameHud').style.display='flex';$('begin').disabled=true;
 $('calBox').style.display='block';label('Elegí la casilla donde estás de pie · después un segundo quieto');
 picker=true;selectedCell=null;calibrated=false;sampling=false;
 $('calTitle').textContent='👣 TOCÁ TU CASILLA EN EL PISO';
 $('calFill').style.width='0%';toast('📍 ELEGÍ LA CASILLA DE TUS PIES',1700);
}
const NS='http://www.w3.org/2000/svg',svg=$('arenaSvg'),poly=[];
for(let i=0;i<36;i++){const el=document.createElementNS(NS,'polygon');
 el.setAttribute('fill','#49d4f7');el.setAttribute('fill-opacity','.12');el.setAttribute('stroke','#b6fff6');
 el.setAttribute('stroke-width','2');el.style.display='none';el.dataset.cell=i;
 el.addEventListener('click',()=>selectCell(i));svg.appendChild(el);poly.push(el)}
const marker=document.createElementNS(NS,'circle');marker.setAttribute('fill','#b7fff5');
marker.setAttribute('stroke','#154d69');marker.setAttribute('stroke-width','4');
marker.setAttribute('r','12');marker.style.pointerEvents='none';svg.appendChild(marker);
const markerText=document.createElementNS(NS,'text');markerText.setAttribute('text-anchor','middle');
markerText.setAttribute('fill','#fff');markerText.setAttribute('font-weight','900');
markerText.setAttribute('font-size','15');markerText.style.pointerEvents='none';markerText.textContent='VOS';
svg.appendChild(markerText);
function hidePicker(){for(const p of poly)p.style.display='none';marker.style.display='none';markerText.style.display='none';svg.style.pointerEvents='none'}
function selectCell(i){
 if(demo||!(picker||status==='playing')||i<0||i>=36)return;
 if(status==='playing'){game.paused=true;$('pauseDialog').style.display='none'}
 selectedCell=i;picker=false;sampling=true;calibrated=false;sampleStart=0;samples=[];smoothed=null;previous=null;
 $('calTitle').textContent='✓ CELDA '+(Math.floor(i/6)+1)+'-'+(i%6+1)+' · QUIETO 1 SEGUNDO';
 $('calFill').style.width='0%';$('begin').disabled=true;
 hidePicker();label('Calibrando posición del TELÉFONO · mantenelo quieto un segundo');
}
$('calCenter').addEventListener('click',()=>selectCell(3*6+3));
function sample(t,p){
 if(!sampling)return;
 if(!p){sampleStart=0;samples=[];return}
 if(!sampleStart)sampleStart=t;
 samples.push(p);if(samples.length>65)samples.shift();
 const xs=samples.map(v=>v.x),zs=samples.map(v=>v.z);
 if(Math.max(...xs)-Math.min(...xs)>.075||Math.max(...zs)-Math.min(...zs)>.075){
  samples=samples.slice(-3);sampleStart=t;return
 }
 $('calFill').style.width=Math.round(clamp((t-sampleStart)/1050,0,1)*100)+'%';
 if(t-sampleStart>=1050&&samples.length>=12){
  const avg={x:samples.reduce((s,v)=>s+v.x,0)/samples.length,z:samples.reduce((s,v)=>s+v.z,0)/samples.length};
  const c=selectedCell%6,r=Math.floor(selectedCell/6);
  origin={x:avg.x-(c+.5)*tileMeters,z:avg.z-(r+.5)*tileMeters};
  smoothed={...avg};previous={...avg};lastGood=t;invalidSince=0;
  sampling=false;calibrated=true;trackingFrozen=running;recoverySince=running?t:0;
  if(!running)game.paused=false;
  G.setPosition(game,c+.5,r+.5);
  $('calTitle').textContent='✅ CASILLA '+(r+1)+'-'+(c+1)+' · LISTO';
  $('calFill').style.width='100%';$('begin').disabled=false;
  $('whereAmI').style.display='block';$('whereAmI').textContent='📍 VOS · FILA '+(r+1)+' · COLUMNA '+(c+1);
  toast('✅ POSICIÓN CALIBRADA',1250);speak(1100,.15);
  setTimeout(()=>{if(calibrated&&!sampling)$('calBox').style.display='none'},950);
 }
}
function localPose(frame,W){
 try{
  const p=frame.getViewerPose(ref);if(!p||p.emulatedPosition)return null;
  const v=p.transform.position,dx=v.x-W[12],dz=v.z-W[14];
  const x=W[0]*dx+W[2]*dz,z=W[8]*dx+W[10]*dz;
  return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:null;
 }catch(_){return null}
}
function motion(t,pos){
 if(!pos)return false;
 if(previous&&Math.hypot(pos.x-previous.x,pos.z-previous.z)>.34){
  game.paused=true;calibrated=false;picker=true;
  $('gameActions').style.display='flex';$('calBox').style.display='block';
  $('calTitle').textContent='📡 SEGUIMIENTO CAMBIÓ · RECALIBRÁ';
  toast('⚠️ RECALIBRÁ PARA EVITAR UNA COLISIÓN INJUSTA',1800);
  label('El seguimiento espacial saltó: la pista sigue fija. Volvé a marcar tu casilla.');
  previous=pos;return false;
 }
 previous={...pos};
 if(!smoothed)smoothed={...pos};
 const blend=.24;smoothed.x+=(pos.x-smoothed.x)*blend;smoothed.z+=(pos.z-smoothed.z)*blend;
 const x=(smoothed.x-origin.x)/tileMeters,z=(smoothed.z-origin.z)/tileMeters;
 if(x<-.20||x>6.20||z<-.20||z>6.20){
  game.paused=true;label('⚠️ LÍMITE DE PISTA · VOLVÉ A UN ÁREA DESPEJADA');return false;
 }
 G.setPosition(game,clamp(x,0.001,5.999),clamp(z,.001,5.999));lastGood=t;
 $('whereAmI').textContent='📍 VOS · FILA '+(game.cell.r+1)+' · COLUMNA '+(game.cell.c+1);
 return true;
}
function mat(a,b){return A.mul(a,b)}
function project(m,x,y,z,w,h){
 const tx=m[0]*x+m[4]*y+m[8]*z+m[12],ty=m[1]*x+m[5]*y+m[9]*z+m[13],tw=m[3]*x+m[7]*y+m[11]*z+m[15];
 return tw>.02&&Number.isFinite(tx/tw)?[(tx/tw+1)*w/2,(1-ty/tw)*h/2]:null;
}
function drawPick(frame,W){
 if(!picker&&!calibrated){hidePicker();return}
 const vp=frame.getViewerPose(ref),view=vp?.views?.[0];if(!view)return;
 const w=innerWidth,h=innerHeight,m=mat(view.projectionMatrix,mat(view.transform.inverse.matrix,W));
 svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.style.pointerEvents=picker?'auto':'none';
 for(let i=0;i<36;i++){
  const p=poly[i];
  if(!picker){p.style.display='none';continue}
  const r=Math.floor(i/6),c=i%6,x=(c-3)*tileMeters,z=(r-3)*tileMeters,k=tileMeters*.47;
  const corners=[[x-k+tileMeters*.5,.105,z-k+tileMeters*.5],[x+k+tileMeters*.5,.105,z-k+tileMeters*.5],
   [x+k+tileMeters*.5,.105,z+k+tileMeters*.5],[x-k+tileMeters*.5,.105,z+k+tileMeters*.5]]
   .map(q=>project(m,...q,w,h));
  if(corners.some(q=>!q)){p.style.display='none';continue}
  p.style.display='block';p.setAttribute('points',corners.map(q=>q.join(',')).join(' '));
 }
 const point=calibrated?project(m,(game.pos.x-3)*tileMeters,.12,(game.pos.z-3)*tileMeters,w,h):null;
 marker.style.display=markerText.style.display=point?'block':'none';
 if(point){marker.setAttribute('cx',point[0]);marker.setAttribute('cy',point[1]);
  markerText.setAttribute('x',point[0]);markerText.setAttribute('y',point[1]-19)}
}
function gameTick(dt,t){
 if(!running)return;
 if(demo){
  if(target){
   const dx=target.x-game.pos.x,dz=target.z-game.pos.z,d=Math.hypot(dx,dz);
   if(d<.045)target=null;
   else{const speed=clamp(.78/tileMeters,1,3.5),step=Math.min(d,speed*dt);
    G.setPosition(game,game.pos.x+dx/d*step,game.pos.z+dz/d*step)}
  }
  let x=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a')),
      z=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
  const len=Math.hypot(x,z);if(len>0)G.setPosition(game,game.pos.x+x/len*dt*1.6,game.pos.z+z/len*dt*1.6);
 }
 G.tick(game,dt);consume();
 if(t-lastHUD>80){hud();lastHUD=t}
}
function arFrame(t,frame,W){
 const gap=lastFrame?t-lastFrame:0;
 const dt=lastFrame?clamp(gap/1000,.001,.065):.016;lastFrame=t;
 // Se reanudó XR tras perder fotogramas: congelar antes de evaluar una colisión.
 if(running&&gap>460){trackingFrozen=true;recoverySince=0;game.paused=true}
 try{
  if(!W)return;
  const pos=localPose(frame,W);
  if(sampling)sample(t,pos);
  if(calibrated){
   if(pos&&motion(t,pos)){
    invalidSince=0;
    if(trackingFrozen&&running){
     if(!recoverySince)recoverySince=t;
     if(t-recoverySince>=500){
      trackingFrozen=false;recoverySince=0;
      if(!$('pauseDialog').offsetParent)game.paused=false;
      label('✅ SEGUIMIENTO RECUPERADO · ESQUIVÁ LAS ROJAS');
     }
    }
   }else if(running){
    // Incluso un solo fotograma perdido se congela: cero eliminaciones injustas.
    const firstLost=!trackingFrozen;
    trackingFrozen=true;recoverySince=0;game.paused=true;
    if(firstLost)label('📡 SEGUIMIENTO PERDIDO · COLISIONES PAUSADAS');
   }
  }
  if(running)gameTick(dt,t);
  renderer?.render(frame,ref,W,game,tileMeters,{preview:stage==='preview'||stage==='search',calibrating:picker,calibrated});
  drawPick(frame,W);
  if(!running&&t-lastHUD>200){hud();lastHUD=t}
  if(noticeUntil&&performance.now()>noticeUntil){$('toast').textContent='';noticeUntil=0}
 }catch(e){if(!arFrame.warned){arFrame.warned=true;console.error('OLA ROJA XR:',e);toast('⚠️ ERROR DE RENDER · REVISAR CÁMARA',2200)}}
}
function bootAR(){
 if(demo||arBooted||typeof sess==='undefined'||!sess||typeof ref==='undefined'||!ref||typeof gl==='undefined'||!gl)return;
 try{renderer=A.create3D(gl);shader=null;arBooted=true;
  window.modoCaosXRFrame=arFrame;
  sess.addEventListener('end',()=>{running=false;window.modoCaosXRFrame=null});
 }catch(e){console.error('OLA ROJA WebGL:',e);toast('NO SE PUDO INICIAR LA PISTA WEBGL',3000)}
}
const arWatch=setInterval(()=>{
 if(demo)return;
 bootAR();
 if(typeof stage!=='undefined'&&stage==='fixed'&&status==='intro')uiFixed();
},150);
function demoStart(){
 demo=true;mode='clasico';calibrated=true;selectedCell=21;origin={x:0,z:0};
 $('home').style.display='none';$('overlay').style.display='block';
 $('canvas2D').style.display='block';$('head').style.display='none';
 $('lock').style.display='none';$('toolbar').style.display='none';$('touchpad').style.display='none';
 $('statusPanel').style.display='flex';$('gameActions').style.display='flex';
 $('gameHud').style.display='flex';$('begin').disabled=false;
 $('whereAmI').style.display='block';$('pause').style.display='none';
 canvas=A.create2D($('canvas2D'));reset('clasico');
 label('DEMO 2D: tocá celdas para moverte · en AR caminás DE VERDAD');
 requestAnimationFrame(demoFrame);
}
let demoTime=0;
function demoFrame(t){
 if(!demo)return;
 const dt=demoTime?clamp((t-demoTime)/1000,0,.055):.016;demoTime=t;
 gameTick(dt,t);canvas.render(game,t);
 if(noticeUntil&&t>noticeUntil){$('toast').textContent='';noticeUntil=0}
 requestAnimationFrame(demoFrame);
}
$('demo').addEventListener('click',demoStart);
$('canvas2D').addEventListener('pointerdown',e=>{
 if(!demo||!running)return;
 const p=canvas.point(e.clientX,e.clientY);if(p)target=p;
});
window.addEventListener('keydown',e=>{keys.add(e.key);if(demo&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault()});
window.addEventListener('keyup',e=>keys.delete(e.key));
$('begin').addEventListener('click',begin);
$('pause').addEventListener('click',pauseGame);
$('resume').addEventListener('click',resumeGame);
$('pauseCal').addEventListener('click',()=>{$('pauseDialog').style.display='none';recalibrate()});
function recalibrate(){
 if(demo)return;
 trackingFrozen=true;recoverySince=0;game.paused=running;calibrated=false;sampling=false;picker=true;
 $('statusPanel').style.display='flex';$('gameActions').style.display='flex';
 $('calBox').style.display='block';$('calTitle').textContent='👣 VOLVÉ A TOCAR TU CASILLA';
 $('begin').disabled=true;label('Pista fija · marcá tu nueva posición sin desplazarla');
}
$('recalibrate').addEventListener('click',recalibrate);
$('recalibrateLive').addEventListener('click',recalibrate);
$('again').addEventListener('click',()=>{reset(mode);if(demo){calibrated=true;$('begin').disabled=false}});
$('infinite').addEventListener('click',()=>{reset('infinito');if(demo){calibrated=true;$('begin').disabled=false}});
$('share').addEventListener('click',async()=>{
 const s='🔴 ¡SOBREVIVÍ '+Math.floor(game.elapsed)+' SEGUNDOS EN OLA ROJA! ¿PODÉS SUPERARME? '+location.origin+'/ola.html';
 if(navigator.share){try{await navigator.share({title:'OLA ROJA · MODO CAOS',text:s,url:location.origin+'/ola.html'})}catch(_){}}
 else{try{await navigator.clipboard.writeText(s);toast('RESULTADO COPIADO',1500)}catch(_){toast(s,3000)}}
});
$('leave').addEventListener('click',()=>location.assign('/'));
$('exit').addEventListener('click',()=>{if(typeof sess!=='undefined'&&sess)sess.end().catch(()=>location.assign('/'));else location.assign('/')});
$('music').addEventListener('click',()=>{muted=!muted;$('music').textContent=muted?'🔇':'🔊';if(!muted)speak(700,.1)});
$('overlay').addEventListener('beforexrselect',e=>e.preventDefault());
$('calCenter').textContent='👣 ESTOY EN EL CENTRO (4-4)';
if(navigator.xr){/* engine.js consulta compatibilidad cuando empieza */}
})();
