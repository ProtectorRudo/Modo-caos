/* MINI WORLDS — pure WebXR heading and camera-relative joystick mathematics.
 * World root remains frozen after FIJAR MUNDO; camera tracking alone moves
 * the viewpoint. Joystick heading is captured for each pointer hold.
 */
(function(root){
'use strict';
function norm(a){return Math.atan2(Math.sin(a),Math.cos(a))}
function headingFromQuaternion(q){
 if(!q||![q.x,q.y,q.z,q.w].every(Number.isFinite))return null;
 const {x,y,z,w}=q;
 // Horizontal camera-right vector from full XR view quaternion: robust when
 // pointing the phone down at the floor. This is pure yaw; pitch is ignored.
 const rightX=1-2*(y*y+z*z),rightZ=2*(x*z-y*w);
 const rightLength=Math.hypot(rightX,rightZ);
 if(rightLength<.10){
  // Heavy roll can make right nearly vertical; project the camera's
  // forward vector instead.
  const forwardX=-2*(x*z+y*w),forwardZ=-(1-2*(x*x+y*y));
  if(Math.hypot(forwardX,forwardZ)<.10)return null;
  return norm(Math.atan2(-forwardX,-forwardZ));
 }
 return norm(Math.atan2(-rightZ,rightX));
}
function cameraRelative(x,z,cameraYaw,worldYaw){
 if(![x,z,cameraYaw,worldYaw].every(Number.isFinite))return {x:0,z:0};
 const delta=norm(cameraYaw-worldYaw);
 const c=Math.cos(delta),s=Math.sin(delta);
 return {x:c*x+s*z,z:-s*x+c*z};
}
function snapshotWorld(stage){
 if(!stage?.root)return null;
 return {
  x:stage.root.position.x,y:stage.root.position.y,z:stage.root.position.z,
  yaw:stage.root.rotation.y,scale:stage.root.scale.x
 };
}
function restoreWorld(stage,snapshot){
 if(!snapshot||!stage?.root)return;
 stage.root.position.set(snapshot.x,snapshot.y,snapshot.z);
 stage.root.rotation.y=snapshot.yaw;
 stage.root.scale.setScalar(snapshot.scale);
}
function trackedAnchorDeviation(base,now){
 if(!base||!now)return 0;
 return Math.hypot(base.x-now.x,base.y-now.y,base.z-now.z);
}
root.MiniWorldsSpatial=Object.freeze({headingFromQuaternion,cameraRelative,snapshotWorld,restoreWorld,trackedAnchorDeviation});
})(typeof window!=='undefined'?window:globalThis);
