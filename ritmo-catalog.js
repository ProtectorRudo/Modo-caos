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
// Villancico tradicional Jingle Bells, obra de J. Pierpont (1857), partitura de dominio público.
const jingle=[[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1],[62,1],[64,4],
[65,1],[65,1],[65,2],[65,1],[64,1],[64,2],[64,1],[62,1],[62,1],[64,1],[62,2],[67,2]];
const classics=[
 ['alegria',{title:'ODA A LA ALEGRÍA · BEETHOVEN',genre:'Clásico remix',bpm:110,bars:32,bass:48,scale:[0,2,4,5,7],lead:[0,2,4,5,7],beat:3,publicDomain:true,melody:phrase(joy),instrument:'brass'}],
 ['elise',{title:'PARA ELISA · BEETHOVEN',genre:'Clásico remix',bpm:118,bars:36,bass:45,scale:[0,3,4,7,9],lead:[0,3,4,7,9],beat:4,publicDomain:true,melody:phrase(elise),instrument:'keys'}],
 ['jingle',{title:'JINGLE BELLS · REMIX',genre:'Clásico popular',bpm:126,bars:36,bass:48,scale:[0,2,4,5,7],lead:[0,2,4,5,7],beat:5,publicDomain:true,melody:phrase(jingle),instrument:'brass'}]
];
for(const [id,config] of classics)SONGS[id]=config;
const modern=[
 ['despacito',{title:'DESPACITO · LUIS FONSI',genre:'Hit latino · archivo local',bpm:89,bars:28,bass:45,scale:[0,2,4,7,9],lead:[0,2,4,7,9],beat:6,requiresFile:true}],
 ['blinding',{title:'BLINDING LIGHTS · THE WEEKND',genre:'Hit pop · archivo local',bpm:171,bars:52,bass:48,scale:[0,2,4,7,9],lead:[0,4,7,9],beat:7,requiresFile:true}],
 ['levitating',{title:'LEVITATING · DUA LIPA',genre:'Hit pop · archivo local',bpm:103,bars:32,bass:48,scale:[0,2,4,7,9],lead:[0,2,4,7,9],beat:8,requiresFile:true}],
 ['titi',{title:'TITÍ ME PREGUNTÓ · BAD BUNNY',genre:'Reggaetón · archivo local',bpm:107,bars:32,bass:41,scale:[0,2,3,5,7],lead:[0,2,3,5,7],beat:9,requiresFile:true}],
 ['provenza',{title:'PROVENZA · KAROL G',genre:'Urbano latino · archivo local',bpm:111,bars:32,bass:41,scale:[0,2,3,5,7],lead:[0,2,3,5,7],beat:10,requiresFile:true}]
];
for(const [id,config] of modern)SONGS[id]=config;
root.RitmoCatalog={classics:classics.map(([id])=>id),modern:modern.map(([id])=>id)};
})(window);
