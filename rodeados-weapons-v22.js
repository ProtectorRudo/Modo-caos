/* RODEADOS 360 V22 — CC0 Quaternius GLB weapon fitting.
 * Real mesh only, never a block substitute. All mesh sources are < 1MB.
 * Each weapon has its own group and tiny shoot flash, but no camera anchoring.
 * Source: Quaternius, CC0; bundling from Papyszoo/CC0-Public-Domain-Models.
 */
export const WEAPON_FILES={
 pistol:'player-scifi-pistol.glb',
 tactical:'player-tactical-carbine.glb',
 plasma:'player-plasma-rifle.glb',
 enemy:'enemy-assault-rifle.glb'
};
const LIMITS={pistol:.35,tactical:.62,plasma:.66,enemy:.47};
function validVec(v){return Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z)}
export function fitQuaterniusWeapon(THREE,source,tier,{forEnemy=false}={}){
 if(!source?.isObject3D||!Object.prototype.hasOwnProperty.call(LIMITS,tier))return null;
 const geometry=source.clone(true),outer=new THREE.Group();
 const start=new THREE.Box3().setFromObject(geometry);
 const size=start.getSize(new THREE.Vector3());
 if(!validVec(size)||Math.max(size.x,size.y,size.z)<.01)return null;
 // Major gun dimension runs along +Z in Rodeados: camera view flips around Y.
 const axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
 if(axis==='x')geometry.rotation.y=-Math.PI/2;
 else if(axis==='y')geometry.rotation.x=Math.PI/2;
 geometry.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(geometry);
 const ext=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 if(!validVec(ext)||ext.z<.01)return null;
 const scale=LIMITS[tier]/ext.z;
 if(!Number.isFinite(scale)||scale<=0||scale>1000)return null;
 // Do not re-centre an animated SkinnedMesh rig; these are static gun meshes.
 const model=new THREE.Group();geometry.position.set(-center.x,-center.y,-center.z);
 model.scale.setScalar(scale);model.add(geometry);outer.add(model);
 outer.name='cc0-quaternius-'+tier;
 outer.userData={tier,realGLB:true,axis,modelLength:LIMITS[tier]};
 outer.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
 // Small point-of-fire flare, not an oversized geometry covering the gun.
 const flashMaterial=new THREE.MeshBasicMaterial({color:0xffe8ad,transparent:true,opacity:.88,depthWrite:false});
 const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.027,0),flashMaterial);
 flash.position.set(0,0,LIMITS[tier]*.51);
 flash.visible=false;outer.add(flash);
 outer.userData.setFiring=(active,t=0)=>{
  flash.visible=!!active;
  flash.scale.setScalar(active?1+Math.sin(t*41)*.13:1);
 };
 outer.userData.dispose=()=>{flash.geometry.dispose();flashMaterial.dispose()};
 return outer;
}
export function locateRightHand(root){
 if(!root?.traverse)return null;
 let best=null,score=0;
 root.traverse(o=>{
  if(!o.isBone)return;
  const name=(o.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const hand=/hand|wrist|palm/.test(name),right=/right|rhand|handr|wrist(r|right)$/.test(name);
  const s=(hand?3:0)+(right?2:0);
  if(hand&&right&&s>score){best=o;score=s}
 });
 return best;
}
export function attachEnemyWeapon(THREE,enemyActor,animation,source){
 if(!source||!enemyActor?.group||!animation?.root)return null;
 const hand=locateRightHand(animation.root);
 if(!hand)return null; // Deliberately hide weapon rather than fake chest attachment.
 const gun=fitQuaterniusWeapon(THREE,source,'enemy',{forEnemy:true});
 if(!gun)return null;
 const offset=new THREE.Vector3(0,-.025,.085);
 enemyActor.group.add(gun);
 gun.visible=false;
 const worldHand=new THREE.Vector3(),localHand=new THREE.Vector3();
 return {
  hasHand:true,
  weapon:gun,
  update(enemy){
   hand.updateWorldMatrix(true,false);
   hand.getWorldPosition(worldHand);
   localHand.copy(worldHand);
   enemyActor.group.worldToLocal(localHand);
   const valid=validVec(localHand)&&localHand.y>=.37&&localHand.y<=1.9&&
     Math.abs(localHand.x)<1&&Math.abs(localHand.z)<.9;
   gun.visible=!!valid&&enemy.portal<.62;
   if(valid){
     gun.position.copy(localHand).add(offset);
     gun.rotation.set(-.13,0,0);
   }
   gun.userData.setFiring(gun.visible&&enemy.state==='attack'&&
     enemy.stun<=0&&Math.sin(enemy.age*22)>.6,enemy.age);
  },
  dispose(){
   enemyActor.group.remove(gun);gun.userData.dispose();
  }
 };
}
