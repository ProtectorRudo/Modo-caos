// V20: compact PBR-ish weapon silhouettes for WebXR, no giant cuboids.
// Deterministic handcrafted 3D shapes; shared enemy and first-person renderer.
// Source geometry is newly authored for MODO CAOS, no external network assets.
export function buildCaosWeapon(THREE,{tier='pistol',enemy=false}={}){
 const isPistol=tier==='pistol',plasma=tier==='plasma';
 const root=new THREE.Group();
 const black=new THREE.MeshStandardMaterial({color:0x111a23,metalness:.78,roughness:.33});
 const steel=new THREE.MeshStandardMaterial({color:plasma?0x2a415a:0x364c5a,metalness:.84,roughness:.26});
 const light=new THREE.MeshStandardMaterial({color:0x8dabb5,metalness:.79,roughness:.28});
 const polymer=new THREE.MeshStandardMaterial({color:0x1d2833,metalness:.32,roughness:.55});
 const glow=new THREE.MeshStandardMaterial({color:plasma?0x89b6ff:0x5bece6,emissive:plasma?0x2457c9:0x0b9496,emissiveIntensity:2.3,metalness:.18,roughness:.32});
 const flashMat=new THREE.MeshBasicMaterial({color:0xfff0a8,transparent:true,opacity:.92,depthWrite:false});
 const materials=[black,steel,light,polymer,glow,flashMat];
 function mesh(geo,mat,x=0,y=0,z=0,parent=root){
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m
 }
 const p=(coords,thick,mat)=>{
  const shape=new THREE.Shape();shape.moveTo(coords[0][0],coords[0][1]);
  coords.slice(1).forEach(v=>shape.lineTo(v[0],v[1]));shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:thick,steps:1,bevelEnabled:true,bevelSegments:2,
   bevelSize:.007,bevelThickness:.007,curveSegments:2});
  geo.computeVertexNormals();
  const m=mesh(geo,mat);m.rotation.y=-Math.PI/2;m.position.x=thick*.5;return m
 };
 function cyl(radius,length,mat,x,y,z,radiusTop=radius){
  const m=mesh(new THREE.CylinderGeometry(radiusTop,radius,length,10),mat,x,y,z);
  m.rotation.x=Math.PI/2;return m
 }
 function rod(x1,y1,z1,x2,y2,z2,r,mat){
  const a=new THREE.Vector3(x1,y1,z1),b=new THREE.Vector3(x2,y2,z2),len=a.distanceTo(b);
  const m=mesh(new THREE.CylinderGeometry(r,r,len,8),mat);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return m
 }
 const scale=isPistol?.72:1;
 const forward=isPistol?.29:plasma?.62:.62;
 const aft=isPistol?-.17:-.38;
 // Sculpted side profile, tapered handguard, ergonomic receiver.
 p([[aft,-.045],[-.27,.005],[-.09,.095],[.12,.103],[forward-.07,.051],[forward,-.008],
  [forward-.09,-.105],[.05,-.12],[-.13,-.11]],.105,steel);
 p([[aft+.026,-.055],[-.20,.014],[-.03,.06],[.18,.058],[forward-.07,.022],
  [forward-.06,-.025],[.02,-.045],[-.21,-.092]],.015,black);
 // Longitudinal graphite barrel, metal shroud and segmented cooling slots.
 const end=forward+.095;
 cyl(.031,end-.055,black,0,-.011,(end+.055)/2);
 cyl(.044,.12,light,0,-.011,end-.035);
 cyl(.022,.11,black,0,-.011,end+.03);
 const opening=cyl(.012,.004,glow,0,-.011,end+.09);
 opening.rotation.x=Math.PI/2;
 for(let i=0;i<(isPistol?2:4);i++){
  const z=.17+i*.085;
  if(z>forward-.07)break;
  const vent=mesh(new THREE.BoxGeometry(.118,.013,.026),black,0,.084,z);
  vent.rotation.z=i%2?-.1:.1;
  for(const x of [-.055,.055])mesh(new THREE.BoxGeometry(.008,.022,.025),light,x,.074,z);
 }
 // Sculpted pistol grip, separate trigger guard, magazine and stock.
 const grip=p([[-.16,-.09],[-.025,-.08],[-.10,-.33],[-.24,-.34],[-.29,-.24]],.093,polymer);
 grip.position.x=.044;
 for(let i=0;i<4;i++){
  const t=mesh(new THREE.BoxGeometry(.106,.010,.019),black,0,-.185-i*.035,-.15-i*.012);
  t.rotation.x=-.2;
 }
 const trigger=mesh(new THREE.TorusGeometry(.056,.011,5,15,Math.PI*1.6),black,0,-.14,-.052);
 trigger.rotation.z=Math.PI*.09;
 if(!isPistol){
  p([[-.37,-.025],[-.58,-.06],[-.64,-.12],[-.62,-.21],[-.52,-.18],
    [-.42,-.09]],.075,polymer);
  rod(0,.008,-.55,0,.06,-.16,.021,light);
  const butt=mesh(new THREE.BoxGeometry(.14,.23,.026),polymer,0,-.095,-.62);butt.rotation.x=.12;
  const magazine=p([[-.01,-.094],[.12,-.106],[.085,-.31],[-.035,-.30]],.09,black);
  magazine.position.x=.045; 
 }
 // Top rail, low profile holo optic with genuine glass-like lens.
 rod(0,.111,-.15,0,.111,forward-.12,.020,black);
 const opticBase=mesh(new THREE.CylinderGeometry(.07,.07,.057,12),black,0,.157,.025);
 opticBase.rotation.x=Math.PI/2;
 const glass=mesh(new THREE.CircleGeometry(.048,18),glow,0,.159,.055);
 glass.rotation.y=Math.PI;
 for(const x of [-.07,.07])rod(x,.15,-.08,x,.185,.09,.008,steel);
 // Distinct small glowing status panels.
 for(let i=0;i<3;i++){
  const z=-.08+i*.075;
  mesh(new THREE.BoxGeometry(.01,.024,.045),glow,-.070,.032,z);
 }
 if(plasma){
  for(const z of [.28,.39,.5]){
   const ring=mesh(new THREE.TorusGeometry(.064,.009,6,16),glow,0,0,z);
   ring.rotation.x=Math.PI/2;
  }
 }
 const flash=mesh(new THREE.ConeGeometry(plasma?.075:.053,plasma?.19:.13,7),flashMat,0,-.01,end+.16);
 flash.rotation.x=Math.PI/2;flash.visible=false;
 const spark=mesh(new THREE.SphereGeometry(.037,8,6),glow,0,-.01,end+.10);spark.visible=false;
 root.scale.setScalar(enemy?.77:scale);
 // The +Z axis is enemy forward; first-person camera rotates it toward -Z.
 root.userData={flash,spark,tip:end+.1,materials,shapeCount:root.children.length,
  setFiring(on,t=0){flash.visible=!!on;spark.visible=!!on;flash.scale.setScalar(1+Math.sin(t*27)*.14)},
  dispose(){root.traverse(o=>{if(o.isMesh)o.geometry.dispose()});materials.forEach(m=>m.dispose())}
 };
 return root;
}
