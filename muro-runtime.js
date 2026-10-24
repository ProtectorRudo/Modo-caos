'use strict';
/* MURO RUSH v3.1 - calibration-first AR controller.
   The TRACKED object is the phone; no foot or body tracking is claimed.
   Keeps existing WebXR plane engine, wall renderer and chaos game core.
 */
(function(){
 const el=id=>document.getElementById(id),G=window.MuroRushCore,A=window.MuroRushArt;
 if(!G||!A)throw Error('Muro Rush: módulos incompletos');
 const art=A(el('arenaSvg')),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 let game=G.make({level:el('difficulty').value});
 let status='home',running=false,mode='body',cal='none',reference=null,sign=1;
 let samples=[],sampleStart=0,filtered=0,prevX=null,lastTrack=0,movingDir=0;
 let xrBooted=false,xrLast=0,visualAt=0,hudAt=0,eventId=0,onceError=false;
 let demo=false,demoCanvas=null,ctx=null,demoLast=0,soundCtx=null,toastTimer=0,best=0;
 try{best=+(localStorage.getItem('muro-rush-best')||0)}catch(e){}
 try{tiles.fill(0);colors[0]='#0d2a41';rgb[0]=[.048,.16,.25]}catch(e){}
 el('bestIntro').textContent=best?'TU RÉCORD: '+best.toLocaleString('es-AR'):'15 MUROS · 3 VIDAS · 1 CAMPEÓN';
 const css=document.createElement('style');
 css.textContent=[
 '#play{display:none!important}',
 '#calPanel{display:none;flex-direction:column;align-items:center;gap:6px;background:#092b3fed;border:2px solid #51d6c3;border-radius:14px;padding:11px 10px;text-align:center;box-shadow:0 4px 18px #0004}',
 '#calPanel b{font:950 14px/1.2 system-ui;color:#f5fff7}',
 '#calPanel small{font:700 11px/1.4 system-ui;color:#c4e6e0}',
 '#calPanel.ready{border-color:#67ffc9;background:#0b3d36ed}',
 '#calBar{height:7px;width:100%;border-radius:7px;overflow:hidden;background:#235366}',
 '#calFill{height:100%;width:0;background:linear-gradient(90deg,#3dcfff,#58ffd1);transition:width .12s}',
 '#calBtns{display:flex;gap:6px;width:100%}',
 '#calBtns button{flex:1;min-height:39px;font-size:10px;padding:8px 5px}',
 '#wallStart:disabled{filter:grayscale(1);opacity:.42}',
 '#calSignal{font-size:21px}',
 '#calSuccess{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);padding:9px 15px;background:#0f5840e8;border:2px solid #dffff0;color:white;font:950 17px system-ui;border-radius:18px;text-shadow:0 0 12px #50ffb2;z-index:16;pointer-events:none;display:none}',
 '#calSuccess.pop{display:block;animation:calPop .95s ease-out both}',
 '@keyframes calPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.65)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.09)}100%{opacity:0;transform:translate(-50%,-60%) scale(1)}}'
 ].join('');
 document.head.appendChild(css);
 const panel=document.createElement('div');panel.id='calPanel';
 panel.innerHTML='<span id="calSignal">📍</span><b id="calTitle">POSICIÓN INICIAL</b><small id="calHint">Parate frente al centro y apuntá a la pista.</small><div id="calBar"><div id="calFill"></div></div><div id="calBtns"><button id="calAgain">🎯 RECENTRAR</button><button id="calFlip">⇄ INVERTIR</button></div>';
 el('bottom').insertBefore(panel,el('wallStatus'));
 const success=document.createElement('div');success.id='calSuccess';success.textContent='✓ ¡ESTÁS LISTO!';
 el('overlay').appendChild(success);
 const startBtn=el('wallStart'),calBtn=el('wallCalibrate');
 function announce(s){el('wallStatus').textContent=s}
 function progress(type,title,desc,n){
   panel.style.display='flex';panel.className=type;
   el('calSignal').textContent=type==='ready'?'✅':'📍';
   el('calTitle').textContent=title;el('calHint').textContent=desc;
   el('calFill').style.width=Math.round(100*clamp(n,0,1))+'%';
 }
 function startEnabled(b){startBtn.disabled=!b;startBtn.textContent=b?'▶ ¡EMPEZAR!':'CALIBRANDO…'}
 function sound(f=870){
   try{soundCtx=soundCtx||new(window.AudioContext||window.webkitAudioContext)();soundCtx.resume?.();
   const o=soundCtx.createOscillator(),g=soundCtx.createGain(),t=soundCtx.currentTime;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.052,t);
   g.gain.exponentialRampToValueAtTime(.0001,t+.17);o.connect(g);g.connect(soundCtx.destination);o.start(t);o.stop(t+.18)}catch(e){}
 }
 function popup(s,bad=false){
   const e=el('wallFX');e.textContent=s;e.classList.remove('active','danger');void e.offsetWidth;
   e.classList.add('active');e.classList.toggle('danger',bad);clearTimeout(toastTimer);
   toastTimer=setTimeout(()=>e.classList.remove('active'),900);
 }
 function world(){try{return typeof buildWorld==='function'?buildWorld():null}catch(e){return null}}
 function cameraPosition(frame,M){
   try{
     const pose=frame.getViewerPose(ref);if(!pose||pose.emulatedPosition||!M)return null;
     const v=pose.transform.position,x=v.x-M[12],y=v.y-M[13],z=v.z-M[14];
     const lateral=M[0]*x+M[1]*y+M[2]*z;
     return Number.isFinite(lateral)?lateral:null;
   }catch(e){return null}
 }
 function calibrate(){
   if(demo||!['fixed','running'].includes(status))return;
   if(running)G.pause(game,true);
   cal='sampling';samples=[];sampleStart=0;prevX=null;
   if(!running)startEnabled(false);
   progress('wait','QUEDATE QUIETO UN SEGUNDO','Tu celular marca el centro. Apuntá hacia la pista.',0);
   announce('CALIBRANDO AUTOMÁTICAMENTE · MANTENÉ EL CELULAR QUIETO');
 }
 function sampling(t,x){
   if(cal!=='sampling')return;
   if(x===null){sampleStart=0;samples=[];
     progress('wait','BUSCANDO POSICIÓN','Apuntá al piso y mové el teléfono lentamente.',0);return}
   if(!sampleStart)sampleStart=t;
   samples.push(x);if(samples.length>50)samples.shift();
   const diff=Math.max(...samples)-Math.min(...samples);
   if(diff>.11){samples=samples.slice(-4);sampleStart=t;
     progress('wait','UN MOMENTITO…','Quedate quieto para fijar la referencia.',0);return}
   const p=clamp((t-sampleStart)/950,0,1);
   progress('wait',p>.78?'¡CASI LISTO!':'DETECTANDO TU CENTRO…','No te muevas todavía.',p);
   if(p>=1){
     const refX=samples.reduce((a,b)=>a+b,0)/samples.length;
     reference={x:refX,base:running?game.playerX:0};
     filtered=reference.base;prevX=refX;lastTrack=t;cal='ready';
     progress('ready','✓ ¡LISTO PARA JUGAR!','Tu punto de partida es el carril central.',1);
     if(running)G.pause(game,false);else startEnabled(true);
     announce('✓ CALIBRADO · PODÉS MOVERTE O EMPEZAR');
     success.classList.remove('pop');void success.offsetWidth;success.classList.add('pop');
     sound(1020);try{navigator.vibrate?.(45)}catch(e){}
   }
 }
 function fixed(){
   if(status==='fixed'||status==='running'||demo)return;
   status='fixed';running=false;cal='none';reference=null;
   el('overlay').classList.add('mw-fixed');
   el('wallHead').style.display='grid';el('wallHud').style.display='flex';
   el('wallGuide').style.display='flex';el('wallActions').style.display='flex';
   el('wallPower').style.display='none';el('wallInputToggle').style.display='block';
   calBtn.style.display='block';startBtn.style.display='block';
   el('wallBanner').textContent='COLOCATE CERCA DEL CENTRO';
   announce('TU CELULAR MARCA EL CARRIL CENTRAL');
   calibrate();renderHud();
 }
 function erase(){
   status='preview';running=false;cal='none';reference=null;filtered=0;prevX=null;
   el('overlay').classList.remove('mw-fixed','mw-running');
   panel.style.display='none';
   for(const id of ['wallHud','wallHead','wallGuide','wallActions','movementPad','wallResult'])el(id).style.display='none';
   startBtn.style.display='block';startEnabled(false);
 }
 function begin(){
   if(!demo&&status!=='fixed'&&status!=='finished'){announce('PRIMERO FIJÁ LA PISTA');return}
   if(mode==='body'&&!demo&&cal!=='ready'){announce('ESPERÁ A QUE TERMINE LA CALIBRACIÓN');calibrate();return}
   // Critical invariant: keep the calibration reference set BEFORE pressing start.
   const preserved=reference;
   game=G.make({level:el('difficulty').value});G.start(game);reference=preserved;
   if(reference)reference.base=0;
   filtered=0;prevX=reference?.x??null;running=true;status='running';eventId=0;
   el('overlay').classList.add('mw-running','mw-fixed');
   el('wallResult').style.display='none';el('wallHead').style.display='grid';
   el('wallHud').style.display='flex';el('wallGuide').style.display='flex';
   el('wallActions').style.display='flex';el('wallPower').style.display='block';
   startBtn.style.display='none';panel.style.display='none';
   calBtn.style.display='block';el('wallInputToggle').style.display=demo?'none':'block';
   el('movementPad').style.display=demo||mode==='buttons'?'flex':'none';
   announce('¡EMPEZÓ! · MOVETE HACIA LOS HUECOS');popup('¡PREPARATE!');renderHud();
 }
 function move(t,dt,x){
   if(cal==='sampling'){sampling(t,x);return}
   if(!running)return;
   if(demo||mode==='buttons'){
     filtered=clamp(filtered+direction*dt*1.10,-.999,.999);G.setX(game,filtered);return;
   }
   if(x===null){
     if(t-lastTrack>1350&&!game.paused){G.pause(game,true);announce('📡 PISTA PERDIDA · PARTIDA EN PAUSA')}
     return;
   }
   lastTrack=t;
   if(game.paused){G.pause(game,false);announce('✓ SEGUIMIENTO RECUPERADO')}
   if(!reference){calibrate();return}
   if(prevX!==null&&Math.abs(x-prevX)>.46){reference.x+=x-prevX;prevX=x;return}
   prevX=x;
   const tile=typeof boardSize!=='undefined'&&Number.isFinite(boardSize)?boardSize:.45;
   const half=2.5*tile,target=clamp(reference.base+sign*(x-reference.x)/half,-.999,.999);
   const smooth=1-Math.exp(-dt/.115),next=filtered+(target-filtered)*smooth;
   filtered=clamp(next,filtered-dt*1.25,filtered+dt*1.25);
   G.setX(game,filtered);
 }
 function renderHud(){
   el('wallWave').textContent=String(game.wave).padStart(2,'0')+'/15';
   el('wallScore').textContent=game.score.toLocaleString('es-AR');
   el('wallLives').textContent='♥'.repeat(Math.max(0,game.life))||'0';
   el('wallCombo').textContent='×'+Math.max(1,game.combo);
   el('wallClock').textContent=game.paused?'PAUSA':game.phase==='wave'?game.remaining.toFixed(1)+' s':
    game.phase==='countdown'?Math.ceil(game.wait)+' s':game.phase==='finished'?'FIN':'•••';
   el('wallPower').disabled=!running||game.shields<=0||game.shieldActive||game.phase!=='wave';
   el('wallPower').textContent=game.shieldActive?'🛡 ACTIVO':'🛡 ESCUDO ('+game.shields+')';
   el('progressBar').style.width=(game.phase==='wave'?(game.wall?.progress||0)*100:0)+'%';
   el('wallLaneText').textContent='VOS · CARRIL '+(game.lane+1)+'/5';
   for(let i=0;i<5;i++){
     const box=el('wallLaneStrip').children[i];
     box.classList.toggle('safe',!!game.wall?.open.includes(i));
     box.classList.toggle('unsafe',!!game.wall&&!game.wall.open.includes(i));
     box.classList.toggle('me',i===game.lane);
   }
   if(game.phase==='between')el('wallBanner').textContent='¡PREPARATE!';
 }
 function finish(){
   if(!running)return;running=false;status='finished';
   if(game.score>best){best=game.score;try{localStorage.setItem('muro-rush-best',String(best))}catch(e){}}
   el('wallResultTitle').textContent=game.result==='complete'?'🏆 ¡SUPERASTE LOS 15 MUROS!':'FIN DE LA PARTIDA';
   el('wallResultStats').textContent=game.dodges+' MUROS ESQUIVADOS · '+game.score.toLocaleString('es-AR')+
     ' PUNTOS · COMBO ×'+game.bestCombo+' · RÉCORD: '+best.toLocaleString('es-AR');
   el('wallResult').style.display='flex';sound(550);
 }
 function events(){
   const e=game.lastEvent;if(e.seq===eventId)return;eventId=e.seq;
   if(e.type==='wall'){
     el('wallBanner').textContent=e.special==='boss'?'👑 JEFE FINAL':e.special==='gold'?'⭐ MURO DORADO':
       e.special==='closing'?'🔒 ¡SE CIERRA UN HUECO!':e.special==='turbo'?'🚀 ¡MURO TURBO!':
       e.special==='zigzag'||e.special==='shift'?'⚡ ¡VA A CAMBIAR!':'¡ESQUIVÁ EL MURO!';
     sound(680+game.wave*15);
   }else if(e.type==='dodge'){popup(e.perfect?'✨ PERFECTO +'+e.points:'✓ ESQUIVADO +'+e.points);sound(1150);try{navigator.vibrate?.(40)}catch(er){}}
   else if(e.type==='hit'){popup('¡TE GOLPEÓ! · -1 VIDA',true);sound(300);try{navigator.vibrate?.(110)}catch(er){}}
   else if(e.type==='saved'){popup('🛡 ¡EL ESCUDO TE SALVÓ!');sound(980)}
   else if(e.type==='shift')sound(525);
   else if(e.type==='finish')finish();
 }
 startBtn.onclick=begin;calBtn.onclick=calibrate;el('calAgain').onclick=calibrate;
 el('calFlip').onclick=()=>{sign*=-1;announce('⇄ DIRECCIÓN INVERTIDA · PROBÁ UN MOVIMIENTO CORTO');sound(610)};
 el('wallPower').onclick=()=>{if(G.shield(game))events()};
 el('wallInputToggle').onclick=()=>{
   mode=mode==='body'?'buttons':'body';direction=0;
   el('wallInputToggle').textContent=mode==='body'?'🎮 BOTONES':'🚶 CUERPO';
   el('movementPad').style.display=(running&&mode==='buttons')?'flex':'none';
   if(mode==='body'){cal='none';calibrate()}
   else if(status==='fixed'){cal='ready';startEnabled(true);
     progress('ready','✓ BOTONES ACTIVADOS','Listo para jugar con las flechas.',1)}
   announce(mode==='buttons'?'USÁ LAS FLECHAS PARA CAMBIAR DE CARRIL':'MOVETE FÍSICAMENTE DE COSTADO');
 };
 el('wallRestart').onclick=()=>{status='fixed';begin()};
 el('wallExit').onclick=()=>{try{sess?.end()}catch(e){}location.href='/'};
 el('backMenu').onclick=()=>location.href='/';
 el('goHome').onclick=()=>{try{sess?.end()}catch(e){}location.href='/'};
 el('edit').addEventListener('click',erase);
 el('lock').addEventListener('click',()=>setTimeout(()=>{if(typeof stage!=='undefined'&&stage==='fixed')fixed()},230));
 el('wallShare').onclick=async()=>{
   const text='¡Esquivé '+game.dodges+' muros en MURO RUSH! '+game.score+' puntos. '+location.origin+'/muro.html';
   try{if(navigator.share){await navigator.share({title:'Muro Rush',text});return}}catch(e){}
   try{await navigator.clipboard.writeText(text);el('wallShare').textContent='✅ COPIADO'}catch(e){prompt('Compartir:',text)}
 };
 for(const [id,d] of [['leftBtn',-1],['rightBtn',1]]){
   const b=el(id);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);direction=d});
   const up=()=>{if(direction===d)direction=0};
   b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);
 }
 let keys=new Set();
 window.addEventListener('keydown',e=>{if(['a','d','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys.add(e.key)}});
 window.addEventListener('keyup',e=>keys.delete(e.key));
 function keyboard(){if(!demo)return;direction=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'))}
 function findPlayer(out){
   const p=out?.player,missing=!p||p[0]<innerWidth*.09||p[0]>innerWidth*.9||p[1]<0||p[1]>innerHeight*.85;
   el('wallFind').style.display=missing?'block':'none';
   if(missing)el('wallFind').textContent=!p?'◈ APUNTÁ A LA PISTA':p[0]<innerWidth/2?'◀ VOS POR ACÁ':'VOS POR ACÁ ▶';
 }
 function arFrame(t,f){
   if(typeof sess==='undefined'||!sess)return;
   sess.requestAnimationFrame(arFrame);
   const dt=xrLast?clamp((t-xrLast)/1000,0,.065):.016;xrLast=t;
   try{
     const W=typeof buildWorld==='function'?buildWorld():null;if(!W)return;
     const pos=cameraPosition(f,W);
     move(t,dt,pos);
     if(running){G.tick(game,dt);events()}
     if(t-visualAt>50){visualAt=t;const out=art.render(f,W,game,{tile:typeof boardSize==='undefined'?.45:boardSize});if(running)findPlayer(out)}
     if(t-hudAt>150){hudAt=t;renderHud()}
   }catch(e){if(!onceError){console.warn('MURO 3.1 AR:',e);onceError=true;announce('ERROR AR · '+String(e.message||e).slice(0,65))}}
 }
 function boot(){
   if(demo||xrBooted||typeof sess==='undefined'||!sess||typeof ref==='undefined'||!ref)return;
   xrBooted=true;sess.requestAnimationFrame(arFrame);
   sess.addEventListener('end',()=>{xrBooted=false;erase()});
 }
 setInterval(()=>{if(!demo){boot();if(typeof stage!=='undefined'&&stage==='fixed'&&!['fixed','running','finished'].includes(status))fixed()}},165);
 function drawDemo(){
   if(!ctx)return;
   const dpr=Math.min(devicePixelRatio||1,2),w=demoCanvas.width=Math.round(innerWidth*dpr),
     h=demoCanvas.height=Math.round(innerHeight*dpr),c=ctx;
   c.fillStyle='#07182b';c.fillRect(0,0,w,h);
   const top=h*.17,bottom=h*.77,half=w*.5,far=w*.50,near=w*.96;
   const X=(l,z)=>half+(l/5-.5)*(far+(near-far)*z),Y=z=>top+(bottom-top)*z;
   c.fillStyle='#0c2b44';c.beginPath();c.moveTo(X(0,0),top);c.lineTo(X(5,0),top);
   c.lineTo(X(5,1),bottom);c.lineTo(X(0,1),bottom);c.closePath();c.fill();
   c.strokeStyle='#4baaca';c.lineWidth=2*dpr;
   for(let i=0;i<=5;i++){c.beginPath();c.moveTo(X(i,0),top);c.lineTo(X(i,1),bottom);c.stroke()}
   if(game.wall&&['wave','between'].includes(game.phase)){
     const z=game.phase==='wave'?game.wall.progress:1,y=Y(z),H=95*dpr*(.55+z*.85);
     for(let i=0;i<5;i++){
       if(game.wall.open.includes(i))continue;
       c.fillStyle='#184663f7';c.fillRect(X(i,z),y-H,X(i+1,z)-X(i,z),H);
       c.strokeStyle=game.wall.color;c.lineWidth=4*dpr;c.strokeRect(X(i,z),y-H,X(i+1,z)-X(i,z),H);
     }
     const a=Math.min(...game.wall.open),b=Math.max(...game.wall.open);
     c.strokeStyle='#7dffe5';c.lineWidth=6*dpr;c.shadowColor='#3bffd5';c.shadowBlur=13*dpr;
     c.strokeRect(X(a,z),y-H,X(b+1,z)-X(a,z),H);c.shadowBlur=0;
   }
   const px=X(2.5+game.playerX*2.5,1),py=Y(1)-20*dpr;
   c.beginPath();c.arc(px,py,18*dpr,0,Math.PI*2);c.fillStyle='#4cffbf';
   c.shadowColor='#5bffd6';c.shadowBlur=15*dpr;c.fill();c.shadowBlur=0;
   c.strokeStyle='white';c.lineWidth=4*dpr;c.stroke();
   c.fillStyle='white';c.textAlign='center';c.font='900 '+13*dpr+'px system-ui';c.fillText('VOS',px,py-27*dpr);
 }
 function demoLoop(t){
   if(!demo)return;
   const dt=demoLast?clamp((t-demoLast)/1000,0,.064):.016;demoLast=t;
   keyboard();if(running){move(t,dt,null);G.tick(game,dt);events()}
   if(t-visualAt>35){visualAt=t;drawDemo()}
   if(t-hudAt>130){hudAt=t;renderHud()}
   requestAnimationFrame(demoLoop);
 }
 el('demo').onclick=()=>{
   demo=true;status='fixed';cal='ready';mode='buttons';
   el('home').style.display='none';el('overlay').style.display='block';
   el('overlay').classList.add('mw-demo','mw-fixed');
   demoCanvas=document.createElement('canvas');
   Object.assign(demoCanvas.style,{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:1,pointerEvents:'none'});
   el('overlay').insertBefore(demoCanvas,el('overlay').firstChild);ctx=demoCanvas.getContext('2d');
   el('arenaSvg').style.display='none';el('tiles').style.display='none';
   for(const id of ['wallHead','wallHud','wallGuide','wallActions'])el(id).style.display=id==='wallHead'?'grid':id==='wallGuide'||id==='wallActions'?'flex':'flex';
   el('wallInputToggle').style.display='none';calBtn.style.display='none';
   el('wallPower').style.display='none';el('movementPad').style.display='flex';
   startBtn.style.display='block';startEnabled(true);
   announce('🎮 USÁ ◀ Y ▶ PARA ESQUIVAR LOS MUROS');renderHud();requestAnimationFrame(demoLoop);
 };
 window.MuroCalibDiagnostics={getState:()=>({status,cal,reference:reference?{x:reference.x}:null,mode,game:G.scorecard(game)})};
 renderHud();
})();
