'use strict';
/* OLA ROJA · reglas deterministas sin dependencias de cámara/render.
 * Todas las posiciones se expresan en unidades de baldosa (0 a 6).
 * AR proyecta posición física de teléfono, NO realiza seguimiento de pies. */
(function(root){
const N=6,DURATION=90,WARNING_SECONDS=3.0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const index=(r,c)=>r*N+c;
function rand(g){let v=g.seed>>>0;v^=v<<13;v^=v>>>17;v^=v<<5;g.seed=v>>>0;return g.seed/4294967296}
const pick=(g,n)=>Math.floor(rand(g)*n);
const bit=(r,c)=>1n<<BigInt(index(r,c));
const has=(mask,r,c)=>r>=0&&c>=0&&r<N&&c<N&&!!(mask&bit(r,c));
function make(opts={}){
 const seed=(Number(opts.seed)>>>0)||0xCA052026;
 return {seed,originalSeed:seed,stage:'ready',mode:opts.mode==='infinito'?'infinito':'clasico',
  duration:opts.mode==='infinito'?Infinity:DURATION,elapsed:0,countdown:3,paused:false,
  lives:3,shield:0,invuln:0,score:0,combo:0,dodges:0,waves:0,hitCount:0,
  pos:{x:3,z:3},cell:{r:3,c:3},tileMeters:clamp(opts.tileMeters||.45,.28,.7),
  active:[],safeZone:null,nextAt:1.8,fx:[],fxId:0,finishReason:'',event:'',eventUntil:0,slowUntil:0,
  waveKinds:['frontal','trasera','lateral','doble','serpiente','corredor','falsa','caos']};
}
function event(g,type,label){g.fx.push({id:++g.fxId,type,label,t:g.elapsed});if(g.fx.length>35)g.fx.shift()}
function start(g){if(g.stage!=='ready')return false;g.stage='countdown';g.countdown=3;g.paused=false;return true}
function setPosition(g,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 g.pos.x=clamp(x,.001,N-.001);g.pos.z=clamp(z,.001,N-.001);
 const c=clamp(Math.floor(g.pos.x),0,N-1),r=clamp(Math.floor(g.pos.z),0,N-1);
 // 8% de baldosa de histéresis para que no titile la casilla al borde.
 const d=.08,old=g.cell;
 const centerX=clamp(g.pos.x,0,N),centerZ=clamp(g.pos.z,0,N);
 if(c!==old.c&&(c>old.c?centerX<(old.c+1)+d:centerX>old.c-d)){}else old.c=c;
 if(r!==old.r&&(r>old.r?centerZ<(old.r+1)+d:centerZ>old.r-d)){}else old.r=r;
 return true;
}
function phases(t){return t<15?'APRENDIZAJE':t<35?'VELOCIDAD':t<55?'PRESIÓN':t<75?'CAOS':'SUPERVIVENCIA EXTREMA'}
function speed(g){
 // La casilla grande necesita más tiempo para caminar sin correr.
 const t=g.elapsed,base=t<15?1.00:t<35?.93:t<55?.87:t<75?.82:.78;
 return Math.max(base,g.tileMeters/.7*1.08);
}
function kind(g){
 const t=g.elapsed;
 const choices=t<15?['frontal','trasera','lateral']:t<35?['frontal','lateral','trasera','serpiente','falsa']:
 t<55?['lateral','frontal','doble','corredor','serpiente','falsa']:
 t<75?['doble','serpiente','corredor','falsa','caos','trasera']:
 ['caos','doble','corredor','serpiente','frontal','lateral'];
 return choices[pick(g,choices.length)];
}
function ensureRoute(g,steps,lead,stepSeconds){
 // Un autómata temporal verifica que exista un recorrido sin choques
 // desde la casilla real, a una velocidad caminando de <=0.7 m/s.
 const startR=g.cell.r,startC=g.cell.c;
 const travel=g.tileMeters/.7;
 const maxBefore=Math.max(0,Math.floor((lead-.30)/travel));
 let reachable=new Set();
 for(let r=0;r<N;r++)for(let c=0;c<N;c++)
  if(Math.abs(r-startR)+Math.abs(c-startC)<=maxBefore)reachable.add(index(r,c));
 for(const mask of steps){
  const next=new Set();
  const maxMove=Math.min(1,Math.max(0,Math.floor((stepSeconds+.04)/travel)));
  for(const i of reachable)for(let r=0;r<N;r++)for(let c=0;c<N;c++)
   if(Math.abs(r-Math.floor(i/N))+Math.abs(c-i%N)<=maxMove&&!has(mask,r,c))next.add(index(r,c));
  if(!next.size)return false;reachable=next;
 }
 return true;
}
function pattern(g,name){
 let steps=[],hole=clamp(g.cell.c+(pick(g,3)-1),0,5);
 const safeHole=()=>{hole=clamp(hole+(pick(g,3)-1),0,5);return hole};
 const row=(r,h)=>{let m=0n;for(let c=0;c<N;c++)if(c!==h)m|=bit(r,c);return m};
 const col=(c,h)=>{let m=0n;for(let r=0;r<N;r++)if(r!==h)m|=bit(r,c);return m};
 if(name==='frontal'||name==='trasera'){
  for(let i=0;i<N;i++)steps.push(row(name==='frontal'?i:N-1-i,safeHole()));
 }else if(name==='lateral'){
  hole=clamp(g.cell.r+pick(g,3)-1,0,5);
  const left=pick(g,2)===0;
  for(let i=0;i<N;i++)steps.push(col(left?i:5-i,safeHole()));
 }else if(name==='doble'){
  for(let i=0;i<3;i++)steps.push(row(i,safeHole())|row(5-i,hole));
 }else if(name==='serpiente'){
  let c=pick(g,4)+1;
  for(let r=0;r<N;r++){c=clamp(c+(pick(g,3)-1),1,4);steps.push(bit(r,c)|bit(r,c-1))}
 }else if(name==='corredor'){
  for(let r=0;r<N;r++)steps.push(row(r,safeHole())| (r>2?bit(r-2,5-hole):0n));
 }else if(name==='inversion'){
  const route=[0,1,2,1,0,1];for(const r of route)steps.push(row(r,safeHole()));
 }else if(name==='falsa'){
  for(let i=0;i<5;i++){let r=pick(g,N),c=pick(g,N);steps.push(i%2===0?0n:bit(r,c)|bit(r,clamp(c+1,0,5)))}
 }else if(name==='caos'){
  for(let i=0;i<N;i++){
   const h=safeHole(),r=i%6;
   let mask=row(r,h);
   if(i>=2&&i%2===0){mask|=bit((r+3)%6,(h+3)%6)|bit((r+4)%6,(h+3)%6)}
   steps.push(mask);
  }
 }
 return steps;
}
function spawn(g){
 const upcoming=g.waves+1,reverse=upcoming%9===0;
 const previousEnd=g.active.reduce((last,w)=>Math.max(last,w.end),0);
 const name=reverse?'inversion':kind(g);
 // El aviso no puede acelerar de golpe al cambiar de fase y superponer peligros.
 const lead=Math.max(g.elapsed<15?3.7:g.elapsed<55?3.5:3.35,previousEnd+.60-g.elapsed);
 const slot=speed(g)*(upcoming%7===0?1.38:1);
 let steps=null,chosen=name;
 for(let k=0;k<26;k++){const p=pattern(g,name);if(ensureRoute(g,p,lead,slot)){steps=p;break}}
 if(!steps){
  // Recurso seguro: jamás publicar una oleada matemáticamente imposible.
  const refugeRow=(g.cell.r+3)%N;
  chosen='serpiente';
  steps=Array.from({length:N},(_,i)=>bit(refugeRow,i));
 }
 const teases=chosen==='falsa'?steps.map((mask,i)=>{
  if(mask!==0n)return mask;
  const r=pick(g,N),c=pick(g,N);return bit(r,c)|bit(r,(c+1)%N);
 }):null;
 const direction=chosen==='frontal'?'⬇ DESDE ARRIBA':chosen==='trasera'?'⬆ DESDE ABAJO':
  chosen==='lateral'?(steps[0]&&Array.from({length:N},(_,r)=>has(steps[0],r,0)).some(Boolean)?'➡ DESDE IZQUIERDA':'⬅ DESDE DERECHA'):
  chosen==='doble'?'↕ DESDE AMBOS EXTREMOS':chosen==='inversion'?'↩ CAMBIA DE DIRECCIÓN':
  chosen==='falsa'?'⚠ PUEDE SER FALSA':chosen==='serpiente'?'〰 ONDA SERPIENTE':
  chosen==='corredor'?'◇ EN FILAS':'⚡ VARIOS FRENTES';
 const w={id:++g.waves,name:chosen,direction,steps,teases,start:g.elapsed+lead,step:slot,
  end:g.elapsed+lead+steps.length*slot,credited:false};
 g.active.push(w);
 // La señal amarilla de la siguiente ola comienza antes de terminar la roja:
 // su impacto nunca se solapa con el anterior (gracia entre .45 y .70 s).
 g.nextAt=w.end-lead+(g.elapsed<35?.70:.45);
 event(g,'wave',chosen.toUpperCase()+' · '+direction);
 if(reverse){g.event='INVERSIÓN';g.eventUntil=g.elapsed+lead+3*slot;event(g,'warning','↩ INVERSIÓN · ¡CAMBIA DE DIRECCIÓN!')}
 if(g.waves%5===0){g.safeZone={r:g.cell.r,c:g.cell.c,until:g.elapsed+lead+3*slot};event(g,'bonus','✦ ZONA SEGURA ACTIVA')}
 if(g.waves===4||g.waves%8===0){
  g.shield=1;g.event='ESCUDO';g.eventUntil=g.elapsed+5;event(g,'bonus','🛡 ESCUDO ACTIVADO');
 }else if(g.waves%7===0){
  g.slowUntil=w.end;g.event='TIEMPO LENTO';g.eventUntil=w.end;event(g,'bonus','⏳ TIEMPO LENTO');
 }else if(g.waves%6===0){g.event='TORMENTA ROJA';g.eventUntil=g.elapsed+4;event(g,'warning','⚠ TORMENTA ROJA')}
}
function cells(g,t=g.elapsed){
 const red=Array(N*N).fill(false),yellow=Array(N*N).fill(false);
 for(const w of g.active){
  for(let j=0;j<w.steps.length;j++){
   const at=w.start+j*w.step;
   const danger=t>=at&&t<at+w.step*.70;
   // Cada casilla se enciende NARANJA tres segundos antes de su propio impacto.
   // No usamos la velocidad de la ola para acortar el margen de reacción.
   const warn=t<at&&t>=at-WARNING_SECONDS;
   if(!danger&&!warn)continue;
   // Las falsas alarmas muestran aviso AMARILLO incluso donde jamás habrá rojo.
   const mask=danger?w.steps[j]:(w.teases?.[j]??w.steps[j]);if(!mask)continue;
   for(let i=0;i<N*N;i++)if(mask&(1n<<BigInt(i))){
    if(danger)red[i]=true;else yellow[i]=true;
   }
  }
 }
 return red.map((r,i)=>g.safeZone&&t<g.safeZone.until&&i===index(g.safeZone.r,g.safeZone.c)?'safe':r?'red':yellow[i]?'yellow':'safe');
}
function radar(g,horizon=4.2){
 // Radar táctico fijo en la pantalla, independiente de la dirección de la cámara.
 // Cada casilla exhibe su propio ETA; no solo las primeras dos filas de la ola.
 const state=cells(g),eta=Array(N*N).fill(null),forecast=Array(N*N).fill(false);
 let nearest=Infinity,selected=null;
 for(const w of g.active)for(let j=0;j<w.steps.length;j++){
  const at=w.start+j*w.step,remaining=at-g.elapsed,mask=w.steps[j];
  if(!mask||remaining < -.001 ||remaining>horizon)continue;
  if(remaining<nearest){nearest=remaining;selected=w}
  for(let i=0;i<N*N;i++)if(mask&(1n<<BigInt(i))){
   if(eta[i]===null||remaining<eta[i])eta[i]=remaining;
   forecast[i]=true;
  }
 }
 const player=index(g.cell.r,g.cell.c);
 return {state,forecast,eta,playerEta:state[player]==='red'?0:eta[player],
  seconds:Number.isFinite(nearest)?Math.max(0,nearest):null,
  direction:selected?.direction||null,name:selected?.name||null};
}
function hit(g){
 const c=g.cell.r*N+g.cell.c;
 if(cells(g)[c]!=='red'||g.invuln>0)return false;
 g.invuln=1.55;
 if(g.shield){g.shield=0;event(g,'shield','🛡 ESCUDO SALVADOR');return false}
 g.lives--;g.hitCount++;g.combo=0;
 event(g,'hit','💥 ¡TE ALCANZÓ LA OLA!');
 if(g.lives<=0)finish(g,'eliminado');
 return true;
}
function finish(g,why){g.stage='finished';g.finishReason=why;event(g,'finish',why)}
function tick(g,dt){
 if(g.paused||g.stage==='finished'||g.stage==='ready')return;
 dt=clamp(Number(dt)||0,0,.08);
 if(g.stage==='countdown'){
  g.countdown=Math.max(0,g.countdown-dt);
  if(g.countdown<=0){g.stage='playing';event(g,'start','¡ESQUIVÁ LAS ROJAS!')}
  return;
 }
 g.elapsed+=dt;
 g.invuln=Math.max(0,g.invuln-dt);
 if(g.elapsed>=g.nextAt)spawn(g);
 hit(g);
 for(const w of g.active){
  if(!w.credited&&g.elapsed>=w.end){w.credited=true;g.dodges++;g.combo++;
   g.score+=45+Math.min(10,g.combo)*10;event(g,'dodge','⚡ ESQUIVASTE '+g.combo+' OLAS')}
 }
 g.active=g.active.filter(w=>g.elapsed<w.end+1.4);
 g.score+=dt*(6+Math.min(6,g.combo));
 if(g.duration!==Infinity&&g.elapsed>=g.duration)finish(g,'victoria');
}
const api=Object.freeze({N,DURATION,WARNING_SECONDS,make,start,tick,cells,radar,setPosition,finish,phases,ensureRoute,pattern,spawn,hit,has,bit,index});
root.OlaRojaCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
