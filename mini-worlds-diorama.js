/* MINI WORLDS — Grand Island art extension (original, CC0-free primitives).
 * Adds cinematic sculpted cliffs + ground-edge dressing with InstancedMesh.
 * Visual only: NOTHING here creates collision ground or changes XR anchors.
 */
(function(root){
'use strict';
root.MiniWorldsDiorama=function(T){
 const TWO=Math.PI*2;
 function tint(hex,f){return new T.Color(hex).multiplyScalar(f)}
 function jaggedRim(p,rand){
  const verts=[],cols=[];
  const base=p.kind==='arena'?0x8c97a3:p.kind==='ruins'?0x987659:
   p.kind==='beach'?0xc69b72:p.kind==='bridge'?0x75645f:0x776f5d;
  const color=new T.Color(base);
  const ring=[],halfW=p.w/2,halfD=p.d/2,steps=7;
  // The rim never extends beyond physics rectangle, no invisible floor.
  for(let side=0;side<4;side++){
   for(let i=0;i<steps;i++){
    const t=i/steps;
    const x=side===0? -halfW+t*p.w:side===1?halfW:side===2?halfW-t*p.w:-halfW;
    const z=side===0?-halfD:side===1?-halfD+t*p.d:side===2?halfD:halfD-t*p.d;
    ring.push({x,z,d:rand()});
   }
  }
  function tri(a,b,c,mult){
   for(const v of [a,b,c]){
    verts.push(v[0],v[1],v[2]);
    const mixed=color.clone().multiplyScalar(mult);
    cols.push(mixed.r,mixed.g,mixed.b);
   }
  }
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length];
   const row=node=>{
    const width=node.x/(halfW||1),depth=node.z/(halfD||1);
    return [
     [node.x*.985,-.085,node.z*.985],
     [node.x*.95,-.38-.1*node.d,node.z*.95],
     [width*(halfW*.79+(node.d-.5)*.06),-.92-.33*node.d,depth*(halfD*.78+(node.d-.5)*.06)]
    ];
   };
   const u=row(a),v=row(b);
   for(let k=0;k<2;k++){
    const light=.87+rand()*.23+((i%4===0)?.05:0);
    tri(u[k],v[k],u[k+1],light);
    tri(u[k+1],v[k],v[k+1],light*.92);
   }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.computeVertexNormals();
  return new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.94,metalness:.02,side:T.DoubleSide}));
 }
 function create(stage,level){
  const world=stage?.worldRoot,map=stage?.map;if(!world||!map)return null;
  const geometry=[],materials=[],objects=[],patchGroups=[];
  const palette=level?{grass:0x66b1a8,leaf:0x357e87,flower:0xc6a3f8,stone:0x9199aa}:
                       {grass:0x90b777,leaf:0x317f61,flower:0xffb7c1,stone:0x8fa0a0};
  let seed=level?19473:29141;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const grassMat=new T.MeshStandardMaterial({color:palette.leaf,roughness:.86,side:T.DoubleSide});
  const petalMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.75});
  const budMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.53,metalness:.03});
  const stoneMat=new T.MeshStandardMaterial({color:palette.stone,roughness:.93,flatShading:true});
  const tintMat=new T.MeshStandardMaterial({color:palette.grass,roughness:.96,side:T.DoubleSide});
  materials.push(grassMat,petalMat,budMat,stoneMat,tintMat);
  const stemGeo=new T.CylinderGeometry(.015,.029,.35,5),budGeo=new T.IcosahedronGeometry(.12,0);
  const leafGeo=new T.ConeGeometry(.22,.39,4),rockGeo=new T.DodecahedronGeometry(.22,0);
  geometry.push(stemGeo,budGeo,leafGeo,rockGeo);
  // These keep ground fully visible for controls: no mesh is a new floor.
  // Slightly inset, irregular vegetation edges break the perfect square outline.
  for(const p of map.platforms){
   if(p.kind==='bridge')continue;
   const holder=new T.Group();
   holder.position.set(p.x,p.y,p.z);
   holder.name='SCULPTED PLAYABLE LAND · '+p.id;world.add(holder);objects.push(holder);
   const rim=jaggedRim(p,rand);holder.add(rim);geometry.push(rim.geometry);materials.push(rim.material);
   // Pebbly ledges below the actual collision footprint; the top plane
   // remains untouched, including crate lids and graded walkways.
   const rNum=Math.max(4,Math.round((p.w+p.d)*.65));
   // One draw call per island for the entire pebble rim, rather than
   // dozens of independent rock meshes on every Android AR frame.
   const pebbles=new T.InstancedMesh(rockGeo,stoneMat,rNum),obj=new T.Object3D();
   for(let j=0;j<rNum;j++){
    const a=j/rNum*TWO;
    const x=Math.cos(a)*(p.w*.49),z=Math.sin(a)*(p.d*.49);
    obj.position.set(x,-.20+(rand()-.5)*.16,z);
    obj.scale.set(.8+rand()*.8,.37+rand()*.5,.8+rand()*.6);
    obj.rotation.set(rand(),rand()*TWO,rand());obj.updateMatrix();
    pebbles.setMatrixAt(j,obj.matrix);
   }
   pebbles.instanceMatrix.needsUpdate=true;pebbles.castShadow=false;
   holder.add(pebbles);
  }
  // Per-region instancing: ~200 flowers/shrubs across both giant zones with
  // constant draw-call overhead instead of hundreds of independent meshes.
  const regions=[[],[]];for(const p of map.platforms)regions[p.z> -12.10?0:1].push(p);
  for(let region=0;region<2;region++){
   const host=new T.Group();host.name='GRAND BIOME '+region;
   host.position.z=region===0?-5:-20;world.add(host);objects.push(host);
   const positions=[],rocks=[],fl=[],stems=[];
   for(const p of regions[region]){
    const density=p.kind==='arena'?8:p.kind==='beach'?13:p.kind==='jungle'?18:12;
    for(let n=0;n<density;n++){
     const side=(n%4),along=rand()*.91-.455;
     const x=p.x+(side<2?(side===0?-1:1)*p.w*(.35+rand()*.10):along*p.w);
     const z=p.z+(side>=2?(side===2?-1:1)*p.d*(.35+rand()*.10):along*p.d);
     const point={x,y:p.y+.085,z:z-host.position.z,rot:rand()*TWO,size:.55+rand()*.75};
     // Tiny scattered details remain lower than KAI's feet height.
     if(n%5===0){rocks.push(point);continue}
     if(n%4===1){fl.push(point);stems.push(point)}else positions.push(point);
    }
   }
   function inst(geo,mat,data,scale,variation){
    if(!data.length)return null;
    const o=new T.InstancedMesh(geo,mat,data.length);
    const dummy=new T.Object3D();
    for(let i=0;i<data.length;i++){
     const p=data[i];
     dummy.position.set(p.x,p.y+(variation?.y||0),p.z);
     dummy.rotation.set(variation?.tilt||0,p.rot,0);
     dummy.scale.set(scale[0]*p.size,scale[1]*p.size,scale[2]*p.size);
     dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);
     o.setColorAt(i,tint(variation?.base??palette.grass,.82+rand()*.27));
    }
    o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;
    o.castShadow=false;o.receiveShadow=false;
    host.add(o);return o;
   }
   inst(leafGeo,grassMat,positions,[1,1,1],{base:palette.leaf});
   inst(stemGeo,tintMat,stems,[.8,.72,.8],{y:.08});
   inst(budGeo,budMat,fl,[1,.7,1],{y:.26,base:palette.flower});
   inst(rockGeo,stoneMat,rocks,[.95,.40,.90],{base:palette.stone});
   patchGroups.push(host);
  }
  // A few authentic-looking, non-opaque magical ambient fireflies. One draw.
  const sparkMat=new T.PointsMaterial({color:0x9cebd8,size:.10,transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true});
  const sparkGeo=new T.BufferGeometry(),coords=[];
  for(let j=0;j<24;j++){
   const p=map.platforms[(j*7)%map.platforms.length];
   coords.push(p.x+(rand()-.5)*p.w*.7,p.y+.65+rand()*1.25,p.z+(rand()-.5)*p.d*.75);
  }
  sparkGeo.setAttribute('position',new T.Float32BufferAttribute(coords,3));
  const sparks=new T.Points(sparkGeo,sparkMat);sparks.name='MAGICAL FIREFLIES';world.add(sparks);
  geometry.push(sparkGeo);materials.push(sparkMat);objects.push(sparks);
  // Lightweight cutaway: premium foliage never blocks the avatar's face.
  // Pure visual change; no changes to player position, floor or XR camera.
  let lastOcclusions=[],counter=0;
  function visibility(camera){
   const premium=stage.premiumLayer;
   const candidates=[...(premium?.children||[]),...(stage.kaykitDecor||[])];
   if(!camera||!candidates.length)return;
   for(const obj of lastOcclusions)obj.visible=obj.userData.beforeCutaway!==false;
   lastOcclusions=[];
   const heroPos=new T.Vector3(),camPos=new T.Vector3();
   stage.hero.root.getWorldPosition(heroPos);
   camera.getWorldPosition(camPos);
   heroPos.y+=.72*(stage.root?.scale?.x||1);
   const ray=heroPos.clone().sub(camPos),length=ray.length();
   if(length<.4)return;
   ray.divideScalar(length);
   for(const obj of candidates){
    // The pocket reindex manages visibility for out-of-room trees.
    if(!obj.visible||obj.userData?.beforeCutaway===false)continue;
    const center=new T.Vector3();obj.getWorldPosition(center);
    center.y+=.29*(stage.root?.scale?.x||1);
    const proj=center.clone().sub(camPos).dot(ray);
    if(proj<=.1||proj>=length-.1)continue;
    const away=center.sub(camPos.addScaledVector(ray,proj)).length();
    camPos.addScaledVector(ray,-proj);
    if(away<.64){
     obj.userData.beforeCutaway=obj.visible;obj.visible=false;
     lastOcclusions.push(obj);
    }
   }
  }
  let elapsedPrev=0;
  function update(game,dt,elapsed,camera){
   // World-only vertical sparkle drift. No screen overlay or fake terrain.
   sparks.position.y=Math.sin(elapsed*.74)*.07;
   if(++counter%5===0)visibility(camera);
  }
  function dispose(){
   for(const o of lastOcclusions)o.visible=o.userData.beforeCutaway!==false;
   for(const o of objects)o.parent?.remove(o);
   for(const g of geometry)g.dispose();
   for(const m of materials)m.dispose();
  }
  return {update,dispose,objects,patchGroups,kind:'sculpted mobile diorama'};
 }
 return {create};
};
})(typeof window!=='undefined'?window:globalThis);
