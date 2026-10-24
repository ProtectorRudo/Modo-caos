import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js';
export {THREE};
export const BLOCK=.38, DEPTH=.22;
const PALETTE=[0x37d9c5,0xffc15b,0x6b98ff,0xfc6a8b,0xaf82ff,0xff8656,0xa6e66b];
const ink=0x061627;
function shapeMesh(points,material){
 const p=new THREE.Shape();points.forEach(([x,y],i)=>i?p.lineTo(x*BLOCK,y*BLOCK):p.moveTo(x*BLOCK,y*BLOCK));p.closePath();
 const geo=new THREE.ExtrudeGeometry(p,{depth:DEPTH,steps:1,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,curveSegments:12});
 geo.translate(0,0,-DEPTH*.5);
 return new THREE.Mesh(geo,material);
}
export class TorreArt{
 constructor(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));this.renderer.setSize(innerWidth,innerHeight);
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.47;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(ink);
  this.scene.fog=new THREE.FogExp2(ink,.023);
  this.camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.025,85);
  this.group=new THREE.Group();this.scene.add(this.group);this.group.visible=true;
  this.camera.position.set(0,1.9,4.4);this.camera.lookAt(0,1.1,0);
  this.scene.add(new THREE.HemisphereLight(0xdaedff,0x25314e,2.25));
  const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(-2,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=13;key.shadow.camera.bottom=-6;key.shadow.bias=-.0003;this.scene.add(key);
  const fill=new THREE.DirectionalLight(0x52d1ff,1.8);fill.position.set(4,2,-2);this.scene.add(fill);
  this.materials=PALETTE.map(c=>new THREE.MeshStandardMaterial({color:c,metalness:.3,roughness:.29,emissive:c,emissiveIntensity:.045}));
  this.objects=new Map();this.active=null;this.shadowGhost=null;this.effects=[];this.ar=false;this.stand=new THREE.Group();this.group.add(this.stand);
  const baseMat=new THREE.MeshStandardMaterial({color:0x14283e,metalness:.53,roughness:.33});
  const sideMat=new THREE.MeshStandardMaterial({color:0x07121e,metalness:.48,roughness:.4});
  const plate=new THREE.Mesh(new THREE.BoxGeometry(2.5,.15,.72),[baseMat,baseMat,baseMat,sideMat,baseMat,baseMat]);plate.position.y=.037;plate.receiveShadow=true;this.stand.add(plate);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(2.32,.017,.57),new THREE.MeshStandardMaterial({color:0x28465d,metalness:.27,roughness:.44}));slab.position.y=.121;slab.receiveShadow=true;this.stand.add(slab);
  const railMat=new THREE.MeshBasicMaterial({color:0x55ffe6});for(const z of [-.35,.35]){const line=new THREE.Mesh(new THREE.BoxGeometry(2.42,.015,.012),railMat);line.position.set(0,.125,z);this.stand.add(line)}
  const small=new THREE.MeshBasicMaterial({color:0x46fce0,transparent:true,opacity:.55});for(let x=-1;x<=1.01;x+=.25){let dash=new THREE.Mesh(new THREE.BoxGeometry(.015,.003,.07),small);dash.position.set(x,.133,0);this.stand.add(dash)}
  this.aim=new THREE.Group();this.group.add(this.aim);
  const circle=new THREE.Mesh(new THREE.RingGeometry(.11,.125,48),new THREE.MeshBasicMaterial({color:0x61ffe6,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));circle.rotation.x=-Math.PI/2;circle.position.y=.14;this.aim.add(circle);
  this.aim.visible=false;
  this.ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.21}));this.ground.rotation.x=-Math.PI/2;this.ground.receiveShadow=true;this.ground.position.y=-.045;this.group.add(this.ground);
  this.ghost=new THREE.Mesh(new THREE.PlaneGeometry(.6,.38),new THREE.MeshBasicMaterial({color:0x73fff1,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}));this.ghost.rotation.x=-Math.PI/2;this.ghost.position.y=.145;this.group.add(this.ghost);this.ghost.visible=false;
  this.temp=new THREE.Vector3();this.clock=0;this._sizeHeight=0;
  addEventListener('resize',()=>this.resize());
 }
 resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)}
 model(shape,transparent=false){
  const mat=this.materials[shape.tone%this.materials.length].clone();
  if(transparent){mat.transparent=true;mat.opacity=.83;mat.emissiveIntensity=.18;mat.depthWrite=false}
  const grp=new THREE.Group();grp.userData.material=mat;
  for(const poly of shape.parts){const m=shapeMesh(poly,mat);m.castShadow=true;m.receiveShadow=true;grp.add(m)}
  return grp;
 }
 startBlock(id,shape){const mesh=this.model(shape);this.objects.set(id,mesh);this.group.add(mesh);return mesh}
 setActive(shape){if(this.active){this.group.remove(this.active);this.active.userData.material.dispose()}this.active=this.model(shape,true);this.group.add(this.active);this.ghost.visible=true}
 moveActive(x,y,angle){if(!this.active)return;this.active.position.set(x,y,0);this.active.rotation.z=angle;this.ghost.position.x=x;this.ghost.scale.x=1.1}
 releaseActive(){if(!this.active)return;this.group.remove(this.active);this.active.userData.material.dispose();this.active=null;this.ghost.visible=false}
 reset(){for(const ob of this.objects.values()){this.group.remove(ob);ob.userData.material?.dispose()}this.objects.clear();this.releaseActive();for(const e of this.effects){this.group.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose()}this.effects=[]}
 sync(id,x,y,rotation){const m=this.objects.get(id);if(!m)return;m.position.set(x,y,0);m.rotation.set(0,0,rotation)}
 impact(x,y,intensity=1){if(this.effects.length>28)return;const geo=new THREE.TorusGeometry(.075, .007+Math.min(.012,intensity*.003),5,24),mat=new THREE.MeshBasicMaterial({color:intensity>3?0xffc78c:0x89fff2,transparent:true,opacity:.75,depthWrite:false});
  const ring=new THREE.Mesh(geo,mat);ring.position.set(x,Math.max(.145,y),.17);this.group.add(ring);this.effects.push({mesh:ring,life:0})}
 updateFX(dt){this.effects=this.effects.filter(e=>{e.life+=dt;e.mesh.scale.setScalar(1+e.life*4);e.mesh.material.opacity=Math.max(0,.75-e.life*2.5);if(e.life>.3){this.group.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();return false}return true})}
 setScale(s){this.group.scale.setScalar(s)}
 setPreviewPose(p,yaw=0){this.group.position.set(p.x,p.y,p.z);this.group.rotation.y=yaw}
 setAR(ar){this.ar=ar;this.scene.background=ar?null:new THREE.Color(ink);this.scene.fog=ar?null:new THREE.FogExp2(ink,.023);this.renderer.setClearColor(ink,ar?0:1)}
 frame(height,dt){this.updateFX(dt);if(!this.ar){const y=Math.max(.76,height*.58+.52);const dist=Math.max(3.55,height*.98+3);const rate=Math.min(.08,dt*3.2);this.camera.position.lerp(new THREE.Vector3(0,y+1.3,dist),rate);this.temp.set(0,y,0);this.camera.lookAt(this.temp)}this.renderer.render(this.scene,this.camera)}
 destroy(){this.reset();this.renderer.setAnimationLoop(null);this.renderer.dispose()}
}
