/* MINI WORLDS — Quaternius Stylized Nature MegaKit Standard (CC0).
 * Four real optimized web GLBs, originally CC0 by Quaternius, published with
 * provenance in anshaneja5/skyline-run public repository.
 * Fixed upstream revision (content hashes audited on 2026-10-26):
 * https://github.com/anshaneja5/skyline-run/blob/0c41526d8d4130c37c15e219c2c3737fa8cb4ad8/CREDITS.md
 * The premium layer only decorates. All collisions / spatial anchors remain
 * exclusively owned by MiniWorldsCore. On failure, original Kenney art stays.
 */
(function(root){
'use strict';
root.MiniWorldsPremium=function(T,options={}){
 const BASE='https://raw.githubusercontent.com/anshaneja5/skyline-run/0c41526d8d4130c37c15e219c2c3737fa8cb4ad8/public/assets/models/';
 const MEDIEVAL='https://raw.githubusercontent.com/kikoncuo/jevfire/5df83b558bf635e006d31f8f2fc2798d0e3ff051/web/public/assets/';
 const SOURCES=Object.freeze({
  canopyA:{url:BASE+'tree1.glb',size:516044,sha:'80bd662cc51f983986f4e201463dc3a729a6cd4a'},
  canopyB:{url:BASE+'tree2.glb',size:446732,sha:'0197de65879eb650247c8d56ac52da34489938cb'},
  canopyC:{url:BASE+'tree3.glb',size:332440,sha:'828786b4bdb5224a8b3672f5e5d6cebe1c65bd93'},
  shrub:{url:BASE+'bush.glb',size:108520,sha:'84b4153c17e988a658e56d4093b0028d1b034c3f'},
  // Kay Lousberg's CC0 Medieval Hexagon Pack (optimized GLBs).
  medievalTower:{url:MEDIEVAL+'tower.glb',size:130876,sha:'d4bace4e1157841d5270e6a6fbb3d8120b7781dc'},
  medievalWall:{url:MEDIEVAL+'wall.glb',size:48220,sha:'493bfe3f0df0d0fcad99c21b6eeea813b6dd145c'},
  medievalRock:{url:MEDIEVAL+'rock.glb',size:18800,sha:'b3edff0760b3e01088fbae75afbd14c42c827829'}
 });
 let loaderPromise;
 function loader(){
  if(!loaderPromise)loaderPromise=import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js')
   .then(m=>new m.GLTFLoader());
  return loaderPromise;
 }
 const rand=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function settings(obj){
  obj.traverse(x=>{if(x.isMesh){x.castShadow=false;x.receiveShadow=true;x.frustumCulled=true}});
 }
 function locate(parent,template,x,y,z,height,angle){
  if(!template)return false;
  const o=template.clone(true);
  parent.add(o);
  o.position.set(x,0,z);o.rotation.y=angle;
  o.scale.setScalar(height);
  o.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(o);
  if(!Number.isFinite(box.min.y)||!Number.isFinite(box.max.y)||box.max.y<=box.min.y){
   parent.remove(o);return false;
  }
  // A normalized height isn't enough: Quaternius broadleaf crowns may be
  // wider than twice their height, which can cover the whole AR camera.
  if(template.userData?.mwCanopy){
   const width=(box.max.x??0)-(box.min.x??0),depth=(box.max.z??0)-(box.min.z??0);
   const diameter=Math.max(width,depth);
   if(Number.isFinite(diameter)&&diameter>1.45){
    o.scale.multiplyScalar(1.45/diameter);
    o.updateMatrixWorld(true);
    const resized=new T.Box3().setFromObject(o);
    o.position.y=y-resized.min.y;
   }else o.position.y=y-box.min.y;
  }else o.position.y=y-box.min.y;
  o.userData={...(o.userData||{}),mwFoliage:!!template.userData?.mwFoliage,mwCanopy:!!template.userData?.mwCanopy};
  return true;
 }
 async function decorate(stage,level){
  if(!stage?.root||!stage?.map?.platforms)return {loaded:0,placed:0,failed:level?7:4};
  const rootGroup=stage.worldRoot||stage.root,layer=new T.Group();
  stage.premiumLayer=layer;
  layer.name='MINI WORLDS · QUATERNIUS STYLIZED NATURE MEGAKIT · CC0';
  rootGroup.add(layer);
  let alive=true;
  stage.disposePremium=()=>{alive=false;layer.parent?.remove(layer)};
  const templateMap=new Map(),results={loaded:0,placed:0,failed:0,source:'Quaternius Stylized Nature MegaKit Standard / CC0'};
  let gltf;
  try{gltf=options.loadModel?{loadAsync:options.loadModel}:await loader()}catch(e){
   layer.parent?.remove(layer);results.failed=level?7:4;console.warn('[MINI WORLDS PREMIUM] GLTFLoader unavailable',e);
   return results;
  }
  const keys=Object.keys(SOURCES).filter(name=>level>0||!name.startsWith('medieval'));
  // Four independent loads: each 110–516 KB. A single failed CDN request
  // never removes existing Kenney scenery or blocks a playable level.
  const entries=await Promise.all(keys.map(async(key)=>{
   try{
    const data=await gltf.loadAsync(SOURCES[key].url);
    const object=data.scene;
    settings(object);object.updateMatrixWorld(true);
    const box=new T.Box3().setFromObject(object);
    const size=new T.Vector3();box.getSize(size);
    if(!Number.isFinite(size.y)||size.y<.001)throw Error('empty tree bounds');
    const proto=new T.Group();
    proto.userData={...(proto.userData||{}),mwFoliage:/^(canopy|shrub)/.test(key),mwCanopy:key.startsWith('canopy')};
    object.scale.multiplyScalar(1/size.y);
    proto.add(object);proto.updateMatrixWorld(true);
    return [key,proto];
   }catch(e){
    console.warn('[MINI WORLDS PREMIUM] Keeping fallback for',key,e?.message||e);
    return [key,null];
   }
  }));
  if(!alive){layer.parent?.remove(layer);return {...results,disposed:true}};
  for(const [key,obj] of entries){
   if(obj){templateMap.set(key,obj);results.loaded++}
   else results.failed++;
  }
  if(!templateMap.size){layer.parent?.remove(layer);return results}
  const random=rand(level?20117:12809);
  const stageTiles=stage.map.platforms;
  const palettes=level
   ? ['canopyC','canopyB','canopyA','canopyC']
   : ['canopyA','canopyB','canopyC','canopyA'];
  let treeCount=0;
  const place=(name,x,y,z,height,angle)=>{
   const target=templateMap.get(name);if(!target)return false;
   if(locate(layer,target,x,y,z,height,angle)){results.placed++;if(name.startsWith('canopy'))treeCount++;return true}
   return false;
  };
  // Gameplay/physics traverse the centers. Canopy is placed exclusively
  // against the OUTER CORNERS of real islands; it cannot resemble a new,
  // non-collidable walkway or cover the joystick player's clear route.
  // ART BUDGET: five small accents across an entire long level, not
  // twelve giant canopies stacked over KAI. Trees frame exploration;
  // no trees over the spawn, rescue characters or relay mechanisms.
  const treeTiles=level?[3,5,7,10,13]:[3,5,7,10,13];
  const restricted=[
    {x:0,z:1.2},
    ...(stage.mission?.rescues||[]),
    ...(stage.map.runes||[]),
    ...stage.map.walkways.filter((_,i)=>i<5).map(w=>({x:(w.x1+w.x2)/2,z:(w.z1+w.z2)/2, clearance:0.8}))
  ];
  const clear=(x,z,radius=1.55)=>restricted.every(point=>
    Math.hypot(x-point.x,z-point.z)>radius+(point.clearance||0));
  let remainingCanopies=5;
  for(let i=0;i<treeTiles.length;i++){
   const p=stageTiles[treeTiles[i]],side=i%2?-1:1;
   if(!p)continue;
   const key=palettes[(i+(level?2:0))%palettes.length];
   const x=p.x+side*(p.w*.5+.27);
   const z=p.z+(i%3===0?-.30:.32)*p.d;
   if(clear(x,z,1.5)&&remainingCanopies>0){
    const height=(level?1.22:1.32)+random()*.19;
    if(place(key,x,p.y+.02,z,height,random()*Math.PI*2))remainingCanopies--;
   }
   // Bushes accent outside corners; no center-path decorative collisions.
   if(i%2===0){
    const bx=p.x-side*(p.w*.5+.06),bz=p.z+(random()-.5)*p.d*.55;
    if(clear(bx,bz,.78))place('shrub',bx,p.y+.025,bz,.28+random()*.11,random()*Math.PI*2);
   }
  }
  // Detail on physically walkable historic ruins only; never create new
  // fake land/bridges. Premium plants are scenery with no new hitboxes.
  if(level===1){
   // Two landmark watchtowers frame the arena. Wall fragments and rocks
   // reinforce the ruins without pretending to be walkable surfaces.
   const arena=stageTiles[7],oldTemple=stageTiles[11],cliff=stageTiles[6];
   place('medievalTower',arena.x-arena.w*.43,arena.y+.02,arena.z-arena.d*.40,2.05,.43);
   place('medievalTower',arena.x+arena.w*.43,arena.y+.02,arena.z-arena.d*.40,2.05,-.49);
   place('medievalWall',oldTemple.x-oldTemple.w*.39,oldTemple.y-.08,oldTemple.z+oldTemple.d*.40,1.14,.7);
   place('medievalWall',cliff.x+cliff.w*.44,cliff.y-.08,cliff.z-cliff.d*.39,.92,.12);
   place('medievalRock',oldTemple.x+oldTemple.w*.48,oldTemple.y-.18,oldTemple.z-oldTemple.d*.45,.94,.24);
   place('medievalRock',cliff.x-cliff.w*.50,cliff.y-.14,cliff.z+cliff.d*.42,1.10,1.2);
   place('shrub',oldTemple.x+oldTemple.w*.43,oldTemple.y+.02,oldTemple.z-oldTemple.d*.4,.53,.4);
  }
  if(treeCount>=2){
   stage.premiumNativeActive=true;
   // Suppress redundant Kenney tree/bush dressing ONLY after imported models
   // actually loaded. The waterfall, crates, bridges and pickups stay.
   if(stage.kenneyFoliage)stage.kenneyFoliage.visible=false;
   if(typeof stage.setPremiumFoliage==='function')stage.setPremiumFoliage(true);
  }
  results.canopies=treeCount;
  stage.premiumStats=results;
  stage.pocket?.reindex();
  return results;
 }
 return {decorate,sources:SOURCES};
};
})(typeof window!=='undefined'?window:globalThis);
