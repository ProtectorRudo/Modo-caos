/* MINI WORLDS — world-anchored mission visuals; always optional to physics.
 * Every mesh is added BEFORE the pocket world-room indexer runs.
 */
(function(root){
'use strict';
root.MiniWorldsMissionArt=function(T){
 function setup(stage,s){
  if(!stage?.worldRoot||!s?.mission)return null;
  const world=stage.worldRoot,m=s.mission,npcs=[],props=[],lights=[];
  const tints=[0x5b9f99,0xc39a69,0x7187a5,0x788c86];
  const mat=(c,glow=.0)=>new T.MeshStandardMaterial({color:c,metalness:.14,roughness:.38,emissive:c,emissiveIntensity:glow});
  const fx=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.82,depthWrite:false,blending:T.AdditiveBlending});
  const light=mat(0xdacbb2),eyes=mat(0x162632),cap=mat(0x3a4d50),gold=mat(0xc39d68,.12),cage=fx(0x65b8b2);
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
   const head=add(g,new T.SphereGeometry(.185,16,12),light,0,.73,.025);
   // Utility gear makes survivors look like explorers, not infant plushies.
   const vest=add(g,new T.CylinderGeometry(.19,.23,.33,7),cap,0,.32,.01);
   const buckle=add(g,new T.BoxGeometry(.18,.065,.05),gold,0,.22,.22);
   const hood=add(g,new T.CylinderGeometry(.205,.18,.23,9),cap,0,.88,-.036);
   // Rescue survivors read as expedition members rather than plush mascots:
   // copper visor and a small real backpack, all in the anchored 3D world.
   add(g,new T.BoxGeometry(.27,.075,.09),gold,0,.77,.184);
   add(g,new T.BoxGeometry(.24,.32,.16),cap,0,.38,-.22);
   add(g,new T.BoxGeometry(.26,.045,.10),gold,0,.38,-.322);
   for(const side of [-1,1]){
    add(g,new T.BoxGeometry(.11,.17,.19),cap,side*.13,.07,.06);
    add(g,new T.BoxGeometry(.07,.20,.08),gold,side*.21,.36,.01);
   }
   for(const side of [-1,1]){
    add(g,new T.SphereGeometry(.027,8,6),eyes,side*.087,.74,.215);
    const strap=add(g,new T.BoxGeometry(.07,.23,.07),gold,side*.19,.47,.08);
    strap.rotation.z=-side*.1;
   }
   add(g,new T.BoxGeometry(.055,.04,.03),gold,0,.61,.232);
   const halo=add(g,new T.TorusGeometry(.40,.04,7,28),cage,0,.59,0);
   halo.rotation.x=Math.PI/2;
   // Rescue targets must be noticeable from a phone-sized screen.
   // The glowing locator floats above the actual grounded character.
   const marker=add(g,new T.ConeGeometry(.16,.34,7),gold,0,1.45,0);
   marker.rotation.x=Math.PI;
   const markerHalo=add(g,new T.TorusGeometry(.18,.033,8,22),cage,0,1.72,0);
   markerHalo.rotation.x=Math.PI/2;
   const glow=add(g,new T.SphereGeometry(.135,16,10),mat(tints[i%4],.25),0,.37,0);
   glow.scale.set(1,.94,1);
   npcs.push({r,g,halo,body,head,marker,markerHalo,offset:i*2.2,celebrateAt:null});
  }
  function beacon(x,y,z,title,color){
   const g=at(x,y,z,title);
   const base=add(g,new T.CylinderGeometry(.42,.51,.14,12),mat(0x394b51),0,.09,0);
   const ring=add(g,new T.TorusGeometry(.48,.07,9,32),fx(color),0,.35,0);
   ring.rotation.x=Math.PI/2;
   // Compact bronze/stone pedestals make each activatable mechanic legible.
   for(const k of [-1,1]){
    add(g,new T.CylinderGeometry(.10,.14,.66,8),gold,k*.31,.49,0);
   }
   const prism=add(g,new T.OctahedronGeometry(.31,1),mat(color,.88),0,1.12,0);
   const stripe=add(g,new T.TorusGeometry(.34,.035,8,30),fx(color),0,1.13,0);
   stripe.rotation.x=Math.PI/2;
   const locator=add(g,new T.ConeGeometry(.10,.24,8),gold,0,1.94,0);
   locator.rotation.x=Math.PI;
   const p={g,ring,prism,stripe,base,locator};props.push(p);return p;
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
   const lead=data.rescues.find(r=>!r.rescued&&!r.optional)||
    data.rescues.find(r=>!r.rescued);
   for(const n of npcs){
    // The happy little villager bounces, twirls and rises before returning
    // to the town. Saving somebody must FEEL different from collecting a coin.
    if(n.r.rescued&&n.celebrateAt===null)n.celebrateAt=elapsed;
    const leaving=n.celebrateAt!==null,age=leaving?elapsed-n.celebrateAt:0;
    n.g.visible=!leaving||age<.93;
    if(n.g.visible){
      n.g.position.y=n.r.y+(leaving?Math.sin(Math.min(1,age/.93)*Math.PI)*.53:0);
      n.g.rotation.y=leaving?age*7.1:0;
      const pulse=leaving?1+Math.sin(Math.min(1,age/.93)*Math.PI)*.40:1;
      n.g.scale.setScalar(pulse);
      n.head.position.y=.71+Math.sin(elapsed*2.7+n.offset)*.035;
      n.halo.rotation.z=elapsed*.78+n.offset;
      n.halo.material.opacity=.5+.24*Math.sin(elapsed*3+n.offset);
      const focused=lead?.name===n.r.name;
      n.marker.visible=focused;
      n.markerHalo.visible=focused;
      n.marker.position.y=1.45+Math.sin(elapsed*3.3+n.offset)*.12;
      n.markerHalo.position.y=1.72+Math.sin(elapsed*3.3+n.offset)*.12;
      n.markerHalo.rotation.z=elapsed*1.3;}
   }
   for(const p of props){
    if(p.exit){p.g.visible=data.exit.active;continue}
    if(p.relay!==undefined)p.g.visible=!game.map.runes[p.relay].restored;
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
    p.prism.position.y=1.12+Math.sin(elapsed*2.5)*.13;
    p.locator.position.y=2.03+Math.sin(elapsed*2.9)*.12;
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
