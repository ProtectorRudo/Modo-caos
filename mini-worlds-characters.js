/* MINI WORLDS · licensed monster rig bridge + fox avatar art boundary.
 * Keep gameplay/collisions in mini-worlds-core.js. These assets are visual only.
 * Monster GLTFs are local CC0. Fox hero mesh is original and always available.
 * The exact KAI Sketchfab mesh is NOT redistributed without authenticated acquisition.
 */
(function(root){
'use strict';
const BASE='./assets/mini-worlds/characters/';
const KAI_REFERENCE='https://sketchfab.com/3d-models/kai-the-little-fox-warrior-animated-aa56e447b578470b8d6b1b9587fd29ac';
const ENEMY=[['Alien','Bat','Cyclops','Cactus'],['Mushroom','Ghost','Cyclops','Cactus']];
const BOSS=['YellowDragon','Yeti'];
const FILES=Object.freeze(['Alien','Bat','Cactus','Cyclops','Mushroom','Ghost','YellowDragon','Yeti']);
root.MiniWorldsCharacters=function(T){
 let factory=null;
 const cache=new Map();
 let skeletonModule;
 async function initialize(){
  if(!factory)factory=Promise.all([
   import('three/addons/loaders/GLTFLoader.js'),
   import('three/addons/utils/SkeletonUtils.js')
  ]).then(([mod,sk])=>{skeletonModule=sk;return new mod.GLTFLoader()});
  return factory;
 }
 async function load(name){
  if(!cache.has(name)){
   const result=(async()=>{
    const loader=await initialize();
    const uri=BASE+name+'.gltf';
    const obj=await loader.loadAsync(uri);
    if(!obj?.scene)throw Error('GLTF scene missing: '+name);
    const bounds=new T.Box3().setFromObject(obj.scene),size=new T.Vector3();bounds.getSize(size);
    if(!Number.isFinite(size.y)||size.y<=.01)throw Error('Invalid model bounds: '+name);
    return {scene:obj.scene,animations:obj.animations||[],height:size.y};
   })().catch(err=>{cache.delete(name);throw err});
   cache.set(name,result);
  }
  return cache.get(name);
 }
 function physicalRig(def,goalHeight,footY=0){
  const g=skeletonModule.clone(def.scene),sc=goalHeight/def.height;
  g.scale.multiplyScalar(sc);
  g.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(g);
  // Set origin at model feet. The physics capsule/hitboxes never change.
  g.position.y+=footY-bounds.min.y;
  const stand=new T.Group();stand.add(g);
  stand.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false}});
  const mixer=new T.AnimationMixer(g),actions=new Map();
  def.animations.forEach(clip=>{
   const a=mixer.clipAction(clip);
   actions.set(clip.name.toLowerCase(),a);
  });
  let playing='';
  const choose=(candidates)=>{
   for(const c of candidates){const n=c.toLowerCase(),found=[...actions.keys()].find(x=>x===n||x.startsWith(n+'_')||x.includes(n));if(found)return found}
   return actions.keys().next().value;
  };
  function animate(candidates){
   const name=choose(candidates);if(!name||playing===name)return;
   const next=actions.get(name),last=actions.get(playing);
   if(last&&last!==next)last.fadeOut(.14);
   next.reset().fadeIn(.14).play();playing=name;
  }
  return {stand,mixer,animate,update:dt=>mixer.update(dt)};
 }
 function replaceVisual(group,visual,keep=[]){
  for(const old of [...group.children])if(!keep.includes(old))old.visible=false;
  group.add(visual);
 }
 async function setup(stage,level){
  if(!stage||!stage.hero)return {loaded:0,failed:1};
  let alive=true;const visual=[],reasons=[];
  stage.disposeCharacters=()=>{alive=false;visual.length=0;stage.updateCharacterAnimations=null};
  const names=[...new Set([...ENEMY[level||0],BOSS[level||0]])];
  const pending=names.map(name=>load(name));
  // Each model failure is isolated: other characters still load.
  const results=await Promise.allSettled(pending);
  if(!alive)return {loaded:0,failed:0};
  const ready=new Map();
  results.forEach((v,i)=>{if(v.status==='fulfilled')ready.set(names[i],v.value);else reasons.push(names[i]+': '+String(v.reason?.message||v.reason))});
  // Keep the original fox hero fully visible; the 8 monster rigs only
  // replace enemies and bosses and cannot hide the fox or its blaster.
  let enemiesDone=0;
  for(let i=0;i<stage.map.enemies.length;i++){
   const e=stage.map.enemies[i],types=ENEMY[level||0];
   const name=e.type==='patrol'?types[0]:e.type==='flying'?types[1]:e.type==='defender'?types[2]:types[3];
   const def=ready.get(name);if(!def)continue;
   const rig=physicalRig(def,e.type==='defender'?1.04:.78,-.40);
   replaceVisual(stage.enemies[i],rig.stand);
   rig.stand.name='CUTE MONSTERS · '+name;visual.push({type:'enemy',id:i,rig});enemiesDone++;
  }
  const b=ready.get(BOSS[level||0]);
  if(b){
   const rig=physicalRig(b,3.10,.02),boss=stage.boss;
   replaceVisual(boss.root,rig.stand);
   rig.stand.name='CUTE MONSTERS · GIANT BOSS · '+BOSS[level||0];
   // The attackable weak core is a separate floating visual that preserves
   // the exact three-phase weakness windows in the pure JS boss core.
   const crystal=new T.Mesh(new T.IcosahedronGeometry(.21,1),new T.MeshStandardMaterial({color:0xffe5a5,emissive:0xffac25,emissiveIntensity:1.25,metalness:.28,roughness:.25}));
   const aura=new T.Mesh(new T.TorusGeometry(.39,.055,8,32),new T.MeshBasicMaterial({color:0x86f9ff,transparent:true,opacity:.85}));
   crystal.position.set(0,1.42,.72);aura.position.set(0,1.42,.74);
   boss.root.add(crystal,aura);boss.weak=crystal;boss.aura=aura;
   visual.push({type:'boss',rig});
  }
  stage.updateCharacterAnimations=(game,dt)=>{
   if(!alive||!game)return;
   for(const x of visual){
    if(x.type==='enemy'){
     const enemy=game.map.enemies[x.id];
     if(!enemy.alive)continue;
     x.rig.animate(enemy.flash>.03?['hitrecieve','hit']:enemy.stun>.01?['idle','flying']:['walk','flying','idle']);
    }else{
     const b=game.map.boss;
     if(!b.active||!b.alive)continue;
     x.rig.animate(b.telegraph>.03?['bite_front','bite_inplace','attack']:b.weak>.03?['hitrecieve','hit']:['flying','idle','walk']);
    }
    x.rig.update(dt);
   }
  };
  if(reasons.length)console.warn('[MINI WORLDS] Model fallbacks active:',reasons);
  stage.characterStats={hero:'original-fox',source:KAI_REFERENCE,enemies:enemiesDone,boss:!!b,failed:reasons};
  return stage.characterStats;
 }
 return {setup,FILES,KAI_REFERENCE};
};
})(typeof window!=='undefined'?window:globalThis);
