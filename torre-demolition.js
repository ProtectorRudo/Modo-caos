(function(root){
'use strict';
// Bright but solid colours: high contrast against the real camera.
const COLORS=['#25dbc9','#ffb347','#755bff','#ff648f','#a886ff','#a8e653','#438cff','#ff8354'];
function color(id){return COLORS[(Math.max(1,Number(id)||1)-1)%COLORS.length]}
function pointInPolygon(poly,x,y){
 if(!Array.isArray(poly)||poly.length<3||!Number.isFinite(x)||!Number.isFinite(y))return false;
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if(!a||!b||!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(b.x)||!Number.isFinite(b.y))return false;
  const ax=b.x-a.x,ay=b.y-a.y,dx=x-a.x,dy=y-a.y;
  const cross=ax*dy-ay*dx,dot=dx*ax+dy*ay,len=ax*ax+ay*ay;
  if(Math.abs(cross)<.001&&dot>=0&&dot<=len)return true;
  if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }
 return hit;
}
function hitAt(regions,x,y){
 // Visible surface wins; never pick by game-list order or by a HUD button.
 let closest=null;
 for(const r of regions||[]){
  if(!Number.isFinite(r.depth)||!pointInPolygon(r.polygon,x,y))continue;
  if(!closest||r.depth<closest.depth)closest=r;
 }
 return closest?closest.id:null;
}
function isTap(a,b,threshold=20){
 return Boolean(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<=threshold);
}

// Four families of difficulty x ten distinct architectural structures.
// All coordinates are METRES in the same 2D Rapier plane used by Torre Caos.
// Shapes have actual convex 3D colliders: beams transfer real forces to
// columns; they are not decorative drawings or artificial domino animations.
const FLOOR=.118;
const DEMOLITION_SHAPES=Object.freeze([
 {id:'pil',name:'Pilar corto',tone:2,weight:1.1,parts:[[[-.365,-.8],[.365,-.8],[.365,.8],[-.365,.8]]]},   // .277 x .608
 {id:'viga',name:'Viga',tone:1,weight:1,parts:[[[-1.55,-.225],[1.55,-.225],[1.55,.225],[-1.55,.225]]]}, // 1.178 x .171
 {id:'techo',name:'Voladizo largo',tone:5,weight:.84,parts:[[[-2.02,-.22],[2.02,-.22],[2.02,.22],[-2.02,.22]]]}, // 1.535 x .167
 {id:'plano',name:'Pasarela',tone:6,weight:.92,parts:[[[-1.2,-.24],[1.2,-.24],[1.2,.24],[-1.2,.24]]]}, // .912 x .182
 {id:'peso',name:'Contrapeso',tone:3,weight:2.0,parts:[[[-.66,-.5],[.66,-.5],[.66,.5],[-.66,.5]]]},  // .502 x .38
 {id:'soporte',name:'Apoyo de arco',tone:0,weight:1.05,parts:[[[-.42,-.61],[.42,-.61],[.42,.61],[-.42,.61]]]} // .319 x .464
 ,
  {id:'medio_pilar',name:'Medio pilar',tone:2,weight:1.1,parts:[[[-.365,-.4],[.365,-.4],[.365,.4],[-.365,.4]]]},
  {id:'media_piedra',name:'Ladrillo estructural',tone:0,weight:1.2,parts:[[[-.5,-.25],[.5,-.25],[.5,.25],[-.5,.25]]]},
  {id:'medio_peso',name:'Medio contrapeso',tone:3,weight:1.6,parts:[[[-.66,-.25],[.66,-.25],[.66,.25],[-.66,.25]]]},
  {id:'medio_soporte',name:'Medio apoyo',tone:0,weight:1.05,parts:[[[-.42,-.305],[.42,-.305],[.42,.305],[-.42,.305]]]},
  {id:'gran_viga',name:'Plataforma de cimientos',tone:4,weight:.75,parts:[[[-2.78,-.21],[2.78,-.21],[2.78,.21],[-2.78,.21]]]}

]);
const HEIGHTS={medio_pilar:.304,media_piedra:.19,medio_peso:.19,medio_soporte:.2318,gran_viga:.1596,cubo:.38,ancho:.2204,alto:.608,fino:.1292,pil:.608,viga:.171,techo:.1672,plano:.1824,peso:.38,soporte:.4636};
function part(shape,x,bottom=FLOOR){const h=HEIGHTS[shape];if(!h)throw Error('Unknown demolition shape '+shape);return {shape,x:+x.toFixed(5),y:+(bottom+h/2).toFixed(5),angle:0}}
function tower(x,shapes,bottom=FLOOR){const blocks=[];for(const shape of shapes){blocks.push(part(shape,x,bottom));bottom+=HEIGHTS[shape]}return blocks}
function at(x,shape,bottom){return part(shape,x,bottom)}
function figureParts(family,v){
 const add=[],put=(shape,x,bottom=FLOOR)=>add.push(part(shape,x,bottom));
 const stack=(x,shapes,bottom=FLOOR)=>add.push(...tower(x,shapes,bottom));
 const H=FLOOR+.608, bridgeTop=H+.171, planeTop=H+.1824;
 // v in 0...3 grows the structure rather than merely making its column taller.
 switch(family){
 case 0: // OPEN ARCH: one column is a critical support for roof and load.
   stack(-.39,['pil']);stack(.39,['pil']);put('viga',0,H);
   stack(v%2?-.26:.26,v>1?['cubo','cubo']:['peso'],bridgeTop);
   if(v===3)put('cubo',.28,bridgeTop);break;
 case 1: // MUSHROOM, one tiny stem below a heavy canopy.
   stack(0,['pil']);put(v>=2?'techo':'viga',0,H);
   put('peso',-.31,H+(v>=2?.1672:.171));
   put('peso',.31,H+(v>=2?.1672:.171));
   if(v%2)put('cubo',0,H+(v>=2?.1672:.171)+.38);
   if(v===3)put('cubo',.29,H+.1672+.38);break;
 case 2: // HAMMER: overhanging head balances over an offset handle.
   stack(v>=2?-.08:-.24,['pil']);put('techo',-.07,H);
   put('peso',-.48,H+.1672);put('cubo',.33,H+.1672);
   if(v>=1)put('cubo',-.5,H+.1672+.38);
   if(v>=2)put('peso',.27,H+.1672+.38);
   if(v===3)put('cubo',-.46,H+.1672+.76);break;
 case 3: // SEESAW: removing weight shifts long suspended plank.
   stack(0,['soporte']);put('techo',0,FLOOR+.4636);
   stack(-.43,v>1?['peso','cubo']:['peso'],FLOOR+.4636+.1672);
   stack(.43,v%2?['cubo','peso']:['peso'],FLOOR+.4636+.1672);
   if(v===3)put('cubo',0,FLOOR+.4636+.1672);break;
 case 4: // DOUBLE ARCH: centre support carries two independently loaded bridges.
   stack(-.75,['pil']);stack(0,['pil']);stack(.75,['pil']);
   put('plano',-.47,H);put('plano',.47,H);
   put('cubo',v%2?-.5:-.25,planeTop);
   put('cubo',v%2?.25:.5,planeTop);
   if(v>=1)put('cubo',-.34,planeTop+.38);
   if(v>=2)put('peso',.33,planeTop+.38);
   if(v===3)put('cubo',.37,planeTop+.76);break;
 case 5: // GATEWAY: two columns, a lintel and an asymmetrical castle turret.
   stack(-.47,['soporte','cubo']);stack(.47,['soporte','cubo']);
   const gateTop=FLOOR+.4636+.38;
   put('techo',0,gateTop);
   stack(v%2?-.33:.33,v>1?['peso','cubo']:['cubo'],gateTop+.1672);
   if(v>=2)put('cubo',v%2?.36:-.36,gateTop+.1672);
   if(v===3)put('cubo',0,gateTop+.1672);break;
 case 6: // CRANE: long boom and counterweight sit on a narrow stem.
   stack(-.22,['pil']);if(v===3)stack(.33,['pil']);put('techo',-.10,H);
   stack(-.53,v>1?['peso','cubo']:['peso'],H+.1672);
   stack(.31,v%2?['cubo','cubo']:['cubo'],H+.1672);
   if(v===1)put('cubo',-.53,H+.1672+.38);
   if(v===3)put('peso',.28,H+.1672+.76);break;
 case 7: // TWO FLOORS: delicate pillared bridge supports a second skybridge.
   stack(-.38,['pil']);stack(.38,['pil']);put('viga',0,H);
   stack(-.28,['soporte'],bridgeTop);stack(.28,['soporte'],bridgeTop);
   const sky=bridgeTop+.4636;
   put(v>=2?'techo':'plano',0,sky);
   put('cubo',v%2?.34:-.34,sky+(v>=2?.1672:.1824));
   if(v>=1)put('cubo',v%2?-.28:.28,sky+(v>=2?.1672:.1824));
   if(v===3)put('cubo',0,sky+(v>=2?.1672:.1824)+.38);break;
 case 8: // ZIGZAG / BALCONIES: posts offset from each other plus canopy.
   stack(-.41,['pil']);stack(.39,['pil']);put('techo',0,H);
   stack(-.34,['soporte'],H+.1672);
   const upper=H+.1672+.4636;
   put('plano',-.26,upper);
   stack(v%2?-.48:-.36,v>=2?['peso','cubo']:['peso'],upper+.1824);
   if(v>=1)put('cubo',.33,H+.1672);
   if(v===3)put('cubo',.12,upper+.1824);break;
 case 9: // CHAIN / CASTLE: three pillars with one bridging roof per bay.
   stack(-.69,['soporte']);stack(0,['soporte']);stack(.69,['soporte']);
   const cap=FLOOR+.4636;
   put('plano',-.47,cap);put('plano',.47,cap);
   stack(v%2?-.41:-.29,['peso'],cap+.1824);
   stack(v%2?.23:.42,['cubo'],cap+.1824);
   if(v>=1)put('cubo',v%2?.23:.42,cap+.1824+.38);
   if(v>=2)put('cubo',-.31,cap+.1824+.38);
   if(v===3)put('cubo',.23,cap+.1824+.76);break;
 }
 return add;
}
const FIGURE_NAMES=[
 'Arco traicionero','Hongo explosivo','Martillo del caos','Balancín loco','Doble portal',
 'Castillo de una pieza','Grúa peligrosa','Puente de dos pisos','Balcón zigzag','Cadena de castillos',
 'Portal envenenado','Seta gigante','Martillo inclinado','Balancín tramposo','Arcos gemelos',
 'Castillo con almena','Grúa del derrumbe','Pasarela en el aire','Terraza imposible','Tres fortalezas',
 'Arco de cristal','Hongos colosales','Martillo con contrapeso','La báscula mortal','Doble efecto dominó',
 'La fortaleza hueca','Grúa de doble peso','Skybridge colgante','Dientes de serpiente','El acueducto',
 'Puerta del desastre','Hongo radioactivo','Martillo del juicio','Balancín apocalíptico','Murallas enlazadas',
 'Castillo que tiembla','Grúa final','Doble puente extremo','El último voladizo','Cascada de portales'
];
const ROUNDS=10,ROUND_SECONDS=42;
// Structural grammar V3: split a support into independently removable joint
// pieces and distribute its load over a redundant foundation with 3-5 legs.
// There is deliberately no marked winning brick: the player must choose a
// sequence of THREE supports, balancing safe moves against a chain collapse.
function puzzleParts(upper,tier,family){
 const floorTop=FLOOR+.38,roofBottom=floorTop,splitDeck=family%3!==0&&family!==2,roofTop=roofBottom+(splitDeck?HEIGHTS.plano:HEIGHTS.gran_viga);
 const xPositions=(family%2===0?[-.77,-.25,.25,.77]:[-.75,-.28,.28,.75]);
 const base=[];
 // Two halves of every foundation block, 6-10 independently touchable parts.
 for(const x of xPositions){
  base.push(part('media_piedra',x,FLOOR),part('media_piedra',x,FLOOR+.19));
 }
 if(splitDeck){base.push(part('plano',-.465,roofBottom),part('plano',.465,roofBottom))}
 else base.push(part('gran_viga',0,roofBottom));
 const offset=roofTop-FLOOR;
 const top=[];
 let splits=0;
 for(const original of upper){
  const h=HEIGHTS[original.shape];
  const bottom=original.y-h/2+offset;
  let halves=null;
  if(original.shape==='pil'&&!((tier===4&&family===0)||(tier===3&&family===4)))halves=['medio_pilar','medio_pilar'];
  else if(original.shape==='soporte')halves=['medio_soporte','medio_soporte'];
  else if(original.shape==='peso')halves=['medio_peso','medio_peso'];
  else if(original.shape==='cubo'&&(splits<=(tier===1?2:tier===2?4:6)||family%2===0))halves=['media_piedra','media_piedra'];
  if(halves){
   let y=bottom;
   for(const shape of halves){top.push(part(shape,original.x,y));y+=HEIGHTS[shape]}
   splits++;
  }else top.push(part(original.shape,original.x,bottom));
 }
 // All added elements are simulated by Rapier in the identical coordinate
 // system as the original stack, not welded/fixed to anything.
 return base.concat(top);
}
const FIGURES=FIGURE_NAMES.map((title,id)=>{
 const tier=Math.floor(id/10)+1;
 const blocks=puzzleParts(figureParts(id%10,tier-1),tier,id%10);
 return Object.freeze({
  id,title,tier:Math.floor(id/10)+1,family:id%10,
  blocks:Object.freeze(blocks.map(b=>Object.freeze(b)))
 });
});
function plan(random=Math.random){
 const order=[];
 // Increasing difficulty without always seeing the same figures or order.
 for(const [tier,count] of [[1,2],[2,3],[3,3],[4,2]]){
  const pool=FIGURES.filter(f=>f.tier===tier);
  for(let i=pool.length-1;i>0;i--){
   const k=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));
   [pool[i],pool[k]]=[pool[k],pool[i]];
  }
  order.push(...pool.slice(0,count));
 }
 return order;
}
function roundPoints(fallen,removed){
 const f=Math.max(0,Math.floor(fallen)),r=Math.max(0,Math.floor(removed));
 return f*100+r*20+Math.max(0,f-1)*50;
}
function timeBonus(seconds,used){
 return used>=3?Math.max(0,Math.ceil(seconds))*2:0;
}

const api={COLORS,color,pointInPolygon,hitAt,isTap,DEMOLITION_SHAPES,FIGURES,ROUNDS,ROUND_SECONDS,plan,roundPoints,timeBonus};
root.TorreDemolition=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
