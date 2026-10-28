/*
 CIVIDOM · Quaternius Base Characters (CC0) + original rig-attached outfits.
 Four humanoid champions use locally vendored, skinned GLB; eight legacy mascots
 remain selectable. The official Quaternius Modular Outfits Fantasy ZIP is NOT
 bundled. Never change capture, boxes or storm physics from the render layer.
*/
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {buildMascot,animateMascot,MASCOT_DATA} from './paper-mascots.mjs';
import {setFashion} from './paper-fashion.mjs';
import {CHIBI_ROSTER,applyChibiFashion,chibiEmote,disposeChibi} from './paper-chibi.mjs';
import {setHumanFashion,animateHuman,initializeHumanRig,disposeHumanActor,HUMAN_HEROES,transplantQuaterniusHead,syncQuaterniusHead} from './paper-quaternius.mjs';

const canvas=document.getElementById('characterStage');
const getState=()=>typeof window.Paper3DState==='function'?window.Paper3DState():null;
const relative='./assets/mascots/';
const HUMAN_COUNT=CHIBI_ROSTER.length;
const TOTAL_HEROES=HUMAN_COUNT;
const models=CHIBI_ROSTER.map(x=>x.model+'.glb');
const backupBase='./assets/styloo/';
const backupModels=['archer.glb','merchant.glb','student.glb','ninja.glb','archer.glb','merchant.glb','student.glb','ninja.glb'];
const palette=['#25d9ef','#ffae3c','#ad75f7','#5ad980'];
const RIG_HEIGHT=80;
const gltfLoader=new GLTFLoader();
const sourceAssets=new Array(TOTAL_HEROES).fill(null),instances=new Map();
const assetVersions=new Uint32Array(TOTAL_HEROES);
window.PaperPortraits=window.PaperPortraits||[];
window.PaperChibiStatus='loading';
let mainGameVisible=false;
window.Paper3DReady=Object.create(null);
window.PaperVSReady=false;
window.PaperMenuReady=false;
let scene,camera,renderer,started=false,failed=false,last=0,activeHero=-1;
try{
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.25;
 scene=new THREE.Scene();
 camera=new THREE.OrthographicCamera(-200,200,350,-350,.1,3000);
 scene.add(new THREE.HemisphereLight(0xf1ffff,0x5e7aab,2.8));
 const key=new THREE.DirectionalLight(0xfff9e8,3.1);key.position.set(-250,350,700);scene.add(key);
 const fill=new THREE.DirectionalLight(0x86d9ff,1.3);fill.position.set(200,180,340);scene.add(fill);
}catch(e){failed=true;console.warn('3D not available, using original chibi fallback',e);}
const material=(color,metalness=0,roughness=.34)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const addMesh=(group,geometry,mat,x,y,z=0)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);group.add(m);return m;};
function destroyInstance(id){
 const item=instances.get(id);if(!item)return;
 if(item.mixer)item.mixer.stopAllAction();
 disposeChibi(item);disposeHumanActor(item);
 scene.remove(item.root);instances.delete(id);delete window.Paper3DReady[id];
}
function chooseAnimation(gltf,kind){
 const candidates=gltf.animations||[];
 if(!candidates.length)return null;
 if(kind==='idle')return candidates.find(a=>/idle|iddle|breath|stand/i.test(a.name)&&!/crouch/i.test(a.name))||candidates[0];
 if(kind==='emote')return candidates.find(a=>/dance|cheer|wave|celebrat|push/i.test(a.name))||candidates.find(a=>/jump|flip/i.test(a.name))||candidates[0];
 return candidates.find(a=>/run|walk|move|sprint/i.test(a.name))||candidates[0];
}
function findArmRig(mesh){
 const arms={left:null,right:null},forearms={left:null,right:null};
 mesh.traverse(n=>{
  if(!n.isBone)return;
  const name=n.name.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(/upperarm/.test(name)){
   if(/l$/.test(name)&&!arms.left)arms.left=n;
   if(/r$/.test(name)&&!arms.right)arms.right=n;
  }
  if(/forearm/.test(name)){
   if(/l$/.test(name)&&!forearms.left)forearms.left=n;
   if(/r$/.test(name)&&!forearms.right)forearms.right=n;
  }
 });
 return{arms,forearms};
}

function instantiate(person){
 const hero=person.hero;
 const asset=sourceAssets[hero];if(!asset)return null;
 const root=new THREE.Group();root.name='Hero_'+person.id;
 const kit=asset.procedural?buildMascot(THREE,hero%MASCOT_DATA.length):null;
 const base=kit?kit.root:SkeletonUtils.clone(asset.scene);
 const human=asset.human?initializeHumanRig(base,hero,!!asset.nativeOutfit):null;
 const headOverlay=asset.nativeOutfit&&asset.referenceHead?
  transplantQuaterniusHead(THREE,asset.referenceHead,base,scene=>SkeletonUtils.clone(scene)):null;
 const face=headOverlay?initializeHumanRig(headOverlay,hero,false):null;
 const bounds=new THREE.Box3().setFromObject(base),size=bounds.getSize(new THREE.Vector3());
 if(!size.y||!Number.isFinite(size.y))return null;
 const factor=RIG_HEIGHT/size.y;
 base.scale.setScalar(factor);
 base.position.set(-bounds.min.x*factor-size.x*factor/2,-bounds.min.y*factor,0);
 root.add(base);
 const clothes=new THREE.Group();root.add(clothes);
 const mixer=asset.animations?.length?new THREE.AnimationMixer(base):null;
 const run=chooseAnimation(asset,'run'),idle=chooseAnimation(asset,'idle'),emote=chooseAnimation(asset,'emote');
 const actions={};
 if(mixer)for(const [key,clip] of [['run',run],['idle',idle],['emote',emote]])if(clip){actions[key]=mixer.clipAction(clip);actions[key].setLoop(THREE.LoopRepeat);}
 const rig=findArmRig(base);
 const instance={root,base,mixer,actions,hero,outfit:'',lastEmote:0,phase:Math.random()*6,...rig,
 restPose:captureRestPose(rig.arms,rig.forearms),mascotRig:kit?.rig||null,...(human||{}),
 nativeOutfit:!!asset.nativeOutfit,headOverlay,headBones:face?.humanBones,headRest:face?.humanRest,chibi:!!asset.chibi,chibiSourceHeight:size.y,assetVersion:assetVersions[hero]};
 if(instance.humanBones||instance.chibi)updateOutfit(instance,{});
 scene.add(root);instances.set(person.id,instance);
 window.Paper3DReady[person.id]=true;
 return instance;
}
function updateOutfit(instance,equipment){
 if(instance.chibi)applyChibiFashion(THREE,instance,equipment||{});
 else if(instance.humanBones)setHumanFashion(THREE,instance,equipment||{});
 else setFashion(THREE,instance,equipment||{});
}
function loadModel(index){
 return new Promise(resolve=>{
  gltfLoader.load(relative+models[index],gltf=>{sourceAssets[index]=gltf;resolve(true);},
   undefined,err=>{
    console.warn('Animal GLB unavailable; checking Styloo CC0 fallback:',models[index]);
    gltfLoader.load(backupBase+backupModels[index],gltf=>{sourceAssets[index]=gltf;resolve(true);},
     undefined,error=>{console.warn('3D failed; canvas chibi stays available',index);resolve(false);});
   });
 });
}
function startLoading(){
 if(started||failed)return;
 started=true;
 const root='https://cdn.jsdelivr.net/gh/binyoun-cberi/kidscade@a68ea8ac843db770e24172d3319ac6cd07bec97a/assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/';
 const secondary='https://rawcdn.githack.com/binyoun-cberi/kidscade/a68ea8ac843db770e24172d3319ac6cd07bec97a/assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/';
 const getGLB=name=>new Promise((resolve,reject)=>{
  // Prefer the local vendored file; use immutable licensed mirrors if missing.
  gltfLoader.load('./assets/styloo/'+name+'.glb',resolve,undefined,()=>{
   gltfLoader.load(root+name+'pr.glb',resolve,undefined,()=>{
    gltfLoader.load(secondary+name+'pr.glb',resolve,undefined,reject);
   });
  });
 });
 const unique=[...new Set(CHIBI_ROSTER.map(x=>x.model))];
 const state=getState();
 const first=CHIBI_ROSTER[state?.menuHero||0]?.model||'ninja';
 const rival=CHIBI_ROSTER[state?.vsRival||1]?.model||'archer';
 const priority=[...new Set([first,rival,...unique])];
 let complete=0,success=0;
 window.PaperChibiStatus='loading';
 priority.forEach((name,index)=>{
  // Rayo/selected champion and VS opponent load first; other five async.
  const delay=index<2?0:850+(index-2)*350;
  setTimeout(()=>{
   getGLB(name).then(asset=>{
    if(!asset?.scene)throw new Error('Invalid GLB scene');
    const available=CHIBI_ROSTER.map((h,i)=>h.model===name?i:-1).filter(i=>i>=0);
    for(const i of available){sourceAssets[i]={...asset,chibi:true,model:name};assetVersions[i]++;}
    success++;window.PaperChibiStatus='partial';
    // Photo portraits update progressively with each rigged GLB load.
    setTimeout(()=>{if(!getState()?.playing)snapshotChibiPortraits();},60);
   }).catch(error=>{
    console.warn('Chibi model could not load, retaining gameplay fallback:',name,error);
    for(let i=0;i<CHIBI_ROSTER.length;i++)if(CHIBI_ROSTER[i].model===name)
     {sourceAssets[i]={procedural:true,animations:[],scene:null};assetVersions[i]++;}
   }).finally(()=>{
    complete++;
    if(complete===priority.length)window.PaperChibiStatus=success?'ready':'fallback';
   });
  },delay);
 });
}
// A true 3D portrait from the exact same GLB, for selector, ranking and VS.
// One temporary lightweight WebGL context, released immediately after capture.
function snapshotChibiPortraits(){
 if(window.PaperChibiStatus==='fallback'||window.PaperPortraits?.filter(Boolean).length===TOTAL_HEROES)return;
 let preview=null;
 try{
  preview=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
  preview.setPixelRatio(1);preview.setSize(144,176,false);
  preview.outputColorSpace=THREE.SRGBColorSpace;
  preview.toneMapping=THREE.ACESFilmicToneMapping;preview.toneMappingExposure=1.43;
  preview.setClearColor(0,0,0,0);
  const scenePreview=new THREE.Scene();
  scenePreview.add(new THREE.HemisphereLight(0xffffff,0x717ca5,3));
  const light=new THREE.DirectionalLight(0xfff5da,3.4);light.position.set(-100,200,300);scenePreview.add(light);
  const cam=new THREE.OrthographicCamera(-62,62,76,-76,.1,900);
  cam.position.set(0,0,420);cam.lookAt(0,0,0);
  for(let i=0;i<TOTAL_HEROES;i++){
   const asset=sourceAssets[i];if(!asset?.chibi||window.PaperPortraits[i])continue;
   const model=SkeletonUtils.clone(asset.scene);
   const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<=0)continue;
   const factor=113/size.y;
   model.scale.setScalar(factor);
   model.position.set(-(box.min.x+size.x*.5)*factor,-(box.min.y+size.y*.51)*factor,0);
   scenePreview.add(model);
   const actor={hero:i,chibi:true,base:model,chibiSourceHeight:size.y};
   applyChibiFashion(THREE,actor,{});
   preview.render(scenePreview,cam);
   const data=preview.domElement.toDataURL('image/webp',.88);
   if(data&&data.length>800){
    window.PaperPortraits[i]=data;
    const img=document.querySelector('[data-hero="'+i+'"] .hero3DThumbnail');
    if(img)img.src=data;
    if(getState()?.menuHero===i){
     const fallback=document.getElementById('menuHeroPortrait');if(fallback)fallback.src=data;
    }
    window.dispatchEvent(new CustomEvent('cividom:portrait',{detail:{hero:i,url:data}}));
   }
   disposeChibi(actor);
   scenePreview.remove(model);
  }
 }catch(error){console.warn('3D avatar portraits unavailable; game 3D remains playable',error);}
 finally{if(preview){preview.dispose();preview.forceContextLoss();}}
}
function adjustSize(width,height){
 if(canvas.width!==Math.round(width*Math.min(devicePixelRatio||1,1.5))||canvas.height!==Math.round(height*Math.min(devicePixelRatio||1,1.5))){
  renderer.setSize(width,height,false);
 }
}
/* CC0 3D crates. One shared renderer; at most five instances in view.
   Same capture/box pickups as Canvas game. Missing GLB = authored 2.5D fallback.
   Local assets are vendored at build time; their immutable CDN is the backup. */
const cvCrateSources={
 ammo:['./assets/powercrates/pickup-ammo.glb','https://cdn.3dassets.dev/assets/27680/v1/model.glb'],
 elite:['./assets/powercrates/elite-locked.glb','https://cdn.3dassets.dev/assets/27451/v1/model.glb']
};
const cvCratePalette={FAST:0x16c9ff,SLOW:0x9c77ff,BIG:0xffc04e,
 SMOLL:0x75ef99,SHIELD:0x4fe2e7,SORPRESA:0xff76dc};
const cvCrateBase=new Map(),cvCrateInstances=new Map();
let cvCrateLoadStarted=false;
window.PaperCrate3DStatus='idle';
const cvCrateReady=window.PaperCrate3DReady||new Set();
window.PaperCrate3DReady=cvCrateReady;
const cvCrateMaxActors=Math.max(3,Math.min(5,(navigator.hardwareConcurrency||6)-1));
function cvLoadCrateAsset(name,urls){
 return new Promise(resolve=>{
  gltfLoader.load(urls[0],gltf=>resolve(gltf),undefined,()=>{
   gltfLoader.load(urls[1],gltf=>resolve(gltf),undefined,()=>resolve(null));
  });
 });
}
function cvStartCrateLoading(){
 if(cvCrateLoadStarted||failed)return;
 cvCrateLoadStarted=true;
 window.PaperCrate3DStatus='loading';
 Promise.all(Object.entries(cvCrateSources).map(async([name,urls])=>{
  const gltf=await cvLoadCrateAsset(name,urls);
  if(gltf?.scene)cvCrateBase.set(name,gltf);
 })).then(()=>{
  window.PaperCrate3DStatus=cvCrateBase.size===2?'ready':cvCrateBase.size?'partial':'fallback';
 }).catch(()=>{window.PaperCrate3DStatus='fallback';});
}
function cvDisposeCrate(key){
 const i=cvCrateInstances.get(key);
 if(!i)return;
 i.mixer?.stopAllAction();
 scene?.remove(i.root);
 // Shared glTF geometry/textures are reused; do not dispose shared resources.
 for(const mat of i.ownMaterials||[])mat.dispose();
 cvCrateInstances.delete(key);cvCrateReady.delete(key);
}
function cvInstantiateCrate(b){
 const model=b.type==='SORPRESA'?'elite':'ammo',source=cvCrateBase.get(model);
 if(!source)return null;
 const root=new THREE.Group();
 const mesh=source.scene.clone(true);
 // 3DAssets models use +Y up and roughly 1m dimensions. Scale to 42 world px,
 // using a camera-facing orientation matching the existing chibi renderer.
 const bb=new THREE.Box3().setFromObject(mesh);
 const size=bb.getSize(new THREE.Vector3());
 const magnitude=Math.max(size.x,size.y,size.z,0.001);
 const scale=46/magnitude;
 mesh.scale.setScalar(scale);
 mesh.position.set(-(bb.min.x+size.x*.5)*scale,-bb.min.y*scale,0);
 mesh.rotation.y=-.34;
 root.add(mesh);
 const ownMaterials=[];
 // CIVIDOM-original luminous power badge on the shell, no new renderer/lights.
 const col=cvCratePalette[b.type]||0xffedb1;
 const glyph=new THREE.Mesh(new THREE.CircleGeometry(9,20),
  new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.92,depthTest:false}));
 glyph.position.set(0,15,27);glyph.renderOrder=12;root.add(glyph);
 ownMaterials.push(glyph.material);
 const core=new THREE.Mesh(new THREE.CircleGeometry(4,16),
  new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));
 core.position.set(0,15,27.7);core.renderOrder=13;root.add(core);
 ownMaterials.push(core.material);
 const mixer=source.animations?.length?new THREE.AnimationMixer(mesh):null;
 if(mixer&&model==='ammo'){
  const spin=source.animations.find(x=>/spin/i.test(x.name))||source.animations[0];
  if(spin)mixer.clipAction(spin).play();
 }
 scene.add(root);
 const item={root,mesh,mixer,model,ownMaterials,opening:false,shown:true};
 cvCrateInstances.set(b.key,item);
 return item;
}
function cvSyncPowerCrates(state,dt){
 if(failed||!state?.playing)return;
 cvStartCrateLoading();
 const boxes=state.powerBoxes||[];
 const xlim=state.screenW/(2*Math.max(.5,state.zoom))+75;
 const ylim=state.screenH/(2*Math.max(.5,state.zoom))+85;
 const visible=boxes.filter(b=>Math.abs(b.x-state.camX)<xlim&&Math.abs(b.y-state.camY)<ylim)
  .sort((a,b)=>{
   const da=(a.x-state.camX)**2+(a.y-state.camY)**2;
   const db=(b.x-state.camX)**2+(b.y-state.camY)**2;
   return da-db;
  }).slice(0,cvCrateMaxActors);
 const active=new Set();
 cvCrateReady.clear();
 for(const b of visible){
  const source=cvCrateBase.get(b.type==='SORPRESA'?'elite':'ammo');
  if(!source||!b.key)continue;
  active.add(b.key);
  const item=cvCrateInstances.get(b.key)||cvInstantiateCrate(b);
  if(!item)continue;
  item.opening=false;item.root.visible=true;
  item.root.position.set(b.x,-b.y+10+Math.sin(state.clock*3.1+b.x*.02)*3,12);
  item.root.rotation.y=Math.sin(state.clock*1.7+b.y*.01)*.09;
  item.root.scale.setScalar(1);
  item.mixer?.update(Math.min(dt,.035));
  cvCrateReady.add(b.key);
 }
 // Retain a collected elite crate for half a second to play its real lid clip.
 for(const event of state.crateOpenings||[]){
  if(!event?.key)continue;
  const item=cvCrateInstances.get(event.key);
  if(!item||!Number.isFinite(event.age)||event.age>.54)continue;
  active.add(event.key);
  item.opening=true;item.root.visible=true;
  item.root.scale.setScalar(Math.max(.1,1-event.age/.65));
  item.root.rotation.z=Math.sin(event.age*14)*.14;
  if(item.model==='elite'&&!item.openAction&&item.mixer){
   const source=cvCrateBase.get('elite');
   const clip=source?.animations.find(x=>/open/i.test(x.name));
   if(clip){
    item.openAction=item.mixer.clipAction(clip);
    item.openAction.setLoop(THREE.LoopOnce,1);
    item.openAction.clampWhenFinished=true;
    item.openAction.reset().play();
   }
  }
  item.mixer?.update(Math.min(dt,.035));
 }
 for(const key of [...cvCrateInstances.keys()])if(!active.has(key))cvDisposeCrate(key);
}

function sync(dt){
 if(failed)return;
 const state=getState();
 if(state&&(state.playing||state.previewing||state.menuing||state.shopping))startLoading();
 if(!state||!state.playing){
  for(const key of [...cvCrateInstances.keys()])cvDisposeCrate(key);
  cvCrateReady.clear();
  // Avoid a second full-screen WebGL clear every VS frame on mobile devices.
  // One clear is enough when leaving the match, freeing GPU for smooth dancing.
  if(mainGameVisible){for(const p of instances.values())p.root.visible=false;renderer.clear();mainGameVisible=false;}
  return;
 }
 mainGameVisible=true;
 const w=state.screenW,h=state.screenH,zoom=Math.max(.5,state.zoom);
 adjustSize(w,h);
 camera.left=-w/(2*zoom);camera.right=w/(2*zoom);
 camera.top=h/(2*zoom);camera.bottom=-h/(2*zoom);
 camera.position.set(state.camX,-state.camY,1300);
 camera.lookAt(state.camX,-state.camY,0);
 camera.updateProjectionMatrix();
 const all=new Set();
 // APK-sized roster: keep only eight rigged actors visible at a time on Android.
 // The other participants still move/capture/fight normally in the 2D layer.
 const viewW=w/(2*zoom)+100,viewH=h/(2*zoom)+130;
 const visible=state.people.filter(p=>p.alive&&Math.abs(p.x-state.camX)<viewW&&Math.abs(p.y-state.camY)<viewH)
  .sort((a,b)=>(a.id===0?-1:b.id===0?1:Math.hypot(a.x-state.camX,a.y-state.camY)-Math.hypot(b.x-state.camX,b.y-state.camY)));
 const richActors=new Set(visible.slice(0,8).map(p=>p.id));
 for(const p of state.people){
  if(!richActors.has(p.id)){if(instances.has(p.id))destroyInstance(p.id);continue;}
  all.add(p.id);let item=instances.get(p.id);
  if(!item||item.hero!==p.hero||item.assetVersion!==assetVersions[p.hero]){if(item)destroyInstance(p.id);item=instantiate(p);}
  if(!item)continue;
  item.root.visible=!!p.alive;
  if(!p.alive)continue;
  item.root.position.set(p.x,-p.y+7,0);
  // BIG / SMOLL use the same gameplay modifier in 2D and in the WebGL actors.
  item.root.scale.setScalar(Math.max(.65,Math.min(1.7,p.scale||1)));
  // Always show faces and outfit silhouettes while hinting at turning.
  item.root.rotation.y=Math.sin(p.angle)*.45;
  if(item.mixer){
   item.mixer.update(Math.min(.04,dt));
   const animate=p.emoting?'emote':'run';
   for(const [key,action] of Object.entries(item.actions)){
    if(key===animate){if(!action.isRunning())action.reset().play();action.enabled=true;action.weight=1;}
    else if(action.isRunning())action.stop();
   }
  }else{item.root.position.y+=Math.sin(state.clock*9+item.phase)*1.8;}
  if(item.mascotRig)animateMascot(item,state.clock,p.emoting?p.emoteId:'run');
   else if(item.humanBones)animateHuman(THREE,item,state.clock,p.emoting?p.emoteId:'run');
   else if(item.chibi&&p.emoting)chibiEmote(THREE,item,state.clock,p.emoteId||'emote_hello');
   if(item.headOverlay)syncQuaterniusHead(THREE,item);
  if(p.id===0){updateOutfit(item,state.equipment);}
 }
 for(const id of instances.keys())if(!all.has(id))destroyInstance(id);
 cvSyncPowerCrates(state,dt);
 renderer.render(scene,camera);
}

/* Versus fighters use the same CC0 Styloo GLB as the game, without substituting a
   screenshot or copyrighted song. The alternating open-palmed 6/7 dance is generated
   by custom bone animation layered over the included idle cycle. */
const vsCanvas=document.getElementById('versus3dCanvas');
let vsRenderer=null,vsScene=null,vsCamera=null,vsCharacters=[],vsFailure=false,vsLastFrame=-1;
function vsCreate(){
 if(vsRenderer||vsFailure||!vsCanvas)return;
 try{
  vsRenderer=new THREE.WebGLRenderer({canvas:vsCanvas,alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
  vsRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));
  vsRenderer.setClearColor(0,0,0);
  vsRenderer.outputColorSpace=THREE.SRGBColorSpace;
  vsRenderer.toneMapping=THREE.ACESFilmicToneMapping;
  vsRenderer.toneMappingExposure=1.45;
  vsScene=new THREE.Scene();vsCamera=new THREE.OrthographicCamera(-200,200,250,-250,.1,1200);
  vsCamera.position.set(0,0,750);vsCamera.lookAt(0,0,0);
  vsScene.add(new THREE.HemisphereLight(0xffffff,0x7f91cf,3.2));
  const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-120,210,420);vsScene.add(key);
  const rim=new THREE.DirectionalLight(0x9dcaff,1.6);rim.position.set(190,90,190);vsScene.add(rim);
 }catch(error){vsFailure=true;window.PaperVSReady=false;if(vsCanvas)vsCanvas.style.display='none';console.warn('VS WebGL unavailable, continuing with animated canvas dolls',error);}
}
function vsActor(hero){
 if(!sourceAssets[hero])return null;
 const asset=sourceAssets[hero],root=new THREE.Group();
 const kit=asset.procedural?buildMascot(THREE,hero%MASCOT_DATA.length):null;
 const mesh=kit?kit.root:SkeletonUtils.clone(asset.scene);
 const human=asset.human?initializeHumanRig(mesh,hero,!!asset.nativeOutfit):null;
 const headOverlay=asset.nativeOutfit&&asset.referenceHead?
   transplantQuaterniusHead(THREE,asset.referenceHead,mesh,scene=>SkeletonUtils.clone(scene)):null;
 const face=headOverlay?initializeHumanRig(headOverlay,hero,false):null;
 const box=new THREE.Box3().setFromObject(mesh),size=box.getSize(new THREE.Vector3());
 if(size.y<=0||!Number.isFinite(size.y))return null;
 const factor=RIG_HEIGHT/size.y;mesh.scale.setScalar(factor);
 mesh.position.set(-(box.min.x+size.x*.5)*factor,-box.min.y*factor,0);
 root.add(mesh);vsScene.add(root);
 const mixer=asset.animations.length?new THREE.AnimationMixer(mesh):null;
 const clip=chooseAnimation(asset,'idle');
 const action=mixer&&clip?mixer.clipAction(clip):null;
 if(action)action.play();
 const {arms,forearms}=findArmRig(mesh);
 const actor={hero,root,mesh,base:mesh,mixer,action,arms,forearms,
 dimensions:{x:size.x*factor,y:size.y*factor,z:size.z*factor},restPose:captureRestPose(arms,forearms),phase:Math.random()*6,
 mascotRig:kit?.rig||null,...(human||{}),nativeOutfit:!!asset.nativeOutfit,
 headOverlay,headBones:face?.humanBones,headRest:face?.humanRest,chibi:!!asset.chibi,chibiSourceHeight:size.y,assetVersion:assetVersions[hero]};
 if(actor.humanBones||actor.chibi)updateOutfit(actor,{});
 return actor;
}
function clearVSActors(){
 for(const item of vsCharacters)if(item){if(item.mixer)item.mixer.stopAllAction();disposeChibi(item);disposeHumanActor(item);vsScene?.remove(item.root);}
 vsCharacters=[];
}
// Store a bind/rest orientation once per model. Never multiply incremental angles
// into last frame's quaternion: that accumulates rotations and makes arms spin.
function captureRestPose(arms,forearms){
 const pose={arms:{},forearms:{}};
 for(const kind of ['arms','forearms']){
  const map=kind==='arms'?arms:forearms;
  for(const side of ['left','right'])if(map[side])pose[kind][side]=map[side].quaternion.clone();
 }
 return pose;
}
function danceBones(item,seconds,mirror){
 if(!item.restPose)return;
 // Six-Seven: alternating palms, smooth slow up/down, no full rotations.
 const tempo=2*Math.PI*(item.hero===3?.88:.78);
 const phase=seconds*tempo+(mirror?.45:0);
 const ease=(1-Math.cos(Math.min(1,Math.max(0,seconds/.5))*Math.PI))*.5;
 for(const side of ['left','right']){
  const bone=item.arms?.[side],baseline=item.restPose.arms[side];
  if(!bone||!baseline)continue;
  const sign=side==='left'?-1:1,beat=Math.sin(phase+(sign===1?Math.PI:0));
  const shoulder=new THREE.Quaternion().setFromEuler(new THREE.Euler(.16,sign*.15,sign*(.38+.28*beat),'XYZ'));
  const desired=baseline.clone().multiply(shoulder);
  // Absolute orientation per frame, not premultiply from last frame.
  bone.quaternion.copy(baseline).slerp(desired,ease);
  const elbow=item.forearms?.[side],restElbow=item.restPose.forearms[side];
  if(elbow&&restElbow){
   const bend=new THREE.Quaternion().setFromEuler(new THREE.Euler(.08,0,-sign*(.18+.14*beat),'XYZ'));
   elbow.quaternion.copy(restElbow).slerp(restElbow.clone().multiply(bend),ease);
  }
 }
}
/* One WebGL context for BOTH the hero menu and VS. Reparenting the same canvas
   prevents a third GPU context on older Android devices and keeps one GLB cache. */
function attachShowcase(target,cssClass){
 if(vsCanvas.parentElement?.id!==target)document.getElementById(target)?.appendChild(vsCanvas);
 if(vsCanvas.className!==cssClass)vsCanvas.className=cssClass;
}
function syncMenu(state,dt){
 if(!state?.menuing&&!state?.shopping)return;
 vsCreate();if(vsFailure||!vsRenderer)return;
 const hero=state.menuHero;
 if(!sourceAssets[hero]){window.PaperMenuReady=false;document.getElementById('menuHeroStage')?.classList.remove('model-loaded');const portrait=document.getElementById('menuHeroPortrait');if(portrait)portrait.style.opacity='1';return;}
 try{
  const inShop=!!state.shopping;
  attachShowcase(inShop?'shopHeroStage':'menuHeroStage',inShop?'shopPosition':'menuPosition');
  const previous=vsCharacters[0];
  if(vsCharacters.length!==1||!previous||previous.hero!==hero||previous.assetVersion!==assetVersions[hero]){
   clearVSActors();vsCharacters=[vsActor(hero)];
  }
  const actor=vsCharacters[0];
  if(!actor){window.PaperMenuReady=false;return;}
  const width=Math.max(1,vsCanvas.clientWidth||360),height=Math.max(1,vsCanvas.clientHeight||240);
  const dpr=Math.min(devicePixelRatio||1,1.25);
  if(vsCanvas.width!==Math.round(width*dpr)||vsCanvas.height!==Math.round(height*dpr))
   vsRenderer.setSize(width,height,false);
  vsCamera.left=-width/2;vsCamera.right=width/2;
  vsCamera.top=height/2;vsCamera.bottom=-height/2;vsCamera.updateProjectionMatrix();
  const t=performance.now()/1000;
  actor.root.visible=true;
  actor.root.scale.setScalar(height*(inShop?.78:.70)/RIG_HEIGHT);
  actor.root.position.set(0,-height*(inShop?.36:.34)+Math.sin(t*2.3)*2,0);
  actor.root.rotation.y=inShop?(state.previewYaw||0):Math.sin(t*.9)*.2;
  actor.root.rotation.z=Math.sin(t*1.8)*.015;
  if(actor.mixer)actor.mixer.update(Math.min(dt,.04));
  if(actor.mascotRig)animateMascot(actor,t,inShop?(state.previewEmote||'idle'):'idle');
   else if(actor.humanBones)animateHuman(THREE,actor,t,inShop?(state.previewEmote||'idle'):'idle');
   else if(actor.chibi&&inShop&&state.previewEmote)chibiEmote(THREE,actor,t,state.previewEmote);
   if(actor.headOverlay)syncQuaterniusHead(THREE,actor);
  updateOutfit(actor,inShop?(state.previewEquipment||state.equipment):state.equipment);
  vsRenderer.render(vsScene,vsCamera);
  window.PaperMenuReady=true;
  if(!inShop)document.getElementById('menuHeroStage')?.classList.add('model-loaded');
  else document.getElementById('shopHeroStage')?.classList.add('model-loaded');
  vsCanvas.style.opacity='1';
  const portrait=document.getElementById('menuHeroPortrait');if(portrait)portrait.style.opacity='0';
  const status=document.getElementById('menu3dStatus');
  if(status)status.textContent=actor.nativeOutfit?'QUATERNIUS · CONJUNTO 3D ORIGINAL':actor.humanBones?'HUMANOIDE 3D':'PERSONAJE 3D';
  document.getElementById('menuModelLoader')?.classList.add('loaded');
 }catch(error){
  console.warn('Menu GLB preview fallback enabled',error);
  window.PaperMenuReady=false;vsCanvas.style.opacity='0';
 }
}
function syncVS(state,dt){
 if(!state?.previewing){window.PaperVSReady=false;document.getElementById('versusStage')?.classList.remove('is-3d');return;}
 const wanted=[state.vsHero,state.vsRival];
 if(!wanted.every(i=>sourceAssets[i])){window.PaperVSReady=false;if(vsCanvas)vsCanvas.style.opacity='0';return;}
 vsCreate();if(vsFailure||!vsRenderer)return;
 try{
  attachShowcase('versusStage','vsPosition');
  if(vsCharacters.length!==2||vsCharacters.some((a,i)=>!a||a.hero!==wanted[i]||a.assetVersion!==assetVersions[wanted[i]])){
   clearVSActors();vsCharacters=wanted.map(vsActor);vsLastFrame=-1;
  }
  if(vsCharacters.some(a=>!a)){window.PaperVSReady=false;vsCanvas.style.opacity='0';return;}
  const width=Math.max(1,vsCanvas.clientWidth||350),height=Math.max(1,vsCanvas.clientHeight||480);
  const dpr=Math.min(devicePixelRatio||1,1.25);
  if(vsCanvas.width!==Math.round(width*dpr)||vsCanvas.height!==Math.round(height*dpr))vsRenderer.setSize(width,height,false);
  vsCamera.left=-width/2;vsCamera.right=width/2;vsCamera.top=height/2;vsCamera.bottom=-height/2;
  vsCamera.updateProjectionMatrix();
  // Keep each animal inside its half, regardless of the model's proportions.
  const maxVisualWidth=width*.42,maxVisualHeight=height*.66;
  const arrival=Math.max(0,1-state.vsSeconds/.6);
  for(let i=0;i<2;i++){
   const actor=vsCharacters[i];
   const side=i===0?-1:1;
   const sizeFactor=Math.min(actor.nativeOutfit?4.15:3.4,maxVisualWidth/Math.max(32,actor.dimensions.x),maxVisualHeight/Math.max(45,actor.dimensions.y));
   actor.root.scale.setScalar(sizeFactor);
   actor.root.position.set(side*(width*.245+arrival*width*.37),-height*.22+Math.sin(state.vsSeconds*3.4+i)*1.6,0);
   actor.root.rotation.y=(i===0?-.13:.13)+Math.sin(state.vsSeconds*3.5+i)*.12;
   // Gentle whole-body six-seven sway; never accumulate limb rotations.
   actor.root.rotation.z=Math.sin(state.vsSeconds*2.1+i*Math.PI)*.045;
   actor.root.rotation.x=Math.sin(state.vsSeconds*1.9+i)*.025;
   if(actor.mixer)actor.mixer.update(Math.min(dt,.05));
   if(actor.mascotRig)animateMascot(actor,state.vsSeconds,i===0?(state.vsEmote||'emote_sixseven'):'emote_sixseven',i===1);
    else if(actor.humanBones)animateHuman(THREE,actor,state.vsSeconds,i===0?(state.vsEmote||'emote_sixseven'):'emote_sixseven',i===1);
    else if(actor.chibi)chibiEmote(THREE,actor,state.vsSeconds,i===0&&state.vsEmote!=='emote_hello'?(state.vsEmote||'emote_sixseven'):'emote_sixseven',i===1);
    if(actor.headOverlay)syncQuaterniusHead(THREE,actor);
   else if(!actor.humanBones&&!actor.chibi)danceBones(actor,state.vsSeconds,i===1);
   if(i===0)updateOutfit(actor,state.equipment);
  }
  window.PaperVSReady=true;vsCanvas.style.opacity='1';document.getElementById('versusStage')?.classList.add('is-3d');
  // Skip frames where possible to avoid competing with the gameplay canvas on 4G devices.
  if(vsLastFrame<0||state.vsSeconds<vsLastFrame||state.vsSeconds-vsLastFrame>.028){
   vsRenderer.render(vsScene,vsCamera);
   vsLastFrame=state.vsSeconds;
  }
 }catch(error){window.PaperVSReady=false;vsFailure=true;vsCanvas.style.display='none';document.getElementById('versusStage')?.classList.remove('is-3d');console.warn('VS 3D failed; illustrated mascots remain available',error);}
}

function frame(ms){
 requestAnimationFrame(frame);
 const dt=Math.min(.06,(ms-last)/1000||0);last=ms;
 if(!failed)try{const state=getState();sync(dt);if(state?.menuing||state?.shopping)syncMenu(state,dt);else if(state?.previewing)syncVS(state,dt);else{window.PaperMenuReady=false;window.PaperVSReady=false;vsCanvas.style.opacity='0';document.getElementById('versusStage')?.classList.remove('is-3d');}}catch(e){console.warn('3D actor display disabled; chibi sprites stay available',e);failed=true;
  for(const k of Object.keys(window.Paper3DReady))delete window.Paper3DReady[k];
  cvCrateReady.clear();window.PaperCrate3DStatus='fallback';
  canvas.style.display='none';}
}
if(new URLSearchParams(location.search).has('qa')){
 window.PaperMascotQA=()=>({
  models:sourceAssets.filter(x=>x?.procedural).length,
   chibi:window.PaperChibiStatus||'none',
   licensedChibiAssets:sourceAssets.filter(x=>x?.chibi).length,
   modelsLoading:sourceAssets.filter(x=>!x).length,
   modelVersions:[...assetVersions],
   nativeOutfitActors:[...instances.values()].filter(x=>x.nativeOutfit).length,
   nativeOutfitPreview:vsCharacters.filter(x=>x?.nativeOutfit).length,
   syncedHeadPreview:vsCharacters.filter(x=>x?.headOverlay).length,
   riggedActors:[...instances.values()].filter(x=>x.humanBones).length,
   humanoidPreview:vsCharacters.filter(x=>x?.humanBones).length,
  menuReady:window.PaperMenuReady,
  vsReady:window.PaperVSReady,
  versus:vsCharacters.map(x=>x?.mascotRig?{hero:x.hero,left:x.mascotRig.left.rotation.z,right:x.mascotRig.right.rotation.z}:null),
  gameCharacters:instances.size,
  crateActors:cvCrateInstances.size,crateStatus:window.PaperCrate3DStatus,
  crateMaxActors:cvCrateMaxActors,
  crateModels:[...cvCrateBase.keys()],
  showroomFashion:vsCharacters[0]?.fashionKey||'',
  showroomRig:!!vsCharacters[0]?.mascotRig
 });
}
if(!failed)requestAnimationFrame(frame);
