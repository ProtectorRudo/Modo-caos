/*
 CIVIDOM / Quaternius Humanoid Wardrobe v1.
 Base rig is genuine Quaternius Universal Base Characters, CC0.
 Original CIVIDOM wearable attachments are bone-local, non-destructive and
 safe to remove without changing source meshes or character physics.
 The Quaternius Modular Outfits Fantasy ZIP is NOT embedded in this file.
*/
export const HUMAN_HEROES=[
 {name:'VEX',skin:'#c4a58c',main:'#22ced3',secondary:'#102b60',accent:'#fff1a5',theme:'pilot'},
 {name:'LUX',skin:'#b48a71',main:'#8554db',secondary:'#26144f',accent:'#ffc85a',theme:'royal'},
 {name:'BYTE',skin:'#af977c',main:'#34f0c3',secondary:'#102344',accent:'#e0fff1',theme:'cyber'},
 {name:'REX',skin:'#b88972',main:'#fb6673',secondary:'#3b163b',accent:'#f9d45c',theme:'rebel'}
];
const palettes={
 outfit_street:['#6e38de','#21154d','#bcacff'],outfit_racer:['#fb4163','#162444','#f5d247'],
 outfit_neon:['#0d2742','#0af0e7','#b5fe46'],outfit_royal:['#efb842','#40215c','#fff4bf'],
 outfit_scarf:['#e65479','#4e285f','#ffebd3'],outfit_armor:['#ecbf61','#174f9a','#f9eabd']
};
function findBones(base){
 const map={};
 base.traverse(n=>{if(n.isBone)map[n.name.toLowerCase()]=n;});
 return map;
}
function mat(T,color,metal=.1,rough=.4){
 return new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,side:T.DoubleSide});
}
function makeTools(T,actor){
 const nodes=actor.quaterniusWear||[];
 for(const node of nodes){
  node.parent?.remove(node);
  node.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose();}});
 }
 actor.quaterniusWear=[];
 const bones=actor.humanBones;
 const attachment=(name)=>{
  const bone=bones[name.toLowerCase()];
  if(!bone)return null;
  const group=new T.Group();group.name='CVDOM_Custom_Wearable_'+name;
  bone.add(group);actor.quaterniusWear.push(group);return group;
 };
 const mesh=(group,geo,material,pos=[0,0,0],rot=null)=>{
  if(!group)return null;
  const o=new T.Mesh(geo,material);o.position.set(...pos);
  if(rot)o.rotation.set(...rot);
  group.add(o);return o;
 };
 const box=(group,c,w,h,d,pos,r=0)=>mesh(group,new T.BoxGeometry(w,h,d),c,pos,[0,0,r]);
 const sph=(group,c,x,y,z,w,h,d)=>{const o=mesh(group,new T.SphereGeometry(1,14,10),c,[x,y,z]);if(o)o.scale.set(w,h,d);return o;};
 const cyl=(group,c,r1,r2,h,pos)=>mesh(group,new T.CylinderGeometry(r1,r2,h,12),c,pos);
 const torus=(group,c,r,t,pos,rx=0)=>mesh(group,new T.TorusGeometry(r,t,7,22),c,pos,[rx,0,0]);
 return{attachment,box,sph,cyl,torus,mesh};
}
// Authentic Quaternius skinned garment meshes: no geometry boxes for clothing.
// The original Peasant outfit has independently skinned Arms, Body, Feet, Legs.
// Clothing colour varies through a cloned, textured standard material.
export function initializeNativeFashion(THREE,actor,config={}){
 if(!actor?.nativeOutfit)return false;
 const hero=HUMAN_HEROES[Math.max(0,Math.min(3,actor.hero|0))];
 const id=config.outfit||'outfit_base';
 const pal=palettes[id]||[hero.main,hero.secondary,hero.accent];
 const key=[actor.hero,id,config.headwear||'head_none',config.eyewear||'eyes_none',config.shoes||'shoes_base'].join(':');
 if(actor.fashionKey===key)return true;
 const old=actor.nativeMaterialCopies||[];
 for(const item of old)item.dispose?.();
 actor.nativeMaterialCopies=[];
 if(!actor.nativeOriginals){
  actor.nativeOriginals=[];
  actor.base.traverse(o=>{
   if(o.isSkinnedMesh&&!o.userData?.cvdomHeadMesh)
    actor.nativeOriginals.push({mesh:o,materials:Array.isArray(o.material)?o.material:[o.material]});
  });
 }
 const originals=actor.nativeOriginals;
 for(const {mesh:body,materials} of originals){
  const isArms=/Arms/i.test(body.name),isFeet=/Feet/i.test(body.name),isLegs=/Legs/i.test(body.name);
  const cols=isArms?pal[0]:isFeet?pal[1]:isLegs?pal[1]:pal[0];
  const color=new THREE.Color(cols);
  const copies=materials.map(m=>{
   const n=m.clone();
   n.color.copy(color);
   n.roughness=.5;
   n.metalness=Math.min(.14,n.metalness||0);
   actor.nativeMaterialCopies.push(n);
   return n;
  });
  body.material=Array.isArray(body.material)?copies:copies[0];
 }
 // A few tasteful hard accessories, firmly attached to real animated bones.
 for(const node of actor.nativeWear||[]){
  node.parent?.remove(node);
  node.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose();}});
 }
 actor.nativeWear=[];
 const mesh=(boneName,geo,color,x=0,y=0,z=0)=>{
  const bone=actor.humanBones?.[boneName];
  if(!bone){geo.dispose();return null;}
  const mat=new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.24});
  const node=new THREE.Mesh(geo,mat);node.position.set(x,y,z);
  const root=new THREE.Group();root.name='CVIDOM_Native_Accessory';
  root.add(node);bone.add(root);actor.nativeWear.push(root);return node;
 };
 // Each champion has a signature silhouette by default; player-bought hats override it.
 const requestedHat=config.headwear||'head_none';
 const hat=requestedHat==='head_none'?
  (actor.hero===0?'head_cap':actor.hero===1?'head_crown':actor.hero===2?'head_headphones':'head_beanie'):
  requestedHat;
 if(hat==='head_cap'){
  mesh('head',new THREE.SphereGeometry(.187,22,14,0,Math.PI*2,0,Math.PI*.45),pal[1],0,.17,0);
  mesh('head',new THREE.BoxGeometry(.35,.026,.11),pal[2],0,.155,.16);
 }else if(hat==='head_crown'){
  const ring=mesh('head',new THREE.CylinderGeometry(.18,.18,.058,10,1,true),pal[2],0,.25,0);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;mesh('head',new THREE.ConeGeometry(.046,.112,6),pal[2],Math.cos(a)*.16,.32,Math.sin(a)*.16);}
 }else if(hat==='head_beanie'){
  mesh('head',new THREE.SphereGeometry(.194,20,12,0,Math.PI*2,0,Math.PI*.47),pal[0],0,.17,0);
  mesh('head',new THREE.SphereGeometry(.058,12,8),pal[2],0,.32,0);
 }else if(hat==='head_headphones'){
  const band=mesh('head',new THREE.TorusGeometry(.225,.023,8,26,Math.PI),pal[1],0,.045,0);
  if(band)band.rotation.z=Math.PI/2;
  for(const side of [-1,1])mesh('head',new THREE.BoxGeometry(.07,.15,.12),pal[2],side*.2,0,0);
 }
 // BYTE's signature visor and REX's playful horns are part of their identities.
 if(actor.hero===2&&config.eyewear!=='eyes_shades'&&config.eyewear!=='eyes_star')
  mesh('head',new THREE.BoxGeometry(.32,.055,.033),'#57ffdd',0,.042,.182);
 if(actor.hero===3){
  for(const side of [-1,1]){
   const horn=mesh('head',new THREE.ConeGeometry(.052,.15,9),'#f3c890',side*.13,.278,0);
   if(horn)horn.rotation.z=-side*.3;
  }
 }
 if((config.eyewear||'')==='eyes_shades'||config.eyewear==='eyes_star'){
  const m=config.eyewear==='eyes_star'?pal[2]:'#182e40';
  for(const side of [-1,1])mesh('head',new THREE.BoxGeometry(.12,.065,.018),m,side*.075,.03,.173);
  mesh('head',new THREE.BoxGeometry(.035,.015,.016),pal[2],0,.033,.18);
 }
 if(config.shoes==='shoes_gold'||config.shoes==='shoes_rollers'||config.shoes==='shoes_sneakers'){
  const c=config.shoes==='shoes_gold'?'#ffd878':pal[2];
  for(const side of ['l','r']){
   mesh('foot_'+side,new THREE.BoxGeometry(.15,.035,.21),c,0,.01,.08);
  }
 }
 actor.fashionKey=key;
 return true;
}

// Clip the authentic UBC head/neck out of its full-body mesh.
// We keep the original skinned head, eyes and brows, discard nude torso/limbs.
export function transplantQuaterniusHead(THREE,fromBaseScene,outfitScene,cloneFn){
 if(!fromBaseScene||!outfitScene)return null;
 const overlay=cloneFn(fromBaseScene);
 let count=0;
 overlay.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const full=/SuperHero|Retopology|Sphere/i.test(mesh.name)||(mesh.geometry?.attributes?.position?.count||0)>2200;
  if(!full){mesh.userData.cvdomHeadMesh=true;return;}
  const geometry=mesh.geometry,idx=geometry.index,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
  const headIds=new Set(mesh.skeleton.bones.map((b,i)=>['head','neck_01'].includes(b.name.toLowerCase())?i:-1).filter(v=>v>=0));
  if(!si||!sw||!headIds.size){mesh.visible=false;return;}
  const mask=new Uint8Array(si.count);
  for(let v=0;v<si.count;v++){
   let w=0;
   for(let k=0;k<4;k++)if(headIds.has(si.getComponent(v,k)))w+=sw.getComponent(v,k);
   mask[v]=w>.45?1:0;
  }
  const indices=idx?idx.array:null,kept=[];
  if(indices)for(let i=0;i<indices.length;i+=3){
   const a=indices[i],b=indices[i+1],c=indices[i+2];
   if(mask[a]+mask[b]+mask[c]>=2)kept.push(a,b,c);
  }
  if(!kept.length){mesh.visible=false;return;}
  const g=geometry.clone();g.setIndex(kept);g.clearGroups();
  mesh.geometry=g;mesh.userData.cvdomHeadMesh=true;mesh.userData.cvdomOwnGeometry=true;
  count+=kept.length/3;
 });
 if(count<50)return null;
 outfitScene.add(overlay);
 return overlay;
}
export function syncQuaterniusHead(THREE,actor){
 if(!actor?.headOverlay||!actor.headBones||!actor.humanBones)return;
 for(const [name,dest] of Object.entries(actor.headBones)){
  const source=actor.humanBones[name],sourceRest=actor.humanRest?.[name],headRest=actor.headRest?.[name];
  if(!source||!sourceRest||!headRest)continue;
  const delta=sourceRest.clone().invert().multiply(source.quaternion);
  dest.quaternion.copy(headRest).multiply(delta);
 }
}

export function setHumanFashion(T,actor,config={}){
 if(!actor?.humanBones)return;
 if(actor.nativeOutfit){initializeNativeFashion(THREE,actor,config);return;}
 const index=Math.max(0,Math.min(HUMAN_HEROES.length-1,actor.hero|0));
 const preset=HUMAN_HEROES[index];
 const ids={outfit:config.outfit||'outfit_base',headwear:config.headwear||'head_none',
  eyewear:config.eyewear||'eyes_none',shoes:config.shoes||'shoes_base'};
 const fingerprint=[actor.hero,...Object.values(ids)].join('/');
 if(actor.fashionKey===fingerprint)return;
 actor.fashionKey=fingerprint;
 const {attachment,box,sph,cyl,torus,mesh}=makeTools(T,actor);
 const colors=palettes[ids.outfit]||[preset.main,preset.secondary,preset.accent];
 const C0=mat(T,colors[0],.32,.36),C1=mat(T,colors[1],.2,.33),C2=mat(T,colors[2],.6,.23);
 const black=mat(T,'#111b34',.27,.25),glass=mat(T,'#74f3ff',.42,.17);
 const chest=attachment('spine_03');
 // Anatomical armor panels rather than capsule / inflated toy bodies.
 box(chest,C0,.46,.34,.29,[0,-.15,.005]);
 box(chest,C1,.38,.22,.012,[0,-.15,.156]);
 box(chest,C2,.05,.25,.02,[0,-.14,.168]);
 for(const side of [-1,1]){
  const shoulder=attachment(side===-1?'upperarm_l':'upperarm_r');
  sph(shoulder,C0,0,.105,0,.115,.17,.125);
  torus(shoulder,C2,.112,.021,[0,.17,0],Math.PI/2);
  const cuff=attachment(side===-1?'lowerarm_l':'lowerarm_r');
  cyl(cuff,C1,.094,.084,.12,[0,.1,0]);
  const boots=attachment(side===-1?'foot_l':'foot_r');
  box(boots,C1,.15,.13,.27,[0,.07,.03]);
  box(boots,C2,.145,.027,.29,[0,.005,.035]);
  const belt=attachment('pelvis');
  box(belt,C1,.12,.14,.07,[side*.15,-.14,.15]);
 }
 const waist=attachment('pelvis');
 box(waist,C1,.46,.075,.30,[0,-.13,.04]);
 sph(waist,C2,0,-.13,.20,.07,.052,.04);
 if(preset.theme==='pilot'){
  const neck=attachment('neck_01');
  sph(neck,C2,0,.07,-.11,.21,.04,.23);
  const c=attachment('spine_03');
  box(c,glass,.14,.12,.028,[.115,-.09,.175]);
 }
 if(preset.theme==='royal'){
  const c=attachment('spine_03');sph(c,C2,0,-.12,.174,.115,.11,.04);
  const cape=attachment('spine_02');box(cape,C1,.63,.65,.065,[0,-.23,-.19]);
 }
 if(preset.theme==='cyber'){
  const c=attachment('spine_03');
  for(const y of [-.03,-.12,-.21])box(c,glass,.20,.023,.03,[0,y,.18]);
 }
 if(preset.theme==='rebel'){
  for(const side of [-1,1]){
   const arm=attachment(side===-1?'upperarm_l':'upperarm_r');
   const spike=mesh(arm,new T.ConeGeometry(.09,.19,7),C2,[0,.19,0]);if(spike)spike.rotation.z=side*.5;
  }
 }
 // Each character has a distinct face silhouette even with the same shared rig.
 const h=attachment('Head');
 const hair=mat(T,preset.theme==='royal'?'#24152d':preset.theme==='cyber'?'#1c3949':'#322234',.08,.92);
 if(preset.theme==='pilot'){
  sph(h,hair,0,.19,-.04,.20,.095,.21);
  box(h,C0,.39,.055,.18,[0,.185,.15]);
 }
 if(preset.theme==='royal'){
  cyl(h,C2,.16,.17,.10,[0,.22,0]);
  for(let j=0;j<5;j++){
   const ang=j*Math.PI*2/5;
   const p=mesh(h,new T.ConeGeometry(.05,.12,6),C2,[Math.sin(ang)*.14,.31,Math.cos(ang)*.14]);
  }
 }
 if(preset.theme==='cyber'){
  box(h,C1,.41,.27,.34,[0,.045,0]);
  box(h,glass,.35,.11,.032,[0,.06,.187]);
  box(h,C2,.13,.038,.02,[0,-.015,.195]);
 }
 if(preset.theme==='rebel'){
  sph(h,hair,0,.185,-.04,.20,.07,.22);
  for(const side of [-1,1]){
   const horn=mesh(h,new T.ConeGeometry(.058,.20,8),C0,[side*.15,.27,-.03]);
   if(horn)horn.rotation.z=-side*.35;
  }
 }
 if(ids.headwear==='head_cap'){
  box(h,C0,.40,.09,.32,[0,.245,0]);
  box(h,C2,.38,.024,.18,[0,.23,.22]);
 }else if(ids.headwear==='head_crown'){
  cyl(h,C2,.205,.205,.11,[0,.31,0]);
  for(let j=0;j<6;j++){const a=j*Math.PI/3;mesh(h,new T.ConeGeometry(.055,.15,6),C2,[.17*Math.sin(a),.4,.17*Math.cos(a)]);}
 }else if(ids.headwear==='head_beanie'){
  sph(h,C0,0,.23,0,.22,.13,.22);sph(h,C2,0,.365,0,.065,.06,.065);
 }else if(ids.headwear==='head_headphones'){
  torus(h,black,.21,.038,[0,.11,0]);for(const z of [-1,1])box(h,glass,.07,.14,.11,[z*.21,.08,0]);
 }
 if(ids.eyewear==='eyes_shades'||ids.eyewear==='eyes_star'){
  const glassColor=ids.eyewear==='eyes_star'?C2:black;
  for(const side of [-1,1])box(h,glassColor,.155,.09,.035,[side*.085,.04,.188]);
  box(h,C2,.035,.026,.03,[0,.04,.195]);
 }
 if(ids.shoes!=='shoes_base')for(const side of [-1,1]){
  const foot=attachment(side===-1?'foot_l':'foot_r');
  const material=ids.shoes==='shoes_gold'?C2:ids.shoes==='shoes_rollers'?C0:glass;
  sph(foot,material,0,.033,.10,.08,.042,.145);
  if(ids.shoes==='shoes_rollers')for(const z of [-.07,.14])cyl(foot,C2,.038,.038,.035,[0,-.045,z]);
 }
}
export function animateHuman(T,actor,t,mode='idle',mirror=false){
 if(!actor?.humanBones)return;
 const bones=actor.humanBones,pose=actor.humanRest;
 const k=mode==='emote_sixseven'||mode==='sixseven'?'sixseven':String(mode).startsWith('emote_')?'celebrate':mode==='run'?'run':'idle';
 const phase=t*(k==='run'?10.4:k==='sixseven'?4.3:3.5)+(mirror?Math.PI:.0);
 function turn(name,x=0,y=0,z=0){
  const bone=bones[name];if(!bone||!pose[name])return;
  bone.quaternion.copy(pose[name]).multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z,'XYZ')));
 }
 const stride=k==='run'?Math.sin(phase)*.26:Math.sin(phase)*.025;
 const bounce=k==='idle'?Math.sin(phase)*.018:0;
 turn('thigh_l',stride,0,.02);turn('thigh_r',-stride,0,-.02);
 turn('calf_l',Math.max(0,-stride)*.5);turn('calf_r',Math.max(0,stride)*.5);
 // The original Quaternius rest pose is T-shaped. Reconstruct a NATURAL arm
 // direction each frame using the real parent-space bone orientation. This
 // avoids both the T-pose and the accumulated-rotation Six Seven bug.
 if(actor.nativeOutfit){
  for(const side of ['l','r']){
   const bone=bones['upperarm_'+side],bind=pose['upperarm_'+side];
   if(!bone||!bind)continue;
   const sign=side==='l'?-1:1,beat=Math.sin(phase+(side==='r'?Math.PI:0));
   const desired=k==='sixseven'?
    new T.Vector3(sign*(.78+.11*beat),-.44+.19*beat,.13):
    k==='celebrate'?
    new T.Vector3(sign*.72,.24+.18*Math.sin(phase),.12):
    k==='run'?
    new T.Vector3(sign*.24,-.95,.12+sign*stride*.9):
    new T.Vector3(sign*.22,-1,.10);
   const parentWorld=bone.parent.getWorldQuaternion(new T.Quaternion());
   desired.applyQuaternion(parentWorld.invert()).normalize();
   const bindVector=new T.Vector3(0,1,0).applyQuaternion(bind).normalize();
   const correction=new T.Quaternion().setFromUnitVectors(bindVector,desired);
   bone.quaternion.copy(correction.multiply(bind));
  }
 }
 if(k==='sixseven'){
  const beat=Math.sin(phase);
  if(!actor.nativeOutfit)turn('upperarm_l',-.12,0,-.36-.18*beat);
  if(!actor.nativeOutfit)turn('upperarm_r',-.12,0,.36-.18*beat);
  turn('lowerarm_l',0,0,-.16-.13*beat);
  turn('lowerarm_r',0,0,.16-.13*beat);
  turn('spine_03',0,Math.sin(phase*.5)*.07,Math.sin(phase)*.036);
  turn('head',0,0,Math.sin(phase*.5)*.052);
 }else if(k==='celebrate'){
  if(!actor.nativeOutfit)turn('upperarm_l',.12,0,-.36-.14*Math.sin(phase));
  if(!actor.nativeOutfit)turn('upperarm_r',.12,0,.36+.14*Math.sin(phase));
  turn('lowerarm_l',0,0,-.15);turn('lowerarm_r',0,0,.15);
  turn('spine_03',0,Math.sin(phase)*.06,Math.sin(phase)*.025);
 }else{
  if(!actor.nativeOutfit)turn('upperarm_l',-stride*.55,0,-.06);
  if(!actor.nativeOutfit)turn('upperarm_r',stride*.55,0,.06);
  turn('lowerarm_l',0,0,-.12);turn('lowerarm_r',0,0,.12);
  turn('spine_03',bounce,0,Math.sin(phase*.5)*.012);
  turn('head',0,Math.sin(phase*.27)*.03,0);
 }
}
export function initializeHumanRig(base,heroIndex=0,nativeOutfit=false){
 const bones=findBones(base),rest={};
 for(const [name,bone] of Object.entries(bones))rest[name]=bone.quaternion.clone();
 // Each clone owns its material; a recolour never affects another player's rig.
 const palette=HUMAN_HEROES[Math.max(0,Math.min(HUMAN_HEROES.length-1,heroIndex|0))];
 base.traverse(n=>{
  if(!n.isSkinnedMesh)return;
  const original=n.material;
  const tint=(m)=>{
   const c=m.clone();if(!nativeOutfit&&c.color)c.color.set(palette.skin);
   c.userData={...(c.userData||{}),cvdomRigInstance:true};return c;
  };
  n.material=Array.isArray(original)?original.map(tint):tint(original);
  // Retain Three.js frustum culling on mobile: offscreen bots are not rendered.
 });
 return{humanBones:bones,humanRest:rest};
}

export function disposeHumanActor(actor){
 if(!actor?.humanBones)return;
 for(const node of actor.nativeWear||[]){
  node.parent?.remove(node);
  node.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose();}});
 }
 for(const material of actor.nativeMaterialCopies||[])material.dispose?.();
 actor.headOverlay?.traverse(o=>{
  if(o.isMesh&&o.userData.cvdomOwnGeometry)o.geometry?.dispose();
  if(o.isSkinnedMesh&&o.userData.cvdomOwnMaterial){
   for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();
  }
 });
 for(const node of actor.quaterniusWear||[]){
  node.parent?.remove(node);
  node.traverse(n=>{if(n.isMesh){n.geometry?.dispose();n.material?.dispose();}});
 }
 actor.quaterniusWear=[];
 actor.base?.traverse(n=>{
  if(!n.isSkinnedMesh)return;
  for(const m of Array.isArray(n.material)?n.material:[n.material]){
   if(m?.userData?.cvdomRigInstance)m.dispose();
  }
 });
}
