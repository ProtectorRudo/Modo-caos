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

// Forty authored, physically buildable silhouettes. Each entry is a column
// profile; every cube rests on the floor or precisely on a cube below it.
// Unlike the old flush two-column wall, early figures feature tall isolated
// pillars and open valleys: removing a support can trigger a visible cascade.
const FIGURE_PROFILES=[
 // Tier 1: playful, immediately readable, 3 clear choices.
 [1,3,1],[2,3,1],[1,3,2],[3,1,2],[2,1,3],
 [1,2,3],[3,2,1],[1,2,2],[2,2,1],[2,1,2],
 // Tier 2: taller towers and asymmetric crests.
 [1,4,2],[2,4,1],[2,3,3],[3,3,2],[3,1,4],
 [4,1,3],[1,3,4],[4,3,1],[3,2,3],[2,4,2],
 // Tier 3: wider bridges, four towers, riskier choices.
 [1,2,4,2],[2,4,1,2],[3,1,4,2],[1,4,2,3],[2,3,1,4],
 [4,1,3,2],[2,4,3,1],[3,2,4,1],[1,3,4,3],[3,4,2,1],
 // Tier 4: spectacular final profiles.
 [3,4,2,3],[4,2,4,2],[3,2,4,4],[4,3,4,1],[2,4,4,3],
 [3,4,4,2],[4,4,2,3],[2,3,4,4],[4,3,2,4],[3,4,3,3]
];
const FIGURE_NAMES=[
 'Castillo loco','Corona partida','Torre del dragón','Trampa lateral','La gran grieta',
 'Tres escalones','La cascada','Mini muralla','Escalera invertida','Dos guardianes',
 'La aguja','Cascada gemela','Doble desafío','Muralla desigual','La fortaleza',
 'Colmillos','La torre torcida','La emboscada','Tres almenas','Reyes enfrentados',
 'El acueducto','Tren de torres','Pasillo mortal','El portal','Cuatro vientos',
 'Puente desparejo','Serpiente de piedra','Escalera salvaje','Picos y valles','La montaña',
 'Ciudad caótica','Muralla final','El volcán','El castillo final','Fortín dorado',
 'La ciudad imposible','Cuatro colosos','Torres de choque','El laberinto','Apocalipsis'
];
const ROUNDS=10;
const ROUND_SECONDS=32;
const FIGURES=FIGURE_PROFILES.map((heights,id)=>{
 const tier=Math.floor(id/10)+1,columns=heights.length;
 const pieces=heights.flatMap((height,col)=>Array.from({length:height},(_,row)=>({
  shape:'cubo',x:(col-(columns-1)/2)*.43,y:.307+row*.384,angle:0
 })));
 return Object.freeze({
  id,title:FIGURE_NAMES[id],tier,
  heights:Object.freeze([...heights]),
  blocks:Object.freeze(pieces.map(b=>Object.freeze(b)))
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

const api={COLORS,color,pointInPolygon,hitAt,isTap,FIGURES,ROUNDS,ROUND_SECONDS,plan,roundPoints,timeBonus};
root.TorreDemolition=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
