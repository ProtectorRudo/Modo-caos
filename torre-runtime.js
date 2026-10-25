import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.17.3/rapier.es.js';
import {THREE,TorreArt,BLOCK,DEPTH} from './torre-art.js';
const G=window.TorreCore,M=window.TorreModes,D=window.TorreDemolition,$=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), PI=Math.PI;
const ui={home:$('home'),overlay:$('overlay'),notice:$('notice'),hud:$('hud'),tip:$('tip'),stage:$('stage'),hudHeight:$('height'),hudRecord:$('recordHud'),hudPieces:$('pieces'),blockName:$('blockName'),pieceDock:$('pieceDock'),pieceSlots:$('pieceSlots'),packCounter:$('packCounter'),copyReference:$('copyReference'),copyExpand:$('copyExpand'),copyCanvas:$('copyCanvas'),copyProgress:$('copyProgress'),mini:$('mini'),demoRoundHud:$('demolitionRoundHud'),demoRoundLabel:$('demolitionRoundLabel'),demoRoundBar:$('demolitionRoundBar'),roundSummary:$('demolitionRoundSummary'),summaryTitle:$('demolitionSummaryTitle'),summaryPoints:$('demolitionSummaryPoints'),summaryDetail:$('demolitionSummaryDetail'),results:$('results'),status:$('status'),xrScene:$('xrScene'),xrDraw:$('xrDraw'),xrPaint:$('xrPaint'),xrState:$('xrState'),arControls:$('arControls'),gesture:$('gesture'),replay:$('replay'),setup:$('setup')};
let art=null,world=null,queue=null,states=[],active=null,random=G.rng(2026),nextId=1,settleTime=0,stillTime=0,lastTop=0,top=0,hi=0,steps=0,acc=0,lastTime=0,mode='demo',phase='home',paused=false,trackSource=null,ref=null,session=null,latestHit=null,hitSeen=0,anchor=null,fixedPose=null,rawPose=null,shift={x:0,z:0},yaw=0,scale=1,drag=null,pinch=null,frames=[],replayTime=0,replayStartAt=0,replayFrames=[],replaying=false,record=0,sound=true,haptic=true,audio=null,noticeTimer=0,miniTimer=0,lastHit=null,lastSound=0,editing=false,resumePhase='playing',packRound=0,stock=[],selectedIndex=-1,trayTouch=null,twist=null,modeId='infinite',targetIndex=0,currentTarget=M.TARGET,copyMatched=0,clockRemaining=0,baseHalf=1.25,baseBody=null,baseCollider=null,tiltBody=null,tiltFailSeconds=0,removals=0,demolitionStart=[],demolitionRemoved=[],demolitionMarks=0,demolitionPoints=0,demolitionPlan=[],demolitionRound=0,demolitionBank=0,demolitionBankFallen=0,demolitionRoundPoints=0,demolitionRoundFallen=0,demolitionIntermission=0,demolitionRoundHistory=[],demolitionTouch=null,demolitionHighlight=null,xrDemolitionFaces=[],modeOutcome='',stableBodies=[],collapseSeconds=0,collapseReason=null,startingRecord=0;
try{record=Number(localStorage.getItem('mc_torre_record')||0)||0}catch(_){}
$('introRecord').textContent='RÉCORD: '+record+' CM';
function selectGameMode(id){
 if(!M.MODES[id])return;
 modeId=id;
 const modeConfig=M.get(modeId);
 document.body.dataset.torremode=modeId;
 $('modeDescription').textContent=modeConfig.description;
 $('modeDeck').querySelectorAll('button').forEach(btn=>{
  const selected=btn.dataset.mode===modeId;
  btn.classList.toggle('chosen',selected);btn.setAttribute('aria-pressed',String(selected));
 });
 $('introRecord').textContent=modeId==='infinite'?'RÉCORD: '+record+' CM':'DESAFÍO: '+modeConfig.short.toUpperCase();
}
(function modeMenu(){
 const deck=$('modeDeck');
 for(const id of M.MODE_ORDER){
  const cfg=M.get(id),btn=document.createElement('button');
  btn.type='button';btn.className='modeChoice';btn.dataset.mode=id;
  btn.innerHTML='<span>'+cfg.icon+' '+cfg.name+'</span><small>'+cfg.short+'</small>';
  btn.addEventListener('click',()=>selectGameMode(id));
  deck.appendChild(btn);
 }
 const requested=new URLSearchParams(location.search).get('modo');
 selectGameMode(requested&&M.MODES[requested]?requested:'infinite');
})();

/** Independent reference image. No target geometry enters the AR world.
 * Draw a crisp illustration from the SAME physical polygons as the game.
 * Canvas is not the construction surface, and never accepts input.
 */
function drawCopyBlueprint(){
 const canvas=ui.copyCanvas,ctx=canvas.getContext('2d');
 if(!ctx||!currentTarget?.length)return;
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,w,h);
 bg.addColorStop(0,'#163750');bg.addColorStop(1,'#0a182c');
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#7bc4ce15';ctx.lineWidth=1;
 for(let x=12;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
 for(let y=14;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
 const figures=currentTarget.map(t=>{
  const shape=G.SHAPES.find(s=>s.id===t.shape);
  return {t,shape,parts:shape.parts.map(poly=>G.rotated(poly,t.angle).map(([u,v])=>[t.x+u*BLOCK,t.y+v*BLOCK]))};
 });
 const points=figures.flatMap(f=>f.parts.flatMap(p=>p));
 const lo=Math.min(...points.map(p=>p[0])),hi=Math.max(...points.map(p=>p[0]));
 const ymax=Math.max(...points.map(p=>p[1])),ymin=.14;
 const scaleX=(w-65)/Math.max(.38,hi-lo);
 const scaleY=(h-65)/Math.max(.44,ymax-ymin);
 const sc=Math.min(scaleX,scaleY,240);
 const offset=(hi+lo)*.5;
 const X=x=>w*.5+(x-offset)*sc;
 const Y=y=>h-40-(y-ymin)*sc;
 const bottom=Y(.14);
 ctx.fillStyle='#234b62';ctx.fillRect(16,bottom+3,w-32,12);
 ctx.strokeStyle='#7bffe3';ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(19,bottom+2);ctx.lineTo(w-19,bottom+2);ctx.stroke();
 const colors=['#35e5cf','#ffbf67','#81a1ff','#ff829c','#b78aff','#ff996e','#bce981'];
 for(const f of figures){
  const color=colors[f.shape.tone%colors.length];
  for(const poly of f.parts){
   const path=()=>{ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));ctx.closePath()};
   ctx.save();ctx.translate(5,5);path();ctx.fillStyle='#051728';ctx.globalAlpha=.65;ctx.fill();ctx.restore();
   path();ctx.fillStyle=color;ctx.fill();
   path();ctx.strokeStyle='#f0fffe';ctx.lineWidth=3;ctx.stroke();
   ctx.save();ctx.clip();
   const glow=ctx.createLinearGradient(0,0,w,h);
   glow.addColorStop(0,'#ffffff75');glow.addColorStop(1,'#ffffff00');
   ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);ctx.restore();
  }
 }
 ctx.fillStyle='#a2d7df';ctx.font='bold 15px system-ui';
 ctx.textAlign='center';ctx.fillText('MODELO DE REFERENCIA',w/2,22);
 $('copyTitle').textContent=M.TARGET_NAMES[targetIndex];
 $('copyProgress').textContent='0/'+currentTarget.length;
 ui.copyReference.dataset.perfect='false';
}
function setCopyReferenceExpanded(expanded){
 if(modeId!=='copy')expanded=false;
 const next=Boolean(expanded);
 ui.copyReference.dataset.expanded=String(next);
 ui.copyExpand.setAttribute('aria-expanded',String(next));
 ui.copyExpand.setAttribute('aria-label',next?'Reducir imagen de referencia':'Ampliar imagen de referencia');
 ui.copyExpand.title=next?'Reducir figura':'Ampliar figura';
 ui.copyExpand.textContent=next?'−':'⤢';
}
ui.copyExpand.addEventListener('click',e=>{
 e.preventDefault();
 e.stopPropagation();
 if(modeId!=='copy'||ui.copyReference.hidden)return;
 setCopyReferenceExpanded(ui.copyReference.dataset.expanded!=='true');
});
// Tapping anywhere on the small illustration opens the larger reference too.
ui.copyReference.addEventListener('click',e=>{
 if(e.target===ui.copyExpand)return;
 if(modeId!=='copy'||ui.copyReference.hidden)return;
 setCopyReferenceExpanded(ui.copyReference.dataset.expanded!=='true');
});
function modeHUD(){
 const cfg=M.get(modeId);let message=cfg.icon+' '+cfg.name.toUpperCase();
 if(cfg.seconds)message+=' · '+Math.ceil(Math.max(0,clockRemaining))+'s';
 if(modeId==='balance')message+=' · BASE '+Math.round(baseHalf*200)+' CM';
 if(modeId==='heavy')message+=' · INCLINACIÓN '+Math.round(Math.abs(tiltBody?2*Math.atan2(tiltBody.rotation().z,tiltBody.rotation().w):0)*180/Math.PI)+'°';
 if(modeId==='copy')message+=' · '+M.TARGET_NAMES[targetIndex]+' · '+copyMatched+'/3';
 if(modeId==='copy'){ui.copyProgress.textContent=copyMatched+'/'+currentTarget.length;ui.copyReference.dataset.perfect=String(copyMatched===currentTarget.length)}
 if(modeId==='five')message+=' · '+Math.max(0,5-states.length)+' RESTANTES';
 if(modeId==='demolition'){
  const f=demolitionPlan[demolitionRound];
  message+=' · RONDA '+(demolitionRound+1)+'/'+D.ROUNDS+' · '+(3-removals)+' TOQUES · '+demolitionPoints+' PTS';
  ui.demoRoundLabel.textContent=(phase==='intermission'?'✅ ':'💥 ')+(f?f.title.toUpperCase():'¡DEMOLICIÓN!')+' · '+(demolitionRound+1)+'/'+D.ROUNDS;
  ui.demoRoundBar.value=Math.min(D.ROUNDS,demolitionRoundHistory.length);
 }
 $('modeStatus').textContent=message;
 $('modeStatus').classList.toggle('warning',(cfg.seconds&&clockRemaining<12)||(modeId==='heavy'&&Math.abs(tiltBody?2*Math.atan2(tiltBody.rotation().z,tiltBody.rotation().w):0)>.27));
}
function readSnapshot(){
 return states.map(s=>{const p=s.body.translation(),q=s.body.rotation();return {id:s.id,shape:s.shape.id,x:p.x,y:p.y,angle:2*Math.atan2(q.z,q.w)}})
}
function showText(text,t=2500){ui.notice.textContent=text;ui.notice.style.opacity='1';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.notice.style.opacity='0',t)}
function phaseTo(p){phase=p;ui.stage.dataset.phase=p;ui.overlay.dataset.mode=modeId;ui.copyReference.hidden=modeId!=='copy'||(p!=='playing'&&p!=='settling');ui.demoRoundHud.hidden=modeId!=='demolition'||p==='home'||p==='placing';ui.roundSummary.hidden=modeId!=='demolition'||p!=='intermission';ui.hud.hidden=!(p==='playing'||p==='settling'||p==='intermission'||p==='replay'||p==='finished'||p==='paused');ui.arControls.hidden=!(p==='placing');ui.results.hidden=p!=='finished';ui.replay.hidden=p!=='replay';ui.setup.hidden=true;ui.xrState.hidden=p!=='placing';ui.xrScene.hidden=mode!=='ar'||p==='home';ui.xrDraw.hidden=ui.xrScene.hidden;ui.xrPaint.hidden=ui.xrScene.hidden;ui.mini.hidden=p==='placing'||p==='home'||modeId==='copy'||modeId==='demolition';$('miniBtn').hidden=ui.mini.hidden;ui.blockName.hidden=p!=='playing'||modeId==='demolition'||(modeId==='copy'&&!active);ui.tip.hidden=p!=='playing';ui.tip.textContent=modeId==='demolition'?'👆 TOCÁ UN BLOQUE PARA SACARLO':'TOCÁ = 90° · DOS DEDOS = GIRAR LIBRE · ARRASTRÁ Y SOLTÁ';ui.pieceDock.hidden=modeId==='demolition'||!(p==='playing'||p==='settling');$('modeStatus').hidden=p==='home'||p==='placing';ui.gesture.style.pointerEvents=(p==='placing'||p==='playing')?'auto':'none';}
function updateHUD(){
 $('hudHeightLabel').textContent=modeId==='demolition'?'PUNTOS':'ALTURA';$('heightUnit').textContent=modeId==='demolition'?'PTS':'CM';$('recordUnit').textContent=modeId==='demolition'?'PTS':'CM';
 ui.hudHeight.textContent=modeId==='demolition'?demolitionPoints.toString():G.score(phase==='settling'?lastTop:top).toString();
 ui.hudPieces.textContent=states.length.toString();
 ui.hudRecord.textContent=modeId==='infinite'?Math.max(record,G.score(top)).toString():modeBest().toString();
 modeHUD();
}
function createPlatform(width=1.25){
 if(baseCollider)world.removeCollider(baseCollider,true);
 baseHalf=width;
 baseCollider=world.createCollider(RAPIER.ColliderDesc.cuboid(width,.079,.36).setFriction(.98).setRestitution(.035),baseBody);
 art.setBoardHalf(width);
}
function startPhysics(){
 if(world){world.free();world=null}
 if(queue){queue.free();queue=null}
 world=new RAPIER.World({x:0,y:-9.81,z:0});
 world.timestep=1/60;
 world.integrationParameters.maxVelocityIterations=8;
 world.integrationParameters.maxPositionIterations=3;
 queue=new RAPIER.EventQueue(true);
 states=[];nextId=1;packRound=0;stock=[];selectedIndex=-1;trayTouch=null;twist=null;
 playPointers.clear();stableBodies=[];collapseSeconds=0;collapseReason=null;
 random=G.rng((Date.now()>>>0)^0x524f334);
 settleTime=0;stillTime=0;lastTop=0;top=0;hi=0;steps=0;acc=0;frames=[];replaying=false;
 clockRemaining=M.get(modeId).seconds;tiltFailSeconds=0;removals=0;demolitionStart=[];demolitionRemoved=[];demolitionMarks=0;demolitionPoints=0;demolitionPlan=[];demolitionRound=0;demolitionBank=0;demolitionBankFallen=0;demolitionRoundPoints=0;demolitionRoundFallen=0;demolitionIntermission=0;demolitionRoundHistory=[];modeOutcome='';
 baseCollider=null;tiltBody=null;
 art.reset();art.setDemolitionStyle(modeId==='demolition');demolitionTouch=null;demolitionHighlight=null;xrDemolitionFaces=[];
 if(modeId==='heavy'){
  // Rigid beam constrained to rotate around Z, with gravity, impacts and a
  // weak real spring torque in physicsStep. This is not a scripted tilt effect.
  tiltBody=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,.039,0).setAngularDamping(1.15));
  tiltBody.setEnabledTranslations(false,false,false,true);
  tiltBody.setEnabledRotations(false,false,true,true);
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.18,.079,.36).setDensity(8).setFriction(.91).setRestitution(.01),tiltBody);
  baseHalf=1.18;art.setBoardHalf(baseHalf);
 }else{
  baseBody=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,.039,0));
  createPlatform(M.boardHalfWidth(modeId,0));
 }
 if(modeId==='copy'){
  const requested=Number(new URLSearchParams(location.search).get('figura'));
  const valid=new URLSearchParams(location.search).has('figura')&&Number.isInteger(requested)&&requested>=0&&requested<M.TARGETS.length;
  targetIndex=valid?requested:Math.floor(Math.random()*M.TARGETS.length);
  currentTarget=M.TARGETS[targetIndex];copyMatched=0;art.setTarget([],[]);drawCopyBlueprint();
 }
 $('pieceDock').dataset.demolition=String(modeId==='demolition');
 $('pieceDock').dataset.five=String(modeId==='five');
 $('mini').dataset.copy=String(modeId==='copy');
 updateHUD();modeHUD();
}
function updateLanding(){
 if(!active||!world)return;
 const ray=new RAPIER.Ray({x:active.x,y:Math.max(active.y+.35,top+1),z:0},{x:0,y:-1,z:0});
 const hit=world.castRay(ray,50,true);
 art.setGhostLanding(active.x,hit?ray.origin.y-hit.timeOfImpact:.14);
}

const PIECE_COLORS=['#35e5cf','#ffbf67','#81a1ff','#ff829c','#b78aff','#ff996e','#bce981'];
function pieceIcon(shape){
 const col=PIECE_COLORS[shape.tone%PIECE_COLORS.length];
 const parts=shape.parts.map(p=>'<polygon points="'+p.map(([x,y])=>(50+x*34).toFixed(1)+','+(29-y*26).toFixed(1)).join(' ')+'" fill="'+col+'" stroke="#eefffd" stroke-width="2.3" stroke-linejoin="round"/>').join('');
 return '<svg viewBox="0 0 100 58" aria-hidden="true">'+parts+'</svg>';
}
function renderDemolitionDock(){
 // No inventory in this mode. The assembled physical tower IS the control.
 // Keep the dock empty for accessibility and block accidental button taps.
 ui.pieceSlots.replaceChildren();
}
function renderPack(){
 if(!ui.pieceSlots)return;
 if(modeId==='demolition'){renderDemolitionDock();return}
 ui.packCounter.textContent=stock.filter(s=>!s.used).length+(modeId==='copy'?' PARA ELEGIR':' DISPONIBLES');
 // Keep elements stable during pointer capture; rebuilding the tray breaks drag.
 while(ui.pieceSlots.children.length>stock.length)ui.pieceSlots.lastElementChild.remove();
 while(ui.pieceSlots.children.length<stock.length){
  const i=ui.pieceSlots.children.length,btn=document.createElement('button');
  btn.type='button';btn.className='piecePick';btn.setAttribute('data-index',String(i));
  btn.addEventListener('click',()=>{if(!stock[i]?.used&&phase==='playing'&&selectedIndex!==i)choosePiece(i)});
  btn.addEventListener('pointerdown',e=>startTrayGrab(e,i,btn));
  btn.addEventListener('pointermove',moveTrayGrab);
  btn.addEventListener('pointerup',endTrayGrab);
  btn.addEventListener('pointercancel',()=>{trayTouch=null});
  ui.pieceSlots.appendChild(btn);
 }
 stock.forEach((item,i)=>{
  const btn=ui.pieceSlots.children[i];
  btn.className='piecePick'+(item.used?' used':'')+(selectedIndex===i&&!item.used?' selected':'');
  btn.setAttribute('aria-label',(item.used?'Ya utilizada: ':'Elegir ')+item.shape.name);
  btn.setAttribute('aria-pressed',String(selectedIndex===i&&!item.used));
  btn.disabled=item.used;
  const newMarkup=pieceIcon(item.shape)+'<span>'+item.shape.name+'</span>';
  if(btn.innerHTML!==newMarkup)btn.innerHTML=newMarkup;
 });
}
function nextPack(){
 if(modeId==='copy'){
  stock=currentTarget.map(t=>({shape:G.SHAPES.find(s=>s.id===t.shape),used:false}));
 }else if(modeId==='five'){
  // Exactly five known pieces, not an endless replenishing random shelf.
  stock=[G.SHAPES[0],G.SHAPES[1],G.SHAPES[2],G.SHAPES[5],G.SHAPES[6]].map(shape=>({shape,used:false}));
 }else{
  stock=G.makePack(packRound++,random).map(shape=>({shape,used:false}));
 }
 selectedIndex=-1;
 if(packRound>1)showText('¡NUEVAS PIEZAS PARA ELEGIR!',1050);
}
function choosePiece(i){
 if(phase!=='playing'||!stock[i]||stock[i].used||!art)return;
 selectedIndex=i;
 const shape=stock[i].shape;
 active={shape,x:0,y:Math.max(.92,top+.52),angle:0};
 art.setActive(shape);art.moveActive(active.x,active.y,active.angle);updateLanding();
 ui.blockName.textContent=shape.name.toUpperCase();if(modeId==='copy')ui.blockName.hidden=false;
 renderPack();
 soundFX(560,.045,.05);vibe(5);
}
function makeActive(){
 if(modeId==='demolition')return;
 if(states.length>=M.get(modeId).limit){challengeCompleted('limit');return}
 if(!stock.length||stock.every(s=>s.used)){
  if((modeId==='copy'||modeId==='five')&&stock.length){challengeCompleted('limit');return}
  nextPack();
 }
 selectedIndex=-1;active=null;
 phaseTo('playing');
 if(modeId==='copy'){
  renderPack();
  ui.blockName.hidden=true;
  if(states.length===0)showText('MIRÁ LA IMAGEN · ELEGÍ UNA PIEZA PARA COPIARLA',3500);
  else showText('ELEGÍ QUÉ PIEZA COLOCAR AHORA',1200);
 }else{
  choosePiece(stock.findIndex(s=>!s.used));
  if(states.length===0)showText('ELEGÍ UNA PIEZA · GIRÁ CON DOS DEDOS · ARRASTRÁ Y SOLTÁ',3800);
 }
 updateHUD();
}
function startTrayGrab(e,i,btn){
 if(modeId==='copy')setCopyReferenceExpanded(false);
 if(modeId==='demolition'||phase!=='playing'||stock[i]?.used)return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();
 choosePiece(i);
 btn.setPointerCapture(e.pointerId);
 trayTouch={id:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
}
function moveTrayGrab(e){
 if(!trayTouch||e.pointerId!==trayTouch.id||!active)return;
 e.preventDefault();
 const boardTop=ui.pieceDock.getBoundingClientRect().top;
 if(e.clientY<boardTop-18){
  trayTouch.moved=true;
  active.x=clamp((e.clientX/Math.max(1,innerWidth)-.5)*2.5,-1.08,1.08);
  art.moveActive(active.x,active.y,active.angle);updateLanding();
 }
}
function endTrayGrab(e){
 if(!trayTouch||e.pointerId!==trayTouch.id)return;
 const wasDragged=trayTouch.moved&&e.clientY<ui.pieceDock.getBoundingClientRect().top-18;
 trayTouch=null;
 if(wasDragged)drop();
}
function spawnBlock(shape,x,y,angle=0){
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,0).setLinearDamping(.075).setAngularDamping(.11).setCcdEnabled(true));
 body.setEnabledTranslations(true,true,false,true);
 body.setEnabledRotations(false,false,true,true);
 body.setRotation({x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)},true);
 let attached=0;
 for(const poly of shape.parts){
  const vertices=[];
  for(const z of [-DEPTH*.5,DEPTH*.5])for(const [xx,yy] of poly)vertices.push(xx*BLOCK,yy*BLOCK,z);
  const col=RAPIER.ColliderDesc.convexHull(new Float32Array(vertices));
  if(!col)continue;
  col.setDensity(3.5*shape.weight).setFriction(.89).setRestitution(.048).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  world.createCollider(col,body);attached++;
 }
 if(!attached){world.removeRigidBody(body);return null}
 const id=nextId++;const item={id,shape,body};
 states.push(item);art.startBlock(id,shape);
 return item;
}
function createDemolitionTower(){
 demolitionPlan=D.plan(random);
 demolitionRound=0;demolitionBank=0;demolitionBankFallen=0;demolitionRoundHistory=[];
 buildDemolitionRound();
}
function buildDemolitionRound(){
 const figure=demolitionPlan[demolitionRound];
 if(!figure){challengeCompleted('all-rounds');return}
 // Keep this same physics world, platform, real-world AR anchor, scale,
 // and camera pose. Only the old loose pieces are replaced.
 for(const s of states){world.removeRigidBody(s.body);art.removeBlock(s.id)}
 states=[];nextId=1;demolitionStart=[];demolitionRemoved=[];removals=0;
 demolitionRoundPoints=0;demolitionRoundFallen=0;demolitionTouch=null;demolitionHighlight=null;xrDemolitionFaces=[];
 settleTime=0;stillTime=0;collapseSeconds=0;top=0;lastTop=0;hi=0;clockRemaining=D.ROUND_SECONDS;
 art.clearBlockHighlight();
 for(const placement of figure.blocks){
  const shape=G.SHAPES.find(s=>s.id===placement.shape)||D.DEMOLITION_SHAPES.find(s=>s.id===placement.shape);
  if(shape)spawnBlock(shape,placement.x,placement.y,placement.angle);
 }
 // Settle the exact rigid bodies BEFORE recording the scoring baseline.
 for(let i=0;i<245;i++)world.step();
 readStates();lastTop=top;hi=top;
 demolitionStart=readSnapshot();
 phaseTo('playing');renderPack();updateHUD();
 showText('💥 RONDA '+(demolitionRound+1)+'/'+D.ROUNDS+' · '+figure.title.toUpperCase(),2400);
 soundFX(530+demolitionRound*36,.10,.085,'triangle');vibe(12);
}
function finishDemolitionRound(reason='moves'){
 if(modeId!=='demolition'||phase==='finished'||phase==='intermission')return;
 scoreDemolition();
 const bonus=D.timeBonus(clockRemaining,removals);
 const gain=demolitionRoundPoints+bonus;
 const finishedRound=demolitionRound;
 demolitionBank+=gain;demolitionBankFallen+=demolitionRoundFallen;
 demolitionRoundHistory.push({id:demolitionPlan[demolitionRound].id,points:gain,fallen:demolitionRoundFallen,removals,bonus});
 demolitionPoints=demolitionBank;
 const completed=demolitionRound+1;
 if(completed>=D.ROUNDS){
  updateHUD();
  challengeCompleted('all-rounds');
  $('resultNote').textContent+=' · ÚLTIMA RONDA +'+gain+' PTS';
  return;
 }
 demolitionRound++;demolitionIntermission=0;
 ui.summaryTitle.textContent='✅ FIGURA '+completed+'/'+D.ROUNDS+' · '+demolitionPlan[finishedRound].title.toUpperCase();
 ui.summaryPoints.textContent='+'+gain+' PTS';
 ui.summaryDetail.textContent='🧱 '+demolitionRoundFallen+' DERRUMBADOS · '+removals+' EXTRACCIONES'+(bonus?' · BONUS +'+bonus:'');
 clearTimeout(noticeTimer);ui.notice.style.opacity='0';
 phaseTo('intermission');updateHUD();modeHUD();
 soundFX(750,.14,.08,'sine');vibe(15);
}
function removeDemolitionBlock(id){
 if(modeId!=='demolition'||phase!=='playing'||removals>=3||!states.some(s=>s.id===id))return false;
 art.highlightBlock(id);
 const ix=states.findIndex(s=>s.id===id);
 if(ix<0)return;
 const piece=states[ix];const prior=piece.body.translation();art.impact(prior.x,prior.y,5);world.removeRigidBody(piece.body);
 art.removeBlock(id);states.splice(ix,1);
 demolitionRemoved.push(id);removals++;
 settleTime=0;stillTime=0;collapseSeconds=0;
 // First and second removals NEVER lock touch input. The tower keeps falling
 // under Rapier while the player decides which moving support to extract next.
 // Only the third extraction enters a short final settling window.
 if(removals>=3)phaseTo('settling');
 renderPack();modeHUD();
 demolitionHighlight=null;demolitionTouch=null;
 xrDemolitionFaces=xrDemolitionFaces.filter(face=>face.id!==id);
 soundFX(255,.16,.14,'triangle');vibe(26);
 showText(removals>=3?'💥 ¡ÚLTIMA EXTRACCIÓN!':'🧱 ¡EXTRAÍDO! · '+(3-removals)+' TOQUES MÁS',550);
 return true;
}
function scoreDemolition(){
 const score=M.demolitionScore(demolitionStart,readSnapshot(),demolitionRemoved);
 demolitionRoundFallen=Math.max(demolitionRoundFallen,score.fallen);
 demolitionRoundPoints=Math.max(demolitionRoundPoints,D.roundPoints(score.fallen,demolitionRemoved.length));
 demolitionMarks=demolitionBankFallen+demolitionRoundFallen;
 demolitionPoints=demolitionBank+demolitionRoundPoints;
 modeHUD();
}
function drop(){
 if(phase!=='playing'||!active||!world||modeId==='demolition')return;
 let {shape,x,y,angle}=active;
 const item=spawnBlock(shape,x,y,angle);
 if(!item){showText('No se pudo cargar esa figura');return}
 if(stock[selectedIndex])stock[selectedIndex].used=true;
 art.releaseActive();renderPack();
 active=null;lastTop=top;settleTime=0;stillTime=0;collapseSeconds=0;collapseReason=null;frames=[];
 phaseTo('settling');showText('EQUILIBRANDO...',700);
 soundFX(370,.04,.11,'triangle');vibe(9);
}
function soundFX(freq,duration,amp=.11,type='sine'){
 if(!sound)return;
 try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
  const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(48,freq*.56),t+duration);
  v.gain.setValueAtTime(Math.min(.18,amp),t);v.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(v).connect(audio.destination);o.start(t);o.stop(t+duration+.01)}catch(_){}
}
function vibe(ms){try{if(haptic)navigator.vibrate?.(ms)}catch(_){}}
function collisionAudio(){
 const now=performance.now();
 queue.drainCollisionEvents((h1,h2,started)=>{
  if(!started||now-lastSound<95)return;
  const a=world.getCollider(h1)?.parent?.(),b=world.getCollider(h2)?.parent?.();
  const moving=[a,b].filter(Boolean).map(x=>{const v=x.linvel();return Math.hypot(v.x,v.y,v.z)});const impact=Math.max(...moving,0);
  if(impact<.18)return;lastSound=now;
  soundFX(80+Math.min(380,impact*90),.075+Math.min(.12,impact*.022),.055+Math.min(.12,impact*.022),'triangle');
  if(impact>.9)vibe(Math.round(Math.min(28,impact*6)));
  const s=states.find(s=>s.body.handle===(a?.handle??-1))||states.at(-1);
  if(s){const p=s.body.translation();art.impact(p.x,p.y,impact)}
 });
}
function readStates(){
 let max=.14;const pieces=[];
 for(const s of states){
  const b=s.body,p=b.translation(),q=b.rotation(),angle=2*Math.atan2(q.z,q.w);
  const bounds=G.bounds(s.shape,angle);const pieceTop=p.y+bounds.maxY*BLOCK;
  max=Math.max(max,pieceTop);
  art.sync(s.id,p.x,p.y,angle);pieces.push({id:s.id,x:p.x,y:p.y,top:pieceTop,minY:p.y+bounds.minY*BLOCK,angle});
 }
 top=Math.max(0,max-.14);
 return pieces;
}
function saveRecord(){
 if(modeId!=='infinite')return;
 const points=G.score(top);if(points>record){record=points;try{localStorage.setItem('mc_torre_record',String(record))}catch(_){}}
}
function modeBest(){
 if(modeId==='infinite')return record;
 try{return Number(localStorage.getItem('mc_torre_best_'+modeId))||0}catch(_){return 0}
}
function saveModeBest(points){
 if(modeId==='infinite'){saveRecord();return}
 try{if(points>modeBest())localStorage.setItem('mc_torre_best_'+modeId,String(points))}catch(_){}
}
function settleAccepted(pieces){
 const previousStableHeight=lastTop;
 lastTop=top;
 stableBodies=pieces.map(p=>({id:p.id,x:p.x,y:p.y,angle:p.angle}));
 hi=Math.max(hi,top);
 saveRecord();updateHUD();
 if(modeId==='balance'&&states.length%2===0){
  const half=M.boardHalfWidth('balance',states.length);
  if(half<baseHalf-.001){createPlatform(half);showText('⚠️ ¡LA BASE SE ESTRECHA!',1400);vibe(16)}
 }
 if(modeId==='copy'){
  const outcome=M.matchTarget(readSnapshot(),currentTarget);
  const wasMatched=copyMatched;copyMatched=outcome.matched;modeHUD();
  if(copyMatched>wasMatched){soundFX(830,.14,.075,'sine');vibe(10);showText('✓ ¡COINCIDE! '+copyMatched+'/3 PIEZAS',1400)}
  else if(states.length<3){showText('COMPARÁ TU CONSTRUCCIÓN CON LA IMAGEN',1350)}
  if(outcome.won){challengeCompleted('objective');return}
  if(states.length>=3){challengeCompleted('limit');return}
 }
 if(modeId==='five'&&states.length>=5){challengeCompleted('limit');return}
 if(clockRemaining<=0&&M.get(modeId).seconds){challengeCompleted('time');return}
 if(G.score(top)>=100&&Math.floor(G.score(top)/100)>Math.floor(G.score(previousStableHeight)/100)){
  soundFX(860,.25,.1);showText('¡'+G.score(top)+' CM!',1100);
 }
 makeActive();
}
function physicsStep(){
 if(!world||paused||replaying)return;
 if(modeId==='heavy'&&tiltBody){
  const angle=2*Math.atan2(tiltBody.rotation().z,tiltBody.rotation().w);
  const velocity=tiltBody.angvel().z;
  tiltBody.addTorque({x:0,y:0,z:-4.5*angle-1.6*velocity},true);
 }
 world.step(queue);steps++;collisionAudio();
 if(tiltBody){
  // Realistic safety stops: a seesaw pivots but cannot roll through 360°.
  // Damping kinetic energy at the end-stop models impact on a fixed support.
  const current=2*Math.atan2(tiltBody.rotation().z,tiltBody.rotation().w);
  const maxTilt=.45;
  if(Math.abs(current)>maxTilt){
   const stop=Math.sign(current)*maxTilt;
   tiltBody.setRotation({x:0,y:0,z:Math.sin(stop/2),w:Math.cos(stop/2)},true);
   const ang=tiltBody.angvel().z;
   if(Math.sign(ang)===Math.sign(current))tiltBody.setAngvel({x:0,y:0,z:0},true);
  }

  const a=2*Math.atan2(tiltBody.rotation().z,tiltBody.rotation().w);
  art.setTilt(a);
  if((phase==='playing'||phase==='settling')&&Math.abs(a)>.38){tiltFailSeconds+=1/60}
  else tiltFailSeconds=Math.max(0,tiltFailSeconds-2/60);
  if(tiltFailSeconds>.7){fail('balanza_volcada');return}
 }
 const pieces=readStates();
 if(modeId==='demolition'){
  if(phase==='settling'){
   settleTime+=1/60;
   const moving=states.some(s=>{const v=s.body.linvel(),a=s.body.angvel();return Math.hypot(v.x,v.y)>.16||Math.abs(a.z)>.28});
   stillTime=moving?0:stillTime+1/60;
   // Give a short moment for the last cascade to be scored, never several
   // seconds of blocking between the first two taps.
   if(settleTime>.75&&(stillTime>.3||settleTime>3.0)){
    finishDemolitionRound(removals>=3?'moves':'time');return;
   }
  }
  if(steps%6===0){
   if(removals>0)scoreDemolition();
   updateHUD();
  }
  return;
 }
 if((phase==='playing'||phase==='settling')&&pieces.length){
  frames.push(pieces.map(p=>({id:p.id,x:p.x,y:p.y,angle:p.angle})));
  if(frames.length>210)frames.shift();
  const latest=states.at(-1);
  if(phase==='settling')settleTime+=1/60;
  const reading=G.diagnoseCollapse(pieces,lastTop,latest.id,stableBodies);
  const outsideBalance=modeId==='balance'&&pieces.some(p=>Math.abs(p.x)>baseHalf+.36);
  if((reading.failed||outsideBalance)&&(phase==='playing'||settleTime>.8)){
   collapseReason=outsideBalance?'base_perdida':reading.reason;
   collapseSeconds+=1/60;
  }else{
   collapseSeconds=Math.max(0,collapseSeconds-2/60);
   if(!collapseSeconds)collapseReason=null;
  }
  if(collapseSeconds>.7){fail(collapseReason);return}
  if(phase==='settling'){
   const moving=states.some(s=>{const v=s.body.linvel(),a=s.body.angvel();return Math.hypot(v.x,v.y)>.24||Math.abs(a.z)>.45});
   stillTime=moving?0:stillTime+1/60;
   if(settleTime>1.2&&(stillTime>.55||settleTime>5.5)){
    if(reading.failed||collapseSeconds>.07||outsideBalance){
     if(settleTime>9){fail(collapseReason||reading.reason||'estructura_inestable')}
     return;
    }
    settleAccepted(pieces);
   }
  }
 }
 if(steps%6===0)updateHUD();
}
function challengeCompleted(reason='time'){
 if(phase==='finished'||phase==='replay')return;
 if(modeId==='demolition'){
  const metric=demolitionBank;
  const prior=modeBest();saveModeBest(metric);
  phaseTo('finished');
  $('resultTitle').textContent='🏆 ¡DEMOLICIÓN TOTAL!';
  $('resultNote').textContent=D.ROUNDS+' TORRES · '+demolitionBankFallen+' BLOQUES DERRIBADOS'+(metric>prior?' · ¡NUEVO RÉCORD!':'');
  $('finalHeight').textContent=metric+' pts';
  $('resultMetric').textContent='PUNTOS EN '+D.ROUNDS+' RONDAS';
  $('finalPieces').textContent=demolitionRoundHistory.reduce((n,r)=>n+r.removals,0);$('resultPiecesLabel').textContent='EXTRACCIONES';
  $('finalRecord').textContent=modeBest()+' pts';
  soundFX(880,.28,.12,'triangle');vibe(34);
  return;
 }
 const cfg=M.get(modeId);
 if(modeId==='infinite'){finish('¡TORRE LEGENDARIA!');return}
 if(active){art.releaseActive();active=null}
 const metric=modeId==='demolition'?demolitionPoints:modeId==='copy'?M.matchTarget(readSnapshot(),currentTarget).matched:G.score(hi);
 const result=M.outcome(modeId,{height:hi,placed:states.length,timeLeft:clockRemaining,matched:modeId==='copy'?metric:0,fallen:demolitionMarks,tilt:tiltBody?Math.abs(2*Math.atan2(tiltBody.rotation().z,tiltBody.rotation().w)):0});
 const prior=modeBest();saveModeBest(metric);
 phaseTo('finished');
 $('resultTitle').textContent=result.title;
 $('resultNote').textContent=result.detail+(metric>prior?' · 🏆 ¡NUEVO RÉCORD!':'');
 $('finalHeight').textContent=modeId==='demolition'?metric+' pts':modeId==='copy'?metric+'/3':metric+' cm';
 $('resultPiecesLabel').textContent='PIEZAS';
 $('resultMetric').textContent=modeId==='demolition'?'PUNTOS DE DEMOLICIÓN':modeId==='copy'?'PIEZAS EN SU SILUETA':'ALTURA ESTABLE';
 $('finalPieces').textContent=modeId==='demolition'?removals:states.length;
 $('finalRecord').textContent=modeBest()+(modeId==='demolition'?' pts':modeId==='copy'?'/3':' cm');
 soundFX(result.won?760:230,.19,.1);vibe(result.won?20:9);
}
function fail(reason='torre_derrumbada'){
 if(phase!=='playing'&&phase!=='settling')return;
 collapseReason=reason;
 top=lastTop;saveRecord();
 active=null;art.releaseActive();
 phaseTo('replay');replayFrames=frames.slice(-110);
 replayTime=0;replayStartAt=performance.now();replaying=true;
 showText(reason==='balanza_volcada'?'¡LA BALANZA VOLCÓ!':'¡TORRE DERRUMBADA!',1600);
 soundFX(90,.32,.17,'sawtooth');vibe(45);
 if(!replayFrames.length)endReplay();
}
function endReplay(){
 replaying=false;phaseTo('finished');
 const points=G.score(hi);
 const previous=modeBest();
 saveModeBest(points);
 $('finalHeight').textContent=points+' cm';
 $('resultMetric').textContent='ALTURA ESTABLE';
 $('finalPieces').textContent=states.length;
 $('finalRecord').textContent=modeBest()+' cm';
 $('resultTitle').textContent=collapseReason==='balanza_volcada'?'¡BALANZA VOLCADA!':'TORRE DERRUMBADA';
 $('resultNote').textContent=points>previous?'🏆 ¡NUEVO RÉCORD PERSONAL!':'La próxima torre llegará más alto.';
 updateHUD();
}
function finish(title){
 saveRecord();phaseTo('finished');
 $('finalHeight').textContent=G.score(hi)+' cm';
 $('resultMetric').textContent='ALTURA ESTABLE';
 $('finalPieces').textContent=states.length;
 $('finalRecord').textContent=record+' cm';
 $('resultTitle').textContent=title;
 $('resultNote').textContent='¡Construcción legendaria!';
}
function paintReplay(dt){
 // Use actual elapsed time, not capped render-frame delta; AR phones with low
 // FPS must never leave the player trapped in an endless replay.
 const elapsed=Math.max(0,(performance.now()-replayStartAt)/1000);
 replayTime=elapsed*.61;
 const i=Math.min(replayFrames.length-1,Math.floor(replayTime*60));
 const snapshot=replayFrames[i];for(const s of snapshot||[])art.sync(s.id,s.x,s.y,s.angle);
 if(i>=replayFrames.length-1||elapsed>4){endReplay()}
}
function newGame(){
 setCopyReferenceExpanded(false);
 startingRecord=record;editing=false;paused=false;startPhysics();ui.results.hidden=true;
 if(modeId==='demolition')createDemolitionTower();
 else makeActive();
 $('introRecord').textContent=modeId==='infinite'?'RÉCORD: '+record+' CM':M.get(modeId).short.toUpperCase();
 modeHUD();
}
function tick(time,frame){
 const wallDt=Math.min(.25,Math.max(0,(time-lastTime)/1000||.016));const dt=Math.min(.05,wallDt);lastTime=time;
 if(session&&frame)xrFrame(time,frame);
 if(modeId==='demolition'&&phase==='intermission'&&!paused){
  demolitionIntermission+=wallDt;
  if(demolitionIntermission>=1.8)buildDemolitionRound();
 }
 if((phase==='playing'||phase==='settling')&&!paused){
  if(M.get(modeId).seconds){
   clockRemaining=Math.max(0,clockRemaining-wallDt);
   if(clockRemaining<=0&&phase==='playing'){if(modeId==='demolition')finishDemolitionRound('time');else challengeCompleted('time')}
   else if(steps%8===0)modeHUD();
  }
  if(phase==='playing'||phase==='settling'){
   acc=Math.min(.12,acc+dt);
   let k=0;while(acc>=1/60&&k++<6){physicsStep();acc-=1/60;if(phase==='finished'||phase==='replay')break}
  }
 }
 if(replaying)paintReplay(dt);
 if(art)art.frame(Math.max(top,hi*.8),dt);
 if(time-miniTimer>160){drawMini();miniTimer=time}
}
function drawMini(){
 if(!art||!(phase==='playing'||phase==='settling'||phase==='replay'||phase==='finished'))return;
 const ctx=ui.mini.getContext('2d');const w=ui.mini.width,h=ui.mini.height;ctx.clearRect(0,0,w,h);
 const replaySnapshot=replaying?replayFrames[Math.min(replayFrames.length-1,Math.floor(replayTime*60))]:null;
 ctx.fillStyle='#0c2436dd';ctx.fillRect(0,0,w,h);
 const viewHeight=modeId==='copy'?Math.max(1.32,top+.2):Math.max(2.6,top+.65,hi+.65);const px=Math.min(w/2.9,(h-20)/viewHeight);
 const X=x=>w/2+x*px, Y=y=>h-15-(y+.04)*px;
 ctx.strokeStyle='#84f7e8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(-baseHalf),Y(.14));ctx.lineTo(X(baseHalf),Y(.14));ctx.stroke();
 for(const s of states){const snap=replaySnapshot?.find(b=>b.id===s.id),p=snap||s.body.translation(),q=s.body.rotation(),a=snap?snap.angle:2*Math.atan2(q.z,q.w);const c=['#34e1c1','#ffb952','#7da3ff','#ff769a','#b184ff','#ffa17a','#c3ea65'][s.shape.tone%7];
 ctx.fillStyle=c;ctx.strokeStyle='#ffffffa0';ctx.lineWidth=.85;
 for(const poly of s.shape.parts){ctx.beginPath();G.rotated(poly,a).forEach(([xx,yy],i)=>{const xxw=X(p.x+xx*BLOCK),yyw=Y(p.y+yy*BLOCK);i?ctx.lineTo(xxw,yyw):ctx.moveTo(xxw,yyw)});ctx.closePath();ctx.fill();ctx.stroke()}
 }
 if(active){ctx.save();ctx.globalAlpha=.74;ctx.fillStyle='#68ffe4';for(const poly of active.shape.parts){ctx.beginPath();G.rotated(poly,active.angle).forEach(([xx,yy],i)=>{i?ctx.lineTo(X(active.x+xx*BLOCK),Y(active.y+yy*BLOCK)):ctx.moveTo(X(active.x+xx*BLOCK),Y(active.y+yy*BLOCK))});ctx.closePath();ctx.fill()}ctx.restore()}
 ctx.fillStyle='#b3ebe4';ctx.font='bold 10px system-ui';ctx.fillText('VISTA TORRE',8,14);
}
// Building controls: tap = precision 90°, two-finger twist = any orientation.
// Two-finger release NEVER drops the piece by accident.
const playPointers=new Map();
function turnActive(delta){
 if(!active)return;
 active.angle=G.angleDelta(0,active.angle+delta);
 art.moveActive(active.x,active.y,active.angle);
 updateLanding();
}
function pickDemolitionAt(x,y){
 if(modeId!=='demolition'||phase!=='playing')return null;
 // In AR the *same world-projected geometry* as the drawn blocks is used for
 // the hit regions. Do not raycast with the demo camera against WebXR.
 return mode==='ar'?D.hitAt(xrDemolitionFaces,x,y):art.pickBlockAt(x,y);
}
function startDemolitionTouch(e){
 e.preventDefault();
 if(e.pointerType==='mouse'&&e.button!==0)return;
 const id=pickDemolitionAt(e.clientX,e.clientY);
 demolitionTouch={pointerId:e.pointerId,x:e.clientX,y:e.clientY,id};
 demolitionHighlight=id;art.highlightBlock(id);
 try{ui.gesture.setPointerCapture(e.pointerId)}catch(_){}
}
function endDemolitionTouch(e){
 if(!demolitionTouch||e.pointerId!==demolitionTouch.pointerId)return;
 const touch=demolitionTouch;demolitionTouch=null;
 const eligible=D.isTap(touch,{x:e.clientX,y:e.clientY},23);
 const ending=eligible?pickDemolitionAt(e.clientX,e.clientY):null;
 art.clearBlockHighlight();demolitionHighlight=null;
 if(!eligible||!touch.id||ending!==touch.id)return;
 removeDemolitionBlock(touch.id);
}
function gestureDown(e){
 if(phase==='playing'&&modeId==='demolition'){startDemolitionTouch(e);return}
 if(phase==='playing'&&modeId==='copy')setCopyReferenceExpanded(false);
 if(phase!=='playing'&&phase!=='placing')return;
 e.preventDefault();ui.gesture.setPointerCapture(e.pointerId);
 if(phase==='placing'){
  const p={id:e.pointerId,x:e.clientX,y:e.clientY};pointers.set(e.pointerId,p);
  if(pointers.size===2){const a=[...pointers.values()];pinch={dist:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),angle:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x),scale,yaw}}
  return;
 }
 if(!active)return;
 playPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(playPointers.size===2){
  const a=[...playPointers.values()];
  twist={angle:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)};
  drag=null;vibe(6);
 }else if(playPointers.size===1){
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:active.x,moved:false};
  soundFX(540,.028,.034);
 }
}
const pointers=new Map();
function gestureMove(e){
 if(modeId==='demolition'){if(demolitionTouch?.pointerId===e.pointerId&&Math.hypot(e.clientX-demolitionTouch.x,e.clientY-demolitionTouch.y)>23){art.clearBlockHighlight();demolitionHighlight=null}return}
 if(phase==='placing'){
  if(!pointers.has(e.pointerId))return;
  e.preventDefault();const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;
  pointers.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
  if(pointers.size===1){
   const c=Math.cos(yaw),sn=Math.sin(yaw);
   shift.x=clamp(shift.x+(dx*c+dy*sn)*.0016,-1.7,1.7);
   shift.z=clamp(shift.z+(-dx*sn+dy*c)*.0016,-1.7,1.7);
  }else{
   const a=[...pointers.values()],dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),ang=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
   if(pinch){scale=clamp(pinch.scale*(dist/Math.max(20,pinch.dist)),.30,1.15);yaw=pinch.yaw+G.angleDelta(pinch.angle,ang);art.setScale(scale)}
  }
  updateScale();return;
 }
 if(!playPointers.has(e.pointerId)||!active||phase!=='playing')return;
 e.preventDefault();playPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(playPointers.size===2){
  const a=[...playPointers.values()];
  const angle=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
  if(twist){turnActive(G.angleDelta(twist.angle,angle));twist.angle=angle}
  return;
 }
 if(!drag||drag.id!==e.pointerId||twist)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(Math.hypot(dx,dy)>12)drag.moved=true;
 if(drag.moved){
  active.x=clamp(drag.startX+dx/Math.max(320,innerWidth)*2.8,-1.08,1.08);
  art.moveActive(active.x,active.y,active.angle);
  updateLanding();
 }
}
function gestureUp(e){
 if(modeId==='demolition'){endDemolitionTouch(e);return}
 if(phase==='placing'){pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;return}
 if(!playPointers.has(e.pointerId))return;
 const usedTwoFingers=!!twist;
 playPointers.delete(e.pointerId);
 if(usedTwoFingers){
  drag=null;
  if(playPointers.size===0){twist=null;vibe(5)}
  return; // drop only after a separate one-finger placement swipe
 }
 if(!drag||drag.id!==e.pointerId||phase!=='playing'||!active)return;
 const moved=drag.moved;drag=null;
 if(moved)drop();
 else{turnActive(Math.PI/2);soundFX(710,.05,.045);vibe(7)}
}
function gestureCancel(e){
 if(modeId==='demolition'){demolitionTouch=null;demolitionHighlight=null;art?.clearBlockHighlight();return}
 if(phase==='placing'){pointers.delete(e.pointerId);if(pointers.size<2)pinch=null}
 else{playPointers.delete(e.pointerId);drag=null;if(playPointers.size===0)twist=null}
}
ui.gesture.addEventListener('pointerdown',gestureDown);
ui.gesture.addEventListener('pointermove',gestureMove);
ui.gesture.addEventListener('pointerup',gestureUp);
ui.gesture.addEventListener('pointercancel',gestureCancel);
ui.gesture.addEventListener('wheel',e=>{
 if(phase!=='playing'||!active)return;
 e.preventDefault();turnActive(Math.sign(e.deltaY)*Math.PI/12);
},{passive:false});
function updateScale(){$('sizeText').textContent=Math.round(scale*100)+'%'}
function setARMode(ar){mode=ar?'ar':'demo';art.setAR(ar);ui.home.hidden=true;ui.overlay.hidden=false;if(!ar){session=null;clearARProjection();scale=1;art.setScale(1);art.group.visible=true;$('recenter').hidden=true;newGame();return}$('recenter').hidden=false;scale=.48;art.setScale(scale);updateScale();projectedFloor=false;phaseTo('placing');art.group.visible=false;ui.xrScene.replaceChildren();showText('APUNTÁ AL PISO Y AJUSTÁ TU PLATAFORMA',3600)}
function arReady(){return !!navigator.xr&&window.isSecureContext}
async function startAR(){
 if(!art){showText('Motor todavía cargando');return}
 if(!arReady()){showText('Usá Chrome Android compatible con WebXR / ARCore',4800);return}
 $('arBtn').disabled=true;
 try{
  if(!(await navigator.xr.isSessionSupported('immersive-ar')))throw Error('Este celular no admite AR espacial. Probá el modo 3D.');
  art.renderer.xr.enabled=true;art.renderer.xr.setReferenceSpaceType('local');art.renderer.xr.setFramebufferScaleFactor(Math.min(1.0,1/(devicePixelRatio||1)*1.5));
  const s=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors','light-estimation'],domOverlay:{root:ui.overlay}});
  session=s;
  s.addEventListener('end',()=>{session=null;trackSource?.cancel?.();trackSource=null;anchor?.delete?.();anchor=null;art.setAR(false);art.renderer.xr.enabled=false;art.group.position.set(0,0,0);art.group.rotation.set(0,0,0);scale=1;art.setScale(1);setARMode(false);});
  await art.renderer.xr.setSession(s);
  ref=await s.requestReferenceSpace('local');
  const viewer=await s.requestReferenceSpace('viewer');
  trackSource=await s.requestHitTestSource({space:viewer});
  yaw=0;scale=.48;shift={x:0,z:0};fixedPose=null;art.setScale(scale);setARMode(true);
 }catch(e){showText('No se pudo abrir AR: '+(e.message||e),6500);$('precheck').textContent='AR: '+e.message;try{await session?.end()}catch(_){} session=null;art.setAR(false)}
 $('arBtn').disabled=false;
}

/** A world-locked WebXR projection of the real 3D platform.
 * Uses the XR view and the SAME group transform as Three.js. This also gives a
 * dependable visible reticle on DOM-overlay implementations with faulty WebGL
 * compositing. Never attach the platform to screen space.
 */
const XR_COLORS=['#37d9c5','#ffc15b','#6b98ff','#fc6a8b','#af82ff','#ff8656','#a6e66b'];
let lastARPaint=0, projectedFloor=false, xrRenderFailures=0;

function clearARProjection(){
 xrDemolitionFaces=[];
 ui.xrScene.replaceChildren();
 ui.xrPaint.replaceChildren();
 const canvas=ui.xrDraw,ctx=canvas.getContext('2d');
 if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
 projectedFloor=false;
}
function renderARSpatial(frame,time){
 if(mode!=='ar'||!art||!ref||phase==='home')return;
 if(time-lastARPaint<32)return;
 lastARPaint=time;
 const pose=frame.getViewerPose(ref),view=pose?.views?.[0];
 if(!view||!art.group.visible){clearARProjection();if(phase==='placing')ui.xrState.textContent='BUSCANDO EL PISO…';return}
 const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
 const vp=new THREE.Matrix4().fromArray(view.projectionMatrix).multiply(new THREE.Matrix4().fromArray(view.transform.inverse.matrix));
 art.group.updateWorldMatrix(true,false);
 const world=art.group.matrixWorld,vv=new THREE.Vector4();
 function project(x,y,z){
  vv.set(x,y,z,1).applyMatrix4(world).applyMatrix4(vp);
  if(!Number.isFinite(vv.w)||vv.w<=.035)return null;
  const nx=vv.x/vv.w,ny=vv.y/vv.w,nz=vv.z/vv.w;
  return Number.isFinite(nx)&&Number.isFinite(ny)&&Number.isFinite(nz)?{x:(nx+1)*width*.5,y:(1-ny)*height*.5,depth:nz}:null;
 }
 const map=coords=>coords.map(p=>project(...p));
 function boardProject(coords){
  const a=tiltBody?2*Math.atan2(tiltBody.rotation().z,tiltBody.rotation().w):0;
  const c=Math.cos(a),q=Math.sin(a);
  return map(coords.map(([x,y,z])=>[x*c-(y-.039)*q,x*q+(y-.039)*c+.039,z]));
 }
 const fmt=p=>p.x.toFixed(1)+','+p.y.toFixed(1);
 const boardSurface=modeId==='demolition'?.095:.145;
 const topPlane=boardProject([[-baseHalf,boardSurface,-.36],[baseHalf,boardSurface,-.36],[baseHalf,boardSurface,.36],[-baseHalf,boardSurface,.36]]);
 const center=project(0,.16,0);
 const controlsTop=phase==='placing'?ui.arControls.getBoundingClientRect().top:height;
 const safeBottom=Math.max(175,Math.min(height-20,controlsTop-16));
 // Only count the unobstructed viewport above the control panel.
 function clippedArea(input){
  let polygon=input.slice();
  for(const [axis,limit,gt] of [['x',8,true],['x',width-8,false],['y',100,true],['y',safeBottom,false]]){
   if(!polygon.length)return 0;
   const old=polygon;polygon=[];
   const inside=p=>gt?p[axis]>=limit:p[axis]<=limit;
   for(let i=0;i<old.length;i++){
    const a=old[i],b=old[(i+1)%old.length],ai=inside(a),bi=inside(b);
    if(ai)polygon.push(a);
    if(ai!==bi){
     const denominator=b[axis]-a[axis],t=Math.abs(denominator)<1e-8?0:(limit-a[axis])/denominator;
     polygon.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    }
   }
  }
  let area=0;
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length];
   area+=a.x*b.y-b.x*a.y;
  }
  return Math.abs(area)*.5;
 }
 const inView=topPlane.every(Boolean)&&center&&center.x>12&&center.x<width-12&&
  center.y>105&&center.y<safeBottom-12&&clippedArea(topPlane)>Math.max(650,width*1.5);
 if(!inView&&phase==='placing'){
  clearARProjection();
  if(phase==='placing')ui.xrState.textContent=topPlane.every(Boolean)?
   'PISO DETECTADO · ALEJÁ LA PISTA DEL PANEL INFERIOR':'BUSCANDO UN ESPACIO LIBRE…';
  return;
 }
 const shapes=[],draw=[];
 function poly(points,fill,stroke='#a0ffec',sw=2,alpha=1,closed=true){
  if(points.some(p=>!p))return '';
  draw.push({points,fill,stroke,sw,alpha,closed});
  const tag=closed?'polygon':'polyline';
  return '<'+tag+' points="'+points.map(fmt).join(' ')+'" fill="'+(fill||'none')+
   '" stroke="'+stroke+'" stroke-width="'+sw+'" opacity="'+alpha+'" stroke-linejoin="round"/>';
 }
 shapes.push(poly(boardProject([[-baseHalf,boardSurface-.155,.36],[baseHalf,boardSurface-.155,.36],[baseHalf,boardSurface,.36],[-baseHalf,boardSurface,.36]]),'#07546c','#74fff1',4,.75));
 shapes.push(poly(topPlane,'#00d8ca','#aafff6',5,.75));
 for(const x of [-.8,-.4,0,.4,.8].map(t=>t*baseHalf))
  shapes.push(poly(boardProject([[x,boardSurface+.004,-.35],[x,boardSurface+.004,.35]]),null,'#b8fff5',1.6,.92,false));
 for(const z of [-.24,0,.24])
  shapes.push(poly(boardProject([[-baseHalf*.99,boardSurface+.004,z],[baseHalf*.99,boardSurface+.004,z]]),null,'#b8fff5',1.6,.92,false));
 // Touch regions are reprojected every XR frame from the world-anchored
 // bodies. They remain correct as the person walks around the real tower.
 xrDemolitionFaces=[];
 function piece(shape,x,y,angle,alpha=1,id=null){
  const front=DEPTH*.5,back=-front;
  const demolition=id!==null&&modeId==='demolition';
  const color=demolition?D.color(id):XR_COLORS[shape.tone%XR_COLORS.length];
  const selected=demolition&&id===demolitionHighlight;
  const surface=selected?'#fff9cb':color;
  const register=(poly)=>{
   if(!demolition||phase!=='playing'||poly.length<3||!poly.every(p=>p&&p.depth>-1&&p.depth<1.02))return;
   xrDemolitionFaces.push({id,polygon:poly,depth:poly.reduce((v,p)=>v+p.depth,0)/poly.length});
  };
  for(const polygon of shape.parts){
   const v=G.rotated(polygon,angle).map(([u,v])=>[x+u*BLOCK,y+v*BLOCK]);
   const rear=map(v.map(([u,v])=>[u,v,back]));
   const face=map(v.map(([u,v])=>[u,v,front]));
   shapes.push(poly(rear,demolition?'#16334a':'#153456',surface,1,alpha*.83));
   register(rear);
   for(let i=0;i<v.length;i++){
    const k=(i+1)%v.length;
    const side=map([[v[i][0],v[i][1],back],[v[k][0],v[k][1],back],
      [v[k][0],v[k][1],front],[v[i][0],v[i][1],front]]);
    shapes.push(poly(side,demolition?surface:color,'#06192d',1.4,alpha*(demolition?.87:.72)));
    register(side);
   }
   shapes.push(poly(face,surface,demolition?'#e9fffb':'#ffffff',demolition?3:2.4,alpha));
   register(face);
  }
 }
 if(phase==='placing'&&!editing)piece(G.SHAPES[0],0,.145+BLOCK*.5,0,.95);
 else{
  const all=states.map(item=>{const p=item.body.translation(),q=item.body.rotation();return {id:item.id,shape:item.shape,x:p.x,y:p.y,angle:2*Math.atan2(q.z,q.w)}}).sort((a,b)=>b.y-a.y);
  for(const it of all)piece(it.shape,it.x,it.y,it.angle,modeId==='demolition'?.99:.93,it.id);
  if(active)piece(active.shape,active.x,active.y,active.angle,.92);
 }
 // WebXR camera compositor fallback #1: canvas2d DOM-overlay
 const canvas=ui.xrDraw,r=Math.min(devicePixelRatio||1,1.5);
 const cw=Math.round(width*r),ch=Math.round(height*r);
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
 const ctx=canvas.getContext('2d',{alpha:true});
 if(ctx){
  ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,width,height);
  for(const sh of draw){
   const v=sh.points;
   ctx.beginPath();ctx.moveTo(v[0].x,v[0].y);
   for(let i=1;i<v.length;i++)ctx.lineTo(v[i].x,v[i].y);
   if(sh.closed)ctx.closePath();
   ctx.globalAlpha=sh.alpha;
   if(sh.fill){ctx.fillStyle=sh.fill;ctx.fill()}
   ctx.lineWidth=sh.sw;ctx.strokeStyle=sh.stroke;ctx.lineJoin='round';ctx.stroke();
  }
  ctx.globalAlpha=1;
 }
 // Fallback #2: SVG, always in world coordinates
 ui.xrScene.setAttribute('viewBox','0 0 '+width+' '+height);
 ui.xrScene.innerHTML=shapes.join('');
 // Fallback #3: native HTML divs, same compositor as already-visible interface text.
 function tile(points,color,opacity,kind=''){
  if(points.some(p=>!p))return '';
  const lx=Math.min(...points.map(p=>p.x)),ty=Math.min(...points.map(p=>p.y));
  const rx=Math.max(...points.map(p=>p.x)),by=Math.max(...points.map(p=>p.y));
  if(rx-lx<1||by-ty<1)return '';
  const clip=points.map(p=>(p.x-lx).toFixed(1)+'px '+(p.y-ty).toFixed(1)+'px').join(',');
  return '<div class="tile '+kind+'" style="left:'+lx.toFixed(1)+'px;top:'+ty.toFixed(1)+'px;width:'+(rx-lx).toFixed(1)+
   'px;height:'+(by-ty).toFixed(1)+'px;background:'+(kind==='demolition-face'?'linear-gradient(145deg,#ffffff77 0%,'+color+' 38%,#071e39dd 145%)':color)+';opacity:'+opacity+
   ';clip-path:polygon('+clip+')"></div>';
 }
 function edge(a,b,color='#73ffe5',thickness=4){
  if(!a||!b)return '';
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  return '<div class="edge" style="left:'+a.x.toFixed(1)+'px;top:'+a.y.toFixed(1)+
    'px;width:'+len.toFixed(1)+'px;height:'+thickness+'px;transform:rotate('+Math.atan2(dy,dx).toFixed(5)+
    'rad);background:'+color+'"></div>';
 }
 const html=[tile(topPlane,'#00ffe2',.6)];
 for(let i=0;i<4;i++)html.push(edge(topPlane[i],topPlane[(i+1)%4]));
 for(const x of [-.4,0,.4].map(t=>t*baseHalf)){
  const v=boardProject([[x,boardSurface+.008,-.36],[x,boardSurface+.008,.36]]);
  html.push(edge(v[0],v[1],'#c0fff7',2));
 }
 if(phase==='placing'){
  const face=map(G.SHAPES[0].parts[0].map(([u,v])=>[u*BLOCK,.145+BLOCK*.5+v*BLOCK,DEPTH*.5]));
  html.push(tile(face,'#ffae3e',.91));
  if(face.every(Boolean))for(let i=0;i<face.length;i++)html.push(edge(face[i],face[(i+1)%face.length],'#ffffff',3));
  html.push('<div class="marker" style="left:'+center.x.toFixed(1)+'px;top:'+(center.y-18).toFixed(1)+'px">🏗️ TORRE CAOS</div>');
 }else{
  for(const it of states){
   const p=it.body.translation(),q=it.body.rotation(),angle=2*Math.atan2(q.z,q.w);
   for(const polygon of it.shape.parts){
    const points=map(G.rotated(polygon,angle).map(([u,v])=>[p.x+u*BLOCK,p.y+v*BLOCK,DEPTH*.5]));
    const demolition=modeId==='demolition',color=demolition?D.color(it.id):XR_COLORS[it.shape.tone%XR_COLORS.length];
    html.push(tile(points,it.id===demolitionHighlight?'#ffffff':color,demolition?.96:.86,demolition?'demolition-face':''));
    if(demolition&&points.every(Boolean))for(let k=0;k<points.length;k++)html.push(edge(points[k],points[(k+1)%points.length],'#ecfffe',2));
   }
  }
  if(active)for(const polygon of active.shape.parts){
   const points=map(G.rotated(polygon,active.angle).map(([u,v])=>[active.x+u*BLOCK,active.y+v*BLOCK,DEPTH*.5]));
   html.push(tile(points,'#d4fff7',.9));
  }
 }
 ui.xrPaint.innerHTML=html.join('');
 projectedFloor=true;
 if(phase==='placing')ui.xrState.textContent='PISTA DETECTADA · FIJALA CUANDO LA VEAS';
}

function xrFrame(time,frame){
 if(!ref||!trackSource)return;
 const hit=frame.getHitTestResults(trackSource);
 if(phase==='placing'){
  if(hit.length){const p=hit[0].getPose(ref);if(p){latestHit=hit[0];hitSeen=time;rawPose={x:p.transform.position.x,y:p.transform.position.y,z:p.transform.position.z};if(!fixedPose){const view=frame.getViewerPose(ref)?.transform.position;if(view)yaw=Math.atan2(view.x-rawPose.x,view.z-rawPose.z);fixedPose={...rawPose};}
   art.group.visible=true;art.setPreviewPose({x:rawPose.x+shift.x,y:rawPose.y,z:rawPose.z+shift.z},yaw);$('fix').disabled=false;
  }}
  if(time-hitSeen>950){$('fix').disabled=true;art.group.visible=false;projectedFloor=false}
  art.aim.visible=true;
 }else if(anchor){
  const p=frame.getPose(anchor.anchorSpace,ref);
  if(p){art.group.position.set(p.transform.position.x+shift.x,p.transform.position.y,p.transform.position.z+shift.z)}
  art.aim.visible=false;
 }else art.aim.visible=false;
 try{renderARSpatial(frame,time)}catch(e){
  if(++xrRenderFailures<4)console.warn('Torre Caos XR projection:',e);
  projectedFloor=false;clearARProjection();ui.xrState.textContent='NO SE PUDO DIBUJAR · REENCUADRÁ';
 }
 if(phase==='placing')$('fix').disabled=!projectedFloor||time-hitSeen>950;
}
async function fix(){
 if(phase!=='placing'||!projectedFloor||!rawPose||performance.now()-hitSeen>1050)return;
 const cp={x:rawPose.x+shift.x,y:rawPose.y,z:rawPose.z+shift.z};
 art.setPreviewPose(cp,yaw);art.group.visible=true;fixedPose={...cp};
 try{if(latestHit?.createAnchor){anchor=await latestHit.createAnchor();}}catch(_){}
 art.aim.visible=false;ui.setup.hidden=true;
 if(editing){editing=false;paused=false;phaseTo(resumePhase);showText('TORRE REUBICADA · ¡SEGUÍ CONSTRUYENDO!',3200)}
 else{newGame();showText('¡LISTO! TOCÁ, ARRASTRÁ Y SOLTÁ',3200)}
}
function pause(){if(phase!=='playing'&&phase!=='settling')return;paused=true;$('pauseMenu').hidden=false;showText('PAUSA')}
function resume(){paused=false;$('pauseMenu').hidden=true}
function retry(){resume();replaying=false;newGame()}
function edit(){if(!session)return;resumePhase=phase;editing=true;paused=true;drag=null;$('pauseMenu').hidden=true;phaseTo('placing');shift={x:0,z:0};latestHit=null;hitSeen=0;clearARProjection();rawPose=null;fixedPose=null;anchor?.delete?.();anchor=null;showText('REUBICÁ LA TORRE SIN PERDER TU CONSTRUCCIÓN');}
function miniToggle(){ui.mini.classList.toggle('expanded')}
$('demoBtn').addEventListener('click',()=>{if(!art)return;setARMode(false)});
$('arBtn').addEventListener('click',startAR);
$('fix').addEventListener('click',fix);
$('minus').addEventListener('click',()=>{scale=clamp(scale-.07,.30,1.15);art.setScale(scale);updateScale()});
$('plus').addEventListener('click',()=>{scale=clamp(scale+.07,.30,1.15);art.setScale(scale);updateScale()});
$('turn').addEventListener('click',()=>{yaw+=PI/12;art.setPreviewPose({x:rawPose?.x+shift.x||0,y:rawPose?.y||0,z:rawPose?.z+shift.z||0},yaw)});
$('pause').addEventListener('click',pause);
$('resume').addEventListener('click',resume);
$('retry').addEventListener('click',retry);
$('resultRetry').addEventListener('click',retry);
$('skipReplay').addEventListener('click',endReplay);
$('recenter').addEventListener('click',edit);
$('quit').addEventListener('click',()=>{location.href='/'});
$('miniBtn').addEventListener('click',miniToggle);
ui.mini.addEventListener('click',miniToggle);
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').textContent=sound?'🔊 Sonido':'🔇 Sonido'});
$('vibration').addEventListener('click',()=>{haptic=!haptic;$('vibration').textContent=haptic?'📳 Vibración':'— Vibración'});
addEventListener('keydown',e=>{if(phase==='playing'&&active){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){active.x=clamp(active.x+(e.key==='ArrowLeft'?-.09:.09),-1.08,1.08);art.moveActive(active.x,active.y,active.angle)}else if(e.key==='r'||e.key==='R'){active.angle+=PI/2;art.moveActive(active.x,active.y,active.angle)}else if(e.key===' '||e.key==='Enter'){e.preventDefault();drop()}}});
async function boot(){
 try{
  $('precheck').textContent='Cargando física 3D…';
  await RAPIER.init();
  art=new TorreArt($('arena'));art.renderer.setAnimationLoop(tick);phaseTo('home');
  const supportsAR=arReady()&&await navigator.xr.isSessionSupported('immersive-ar').catch(()=>false);
  $('precheck').textContent=supportsAR?'AR espacial compatible · También podés jugar en 3D.':'Modo 3D disponible · La AR espacial requiere Chrome Android y ARCore compatibles.';
  $('demoBtn').disabled=false;$('arBtn').disabled=!supportsAR;
 }catch(e){$('precheck').textContent='Error cargando motor físico: '+(e.message||e);$('demoBtn').disabled=true;$('arBtn').disabled=true;console.error(e)}
}
ui.overlay.addEventListener('beforexrselect',e=>e.preventDefault());
boot();
