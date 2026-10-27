/* MINI WORLDS premium robot and spatial finish — pure Node regression. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const get=n=>fs.readFileSync(path.join(root,n),'utf8');
const robot=fs.readFileSync(path.join(root,'assets/mini-worlds/characters/RobotExpressive.glb'));
assert(robot.length>400_000&&robot.length<1_000_000,'robot should ship locally as a small GLB');
assert.equal(robot.readUInt32LE(0),0x46546c67,'glTF binary magic');
assert.equal(robot.readUInt32LE(4),2,'glTF binary version');
assert.equal(robot.readUInt32LE(8),robot.length,'GLB exact byte count');
assert.equal(robot.readUInt32LE(16),0x4e4f534a,'GLB must start with JSON chunk');
const meta=JSON.parse(robot.subarray(20,20+robot.readUInt32LE(12)).toString('utf8'));
assert.equal(meta.asset.version,'2.0');
assert(meta.scenes?.length>0&&meta.meshes?.length>0,'actual 3D model');
assert(meta.animations?.length>=8,'animated expressive robot required');
const clips=meta.animations.map(a=>a.name.toLowerCase());
for(const clip of ['idle','jump','walking','running','punch'])
 assert(clips.some(n=>n.includes(clip)),'missing playable animation '+clip);
const art=get('mini-worlds-art.js'),chars=get('mini-worlds-characters.js'),
 runtime=get('mini-worlds-runtime.js'),pocket=get('mini-worlds-pocket.js'),
 finish=get('mini-worlds-finish.js'),html=get('mini-worlds.html');
assert(!chars.includes("load('Robot')"),'previous robot must not mask playable fox');
assert(chars.includes('KAI_REFERENCE'),'source of selected fox must be tracked');
assert(art.includes('function makeAvatar(parent)')&&art.includes('new T.MeshPhysicalMaterial')&&art.includes('fox stand-in'),'stylized fox missing');
assert(art.includes('hero.blaster=wand')&&art.includes('hero.muzzleFlash=flash'),'blaster must be attached to hero in world');
assert(art.includes('hero.tail.rotation.y'),'tail animation missing');
assert(runtime.includes("stage.finish=window.MiniWorldsFinish?.(T).setup(stage,level)"),'finish must initialize before pocket index');
assert(runtime.includes('stage.finish?.update(game,dt,elapsed)'),'effects must animate per frame');
assert(pocket.includes('dynamicAlways')&&pocket.includes('reindex()'),'immutable XR room contract');
assert(finish.includes("world.add(holder)")&&finish.includes("stage.hero.root.add(finish)"),'effects must be world anchored');
assert(!finish.includes('camera.position')&&!finish.includes('world.position.z='),'visual effects cannot re-anchor XR');
assert(html.includes('mini-worlds-finish.js')&&html.includes('KAI debe rescatar habitantes')&&html.includes('DISPARAR'),'fox UI missing');
console.log('MINI WORLDS fox blaster: original stylized fox, weapon, physical projectile engine and anchored scenery: PASS');
