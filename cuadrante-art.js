/* CUADRANTE • original GPU environment and shaders-free PBR mobile renderer */
(function(root){
'use strict';
root.CuadranteArt=function(T){
 const C=0x00dfff,O=0xff762d,D=0x101824;
 function material(color,metal=.65,rough=.32,emissive=0,intensity=0){return new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive,emissiveIntensity:intensity})}
 function box(w,h,d,mat){return new T.Mesh(new T.BoxGeometry(w,h,d),mat)}
 function tube(a,b,r,mat,parent){const delta=new T.Vector3().subVectors(b,a),m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),7),mat);m.position.copy(a).addScaledVector(delta,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());parent.add(m);return m}
 function edgeBox(w,h,d,mat,parent){const g=new T.BoxGeometry(w,h,d),lines=new T.LineSegments(new T.EdgesGeometry(g),new T.LineBasicMaterial({color:mat,transparent:true,opacity:.85}));parent.add(lines);return lines}
 function makeStage(){
  const scene=new T.Scene();const root=new T.Group();scene.add(root);
  const dark=material(0x090e16,.83,.29),steel=material(0x18212b,.84,.34),panel=material(0x273447,.73,.4),glass=new T.MeshPhysicalMaterial({color:0x06283d,metalness:.38,roughness:.13,transparent:true,opacity:.68,depthWrite:false,clearcoat:.92,clearcoatRoughness:.12});
  const cyan=new T.MeshBasicMaterial({color:C}),orange=new T.MeshBasicMaterial({color:O}),white=new T.MeshBasicMaterial({color:0xc3fff8});
  const tealGlow=new T.MeshBasicMaterial({color:C,transparent:true,opacity:.2,depthWrite:false,blending:T.AdditiveBlending});
  const amberGlow=new T.MeshBasicMaterial({color:O,transparent:true,opacity:.23,depthWrite:false,blending:T.AdditiveBlending});
  scene.add(new T.HemisphereLight(0xb8e7ff,0x08121b,2.0));
  const overhead=new T.DirectionalLight(0xd9f0ff,2.8);overhead.position.set(-3,8,5);scene.add(overhead);
  const backlight=new T.PointLight(0xff6a20,15,8,1.8);backlight.position.set(0,1.25,-2.9);root.add(backlight);
  // NEON ARENA: an OPEN arena anchored to the real floor. No ceiling,
  // opaque rear wall or full-height side walls blocking the AR camera.
  const openArena=new T.Group();openArena.name='cuadrante-open-arena';root.add(openArena);
  const matTile=material(0x1a5360,.52,.36),altTile=material(0x123545,.57,.42);
  for(const m of [matTile,altTile]){m.transparent=true;m.opacity=.57;m.depthWrite=false;m.side=T.DoubleSide}
  const tinyBar=new T.MeshBasicMaterial({color:0x3b9da8,transparent:true,opacity:.37,depthWrite:false});
  const edgeWhite=new T.MeshBasicMaterial({color:0x75fff9,transparent:true,opacity:.83,depthWrite:false,blending:T.AdditiveBlending});
  const edgeAmber=new T.MeshBasicMaterial({color:0xffa65e,transparent:true,opacity:.82,depthWrite:false,blending:T.AdditiveBlending});
  const floorGlow=new T.MeshBasicMaterial({color:0x00cfff,transparent:true,opacity:.065,depthWrite:false,side:T.DoubleSide});
  const floor=box(3.49,.009,5.94,floorGlow);floor.name='cuadrante-ghost-floor';floor.position.set(0,.118,0);openArena.add(floor);
  // Two instanced tile sets, transparent enough to retain real-world floor cues.
  const floorGeometry=new T.PlaneGeometry(.515,.492),tilesA=[],tilesB=[];
  const dummy=new T.Object3D();
  for(let z=-2.76;z<2.96;z+=.52){
   for(let x=-1.55;x<1.66;x+=.55){
    (Math.round((x+z)*10)%4===0?tilesB:tilesA).push([x,.133,z]);
   }
  }
  for(const [mat,positions] of [[matTile,tilesA],[altTile,tilesB]]){
   const tile=new T.InstancedMesh(floorGeometry,mat,positions.length);
   tile.name='cuadrante-holographic-floor-tiles';
   positions.forEach((p,i)=>{dummy.position.set(...p);dummy.rotation.set(-Math.PI/2,0,0);
    dummy.updateMatrix();tile.setMatrixAt(i,dummy.matrix);
    const edge=Math.min(1.7-Math.abs(p[0]),3.02-Math.abs(p[2]));
    const shade=Math.max(.28,Math.min(1,edge/.47));
    tile.setColorAt(i,new T.Color(0x8ed9df).multiplyScalar(shade));
   });
   tile.instanceMatrix.needsUpdate=true;if(tile.instanceColor)tile.instanceColor.needsUpdate=true;
   tile.frustumCulled=false;openArena.add(tile);
  }
  const stripMaterial=new T.MeshBasicMaterial({color:0x19f4ff,transparent:true,opacity:.57,depthWrite:false,blending:T.AdditiveBlending});
  for(let z=-2.68;z<3;z+=1.02){
   const seam=box(3.29,.004,.010,stripMaterial);
   seam.position.set(0,.151,z);openArena.add(seam);
  }
  for(const x of [-1.12,0,1.12]){
   const lane=box(.010,.006,5.95,tinyBar);
   lane.position.set(x,.154,0);openArena.add(lane);
  }
  // Low guardrails leave the space above the ball visually open, unlike
  // opaque enclosed tunnels. Physics still uses the original court bounds.
  for(const side of [-1,1]){
   for(const y of [.19,.41]){
    const mat=y>.3?edgeWhite:edgeAmber;
    const rail=box(.024,.022,5.96,mat);rail.position.set(side*1.73,y,0);openArena.add(rail);
   }
   for(const z of [-2.72,-1.12,.52,2.63]){
    const upright=box(.055,.60,.060,steel);
    upright.position.set(side*1.77,.37,z);openArena.add(upright);
    const active=box(.072,.22,.075,side<0?cyan:orange);
    active.position.set(side*1.77,.59,z);openArena.add(active);
    const brace=new T.Mesh(new T.TorusGeometry(.13,.009,6,20),side<0?edgeWhite:edgeAmber);
    brace.position.set(side*1.77,.65,z);brace.rotation.y=Math.PI/2;openArena.add(brace);
   }
  }
  // Rival end: a floating goal portal, never a solid opaque rectangle.
  const portal=new T.Group();portal.name='cuadrante-rival-portal';portal.position.set(0,1.2,-2.99);openArena.add(portal);
  const portalMaterial=new T.MeshBasicMaterial({color:0xff9145,transparent:true,opacity:.95,depthWrite:false});
  const portalSecondary=new T.MeshBasicMaterial({color:0x45eeff,transparent:true,opacity:.54,depthWrite:false});
  const frame=[[-1.28,-.86],[-1.37,.58],[-1.03,.93],[1.03,.93],[1.37,.58],[1.28,-.86]];
  for(let i=0;i<frame.length-1;i++){
   tube(new T.Vector3(frame[i][0],frame[i][1],0),new T.Vector3(frame[i+1][0],frame[i+1][1],0),.025,portalMaterial,portal);
  }
  for(const side of [-1,1]){
   tube(new T.Vector3(side*1.28,-.86,0),new T.Vector3(side*.92,-1.01,0),.028,portalSecondary,portal);
   const node=new T.Mesh(new T.OctahedronGeometry(.093,1),side<0?cyan:orange);
   node.position.set(side*1.30,.65,.015);portal.add(node);
  }
  // Goal energy backdrop is only a luminous contour, so the actual wall
  // behind the game remains visible in AR.
  const goalBar=box(2.11,.025,.016,edgeAmber);goalBar.position.set(0,-.92,0);portal.add(goalBar);
  const portalAura=new T.Mesh(new T.RingGeometry(.84,.875,56),new T.MeshBasicMaterial({
   color:0xffa05b,transparent:true,opacity:.30,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending
  }));
  portalAura.scale.set(1.14,.83,1);portalAura.position.z=-.026;portal.add(portalAura);
  const farGrid=new T.GridHelper(3.4,8,0x1c8199,0x144154);
  farGrid.rotation.x=Math.PI/2;farGrid.position.z=-3.03;farGrid.position.y=1.2;
  farGrid.material.transparent=true;farGrid.material.opacity=.24;openArena.add(farGrid);
  // Decorative goal-side pylons are deliberately outside the central gameplay lane.
  for(const side of [-1,1]){
   const pylon=new T.Group();pylon.position.set(side*1.87,.63,-2.68);openArena.add(pylon);
   const body=box(.21,1.13,.22,steel);pylon.add(body);
   const energy=box(.235,.72,.025,side===1?edgeAmber:edgeWhite);
   energy.position.set(-side*.025,.05,.12);pylon.add(energy);
   const cap=box(.29,.064,.29,side===1?orange:cyan);cap.position.y=.56;pylon.add(cap);
  }
  const marking=box(3.22,.012,.025,edgeAmber);marking.position.set(0,.151,-2.67);openArena.add(marking);
  const sideLamps=[];
  for(const z of [-2.72,-1.30,.40,2.65])for(const side of [-1,1]){
   const lamp=box(.084,.11,.14,side===1?orange:cyan);
   lamp.position.set(side*1.75,.53,z);openArena.add(lamp);sideLamps.push(lamp);
  }
  function paddle(isEnemy){
   const group=new T.Group();root.add(group);
   const front=box(.77,.77,.09,isEnemy?material(0x703018,.6,.25,0x5c2406,.55):material(0x07465a,.54,.22,0x005569,.62));group.add(front);
   const face=box(.64,.64,.015,glass);face.position.z=isEnemy?.057:-.057;group.add(face);
   const borderMat=isEnemy?orange:cyan;
   const frame=edgeBox(.76,.76,.10,isEnemy?O:C,group);
   const bright=edgeBox(.61,.61,.09,isEnemy?0xffae71:0x9bfffe,group);
   const core=new T.Mesh(new T.OctahedronGeometry(.13,0),borderMat);core.position.z=isEnemy?.069:-.069;group.add(core);
   const halo=box(.89,.89,.008,new T.MeshBasicMaterial({color:isEnemy?O:C,transparent:true,opacity:.08,depthWrite:false}));
   halo.position.z=isEnemy?.085:-.085;group.add(halo);
   group.userData={core,halo};return group
  }
  const you=paddle(false),enemy=paddle(true);
  you.position.set(0,1.2,2.90);enemy.position.set(0,1.2,-2.90);
  // In real AR the player is not a permanent square. Its physics collider
  // stays active, while the player's visual shield appears only on impact.
  const defenseShield=new T.Group();defenseShield.name='cuadrante-impact-shield';root.add(defenseShield);
  defenseShield.visible=false;defenseShield.position.set(0,1.2,2.84);
  const shieldFaceMat=new T.MeshBasicMaterial({color:0x28f9ed,transparent:true,
   opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const shieldFace=new T.Mesh(new T.PlaneGeometry(.76,.76),shieldFaceMat);
  defenseShield.add(shieldFace);
  const shieldEdgeMat=new T.LineBasicMaterial({color:0x9bffff,transparent:true,
   opacity:0,depthWrite:false,blending:T.AdditiveBlending});
  const shieldEdges=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.78,.78,.055)),shieldEdgeMat);
  defenseShield.add(shieldEdges);
  const shieldRingMat=new T.MeshBasicMaterial({color:0x88ffff,transparent:true,
   opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const shieldRing=new T.Mesh(new T.RingGeometry(.36,.38,48),shieldRingMat);
  shieldRing.position.z=-.065;defenseShield.add(shieldRing);
  // An anchored, tiny reticle inside the tunnel shows what the phone is
  // defending. The on-screen sight is only UI; this marker is world-locked.
  const aimMarker=new T.Group();aimMarker.name='cuadrante-aim-marker';root.add(aimMarker);
  const aimMaterial=new T.MeshBasicMaterial({color:0x80fff5,transparent:true,
   opacity:.72,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const aimDot=new T.Mesh(new T.RingGeometry(.085,.113,32),aimMaterial);aimMarker.add(aimDot);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   const t=new T.Mesh(new T.BoxGeometry(.085,.013,.008),aimMaterial);
   t.position.set(Math.cos(a)*.177,Math.sin(a)*.177,0);t.rotation.z=a;aimMarker.add(t);
  }
  aimMarker.position.set(0,1.2,-.15);aimMarker.visible=false;
  let aimMode=false,shieldLife=0;
  function setAimMode(on){
   aimMode=!!on;you.visible=!aimMode;
   aimMarker.visible=aimMode;defenseShield.visible=false;shieldLife=0;
  }
  const orb=new T.Group();root.add(orb);
  const coreBall=material(0x14202b,.78,.17,0x39200a,.68);
  const sphere=new T.Mesh(new T.IcosahedronGeometry(.115,3),coreBall);orb.add(sphere);
  const shell=new T.Mesh(new T.IcosahedronGeometry(.132,2),new T.MeshBasicMaterial({color:O,wireframe:true,transparent:true,opacity:.28}));orb.add(shell);
  for(const rot of [0,Math.PI/2,Math.PI*.3]){const ring=new T.Mesh(new T.TorusGeometry(.134,.013,6,40),orange);ring.rotation.set(rot,rot*.35,rot*.55);orb.add(ring)}
  const ballLight=new T.PointLight(0xff8d3b,2.8,2.5,2);orb.add(ballLight);
  const trail=[];for(let i=0;i<25;i++){
   const m=new T.Mesh(new T.SphereGeometry(.064*(1-i/33),6,5),new T.MeshBasicMaterial({color:i%4?0xff6a1c:0xffd5a1,transparent:true,opacity:Math.pow(1-i/25,1.8)*.39,depthWrite:false,blending:T.AdditiveBlending}));
   m.visible=false;root.add(m);trail.push(m)
  }
  // Impact rings, defense prediction and energy projection are world-locked.
  const ringMaterial=(color)=>new T.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  const waves=[];
  for(let i=0;i<4;i++){
   const m=new T.Mesh(new T.TorusGeometry(.18,.012,6,42),ringMaterial(i%2?C:O));
   m.visible=false;root.add(m);waves.push({mesh:m,life:0});
  }
  const forecast=new T.Mesh(new T.RingGeometry(.16,.215,44),ringMaterial(C));
  forecast.position.z=2.747;root.add(forecast);forecast.visible=false;
  const aimCross=new T.Mesh(new T.RingGeometry(.34,.35,44),ringMaterial(0x91faff));
  aimCross.position.z=2.746;root.add(aimCross);aimCross.visible=false;
  const reflection=new T.Mesh(new T.CircleGeometry(.27,24),ringMaterial(O));
  reflection.rotation.x=-Math.PI/2;reflection.position.y=.162;root.add(reflection);
  const echoes=[];
  for(let i=0;i<2;i++){
   const m=new T.Mesh(new T.IcosahedronGeometry(.108,1),new T.MeshBasicMaterial({color:0x40d8ff,wireframe:true,transparent:true,opacity:.1,depthWrite:false}));
   m.visible=false;root.add(m);echoes.push(m)
  }
  // This visible ground target is part of the world-locked 3D room, not a
  // fake camera-overlay. It marks the hit-tested location of the player end.
  const targetGroup=new T.Group();root.add(targetGroup);
  targetGroup.position.set(0,.195,2.93);targetGroup.visible=false;
  const targetMat=new T.MeshBasicMaterial({color:0x21efff,transparent:true,opacity:.88,side:T.DoubleSide,depthWrite:false});
  const targetRing=new T.Mesh(new T.RingGeometry(.39,.425,64),targetMat);
  targetRing.rotation.x=-Math.PI/2;targetGroup.add(targetRing);
  const targetCross=new T.Mesh(new T.RingGeometry(.11,.125,32),targetMat);
  targetCross.rotation.x=-Math.PI/2;targetCross.position.y=.003;targetGroup.add(targetCross);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   const dash=box(.25,.013,.03,targetMat);
   dash.position.set(Math.cos(a)*.65,0,Math.sin(a)*.65);
   dash.rotation.y=-a;targetGroup.add(dash);
  }
  let previewTime=0;
  function setPlacementPreview(visible,ready=false){
   targetGroup.visible=!!visible;
   targetMat.color.setHex(ready?0x40ffbd:0xffb75b);
  }
  const history=[],shards=[];
  for(let i=0;i<16;i++){
   const m=new T.Mesh(new T.OctahedronGeometry(.013+i%3*.004,0),new T.MeshBasicMaterial({color:i%3===0?0x86ffff:0xffa047,transparent:true,opacity:0,depthWrite:false}));
   root.add(m);shards.push({mesh:m,v:new T.Vector3(),life:0})
  }
  const obstacleMap=new Map();
  let impact=0,flash=0,lastMode=-1,trailSample=0,previousPhase='',previousTick=-1,smashPulse=0,impactPos=new T.Vector3();
  function spawnImpact(x,y,z,kind){
   impact=1;flash=.35;smashPulse=kind==='smash'?1:0;impactPos.set(x,y,z);
   if(aimMode&&(kind==='you'||kind==='smash')){
    shieldLife=kind==='smash'?.28:.21;
    defenseShield.position.set(x,y,2.84);defenseShield.visible=true;
   }
   const first=waves.find(w=>w.life<=0)||waves[0];first.life=kind==='smash'?.55:.35;first.mesh.position.set(x,y,z);first.mesh.scale.setScalar(.75);
   first.mesh.material.color.setHex(kind==='rival'?O:C);first.mesh.visible=true;
   for(let i=0;i<shards.length;i++){
    const q=shards[i];q.mesh.position.set(x,y,z);q.v.set((Math.random()-.5)*3.0,(Math.random()-.5)*3,(Math.random()-.5)*3);q.life=.20+Math.random()*.25;q.mesh.material.opacity=.9;
   }
  }
  function update(s,dt){
   if(!s)return;
   if(targetGroup.visible){
    previewTime+=dt;
    targetRing.scale.setScalar(1+.055*Math.sin(previewTime*3));
    targetMat.opacity=.68+.22*Math.sin(previewTime*4);
   }
   const b=s.ball;orb.position.set(b.x,b.y,b.z);sphere.rotation.y+=dt*3.5;shell.rotation.x+=dt*1.25;shell.rotation.y+=dt*2.3;
   orb.scale.setScalar(1+Math.sin(s.clock*16)*.04+smashPulse*.11);you.position.x=s.player.x;you.position.y=s.player.y;
   smashPulse=Math.max(0,smashPulse-dt*3.3);
   aimMarker.visible=aimMode&&(s.phase==='playing'||s.phase==='serve');
   if(aimMode){
    aimMarker.position.x=s.player.x;aimMarker.position.y=s.player.y;
    aimMarker.rotation.z+=dt*1.5;
    aimMaterial.opacity=.52+.22*Math.sin(s.clock*6);
    defenseShield.position.x=s.player.x;defenseShield.position.y=s.player.y;
   }
   if(shieldLife>0){
    shieldLife=Math.max(0,shieldLife-dt);
    const k=Math.min(1,shieldLife/.20);
    defenseShield.visible=shieldLife>0&&aimMode;
    shieldFaceMat.opacity=.25*k;
    shieldEdgeMat.opacity=.90*k;
    shieldRingMat.opacity=.66*k;
    defenseShield.scale.setScalar(1+(1-k)*.19);
   }else defenseShield.visible=false;
   const nearBall=Math.max(.08,Math.min(1,(b.y-.10)/1.1));
   reflection.position.x=b.x;reflection.position.z=b.z;
   reflection.scale.setScalar(.6+nearBall*.8);
   reflection.material.opacity=s.phase==='playing'?.17*(1-nearBall*.3):0;
   const landing=window.CuadranteCore.predictedLanding(s);
   const showForecast=landing?.reliable&&s.duel===0&&s.phase==='playing'&&landing.seconds<1.20;
   forecast.visible=!!showForecast;aimCross.visible=!!showForecast;
   if(showForecast){
    forecast.position.x=aimCross.position.x=landing.x;
    forecast.position.y=aimCross.position.y=landing.y;
    const alpha=.13+.22*(1-landing.seconds/1.2);
    forecast.material.opacity=alpha;aimCross.material.opacity=alpha*.65;
    forecast.scale.setScalar(1+.09*Math.sin(s.clock*9));
   }
   for(let i=0;i<echoes.length;i++){
    const q=echoes[i];q.visible=s.duel===3&&s.phase==='playing'&&b.z<1.8;
    if(q.visible){q.position.set(b.x+(i===0?.28:-.33)*Math.sin(s.clock*2.5+i),b.y+(i===0?.22:-.26)*Math.cos(s.clock*2+i),b.z-.20-i*.14);q.material.opacity=.18+.05*Math.sin(s.clock*5+i)}
   }
   for(const w of waves){if(w.life>0){w.life=Math.max(0,w.life-dt);w.mesh.visible=w.life>0;w.mesh.scale.multiplyScalar(1+dt*5);w.mesh.material.opacity=Math.min(.70,w.life*1.8)}else w.mesh.visible=false}
   enemy.position.x=s.enemy.x;enemy.position.y=s.enemy.y;
   you.userData.core.rotation.y+=dt*3.4;enemy.userData.core.rotation.z-=dt*2.7;
   impact=Math.max(0,impact-dt*4.5);you.userData.halo.material.opacity=.07+impact*.29;
   backlight.intensity=11+Math.sin(s.clock*2)*3+(s.score[0]===4||s.score[1]===4?6:0);
   if((previousPhase==='playing'&&s.phase==='serve')||s.tick<previousTick){history.length=0;trailSample=0}
   previousPhase=s.phase;previousTick=s.tick;
   trailSample+=dt;
   if(s.phase==='playing'&&trailSample>.015){
     trailSample=0;history.unshift([b.x,b.y,b.z]);
     if(history.length>65)history.pop()
   }
   for(let i=0;i<trail.length;i++){
     const h=i<(scene.userData.trailLimit||25)?history[i+2]:null;
     trail[i].visible=!!h&&s.phase==='playing';
     if(h)trail[i].position.set(...h)
   }
   for(const q of shards){if(q.life>0){q.life-=dt;q.mesh.position.addScaledVector(q.v,dt);q.mesh.material.opacity=Math.max(0,q.life/.45);q.mesh.visible=true}else q.mesh.visible=false}
   const active=new Set();
   for(const o of window.CuadranteCore.geometry(s)){
    active.add(o.id);let mesh=obstacleMap.get(o.id);
    if(!mesh){
     const g=new T.Group(),body=box(o.w,o.h,o.d,material(0x27333e,.8,.21)),edges=edgeBox(o.w+.011,o.h+.011,o.d+.011,s.duel>2?O:C,g);
     g.add(body);root.add(g);mesh=g;obstacleMap.set(o.id,g);
    }
    mesh.visible=true;mesh.position.set(o.x,o.y,o.z);mesh.rotation.z=o.ang||0;
    mesh.scale.setScalar(1); // physics and visuals must always share the exact collider dimensions
   }
   for(const [id,m] of obstacleMap)if(!active.has(id))m.visible=false;
   if(s.mode!==lastMode){lastMode=s.mode;flash=.3;sideLamps.forEach((m,i)=>{m.material=(i+s.mode)%2?cyan:orange})}
   for(const m of sideLamps){const bright=.91+.09*Math.sin(s.clock*5+m.position.z*3);m.scale.y=bright}
   flash=Math.max(0,flash-dt);
  }
  function setQuality(level){
   const basic=level==='low';
   ballLight.visible=!basic;backlight.visible=!basic;
   const count=basic?9:level==='medium'?16:25;
   trail.forEach((m,i)=>{if(i>=count)m.visible=false});
   scene.userData.trailLimit=count;
  }
  return {scene,root,you,enemy,orb,surfaceMaterials:{matTile,altTile,steel,panel,dark},spawnImpact,update,setQuality,setPlacementPreview,setAimMode,dispose(){scene.traverse(o=>{o.geometry?.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})}}
 }
 return {makeStage};
}
})(window);
