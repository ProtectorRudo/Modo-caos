import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm';
/**
 * MODO CAOS — authenticated rooms lobby.
 * Live roster and server-authorized ready/start/finish. No fake scores or
 * claim that independent minigame HTML pages are synchronized yet.
 */
const $=id=>document.getElementById(id);
const config=window.ModoCaosConfig;
if(!config?.url||!config?.publishableKey||!window.ModoCaosRooms)throw Error('No se cargó la configuración de salas.');
const supabase=createClient(config.url,config.publishableKey,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
});
const mc=window.ModoCaosRooms.createClient(supabase);
let mode='create',room=null,me=null,currentCode='',conn=null,busy=false,refreshing=false,lastRefresh=0,clockSkew=0,pulseCount=0;
let seq=0,roomEpoch=0,interval=null,hostIdent=null,connectedOnce=false;
const ui={
 ready:$('readyButton'),begin:$('startButton'),finish:$('finishButton'),
 leave:$('leaveButton'),code:$('roomCode'),players:$('players'),conn:$('connection'),
 countdown:$('syncClock'),meta:$('roomMeta'),pulse:$('pulseSignal')
};
function label(text,error=false,withLink=false){
 const box=$('notice');
 box.textContent=text;box.classList.add('active');box.classList.toggle('error',error);
 if(withLink){
  const a=document.createElement('a');a.href='https://supabase.com/dashboard/project/bwsgxpttnrctklrcjmjs/auth/providers';
  a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Abrir configuración de Supabase Auth ↗';
  box.appendChild(a);
 }
}
function clearLabel(){$('notice').classList.remove('active','error');$('notice').textContent=''}
function fail(err){
 console.warn('Modo Caos:',err);
 const msg=err?.message||String(err);
 label(msg,true,err?.code==='ANONYMOUS_AUTH_UNAVAILABLE');
}
function store(key,value){
 try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch(e){}
}
function stored(key){
 try{return localStorage.getItem(key)}catch(e){return null}
}
function setBusy(on){
 busy=on;
 for(const id of ['create','join','resume']){
  $(id).disabled=on;
 }
}
async function run(action){
 if(busy)return;setBusy(true);clearLabel();
 try{await action()}catch(e){fail(e)}finally{setBusy(false)}
}
function nickname(){
 const name=$('nickname').value.trim();
 if(!name||name.length>24)throw new Error('Escribí un apodo de hasta 24 caracteres');
 store('mc-player-name',name);return name;
}
function tab(what){
 mode=what;
 $('tabCreate').classList.toggle('selected',what==='create');
 $('tabJoin').classList.toggle('selected',what==='join');
 $('creator').classList.toggle('hidden',what!=='create');
 $('joiner').classList.toggle('hidden',what!=='join');
}
$('tabCreate').onclick=()=>tab('create');
$('tabJoin').onclick=()=>tab('join');
const chosen=(new URLSearchParams(location.search)).get('game');
if(chosen&&[...$('gameChoice').options].some(o=>o.value===chosen))$('gameChoice').value=chosen;
const deep=(new URLSearchParams(location.search)).get('room');
if(deep&&/^[A-Fa-f0-9]{8}$/.test(deep)){tab('join');$('joinCode').value=deep.toUpperCase()}
$('nickname').value=stored('mc-player-name')||'';
const old=stored('mc-last-room');
if(old&&/^[A-F0-9]{8}$/.test(old)){$('resumeWrap').style.display='block';$('resume').textContent='↻ RETOMAR SALA '+old}
$('create').onclick=()=>run(async()=>{
 const name=nickname(),game=$('gameChoice').value,count=+$('seats').value;
 label('Creando tu sesión y preparando la sala…');
 const result=await mc.createRoom(game,name,count);
 await enterRoom(result.room_id,result.room_code);
});
$('join').onclick=()=>run(async()=>{
 const name=nickname(),code=$('joinCode').value.trim().toUpperCase();
 label('Conectando con la sala…');
 const result=await mc.joinRoom(code,name);
 await enterRoom(result.room_id,code);
});
$('resume').onclick=()=>run(async()=>{
 const code=stored('mc-last-room');if(!code)throw new Error('No hay una sala para retomar');
 label('Reconectando a tu sala…');
 const result=await mc.resumeRoom(code);
 if(!result){store('mc-last-room',null);throw new Error('Ya no pertenecés a esa sala')}
 await enterRoom(result.room_id,code);
});
function updateClock(){
 if(!room||room.status==='lobby')return;
 if(room.status==='finished'){ui.countdown.textContent='PARTIDA FINALIZADA';return}
 if(!room.startedAt){ui.countdown.textContent='ESPERANDO INICIO';return}
 const distance=new Date(room.startedAt).getTime()-(Date.now()+clockSkew);
 ui.countdown.textContent=distance>0?'EMPEZAMOS EN '+Math.ceil(distance/1000):'¡PARTIDA INICIADA!';
}
function render(){
 if(!room||!me)return;
 ui.code.textContent=room.code;
 ui.meta.textContent=(room.players?.length||0)+' / '+room.maxPlayers+' jugadores · '+(room.game||'Modo Caos').replaceAll('-',' ').toUpperCase();
 ui.players.replaceChildren();
 const user=room.players.find(p=>p.userId===me);
 const isHost=room.hostUserId===me;
 hostIdent=room.hostUserId;
 for(const p of room.players){
  const item=document.createElement('div');item.className='player';
  const avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=String(p.slot);
  const detail=document.createElement('div');detail.className='details';
  const name=document.createElement('strong');name.textContent=p.name+(p.userId===me?' (VOS)':'');
  const sub=document.createElement('small');sub.textContent=p.userId===room.hostUserId?'ANFITRIÓN':'INVITADO';
  detail.append(name,sub);
  const mark=document.createElement('div');mark.className='mark'+(p.ready?' ready':'');
  mark.textContent=p.ready?'✓ LISTO':'ESPERANDO';
  item.append(avatar,detail,mark);ui.players.appendChild(item);
 }
 for(let slot=room.players.length+1;slot<=room.maxPlayers;slot++){
  const item=document.createElement('div');item.className='player';
  const avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=String(slot);
  const detail=document.createElement('div');detail.className='details';
  const name=document.createElement('strong');name.textContent='Lugar disponible';
  const sub=document.createElement('small');sub.textContent='Compartí el código para invitar';
  detail.append(name,sub);item.append(avatar,detail);ui.players.appendChild(item);
 }
 const inLobby=room.status==='lobby';
 ui.ready.classList.toggle('hidden',!inLobby);
 ui.ready.textContent=user?.ready?'↺ YA ESTOY LISTO · CAMBIAR':'✓ ESTOY LISTO';
 ui.ready.disabled=false;
 ui.begin.classList.toggle('hidden',!isHost||!inLobby);
 ui.begin.disabled=!(room.players?.length>=2&&room.players.every(p=>p.ready));
 ui.finish.classList.toggle('hidden',!isHost||room.status!=='playing');
 $('goGame').classList.toggle('hidden',!['semaforo-traicionero','lluvia-meteoros','rodeados-360'].includes(room.game));
 $('goGame').textContent=room.game==='rodeados-360'?'🤖 ABRIR RODEADOS Y CALIBRAR':room.game==='lluvia-meteoros'?'☄️ ABRIR METEOROS Y CALIBRAR':'🚦 ABRIR SEMÁFORO Y CALIBRAR';
 ui.conn.textContent=conn?.connected?'● CONECTADO':'○ '+(conn?'RECONECTANDO':'SIN CONEXIÓN');
 updateClock();
}
let requestCount=0;
async function refresh(){
 if(refreshing||!room||!me)return;
 refreshing=true;const token=++requestCount;
 try{
  const before=Date.now();
  const updated=await mc.getRoom(room.id);
  if(token!==requestCount||updated?.id!==room?.id)return;
  const after=Date.now(),serverTime=Date.parse(updated.serverTime||'');
  if(Number.isFinite(serverTime))clockSkew=serverTime-(before+after)/2;
  room=updated;render();lastRefresh=after;
 }catch(e){label('No pudimos actualizar el estado: '+(e.message||e),true)}
 finally{refreshing=false}
}
async function notify(){try{await conn?.notify()}catch(e){console.warn('Realtime no disponible, polling continúa',e)}}
async function enterRoom(id,code){
 const epoch=++roomEpoch;
 if(conn){await conn.close();conn=null}
 const my=await mc.userId();
 if(epoch!==roomEpoch)return;
 me=my;room={id,code,status:'lobby',players:[],maxPlayers:4};
 currentCode=code;
 store('mc-last-room',code);
 $('choices').style.display='none';$('resumeWrap').style.display='none';
 $('roomPanel').style.display='block';
 ui.code.textContent=code;
 await refresh();
 conn=await mc.connectRoom(id,{
  onStatus:(status,err)=>{
   ui.conn.textContent=status==='SUBSCRIBED'?'● CONECTADO':status==='CHANNEL_ERROR'?'⚠ ERROR DE CONEXIÓN':status==='TIMED_OUT'?'⚠ SIN RESPUESTA':'○ '+status;
   if(status==='SUBSCRIBED'){connectedOnce=true;clearLabel();refresh()}
   if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')label('Realtime: '+(err?.message||status)+'. Las actualizaciones periódicas seguirán intentando mantener la sala al día.',true);
  },
  onRefresh:()=>refresh(),
  onPresence:()=>refresh(),
  onPulse:(payload)=>{
   if(!payload?.userId||payload.userId===me)return;
   pulseCount++;
   const n=room?.players?.find(p=>p.userId===payload.userId)?.name||'Otro jugador';
   ui.pulse.textContent='⚡ ¡SEÑAL RECIBIDA DE '+n.toUpperCase()+'! · '+pulseCount+' pulsos';
   ui.pulse.style.borderColor='#56ffd6';
   try{navigator.vibrate?.(45)}catch(e){}
  }
 });
 if(epoch!==roomEpoch)await conn?.close();
 if(interval)clearInterval(interval);
 interval=setInterval(async()=>{
  if(!room||!me||document.hidden)return;
  if(Date.now()-lastRefresh>2300)await refresh();
  if((++seq)%6===0){try{await mc.heartbeat(room.id)}catch(e){}}
 },2600);
 render();clearLabel();
}
$('readyButton').onclick=()=>run(async()=>{
 if(!room)return;const current=room.players?.find(p=>p.userId===me);
 const done=await mc.setReady(room.id,!current?.ready);
 if(done!==true)throw new Error('No se pudo cambiar tu estado. ¿Ya comenzó la partida?');
 await refresh();await notify();
});
$('startButton').onclick=()=>run(async()=>{
 if(!room)return;
 const startTime=await mc.startRoom(room.id);
 label('¡Todos listos! Inicio sincronizado.');
 await refresh();await notify();
});
$('finishButton').onclick=()=>run(async()=>{
 if(!room)return;
 await mc.finishRoom(room.id);
 await refresh();await notify();
});
$('pulseButton').onclick=()=>run(async()=>{
 if(!conn?.connected)throw new Error('Todavía no se conectó Realtime. Revisá el estado arriba.');
 await conn.pulse();
 label('⚡ Pulso enviado. Verificá que también aparezca en el otro celular.');
});
$('goGame').onclick=()=>{if(!room)return;const route=room.game==='lluvia-meteoros'?'/meteoros.html':room.game==='semaforo-traicionero'?'/semaforo.html':room.game==='rodeados-360'?'/rodeados.html':null;if(route)location.href=route+'?room='+encodeURIComponent(room.code)};
function link(){return location.origin+'/salas.html?room='+encodeURIComponent(currentCode)}
$('share').onclick=()=>{
 const content='¡Te invito a Modo Caos! Entrá a mi sala '+currentCode+': '+link();
 window.open('https://wa.me/?text='+encodeURIComponent(content),'_blank','noopener,noreferrer');
};
$('copy').onclick=()=>run(async()=>{
 const url=link();
 try{await navigator.clipboard.writeText(url);label('✓ Enlace copiado. ¡Mandáselo a tus amigos!')}
 catch(e){window.prompt('Copiá este enlace:',url)}
});
$('leaveButton').onclick=()=>run(async()=>{
 if(!room)return;
 await mc.leaveRoom(room.id);
 const oldConn=conn;roomEpoch++;conn=null;room=null;me=null;
 if(interval){clearInterval(interval);interval=null}
 store('mc-last-room',null);
 if(oldConn)await oldConn.close();
 $('roomPanel').style.display='none';$('choices').style.display='block';
 label('Saliste de la sala. Podés crear otra o unirte con otro código.');
});
window.addEventListener('pagehide',()=>{
 if(conn)conn.close().catch(()=>{});
 if(interval)clearInterval(interval);
});
setInterval(updateClock,140);
