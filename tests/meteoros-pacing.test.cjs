'use strict';
/* Pacing and player-entertainment regression checks: physically plausible slow motion.
 * These are simulations, NOT physical phone tracking or perceptual FUN scores. */
const assert=require('node:assert/strict');
const C=require('../meteoros-core.js');
const counts={early:0,middle:0,late:0},patterns={tricky:0,giant:0,fake:0},messages={cue:0,streak:0},seeds=60;
let slowWin=0,stillWin=0,firstSum=0,firstMax=0;
for(let seed=1;seed<=seeds;seed++){
 for(const moving of [false,true]){
  const g=C.make(seed);assert(C.start(g));
  let first=null,goal=null,previousWave=0,previousIds=new Set(),heard=new Set();
  for(let step=0;g.stage!=='finished'&&step<1600;step++){
   if(moving&&g.stage==='playing'){
    const p=g.players[0];
    const incoming=g.events.filter(e=>!e.cancelled&&!e.fake&&e.impact>=g.elapsed&&e.impact-g.elapsed<2.6)
      .sort((a,b)=>a.impact-b.impact)[0];
    if(incoming)goal=C.sampleSafe(g,incoming.impact,[],p);
    if(goal){const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
     if(d>.005){const advance=Math.min(d,.23*.08);C.setPosition(g,p.x+dx/d*advance,p.z+dz/d*advance)}}
   }
   C.tick(g,.08);
   if(g.wave!==previousWave){if(first===null)first=g.elapsed;
    if(moving){const label=g.elapsed<25?'early':g.elapsed<54?'middle':'late';counts[label]+=g.wave-previousWave}
    previousWave=g.wave;
   }
   if(moving){
    for(const event of g.events){if(previousIds.has(event.id))continue;previousIds.add(event.id);
     assert(event.lead>=1.82,'minimum visible hazard warning');
     if(event.kind==='tricky'||event.kind==='giant')patterns[event.kind]++;
     if(event.fake)patterns.fake++;
    }
    for(const f of g.fx){if(f.type!=='cue'&&f.type!=='streak')continue;
     const id=f.type+':'+f.at+':'+f.text;if(heard.has(id))continue;heard.add(id);messages[f.type]++}
   }
  }
  assert.equal(g.stage,'finished','matches must end without lockup');
  assert(g.players.every(p=>p.lives>=0&&p.lives<=3),'bounded lives');
  if(moving){slowWin+=Number(g.players[0].alive);firstSum+=first;firstMax=Math.max(firstMax,first)}
  else stillWin+=Number(g.players[0].alive);
 }
}
assert(firstMax<4.6,'first threat should land early enough to engage');
assert(counts.early/seeds>=7,'meaningful attacks in first 25 seconds');
assert(counts.middle/(29*seeds)>counts.early/(25*seeds),'middle must grow denser');
assert(counts.late/(18*seeds)>counts.middle/(29*seeds),'final density must build without a sudden cliff');
assert(stillWin<seeds*.15,'stationary player should not win');
assert(slowWin>seeds*.34,'walking slowly must remain competitively survivable');
assert(slowWin<seeds*.9,'not so easy that almost everyone survives');
assert(messages.cue>seeds*2&&messages.streak>seeds,'wave flavor and combo rewards must actually trigger');
assert(patterns.giant>5&&patterns.tricky>5&&patterns.fake>5,'danger variants must occur in sampled matches');
console.log('PASS pacing:',JSON.stringify({seeds,slowWin,stillWin,firstAvg:+(firstSum/seeds).toFixed(2),counts,patterns,messages}));
