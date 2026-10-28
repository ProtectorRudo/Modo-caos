import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm';
/* CIVIDOM: actual shared 25-player simulation with two human controllers.
   Room RPC and authenticated private Realtime already exist in Modo Caos. */
const config=window.ModoCaosConfig, API=window.ModoCaosRooms, game=window.CividomOnlineBridge;
if(!config?.publishableKey||!API||!game)throw Error('CIVIDOM no pudo cargar las salas privadas');
const supabase=createClient(config.url,config.publishableKey,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
});
const mc=API.createClient(supabase),CODE=/^[A-F0-9]{8}$/;
const $=id=>document.getElementById(id);
const deepCode=new URLSearchParams(location.search).get('room')?.toUpperCase();
let room=null,conn=null,me=null,role='solo',code='',starting=false,busy=false;
let hostId=null,guestId=null,poll=null,stream=null,steer=null,lastPacketAt=0;
let sendBusy=false,lastMapRevision=-1,lastMapAt=0;
const css=document.createElement('style');
css.textContent=[
 '#cv-online-modal{position:fixed;inset:0;z-index:20000;display:none;align-items:center;justify-content:center;padding:17px;background:#07152eea;backdrop-filter:blur(9px);color:white;font:600 14px system-ui}',
 '#cv-online-modal.open{display:flex}',
 '#cv-online-modal .panel{width:min(440px,100%);max-height:94vh;overflow:auto;padding:20px;border-radius:23px;border:1px solid #7bcdebbb;background:linear-gradient(155deg,#173963,#0b1937);box-shadow:0 15px 50px #000a}',
 '#cv-online-modal h2{margin:0 0 7px;color:#ffe5a3;font-size:23px}',
 '#cv-online-modal p{margin:6px 0 12px;color:#c8e0f0;font-size:12px}',
 '#cv-online-modal input{width:100%;padding:11px;background:#0b2647;border:1px solid #83b7e6;color:white;border-radius:11px;font-size:16px}',
 '#cv-online-modal label{display:block;font-size:11px;margin:10px 0 4px;color:#bad6f3}',
 '#cv-online-modal button{width:100%;margin-top:8px;min-height:42px;padding:10px;border-radius:12px;background:linear-gradient(150deg,#255b98,#143868);border:1px solid #8fc9ff88;color:#fff;font:900 13px system-ui}',
 '#cv-online-modal button.gold{background:linear-gradient(140deg,#ffe392,#ffb459);color:#152d51;border:1px solid #fff1ab}',
 '#cv-online-modal button:disabled{opacity:.4}',
 '#cv-online-modal #cv-code{font:900 30px monospace;letter-spacing:5px;color:#ffe491;text-align:center;padding:10px;margin:12px 0;border:1px dashed #ffd78288;border-radius:11px}',
 '#cv-online-modal #cv-status{padding:8px;border-radius:10px;background:#102d50;border:1px solid #6793bd88;color:#c9e9ff;min-height:34px;margin:8px 0;font-size:12px}',
 '#cv-online-modal #cv-status.error{color:#ffbeb7;border-color:#ff967e}',
 '#cv-online-modal #cv-people{font-size:13px;display:grid;gap:6px}',
 '#cv-online-modal .player{display:flex;justify-content:space-between;gap:8px;padding:8px;background:#b7e7ff11;border-radius:9px}',
 '#cv-online-button{display:block;width:100%;padding:13px 10px;border:2px solid #ffe0a0;border-radius:13px;background:linear-gradient(145deg,#193c6a,#246292);color:#ffe4a8;font:900 14px system-ui;margin:9px 0}',
 '#cv-live-pill{position:fixed;left:8px;top:max(165px,env(safe-area-inset-top) + 159px);z-index:80;padding:7px 10px;border-radius:12px;background:#102f54e8;border:1px solid #78d2ffaa;color:#ffe6a3;font:900 10px system-ui;display:none;pointer-events:none}'
].join('\n');document.head.appendChild(css);
const modal=document.createElement('div');modal.id='cv-online-modal';
modal.innerHTML='<div class="panel" role="dialog" aria-modal="true"><h2>⚔️ CIVIDOM CON AMIGOS</h2>'+
'<p>Dos personas reales en el mismo mapa contra 23 bots. Invitá por enlace y jueguen una sola partida.</p>'+
'<label>TU NOMBRE</label><input id="cv-nick" maxlength="24" placeholder="Tu nombre"/>'+
'<div id="cv-join-wrap" style="display:none"><label>CÓDIGO DE SALA</label><input id="cv-join-code" maxlength="8"/></div>'+
'<div id="cv-status">Creá tu sala o entrá con una invitación.</div>'+
'<div id="cv-detail" style="display:none"><div id="cv-code"></div><div id="cv-people"></div></div>'+
'<button class="gold" id="cv-action">CREAR SALA E INVITAR</button>'+
'<button id="cv-share" style="display:none">COMPARTIR EN WHATSAPP</button>'+
'<button id="cv-copy" style="display:none">COPIAR ENLACE</button>'+
'<button id="cv-ready" style="display:none">✓ ESTOY LISTO</button>'+
'<button class="gold" id="cv-go" style="display:none" disabled>EMPEZAR PARTIDA</button>'+
'<button id="cv-back">VOLVER AL MENÚ</button>'+
'<p>El anfitrión mantiene la partida activa. Los dos celulares necesitan Internet.</p></div>';
document.body.appendChild(modal);
const pill=document.createElement('div');pill.id='cv-live-pill';document.body.appendChild(pill);
const entry=document.createElement('button');entry.id='cv-online-button';entry.textContent='⚔️ JUGAR CON UN AMIGO · INVITAR';
const home=$('home');
(home?.querySelector('#best')||home)?.insertAdjacentElement('afterend',entry);
try{$('cv-nick').value=localStorage.getItem('cividom-online-name')||$('nick')?.value||''}catch(_){}
const msg=(text,error=false)=>{$('cv-status').textContent=text;$('cv-status').classList.toggle('error',error)};
const name=()=>{const n=$('cv-nick').value.trim().slice(0,24)||'Jugador';try{localStorage.setItem('cividom-online-name',n)}catch(_){}return n};
function show(joinCode=''){
 if(starting)return;
 modal.classList.add('open');
 $('cv-action').textContent=joinCode?'ENTRAR A LA SALA':'CREAR SALA E INVITAR';
 $('cv-join-wrap').style.display=joinCode?'block':'none';
 if(joinCode)$('cv-join-code').value=joinCode;
 msg(joinCode?'Recibiste una invitación. Poné tu nombre y entrá.':'Creá una sala y compartí el enlace.');
}
entry.onclick=()=>show();
$('cv-back').onclick=()=>{if(!starting)modal.classList.remove('open')};
if(deepCode&&CODE.test(deepCode))show(deepCode);
const link=()=>location.origin+location.pathname+'?room='+encodeURIComponent(code);
function canGo(){return !!(room?.status==='lobby'&&room?.players?.length===2&&room.players.every(p=>p.ready)&&conn?.connected)}
function showRoom(){
 if(!room)return;
 $('cv-detail').style.display='block';$('cv-code').textContent=room.code;
 $('cv-share').style.display='block';$('cv-copy').style.display='block';
 $('cv-action').style.display='none';
 $('cv-ready').style.display=room.status==='lobby'?'block':'none';
 $('cv-go').style.display=role==='host'&&room.status==='lobby'?'block':'none';
 $('cv-go').disabled=busy||!canGo();
 const current=room.players?.find(p=>p.userId===me);
 $('cv-ready').textContent=current?.ready?'✓ LISTO · CAMBIAR':'✓ ESTOY LISTO';
 $('cv-people').replaceChildren();
 for(const p of room.players||[]){
  const r=document.createElement('div');r.className='player';
  const n=document.createElement('span');n.textContent=(p.slot===1?'👑 ':'🎮 ')+p.name;
  const state=document.createElement('span');state.textContent=p.ready?'✓ LISTO':'ESPERANDO';
  r.append(n,state);$('cv-people').append(r);
 }
}
async function refresh(){
 if(!room)return;
 try{
  const r=await mc.getRoom(room.id);
  if(!r||r.game!=='cividom')throw Error('Esta no es una sala de CIVIDOM');
  room=r;hostId=r.hostUserId;guestId=r.players?.find(p=>p.slot===2)?.userId||null;
  showRoom();
  if(r.status==='playing')schedule();
 }catch(e){msg('No se pudo actualizar la sala: '+e.message,true)}
}
async function connect(){
 if(conn)await conn.close();
 conn=await mc.connectRoom(room.id,{
  onStatus:(state,err)=>{
   if(state==='SUBSCRIBED'){msg('Conexión privada lista.');refresh()}
   if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')msg('Conexión interrumpida: '+(err?.message||state),true);
  },
  onRefresh:refresh,onPresence:refresh,
  onGameEvent:data=>{
   if(!data)return;
   if(role==='host'&&data.userId===guestId&&data.kind==='cividom-input'){
    game.setGuestAim(Number(data.aim));
   }else if(role==='guest'&&data.userId===hostId&&data.kind==='cividom-state'){
    lastPacketAt=Date.now();game.apply(data);
   }
  }
 });
}
async function enter(id,c){
 me=await mc.userId();room={id,code:c,game:'cividom',players:[],status:'lobby'};
 code=c;await refresh();await connect();showRoom();
 poll=setInterval(()=>{
  if(room?.status==='lobby'&&!document.hidden)refresh();
  if(role==='guest'&&starting&&Date.now()-lastPacketAt>4500)
   pill.textContent='⚠ SIN DATOS DEL ANFITRIÓN';
 },1900);
}
$('cv-action').onclick=async()=>{
 if(busy||room)return;
 busy=true;$('cv-action').disabled=true;
 try{
  const nm=name();
  if($('cv-join-wrap').style.display!=='none'){
   const id=$('cv-join-code').value.trim().toUpperCase();
   if(!CODE.test(id))throw Error('El código debe tener 8 caracteres.');
   msg('Entrando a la partida…');
   const r=await mc.joinRoom(id,nm);role='guest';await enter(r.room_id,id);
  }else{
   msg('Creando una sala segura…');
   const r=await mc.createRoom('cividom',nm,2);role='host';await enter(r.room_id,r.room_code);
  }
  msg('Sala preparada. ¡Compartan el enlace y marquen LISTO!');
 }catch(e){msg(e?.message||String(e),true);$('cv-action').disabled=false}
 finally{busy=false}
};
$('cv-share').onclick=()=>{
 const text='¡Te invito a CIVIDOM! ⚔️ Entrá a mi partida: '+link();
 window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
};
$('cv-copy').onclick=async()=>{
 try{await navigator.clipboard.writeText(link());msg('✓ Enlace copiado')}
 catch(_){window.prompt('Copiá este enlace:',link())}
};
$('cv-ready').onclick=async()=>{
 if(!room||busy)return;
 busy=true;$('cv-ready').disabled=true;
 try{
  const current=room.players.find(p=>p.userId===me);
  await mc.setReady(room.id,!current?.ready);
  await refresh();await conn?.notify();
 }catch(e){msg(e?.message||String(e),true)}
 finally{busy=false;$('cv-ready').disabled=false;showRoom()}
};
$('cv-go').onclick=async()=>{
 if(busy||!canGo())return;
 busy=true;$('cv-go').disabled=true;
 try{await mc.startRoom(room.id);await refresh();await conn?.notify()}
 catch(e){msg(e?.message||String(e),true)}
 finally{busy=false}
};
function schedule(){
 if(starting||!room?.startedAt)return;
 starting=true;
 const launch=()=>{
  const left=Date.parse(room.startedAt)-Date.now();
  if(left>60){msg('¡PARTIDA CONFIRMADA! Empezamos en '+Math.ceil(left/1000)+'…');
   setTimeout(launch,Math.min(240,left));return;}
  modal.classList.remove('open');
  const guestName=room.players.find(p=>p.slot===2)?.name||'Invitado';
  game.begin(role,guestName);pill.style.display='block';
  pill.textContent='⚔️ SALA '+room.code+' · '+(role==='host'?'ANFITRIÓN':'INVITADO');
  if(role==='host')hostLoop();else guestLoop();
 };
 launch();
}
function hostLoop(){
 lastMapRevision=-1;lastMapAt=0;
 stream=setInterval(async()=>{
  if(!conn?.connected||sendBusy||game.role()!=='host')return;
  const st=game.state();
  const full=lastMapRevision<0||(st.rev!==lastMapRevision&&Date.now()-lastMapAt>=750);
  const payload=game.snapshot(full);if(!payload)return;
  if(full){lastMapRevision=st.rev;lastMapAt=Date.now()}
  sendBusy=true;
  try{await conn.sendGameState(payload)}
  catch(e){console.warn('CIVIDOM estado:',e?.message||e)}
  finally{sendBusy=false}
 },135);
}
function guestLoop(){
 lastPacketAt=Date.now();
 steer=setInterval(async()=>{
  if(!conn?.connected||sendBusy||game.role()!=='guest')return;
  const angle=game.getAim();
  if(!Number.isFinite(angle))return;
  sendBusy=true;
  try{await conn.sendGameEvent({kind:'cividom-input',aim:angle})}
  catch(e){console.warn('CIVIDOM movimiento:',e?.message||e)}
  finally{sendBusy=false}
 },100);
}
window.addEventListener('pagehide',()=>{
 if(poll)clearInterval(poll);if(stream)clearInterval(stream);if(steer)clearInterval(steer);
 if(conn)conn.close().catch(()=>{});
});
window.CividomOnlineUI=Object.freeze({getRoom:()=>room?.code||null,role:()=>role,show});
