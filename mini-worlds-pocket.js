/* MINI WORLDS — pocket-size AR world rooms.
 * Physical XR anchor remains immutable. All game logic stays in the original
 * logical coordinates; only a child 3D render group changes at a deliberate
 * magical portal. NEVER scroll the anchored world continuously.
 */
(function(root){
'use strict';
const ROOMS=Object.freeze([
 Object.freeze({id:0,title:'BOSQUE DE LOS HECHIZOS',min:-5.0,max:3,offset:0,floor:0}),
 Object.freeze({id:1,title:'JARDINES ESCONDIDOS',min:-11.4,max:-5,offset:6.3,floor:0}),
 Object.freeze({id:2,title:'TEMPLO DE LAS NUBES',min:-17.8,max:-11.4,offset:12.7,floor:1}),
 Object.freeze({id:3,title:'TRONO DEL GUARDIÁN',min:-28,max:-17.8,offset:19.1,floor:1})
]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function roomAtZ(z){
 if(z>ROOMS[0].min)return 0;
 if(z>ROOMS[1].min)return 1;
 if(z>ROOMS[2].min)return 2;
 return 3;
}
function physicalZ(z,room){return z+ROOMS[clamp(room,0,3)].offset}
function displayLength(scale){return {width:11.5*scale,length:8.8*scale}}
function canSee(z,room,overlap=.5){
 const r=ROOMS[clamp(room,0,3)];
 return z>=r.min-overlap&&z<=r.max+overlap;
}
function create(T,stage){
 if(!stage?.worldRoot||!stage?.root)throw Error('pocket stage requires separate immutable anchor/world root');
 const world=stage.worldRoot;
 const dynamicAlways=new Set([stage.hero?.root,stage.previewBeacon,stage.heroShadow,stage.furyRing,stage.ocean?.o,stage.shoreFoam]);
 const layers=ROOMS.map((r)=>{
  const g=new T.Group();g.name='WORLD POCKET '+r.id+' · '+r.title;world.add(g);return g;
 });
 const gateMesh=[];
 if(T.TorusGeometry&&T.Mesh&&T.MeshBasicMaterial){
  const colors=[0x7dffe0,0xc39aff,0xffdb8c];
  for(let i=0;i<ROOMS.length-1;i++){
   const threshold=ROOMS[i].min;
   const near=stage.map.platforms.reduce((a,p)=>Math.abs(p.z-threshold)<Math.abs(a.z-threshold)?p:a);
   for(const room of [i,i+1]){
    const portal=new T.Group();portal.name='PORTAL '+i+' TO '+(i+1);
    portal.position.set(near.x,near.y+1.12,threshold);
    for(let j=0;j<2;j++){
     const ring=new T.Mesh(new T.TorusGeometry(j===0?.84:.66,j===0?.095:.036,8,32),new T.MeshBasicMaterial({color:j===0?colors[i]:0xe2fff7,transparent:true,opacity:j===0?.86:.53,depthWrite:false,side:T.DoubleSide}));
     portal.add(ring);
    }
    layers[room].add(portal);gateMesh.push(portal);
   }
  }
 }
 let active=0,transitionCount=0;
 function reindex(){
  for(const child of [...world.children]){
   if(layers.includes(child))continue;
   if(dynamicAlways.has(child)||child===stage.kenneyArt||child===stage.premiumLayer){world.add(child);continue}
   const z=child.position?.z||0;
   layers[roomAtZ(z)].add(child);
  }
  // Decorative pack roots can contain models from many rooms. Keep the
  // artist's group hierarchy and switch only immediate instance groups.
  for(const g of [stage.kenneyFoliage,stage.premiumLayer]){
   if(!g)continue;
   for(const o of g.children||[]){
    const z=o.position?.z||0;
    o.visible=canSee(z,active,.5);
   }
  }
 }
 function switchRoom(next,reason='portal'){
  next=clamp(next,0,ROOMS.length-1);
  if(next===active){reindex();return false}
  active=next;transitionCount++;
  stage.room=next;world.position.z=ROOMS[active].offset;
  // Two stacked virtual floors; the upper gardens are intentionally elevated
  // while physical AR placement remains fixed at the same real floor point.
  world.position.y=ROOMS[active].floor*1.55;
  if(stage.ocean?.o)stage.ocean.o.position.z=-2.0-ROOMS[active].offset;
  if(stage.ocean?.o)stage.ocean.o.position.y=-.70-world.position.y;
  for(let i=0;i<layers.length;i++)layers[i].visible=i===active;
  reindex();
  return {room:next,info:ROOMS[next],reason};
 }
 function sync(z){
  const desired=roomAtZ(z);
  return switchRoom(desired,z<ROOMS[active].min?'forward':'back');
 }
 function initialize(){
  stage.room=0;world.position.z=0;world.position.y=0;
  if(stage.ocean?.o){
   // Restrict 3D water to current pocket instead of 12 metres.
   stage.ocean.o.scale.set(.66,.265,1);
   stage.ocean.o.position.z=-2.0;
  }
  if(stage.shoreFoam)stage.shoreFoam.visible=false;
  reindex();
  layers.forEach((l,i)=>l.visible=i===0);
 }
 initialize();
 return {sync,switchRoom,reindex,gateMesh,get room(){return active},get transitions(){return transitionCount},
  localZ:z=>physicalZ(z,active),get info(){return ROOMS[active]},rooms:ROOMS};
}
root.MiniWorldsPocket=Object.freeze({ROOMS,roomAtZ,physicalZ,displayLength,canSee,create});
})(typeof window!=='undefined'?window:globalThis);
