'use strict';
/* Ritmo Caos: reglas deterministas e independientes de WebXR y del render. */
(function(root){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const COLORS=['#4cff85','#ff5274','#ffd34c','#438eff','#ff9b38'];
const SONGS={
 neon:{title:'NEÓN SIN FRENO',genre:'Electrónica',bpm:112,bars:32,bass:55,scale:[0,3,5,7,10],lead:[0,3,5,7,10,7,5,3],beat:0},
 fuego:{title:'FUEGO EN EL ESCENARIO',genre:'Rock',bpm:100,bars:28,bass:41,scale:[0,2,3,5,7,10],lead:[0,7,5,3,2,3,5,7],beat:1},
 solar:{title:'SOLAR LATINO',genre:'Pop latino',bpm:104,bars:32,bass:49,scale:[0,2,4,7,9],lead:[0,2,4,7,9,7,4,2],beat:2}
};
function random(seed){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}}
function chart(songId='neon',difficulty='normal',laneWidth=.31){
 const song=SONGS[songId]||SONGS.neon,rand=random((song.beat+1)*972641+song.bpm);
 const active=difficulty==='facil'?[1,2,3]:[0,1,2,3,4];
 const beat=60/song.bpm,duration=song.bars*4*beat;
 const notes=[];let lane=2,lastAt=0;
 const spacing={facil:2.5,normal:2,dificil:1.5,caos:1.25}[difficulty]||2;
 let beatIndex=4;
 while(beatIndex<song.bars*4-3){
  let when=beatIndex*beat,dt=when-lastAt;
  let maxHops=Math.max(0,Math.floor((dt*.70-.12)/laneWidth));
  const possible=active.filter(c=>Math.abs(c-lane)<=maxHops);
  const options=possible.length?possible:[lane];
  const phrase=Math.floor(beatIndex/4),desired=song.lead[(phrase+Math.floor(rand()*3))%song.lead.length]%5;
  // Preference for melody movement, without ever requesting impossible physical transitions.
  options.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired));
  const fromLane=lane;
  lane=rand()<.67?options[0]:options[Math.floor(rand()*options.length)];
  const seq=notes.length;
  const chaos=(seq>25&&seq%29===28),special=(seq%17===16),hold=(seq>4&&seq%13===9);
  const slide=(seq>8&&seq%19===12&&difficulty!=='facil'&&fromLane!==lane);
  let type=chaos?'caos':special?'special':hold?'hold':slide?'slide':'simple';
  const holdTime=hold?Math.min(.64,spacing*beat*.42):0;
  notes.push({id:seq,lane,fromLane,at:when,type,hold:holdTime,slideDuration:slide?Math.min(.73,dt*.72):0,beat:beatIndex,
    pitch:song.lead[(Math.floor(beatIndex/2)+song.beat)%song.lead.length],status:'pending'});
  lastAt=when;beatIndex+=spacing;
  if(difficulty==='caos'&&seq%17===14)beatIndex+=.25;
 }
 return {songId,song,difficulty,notes,duration,beat,laneWidth,active};
}
function make(songId='neon',difficulty='normal',laneWidth=.31){
 const c=chart(songId,difficulty,laneWidth);
 return {...c,state:'ready',elapsed:0,cursor:0,lane:2,offset:0,score:0,combo:0,bestCombo:0,perfect:0,great:0,good:0,miss:0,
 energy:55,events:[],judged:0,holdActive:null,slideActive:null,enteredAt:0,lastLane:2,paused:false};
}
function reset(g){Object.assign(g,make(g.songId,g.difficulty,g.laneWidth));return g}
function start(g){if(g.state!=='ready')return false;g.state='playing';return true}
function setPosition(g,x,t=g.elapsed){
 if(!Number.isFinite(x))return;
 const c=clamp(x,0,4),lane=clamp(Math.round(c),0,4);
 if(lane!==g.lastLane){g.enteredAt=t;g.lastLane=lane}
 g.offset=c;g.lane=lane;
}
function multiplier(combo){return combo>=30?4:combo>=20?3:combo>=10?2:1}
function resolve(g,n,rating){
 if(n.status!=='pending')return;
 n.status=rating;n.hitAt=g.elapsed;g.judged++;
 if(rating==='FALLO'){g.miss++;g.combo=0;g.energy=clamp(g.energy-12,0,100)}
 else{
  g.combo++;g.bestCombo=Math.max(g.combo,g.bestCombo);
  if(rating==='PERFECTO')g.perfect++;
  else if(rating==='GENIAL')g.great++;else g.good++;
  const base=rating==='PERFECTO'?1000:rating==='GENIAL'?700:400;
  const points=Math.round(base*multiplier(g.combo)*(n.type==='caos'?2:n.type==='special'?1.6:1));
  g.score+=points;g.energy=clamp(g.energy+(rating==='PERFECTO'?4:2),0,100);
 }
 if(g.slideActive?.id===n.id)g.slideActive=null;
 g.events.push({type:'judgement',rating,note:n.id,lane:n.lane,combo:g.combo,score:g.score,special:n.type==='caos'});
 if(g.events.length>18)g.events.shift();
}
function tick(g,time){
 if(g.state!=='playing'||g.paused)return;
 if(!Number.isFinite(time))return;
 g.elapsed=Math.max(g.elapsed,clamp(time,0,g.duration+.5));
 const slideNote=g.notes[g.cursor];
 if(slideNote?.type==='slide'&&slideNote.status==='pending'&&g.elapsed>=slideNote.at-slideNote.slideDuration-.045&&g.elapsed<=slideNote.at+.24){
  if(!g.slideActive||g.slideActive.id!==slideNote.id)g.slideActive={id:slideNote.id,seenSource:false,moved:false};
  if(Math.abs(g.offset-slideNote.fromLane)<.52)g.slideActive.seenSource=true;
  if(Math.abs(g.offset-slideNote.fromLane)>.55)g.slideActive.moved=true;
 }
 if(g.holdActive){
  const n=g.holdActive;
  if(g.lane!==n.lane){resolve(g,n,'FALLO');g.holdActive=null;g.cursor++}
  else if(g.elapsed>=n.at+n.hold){resolve(g,n,'PERFECTO');g.holdActive=null;g.cursor++}
 }
 while(g.cursor<g.notes.length){
  const n=g.notes[g.cursor];
  if(n.status!=='pending'){g.cursor++;continue}
  const delta=g.elapsed-n.at;
  if(delta<-.055)break;
  if(delta>.24){resolve(g,n,'FALLO');g.cursor++;continue}
  if(g.holdActive)break;
  if(g.lane===n.lane){
   if(n.type==='slide'&&(!g.slideActive?.seenSource||!g.slideActive?.moved)){
    if(delta>.12){resolve(g,n,'FALLO');g.cursor++;continue}
    break;
   }
   if(n.type==='hold'){g.holdActive=n;break}
   const centered=Math.abs(g.offset-n.lane);
   const rating=centered<.21&&Math.abs(delta)<.085?'PERFECTO':centered<.32&&Math.abs(delta)<.17?'GENIAL':'BIEN';
   resolve(g,n,rating);g.cursor++;continue;
  }
  break;
 }
 if(g.elapsed>=g.duration&&g.cursor>=g.notes.length){g.state='finished';g.events.push({type:'finish'});}
}
function accuracy(g){return g.judged?Math.round((g.perfect+g.great*.7+g.good*.4)/g.judged*100):0}
function ranking(g){const a=accuracy(g);return a>=96?'LEYENDA DEL RITMO':a>=85?'ESTRELLA':a>=70?'ARTISTA':a>=50?'PROMESA':'¡SEGUÍ EL RITMO!'}
root.RitmoCore={COLORS,SONGS,chart,make,reset,start,setPosition,tick,multiplier,accuracy,ranking};
})(typeof window!=='undefined'?window:globalThis);
