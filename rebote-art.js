/* REBOTE MORTAL · arte WebGL procedural, integrado al mundo AR, sin sprites de pantalla. */
export function createReboteArt(T,scene){
 const root=new T.Group();scene.add(root);
 const mat=(color,metal=.7,rough=.28,em=0,ei=.0)=>new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:em,emissiveIntensity:ei});
 const dark=mat(0x0c1927,.70,.35),steel=mat(0x48647c,.75,.26),edge=mat(0x9bbdce,.58,.27);
 const carbon=mat(0x091823,.28,.54),armor=mat(0x2c5368,.62,.31),warm=mat(0xefa563,.36,.30,0xff7439,.44);
 const blue=mat(0x37e9ef,.16,.24,0x18d6ee,1.22),orange=mat(0xffa36b,.18,.29,0xeb662e,.9),red=mat(0xff5178,.27,.3,0xee2156,1.2);

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
 const floor=new T.Mesh(new T.CylinderGeometry(1.22,1.22,.022,56),new T.MeshBasicMaterial({color:0x064352,transparent:true,opacity:.29,side:T.DoubleSide,depthWrite:false}));
 floor.position.y=.016;plane.add(floor);
 const ringMat=new T.MeshBasicMaterial({color:0x45eee5,transparent:true,opacity:.72,depthTest:false,depthWrite:false});
 const gridMaterial=new T.MeshBasicMaterial({color:0x69dedc,transparent:true,opacity:.32,depthTest:false,depthWrite:false});
 for(let i=-2;i<=2;i++){
  const pos=i*.40,length=2.05;
  const xLine=new T.Mesh(new T.BoxGeometry(length,.009,.015),gridMaterial);
  xLine.position.set(0,.085,pos);plane.add(xLine);
  const zLine=new T.Mesh(new T.BoxGeometry(.015,.009,length),gridMaterial);
  zLine.position.set(pos,.085,0);plane.add(zLine);
 }
 for(let i=0;i<3;i++){
  const r=new T.Mesh(new T.TorusGeometry(1.17-i*.20,.009,6,64),i===0?ringMat:new T.MeshBasicMaterial({color:i===1?0x4de8cf:0x316a79,transparent:true,opacity:i===1?.44:.30,depthWrite:false}));
  r.rotation.x=-Math.PI/2;r.position.y=.068+i*.003;plane.add(r);
 }
 const radialMat=new T.MeshBasicMaterial({color:0x50d9d3,transparent:true,opacity:.38,depthWrite:false});
 for(let i=0;i<16;i++){
   const tick=new T.Mesh(new T.BoxGeometry(.012,.004,i%4===0?.19:.095),radialMat);
   const a=i*Math.PI/8,r=1.05;
   tick.position.set(Math.sin(a)*r,.066,Math.cos(a)*r);tick.rotation.y=a;plane.add(tick);
 }
 const center=new T.Mesh(new T.CylinderGeometry(.14,.19,.025,32),new T.MeshBasicMaterial({color:0x4cabb2,transparent:true,opacity:.22,depthWrite:false}));
 center.position.y=.07;plane.add(center);
 const youMarker=new T.Group();root.add(youMarker);
 const yourRing=new T.Mesh(new T.TorusGeometry(.135,.012,8,40),new T.MeshBasicMaterial({color:0x65ffe1,transparent:true,opacity:.84,depthWrite:false}));
 yourRing.rotation.x=-Math.PI/2;yourRing.position.y=.115;youMarker.add(yourRing);
 const yourDot=new T.Mesh(new T.CircleGeometry(.045,20),new T.MeshBasicMaterial({color:0xc4fff2,transparent:true,opacity:.9,depthWrite:false}));
 yourDot.rotation.x=-Math.PI/2;yourDot.position.y=.118;youMarker.add(yourDot);
 const botLayer=new T.Group();root.add(botLayer);
 const shotLayer=new T.Group();root.add(shotLayer);
 const fxLayer=new T.Group();root.add(fxLayer);
 const bots=new Map(),shots=new Map(),particles=[],ripples=[];
 const particleGeometry=new T.TetrahedronGeometry(1,0);
 const keptShotGeometries=new Set([sphereG,shellG,haloG,seamG]);
 const sphereG=new T.SphereGeometry(1,18,14),capsuleG=new T.CylinderGeometry(1,1,1,10);
 // Rounded, reusable hull geometry replaces the sharp voxel cubes.
 const hullShape=new T.Shape();
 hullShape.moveTo(-.42,-.5);hullShape.lineTo(.42,-.5);hullShape.quadraticCurveTo(.5,-.5,.5,-.42);
 hullShape.lineTo(.5,.42);hullShape.quadraticCurveTo(.5,.5,.42,.5);
 hullShape.lineTo(-.42,.5);hullShape.quadraticCurveTo(-.5,.5,-.5,.42);
 hullShape.lineTo(-.5,-.42);hullShape.quadraticCurveTo(-.5,-.5,-.42,-.5);
 const hullG=new T.ExtrudeGeometry(hullShape,{depth:.86,steps:1,bevelEnabled:true,bevelThickness:.055,bevelSize:.055,bevelSegments:2,curveSegments:3});
 hullG.translate(0,0,-.43);
 const sharedRobotGeometries=new Set([hullG,sphereG,capsuleG]);
 // Shared projectile geometry avoids compiling/allocating a new geometry for every shot.
 const shellG=new T.SphereGeometry(1,20,12),haloG=new T.TorusGeometry(1,.09,6,30);
 const seamG=new T.TorusGeometry(1,.032,6,48),rippleG=new T.TorusGeometry(1,.042,8,52);
 // Procedural panel pattern: a recognizable glossy BALL, not a flat neon disc.
 // The texture is generated locally; no files to download or third-party CDNs.
 const textureCanvas=document.createElement('canvas');
 textureCanvas.width=256;textureCanvas.height=128;
 const ctx=textureCanvas.getContext('2d');
 ctx.fillStyle='#f9e8ce';ctx.fillRect(0,0,256,128);
 for(let row=0;row<3;row++)for(let col=0;col<7;col++){
  const cx=col*43+(row%2)*21,cy=row*45+6;
  ctx.fillStyle=(row+col)%3===0?'#ef603b':'#ffae61';
  ctx.strokeStyle='#713a31';ctx.lineWidth=3;
  ctx.beginPath();
  for(let k=0;k<6;k++){
   const a=k*Math.PI/3,px=cx+21*Math.cos(a),py=cy+22*Math.sin(a);
   if(!k)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();ctx.fill();ctx.stroke();
 }
 for(const x of [22,112,205]){
  ctx.strokeStyle='#fff5de';ctx.lineWidth=7;ctx.beginPath();
  ctx.moveTo(x,-10);ctx.bezierCurveTo(x+25,35,x-25,78,x+6,138);ctx.stroke();
 }
 const ballTexture=new T.CanvasTexture(textureCanvas);
 ballTexture.colorSpace=T.SRGBColorSpace;
 ballTexture.wrapS=T.RepeatWrapping;
 const ballColor=new T.Color();
 const sharedRobotMaterials=new Set([dark,steel,edge,carbon,armor,warm,blue,orange,red]);
 function mesh(geo,material,parent,pos,scale){
  const m=new T.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m
 }
 function box(parent,material,pos,sz){return mesh(hullG,material,parent,pos,sz)}
 function segment(parent,material,start,end,r1=.07,r2=.075){
  const a=new T.Vector3(...start),b=new T.Vector3(...end),v=b.clone().sub(a);
  const m=new T.Mesh(new T.CylinderGeometry(r1,r2,v.length(),10),material);
  m.position.copy(a.add(b).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());parent.add(m);return m;
 }
 function buildRobot(e){
  const bot=new T.Group();botLayer.add(bot);
  const duelColors=[0x54f0db,0xffb453,0xd98fff,0x5c9aff,0xff704e,0xffd76b];
  const tierColor=e.duel?duelColors[e.duelLevel%duelColors.length]:0x49cacc;
  // Separate ground footprint gives robots contact with the actual detected floor.
  const base=new T.Group();bot.add(base);
  const pad=new T.Mesh(new T.CircleGeometry(.43,32),new T.MeshBasicMaterial({color:0x142d3c,transparent:true,opacity:.31,depthWrite:false}));
  pad.rotation.x=-Math.PI/2;pad.position.y=.013;base.add(pad);
  const padRing=new T.Mesh(new T.TorusGeometry(.39,.009,5,48),new T.MeshBasicMaterial({color:tierColor,transparent:true,opacity:.70,depthWrite:false}));
  padRing.rotation.x=-Math.PI/2;padRing.position.y=.023;base.add(padRing);
  const mech=new T.Group();bot.add(mech);
  // The same robot telegraphs its next shot: readable, physical, and not HUD noise.
  const charge=new T.Mesh(new T.TorusGeometry(.18,.018,6,40),
    new T.MeshBasicMaterial({color:0xffdf83,transparent:true,opacity:0,depthWrite:false}));
  charge.position.set(0,1.36,.43);
  mech.add(charge);charge.visible=false;
  if(e.duel){
   // Distinct tier identity without downloading heavy GLB skins: different halo
   // and shoulder insignias, still anchored to the physical floor.
   const accent=new T.MeshBasicMaterial({color:tierColor,transparent:true,opacity:.92,depthWrite:false});
   for(const sx of [-1,1]){
    const stripe=new T.Mesh(new T.BoxGeometry(.095,.036,.02),accent);
    stripe.position.set(sx*.46,1.57,.24);mech.add(stripe);
   }
   const tierHalo=new T.Mesh(new T.TorusGeometry(.41,.013,6,48),accent);
   tierHalo.rotation.x=-Math.PI/2;tierHalo.position.y=.028;
   base.add(tierHalo);
  }
  // Feet and articulated legs — 1.7m human-sized silhouette instead of block toy.
  const legs=[];
  for(const sign of [-1,1]){
   const foot=box(mech,carbon,[sign*.175,.115,.14],[.24,.13,.39]);
   box(mech,steel,[sign*.175,.16,.205],[.25,.07,.14]);
   const leg=new T.Group();leg.position.set(sign*.175,.77,0);mech.add(leg);legs.push(leg);
   segment(leg,carbon,[0,-.04,0],[0,-.43,.04],.115,.12);
   box(leg,armor,[0,-.19,.095],[.245,.38,.22]);
   box(leg,edge,[0,-.38,.13],[.22,.13,.20]);
   segment(mech,carbon,[sign*.175,.39,.035],[sign*.175,.19,.10],.085,.085);
  }
  const pelvis=box(mech,dark,[0,.82,0],[.48,.22,.34]);
  box(mech,steel,[0,.91,.11],[.40,.10,.20]);
  const torso=box(mech,armor,[0,1.22,0],[.68,.61,.38]);
  const breast=box(mech,carbon,[0,1.26,.215],[.51,.41,.075]);
  const yoke=box(mech,steel,[0,1.53,.08],[.59,.12,.37]);
  // Stylized armored plating, beveled and layered; thin lit seams.
  for(const sign of [-1,1]){
   const plate=box(mech,edge,[sign*.22,1.33,.27],[.14,.28,.09]);
   plate.rotation.z=-sign*.22;
   box(mech,blue,[sign*.26,1.03,.225],[.09,.075,.075]);
  }
  const reactor=new T.Group();reactor.position.set(0,1.26,.272);mech.add(reactor);
  const bezel=new T.Mesh(new T.TorusGeometry(.165,.034,8,24),steel);reactor.add(bezel);
  const reactorCore=new T.Mesh(new T.IcosahedronGeometry(.116,1),orange);
  reactor.add(reactorCore);
  const reactorGlint=new T.Mesh(new T.SphereGeometry(.07,12,8),new T.MeshBasicMaterial({color:0xffd7a7,transparent:true,opacity:.68,depthWrite:false}));
  reactorGlint.position.z=.075;reactor.add(reactorGlint);
  // Short neck + rounded helmet with wraparound luminous visor.
  segment(mech,carbon,[0,1.56,0],[0,1.70,0],.13,.13);
  const head=new T.Group();head.position.set(0,1.80,0);mech.add(head);
  box(head,steel,[0,0,0],[.42,.33,.37]);
  box(head,dark,[0,.115,.012],[.44,.13,.36]);
  const visor=box(head,blue,[0,-.025,.215],[.37,.092,.065]);
  box(head,edge,[0,-.14,.158],[.25,.04,.13]);
  for(const sign of [-1,1]){
   box(head,armor,[sign*.24,-.02,.015],[.115,.22,.24]);
   const antenna=segment(head,steel,[sign*.17,.14,0],[sign*.19,.28,0],.021,.021);
   const diode=new T.Mesh(new T.SphereGeometry(.038,8,6),blue);
   diode.position.set(sign*.19,.29,0);head.add(diode);
  }
  const shoulderGroups=[];
  for(const sign of [-1,1]){
   const shoulder=new T.Group();shoulder.position.set(sign*.45,1.46,0);mech.add(shoulder);shoulderGroups.push(shoulder);
   const joint=new T.Mesh(new T.SphereGeometry(.145,14,10),carbon);shoulder.add(joint);
   box(shoulder,steel,[sign*.05,.025,.03],[.28,.26,.34]);
   box(shoulder,edge,[sign*.07,.11,.18],[.24,.055,.14]);
   segment(shoulder,carbon,[sign*.065,-.10,0],[sign*.11,-.39,.015],.098,.095);
   box(shoulder,armor,[sign*.11,-.26,.078],[.21,.32,.23]);
   const elbow=new T.Mesh(new T.SphereGeometry(.10,12,10),steel);
   elbow.position.set(sign*.11,-.45,.025);shoulder.add(elbow);
   segment(shoulder,carbon,[sign*.11,-.45,.025],[sign*.11,-.72,.075],.087,.095);
   box(shoulder,steel,[sign*.11,-.63,.10],[.20,.29,.18]);
   box(shoulder,dark,[sign*.11,-.83,.08],[.205,.13,.22]);
   box(shoulder,blue,[sign*.11,-.65,.22],[.09,.12,.045]);
  }
  bot.userData={mech,base,head,visor,reactor:reactorCore,reactorRing:bezel,legs,
   leftArm:shoulderGroups[0],rightArm:shoulderGroups[1],torso,
   armorPanels:[],charge};
  if(e.boss){
   for(const sign of [-1,1]){
    const panel=box(mech,edge,[sign*.38,1.20,.10],[.23,.43,.36]);
    panel.rotation.z=sign*.11;bot.userData.armorPanels.push(panel);
   }
   const shield=new T.Mesh(new T.IcosahedronGeometry(1.03,1),new T.MeshBasicMaterial({color:0x49dfea,wireframe:true,transparent:true,opacity:.17,depthWrite:false}));
   shield.position.set(0,1.03,0);shield.scale.set(.78,1.05,.69);shield.visible=false;
   mech.add(shield);bot.userData.shieldMesh=shield;
  }
  return bot;
 }
 function makeBall(p){
  const group=new T.Group();shotLayer.add(group);
  const spin=new T.Group();group.add(spin);
  const material=new T.MeshStandardMaterial({
   map:ballTexture,color:0xffffff,metalness:.12,roughness:.25,
   emissive:0xff6436,emissiveIntensity:.23,
   transparent:p.type==='fake',opacity:p.type==='fake'?.40:1
  });
  const core=mesh(sphereG,material,spin,[0,0,0],[p.radius,p.radius,p.radius]);
  // Bands rotate with the sphere, so it reads as a physical spinning ball.
  const seamMaterial=new T.MeshBasicMaterial({color:0x633d38,transparent:true,opacity:.55,depthWrite:false});
  const seamA=new T.Mesh(seamG,seamMaterial);seamA.scale.setScalar(p.radius*.99);spin.add(seamA);
  const seamB=new T.Mesh(seamG,seamMaterial);seamB.scale.setScalar(p.radius*.99);seamB.rotation.y=Math.PI/2;spin.add(seamB);
  const shine=new T.Mesh(new T.SphereGeometry(1,12,9),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false}));
  shine.position.set(-p.radius*.29,p.radius*.26,p.radius*.79);
  shine.scale.setScalar(p.radius*.16);spin.add(shine);
  const shell=new T.Mesh(shellG,new T.MeshBasicMaterial({color:0xff8e62,transparent:true,opacity:.12,depthWrite:false}));
  shell.scale.setScalar(p.radius*1.23);group.add(shell);
  const halo=new T.Mesh(haloG,new T.MeshBasicMaterial({color:0xffe8cc,transparent:true,opacity:.53,depthWrite:false}));
  halo.scale.setScalar(p.radius*1.2);group.add(halo);
  const trail=new T.Mesh(new T.CylinderGeometry(.04,.24,1,8),new T.MeshBasicMaterial({color:0xff8e59,transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide}));
  group.add(trail);
  group.userData={core,material,shell,halo,trail,shine,spin,seamMaterial};
  return group;
 }
 function shockwave(pos,grade){
  for(let n=0;n<2;n++){
   const m=new T.Mesh(rippleG,new T.MeshBasicMaterial({
    color:grade==='PERFECTO'?0x6affea:0xffd07d,
    transparent:true,opacity:n===0?.95:.65,depthWrite:false,side:T.DoubleSide
   }));
   m.position.set(pos.x,pos.y,pos.z);
   m.scale.setScalar(.11);
   fxLayer.add(m);
   ripples.push({obj:m,age:-n*.09,life:.49,grade});
  }
 }
 function spark(pos,color,count=9,life=.5,power=1){
  for(let i=0;i<count;i++){
   if(particles.length>140){let old=particles.shift();fxLayer.remove(old.obj);old.obj.material.dispose()}
   const m=new T.Mesh(particleGeometry,new T.MeshBasicMaterial({color,transparent:true,opacity:.98,depthWrite:false}));
   m.scale.setScalar(.035*power);
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
   // Contact pad stays on the floor; only the mechanical body bobs subtly.
   b.userData.mech.position.y=.012+Math.sin(time*1.7+e.phase)*.013;
   b.userData.reactor.rotation.y+=dt*2.5;
   // Mech visor always faces the tracked player, even if they circle the arena.
   b.rotation.y=Math.atan2(g.eye.x-e.x,g.eye.z-e.z);
   b.rotation.y+=Math.sin(time*.48+e.phase)*.025;
   b.userData.head.rotation.y=Math.sin(time*.74+e.phase)*.19;
   b.userData.leftArm.rotation.x=-.55+Math.sin(time*2+e.phase)*.26;
   const waiting=g.state==='playing'&&e.alive&&Number.isFinite(g.nextShot)&&
    g.nextShot-g.elapsed>0&&g.nextShot-g.elapsed<.55&&
    !g.projectiles.some(p=>!p.dead&&!p.returning&&p.type!=='fake');
   const windup=waiting?Math.pow(1-(g.nextShot-g.elapsed)/.55,.75):0;
   b.userData.charge.visible=waiting;
   b.userData.charge.scale.setScalar(1+windup*.70);
   b.userData.charge.material.opacity=waiting?.22+windup*.72:0;
   b.userData.charge.rotation.z=time*3.0;
   b.userData.rightArm.rotation.x=-.70-windup*.70+Math.sin(time*3+e.phase)*.15;
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
   b.scale.setScalar((e.boss?1.13:.84)*(hit?1-.055*Math.sin((g.elapsed-e.hitTime)*32):1));
   if(!e.alive)b.rotation.z=(Math.min(1,(g.elapsed-e.hitTime)/.75))*-1.2;
  }
  for(const [id,b] of bots)if(!g.enemies.some(e=>e.id===id)){
   botLayer.remove(b);
   b.traverse(obj=>{
    if(obj.geometry&&!sharedRobotGeometries.has(obj.geometry))obj.geometry.dispose();
    if(obj.material&&!sharedRobotMaterials.has(obj.material))obj.material.dispose();
   });
   bots.delete(id);
  }
  for(const p of g.projectiles){
   let group=shots.get(p.id);if(!group){group=makeBall(p);shots.set(p.id,group)}
   // Bounce trajectory has a visible upward spring immediately after DEVOLVER.
   const spring=p.returning?Math.sin(Math.min(1,p.age/.48)*Math.PI)*.16:0;
   group.position.set(p.pos.x,p.pos.y+spring,p.pos.z);
   group.userData.spin.rotation.y+=dt*(p.returning?17:9);
   group.userData.spin.rotation.x+=dt*(p.returning?12:5);
   const m=group.userData;
   m.trail.visible=p.type!=='fake'&&p.age>.08;
   m.trail.material.color.setHex(p.returning?0x4dfff0:0xffa066);
   m.trail.material.opacity=p.returning?.36:.16;
   m.trail.position.set(0,0,0);
   const velocity=new T.Vector3(p.velocity.x,p.velocity.y,p.velocity.z);
   // Align the short plume behind each moving sphere in 3D world coordinates.
   m.trail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),velocity.clone().normalize().negate());
   m.trail.scale.set(p.radius*.9,.5+p.speed*.055,p.radius*.9);
   m.trail.position.addScaledVector(velocity.clone().normalize(),-.20);
   m.shine.material.opacity=p.returning?.78:.55;
   m.material.color.setHex(p.returning?0xc0fff2:p.type==='pesada'?0xffdc9a:p.type==='fake'?0xbba7ff:p.type==='fantasma'?0xe2b4ff:0xffffff);
   m.material.emissive.setHex(p.returning?0x00ddbe:0xff6337);
   m.material.emissiveIntensity=p.returning?.7:.22;
   m.seamMaterial.color.setHex(p.returning?0x087766:0x633d38);
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
   const elastic=p.returning&&p.age<.22?1+Math.sin(p.age/.22*Math.PI)*.22:1;
   group.scale.setScalar((1+(flicker-1)*.22)*(p.grade==='PERFECTO'&&p.returning?1.18:1)*elastic);
   m.material.opacity=p.type==='fake'?.32+.08*Math.sin(time*12):1;
   m.shell.material.opacity=p.type==='fake'?.09:.19+.07*Math.sin(time*23+p.id);
   if(p.returning&&Math.random()<.22)spark(p.pos,0x5effea,1,.16,.3);
  }
  for(const [id,group] of shots)if(!g.projectiles.some(p=>p.id===id)){
   shotLayer.remove(group);
   group.traverse(obj=>{if(obj.material)obj.material.dispose();if(obj.geometry&&!keptShotGeometries.has(obj.geometry))obj.geometry.dispose()});
   shots.delete(id);
  }
  for(let i=ripples.length-1;i>=0;i--){
   const wave=ripples[i];wave.age+=dt;
   if(wave.age<0)continue;
   const progress=Math.min(1,wave.age/wave.life);
   wave.obj.scale.setScalar(.10+progress*(wave.grade==='PERFECTO'?.72:.47));
   wave.obj.material.opacity=(1-progress)*.9;
   if(progress>=1){fxLayer.remove(wave.obj);wave.obj.material.dispose();ripples.splice(i,1)}
  }
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];p.life-=dt;p.obj.position.addScaledVector(p.vel,dt);p.vel.y-=dt*1.0;
   p.obj.material.opacity=Math.max(0,p.life/p.max);
   if(p.life<=0){fxLayer.remove(p.obj);p.obj.material.dispose();particles.splice(i,1)}
  }
 }
 function effect(e){
  if(e.type==='telegraph')spark({x:e.x,y:1.45,z:e.z},0xffd27a,6,.19,.55);
  if(e.type==='duel-intro')spark({x:e.x,y:1.35,z:e.z},[0x54f0db,0xffb453,0xd98fff,0x5c9aff,0xff704e,0xffd76b][e.level]||0x5bffe1,23,.72,1.2);
  if(e.type==='duel-ko')spark({x:e.x||0,y:1.3,z:e.z||-2.3},0xffd674,34,.65,1.5);
  if(e.type==='return'){
   const at={x:e.x??0,y:e.y??1.5,z:e.z??0};
   shockwave(at,e.grade);
   spark(at,e.grade==='PERFECTO'?0x6dfff1:0xffdba0,e.grade==='PERFECTO'?19:11,.48,e.grade==='PERFECTO'?1.35:1);
  }
  if(e.type==='launch')spark({x:e.x,y:e.y??1.5,z:e.z},0xffb36e,4,.22,.45);
  if(e.type==='enemy-hit'||e.type==='enemy-down')spark({x:e.x,y:1.4,z:e.z},e.type==='enemy-down'?0xff7343:0x7effec,e.type==='enemy-down'?28:13,.8,1.6);
  if(e.type==='damage')spark({x:0,y:1.4,z:0},0xff3f58,23,.38,1.4);
  if(e.type==='legend')spark({x:0,y:1.45,z:-1},0xdfffff,60,1.1,2.2);
 }
 function dispose(){
  scene.remove(root);
  root.traverse(o=>{if(o.geometry&&!sharedRobotGeometries.has(o.geometry))o.geometry.dispose();
   if(o.material&&!sharedRobotMaterials.has(o.material))o.material.dispose()});
  for(const g of sharedRobotGeometries)g.dispose();
  ballTexture.dispose();seamG.dispose();rippleG.dispose();particleGeometry.dispose();
  for(const m of sharedRobotMaterials)m.dispose();
 }
 return {root,plane,update,effect,dispose,setSize(v){plane.userData.size=Math.max(.7,Math.min(1.45,v))},
  getRobotCount(){return bots.size},getShotCount(){return shots.size},
  getTexturedBalls(){return [...shots.values()].filter(group=>!!group.userData.material?.map).length},
  getRobotFacingDot(eye){
   const dots=[...bots.values()].filter(b=>b.visible).map(b=>{
    const dx=eye.x-b.position.x,dz=eye.z-b.position.z,d=Math.hypot(dx,dz);
    return d>.01?(Math.sin(b.rotation.y)*dx+Math.cos(b.rotation.y)*dz)/d:1;
   });
   return dots.length?Math.min(...dots):1;
  },
  getRicochetRipples(){return ripples.length}
 };
}
