'use strict';
/* Ritmo Caos: reglas deterministas e independientes de WebXR y del render. */
(function(root){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const LANES=4,COLORS=['#4cff85','#ff5274','#ffd34c','#438eff'];
const SONGS={
 neon:{title:'NEÓN SIN FRENO',genre:'Electrónica',bpm:112,bars:32,bass:55,scale:[0,3,5,7,10],lead:[0,3,5,7,10,7,5,3],beat:0},
 fuego:{title:'FUEGO EN EL ESCENARIO',genre:'Rock',bpm:100,bars:28,bass:41,scale:[0,2,3,5,7,10],lead:[0,7,5,3,2,3,5,7],beat:1},
 solar:{title:'SOLAR LATINO',genre:'Pop latino',bpm:104,bars:32,bass:49,scale:[0,2,4,7,9],lead:[0,2,4,7,9,7,4,2],beat:2}
};
function random(seed){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}}
function chart(songId='neon',difficulty='normal',laneWidth=.31){
 const song=SONGS[songId]||SONGS.neon,rand=random((song.beat+1)*972641+song.bpm);
 const active=difficulty==='facil'?[1,2]:[0,1,2,3];
 const beat=60/song.bpm,phase=Number(song.phaseSeconds)||0,duration=Math.min(Number(song.clipDuration)||Infinity,song.bars*4*beat+phase);
 const melodyEvents=[];
 if(song.publicDomain&&Array.isArray(song.melody)&&song.melody.length){
  const cycle=song.melody.reduce((sum,n)=>sum+n.length,0);
  for(let repeat=0;repeat*cycle<song.bars*4;repeat++)for(const n of song.melody){
   const pos=n.at+repeat*cycle;
   if(pos>=4&&pos<song.bars*4-3)melodyEvents.push({beat:pos,pitch:n.midi});
  }
 }
 const notes=[];let lane=1,lastAt=0;
 const spacing={facil:2.5,normal:2,dificil:1.5,caos:1.25}[difficulty]||2;
 const accentEvents=!melodyEvents.length&&Array.isArray(song.rhythmBeats)&&song.rhythmBeats.length>=12
  ?song.rhythmBeats.filter(b=>b>=4&&b<song.bars*4-3).map(b=>({beat:b,pitch:null})):[];
 // Las notas de grabaciones autorizadas usan timestamps auditados de ESA grabación, no BPM estimado.
 const licensedEvents=song.licensedRecording&&Array.isArray(song.noteTimes)
  ?song.noteTimes.map(at=>({beat:at/beat,at,pitch:null})):[];
 const targetEvents=licensedEvents.length?licensedEvents:melodyEvents.length?melodyEvents:accentEvents;
 let beatIndex=4,eventCursor=0;
 const gapBeats={facil:2.5,normal:1.55,dificil:1.10,caos:.78}[difficulty]||1.55;
 while(beatIndex<song.bars*4-3){
  let noteEvent=null;
  if(targetEvents.length){
   while(eventCursor<targetEvents.length&&targetEvents[eventCursor].beat<beatIndex-.001)eventCursor++;
   if(eventCursor>=targetEvents.length)break;
   noteEvent=targetEvents[eventCursor++];beatIndex=noteEvent.beat;
  }
  let when=Number.isFinite(noteEvent?.at)?noteEvent.at:phase+beatIndex*beat,dt=when-lastAt;
  if(when>=duration-.6)break;
  let maxHops=Math.max(0,Math.floor((dt*.70-.12)/laneWidth));
   // Playing a known recording should FEEL like a dance, not teleporting
   // two colored squares between consecutive audible accents. Adjacent
   // lane flow on Easy/Normal/Hard, while CAOS retains long safe leaps.
   if(song.licensedRecording&&difficulty!=='caos')maxHops=Math.min(1,maxHops);
  const possible=active.filter(c=>Math.abs(c-lane)<=maxHops);
  const options=possible.length?possible:[lane];
  const phrase=Math.floor(beatIndex/4),desired=song.lead[(phrase+Math.floor(rand()*3))%song.lead.length]%LANES;
  // Preference for melody movement, without ever requesting impossible physical transitions.
  options.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired));
  const fromLane=lane;
  lane=rand()<.67?options[0]:options[Math.floor(rand()*options.length)];
  const seq=notes.length;
  const chaos=(seq>25&&seq%29===28),special=(seq%17===16),hold=(seq>4&&seq%13===9);
  const slide=(seq>8&&seq%19===12&&difficulty!=='facil'&&fromLane!==lane);
  let type=chaos?'caos':special?'special':hold?'hold':slide?'slide':'simple';
  const holdTime=type==='hold'?Math.min(.80,Math.max(.48,spacing*beat*.49)):0;
  notes.push({id:seq,lane,fromLane,at:when,type,hold:holdTime,slideDuration:slide?Math.min(.73,dt*.72):0,beat:beatIndex,
    pitch:noteEvent&&Number.isFinite(noteEvent.pitch)?noteEvent.pitch:song.lead[(Math.floor(beatIndex/2)+song.beat)%song.lead.length],status:'pending'});
  lastAt=when;beatIndex+=targetEvents.length?gapBeats:spacing;
  if(difficulty==='caos'&&seq%17===14&&!targetEvents.length)beatIndex+=.25;
 }
 return {songId,song,difficulty,notes,duration,beat,laneWidth,active};
}
function make(songId='neon',difficulty='normal',laneWidth=.31){
 const c=chart(songId,difficulty,laneWidth);
 return {...c,state:'ready',elapsed:0,cursor:0,lane:1,offset:1,score:0,combo:0,bestCombo:0,perfect:0,great:0,good:0,miss:0,
 energy:100,events:[],eventSeq:0,judged:0,holdActive:null,slideActive:null,enteredAt:0,lastLane:1,paused:false};
}
function reset(g){Object.assign(g,make(g.songId,g.difficulty,g.laneWidth));return g}
function start(g){if(g.state!=='ready')return false;g.state='playing';return true}
function setPosition(g,x,t=g.elapsed){
 if(!Number.isFinite(x))return;
 const c=clamp(x,0,LANES-1),lane=clamp(Math.round(c),0,LANES-1);
 if(lane!==g.lastLane){g.enteredAt=t;g.lastLane=lane}
 g.offset=c;g.lane=lane;
}
function multiplier(combo){return combo>=30?4:combo>=20?3:combo>=10?2:1}
function resolve(g,n,rating){
 if(n.status!=='pending')return;
 const previousScore=g.score;
 n.status=rating;n.hitAt=g.elapsed;g.judged++;
 if(rating==='FALLO'){g.miss++;g.combo=0;g.energy=clamp(g.energy-7,0,100)}
 else{
  g.combo++;g.bestCombo=Math.max(g.combo,g.bestCombo);
  if(rating==='PERFECTO')g.perfect++;
  else if(rating==='GENIAL')g.great++;else g.good++;
  const base=rating==='PERFECTO'?1000:rating==='GENIAL'?700:400;
  const points=Math.round(base*multiplier(g.combo)*(n.type==='caos'?2:n.type==='special'?1.6:1));
  g.score+=points;g.energy=clamp(g.energy+(rating==='PERFECTO'?4:2),0,100);
 }
 n.awarded=g.score-previousScore;
 if(g.slideActive?.id===n.id)g.slideActive=null;
 g.events.push({seq:++g.eventSeq,type:'judgement',rating,note:n.id,lane:n.lane,combo:g.combo,score:g.score,points:g.score-previousScore,noteType:n.type,special:n.type==='caos'});
 if(g.events.length>24)g.events.shift();
}
function tick(g,time){
 if(g.state!=='playing'||g.paused||!Number.isFinite(time))return;
 const previous=g.elapsed;
 g.elapsed=Math.max(g.elapsed,clamp(time,0,g.duration+.5));
 const slideNote=g.notes[g.cursor];
 if(slideNote?.type==='slide'&&slideNote.status==='pending'&&g.elapsed>=slideNote.at-slideNote.slideDuration-.045&&g.elapsed<=slideNote.at+.24){
  if(!g.slideActive||g.slideActive.id!==slideNote.id)g.slideActive={id:slideNote.id,seenSource:false,moved:false};
  if(Math.abs(g.offset-slideNote.fromLane)<.52)g.slideActive.seenSource=true;
  if(Math.abs(g.offset-slideNote.fromLane)>.55)g.slideActive.moved=true;
 }
 // HOLD = staying on the color. Never requires a finger press or re-entering.
 // AR phone tracking oscillates around lane borders, so allow a brief dropout,
 // even when one frame arrives late. Do not punish single-frame jitter.
 if(g.holdActive){
  const h=g.holdActive,n=h.note;
  const inside=Math.abs(g.offset-n.lane)<.70;
  const dt=Math.max(0,g.elapsed-previous);
  if(inside)h.awaySince=null;
  else{
   if(h.awaySince===null)h.awaySince=g.elapsed;
   h.offSeconds+=Math.min(dt,.09);
  }
  h.progress=clamp((g.elapsed-n.at)/Math.max(.01,n.hold),0,1);
  const goneTooLong=(h.awaySince!==null&&g.elapsed-h.awaySince>.24)||h.offSeconds>.34;
  if(goneTooLong){
   resolve(g,n,'FALLO');g.events.push({seq:++g.eventSeq,type:'hold_break',lane:n.lane,note:n.id});
   g.holdActive=null;g.cursor++;
  }else if(g.elapsed>=n.at+n.hold){
   resolve(g,n,'PERFECTO');
   g.events.push({seq:++g.eventSeq,type:'hold_complete',lane:n.lane,note:n.id,combo:g.combo,points:n.awarded});
   g.holdActive=null;g.cursor++;
  }
 }
 while(g.cursor<g.notes.length){
  const n=g.notes[g.cursor];
  if(n.status!=='pending'){g.cursor++;continue}
  // A sustained note must stay under holdActive until its TAIL finishes;
  // the ordinary short-tap deadline must never mark it as missed mid-hold.
  if(g.holdActive?.id===n.id)break;
  const delta=g.elapsed-n.at;
  const hold=n.type==='hold';
  // Entering the correct lane up to 200 ms BEFORE the sustained head is valid.
  if(delta<(hold?-.20:-.055))break;
  if(delta>(hold?.36:.24)){resolve(g,n,'FALLO');g.cursor++;continue}
  if(g.holdActive)break;
  if(g.lane===n.lane){
   if(n.type==='slide'&&(!g.slideActive?.seenSource||!g.slideActive?.moved)){
    if(delta>.12){resolve(g,n,'FALLO');g.cursor++;continue}
    break;
   }
   if(hold){
    g.holdActive={id:n.id,note:n,startedAt:g.elapsed,awaySince:null,offSeconds:0,progress:clamp(delta/Math.max(n.hold,.01),0,1)};
    g.events.push({seq:++g.eventSeq,type:'hold_start',lane:n.lane,note:n.id,hold:n.hold});
    if(g.events.length>24)g.events.splice(0,g.events.length-24);
    break;
   }
   const centered=Math.abs(g.offset-n.lane);
   const rating=centered<.21&&Math.abs(delta)<.085?'PERFECTO':centered<.32&&Math.abs(delta)<.17?'GENIAL':'BIEN';
   resolve(g,n,rating);g.cursor++;continue;
  }
  break;
 }
 if(g.elapsed>=g.duration&&g.cursor>=g.notes.length){
  g.state='finished';g.events.push({seq:++g.eventSeq,type:'finish'});
 }
}
function accuracy(g){return g.judged?Math.round((g.perfect+g.great*.7+g.good*.4)/g.judged*100):0}
function ranking(g){const a=accuracy(g);return a>=96?'LEYENDA DEL RITMO':a>=85?'ESTRELLA':a>=70?'ARTISTA':a>=50?'PROMESA':'¡SEGUÍ EL RITMO!'}
root.RitmoCore={LANES,COLORS,SONGS,chart,make,reset,start,setPosition,tick,multiplier,accuracy,ranking};
})(typeof window!=='undefined'?window:globalThis);
