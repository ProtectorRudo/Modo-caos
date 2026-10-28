/* FRUTÁSTROFE · 1v1 realtime rooms. Uses existing authenticated Modo Caos RPC client.
 Each phone has its own world-locked AR arena. No shared spatial tracking.
 Server owns room membership, match seed and clock; scores are bounded but client-reported. */
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm';
export function createFrutaOnline(bridge){
 const $=id=>document.getElementById(id),cfg=window.ModoCaosConfig;
 if(!cfg||!window.ModoCaosRooms)throw Error('Falta cargar las salas online de Modo Caos');
 const sb=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const mc=window.ModoCaosRooms.createClient(sb);
 let roomId='',code='',me='',room=null,connection=null,clockOffset=0,clockCalibrated=false,connected=false;
 let calibrated=false,lastRound=0,gameStarted=false,closed=false,busy=false,pollTimer=null,refreshing=false,lastPoll=0;
 let lastBroadcast=0,lastPersist=0,persisting=false,lastScore=null,finalSent=false,finishPending=false;
 let rematchRequested=false,previousRemoteSeq=-1,lastRemoteAt=0,otherScore=0,otherName='RIVAL',lastView='',lastHeartbeat=0,lastFinalizeAttempt=0;
 const panel=$('onlinePanel'),notice=$('onlineNotice'),hud=$('onlineHud'),result=$('onlineResult');
 const show=(open)=>{panel.style.display=open?'flex':'none'};
 const tell=(text,bad=false)=>{notice.textContent=text;notice.classList.toggle('error',bad)};
 function chooseName(){const n=$('onlineName').value.trim().slice(0,24);if(!n)throw Error('Escribí un apodo para jugar');try{localStorage.setItem('mc-fruta-nick',n)}catch(_){}return n}
 function setBusy(v){busy=v;for(const id of ['onlineCreate','onlineJoin','onlineReady','onlineStart','onlineCalibrate','onlineRematch'])$(id).disabled=v}
 function url(){return new URL(location.pathname,location.origin).origin+location.pathname+'?duel='+encodeURIComponent(code)}
 function players(){return room?.players||[]}
 function mine(){return players().find(p=>p.userId===me)}
 function rival(){return players().find(p=>p.userId!==me)}
 function host(){return room?.hostUserId===me}
 function serverNow(){return Date.now()+clockOffset}
 function seconds(){return room?.startedAt?Math.max(0,(serverNow()-Date.parse(room.startedAt))/1000):0}
 function status(){return room?.status||'none'}
 function roomRound(){return Number(room?.round||0)}
 function seed(){return Number(room?.seed||0)>>>0}
 function enterScreen(){
  $('onlineChoice').hidden=true;$('onlineRoom').hidden=false;
  panel.classList.toggle('in-ar',calibrated);
  $('onlineCode').textContent=code;
 }
 function linkShare(){
  const text='🍓⚡ Te desafío a FRUTÁSTROFE AR: 60 segundos, mismo cielo, ¡gana el mejor! '+url();
  if(navigator.share)navigator.share({title:'Frutástrofe online',text,url:url()}).catch(()=>{});
  else window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
 }
 function render(){
  if(!room)return;
  enterScreen();
  const you=mine(),opp=rival();otherName=opp?.name||'RIVAL';
  $('onlineRoster').replaceChildren();
  for(const p of players()){
   const el=document.createElement('div');el.className='online-person';
   const name=document.createElement('strong');name.textContent=(p.userId===me?'VOS · ':'')+(p.name||'Jugador');
   const state=document.createElement('span');state.textContent=p.ready?'✓ LISTO':'PREPARANDO';
   state.className=p.ready?'ready':'waiting';el.append(name,state);$('onlineRoster').append(el);
  }
  $('onlineConnection').textContent=connected?'● EN LÍNEA':'○ RECONECTANDO';
  const playing=status()==='playing',finished=status()==='finished',inLobby=status()==='lobby';
  $('onlineCalibrate').hidden=calibrated||finished;
  $('onlineCalibrate').textContent=playing?'◎ VOLVER A FIJAR ARENA':'◎ ABRIR CÁMARA Y FIJAR ARENA';
  $('onlineReady').hidden=!calibrated||!inLobby;
  $('onlineReady').textContent=you?.ready?'✓ YA ESTÁS LISTO':'✓ LISTO PARA JUGAR';
  $('onlineStart').hidden=!(host()&&inLobby);
  $('onlineStart').disabled=busy||players().length!==2||!players().every(p=>p.ready);
  $('onlineRematch').hidden=!finished;
  $('onlineRematch').textContent=host()?'↻ CREAR REVANCHA':'↻ PEDIR REVANCHA';
  const timeToStart=room?.startedAt?(Date.parse(room.startedAt)-serverNow())/1000:null;
  $('onlineStage').textContent=inLobby
   ?calibrated?'Arena fijada. Ambos deben marcar LISTO.':'Cada jugador coloca la arena en su propio piso.'
   :playing?(timeToStart>0?'¡EMPEZAMOS EN '+Math.ceil(timeToStart)+'!':'¡PARTIDA EN CURSO!')
   :'¡RONDA FINALIZADA!';
  $('onlineHint').textContent=inLobby?'Invitá al segundo jugador. Abran AR y fijen su arena antes de iniciar.':playing?'Ambos reciben el mismo cielo y reloj; cada uno apunta desde su teléfono.':'Resultados guardados. Pueden jugar otra ronda.';
  if(opp){if(Date.now()-lastRemoteAt>2600)otherScore=Math.max(0,Number(opp.score)||0);updateHud()}
  if(playing&&calibrated)maybeBegin();
  if(finished){updateResults();if(rematchRequested&&host())rematchRequested=false}
 }
 function updateHud(){
  $('onlineRivalName').textContent=otherName.toUpperCase().slice(0,16);
  $('onlineRivalScore').textContent=Math.round(otherScore).toLocaleString('es-AR');
  $('onlineNet').textContent=connected?'●':'○';
 }
 function updateResults(){
  if(!room)return;
  const own=mine(),opp=rival(),a=Number(own?.score||0),b=Number(opp?.score||0);
  const outcome=status()==='finished'?(a===b?'🤝 ¡EMPATE!':a>b?'🏆 ¡GANASTE!':'🎯 ¡GANA '+otherName.toUpperCase()+'!'):'ESPERANDO RESULTADO DEL RIVAL…';
  result.style.display='block';
  $('onlineResultTitle').textContent=outcome;
  $('onlineResultScores').textContent=(own?.name||'VOS')+' '+a.toLocaleString('es-AR')+'  ·  '+(opp?.name||'RIVAL')+' '+b.toLocaleString('es-AR');
 }
 async function rpc(n,data){
  await mc.ensureAuth();const {data:payload,error}=await sb.rpc('mc_fruta_'+n,data);
  if(error)throw Error(error.message||'No se pudo comunicar con el servidor');
  return payload;
 }
 async function refresh(){
  if(closed||!roomId||refreshing)return;refreshing=true;
  try{
   const before=Date.now(),latest=await rpc('state',{p_room_id:roomId}),after=Date.now();
   if(!latest?.id||latest.id!==roomId)return;
   const srv=Date.parse(latest.serverTime||'');if(Number.isFinite(srv)){const measured=srv-(before+after)/2;clockOffset=clockCalibrated?clockOffset*.65+measured*.35:measured;clockCalibrated=true;}
   const earlier=roomRound();room=latest;lastPoll=after;
   if(earlier!==roomRound()&&status()==='playing'){
    gameStarted=false;finalSent=false;lastScore=null;lastBroadcast=0;lastPersist=0;previousRemoteSeq=-1;lastRemoteAt=0;otherScore=0;
   }
   render();
  }catch(e){tell('Sin conexión al servidor. Reintentando… '+e.message,true)}
  finally{refreshing=false}
 }
 async function notify(){try{if(connection?.connected)await connection.notify()}catch(e){}}
 function receive(msg){
  if(!msg||msg.kind!=='fruta-score'||msg.userId===me||msg.round!==roomRound())return;
  if(!players().some(x=>x.userId===msg.userId)||!Number.isInteger(msg.seq)||msg.seq<=previousRemoteSeq)return;
  previousRemoteSeq=msg.seq;const points=Number(msg.score);
  if(!Number.isFinite(points)||points<0||points>1000000)return;
  otherScore=points;lastRemoteAt=Date.now();updateHud();
  if(msg.final)refresh();
 }
 async function enter(id,c){
  roomId=id;code=c;me=await mc.userId();
  try{sessionStorage.setItem('mc-fruta-duel',c)}catch(e){}
  enterScreen();show(true);tell('Conectando con el rival…');
  await refresh();
  if(connection)await connection.close();
  connection=await mc.connectRoom(roomId,{
   onStatus:(s,err)=>{connected=s==='SUBSCRIBED';render();if(s==='SUBSCRIBED'){tell('Sala conectada. ¡A preparar el AR!');refresh()}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')tell('Realtime desconectado, buscando reconexión…',true)},
   onRefresh:refresh,onPresence:refresh,onGameEvent:receive
  });
  if(pollTimer)clearInterval(pollTimer);
  pollTimer=setInterval(()=>{if(!document.hidden){refresh();maybeBegin();if(gameStarted)sendScore(false);if(Date.now()-lastHeartbeat>11000){lastHeartbeat=Date.now();mc.heartbeat(roomId).catch(()=>{})}}},1350);
  show(true);render();
 }
 async function act(fn){if(busy||closed)return;setBusy(true);try{await fn()}catch(e){tell(e.message||String(e),true)}finally{setBusy(false);render()}}
 $('onlineCreate').onclick=()=>act(async()=>{const result=await mc.createRoom('frutastrofe',chooseName(),2);await enter(result.room_id,result.room_code)});
 $('onlineJoin').onclick=()=>act(async()=>{const code=$('onlineJoinCode').value.trim().toUpperCase(),nick=chooseName();let result;try{result=await mc.joinRoom(code,nick)}catch(error){try{result=await mc.resumeRoom(code)}catch(_){throw error}}await enter(result.room_id,code)});
 $('onlineCopy').onclick=async()=>{try{await navigator.clipboard.writeText(url());tell('✓ Enlace copiado para compartir')}catch(e){prompt('Copiá este enlace:',url())}};
 $('onlineShare').onclick=linkShare;
 $('onlineCalibrate').onclick=()=>{if(!roomId)return;show(false);bridge.openAR()};
 $('onlineReady').onclick=()=>act(async()=>{if(!calibrated)return;await mc.setReady(roomId,true);await refresh();await notify()});
 $('onlineStart').onclick=()=>act(async()=>{if(!connected)throw Error('Esperá a que Realtime esté conectado en los dos teléfonos');await rpc('start',{p_room_id:roomId});await refresh();await notify()});
 $('onlineRematch').onclick=()=>act(async()=>{
  rematchRequested=true;
  if(host()){await rpc('rematch',{p_room_id:roomId});await refresh();await notify()}
  else{tell('Avisale al anfitrión que solicite la revancha.');await notify()}
  show(true);
 });
 $('onlineBack').onclick=()=>{show(false);if(!calibrated)bridge.closeOnline()};
 $('onlineExit').onclick=()=>{show(false);bridge.closeOnline()};
 function maybeBegin(){
  if(!calibrated||gameStarted||!room||status()!=='playing'||!room.startedAt||!Number.isInteger(seed()))return;
  if(serverNow()<Date.parse(room.startedAt)){
   show(true);return;
  }
  gameStarted=true;lastRound=roomRound();lastBroadcast=0;lastPersist=0;finalSent=false;
  show(false);hud.style.display='flex';result.style.display='none';
  bridge.begin({seed:seed(),round:lastRound,startedAt:Date.parse(room.startedAt),clockOffset});
 }
 function onArenaFixed(){
  calibrated=true;show(true);panel.classList.add('in-ar');tell('¡Arena fijada! Marcá LISTO; esperá al rival.');
  render();maybeBegin();
 }
 function scorePayload(isFinal=false){
  const snap=bridge.stats();
  if(!snap||!gameStarted||!roomId)return null;
  return {p_room_id:roomId,p_round:lastRound,p_score:Math.max(0,Math.round(snap.score||0)),
   p_shots:Math.max(0,Math.round(snap.shots||0)),p_hits:Math.max(0,Math.round(snap.hits||0)),
   p_chains:Math.max(0,Math.round(snap.chains||0)),p_final:!!isFinal};
 }
 async function sendScore(isFinal=false){
  if(closed||!gameStarted||status()!=='playing'||persisting||finalSent)return;
  const data=scorePayload(isFinal);if(!data)return;
  const ms=Date.now(),changed=data.p_score!==lastScore;
  if(connection?.connected&&(ms-lastBroadcast>700||isFinal)){
   lastBroadcast=ms;lastScore=data.p_score;
   connection.sendGameEvent({kind:'fruta-score',round:lastRound,seq:ms,score:data.p_score,final:isFinal}).catch(()=>{});
  }
  if(!isFinal&&ms-lastPersist<2350)return;
  if(isFinal&&serverNow()<Date.parse(room.startedAt)+58000)return;
  lastPersist=ms;persisting=true;
  try{
   await rpc('score',data);if(isFinal)finalSent=true;
   await notify();if(isFinal){await refresh();updateResults()}
  }catch(e){if(isFinal){finishPending=true;tell('Guardando resultado… '+e.message,true)}}
  finally{persisting=false}
 }
 async function finish(){
  if(!gameStarted||finalSent)return;
  await sendScore(true);
  show(false);hud.style.display='none';result.style.display='block';updateResults();
  // Sync if rival is late or drops. The server can close an abandoned match after 75s.
 }
 async function requestRematch(){
  if(status()!=='finished'){tell('Todavía esperamos el resultado del rival.');show(true);return}
  $('onlineRematch').click();
 }
 function frame(){
  if(closed||!roomId)return;
  if(status()==='playing'&&calibrated&&!gameStarted)maybeBegin();
  if(status()==='playing'&&gameStarted){
   if(finishPending&&!finalSent&&serverNow()>=Date.parse(room.startedAt)+59000)sendScore(true);
   if(serverNow()>Date.parse(room.startedAt)+76000&&Date.now()-lastFinalizeAttempt>8000){
    lastFinalizeAttempt=Date.now();rpc('finalize',{p_room_id:roomId}).then(refresh).catch(()=>{});
   }
  }
  if(panel.style.display==='flex'&&room?.startedAt&&status()==='playing'&&!gameStarted){
   const n=Math.ceil((Date.parse(room.startedAt)-serverNow())/1000);
   $('onlineStage').textContent=n>0?'¡EMPEZAMOS EN '+n+'!':'¡ENTRANDO AL JUEGO!';
  }
 }
 function open(){
  if(closed)return;
  $('onlineChoice').hidden=!!roomId;$('onlineRoom').hidden=!roomId;
  show(true);if(roomId)refresh();
 }
 async function close(){
  closed=true;clearInterval(pollTimer);pollTimer=null;
  const old=connection;connection=null;connected=false;if(old)await old.close().catch(()=>{});
  hud.style.display='none';result.style.display='none';show(false);
 }
 function onStateReceived(){refresh()}
 const deep=new URLSearchParams(location.search).get('duel');
 if(deep&&/^[a-f0-9]{8}$/i.test(deep)){$('onlineJoinCode').value=deep.toUpperCase()}
 try{$('onlineName').value=localStorage.getItem('mc-fruta-nick')||''}catch(e){}
 window.addEventListener('pagehide',()=>{close()},{once:true});
 return Object.freeze({open,onArenaFixed,close,frame,finish,sendScore,requestRematch,get active(){return !!roomId&&!closed},
  get playing(){return gameStarted},get match(){return room},get elapsed(){return gameStarted?Math.max(0,Math.min(60,seconds())):0},
  get calibrated(){return calibrated},get code(){return code},get clockOffset(){return clockOffset},get connected(){return connected},get client(){return mc}});
}
