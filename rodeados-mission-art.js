/* RODEADOS 360 V18 — mobile-conscious world-locked mission props.
 * Props are children of the ALREADY anchored game root, never the camera.
 */
export function createRodeadosMissionArt(THREE,world){
 const root=new THREE.Group();root.name='mission-world';world.add(root);
 const glow=(c,opacity=.8)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
 const metal=new THREE.MeshStandardMaterial({color:0x223e53,metalness:.68,roughness:.34});
 const dark=new THREE.MeshStandardMaterial({color:0x0a1624,metalness:.7,roughness:.28});
 const cyan=glow(0x49faff,.82),gold=glow(0xffd163,.86),red=glow(0xff425f,.85),blue=glow(0x449eff,.83);
 const meshes=[];
 function mesh(group,geo,mat,x=0,y=0,z=0){
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);group.add(m);return m;
 }
 function ring(group,x,z,r,color){
  const m=mesh(group,new THREE.TorusGeometry(r,.026,5,40),color,x,.055,z);
  m.rotation.x=Math.PI/2;return m;
 }
 function beacon(parent,p,color,scale=1){
  const g=new THREE.Group();g.position.set(p.x,0,p.z);parent.add(g);
  ring(g,0,0,.36*scale,color);ring(g,0,0,.24*scale,color);
  mesh(g,new THREE.CylinderGeometry(.04,.08,.19,9),metal,0,.17,0);
  const head=mesh(g,new THREE.OctahedronGeometry(.10*scale),color,0,.37,0);
  meshes.push({head});return g;
 }
 function flag(group,at,color){
  const g=new THREE.Group();g.position.set(at.x,0,at.z);group.add(g);
  ring(g,0,0,.37,color);
  mesh(g,new THREE.CylinderGeometry(.018,.022,1.24,8),metal,0,.67,0);
  const cloth=new THREE.BufferGeometry();
  cloth.setAttribute('position',new THREE.Float32BufferAttribute([0,1.25,0,.55,1.17,0,.48,.78,0,0,.82,0],3));
  cloth.setIndex([0,1,2,0,2,3]);cloth.computeVertexNormals();
  const fabric=mesh(g,cloth,color);
  fabric.position.z=.025;mesh(g,new THREE.ConeGeometry(.10,.22,6),gold,0,1.37,0);
  return g;
 }
 const portRoot=new THREE.Group(),lootRoot=new THREE.Group(),refugeRoot=new THREE.Group(),ctfRoot=new THREE.Group(),colRoot=new THREE.Group(),warpRoot=new THREE.Group(),mutantRoot=new THREE.Group();
 [portRoot,lootRoot,refugeRoot,ctfRoot,colRoot,warpRoot,mutantRoot].forEach(o=>root.add(o));
 const portals=[];
 for(let i=0;i<6;i++){
  const angle=i*Math.PI/3,p={x:Math.sin(angle)*3.15,z:Math.cos(angle)*3.15};
  const g=new THREE.Group();g.position.set(p.x,0,p.z);
  const torus=mesh(g,new THREE.TorusGeometry(.63,.065,8,44),i%2?red:cyan,0,1.17,0);
  torus.rotation.y=angle;
  const inner=mesh(g,new THREE.CircleGeometry(.50,40),glow(i%2?0x8f2147:0x076d9c,.17),0,1.17,0);inner.rotation.y=angle;
  mesh(g,new THREE.BoxGeometry(.18,.15,.22),metal,0,.13,0);
  portRoot.add(g);portals.push({g,torus});
 }
 const crates=[];
 for(const p of [{x:-.83,z:-.88},{x:0,z:-1.02},{x:.83,z:-.88},{x:-.73,z:.2},{x:.73,z:.2}]){
  const g=new THREE.Group();g.position.set(p.x,0,p.z);
  mesh(g,new THREE.BoxGeometry(.43,.48,.43),metal,0,.28,0);
  mesh(g,new THREE.BoxGeometry(.46,.075,.46),dark,0,.50,0);
  mesh(g,new THREE.BoxGeometry(.19,.17,.025),gold,0,.30,-.226);
  ring(g,0,0,.37,gold);
  lootRoot.add(g);crates.push(g);
 }
 const lootBase=beacon(lootRoot,{x:0,z:.83},cyan,1.2);
 const core=beacon(refugeRoot,{x:0,z:-.4},cyan,1.7);
 const reactor=mesh(core,new THREE.IcosahedronGeometry(.37,1),cyan,0,.66,0);
 const shield=mesh(core,new THREE.IcosahedronGeometry(.55,1),glow(0x23b6ff,.17),0,.66,0);
 const stations=[{x:-.96,z:-.82},{x:.96,z:-.82},{x:0,z:1.0}].map((p,i)=>{
  const b=beacon(refugeRoot,p,gold,.8);
  mesh(b,new THREE.BoxGeometry(.17,.16,.17),gold,0,.33,0);
  return b;
 });
 const ctfBase=beacon(ctfRoot,{x:0,z:.8},blue,1.6);
 const ctfFlag=flag(ctfRoot,{x:0,z:-.8},red);
 const spawnBeacons=Array.from({length:7},()=>beacon(ctfRoot,{x:7,z:7},red,.64));
 const spawnHeads=spawnBeacons.map(b=>b.children.find(n=>n.isMesh&&n.geometry.type==='OctahedronGeometry'));
 const types=['basic','flanker','spider','creep','tank','random'];
 const palette={basic:0xff7382,flanker:0xffba52,spider:0xd88aff,creep:0xf253d2,tank:0xe65c56,random:0xffe280};
 const aimGhost=beacon(ctfRoot,{x:0,z:0},gold,.55);
 aimGhost.visible=false;
 const flagBeacon=beacon(ctfRoot,{x:0,z:-.8},red,.67);
 const colMark=beacon(colRoot,{x:0,z:-1.1},red,1.2);
 const warp=beacon(warpRoot,{x:0,z:-.6},blue,.8);
 const mutators=Array.from({length:4},(_,i)=>{
  const a=i*Math.PI/2,p={x:Math.sin(a)*1.18,z:Math.cos(a)*1.18};
  return beacon(mutantRoot,p,i%2?red:gold,.55);
 });
 let currentMode='';
 function update(game,stage,t,draft=null){
  const m=game?.mission,mode=m?.kind||'';
  if(mode!==currentMode){
   currentMode=mode;
   portRoot.visible=mode==='invasion';lootRoot.visible=mode==='loot';
   refugeRoot.visible=mode==='refuge';ctfRoot.visible=mode==='ctf';
   colRoot.visible=mode==='colossus';warpRoot.visible=mode==='timewarp';mutantRoot.visible=mode==='mutant';
  }
  root.visible=!!m&&['tactical','playing','paused','countdown','ready'].includes(stage);
  if(!root.visible)return;
  const tick=(Number(t)||0)*.001;
  if(mode==='invasion')portals.forEach((p,i)=>{
   p.torus.rotation.z=tick*.45*(i%2?-1:1);
   p.g.scale.setScalar(.93+Math.sin(tick*2.4+i)*.06);
  });
  if(mode==='loot'){
   crates.forEach((o,i)=>{o.visible=!m.crates[i]?.opened;o.rotation.y=Math.sin(tick*1.2+i)*.04});
   lootBase.visible=true;
  }
  if(mode==='refuge'){
   stations.forEach((b,i)=>{const active=!!m.stations?.[i]?.active;
    b.scale.setScalar(active?1.22:1+.07*Math.sin(tick*3+i));
    b.children.forEach(mesh=>{if(mesh.material?.emissive)mesh.material.emissiveIntensity=active?1.2:.2});
   });
   const hp=Math.max(0,m.reactor)/100;
   reactor.scale.setScalar(1+.08*Math.sin(tick*3));
   shield.scale.setScalar(1+Math.sin(tick*2)*.08);
   shield.material.color.setHex(hp<.30?0xff2648:0x23b6ff);
  }
  if(mode==='ctf'){
   const placing=stage==='tactical';
   const base=placing?draft?.base:m.base,flag=placing?draft?.flag:m.object;
   const spots=placing?(draft?.spots||[]):m.spawnPoints;
   ctfBase.visible=!!base;ctfFlag.visible=!!flag;
   // The original enemy flag's beacon is fixed in world coordinates until
   // collection; carried flag is attached to the TRACKED logical phone player.
   // Neither flag is ever parented to the camera or moved by aim direction.
   flagBeacon.visible=!!flag&&(placing||(!m.carry&&!m.dropAt));
   if(base)ctfBase.position.set(base.x,0,base.z);
   if(flag){
    const placed=!placing?game.mission?.object:flag;
    const loc=placing?{x:flag.x,z:flag.z,y:0}:game.mission&&game.mission.kind==='ctf'?
      game.mission.carry?{x:game.player.x+.27,z:game.player.z+.12,y:.45}:
      game.mission.dropAt?{...game.mission.dropAt,y:0}:{x:placed.x,z:placed.z,y:0}:
      {x:flag.x,z:flag.z,y:0};
    ctfFlag.position.set(loc.x,loc.y,loc.z);
    flagBeacon.position.set(placed.x,0,placed.z);
    const glow=ctfFlag.scale;
    glow.setScalar(!placing&&m.carry?.68:1);
   }
   ctfFlag.rotation.y=Math.sin(tick*2)*.10;
   spawnBeacons.forEach((b,i)=>{
    const p=spots[i];b.visible=!!p;
    if(p){
      b.position.set(p.x,0,p.z);
      const kind=(placing?draft?.kinds?.[i]:m.spawnTypes?.[i])||'random';
      if(spawnHeads[i])spawnHeads[i].material=kind==='random'?gold:kind==='spider'?blue:kind==='tank'?red:kind==='creep'?gold:cyan;
      b.scale.setScalar(.86+.08*Math.sin(tick*3+i));
    }
   });
   const target=draft?.aim;
   aimGhost.visible=placing&&!!target;
   if(target)aimGhost.position.set(target.x,0,target.z);
  }
  if(mode==='colossus'){
   colMark.position.z=-1.1;
   colMark.scale.setScalar(.96+.08*Math.sin(tick*4));
  }
  if(mode==='timewarp')warp.scale.setScalar(game.elapsed<m.slowUntil?1.8:1);
  if(mode==='mutant')mutators.forEach((b,i)=>{b.scale.setScalar(.85+.2*Math.sin(tick*3+i))});
 }
 return {update,root,
  getFlagRender(){return {x:ctfFlag.position.x,y:ctfFlag.position.y,z:ctfFlag.position.z,visible:ctfFlag.visible,beaconVisible:flagBeacon.visible}},
  getFlagWorldRender(){const v=new THREE.Vector3();ctfFlag.updateWorldMatrix(true,false);ctfFlag.getWorldPosition(v);return {x:v.x,y:v.y,z:v.z}},
  dispose(){world.remove(root);root.traverse(o=>{
  if(o.isMesh){o.geometry?.dispose();/* Shared materials are disposed below. */ }
 });[metal,dark,cyan,gold,red,blue,reactor.material,shield.material].forEach(m=>m.dispose?.())}};
}
