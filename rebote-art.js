/* REBOTE MORTAL · arte WebGL procedural, integrado al mundo AR, sin sprites de pantalla. */
export function createReboteArt(T,scene){
 const root=new T.Group();scene.add(root);
 const mat=(color,metal=.7,rough=.28,em=0,ei=.0)=>new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:em,emissiveIntensity:ei});
 const dark=mat(0x162537,.78,.29),steel=mat(0x5f829b,.87,.21),edge=mat(0xc5e9f0,.88,.18);
 const blue=mat(0x20dfff,.22,.22,0x12b9e7,2.2),orange=mat(0xff5b31,.19,.29,0xfa3716,2),red=mat(0xf03662,.25,.3,0xe51c41,1.5);
 const plane=new T.Group();root.add(plane);
 const placementCue=new T.Group();root.add(placementCue);
 const neon=new T.MeshBasicMaterial({color:0x60ffe1,depthTest:false});
 const gold=new T.MeshBasicMaterial({color:0xffdb69,depthTest:false});
 const beacon=new T.Mesh(new T.CylinderGeometry(.055,.055,.80,12),neon);
 beacon.position.y=.52;beacon.renderOrder=9;placementCue.add(beacon);
 const beaconHead=new T.Mesh(new T.OctahedronGeometry(.17),gold);
 beaconHead.position.y=.99;beaconHead.renderOrder=10;placementCue.add(beaconHead);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const post=new T.Mesh(new T.BoxGeometry(.11,.45,.11),neon);
  post.position.set(sx*1.02,.25,sz*1.02);
  placementCue.add(post);
 }
 const floor=new T.Mesh(new T.CylinderGeometry(1.45,1.45,.06,64),new T.MeshBasicMaterial({color:0x07455a,transparent:true,opacity:.90,side:T.DoubleSide,depthWrite:false}));
 floor.position.y=.016;plane.add(floor);
 const ringMat=new T.MeshBasicMaterial({color:0x30efff,transparent:true,opacity:1,depthTest:false});
 const gridMaterial=new T.MeshBasicMaterial({color:0x4dffea,transparent:true,opacity:.67,depthTest:false,depthWrite:false});
 for(let i=-2;i<=2;i++){
  const pos=i*.48,length=2.58;
  const xLine=new T.Mesh(new T.BoxGeometry(length,.009,.015),gridMaterial);
  xLine.position.set(0,.085,pos);plane.add(xLine);
  const zLine=new T.Mesh(new T.BoxGeometry(.015,.009,length),gridMaterial);
  zLine.position.set(pos,.085,0);plane.add(zLine);
 }
 for(let i=0;i<3;i++){
  const r=new T.Mesh(new T.TorusGeometry(1.36-i*.22,.012,8,88),i===0?ringMat:new T.MeshBasicMaterial({color:i===1?0x3de8e5:0x164d75,transparent:true,opacity:i===1?.65:.7}));
  r.rotation.x=-Math.PI/2;r.position.y=.068+i*.003;plane.add(r);
 }
 const radialMat=new T.MeshBasicMaterial({color:0x4fb8c6,transparent:true,opacity:.3});
 for(let i=0;i<16;i++){
   const tick=new T.Mesh(new T.BoxGeometry(.012,.004,i%4===0?.19:.095),radialMat);
   const a=i*Math.PI/8,r=1.18;
   tick.position.set(Math.sin(a)*r,.066,Math.cos(a)*r);tick.rotation.y=a;plane.add(tick);
 }
 const center=new T.Mesh(new T.CylinderGeometry(.24,.3,.035,8),mat(0x103a4a,.7,.34,0x149cba,.2));
 center.position.y=.07;plane.add(center);
 const youMarker=new T.Group();root.add(youMarker);
 const yourRing=new T.Mesh(new T.TorusGeometry(.135,.012,8,40),new T.MeshBasicMaterial({color:0x65ffe1,transparent:true,opacity:.84,depthWrite:false}));
 yourRing.rotation.x=-Math.PI/2;yourRing.position.y=.115;youMarker.add(yourRing);
 const yourDot=new T.Mesh(new T.CircleGeometry(.045,20),new T.MeshBasicMaterial({color:0xc4fff2,transparent:true,opacity:.9,depthWrite:false}));
 yourDot.rotation.x=-Math.PI/2;yourDot.position.y=.118;youMarker.add(yourDot);
 const botLayer=new T.Group();root.add(botLayer);
 const shotLayer=new T.Group();root.add(shotLayer);
 const fxLayer=new T.Group();root.add(fxLayer);
 const bots=new Map(),shots=new Map(),particles=[];
 const sphereG=new T.SphereGeometry(1,14,10),capsuleG=new T.CylinderGeometry(1,1,1,8);
 // Shared projectile geometry avoids compiling/allocating a new geometry for every shot.
 const shellG=new T.SphereGeometry(1,20,12),haloG=new T.TorusGeometry(1,.09,6,30);
 const sharedRobotMaterials=new Set([dark,steel,edge,blue,orange,red]);
 function mesh(geo,material,parent,pos,scale){
  const m=new T.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m
 }
 function box(parent,material,pos,sz){return mesh(new T.BoxGeometry(1,1,1),material,parent,pos,sz)}
 function buildRobot(e){
  const body=new T.Group();botLayer.add(body);let scale=e.boss?1.35:1;
  body.scale.setScalar(scale);
  const shadow=new T.Mesh(new T.CircleGeometry(.42,24),new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.23,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.075;body.add(shadow);
  const hips=box(body,dark,[0,.85,0],[.52,.28,.33]);
  const torso=box(body,steel,[0,1.39,0],[.73,.76,.43]);torso.rotation.z=.03;
  box(body,dark,[0,1.38,.245],[.64,.51,.075]);
  box(body,edge,[0,1.61,.275],[.44,.11,.09]);
  const reactor=new T.Mesh(new T.CylinderGeometry(.15,.15,.04,12),blue);
  reactor.rotation.x=Math.PI/2;reactor.position.set(0,1.35,.304);body.add(reactor);
  const head=new T.Group();head.position.set(0,1.91,0);body.add(head);
  box(head,steel,[0,0,0],[.43,.39,.38]);
  const visor=box(head,blue,[0,-.035,.211],[.38,.12,.05]);visor.rotation.x=-.07;
  box(head,edge,[0,.19,0],[.32,.08,.35]);
  for(const sign of [-1,1]){
   const shoulder=new T.Group();shoulder.position.set(sign*.49,1.67,.02);body.add(shoulder);
   box(shoulder,edge,[sign*.015,-.05,0],[.32,.28,.4]);
   const arm=new T.Group();arm.position.set(sign*.09,-.22,0);shoulder.add(arm);
   box(arm,dark,[0,-.27,0],[.25,.55,.26]);
   box(arm,steel,[0,-.55,.03],[.3,.18,.32]);
   const leg=new T.Group();leg.position.set(sign*.19,.72,0);body.add(leg);
   box(leg,dark,[0,-.26,0],[.29,.54,.31]);
   box(leg,steel,[0,-.57,.02],[.32,.22,.39]);
   box(leg,edge,[0,-.71,.13],[.38,.13,.53]);
   if(sign===-1)body.userData.leftArm=shoulder;
   else body.userData.rightArm=shoulder;
   (body.userData.legs??=[]).push(leg);
  }
  const belt=box(body,edge,[0,.97,.18],[.62,.1,.18]);belt.rotation.z=.05;
  if(e.boss){
   const shield=new T.Mesh(new T.IcosahedronGeometry(1.13,1),new T.MeshBasicMaterial({
    color:0x3be8ff,transparent:true,opacity:.29,depthWrite:false,side:T.DoubleSide,wireframe:true
   }));
   shield.position.set(0,1.25,0);shield.scale.set(1,1.14,.72);shield.visible=false;
   body.add(shield);body.userData.shieldMesh=shield;
   // Separate heavy armor plates, progressively lost during the boss battle.
   body.userData.armorPanels=[];
   for(const side of [-1,1]){
    const panel=box(body,edge,[side*.46,1.47,.11],[.19,.56,.32]);
    panel.rotation.z=side*.18;
    body.userData.armorPanels.push(panel);
   }
  }
  body.userData.visor=visor;body.userData.head=head;body.userData.torso=torso;body.userData.reactor=reactor;
  return body;
 }
 function makeBall(p){
  const group=new T.Group();shotLayer.add(group);
  const material=new T.MeshBasicMaterial({color:p.returning?0x6effea:p.type==='pesada'?0xffc35a:p.type==='fake'?0xbba7ff:p.type==='fantasma'?0xaf8bf9:0xff744d,transparent:p.type==='fake',opacity:p.type==='fake'?.38:1});
  const core=mesh(sphereG,material,group,[0,0,0],[p.radius*.73,p.radius*.73,p.radius*.73]);
  const shell=new T.Mesh(shellG,new T.MeshBasicMaterial({color:p.returning?0x7cfff4:0xff6a33,transparent:true,opacity:.20,depthWrite:false}));
  shell.scale.setScalar(p.radius*1.42);group.add(shell);
  const halo=new T.Mesh(haloG,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false}));
  halo.scale.setScalar(p.radius*1.24);group.add(halo);group.userData={core,material,shell,halo};return group;
 }
 function spark(pos,color,count=9,life=.5,power=1){
  for(let i=0;i<count;i++){
   if(particles.length>155){let old=particles.shift();fxLayer.remove(old.obj);old.obj.geometry.dispose();old.obj.material.dispose()}
   const m=new T.Mesh(new T.TetrahedronGeometry(.035*power,0),new T.MeshBasicMaterial({color,transparent:true,opacity:.98,depthWrite:false}));
   m.position.set(pos.x,pos.y,pos.z);fxLayer.add(m);
   const a=i*2.399+Math.random()*.8,s=.5+Math.random()*.9;
   particles.push({obj:m,vel:new T.Vector3(Math.cos(a)*s,(Math.random()-.25)*1.8,Math.sin(a)*s),life,max:life});
  }
 }
 function update(g,time,dt,preview=false){
  plane.visible=preview||g.state==='playing'||g.state==='ready';
  const pulse=.85+.15*Math.sin(time*3);
  placementCue.visible=preview;
  placementCue.scale.setScalar(plane.userData.size||1);
  beaconHead.rotation.y=time*2.2;
  beaconHead.position.y=.98+Math.sin(time*4)*.08;
  ringMat.opacity=pulse;center.rotation.y=time*.24;
  youMarker.visible=g.state==='ready'||g.state==='playing';
  if(g.eye&&youMarker.visible){youMarker.position.set(g.eye.x,0,g.eye.z);yourRing.scale.setScalar(1+.10*Math.sin(time*5));}
  yourRing.material.opacity=.70+.25*pulse;
  plane.scale.setScalar(plane.userData.size||1);
  for(const e of g.enemies){
   let b=bots.get(e.id);if(!b){b=buildRobot(e);bots.set(e.id,b)}
   b.visible=e.alive||g.elapsed-e.hitTime<1.1;
   b.position.set(e.x,0,e.z);
   b.rotation.y=Math.sin(time*.48+e.phase)*.14;
   b.userData.head.rotation.y=Math.sin(time*.74+e.phase)*.19;
   b.userData.leftArm.rotation.x=-.55+Math.sin(time*2+e.phase)*.26;
   b.userData.rightArm.rotation.x=-.70+Math.sin(time*3+e.phase)*.35;
   b.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(time*1.2+i*Math.PI)*.075);
   b.userData.torso.rotation.z=Math.sin(time*1.6+e.phase)*.02;
   const dmg=Math.max(0,1-e.health/e.maxHealth);
   if(b.userData.shieldMesh){
    b.userData.shieldMesh.visible=e.alive&&!!e.shield;
    b.userData.shieldMesh.rotation.y=time*.75;
    b.userData.shieldMesh.material.opacity=.21+.10*Math.sin(time*9);
   }
   if(b.userData.armorPanels)b.userData.armorPanels.forEach((panel,i)=>{panel.visible=dmg<(i===0?.40:.72)});
   b.userData.visor.material=dmg>.48?red:blue;
   b.userData.reactor.material=dmg>.48?orange:blue;
   const hit=g.elapsed-e.hitTime<.26;
   b.scale.setScalar((e.boss?1.35:1)*(hit?1-.09*Math.sin((g.elapsed-e.hitTime)*32):1));
   if(!e.alive)b.rotation.z=(Math.min(1,(g.elapsed-e.hitTime)/.75))*-1.2;
  }
  for(const [id,b] of bots)if(!g.enemies.some(e=>e.id===id)){
   botLayer.remove(b);
   b.traverse(obj=>{
    if(obj.geometry)obj.geometry.dispose();
    if(obj.material&&!sharedRobotMaterials.has(obj.material))obj.material.dispose();
   });
   bots.delete(id);
  }
  for(const p of g.projectiles){
   let group=shots.get(p.id);if(!group){group=makeBall(p);shots.set(p.id,group)}
   group.position.set(p.pos.x,p.pos.y,p.pos.z);
   group.rotation.z+=dt*3;
   const m=group.userData;
   m.material.color.setHex(p.returning?0x65ffe7:p.type==='pesada'?0xffcd67:p.type==='fake'?0xbba7ff:p.type==='fantasma'?0x9c80e9:0xff693b);
   m.shell.material.color.setHex(p.returning?0x7cfff5:0xff7939);
   m.halo.rotation.y+=dt*4.7;
   // The ball itself telegraphs the strike window without covering the camera.
   const distance=Math.hypot(p.pos.x-g.eye.x,p.pos.y-g.eye.y,p.pos.z-g.eye.z);
   const nearStrike=!p.returning&&p.type!=='fake';
   const urgency=nearStrike?Math.max(0,1-Math.abs(distance-.58)/.48):0;
   m.halo.scale.setScalar(p.radius*1.24*(1+urgency*.36));
   m.halo.material.color.setHex(urgency>.50?0xffd978:p.returning?0x62ffee:0xffffff);
   m.halo.material.opacity=p.type==='fake'?.16:.50+.40*urgency;
   const flicker=1+.11*Math.sin(time*28+p.id);
   group.scale.setScalar(flicker*(p.grade==='PERFECTO'&&p.returning?1.33:1));
   m.material.opacity=p.type==='fake'?.28+.12*Math.sin(time*12):1;
   m.shell.material.opacity=p.type==='fake'?.09:.19+.07*Math.sin(time*23+p.id);
   if(p.returning&&Math.random()<.43)spark(p.pos,0x5effea,2,.2,.36);
  }
  for(const [id,group] of shots)if(!g.projectiles.some(p=>p.id===id)){
   shotLayer.remove(group);
   group.traverse(obj=>{if(obj.material)obj.material.dispose()});
   shots.delete(id);
  }
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];p.life-=dt;p.obj.position.addScaledVector(p.vel,dt);p.vel.y-=dt*1.0;
   p.obj.material.opacity=Math.max(0,p.life/p.max);
   if(p.life<=0){fxLayer.remove(p.obj);p.obj.geometry.dispose();p.obj.material.dispose();particles.splice(i,1)}
  }
 }
 function effect(e){
  if(e.type==='return'){const p=shots.get(e.id);if(p)spark(p.position,e.grade==='PERFECTO'?0x6dfff1:0x50b8ff,e.grade==='PERFECTO'?28:12,.5,e.grade==='PERFECTO'?1.4:1)}
  if(e.type==='enemy-hit'||e.type==='enemy-down')spark({x:e.x,y:1.4,z:e.z},e.type==='enemy-down'?0xff7343:0x7effec,e.type==='enemy-down'?49:19,.8,1.6);
  if(e.type==='damage')spark({x:0,y:1.4,z:0},0xff3f58,23,.38,1.4);
  if(e.type==='legend')spark({x:0,y:1.45,z:-1},0xdfffff,60,1.1,2.2);
 }
 function dispose(){
  scene.remove(root);
  root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values({dark,steel,edge,blue,orange,red}).includes(o.material))o.material.dispose()});
 }
 return {root,plane,update,effect,dispose,setSize(v){plane.userData.size=Math.max(.7,Math.min(1.45,v))},getRobotCount(){return bots.size},getShotCount(){return shots.size}};
}
