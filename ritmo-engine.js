'use strict';
// Native WebXR hit testing, native WebGL XR framebuffer, and independent SVG DOM-overlay projection.
const $=id=>document.getElementById(id);
const colors=['#27ef84','#ffd933','#ff4562','#358dff','#b456ff','#ff8929'];
const names=['VERDE','AMARILLO','ROJO','AZUL','VIOLETA','NARANJA'];
const rgb=[[.15,.93,.52],[1,.85,.2],[1,.27,.38],[.2,.55,1],[.71,.34,1],[1,.54,.16]];
let tiles=Array.from({length:25},(_,i)=>i%6),target=0,round=0,remaining=0;
let sess=null,ref=null,hitSource=null,gl=null,shader=null,layer=null,glBuffer=null,uMvp=null,uColor=null;
let isStarting=false,stage='intro',hitResult=null,hitMatrix=null,anchor=null,anchorMatrix=null,worldMatrix=null,viewer=null;
let boardSize=.45,yaw=0,dx=0,dz=0,tracking=false,showDiag=true,poses=0,visibleSvg=0,drawCalls=0,lastHit=0,frameErr='',anchorState='pendiente';
let lastUI=0,gesture=new Map(),gestureSnapshot=null,roundTimer=null;
const S='http://www.w3.org/2000/svg',svg=$('tiles'),polys=[];
const mk=(tag)=>document.createElementNS(S,tag);
const border=mk('polygon');border.setAttribute('fill','none');border.setAttribute('stroke','#3dffbb');border.setAttribute('stroke-width','5');border.setAttribute('stroke-linejoin','round');svg.appendChild(border);
for(let i=0;i<25;i++){let p=mk('polygon');p.setAttribute('stroke','#ffffff');p.setAttribute('stroke-width','1.6');p.setAttribute('stroke-linejoin','round');p.setAttribute('fill-opacity','.82');svg.appendChild(p);polys.push(p)}
for(let i=0;i<25;i++){let el=document.createElement('div');el.style.background=colors[i%6];$('mock').appendChild(el)}
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function msg(h,s){$('headline').textContent=h;$('subtitle').textContent=s}
function diag(s){$('debug').textContent=s}
function alertError(s){$('notice').style.display='block';$('notice').textContent=s;diag(s)}
function I(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
function mul(a,b){const o=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)o[col*4+row]+=a[k*4+row]*b[col*4+k];return o}
function rotateY(angle){let a=I(),c=Math.cos(angle),s=Math.sin(angle);a[0]=c;a[2]=-s;a[8]=s;a[10]=c;return a}
function trans(x,y,z){const a=I();a[12]=x;a[13]=y;a[14]=z;return a}
function vec(M,x,y,z){return [M[0]*x+M[4]*y+M[8]*z+M[12],M[1]*x+M[5]*y+M[9]*z+M[13],M[2]*x+M[6]*y+M[10]*z+M[14],M[3]*x+M[7]*y+M[11]*z+M[15]]}
function matrixFromPose(p){return p&&p.transform?new Float32Array(p.transform.matrix):null}
function buildWorld(){const base=anchorMatrix||hitMatrix;if(!base)return null;return mul(base,mul(trans(dx,0,dz),rotateY(yaw)))}
function projected(M,x,y,z,w,h){const [cx,cy,cz,cw]=vec(M,x,y,z);if(cw<=.035||!Number.isFinite(cx/cw))return null;const nx=cx/cw,ny=cy/cw;return [(nx+1)*w*.5,(1-ny)*h*.5,cz/cw]}
function tileCorners(x,z,size){let a=(x-2)*size,b=(z-2)*size,k=size*.465;return [[a-k,.035,b-k],[a+k,.035,b-k],[a+k,.035,b+k],[a-k,.035,b+k]]}
function pointstr(ps){return ps.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}
function drawSvg(view,W){let w=window.innerWidth,h=window.innerHeight;svg.setAttribute('viewBox','0 0 '+w+' '+h);const mvp=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,W));let n=0,all=[];for(let i=0;i<25;i++){let x=i%5,z=Math.floor(i/5);let cs=tileCorners(x,z,boardSize).map(q=>projected(mvp,...q,w,h));const p=polys[i];if(cs.some(c=>!c)){p.style.display='none';continue}let inview=cs.some(c=>c[0]>-100&&c[0]<w+100&&c[1]>-100&&c[1]<h+100);if(!inview){p.style.display='none';continue}p.style.display='';p.setAttribute('points',pointstr(cs));p.setAttribute('fill',colors[tiles[i]]);p.setAttribute('fill-opacity',stage==='preview'?'.66':'.85');if(stage==='playing'&&tiles[i]===target)p.setAttribute('stroke','#f9ffff');else p.setAttribute('stroke','#ffffffaf');n++;all.push(...cs)}visibleSvg=n;if(n){let outline=[[-2.52*boardSize,.038,-2.52*boardSize],[2.52*boardSize,.038,-2.52*boardSize],[2.52*boardSize,.038,2.52*boardSize],[-2.52*boardSize,.038,2.52*boardSize]].map(q=>projected(mvp,...q,w,h));if(outline.every(Boolean)){border.style.display='';border.setAttribute('points',pointstr(outline))}else border.style.display='none'}else border.style.display='none'}
function hideSvg(){polys.forEach(p=>p.style.display='none');border.style.display='none';visibleSvg=0}
function program(gl){const vs='attribute vec3 pos;uniform mat4 mvp;void main(){gl_Position=mvp*vec4(pos,1.0);}';const fs='precision mediump float;uniform vec4 color;void main(){gl_FragColor=color;}';function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader: '+gl.getShaderInfoLog(s));return s}let p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Enlace GPU: '+gl.getProgramInfoLog(p));return p}
function initGPU(){shader=program(gl);uMvp=gl.getUniformLocation(shader,'mvp');uColor=gl.getUniformLocation(shader,'color');const v=new Float32Array([-.465,.038,-.465,.465,.038,-.465,.465,.038,.465,-.465,.038,-.465,.465,.038,.465,-.465,.038,.465]);glBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,glBuffer);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);gl.useProgram(shader);let attr=gl.getAttribLocation(shader,'pos');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}
function drawGL(view,W){if(!shader)return;gl.useProgram(shader);gl.bindBuffer(gl.ARRAY_BUFFER,glBuffer);let attr=gl.getAttribLocation(shader,'pos');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);const VP=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,W));let count=0;for(let i=0;i<25;i++){const x=(i%5-2)*boardSize,z=(Math.floor(i/5)-2)*boardSize;let M=mul(VP,mul(trans(x,0,z),new Float32Array([boardSize,0,0,0,0,boardSize,0,0,0,0,boardSize,0,0,0,0,1])));gl.uniformMatrix4fv(uMvp,false,M);let c=rgb[tiles[i]];gl.uniform4f(uColor,c[0],c[1],c[2],stage==='preview'?.52:.76);gl.drawArrays(gl.TRIANGLES,0,6);count++}return count}
function onFrame(time,frame){if(!sess)return;sess.requestAnimationFrame(onFrame);try{poses++;const viewerPose=frame.getViewerPose(ref);viewer=viewerPose;if(!viewerPose||!viewerPose.views.length){if(time-lastUI>400){diag('XR iniciado · esperando pose de cámara');lastUI=time}return}if(stage==='search'||stage==='preview'){const results=frame.getHitTestResults(hitSource);if(results.length){const p=results[0].getPose(ref);if(p){hitResult=results[0];hitMatrix=matrixFromPose(p);lastHit=time;tracking=true;if(stage!=='preview')setStage('preview')}}else if(time-lastHit>750){hitResult=null;tracking=false;hitMatrix=null;if(stage!=='search')setStage('search')}}if(anchor){const p=frame.getPose(anchor.anchorSpace,ref);if(p){anchorMatrix=matrixFromPose(p);anchorState='anclaje activo'}else anchorState='anclaje sin pose, posición conservada'}const W=buildWorld();worldMatrix=W;let count=0;const xrLayer=sess.renderState.baseLayer;gl.bindFramebuffer(gl.FRAMEBUFFER,xrLayer.framebuffer);for(const view of viewerPose.views){const vp=xrLayer.getViewport(view);gl.viewport(vp.x,vp.y,vp.width,vp.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(W){
 if(!window.modoCaosCustomArena){
  if(shader)count+=drawGL(view,W);drawSvg(view,W);
 }else{
  hideSvg();
  if(typeof window.modoCaosCustomRender==='function'){
   try{if(window.modoCaosCustomRender(gl,view,W,time))count+=2}
   catch(err){frameErr='Escenario 3D: '+(err?.message||err)}
  }
 }
}else hideSvg()}drawCalls=count;if(typeof window.modoCaosXRFrame==='function'&&W){try{window.modoCaosXRFrame(time,frame,W)}catch(err){frameErr='Render del minijuego: '+err.message}}if(time-lastUI>350){updateUI();lastUI=time}}catch(e){frameErr=e.message;if(time-lastUI>400){diag('ERROR DE FOTOGRAMA: '+frameErr);lastUI=time}}}
function updateUI(){const visible=stage!=='search'&&(window.modoCaosCustomArena?!!worldMatrix:visibleSvg>0);const p=hitMatrix||anchorMatrix;const webgl=shader?'GPU: OK ('+drawCalls+' dibujadas)':'GPU: ERROR';diag('XR '+poses+' frames · '+webgl+' · BALDOSAS EN PANTALLA: '+visibleSvg+'/25\n'+(tracking?'SUPERFICIE ✓':'BUSCANDO SUPERFICIE')+' · '+anchorState+(frameErr?'\nError: '+frameErr:''));$('lock').disabled=!hitMatrix||!tracking||stage!=='preview'||(typeof window.modoCaosLockReady==='function'&&!window.modoCaosLockReady());$('reticle').style.display=stage==='search'?'block':'none';$('touchpad').style.display=stage==='preview'?'block':'none';$('calibrate').style.display=stage==='preview'?'block':'none';$('fallback').style.display=stage==='preview'&&!visible?'block':'none';if(stage==='preview'&&!visible)$('fallback').textContent='Superficie detectada, pero la pista queda fuera de la vista. Apuntá al marcador y bajá un poco la cámara.';if(stage==='preview'){if(window.modoCaosCustomArena)msg('PISTA DETECTADA','4 carriles · Ajustá tamaño, posición y orientación. Después tocá FIJAR PISTA.');else msg(visible?'PISTA DETECTADA':'CALIBRANDO PISTA',visible?'Ajustá tamaño y posición. Las baldosas deben verse SOBRE el piso.':'Mové lentamente el teléfono hasta ver las baldosas de colores.');}if(stage==='search')msg('BUSCÁ EL PISO','Mové lentamente el celular hasta detectar una superficie real.')}
function setSize(d){const cfg=window.modoCaosGestureConfig;
 const step=cfg?.step||Math.abs(d),lo=cfg?.min??.20,hi=cfg?.max??.90;
 boardSize=clamp(Math.round((boardSize+Math.sign(d)*step)*1000)/1000,lo,hi);
 $('size').textContent=cfg?.label?cfg.label(boardSize):Math.round(boardSize*100)+' cm';}
function setStage(s){stage=s;const prep=s==='preview'||s==='search';$('lock').style.display=prep?'':'none';$('play').style.display=s==='fixed'||s==='finished'?'':'none';$('edit').style.display=s==='fixed'||s==='finished'||s==='playing'?'':'none';$('toolbar').style.display=prep?'flex':'none';$('touchpad').style.display=s==='preview'?'block':'none';$('calibrate').style.display=s==='preview'?'block':'none'}
async function check(){const c=$('precheck');if(!window.isSecureContext){c.textContent='Se necesita HTTPS';return false}if(!navigator.xr){
 c.textContent='📵 Esta ventana no puede abrir ARCore. Tocá ABRIR EN CHROME y después JUGAR. También está la DEMO 2D.';
 return false
}try{const ok=await navigator.xr.isSessionSupported('immersive-ar');c.textContent=ok?'✅ AR inmersiva detectada. Listo para abrir la cámara.':'⚠️ Este navegador no admite AR inmersiva. Abrí el enlace en Chrome Android fuera de ChatGPT o probá la demo 2D.';return ok}catch(e){c.textContent='No se pudo consultar compatibilidad: '+e.message;return false}}
function launchMessage(message,isError=false){
 const status=$('launchStatus');if(!status)return;
 status.hidden=false;status.textContent=message;
 status.style.borderColor=isError?'#ff9b7f':'#72e7c5';
 status.style.background=isError?'#3a1a27':'#0a3040';
}
function start(){if(isStarting)return;isStarting=true;
 $('enter').disabled=true;$('enter').textContent='📷 ABRIENDO LA CÁMARA…';
 launchMessage('📷 Solicitando permiso para AR. Si no se abre la cámara, tocá ABRIR EN CHROME. Las ventanas internas de ChatGPT no tienen ARCore.');
 $('notice').style.display='none';$('overlay').style.display='block';
 let pending;try{
 if(!window.modoCaosRuntimeReady)throw Error('El juego no terminó de cargar. Actualizá la página.');
 if(!navigator.xr){
  // A click on JUGAR is an explicit request for AR. An in-app WebView has no
  // navigator.xr: attempt Chrome's Android intent within that same user gesture.
  // Never pretend to provide physical tracking inside an unsupported browser.
  const link=$('openChrome');
  if(/android/i.test(navigator.userAgent||'')&&link?.href){
   try{window.location.href=link.href}catch(_){}
  }
  throw Error('Esta ventana no admite realidad aumentada: abrilo en Chrome Android con ARCore.');
 }
 pending=navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors'],domOverlay:{root:$('overlay')}});
 }catch(e){startError(e);return}Promise.resolve(pending).then(async session=>{sess=session;const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(canvas);gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,xrCompatible:true});if(!gl)throw Error('No se pudo crear WebGL compatible con XR.');if(gl.makeXRCompatible)await gl.makeXRCompatible();layer=new XRWebGLLayer(session,gl,{alpha:true,antialias:true,depth:true});session.updateRenderState({baseLayer:layer,depthNear:.025,depthFar:45});try{initGPU()}catch(e){frameErr='GPU: '+e.message;shader=null}ref=await session.requestReferenceSpace('local');const viewerSpace=await session.requestReferenceSpace('viewer');hitSource=await session.requestHitTestSource({space:viewerSpace});sess.addEventListener('end',()=>{stopRound();location.reload()});$('home').style.display='none';$('launchStatus').hidden=true;setStage('search');anchorState='sin anclaje';sess.requestAnimationFrame(onFrame);isStarting=false}).catch(e=>{startError(e)})}
function startError(e){
 isStarting=false;$('overlay').style.display='none';$('enter').disabled=false;
 $('enter').textContent='↻ REINTENTAR REALIDAD AUMENTADA';
 const message=String(e?.message||e||'No se pudo iniciar WebXR');
 launchMessage('⚠️ '+message+' · TOCÁ «ABRIR EN CHROME» debajo de JUGAR o elegí DEMO 2D.',true);
 $('precheck').textContent='⚠️ No se abrió la cámara: '+message+'. Abrí en Chrome Android fuera de la aplicación.';
 if(sess){try{sess.end()}catch(_){}sess=null}
}
async function lock(){if(stage!=='preview'||!hitMatrix||!tracking)return;setStage('fixed');msg('PISTA FIJADA','Caminá alrededor: los colores deberían permanecer anclados al piso.');anchorState='seguimiento local';$('play').textContent='EMPEZAR RONDAS';try{if(hitResult&&typeof hitResult.createAnchor==='function'){const a=await hitResult.createAnchor();if(stage==='fixed'||stage==='playing'){anchor=a;anchorState='anclaje espacial creado'}else a.delete()}else anchorState='seguimiento local (anchors no disponibles)'}catch(e){anchorState='seguimiento local: '+e.message}}
function reset(){stopRound();anchor?.delete?.();anchor=null;anchorMatrix=null;dx=0;dz=0;yaw=0;hitMatrix=null;hitResult=null;tracking=false;lastHit=0;setStage('search');msg('BUSCÁ EL PISO','Volvé a apuntar a una superficie para recolocar la pista.')}
function newColors(){for(let i=0;i<25;i++)tiles[i]=Math.floor(Math.random()*6);target=Math.floor(Math.random()*6);if(!tiles.includes(target))tiles[12]=target}
function startRound(){if(stage!=='fixed'&&stage!=='finished')return;round=0;setStage('playing');$('edit').textContent='REUBICAR';stepRound()}
function stepRound(){if(stage!=='playing')return;round++;if(round>8){setStage('finished');msg('¡PARTIDA TERMINADA!','8 rondas completas. Esta demo todavía no detecta los pies ni determina eliminaciones.');$('play').textContent='JUGAR DE NUEVO';return}newColors();remaining=Math.max(3,9-round);announce(names[target]);updateRound();roundTimer=setInterval(()=>{remaining--;if(remaining<=0){clearInterval(roundTimer);roundTimer=null;stepRound()}else updateRound()},1000)}
function updateRound(){msg('¡'+names[target]+'!', 'Ronda '+round+'/8 · '+remaining+' segundos · buscá ese color');}
function stopRound(){if(roundTimer){clearInterval(roundTimer);roundTimer=null}}
function announce(s){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s);u.lang='es-AR';u.rate=1.05;speechSynthesis.speak(u)}catch(_){}}
$('enter').addEventListener('click',start);
$('support').addEventListener('click',check);
$('minus').addEventListener('click',()=>setSize(-.05));
$('plus').addEventListener('click',()=>setSize(.05));
$('rotate').addEventListener('click',()=>{yaw+=Math.PI/12});
$('lock').addEventListener('click',lock);
$('play').addEventListener('click',startRound);
$('edit').addEventListener('click',reset);
$('diagbtn').addEventListener('click',()=>{showDiag=!showDiag;$('debug').style.display=showDiag?'block':'none'});
$('overlay').addEventListener('beforexrselect',e=>e.preventDefault());
const pad=$('touchpad');
pad.addEventListener('pointerdown',e=>{if(stage!=='preview')return;e.preventDefault();pad.setPointerCapture(e.pointerId);gesture.set(e.pointerId,{x:e.clientX,y:e.clientY});gestureSnapshot=null});
pad.addEventListener('pointermove',e=>{if(stage!=='preview'||!gesture.has(e.pointerId))return;e.preventDefault();let prev=gesture.get(e.pointerId),mx=e.clientX-prev.x,my=e.clientY-prev.y;gesture.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gesture.size===1){dx=clamp(dx+mx*.004,-4,4);dz=clamp(dz+my*.004,-4,4)}else{const pts=[...gesture.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),angle=Math.atan2(pts[1].y-pts[0].y,pts[1].x-pts[0].x);if(gestureSnapshot){const cfg=window.modoCaosGestureConfig;boardSize=clamp(boardSize*(distance/Math.max(1,gestureSnapshot.distance)),cfg?.min??.2,cfg?.max??.9);yaw+=angle-gestureSnapshot.angle;$('size').textContent=cfg?.label?cfg.label(boardSize):Math.round(boardSize*100)+' cm'}gestureSnapshot={distance,angle}}});
function clearPointer(e){gesture.delete(e.pointerId);gestureSnapshot=null}
pad.addEventListener('pointerup',clearPointer);pad.addEventListener('pointercancel',clearPointer);
check();
