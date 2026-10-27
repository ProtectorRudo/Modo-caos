/* MINI WORLDS — Screenshot feedback regression: no balloon trees, honest solid props.
 * This complements physics integration and renderer smoke tests; it is not
 * a claim of real-world WebXR validation on Android hardware.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const src=p=>fs.readFileSync(path.join(base,p),'utf8');
const art=src('mini-worlds-art.js'),premium=src('mini-worlds-premium.js'),
  assets=src('mini-worlds-assets.js'),runtime=src('mini-worlds-runtime.js'),
  core=src('mini-worlds-core.js'),cinematic=src('mini-worlds-cinematic.js');
assert(art.includes('ANCIENT CYPRESS · compact narrow crown'),
 'native broadleaf/palm toy geometry must be replaced by compact cypress');
assert(art.includes('i%3===1'),'limit rooted full-height trees along the actual journey');
assert(!art.includes('for(let i=0;i<22;i++)'),'ban mass decorative cliff boulders without collision');
assert(!assets.includes("flora('tree-detailed'"),'giant Kenney round broadleaf must never be placed');
assert(!assets.includes("flora('tree-palm"),'Kenney palm silhouettes should not stack on native trees');
assert(!premium.includes("['canopyA','canopyB'"),'Quaternius round canopies must not render');
assert(premium.includes('Deliberately no Quaternius broadleaf spheres'));
assert(premium.includes("place('shrub'"),'use restrained low premium foliage');
assert(assets.includes('getSize(size)')&&assets.includes('Math.max(size.x,size.z)'),
 'stone GLBs should have hitboxes based on physical mesh footprint');
assert(!assets.includes("pick('cliff-waterfall-rock'"),'large ghost-waterfall boulder is banned');
assert(core.includes('function addScenery')&&core.includes('function solveScenery'));
assert(runtime.includes('stage.registerSolid=')&&runtime.includes('stage.syncSolids?.()'),
 'render and physics state should be coupled');
assert(runtime.includes('stage.cinematicArt=window.MiniWorldsCinematic?.(T).setup(stage,level)'),
 'cinematic guardian model must be available');
assert(runtime.includes('MiniWorldsCharacters&&!stage.cinematic'),
 'old giant-eyed purple Cute Monsters must not replace mature sentinels');
assert(cinemaCompatible(cinematic),'new enemy art is genuinely sculpted');
function cinemaCompatible(s){return s.includes('function makeGuardian(')&&s.includes('material(\'black-iron\'')}
const C=require('../mini-worlds-core.js'),M=require('../mini-worlds-missions.js');
{
 const s=C.create(0);M.init(s,0);C.start(s);
 // An honest, physically present rock stops KAI on ordinary platforms.
 s.map.enemies.forEach(e=>e.alive=false);
 const p=s.player;p.x=0;p.z=0;p.y=0;p.grounded=true;
 const rock=C.addScenery(s,{x:1.4,y:0,z:0,radius:.40,height:.85,kind:'rock'});
 assert(rock);
 for(let k=0;k<110;k++)C.tick(s,{x:1,z:0},1/60);
 assert(p.x<=rock.x-rock.radius-.25+.025,'a large rock must stop ordinary joystick walking');
 rock.enabled=false;
 for(let k=0;k<45;k++)C.tick(s,{x:1,z:0},1/60);
 assert(p.x>rock.x,'disabled/removed mesh must not leave ghost solid behind');
}
console.log('MINI WORLDS anti-toy solid world: minimal narrow trees, no legacy giant broadleaf, real mesh-body stones, physical collision and cinematic guardian fallback: PASS');
