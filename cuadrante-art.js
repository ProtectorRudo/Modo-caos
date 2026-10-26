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
  const floor=box(3.62,.10,6.15,dark);floor.position.set(0,.07,0);root.add(floor);
  const roof=box(3.62,.11,6.15,dark);roof.position.set(0,2.34,0);root.add(roof);
  const rear=box(3.6,2.33,.10,dark);rear.position.set(0,1.17,-3.07);root.add(rear);
  const matTile=material(0x182632,.83,.36),altTile=material(0x101e2b,.82,.41);
  const tinyBar=new T.MeshBasicMaterial({color:0x224a5d});
  // GPU instancing turns the court floor into two draw calls (instead of >80).
  const floorGeometry=new T.BoxGeometry(.526,.012,.495),tilesA=[],tilesB=[];
  const dummy=new T.Object3D();
  for(let z=-2.8;z<3;z+=.52){
   for(let x=-1.6;x<1.7;x+=.55)
    (Math.round((x+z)*10)%4===0?tilesB:tilesA).push([x,.132,z]);
   const seam=box(3.58,.006,.008,tinyBar);seam.position.set(0,.145,z+.26);root.add(seam);
  }
  for(const [mat,list] of [[matTile,tilesA],[altTile,tilesB]]){
   const mesh=new T.InstancedMesh(floorGeometry,mat,list.length);
   list.forEach((p,i)=>{dummy.position.set(...p);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});
   mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
  }
  for(const sign of [-1,1]){
   const wall=box(.095,2.28,6.16,steel);wall.position.set(sign*1.84,1.19,0);root.add(wall);
   for(let z=-2.75;z<3.15;z+=.52){
    const plate=box(.014,1.85,.475,(Math.round(z*10)%3===0)?panel:dark);plate.position.set(sign*1.781,1.19,z);root.add(plate);
    const rib=box(.075,2.29,.025,steel);rib.position.set(sign*1.8,1.18,z+.26);root.add(rib);
    for(const y of [.23,2.13]){
     const line=box(.028,.025,.46,Math.round(z*10)%4===0?orange:cyan);line.position.set(sign*1.735,y,z);root.add(line);
    }
   }
   const rail=box(.041,.037,6.14,cyan);rail.position.set(sign*1.72,.23,0);root.add(rail);
   const rail2=box(.042,.029,6.14,orange);rail2.position.set(sign*1.72,2.19,0);root.add(rail2);
  }
  for(let z=-2.92;z<3.12;z+=1.05){
   const group=new T.Group();group.position.z=z;root.add(group);
   for(const x of [-1.76,1.76]){const m=box(.065,2.31,.07,panel);m.position.set(x,1.20,0);group.add(m)}
   for(const y of [.17,2.28]){const m=box(3.52,.065,.07,panel);m.position.set(0,y,0);group.add(m)}
   const edge=edgeBox(3.49,2.1,.03,z<0?0xff792c:0x00ccea,group);edge.position.set(0,1.2,.03);
   const inner=edgeBox(3.20,1.87,.015,0x24596b,group);inner.position.set(0,1.2,-.005);
  }
  for(let x=-1.6;x<1.65;x+=.41){
   let strip=box(.015,.013,6.05,Math.round(x*10)%2?tinyBar:cyan);strip.position.set(x,2.273,0);root.add(strip);
   if(Math.round(x*10)%2===0){const a=box(.37,.04,.88,steel);a.position.set(x,2.265,-1.5);root.add(a)}
  }
  const farGrid=new T.GridHelper(3.4,8,0x0a748e,0x09344c);farGrid.rotation.x=Math.PI/2;farGrid.position.z=-2.96;farGrid.position.y=1.2;root.add(farGrid);
  const marking=box(3.3,.014,.018,orange);marking.position.set(0,.151,-2.68);root.add(marking);
  // Depth-reticle and court markers
  const sideLamps=[];for(const z of [-2.75,-1.6,-.5,.6,1.7,2.73])for(const side of [-1,1]){
    const lamp=box(.08,.11,.21,side===1?cyan:orange);lamp.position.set(side*1.738,1.18,z);root.add(lamp);sideLamps.push(lamp)}
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
  const history=[],shards=[];
  for(let i=0;i<16;i++){
   const m=new T.Mesh(new T.OctahedronGeometry(.013+i%3*.004,0),new T.MeshBasicMaterial({color:i%3===0?0x86ffff:0xffa047,transparent:true,opacity:0,depthWrite:false}));
   root.add(m);shards.push({mesh:m,v:new T.Vector3(),life:0})
  }
  const obstacleMap=new Map();
  let impact=0,flash=0,lastMode=-1,trailSample=0,previousPhase='',previousTick=-1,smashPulse=0,impactPos=new T.Vector3();
  function spawnImpact(x,y,z,kind){
   impact=1;flash=.35;smashPulse=kind==='smash'?1:0;impactPos.set(x,y,z);
   const first=waves.find(w=>w.life<=0)||waves[0];first.life=kind==='smash'?.55:.35;first.mesh.position.set(x,y,z);first.mesh.scale.setScalar(.75);
   first.mesh.material.color.setHex(kind==='rival'?O:C);first.mesh.visible=true;
   for(let i=0;i<shards.length;i++){
    const q=shards[i];q.mesh.position.set(x,y,z);q.v.set((Math.random()-.5)*3.0,(Math.random()-.5)*3,(Math.random()-.5)*3);q.life=.20+Math.random()*.25;q.mesh.material.opacity=.9;
   }
  }
  function update(s,dt){
   if(!s)return;
   const b=s.ball;orb.position.set(b.x,b.y,b.z);sphere.rotation.y+=dt*3.5;shell.rotation.x+=dt*1.25;shell.rotation.y+=dt*2.3;
   orb.scale.setScalar(1+Math.sin(s.clock*16)*.04+smashPulse*.11);you.position.x=s.player.x;you.position.y=s.player.y;
   smashPulse=Math.max(0,smashPulse-dt*3.3);
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
  return {scene,root,you,enemy,orb,surfaceMaterials:{matTile,altTile,steel,panel,dark},spawnImpact,update,setQuality,dispose(){scene.traverse(o=>{o.geometry?.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})}}
 }
 return {makeStage};
}
})(window);
