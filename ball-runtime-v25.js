"use strict";
/* Ball Rush v2.5 runner — XR anchored corner emitters / live play / non-modal goals. */
(function(){
  const $=id=>document.getElementById(id),P=window.BallPhysics25,Scene=window.BallArenaRenderer25;
  if(!P||!Scene)throw Error("Ball Rush v2.5 modules missing");
  const cap=P.clamp;
  const scene=Scene($("shipsvg"),P);
  let mode="solo",role="host",room="",self="",hostId="",guestId="",guestReady=false,ready=false;
  let client=null,channel=null,connected=false,connecting=false,accepted=false,hostSeen=0,guestSeen=0;
  let roomSync=0,motionSync=0,lastFrame=0,lastHUD=0,clock=0,frameCount=0,started=false;
  let game=P.initial(),running=false,origin=null,filtered=null,localX=0,remoteX=0,phonePose=null;
  let lastPower=-4000,heardEvent=0,seenGoal=0,inside=false,ctx=null,noticeUntil=0;
  let toastSerial=0,bgActive=true;
  const css=document.createElement("style");
  css.textContent=[
    "#mainbuttons.in-play{display:none!important}",
    "#hud{background:#081d32cf;backdrop-filter:blur(6px);box-shadow:0 6px 25px #0013218a}",
    "#ballstatus{background:#071c32cf;backdrop-filter:blur(6px)}",
    "#boost.br-ready{animation:brPulse25 1.3s ease-in-out infinite;box-shadow:0 0 20px #ffe08f8f}",
    "#boost.br-cooldown{filter:saturate(.62)}",
    "#shipsvg{overflow:visible;filter:drop-shadow(0 2px 4px #05192888)}",
    "#goalToast25{display:none;position:absolute;top:31%;left:10px;right:10px;z-index:16;",
    "pointer-events:none;font-weight:1000;font-size:clamp(29px,9vw,47px);line-height:1.16;",
    "color:#fff0b3;text-shadow:0 4px 12px #000,0 0 25px #ffb567;text-align:center}",
    "#goalToast25.good{color:#b6ffdf;text-shadow:0 4px 12px #000,0 0 25px #64ffc8}",
    "#goalToast25.active{display:block;animation:brToast25 1.45s cubic-bezier(.25,.75,.2,1) both}",
    "#emitterStatus25{display:none;position:absolute;top:21%;left:50%;transform:translateX(-50%);",
    "z-index:6;background:#061c30c9;border:1px solid #62e6d1b0;border-radius:100px;",
    "padding:7px 12px;white-space:nowrap;font-size:11px;letter-spacing:.3px;font-weight:900;",
    "color:#bbffe8;pointer-events:none;text-align:center}",
    "#diagbtn{opacity:.75}",
    "@keyframes brToast25{0%{opacity:0;transform:translateY(19px) scale(.71)}12%{opacity:1;transform:translateY(0) scale(1.12)}30%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-22px) scale(.92)}}",
    "@keyframes brPulse25{50%{box-shadow:0 0 28px #ffc767b5}}"
  ].join("");
  document.head.appendChild(css);
  const toast=document.createElement("div");toast.id="goalToast25";toast.setAttribute("role","status");
  const badge=document.createElement("div");badge.id="emitterStatus25";$("overlay").appendChild(toast);$("overlay").appendChild(badge);
  function notify(s,ms=1500){$("ballstatus").style.display="block";$("ballstatus").textContent=s;noticeUntil=performance.now()+ms;}
  function display(a,b){$("headline").textContent=a;$("subtitle").textContent=b;}
  function toastMessage(s,success){
    toast.textContent=s;toast.classList.remove("active","good");
    if(success)toast.classList.add("good");
    void toast.offsetWidth;toast.classList.add("active");
    const id=++toastSerial;
    setTimeout(()=>{if(toastSerial===id)toast.classList.remove("active");},1450);
  }
  window.alert=function(message){toastMessage(String(message),false);};
  function buzz(x){try{navigator.vibrate?.(x);}catch(e){}}
  function tone(f=760,d=.13,type="sine"){
    try{
      ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();ctx.resume?.();
      const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
      o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.075,t);
      g.gain.exponentialRampToValueAtTime(.001,t+d);
      o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d+.02);
    }catch(e){}
  }
  function meSide(){return mode==="online"&&role==="guest"?"top":"bottom";}
  function energy(){return cap((performance.now()-lastPower)/3200,0,1);}
  function selectMode(m){
    if(channel)return;mode=m;
    $("solo").classList.toggle("selected",m==="solo");
    $("online").classList.toggle("selected",m==="online");
    $("net").style.display=m==="online"?"block":"none";
    $("enter").disabled=m==="online";
  }
  $("solo").addEventListener("click",()=>selectMode("solo"));
  $("online").addEventListener("click",()=>selectMode("online"));
  const endpoint="https://bwsgxpttnrctklrcjmjs.supabase.co",browserKey="sb_publishable_2wOSRn_o7M6OqRSikERXUg_2RGQWkFW";
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function makeRoom(){return Array.from(crypto.getRandomValues(new Uint8Array(7)),x=>alphabet[x%alphabet.length]).join("");}
  function send(event,payload){
    if(!connected||!channel)return;
    try{
      channel.send({type:"broadcast",event,payload:{room,from:self,...payload}})
        .catch(e=>console.warn("Ball Rush realtime:",e));
    }catch(e){}
  }
  function roomText(s){$("netinfo").textContent=s;}
  function roomUI(){
    if(mode!=="online"||running)return;
    if(role==="host"){
      $("play").disabled=!(guestId&&guestReady&&ready);
      notify(!guestId?"ESPERANDO A TU AMIGO · SALA "+room:
        !guestReady?"AMIGO CONECTADO · COLOCANDO SU ARENA":
        !ready?"TU AMIGO ESTÁ LISTO · FIJÁ TU ARENA":"AMBOS LISTOS · INICIÁ",1800);
    }else{
      $("play").disabled=true;
      notify(!accepted?"BUSCANDO ANFITRIÓN":!ready?"ANFITRIÓN CONECTADO · FIJÁ TU ARENA":"LISTO · ESPERANDO INICIO",1800);
    }
  }
  async function joinRoom(which){
    if(connecting||channel)return;
    connecting=true;role=which;mode="online";
    room=which==="host"?makeRoom():$("code").value.toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,8);
    if(room.length<6){connecting=false;roomText("Ingresá un código de sala válido.");return;}
    $("create").disabled=$("join").disabled=true;$("enter").disabled=true;
    roomText("Conectando al servidor de partidas…");
    try{
      const lib=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm");
      client=lib.createClient(endpoint,browserKey,{
        auth:{persistSession:false,autoRefreshToken:false},
        realtime:{params:{eventsPerSecond:20}}
      });
      self=Array.from(crypto.getRandomValues(new Uint8Array(10)),x=>x.toString(16).padStart(2,"0")).join("");
      channel=client.channel("ball-rush-room-"+room,{
        config:{broadcast:{self:false,ack:false},presence:{key:self}}
      });
      channel.on("broadcast",{event:"hello"},({payload:p})=>{
        if(role!=="host"||p.room!==room||p.from===self)return;
        if(guestId&&guestId!==p.from){send("full",{to:p.from});return;}
        guestId=p.from;guestSeen=Date.now();guestReady=!!p.ready;
        send("welcome",{to:guestId,host:self});roomUI();
      });
      channel.on("broadcast",{event:"welcome"},({payload:p})=>{
        if(role!=="guest"||p.room!==room||p.to!==self)return;
        hostId=p.host;accepted=true;hostSeen=Date.now();
        roomText("✅ Conectado. Cada jugador coloca su cancha.");
        send("ready",{ready});roomUI();
      });
      channel.on("broadcast",{event:"full"},({payload:p})=>{
        if(role==="guest"&&p.to===self)roomText("Sala ocupada: ya hay dos jugadores.");
      });
      channel.on("broadcast",{event:"ready"},({payload:p})=>{
        if(role==="host"&&p.room===room&&p.from===guestId){
          guestSeen=Date.now();guestReady=!!p.ready;roomUI();
        }
      });
      channel.on("broadcast",{event:"heartbeat"},({payload:p})=>{
        if(p.room!==room||p.from===self)return;
        if(role==="host"&&p.from===guestId){guestSeen=Date.now();guestReady=!!p.ready;}
        if(role==="guest"&&(!hostId||p.from===hostId))hostSeen=Date.now();
      });
      channel.on("broadcast",{event:"move"},({payload:p})=>{
        if(role!=="host"||p.room!==room||p.from!==guestId)return;
        guestSeen=Date.now();remoteX=cap(Number(p.x)||0,-P.C.MAX_PADDLE,P.C.MAX_PADDLE);
        if(p.boost)P.boost(game,"top");
      });
      channel.on("broadcast",{event:"start"},({payload:p})=>{
        if(role==="guest"&&p.room===room&&p.from===hostId){
          running=true;$("result").style.display="none";
          display("¡BATALLA ONLINE!","DEFENDÉ EL ARCO ENTRE LOS POSTES");
        }
      });
      channel.on("broadcast",{event:"state"},({payload:p})=>{
        if(role!=="guest"||!accepted||p.room!==room||p.from!==hostId||!p.game)return;
        hostSeen=Date.now();
        const old=game.ball;
        game=p.game;running=!!p.running;
        if(running&&Math.hypot(old.x-game.ball.x,old.z-game.ball.z)<.17){
          game.ball.x=old.x*.16+game.ball.x*.84;
          game.ball.z=old.z*.16+game.ball.z*.84;
        }
        if(!running&&game.winner)endScreen();
      });
      channel.on("presence",{event:"sync"},()=>{
        if(role!=="host"||!guestId)return;
        if(!channel.presenceState()[guestId]){
          guestId="";guestReady=false;running=false;roomUI();
        }
      });
      channel.subscribe(async(status,err)=>{
        if(status==="SUBSCRIBED"){
          connected=true;connecting=false;$("enter").disabled=false;
          try{await channel.track({role,id:self});}catch(e){}
          if(role==="host"){
            $("invite").style.display="block";$("inviteCode").textContent=room;
            roomText("✅ Sala creada. Compartí la invitación.");
          }else{roomText("✅ Canal conectado. Buscando anfitrión…");send("hello",{ready:false});}
        }else if(["CHANNEL_ERROR","CLOSED","TIMED_OUT"].includes(status)){
          connected=false;connecting=false;$("enter").disabled=true;
          roomText("Error "+status+": "+(err?.message||"comprobá tu conexión."));
        }
      });
    }catch(e){
      connecting=false;channel=null;$("create").disabled=$("join").disabled=false;
      roomText("No se pudo conectar: "+e.message);
    }
  }
  $("create").onclick=()=>joinRoom("host");
  $("join").onclick=()=>joinRoom("guest");
  $("copy").onclick=async()=>{
    const url=location.origin+"/ball.html?join="+room;
    try{await navigator.clipboard.writeText("¡Jugamos Ball Rush! "+url);$("copy").textContent="✅ COPIADO";}
    catch(e){prompt("Copiá la invitación:",url);}
  };
  const initialInvite=new URLSearchParams(location.search).get("join");
  if(initialInvite&&/^[A-HJ-NP-Z2-9]{6,8}$/i.test(initialInvite)){
    selectMode("online");$("code").value=initialInvite.toUpperCase();roomText("Invitación detectada. Tocá UNIRME.");
  }
  setInterval(()=>{
    if(!connected)return;
    send("heartbeat",{ready});
    if(role==="guest"&&!accepted)send("hello",{ready});
    if(role==="guest"&&accepted&&Date.now()-hostSeen>10000){
      accepted=false;hostId="";running=false;roomText("Reconectando con el anfitrión…");
    }
    if(role==="host"&&guestId&&Date.now()-guestSeen>10000){
      guestId="";guestReady=false;running=false;roomUI();
    }
  },1750);
  function boardPos(world,pos){
    const x=pos.x-world[12],y=pos.y-world[13],z=pos.z-world[14];
    return{x:world[0]*x+world[1]*y+world[2]*z,z:world[8]*x+world[9]*y+world[10]*z};
  }
  function recenter(){
    const world=buildWorld();
    if(!world||!phonePose||phonePose.emulatedPosition){
      notify("ESPERÁ A QUE AR DETECTE TU POSICIÓN");return;
    }
    origin=boardPos(world,phonePose.transform.position).x;
    filtered=0;localX=0;
    notify("NAVE CENTRADA ✓ · MOVETE A LOS COSTADOS");
    tone(920,.12);buzz(45);
  }
  $("center").onclick=recenter;
  function movement(frame,world,dt,t){
    const pose=frame.getViewerPose(ref);phonePose=pose;
    if(!pose||pose.emulatedPosition)return;
    const lateral=boardPos(world,pose.transform.position).x;
    if(origin===null)origin=lateral;
    const target=cap((lateral-origin)*2.35,-P.C.MAX_PADDLE,P.C.MAX_PADDLE);
    filtered=filtered===null?target:filtered+(target-filtered)*(1-Math.exp(-dt/.039));
    localX=filtered;
    if(mode==="online"&&role==="guest"&&connected&&accepted&&t-motionSync>65){
      motionSync=t;send("move",{x:-localX,boost:false});
    }
  }
  try{tiles.fill(0);colors[0]="#113045";rgb[0]=[.055,.135,.21];}catch(e){}
  function placed(){
    $("hud").style.display="flex";$("powers").style.display="flex";$("toolbar").style.display="none";
    ready=true;
    if(mode==="online"){send("ready",{ready:true});roomUI();}
    else notify("ARENA LISTA · TU ARCO ESTÁ ENTRE LOS DOS POSTES");
  }
  $("lock").addEventListener("click",()=>setTimeout(()=>{if(stage==="fixed")placed();},250));
  $("edit").addEventListener("click",()=>{
    running=false;ready=false;origin=null;filtered=null;
    $("hud").style.display="none";$("powers").style.display="none";
    badge.style.display="none";
    if(mode==="online"){send("ready",{ready:false});roomUI();}
  });
  function startMatch(){
    game=P.initial();scene.reset();lastPower=-4000;heardEvent=0;seenGoal=0;lastFrame=0;
    running=true;clock=0;
    $("result").style.display="none";
    display("¡BALL RUSH!","4 EMISORES · ARCO ENTRE POSTES · 6 VIDAS");
    notify("¡UN EMISOR ESTÁ CARGANDO LA PELOTA!",1300);tone(720,.18);
  }
  $("play").addEventListener("click",e=>{
    if(stage!=="fixed"&&stage!=="finished")return;
    e.preventDefault();e.stopImmediatePropagation();
    if(mode==="online"&&(role!=="host"||!guestId||!guestReady||!ready)){roomUI();return;}
    if(origin===null)recenter();
    startMatch();setStage("playing");
    if(mode==="online")send("start",{});
  },true);
  $("boost").onclick=()=>{
    if(!running){notify("PRIMERO INICIÁ LA BATALLA");return;}
    if(energy()<.995){notify("ENERGÍA RECARGANDO "+Math.floor(energy()*100)+"%");return;}
    lastPower=performance.now();
    if(mode==="online"&&role==="guest"){
      send("move",{x:-localX,boost:true});toastMessage("⚡ IMPULSO ENVIADO",true);
      tone(850,.19,"sawtooth");buzz(70);
    }else{
      const activated=P.boost(game,"bottom");
      if(!activated)notify("ESPERÁ A QUE LA PELOTA ESTÉ EN JUEGO");
    }
  };
  $("view").onclick=()=>{
    inside=!inside;$("cockpit").style.display=inside?"block":"none";
    $("view").textContent=inside?"👁 EXTERIOR":"👁 CABINA";
  };
  $("goHome").onclick=()=>{try{sess?.end();}catch(e){}location.href="/";};
  $("back").onclick=()=>location.href="/";
  $("again").onclick=()=>{
    $("result").style.display="none";
    if(mode==="online"){
      if(role==="host"&&guestReady&&ready){startMatch();send("start",{});}
      else roomUI();
    }else startMatch();
  };
  $("dismiss").onclick=()=>$("result").style.display="none";
  function endScreen(){
    if($("result").style.display==="flex")return;
    $("endTitle").textContent=game.winner==="draw"?"¡EMPATE!":
      game.winner===meSide()?"¡GANASTE!":"FIN DE LA PARTIDA";
    $("endSummary").textContent="Vidas: "+game.hp.bottom+" / "+game.hp.top+
      " · Tiempo: "+Math.round(game.time)+" segundos";
    $("result").style.display="flex";
  }
  function events(){
    const ev=game.lastEvent||{seq:0};
    if(ev.seq!==heardEvent){
      heardEvent=ev.seq;
      if(ev.kind==="launch"){
        const pod=Number(ev.detail)||0;
        scene.emit(ev.x,ev.z,"#b5ffff","launch");
        notify("⚡ EMISOR "+(pod+1)+" · ¡LANZAMIENTO!",900);
        tone(920,.19,"sawtooth");
      }else if(["pod_hit","rail_hit","hit","shield_hit","boost","boost_hit"].includes(ev.kind)){
        const idx=P.sides.indexOf(ev.side);
        const color=ev.kind==="pod_hit"?"#96ffff":idx===0?"#47ffd0":
          idx===1?"#ff7ab0":idx===2?"#ffd279":"#c49bff";
        scene.emit(ev.x,ev.z,color,ev.kind);
        if(ev.kind==="pod_hit")tone(660,.08);
        if(ev.kind==="shield_hit"){toastMessage("⚡ ¡REBOTE POTENCIADO!",true);buzz([45,25,45]);}
        if(ev.kind==="boost"||ev.kind==="boost_hit"){
          toastMessage(ev.kind==="boost_hit"?"⚡ ¡DISPARO DIRECTO!":"⚡ DEFENSA EXPANDIDA",true);
          tone(930,.15,"sawtooth");buzz(50);
        }
      }
    }
    if(game.goalSeq!==seenGoal){
      seenGoal=game.goalSeq;
      const side=game.lastGoalSide;
      toastMessage(side==="bottom"?"¡GOL EN CONTRA!":side==="top"?"¡GOL AL RIVAL!":"¡GOL!",side==="top");
      tone(side==="bottom"?220:790,.25);buzz(side==="bottom"?[90,30,70]:[50,30,50]);
      notify("¡NUEVA PELOTA DESDE OTRO EMISOR!",1350);
    }
    if(!running&&game.winner)endScreen();
  }
  function updateHUD(t){
    if(stage!=="fixed"&&stage!=="playing"&&stage!=="finished")return;
    $("hud").style.display="flex";$("powers").style.display="flex";
    $("toolbar").style.display="none";badge.style.display="block";
    $("hpMe").textContent="♥".repeat(game.hp[meSide()])||"0";
    $("hpEnemy").textContent="♥".repeat(game.hp[meSide()==="bottom"?"top":"bottom"])||"0";
    $("speed").textContent=(Math.hypot(game.ball.vx,game.ball.vz)/1.28).toFixed(1)+"×";
    const e=energy();$("boost").disabled=e<.99;
    $("boost").textContent=e>=.99?"⚡ IMPULSO / ESCUDO":"⚡ CARGA "+Math.floor(e*100)+"%";
    $("boost").classList.toggle("br-ready",e>=.99);
    $("boost").classList.toggle("br-cooldown",e<.99);
    $("mainbuttons").classList.toggle("in-play",running);
    if(stage==="fixed"&&!running){
      $("play").style.display="";
      badge.textContent="4 EMISORES · ARCOS DELIMITADOS";
      if(mode==="online")roomUI();
    }
    if(running){
      $("play").style.display="none";
      badge.textContent=game.phase==="charging"?
        "⚡ EMISOR "+(game.activePod+1)+" · CARGANDO":"ARCO CENTRAL · EXTREMOS PROTEGIDOS";
      if(t>noticeUntil){
        $("ballstatus").textContent=game.phase==="charging"?
          "PREPARATE: LA PELOTA SALE DE UNA ESQUINA":"DEFENDÉ SOLO EL TRAMO ENTRE POSTES";
      }
    }
  }
  function tick(t,frame){
    if(typeof sess==="undefined"||!sess)return;
    sess.requestAnimationFrame(tick);
    try{
      frameCount++;
      const dt=lastFrame?cap((t-lastFrame)/1000,0,.055):.016;lastFrame=t;
      const world=buildWorld();if(!world)return;
      movement(frame,world,dt,t);clock+=dt;
      if(mode==="solo"||role==="host"){
        if(running){
          if(mode==="online"&&(!guestId||Date.now()-guestSeen>6000)){
            if(t>noticeUntil)notify("PARTIDA EN PAUSA · AMIGO DESCONECTADO",1300);
          }else P.tick(game,dt,localX,remoteX,mode==="online");
        }
      }
      if(mode==="online"&&role==="host"&&connected&&t-roomSync>(running?90:800)){
        roomSync=t;send("state",{game,running});
      }
      if(mode==="online"&&role==="guest"&&accepted&&Date.now()-hostSeen>10500){
        running=false;notify("ESPERANDO RECONEXIÓN DEL ANFITRIÓN");
      }
      if(running||game.winner)events();
      scene.render(frame,world,game,{time:clock,dt,guest:mode==="online"&&role==="guest",me:meSide()});
      if(t-lastHUD>175){lastHUD=t;updateHUD(t);}
    }catch(e){if(frameCount<25)console.warn("Ball Rush v2.5 runtime:",e);}
  }
  function initialize(){
    if(started||typeof sess==="undefined"||!sess||typeof ref==="undefined"||!ref)return;
    started=true;sess.requestAnimationFrame(tick);
    sess.addEventListener("end",()=>{
      running=false;try{client?.removeChannel(channel);}catch(e){}
    });
  }
  setInterval(initialize,180);
  selectMode("solo");
})();