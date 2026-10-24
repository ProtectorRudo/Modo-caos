'use strict';
/* Run with: node tests/semaforo-motion.test.cjs */
const assert=require('node:assert/strict');
const Motion=require('../semaforo-motion.js'),Core=require('../semaforo-core.js');
function run(){
 const m=Motion.create();let t=1000,steps=0,punish=0;
 assert.equal(m.reset({x:0,z:0},t),true);
 const sample=(x,z,state='green',time=1)=>{
  t+=25;const o=m.update({x,z},t,state,time,.74);
  steps+=Number(o.stride);punish+=Number(o.motion>.14);return o;
 };
 for(let i=0;i<55;i++)sample(.008*Math.sin(i/3),.009*Math.cos(i/4));
 assert.equal(steps,0,'el temblor natural no debe avanzar');
 for(let k=0;k<9;k++){
  for(let j=0;j<8;j++)sample(0,j*.019);
  for(let j=7;j>=0;j--)sample(0,j*.019);
 }
 assert.ok(steps>=5&&steps<=10,'impulsos físicos intencionados '+steps);
 const before=steps;
 for(let i=0;i<30;i++)sample(0,i*.004,'amber',i*.025);
 assert.equal(steps,before,'amarillo no permite avanzar por impulso');
 let basePunish=punish;
 for(let i=0;i<52;i++)sample(.017*Math.sin(i*.2),.023*Math.cos(i*.26),'red',i*.025);
 assert.equal(punish,basePunish,'temblores de mano no penalizan rojo');
 for(let i=0;i<14;i++)sample(0,.015*i,'red',1.7+i*.025);
 for(let i=0;i<16;i++)sample(0,.195,'red',2.1+i*.025);
 assert.equal(punish,basePunish+1,'movimiento real pronunciado penaliza una sola vez');
 for(let i=0;i<30;i++)sample(0,.195,'red',2.5+i*.025);
 assert.equal(punish,basePunish+1,'rojo no sanciona repetidamente una posición inmóvil');
 const teleport=sample(0,.66,'red',3.3);
 assert.equal(teleport.motion,0,'salto ARCore no debe ser penalización');
 assert.equal(teleport.forward,0,'salto ARCore no puede dar impulso');
 let lat=null;
 for(let i=0;i<12;i++)lat=sample(.12,.66,'amber',.1+i*.025);
 assert.ok(lat.lane>0.05,'desplazamiento lateral filtrado');
 // Drive a complete core match exclusively through phone motion, with no buttons.
 const sim=Motion.create(),g=Core.make({seed:702});let now=2000,pulses=0;
 sim.reset({x:0,z:0},now);Core.start(g);
 for(let i=0;i<4000&&g.state!=='finished';i++){
  now+=20;
  const phase=g.state==='playing'?g.signal:'idle';
  const z=phase==='green'?.084*(1-Math.cos(2*Math.PI*g.signalTime/.78)):0;
  const ctrl=sim.update({x:0,z},now,phase,g.signalTime,g.warning);
  if(ctrl.stride)pulses++;
  Core.input(g,{forward:ctrl.forward,motion:ctrl.motion});
  Core.tick(g,.02);
 }
 assert.equal(g.state,'finished','finaliza la partida sin botones');
 assert.equal(g.players[0].progress,100,'VOS puede llegar físicamente a meta');
 assert.equal(g.players[0].penalties,0,'parar en rojo evita sanción');
 return{cases:10,gestures:steps,redPenalty:punish-basePunish,physicalStrides:pulses,finishAt:g.raceTime};
}
console.log('SEMAFORO MOTION OK',run());
