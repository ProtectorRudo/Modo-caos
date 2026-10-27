/* MINI WORLDS — cinematic adventure art direction v1.
 * All geometry WORLD anchored, all additions visual-only. Logical collision
 * remains solely mini-worlds-core.js. Original material silhouettes; no
 * external copyrighted game assets. Uses pooled PBR materials and meshes.
 */
(function(root){
'use strict';
root.MiniWorldsCinematic=function(T){
 const TAU=Math.PI*2;
 const C={
  iron:0x283b45, steel:0x637780, basalt:0x46515a, stone:0x899089,
  bronze:0xae8352, copper:0xd9a56d, jade:0x46c3b0, ghost:0x80d9da,
  ember:0xd96b4f, shadow:0x192b36, gold:0xeac58d, moss:0x65775a
 };
 const materials={};
 function material(name,color,opts={}){
  if(!materials[name])materials[name]=new T.MeshStandardMaterial({
   color,metalness:opts.metal??.22,roughness:opts.rough??.67,
   emissive:opts.emissive??0x000000,emissiveIntensity:opts.glow??0,
   flatShading:!!opts.flat,side:opts.side??T.FrontSide
  });
  return materials[name];
 }
 const iron=material('black-iron',C.iron,{metal:.75,rough:.37});
 const steel=material('brushed-steel',C.steel,{metal:.7,rough:.41});
 const basalt=material('basalt',C.basalt,{flat:true,rough:.91});
 const stone=material('stone',C.stone,{flat:true,rough:.83});
 const bronze=material('bronze',C.bronze,{metal:.72,rough:.38});
 const copper=material('copper',C.copper,{metal:.70,rough:.31});
 const shadow=material('corruption',C.shadow,{metal:.34,rough:.56});
 const jade=material('signal-cyan',C.jade,{emissive:C.jade,glow:1.8,metal:.48,rough:.29});
 const scarlet=material('corruption-crimson',C.ember,{emissive:0x7b171c,glow:1.5,metal:.31,rough:.38});
 const gold=material('ancient-gold',C.gold,{metal:.82,rough:.30});
 const moss=material('lichen',C.moss,{rough:.93});
 const transparent=new T.MeshBasicMaterial({color:0x66ddcb,transparent:true,
  opacity:.37,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 const geo={
  box:new T.BoxGeometry(1,1,1), spire:new T.ConeGeometry(1,1,7),
  tapered:new T.CylinderGeometry(.66,.93,1,7),
  cylinder:new T.CylinderGeometry(1,1,1,10),
  octa:new T.OctahedronGeometry(1,0),
  shard:new T.OctahedronGeometry(1,1),
  ico:new T.IcosahedronGeometry(1,0),
  torus:new T.TorusGeometry(1,.10,7,24),
  plate:new T.DodecahedronGeometry(1,0)
 };
 function mesh(parent,key,mat,x,y,z,sx=1,sy=1,sz=1){
  const o=new T.Mesh(geo[key],mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);
  o.castShadow=false;o.receiveShadow=false;parent.add(o);return o;
 }
 function group(parent,x=0,y=0,z=0){
  const o=new T.Group();o.position.set(x,y,z);parent.add(o);return o;
 }
 function clearOld(host){
  if(!host)return;
  // Only hide the original gameplay mesh. The model group remains, so art
  // animation and logical collision coordinates stay exactly aligned.
  for(const o of host.children)o.visible=false;
 }
 function makeGuardian(host,type,seed){
  const flyer=type==='flying',heavy=type==='defender',caster=type==='thrower';
  const rig=group(host,0,0,0);
  const scale=heavy?1.08:flyer?.92:caster?.96:.90;
  rig.scale.setScalar(scale);
  const armor=group(rig,0,-.025,0);
  const chest=mesh(armor,'tapered',heavy?basalt:shadow,0,0,0,.35,.53,.30);
  chest.rotation.y=(seed%5-2)*.03;
  mesh(armor,'box',iron,0,-.29,.08,.39,.13,.31);
  const collar=mesh(armor,'tapered',steel,0,.34,0,.28,.20,.26);
  collar.rotation.z=.07;
  const head=mesh(armor,'octa',heavy?steel:iron,0,.53,.04,.245,.31,.23);
  mesh(armor,'box',scarlet,0,.51,.24,.23,.057,.027); // ominous single visor
  mesh(armor,'box',bronze,0,.48,.278,.12,.022,.018);
  for(const k of [-1,1]){
   const pauldron=mesh(armor,'plate',heavy?steel:basalt,k*.37,.22,-.035,.22,.16,.24);
   pauldron.rotation.z=k*.17;
   const arm=mesh(armor,'tapered',iron,k*.35,-.105,.015,.10,.36,.11);
   arm.rotation.z=k*.13;
   mesh(armor,'box',bronze,k*.38,-.34,.08,.145,.10,.17);
   const leg=mesh(armor,'tapered',iron,k*.14,-.50,-.03,.12,.28,.12);
   leg.rotation.x=k*.08;
   mesh(armor,'box',shadow,k*.14,-.71,.09,.17,.10,.23);
   if(heavy)mesh(armor,'spire',basalt,k*.42,.48,-.09,.11,.34,.13).rotation.z=-k*.42;
  }
  if(caster){
   const halo=mesh(armor,'torus',scarlet,0,.58,-.17,.31,.32,.16);
   halo.rotation.x=.34;mesh(armor,'octa',jade,0,.18,.35,.095,.13,.09);
  }
  if(flyer){
   rig.position.y=.29;
   for(const side of [-1,1]){
    const wing=mesh(armor,'box',steel,side*.43,.05,-.12,.40,.06,.25);
    wing.rotation.z=-side*.42;wing.rotation.y=side*.27;
    mesh(armor,'spire',scarlet,side*.80,.10,-.13,.09,.37,.13).rotation.z=-side*1.05;
   }
   for(const side of [-1,1])mesh(armor,'octa',jade,side*.20,-.52,0,.08,.10,.08);
  }
  if(heavy){
   mesh(armor,'box',gold,0,.05,.33,.27,.40,.055);
   mesh(armor,'octa',scarlet,0,.12,.39,.09,.13,.06);
  }
  return {rig,armor,flyer,seed};
 }
 function dressFox(stage){
  const hero=stage.hero,head=hero?.head,body=hero?.body,gun=hero?.wand;
  if(!head||!body||!gun)return [];
  const parts=[];
  // Explorer silhouette: brow armour, functional leather harness, backpack
  // and asymmetrical hardened shoulder plate. No oversized toy googly eyes.
  const brow=mesh(head,'box',bronze,0,.155,.267,.335,.055,.135);
  brow.rotation.x=-.10;parts.push(brow);
  for(const side of [-1,1]){
   const browSide=mesh(head,'box',iron,side*.24,.148,.22,.105,.055,.17);
   browSide.rotation.z=-side*.20;parts.push(browSide);
  }
  const armor=mesh(body,'tapered',iron,0,-.035,-.21,.34,.35,.21);
  armor.rotation.z=.025;parts.push(armor);
  for(const side of [-1,1]){
   const pauldron=mesh(body,'plate',side===-1?bronze:steel,side*.36,.16,0,.16,.14,.22);
   pauldron.rotation.z=-side*.18;parts.push(pauldron);
   const sash=mesh(body,'box',bronze,side*.12,-.17,.25,.095,.09,.075);parts.push(sash);
  }
  const pack=mesh(body,'box',iron,0,.03,-.34,.26,.33,.15);parts.push(pack);
  mesh(body,'box',gold,0,.06,-.43,.18,.055,.045);
  mesh(body,'octa',jade,0,.0,-.46,.068,.08,.06);
  const scarf=mesh(body,'box',bronze,0,.27,.17,.42,.07,.16);
  scarf.rotation.x=-.11;parts.push(scarf);
  // Multi-part energy carbine; upgrades geometry of the EXISTING weapon.
  const receiver=mesh(gun,'box',iron,0,-.02,.08,.17,.16,.36);
  mesh(gun,'box',steel,0,.077,.08,.18,.045,.30);
  mesh(gun,'cylinder',bronze,0,-.06,.31,.11,.18,.11).rotation.x=Math.PI/2;
  mesh(gun,'cylinder',iron,0,-.06,.48,.07,.14,.07).rotation.x=Math.PI/2;
  for(const side of [-1,1]){
   mesh(gun,'box',bronze,side*.13,-.017,.20,.026,.08,.18);
   mesh(gun,'octa',jade,side*.125,-.016,.34,.034,.045,.053);
  }
  const sight=mesh(gun,'box',steel,0,.117,.22,.055,.07,.11);
  sight.rotation.x=-.08;parts.push(sight);
  return parts;
 }
 function dressBoss(stage){
  const b=stage.boss;if(!b?.root)return null;
  // Keep original torso reference intact for existing hit/death animation.
  // Only replace childish crab shell with a distinctive ancient sentinel.
  const torso=b.torso;
  for(const mesh of torso?.children||[]){
   if(mesh!==b.weak&&mesh!==b.aura)mesh.visible=false;
  }
  const outer=group(b.root,0,.72,0);
  mesh(outer,'tapered',basalt,0,.20,0,.96,1.1,.70);
  mesh(outer,'box',iron,0,.67,.31,.91,.21,.43);
  mesh(outer,'octa',steel,0,1.12,.0,.68,.48,.53);
  mesh(outer,'box',scarlet,0,1.13,.51,.44,.075,.06);
  mesh(outer,'octa',jade,0,.30,.64,.26,.35,.10);
  mesh(outer,'box',bronze,0,-.23,.49,.80,.14,.24);
  for(const side of [-1,1]){
   const shoulder=mesh(outer,'plate',steel,side*.95,.65,-.08,.49,.50,.43);
   shoulder.rotation.z=side*.24;
   const arm=mesh(outer,'tapered',iron,side*1.08,-.29,.17,.30,.83,.30);
   arm.rotation.z=side*.17;
   mesh(outer,'box',basalt,side*.94,-.92,.33,.40,.22,.36);
   mesh(outer,'spire',bronze,side*.54,1.57,-.12,.16,.47,.17).rotation.z=side*.13;
   const foot=mesh(outer,'box',shadow,side*.47,-1.02,.11,.45,.30,.56);
   foot.rotation.y=side*.16;
  }
  const ancientRing=mesh(outer,'torus',gold,0,.17,-.60,.83,1.03,.69);
  ancientRing.rotation.x=.15;
  return {root:outer,ancientRing};
 }
 function decorateWorld(stage,level){
  const world=stage.worldRoot,out=[];
  const samples=stage.map?.platforms||[];
  const zone=level?{lamp:0x93a6bd,rock:basalt}:{lamp:0x45dbc2,rock:stone};
  const lorePositions=[0,3,5,8,10,13];
  for(let i=0;i<lorePositions.length;i++){
   const p=samples[lorePositions[i]];if(!p)continue;
   // Existing platforms provide safe physics. All decorative geometry
   // stays above/below the established surface, NOT a fake extra walkway.
   const side=i%2?-1:1;
   const x=p.x+side*(p.w*.43),z=p.z+(i%3===1?-.27:.25)*p.d;
   const monolith=group(world,x,p.y,z);
   monolith.name='ARCHEOLOGICAL SITE · physical ruins';
   // Only keep large scenery if its real collider can be registered.
   // This prevents both walk-through monuments and blocked escape routes.
   if(stage.registerSolid&&!stage.registerSolid(monolith,{x,y:p.y,z,height:1.03,radius:.20,kind:'column'})){
    world.remove(monolith);continue;
   }
   mesh(monolith,'tapered',basalt,0,.28,0,.27,.55,.30);
   mesh(monolith,'box',bronze,0,.52,0,.34,.057,.36);
   const obelisk=mesh(monolith,'octa',i%3===0?jade:gold,0,.82,0,.115,.25,.13);
   const engraving=mesh(monolith,'box',iron,0,.32,.30,.22,.19,.045);
   const rune=mesh(monolith,'octa',i%3===0?jade:scarlet,0,.33,.337,.085,.105,.035);
   const skirt=mesh(monolith,'tapered',stone,0,.035,0,.48,.16,.51);
   skirt.rotation.y=i*.21;
   out.push({obelisk,rune,monolith,phase:i*1.81});
  }
  // A few landmark torii-like ruins on the visible existing playing
  // islands. They are portals of atmosphere, NOT collidable fake terrain.
  for(const id of [5,11]){
   const p=samples[id];if(!p)continue;
   const z=p.z-p.d*.41;
   const g=group(world,p.x,p.y,z);
   g.name='TEMPLE RUIN · solid arch';
   // Both pillars must be reachable around their sides, not over rescue
   // NPCs or on connector walkways. If either collides with a required
   // route, discard the arch entirely and disable any registered base.
   const registered=[];
   if(stage.registerSolid){
    for(const k of [-1,1]){
     const physical=stage.registerSolid(g,{x:p.x+k*.64,y:p.y,z,
      radius:.19,height:1.45,kind:'column'});
     if(physical)registered.push(physical);
    }
    if(registered.length!==2){
     g.visible=false;registered.forEach(o=>o.enabled=false);
     world.remove(g);continue;
    }
   }
   for(const k of [-1,1]){
    mesh(g,'tapered',basalt,k*.64,.62,0,.20,1.23,.22);
    mesh(g,'box',bronze,k*.64,1.24,0,.31,.14,.32);
   }
   const arch=mesh(g,'box',stone,0,1.31,0,1.64,.24,.29);
   arch.rotation.z=.04;
   mesh(g,'box',iron,0,1.44,-.04,1.37,.060,.24);
   mesh(g,'octa',jade,0,1.08,.01,.18,.21,.14);
  }
  return out;
 }
 function setup(stage,level){
  if(!stage?.hero||!stage?.worldRoot)return null;
  stage.cinematic=true; // dynamically loaded cute rig pack must not override
  const heroParts=dressFox(stage),guardians=[];
  for(let i=0;i<stage.enemies.length;i++){
   const host=stage.enemies[i],e=stage.map.enemies[i];
   clearOld(host);
   guardians.push(makeGuardian(host,e.type,i));
  }
  const boss=dressBoss(stage);
  const ornaments=decorateWorld(stage,level);
  let frame=0;
  function update(game,dt,elapsed){
   // Visual animations; physics/AI/mission state are never mutated.
   if(++frame%2===0){
    for(let i=0;i<guardians.length;i++){
     const entry=guardians[i],e=game.map.enemies[i];
     entry.armor.rotation.z=e?.flash>0?.08*Math.sin(elapsed*35):Math.sin(elapsed*2.1+i)*.018;
     if(entry.flyer)entry.armor.rotation.y=Math.sin(elapsed*2.8+i)*.12;
    }
   }
   for(const o of ornaments){
    o.obelisk.rotation.y=elapsed*.55+o.phase;
    o.rune.scale.setScalar(.93+.07*Math.sin(elapsed*3+o.phase));
   }
   if(boss?.ancientRing)boss.ancientRing.rotation.z=elapsed*.35;
  }
  return {update,heroParts,guardians,ornaments,boss,style:'cinematic-ancient-corruption'};
 }
 return {setup};
};
})(typeof window!=='undefined'?window:globalThis);
