/*
 CIVIDOM / Styl0o Chibi Fashion & Expression Engine
 Original 3D costumes, masks and animated meshes are preserved from the CC0
 Styloo Chibi Characters pack. CIVIDOM wardrobe is non-destructive and
 attaches simple custom accessories to the animated skeleton.
*/
export const CHIBI_ROSTER=[
 {id:'rayo',name:'RAYO',model:'ninja',palette:'#fb637b',personality:'hyper',signature:'¡No me alcanzás!'},
 {id:'nova',name:'NOVA',model:'archer',palette:'#b2ec6f',personality:'bold',signature:'¡Vamos a hacer historia!'},
 {id:'glitch',name:'GLITCH',model:'student',palette:'#62dff4',personality:'cyber',signature:'ERROR: perdiste.'},
 {id:'luna',name:'LUNA',model:'merchant',palette:'#b18dff',personality:'elegant',signature:'Siempre un paso adelante.'},
 {id:'kiro',name:'KIRO',model:'knight',palette:'#ffb75b',personality:'taunt',signature:'¿Eso era todo?'},
 {id:'mimo',name:'MIMO',model:'student',palette:'#ffaad9',personality:'cute',signature:'¡Sorpresa!'},
 {id:'volt',name:'VOLT',model:'ninja',palette:'#ffe36c',personality:'athlete',signature:'¡Una más!'},
 {id:'nix',name:'NIX',model:'archer',palette:'#fa69d4',personality:'rebel',signature:'¡Atrapame!'}
];
const outfitTints={outfit_base:null,outfit_street:'#8157e6',outfit_racer:'#f15a65',outfit_neon:'#42f3e6',outfit_royal:'#f4c44f',outfit_scarf:'#fe7194',outfit_armor:'#efba5c'};
const hmix=['#ffc85a','#d4b7ff','#57e6e0','#acddff','#f7b755','#f2a3d6','#fce167','#f778d5'];
function normalized(n){return (n||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
export function findChibiBones(base){
 const indexed={};base.traverse(n=>{if(n.isBone)indexed[normalized(n.name)]=n;});
 function find(...patterns){for(const pattern of patterns){const hit=Object.entries(indexed).find(([k])=>pattern.test(k));if(hit)return hit[1];}return null;}
 return{
  head:find(/^head$/, /head(?!end)/,/mixamorighead/),
  leftArm:find(/(left|l)upperarm/,/upperarm(left|l)/,/^armleft$/, /leftarm$/, /^upperarml$/),
  rightArm:find(/(right|r)upperarm/,/upperarm(right|r)/,/^armright$/, /rightarm$/, /^upperarmr$/),
  leftForearm:find(/(left|l)(lowerarm|forearm)/,/(forearm|lowerarm)(left|l)/),
  rightForearm:find(/(right|r)(lowerarm|forearm)/,/(forearm|lowerarm)(right|r)/),
  leftFoot:find(/leftfoot$/, /footleft$/, /^footl$/),
  rightFoot:find(/rightfoot$/, /footright$/, /^footr$/),
  hips:find(/hips$/, /pelvis$/),chest:find(/chest$/, /upperchest$/, /spine2$/)
 };
}
function mat(THREE,color,metal=.18){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:.4});}
export function applyChibiFashion(THREE,actor,equipment={}){
 if(!actor?.base||!actor.chibi)return;
 const hero=CHIBI_ROSTER[actor.hero]||CHIBI_ROSTER[0];
 const fields=['outfit','headwear','eyewear','shoes'];
 const ids={outfit:equipment.outfit||'outfit_base',headwear:equipment.headwear||'head_none',eyewear:equipment.eyewear||'eyes_none',shoes:equipment.shoes||'shoes_base'};
 const key=actor.hero+'|'+fields.map(k=>ids[k]).join('|');
 if(actor.chibiFashionKey===key)return;
 if(!actor.chibiMaterials){
  actor.chibiMaterials=[];
  actor.base.traverse(n=>{
   if(!n.isMesh)return;
   const materials=Array.isArray(n.material)?n.material:[n.material];
   const originals=materials.map(m=>m?.color?.clone?.()||new THREE.Color('#fff'));
   const copies=materials.map(m=>m?.clone?.()||m);
   n.material=Array.isArray(n.material)?copies:copies[0];
   actor.chibiMaterials.push({mesh:n,colors:originals,materials:copies});
  });
 }
 const variant=actor.hero>=5;
 const tint=outfitTints[ids.outfit]||(variant?hero.palette:null);
 for(const entry of actor.chibiMaterials){
  entry.materials.forEach((m,i)=>{
   if(!m?.color) return;
   m.color.copy(entry.colors[i]);
   if(tint){
    const target=new THREE.Color(tint);
    // Keep Styloo's painted face, iris, hair and genuine clothing texture.
    // Dyes are restrained to avoid muddying original stylized materials.
    const n=normalized(entry.mesh.name),part=normalized(m.name);
    const isFace=/head|face|eye|iris|hair|skin|mouth/.test(n+' '+part);
    if(!isFace)m.color.lerp(target,variant?.31:.20);
   }
  });
 }
 for(const node of actor.chibiWear||[]){
  node.parent?.remove(node);
  node.traverse(n=>{if(n.isMesh){n.geometry?.dispose();n.material?.dispose();}});
 }
 actor.chibiWear=[];
 const bones=actor.chibiBones||findChibiBones(actor.base);
 actor.chibiBones=bones;
 const radius=Math.max(.045,(actor.chibiSourceHeight||1.6)*.094);
 function attach(bone,geo,color,pos,rotation){
  if(!bone){geo.dispose();return null;}
  const root=new THREE.Group();root.name='CVDOM_Styloo_Accessory';
  const mesh=new THREE.Mesh(geo,mat(THREE,color));
  mesh.position.set(...pos);if(rotation)mesh.rotation.set(...rotation);
  root.add(mesh);bone.add(root);actor.chibiWear.push(root);return mesh;
 }
 const head=bones.head,accent=hmix[actor.hero]||'#ffc85a';
 if(ids.headwear==='head_crown'){
  attach(head,new THREE.CylinderGeometry(radius*.93,radius*.94,radius*.30,9,1,true),'#f7ca61',[0,radius*1.38,0]);
  for(let i=0;i<7;i++){const a=Math.PI*2*i/7;
   attach(head,new THREE.ConeGeometry(radius*.19,radius*.58,6),'#ffe48d',[radius*.81*Math.cos(a),radius*1.69,radius*.81*Math.sin(a)]);}
 }else if(ids.headwear==='head_cap'){
  attach(head,new THREE.SphereGeometry(radius*1.06,18,12,0,Math.PI*2,0,Math.PI*.48),accent,[0,radius*.88,0]);
  attach(head,new THREE.BoxGeometry(radius*1.55,radius*.12,radius*.76),'#1b305c',[0,radius*.77,radius*.75]);
 }else if(ids.headwear==='head_beanie'){
  attach(head,new THREE.SphereGeometry(radius*1.13,18,12,0,Math.PI*2,0,Math.PI*.50),'#a87de9',[0,radius*.83,0]);
  attach(head,new THREE.SphereGeometry(radius*.3,12,8),'#ffe1f0',[0,radius*1.86,0]);
 }else if(ids.headwear==='head_headphones'){
  attach(head,new THREE.TorusGeometry(radius*1.15,radius*.12,7,24,Math.PI),'#182e54',[0,radius*.3,0],[0,0,0]);
  for(const sign of [-1,1])attach(head,new THREE.BoxGeometry(radius*.34,radius*.65,radius*.58),'#4aebf2',[sign*radius*1.13,radius*.18,0]);
 }
 if(ids.eyewear==='eyes_shades'||ids.eyewear==='eyes_star'){
  const color=ids.eyewear==='eyes_star'?'#f9ca65':'#14294d';
  for(const sign of [-1,1])attach(head,new THREE.BoxGeometry(radius*.83,radius*.46,radius*.12),color,[sign*radius*.45,radius*.02,radius*.95]);
 }
 if(ids.shoes!=='shoes_base'){
  const color=ids.shoes==='shoes_gold'?'#ffe078':ids.shoes==='shoes_rollers'?'#f45cc5':'#f1ffff';
  for(const foot of [bones.leftFoot,bones.rightFoot]){
   attach(foot,new THREE.BoxGeometry(radius*.63,radius*.18,radius*.92),color,[0,-radius*.13,radius*.20]);
  }
 }
 // For named looks, a badge on the back stays visible in-game and in VS.
 if(ids.outfit==='outfit_neon'||ids.outfit==='outfit_royal'||ids.outfit==='outfit_racer'){
  attach(bones.chest||bones.hips,new THREE.TorusGeometry(radius*.48,radius*.09,7,16),ids.outfit==='outfit_royal'?'#ffe584':ids.outfit==='outfit_neon'?'#50eeed':'#ff6d75',[0,0,-radius*.77]);
 }
 actor.chibiFashionKey=key;
}
export function chibiEmote(THREE,actor,t,id='emote_hello',mirror=false){
 if(!actor?.chibi)return;
 const bones=actor.chibiBones||findChibiBones(actor.base);actor.chibiBones=bones;
 // Every gesture modifies the pose delivered by the licensed original clip.
 // The AnimationMixer restores bones each frame: angles do not accumulate.
 const phase=t*(id==='emote_sixseven'?5.2:3.7)+(mirror?Math.PI:0);
 const wave=Math.sin(phase),other=Math.sin(phase+Math.PI);
 const gestures={
  emote_sixseven:[.24+.14*wave,-.24-.14*other],
  emote_laugh:[.13+.08*wave,-.13-.08*other],
  emote_flex:[-.23+.06*wave,.23-.06*other],
  emote_heart:[.19,.19],
  emote_dance:[.25*wave,-.25*other],
  emote_hello:[.12+.08*wave,0]
 };
 const poses=gestures[id]||gestures.emote_hello;
 const overlays=[
  [bones.leftArm,poses[0]], [bones.rightArm,poses[1]],
  [bones.leftForearm,.06*wave],[bones.rightForearm,-.06*wave]
 ];
 if(!actor.chibiRestQuaternions)actor.chibiRestQuaternions=new Map();
 for(const [bone,turn] of overlays){
  if(!bone)continue;
  // For a model without built-in animation clips, restore a stable rest
  // quaternion before applying the celebration, preventing cumulative spins.
  if(!actor.chibiRestQuaternions.has(bone))actor.chibiRestQuaternions.set(bone,bone.quaternion.clone());
  if(!actor.mixer)bone.quaternion.copy(actor.chibiRestQuaternions.get(bone));
  const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(.05*Math.sin(phase),0,turn,'XYZ'));
  bone.quaternion.multiply(delta);
 }
}
export function disposeChibi(actor){
 for(const node of actor.chibiWear||[]){
  node.parent?.remove(node);
  node.traverse(n=>{if(n.isMesh){n.geometry?.dispose();n.material?.dispose();}});
 }
 for(const entry of actor.chibiMaterials||[])for(const m of entry.materials)m?.dispose?.();
 actor.chibiWear=[];actor.chibiMaterials=[];
 actor.chibiRestQuaternions?.clear();
}
