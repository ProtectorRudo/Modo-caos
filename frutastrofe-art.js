/* FRUTÁSTROFE · Three.js premium arcade art · geometrías originales sin descargas obligatorias */
(function(root){'use strict';
function createArt(T,renderer){
 const scene=new T.Scene(),world=new T.Group(),bodies=new Map(),effects=[],clock=new T.Clock();
 scene.add(world);scene.background=new T.Color(0x070b23);scene.fog=new T.FogExp2(0x090d25,.021);
 const camera=new T.PerspectiveCamera(48,1,.05,140);camera.position.set(0,2.5,10.1);camera.lookAt(0,1.83,0);
 const hemi=new T.HemisphereLight(0xc4f7ff,0x211025,2.0);scene.add(hemi);
 const key=new T.DirectionalLight(0xffffff,3.15);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.0005;world.add(key);
 const pink=new T.PointLight(0xfe4fb5,23,13);pink.position.set(-4,2,-2);world.add(pink);
 const blue=new T.PointLight(0x2be6ef,29,12);blue.position.set(4,3,-2);world.add(blue);
 const amber=new T.PointLight(0xffb951,18,12);amber.position.set(0,5,1);world.add(amber);
 const mat=(color,roughness=.24,metalness=0)=>new T.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.74,clearcoatRoughness:.16});
 const skin={strawberry:mat(0xf92d50),apple:mat(0xeb3356),orange:mat(0xff942c,.55),watermelon:mat(0x2dce8b,.32),lemon:mat(0xfbe04c,.4),gold:mat(0xffc64c,.14,.68),ice:mat(0x75dbff,.12,.2),rainbow:mat(0xad80ff,.2,.18),rotten:mat(0x69843c,.75),bomb:mat(0x333447,.25,.55),boss:mat(0x2acb78,.24)};
 const leaf=mat(0x237d46,.7),stem=mat(0x634322,.8),seedMat=mat(0xffefae,.47),black=mat(0x111423,.24,.55),white=mat(0xf6ffff,.23);
 function mesh(geo,m,parent=world){const ob=new T.Mesh(geo,m);parent.add(ob);ob.castShadow=true;ob.receiveShadow=true;return ob}
 function emissive(c,power=2){return new T.MeshBasicMaterial({color:c,transparent:true,opacity:.8,depthWrite:false})}
 function cylinder(r1,r2,h,color,segments=48){return mesh(new T.CylinderGeometry(r1,r2,h,segments),mat(color))}
 const floor=mesh(new T.CylinderGeometry(3.65,3.85,.19,96),mat(0x111731,.4,.58));floor.position.y=-.30;floor.receiveShadow=true;
 const inner=mesh(new T.CylinderGeometry(3.32,3.35,.028,96),mat(0x1b2645,.5,.4));inner.position.y=-.187;
 const under=mesh(new T.CylinderGeometry(3.85,3.82,.11,96),mat(0x0e1023,.3,.62));under.position.y=-.41;
 function torus(radius,tube,color,y,tilt=0){const o=mesh(new T.TorusGeometry(radius,tube,10,100),emissive(color));o.rotation.x=Math.PI/2+tilt;o.position.y=y;return o}
 torus(3.45,.027,0x3effdc,-.15);torus(3.70,.034,0xff5ec0,-.31);torus(2.73,.012,0x38aaff,-.17);
 for(let k=0;k<16;k++){const a=k*Math.PI/8;const node=mesh(new T.BoxGeometry(.16,.055,.33),mat(k%2?0xffa14d:0x3fe1eb,.2,.36));node.position.set(Math.sin(a)*3.46,-.14,Math.cos(a)*3.46);node.rotation.y=a}
 const rim=mesh(new T.TorusGeometry(.78,.11,16,90),mat(0x27385f,.23,.69));rim.position.set(0,4.5,0);rim.rotation.x=.13;
 const innerRim=mesh(new T.TorusGeometry(.61,.055,14,72),emissive(0x50f4e0));innerRim.position.set(0,4.5,-.02);innerRim.rotation.x=.13;
 const portal=mesh(new T.CircleGeometry(.55,64),new T.MeshBasicMaterial({color:0xa14eff,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));portal.position.set(0,4.5,-.04);
 const halo=makeGlow('#45f5ed'),pinkGlow=makeGlow('#f64c9c'),goldGlow=makeGlow('#ffcb58');
 const gateHalo=new T.Sprite(new T.SpriteMaterial({map:halo,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));gateHalo.scale.set(3.6,3.6,1);gateHalo.position.set(0,4.5,-.15);world.add(gateHalo);
 const decor=[];
 for(let i=0;i<22;i++){const a=i*2.399963,rr=4.2+(i%3)*.48;
  const ob=mesh(new T.OctahedronGeometry(.07+(i%4)*.022,0),emissive(i%3?0x74cbff:0xff82d1));ob.position.set(Math.sin(a)*rr,.8+(i%6)*.51,Math.cos(a)*rr-1.7);decor.push(ob)}
 function makeGlow(c){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,c);g.addColorStop(.2,c+'aa');g.addColorStop(.65,c+'22');g.addColorStop(1,c+'00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex}
 function sphere(p,r,m,segments=32){return mesh(new T.SphereGeometry(r,segments,20),m,p)}
 function foliage(g,size=.23){const stalk=mesh(new T.CylinderGeometry(.035,.055,.29,10),stem,g);stalk.position.y=size*1.15;stalk.rotation.z=.22;
  for(let j=0;j<4;j++){const pet=mesh(new T.SphereGeometry(.14,12,8),leaf,g);const a=j*Math.PI/2;pet.position.set(Math.cos(a)*.12,size*1.12,Math.sin(a)*.12);pet.scale.set(1,.23,.5);pet.rotation.y=a}
 }
 function berry(g,m){
   // Tapered strawberry body, curved shoulder, narrow bottom.
   const points=[new T.Vector2(0,-.33),new T.Vector2(.09,-.29),new T.Vector2(.20,-.15),new T.Vector2(.29,.035),new T.Vector2(.28,.19),new T.Vector2(.16,.29),new T.Vector2(0,.305)];
   mesh(new T.LatheGeometry(points,32),m,g);
   for(let i=0;i<40;i++){const v=(i+.5)/40,a=i*2.39996,yy=-.27+v*.51,rr=Math.max(.04,.30*Math.pow(Math.max(.04,1-Math.pow((yy-.075)/.40,2)),.5));const s=sphere(g,.013,seedMat,8);s.position.set(Math.cos(a)*rr,yy,Math.sin(a)*rr);s.scale.set(.7,1.3,.55)}
   foliage(g,.26)
 }
 function orange(g,m){sphere(g,.305,m,40);foliage(g,.23);const dot=sphere(g,.035,mat(0xb77935),12);dot.position.y=-.305}
 function apple(g,m){
   const points=[new T.Vector2(0,-.3),new T.Vector2(.13,-.31),new T.Vector2(.29,-.22),new T.Vector2(.335,0),new T.Vector2(.29,.22),new T.Vector2(.12,.29),new T.Vector2(0,.265)];
   mesh(new T.LatheGeometry(points,48),m,g);foliage(g,.25)
 }
 function melon(g,m){sphere(g,.35,m,40);for(let i=0;i<10;i++){const a=i*Math.PI/5;const curve=new T.EllipseCurve(0,0,.35,.35,0,Math.PI*2,false,0);const stripe=mesh(new T.TorusGeometry(.351,.011,6,60),mat(i%2?0x166d43:0xa4ffab,.5),g);stripe.rotation.y=a;stripe.rotation.x=Math.PI/2;stripe.scale.y=.93}foliage(g,.27)}
 function lemon(g,m){const profile=[new T.Vector2(0,-.41),new T.Vector2(.085,-.36),new T.Vector2(.20,-.29),new T.Vector2(.285,-.16),new T.Vector2(.30,.02),new T.Vector2(.255,.20),new T.Vector2(.155,.33),new T.Vector2(.065,.40),new T.Vector2(0,.41)];mesh(new T.LatheGeometry(profile,48),m,g);foliage(g,.32)}
 function bomb(g){sphere(g,.3,skin.bomb,32);const band=mesh(new T.TorusGeometry(.30,.034,10,48),mat(0xff4c79,.32,.23),g);band.rotation.x=Math.PI/2;const lid=mesh(new T.CylinderGeometry(.13,.16,.13,16),black,g);lid.position.y=.3;const wick=mesh(new T.CylinderGeometry(.026,.027,.23,10),mat(0xffa448,.6),g);wick.position.set(.04,.47,0);wick.rotation.z=-.3;const red=sphere(g,.055,mat(0xffd048),12);red.position.set(.1,.57,0);const warning=mesh(new T.ConeGeometry(.12,.23,3),emissive(0xff625c),g);warning.position.set(0,.06,.30);warning.rotation.z=Math.PI}
 function special(g,kind){sphere(g,.32,skin[kind]);const c=kind==='gold'?0xffdb70:kind==='ice'?0x8af0ff:0xd494ff;const wire=mesh(new T.IcosahedronGeometry(.4,1),new T.MeshBasicMaterial({color:c,wireframe:true,transparent:true,opacity:.65}),g);wire.userData.spin=true;g.userData.wire=wire;foliage(g,.24)}
 function rotten(g){apple(g,skin.rotten);const m=mat(0x4a365f,.84);for(let i=0;i<5;i++){const a=i*2.3,o=sphere(g,.10,m,12);o.position.set(Math.cos(a)*.2,Math.sin(a)*.16,Math.sin(a*2)*.21)}}
 function boss(g){melon(g,skin.boss);const brow=mesh(new T.BoxGeometry(.35,.09,.065),mat(0x202234),g);brow.position.set(0,.15,.32);const eye1=sphere(g,.07,white,12);eye1.position.set(-.14,.06,.33);const eye2=sphere(g,.07,white,12);eye2.position.set(.14,.06,.33);const pupil1=sphere(g,.027,black,8);pupil1.position.set(-.14,.06,.39);const pupil2=sphere(g,.027,black,8);pupil2.position.set(.14,.06,.39);const crown=mesh(new T.ConeGeometry(.22,.36,5),mat(0xfed455,.2,.45),g);crown.position.y=.58}
 function fruit(kind){const g=new T.Group(),m=skin[kind]||skin.apple;g.userData.kind=kind;
 switch(kind){case 'strawberry':berry(g,m);break;case 'orange':orange(g,m);break;case 'apple':apple(g,m);break;case 'watermelon':melon(g,m);break;case 'lemon':lemon(g,m);break;case 'bomb':bomb(g);break;case 'rotten':rotten(g);break;case 'boss':boss(g);break;default:special(g,kind);}
 g.scale.setScalar(kind==='boss'?2.05:['gold','ice','rainbow'].includes(kind)?1.44:1.35);
 if(['gold','ice','rainbow'].includes(kind)){const sprite=new T.Sprite(new T.SpriteMaterial({map:kind==='gold'?goldGlow:kind==='ice'?halo:pinkGlow,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));sprite.scale.set(1.8,1.8,1);g.add(sprite)}
 return g;
 }
 function sync(objects,elapsed){
  const ids=new Set();
  for(const obj of objects){ids.add(obj.id);let mesh=bodies.get(obj.id);if(!mesh){mesh=fruit(obj.kind);mesh.userData.targetId=obj.id;mesh.traverse(child=>{child.userData.targetId=obj.id});world.add(mesh);bodies.set(obj.id,mesh)}
   mesh.position.set(obj.x,obj.y,obj.z);mesh.rotation.set(Math.sin(elapsed*.9+obj.id)*.12,obj.rot,Math.cos(elapsed*.8+obj.id)*.09);
   if(obj.kind==='boss')mesh.scale.setScalar(2.05+Math.sin(elapsed*2)*.085);
   if(mesh.userData.wire)mesh.userData.wire.rotation.y=elapsed*.5;
  }
  for(const [id,mesh] of bodies)if(!ids.has(id)){world.remove(mesh);bodies.delete(id)}
 }
 function burst(x,y,z,kind='strawberry',amount=18){
   const colors={strawberry:0xf03462,orange:0xffa42b,apple:0xff3866,watermelon:0x55f0ac,lemon:0xffe965,gold:0xffd065,ice:0x78ebff,rainbow:0xe598ff,bomb:0xff4670,rotten:0x9aab51,boss:0xb4f55a};const c=colors[kind]||colors.strawberry;
   for(let i=0;i<amount;i++){const p=mesh(new T.IcosahedronGeometry(.035+Math.random()*.075,0),new T.MeshBasicMaterial({color:c,transparent:true,opacity:1,depthWrite:false}));
   p.position.set(x,y,z);const v=new T.Vector3((Math.random()-.5)*3.4,(Math.random()-.5)*3.9,(Math.random()-.5)*2.3);effects.push({mesh:p,v,life:.68+Math.random()*.38,max:1.1})}
   const s=new T.Sprite(new T.SpriteMaterial({map:kind==='gold'?goldGlow:kind==='ice'?halo:pinkGlow,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));world.add(s);s.position.set(x,y,z);effects.push({mesh:s,glow:true,life:.32,max:.32});
 }
 function updateFx(dt,time){
  rim.rotation.z=time*.21;innerRim.rotation.z=-time*.18;portal.material.opacity=.26+Math.sin(time*4)*.08;gateHalo.material.rotation=time*.1;
  for(let i=0;i<decor.length;i++)decor[i].position.y+=Math.sin(time*1.7+i)*.0006;
  for(let i=effects.length-1;i>=0;i--){const p=effects[i];p.life-=dt;if(p.life<=0){world.remove(p.mesh);p.mesh.geometry?.dispose?.();p.mesh.material?.dispose?.();effects.splice(i,1);continue}
   if(p.glow){p.mesh.scale.setScalar((1-p.life/p.max)*2.5+.2);p.mesh.material.opacity=p.life/p.max*.85}
   else{p.v.y-=dt*3.4;p.mesh.position.addScaledVector(p.v,dt);p.mesh.scale.setScalar(Math.min(1,p.life/.45));p.mesh.material.opacity=p.life/p.max;}
  }
 }
 function reset(){for(const ob of bodies.values())world.remove(ob);bodies.clear();for(const fx of effects)world.remove(fx.mesh);effects.length=0}
 return {scene,world,camera,renderer,sync,burst,updateFx,reset,bodies,clock,stage:floor};
}
root.FrutaArt={create:createArt};
})(typeof window!=='undefined'?window:globalThis);
