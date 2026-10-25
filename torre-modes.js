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
const TARGET_NAMES...[truncated]