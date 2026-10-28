/*
 * CIVIDOM ORIGINALS · modular 3D wardrobe
 * Original procedural geometry. Every garment is parented to its anatomical
 * pivot (head, body, shoulder, foot), never to a fixed world-space position.
 * No remote assets, runtime fetch or player download.
 */
const COLORWAYS={
 outfit_street:['#6839df','#d8c7ff','#29eecb'],
 outfit_racer:['#f5476c','#171e4d','#ffd44e'],
 outfit_neon:['#123f65','#43f2ed','#b1ff45'],
 outfit_royal:['#e8b948','#fff0a5','#6935bb'],
 outfit_scarf:['#ec597a','#ffd1dc','#fff5f7'],
 outfit_armor:['#e9b944','#224ba4','#fff1af']
};
const dressIds=new Set(['outfit_street','outfit_racer','outfit_neon','outfit_royal','outfit_scarf','outfit_armor']);
const palettes={
 head_cap:['#f65a6f','#153667','#ffe481'],
 head_crown:['#ffcf4d','#f7f0b6','#e284ff'],
 head_beanie:['#9a77f9','#faacd9','#fff'],
 head_headphones:['#192542','#47edfa','#e2faff'],
 eyes_shades:['#151e39','#76faff','#fff9ce'],
 eyes_star:['#ffe165','#e9adff','#ffffff'],
 shoes_sneakers:['#fcfaff','#52dbea','#ff6687'],
 shoes_gold:['#ffca53','#fff4b3','#6b58bc'],
 shoes_rollers:['#3d2d8d','#fa5ad2','#83ffe9']
};
function valid(id){return typeof id==='string'&&/^[a-z_]{3,36}$/.test(id);}
export function setFashion(THREE,actor,config){
 const rig=actor.mascotRig;
 if(!rig)return;
 const ids={outfit:config?.outfit||'outfit_base',headwear:config?.headwear||'head_none',eyewear:config?.eyewear||'eyes_none',shoes:config?.shoes||'shoes_base'};
 if(!Object.values(ids).every(valid))return;
 const fingerprint=Object.values(ids).join('|');
 if(actor.fashionKey===fingerprint)return;
 // Discard only the previous fashion modules, never character anatomy.
 if(actor.fashionNodes)for(const g of actor.fashionNodes){
  g.parent?.remove(g);
  g.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
 }
 actor.fashionNodes=[];actor.fashionKey=fingerprint;
 const mat=(hex,metal=0,rough=.38,emissive=null)=>new THREE.MeshStandardMaterial({color:hex,metalness:metal,roughness:rough,emissive:emissive||'#000000',emissiveIntensity:emissive?.3:0});
 const mesh=(p,geometry,material,x,y,z,scale)=>{
  const item=new THREE.Mesh(geometry,material);
  item.position.set(x,y,z);
  if(scale)item.scale.set(scale[0],scale[1],scale[2]);
  item.castShadow=false;item.receiveShadow=false;p.add(item);return item;
 };
 const ell=(p,m,x,y,z,a,b,c)=>mesh(p,new THREE.SphereGeometry(1,22,16),m,x,y,z,[a,b,c]);
 const cyl=(p,m,x,y,z,rTop,rBottom,h)=>mesh(p,new THREE.CylinderGeometry(rTop,rBottom,h,24),m,x,y,z);
 const box=(p,m,x,y,z,w,h,d)=>mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const tor=(p,m,x,y,z,r,t,axis='x')=>{const o=mesh(p,new THREE.TorusGeometry(r,t,8,28),m,x,y,z);o.rotation[axis]=Math.PI/2;return o;};
 const attach=(node)=>{const g=new THREE.Group();g.name='CVDOM_Fashion';node.add(g);actor.fashionNodes.push(g);return g;};
 const cream=mat('#fff7db'),ink=mat('#182744',.16,.27),gold=mat('#ffcf56',.64,.22),glass=mat('#85eaff',.35,.12);
 const outfit=ids.outfit;
 if(dressIds.has(outfit)){
  const tone=COLORWAYS[outfit],base=mat(tone[0],outfit==='outfit_armor'?.48:.09,.37);
  const accent=mat(tone[1],outfit==='outfit_royal'?.55:.08,.32);
  const trim=mat(tone[2],.3,.25);
  const body=attach(rig.body);
  ell(body,base,0,0,.055,1.063,1.33,.827);
  // Collar and belly panel built as real 3D layers, not screen-space icons.
  tor(body,accent,0,1.04,.02,.72,.15);
  ell(body,accent,0,-.35,.792,.68,.24,.083);
  if(outfit==='outfit_street'){
   box(body,trim,0,.16,.839,.16,.91,.03);
   ell(body,accent,-.26,-.39,.828,.30,.20,.056);
   ell(body,accent,.26,-.39,.828,.30,.20,.056);
  }else if(outfit==='outfit_racer'){
   box(body,trim,0,.19,.846,.17,.98,.035);
   for(const x of [-.69,.69])box(body,accent,x,.26,.49,.14,1.10,.09);
   ell(body,gold,.47,.66,.759,.23,.18,.08);
  }else if(outfit==='outfit_neon'){
   box(body,trim,0,.02,.843,.08,1.1,.04);
   tor(body,trim,0,-.1,.823,.37,.055,'z');
   ell(body,trim,0,-.1,.91,.15,.17,.06);
  }else if(outfit==='outfit_royal'){
   ell(body,gold,0,.22,.845,.48,.43,.10);
   tor(body,trim,0,.22,.94,.28,.065,'z');
   for(const side of [-1,1]){
    ell(body,accent,side*.84,.72,.26,.24,.26,.45);
   }
  }else if(outfit==='outfit_scarf'){
   tor(body,accent,0,1.03,.19,.80,.16);
   box(body,base,.76,.25,.73,.26,1.12,.17);
  }else if(outfit==='outfit_armor'){
   box(body,accent,0,.28,.79,.85,.72,.08);
   ell(body,gold,0,.28,.90,.23,.23,.12);
   for(const x of [-.73,.73])ell(body,trim,x,.79,.16,.27,.23,.37);
  }
  // Sleeves are children of the SHOULDER pivots, so they bend with celebrations.
  for(const side of [-1,1]){
   const arm=attach(side===-1?rig.left:rig.right);
   ell(arm,base,side*.28,-.43,0,.37,.72,.39);
   tor(arm,trim,side*.35,-.89,.03,.28,.075);
  }
 }
 const headwear=ids.headwear;
 if(headwear!=='head_none'){
  const h=attach(rig.head);
  if(headwear==='head_cap'){
   const [a,b,c]=palettes.head_cap;
   ell(h,mat(a,.08,.3),0,1.25,-.05,1.25,.37,1.0);
   ell(h,mat(b),0,1.14,.87,1.12,.09,.42);
   ell(h,mat(c,.5),0,1.58,.7,.23,.12,.07);
  }else if(headwear==='head_crown'){
   const crown=mat('#ffd25c',.72,.16);
   cyl(h,crown,0,1.47,-.05,.99,.88,.36);
   for(let j=0;j<7;j++){
    const q=j*Math.PI*2/7;
    const p=ell(h,crown,Math.cos(q)*.83,1.84,Math.sin(q)*.83,.18,.3,.19);
    p.rotation.z=-Math.cos(q)*.30;
    ell(h,mat(j%2?'#72ebf5':'#ff8cb6',.5,.18),Math.cos(q)*.88,1.65,Math.sin(q)*.88,.12,.12,.07);
   }
  }else if(headwear==='head_beanie'){
   ell(h,mat('#9879ee'),0,1.30,-.09,1.34,.51,1.05);
   tor(h,mat('#f5a6e0'),0,1.09,-.04,1.12,.15);
   ell(h,cream,0,1.81,-.13,.24,.24,.24);
  }else if(headwear==='head_headphones'){
   const band=mat('#223455',.24,.27),neon=mat('#56eff4',.26,.22,'#16565a');
   const arc=tor(h,band,0,.65,-.1,1.55,.12,'z');arc.scale.set(1.0,1.0,.55);
   for(const s of [-1,1]){
    ell(h,band,s*1.41,.26,.15,.26,.55,.47);
    ell(h,neon,s*1.62,.26,.2,.11,.37,.29);
   }
  }
 }
 const eyes=ids.eyewear;
 if(eyes!=='eyes_none'){
  const h=attach(rig.head);
  if(eyes==='eyes_shades'){
   for(const s of [-1,1]){
    const lens=mat('#101a35',.25,.1);
    ell(h,lens,s*.64,.17,1.48,.47,.30,.08);
    ell(h,glass,s*.64,.22,1.535,.31,.16,.028);
   }
   box(h,gold,0,.19,1.45,.36,.10,.12);
  }else if(eyes==='eyes_star'){
   const star=mat('#ffd94c',.6,.16);
   for(const s of [-1,1]){
    const shape=new THREE.ExtrudeGeometry(new THREE.Shape([
      new THREE.Vector2(0,.37),new THREE.Vector2(.16,.13),new THREE.Vector2(.42,.12),
      new THREE.Vector2(.22,-.06),new THREE.Vector2(.30,-.34),new THREE.Vector2(0,-.17),
      new THREE.Vector2(-.30,-.34),new THREE.Vector2(-.22,-.06),new THREE.Vector2(-.42,.12),
      new THREE.Vector2(-.16,.13)
    ]),{depth:.09,bevelEnabled:true,bevelSize:.03,bevelThickness:.02,bevelSegments:1});
    mesh(h,shape,star,s*.65,.15,1.45);
   }
   box(h,cream,0,.22,1.47,.39,.09,.10);
  }
 }
 const shoe=ids.shoes;
 if(shoe!=='shoes_base'){
  const colors=palettes[shoe]||palettes.shoes_sneakers;
  rig.feet.forEach(({node})=>{
   const g=attach(node),primary=mat(colors[0],shoe==='shoes_gold'?.55:.06,.27),accent=mat(colors[1]),detail=mat(colors[2],.18,.32);
   ell(g,primary,0,-.90,.27,.44,.29,.62);
   ell(g,cream,0,-1.06,.34,.45,.09,.65);
   ell(g,accent,0,-.78,.55,.29,.07,.12);
   for(let i=0;i<3;i++)box(g,detail,0,-.77+i*.09,.57,.30,.028,.04);
   if(shoe==='shoes_rollers'){
    for(const z of [0,.5])cyl(g,accent,0,-1.22,z,.13,.13,.11);
   }
  });
 }
}
