/* MINI WORLDS — original procedural 3D art, no third-party models or protected assets. */
(function(root){root.MiniWorldsArt=function(T){
'use strict';
const P=Math.PI,mat=(c,metal=0,rough=.76)=>new T.MeshStandardMaterial({color:c,metalness:metal,roughness:rough});
const M={sand:mat('#bbad8d'),edge:mat('#786c58'),soil:mat('#504d44'),grass:mat('#738a69'),grass2:mat('#456a58'),leaf:mat('#345a4d'),leaf2:mat('#578274'),dark:mat('#263841'),wood:mat('#746652'),woodDark:mat('#403b38'),gold:mat('#d6ac70',.72,.29),steel:mat('#72858c',.68,.36),coral:mat('#a8594d'),sky:mat('#7dccca'),white:mat('#e4e4d7'),ink:mat('#18252c'),red:mat('#c95c54'),stone:mat('#79848a'),purple:mat('#765f93'),water:new T.MeshStandardMaterial({color:0x155b67,transparent:true,opacity:.76,roughness:.28,metalness:.04,side:T.DoubleSide})};
// Small reusable tile textures give the terrain tactile grain instead of
// flat plastic. Every material references ONE low-cost texture, shared across
// the stage. The same colors remain deliberately playful, not photorealistic.
const groundTextures=[];
function groundTexture(kind,seed){
 const c=document.createElement('canvas');c.width=512;c.height=512;
 const g=c.getContext('2d');let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
 g.fillStyle='#f1eee7';g.fillRect(0,0,512,512);
 for(let i=0;i<5200;i++){
  const x=random()*512,y=random()*512,size=1.5+random()*5.3;
  if(kind==='sand')g.fillStyle=i%3===0?'#c8c2b3':'#ffffff';
  else if(kind==='grass')g.fillStyle=i%3===0?'#bcc9bc':'#f6fff1';
  else g.fillStyle=i%3===0?'#c2c0bc':'#ffffff';
  g.globalAlpha=.055+random()*.22;
  g.beginPath();g.ellipse(x,y,size*(kind==='grass'?.55:1.35),size,random()*Math.PI,0,Math.PI*2);g.fill();
 }
 g.globalAlpha=.15;
 if(kind==='grass')for(let i=0;i<760;i++){
  const x=random()*512,y=random()*512;
  g.strokeStyle=i%2?'#718e79':'#fefff4';g.lineWidth=1.25;
  g.beginPath();g.moveTo(x,y);g.lineTo(x+(random()-.5)*9,y-4-random()*12);g.stroke();
 }
 g.globalAlpha=1;
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
 t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2.3,2.3);
 t.anisotropy=4;groundTextures.push(t);return t;
}
M.sand.map=groundTexture('sand',382);M.sand.roughness=.96;M.sand.needsUpdate=true;
M.grass.map=groundTexture('grass',572);M.grass.roughness=.94;M.grass.needsUpdate=true;
M.grass2.map=M.grass.map;M.grass2.needsUpdate=true;
M.stone.map=groundTexture('stone',942);M.stone.roughness=.91;M.stone.needsUpdate=true;

const sphere=(r=1,w=12,h=9)=>new T.SphereGeometry(r,w,h);
const cube=(x=1,y=1,z=1)=>new T.BoxGeometry(x,y,z);
const geoCone=(r=.4,h=1,n=9)=>new T.ConeGeometry(r,h,n);
const cyl=(a,b,h,n=10)=>new T.CylinderGeometry(a,b,h,n);
const mesh=(g,m,x=0,y=0,z=0,parent)=>{let o=new T.Mesh(g,m);o.position.set(x,y,z);if(parent)parent.add(o);o.castShadow=true;o.receiveShadow=true;return o};
const group=(p,x=0,y=0,z=0)=>{const o=new T.Group();o.position.set(x,y,z);p.add(o);return o};
// Animated shader ocean with a moving surface, soft caustics, readable depth,
// broken foam bands and mobile-friendly one-pass highlights. The water stays
// physically BELOW the walkable collision plane (never a fake land surface).
function makeOcean(parent,map){
 const material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,side:T.DoubleSide,
  uniforms:{uTime:{value:0},uDeep:{value:new T.Color(map.n?0x173e72:0x0e6290)},
   uShallow:{value:new T.Color(map.n?0x359cba:0x29bebc)},
   uFoam:{value:new T.Color(map.n?0xc1e9ef:0xddfff2)}},
  vertexShader:`
   uniform float uTime;
   varying vec2 vWaterUV;
   varying float vWave;
   void main(){
    vec3 pos=position;
    float wave=sin(pos.x*1.53+pos.y*.57+uTime*1.37)*.044;
    wave+=cos(pos.y*1.83-pos.x*.69-uTime*1.16)*.036;
    wave+=sin(pos.x*3.2+pos.y*2.75+uTime*2.2)*.011;
    pos.z+=wave;
    vWaterUV=pos.xy;
    vWave=wave;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
   }`,
  fragmentShader:`
   precision mediump float;
   uniform float uTime;
   uniform vec3 uDeep,uShallow,uFoam;
   varying vec2 vWaterUV;
   varying float vWave;
   void main(){
    vec2 p=vWaterUV;
    float swells=sin(p.x*1.85+p.y*.74+uTime*1.32);
    swells+=.48*cos(p.y*2.34-p.x*.39-uTime*.94);
    float ribbons=abs(sin((p.x+p.y*.34)*3.9-uTime*1.47));
    float softness=smoothstep(.87,1.,ribbons);
    float caustic=pow(max(0.,sin(p.x*4.7+uTime*1.17)*cos(p.y*3.8-uTime*.92)),3.);
    float shoreline=.5+.5*sin(p.y*2.85+p.x*.9+uTime*.53);
    float tint=clamp(.50+.22*swells+.10*vWave,0.,1.);
    vec3 color=mix(uDeep,uShallow,tint);
    color+=vec3(caustic*.18);
    color=mix(color,uFoam,softness*.19+shoreline*.025);
    float glint=pow(max(0.,sin(p.x*8.1+p.y*4.5+uTime*2.4)),14.);
    color=mix(color,uFoam,glint*.27);
    gl_FragColor=vec4(color,.87);
   }`
 });
 const o=mesh(new T.PlaneGeometry(18.5,33,32,48),material,0,-.69,-11.35,parent);
 o.rotation.x=-P/2;o.receiveShadow=false;o.castShadow=false;o.renderOrder=-4;
 return {o,material};
}
// All visible playable land gets a faint tide line, batched into one draw
// call. No impassable "fake islands" are left in the playable field.
function makeShoreFoam(parent,map){
 const verts=[];
 for(const f of map.platforms){
  const x=f.x,z=f.z,a=f.w*.5+.12,b=f.d*.5+.12,y=-.635;
  const pts=[[x-a,z-b],[x+a,z-b],[x+a,z+b],[x-a,z+b]];
  for(let i=0;i<4;i++){
   const p=pts[i],q=pts[(i+1)%4];
   verts.push(p[0],y,p[1],q[0],y,q[1]);
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
 const mat=new T.LineBasicMaterial({color:0xc6fff2,transparent:true,opacity:.32,depthWrite:false});
 const line=new T.LineSegments(geo,mat);line.frustumCulled=false;parent.add(line);
 return line;
}
const rng=s=>()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
function addPalm(p,x,z,size=1,groundY=.05){
 const g=group(p,x,groundY,z),trunk=mesh(cyl(.105,.17,1.36,9),M.wood,.04,.63,0,g);trunk.rotation.z=-.11;
 for(let i=0;i<6;i++){const a=i*P/3;let stem=group(g,.16,1.3,0);stem.rotation.y=a;stem.rotation.z=-.16;let leaf=mesh(geoCone(.20,1.35,5),i%2?M.leaf:M.leaf2,0,.10,.57,stem);leaf.rotation.x=P/2+.23;leaf.scale.set(1.25,.85,.7)}
 for(let i=0;i<3;i++)mesh(sphere(.12),M.woodDark,.14+Math.cos(i*2)*.12,1.22,.04+Math.sin(i*2)*.12,g);
 g.scale.setScalar(size);return g;
}
function addFlower(p,x,z,seed){
 const g=group(p,x,.03,z);mesh(cyl(.027,.033,.32,5),M.grass2,0,.13,0,g);
 for(let i=0;i<5;i++){let a=i*P*2/5;mesh(sphere(.078,7,6),seed%2?M.coral:M.purple,Math.cos(a)*.085,.34,Math.sin(a)*.085,g)}
 mesh(sphere(.06,7,6),M.gold,0,.35,0,g);
}
function addRock(p,x,y,z,r=.3){const o=mesh(new T.DodecahedronGeometry(r,0),M.stone,x,y,z,p);o.rotation.set(.1,.4,.2);o.scale.y=.65;return o}
function addRuins(p,x,y,z){const g=group(p,x,y,z);
 for(let q of [-.42,.42]){mesh(cyl(.17,.20,1.35,9),M.stone,q,.68,0,g);mesh(cube(.45,.15,.45),M.sand,q,1.4,0,g)}
 mesh(cube(1.23,.22,.45),M.stone,0,1.52,0,g);let disk=mesh(new T.TorusGeometry(.24,.04,7,20),M.gold,0,1.53,.23,g);disk.rotation.x=.3;
return g;
}
function platform(root,p,rand){
 const g=group(root,p.x,p.y,p.z);
 const isBridge=p.kind==='bridge';let top=p.kind==='beach'?M.sand:p.kind==='arena'?M.stone:p.kind==='ruins'?M.sand:M.grass;
 // Inset structural rock allows the sculpted exterior to appear instead of
 // hiding it behind an opaque cardboard-like vertical wall.
 const crust=mesh(cube(p.w*.80,.31,p.d*.80),p.kind==='beach'?M.edge:M.soil,0,-.26,0,g);crust.receiveShadow=true;
 const upper=mesh(cube(p.w,.14,p.d),top,0,-.045,0,g);upper.receiveShadow=true;
 // Color-varied soft ground patch, perfectly coplanar with the REAL physics
 // platform surface: decorative only and never increases standable space.
 if(!isBridge){const capMat=p.kind==='beach'?M.sand:p.kind==='arena'?M.stone:M.grass;
  const cap=mesh(new T.CircleGeometry(.48,16),capMat,0,.029,0,g);
  cap.rotation.x=-P/2;cap.scale.set(Math.max(.5,p.w*.77),Math.max(.5,p.d*.77),1);
  cap.castShadow=false;cap.receiveShadow=false;
 }
 // Jagged earth breaks the silhouette; narrow decorative stones never obstruct the play corridor.
 for(let i=0;i<Math.floor(p.w*2.4);i++){let x=(rand()-.5)*p.w*.94,z=(rand()>.5?1:-1)*(p.d*.47);
 let a=mesh(new T.DodecahedronGeometry(.12+rand()*.14,0),p.kind==='arena'?M.stone:M.edge,x,-.27,z,g);a.scale.y=.8}
 if(p.kind==='beach' || p.kind==='jungle'){
  for(let i=0;i<Math.floor(p.w*1.4);i++){let x=(rand()-.5)*p.w*.76,z=(rand()>.5?1:-1)*p.d*.43;
   if(rand()>.46)addFlower(g,x,z,i);else mesh(sphere(.16,7,6),M.grass2,x,.02,z,g)}
 }
 if(isBridge){for(let i=0;i<6;i++){let z=-p.d*.42+i*p.d/5;mesh(cube(p.w*.9,.065,.18),i%2?M.wood:M.woodDark,0,.02,z,g)}
  for(const x of [-p.w*.47,p.w*.47]){for(let j=0;j<3;j++){let z=-p.d*.44+j*p.d*.44;mesh(cyl(.043,.052,.8,7),M.woodDark,x,.31,z,g)}mesh(cube(.05,.055,p.d),M.wood,x,.66,0,g)}}
 if(p.kind==='ruins')g.userData.ruins=addRuins(g,p.w*.28,.02,-p.d*.20);
 if(p.kind==='waterfall'){
  mesh(cube(.26,1.12,.24),M.stone,p.w*.43,.54,-.55,g);
  let water=mesh(cube(.06,.9,.92),M.water,p.w*.40,.5,-.45,g);water.material=M.water;
 }
 if(p.kind==='arena'){let ring=mesh(new T.TorusGeometry(1.95,.07,8,64),M.gold,0,.04,0,g);ring.rotation.x=-P/2;
 for(let i=0;i<8;i++){const a=i*P/4;const ob=mesh(cyl(.08,.14,.45,7),M.stone,Math.cos(a)*2.28,.16,Math.sin(a)*2.05,g);ob.rotation.z=(rand()-.5)*.2}}
 return g;
}
// Graded visible terrain corridors mirror MiniWorldsCore's footprint.
function causeway(root,w,i){
 const dx=w.x2-w.x1,dz=w.z2-w.z1,len=Math.hypot(dx,dz);
 if(len<.10)return null;
 const grp=group(root,(w.x1+w.x2)/2,(w.y1+w.y2)/2,(w.z1+w.z2)/2);
 grp.rotation.order='YXZ';grp.rotation.y=Math.atan2(dx,dz);
 grp.rotation.x=-Math.atan2(w.y2-w.y1,len);
 const material=i<7?(i<3?M.sand:i<5?M.grass:M.stone):M.grass2;
 const top=mesh(cube(w.width,.22,len),material,0,-.11,0,grp);
 top.castShadow=false;top.receiveShadow=true;
 for(const side of [-1,1]){
  const lip=mesh(cube(.12,.14,len),i<7?M.edge:M.soil,side*(w.width/2-.075),-.16,0,grp);
  lip.castShadow=false;
 }
 return grp;
}
function makeCoin(parent,x,y,z){const g=group(parent,x,y,z);mesh(cyl(.18,.18,.052,16),M.gold,0,0,0,g).rotation.x=P/2;mesh(new T.TorusGeometry(.125,.023,6,16),M.white,0,0,.034,g);mesh(cube(.035,.16,.03),M.white,0,0,.036,g);return g}
function makeStar(parent,x,y,z){
 const g=group(parent,x,y,z);const shape=new T.Shape();for(let i=0;i<10;i++){let a=-P/2+i*P/5,rad=i%2?.15:.34;let px=Math.cos(a)*rad,py=Math.sin(a)*rad;i?shape.lineTo(px,py):shape.moveTo(px,py)}shape.closePath();
 const o=mesh(new T.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelSize:.025,bevelThickness:.022,bevelSegments:1,steps:1}),M.gold,0,0,0,g);o.position.z=-.04;return g;
}
function makeBox(parent,b,y){
 const g=group(parent,b.x,y+.29,b.z),steel=b.type==='reinforced',base=steel?M.steel:b.type==='mystery'?M.purple:b.type==='secret'?M.coral:M.wood;
 mesh(cube(.62,.58,.62),base,0,0,0,g);
 for(const yy of [-.21,.21])for(const side of [-.315,.315]){
 mesh(cube(.69,.065,.065),steel?M.ink:M.woodDark,0,yy,side,g);
 mesh(cube(.065,.065,.69),steel?M.ink:M.woodDark,side,yy,0,g)}
 if(b.type==='coins'||b.type==='mystery'||b.type==='secret'){
 let sign=mesh(sphere(.095,8,7),b.type==='coins'?M.gold:b.type==='secret'?M.white:M.coral,0,.05,.322,g);sign.scale.z=.36;
 }else{mesh(cube(.08,.36,.04),M.sand,0,0,.327,g).rotation.z=.58}
 g.userData.baseY=y+.29;return g;
}
function makeAvatar(parent){
 // Original high-detail stylized fox adventurer. It is NOT the third-party
 // Sketchfab KAI mesh; exact artist GLB needs an authenticated legal download.
 // World scale, rig groups and physics capsule remain unchanged.
 const fur=new T.MeshPhysicalMaterial({color:0xb65d2c,roughness:.84,metalness:0,clearcoat:.03});
 const highlight=new T.MeshStandardMaterial({color:0xe09250,roughness:.82});
 const cream=new T.MeshStandardMaterial({color:0xe9d5bb,roughness:.87});
 const innerEar=new T.MeshStandardMaterial({color:0x9f584f,roughness:.84});
 const dark=new T.MeshPhysicalMaterial({color:0x282941,roughness:.24,clearcoat:.50});
 const leather=new T.MeshStandardMaterial({color:0x35474a,roughness:.75,metalness:.20});
 const vest=new T.MeshPhysicalMaterial({color:0x345860,roughness:.66,metalness:.14,clearcoat:.10});
 const gold=new T.MeshPhysicalMaterial({color:0xb58b58,roughness:.33,metalness:.68,clearcoat:.23});
 const jade=new T.MeshStandardMaterial({color:0x6efce0,emissive:0x3fe4d3,emissiveIntensity:1.5,roughness:.22});
 const eyeWhite=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.1,clearcoat:1});
 const g=group(parent),body=group(g,0,.57,0),head=group(body,0,.48,.055);
 g.name='KAI / original fox stand-in + energy blaster';
 // Compact heroic figure: larger readable silhouette than realistic anatomy.
 mesh(sphere(.32,22,16),vest,0,-.02,0,body).scale.set(1,.98,.81);
 mesh(sphere(.225,20,12),cream,0,-.02,.246,body).scale.set(.84,1.09,.22);
 mesh(sphere(.325,24,17),fur,0,.085,0,head).scale.set(1.05,.93,.94);
 // Crescent muzzle and cheeks make the face unmistakably vulpine.
 mesh(sphere(.26,20,14),cream,0,-.07,.26,head).scale.set(1.24,.58,.80);
 mesh(sphere(.155,16,12),cream,-.175,-.085,.254,head);
 mesh(sphere(.155,16,12),cream,.175,-.085,.254,head);
 const snout=mesh(new T.ConeGeometry(.14,.32,6),cream,0,-.102,.39,head);
 snout.rotation.x=Math.PI/2;
 mesh(sphere(.089,12,9),dark,0,-.128,.57,head).scale.set(1.25,.75,.60);
 for(const side of [-1,1]){
  const ear=group(head,side*.245,.348,-.052);
  ear.rotation.z=-side*.18;
  mesh(new T.ConeGeometry(.17,.44,4),fur,0,.13,0,ear).rotation.y=Math.PI/4;
  mesh(new T.ConeGeometry(.108,.30,4),innerEar,0,.12,.047,ear).rotation.y=Math.PI/4;
  mesh(sphere(.12,14,10),cream,side*.27,-.09,.19,head);
  mesh(sphere(.109,18,12),eyeWhite,side*.145,.070,.275,head).scale.set(.8,1.13,.47);
  mesh(sphere(.074,16,12),dark,side*.148,.072,.337,head).scale.set(.78,1.12,.46);
  mesh(sphere(.018,10,7),eyeWhite,side*.172,.098,.374,head);
  mesh(sphere(.05,12,9),highlight,side*.29,-.15,.23,head);
 }
 mesh(new T.TorusGeometry(.099,.016,5,15,Math.PI),dark,0,-.205,.417,head).rotation.z=Math.PI;
 // Small tuft, shoulder armor, scarf and a single golden explorer insignia.
 for(let k=0;k<3;k++){
  const tuft=mesh(new T.ConeGeometry(.067,.19,6),highlight,(k-1)*.09,.398,-.015,head);
  tuft.rotation.z=(k-1)*-.32;
 }
 mesh(new T.TorusGeometry(.295,.058,8,22),leather,0,.295,.01,body).rotation.x=Math.PI/2;
 const crest=mesh(new T.OctahedronGeometry(.09,0),gold,0,.15,.27,body);
 crest.rotation.z=.28;
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=group(body,side*.325,.19,0);
  mesh(sphere(.155,16,12),gold,0,-.005,-.005,arm).scale.set(.95,.82,.95);
  mesh(new T.CylinderGeometry(.102,.091,.31,12),leather,0,-.20,0,arm);
  mesh(sphere(.123,16,12),fur,0,-.39,.035,arm);arms.push(arm);
  const leg=group(g,side*.16,.33,0);
  mesh(new T.CylinderGeometry(.135,.12,.35,12),leather,0,-.165,0,leg);
  mesh(sphere(.164,16,12),dark,0,-.344,.10,leg).scale.set(1,.69,1.30);legs.push(leg);
 }
 // Three soft tail sections; animate via the existing hero update loop.
 const tail=group(g,-.06,.48,-.28);tail.rotation.x=.37;
 const base=mesh(sphere(.23,17,12),fur,0,.03,-.21,tail);
 base.rotation.x=-.46;base.scale.set(.91,.82,1.67);
 const puff=mesh(sphere(.23,18,12),highlight,0,.11,-.53,tail);
 puff.rotation.x=-.40;puff.scale.set(1.1,.84,1.53);
 const tip=mesh(new T.ConeGeometry(.18,.41,10),cream,0,.18,-.87,tail);
 tip.rotation.x=-Math.PI/2-.28;
 // Keeps a visible and friendly accessory even if rendering is offline.
 const badge=mesh(new T.TorusGeometry(.105,.028,9,20),jade,0,.14,.31,body);
 badge.rotation.x=.13;
 const shadow=mesh(new T.CircleGeometry(.4,24),
  new T.MeshBasicMaterial({color:0x061d22,transparent:true,opacity:.22,depthWrite:false}),0,.014,0,g);
 shadow.rotation.x=-Math.PI/2;
 return {root:g,body,head,arms,legs,tail,shadow};
}
function makeEnemy(parent,e,y){
 const g=group(parent,e.x,y+.42,e.z);const flying=e.type==='flying',thrower=e.type==='thrower',guard=e.type==='defender';
 const main=flying?M.purple:thrower?M.coral:guard?M.steel:M.grass2;
 mesh(new T.DodecahedronGeometry(guard?.42:.33,1),main,0,0,0,g);
 if(guard){for(let s of [-1,1])mesh(cube(.16,.39,.46),M.gold,s*.43,0,0,g)}
 if(flying){for(let s of [-1,1]){let wing=mesh(sphere(.31,10,7),M.sky,s*.38,.05,-.08,g);wing.scale.set(1,.12,.45)}}
 if(thrower)mesh(cyl(.12,.12,.43,8),M.woodDark,0,.1,-.34,g).rotation.x=P/2;
 for(let s of [-1,1]){mesh(sphere(.086,9,7),M.white,s*.13,.08,.28,g);mesh(sphere(.042,8,7),M.ink,s*.13,.08,.35,g)}
 for(let s of [-1,1])mesh(sphere(.10),M.woodDark,s*.2,-.29,.0,g);
 return g;
}
function makeBoss(parent,b,variant=false){
 const g=group(parent,b.x,b.y,b.z),torso=group(g,0,.84,0),claws=[];
 // Distinct mechanized hermit crab with high-contrast weakness beacon.
 const shell=mesh(sphere(1,24,16),variant?M.purple:M.coral,0,.23,0,torso);shell.scale.set(1.03,.65,.78);
 mesh(sphere(.76,22,13),M.woodDark,0,.38,-.2,torso).scale.set(1.1,.66,.91);
 for(let i=0;i<5;i++){mesh(cube(.06,.13,.88),M.gold,-.6+i*.3,.62,-.22,torso).rotation.z=.14}
 for(let s of [-1,1]){
  for(let i=0;i<3;i++){let leg=group(torso,s*.73,-.18,-.34+i*.36);let limb=mesh(cyl(.075,.11,.80,7),M.steel,s*.34,-.24,0,leg);limb.rotation.z=s*.95}
  let arm=group(torso,s*.82,.05,.31);mesh(cyl(.16,.17,.77,9),M.steel,s*.32,0,0,arm).rotation.z=s*P/2.3;
  let claw=group(arm,s*.72,.04,.10);mesh(sphere(.33),variant?M.purple:M.coral,0,0,0,claw);
  for(let q of [-1,1]){let pin=mesh(geoCone(.135,.55,7),M.steel,s*.10,q*.22,.18,claw);pin.rotation.x=q*.65}
  claws.push(arm)}
 for(let s of [-1,1]){mesh(cyl(.08,.09,.47,8),M.steel,s*.33,.75,.46,torso);
 mesh(sphere(.18),M.sky,s*.33,1,.46,torso);
 mesh(sphere(.10),M.ink,s*.33,1.02,.61,torso)}
 const weak=mesh(new T.IcosahedronGeometry(.26,1),M.gold,0,.58,.84,torso);
 const aura=mesh(new T.TorusGeometry(.37,.055,8,24),M.sky,0,.58,.88,torso);
 return {root:g,torso,claws,weak,aura};
}
// The floor-sized world spans 18.5 × 33 game units. The physical AR track
// defaults to ~6.7m wide × 11.9m long, anchored to a real floor hit.
function sprawlingEnvironment(root,rand,cliff){
 const sea=makeOcean(root,{n:cliff?1:0});
 // These far-shore shapes used to be large sandy "islands" without hitboxes:
 // players jumped there and fell through. They are now unmistakably
 // submerged rock outcrops rather than false walkable platforms.
 for(const side of [-1,1]){
  for(let j=0;j<5;j++){
   const z=1.0-j*5.0,x=side*(7.2+rand()*.42);
   const stone=addRock(root,x,-.78,z,.34+rand()*.27);
   stone.scale.y=.37;
   if(cliff&&j%3===0){const spear=mesh(geoCone(.24,.62,6),M.stone,x,-.57,z,root);spear.rotation.z=side*.1}
  }
 }
 // Ancient landmarks at the far ends make the 3D level readable from a distance.
 const arch=group(root,0,0,-25.1);
 for(const x of [-2.45,2.45]){
  mesh(cyl(.19,.30,2.4,8),M.stone,x,1.3,0,arch);
  const cap=mesh(new T.DodecahedronGeometry(.35,0),M.gold,x,2.58,0,arch);cap.rotation.y=x;
 }
 const cross=mesh(cube(5.2,.30,.48),M.stone,0,2.44,0,arch);
 cross.rotation.z=.07;
 return sea;
}
function makeStage(map){
 const scene=new T.Scene();scene.background=new T.Color(map.n===0?0x93afaf:0x818c9c);scene.fog=new T.Fog(scene.background,13,48);
 const sun=new T.DirectionalLight(0xe3d6bb,2.05);sun.position.set(-3,9,5);sun.castShadow=false;scene.add(sun);
 scene.add(new T.HemisphereLight(0xb9d0ce,0x3c3938,2.0));
 // Two transforms: the XR anchor NEVER moves; the world content changes
 // only at explicit magic portals between small AR rooms.
 const anchorRoot=group(scene),root=group(anchorRoot);
 const rand=rng(7403+map.n*719),platforms=[],windTargets=[],nativeSolids=[];
 const ocean=sprawlingEnvironment(root,rand,Boolean(map.n));
 const shoreFoam=makeShoreFoam(root,map);
 for(const p of map.platforms)platforms.push(platform(root,p,rand));
 for(let i=0;i<(map.walkways||[]).length;i++)causeway(root,map.walkways[i],i);
 for(let i=0;i<map.platforms.length;i++){
  const p=map.platforms[i],prev=map.platforms[i-1];
  if(p.kind==='beach'||p.kind==='jungle'){
   const x=p.x+(rand()>.5?1:-1)*(p.w*.45+.22),z=p.z+(rand()-.5)*p.d*.8;
   const size=.72+rand()*.30,obj=addPalm(root,x,z,size,p.y+.05);
   windTargets.push(obj);
   nativeSolids.push({obj,x,z,y:p.y,height:1.42*size,radius:.15*size,kind:'tree'});
  }
  if(p.kind==='jungle'||p.kind==='ruins'){
   const x=p.x+p.w*.5,obj=addRock(root,x,p.y+.05,p.z,.22);
   nativeSolids.push({obj,x,z:p.z,y:p.y,height:.32,radius:.20,kind:'rock'});
  }
  if(p.kind==='ruins'){
   for(const side of [-1,1]){
    nativeSolids.push({obj:platforms[i].userData.ruins,x:p.x+p.w*.28+side*.42,z:p.z-p.d*.20,y:p.y,height:1.45,radius:.18,kind:'column'});
   }
  }
  if(prev&&i!==2&&p.z-prev.z> -4.1){ /* bridging gaps intentionally remain jumpable */ }
 }
 // World-sized sea and shore banks are already assembled above.
 // Former opaque lagoon disc has been removed: the animated ocean now
 // shows through every opening without covering the route.
 // Adventure 2 is a stormy cliff journey with glowing stones, high rock needles and relics.
 if(map.n===1){
  for(let i=0;i<22;i++){
   const z=-1-i*1.04,x=(i%2?1:-1)*(2.9+rand()*2.3);
   let cliff=addRock(root,x,-.2,z,.5+rand()*.45);cliff.scale.y=1.5+rand()*2.8;
   if(i%3===0){let crystal=mesh(geoCone(.14,.68,6),M.purple,x,.4,z,root);crystal.rotation.z=.26;}
  }
  addRuins(root,-2.3,1,-15.7);addRuins(root,2.15,.8,-19);
  for(let i=0;i<7;i++){
   let obj=mesh(new T.IcosahedronGeometry(.14+rand()*.08,0),M.gold,Math.sin(i*2.8)*3,2.1+rand()*1.3,-4-i*2.6,root);
   obj.userData.hover=true;
  }
 }
 const coins=map.coins.map(c=>makeCoin(root,c.x,c.y,c.z));
 const stars=map.stars.map(c=>makeStar(root,c.x,c.y,c.z));
 const boxes=map.boxes.map(b=>makeBox(root,b,Math.max(0,...map.platforms.filter(p=>Math.abs(b.x-p.x)<p.w/2&&Math.abs(b.z-p.z)<p.d/2).map(p=>p.y))));
 const enemies=map.enemies.map(e=>makeEnemy(root,e,e.type==='flying'?1.25:(Math.max(0,...map.platforms.filter(p=>Math.abs(e.x-p.x)<p.w/2&&Math.abs(e.z-p.z)<p.d/2).map(p=>p.y)))));
 const hero=makeAvatar(root),boss=makeBoss(root,map.boss,Boolean(map.n));boss.root.visible=false;
 // KAI's compact blaster is attached to the avatar WORLD rig, never
 // to the user's camera. The core still simulates projectile collisions.
 const wand=group(hero.root,.38,.77,.22);
 wand.name='KAI / energy blaster';
 const barrelMat=new T.MeshPhysicalMaterial({color:0x2c3c43,metalness:.82,roughness:.32,clearcoat:.24});
 const copperMat=new T.MeshPhysicalMaterial({color:0xb88a52,metalness:.79,roughness:.34,clearcoat:.18});
 const emitterMat=new T.MeshBasicMaterial({color:0x79fff4,transparent:true,opacity:.91,depthWrite:false});
 const barrel=mesh(cyl(.12,.145,.46,14),barrelMat,0,-.06,.18,wand);
 barrel.rotation.x=Math.PI/2;
 mesh(cube(.27,.18,.38),copperMat,0,-.035,.05,wand);
 const grip=mesh(cube(.115,.24,.115),barrelMat,0,-.21,.04,wand);grip.rotation.x=.18;
 for(const z of [.20,.33]){
  const coil=mesh(new T.TorusGeometry(.12,.025,8,24),copperMat,0,-.06,z,wand);
 }
 const wandTip=mesh(new T.IcosahedronGeometry(.093,2),
  new T.MeshStandardMaterial({color:0xaafff7,emissive:0x37fff2,emissiveIntensity:2.6,roughness:.15}),0,-.06,.46,wand);
 const flash=mesh(new T.RingGeometry(.07,.18,28),emitterMat,0,-.06,.56,wand);
 flash.visible=false;flash.renderOrder=1700;
 hero.wand=wand;hero.wandTip=wandTip;hero.blaster=wand;hero.muzzleFlash=flash;
 // Animated spell missiles use a constant-size visual pool on mobile.
 const magicMaterial=new T.MeshStandardMaterial({color:0xa1fff7,emissive:0x3cfff3,emissiveIntensity:3.4,roughness:.12,metalness:.15});
 const magicGeo=new T.IcosahedronGeometry(.135,2);
 const magicOrbs=Array.from({length:12},()=>{
  const obj=mesh(magicGeo,magicMaterial,0,0,0,root);
  obj.visible=false;obj.castShadow=false;return obj;
 });
 const runes=map.runes.map((r)=>{
  const g=group(root,r.x,r.y,r.z);
  const crystal=mesh(new T.OctahedronGeometry(.27,0),M.purple,0,0,0,g);
  const petals=Array.from({length:5},(_,i)=>{
   const a=i*Math.PI*2/5;
   const t=mesh(new T.OctahedronGeometry(.18,0),M.grass2,Math.sin(a)*.36,.18,Math.cos(a)*.36,g);
   t.visible=false;return t;
  });
  const ring=mesh(new T.TorusGeometry(.35,.04,5,22),M.gold,0,0,0,g);
  return {root:g,crystal,petals,ring};
 });
 // Cheap readable contact shadows: no expensive real-time shadow map in AR.
 const shadowMat=new T.MeshBasicMaterial({color:0x0d2634,transparent:true,opacity:.27,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:T.DoubleSide});
 const shadow=(x,z,size=1)=>{const o=mesh(new T.CircleGeometry(.35,24),shadowMat.clone(),x,.046,z,root);o.rotation.x=-P/2;o.scale.set(size,1,.67);o.castShadow=false;return o};
 const heroShadow=shadow(0,0,1.1);
 const enemyShadows=map.enemies.map(e=>shadow(e.x,e.z,.75));
 // Cheap, camera-visible fury indicator and orbiting sparks on existing
 // geometry: just one ring + eight low-poly spark meshes.
 const furyMat=new T.MeshBasicMaterial({color:0xffdb66,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide});
 const furyRing=mesh(new T.TorusGeometry(.48,.055,6,34),furyMat,0,.10,0,root);
 furyRing.rotation.x=-P/2;furyRing.visible=false;furyRing.renderOrder=850;
 const furySparkMat=new T.MeshBasicMaterial({color:0xffe6a4,transparent:true,opacity:.8,depthWrite:false});
 const furySparkGeo=new T.TetrahedronGeometry(.075,0);
 const furySparks=Array.from({length:8},()=>{
  const o=mesh(furySparkGeo,furySparkMat,0,0,0,root);
  o.visible=false;o.castShadow=false;return o;
 });
 // A bright, depth-independent locator guarantees that a correctly rendered
 // WebXR scene always has a recognizable object at the detected floor point.
 const previewBeacon=group(root,0,.105,.10);
 const beaconM=new T.MeshBasicMaterial({color:0x79ffdb,transparent:true,opacity:.85,depthWrite:false,depthTest:false,side:T.DoubleSide});
 const glowRing=mesh(new T.RingGeometry(.48,.56,44),beaconM,0,.02,0,previewBeacon);
 glowRing.rotation.x=-P/2;glowRing.renderOrder=1999;glowRing.castShadow=false;
 const footprint=mesh(new T.CircleGeometry(.12,24),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,depthTest:false,side:T.DoubleSide}),0,.027,0,previewBeacon);
 footprint.rotation.x=-P/2;footprint.renderOrder=2000;footprint.castShadow=false;
 const column=mesh(new T.CylinderGeometry(.015,.045,.8,8),beaconM,0,.4,0,previewBeacon);
 column.renderOrder=2000;column.castShadow=false;previewBeacon.visible=false;
 const flags=map.checkpoints.map(c=>{let g=group(root,c.x,c.y,c.z);mesh(cyl(.038,.04,.95,8),M.steel,0,.46,0,g);mesh(geoCone(.19,.4,3),M.gold,.19,.78,0,g).rotation.z=P/2;return g});
 let portal=group(root,0,1.45,-25.35);let ring=mesh(new T.TorusGeometry(.56,.12,11,35),M.purple,0,.60,0,portal);ring.rotation.y=.2;let center=mesh(sphere(.45,18,13),new T.MeshBasicMaterial({color:0x92ffe2,transparent:true,opacity:.25}),0,.59,0,portal);center.scale.z=.18;portal.visible=false;
 const warning=mesh(new T.RingGeometry(.84,1.3,40),new T.MeshBasicMaterial({color:0xff513e,transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false}),0,1.20,-23.2,root);warning.rotation.x=-P/2;warning.visible=false;
 const projectilePool=Array.from({length:14},()=>{let o=mesh(sphere(.12,9,7),M.red,0,0,0,root);o.visible=false;return o});
 const hazardPool=Array.from({length:8},()=>{let o=mesh(new T.RingGeometry(.40,.77,24),new T.MeshBasicMaterial({color:0xff583c,transparent:true,opacity:.57,side:T.DoubleSide,depthWrite:false}),0,0,0,root);o.rotation.x=-P/2;o.visible=false;return o});
 const effects=[],combatBursts=[],koTimers=new Map(),rewardTextures=new Map();
 const particleGeo=new T.TetrahedronGeometry(.052,0),particleMaterials=new Map();
 function particleMaterial(color){
  if(!particleMaterials.has(color))particleMaterials.set(color,new T.MeshBasicMaterial({color,transparent:true,opacity:.92,depthWrite:false}));
  return particleMaterials.get(color);
 }
 const shardGeo=cube(.13,.13,.13);
 function rewardTexture(text){
  if(rewardTextures.has(text))return rewardTextures.get(text);
  const c=document.createElement('canvas');c.width=256;c.height=104;
  const g=c.getContext('2d');
  g.clearRect(0,0,256,104);
  g.font='900 51px system-ui,Arial';g.textAlign='center';g.textBaseline='middle';
  g.lineWidth=10;g.strokeStyle='#173243';g.shadowColor='#10334c';g.shadowBlur=14;
  g.strokeText(text,128,52);
  g.fillStyle=text.includes('KO')?'#b4ffe2':text.includes('CRACK')?'#fff0c6':'#ffe18b';
  g.fillText(text,128,52);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  rewardTextures.set(text,texture);return texture;
 }
 function rewardPop(text,x,y,z){
  const o=new T.Sprite(new T.SpriteMaterial({map:rewardTexture(text),transparent:true,depthTest:false,depthWrite:false}));
  o.position.set(x,y,z);o.scale.set(1.1,.44,1);o.renderOrder=1805;root.add(o);
  combatBursts.push({o,t:0,life:.72,kind:'pop',baseY:y});
 }
 const shardMat=new T.MeshStandardMaterial({color:0xc99263,roughness:.88,metalness:0,flatShading:true});
 function crateShards(x,y,z){
  for(let k=0;k<8;k++){
   const a=k*Math.PI*.25,velocity=1.2+rand()*.9;
   const o=mesh(shardGeo,shardMat,x,y+.4,z,root);
   o.castShadow=false;o.scale.set(.6+rand()*.7,.6+rand()*.9,.6+rand()*.6);
   combatBursts.push({o,t:0,life:.62,kind:'shard',vx:Math.sin(a)*velocity,vy:1.8+rand()*.9,vz:Math.cos(a)*velocity});
  }
 }

 // Shockwave mesh is anchored in world space (floor or boss arena), not HUD.
 function shockwave(x,y,z,color,life=.65,width=.62){
  const o=mesh(new T.RingGeometry(width*.78,width,36),
   new T.MeshBasicMaterial({color,transparent:true,opacity:.78,depthWrite:false,side:T.DoubleSide}),
   x,y,z,root);
  o.rotation.x=-P/2;o.castShadow=false;o.renderOrder=1400;
  combatBursts.push({o,t:0,life,kind:'wave'});
 }
 let stageCharacters=null;
 function combatFx(evt,actor){
  if(!evt)return;
  const material=color=>new T.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false,depthTest:false,side:T.DoubleSide});
  if(evt.type==='spellCast'&&actor){
   const angle=actor.face,px=actor.x+Math.sin(angle)*.65,pz=actor.z+Math.cos(angle)*.65;
   const o=mesh(new T.TorusGeometry(.22,.045,7,28),material(0x8cfff9),px,actor.y+.79,pz,root);
   o.rotation.y=angle;o.rotation.z=-.55;o.renderOrder=1800;o.castShadow=false;
   combatBursts.push({o,t:0,life:.17,kind:'slash'});
  }
  if(evt.type==='enemyAlert'){
   const o=mesh(new T.ConeGeometry(.17,.38,4),material(0xffea72),evt.x,(evt.y||0)+1.44,evt.z,root);
   o.renderOrder=1803;o.castShadow=false;
   combatBursts.push({o,t:0,life:.7,kind:'alert'});
  }
  if(evt.type==='spellHit'){
   impact(evt.x,evt.y,evt.z,evt.kind==='rune'?'#ffdf8a':'#8fffe7',12);
   shockwave(evt.x,evt.y,evt.z,0x8affea,.32,.25);
  }
  if(evt.type==='runeRestored'){
   rewardPop('¡RESTÁURALO! +5',evt.x,evt.y+.65,evt.z);
   impact(evt.x,evt.y,evt.z,'#a7ffb6',25);
   shockwave(evt.x,evt.y-.4,evt.z,0xbaffcb,.65,.64);
  }
  if(evt.type==='coin'){
   rewardPop(evt.reward===2?'+2':'+1',evt.x,evt.y+.38,evt.z);
   impact(evt.x,evt.y,evt.z,'#ffe390',5);
  }
  if(evt.type==='bonus'&&Number.isFinite(evt.x))rewardPop('+'+evt.count,evt.x,evt.y+.87,evt.z);
  if(evt.type==='treasure'){
   rewardPop('TESORO +'+evt.coins,evt.x,1.25,evt.z);
   impact(evt.x,.85,evt.z,'#ffe66a',12);
  }
  if(evt.type==='orb'){
   rewardPop('⚡ +18',evt.x,1.08,evt.z);
   shockwave(evt.x,.12,evt.z,0xffdf70,.56,.65);
  }
  if(evt.type==='combo'&&actor){
   rewardPop('COMBO x'+evt.chain,actor.x,actor.y+1.6,actor.z);
   impact(actor.x,actor.y+1,actor.z,'#fff1a2',8);
  }
  if(evt.type==='furyStart'&&actor){
   rewardPop('¡FURIA!',actor.x,actor.y+1.8,actor.z);
   shockwave(actor.x,actor.y+.11,actor.z,0xffd05d,.8,.9);
   impact(actor.x,actor.y+.8,actor.z,'#ffd26d',16);
  }
  if(evt.type==='bossIntro'||evt.type==='bossPhase'){
   const b=map.boss;
   for(let i=0;i<3;i++)shockwave(b.x,b.y+.16,b.z,evt.type==='bossIntro'?0xffb368:0xff636d,.7+i*.18,.75+i*.65);
   rewardPop(evt.type==='bossIntro'?'¡JEFE FINAL!':'¡FASE '+evt.phase+'!',b.x,b.y+2.7,b.z);
   impact(b.x,b.y+1.4,b.z,'#ffae79',18);
  }
  if(evt.type==='bossDown'){
   for(let i=0;i<4;i++)shockwave(evt.x,evt.y+.14,evt.z,0xffef8a,.8+i*.16,.95+i*.7);
   rewardPop('¡VICTORIA!',evt.x,evt.y+2.9,evt.z);
   impact(evt.x,evt.y+1.45,evt.z,'#ffdc77',30);
  }
  if(evt.type==='fall'&&Number.isFinite(evt.x)){
   shockwave(evt.x,-.58,evt.z,0x9bffff,.78,.58);
   impact(evt.x,-.59,evt.z,'#bafff6',14);
  }
  if(evt.type==='land'&&actor&&evt.surface==='soil'&&actor.vy===0){
   shockwave(actor.x,actor.y+.06,actor.z,0xd4e8b8,.34,.22);
  }
  if(evt.type==='star'&&Number.isFinite(evt.x))rewardPop('★',evt.x,evt.y+.42,evt.z);
  if(evt.type==='boxBreak'&&Number.isFinite(evt.x)){
   crateShards(evt.x,evt.y,evt.z);
   rewardPop('CRACK!',evt.x,evt.y+1,evt.z);
  }
  if(evt.type==='enemyHit'&&Number.isFinite(evt.x)){
   rewardPop('HIT!',evt.x,evt.y+1.2,evt.z);
   shockwave(evt.x,evt.y+.12,evt.z,0x82ffdd,.32,.44);
  }
  if(evt.type==='boxHit'&&Number.isFinite(evt.x)){
   shockwave(evt.x,evt.y+.08,evt.z,0xffd0a0,.27,.33);
  }
  if(evt.type==='enemyDown'){
   koTimers.set(evt.id,.55);
   rewardPop('KO! +3',evt.x,evt.y+1.05,evt.z);
  }
  if(['enemyHit','enemyDown','boxBreak','bossHit'].includes(evt.type)){
   const target=evt.type==='bossHit'?{x:map.boss.x,y:map.boss.y+1.5,z:map.boss.z}:evt;
   if(!Number.isFinite(target?.x))return;
   const color=evt.type==='enemyDown'?0xfff0a3:evt.type==='boxBreak'?0xffbb72:0x7effe0;
   const radius=evt.type==='enemyDown'?.42:.28;
   const o=mesh(new T.RingGeometry(radius*.54,radius,30),material(color),target.x,(target.y||0)+.80,target.z,root);
   o.renderOrder=1801;o.castShadow=false;
   combatBursts.push({o,t:0,life:evt.type==='enemyDown'?.55:.28,kind:'hit'});
   impact(target.x,(target.y||0)+.9,target.z,evt.type==='enemyDown'?'#fff1a1':'#97fff6',evt.type==='enemyDown'?21:9);
  }
 }

 function bindCharacters(handler){stageCharacters=handler}
 function impact(x,y,z,c='#ffe89f',count=11){
  // A fixed particle budget avoids hundreds of unique sphere meshes and
  // one shader/material allocation per sparkle on budget Android GPUs.
  const room=Math.max(0,74-effects.length),total=Math.min(count,room);
  for(let i=0;i<total;i++){
   const o=mesh(particleGeo,particleMaterial(c),x,y,z,root);o.castShadow=false;
   o.scale.setScalar(.5+rand()*.9);
   effects.push({o,vx:(rand()-.5)*3,vy:1+rand()*3,vz:(rand()-.5)*3,life:.28+rand()*.3});
  }
}
 function update(s,dt,elapsed){
  const p=s.player;
  ocean.material.uniforms.uTime.value=elapsed;
  wandTip.scale.setScalar(1+.18*Math.sin(elapsed*9));
  hero.muzzleFlash.visible=p.attack>.13;
  hero.muzzleFlash.scale.setScalar(1.2+Math.sin(elapsed*92)*.23);
  hero.blaster.position.z=.22-Math.max(0,p.attack)*.13;
  hero.blaster.rotation.x=-Math.max(0,p.attack)*.38;
  const assist=p.lastShotAim&&s.clock-p.lastShotAim.time<.28;
  const diff=assist?Math.atan2(Math.sin(Math.atan2(p.lastShotAim.dx,p.lastShotAim.dz)-p.face),
                              Math.cos(Math.atan2(p.lastShotAim.dx,p.lastShotAim.dz)-p.face)):0;
  hero.blaster.rotation.y+=(diff-hero.blaster.rotation.y)*Math.min(1,dt*14);
  wandTip.material.emissiveIntensity=assist?3.3:2.6;
  for(let i=0;i<magicOrbs.length;i++){
   const b=s.magicShots?.[i],o=magicOrbs[i];
   o.visible=!!b;
   if(b){o.position.set(b.x,b.y+.035*Math.sin(elapsed*18+i),b.z);
    o.scale.setScalar(1+.15*Math.sin(elapsed*19+i));o.rotation.y+=dt*3}
  }
  for(let i=0;i<runes.length;i++){
   const r=map.runes[i],o=runes[i];
   o.crystal.material=r.restored?M.gold:M.purple;
   o.crystal.rotation.y+=dt*(r.restored?2.6:1.1);
   o.crystal.scale.setScalar(r.restored?1.22:.82+.13*Math.sin(elapsed*3+i));
   o.petals.forEach((p,k)=>{p.visible=r.restored;p.rotation.y=elapsed*.5+k});
   o.ring.rotation.z=elapsed*1.5;
  }
  shoreFoam.material.opacity=.24+.12*Math.sin(elapsed*1.55);
  // Breeze on a few distant palms and foliage groups; no bone animation.
  for(let i=0;i<windTargets.length;i++){
   windTargets[i].rotation.z=Math.sin(elapsed*.9+i*1.8)*.025;
   windTargets[i].rotation.x=Math.cos(elapsed*.73+i)*.016;
  }
  furyRing.visible=s.chaos?.fury>0;furyRing.position.set(p.x,p.y+.12,p.z);
  if(furyRing.visible){
   furyRing.rotation.z=elapsed*2.8;
   furyMat.opacity=.53+.22*Math.sin(elapsed*10);
   const power=Math.max(.2,s.chaos.fury/7);
   furyRing.scale.setScalar(1+.23*Math.sin(elapsed*8)*power);
  }
  furySparks.forEach((o,i)=>{
   o.visible=furyRing.visible;
   if(!o.visible)return;
   const phase=elapsed*3.6+i*Math.PI/4;
   o.position.set(p.x+Math.cos(phase)*.51,p.y+.30+(elapsed*1.3+i*.24)%1.15,p.z+Math.sin(phase)*.51);
   o.rotation.y=phase;
  });
  if(typeof stageCharacters==='function')stageCharacters(s,dt);
  hero.root.position.set(p.x,p.y,p.z);hero.root.rotation.y=p.face;
 heroShadow.position.set(p.x,(window.MiniWorldsCore?.platformY(s,p.x,p.z)??p.y)+.045,p.z);
 const shadowGap=Math.max(0,p.y-heroShadow.position.y);
 heroShadow.material.opacity=.26/(1+shadowGap*.85);
 heroShadow.scale.set(1.1-shadowGap*.1,1,(1.1-shadowGap*.1)*.67);
  let run=Math.min(1,Math.hypot(p.vx,p.vz)/2.7),t=elapsed*11;
  hero.body.position.y=.58+(p.grounded?Math.sin(t)*.025*run:Math.sin(elapsed*5)*.035);
  hero.body.rotation.z=Math.sin(t*.5)*.055*run+(p.attack>.03?-.26:0);
  hero.head.rotation.y=Math.sin(elapsed*1.6)*.042;
  if(hero.tail){hero.tail.rotation.y=Math.sin(elapsed*4.4)*(.18+.09*run);
   hero.tail.rotation.x=.37+Math.sin(elapsed*7)*.075*run;}
  for(let k=0;k<2;k++){hero.legs[k].rotation.x=p.grounded?Math.sin(t+k*P)*.8*run:-.28;hero.arms[k].rotation.x=p.attack>.02?(k===1?-1.9:-.25):Math.sin(t+k*P+P)*.58*run}
  for(let i=0;i<coins.length;i++){const c=map.coins[i],o=coins[i];o.visible=!c.taken;if(o.visible){o.rotation.y=elapsed*2.6+i;o.position.set(c.x,c.y+Math.sin(elapsed*3+i)*.09,c.z)}}
  for(let i=0;i<stars.length;i++){const c=map.stars[i],o=stars[i];o.visible=!c.taken;if(o.visible){o.rotation.y=elapsed*1.5;o.position.y=c.y+Math.sin(elapsed*2+i)*.13}}
  for(let i=0;i<boxes.length;i++){const b=map.boxes[i],o=boxes[i];o.visible=b.alive;if(o.visible){o.rotation.z=b.flash>0?Math.sin(elapsed*50)*.09:0;o.scale.setScalar(b.flash>0?1.10:1)}}
  for(let i=0;i<enemies.length;i++){
   const e=map.enemies[i],o=enemies[i],death=koTimers.get(e.id)||0;
   o.visible=e.alive||death>0;
   enemyShadows[i].visible=e.alive&&e.type!=='flying';
   enemyShadows[i].position.set(e.x,(window.MiniWorldsCore?.platformY(s,e.x,e.z)??0)+.045,e.z);
   if(o.visible){
    o.position.x=e.x;o.position.z=e.z;
    // A visual recoil only: physics and collision remain deterministic.
    if(e.flash>0&&death<=0){
     const away=Math.atan2(e.x-p.x,e.z-p.z),impactPower=Math.sin(Math.PI*e.flash/.22);
     o.position.x+=Math.sin(away)*.18*impactPower;
     o.position.z+=Math.cos(away)*.18*impactPower;
     o.position.y+=.11*impactPower;
    }
   if(e.type==='flying')o.position.y=e.y;else o.position.y=Math.max(0,...map.platforms.filter(p=>Math.abs(e.x-p.x)<p.w/2&&Math.abs(e.z-p.z)<p.d/2).map(p=>p.y))+.42;
   o.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);
    if(death>0){const t=1-death/.55;o.position.y+=Math.sin(t*Math.PI)*.80;
      o.rotation.z=t*1.5;o.scale.setScalar(Math.max(.02,1-t*t));}
    else{o.scale.setScalar(e.flash>0?1+.14*Math.sin(Math.PI*e.flash/.22):1);o.rotation.z=e.flash>0?.31*Math.sin(elapsed*44):Math.sin(elapsed*4+i)*.035}
   }
   if(death>0){const next=death-dt;if(next<=0)koTimers.delete(e.id);else koTimers.set(e.id,next)}
  }
  projectilePool.forEach((o,i)=>{let q=s.projectiles[i];o.visible=Boolean(q);if(q){o.position.set(q.x,q.y,q.z);o.scale.setScalar(1+.3*Math.sin(elapsed*22))}});
  hazardPool.forEach((o,i)=>{let h=s.hazards[i];o.visible=Boolean(h);if(h){o.position.set(h.x,1.20+(h.active<=0?.01:0),h.z);o.material.opacity=h.active>0?.2:.72}});
  const b=map.boss;boss.root.visible=b.active&&b.alive;
  if(boss.root.visible){boss.root.position.set(b.x,b.y,b.z);boss.root.rotation.y=Math.atan2(p.x-b.x,p.z-b.z);boss.torso.rotation.z=Math.sin(elapsed*2)*.045;
   boss.claws.forEach((o,i)=>o.rotation.x=Math.sin(elapsed*(b.phase+2)+i)*.3+(b.telegraph>0?Math.sin(elapsed*15)*.7:0));
   boss.weak.visible=b.weak>0;boss.aura.visible=b.weak>0;boss.aura.rotation.z=elapsed*2.4;boss.weak.scale.setScalar(1+.18*Math.sin(elapsed*9))}
  warning.visible=b.active&&b.telegraph>0;warning.position.x=b.x;warning.material.opacity=.24+.35*Math.abs(Math.sin(elapsed*12));
  portal.visible=s.won;if(portal.visible)portal.rotation.y+=dt*.5;
  for(let i=combatBursts.length-1;i>=0;i--){
   const fx=combatBursts[i];fx.t+=dt;
   const progress=Math.min(1,fx.t/fx.life);
   fx.o.material.opacity=(1-progress)*.92;
   if(fx.kind==='pop'){
    fx.o.position.y=fx.baseY+progress*.80;
    fx.o.scale.set(1.06+Math.sin(progress*Math.PI)*.34,.43+Math.sin(progress*Math.PI)*.12,1);
   }else if(fx.kind==='wave'){
    fx.o.scale.setScalar(.55+progress*2.35);
   }else if(fx.kind==='shard'){
    fx.vy-=6.5*dt;fx.o.position.x+=fx.vx*dt;fx.o.position.z+=fx.vz*dt;fx.o.position.y+=fx.vy*dt;
    fx.o.rotation.x+=dt*6;fx.o.rotation.z+=dt*8;
    fx.o.scale.setScalar(Math.max(.06,1-progress));
   }else fx.o.scale.setScalar(fx.kind==='slash'?1+progress*.38:.55+progress*1.6);
   if(fx.t>=fx.life){
    fx.o.parent?.remove(fx.o);
    // Sprite billboards share geometry internally; never dispose their
    // shared geometry while other rewards are still alive.
    if(fx.kind!=='pop'&&fx.kind!=='shard')fx.o.geometry?.dispose();
    if(fx.kind!=='shard')fx.o.material?.dispose();
    combatBursts.splice(i,1);
   }
  }
  for(let i=effects.length-1;i>=0;i--){const f=effects[i];f.life-=dt;f.vy-=8*dt;f.o.position.x+=f.vx*dt;f.o.position.y+=f.vy*dt;f.o.position.z+=f.vz*dt;f.o.scale.setScalar(Math.max(.1,f.life*2));if(f.life<=0){root.remove(f.o);effects.splice(i,1)}}
 }
 function dispose(){
  // A GLB may have dozens of meshes sharing the same material/geometry.
  // Release each GPU resource once after removing the old stage.
  const geometries=new Set(),materials=new Set();
  scene.traverse(o=>{
   if(!o.isMesh&&!o.isLine&&!o.isSprite)return;
   if(o.geometry&&!o.isSprite)geometries.add(o.geometry);
   if(Array.isArray(o.material))o.material.forEach(m=>materials.add(m));
   else if(o.material)materials.add(o.material);
  });
  geometries.forEach(g=>g.dispose());
  materials.forEach(m=>m.dispose());
  rewardTextures.forEach(t=>t.dispose());
  groundTextures.forEach(t=>t.dispose());
  Object.values(M).forEach(m=>m.dispose());
  shardMat.dispose();shardGeo.dispose();particleGeo.dispose();
  particleMaterials.forEach(m=>m.dispose());
  furyMat.dispose();furySparkMat.dispose();furySparkGeo.dispose();
 }
 const setPremiumFoliage=enabled=>{
  // Preserve every fourth palm: the Quaternius broadleaf canopy supplies the
  // premium detail, while a few Kenney/procedural palms retain island identity.
  windTargets.forEach((plant,i)=>{plant.visible=!enabled||i%4===0});
 };
 return {scene,root:anchorRoot,worldRoot:root,map,nativeSolids,hero,boss,coins,stars,boxes,enemies,flags,portal,previewBeacon,heroShadow,furyRing,furySparks,ocean,shoreFoam,magicOrbs,runes,projectilePool,hazardPool,update,impact,combatFx,dispose,bindCharacters,setPremiumFoliage};
}
return {makeStage};
}})(typeof window!=='undefined'?window:globalThis);