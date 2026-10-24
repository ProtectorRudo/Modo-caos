'use strict';
/* Color Rush Survivor 1.1. XR camera translation, NOT foot recognition. Calibrate from ANY cell.
   Keep the verified 0.7 XR renderer untouched; uncertain readings cannot deduct lives. */
(function(){
const $=s=>document.getElementById(s);
const names=['VERDE','AMARILLO','ROJO','AZUL','VIOLETA','NARANJA'];
const events=['normal','normal','switch','normal','double','danger','switch','double','danger','normal','switch','danger'];
const maxR={survivor:12,classic:8};
let mode='survivor',phase='idle',round=0,score=0,lives=3,combo=0,bestCombo=0,hits=0;
let aligned=false,offset={x:0,z:0},cal=null,oldPhase=null,calPauseAt=0;
let player=null,filtered=null,lastCell=-1,cellDwell=0,targetDwell=0,lastT=0,lastUI=0;
let current=0,alternate=-1,kind='normal',bomb=-1,switched=false,deadline=0,roundStart=0,duration=0,transition=0,startPos=null,untracked=0,pausedAt=0;
let sprite=null,spriteText=null,warningSprite=null,started=false,errors=0,audio=null,previousSecond=-1,toastKey=0;
const sty=document.createElement('style');
sty.textContent='#calpanel .popup{max-height:90dvh;overflow:auto}#calpanel .popup button{width:100%;margin:4px 0}#calpick{background:#46f1b4}#cal-info{font-size:12px;color:#d3ffed;border:1px solid #39dfb2;border-radius:11px;padding:9px;background:#082c3b}#calhint{position:absolute;left:12px;right:12px;top:26%;background:#072e42ef;border:1px solid #40f0b9;padding:14px;border-radius:14px;text-align:center;display:none;font-size:13px;font-weight:900;z-index:11;pointer-events:none}#calexit{position:absolute;right:12px;top:35%;display:none;z-index:12;pointer-events:auto;background:#11344b;color:white}#posnote{display:none;background:#092d3bcb;border-radius:9px;font-size:11px;line-height:1.25;color:#d4ffee;padding:7px;text-align:center}';
document.head.appendChild(sty);
const hint=document.createElement('div');hint.id='calhint';$('overlay').appendChild(hint);
const exit=document.createElement('button');exit.id='calexit';exit.textContent='CANCELAR CALIBRACIÓN';$('overlay').appendChild(exit);
const note=document.createElement('div');note.id='posnote';$('playerline').insertAdjacentElement('afterend',note);
const popup=$('calpanel').querySelector('.popup'),desc=popup.querySelector('p');
desc.textContent='Sostené el celular cerca del pecho y quedate sobre una baldosa. Indicá exactamente cuál es, una sola vez.';
const info=document.createElement('p');info.id='cal-info';info.textContent='Más preciso: parate sobre cualquier baldosa y tocá esa misma baldosa en la imagen AR. Después podés caminar sin apuntar al piso.';
desc.insertAdjacentElement('afterend',info);
const pick=document.createElement('button');pick.id='calpick';pick.textContent='👣 TOCAR LA BALDOSA DONDE ESTOY';info.insertAdjacentElement('afterend',pick);
$('calconfirm').textContent='ESTOY SOBRE LA BALDOSA CENTRAL';
$('calibration-btn').textContent='🎯 AJUSTAR MI POSICIÓN';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const random=()=>Math.floor(Math.random()*6);
const center=i=>({x:(i%5-2)*boardSize,z:(Math.floor(i/5)-2)*boardSize});
function indexOfTile(x,z){
 const margin=2.73*boardSize;
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>margin||Math.abs(z)>margin)return -1;
 let a=clamp(Math.round(x/boardSize+2),0,4),b=clamp(Math.round(z/boardSize+2),0,4);
 return b*5+a;
}
function targetIndex(x,z){
 let found=-1,d=Infinity;
 for(let i=0;i<25;i++){
  if(tiles[i]!==current&&!(kind==='double'&&tiles[i]===alternate))continue;
  let c=center(i),dx=Math.abs(x-c.x),dz=Math.abs(z-c.z);
  if(dx<=boardSize*.61&&dz<=boardSize*.61){
    let score=Math.hypot(dx,dz);
    if(score<d){d=score;found=i}
  }
 }
 return found;
}
function median(a){return a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)]}
function invert(m){
 let o=new Float32Array(16);
 o[0]=m[0];o[1]=m[4];o[2]=m[8];o[4]=m[1];o[5]=m[5];o[6]=m[9];o[8]=m[2];o[9]=m[6];o[10]=m[10];o[15]=1;
 o[12]=-(o[0]*m[12]+o[4]*m[13]+o[8]*m[14]);
 o[13]=-(o[1]*m[12]+o[5]*m[13]+o[9]*m[14]);
 o[14]=-(o[2]*m[12]+o[6]*m[13]+o[10]*m[14]);return o;
}
function toLocal(m,p){
 let r=invert(m);return{x:r[0]*p.x+r[4]*p.y+r[8]*p.z+r[12],
 z:r[2]*p.x+r[6]*p.y+r[10]*p.z+r[14],
 height:r[1]*p.x+r[5]*p.y+r[9]*p.z+r[13]};
}
function canSample(){return !!(typeof sess!=='undefined'&&sess&&typeof ref!=='undefined'&&ref)}
function vibrate(p){try{navigator.vibrate?.(p)}catch(_){}}
function speak(s){try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(s);u.lang='es-AR';u.rate=1.09;speechSynthesis.speak(u)}catch(_){}}
function initAudio(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume?.()}catch(_){}}
function blip(freq=650,d=.11){
 try{if(!audio)return;let o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
 o.frequency.value=freq;g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
 o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+d+.01)}catch(_){}
}
function words(title,sub){$('headline').textContent=title;$('subtitle').textContent=sub}
function flash(s,color='#77ffc6',ms=1100){
 let el=$('burst'),id=++toastKey;el.style.display='block';el.style.color=color;el.textContent=s;
 el.style.animation='none';void el.offsetHeight;el.style.animation='pop .65s ease-out both';
 setTimeout(()=>{if(id===toastKey)el.style.display='none'},ms)
}
function getBest(){try{return Number(localStorage.getItem('cr-11-'+mode))||0}catch(_){return 0}}
function putBest(v){try{localStorage.setItem('cr-11-'+mode,String(v))}catch(_){}}
function updateHUD(){
 $('score-val').textContent=score;$('round-val').textContent=round+'/'+maxR[mode];
 $('combo-val').textContent='×'+Math.min(combo+1,5);
 $('hearts').style.display=mode==='classic'?'none':'';
 $('hearts').textContent=('♥ '.repeat(Math.max(0,lives))+'♡ '.repeat(Math.max(0,3-lives))).trim();
}
function setMode(m){
 if(phase!=='idle')return;
 mode=m;$('mode-survivor').classList.toggle('selected',m==='survivor');$('mode-classic').classList.toggle('selected',m==='classic');
 $('play').textContent='EMPEZAR '+(m==='survivor'?'SURVIVOR':'CLÁSICO');
}
$('mode-survivor').addEventListener('click',()=>setMode('survivor'));
$('mode-classic').addEventListener('click',()=>setMode('classic'));
function updateUI(){
 let inBoard=stage==='fixed'||stage==='playing'||stage==='finished';
 $('hud').style.display=inBoard?'flex':'none';
 $('playerline').style.display=inBoard?'block':'none';
 note.style.display=inBoard&&phase==='idle'?'block':'none';
 $('calibration-btn').style.display=inBoard&&(phase==='idle'||phase==='running'||phase==='paused'||phase==='ended')?'block':'none';
 $('toolbar').style.display=inBoard?'none':'flex';
 $('touchpad').style.display=stage==='preview'?'block':'none';
 $('top-chip').style.display=phase==='running'||phase==='paused'?'block':'none';
 $('timetrack').style.display=phase==='running'?'block':'none';
 $('play').style.display=inBoard&&(phase==='idle'||phase==='ended')?'':'none';
 $('edit').style.display=inBoard?'':'none';
}
function createSprites(){
 if(sprite)return;
 let s=$('tiles'),ns='http://www.w3.org/2000/svg';
 sprite=document.createElementNS(ns,'circle');sprite.setAttribute('r','13');sprite.setAttribute('stroke','#094a52');sprite.setAttribute('stroke-width','4');sprite.setAttribute('fill','#ccfff2');sprite.style.display='none';s.appendChild(sprite);
 spriteText=document.createElementNS(ns,'text');spriteText.textContent='YO';spriteText.setAttribute('font-size','9');spriteText.setAttribute('font-weight','900');spriteText.setAttribute('fill','#174b54');spriteText.setAttribute('text-anchor','middle');spriteText.style.display='none';s.appendChild(spriteText);
 warningSprite=document.createElementNS(ns,'text');warningSprite.textContent='⚠';warningSprite.setAttribute('text-anchor','middle');warningSprite.setAttribute('font-size','32');warningSprite.style.display='none';s.appendChild(warningSprite);
}
function drawPlayer(frame,W){
 if(!W||!sprite||!canSample())return;
 let p=frame.getViewerPose(ref),v=p?.views?.[0];if(!v)return;
 let M=mul(v.projectionMatrix,mul(v.transform.inverse.matrix,W));
 if(player?.valid){
  let q=projected(M,player.x,.12,player.z,innerWidth,innerHeight);
  if(q){
   sprite.style.display=spriteText.style.display='block';
   sprite.setAttribute('cx',q[0]);sprite.setAttribute('cy',q[1]);
   spriteText.setAttribute('x',q[0]);spriteText.setAttribute('y',q[1]+3);
  }else sprite.style.display=spriteText.style.display='none';
 }else sprite.style.display=spriteText.style.display='none';
 if(phase==='running'&&kind==='danger'&&bomb>=0){
  let c=center(bomb),q=projected(M,c.x,.1,c.z,innerWidth,innerHeight);
  if(q){warningSprite.style.display='block';warningSprite.setAttribute('x',q[0]);warningSprite.setAttribute('y',q[1])}else warningSprite.style.display='none';
 }else warningSprite.style.display='none';
}
function sample(t,frame,W,dt){
 if(!W||!canSample()){player={valid:false};return}
 let pose=frame.getViewerPose(ref);
 if(!pose||pose.emulatedPosition){player={valid:false};filtered=null;return}
 let raw=toLocal(W,pose.transform.position);
 let x=raw.x+offset.x,z=raw.z+offset.z;
 if(!Number.isFinite(x)||!Number.isFinite(z)){player={valid:false};return}
 let k=1-Math.exp(-Math.max(1,dt)/95);
 if(!filtered)filtered={x,z};
 else{filtered.x+=clamp(x-filtered.x,-.18,.18)*k;filtered.z+=clamp(z-filtered.z,-.18,.18)*k}
 let cell=indexOfTile(filtered.x,filtered.z);
 if(cell===lastCell&&cell>=0)cellDwell+=dt;else cellDwell=0;
 lastCell=cell;
 const found=phase==='running'&&targetIndex(filtered.x,filtered.z)>=0;
 if(found)targetDwell+=dt;else targetDwell=0;
 player={valid:true,raw,x:filtered.x,z:filtered.z,cell,height:raw.height};
 if(cal?.phase==='samples'){cal.values.push(raw);if(cal.values.length>90)cal.values.shift()}
}
function unpick(){
 $('tiles').style.pointerEvents='none';
 for(let p of $('tiles').querySelectorAll('polygon'))p.style.pointerEvents='none';
 hint.style.display='none';exit.style.display='none';
}
function openCal(){
 if(stage!=='fixed'&&stage!=='playing'&&stage!=='finished')return;
 if(phase==='running'){oldPhase='running';calPauseAt=performance.now();phase='paused'}
 else oldPhase=null;
 $('calpanel').style.display='flex';
 words('AJUSTAR POSICIÓN','Elegí una baldosa para alinear el marcador de tu cuerpo.');
}
function cancelCal(){
 cal=null;unpick();$('calpanel').style.display='none';
 if(phase==='paused'&&oldPhase==='running'){
  deadline+=Math.max(0,performance.now()-calPauseAt);phase='running';oldPhase=null;
 }
}
function startSamples(cell){
 if(!player?.valid){flash('MOVÉ EL TELÉFONO PARA RECUPERAR SEGUIMIENTO','#ffe19c');return}
 cal={phase:'samples',cell,values:[],since:performance.now()};
 $('calpanel').style.display='none';unpick();hint.textContent='QUEDATE QUIETO UN INSTANTE…';hint.style.display='block';
}
function beginPick(){
 if(!player?.valid){flash('ESPERÁ EL SEGUIMIENTO ESPACIAL','#ffe19c');return}
 cal={phase:'pick'};$('calpanel').style.display='none';hint.style.display='block';
 hint.textContent='👣 PARATE EN UNA BALDOSA Y TOCÁ ESA MISMA BALDOSA EN LA IMAGEN';
 exit.style.display='block';
 $('tiles').style.pointerEvents='auto';
 let all=[...$('tiles').querySelectorAll('polygon')];all.forEach((p,i)=>p.style.pointerEvents=i?'visiblePainted':'none');
}
$('calibration-btn').addEventListener('click',openCal);
$('calconfirm').addEventListener('click',()=>startSamples(12));
pick.addEventListener('click',beginPick);
$('calcancel').addEventListener('click',cancelCal);exit.addEventListener('click',cancelCal);
$('tiles').addEventListener('pointerdown',e=>{
 if(cal?.phase!=='pick')return;
 let all=[...$('tiles').querySelectorAll('polygon')],cell=all.indexOf(e.target)-1;
 if(cell<0||cell>=25)return;
 e.preventDefault();e.stopImmediatePropagation();startSamples(cell);
},true);
function finishCal(t){
 if(cal?.phase!=='samples'||t-cal.since<560)return;
 if(cal.values.length<7){cal.since=t-340;return}
 let origin=center(cal.cell);
 offset={x:clamp(origin.x-median(cal.values.map(p=>p.x)),-2,2),
 z:clamp(origin.z-median(cal.values.map(p=>p.z)),-2,2)};
 cal=null;unpick();aligned=true;filtered=null;player=null;lastCell=-1;targetDwell=0;cellDwell=0;
 if(phase==='paused'&&oldPhase==='running'){deadline+=Math.max(0,t-calPauseAt)+1200;phase='running';oldPhase=null;}
 else if(phase==='paused'){deadline+=1200;phase='running'}
 flash('CALIBRACIÓN CORRECTA ✓','#67ffbe');vibrate(70);blip(810,.15);
 words('POSICIÓN CALIBRADA','Ahora caminá sosteniendo el celular cerca del pecho. No necesitás apuntar.');
}
function createGrid(){
 for(let i=0;i<25;i++)tiles[i]=random();
 if(!tiles.includes(current))tiles[12]=current;
 if(kind==='double'&&!tiles.includes(alternate))tiles[6]=alternate;
}
function nextRound(t){
 round++;if(round>maxR[mode]){finishGame(true);return}
 kind=mode==='classic'?'normal':events[(round-1)%events.length];
 current=random();alternate=kind==='double'?(current+1+Math.floor(Math.random()*5))%6:-1;
 createGrid();bomb=-1;switched=false;
 if(kind==='danger'){const cells=[];for(let i=0;i<25;i++)if(tiles[i]!==current)cells.push(i);bomb=cells[Math.floor(Math.random()*cells.length)]??0}
 duration=mode==='survivor'?Math.max(4400,7500-(round-1)*280):Math.max(5400,7700-round*150);
 deadline=t+duration;roundStart=t;phase='running';previousSecond=-1;targetDwell=0;lastCell=-1;cellDwell=0;untracked=0;
 startPos=player?.valid?{x:player.x,z:player.z}:null;
 $('top-chip').textContent=kind==='switch'?'🔀 CAMBIO SORPRESA':kind==='double'?'✨ DOS COLORES':kind==='danger'?'💣 EVITÁ LA TRAMPA':'⚡ MOVETE';
 words('¡'+names[current]+'!','Buscá el color y quedate un instante sobre él.');
 speak(kind==='double'?names[current]+' o '+names[alternate]:names[current]);blip(650,.11);updateHUD();
}
function win(t){
 if(phase!=='running')return;
 const walked=startPos&&player?.valid?dist(startPos,player):0;
 let earned=10+Math.min(combo,4)*5+Math.min(14,Math.max(0,Math.ceil((deadline-t)/1000)*2))+(walked>=.35?5:0);
 score+=earned;combo++;hits++;bestCombo=Math.max(combo,bestCombo);
 phase='feedback';transition=t+1100;
 words('+'+earned+' PUNTOS','¡COLOR CORRECTO! · COMBO ×'+Math.min(combo+1,5));
 flash('+'+earned+' PUNTOS','#57ffc4');vibrate([50,40,50]);blip(1030,.18);updateHUD();
}
function lose(t){
 if(phase!=='running')return;
 if(mode==='survivor')lives=Math.max(0,lives-1);
 combo=0;phase='feedback';transition=t+1300;
 words('RONDA FALLADA',mode==='survivor'?'TE QUEDAN '+lives+' VIDAS':'¡A LA PRÓXIMA!');
 flash('COLOR INCORRECTO','#ff97a1');vibrate([125,60,120]);blip(210,.3);updateHUD();
}
function pauseUncertain(t){
 if(phase!=='running')return;
 phase='paused';pausedAt=t;untracked=0;
 $('health-warning').style.display='block';
 $('health-warning').textContent='Tiempo pausado: necesitamos corregir la ubicación. No perdiste una vida.';
 $('top-chip').textContent='🎯 RECALIBRAR';
 words('POSICIÓN INCIERTA','Recalibrá tu baldosa. No se descuentan vidas por fallos de seguimiento.');
 $('calibration-btn').style.display='block';
 flash('RECALIBRÁ SIN PERDER VIDAS','#ffe2a0');
}
function tickGame(t,dt){
 if(phase==='countdown'){let n=Math.ceil((deadline-t)/1000);
  if(n!==previousSecond&&n>0){previousSecond=n;flash(String(n),'#fff',500);blip(450+n*90,.1)}
  words('PREPARADOS','Celular cerca del cuerpo; no hace falta apuntar al suelo.');
  if(t>=deadline)nextRound(t);return}
 if(phase==='feedback'){if(t>=transition){if(mode==='survivor'&&lives<=0)finishGame(false);else nextRound(t)}return}
 if(phase==='paused')return;
 if(phase!=='running')return;
 if(!player?.valid||player.cell<0||player.height<.25){
   untracked+=dt;
   if(untracked>800)pauseUncertain(t);else deadline+=dt;
   return;
 }
 untracked=0;$('health-warning').style.display='none';
 if(kind==='switch'&&!switched&&t-roundStart>=Math.min(1900,duration*.34)){
  switched=true;current=(current+1+Math.floor(Math.random()*5))%6;
  if(!tiles.includes(current))tiles[Math.floor(Math.random()*25)]=current;
  targetDwell=0;flash('¡CAMBIO DE COLOR!','#ffe299');speak('Cambio. '+names[current]);vibrate([45,50,45]);
 }
 if(kind==='danger'&&player.cell===bomb&&cellDwell>=550){lose(t);return}
 const inTarget=targetIndex(player.x,player.z)>=0;
 if(inTarget&&targetDwell>=290&&(kind!=='switch'||switched)){win(t);return}
 if(t>=deadline){if(inTarget){win(t);return}lose(t);return}
 let seconds=Math.ceil((deadline-t)/1000),ratio=clamp((deadline-t)/duration,0,1);
 $('timefill').style.width=(ratio*100).toFixed(1)+'%';
 $('timefill').style.background=seconds<=2?'#ff5074':'#32eeb0';
 if(seconds!==previousSecond){previousSecond=seconds;if(seconds<=3){blip(525,.08);vibrate(15)}}
 const name=kind==='double'?names[current]+' O '+names[alternate]:names[current];
 const info=kind==='switch'&&!switched?'🔀 ATENTO AL CAMBIO':kind==='danger'?'💣 EVITÁ LA TRAMPA':'BUSCÁ EL COLOR CORRECTO';
 words('¡'+name+'!',info+' · '+seconds+' s');
}
function finishGame(success){
 phase='ended';setStage('finished');updateUI();updateHUD();
 const previous=getBest();if(score>previous)putBest(score);
 $('endkicker').textContent='COLOR RUSH · '+mode.toUpperCase();
 $('endtitle').textContent=success?'¡DESAFÍO COMPLETADO!':'FIN DEL JUEGO';
 $('endstats').textContent=score+' PUNTOS · '+hits+' ACIERTOS · COMBO ×'+Math.min(bestCombo+1,5);
 $('best').textContent=score>previous?'🏆 ¡NUEVO RÉCORD!':'MEJOR PUNTUACIÓN: '+Math.max(previous,score);
 $('endpanel').style.display='flex';words('PARTIDA TERMINADA','Conseguiste '+score+' puntos.');speak('Fin de la partida');
}
function start(e){
 if(stage!=='fixed'&&stage!=='finished')return;
 e?.preventDefault?.();e?.stopImmediatePropagation?.();
 if(!aligned){openCal();flash('CALIBRÁ UNA BALDOSA PRIMERO','#ffe1a3');return}
 initAudio();phase='countdown';round=0;score=0;combo=0;bestCombo=0;hits=0;lives=3;previousSecond=-1;
 setStage('playing');$('endpanel').style.display='none';
 deadline=performance.now()+2600;words('PREPARADOS','La ubicación se calculará por tus desplazamientos.');
 updateHUD();updateUI();speak('Preparados');
}
$('play').addEventListener('click',start,true);
$('again').addEventListener('click',()=>start({preventDefault(){},stopImmediatePropagation(){}}));
$('closeend').addEventListener('click',()=>{$('endpanel').style.display='none'});
function reset(){
 phase='idle';aligned=false;offset={x:0,z:0};cal=null;oldPhase=null;player=null;filtered=null;
 lastCell=-1;cellDwell=0;targetDwell=0;untracked=0;unpick();
 $('endpanel').style.display='none';$('calpanel').style.display='none';$('health-warning').style.display='none';
}
$('edit').addEventListener('click',reset);
$('lock').addEventListener('click',()=>setTimeout(()=>{if(stage==='fixed'){updateUI();words('PISTA FIJADA','Calibrá la baldosa donde estás parado antes de jugar.');flash('CALIBRÁ TU POSICIÓN','#95ffe1')}},300));
function paint(){
 const board=stage==='fixed'||stage==='playing'||stage==='finished';
 if(!board)return;
 updateUI();updateHUD();
 if(phase==='idle')words('PISTA LISTA','Calibrá desde cualquier baldosa para empezar.');
 let where=!aligned?'SIN CALIBRAR':
 !player?.valid?'SIN SEGUIMIENTO ESPACIAL':
 player.cell<0?'FUERA DE LA PISTA ESTIMADA — RECALIBRÁ':
 names[tiles[player.cell]]+(phase==='running'&&targetIndex(player.x,player.z)>=0?' · CORRECTO ✓':'');
 $('playerline').textContent='👣 POSICIÓN DEL CUERPO (ESTIMADA) · '+where;
 $('playerline').style.borderColor=phase==='running'&&player?.valid&&targetIndex(player.x,player.z)>=0?'#52ffc1':'#63dcba8c';
 note.textContent=aligned?'«YO» representa el celular ajustado al cuerpo, no una detección de pies. Mantenelo cerca del pecho.':'Parate en una baldosa y seleccioná esa baldosa en CALIBRAR.';
}
function xrTick(t,frame){
 if(!canSample())return;sess.requestAnimationFrame(xrTick);
 try{
  const dt=lastT?clamp(t-lastT,0,100):16;lastT=t;
  const W=buildWorld();
  if(stage==='fixed'||stage==='playing'||stage==='finished') {sample(t,frame,W,dt);drawPlayer(frame,W)}
  else{player=null;filtered=null;targetDwell=0;lastCell=-1;cellDwell=0;if(sprite){sprite.style.display='none';spriteText.style.display='none'}}
  finishCal(t);tickGame(t,dt);
  if(t-lastUI>170){lastUI=t;paint()}
 }catch(e){if(errors++<4)console.warn('Survivor calibration:',e)}
}
function observe(){
 if(started||!canSample())return;
 started=true;createSprites();sess.requestAnimationFrame(xrTick);
 sess.addEventListener('end',()=>{reset()});
}
setInterval(observe,250);
setMode('survivor');
})();