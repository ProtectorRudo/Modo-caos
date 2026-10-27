/* Mini Worlds: new mature art direction without physics/XR regressions. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(base,name),'utf8');
class Vec {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 setScalar(v){this.x=v;this.y=v;this.z=v;return this}
}
class Group{
 constructor(){this.children=[];this.position=new Vec();this.scale=new Vec(1,1,1);this.rotation=new Vec();this.visible=true;this.userData={};this.parent=null}
 add(...children){for(const c of children){c.parent=this;this.children.push(c)}}
}
class Mesh extends Group{
 constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true}
}
class Geo{constructor(...arg){this.args=arg}}
class Mat{constructor(props){Object.assign(this,props)}}
const T={Group,Mesh,FrontSide:0,AdditiveBlending:2,
 MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,BoxGeometry:Geo,ConeGeometry:Geo,
 CylinderGeometry:Geo,OctahedronGeometry:Geo,IcosahedronGeometry:Geo,
 TorusGeometry:Geo,DodecahedronGeometry:Geo};
const ctx={window:{},Math,console};vm.runInNewContext(read('mini-worlds-cinematic.js'),ctx);
const art=ctx.window.MiniWorldsCinematic(T);
assert.equal(typeof art.setup,'function');
const stage={worldRoot:new Group(),hero:{head:new Group(),body:new Group(),wand:new Group()},
 enemies:Array.from({length:12},()=>new Group()),
 boss:{root:new Group(),torso:new Group()},
 map:{platforms:Array.from({length:16},(_,i)=>({x:0,y:i>6?.7:0,z:2-i*1.7,w:2.5,d:2.1})),
 enemies:Array.from({length:12},(_,i)=>({type:['patrol','flying','defender','thrower'][i%4],alive:true,flash:0}))}};
for(const e of stage.enemies)e.add(new Mesh(new Geo(),new Mat()));
stage.boss.root.add(stage.boss.torso);
const weak=new Mesh(new Geo(),new Mat()),aura=new Mesh(new Geo(),new Mat());
stage.boss.torso.add(weak,aura,new Mesh(new Geo(),new Mat()));stage.boss.weak=weak;stage.boss.aura=aura;
const logicalBefore=JSON.stringify(stage.map),anchorBefore={x:2,y:1,z:3};
const anchor=new Group();anchor.position.set(anchorBefore.x,anchorBefore.y,anchorBefore.z);
anchor.add(stage.worldRoot);
const fx=art.setup(stage,1);
assert(fx?.style==='cinematic-ancient-corruption','new art must be genuinely instantiated');
assert(stage.cinematic,'cute monster GLTF overrides must be disabled');
assert.equal(fx.guardians.length,stage.enemies.length,'every enemy needs a non-childish guardian silhouette');
assert(fx.heroParts.length>=7,'KAI needs actual shoulder/brow/body weapon art');
assert(fx.ornaments.length>=5,'temple and forest need physical-looking ancient visual landmarks');
assert(fx.boss?.root,'boss must be rearted');
for(const e of stage.enemies)assert(e.children[0].visible===false&&e.children.length>1,
 'hide childish creature, retain logical render group and add new armor');
fx.update({map:stage.map},1/60,1);
assert.equal(JSON.stringify(stage.map),logicalBefore,'visual system must not change map physics or combat');
assert.equal(anchor.position.x,anchorBefore.x);
assert.equal(anchor.position.y,anchorBefore.y);
assert.equal(anchor.position.z,anchorBefore.z);
const runtime=read('mini-worlds-runtime.js'),html=read('mini-worlds.html'),original=read('mini-worlds-art.js');
assert(runtime.includes('stage.cinematicArt=window.MiniWorldsCinematic?.(T).setup(stage,level)'));
assert(runtime.includes('stage.cinematicArt?.update(game,dt,elapsed)'),'new art should animate');
assert(runtime.includes('MiniWorldsCharacters&&!stage.cinematic'),'cute rig must never overwrite new real-time guardian art');
assert(html.includes('mini-worlds-cinematic.js'),'new visual module must be served by game page');
assert(!read('mini-worlds-cinematic.js').includes('stage.root.position'),'XR anchor must not move');
assert(!read('mini-worlds-cinematic.js').includes('player.x=')&&!read('mini-worlds-cinematic.js').includes('game.phase='),'visual FX may not mutate player');
assert(original.includes("const fur=new T.MeshPhysicalMaterial({color:0xb65d2c"),'fox should have richer, less juvenile material');
assert(original.includes('mesh(sphere(.109,18,12),eyeWhite'),'fox eye reduction should be genuine geometry change');
assert(html.includes('Ancient Vanguard'),'premium UI CSS must be loaded');
assert(read('mini-worlds-core.js').includes('function solveScenery'),'previous solid rock collisions must remain');
assert(read('mini-worlds-pocket.js').includes('const ROOMS=Object.freeze'),'two wide anchored sectors stay');
console.log('MINI WORLDS cinematic adventure: adult guardian silhouettes, hero armor, boss art, 6 world landmarks, no XR/physics mutation, palette + HUD PASS');
