import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm';
/* CIVIDOM two-person invite. No sign-in, no public database tables.
   Channels are unlisted but PUBLIC to the Supabase publishable key:
   privacy relies on a cryptographically random 128-bit invite secret.
   The host computes all world physics; the guest only sends steering. */
const config=window.ModoCaosConfig,game=window.CividomOnlineBridge;
if(!config?.publishableKey||!game)throw Error('Falta la configuración de CIVIDOM online');
const supabase=createClient(config.url,config.publishableKey,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
const CODE=/^[A-F0-9]{32}$/;
const $=id=>document.getElementById(id);
const deepCode=new URLSearchParams(location.search).get('room')?.toUpperCase();
const clientId=crypto.randomUUID();
let room=null,channel=null,role='solo',code='',starting=false,busy=false;
let guestId=null,hostId=null,poll=null,stream=null,steer=null,lastPacketAt=0;
let sendBusy=false,lastMapRevision=-1,lastMapAt=0,connected=false,joining=false;
function newCode(){
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
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
'<div id="cv-join-wrap" style="display:none"><label>CÓDIGO DE SALA (32 CARACTERES)</label><input id="cv-join-code" maxlength="32"/></div>'+
'<div id="cv-status">Creá tu sala o entrá con una invitación.</div>'+
'<div id="cv-detail" style="display:none"><div id="cv-code"></div><div id="cv-people"></div></div>'+
'<button class="gold" id="cv-action">CREAR SALA E INVITAR</button>'+
'<button id="cv-share" style="display:none">COMPARTIR EN WHATSAPP</button>'+
'<button id="cv-copy" style="display:none">COPIAR ENLACE</button>'+
'<button id="cv-ready" style="display:none">✓ ESTOY LISTO</button>'+
'<button class="gold" id="cv-go" style="display:none" disabled>EMPEZAR PARTIDA</button>'+
'<button id="cv-back">VOLVER AL MENÚ</button>'+
'<p>El anfitrión mantiene la partida activa. El acceso es por un enlace secreto: compartilo solo con tu amigo.</p></div>';
document.body.appendChild(modal);
const pill=document.createElement('div');pill.id='cv-live-pill';document.body.appendChild(pill);
const entry=document.createElement('button');entry.id='cv-online-button';entry.textContent='⚔️ JUGAR CON UN AMIGO · INVITAR';
const home=$('home');
(home?.querySelector('#best')||home)?.insertAdjacentElement('afterend',entry);
try{$('cv-nick').value=localStorage.getItem('cividom-online-name')||$('nick')?.value||''}catch(_){}
const msg=(text,error=false)=>{$('cv-status').textContent=text;$('cv-status').classList.toggle('error',error)};
const name=()=>{const n=$('cv-nick').value.trim().slice(0,24)||'Jugador';try{localStorage.setItem('cividom-online-name',n)}catch(_){}return n};
const link=()=>location.origin+location.pathname+'?room='+code;
function show(joinCode=''){
 if(starting)return;
 modal.classList.add('open');
 $('cv-action').textContent=joinCode?'ENTRAR A LA SALA':'CREAR SALA E INVITAR';
 $('cv-join-wrap').style.display=joinCode?'block':'none';
 if(joinCode)$('cv-join-code').value=joinCode;
 msg(joinCode?'Recibiste una invitación. Poné tu nombre y entrá.':'Creá una sala y compartí el enlace secreto.');
}
entry.onclick=()=>show();
$('cv-back').onclick=()=>{if(!starting)modal.classList.remove('open')};
if(deepCode&&CODE.test(deepCode))show(deepCode);
function canGo(){return role==='host'&&connected&&room?.players?.length===2&&room.players.every(p=>p.ready)}
function showRoom(){
 if(!room)return;
 $('cv-detail').style.display='block';
 $('cv-code').textContent=room.code.slice(0,8);
 $('cv-share').style.display='block';$('cv-copy').style.display='block';
 $('cv-action').style.display='none';
 $('cv-ready').style.display=room.status==='lobby'?'block':'none';
 $('cv-go').style.display=role==='host'&&room.status==='lobby'?'block':'none';
 $('cv-go').disabled=busy||!canGo();
 const current=room.players.find(p=>p.id===clientId);
 $('cv-ready').textContent=current?.ready?'✓ LISTO · CAMBIAR':'✓ ESTOY LISTO';
 $('cv-people').replaceChildren();
 for(const p of room.players){
  const r=document.createElement('div');r.className='player';
  const n=document.createElement('span');n.textContent=(p.slot===1?'👑 ':'🎮 ')+p.name;
  const st=document.createElement('span');st.textContent=p.ready?'✓ LISTO':'ESPERANDO';
  r.append(n,st);$('cv-people').append(r);
 }
}
async function send(event,payload){
 if(!connected||!channel)return 'not_connected';
 const state=await channel.send({type:'broadcast',event,payload});
 if(state!=='ok')throw Error('Realtime: '+state);
 return state;
}
function announce(){
 if(role!=='host'||!room)return;
 send('cv-room',{room,hostId:clientId}).catch(e=>msg('No se pudo actualizar la sala: '+e.message,true));
}
function onHello(p){
 if(role!=='host'||!connected||!CODE.test(code)||room?.status!=='lobby')return;
 if(!p||typeof p.id!=='string'||typeof p.name!=='string')return;
 if(guestId&&guestId!==p.id){
  send('cv-full',{to:p.id}).catch(()=>{});return;
 }
 guestId=p.id;
 const named=p.name.trim().slice(0,24)||'Invitado';
 if(Number.isInteger(p.hero))game.setGuestHero(p.hero);
 if(room.players.length===1)room.players.push({id:guestId,name:named,slot:2,ready:false});
 announce();showRoom();
 msg('¡Llegó '+named+'! Marquen LISTO para empezar.');
}
function onRoom(p){
 if(role!=='guest'||!p?.room||p.room.code!==code||p.hostId===clientId)return;
 hostId=p.hostId;joining=false;
 room=p.room;
 showRoom();
 msg('¡Conectados! Esperá que los dos estén listos.');
 if(room.status==='playing')schedule(room.startedAt);
}
function onReady(p){
 if(role!=='host'||!guestId||p?.id!==guestId)return;
 const guest=room.players.find(x=>x.id===guestId);
 if(guest){guest.ready=!!p.ready;showRoom();announce()}
}
function startChannel(){
 if(channel)return;
 const topic='cividom-play-v1:'+code;
 channel=supabase.channel(topic,{config:{private:false,broadcast:{self:false}}});
 channel.on('broadcast',{event:'cv-hello'},e=>onHello(e.payload))
 .on('broadcast',{event:'cv-room'},e=>onRoom(e.payload))
 .on('broadcast',{event:'cv-ready'},e=>onReady(e.payload))
 .on('broadcast',{event:'cv-full'},e=>{
  if(role==='guest'&&e.payload?.to===clientId)msg('Esta sala ya tiene dos jugadores.',true);
 })
 .on('broadcast',{event:'cv-start'},e=>{
  if(role==='guest'&&e.payload?.hostId===hostId&&Number.isFinite(e.payload?.at))schedule(e.payload.at);
 })
 .on('broadcast',{event:'cv-input'},e=>{
  if(role==='host'&&guestId===e.payload?.id&&Number.isFinite(e.payload?.aim))
   game.setGuestAim(e.payload.aim);
 })
 .on('broadcast',{event:'cv-state'},e=>{
  if(role==='guest'&&hostId===e.payload?.hostId){
   lastPacketAt=Date.now();game.apply(e.payload.state);
  }
 })
 .subscribe((state,error)=>{
  connected=state==='SUBSCRIBED';
  if(connected){
   if(role==='host'){msg('Sala creada. Compartí el enlace.');announce()}
   else if(role==='guest'){msg('Conectando con el anfitrión…');hello()}
  }else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'){
   msg('Error de conexión: '+(error?.message||state),true);
  }
  showRoom();
 });
}
function hello(){
 if(role==='guest'&&connected&&room?.status!=='playing')
  send('cv-hello',{id:clientId,name:name(),hero:game.hero()}).catch(()=>{});
}
$('cv-action').onclick=()=>{
 if(busy||channel)return;
 busy=true;
 try{
  const nm=name(),value=$('cv-join-code').value.trim().toUpperCase();
  if($('cv-join-wrap').style.display!=='none'){
   if(!CODE.test(value))throw Error('Enlace inválido. Abrí el enlace completo de la invitación.');
   role='guest';code=value;joining=true;
   room={code,players:[{id:clientId,name:nm,slot:2,ready:false}],status:'lobby'};
  }else{
   role='host';code=newCode();
   room={code,players:[{id:clientId,name:nm,slot:1,ready:false}],status:'lobby'};
  }
  startChannel();showRoom();
  if(poll)clearInterval(poll);
  poll=setInterval(()=>{
   if(!document.hidden){
    if(role==='guest'&&room?.status==='lobby')hello();
    if(role==='host'&&room?.status==='lobby')announce();
   }
   if(starting&&role==='guest'&&Date.now()-lastPacketAt>4000)
    pill.textContent='⚠ ESPERANDO DATOS DEL ANFITRIÓN';
  },1650);
 }catch(e){msg(e?.message||String(e),true)}
 finally{busy=false}
};
$('cv-share').onclick=()=>{
 const text='¡Te invito a CIVIDOM! ⚔️ Entrá a nuestra partida: '+link();
 window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
};
$('cv-copy').onclick=async()=>{
 try{await navigator.clipboard.writeText(link());msg('✓ Enlace copiado')}
 catch(_){window.prompt('Copiá este enlace:',link())}
};
$('cv-ready').onclick=async()=>{
 if(!connected||!room||starting)return;
 const self=room.players.find(p=>p.id===clientId);
 if(!self)return;
 self.ready=!self.ready;showRoom();
 if(role==='host')announce();
 else{
  try{await send('cv-ready',{id:clientId,ready:self.ready})}
  catch(e){msg('Error de red: '+e.message,true)}
 }
};
$('cv-go').onclick=async()=>{
 if(starting||!canGo())return;
 const at=Date.now()+4000;
 room.status='playing';room.startedAt=at;
 // Send start more than once to cover mobile packet jitter during countdown.
 try{
  await send('cv-start',{hostId:clientId,at});
  announce();
  setTimeout(()=>send('cv-start',{hostId:clientId,at}).catch(()=>{}),500);
  schedule(at);
 }catch(e){room.status='lobby';msg('No se pudo empezar: '+e.message,true)}
};
function schedule(at){
 if(starting)return;starting=true;
 const tick=()=>{
  const left=at-Date.now();
  if(left>60){msg('¡PARTIDA CONFIRMADA! Empieza en '+Math.ceil(left/1000)+'…');
   setTimeout(tick,Math.min(left,240));return;}
  modal.classList.remove('open');
  const guestName=room.players.find(p=>p.slot===2)?.name||'Invitado';
  game.begin(role,guestName);pill.style.display='block';
  pill.textContent='⚔️ '+(role==='host'?'ANFITRIÓN':'INVITADO')+' · '+room.code.slice(0,8);
  if(role==='host')hostLoop();else guestLoop();
 };
 tick();
}
function hostLoop(){
 lastMapRevision=-1;lastMapAt=0;
 stream=setInterval(async()=>{
  if(!connected||sendBusy||game.role()!=='host')return;
  const st=game.state();
  const full=lastMapRevision<0||(st.rev!==lastMapRevision&&Date.now()-lastMapAt>=800)
   ||Date.now()-lastMapAt>4500;
  const payload=game.snapshot(full);if(!payload)return;
  if(full){lastMapRevision=st.rev;lastMapAt=Date.now()}
  sendBusy=true;
  try{await send('cv-state',{hostId:clientId,state:payload})}
  catch(e){console.warn('CIVIDOM red:',e?.message||e)}
  finally{sendBusy=false}
 },145);
}
function guestLoop(){
 lastPacketAt=Date.now();
 steer=setInterval(async()=>{
  if(!connected||sendBusy||game.role()!=='guest')return;
  const angle=game.getAim();if(!Number.isFinite(angle))return;
  sendBusy=true;
  try{await send('cv-input',{id:clientId,aim:angle})}
  catch(e){console.warn('CIVIDOM control:',e?.message||e)}
  finally{sendBusy=false}
 },100);
}
window.addEventListener('pagehide',()=>{
 if(poll)clearInterval(poll);if(stream)clearInterval(stream);if(steer)clearInterval(steer);
 if(channel)supabase.removeChannel(channel).catch(()=>{});
});
window.CividomOnlineUI=Object.freeze({getRoom:()=>room?.code||null,role:()=>role,show});
