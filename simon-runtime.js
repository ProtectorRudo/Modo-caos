'use strict';
/* Runtime Simón Traicionero. AR = seguimiento posicional del TELÉFONO; demo = pantalla táctil. */
(function(){
const $=id=>document.getElementById(id),C=window.SimonCore,els={};
let g=null,art=null,mode='ar',picked=-1,calibrated=false,offset={x:0,z:0},samples=[],sampleStart=0;
let phone={x:0,z:0},player={x:0,z:0,tile:-1};
let candidateTile=-1,candidateAt=0,readyTile=-1,confirmedTile=-1,manualTile=-1,correctionMode=false;
let phaseAt=0,lastFrame=0,lastTracked=0,timers=new Set(),token=0,audioCtx=null,quiet=false,voice=true,volume=.45;
let trackingWarned=false,stageBeforeCal='idle',wasPlaying=false,frameState=null,offlineRoom=false;
const safeText=t=>String(t).replace(/[<>]/g,'');
const ui=(id,text)=>{$(id).textContent=text};
function show(id,yes,display='block'){$(id).style.display=yes?display:'none'}
function hint(title,detail=''){ui('message',title);ui('detail',detail);show('floating',!!title)}
// Una sola fuente de verdad para la guía: acompaña cada destello, pero NO revela los próximos pasos.
function sequenceGuide(state,step=0,tile=-1){
 const el=$('sequenceGuide');
 if(!g||state==='off'){show('sequenceGuide',false);show('simonMap',false);return}
 const total=g.sequence.length;
 el.className=state==='watch'?'watch':'turn';
 const watching=state==='watch',finished=state==='done';
 ui('seqTop',watching?'👀 MIRÁ · TODAVÍA NO TE MUEVAS':finished?'✅ ¡SECUENCIA COMPLETA!':'👣 TU TURNO · REPETÍ EN ORDEN');
 let main;
 if(watching){
  if(tile>=0){const color=C.COLORS[g.colorMap[tile]];main='PASO '+step+'/'+total+' · '+color.name+' · BALDOSA '+(tile+1)}
  else main=step?'GUARDÁ EL PASO '+step+' EN MEMORIA':'PREPARATE: '+total+' DESTELLOS';
 }else if(finished)main='¡BIEN! PREPARATE PARA LA SIGUIENTE';
 else main='PASO '+Math.min(step,total)+'/'+total+' · ELEGÍ LA SIGUIENTE';
 ui('seqMain',main);
 const dots=$('seqDots');dots.replaceChildren();
 for(let n=1;n<=total;n++){
  const dot=document.createElement('i');
  if(finished||n<step)dot.classList.add('done');
  else if(n===step&&(!watching||tile>=0))dot.classList.add('now');
  dots.appendChild(dot);
 }
 show('sequenceGuide',true);mapDraw();
}
// Vista cenital fija en pantalla: la secuencia sigue siendo visible aunque
// las baldosas físicas se encuentren fuera del campo de la cámara.
function mapDraw(){
 const panel=$('simonMap');if(!panel||!g)return;
 const ar=mode==='ar',watch=g.phase==='show',act=g.phase==='act';
 show('simonMap',ar&&(watch||act));
 if(!ar||!(watch||act))return;
 panel.className=watch?'watch':correctionMode?'turn correcting':'turn';
 ui('mapHeading',watch?'👀 SECUENCIA COMPLETA':'📍 MAPA · LAS 9 CELDAS');
 const tiles=$('mapCells');
 if(tiles.children.length!==9){
  tiles.replaceChildren();
  for(let i=0;i<9;i++){
   const btn=document.createElement('button');
   btn.type='button';btn.className='mapTile';btn.dataset.mapCell=String(i);
   btn.textContent=String(i+1);
   btn.addEventListener('click',()=>chooseMapCell(i));
   tiles.appendChild(btn);
  }
 }
 for(const btn of tiles.children){
  const i=Number(btn.dataset.mapCell),key=g.colorMap[i],color=C.COLORS[key];
  btn.style.setProperty('--tone',color.hex);
  btn.classList.toggle('on',watch&&g.highlight===key);
  btn.classList.toggle('ghostMark',watch&&g.ghost===i);
  btn.classList.toggle('here',act&&calibrated&&player.tile===i);
  btn.classList.toggle('chosen',act&&manualTile===i);
  btn.setAttribute('aria-label','Baldosa '+(i+1)+' '+color.name);
  btn.disabled=!act||!correctionMode;
 }
 if(watch){
  const highlighted=tiles.querySelector('.on');
  ui('mapCaption',highlighted?'✨ MIRÁ LA CELDA '+(Number(highlighted.dataset.mapCell)+1):'Observá el orden de los destellos');
 }else if(correctionMode)ui('mapCaption','Tocá en el mapa dónde estás realmente');
 else if(manualTile>=0)ui('mapCaption','MANUAL · CELDA '+(manualTile+1)+' ELEGIDA');
 else ui('mapCaption',player.tile>=0?'● VERDE = POSICIÓN DEL TELÉFONO':'● Si no coincide, corregí la celda');
 ui('mapCorrection',correctionMode?'CANCELAR CORRECCIÓN':manualTile>=0?'CAMBIAR CELDA ELEGIDA':'¿CELDA EQUIVOCADA? CORREGIR');
}
function chooseMapCell(i){
 if(mode!=='ar'||!g||g.phase!=='act'||g.paused||!calibrated||!correctionMode)return;
 if(i===confirmedTile){hint('ESA CELDA YA SE REGISTRÓ','Elegí otra baldosa para continuar.');return}
 manualTile=i;correctionMode=false;
 hint('📍 CELDA '+(i+1)+' ELEGIDA MANUALMENTE','Ahora tocá CONFIRMAR CELDA para registrar tu paso.');
 mapDraw();drawUI();
}
function vib(ms=35){if(navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}}
function recordKey(){return 'mc-simon-record-'+g.mode}
function getRecord(){try{return Number(localStorage.getItem(recordKey()))||0}catch(e){return 0}}
function putRecord(score){try{localStorage.setItem(recordKey(),String(score))}catch(e){}}
function beep(freq=440,duration=.17,kind='tile'){
 if(quiet||!volume)return;
 try{
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  const oscillator=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
  oscillator.type=kind==='wrong'?'sawtooth':'sine';
  oscillator.frequency.setValueAtTime(freq,now);
  if(kind==='wrong')oscillator.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.44),now+.24);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.002,volume*.27),now+.016);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  oscillator.connect(gain).connect(audioCtx.destination);oscillator.start(now);oscillator.stop(now+duration+.015);
 }catch(e){}
}
function speak(phrase){
 if(!voice||!('speechSynthesis' in window))return;
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(phrase);u.lang='es-AR';u.rate=1.14;u.pitch=.76;u.volume=Math.min(.75,volume+.10);speechSynthesis.speak(u)}catch(e){}
}
function cancel(){token++;for(const t of timers)clearTimeout(t);timers.clear();if(g){g.highlight=-1;g.ghost=-1}}
function sleep(ms){return new Promise(resolve=>{const id=setTimeout(()=>{timers.delete(id);resolve()},ms);timers.add(id)})}
function setMode(newMode){ui('modeTitle',{mortal:'MEMORIA MORTAL',clasica:'SIMÓN CLÁSICO',panico:'RONDA DEL PÁNICO'}[newMode]);$('mode').value=newMode}
function newGame(resetSeed=true){
 cancel();candidateTile=-1;candidateAt=0;readyTile=-1;confirmedTile=-1;manualTile=-1;correctionMode=false;
 const params=new URLSearchParams(location.search);
 const today=new Date().toISOString().slice(0,10),daily=params.has('diario');
 const chosen=Number($('seed').value);
 const seed=daily?C.hash('daily-'+today):Number.isInteger(chosen)&&chosen>0?chosen:(Math.floor(Math.random()*0xffffffff)>>>0)||1;
 const selectedMode=$('mode').value;
 g=C.make({mode:selectedMode,seed});g.seedType=daily?'desafio-diario':'normal';
 ui('record',getRecord().toLocaleString('es-AR'));
 ui('score','0');ui('round','0');ui('progress','0/0');ui('time','–');ui('lives',String(g.lives));
 show('result',false);show('calPanel',false);show('pauseBtn',false);sequenceGuide('off');
 setMode(g.mode);renderGrid();drawUI();
}
function drawUI(){
 if(!g)return;
 ui('score',Math.round(g.score).toLocaleString('es-AR'));ui('round',String(g.round));
 ui('progress',g.index+'/'+g.sequence.length);ui('time',g.phase==='act'?String(Math.ceil(g.timeLeft)):'–');
 ui('lives',g.lives>0?'♥'.repeat(g.lives):'0');
 const cell=player.tile,located=calibrated&&cell>=0;
 const color=located?C.COLORS[g.colorMap[cell]].name:'';
 ui('position',mode==='ar'?(manualTile>=0?'📍 MODO MANUAL · CELDA '+(manualTile+1):calibrated?(located?'📍 VOS · CELDA '+(cell+1)+' · '+color:'📍 VOS · FUERA DEL CENTRO'):'📍 VOS · SIN CALIBRAR'):'🎮 MODO 2D · TOCÁ LAS BALDOSAS');
 const isPlayingAR=mode==='ar'&&g.phase==='act'&&calibrated;
 show('confirmRow',isPlayingAR);
 if(isPlayingAR){
  const fresh=performance.now()-lastTracked<900,chosen=manualTile>=0?manualTile:readyTile;
  const locked=chosen>=0&&chosen===confirmedTile;
  const canConfirm=!g.paused&&fresh&&chosen>=0&&!locked;
  const button=$('confirmCell');
  button.disabled=!canConfirm;
  $('confirmRow').classList.toggle('ready',canConfirm);
  if(g.paused){ui('confirmCell','Ⅱ PARTIDA EN PAUSA');ui('confirmHelp','Reanudá antes de confirmar.')}
  else if(!fresh){ui('confirmCell','📡 RECUPERANDO POSICIÓN');ui('confirmHelp','Enfocá de nuevo el piso.')}
  else if(locked){ui('confirmCell','✓ CELDA '+(confirmedTile+1)+' REGISTRADA');ui('confirmHelp','Andá al centro de otra celda para seguir.')}
  else if(canConfirm){ui('confirmCell','✓ CONFIRMAR CELDA '+(chosen+1));ui('confirmHelp',(manualTile>=0?'CELDA ELEGIDA · ':'CELDA DETECTADA · ')+C.COLORS[g.colorMap[chosen]].name+'. Tocá para registrar.')}
  else if(candidateTile>=0){ui('confirmCell','◌ CENTRÁ CELDA '+(candidateTile+1));ui('confirmHelp','Quedate quieto un instante para habilitar el botón.')}
  else{ui('confirmCell','📍 BUSCÁ EL CENTRO');ui('confirmHelp','Movete despacio a la baldosa elegida.')}
 }
 show('pauseBtn',g.phase==='act'||g.paused);
 $('pauseBtn').textContent=g.paused?'▶ REANUDAR':'Ⅱ PAUSA';
 if(g.phase==='show')ui('phase','MIRÁ BIEN');else if(g.phase==='act')ui('phase','¡AHORA VOS!');else if(g.phase==='finished')ui('phase','FIN DEL DESAFÍO');else ui('phase','SIMÓN TRAICIONERO');
 mapDraw();
}
function renderGrid(){
 const grid=$('grid');grid.replaceChildren();
 for(let i=0;i<9;i++){
  const color=C.COLORS[g.colorMap[i]],btn=document.createElement('button');
  btn.type='button';btn.className='tile2d';btn.dataset.cell=String(i);btn.style.setProperty('--tone',color.hex);
  btn.setAttribute('aria-label',color.name+', baldosa '+(i+1));btn.textContent=String(i+1);
  btn.addEventListener('click',()=>{if(mode==='demo'&&!g.paused)commit(i)});
  grid.appendChild(btn);
 }
}
function decorate(){
 if(!g)return;
 document.querySelectorAll('.tile2d').forEach(btn=>{
  const i=Number(btn.dataset.cell),c=C.COLORS[g.colorMap[i]];
  btn.style.setProperty('--tone',c.hex);
  btn.classList.toggle('lit',g.highlight===g.colorMap[i]&&g.phase==='show');
  btn.classList.toggle('where',i===player.tile&&mode==='ar');
  btn.classList.toggle('electric',g.trap==='electrica'&&g.phase==='act'&&i===g.electric&&C.electricalUnsafe(g,performance.now()));
  btn.classList.toggle('ghost',g.ghost===i);
 });
 mapDraw();
}
function stageReady(){
 if(mode==='ar'){
  if(!calibrated){hint('MARCÁ EN QUÉ CELDA ESTÁS','Tocá una de las nueve celdas para calibrar tu ubicación.');show('calPanel',true);return false}
  if(stage!=='fixed'&&stage!=='playing'){hint('PRIMERO FIJÁ LA PISTA','Detectá el piso y pulsá FIJAR.');return false}
 }
 return true;
}
function startMatch(){
 if(!stageReady())return;
 if(mode==='ar'&&typeof setStage==='function')setStage('playing');
 show('startGame',false);show('calPanel',false);show('how',false);
 C.begin(g);playSequence();drawUI();
}
async function playSequence(){
 cancel();candidateTile=-1;candidateAt=0;readyTile=-1;confirmedTile=-1;manualTile=-1;correctionMode=false;const mine=token;
 sequenceGuide('watch',0,-1);
 hint('👀 MIRÁ LAS BALDOSAS QUE BRILLAN',g.round===1?'Se encenderán UNA POR VEZ. Recordá el orden.':g.rule);
 speak(g.round===1?'Mirá el orden':g.trap?'Atención a la trampa':'Mirá');
 await sleep(g.round===1?1550:g.trap?1300:950);if(mine!==token)return;
 // Destellos largos al principio, con una pausa oscura inequívoca entre cada paso.
 const stepTime=Math.max(650,1010-g.round*25);
 for(let step=0;step<g.sequence.length;step++){
  if(mine!==token)return;
  const tile=g.sequence[step];
  if(g.trap==='fantasmas'&&g.sequence.length>2&&(tile+g.round)%2===0){
   g.ghost=(tile+3)%9;beep(620,.08,'ghost');decorate();await sleep(180);g.ghost=-1;
  }
  if(mine!==token)return;
  g.highlight=tile;sequenceGuide('watch',step+1,tile);decorate();
  beep(C.COLORS[g.trap==='mentira'?(tile+1)%9:tile].hz,Math.min(.35,stepTime/1500));
  await sleep(stepTime);if(mine!==token)return;
  g.highlight=-1;sequenceGuide('watch',step+1,-1);decorate();
  await sleep(Math.max(290,stepTime*.34));if(mine!==token)return;
 }
 if(g.trap==='eco'){beep(770,.13);hint('¡ESO FUE UN ECO!', 'No era parte de la secuencia.');await sleep(680)}
 if(mine!==token)return;
 if(g.trap==='apagon'){g.blackout=true;hint('¡APAGÓN!', 'Conservá la secuencia en la memoria.');await sleep(950);g.blackout=false}
 if(mine!==token)return;
 if(g.trap==='identidad'){hint('¡CAMBIARON DE LUGAR!','Seguí el COLOR, aunque esté en otra celda.');await sleep(1200)}
 if(mine!==token)return;
 C.arm(g);renderGrid();sequenceGuide('turn',1);
 hint('🎯 ¡TU TURNO!',g.trap==='inversa'?'ORDEN INVERSO · DEL ÚLTIMO AL PRIMERO':mode==='demo'?'Tocá las baldosas en el mismo orden.':'Andá al centro de cada baldosa y tocá CONFIRMAR CELDA.');
 speak('Ahora vos');phaseAt=performance.now();
 candidateTile=-1;candidateAt=0;readyTile=-1;confirmedTile=-1;manualTile=-1;correctionMode=false;
 drawUI();decorate();
}
function finish(){
 if(!g||g.phase!=='finished')return;
 cancel();sequenceGuide('off');show('calPanel',false);show('pauseBtn',false);
 const s=C.stats(g),past=getRecord(),best=Math.max(past,s.score);
 if(best>past)putRecord(best);
 const didWin=g.lives>0&&g.round>=g.maxRounds;
 ui('endTitle',didWin?'🏆 ¡DOMINASTE A SIMÓN!':s.completed>0?'⚡ ¡SIMÓN QUIERE REVANCHA!':'🤖 SIMÓN TE GANÓ ESTA VEZ');
 ui('endData','PUNTOS '+s.score+' · RONDA '+s.round+' · PRECISIÓN '+s.accuracy+'% · RACHA '+s.bestCombo+(best>past?' · 🏆 NUEVO RÉCORD':''));
 ui('record',best.toLocaleString('es-AR'));show('result',true);
 hint('SIMÓN DICE...','¿OTRA PARTIDA?');
 if(best>past){beep(660,.45);vib([60,50,90])}else beep(180,.3,'wrong');
}
function commit(i){
 if(!g||g.phase!=='act'||g.paused)return null;
 const out=C.input(g,i,performance.now());if(out.type==='ignored')return;
 if(out.type==='electric'){beep(180,.10,'wrong');hint('⚡ ELECTRIFICADA','Esperá a que se apague y volvé a entrar.');return}
 if(out.type==='correct'||out.type==='round'||out.type==='victory'){
  beep(C.COLORS[g.colorMap[i]].hz,.20);vib([32,32,45]);hint(out.type==='correct'?(mode==='ar'?'✓ CELDA '+(i+1)+' REGISTRADA':'¡BIEN AHÍ!'):out.type==='victory'?'¡CAMPEÓN!':'¡RONDA PERFECTA!',out.type==='correct'?'PASO '+g.index+'/'+g.expected.length+' · ANDÁ A LA SIGUIENTE BALDOSA':'+'+out.points+' puntos');
 }else{beep(185,.34,'wrong');vib([85,70,120]);hint(out.type==='finished'?'SIMÓN GANÓ':'¡UPS! TE QUEDA OTRA OPORTUNIDAD','Era '+C.COLORS[g.expected[g.index]].name);}
 if(g.phase==='act')sequenceGuide('turn',g.index+1);
 else if(g.phase==='won')sequenceGuide('done');
 else sequenceGuide('off');
 drawUI();decorate();
 if(g.phase==='finished'){finish();return out}
 if(g.phase==='won'){
  const mine=token;const id=setTimeout(()=>{timers.delete(id);if(mine!==token||g.phase!=='won')return;C.next(g);playSequence()},1600);timers.add(id);
 }else if(g.phase==='retry'){
  const mine=token;const id=setTimeout(()=>{timers.delete(id);if(mine!==token||g.phase!=='retry')return;C.retry(g);playSequence()},1800);timers.add(id);
 }
 return out;
}
// En AR cada paso exige un toque deliberado; caminar no confirma ningún acierto.
function confirmCurrentCell(){
 if(mode!=='ar'||!calibrated||!g||g.phase!=='act'||g.paused)return false;
 if(performance.now()-lastTracked>=900||!frameState)return false;
 const pitch=frameState.ctx.boardSize,chosen=manualTile>=0?manualTile:readyTile;
 if(chosen<0||chosen===confirmedTile)return false;
 if(manualTile<0&&(player.tile!==chosen||!C.isCentered(player.x,player.z,chosen,pitch,.32)))return false;
 const result=commit(chosen);
 if(!result||result.type==='ignored'||result.type==='electric')return false;
 confirmedTile=chosen;readyTile=-1;manualTile=-1;correctionMode=false;candidateTile=chosen;candidateAt=performance.now();drawUI();
 return true;
}
function pickCell(i){
 if(mode!=='ar'||stage!=='fixed'&&stage!=='playing')return;
 if(g.phase==='act'&&!g.paused){g.paused=true;wasPlaying=true}
 picked=i;calibrated=false;sampleStart=0;samples=[];candidateTile=-1;candidateAt=0;readyTile=-1;confirmedTile=-1;manualTile=-1;correctionMode=false;
 document.querySelectorAll('[data-pick]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.pick)===i));
 hint('QUEDATE QUIETO UN SEGUNDO','Sostené el teléfono como lo llevarás durante la partida.');
 ui('calTitle','CALIBRANDO CELDA '+(i+1));show('calPanel',true);
}
function calibrate(time,frame,W,context){
 if(picked<0||calibrated)return;
 const pose=frame.getViewerPose(context.ref);if(!pose||pose.emulatedPosition)return;
 const p=pose.transform.position,o=toLocal(p,W);if(!Number.isFinite(o.x)||!Number.isFinite(o.z))return;
 if(!sampleStart)sampleStart=time;
 samples.push({x:o.x,z:o.z});if(samples.length>85)samples.shift();
 const percent=Math.min(100,Math.round((time-sampleStart)/1050*100));$('calFill').style.width=percent+'%';
 if(time-sampleStart<1050)return;
 const avg=samples.reduce((a,s)=>({x:a.x+s.x/samples.length,z:a.z+s.z/samples.length}),{x:0,z:0});
 const spread=samples.reduce((v,s)=>Math.max(v,Math.hypot(s.x-avg.x,s.z-avg.z)),0);
 if(spread>.095){sampleStart=time;samples=[];hint('SOSTENÉ EL TELÉFONO QUIETO','La medición necesita un segundo estable.');return}
 const pitch=context.boardSize;
 offset={x:(picked%3-1)*pitch-avg.x,z:(Math.floor(picked/3)-1)*pitch-avg.z};
 player={x:(picked%3-1)*pitch,z:(Math.floor(picked/3)-1)*pitch,tile:picked};
 phone={x:player.x,z:player.z};calibrated=true;lastTracked=time;trackingWarned=false;
 candidateTile=-1;candidateAt=0;readyTile=-1;confirmedTile=-1;manualTile=-1;correctionMode=false;
 ui('calTitle','✓ LISTO · CELDA '+(picked+1));hint('¡LISTO!','Tu posición está calibrada. Caminá despacio para comprobarla.');
 show('calPanel',false);show('startGame',g.phase==='idle');show('recal',true);
 if(wasPlaying){g.paused=true;hint('CALIBRACIÓN RECUPERADA','Tocá REANUDAR para continuar.');show('pauseBtn',true)}
 drawUI();
}
function toLocal(p,W){const x=p.x-W[12],y=p.y-W[13],z=p.z-W[14];return{x:x*W[0]+y*W[1]+z*W[2],z:x*W[8]+y*W[9]+z*W[10]}}
function track(time,frame,W,context){
 const pose=frame.getViewerPose(context.ref);
 if(!pose||pose.emulatedPosition){
  if(time-lastTracked>1000&&g.phase==='act'&&!g.paused){g.paused=true;trackingWarned=true;hint('📡 SEGUIMIENTO PERDIDO · PAUSA','Volvé a enfocar el piso y recalibrá si cambió tu posición.');drawUI()}
  return;
 }
 const p=pose.transform.position,q=toLocal(p,W),x=q.x+offset.x,z=q.z+offset.z,pitch=context.boardSize;
 if(!Number.isFinite(x)||!Number.isFinite(z))return;
 if(Math.hypot(x-phone.x,z-phone.z)>Math.max(.55,pitch*1.6)){if(g.phase==='act'&&!g.paused){g.paused=true;hint('SALTO DE SEGUIMIENTO','Recalibrá antes de seguir.')}return}
 const k=.25;phone={x:phone.x+(x-phone.x)*k,z:phone.z+(z-phone.z)*k};
 player={x:phone.x,z:phone.z,tile:C.positionFromPoint(phone.x,phone.z,pitch)};
 if(player.tile>=0&&!C.isCentered(phone.x,phone.z,player.tile,pitch,.43))player.tile=-1;
 lastTracked=time;
 if(g.phase!=='act'||g.paused){candidateTile=-1;readyTile=-1;return}
 const next=player.tile>=0&&C.isCentered(phone.x,phone.z,player.tile,pitch,.32)?player.tile:-1;
 if(next!==candidateTile){candidateTile=next;candidateAt=time;readyTile=-1;return}
 if(next<0||next===confirmedTile){readyTile=-1;return}
 if(time-candidateAt<340)return;
 if(Math.hypot(x-phone.x,z-phone.z)>pitch*.15){readyTile=-1;candidateAt=time;return}
 if(readyTile!==next){readyTile=next;vib(18)}

}
function onXR(time,frame,W,ctx){
 frameState={W,ctx};
 if(!g)return;
 if(!art&&ctx.gl){try{art=window.SimonArt.create(ctx.gl)}catch(e){hint('GPU NO DISPONIBLE',e.message);return}}
 if(calibrated)track(time,frame,W,ctx);else if(picked>=0)calibrate(time,frame,W,ctx);
 if(g.phase==='act'&&calibrated){const dt=lastFrame?Math.min(.15,(time-lastFrame)/1000):0;if(C.tick(g,dt)){if(g.phase==='finished')finish();else{hint('¡SE ACABÓ EL TIEMPO!','Prepará una nueva oportunidad.');const mine=token,t=setTimeout(()=>{timers.delete(t);if(mine===token&&g.phase==='retry'){C.retry(g);playSequence()}},1600);timers.add(t)}}}
 lastFrame=time;
 if(art)art.render(frame,W,ctx.sess,ctx.ref,g,ctx.boardSize,picked,calibrated?player:null,time,!!g.blackout,readyTile,confirmedTile);
 if(time-(window.__simonHUD||0)>125){window.__simonHUD=time;drawUI();decorate()}
}
function demoLoop(t){
 if(mode!=='demo')return;
 const dt=lastFrame?Math.min(.15,(t-lastFrame)/1000):0;lastFrame=t;
 if(g?.phase==='act'&&C.tick(g,dt)){if(g.phase==='finished')finish();else{hint('¡SIN TIEMPO!','Vas a repetir la ronda.');const mine=token,id=setTimeout(()=>{timers.delete(id);if(mine===token&&g.phase==='retry'){C.retry(g);playSequence()}},1300);timers.add(id)}}
 drawUI();decorate();requestAnimationFrame(demoLoop);
}
function setup(){
 newGame();
 const q=new URLSearchParams(location.search),room=q.get('room');
 if(room){offlineRoom=true;ui('roomInfo','SALA '+room+' · SINCRONIZACIÓN DEL JUEGO PENDIENTE');show('roomInfo',true)}
 $('mode').addEventListener('change',()=>newGame());$('seed').addEventListener('change',()=>newGame());
 $('demo').addEventListener('click',()=>{beep(440,.06);mode='demo';newGame();show('home',false);show('overlay',true);show('grid',true,'grid');show('touchpad',false);show('toolbar',false);show('lock',false);show('edit',false);show('calibrate',false);show('startGame',true);show('position',true);show('how',true);hint('MODO 2D · SIN CAMINAR','Memorizá la secuencia y tocá las baldosas.');lastFrame=0;requestAnimationFrame(demoLoop)});
 $('enter').addEventListener('click',()=>{mode='ar';newGame();hint('BUSCÁ EL PISO','Apuntá a un espacio libre; luego ajustá y fijá la pista.')});
 $('lock').addEventListener('click',()=>{if(stage==='fixed'){show('calPanel',true);show('picker',true,'grid');hint('¿DÓNDE ESTÁS PARADO?','Elegí tu celda actual para calibrar.');ui('calTitle','TOCÁ LA CELDA EN LA QUE ESTÁS');}});
 $('edit').addEventListener('click',()=>{if(g.phase==='act')g.paused=true;calibrated=false;picked=-1;samples=[];readyTile=-1;candidateTile=-1;manualTile=-1;correctionMode=false;show('calPanel',false);show('startGame',false);cancel();if(g.phase!=='idle')g.phase='idle'});
 $('startGame').addEventListener('click',startMatch);
 $('confirmCell').addEventListener('click',confirmCurrentCell);
 $('mapCorrection').addEventListener('click',()=>{if(mode!=='ar'||!g||g.phase!=='act'||g.paused)return;correctionMode=!correctionMode;if(correctionMode)manualTile=-1;mapDraw();drawUI();});
 $('recal').addEventListener('click',()=>{if(mode!=='ar')return;wasPlaying=g.phase==='act';if(wasPlaying)g.paused=true;calibrated=false;picked=-1;sampleStart=0;readyTile=-1;candidateTile=-1;manualTile=-1;correctionMode=false;show('calPanel',true);show('picker',true,'grid');ui('calTitle','MARCÁ TU CELDA ACTUAL');hint('RECALIBRAR','Marcá tu ubicación sin mover la pista ni perder puntos.');drawUI()});
 $('pauseBtn').addEventListener('click',()=>{if(!calibrated&&mode==='ar')return;g.paused=!g.paused;hint(g.paused?'PAUSA':'¡SEGUIMOS!',g.paused?'Podés recuperar el aliento.':'¡Que no te engañe Simón!');drawUI()});
 $('retryBtn').addEventListener('click',()=>{const keep=mode;newGame();mode=keep;if(keep==='ar'){show('startGame',calibrated);show('calPanel',!calibrated);if(stage==='playing')setStage('fixed')}else{show('startGame',true);show('grid',true,'grid')}});
 $('shareBtn').addEventListener('click',async()=>{const st=C.stats(g),txt='🧠⚡ SIMÓN TRAICIONERO · '+st.score+' puntos · ronda '+st.round+' · '+st.accuracy+'% de precisión. ¿Me superás? '+location.origin+'/simon.html';if(navigator.share)try{await navigator.share({title:'Modo Caos',text:txt})}catch(e){}else if(navigator.clipboard)try{await navigator.clipboard.writeText(txt);hint('COPIADO','¡Mandale el reto a alguien!')}catch(e){}});
 $('exitBtn').addEventListener('click',()=>location.assign('/'));
 $('muteBtn').addEventListener('click',()=>{quiet=!quiet;ui('muteBtn',quiet?'🔇':'🔊')});
 $('voiceBtn').addEventListener('click',()=>{voice=!voice;ui('voiceBtn',voice?'🎙️':'🚫🎙️')});
 $('volume').addEventListener('input',e=>{volume=Number(e.target.value)/100});
 document.querySelectorAll('[data-pick]').forEach(button=>button.addEventListener('click',()=>pickCell(Number(button.dataset.pick))));
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&g?.phase==='act'){g.paused=true;drawUI()}lastFrame=0});
 window.addEventListener('beforeunload',()=>{cancel();if(art)art.destroy();if(audioCtx)audioCtx.close().catch(()=>{})});
 window.modoCaosXRFrame=onXR;
 window.modoCaosXRCustomBoard=true;
 window.modoCaosGestureConfig={min:.32,max:.80,step:.035,label:x=>(3*x).toFixed(2)+' m de lado'};
}
document.addEventListener('DOMContentLoaded',setup);
})();
