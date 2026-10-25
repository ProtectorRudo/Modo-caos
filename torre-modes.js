(function(root){
'use strict';
const MODES={
 infinite:{id:'infinite',name:'Torre Infinita',icon:'🏗️',short:'¡Una pieza más!',description:'Elegí bloques y levantá la torre más alta que puedas. Si se derrumba, perdés.',seconds:0,goal:0,limit:65},
 balance:{id:'balance',name:'Equilibrio Mortal',icon:'⚖️',short:'La base se achica',description:'En 60 segundos, construí sobre una plataforma que se estrecha cada dos bloques. Si cae, perdés.',seconds:60,goal:0,limit:35},
 heavy:{id:'heavy',name:'Peso Pesado',icon:'💪',short:'Distribuí el peso',description:'En 60 segundos, construí sobre una balanza física. Evitá una inclinación de más de 22°.',seconds:60,goal:0,limit:35},
 copy:{id:'copy',name:'Copiá la Figura',icon:'🧩',short:'Construí la silueta',description:'Tenés 75 segundos y tres bloques: armá el puente exactamente como se muestra en el modelo.',seconds:75,goal:0,limit:3},
 five:{id:'five',name:'Cinco Piezas',icon:'🎯',short:'Solo cinco intentos',description:'Con exactamente cinco bloques, conseguí una torre estable de 90 cm o más.',seconds:0,goal:.90,limit:5},
 demolition:{id:'demolition',name:'Demolición Caótica',icon:'💥',short:'Sacá el bloque clave',description:'Tres extracciones. Elegí bloques de la estructura y derribá tantos como puedas en 60 segundos.',seconds:60,goal:4,limit:3}
};
const MODE_ORDER=['infinite','balance','heavy','copy','five','demolition'];
const TARGET=[
 {id:'left',shape:'cubo',x:-.21,y:.307,angle:0},
 {id:'right',shape:'cubo',x:.21,y:.307,angle:0},
 {id:'cap',shape:'ancho',x:0,y:.607,angle:0}
];
function get(id){return MODES[id]||MODES.infinite}
function boardHalfWidth(mode,placed){return mode==='balance'?Math.max(.42,1.05-Math.floor(Math.max(0,placed)/2)*.135):1.25}
function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function matchTarget(bodies,shapes){
 if(bodies.length!==TARGET.length)return {won:false,matched:0,total:3};
 let remaining=bodies.map(b=>({...b}));
 let count=0;
 for(const t of TARGET){
  const idx=remaining.findIndex(b=>b.shape===t.shape&&Math.abs(b.x-t.x)<.20&&Math.abs(b.y-t.y)<.16&&Math.abs(angleDelta(b.angle,t.angle))<.36);
  if(idx>=0){count++;remaining.splice(idx,1)}
 }
 return {won:count===TARGET.length,matched:count,total:3};
}
function demolitionScore(original,current,removedIds){
 let fallen=0;
 for(const p of current){
  const prior=original.find(item=>item.id===p.id);
  if(!prior)continue;
  if(prior.y-p.y>.26||Math.abs(prior.x-p.x)>.4||Math.abs(angleDelta(prior.angle,p.angle))>.88||p.y<-.25)fallen++;
 }
 return {fallen,removed:removedIds.length,points:fallen*100+removedIds.length*20};
}
function outcome(mode,{height=0,placed=0,timeLeft=0,tilt=0,matched=0,fallen=0}={}){
 switch(mode){
  case 'five':return {won:placed===5&&height>=.90,title:height>=.90?'¡OBJETIVO CUMPLIDO!':'FALTÓ ALTURA',detail:'Meta: 90 cm · Tus cinco piezas'};
  case 'copy':return {won:matched>=3,title:matched>=3?'¡FIGURA PERFECTA!':'FIGURA INCOMPLETA',detail:matched+'/3 bloques bien ubicados'};
  case 'demolition':return {won:fallen>=4,title:fallen>=4?'¡DEMOLICIÓN MAESTRA!':'DEMOLICIÓN TERMINADA',detail:fallen+' bloques derribados'};
  case 'heavy':return {won:height>.45,title:'¡TIEMPO CUMPLIDO!',detail:'Inclinación final '+Math.round(tilt*180/Math.PI)+'°'};
  case 'balance':return {won:height>.45,title:'¡TIEMPO CUMPLIDO!',detail:'Altura estable '+Math.round(height*100)+' cm'};
  default:return {won:false,title:'TORRE DERRUMBADA',detail:'La gravedad ganó'};
 }
}
const api={MODES,MODE_ORDER,TARGET,get,boardHalfWidth,matchTarget,demolitionScore,outcome,angleDelta};
root.TorreModes=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
