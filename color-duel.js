'use strict';
/* Color Rush Duo 1.0 — synchronous competitive AR on separate Android phones.
   Supabase Realtime is used only to relay an eight-character room's events.
   Real-world position uses the XR handset pose, not body/feet detection.
*/
(function(){
const $=id=>document.getElementById(id);
const NAMES=['VERDE','AMARILLO','ROJO','AZUL','VIOLETA','NARANJA'];
const RGB=['#2df5a3','#ffe14f','#ff576d','#4d9dff','#c075ff','#ff982f'];
const KINDS=['crear','unirse'];
const SUPABASE_URL='https://bwsgxpttnrctklrcjmjs.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_2wOSRn_o7M6OqRSikERXUg_2RGQWkFW';
const codeRegex=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
let board=[],seed=0,client=null,channel=null,connected=false;
let room='',role='',selfId='',guestId='',hostId='',peerSeenAt=0,accepted=false;
let myReady=false,peerReady=false,peerJoined=false,joining=false;
let session=false,placed=false,calibration=null,lastPose=null,playerCell=12,playerColor=-1;
let lastPoseTime=0,filtered=null,dwellCell=-1,dwellSince=0,claimed=false;
let phase='lobby',round=0,target=-1,score=[0,0],scored=[false,false],roundStarted=0,roundEnds=0,betweenUntil=0;
let duration=6200,count=10,nextRoundAt=0,roundMsg='',lastRound=0,joinedAt=0;
let pastBroadcast=0,frameCount=0,arBooted=false,previousAR=0,uiLast=0,initComplete=false;
let lastSentHello=0,localHitAt=-1,finalWinner=null,soundCtx=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const randomCode=()=>{const ch='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=crypto.getRandomValues(new Uint8Array(8));return Array.from(b,x=>ch[x%ch.length]).join('');};
const uid=()=>Array.from(crypto.getRandomValues(new Uint8Array(10)),x=>x.toString(16).padStart(2,'0')).join('');
const invite=()=>location.origin+'/color-duel.html?room='+encodeURIComponent(room);
function setInfo(message,bad=false){
  const box=$('netInfo');if(!box)return;
  box.textContent=message;box.classList.toggle('bad',!!bad);
}
function note(s){$('duelStatus').textContent=s;}
function sound(freq=850,d=.16){
 try{
   soundCtx=soundCtx||new(window.AudioContext||window.webkitAudioContext)();
   soundCtx.resume?.();
   const o=soundCtx.createOscillator(),g=soundCtx.createGain(),t=soundCtx.currentTime;
   o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.065,t);
   g.gain.exponentialRampToValueAtTime(.0001,t+d);
   o.connect(g);g.connect(soundCtx.destination);o.start(t);o.stop(t+d+.01);
 }catch(e){}
}
function speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='es-AR';u.rate=1.11;speechSynthesis.speak(u);}catch(e){}}
function setBoard(n){
 seed=n>>>0;
 const arr=Array.from({length:25},(_,i)=>i%6);
 let x=seed||1;
 const rnd=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
 for(let i=arr.length-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
 board=arr;
 try{for(let i=0;i<25;i++)tiles[i]=arr[i];}catch(e){}
}
function send(event,obj={}){
 if(!connected||!channel)return;
 const packet={room,from:selfId,...obj};
 try{Promise.resolve(channel.send({type:'broadcast',event,payload:packet})).catch(e=>console.warn('[Duo] send',event,e));}
 catch(e){console.warn('[Duo] send',e)}
}
function namesForRoom(){
 $('roomCode').textContent=room;
 $('roomRole').textContent=role==='host'?'SOS EL ANFITRIÓN':'SOS EL INVITADO';
 $('roomPanel').style.display='block';
 $('shareButtons').style.display=role==='host'?'grid':'none';
}
function readyUi(){
 const readyNow=placed&&!!calibration;
 $('duelActions').style.display=placed?'flex':'none';
 $('duelCalibrate').textContent=calibration?'🎯 RECALIBRAR':'📍 SOY YO · CALIBRAR';
 $('duelStart').style.display=role==='host'?'block':'none';
 $('duelStart').disabled=!(role==='host'&&myReady&&peerReady&&peerJoined&&phase==='lobby');
 if(phase==='playing'||phase==='between'||phase==='finished'){
   $('duelActions').style.display='flex';
   $('duelStart').style.display='none';
 }
 if(!placed)return;
 if(!readyNow)note('PARATE EN EL CENTRO DE TU PISTA Y TOCÁ «SOY YO»');
 else if(role==='host'&&!peerJoined)note('✓ ESTÁS LISTO · ESPERANDO QUE TU MUJER ENTRE');
 else if(role==='host'&&!peerReady)note('✓ CALIBRADO · ESPERANDO SU PISTA');
 else if(role==='guest'&&phase==='lobby')note('✓ ESTÁS LISTA · ESPERANDO QUE INICIEN');
 else if(role==='host'&&phase==='lobby')note('✓ LOS DOS LISTOS · TOCÁ «EMPEZAR DUELO»');
}
function applyReady(force=false){
 const r=placed&&!!calibration;
 if(r!==myReady||force){
   myReady=r;
   if(role==='guest'&&accepted)send('ready',{ready:myReady});
   if(role==='host')send('state',{ready:myReady,guestReady:peerReady,scores:score,phase,round});
 }
 readyUi();
}
function resetRound(){
 claimed=false;dwellCell=-1;dwellSince=0;localHitAt=-1;
}
function event(p){
 if(!p||p.room!==room||p.from===selfId)return;
 switch(p._event){} // All concrete event routing is registered below.
}
async function subscribe(asHost,joinCode=''){
 if(joining||channel)return;
 joining=true;role=asHost?'host':'guest';
 room=asHost?randomCode():joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(!codeRegex.test(room)){setInfo('El código debe tener 8 caracteres.',true);joining=false;return;}
 selfId=uid();connected=false;accepted=false;peerJoined=false;myReady=false;peerReady=false;
 $('hostCreate').disabled=$('guestJoin').disabled=true;
 $('enter').disabled=true;
 setInfo('Conectando la sala…');
 try{
   const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm');
   client=mod.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
     auth:{persistSession:false,autoRefreshToken:false},
     realtime:{params:{eventsPerSecond:20}}
   });
   channel=client.channel('color-rush-duo-'+room,{
     config:{broadcast:{self:false,ack:false},presence:{key:selfId}}
   });
   const on=(type,handler)=>channel.on('broadcast',{event:type},({payload:p})=>{
     if(!p||p.room!==room||p.from===selfId)return;
     try{handler(p);}catch(e){console.warn('[Duo] event '+type,e)}
   });
   on('hello',p=>{
     if(role!=='host')return;
     if(guestId&&guestId!==p.from){send('full',{to:p.from});return;}
     guestId=p.from;peerJoined=true;peerSeenAt=Date.now();peerReady=!!p.ready;
     send('welcome',{to:p.from,host:selfId,seed,ready:myReady,phase});
     namesForRoom();
     setInfo('✅ Tu invitado está conectado. ¡Ya pueden preparar las pistas!');
     readyUi();
   });
   on('welcome',p=>{
     if(role!=='guest'||p.to!==selfId)return;
     if(accepted&&hostId&&hostId!==p.host)return;
     hostId=p.host;accepted=true;peerJoined=true;peerSeenAt=Date.now();
     setBoard(p.seed);
     setInfo('✅ Conectada con el anfitrión. Fijá tu propia pista.');
     $('enter').disabled=false;
     namesForRoom();send('ready',{ready:myReady});
   });
   on('full',p=>{if(role==='guest'&&p.to===selfId)setInfo('La sala ya tiene dos jugadores.',true)});
   on('ready',p=>{
     if(role==='host'&&p.from===guestId){
       peerReady=!!p.ready;peerSeenAt=Date.now();
       readyUi();
       setInfo(peerReady?'✅ ¡Los dos teléfonos están listos!':'Amigo conectado · esperando que calibre.',false);
     }
   });
   on('state',p=>{
     if(role==='guest'&&(p.from===hostId||!hostId)){
       peerSeenAt=Date.now();
       if(Array.isArray(p.scores)&&p.scores.length===2)score=p.scores.slice();
       if(p.phase==='finished'&&phase!=='finished')finish(p.scores||score);
       updateHud();
     }
   });
   on('start',p=>{
     if(role==='guest'&&p.from===hostId){
       phase='playing';round=0;score=[0,0];scored=[false,false];resetRound();
       $('finalOverlay').style.display='none';
       $('duelStart').style.display='none';
       note('¡ARRANCA EL DUELO! · MIRÁ EL COLOR INDICADO');
       sound(710,.16);
     }
   });
   on('round',p=>{
     if(role!=='guest'||p.from!==hostId)return;
     phase='playing';round=p.round;target=p.target;duration=p.duration||6200;
     roundStarted=performance.now();roundEnds=roundStarted+duration;
     if(Array.isArray(p.scores))score=p.scores.slice();
     resetRound();showRound();updateHud();readyUi();
   });
   on('claim',p=>{
     if(role!=='host'||p.from!==guestId||phase!=='playing')return;
     if(p.round!==round||scored[1]||performance.now()>roundEnds+700)return;
     const cell=Number(p.cell),elapsed=clamp(Number(p.elapsed)||duration,0,duration+300);
     if(!Number.isInteger(cell)||cell<0||cell>=25||board[cell]!==target)return;
     award(1,elapsed);
   });
   on('scored',p=>{
     if(role!=='guest'||p.from!==hostId)return;
     if(Array.isArray(p.scores)&&p.scores.length===2)score=p.scores.slice();
     updateHud();
   });
   on('between',p=>{
     if(role==='guest'&&p.from===hostId){
       phase='between';roundMsg=p.text||'¡SIGUIENTE COLOR!';
       score=Array.isArray(p.scores)?p.scores.slice():score;
       $('duelTitle').textContent=roundMsg;
       $('duelSubtitle').textContent='PREPARATE PARA EL SIGUIENTE COLOR';
       $('duelTimer').textContent='•••';
       updateHud();
     }
   });
   on('finish',p=>{if(role==='guest'&&p.from===hostId)finish(p.scores||score)});
   on('heartbeat',p=>{
     if(role==='host'&&p.from===guestId){peerSeenAt=Date.now();peerReady=!!p.ready;}
     if(role==='guest'&&(!hostId||p.from===hostId))peerSeenAt=Date.now();
   });
   channel.subscribe(async(status,err)=>{
     if(status==='SUBSCRIBED'){
       connected=true;joining=false;joinedAt=Date.now();
       try{await channel.track({name:role});}catch(e){console.warn('[Duo] presence',e)}
       namesForRoom();
       if(role==='host'){
         seed=crypto.getRandomValues(new Uint32Array(1))[0]>>>0;setBoard(seed);
         accepted=true;$('enter').disabled=false;
         setInfo('✅ Sala creada. Enviá el enlace y esperá que se conecte.',false);
       }else{
         setInfo('✅ Sala encontrada. Buscando al anfitrión…');
         send('hello',{ready:myReady});
       }
     }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
       setInfo('No se pudo mantener la conexión ('+status+'). Comprobá Internet y recargá.',true);
       connected=false;joining=false;
     }
   });
 }catch(e){
   console.warn('[Duo] connect failed',e);
   setInfo('Error conectando la sala: '+(e?.message||String(e)),true);
   $('hostCreate').disabled=$('guestJoin').disabled=false;joining=false;
   channel=null;
 }
}
function updateHud(){
 const me=role==='host'?0:1,them=1-me;
 $('myScore').textContent=score[me];
 $('peerScore').textContent=score[them];
 $('scoreLabel').textContent=role==='host'?'VOS · INVITADO':'VOS · ANFITRIÓN';
 $('roundLabel').textContent='RONDA '+Math.max(0,round)+' / '+count;
}
function showRound(){
 $('duelTitle').textContent='¡'+NAMES[target]+'!';
 $('duelTitle').style.color=RGB[target];
 $('duelSubtitle').textContent='MOVETE FÍSICAMENTE AL COLOR INDICADO';
 sound(820,.13);speak(NAMES[target]);
 note('BUSCÁ UNA BALDOSA '+NAMES[target]+' · MANTENETE 0,5 SEGUNDOS');
 updateHud();
}
function award(who,elapsed){
 if(scored[who]||phase!=='playing')return;
 scored[who]=true;
 const bonus=Math.max(0,Math.min(5,Math.ceil((duration-elapsed)/1000)));
 score[who]+=10+bonus;
 if(who===0){note('✓ ¡ACIERTO! +'+(10+bonus)+' PUNTOS');sound(1090,.18);navigator.vibrate?.([45,20,45]);}
 send('scored',{scores:score,round,winner:who});
 updateHud();
}
function claimLocal(cell,t){
 if(phase!=='playing'||claimed)return;
 claimed=true;localHitAt=t;
 const elapsed=Math.max(0,t-roundStarted);
 if(role==='host')award(0,elapsed);
 else{send('claim',{round,cell,elapsed});note('✓ ¡ACIERTO! ENVIADO AL ANFITRIÓN');sound(1090,.16);navigator.vibrate?.(45);}
}
function startMatch(){
 if(role!=='host'||!myReady||!peerReady||!peerJoined||phase!=='lobby'){
   note('LOS DOS DEBEN FIJAR Y CALIBRAR SUS PISTAS');
   return;
 }
 score=[0,0];round=0;target=-1;phase='playing';scored=[false,false];resetRound();
 $('finalOverlay').style.display='none';
 send('start',{seed});
 beginRound();
}
function beginRound(){
 if(role!=='host'||phase==='finished')return;
 if(round>=count){finish(score);send('finish',{scores:score});return;}
 round++;target=(seed+round*17+((seed>>>3)&15))%6;
 duration=Math.max(5500,7300-(round-1)*190);
 phase='playing';scored=[false,false];resetRound();
 roundStarted=performance.now();roundEnds=roundStarted+duration;
 send('round',{round,target,duration,scores:score});
 showRound();
}
function between(){
 if(role!=='host'||phase!=='playing')return;
 phase='between';betweenUntil=performance.now()+1000;
 const txt=(scored[0]&&scored[1])?'¡LOS DOS ACERTARON!':scored[0]?'¡PUNTO PARA VOS!':scored[1]?'¡PUNTO PARA TU RIVAL!':'¡NADIE ACERTÓ!';
 $('duelTitle').style.color='#ffffff';
 $('duelTitle').textContent=txt;
 $('duelSubtitle').textContent='PREPARATE…';
 send('between',{text:txt,scores:score,round});
 updateHud();
}
function finish(total){
 phase='finished';score=total.slice();claimed=true;
 const me=role==='host'?0:1,opp=1-me;
 const result=score[me]===score[opp]?'¡EMPATE!':score[me]>score[opp]?'🏆 ¡GANASTE!':'¡GANÓ TU RIVAL!';
 $('endHeading').textContent=result;
 $('endCopy').textContent='Tu puntaje: '+score[me]+' · Su puntaje: '+score[opp]+' · '+count+' rondas';
 $('finalOverlay').style.display='flex';
 $('duelTitle').textContent=result;
 $('duelSubtitle').textContent='PARTIDA TERMINADA';
 updateHud();sound(score[me]>=score[opp]?1060:440,.20);
}
function startAgain(){
 if(role!=='host'){note('TU RIVAL TIENE QUE INICIAR LA REVANCHA');return;}
 phase='lobby';peerReady=false;myReady=placed&&!!calibration;
 send('restart',{});
 $('finalOverlay').style.display='none';readyUi();
}
function lockReady(){
 if(placed)return;
 try{if(stage!=='fixed')return;}catch(e){return;}
 placed=true;
 $('overlay').classList.add('duel-fixed');
 $('duelRoomBar').style.display='block';
 $('duelControls').style.display='flex';
 $('duelHud').style.display='flex';
 $('duelCalibrate').style.display='block';
 $('duelStart').style.display=role==='host'?'block':'none';
 $('duelTitle').textContent='¡PISTA LISTA!';
 $('duelSubtitle').textContent='PARATE EN EL CENTRO Y CALIBRÁ TU POSICIÓN';
 note('FIJASTE LA PISTA · AHORA TOCÁ «SOY YO»');
 readyUi();sound(700,.12);
}
function boardCoords(M,pos){
 const x=pos.x-M[12],y=pos.y-M[13],z=pos.z-M[14];
 return{x:M[0]*x+M[1]*y+M[2]*z,z:M[8]*x+M[9]*y+M[10]*z};
}
function readPose(frame){
 if(!frame||typeof ref==='undefined'||!ref)return null;
 const pose=frame.getViewerPose(ref);
 if(!pose||pose.emulatedPosition)return null;
 const M=typeof buildWorld==='function'?buildWorld():null;
 if(!M)return null;
 return {pose,M,q:boardCoords(M,pose.transform.position)};
}
function calibrate(){
 if(!placed){note('PRIMERO FIJÁ LA PISTA');return;}
 const run=()=>{
   if(typeof sess==='undefined'||!sess){note('SIN SESIÓN AR · VOLVÉ A ENTRAR');return;}
   sess.requestAnimationFrame((t,frame)=>{
     const sample=readPose(frame);
     if(!sample){note('NO SE DETECTÓ MOVIMIENTO. APUNTÁ AL PISO Y REINTENTÁ.');return;}
     calibration={x:sample.q.x,z:sample.q.z};
     filtered=null;playerCell=12;playerColor=board[12];dwellCell=-1;dwellSince=0;
     note('✓ CALIBRADO · EL CENTRO DE LA PISTA ES TU POSICIÓN');
     applyReady(true);
     sound(930,.14);
   });
 };
 run();
}
function markerFrame(frame,sample){
 const M=sample.M,v=sample.pose.views?.[0];
 if(!v)return;
 const col=playerCell%5,row=(playerCell/5)|0,s=typeof boardSize!=='undefined'?boardSize:.45;
 const x=(col-2)*s,z=(row-2)*s;
 const m=mul(v.projectionMatrix,mul(v.transform.inverse.matrix,M));
 const q=projected(m,x,.11,z,innerWidth,innerHeight);
 if(!q){$('duelMarker').style.display='none';return;}
 const svg=$('duelMarker');svg.style.display='block';svg.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight);
 $('markerHalo').setAttribute('cx',q[0]);$('markerHalo').setAttribute('cy',q[1]);
 $('markerCore').setAttribute('cx',q[0]);$('markerCore').setAttribute('cy',q[1]);
 $('markerText').setAttribute('x',q[0]);$('markerText').setAttribute('y',q[1]-32);
}
function onXR(t,frame){
 if(typeof sess==='undefined'||!sess)return;
 sess.requestAnimationFrame(onXR);
 frameCount++;
 if(t-previousAR<32)return;previousAR=t;
 const sample=readPose(frame);
 if(!sample||!calibration)return;
 let deltaX=sample.q.x-calibration.x,deltaZ=sample.q.z-calibration.z;
 const x=clamp(deltaX,-2.1,2.1),z=clamp(deltaZ,-2.1,2.1);
 if(!filtered)filtered={x,z};
 else{filtered.x+=(x-filtered.x)*.3;filtered.z+=(z-filtered.z)*.3;}
 const tileEdge=typeof boardSize!=='undefined'&&Number.isFinite(boardSize)?boardSize:.45;
 const col=clamp(Math.floor(2.5+filtered.x/tileEdge),0,4);
 const row=clamp(Math.floor(2.5+filtered.z/tileEdge),0,4);
 const cell=row*5+col;
 playerCell=cell;playerColor=board[cell];
 if(cell!==dwellCell){dwellCell=cell;dwellSince=t;}
 $('whereAmI').textContent='TU POSICIÓN: '+NAMES[playerColor]+' · '+(row+1)+','+(col+1);
 if(phase==='playing'&&!claimed&&playerColor===target&&t-dwellSince>520&&t<roundEnds+350)claimLocal(cell,t);
 try{markerFrame(frame,sample);}catch(e){/* never stall match clock due to visual projection */}
}
function bootXR(){
 if(arBooted||typeof sess==='undefined'||!sess||typeof ref==='undefined'||!ref)return;
 arBooted=true;
 sess.requestAnimationFrame(onXR);
 sess.addEventListener('end',()=>{arBooted=false;session=false;placed=false;myReady=false;calibration=null;send('ready',{ready:false});});
}
function uiTick(){
 if(placed&&phase==='lobby')readyUi();
 if(placed&&phase==='playing'){
   const s=Math.max(0,(roundEnds-performance.now())/1000);
   $('duelTimer').textContent=s.toFixed(1)+' s';
 }
 if(placed&&phase==='between')$('duelTimer').textContent='•••';
 if(phase==='finished')$('duelTimer').textContent='FIN';
 if(role==='host'&&phase==='playing'&&performance.now()>=roundEnds)between();
 if(role==='host'&&phase==='between'&&performance.now()>=betweenUntil)beginRound();
 if(phase!=='lobby'&&connected&&role==='host'&&Date.now()-pastBroadcast>950){
   pastBroadcast=Date.now();
   send('state',{scores:score,phase,round});
 }
 if(connected&&Date.now()-lastSentHello>1700){
   lastSentHello=Date.now();
   send('heartbeat',{ready:myReady});
   if(role==='guest'&&!accepted)send('hello',{ready:myReady});
 }
 if(connected&&peerJoined&&peerSeenAt&&Date.now()-peerSeenAt>16000){
   if(phase==='lobby'){peerReady=false;readyUi();}
   $('peerConnected').textContent='SIN SEÑAL';
 }else $('peerConnected').textContent=peerJoined?'EN LÍNEA':'ESPERANDO…';
 updateHud();
 bootXR();
 if(!placed&&typeof stage!=='undefined'&&stage==='fixed')lockReady();
}
$('hostCreate').onclick=()=>subscribe(true);
$('guestJoin').onclick=()=>subscribe(false,$('joinCode').value);
$('copyInvite').onclick=async()=>{
 const msg='¡Jugamos Color Rush juntos! 🎨 Entrá a mi sala: '+invite();
 try{await navigator.clipboard.writeText(msg);$('copyInvite').textContent='✓ COPIADO'}catch(e){window.prompt('Copiá tu invitación:',msg)}
};
$('whatsappInvite').onclick=()=>{
 const msg='¡Vamos a jugar Color Rush juntos! 🎨🩷 Entrá acá y uníte a mi sala: '+invite();
 window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
};
$('duelCalibrate').onclick=calibrate;
$('duelStart').onclick=startMatch;
$('returnGames').onclick=()=>{try{sess?.end()}catch(e){}location.href='/'};
$('soloGame').onclick=()=>location.href='/color-solo.html';
$('duelAgain').onclick=()=>{if(role==='host'){startAgain();}else{note('EL ANFITRIÓN PUEDE INICIAR LA REVANCHA');$('finalOverlay').style.display='none';}};
$('duelExit').onclick=()=>location.href='/';
$('lock').addEventListener('click',()=>setTimeout(lockReady,240));
$('edit').addEventListener('click',()=>{
 placed=false;calibration=null;myReady=false;applyReady(true);
 $('overlay').classList.remove('duel-fixed');
 $('duelControls').style.display='none';
 $('duelMarker').style.display='none';
});
const prefCode=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
if(codeRegex.test(prefCode)){
 $('joinCode').value=prefCode;
 $('introChoices').style.display='none';
 $('inviteSplash').style.display='block';
 $('homeHeadline').textContent='¡TE INVITARON A JUGAR!';
 // Connecting directly is safe: real camera access still requires explicit click.
 setTimeout(()=>subscribe(false,prefCode),250);
}
setInterval(uiTick,130);
setBoard(73312);
updateHud();
})();
