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
const cascades=[];
for(const f of D.FIGURES){
 const candidates=f.blocks.map((p,i)=>({i,y:p.y})).sort((a,b)=>a.y-b.y).slice(0,5);
 let best={fallen:-1,id:-1};
 for(const {i} of candidates){
  const {w,bodies}=setup(f);for(let n=0;n<245;n++)w.step();const before=snap(bodies),removed=bodies[i];w.removeRigidBody(removed.body);
  for(let n=0;n<210;n++)w.step();
  const after=snap(bodies.filter(o=>o!==removed));
  const fallen=after.filter(p=>{const b=before.find(x=>x.id===p.id);return Math.max(Math.abs(p.x-b.x),Math.abs(p.y-b.y))>.23||Math.abs(p.a-b.a)>.43}).length;
  if(fallen>best.fallen)best={fallen,id:i,removed:f.blocks[i].shape};
  w.free();
 }
 cascades.push({id:f.id,name:f.title,best});
}
console.log('CASCADES '+JSON.stringify({good:cascades.filter(x=>x.best.fallen>=2).length,one:cascades.filter(x=>x.best.fallen>=1).length,total:cascades.length,weak:cascades.filter(x=>x.best.fallen<2),sample:cascades.filter(x=>x.id<10)}));
if(all.some(o=>!o.stable)||cascades.filter(x=>x.best.fallen>=2).length<30)process.exitCode=1;
