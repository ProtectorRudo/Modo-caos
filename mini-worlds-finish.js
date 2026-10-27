/* MINI WORLDS · coherent finish layer (original 3D geometry).
 * Additive, visually optional, and never owns physics or WebXR transforms.
 * Every island ornament belongs to its LOGICAL island; pocket.reindex()
 * selects its room. Hero accessories remain under the existing moving rig. */
(function(root){
'use strict';
root.MiniWorldsFinish=function(T){
 const colors=[0x73ffe1,0xffd07b,0xa9a1ff,0x7be6ff];
 function setup(stage,level){
  if(!stage?.worldRoot||!stage?.hero?.root)return null;
  const world=stage.worldRoot,visible=[],sparks=[];
  const palette=level?[0x9bcbff,0xe4a4ff,0xffd17b,0x83ffe2]:colors;
  const shimmer=new T.MeshBasicMaterial({color:0xe4f1e3,transparent:true,opacity:.16,blending:T.AdditiveBlending,depthWrite:false});
  const gemMaterials=palette.map(c=>new T.MeshPhysicalMaterial({
   color:c,metalness:.24,roughness:.19,clearcoat:.85,clearcoatRoughness:.1,
   emissive:c,emissiveIntensity:.38
  }));
  const rimMaterials=palette.map(c=>new T.MeshBasicMaterial({
   color:c,transparent:true,opacity:.62,depthWrite:false,blending:T.AdditiveBlending
  }));
  const crystalGeo=new T.IcosahedronGeometry(.18,1);
  const ringGeo=new T.TorusGeometry(.26,.018,5,26);
  const rand=n=>{const s=Math.sin(n*127.1+level*78.233)*43758.5453;return s-Math.floor(s)};
  // The decorations are always next to existing land, never extra floating
  // platforms that would trick players into jumping off a collider.
  stage.map.platforms.forEach((p,i)=>{
   if(i!==8)return; // Exactly one real landmark; no distracting floating shards across AR.
   const tint=i%4,side=i%2===0?1:-1,edge=p.w*.49;
   const holder=new T.Group();
   holder.name='MINI WORLDS / premium wayfinder / platform '+i;
   holder.position.set(p.x+side*edge,p.y+.22,p.z+(rand(i)-.5)*p.d*.52);
   const stem=new T.Mesh(new T.CylinderGeometry(.035,.055,.48,7),gemMaterials[tint]);
   stem.position.y=.22;holder.add(stem);
   const gem=new T.Mesh(crystalGeo,gemMaterials[tint]);
   gem.position.y=.58;gem.scale.set(.83,1.2,.83);holder.add(gem);
   const crown=new T.Mesh(ringGeo,rimMaterials[tint]);
   crown.rotation.x=Math.PI/2;crown.position.y=.57;holder.add(crown);
   const dot=new T.Mesh(new T.SphereGeometry(.058,8,7),shimmer);
   dot.position.y=.88;holder.add(dot);
   // Each object is a direct world child to let the existing room indexer
   // migrate it to the corresponding spatial pocket without changing XR.
   world.add(holder);
   visible.push({holder,gem,crown,dot,offset:i*.77,base:holder.position.y});
  });
  // Spatial fox adventurer aura, never an opaque screen overlay.
  const finish=new T.Group();
  finish.name='FOX / blaster energy aura and jump sparks';
  stage.hero.root.add(finish);stage.hero.finish=finish;
  const energy=new T.MeshBasicMaterial({
   color:0x6fffe7,transparent:true,opacity:.78,
   blending:T.AdditiveBlending,depthWrite:false
  });
  const ring=new T.Mesh(new T.TorusGeometry(.38,.023,6,32),energy);
  ring.rotation.x=-Math.PI/2;ring.position.y=.065;finish.add(ring);
  const jetGeo=new T.ConeGeometry(.055,.19,8);
  const jets=[];
  [-.24,.24].forEach(x=>{
   const outer=new T.Mesh(jetGeo,energy);
   outer.rotation.z=Math.PI;outer.position.set(x,.34,-.19);
   finish.add(outer);jets.push(outer);
  });
  const orbGeo=new T.SphereGeometry(.038,8,6);
  for(let i=0;i<6;i++){
   const o=new T.Mesh(orbGeo,energy);
   o.position.set(0,.35,0);finish.add(o);sparks.push(o);
  }
  // Give the artist's rig readable curvature and an understated cyan rim.
  // Lights attach to the SCENE, never to the phone or XR camera.
  const fill=new T.DirectionalLight(level?0x9bb1bf:0x9dc6ba,.38);
  fill.position.set(4,5,-6);stage.scene.add(fill);
  let time=0;
  function update(game,dt,elapsed){
   if(!game)return;
   time=elapsed;
   const p=game.player,v=Math.hypot(p.vx,p.vz);
   const charging=game.chaos?.fury>0;
   ring.material.opacity=charging?.98:.48+Math.min(v,4)*.055;
   ring.scale.setScalar(1+Math.sin(time*5)*.045+(charging?.12:0));
   ring.rotation.z=time*.95;
   jets.forEach((jet,i)=>{
    jet.visible=!p.grounded||charging;
    const height=!p.grounded?.43:charging?.37:.18;
    jet.scale.set(1,.6+height*1.4+Math.sin(time*21+i)*.12,1);
   });
   sparks.forEach((o,i)=>{
    const angle=time*(charging?7:3.2)+i*Math.PI/3;
    const size=charging?.085:.045;
    o.position.set(Math.cos(angle)*.35,.24+.13*Math.sin(angle*1.7),Math.sin(angle)*.35);
    o.scale.setScalar(size/.038);
    o.visible=v>.35||charging;
   });
   visible.forEach((v,i)=>{
    v.gem.rotation.y+=dt*(.5+i%3*.2);
    v.gem.position.y=.58+Math.sin(time*1.7+v.offset)*.065;
    v.crown.rotation.z=time*.75+v.offset;
    v.dot.position.y=.9+Math.sin(time*2.3+v.offset)*.12;
   });
  }
  return {update,count:visible.length,source:'original world dressing / visual only'};
 }
 return {setup};
};
})(typeof window!=='undefined'?window:globalThis);
