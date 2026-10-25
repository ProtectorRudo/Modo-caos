'use strict';
/* Catálogo: melodías de composiciones de dominio público, interpretadas por síntesis original.
   Éxitos comerciales: únicamente selección LOCAL (archivo elegido por el jugador, nunca enviado). */
(function(root){
const SONGS=root.RitmoCore.SONGS;
function phrase(notes,unit=1){let t=0;return notes.map(([m,d])=>{const a={at:t,midi:m,length:d*unit};t+=d*unit;return a})}
const m=(...pairs)=>phrase(pairs);
const joyLine1=[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62];
const joyLine2=[64,64,65,67,67,65,64,62,60,60,62,64,62,60,60];
const joyMiddle=[62,62,64,60,62,64,65,64,60,62,64,65,64,62,60,62,55];
const joy=[...joyLine1,...joyLine2,...joyMiddle,...joyLine2].map((n,i)=>[n,i%15===14?2:1]);
const elise=[
[76,.5],[75,.5],[76,.5],[75,.5],[76,.5],[71,.5],[74,.5],[72,.5],[69,1.5],
[60,.5],[64,.5],[69,.5],[71,1.5],[64,.5],[68,.5],[71,.5],[72,1.5],
[64,.5],[76,.5],[75,.5],[76,.5],[75,.5],[76,.5],[71,.5],[74,.5],[72,.5],[69,1.5],
[60,.5],[64,.5],[69,.5],[71,1.5],[64,.5],[72,.5],[71,.5],[69,2]
];
// Célebre motivo de la obertura Guillermo Tell (Rossini), arreglo de sintetizador.
const tell=[[60,.5],[60,.5],[60,.5],[60,.5],[60,.5],[60,.5],[60,1],
[64,.5],[64,.5],[64,.5],[64,.5],[64,.5],[64,.5],[64,1],
[67,.5],[67,.5],[67,.5],[67,.5],[67,.5],[67,.5],[67,1],
[72,1],[71,1],[69,1],[67,1],[65,1],[64,1],[62,1],[60,2]];
const classics=[
 ['alegria',{title:'ODA A LA ALEGRÍA · BEETHOVEN',genre:'Clásico remix',bpm:110,bars:32,bass:48,scale:[0,2,4,5,7],lead:[0,2,4,5,7],beat:3,publicDomain:true,melody:phrase(joy),instrument:'brass'}],
 ['elise',{title:'PARA ELISA · BEETHOVEN',genre:'Clásico remix',bpm:118,bars:36,bass:45,scale:[0,3,4,7,9],lead:[0,3,4,7,9],beat:4,publicDomain:true,melody:phrase(elise),instrument:'keys'}],
 ['guillermo',{title:'GUILLERMO TELL · ROSSINI',genre:'Clásico remix',bpm:132,bars:40,bass:48,scale:[0,2,4,5,7],lead:[0,2,4,5,7],beat:5,publicDomain:true,melody:phrase(tell),instrument:'brass'}]
];
for(const [id,config] of classics)SONGS[id]=config;
const modern=[
 ['despacito',{title:'DESPACITO · LUIS FONSI',genre:'Hit latino · archivo local',bpm:89,bars:28,bass:45,scale:[0,2,4,7,9],lead:[0,2,4,7,9],beat:6,requiresFile:true}],
 ['blinding',{title:'BLINDING LIGHTS · THE WEEKND',genre:'Hit pop · archivo local',bpm:171,bars:52,bass:48,scale:[0,2,4,7,9],lead:[0,4,7,9],beat:7,requiresFile:true}],
 ['levitating',{title:'LEVITATING · DUA LIPA',genre:'Hit pop · archivo local',bpm:103,bars:32,bass:48,scale:[0,2,4,7,9],lead:[0,2,4,7,9],beat:8,requiresFile:true}]
];
for(const [id,config] of modern)SONGS[id]=config;
root.RitmoCatalog={classics:classics.map(([id])=>id),modern:modern.map(([id])=>id)};
})(window);
