'use strict';
/* RITMO CAOS — controlador. La partida AR SOLO se controla con posición espacial del teléfono. */
(function(){
const E=id=>document.getElementById(id),G=window.RitmoCore,A=window.RitmoArt,audio=window.RitmoAudio.create();
if(!G||!A)throw Error('Ritmo Caos requiere core y art');
const art=A.create(E('rtSvg'),E('gameCanvas')),fx=window.RitmoFx?.create(E('fxCanvas')),
 stageShowtime=window.RitmoStageShowtime?.create(),stagePremium=window.RitmoStagePremium?.create(),stage3d=window.RitmoStage3D?.create(),
 haptics=window.RitmoHaptics?.create(navigator),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let stage3dOK=false,activeStage=null,showtimeUsable=!!stageShowtime,premiumUsable=!!stagePremium;
window.modoCaosCustomRender=function(gl,view,W,t){
 const params=[gl,view,W,t,locked?game:null,boardSize,audio.spectrum];
 let success=false,renderer=null;
 // PRISM is a genuinely different stage design. Preserve both earlier renderers
 // as seamless fallback to avoid breaking floor placement on Android devices.
 if(showtimeUsable){
  try{success=!!stageShowtime.render(...params)}catch(_){success=false}
  if(success)renderer=stageShowtime;else showtimeUsable=false;
 }
 if(!success&&premiumUsable){
  try{success=!!stagePremium.render(...params)}catch(_){success=false}
  if(success)renderer=stagePremium;
  else premiumUsable=false; // stop trying a failing shader every XR frame
 }
 if(!success&&stage3d){
  try{success=!!stage3d.render(...params)}catch(_){success=false}
  if(success)renderer=stage3d;
 }
 activeStage=renderer;stage3dOK=success;
 // Visible proof of the actual WebXR renderer; never claim V37 scenery if a
 // legacy scene silently activates due to an older WebGL driver.
 const indicator=E('sceneVersion');
 if(indicator){
  const rendererName=!success?'2D DE RESPALDO':renderer===stageShowtime?'NEON PRISM':renderer===stagePremium?'ESCENARIO LEGACY':'WEBGL CLÁSICO';
  const current='V37 · '+rendererName;
  if(indicator.textContent!==current)indicator.textContent=current;
 }
 E('rtSvg').style.display=success?'none':'block';
 if(!success)E('playerBadge').style.display='none';
 return success;
};
function noteSpot(lane){return (stage3dOK?activeStage?.spot(lane):null)||art.spot?.(lane)}

window.modoCaosCustomArena=true;
window.modoCaosGestureConfig={min:.20,max:.32,step:.015,label:s=>(s*4).toFixed(2)+' m'};
try{boardSize=.25;tiles.fill(0);colors[0]='#09182e';rgb[0]=[.025,.055,.11];E('size').textContent='1,00 m'}catch(_){}
let game=G.make(),demo=false,locked=false,calibrated=false,sampling=false,selected=null,reference=null,
samples=[],sampleStart=0,filtered=1,lane=1,tracker=null,lastTrack=0,lost=false,
running=false,manualPause=false,calPaused=false,ending=false,rafLast=0,hudLast=0,drawLast=0,demoLane=1,
gestureStart=null,best=0,muted=false,toastUntil=0,lastEventCount=0,playedMilestones=new Set(),localReadyFor=null;
function song(){return E('song').value}function diff(){return E('difficulty').value}
function recordKey(){return 'ritmo-caos-'+song()+'-'+diff()}
function updateBest(){try{best=Number(localStorage.getItem(recordKey())||0)}catch(_){best=0}
 E('bestIntro').textContent='🏆 RÉCORD: '+best.toLocaleString('es-AR')+' PUNTOS'}

// Sólo se agregan canciones comerciales cuando el operador cargó permiso de master,
// sincronización de composición, grabación en nuestro servidor y mapa de notas exacto.
const licensed=window.RitmoLicensed?.available?.()||[];
const availableOptions=new Set(Array.from(E('song').querySelectorAll('option')).map(o=>o.value));
const missingOptions=licensed.filter(item=>!availableOptions.has(item.id));
if(missingOptions.length){
 const group=document.createElement('optgroup');group.label='ÉXITOS AUTORIZADOS · AUDIO INCLUIDO';
 for(const item of missingOptions){
  const option=document.createElement('option');option.value=item.id;option.textContent='🎧 '+item.title;group.appendChild(option);
 }
 E('song').insertBefore(group,E('song').firstChild);
}
// Despacito siempre arranca seleccionada, incluso si el navegador restaura el select.
if(G.SONGS.despacito_remix_justin)E('song').value='despacito_remix_justin';
else if(licensed.length)E('song').value=licensed[0].id;
let audioStatusToken=0;
async function checkMusic(){
 const token=++audioStatusToken,id=song(),status=E('audioStatus');
 if(!G.SONGS[id]?.licensedRecording){
  status.textContent='✅ Canción lista para jugar · No tenés que cargar archivos.';
  return;
 }
 status.textContent='🎵 Preparando '+G.SONGS[id].title+'…';
 try{
  await audio.preload(id);
  if(token===audioStatusToken)status.textContent='✅ '+G.SONGS[id].title+' · AUDIO LISTO PARA JUGAR.';
 }catch(err){
  if(token===audioStatusToken){
   status.textContent='⚠️ No se pudo preparar la canción: '+String(err?.message||err).slice(0,130)+'. Probá actualizar o elegir otro tema.';
   status.style.borderColor='#ff9c85';
  }
 }
}
E('song').onchange=()=>{updateBest();checkMusic()};
E('difficulty').onchange=updateBest;updateBest();
checkMusic();
E('latency').oninput=()=>{E('latencyValue').textContent=E('latency').value+' ms'};

function notify(s,duration=1100){E('toast').textContent=s;E('toast').style.opacity=1;toastUntil=performance.now()+duration}
function hideToast(t){if(t>toastUntil)E('toast').style.opacity=0}
function modeLabel(){return demo?'DEMO SIN AR':'SEGUIMIENTO DEL CELULAR'}
function setWhere(){const idx=clamp(game.lane,0,3);
 E('where').textContent='📍 VOS · '+['VERDE','ROJO','AMARILLO','AZUL'][idx]+' · '+modeLabel();
 E('where').style.borderColor=G.COLORS[idx];}
function showPrepare(isVisible){
 E('prepare').style.display=isVisible?'block':'none';
 E('where').style.display=(!isVisible&&(running||calibrated||demo))?'block':'none';
 E('hud').style.display=(!isVisible&&running)?'block':'none';
}
function pick(n){
 if(!locked||demo||n<0||n>3)return;
 selected=n;
 for(const b of E('pickLanes').querySelectorAll('button'))
  b.classList.toggle('selected',Number(b.dataset.lane)===n);
 calibrate();
}
for(const b of E('pickLanes').querySelectorAll('button'))b.onclick=()=>pick(Number(b.dataset.lane));
function chooseLane(){
 if(demo||!locked)return;
 if(running){game.paused=true;audio.pause();}
 calibrated=false;sampling=false;reference=null;selected=null;tracker=null;samples=[];sampleStart=0;
 for(const b of E('pickLanes').querySelectorAll('button'))b.classList.remove('selected');
 E('calTitle').textContent='👣 ¿EN QUÉ COLOR ESTÁS?';
 E('calHint').textContent='Elegí uno de los 4 círculos. Ese será tu punto real de partida.';
 E('calFill').style.width='0%';E('calPanel').style.display='block';
 E('rtStart').disabled=true;E('rtStart').textContent='PRIMERO ELEGÍ TU COLOR';
 showPrepare(true);
}
function calibrate(){
 if(demo||!locked||selected===null)return;
 calPaused=running&&!manualPause;
 if(running){game.paused=true;audio.pause();}
 calibrated=false;sampling=true;reference=null;tracker=null;samples=[];sampleStart=0;
 E('rtStart').disabled=true;E('rtStart').textContent='CALIBRANDO…';
 E('calTitle').textContent='📍 QUIETO 1 SEGUNDO · CARRIL '+(selected+1);
 E('calHint').textContent='Sostené quieto el celular donde estás. No muevas la pista.';
 E('calFill').style.width='0%';E('calPanel').style.display='block';showPrepare(true);
}
function fixed(){
 if(locked||demo)return;
 locked=true;E('head').style.display='none';E('lock').style.display='none';
 E('hud').style.display='none';E('forecast').style.display='none';showPrepare(true);chooseLane();
}
function position(frame,W){
 try{
  const pose=frame.getViewerPose(ref);if(!pose||pose.emulatedPosition||!W)return null;
  const v=pose.transform.position,dx=v.x-W[12],dy=v.y-W[13],dz=v.z-W[14];
  const x=W[0]*dx+W[1]*dy+W[2]*dz;return Number.isFinite(x)?x:null;
 }catch(_){return null}
}
function sample(t,x){
 if(!sampling)return;
 if(x===null){samples=[];sampleStart=0;E('calHint').textContent='Esperando seguimiento espacial de la cámara…';return}
 if(!sampleStart)sampleStart=t;
 samples.push(x);if(samples.length>55)samples.shift();
 if(Math.max(...samples)-Math.min(...samples)>.055){samples=samples.slice(-4);sampleStart=t;return}
 const pct=clamp((t-sampleStart)/1000,0,1);E('calFill').style.width=Math.round(pct*100)+'%';
 if(pct<1||samples.length<10)return;
 const center=samples.reduce((a,b)=>a+b,0)/samples.length;
 reference={x:center,selected,worldWidth:boardSize};
 filtered=selected;lane=selected;tracker=window.RitmoTracking.create(selected,center,boardSize);sampling=false;calibrated=true;lastTrack=t;
 G.setPosition(game,selected,game.elapsed);E('calTitle').textContent='✅ LISTO · CARRIL '+(selected+1);
 E('calHint').textContent='Movete lateralmente llevando el celular. No hace falta tocar la pantalla para acertar.';
 E('rtStart').disabled=false;E('rtStart').textContent=running?'▶ CONTINUAR':'▶ ¡QUE SUENE LA MÚSICA!';
 notify('✓ ¡LISTO!',950);
 try{navigator.vibrate?.(35)}catch(_){}
 if(calPaused){calPaused=false;game.paused=false;audio.resume();showPrepare(false)}
}
function motion(t,dt,x){
 if(sampling){sample(t,x);return}
 if(!running||demo||!calibrated||!tracker)return;
 if(x===null){if(t-lastTrack>800&&!lost){lost=true;pause(true);notify('📡 SIN SEGUIMIENTO · PAUSA',1800)}return}
 if(lost){
  lost=false;lastTrack=t;
  // Reconnect after tracking was lost without jumping the calibrated lane.
  tracker.recover(x,t);
  if(!manualPause){game.paused=false;audio.resume();notify('✓ SEGUIMIENTO RECUPERADO')}
 }
 lastTrack=t;
 const next=tracker.update(x,t,dt);
 lane=next.lane;filtered=next.filtered;
 G.setPosition(game,next.offset,game.elapsed);
}
function pause(forTracking=false){
 if(!running)return;
 game.paused=true;audio.pause();if(!forTracking)manualPause=true;
 E('gamePause').textContent='▶ CONTINUAR';
 if(!forTracking)notify('Ⅱ PAUSA');
}
function togglePause(){
 if(!running)return;
 if(!game.paused)pause();
 else if(!lost&&calibrated){manualPause=false;game.paused=false;audio.resume();E('gamePause').textContent='Ⅱ PAUSA';notify('¡SEGUÍ EL RITMO!')}
}
E('gamePause').onclick=togglePause;
E('sound').onclick=()=>{muted=!muted;audio.volume(muted);E('sound').textContent=muted?'🔇':'🔊'};
const qualityModes=['auto','high','low'];
const qualityNames=['✨ AUTO · V38','✨ ALTA · V38','✨ LIGERA · V38'];
E('quality').onclick=()=>{
 if(!stage3d&&!stagePremium&&!stageShowtime){notify('RENDERIZADO CLÁSICO');return}
 const renderer=activeStage||stageShowtime||stagePremium||stage3d;
 const next=(qualityModes.indexOf(renderer.mode())+1)%qualityModes.length;
 stageShowtime?.setQuality(qualityModes[next]);stagePremium?.setQuality(qualityModes[next]);
 stage3d?.setQuality(qualityModes[next]);
 E('quality').textContent=qualityNames[next];
 notify(next===0?'GRÁFICOS AUTOMÁTICOS':next===1?'GRÁFICOS ALTA CALIDAD':'GRÁFICOS MODO LIGERO',1000);
};

E('rtRecenter').onclick=chooseLane;
E('exit').onclick=()=>{E('playerBadge').style.display='none';E('holdHud').style.display='none';audio.stop();try{sess?.end()}catch(_){}location.href='/'};
E('lock').addEventListener('click',()=>{if(typeof stage!=='undefined'&&stage==='fixed')fixed()});
E('edit').addEventListener('click',()=>{locked=false;calibrated=false;sampling=false;running=false;E('holdHud').style.display='none';fx?.reset();audio.stop();E('prepare').style.display='none';E('hud').style.display='none';E('head').style.display='block'});
function showHUD(t=0){
 if(!game)return;
 if(!demo&&!running)return;
 E('score').textContent=game.score.toLocaleString('es-AR');E('combo').textContent='×'+game.combo;
 E('energy').textContent=Math.round(game.energy)+'%';
 E('clock').textContent=Math.max(0,Math.ceil(game.duration-game.elapsed))+'s';
 E('progressFill').style.width=clamp(game.elapsed/game.duration*100,0,100)+'%';
 const forecast=game.notes.filter(n=>n.status==='pending'&&n.at>=game.elapsed-.1).slice(0,5);
 E('forecast').innerHTML=forecast.map(n=>'<i style="background:'+G.COLORS[n.lane]+'"></i>').join('');
 const hold=game.holdActive,holder=E('holdHud');
 holder.style.display=running&&!game.paused&&hold?'block':'none';
 if(hold){
  const progress=Math.max(0,Math.min(100,Math.round(hold.progress*100)));
  E('holdFill').style.width=progress+'%';
  E('holdText').textContent='🎸 ¡MANTENÉ '+['VERDE','ROJO','AMARILLO','AZUL'][hold.note.lane]+'!';
  E('holdCount').textContent=progress+'% · NO CAMBIES DE CARRIL';
  holder.style.borderColor=G.COLORS[hold.note.lane];
 }
 E('combo').parentElement?.classList.toggle('streak',game.combo>=10);
 setWhere();
}
function onEvents(){
 for(const ev of game.events){
  if((ev.seq||0)<=lastEventCount)continue;
  lastEventCount=ev.seq;
  if(ev.type==='hold_start'){
   notify('🎸 ¡MANTENÉ ESE COLOR!',520);
   // The sustain START is only a preview, not a scored note. Do not vibrate yet.
   try{audio.feedback?.('HOLD_START',ev.lane,game.combo)}catch(_){}
  }else if(ev.type==='hold_complete'){
   fx?.burst(ev.lane,noteSpot(ev.lane),'HOLD',ev.combo,ev.points);
   (activeStage||stageShowtime||stagePremium||stage3d)?.hit(ev.lane,'HOLD');
   try{audio.feedback?.('HOLD_COMPLETE',ev.lane,ev.combo)}catch(_){}
   haptics?.scored(ev.note); // Exactly one miniature vibration on completed sustain
   notify('🌟 ¡SOSTENIDA PERFECTA! + PUNTOS',920);
  }else if(ev.type==='hold_break'){
   notify('↻ MANTENÉ TU COLOR MÁS TIEMPO',740);
  }else if(ev.type==='judgement'){
   const msg=ev.rating==='PERFECTO'?'✨ PERFECTO':ev.rating==='GENIAL'?'⚡ GENIAL':ev.rating==='BIEN'?'✓ BIEN':'✕ FALLO';
   const note=game.notes[ev.note];
   // Complete sustains get their own large effect and audio chord.
   if(note?.type!=='hold'){
    fx?.burst(ev.lane,noteSpot(ev.lane),ev.rating,ev.combo,ev.points);
    (activeStage||stageShowtime||stagePremium||stage3d)?.hit(ev.lane,ev.rating);
   }
   if(ev.rating!=='FALLO'){
    if(note?.type!=='hold'){
     /* Visible hit label remains at receptor; no central popup over horse DJ. */
     try{audio.feedback?.(ev.rating,ev.lane,ev.combo)}catch(_){}
     haptics?.scored(ev.note); // Every scored normal/slide/bonus note
    }
    for(const n of [10,20,30,50]){
     if(game.combo>=n&&!playedMilestones.has(n)){
      playedMilestones.add(n);fx?.celebrate(n);
      notify('🔥 COMBO '+n+' · ¡EL ESCENARIO EXPLOTA!',1000);
      // Combo gets visual/audio celebration but no second overlapping vibration.
     }
    }
   } // Missing note is already shown once beside its receptor.
  }
 }
}
async function begin(){
 if(ending)return;
 if(!demo&&(!locked||!calibrated)){notify('PRIMERO CALIBRÁ LA PISTA');return}
 const w=demo?.25:boardSize;
 game=G.make(song(),diff(),w);
 G.setPosition(game,demo?demoLane:selected,0);G.start(game);game.paused=true;
 E('result').style.display='none';E('hud').style.display='block';E('forecast').style.display='flex';E('gamePause').style.display='block';E('where').style.display='block';
 E('head').style.display='none';E('rtStart').disabled=true;
 running=true;manualPause=false;lost=false;lastEventCount=0;playedMilestones.clear();haptics?.reset();fx?.reset();
 E('holdHud').style.display='none';
 if(!demo){E('prepare').style.display='none';if(reference){reference.selected=selected;reference.worldWidth=boardSize}filtered=selected;lane=selected;}
 notify('♫ PREPARANDO LA CANCIÓN',1400);
 try{
  await audio.start(song());audio.volume(muted);game.paused=false;
   const delayMs=Math.round((audio.outputDelay?.()||0)*1000);
   E('latencyValue').textContent=E('latency').value+' ms · audio auto '+delayMs+' ms';
 }catch(e){
  audio.stop();running=false;game.state='ready';game.paused=false;E('holdHud').style.display='none';
  const detail=String(e?.message||e||'No se pudo reproducir el audio').slice(0,240);
  notify('⚠️ ERROR AL INICIAR LA CANCIÓN',2300);
  E('rtStart').disabled=false;E('gamePause').style.display='none';
  if(demo){
   // Don't strand the player inside a frozen demo. Offer another track or a retry.
   demo=false;
   E('overlay').style.display='none';E('home').style.display='flex';
   E('gameCanvas').style.display='none';E('demoControls').style.display='none';
   E('precheck').textContent='⚠️ No se pudo iniciar '+G.SONGS[song()].title+': '+detail+'. Probá otro tema o volvé a tocar DEMO.';
  }else{
   E('rtStart').textContent='↻ REINTENTAR CANCIÓN';
   E('calTitle').textContent='⚠️ LA CANCIÓN NO PUDO INICIAR';
   E('calHint').textContent=detail+' · Tocá REINTENTAR o volvé al menú para elegir otra.';
   E('calPanel').style.display='block';showPrepare(true);
  }
  return;
 }
 notify('🎸 ¡A MOVERSE!',1200);
}
E('rtStart').onclick=()=>{if(running&&game.paused&&!lost&&calibrated){manualPause=false;game.paused=false;audio.resume();showPrepare(false)}
 else begin()};
function conclude(){
 if(ending)return;ending=true;running=false;audio.stop();E('holdHud').style.display='none';fx?.celebrate(game.bestCombo);
 try{const key=recordKey();if(game.score>best){best=game.score;localStorage.setItem(key,String(best))}}catch(_){}
 E('resultTitle').textContent=G.accuracy(game)>93?'🏆 ¡SHOW PERFECTO!':'¡FIN DEL CONCIERTO!';
 E('resultRank').textContent=G.ranking(game);
 E('resultStats').innerHTML='<b>'+game.score.toLocaleString('es-AR')+'</b> PUNTOS · '+G.accuracy(game)+'% PRECISIÓN<br>COMBO MÁXIMO: '+game.bestCombo+' · '+game.perfect+' PERFECTOS<br>GENIALES: '+game.great+' · BIEN: '+game.good+' · FALLOS: '+game.miss+'<br>RÉCORD: '+best.toLocaleString('es-AR');
 E('result').style.display='flex';E('gamePause').style.display='none';updateBest();
}
E('retry').onclick=()=>{
 ending=false;running=false;audio.stop();E('result').style.display='none';
 if(demo){demoLane=1;begin()}
 else {E('prepare').style.display='block';chooseLane()}
};
E('finishExit').onclick=()=>{audio.stop();try{sess?.end()}catch(_){}location.href='/'};
E('share').onclick=async()=>{
 const s='🎸 ¡Hice '+game.score.toLocaleString('es-AR')+' puntos y '+G.accuracy(game)+'% en Ritmo Caos! '+location.origin+'/ritmo.html';
 try{if(navigator.share){await navigator.share({title:'Ritmo Caos',text:s});return}
 await navigator.clipboard.writeText(s);E('share').textContent='✅ COPIADO'}catch(_){try{await navigator.clipboard.writeText(s)}catch(e){}}
};
function loop(t){
 requestAnimationFrame(loop);if(!demo)return;
 const dt=rafLast?clamp((t-rafLast)/1000,0,.075):.016;rafLast=t;
 if(running&&game.state==='playing'){
  G.setPosition(game,demoLane,game.elapsed);G.tick(game,(audio.audibleNow?.()??audio.now())+Number(E('latency').value)/1000);
  onEvents();if(game.state==='finished')conclude();
 }
 art.demo(game);fx?.frame(t);if(t-hudLast>90){hudLast=t;showHUD(t)}hideToast(t);
}
function demoStart(){
 demo=true;demoLane=1;E('home').style.display='none';E('overlay').style.display='block';E('gameCanvas').style.display='block';E('rtSvg').style.display='none';
 E('demoControls').style.display='flex';E('hud').style.display='block';E('where').style.display='block';
 E('head').style.display='none';E('prepare').style.display='none';E('lock').style.display='none';
 E('exit').style.display='block';ending=false;begin();
}
E('demo').onclick=demoStart;
const moveDemo=d=>{if(!demo||!running||game.paused)return;demoLane=clamp(demoLane+d,0,3);G.setPosition(game,demoLane,game.elapsed)};
E('left').onclick=()=>moveDemo(-1);E('right').onclick=()=>moveDemo(1);
window.addEventListener('keydown',e=>{if(!demo)return;if(e.key==='ArrowLeft'||e.key==='a'){e.preventDefault();moveDemo(-1)}
 if(e.key==='ArrowRight'||e.key==='d'){e.preventDefault();moveDemo(1)}if(e.key===' '){e.preventDefault();togglePause()}});
E('gameCanvas').addEventListener('pointerdown',e=>{gestureStart={x:e.clientX,y:e.clientY}});
E('gameCanvas').addEventListener('pointerup',e=>{if(!gestureStart)return;let d=e.clientX-gestureStart.x;
 if(Math.abs(d)>24)moveDemo(d>0?1:-1);gestureStart=null});
let lastAR=0;
window.modoCaosXRFrame=function(t,frame,W){
 if(demo)return;
 const dt=lastAR?clamp((t-lastAR)/1000,0,.075):.016;lastAR=t;
 if(typeof stage!=='undefined'&&stage==='fixed'&&!locked)fixed();
 // The XR engine intentionally skips costly 3D rendering while scanning or
 // positioning the real floor. Do not retain a previous 3D success state,
 // otherwise after RECENTRAR the SVG placement preview remains invisible.
 if(typeof stage!=='undefined'&&(stage==='search'||stage==='preview')){
  stage3dOK=false;E('rtSvg').style.display='block';
 }
 const x=position(frame,W);if(locked){motion(t,dt,x);
  if(x!==null&&!sampling)lastTrack=t;
 }
 if(running&&game.state==='playing'&&!game.paused){
  G.tick(game,(audio.audibleNow?.()??audio.now())+Number(E('latency').value)/1000);
  onEvents();if(game.state==='finished')conclude();
 }
 if(t-drawLast>33&&!stage3dOK){drawLast=t;art.ar(frame,W,locked?game:null,boardSize)}
 const tag=E('playerBadge'),spot=locked&&calibrated&&stage3dOK?activeStage?.spot(game.lane):null;
 if(tag){
  tag.style.display=spot&&!demo?'block':'none';
  if(spot){tag.style.left=spot[0]+'px';tag.style.top=(spot[1]-40)+'px';tag.textContent='◆ VOS'}
 }
 fx?.frame(t);
 if(t-hudLast>120){hudLast=t;if(locked&&running)showHUD(t);hideToast(t)}
};
setInterval(()=>{if(!demo&&running&&!sampling&&!lost&&performance.now()-lastTrack>1350){lost=true;pause(true);notify('📡 SEGUIMIENTO PERDIDO · EN PAUSA',1600)}},400);
E('enter').addEventListener('click',()=>{
 demo=false;ending=false;locked=false;calibrated=false;
 try{audio.init()}catch(e){E('precheck').textContent='⚠️ El navegador no pudo inicializar audio: '+(e.message||e)+'. Probá Chrome Android.'}
});
window.modoCaosRuntimeReady=true;
if(E('enter').dataset)E('enter').dataset.gameReady='true';
requestAnimationFrame(loop);
})();
