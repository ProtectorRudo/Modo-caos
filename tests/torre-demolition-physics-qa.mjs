import R from '../node_modules/@dimforge/rapier3d-compat/rapier.es.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const D=require('../torre-demolition.js'),G=require('../torre-core.js');
await R.init();
function setup(fig){
 const w=new R.World({x:0,y:-9.81,z:0});w.timestep=1/60;
 const b=w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0,.039,0));
 w.createCollider(R.ColliderDesc.cuboid(1.25,.079,.36).setFriction(.98),b);
 const bodies=[];
 for(const [id,p] of fig.blocks.entries()){
  const s=G.SHAPES.find(s=>s.id===p.shape)||D.DEMOLITION_SHAPES.find(s=>s.id===p.shape);
  if(!s)throw Error('shape '+p.shape);
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,0).setLinearDamping(.075).setAngularDamping(.11).setCcdEnabled(true));
  body.setEnabledTranslations(true,true,false,true);
  body.setEnabledRotations(false,false,true,true);
  for(const poly of s.parts){
   const vertices=[];for(const z of [-.11,.11])for(const [x,y] of poly)vertices.push(x*.38,y*.38,z);
   const col=R.ColliderDesc.convexHull(new Float32Array(vertices));
   if(!col)throw Error('convexHull '+s.id);
   col.setDensity(3.5*s.weight).setFriction(.89).setRestitution(.048);
   w.createCollider(col,body);
  }
  bodies.push({body,id,original:p});
 }
 return {w,bodies};
}
const snap=bs=>bs.map(o=>({id:o.id,x:o.body.translation().x,y:o.body.translation().y,a:2*Math.atan2(o.body.rotation().z,o.body.rotation().w)}));
const all=[];
for(const f of D.FIGURES){
 const {w,bodies}=setup(f);for(let n=0;n<245;n++)w.step();
 const ss=snap(bodies);
 const mx=Math.max(...ss.map((b,i)=>Math.abs(b.x-f.blocks[i].x))),my=Math.max(...ss.map((b,i)=>Math.abs(b.y-f.blocks[i].y))),a=Math.max(...ss.map(b=>Math.abs(b.a)));
 all.push({id:f.id,name:f.title,shapes:[...new Set(f.blocks.map(p=>p.shape))],pieces:f.blocks.length,maxX:+mx.toFixed(3),maxY:+my.toFixed(3),maxA:+a.toFixed(3),stable:mx<.145&&my<.15&&a<.4});
 w.free();
}
console.log('STABILITY '+JSON.stringify({pass:all.filter(o=>o.stable).length,total:all.length,fail:all.filter(o=>!o.stable)}));
const outcomes=[];
for(const f of D.FIGURES){
 const variants=[
  ['foundation', f.blocks.map((p,i)=>({p,i})).filter(z=>z.p.shape==='media_piedra'&&z.p.y<.4).sort((a,b)=>Math.abs(a.p.x)-Math.abs(b.p.x)).slice(0,3).map(z=>z.i)],
  ['original_supports',f.blocks.map((p,i)=>({p,i})).filter(z=>z.p.shape==='medio_pilar'||z.p.shape==='medio_soporte'||z.p.shape==='pil'||z.p.shape==='soporte').sort((a,b)=>a.p.y-b.p.y).slice(0,3).map(z=>z.i)],
  ['decoys',f.blocks.map((p,i)=>({p,i})).sort((a,b)=>b.p.y-a.p.y).slice(0,3).map(z=>z.i)]
 ];
 const row={id:f.id,count:f.blocks.length,parts:[]};
 for(const [label,indices]of variants){
  if(indices.length!==3)continue;
  const {w,bodies}=setup(f);for(let n=0;n<245;n++)w.step();
  const baseline=snap(bodies);
  for(const i of indices){
    w.removeRigidBody(bodies[i].body);
    for(let n=0;n<135;n++)w.step();
  }
  const after=snap(bodies.filter((_,i)=>!indices.includes(i)));
  const fallen=after.filter(p=>{const b=baseline.find(x=>x.id===p.id);return Math.max(Math.abs(p.x-b.x),Math.abs(p.y-b.y))>.16||Math.abs(p.a-b.a)>.58}).length;
  row.parts.push({label,fallen,indices});
  w.free();
 }
 outcomes.push(row);
}
console.log('3_MOVES '+JSON.stringify({outcomes:outcomes.map(o=>({id:o.id,count:o.count,foundation:o.parts.find(p=>p.label==='foundation')?.fallen,critical:o.parts.find(p=>p.label==='original_supports')?.fallen,decoys:o.parts.find(p=>p.label==='decoys')?.fallen}))}));
const good=outcomes.filter(o=>o.parts.some(p=>p.fallen>=2));
console.log('STRATEGY '+JSON.stringify({total:outcomes.length,good:good.length,flat:outcomes.filter(o=>!o.parts.some(p=>p.fallen>=2)).map(o=>o.id),complex:outcomes.filter(o=>o.count>=14).length,min:Math.min(...outcomes.map(o=>o.count)),max:Math.max(...outcomes.map(o=>o.count))}));
const diversified=outcomes.filter(o=>o.parts.some(x=>x.label==='decoys'&&x.fallen<=2)&&o.parts.some(x=>x.label!=='decoys'&&x.fallen>=3));
const minimum=Math.min(...outcomes.map(o=>o.count));
console.log('ACCEPTANCE '+JSON.stringify({stable:all.filter(o=>o.stable).length,cascadeChoices:good.length,decoys:diversified.length,leastBricks:minimum}));
if(all.some(o=>!o.stable)||good.length!==40||diversified.length<27||minimum<16)process.exitCode=1;
