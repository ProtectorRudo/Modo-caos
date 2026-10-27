/* MINI WORLDS — Kenney Nature Kit CC0 optional art enhancement.
 * All GLB files are bundled in this repository; no player-side downloads.
 * Keeps original geometry as a complete playable offline/loader-failure fallback. */
(function(root){
'use strict';
root.MiniWorldsAssets=function(T){
 const BASE='./assets/mini-worlds/kenney/';
 const models=[
 'plant-bushdetailed','grass-leafslarge','flower-yellowb','rock-largea',
 'rock-tallb','stone-largeb','cliff-waterfall-rock','bridge-woodround',
 'canoe','campfire-stones','crate','crate-strong','coin-gold','star','chest'
 ];
 const platformer=new Set(['crate','crate-strong','coin-gold','star','chest']);
 let loaderPromise;
 const rand=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 async function loader(){
  if(!loaderPromise)loaderPromise=import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js').then(m=>new m.GLTFLoader());
  return loaderPromise;
 }
 function useMeshSettings(object){
  object.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=true;node.frustumCulled=true}});
 }
 function place(group,model,x,y,z,size=.8,turn=0){
  if(!model)return false;
  const o=model.clone(true);group.add(o);o.position.set(x,y,z);o.rotation.y=turn;
  o.scale.setScalar(size);o.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(o);
  if(!bounds.isEmpty()&&Number.isFinite(bounds.min.y))o.position.y+=y-bounds.min.y;
  else o.position.y=y;
  return o;
 }
 async function decorate(stage,level,signal){
  const scene=stage?.worldRoot||stage?.root;if(!scene)return {count:0,loaded:0,failed:models.length};
  const add=new T.Group();add.name='MINI WORLDS · KENNEY CC0 WORLD DRESSING';scene.add(add);
  stage.kenneyArt=add;
  const foliage=new T.Group();foliage.name='KENNEY FOLIAGE FALLBACK';add.add(foliage);
  stage.kenneyFoliage=foliage;
  foliage.visible=!stage.premiumNativeActive;
  let alive=true,loaded=0,failed=0,instances=0;
  stage.disposeAssets=()=>{alive=false};
  const base=await loader();
  const templates=new Map();
  // Load once, cache within this scene, then instantiate lightweight clones.
  for(let i=0;i<models.length;i+=5){
   await Promise.all(models.slice(i,i+5).map(async name=>{
    try{
     let file=await base.loadAsync(BASE+name+'.glb');
     let o=file.scene;
     o.updateMatrixWorld(true);
     let box=new T.Box3().setFromObject(o),dimensions=new T.Vector3();box.getSize(dimensions);
     if(dimensions.y<.001||!Number.isFinite(dimensions.y))throw Error('incomplete GLB');
     const body=new T.Group();o.scale.multiplyScalar(1/dimensions.y);body.add(o);
     useMeshSettings(body);templates.set(name,body);loaded++;
    }catch(err){failed++;if(typeof console!=='undefined')console.info('[MINI WORLDS] GLB unavailable:',name,err.message)}
   }));
   if(!alive||signal?.aborted)return {count:0,loaded,failed};
  }
  const random=rand(level?15773:7093);
  const setPiece=(parent,name,x,y,z,height,angle)=>{
   const proto=templates.get(name);if(!proto)return;
   const obj=place(parent,proto,x,y,z,height,angle);if(!obj)return;
   const tree=name.startsWith('tree-');
   const rock=/^(rock-|stone-|cliff-waterfall-rock)/.test(name);
   const solid=tree||rock||name==='campfire-stones';
   if(solid&&stage.registerSolid){
    const radius=tree?.19:rock?Math.min(.42,.15+height*.18):.18;
    const collider=stage.registerSolid(obj,{x,y,z,height:Math.max(.25,height),radius,kind:tree?'tree':rock?'rock':'prop'});
    if(!collider){obj.parent?.remove(obj);return}
   }
   instances++;
  };
  const pick=(name,x,y,z,height,angle=0)=>setPiece(add,name,x,y,z,height,angle);
  const flora=(name,x,y,z,height,angle=0)=>setPiece(foliage,name,x,y,z,height,angle);
  const tiles=stage.map.platforms;
  for(let i=0;i<tiles.length;i++){
   const p=tiles[i],height=p.y+.03,x=p.x,z=p.z,wx=p.w*.5,wz=p.d*.5;
   if(p.kind==='beach'||p.kind==='jungle'){
    // Decorative pieces stay on the outside rim, clear of the avatar corridor and enemies.
    // Leave a clear playable corridor. Scenic vegetation should frame a
    // memorable vista, not bury the knight under dozens of palm crowns.
    // No stacked Kenney toy trees: native slender cypress already provides
    // canopy silhouettes with real collision. The nature pack adds only
    // low plants and flowers, well away from the player's eye line.
    if(i%3===0)flora('plant-bushdetailed',x+wx+.12,height,z+(random()-.5)*p.d*.65,.26+random()*.08,random()*6.28);
    flora(i%2?'flower-yellowb':'grass-leafslarge',x-wx+.18,height,z+(random()-.5)*p.d*.75,.23+random()*.1,random()*6.28);
   }
   if(p.kind==='ruins'||p.kind==='waterfall'||p.kind==='arena'){
    pick('stone-largeb',x-wx-.20,height,z-.30,.58+random()*.27,random()*6.28);
    pick('rock-tallb',x+wx+.33,height-.22,z+.25,.68+random()*.22,random()*6.28);
    if(i%2===0)pick('rock-largea',x+wx+.18,height-.06,z+.16,.36+random()*.11,random()*6.28);
   }
   // Deliberately omit the former 2.05 m broadleaf tree which blocked KAI.
  }
  const beach=tiles[0],camp=tiles[1],bridge=tiles[2],waterfall=tiles[6];
  pick('canoe',beach.x-3.1,-.56,beach.z+1.3,.75,.3);
  pick('campfire-stones',camp.x+camp.w/2+.42,camp.y,camp.z+.15,.55,.23);
  pick('bridge-woodround',bridge.x-bridge.w/2-1.3,bridge.y-.15,bridge.z+.15,.54,.8);
  pick('cliff-waterfall-rock',waterfall.x+waterfall.w/2+.26,waterfall.y-.12,waterfall.z-.50,.88,1.4);
  // Replace primitive pickups with actual textured 3D assets. Hitboxes and
  // collectible IDs belong to MiniWorldsCore and never depend on the model.
  const replace=(original,name,height)=>{
   const proto=templates.get(name);if(!proto||!original)return false;
   const visual=proto.clone(true);visual.name='KENNEY · '+name;
   const bbox=new T.Box3().setFromObject(proto);
   const cy=(bbox.max.y+bbox.min.y)*.5;
   visual.scale.setScalar(height);visual.position.y=-cy*height;
   original.add(visual);
   original.children.forEach(c=>{if(c!==visual)c.visible=false});
   instances++;return true;
  };
  stage.coins.forEach(c=>replace(c,'coin-gold',.40));
  stage.stars.forEach(c=>replace(c,'star',.60));
  stage.boxes.forEach((b,i)=>{
   const type=stage.map.boxes[i].type,model=type==='reinforced'?'crate-strong':type==='secret'?'chest':'crate';
   if(replace(b,model,.61)&&(type==='coins'||type==='mystery')){
    // A luminous side seal makes reward crates immediately distinguishable.
    const color=type==='coins'?0xffd25b:0xbd86ff;
    const seal=new T.Group();seal.position.set(0,.08,.326);
    const plate=new T.Mesh(new T.CylinderGeometry(.16,.16,.026,14),new T.MeshStandardMaterial({color,metalness:.55,roughness:.25,emissive:color,emissiveIntensity:.20}));
    plate.rotation.x=Math.PI/2;seal.add(plate);
    const glyph=new T.Mesh(type==='coins'?new T.TorusGeometry(.091,.027,7,15):new T.IcosahedronGeometry(.072,0),
      new T.MeshStandardMaterial({color:0xfffaf3,metalness:.3,roughness:.22}));
    glyph.position.z=.027;seal.add(glyph);b.add(seal);
   }
  });
  stage.assetStats={loaded,failed,instances};
  foliage.visible=!stage.premiumNativeActive;
  if(!alive||signal?.aborted){add.parent?.remove(add);return {count:0,loaded,failed}};
  stage.pocket?.reindex();
  return {count:instances,loaded,failed};
 }
 return {decorate,models:Object.freeze([...models])};
};
})(typeof window!=='undefined'?window:globalThis);