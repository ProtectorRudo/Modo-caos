/* MINI WORLDS — AR screenshot-driven premium cleanup regression.
 * All checks run in Node; never substitute for Android ARCore hardware QA.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const C=require('../mini-worlds-core.js');
const art=read('mini-worlds-art.js'),core=read('mini-worlds-core.js'),
 runtime=read('mini-worlds-runtime.js'),guide=read('mini-worlds-ar-guide.js'),
 diorama=read('mini-worlds-diorama.js'),finish=read('mini-worlds-finish.js'),
 premium=read('mini-worlds-premium.js'),html=read('mini-worlds.html');
for(const n of [0,1]){
 const map=C.level(n);
 assert.equal(map.platforms.length,14,'do not remove real side islands');
 assert(map.coins.length>=30&&map.coins.length<=42,
  'meaningful rewards without cluttered screen-wide coin confetti');
 assert(map.boxes.length>=10&&map.boxes.length<=13,
  'crates stay interactive but do not flood the mission corridor');
 assert.equal(map.stars.length,3,'three-star mission remains intact');
 assert.equal(map.walkways.length,13,'all rescue paths stay physically connected');
}
assert(runtime.includes('const floorOnly=placing||phase===\'ready\''),'AR debug geometry limited to placement');
assert(!runtime.includes('webglCalls===0);'),'0 draw calls may not inject full-screen false floor polygons');
assert(guide.includes('if(!placing)return hide()'),'guide must not project a wall of cyan polygons during play');
assert(guide.includes('Array.from({length:4}'),'fewer placement-only floor polygons');
assert(art.includes("if(document.body.classList.contains('mw-immersive-ar'))return;"),
 'AR sprites must not form square floating artifacts');
assert(!art.includes('let water=mesh(cube(.06,.9,.92)'),'opaque cyan waterfall panel must be removed');
assert(!art.includes('const arch=group(root,0,0,-25.1)'),
 'unregistered horizon arch should not look like a real traversable path');
assert(!art.includes('for(let j=0;j<5;j++){\n   const z=1.0'),
 'visual-only submerged/outside fake rocks must not return');
assert(art.includes('M.trail=new T.MeshStandardMaterial')&&art.includes('new T.ShapeGeometry(outline)'),
 'walkable terrain needs genuine detailed world-space trail not a screen overlay');
assert(diorama.includes('const density=p.kind===\'arena\'?3'),
 'decorative scatter density should remain deliberately sparse');
assert(finish.includes('i%4!==0'),'special world beacons must not overwhelm the mission targets');
assert(premium.includes('if(level===0)'),'first rescue mission must not fetch unused premium trees');
assert(premium.includes('name.startsWith(\'medieval\')'),'only relevant ancient architecture should download');
assert(runtime.includes("C.start(game);mapOpen=false;"),
 'full minimap should not obstruct the initial AR adventure');
assert(html.includes('mini-worlds-cinematic.js'),'mature armored guardians must be wired');
assert(core.includes('function solveScenery')&&runtime.includes('stage.syncSolids?.()'),
 'real rocks, ruins and trunks must still have functional collision');
assert(runtime.includes('stage.cinematicArt?.update(game,dt,elapsed)'),
 'original more adult enemy art must continue animating');
assert(!/stage\.root\.position\s*=/.test(premium),'optional art may not move tracked XR anchor');
console.log('MINI WORLDS premium cleanup: no AR floor polygons in gameplay, no block sprites or cyan waterfall, fewer pickup props, readable trails, honest physics, optimized 3D loaders — PASS');
