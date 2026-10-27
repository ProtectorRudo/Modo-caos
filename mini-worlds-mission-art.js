/* MINI WORLDS — world-anchored mission visuals; always optional to physics.
 * Every mesh is added BEFORE the pocket world-room indexer runs.
 */
(function(root){
'use strict';
root.MiniWorldsMissionArt=function(T){
 function setup(stage,s){
  if(!stage?.worldRoot||!s?.mission)return null;
  const world=stage.worldRoot,m=s.mission,npcs=[],props=[],lights=[];
  const tints=[0x8df9db,0xffd382,0xc1adff,0x9ae7ff];
  const mat=(c,glow=.0)=>new T.MeshStandardMaterial({color:c,metalness:.14,roughness:.38,emissive:c,emissiveIntensity:glow});
  const fx=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.82,depthWrite:false,blending:T.AdditiveBlending});
  const light=mat(0xfff6e4),eyes=mat(0x173347),cap=mat(0x2e7d98),gold=mat(0xf2d087,.18),cage=fx(0x86ffec);
  function at(x,y,z,label){const g=new T.Group();g.name=label;g.position.set(x,y,z);world.add(g);return g}
  function add(g,geometry,material,x,y,z){
   const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);g.add(mesh);
   mesh.castShadow=false;mesh.receiveShadow=false;return mesh;
  }
  for(let i=0;i<m.rescues.length;i++){
   const r=m.rescues[i],g=at(r.x,r.y,r.z,'RESCATE · '+r.name);
   const wool=mat(tints[i%4],.11);
   const body=add(g,new T.SphereGeometry(.22,13,10),wool,0,.32,0);
   body.scale.set(.8,1.05,.76);
   const head=add(g,new T.SphereGeometry(.25,14,10),light,0,.71,.025);
   for(const side of [-1,1]){
    add(g,new T.SphereGeometry(.05,8,6),eyes,side*.095,.73,.225);
    const ear=add(g,new T.ConeGeometry(.09,.20,8),wool,side*.17,.95,0);
    ear.rotation.z=-side*.18;
   }
   add(g,new T.SphereGeometry(.055,10,7),gold,0,.59,.255);
   const halo=add(g,new T.TorusGeometry(.36,.034,6,26),cage,0,.60,0);
   halo.rotation.x=Math.PI/2;
   npcs.push({r,g,halo,body,head,offset:i*2.2});
  }
  function beacon(x,y,z,title,color){
   const g=at(x,y,z,title);
   const base=add(g,new T.CylinderGeometry(.42,.51,.14,12),mat(0x325767),0,.09,0);
   const ring=add(g,new T.TorusGeometry(.43,.057,8,28),fx(color),0,.32,0);
   ring.rotation.x=Math.PI/2;
   const prism=add(g,new T.OctahedronGeometry(.27,1),mat(color,.5),0,.8,0);
   const stripe=add(g,new T.TorusGeometry(.29,.035,6,28),fx(color),0,.8,0);
   stripe.rotation.x=Math.PI/2;
   const p={g,ring,prism,stripe,base};props.push(p);return p;
  }
  if(m.id===0){
   for(const id of m.relays){
    const r=s.map.runes[id];
    const signal=beacon(r.x,r.y-.91,r.z,'BALIZA DE RESCATE',0x8cfbe6);
    signal.relay=id;
   }
  }
  if(m.id===1){
   const reactor=beacon(m.reactor.x,m.reactor.y,m.reactor.z,'CORAZÓN DEL MUNDO',0x69f9ef);
   reactor.reactor=true;
   const core=add(reactor.g,new T.SphereGeometry(.22,20,12),mat(0x8dfbff,.72),0,1.02,0);core.scale.set(.9,1.16,.9);
  }
  if(m.id===2){
   for(const f of m.fragments){
    const beaconShard=beacon(f.x,f.y-.65,f.z,'FRAGMENTO ROBADO',0xffcb68);
    beaconShard.fragment=f;
   }
  }
  const exit=beacon(m.exit.x,m.exit.y,m.exit.z,'PORTAL DE EXTRACCIÓN',0xc7acff);
  exit.exit=true;
  const tower=new T.Group();exit.g.add(tower);tower.position.y=1.10;
  add(tower,new T.TorusGeometry(.57,.08,9,32),fx(0xc7acff),0,.35,0);
  function update(game,dt,elapsed){
   const data=game?.mission;if(!data)return;
   for(const n of npcs){
    n.g.visible=!n.r.rescued;
    if(n.g.visible){n.head.position.y=.71+Math.sin(elapsed*2.7+n.offset)*.035;
      n.halo.rotation.z=elapsed*.78+n.offset;
      n.halo.material.opacity=.5+.24*Math.sin(elapsed*3+n.offset)}
   }
   for(const p of props){
    if(p.exit){p.g.visible=data.exit.active;continue}
    if(p.relay){p.g.visible=!game.map.runes[p.relay].restored}
    if(p.relay===0){p.g.visible=!game.map.runes[0].restored}
    if(p.fragment){
     p.g.visible=p.fragment.dropped&&!p.fragment.claimed;
     p.g.position.set(p.fragment.x,p.fragment.y-.65,p.fragment.z);
    }
    if(p.reactor){
     const ratio=data.reactor.health/data.reactor.maxHealth;
     p.prism.material.emissiveIntensity=.2+.6*ratio;
     p.prism.scale.setScalar(.73+.27*ratio);
    }
    p.prism.rotation.y+=dt*.73;
    p.prism.position.y=.8+Math.sin(elapsed*2.5)*.12;
    p.stripe.rotation.z+=dt*.52;
    p.ring.rotation.z+=dt*.22;
   }
   exit.g.visible=data.exit.active;
   tower.rotation.y=elapsed*.77;
  }
  return {update,npcs,props,source:'native mission environment / 3d spatial'};
 }
 return {setup};
};
})(typeof window!=='undefined'?window:globalThis);
