'use strict';
/* Run with: node tests/meteoros.test.cjs. No device is simulated as physical AR. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../meteoros-core.js');
const run=(seed,online=false)=>{
 const g=C.make(seed,{online});if(online){g.players=[g.players[0],...g.players.slice(1).map(p=>({...p,kind:'remote'}))]}
 assert.equal(C.start(g),true);
 let guard=0;
 while(g.stage!=='finished'&&guard++<2000){C.tick(g,.08);assert(g.players.every(p=>p.lives>=0&&p.lives<=3));}
 assert(guard<2000,'must finish');
 assert.equal(g.elapsed,72);assert.equal(g.ranking.length,4);
 assert(g.wave>10,'progressive waves');assert(g.maxActive>0);
 for(const p of g.players){assert(Number.isFinite(p.score));assert(p.score>=0);assert(p.combo>=0)}
 return g;
};
assert.equal(C.DURATION,72);
for(let s=1;s<=96;s++)run(s);
const a=run(27),b=run(27);
assert.deepEqual(a.players.map(p=>[p.score,p.lives,p.dodges,p.hits]),b.players.map(p=>[p.score,p.lives,p.dodges,p.hits]),'seeded solo deterministic');
let g=C.make(1);C.setPosition(g,9,9);assert(Math.hypot(g.players[0].x,g.players[0].z)<=C.R+.00001);
g=C.make(2);C.start(g);while(g.stage==='countdown')C.tick(g,.07);
assert.equal(g.stage,'playing');
g.nextWave=999;
g.events=[{id:'hit-once',kind:'normal',x:0,z:0,radius:.19,spawn:0,lead:1,impact:.25,crater:false,craterTime:0,cancelled:false,scored:false,hits:{},near:{}}];
for(let i=0;i<18;i++)C.tick(g,.04);assert.equal(g.players[0].lives,2,'one explosion = one life');
g=C.make(2);C.start(g);while(g.stage==='countdown')C.tick(g,.07);
g.nextWave=999;g.players[0].shield=1;
g.events=[{id:'shield',kind:'normal',x:0,z:0,radius:.19,spawn:0,lead:1,impact:.25,crater:false,craterTime:0,cancelled:false,scored:false,hits:{},near:{}}];
for(let i=0;i<18;i++)C.tick(g,.04);
assert.equal(g.players[0].lives,3);assert.equal(g.players[0].shield,0,'shield absorbed impact');
g=C.make(4);C.start(g);while(g.stage==='countdown')C.tick(g,.07);
g.nextWave=999;g.bonuses=[{id:'shield-test',type:'shield',x:0,z:0,spawn:0,until:3}];C.tick(g,.06);assert.equal(g.players[0].shield,1);
g=C.make(5);C.start(g);while(g.stage==='countdown')C.tick(g,.07);const oldScore=g.players[0].score;
g.nextWave=999;for(let i=0;i<45;i++)C.tick(g,.08);assert(g.players[0].score>oldScore,'survival awards points');
for(let s=1;s<=40;s++){
 const x=C.make(s);C.start(x);while(x.stage==='countdown')C.tick(x,.08);
 for(let i=0;i<42;i++){
  const before=x.events.length,added=C.planWave(x);
  if(added.length){
   const local=x.events.filter(e=>Math.abs(e.impact-added[0].impact)<.02);
   assert(C.sampleSafe(x,added[0].impact,[],x.players[0]),'safe path target for solo, seed '+s);
   assert(added.every(e=>e.radius<.25&&e.lead>=1.68),'warning and size');
  }
  for(let k=0;k<16;k++)C.tick(x,.08);
 }
}
const sameOne=C.make(500,{online:true}),sameTwo=C.make(500,{online:true});
sameOne.players=[sameOne.players[0],...sameOne.players.slice(1).map(p=>({...p,kind:'remote'}))];
sameTwo.players=[sameTwo.players[0],...sameTwo.players.slice(1).map(p=>({...p,kind:'remote'}))];
C.start(sameOne);C.start(sameTwo);
C.setPosition(sameOne,.5,.12);C.setPosition(sameTwo,-.4,-.25);
const seen=(x)=>x.events.map(e=>[e.id,e.kind,e.x,e.z,e.radius,e.impact,e.moved]);
for(let i=0;i<710;i++){C.tick(sameOne,.08);C.tick(sameTwo,.08);assert.deepEqual(seen(sameOne),seen(sameTwo),'online wave sequence must not depend on player position')}
for(const filename of ['meteoros.html','meteoros-core.js','meteoros-art.js','meteoros-runtime.js']){
 assert(fs.statSync(path.join(__dirname,'..',filename)).size>1000,filename+' exists');
}
const html=fs.readFileSync(path.join(__dirname,'..','meteoros.html'),'utf8');
for(const id of ['tiles','arenaSvg','mock','reticle','lock','enter','overlay','calibrate','touchpad','headline','subtitle','debug','goHome','notice']){
 assert(html.includes('id="'+id+'"'),'engine compatibility '+id)
}
const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
for(const href of ['/meteoros.html','/muro.html','/semaforo.html','/ball.html','/territorio.html','/color.html'])assert(index.includes(href),'arcade link '+href);
for(const f of ['meteoros-core.js','meteoros-art.js','meteoros-runtime.js'])new Function(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
console.log('OK: 96 seeds / finite scores / lives / collisions / shield / bonuses / phases / deterministic online waves / HTML links / syntax');
