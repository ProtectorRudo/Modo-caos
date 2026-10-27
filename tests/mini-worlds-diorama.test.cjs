/* MINI WORLDS: lightweight smoke test for the procedural premium coast.
 * Three is mocked to run in Node without a browser or GPU.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(base,'mini-worlds-diorama.js'),'utf8');
const art=fs.readFileSync(path.join(base,'mini-worlds-art.js'),'utf8');
const runtime=fs.readFileSync(path.join(base,'mini-worlds-runtime.js'),'utf8');
const html=fs.readFileSync(path.join(base,'mini-worlds.html'),'utf8');
const core=require('../mini-worlds-core.js');
class V{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 clone(){return new V(this.x,this.y,this.z)}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
 addScaledVector(v,f){this.x+=v.x*f;this.y+=v.y*f;this.z+=v.z*f;return this}
 dot(v){return this.x*v.x+this.y*v.y+this.z*v.z}
 length(){return Math.hypot(this.x,this.y,this.z)}
 divideScalar(n){this.x/=n;this.y/=n;this.z/=n;return this}
}
class Group{
 constructor(){this.children=[];this.parent=null;this.position=new V();this.scale=new V(1,1,1);this.rotation=new V();this.userData={};this.visible=true}
 add(o){if(o.parent)o.parent.remove(o);this.children.push(o);o.parent=this}
 remove(o){this.children=this.children.filter(x=>x!==o);o.parent=null}
 updateMatrix(){}
 getWorldPosition(v){v.set(0,0,0);let x=this;while(x){v.x+=x.position.x;v.y+=x.position.y;v.z+=x.position.z;x=x.parent}return v}
}
class Color{
 constructor(v){this.r=1;this.g=1;this.b=1;this.hex=v}
 clone(){return Object.assign(new Color(this.hex),{r:this.r,g:this.g,b:this.b})}
 multiplyScalar(x){this.r*=x;this.g*=x;this.b*=x;return this}
}
class Geometry{
 constructor(...arg){this.args=arg;this.attributes={};this.disposed=false}
 setAttribute(k,v){this.attributes[k]=v}
 computeVertexNormals(){}
 dispose(){this.disposed=true}
}
class Material{
 constructor(settings={}){Object.assign(this,settings);this.disposed=false}
 dispose(){this.disposed=true}
}
class Mesh extends Group{constructor(geo,mat){super();this.geometry=geo;this.material=mat}}
class Instances extends Mesh{
 constructor(geo,mat,count){super(geo,mat);this.count=count;this.instanceMatrix={needsUpdate:false};this.matrices=[];this.colors=[];this.isInstancedMesh=true}
 setMatrixAt(i,m){this.matrices[i]=m}
 setColorAt(i,c){this.colors[i]=c;this.instanceColor={needsUpdate:false}}
}
class Bounds {
 setFromObject(o){
  const c=o.getWorldPosition(new V()),size=o.userData?.testRadius??.5;
  this.min=new V(c.x-size,c.y-size,c.z-size);
  this.max=new V(c.x+size,c.y+size,c.z+size);
  return this;
 }
 getCenter(v){return v.set((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,(this.min.z+this.max.z)/2)}
 getSize(v){return v.set(this.max.x-this.min.x,this.max.y-this.min.y,this.max.z-this.min.z)}
}
const T={Color,Vector3:V,Box3:Bounds,Group,Object3D:Group,Mesh,Points:Mesh,InstancedMesh:Instances,
 BufferGeometry:Geometry,Float32BufferAttribute:class{constructor(v,n){this.array=v;this.itemSize=n}},
 ConeGeometry:Geometry,CylinderGeometry:Geometry,IcosahedronGeometry:Geometry,DodecahedronGeometry:Geometry,
 MeshStandardMaterial:Material,PointsMaterial:Material,DoubleSide:2};
const sandbox={window:{}};vm.runInNewContext(source,sandbox);
const api=sandbox.window.MiniWorldsDiorama(T);
assert.equal(typeof api.create,'function');
for(let level=0;level<2;level++){
 const anchor=new Group(),world=new Group(),map=core.level(level);
 anchor.position.set(2.13,-.24,-1.46);anchor.add(world);
 const hero=new Group();hero.position.set(0,0,1.2);world.add(hero);
 const stage={root:anchor,worldRoot:world,hero:{root:hero},map,premiumLayer:new Group()};
 const diorama=api.create(stage,level);
 assert.equal(diorama.kind,'sculpted mobile diorama');
 assert.equal(diorama.patchGroups.length,2,'instances must be batched into two visible chapters');
 assert(diorama.objects.length>=14,'each island should have a sculpted cliff rim');
 const rims=diorama.objects.flatMap(x=>x.children||[]).filter(x=>x.geometry?.attributes?.position);
 assert.equal(rims.length,map.platforms.filter(p=>p.kind!=='bridge').length,'every non-bridge island should have a real sculpted cliff');
 const instances=diorama.patchGroups.flatMap(g=>g.children).filter(x=>x.isInstancedMesh);
 assert(instances.length>=6,'multiple shared instanced flower, shrub and stone packs');
 assert(instances.every(x=>x.count<190),'must cap AR instance counts for mid-range Android');
 assert(instances.reduce((a,x)=>a+x.count,0)>100,'visible foliage density must improve meaningfully');
 const origin={...anchor.position};
 diorama.update({},1/60,5,new Group());
 assert.deepEqual({...anchor.position},origin,'FX must not move AR world anchor');
 assert.equal(hero.parent,world,'FX must not hide or replace fox');
 // Large canopy occludes despite tree trunk center being far from the path.
 const tree=new Group();tree.userData={mwFoliage:true,testRadius:1.55};
 tree.position.set(0,.65,.15);stage.premiumLayer.add(tree);
 const nearCamera=new Group();nearCamera.position.set(0,1.3,2.8);
 const farCamera=new Group();farCamera.position.set(9,1.3,2.8);
 for(let t=0;t<5;t++)diorama.update({},1/60,t/60,nearCamera);
 assert(!tree.visible,'broad leafy crown between camera and KAI must be hidden even if its trunk does not cross avatar');
 for(let t=5;t<10;t++)diorama.update({},1/60,t/60,farCamera);
 assert(tree.visible,'occluding tree must return when camera moves, without destroying art');
 stage.premiumLayer.remove(tree);

 diorama.dispose();
 assert.deepEqual([...world.children],[hero],'old island scenery is completely removable on retry');
}
assert(!source.includes('navigator.xr')&&!source.includes('stage.root.position.set'),'new module must not manipulate XR');
assert(source.includes('flatShading:true')&&source.includes('new T.InstancedMesh'),'true mobile optimized sculpting');
assert(source.includes('visibility(camera)')&&source.includes('bbox.setFromObject(obj)'),'cutaway must use full canopy bounding volume');
assert(art.includes('cube(p.w*.80,.31,p.d*.80)'),'structural block must not conceal new sculpted edges');
assert(art.includes('uniform float uTime')&&art.includes('shoreline'),'enhanced ocean must remain animated');
assert(runtime.includes('stage.diorama=window.MiniWorldsDiorama?.(T).create(stage,level)'));
assert(runtime.includes('stage.diorama?.update(game,dt,elapsed'),'diorama must animate');
assert(runtime.includes('stage.diorama?.dispose?.()'),'old render must be released on restart');
assert(html.includes('<script src="./mini-worlds-diorama.js"></script>'));
console.log('MINI WORLDS: 2 optimized coastal biomes, geometric cliffs, 100+ instanced props, ocean shader, KAI cutaway, no anchor mutation, cleanup: PASS');
