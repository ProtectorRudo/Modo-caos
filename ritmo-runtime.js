'use strict';
/* RITMO CAOS — controlador. La partida AR SOLO se controla con posición espacial del teléfono. */
(function(){
const E=id=>document.getElementById(id),G=window.RitmoCore,A=window.RitmoArt,audio=window.RitmoAudio.create();
if(!G||!A)throw Error('Ritmo Caos requiere core y art');
const art=A.create(E('rtSvg'),E('gameCanvas')),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
window.modoCaosGestureConfig={min:.22,max:.40,step:.025,label:s=>(s*5).toFixed(2)+' m'};
try{boardSize=.32;tiles.fill(0);colors[0]='#09182e';rgb[0]=[.025,.055,.11];E('size').textContent='1,60 m'}catch(_){}
let game=G.make(),demo=false,locked=false,calibrated=false,sampling=false,selected=2,reference=null,
samples=[],sampleStart=0,filtered=2,lane=2,prevX=null,lastTrack=0,lost=false,
running=false,manualPause=false,calPaused=false,ending=false,rafLast=0,hudLast=0,drawLast=0,demoLane=2,
gestureStart=null,best=0,muted=false,toastUntil=0,lastEventCount=0,playedMilestones=new Set(),localReadyFor=null;
function song(){return E('song').value}function diff(){return E('difficulty').value}
function recordKey(){return 'ritmo-caos-'+song()+'-'+diff()}
function updateBest(){try{best=Number(localStorage.getItem(recordKey())||0)}catch(_){best=0}
 E('bestIntro').textContent='🏆 RÉCORD: '+best.toLocaleString('es-AR')+' PUNTOS'}

function localSelected(){return !!G.SONGS[song()]?.requiresFile}
function refreshMusic(){
 updateBest();
 E('localPanel').style.display=localSelected()?'block':'none';
 E('enter').disabled=localSelected()&&localReadyFor!==song();
 E('demo').disabled=localSelected()&&localReadyFor!==song();
 E('enter').textContent=localSelected()?'📷 JUGAR CON TU CANCIÓN EN AR':'📷 JUGAR EN REALIDAD AUMENTADA';
 E('fileStatus').textContent=localReadyFor===song()?'✅ AUDIO LISTO · '+(audio.localStatus()?.filename||'ARCHIVO LOCAL'):'Seleccioná primero el audio de esta canción (no se envía ni guarda en el servidor).';
}
E('song').onchange=refreshMusic;E('difficulty').onchange=updateBest;
E('localFile').addEventListener('change',async()=>{
 const file=E('localFile').files?.[0];if(!file)return;
 E('fileStatus').textContent='🎚 Analizando el pulso musical en tu celular…';
 E('enter').disabled=true;E('demo').disabled=true;
 try{
  const result=await audio.loadLocal(file,song());
  localReadyFor=song();E('beatOffset').value='0';E('beatOffsetLabel').textContent='0 ms';
  E('fileStatus').textContent='✅ '+file.name+' · '+result.bpm+' BPM · pulso estimado a '+Math.round(result.beatPhase*1000)+' ms. Ajustable si fuera necesario.';
 }catch(e){localReadyFor=null;E('fileStatus').textContent='⚠️ '+(e.message||'No se pudo leer el audio.')}
 refreshMusic();
});
refreshMusic();

E('latency').oninput=()=>{E('latencyValue').textContent=E('latency').value+' ms'};
E('beatOffset').oninput=()=>{E('beatOffsetLabel').textContent=E('beatOffset').value+' ms';};
function notify(s,duration=1100){E('toast').textContent=s;E('toast').style.opacity=1;toastUntil=performance.now()+duration}
function hideToast(t){if(t>toastUntil)E('toast').style.opacity=0}
function modeLabel(){return demo?'DEMO SIN AR':'SEGUIMIENTO DEL CELULAR'}
function setWhere(){const idx=clamp(game.lane,0,4);
 E('where').textContent='📍 VOS · '+['VERDE','ROJO','AMARILLO','AZUL','NARANJA'][idx]+' · '+modeLabel();
 E('where').style.borderColor=G.COLORS[idx];}
function showPrepare(isVisible){E('prepare').style.display=isVisible?'block':'none';E('where').style.display=locked||demo?'block':'none'}
function pick(n){selected=n;
 for(const b of E('pickLanes').querySelectorAll('button'))b.classList.toggle('selected',Number(b.dataset.lane)===n);
 if(locked)calibrate();
}
for(const b of E('pickLanes').querySelectorAll('button'))b.onclick=()=>pick(Number(b.dataset.lane));
function calibrate(){
 if(demo||!locked)return;
 calPaused=running&&!manualPause; if(running){game.paused=true;audio.pause();}
 calibrated=false;sampling=true;reference=null;samples=[];sampleStart=0;prevX=null;
 E('rtStart').disabled=true;E('rtStart').textContent='CALIBRANDO…';
 E('calTitle').textContent='📍 QUEDATE QUIETO UN SEGUNDO';
 E('calHint').textContent='Sostené el celular sobre el carril '+(selected+1)+'; el teléfono será tu referencia de movimiento.';
 E('calFill').style.width='0%';E('calPanel').style.display='block';showPrepare(true);
}
function fixed(){
 if(locked||demo)return;
 locked=true;E('head').style.display='none';E('lock').style.display='none';
 E('hud').style.display='flex';E('hud').style.display='block';
 showPrepare(true);calibrate();
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
 filtered=selected;lane=selected;prevX=center;sampling=false;calibrated=true;lastTrack=t;
 G.setPosition(game,selected,game.elapsed);E('calTitle').textContent='✅ LISTO · CARRIL '+(selected+1);
 E('calHint').textContent='Movete lateralmente llevando el celular. No hace falta tocar la pantalla para acertar.';
 E('rtStart').disabled=false;E('rtStart').textContent=running?'▶ CONTINUAR':'▶ ¡QUE SUENE LA MÚSICA!';
 notify('✓ ¡LISTO!',950);
 try{navigator.vibrate?.(35)}catch(_){}
 if(calPaused){calPaused=false;game.paused=false;audio.resume();showPrepare(false)}
}
function motion(t,dt,x){
 if(sampling){sample(t,x);return}
 if(!running||demo||!calibrated)return;
 if(x===null){if(t-lastTrack>800&&!lost){lost=true;pause(true);notify('📡 SIN SEGUIMIENTO · PAUSA',1800)}return}
 if(lost){lost=false;lastTrack=t;prevX=x;if(!manualPause){game.paused=false;audio.resume();notify('✓ SEGUIMIENTO RECUPERADO')}}
 lastTrack=t;
 if(prevX!==null&&Math.abs(x-prevX)>.38){reference.x+=x-prevX;prevX=x;return}
 prevX=x;
 const target=clamp(reference.selected+(x-reference.x)/reference.worldWidth,0,4);
 const smooth=1-Math.exp(-dt/.055);
 filtered+=clamp((target-filtered)*smooth,-Math.max(.14,dt*10),Math.max(.14,dt*10));
 // Histeresis pequeña: no alternar constantemente al cruzar un borde.
 if(filtered>lane+.56&&lane<4)lane++;else if(filtered<lane-.56&&lane>0)lane--;
 const safe=clamp(filtered,lane-.48,lane+.48);
 G.setPosition(game,safe,game.elapsed);
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
E('rtRecenter').onclick=calibrate;
E('exit').onclick=()=>{audio.stop();try{sess?.end()}catch(_){}location.href='/'};
E('lock').addEventListener('click',()=>setTimeout(()=>{if(typeof stage!=='undefined'&&stage==='fixed')fixed()},80));
E('edit').addEventListener('click',()=>{locked=false;calibrated=false;sampling=false;running=false;audio.stop();E('prepare').style.display='none';E('hud').style.display='none';E('head').style.display='block'});
function showHUD(t=0){
 if(!game)return;
 E('score').textContent=game.score.toLocaleString('es-AR');E('combo').textContent='×'+game.combo;
 E('energy').textContent=Math.round(game.energy)+'%';
 E('clock').textContent=Math.max(0,Math.ceil(game.duration-game.elapsed))+'s';
 E('progressFill').style.width=clamp(game.elapsed/game.duration*100,0,100)+'%';
 const forecast=game.notes.filter(n=>n.status==='pending'&&n.at>=game.elapsed-.1).slice(0,5);
 E('forecast').innerHTML=forecast.map(n=>'<i style="background:'+G.COLORS[n.lane]+'"></i>').join('');
 setWhere();
}
function onEvents(){
 for(const ev of game.events){
  if((ev.seq||0)<=lastEventCount)continue;
  lastEventCount=ev.seq;
  if(ev.type==='judgement'){
   const msg=ev.rating==='PERFECTO'?'✨ PERFECTO':ev.rating==='GENIAL'?'⚡ GENIAL':ev.rating==='BIEN'?'✓ BIEN':'✕ FALLO';
   if(ev.rating!=='FALLO'){notify(msg,360);try{navigator.vibrate?.(ev.rating==='PERFECTO'?24:12)}catch(_){}
    for(const n of [10,20,30,50])if(game.combo>=n&&!playedMilestones.has(n)){playedMilestones.add(n);notify('🔥 COMBO '+n+' · ¡ESCENARIO ENCENDIDO!',1000)}
   }else notify(msg,420);
  }
 }

}
async function begin(){
 if(ending)return;
 if(localSelected()&&localReadyFor!==song()){notify('FALTA ELEGIR EL AUDIO DE ESA CANCIÓN',1800);return}
 if(!demo&&(!locked||!calibrated)){notify('PRIMERO CALIBRÁ LA PISTA');return}
 const w=demo?.30:boardSize;
 if(localSelected()){const data=audio.localStatus();G.SONGS[song()].phaseSeconds=Math.max(-.95,(data?.beatPhase||0)+Number(E('beatOffset').value)/1000)}
 game=G.make(song(),diff(),w);
 G.setPosition(game,demo?demoLane:selected,0);G.start(game);
 E('result').style.display='none';E('hud').style.display='block';E('gamePause').style.display='block';E('where').style.display='block';
 E('head').style.display='none';E('rtStart').disabled=true;
 running=true;manualPause=false;lost=false;lastEventCount=0;playedMilestones.clear();
 if(!demo){E('prepare').style.display='none';if(reference){reference.selected=selected;reference.worldWidth=boardSize}filtered=selected;lane=selected;}
 try{await audio.start(song());audio.volume(muted)}catch(e){running=false;notify('EL AUDIO NO PUDO INICIAR');E('rtStart').disabled=false;return}
 notify('🎸 ¡A MOVERSE!',1200);
}
E('rtStart').onclick=()=>{if(running&&game.paused&&!lost){manualPause=false;game.paused=false;audio.resume();showPrepare(false)}
 else begin()};
function conclude(){
 if(ending)return;ending=true;running=false;audio.stop();
 try{const key=recordKey();if(game.score>best){best=game.score;localStorage.setItem(key,String(best))}}catch(_){}
 E('resultTitle').textContent=G.accuracy(game)>93?'🏆 ¡SHOW PERFECTO!':'¡FIN DEL CONCIERTO!';
 E('resultRank').textContent=G.ranking(game);
 E('resultStats').innerHTML='<b>'+game.score.toLocaleString('es-AR')+'</b> PUNTOS · '+G.accuracy(game)+'% PRECISIÓN<br>COMBO MÁXIMO: '+game.bestCombo+' · '+game.perfect+' PERFECTOS<br>GENIALES: '+game.great+' · BIEN: '+game.good+' · FALLOS: '+game.miss+'<br>RÉCORD: '+best.toLocaleString('es-AR');
 E('result').style.display='flex';E('gamePause').style.display='none';updateBest();
}
E('retry').onclick=()=>{
 ending=false;running=false;audio.stop();E('result').style.display='none';
 if(demo){demoLane=2;begin()}
 else {E('prepare').style.display='block';calibrate()}
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
  G.setPosition(game,demoLane,game.elapsed);G.tick(game,audio.now()+Number(E('latency').value)/1000);
  onEvents();if(game.state==='finished')conclude();
 }
 art.demo(game);if(t-hudLast>130){hudLast=t;showHUD(t)}hideToast(t);
}
function demoStart(){
 demo=true;demoLane=2;E('home').style.display='none';E('overlay').style.display='block';E('gameCanvas').style.display='block';E('rtSvg').style.display='none';
 E('demoControls').style.display='flex';E('hud').style.display='block';E('where').style.display='block';
 E('head').style.display='none';E('prepare').style.display='none';E('lock').style.display='none';
 E('exit').style.display='block';ending=false;begin();
}
E('demo').onclick=()=>{if(localSelected()&&localReadyFor!==song()){E('fileStatus').textContent='Seleccioná primero tu archivo de audio.';return}demoStart()};
const moveDemo=d=>{if(!demo||!running||game.paused)return;demoLane=clamp(demoLane+d,0,4);G.setPosition(game,demoLane,game.elapsed)};
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
 const x=position(frame,W);if(locked){motion(t,dt,x);
  if(x!==null&&!sampling)lastTrack=t;
 }
 if(running&&game.state==='playing'&&!game.paused){
  G.tick(game,audio.now()+Number(E('latency').value)/1000);
  onEvents();if(game.state==='finished')conclude();
 }
 if(t-drawLast>33){drawLast=t;art.ar(frame,W,locked?game:null,boardSize)}
 if(t-hudLast>120){hudLast=t;if(locked)showHUD(t);hideToast(t)}
};
setInterval(()=>{if(!demo&&running&&!sampling&&!lost&&performance.now()-lastTrack>1350){lost=true;pause(true);notify('📡 SEGUIMIENTO PERDIDO · EN PAUSA',1600)}},400);
E('enter').addEventListener('click',()=>{demo=false;ending=false;locked=false;calibrated=false;audio.init()});
requestAnimationFrame(loop);
})();
