/* MINI WORLDS: visible scenery must have real bodies, hits, clearance.
 * No camera/WebXR dependency; physics 60Hz and original platformer retained.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../mini-worlds-core.js'),M=require('../mini-worlds-missions.js');
const root=path.join(__dirname,'..'),load=n=>fs.readFileSync(path.join(root,n),'utf8');
function state(){const s=C.create(0);C.start(s);s.player.x=0;s.player.z=0;s.player.y=0;s.player.grounded=true;s.checkpoint={x:0,z:1.2,y:0};return s}
function tree(s,kind='tree',height=1.3){
 const o=C.addScenery(s,{x:1.48,z:0,y:0,radius:.26,height,kind});
 assert(o,'physical foliage test requires open, safe platform location');
 return o;
}
{
 const s=state(),o=tree(s);
 for(let i=0;i<105;i++)C.tick(s,{x:1,z:0},1/60);
 assert(s.player.x<=o.x-o.radius-.25+.02,'KAI must never move inside a visible trunk');
 assert(s.player.x>0,'KAI should move until he meets the tree');
 assert(s.player.grounded,'collision must not push KAI off his island');
}
{
 const s=state(),o=tree(s,'rock',.27);
 let jumped=false;
 for(let i=0;i<50;i++){
  C.tick(s,{x:1,z:0,jump:i===0},1/60);
  jumped ||=s.player.y>.28;
 }
 assert(jumped,'player must actually jump, not teleport');
 assert(s.player.x>o.x+.1,'a small rock should be jumpable by KAI');
}
{
 const s=state(),o=tree(s,'rock',.36);o.enabled=false;
 for(let i=0;i<48;i++)C.tick(s,{x:1,z:0},1/60);
 assert(s.player.x>o.x,'hidden decorative asset must not create an invisible wall');
}
{
 const s=state(),o=tree(s,'tree',1.7);s.player.face=Math.PI/2;
 C.attack(s);
 let hits=[];
 for(let i=0;i<40;i++){C.tick(s,{},1/60);hits.push(...C.drain(s))}
 assert(hits.some(e=>e.type==='spellHit'&&e.kind==='scenery'),'blaster shots must hit visible trees or rocks');
 assert.equal(s.magicShots.length,0,'bolt should not pass through and survive on other side');
}
{
 const s=state();tree(s,'tree',1.7);
 s.projectiles.push({x:0,y:.72,z:0,vx:3,vz:0,life:4});
 for(let i=0;i<52;i++)C.tick(s,{},1/60);
 assert.equal(s.projectiles.length,0,'enemy bullets must be physically stopped by boulders and trunks');
}
{
 const s=state();const e=s.map.enemies[0];
 s.map.enemies.forEach(o=>{o.alive=false});
 e.alive=true;e.type='patrol';e.x=1.5;e.z=0;e.baseX=e.x;e.baseZ=e.z;e.y=0;e.stun=6;
 for(let i=0;i<84;i++)C.tick(s,{x:1,z:0},1/60);
 assert(s.player.x<=e.x-.5+.02,'KAI must not walk through the body of an enemy');
 assert(s.player.hearts===3,'stunned monster must not deal ghost damage');
}
{
 const s=state();M.init(s,0);
 assert.equal(C.addScenery(s,{x:s.mission.rescues[0].x,z:s.mission.rescues[0].z,y:0,radius:.4,height:2,kind:'tree'}),null,'rescue path must not be blocked');
 assert.equal(C.addScenery(s,{x:s.map.runes[0].x,z:s.map.runes[0].z,y:0,radius:.4,height:2,kind:'rock'}),null,'shootable beacon must not be blocked');
 assert.equal(C.addScenery(s,{x:0,z:1.2,y:0,radius:.3,height:1.5,kind:'tree'}),null,'a player must not spawn inside a tree');
}
{
 const core=load('mini-worlds-core.js'),runtime=load('mini-worlds-runtime.js'),art=load('mini-worlds-art.js');
 const premium=load('mini-worlds-premium.js'),kenney=load('mini-worlds-assets.js'),kaykit=load('mini-worlds-kaykit.js');
 assert(core.includes('function solveScenery')&&core.includes('function addScenery'));
 assert(runtime.includes('stage.registerSolid=')&&runtime.includes('stage.syncSolids?.()'),'visual and physical obstacle states must match each tick');
 assert(art.includes('nativeSolids.push')&&art.includes('obj:platforms[i].userData.ruins'),'trunks, rocks and columns share world geometry');
 assert(premium.includes('stage.registerSolid?.('),'premium Quaternius models must be solid');
 assert(kaykit.includes('stage.registerSolid?.('),'real KayKit GLBs must be solid');
 assert(kenney.includes('stage.registerSolid'),'Kenney fallback foliage must be solid');
 assert(!runtime.includes('stage.root.position.set(def.x'),'an imported obstacle must not move the WebXR anchor');
}
console.log('MINI WORLDS solid world: tree/rock/monster collision, jump-over, occluded no-ghosts, solid shots, rescue clearance, 3 GLB layers: PASS');
