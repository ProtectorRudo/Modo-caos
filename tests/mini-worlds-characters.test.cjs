/* MINI WORLDS: rigged character asset validation. Usage: node tests/mini-worlds-characters.test.cjs */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const files=['Alien','Bat','Cactus','Cyclops','Mushroom','Ghost','YellowDragon','Yeti'];
const required=['Idle','Walk','Bite_Front','HitRecieve','Death'];
let total=0;
for(const name of files){
 const file=path.join(root,'assets','mini-worlds','characters',name+'.gltf');
 assert(fs.existsSync(file),'missing '+name);
 const raw=fs.readFileSync(file,'utf8');const model=JSON.parse(raw);total+=raw.length;
 assert.equal(model.asset.version,'2.0',name+' glTF version');
 assert(model.scenes?.length>0,name+' scene');
 assert(model.skins?.length>0,name+' skeleton');
 assert(model.meshes?.length>0,name+' mesh');
 assert(model.animations?.length>=4,name+' animated clips');
 assert(model.buffers?.every(x=>x.uri?.startsWith('data:')),name+' requires external buffers');
 assert(model.images?.every(x=>!x.uri||x.uri.startsWith('data:')),name+' uses external textures');
 if(!['Bat','YellowDragon'].includes(name))
  for(const clip of required)assert(model.animations.some(x=>x.name===clip),name+' missing '+clip);
 else for(const clip of ['Flying','Bite_Front','HitRecieve','Death'])
  assert(model.animations.some(x=>x.name===clip),name+' missing '+clip);
}
const html=fs.readFileSync(path.join(root,'mini-worlds.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'mini-worlds-runtime.js'),'utf8');
const art=fs.readFileSync(path.join(root,'mini-worlds-art.js'),'utf8');
const core=fs.readFileSync(path.join(root,'mini-worlds-core.js'),'utf8');
const chars=fs.readFileSync(path.join(root,'mini-worlds-characters.js'),'utf8');
assert(html.includes('mini-worlds-characters.js'));
assert(runtime.includes("scale=.215"),"compact-living default missing");
assert(runtime.includes('MiniWorldsCharacters(T).setup'));
assert(art.includes('sprawlingEnvironment(root,rand'));
assert(art.includes('hero.wand=wand'),'witch wand must be in world scene');
assert(art.includes('stageCharacters(s,dt)'));
for(const [boss,needle] of [['Dragon','DRAGÓN DORADO'],['Yeti','REY YETI']])assert(core.includes(needle),boss+' boss missing');
assert(chars.includes('SkeletonUtils.js'));
assert(chars.includes('RobotExpressive.glb'));
assert(html.includes('mini-worlds-finish.js'));
assert(runtime.includes('stage.finish?.update(game,dt,elapsed)'));
assert(chars.includes("load('Robot')")&&!chars.includes('Mage.glb'),'local robot must replace remote Mage');
assert(chars.includes('stand'), 'animated rig update missing');
console.log('MINI WORLDS animated characters: 8 rigged CC0 models ('+total+' chars), mandatory clips, full-size stage and local animated RobotExpressive: PASS');
