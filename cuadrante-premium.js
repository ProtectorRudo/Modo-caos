/* CUADRANTE premium local assets. CC0 models: Quaternius; maps: ambientCG; audio: Kenney.
   Asset fetching is lazy/non-blocking; base arena, physics, AR and fallback always work. */
(function(root){
'use strict';
const BASE='./assets/cuadrante/';
const SFX={hit:'impactMetal_000.ogg',perfect:'forceField_000.ogg',smash:'laserLarge_000.ogg',
 rivalHit:'laserSmall_002.ogg',wall:'impactMetal_003.ogg',geometryHit:'impactMetal_003.ogg',
 goal:'lowFrequency_explosion_000.ogg',conceded:'explosionCrunch_000.ogg',
 transform:'computerNoise_000.ogg',transformWarning:'computerNoise_000.ogg'};
function createAudio(){
 const buffers=new Map(),started=new Set(),broken=new Set();
 function prime(ctx){
  if(!ctx)return;
  for(const file of new Set(Object.values(SFX))){
   if(started.has(file))continue;started.add(file);
   fetch(BASE+'audio/'+file,{cache:'force-cache',signal:AbortSignal.timeout(10000)})
    .then(r=>{if(!r.ok)throw Error('Audio '+r.status);return r.arrayBuffer()})
    .then(b=>ctx.decodeAudioData(b)).then(b=>buffers.set(file,b))
    .catch(()=>broken.add(file)); // original synthesized effects remain playable
  }
 }
 function play(name,ctx,volume,pan=0){
  const file=SFX[name],buf=buffers.get(file);
  if(!file||!buf||volume<=0||!ctx)return false;
  try{
   const src=ctx.createBufferSource(),gain=ctx.createGain();
   src.buffer=buf;src.playbackRate.value=Math.max(.84,Math.min(1.18,1+(Math.random()-.5)*.13));
   gain.gain.value=Math.min(.34,.20*Math.max(0,volume));
   if(ctx.createStereoPanner){
    const stereo=ctx.createStereoPanner();stereo.pan.value=Math.max(-.8,Math.min(.8,pan));
    src.connect(gain).connect(stereo).connect(ctx.destination);
   }else src.connect(gain).connect(ctx.destination);
   src.start();return true;
  }catch(_){return false}
 }
 return {prime,play,stats(){return {loaded:buffers.size,failed:broken.size}}};
}
async function decorate(T,stage){
 if(!T||!stage?.root?.parent)return {models:0,reason:'no-active-3d-stage'};
 const group=new T.Group();group.name='cuadrante-cc0-side-props';
 stage.root.add(group);
 let loaded=0;
 const textureLoader=new T.TextureLoader();
 const textures=await Promise.allSettled(['color','normal','roughness','metalness'].map(async name=>{
  const t=await textureLoader.loadAsync(BASE+'pbr/metal032-'+name+'.webp');
  t.wrapS=t.wrapT=T.RepeatWrapping;
  t.anisotropy=2;t.repeat.set(1,1);
  if(name==='color')t.colorSpace=T.SRGBColorSpace;
  return t;
 }));
 if(textures.every(x=>x.status==='fulfilled')){
  const [albedo,normal,rough,metal]=textures.map(x=>x.value);
  for(const mat of [stage.surfaceMaterials?.matTile,stage.surfaceMaterials?.altTile]){
   if(!mat)continue;
   mat.map=albedo;mat.normalMap=normal;mat.roughnessMap=rough;mat.metalnessMap=metal;
   mat.metalness=.43;mat.roughness=.53;
   mat.transparent=true;mat.opacity=.58;mat.depthWrite=false;
   mat.normalScale.set(.28,.28);mat.color.setHex(mat===stage.surfaceMaterials.matTile?0x79d7e4:0x74bfcf);
   mat.needsUpdate=true;
  }
 }else{
  // Do not use partial PBR channel sets: mismatched maps look worse than base art.
  for(const x of textures)if(x.status==='fulfilled')x.value.dispose();
 }
 // GLTFLoader imports 'three' through the pinned browser import map.
 let GLTFLoader;
 try{({GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'))}
 catch(_){return {models:0,textures:textures.every(x=>x.status==='fulfilled')?4:0,reason:'model-loader-unavailable'}}
 if(!stage.root.parent){return {models:0,reason:'arena-closed'}}
 const loader=new GLTFLoader(),verticesMax=78000;
 let triangleBudget=40000;
 // Models are fixed visual decoration attached to AR world anchor, never collision bodies.
 // The dimensions are artist bounds, not real-world detection or player body tracking.
 // Reuse only LIGHTWEIGHT side props. Huge doors, ceiling panels and
 // square wall frames formerly obscured the ball, rival and real AR room.
 // All imported props remain outside the core collision volume.
 const slots=[
  ['columnAstra',[[-1.92,.72,-2.29,.29,1.08],[1.92,.72,-2.29,.29,1.08]]],
  ['columnHollow',[[-1.94,.66,-.78,.28,1.02],[1.94,.66,-.78,.28,1.02]]],
  ['columnPipes',[[-1.95,.66,1.28,.29,1.00],[1.95,.66,1.28,.29,1.00]]],
  ['columnSupport',[[-1.96,.67,-2.83,.28,.94],[1.96,.67,-2.83,.28,.94]]]
 ];
 const queue=slots.slice();
 async function loadSlot(key,placements){
  if(!stage.root.parent||triangleBudget<=0)return;
  // A short timeout protects low-end mobile devices from a hung model stream.
  const category=key.startsWith('column')?'Columns':'Platforms';
  const filename={
   columnAstra:'Column_Astra',columnHollow:'Column_Hollow',columnSupport:'Column_MetalSupport',columnPipes:'Column_Pipes',
   frameSquare:'Door_Frame_Square',frameTall:'Door_Frame_SquareTall',darkDoor:'Door_DarkMetal',
   plateSet:'Platform_3Plates',darkPlatform:'Platform_DarkPlates',metalPlatform:'Platform_Metal',railSet:'Platform_Rails_4'}[key];
  try{
   const model=await Promise.race([
    loader.loadAsync(BASE+'models/'+category+'/'+filename+'.gltf'),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('model timeout')),3600))
   ]);
   const base=model.scene;
   let triangles=0;
   base.traverse(o=>{if(o.isMesh&&o.geometry){const g=o.geometry;
    triangles+=g.index?g.index.count/3:(g.attributes.position?.count||0)/3;
    o.castShadow=false;o.receiveShadow=false;o.frustumCulled=true;
   }});
   if(triangles>9500||triangles>triangleBudget)return;
   const bounds=new T.Box3().setFromObject(base),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
   if(Math.max(size.x,size.y,size.z)<1e-6)return;
   for(const [x,y,z,width,height] of placements){
    const obj=base.clone(true),wrapper=new T.Group();
    const sx=width/Math.max(size.x,.001),sy=height/Math.max(size.y,.001);
    // Preserve the model proportions and cap large imported scales.
    let factor=Math.min(sx,sy);
    factor=Math.min(8,Math.max(.025,factor));
    obj.position.set(-center.x,-center.y,-center.z);
    wrapper.add(obj);wrapper.scale.setScalar(factor);
    wrapper.position.set(x,y,z);group.add(wrapper);
   }
   loaded+=placements.length;triangleBudget-=triangles*placements.length;
  }catch(_){} // never interrupt a point, collision, tracking or match
 }
 // Limit simultaneous decoders so Android doesn't stall frames or network.
 const concurrency=(typeof navigator!=='undefined'&&(navigator.deviceMemory||4)<=3)?2:3;
 await Promise.all(Array.from({length:concurrency},async ()=>{
  while(queue.length&&stage.root.parent){
   const next=queue.shift();
   if(next)await loadSlot(next[0],next[1]);
  }
 }));
 return {models:loaded,remainingTriangles:Math.round(triangleBudget),textures:textures.every(x=>x.status==='fulfilled')?4:0};
}
root.CuadrantePremium={decorate,createAudio};
})(window);
