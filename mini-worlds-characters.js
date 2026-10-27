/* MINI WORLDS · production character rig bridge. RobotExpressive + Quaternius (CC0).
 * Keep gameplay/collisions in mini-worlds-core.js. These assets are visual only.
 * RobotExpressive hero and all Quaternius characters are hosted locally.
 * The procedural robot remains the unconditional no-network fallback.
 */
(function(root){
'use strict';
const BASE='./assets/mini-worlds/characters/';
const ROBOT=BASE+'RobotExpressive.glb';
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
    const uri=name==='Robot'?ROBOT:BASE+name+'.gltf';
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
  const pending=[load('Robot'),...new Set([...ENEMY[level||0],BOSS[level||0]])].map(v=>typeof v==='string'?load(v):v);
  const names=['Robot',...new Set([...ENEMY[level||0],BOSS[level||0]])];
  // Each model failure is isolated: other characters still load.
  const results=await Promise.allSettled(pending);
  if(!alive)return {loaded:0,failed:0};
  const ready=new Map();
  results.forEach((v,i)=>{if(v.status==='fulfilled')ready.set(names[i],v.value);else reasons.push(names[i]+': '+String(v.reason?.message||v.reason))});
  if(ready.has('Robot')){
   const rig=physicalRig(ready.get('Robot'),1.17);
   replaceVisual(stage.hero.root,rig.stand,[stage.hero.wand,stage.hero.finish,...stage.hero.root.children.filter(o=>o.isMesh&&o.geometry?.type==='CircleGeometry')].filter(Boolean));
   rig.stand.name='ORIN / ROBOT EXPRESSIVE · QUATERNIUS CC0';
   if(stage.hero.wand)stage.hero.wand.visible=false;
   rig.stand.traverse(node=>{if(!node.isMesh||!node.material)return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    const revised=materials.map(mat=>{const m=mat.clone();
     if(m.color&&m.color.r>.2&&m.color.g>.2&&m.color.b>.2){
      m.color.lerp(new T.Color(0xd7fff5),.10);m.metalness=.32;m.roughness=.29;
     }
     return m;
    });
    node.material=Array.isArray(node.material)?revised:revised[0];
   });
   visual.push({type:'hero',rig});
  }
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
    if(x.type==='hero'){
     const p=game.player;
     x.rig.animate(p.attack>.03?['punch','attack']:(!p.grounded?['jump','walkjump','idle']:Math.hypot(p.vx,p.vz)>.3?['running','walking','run','walk']:['idle']));
     // Keep the entire articulated CC0 robot rig grounded. Subtle lean and
     // gait bounce add life without moving the collision capsule.
     const speed=Math.min(1,Math.hypot(p.vx,p.vz)/3.1);
     x.rig.stand.rotation.z=-p.vx*.024;
     x.rig.stand.rotation.x=p.grounded?p.vz*.018:-.065;
     x.rig.stand.position.y=p.grounded?Math.sin(game.clock*13)*.014*speed:0;
    }else if(x.type==='enemy'){
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
  stage.characterStats={hero:ready.has('Robot'),enemies:enemiesDone,boss:!!b,failed:reasons};
  return stage.characterStats;
 }
 return {setup,FILES,ROBOT};
};
})(typeof window!=='undefined'?window:globalThis);
