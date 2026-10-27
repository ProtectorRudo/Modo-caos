/* RODEADOS 360 V14 — automatic game-ready enemy skins.
 * No file inputs, no Sketchfab login, no extra actions by the player.
 * Optional visual overlay ONLY; unchanged world XR anchor & combat headshots.
 * Attribution: "FREE [Military Soldier] RIGGED" by BAMEN,
 * https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198
 * via https://github.com/cktang88/3d-fps (CC BY 4.0).
 * This is an armored tactical enemy, NOT Sketchfab M.A.N.U.L.
 */
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/loaders/GLTFLoader.js';
import {buildAdapter} from './rodeados-manul.js?v=16';

const PRIMARY=new URL('./assets/rodeados/tactical-android.glb',import.meta.url).href;
// Version-pinned mirror for redundancy if project hosting has not synchronized yet.
const BACKUP='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@130ac2a5c856401ec36e7d35afcfefe40c5801f4/public/assets/models/characters/soldier.glb';
const SECONDARY=new URL('./assets/rodeados/tactical-heavy.glb',import.meta.url).href;
const BACKUP_HEAVY='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@130ac2a5c856401ec36e7d35afcfefe40c5801f4/public/assets/models/characters/soldier_tac.glb';
// Exact Creep Creature, Minotaur Berserker and Sketchfab FPS hands cannot
// be redistributed without obtaining their authenticated downloads.
 // Legal CC0 stand-ins are vendor-bundled by CI and labelled accurately.
const CREATURES=[
 {type:'creep',label:'STALKER CC0',local:'creep-stalker.glb',url:'https://gobkit.com/freebies/minion/minion-d01.glb'},
 {type:'minotaur',label:'ORC CHAMPION CC0',local:'brute-champion.glb',url:'https://gobkit.com/freebies/human006/OrcWarbandChampion.glb'}
];
const ARMS_LOCAL=new URL('./assets/rodeados/arms-cc0.glb',import.meta.url).href;
const ARMS_SOURCE='https://cdn.jsdelivr.net/gh/wwwriks/wrad-arms@f3987244176c33d2c20d4f9e139980af12684d87/arms.glb';
const TIMEOUT_MS=11500;
const failAfter=(promise,timeout)=>Promise.race([promise,new Promise((_,reject)=>{
 const id=setTimeout(()=>reject(Error('timeout')),timeout);
 promise.finally(()=>clearTimeout(id)).catch(()=>{});
})]);

async function fetchValidatedGLB(url){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const response=await fetch(url,{signal:controller.signal,mode:'cors'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const length=Number(response.headers.get('content-length')||0);
  if(length>8000000)throw Error('Modelo demasiado grande');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength<10000||buffer.byteLength>8000000)throw Error('Archivo incompleto/pesado');
  const header=new DataView(buffer);
  if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||
     header.getUint32(8,true)!==buffer.byteLength)throw Error('GLB inválido');
  return buffer;
 }finally{clearTimeout(timer)}
}

function upgradeAndroidMaterials(THREE,scene,label){
 let meshes=0,materials=0;
 const seen=new Set();
 scene.traverse(node=>{
  if(!node.isMesh)return;
  meshes++;node.castShadow=false;node.receiveShadow=false;
  const items=Array.isArray(node.material)?node.material:[node.material];
  node.material=items.map(m=>{
   if(!m)return m;
   const replacement=m.clone();
   if(!seen.has(replacement)){
    materials++;seen.add(replacement);
    // Dark tactical plating, not garish toy colors. Preserve original
    // realistic PBR texture maps and normal microdetail.
    if(!/STALKER|CHAMPION/.test(label)){
      replacement.roughness=.63;replacement.metalness=.28;
      replacement.color.multiply(new THREE.Color(0xa1bdc8));
    }
    replacement.needsUpdate=true;
   }
   return replacement;
  });
  if(!Array.isArray(node.userData?.originalMaterial))node.userData.originalMaterial=items;
  if(!Array.isArray(node.material)||node.material.length===1)node.material=node.material[0];
 });
 return {meshes,materials};
}

async function prepareOne({THREE,art,primary,backup,label,facing=0}){
 let buffer=null,source='';
 for(const url of [primary,backup]){
  try{buffer=await fetchValidatedGLB(url);source=url===primary?'bundled':'pinned-cdn';break}
  catch(e){console.warn('RODEADOS asset fallback',label,url,e)}
 }
 if(!buffer)throw Error('No se pudo cargar '+label);
 const gltf=await failAfter(new Promise((res,rej)=>new GLTFLoader().parse(buffer,'',res,rej)),8500);
 const render=upgradeAndroidMaterials(THREE,gltf.scene,label);
 const adapter=buildAdapter(THREE,gltf,{label,source});
 adapter.setFacing(facing);
 return {adapter,render,source,gltf};
}
export async function installAutoRobots({THREE,art,signal,debug}){
 const stats={phase:'loading',source:'',meshes:0,clips:0,triangles:0,models:[],external:0,reason:''};
 if(debug)Object.defineProperty(globalThis,'__RodeadosAutoRobots',{
  configurable:true,value:{get status(){return {...stats,...art.getRobotAdapterStatus()}}}
 });
 let standard=null,heavy=null;
 try{
  standard=await prepareOne({THREE,art,primary:PRIMARY,backup:BACKUP,label:'ANDROID TACTICAL'});
  if(signal?.aborted)return stats;
 }catch(e){stats.phase='fallback';stats.reason=e.message;return stats}
 // The two actual humanoid GLBs are separate, independently licensed
 // downloaded models. Heavy is optional if its URL is unavailable.
 try{
  heavy=await prepareOne({THREE,art,primary:SECONDARY,backup:BACKUP_HEAVY,label:'ARMORED GUARD'});
 }catch(e){console.warn('Second humanoid unavailable, using standard armored material fallback',e)}
 if(signal?.aborted)return stats;
 const creatures=Object.create(null);
 await Promise.all(CREATURES.map(async spec=>{
   try{
     const model=await prepareOne({THREE,art,
       primary:new URL('./assets/rodeados/'+spec.local,import.meta.url).href,
       backup:spec.url,label:spec.label});
     creatures[spec.type]=model;
   }catch(e){console.warn('Creature visual fallback',spec.type,e.message)}
 }));
 if(signal?.aborted)return stats;
 try{
  const adapter={
   name:'ANDROIDES ARMADOS · MODELO ESTABLE',
   create({actor,enemy,THREE:engine}){
    // The heavy tactical GLB has a broken headset/accessory and passive pose on
    // Android. Retain the licensed file as a QA asset, never show the defect.
    const creature=!!creatures[enemy.type],variant=creatures[enemy.type]||standard;
    const anim=variant.adapter.create({actor,enemy,THREE:engine});
    anim.variant=creature?enemy.type:'standard';
    if(creature)return anim;
    // World-anchored lightweight, visibly aimed rifle; no floating headset.
    const weapon=new engine.Group();weapon.name='enemy-visible-assault-rifle';
    const steel=new engine.MeshStandardMaterial({color:0x242c35,metalness:.73,roughness:.34});
    const band=new engine.MeshStandardMaterial({color:0x5e8491,metalness:.7,roughness:.3});
    const muzzle=new engine.MeshBasicMaterial({color:0xffb06d,transparent:true,opacity:0,depthWrite:false});
    const box=(w,h,d,mat,x,y,z)=>{
      const obj=new engine.Mesh(new engine.BoxGeometry(w,h,d),mat);
      obj.position.set(x,y,z);weapon.add(obj);return obj
    };
    box(.15,.16,.49,steel,0,0,.16);box(.24,.18,.27,steel,0,-.06,-.20);
    box(.065,.08,.24,band,0,.15,.20);box(.09,.10,.42,steel,0,-.09,.46);
    box(.17,.23,.10,steel,0,-.22,-.01);
    box(.23,.04,.06,band,0,-.06,.65);
    const flash=new engine.Mesh(new engine.OctahedronGeometry(.095),muzzle);
    flash.position.set(0,-.05,.75);weapon.add(flash);
    weapon.position.set(.19,1.22,.40);weapon.rotation.x=-.16;
    actor.group.add(weapon);
    const originalUpdate=anim.update.bind(anim),originalDispose=anim.dispose.bind(anim);
    anim.update=e=>{
      originalUpdate(e);
      weapon.visible=e.portal<.62;
      const attacking=e.state==='attack'&&e.stun<=0;
      weapon.position.z=.40+(attacking?Math.sin(e.age*34)*.025:0);
      muzzle.opacity=attacking&&Math.sin(e.age*22)>0.45?.85:0;
    };
    anim.dispose=()=>{
      originalDispose();actor.group.remove(weapon);
      weapon.traverse(o=>{if(o.isMesh)o.geometry.dispose()});
      steel.dispose();band.dispose();muzzle.dispose();
    };
    return anim;
   },
   setFacing(deg){standard.adapter.setFacing(deg);heavy?.adapter.setFacing(deg);
     for(const m of Object.values(creatures))m.adapter.setFacing(deg)}
  };
  art.setRobotAdapter(adapter);
  // Independent optional CC0 rigged FPS arms. Procedural gloves remain
  // if this model or its WebXR bounding-box calibration fails.
  void (async()=>{
    for(const url of [ARMS_LOCAL,ARMS_SOURCE]){
      try{
        const bytes=await fetchValidatedGLB(url);
        const gltf=await failAfter(new Promise((res,rej)=>
          new GLTFLoader().parse(bytes,'',res,rej)),8500);
        if(!signal?.aborted&&art.setFPSArms)art.setFPSArms(gltf.scene);
        break;
      }catch(e){console.warn('FPS arm source fallback',e.message)}
    }
  })();
  stats.phase='active';
  stats.source=standard.source;
  stats.models=[{name:'TACTICAL',source:standard.source,triangles:standard.adapter.summary.tris},
   {name:'HEAVY',source:heavy?.source||'fallback',triangles:heavy?.adapter.summary.tris||0},
   ...CREATURES.map(spec=>({name:spec.label,source:creatures[spec.type]?.source||'procedural-fallback',
      triangles:creatures[spec.type]?.adapter.summary.tris||0}))];
  stats.meshes=standard.render.meshes+(heavy?.render.meshes||0);
  stats.clips=standard.gltf.animations.length+(heavy?.gltf.animations.length||0)+Object.values(creatures).reduce((n,m)=>n+(m.gltf.animations?.length||0),0);
  stats.triangles=standard.adapter.summary.tris;
  stats.facingDegrees=standard.adapter.summary.facingDegrees;
  stats.selectedClips=standard.adapter.summary.selectedClips;
  stats.reason='Defective heavy model quarantined: stable tactical actor with visible procedural rifle; stored second GLB remains for future repair';
  return stats;
 }catch(e){
  stats.phase='fallback';stats.reason=e.message;
  console.warn('RODEADOS old enemy models kept',e);
  return stats;
 }
}
