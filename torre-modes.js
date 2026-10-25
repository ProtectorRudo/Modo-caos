(function(root){
'use strict';
const MODES={
 infinite:{id:'infinite',name:'Torre Infinita',icon:'🏗️',short:'¡Una pieza más!',description:'Elegí bloques y levantá la torre más alta que puedas. Si se derrumba, perdés.',seconds:0,goal:0,limit:65},
 balance:{id:'balance',name:'Equilibrio Mortal',icon:'⚖️',short:'La base se achica',description:'En 60 segundos, construí sobre una plataforma que se estrecha cada dos bloques. Si cae, perdés.',seconds:60,goal:0,limit:35},
 heavy:{id:'heavy',name:'Peso Pesado',icon:'💪',short:'Distribuí el peso',description:'En 60 segundos, construí sobre una balanza física. Evitá una inclinación de más de 22°.',seconds:60,goal:0,limit:35},
 copy:{id:'copy',name:'Copiá la Figura',icon:'🧩',short:'Construí la silueta',description:'Mirá la imagen de referencia y armá esa figura en TU plataforma. Elegí las tres piezas en el orden que quieras. Tenés 75 segundos.',seconds:75,goal:0,limit:3},
 five:{id:'five',name:'Cinco Piezas',icon:'🎯',short:'Solo cinco intentos',description:'Con exactamente cinco bloques, conseguí una torre estable de 175 cm o más.',seconds:0,goal:1.75,limit:5},
 demolition:{id:'demolition',name:'Demolición Caótica',icon:'💥',short:'¡10 rondas y 40 figuras!',description:'10 rondas, 10 figuras distintas elegidas de 40. Tenés 3 extracciones por torre y 32 segundos por ronda. Tocá cada bloque directamente y acumulá puntos.',seconds:42,goal:10,limit:3}
};
const MODE_ORDER=['infinite','balance','heavy','copy','five','demolition'];
const TARGET=[
 {id:'left',shape:'cubo',x:-.21,y:.307,angle:0},
 {id:'right',shape:'cubo',x:.21,y:.307,angle:0},
 {id:'cap',shape:'ancho',x:0,y:.607,angle:0}
];
const TARGETS=[
 TARGET,
 [
  {id:'base',shape:'cubo',x:0,y:.307,angle:0},
  {id:'middle',shape:'ancho',x:0,y:.605,angle:0},
  {id:'top',shape:'alto',x:0,y:1.02,angle:0}
 ],
 [
  {id:'base',shape:'ancho',x:0,y:.227,angle:0},
  {id:'walls',shape:'cubo',x:0,y:.526,angle:0},
  {id:'roof',shape:'triangulo',x:0,y:.914,angle:0}
 ]
];
const TARGET_NAMES=['PUENTE','TÓTEM','CASITA'];
function get(id){return MODES[id]||MODES.infinite}
function boardHalfWidth(mode,placed){return mode==='balance'?Math.max(.42,1.05-Math.floor(Math.max(0,placed)/2)*.135):1.25}
function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
// Match the player's construction AGAINST a separate reference drawing.
// Translation on the platform is permitted: it's the relative geometry that
// matters, not whether somebody places the structure at our sample X origin.
// Nothing here moves, snaps, or changes any Rapier body.
function matchTarget(bodies,target=TARGET){
 const total=target.length;
 if(!Array.isArray(bodies)||!total)return {won:false,matched:0,total};
 const source=bodies.filter(b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.angle));
 const offsets=[0];
 for(const piece of source)for(const guide of target){
  if(piece.shape===guide.shape){
   const dx=piece.x-guide.x;
   if(Math.abs(dx)<=.94)offsets.push(dx);
  }
 }
 let best=0;
 for(const dx of offsets){
  const used=new Set();
  function count(index){
   if(index>=source.length)return 0;
   const b=source[index];let max=count(index+1);
   for(let i=0;i<total;i++){
    const t=target[i];
    if(used.has(i)||b.shape!==t.shape)continue;
    if(Math.abs(b.x-(t.x+dx))>.17||Math.abs(b.y-t.y)>.16)continue;
    if(Math.abs(angleDelta(b.angle,t.angle))>.36)continue;
    used.add(i);max=Math.max(max,1+count(index+1));used.delete(i);
   }
   return max;
  }
  best=Math.max(best,count(0));
  if(best===total)break;
 }
 return {won:source.length===total&&best===total,matched:best,total};
}
function demolitionScore(original,current,removedIds){
 let fallen=0;
 for(const p of current){
  const prior=original.find(item=>item.id===p.id);
  if(!prior)continue;
  if(prior.y-p.y>.16||Math.abs(prior.x-p.x)>.23||Math.abs(angleDelta(prior.angle,p.angle))>.58||p.y<-.25)fallen++;
 }
 return {fallen,removed:removedIds.length,points:fallen*100+removedIds.length*20};
}
function outcome(mode,{height=0,placed=0,timeLeft=0,tilt=0,matched=0,fallen=0}={}){
 switch(mode){
  case 'five':return {won:placed===5&&height>=1.75,title:placed===5&&height>=1.75?'¡OBJETIVO CUMPLIDO!':'FALTÓ ALTURA',detail:'Meta: 175 cm · Tus cinco piezas'};
  case 'copy':return {won:matched>=3,title:matched>=3?'¡FIGURA PERFECTA!':'FIGURA INCOMPLETA',detail:matched+'/3 bloques bien ubicados'};
  case 'demolition':return {won:fallen>=4,title:fallen>=4?'¡DEMOLICIÓN MAESTRA!':'DEMOLICIÓN TERMINADA',detail:fallen+' bloques derribados'};
  case 'heavy':return {won:height>.45,title:'¡TIEMPO CUMPLIDO!',detail:'Inclinación final '+Math.round(tilt*180/Math.PI)+'°'};
  case 'balance':return {won:height>.45,title:'¡TIEMPO CUMPLIDO!',detail:'Altura estable '+Math.round(height*100)+' cm'};
  default:return {won:false,title:'TORRE DERRUMBADA',detail:'La gravedad ganó'};
 }
}
const api={MODES,MODE_ORDER,TARGET,TARGETS,TARGET_NAMES,get,boardHalfWidth,matchTarget,demolitionScore,outcome,angleDelta};
root.TorreModes=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
