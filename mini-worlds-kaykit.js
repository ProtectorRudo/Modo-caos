/* MINI WORLDS · curated real KayKit Forest Nature Pack meshes (CC0).
 * Upstream packed GLB (396,480 bytes, one gradient atlas, shared mesh data):
 * https://github.com/Station-Sciences/bot-crossing/tree/8cd9d76b3bf5eddaec7d4ba88f0d1c0547a312dc/public/assets
 * Asset created by Kay Lousberg; forest.glb packed by Station Sciences.
 * Reuses the tiny shared source instead of fetching dozens of GLTF files.
 * Optional scenery ONLY; no new collisions, screen anchors or gameplay gates.
 */
(function(root){
'use strict';
root.MiniWorldsKayKit=function(T,options={}){
 const URL='https://raw.githubusercontent.com/Station-Sciences/bot-crossing/8cd9d76b3bf5eddaec7d4ba88f0d1c0547a312dc/public/assets/forest.glb';
 const MODELS=Object.freeze({
  tree:['Tree_1_A_Color1','Tree_3_A_Color1','Tree_4_C_Color1'],
  bush:['Bush_1_E_Color1','Bush_3_B_Color1'],
  rock:['Rock_1_D_Color1','Rock_2_C_Color1','Rock_3_E_Color1','Rock_3_L_Color1']
 });
 let lazyLoader;
 async function loader(){
  if(!lazyLoader)lazyLoader=import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js')
   .then(m=>new m.GLTFLoader());
  return lazyLoader;
 }
 const rand=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function model(root,name){
  let direct=root.getObjectByName(name);
  if(direct)return direct;
  const normalized=name.toLowerCase().replace(/[^a-z0-9]/g,'');
  let found=null;
  root.traverse(o=>{
   if(!found&&o.name?.toLowerCase().replace(/[^a-z0-9]/g,'')===normalized)found=o;
  });
  return found;
 }
 async function decorate(stage,level){
  if(!stage?.worldRoot||!stage?.map?.platforms)return {loaded:false,placed:0};
  let alive=true;const added=[];stage.kaykitDecor=added;
  stage.disposeKayKit=()=>{alive=false;for(const obj of added)obj.parent?.remove(obj);added.length=0};
  try{
   const gltf=options.loadModel?await options.loadModel(URL):await (await loader()).loadAsync(URL);
   if(!alive)return {loaded:false,placed:0,disposed:true};
   const scene=gltf.scene,protos={};
   for(const [kind,items] of Object.entries(MODELS)){
    protos[kind]=items.map(n=>model(scene,n)).filter(Boolean);
   }
   if(!protos.rock.length&&!protos.bush.length&&!protos.tree.length)
    return {loaded:false,placed:0,reason:'No KayKit prefab nodes in GLB'};
   const random=rand(7805+(level||0)*971);
   const platforms=stage.map.platforms,placedBy={tree:0,bush:0,rock:0};
   const specs=[
    // Quaternius already provides canopy silhouettes. This second pack is
    // a complementary ROCK/BUSH kit, not a second forest stacked on top.
    ['bush',2,1],['bush',5,-1],['bush',10,1],
    ['rock',1,-1],['rock',3,1],['rock',4,-1],['rock',7,1],['rock',8,-1],['rock',11,1]
   ];
   for(let i=0;i<specs.length;i++){
    const [kind,id,side]=specs[i],p=platforms[id],family=protos[kind];if(!p||!family.length)continue;
    const proto=family[(i+level)%family.length],o=proto.clone(true);
    // Sparse, outskirts-only: keep playable corridor, jumps, objects and
    // objectives unobstructed; trees cannot be placed on the avatar spawn.
    const x=p.x+side*(p.w*.5+(kind==='tree'?.06:kind==='rock'?.10:-.04));
    const z=p.z+(random()-.5)*p.d*.72;
    stage.worldRoot.add(o);o.position.set(x,0,z);o.rotation.y=random()*Math.PI*2;
    const box=new T.Box3().setFromObject(o);
    const h=box.max.y-box.min.y;
    if(!Number.isFinite(h)||h<.001){stage.worldRoot.remove(o);continue}
    const wanted=kind==='tree'?.94+random()*.10:kind==='rock'?.24+random()*.13:.24+random()*.08;
    o.scale.setScalar(wanted/h);
    o.updateMatrixWorld(true);
    const scaled=new T.Box3().setFromObject(o);
    o.position.y=p.y+.012-scaled.min.y;
    o.name='KAYKIT '+kind.toUpperCase()+' · '+proto.name;
    o.userData.mwFoliage=kind!=='rock';
    const registered=stage.registerSolid?.(o,{x,y:p.y,z,
     radius:kind==='rock'?.19+wanted*.20:.18,height:wanted,
     kind:kind==='rock'?'rock':'bush'});
    if(stage.registerSolid&&!registered){stage.worldRoot.remove(o);continue}
    o.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true;n.frustumCulled=true;
      if(n.material?.map)n.material.map.anisotropy=Math.max(n.material.map.anisotropy||1,4)}});
    added.push(o);placedBy[kind]++;
   }
   stage.pocket?.reindex();
   return {loaded:true,placed:added.length,placedBy,source:URL};
  }catch(error){
   for(const obj of added)obj.parent?.remove(obj);
   added.length=0;
   console.warn('[MINI WORLDS] KayKit optional landscape skipped, original scene preserved:',error?.message||error);
   return {loaded:false,placed:0,reason:String(error?.message||error)};
  }
 }
 return Object.freeze({decorate,URL,MODELS});
};
})(typeof window!=='undefined'?window:globalThis);
