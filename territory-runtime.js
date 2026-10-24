"use strict";
(function(){
const $=id=>document.getElementById(id),T=window.TerritoryCore;
if(!T||!window.TerritoryArt)throw Error("Territorio X: faltan los módulos");
const art=window.TerritoryArt($("territorySvg"),T),lim=(v,a,b)=>Math.max(a,Math.min(v,b));
let game=T.newGame(),playing=false,demo=false,joy=false,dx=0,dy=0,drag=false,base=null,pose=null;
let lastXR=0,lastDraw=0,lastHUD=0,lastEvent=0,shieldAt=-100,booted=false,canvas=null,ctx=null,prevDemo=0,scoreText="",errorLog=false;
function note(s){$("message").textContent=s;$("message").style.display="block"}
function pop(s){let n=$("toast");n.textContent=s;n.classList.remove("active");void n.offsetWidth;n.classList.add("active")}
window.alert=pop;
function pos(m,p){let x=p.x-m[12],y=p.y-m[13],z=p.z-m[14];return{x:m[0]*x+m[1]*y+m[2]*z,z:m[8]*x+m[9]*y+m[10]*z}}
function calibrate(){let M=typeof buildWorld==="function"?buildWorld():null;if(demo){note("JOYSTICK LISTO");return}if(!M||!pose||pose.emulatedPosition){note("ESPERÁ QUE AR DETECTE TU POSICIÓN");return}let q=pos(M,pose.transform.position),p=game.players[0];base={x:q.x,z:q.z,px:p.x,py:p.y};note("✓ CENTRADO · MOVETE A LOS COSTADOS")}
function move(frame,M,dt){if(!playing)return;let p=game.players[0];if(joy){if(Math.abs(dx)+Math.abs(dy)>.04)T.move(game,0,p.x+dx*8.7*dt,p.y+dy*8.7*dt,.8);return}if(!frame)return;
 const v=frame.getViewerPose(ref);pose=v;if(!v||v.emulatedPosition)return;let q=pos(M,v.transform.position);if(!base)base={x:q.x,z:q.z,px:p.x,py:p.y};let pitch=5*(typeof boardSize==="undefined"?.45:boardSize)/T.N;T.move(game,0,base.px+(q.x-base.x)*1.6/pitch,base.py+(q.z-base.z)*1.6/pitch,Math.max(.65,dt*19))}
function hud(){let p=game.players[0],rank=T.ranking(game);$("time").textContent=Math.ceil(game.remaining);$("area").textContent=p.score.toFixed(1)+"%";$("lives").textContent="♥".repeat(p.hp)||"0";$("place").textContent="#"+(rank.findIndex(x=>x.id===0)+1);$("rankings").innerHTML=rank.map(x=>'<div><span style="color:'+T.COLORS[x.id]+'">'+(x.id===0?"● VOS":"● "+x.name)+'</span><b>'+x.score.toFixed(1)+'%</b></div>').join("");
 let wait=Math.max(0,17-(game.time-shieldAt));$("shield").disabled=!playing||wait>0;$("shield").textContent=wait>0?"🛡 "+Math.ceil(wait)+"s":"🛡 ESCUDO"}
function end(){if(!playing)return;playing=false;let p=game.players[0],rank=T.ranking(game),place=rank.findIndex(x=>x.id===0)+1;
 $("endTitle").textContent=game.winner===0?"🏆 ¡SOS CAMPEÓN!":p.hp===0?"¡TE ELIMINARON!":"FIN DE PARTIDA";$("endSummary").textContent="Puesto #"+place+" · "+p.score.toFixed(1)+"% conquistado · "+p.captures+" circuitos.";
 scoreText="¡Jugá Territorio X! Quedé #"+place+" con "+p.score.toFixed(1)+"% de terreno. "+location.origin+"/territorio.html";$("result").style.display="flex"}
function events(){let e=game.lastEvent;if(!e||e.seq===lastEvent)return;lastEvent=e.seq;if(e.type==="capture"&&e.id===0)pop("+"+e.value+" CASILLAS · ¡CONQUISTA!");if(e.type==="cut"&&e.id===0)pop("¡CORTARON TU ESTELA!");if(e.type==="pickup"&&e.id===0)pop("★ ESCUDO EXTRA");if(e.type==="shield"&&e.id===0)pop("🛡 ESCUDO ACTIVADO");if(e.type==="end")end()}
function start(){game=T.newGame();T.start(game);art.reset();playing=true;base=null;lastEvent=0;shieldAt=-100;$("result").style.display="none";$("mainbuttons").style.display="none";$("toolbar").style.display="none";$("hud").style.display="flex";$("powers").style.display="flex";$("rankings").style.display="block";note("SALÍ DE TU COLOR Y VOLVÉ PARA CERRAR");hud()}
$("center").onclick=calibrate;
$("shield").onclick=()=>{if(T.shield(game,0)){shieldAt=game.time;events();hud()}else note("ESCUDO RECARGANDO")};
$("control").onclick=()=>{joy=!joy;$("stick").style.display=joy?"block":"none";$("control").textContent=joy?"🚶 MOVIMIENTO":"🕹 JOYSTICK";base=null;note(joy?"USÁ EL JOYSTICK":"MOVETE FÍSICAMENTE")};
$("lock").addEventListener("click",()=>setTimeout(()=>{if(stage==="fixed"){$("hud").style.display="flex";$("powers").style.display="flex";$("toolbar").style.display="none";note("PISTA FIJA · ¡COMENZÁ!")}},230));
$("edit").addEventListener("click",()=>{playing=false;base=null;$("hud").style.display="none";$("powers").style.display="none";$("rankings").style.display="none";$("toolbar").style.display="flex"});
$("play").addEventListener("click",e=>{if(stage!=="fixed"&&stage!=="finished")return;e.preventDefault();e.stopImmediatePropagation();start();setStage("playing")},true);
$("again").onclick=start;$("dismiss").onclick=()=>$("result").style.display="none";
$("back").onclick=()=>location.href="/";$("goHome").onclick=()=>{try{sess?.end()}catch(e){}location.href="/"};
$("share").onclick=async()=>{try{if(navigator.share){await navigator.share({title:"Territorio X",text:scoreText});return}}catch(e){}try{await navigator.clipboard.writeText(scoreText);$("share").textContent="✅ COPIADO"}catch(e){prompt("Compartir:",scoreText)}};
$("online")?.addEventListener("click",()=>{pop("ONLINE EN PREPARACIÓN · JUGÁ CONTRA 3 BOTS");$("online").classList.remove("selected");$("solo").classList.add("selected")});
let pad=$("stick"),knob=$("stickKnob");function point(e){let r=pad.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.max(1,Math.hypot(x,y)),k=Math.min(35,d)/d;dx=x*k/35;dy=y*k/35;knob.style.transform="translate("+(x*k)+"px,"+(y*k)+"px)"}
pad.addEventListener("pointerdown",e=>{drag=true;pad.setPointerCapture(e.pointerId);point(e)});
pad.addEventListener("pointermove",e=>{if(drag)point(e)});
function up(){drag=false;dx=dy=0;knob.style.transform="translate(0,0)"}
pad.addEventListener("pointerup",up);pad.addEventListener("pointercancel",up);
function loop(t,f){if(typeof sess==="undefined"||!sess)return;sess.requestAnimationFrame(loop);try{let dt=lastXR?lim((t-lastXR)/1000,0,.06):.016;lastXR=t;let M=buildWorld();if(!M)return;pose=f.getViewerPose(ref);move(f,M,dt);if(playing)T.tick(game,dt);events();if(t-lastDraw>60){lastDraw=t;art.render(f,M,game,{boardSize:typeof boardSize==="undefined"?.45:boardSize,time:game.time,dt:dt*3,you:0})}if(t-lastHUD>180){lastHUD=t;hud()}}catch(e){if(!errorLog){errorLog=true;console.warn("Territorio X XR",e)}}}
function boot(){if(booted||typeof sess==="undefined"||!sess||typeof ref==="undefined"||!ref)return;booted=true;sess.requestAnimationFrame(loop);sess.addEventListener("end",()=>{playing=false;booted=false})}setInterval(boot,200);
function drawDemo(){if(!canvas)return;let ratio=Math.min(devicePixelRatio||1,2),w=canvas.width=Math.floor(innerWidth*ratio),h=canvas.height=Math.floor(innerHeight*ratio),side=Math.min(w*.94,h*.64),s=side/T.N,ox=(w-side)/2,oy=h*.36-side*.32,c=ctx;c.fillStyle="#071728";c.fillRect(0,0,w,h);c.save();c.translate(ox,oy);
 for(let i=0;i<game.owners.length;i++){let q=game.owners[i];c.fillStyle=q<0?"#173750":T.COLORS[q];c.fillRect((i%T.N)*s+.5,((i/T.N)|0)*s+.5,s-1,s-1)}
 for(let p of game.players){if(p.dead)continue;if(p.trail.length){c.beginPath();p.trail.forEach((k,i)=>{let x=(k%T.N+.5)*s,y=(((k/T.N)|0)+.5)*s;i?c.lineTo(x,y):c.moveTo(x,y)});c.lineTo((p.x+.5)*s,(p.y+.5)*s);c.strokeStyle=T.COLORS[p.id];c.lineWidth=s*.42;c.shadowBlur=12;c.shadowColor=T.COLORS[p.id];c.stroke();c.shadowBlur=0}
 c.beginPath();c.arc((p.x+.5)*s,(p.y+.5)*s,s*.43,0,Math.PI*2);c.fillStyle=T.COLORS[p.id];c.fill();c.lineWidth=2;c.strokeStyle="white";c.stroke()}
 c.strokeStyle="#54ffca";c.lineWidth=3;c.strokeRect(0,0,side,side);c.restore()}
function demoLoop(t){if(!demo)return;let dt=prevDemo?lim((t-prevDemo)/1000,0,.06):.016;prevDemo=t;if(playing){move(null,null,dt);T.tick(game,dt)}events();if(t-lastDraw>40){lastDraw=t;drawDemo()}if(t-lastHUD>170){lastHUD=t;hud()}requestAnimationFrame(demoLoop)}
$("demo").onclick=()=>{demo=true;joy=true;$("home").style.display="none";$("overlay").style.display="block";for(let id of ["head","reticle","touchpad","calibrate","diagbtn","goHome"]){$(id).style.display="none"}$("stick").style.display="block";$("control").textContent="🚶 MOVIMIENTO";canvas=document.createElement("canvas");Object.assign(canvas.style,{position:"absolute",inset:"0",width:"100%",height:"100%",zIndex:"1",pointerEvents:"none"});$("overlay").insertBefore(canvas,$("overlay").firstChild);ctx=canvas.getContext("2d");start();requestAnimationFrame(demoLoop)};
let keys=new Set();function sync(){if(!demo)return;dx=Number(keys.has("d")||keys.has("ArrowRight"))-Number(keys.has("a")||keys.has("ArrowLeft"));dy=Number(keys.has("s")||keys.has("ArrowDown"))-Number(keys.has("w")||keys.has("ArrowUp"))}
window.addEventListener("keydown",e=>{if(["a","d","w","s","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();keys.add(e.key);sync()}});window.addEventListener("keyup",e=>{keys.delete(e.key);sync()});
})();