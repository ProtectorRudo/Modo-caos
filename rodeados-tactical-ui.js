/* RODEADOS 360 V19 tactical XR planning.
 * Aimed points are in the ANCHORED world root coordinate frame.
 * DOM interactions consume cached XR ray; never access XRFrame outside RAF.
 */
export function createTacticalPlanner({G, $,getGame,getRay,getArena,isDemo,onComplete,onNotice,onPhase,onVibrate}){
 let draft=null,aim=null;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function draw(){
  if(!draft)return;
  const p=draft,i=p.spots.length,step=!p.base?'base':!p.flag?'flag':i<p.count?'spawn':'confirm';
  $('tacticalStep').textContent=step==='base'?'1 · TU BASE':step==='flag'?'2 · BANDERA ENEMIGA':step==='spawn'?'3 · ENTRADA ENEMIGA '+(i+1)+'/'+p.count:'4 · REVISÁ Y CONFIRMÁ';
  $('tacticalHelp').textContent=step==='base'?'APUNTÁ AL PISO DONDE QUERÉS EMPEZAR. TOCÁ MARCAR.':
   step==='flag'?'LA BANDERA VA FUERA DE TU BASE: APUNTÁ A UN PISO LEJANO (MÍNIMO 2,35 METROS). PODÉS MOVERTE PARA ELEGIR EL PUNTO.':
   step==='spawn'?'ELEGÍ EL TIPO Y EL LUGAR DE ESTA ENTRADA. DEBE QUEDAR A MÁS DE 2,65 METROS DE TU BASE.':
   'LOS MARCADORES ESTÁN FIJOS AL PISO. CONFIRMÁ PARA EMPEZAR.';
  $('tacticalChoose').style.display=step==='spawn'?'flex':'none';
  $('tacticalMark').style.display=step==='confirm'?'none':'block';
  $('tacticalMark').textContent=step==='base'?'📍 MARCAR BASE':step==='flag'?'🚩 MARCAR BANDERA':'⚔️ MARCAR ENTRADA '+(i+1);
  $('tacticalConfirm').style.display=step==='confirm'?'block':'none';
  $('tacticalUndo').disabled=!p.base;
 }
 function updateTarget(){
  if(!draft)return null;
  const r=getRay();
  if(!r)return aim=null;
  const o=r.origin,v=r.direction;
  if(![o.x,o.y,o.z,v.x,v.y,v.z].every(Number.isFinite))return aim=null;
  let x,z;
  if(isDemo()&&v.y>=-.10){
   const h=Math.hypot(v.x,v.z)||1;
   const range=!draft.base?0.08:!draft.flag?3.45:3.75;
   x=o.x+v.x/h*range;z=o.z+v.z/h*range;
  }else{
   if(v.y>=-.10)return aim=null;
   const t=-o.y/v.y;if(t<.25||t>24)return aim=null;
   x=o.x+v.x*t;z=o.z+v.z*t;
  }
  if(Math.max(Math.abs(x),Math.abs(z))>8)return aim=null;
  return aim={x:+x.toFixed(2),z:+z.toFixed(2)};
 }
 function mark(){
  if(!draft)return;
  const p=draft,at=updateTarget();
  if(!at){onNotice('🎯 INCLINÁ EL TELÉFONO HACIA EL PISO PARA MARCAR',3);return}
  const limit=getArena()/2-.12;
  if(!p.base||!p.flag){
   if(!p.base){
    if(Math.max(Math.abs(at.x),Math.abs(at.z))>limit){onNotice('⚠ TU BASE DEBE QUEDAR EN LA CUADRÍCULA INICIAL',3);return}
    p.base={...at};
   }else{
    if(dist(p.base,at)<2.35){onNotice('⚠ BANDERA MUY CERCA · ALEJALA AL MENOS 2,35 METROS',3);return}
    if(Math.max(Math.abs(at.x),Math.abs(at.z))<=getArena()/2+.12){onNotice('⚠ LA BANDERA DEBE ESTAR FUERA DE TU BASE',3);return}
    p.flag={...at};
   }
  }else if(p.spots.length<p.count){
   if(dist(p.base,at)<2.65){onNotice('⚠ ENEMIGO DEMASIADO CERCA DE TU BASE',3);return}
   if(p.spots.some(v=>dist(v,at)<.40)){onNotice('⚠ LOS DOS PUNTOS ENEMIGOS SE SUPERPONEN',3);return}
   p.spots.push({...at});p.kinds.push($('tacticalKind').value);
  }
  onVibrate(36);draw();
 }
 function undo(){
  if(!draft)return;
  if(draft.spots.length){draft.spots.pop();draft.kinds.pop()}
  else if(draft.flag)draft.flag=null;
  else draft.base=null;
  draw();
 }
 function confirm(){
  if(!draft)return;
  const p=draft,plan={base:p.base,flag:p.flag,spots:p.spots,kinds:p.kinds};
  const res=G.configureFlagPlan(getGame(),plan);
  if(!res?.ok){onNotice('⚠ NO SE PUEDE CONFIRMAR: '+(res?.reason||'REVISÁ EL CAMPO'),3);return}
  const copy=JSON.parse(JSON.stringify(res.plan));draft=null;aim=null;onComplete(copy);
 }
 $('tacticalMark')?.addEventListener('pointerdown',e=>{e.preventDefault();mark()});
 $('tacticalUndo')?.addEventListener('click',undo);
 $('tacticalConfirm')?.addEventListener('click',confirm);
 return {
  start(count){draft={base:null,flag:null,spots:[],kinds:[],count:count===6?6:7};aim=null;onPhase('tactical');draw()},
  updateTarget,
  get draft(){return draft?JSON.parse(JSON.stringify(draft)):null},
  get aim(){return aim&&{...aim}},
  mark,undo,confirm
 };
}
