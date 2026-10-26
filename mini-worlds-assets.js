/* MINI WORLDS — Kenney Nature Kit CC0 optional art enhancement.
 * All GLB files are bundled in this repository; no player-side downloads.
 * Keeps original geometry as a complete playable offline/loader-failure fallback. */
(function(root){
'use strict';
root.MiniWorldsAssets=function(T){
 const BASE='./assets/mini-worlds/kenney/';
 const models=[
 'tree-palmdetailedtall','tree-palmbend','tree-palmshort','tree-detailed',
 'plant-bushdetailed','grass-leafslarge','flower-yellowb','rock-largea',
 'rock-tallb','stone-largeb','cliff-waterfall-rock','bridge-woodround',
 'canoe','campfire-stones'
 ];
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
  return true;
 }
 async function decorate(stage,level,signal){
  const scene=stage?.root;if(!scene)return {count:0,loaded:0,failed:models.length};
  const add=new T.Group();add.name='MINI WORLDS · KENNEY CC0 PREMIUM WORLD DRESSING';scene.add(add);
  let alive=true,loaded=0,failed=0,instances=0;
  stage.disposeAssets=()=>{alive=false;add.parent?.remove(add)};
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
  const pick=(name,x,y,z,height,angle=0)=>{
   const t=templates.get(name);if(!t)return;
   if(place(add,t,x,y,z,height,angle))instances++;
  };
  const tiles=stage.map.platforms;
  for(let i=0;i<tiles.length;i++){
   const p=tiles[i],height=p.y+.03,x=p.x,z=p.z,wx=p.w*.5,wz=p.d*.5;
   if(p.kind==='beach'||p.kind==='jungle'){
    // Decorative pieces stay on the outside rim, clear of the avatar corridor and enemies.
    pick(i%2?'tree-palmbend':'tree-palmdetailedtall',x-wx-.18,height,z+wz*.2,1.35+random()*.35,random()*6.28);
    pick('tree-palmshort',x+wx+.21,height,z-wz*.32,1.0+random()*.3,random()*6.28);
    for(let k=0;k<3;k++){
     let edge=k%2?-1:1;
     pick('plant-bushdetailed',x+edge*(wx+.1),height,z+(random()-.5)*p.d*.92,.36+random()*.2,random()*6.28);
     pick(k%2?'flower-yellowb':'grass-leafslarge',x+edge*(wx-.17),height,z+(random()-.5)*p.d*.83,.24+random()*.2,random()*6.28);
    }
   }
   if(p.kind==='ruins'||p.kind==='waterfall'||p.kind==='arena'){
    pick('stone-largeb',x-wx-.20,height,z-.30,.58+random()*.27,random()*6.28);
    pick('rock-tallb',x+wx+.33,height-.22,z+.25,1.05+random()*.5,random()*6.28);
    for(let k=0;k<3;k++)pick('rock-largea',x+(k%2?1:-1)*(wx+.12),height-.06,z+(random()-.5)*p.d*.84,.33+random()*.17,random()*6.28);
   }
   if(level&&i===3){pick('tree-detailed',x-wx-.65,height-.1,z,2.05,.3);pick('tree-detailed',x+wx+.5,height,z-.5,1.50,2)}
  }
  const beach=tiles[0],camp=tiles[1],bridge=tiles[2],waterfall=tiles[6];
  pick('canoe',beach.x-3.1,-.56,beach.z+1.3,.75,.3);
  pick('campfire-stones',camp.x+camp.w/2+.42,camp.y,camp.z+.15,.55,.23);
  pick('bridge-woodround',bridge.x-bridge.w/2-1.3,bridge.y-.15,bridge.z+.15,.54,.8);
  pick('cliff-waterfall-rock',waterfall.x+waterfall.w/2+.26,waterfall.y-.12,waterfall.z-.50,1.22,1.4);
  stage.assetStats={loaded,failed,instances};
  if(!alive||signal?.aborted){add.parent?.remove(add);return {count:0,loaded,failed}};
  return {count:instances,loaded,failed};
 }
 return {decorate,models:Object.freeze([...models])};
};
})(typeof window!=='undefined'?window:globalThis);