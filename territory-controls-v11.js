'use strict';
/* Territorio X 1.1 — own the game controls without starting Color Rush rounds. */
(function(){
const $=id=>document.getElementById(id),overlay=$('overlay'),play=$('play'),again=$('again'),center=$('center');
if(!overlay||!play||!again||!center)throw Error('Territorio X: controls unavailable');
let running=false,calibrated=false,origin=null,markerLoop=false,lastMark=0,lastMotion=0;
const style=document.createElement('style');
style.textContent=[
'#overlay.tx-running #mainbuttons,#overlay.tx-running #toolbar,#overlay.tx-running #touchpad,#overlay.tx-running #reticle{display:none!important}',
'#overlay.tx-placed #toolbar{display:none!important}',
'#overlay.tx-placed #mainbuttons{display:flex!important}',
'#overlay.tx-running #hud,#overlay.tx-running #powers{display:flex!important}',
'#txCalStatus{display:none;position:absolute;z-index:7;top:77px;left:50%;transform:translateX(-50%);width:min(92vw,395px);padding:6px 8px;border-radius:11px;text-align:center;background:#082b3ce0;border:1px solid #65e6bc;color:#f0fffc;font:850 10px/1.25 system-ui;text-shadow:0 1px 4px #001e27;pointer-events:none;backdrop-filter:blur(5px)}',
'#txCalStatus.good{border-color:#70ffc9;background:#083c37e0}',
'#txMarker{display:none;position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:5}',
'#txMarker circle{stroke:#fff;stroke-width:3;fill:#28ffd0;fill-opacity:.25}',
'#txMarker .ring{fill:none;stroke:#fff;stroke-width:2;stroke-dasharray:5 4}',
'#txMarker text{font:900 10px system-ui;fill:#efffff;paint-order:stroke;stroke:#063342;stroke-width:3px}',
'#overlay.tx-placed #play{background:#3af5b5;color:#052f25}'
].join('');
document.head.appendChild(style);
const status=document.createElement('div');status.id='txCalStatus';
overlay.appendChild(status);
const NS='http://www.w3.org/2000/svg',marker=document.createElementNS(NS,'svg');
marker.id='txMarker';
marker.innerHTML='<circle class="ring" cx="-30" cy="-30" r="19"/><circle cx="-30" cy="-30" r="8"/><text x="-30" y="-54" text-anchor="middle">TU CELULAR</text>';
overlay.appendChild(marker);
const ring=marker.querySelector('circle.ring'),dot=marker.querySelector('circle:not(.ring)'),label=marker.querySelector('text');
function safe(cb,fallback=null){try{return cb()}catch(e){return fallback}}
function show(text,ok=false){status.style.display='block';status.textContent=text;status.classList.toggle('good',ok)}
function sessionReady(){return !!safe(()=>sess&&ref&&typeof buildWorld==='function'&&buildWorld(),false)}
function locked(){return !!safe(()=>getComputedStyle($('home')).display==='none'&&getComputedStyle($('edit')).display!=='none',false)}
function local(M,p){
 const a=p.x-M[12],b=p.y-M[13],c=p.z-M[14];
 return{x:M[0]*a+M[1]*b+M[2]*c,z:M[8]*a+M[9]*b+M[10]*c};
}
function sample(frame){
 if(!frame||!sessionReady())return false;
 const pose=frame.getViewerPose(ref),M=buildWorld();
 if(!pose||pose.emulatedPosition||!M)return false;
 const p=local(M,pose.transform.position);
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
 origin={x:p.x,z:p.z};calibrated=true;lastMotion=performance.now();
 show('✓ CALIBRADO · EL ARO BLANCO MARCA TU CELULAR',true);
 center.textContent='🎯 RECALIBRAR';
 return true;
}
function calibration(){
 calibrated=false;origin=null;marker.style.display='none';
 center.textContent='📍 SOY YO · CALIBRAR';
 show('BUSCANDO LA POSICIÓN DEL TELÉFONO…');
 const queued=safe(()=>{
  if(!sess||!ref)return false;
  sess.requestAnimationFrame((t,f)=>{if(!sample(f))show('SIN SEÑAL XR · APUNTÁ AL PISO O USÁ JOYSTICK')});
  return true;
 },false);
 if(!queued)show('SIN SEÑAL AR · USÁ JOYSTICK');
}
function prepare(){
 if(running)return;
 overlay.classList.add('tx-placed');
 status.style.display='block';
 play.textContent='COMENZAR CONQUISTA';
 center.textContent=calibrated?'🎯 RECALIBRAR':'📍 SOY YO · CALIBRAR';
 $('headline').textContent='¡CANCHA LISTA!';
 $('subtitle').textContent='1. CALIBRATE · 2. EMPEZÁ · 3. CONQUISTÁ';
 if(!calibrated)show('📍 TOCÁ «SOY YO» PARA VINCULAR EL CELULAR CON «VOS»');
 $('message').textContent=calibrated?'✓ CALIBRADO · EMPEZÁ A JUGAR':'TOCÁ SOY YO PARA CALIBRAR TU POSICIÓN';
 $('message').style.display='block';
}
function launch(e){
 e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
 if(running)return;
 running=true;calibrated=false;origin=null;
 overlay.classList.remove('tx-placed');overlay.classList.add('tx-running');
 status.style.display='block';
 // The earlier territory controller wires #again to its private game start.
 // Do NOT invoke shared WebXR engine setStage('playing'): it starts Color Rush!
 again.click();
 if(sessionReady())center.click();
 show('JUGANDO · MOVETE CON TU CELULAR · ¡CERRÁ CIRCUITOS!',true);
 $('headline').textContent='¡TERRITORIO X!';
 $('subtitle').textContent='MOVETE · CERRÁ ESTELAS · EVITÁ QUE LAS CORTEN';
 $('message').textContent='PARTIDA EN CURSO · CONQUISTÁ TU PRIMER TERRITORIO';
 $('rankings').style.display='block';
}
document.addEventListener('click',e=>{
 const node=e.target instanceof Element?e.target:null;
 if(node&&node.closest('#play'))launch(e);
},true);
center.addEventListener('click',()=>{
 if(getComputedStyle($('home')).display!=='none'||!running&&!locked())return;
 calibration();
});
$('lock').addEventListener('click',()=>setTimeout(()=>{if(locked())prepare()},260));
$('edit').addEventListener('click',()=>{
 running=false;calibrated=false;origin=null;
 overlay.classList.remove('tx-placed','tx-running');
 status.style.display='none';marker.style.display='none';
});
again.addEventListener('click',()=>{
 if(!running)return;
 setTimeout(()=>{if(sessionReady())center.click()},90);
});
$('control').addEventListener('click',()=>setTimeout(()=>{
 const isStick=getComputedStyle($('stick')).display!=='none';
 $('control').textContent=isStick?'🚶 USAR CUERPO':'🕹 USAR JOYSTICK';
 if(isStick)show('JOYSTICK ACTIVO · ARRASTRÁ EL CONTROL',true);
 else show(calibrated?'MOVIMIENTO FÍSICO · CELULAR CALIBRADO':'MOVIMIENTO FÍSICO · TOCÁ SOY YO PARA CALIBRAR',calibrated);
},15));
function drawPhone(f){
 if(!calibrated||!origin||!sessionReady()){marker.style.display='none';return}
 const pose=f.getViewerPose(ref),view=pose?.views?.[0],world=buildWorld();
 if(!pose||pose.emulatedPosition||!view||!world){marker.style.display='none';return}
 const p=local(world,pose.transform.position),size=safe(()=>boardSize,.45)||.45,pitch=5*size/22;
 const x=-2.5*size+11.5*pitch+(p.x-origin.x)*1.6;
 const z=-2.5*size+18.5*pitch+(p.z-origin.z)*1.6;
 const m=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,world));
 const q=projected(m,x,.31,z,innerWidth,innerHeight);
 if(!q||!Number.isFinite(q[0])||!Number.isFinite(q[1])){marker.style.display='none';return}
 marker.style.display='';marker.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight);
 for(const shape of [dot,ring]){shape.setAttribute('cx',q[0]);shape.setAttribute('cy',q[1])}
 label.setAttribute('x',q[0]);label.setAttribute('y',q[1]-30);
 if(running&&performance.now()-lastMotion>2600&&getComputedStyle($('stick')).display==='none'){
  lastMotion=performance.now();
  const d=Math.hypot(p.x-origin.x,p.z-origin.z);
  show('✓ POSICIÓN CALIBRADA · DESPLAZAMIENTO '+d.toFixed(2)+' m',true);
 }
}
function onFrame(t,f){
 if(!markerLoop)return;
 safe(()=>sess?.requestAnimationFrame(onFrame));
 if(t-lastMark<90)return;
 lastMark=t;if(calibrated)try{drawPhone(f)}catch(e){marker.style.display='none'}
}
setInterval(()=>{
 if(getComputedStyle($('home')).display!=='none')return;
 if(locked()&&!running)prepare();
 else if(running){
  overlay.classList.add('tx-running');
  $('headline').textContent='¡TERRITORIO X!';
  $('subtitle').textContent='MOVETE · CERRÁ ESTELAS · EVITÁ QUE LAS CORTEN';
  if(play.textContent!=='COMENZAR CONQUISTA')play.textContent='COMENZAR CONQUISTA';
 }
 if(safe(()=>sess&&ref,false)&&!markerLoop){
  markerLoop=true;sess.requestAnimationFrame(onFrame);
 }
},155);
window.__TERRITORIO_DIAG={isPlaying:()=>running,calibrated:()=>calibrated,floorReady:()=>locked(),phoneSample:()=>origin};
})();