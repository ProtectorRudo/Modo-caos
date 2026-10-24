/** Physical smoke/regression tests for Torre Caos.
 * Run in a temporary checkout after: npm install --no-save @dimforge/rapier3d-compat@0.17.3
 * This test deliberately does not install packages or modify shared projects. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import R from '@dimforge/rapier3d-compat/rapier.es.js';
const require=createRequire(import.meta.url),G=require('../torre-core.js');
await R.init({});
const SHAPE_SCALE=.38,DEPTH=.22;
function makeWorld(){
 const w=new R.World({x:0,y:-9.81,z:0});w.timestep=1/60;
 const ground=w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0,.039,0));
 w.createCollider(R.ColliderDesc.cuboid(1.25,.079,.36).setFriction(.98),ground);
 return w;
}
function spawn(w,shape,x=0,y=1.05,angle=0){
 const desc=R.RigidBodyDesc.dynamic().setTranslation(x,y,0).setLinearDamping(.075).setAngularDamping(.11).setCcdEnabled(true);
 const body=w.createRigidBody(desc);body.setEnabledTranslations(true,true,false,true);body.setEnabledRotations(false,false,true,true);
 body.setRotation({x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)},true);
 let count=0;
 for(const poly of shape.parts){
  const coordinates=[];
  for(const z of [-DEPTH*.5,DEPTH*.5])for(const [px,py] of poly)coordinates.push(px*SHAPE_SCALE,py*SHAPE_SCALE,z);
  const desc=R.ColliderDesc.convexHull(new Float32Array(coordinates));
  assert.ok(desc,shape.id+' collider');w.createCollider(desc.setDensity(3.5*shape.weight).setFriction(.89).setRestitution(.048),body);count++;
 }
 assert.equal(count,shape.parts.length,shape.id+' compound parts');return body;
}
function tick(w,n){for(let i=0;i<n;i++)w.step()}
for(const shape of G.SHAPES){
 const w=makeWorld(),b=spawn(w,shape);tick(w,360);
 assert.ok(Number.isFinite(b.translation().x)&&Number.isFinite(b.translation().y),shape.id+' numerical stability');
 assert.ok(b.translation().y>-.2,shape.id+' did not fall through platform');
 assert.equal(b.translation().z,0,shape.id+' restricted z');
 assert.ok(Math.abs(b.rotation().x)<1e-5&&Math.abs(b.rotation().y)<1e-5,shape.id+' restricted tilt');
 w.free();
}
{
 const w=makeWorld(),first=spawn(w,G.SHAPES[0]);tick(w,200);
 const upper=spawn(w,G.SHAPES[1],0,first.translation().y+.75);tick(w,340);
 assert.ok(upper.translation().y>.46,'rectangle rests on cube');
 assert.ok(first.translation().y>.2,'support remains grounded');
 w.free();
}
console.log('Torre Caos Rapier: 14/14 solids, 3D plane constraints and stacking passed');
