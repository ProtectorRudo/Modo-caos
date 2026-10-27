/* RODEADOS 360 V29 — actual world-space tactical placement for FLAG and LOOT.
 * Selected points live in the anchored AR world; the UI never guesses a floor.
 * The phone ray was sampled within XR RAF and cached by the runtime.
 */
export function createTacticalPlanner({G,$,getGame,getRay,getArena,isDemo,onComplete,onNotice,onPhase,onVibrate}){
 let draft=null,aim=null;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const isLoot=()=>draft?.mode==='loot';
 function step(){
  if(!draft)return 'none';
  if(!draft.base)return 'base';
  if(isLoot())return draft.crates.length<5?'crate':'confirm';
  return !draft.flag?'flag':draft.spots.length<draft.count?'spawn':'confirm';
 }
 function draw(){
  if(!draft)return;
  const p=draft,part=step(),i=isLoot()?p.crates.length:p.spots.length;
  if(isLoot()){
   $('tacticalStep').textContent=part==='base'?'1 · TU BASE':part==='crate'?'2 · COFRE '+(i+1)+'/5':'3 · REVISÁ TUS 5 COFRES';
   $('tacticalHelp').textContent=part==='base'?'APUNTÁ AL PISO DE TU BASE Y TOCÁ MARCAR.':
    part==='crate'?'APUNTÁ AL PISO PARA COLOCAR ESTE BOTÍN LEJOS DE TU BASE (AL MENOS 2,35 M). LOS ENEMIGOS APARECERÁN ALREDEDOR DE LOS COFRES, NO JUNTO A VOS.':
    'REVISÁ LOS CINCO MARCADORES. PODÉS DESHACER O CONFIRMAR PARA JUGAR.';
  }else{
   $('tacticalStep').textContent=part==='base'?'1 · TU BASE':part==='flag'?'2 · BANDERA ENEMIGA':part==='spawn'?'3 · ENTRADA ENEMIGA '+(i+1)+'/'+p.count:'4 · REVISÁ Y CONFIRMÁ';
   $('tacticalHelp').textContent=part==='base'?'APUNTÁ AL PISO DONDE QUERÉS EMPEZAR. TOCÁ MARCAR.':
    part==='flag'?'LA BANDERA VA FUERA DE TU BASE: APUNTÁ A UN PISO LEJANO (MÍNIMO 2,35 METROS). PODÉS MOVERTE PARA ELEGIR EL PUNTO.':
    part==='spawn'?'ELEGÍ EL TIPO Y EL LUGAR DE ESTA ENTRADA. DEBE QUEDAR A MÁS DE 2,65 METROS DE TU BASE.':
    'LOS MARCADORES ESTÁN FIJOS AL PISO. CONFIRMÁ PARA EMPEZAR.';
  }
  $('tacticalChoose').style.display=part==='spawn'?'flex':'none';
  $('tacticalMark').style.display=part==='confirm'?'none':'block';
  $('tacticalMark').textContent=part==='base'?'📍 MARCAR BASE':part==='flag'?'🚩 MARCAR BANDERA':part==='crate'?'📦 MARCAR COFRE '+(i+1):'⚔️ MARCAR ENTRADA '+(i+1);
  $('tacticalConfirm').style.display=part==='confirm'?'block':'none';
  $('tacticalConfirm').textContent=isLoot()?'✅ CONFIRMAR LOS 5 BOTINES':'✅ CONFIRMAR CAMPO';
  $('tacticalUndo').disabled=!p.base;
 }
 function updateTarget(){
  if(!draft)return null;
  const r=getRay();if(!r)return aim=null;
  const o=r.origin,v=r.direction;
  if(![o.x,o.y,o.z,v.x,v.y,v.z].every(Number.isFinite))return aim=null;
  let x,z;
  if(isDemo()&&v.y>=-.10){
   const h=Math.hypot(v.x,v.z)||1;
   const range=!draft.base?0.08:isLoot()?3.5:!draft.flag?3.45:3.75;
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
  const p=draft,part=step(),at=updateTarget();
  if(!at){onNotice('🎯 INCLINÁ EL TELÉFONO HACIA EL PISO PARA MARCAR',3);return}
  const limit=getArena()/2-.12;
  if(part==='base'){
   if(Math.max(Math.abs(at.x),Math.abs(at.z))>limit){onNotice('⚠ TU BASE DEBE QUEDAR EN LA CUADRÍCULA INICIAL',3);return}
   p.base={...at};
  }else if(part==='crate'){
   if(dist(p.base,at)<2.35){onNotice('⚠ ALEJÁ EL BOTÍN A MÁS DE 2,35 METROS DE TU BASE',3);return}
   if(p.crates.some(x=>dist(x,at)<.85)){onNotice('⚠ SEPARÁ LOS COFRES PARA PODER RECORRERLOS',3);return}
   p.crates.push({...at});
  }else if(part==='flag'){
   if(dist(p.base,at)<2.35){onNotice('⚠ BANDERA MUY CERCA · ALEJALA AL MENOS 2,35 METROS',3);return}
   if(Math.max(Math.abs(at.x),Math.abs(at.z))<=getArena()/2+.12){onNotice('⚠ LA BANDERA DEBE ESTAR FUERA DE TU BASE',3);return}
   p.flag={...at};
  }else if(part==='spawn'){
   if(dist(p.base,at)<2.65){onNotice('⚠ ENEMIGO DEMASIADO CERCA DE TU BASE',3);return}
   if(p.spots.some(x=>dist(x,at)<.40)){onNotice('⚠ LOS PUNTOS ENEMIGOS SE SUPERPONEN',3);return}
   p.spots.push({...at});p.kinds.push($('tacticalKind').value);
  }
  onVibrate(36);draw();
 }
 function undo(){
  if(!draft)return;
  if(isLoot()){if(draft.crates.length)draft.crates.pop();else draft.base=null}
  else if(draft.spots.length){draft.spots.pop();draft.kinds.pop()}
  else if(draft.flag)draft.flag=null;
  else draft.base=null;
  draw();
 }
 function confirm(){
  if(!draft||step()!=='confirm')return;
  const plan=isLoot()?{base:draft.base,crates:draft.crates}:
   {base:draft.base,flag:draft.flag,spots:draft.spots,kinds:draft.kinds};
  const res=isLoot()?G.configureLootPlan(getGame(),plan):G.configureFlagPlan(getGame(),plan);
  if(!res?.ok){onNotice('⚠ NO SE PUEDE CONFIRMAR: '+(res?.reason||'REVISÁ EL CAMPO'),3);return}
  const copy=JSON.parse(JSON.stringify(res.plan));draft=null;aim=null;onComplete(copy);
 }
 $('tacticalMark')?.addEventListener('pointerdown',e=>{e.preventDefault();mark()});
 $('tacticalUndo')?.addEventListener('click',undo);
 $('tacticalConfirm')?.addEventListener('click',confirm);
 return {
  start(count){
   draft=getGame().mode==='loot'?{mode:'loot',base:null,crates:[],count:5}:
    {mode:'ctf',base:null,flag:null,spots:[],kinds:[],count:count===6?6:7};
   aim=null;onPhase('tactical');draw();
  },
  updateTarget,
  get draft(){return draft?JSON.parse(JSON.stringify(draft)):null},
  get aim(){return aim&&{...aim}},
  mark,undo,confirm
 };
}
