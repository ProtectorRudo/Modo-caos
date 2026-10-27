/* Screenshot-driven regression for premium Mini Worlds AR visuals.
 * This checks source contracts and simulation, not real AR hardware output.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),src=n=>fs.readFileSync(path.join(root,n),'utf8');
const art=src('mini-worlds-art.js'),runtime=src('mini-worlds-runtime.js'),
 mission=src('mini-worlds-mission-art.js'),cinematic=src('mini-worlds-cinematic.js'),
 html=src('mini-worlds.html'),core=src('mini-worlds-core.js');
assert(art.includes("o.name='MW_LARGE_TRANSPARENT_OCEAN_DEMO_ONLY'"),
 'large shader plane needs a specific safety label');
assert(runtime.includes("if(mode==='ar'){")&&runtime.includes('stage.ocean.o.visible=false'),
 'Android AR must not render giant alpha ocean over camera');
assert(runtime.includes('stage.shoreFoam.visible=false'),
 'translucent decorative horizon foam must be hidden along with AR water');
assert(runtime.includes("view.background=mode==='ar'?null"),
 'Android XR must retain passthrough transparency');
assert(!/stage\.root\.position\s*=/.test(runtime),
 'cosmetic improvements must not move fixed WebXR anchor');
assert(art.includes('new T.ShapeGeometry(outline)'),
 'stone route must be an organic ground-trail instead of an empty dark circle');
assert(!art.includes('new T.CircleGeometry(1,32)'),
 'old oversized circular ground stains must not return');
assert(art.includes("M.wood.map=groundTexture('wood',644)")&&
       art.includes('M.stone.map=groundTexture(\'stone\',942)'),
 'mineral and timber need shared crisp grain');
assert(art.includes('new T.CanvasTexture(c)')&&art.includes('c.width=512'),
 'texture atlas generation must remain mobile friendly and sharp');
assert(art.includes('heroShadow.material.opacity=.13'),
 'contact shadows must be subtle and not create giant black pools');
assert(cinematic.includes('const scale=heavy?1.12'),
 'guardian silhouettes must be visibly scaled and readable');
assert(cinematic.includes("mesh(armor,'box',bronze,0,.065,.308"),
 'enemies should have real dimensional chest armor details');
assert(mission.includes('const lead=data.rescues.find'),
 'only the current required rescue target gets the attention marker');
assert(mission.includes('n.marker.visible=focused'),
 'unnecessary markers should not compete with live missions');
assert(mission.includes('new T.BoxGeometry(.24,.32,.16)'),
 'survivors are outfitted explorers rather than featureless blobs');
assert(html.includes('PREMIUM PHONE HUD / screenshot regression'),
 'small-phone warnings should be compact');
assert(html.includes('max-width:min(310px,76vw)'),
 'warnings cannot use full-screen large type during fights');
assert(runtime.includes('stage.syncSolids?.()')&&core.includes('function solveScenery'),
 'real physical colliders remain present and synced');
assert(runtime.includes('const floorOnly=placing||phase===\'ready\''),
 'floor guide stays disabled during active gameplay');
const C=require('../mini-worlds-core.js');
for(let n=0;n<2;n++){
 const game=C.create(n);C.start(game);
 assert.equal(game.map.stars.length,3);
 assert.equal(game.map.walkways.length,13);
 assert(game.map.coins.length>=25);
 const old={...game.player};
 for(let i=0;i<45;i++)C.tick(game,{x:0,z:0},1/60);
 assert(Number.isFinite(game.player.x)&&Number.isFinite(game.player.z));
}
console.log('MINI WORLDS cinematic mobile AR: translucent plane safe mode, natural trails, sharper PBR, focused rescues, compact HUD and core regressions PASS');
