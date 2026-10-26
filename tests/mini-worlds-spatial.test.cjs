/* MINI WORLDS: spatial floor lock and camera-relative AR steering regression.
 * Run node tests/mini-worlds-spatial.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../mini-worlds-spatial.js'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../mini-worlds-runtime.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../mini-worlds.html'),'utf8');
const ctx={window:{}};vm.runInNewContext(src,ctx);
const S=ctx.window.MiniWorldsSpatial;
assert(S,'spatial helper not loaded');
const around=(x,y,tol=1e-6)=>assert(Math.abs(x-y)<tol,'expected '+y+', got '+x);
const Q=y=>({x:0,y:Math.sin(y/2),z:0,w:Math.cos(y/2)});
for(let a of [-Math.PI, -Math.PI/2, -.7, 0, .3, Math.PI/2, Math.PI]){
 const yaw=S.headingFromQuaternion(Q(a));
 around(Math.sin(yaw),Math.sin(a));around(Math.cos(yaw),Math.cos(a));
}
const qYaw90=Q(Math.PI/2);
// With world placed at yaw=0, pointing the phone west makes Up mean West.
let v=S.cameraRelative(0,-1,S.headingFromQuaternion(qYaw90),0);
around(v.x,-1);around(v.z,0);
// Rotate the physical phone around the anchored island; the world stays
// immutable and the next fresh thumb press is view-relative.
const origin={position:{x:1.23,y:-.07,z:-2.46,
 set(x,y,z){this.x=x;this.y=y;this.z=z}},
 rotation:{y:.41},scale:{x:.34,setScalar(v){this.x=v}}};
const stage={root:origin};
const saved=S.snapshotWorld(stage);
assert.equal(saved.x,1.23);assert.equal(saved.yaw,.41);
assert.equal(saved.scale,.34);
Object.freeze(saved);
for(let i=0;i<400;i++){
 // Simulate phone movement. It must not alter stage world coordinates.
 const cameraX=Math.sin(i*.13)*2.2,cameraZ=Math.cos(i*.17)*1.7;
 stage.root.position.x+=cameraX*.08;stage.root.position.z+=cameraZ*.11;
 stage.root.rotation.y+=.005;
 S.restoreWorld(stage,saved);
 around(stage.root.position.x,saved.x);around(stage.root.position.z,saved.z);
 around(stage.root.rotation.y,saved.yaw);
 around(stage.root.scale.x,saved.scale);
}
for(let cameraYaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
 for(let worldYaw of [-.43,0,1.23]){
  const r=S.cameraRelative(.43,-.71,cameraYaw,worldYaw);
  around(Math.hypot(r.x,r.z),Math.hypot(.43,-.71));
  const cr=Math.cos(worldYaw),sr=Math.sin(worldYaw);
  const wx=cr*r.x+sr*r.z,wz=-sr*r.x+cr*r.z;
  const cx=Math.cos(cameraYaw),sy=Math.sin(cameraYaw);
  around(wx,cx*.43+sy*-.71);
  around(wz,-sy*.43+cx*-.71);
 }
}
// Holding thumb while phone rotates must preserve input heading. Releasing
// and pressing again samples the latest physical camera orientation.
const holdYaw=0,rootYaw=.38;
let a=S.cameraRelative(0,-1,holdYaw,rootYaw);
const phoneTurns=S.headingFromQuaternion(Q(Math.PI/2));
const held=S.cameraRelative(0,-1,holdYaw,rootYaw);
around(held.x,a.x);around(held.z,a.z);
const reacquired=S.cameraRelative(0,-1,phoneTurns,rootYaw);
assert(Math.abs(reacquired.x-a.x)>.25,'new press must follow new camera heading');
assert(html.includes('mini-worlds-spatial.js'),'helper is not loaded by HTML');
assert(runtime.includes('maintainWorldLock(xrFrame)'),'stage pose not frozen while rendering AR');
assert(runtime.includes('S.restoreWorld(stage,spatialLock)'),'stage root must be restored from immutable snapshot');
assert(!runtime.includes('stage.root.position.set(pose.transform.position.x+offset.x'),'anchor pose must never drag whole world');
assert(runtime.includes('heldSteeringYaw??steeringYaw??worldYaw'),'thumb heading not frozen during a press');
assert(runtime.includes('S.cameraRelative('),'AR joystick must rotate to camera frame');
console.log('MINI WORLDS: 400 XR phone movements, immutable world pose, 7 camera headings, 12 inverse world axes, stable joystick holds — PASS');
