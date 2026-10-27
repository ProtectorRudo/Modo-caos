/* MINI WORLDS · mobile first game feel, no false auto kills,
 * proper obstacle interception, crisp PBR ground, curated CC0 3D visuals.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../mini-worlds-core.js');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function clean(s){
 for(const e of s.map.enemies)e.alive=false;
 for(const b of s.map.boxes)b.alive=false;
 for(const r of s.map.runes)r.restored=true;
 s.map.boss.alive=false;C.drain(s);return s;
}
{
 const s=clean(C.create(0));C.start(s);
 const p=s.player;p.x=0;p.z=1.2;p.y=0;p.face=Math.PI;
 const e=s.map.enemies[0];e.alive=true;e.type='patrol';e.x=.97;e.z=-3.40;e.baseX=e.x;e.baseZ=e.z;e.y=0;e.hp=2;e.stun=3;
 assert(C.attack(s),'a single tap must fire');
 assert.equal(s.magicShots.length,1);
 const q=s.magicShots[0];
 assert(q.dx>.10&&q.dz<-.94,'subtle forward aim assist must steer toward target');
 assert.equal(p.lastShotAim.kind,'enemy');
 let got=false;for(let k=0;k<75;k++){C.tick(s,{},1/60);got||=C.drain(s).some(e=>e.type==='enemyHit')}
 assert(got,'assisted shot must actually collide with enemy instead of faking it');
}
{
 const s=clean(C.create(0));C.start(s);
 const p=s.player;p.x=0;p.z=1.2;p.y=0;p.face=Math.PI;
 const e=s.map.enemies[0];e.alive=true;e.x=4.0;e.z=-2.4;e.y=0;e.baseX=e.x;e.baseZ=e.z;e.stun=4;
 C.attack(s);const q=s.magicShots[0];
 assert(Math.abs(q.dx)<.02,'foe far off-angle must not receive a cheating 90 degree autoaim');
 assert.equal(p.lastShotAim,null,'no lock for target outside 28 degree forward cone');
}
{
 const s=clean(C.create(0));C.start(s);
 const p=s.player;p.x=0;p.z=1.2;p.y=0;p.face=Math.PI;
 const e=s.map.enemies[0];e.alive=true;e.x=.5;e.z=-3.5;e.y=0;e.baseX=e.x;e.baseZ=e.z;e.hp=4;e.stun=4;
 const b=s.map.boxes[0];b.alive=true;b.x=.24;b.z=-1.0;b.hp=1;
 C.attack(s);let hits=[];
 for(let k=0;k<75;k++){C.tick(s,{},1/60);hits.push(...C.drain(s))}
 assert(hits.some(x=>x.type==='boxBreak'),'shot must hit obstacle on its real path');
 assert(!hits.some(x=>x.type==='enemyHit'),'aim assist must NOT shoot through the box');
}
{
 const art=src('mini-worlds-art.js'),runtime=src('mini-worlds-runtime.js'),
  html=src('mini-worlds.html'),pack=src('mini-worlds-kaykit.js'),diorama=src('mini-worlds-diorama.js');
 assert(art.includes('c.width=512;c.height=512'),'ground texture needs retina-quality 512px');
 assert(!art.includes('c.width=128;c.height=128'),'pixelated 128px floor texture should be replaced');
 assert(art.includes('t.anisotropy=4'),'texture must sample cleanly at AR angles');
 assert(art.includes('hero.blaster.rotation.y'),'muzzle must visually acknowledge assisted aim');
 assert(pack.includes('8cd9d76b3bf5eddaec7d4ba88f0d1c0547a312dc'),'GLB source must be pinned');
 assert(pack.includes('KayKit Forest Nature Pack')&&pack.includes('CC0'),'upstream CC0 provenance must travel with code');
 assert(pack.includes('forest.glb')&&pack.includes('await (await loader()).loadAsync(URL)'),'actual GLB must be used, not a placeholder');
 assert(pack.includes('const added=[]')&&pack.includes('stage.disposeKayKit'),'optional models must dispose on restart');
 assert(pack.includes('stage.pocket?.reindex()'),'new meshes must enter correct spatial room without moving anchors');
 assert(diorama.includes('stage.kaykitDecor'),'KayKit assets must participate in protagonist occlusion cutaway');
 assert(!pack.includes('stage.root.position')&&!pack.includes('navigator.xr'),'optional models must never move world anchors');
 assert(html.includes('mini-worlds-kaykit.js')&&runtime.includes('MiniWorldsKayKit(T).decorate(stageRef,level)'),'entrypoint must use the new sourced assets');
 assert(runtime.includes('stage.disposeKayKit?.()'),'cleanup in stage transitions and AR teardown');
}
{
 const M=require('../mini-worlds-missions.js');
 const s=C.create(0);M.init(s,0);C.start(s);
 let nav=M.guidance(s);
 assert(nav?.label.startsWith('RESCATÁ A '),'initial mission should direct towards a real villager');
 assert(['↑','↗','→','↘','↓','↙','←','↖'].includes(nav.arrow));
 for(const r of s.mission.rescues.slice(0,2))r.rescued=true;
 nav=M.guidance(s);assert.equal(nav.label,'ACTIVÁ LA BALIZA','the guidance must switch to the next actual mechanism');
 s.mission.relays.forEach(id=>s.map.runes[id].restored=true);
 s.mission.exit.active=true;
 nav=M.guidance(s);assert.equal(nav.label,'ENTRÁ AL PORTAL');
}
{
 const M=require('../mini-worlds-missions.js');
 const s=C.create(1);M.init(s,1);C.start(s);
 let nav=M.guidance(s);assert(nav?.label==='PROTEGÉ EL REACTOR'||nav?.label==='DETENÉ AL INVASOR');
 const run=src('mini-worlds-runtime.js'),html=src('mini-worlds.html');
 assert(html.includes('id="missionHint"'),'next-goal directional hint must be visible');
 assert(run.includes('const nav=M.guidance(game)'),'runtime must use live mission coordinates');
 assert(run.includes("stage.disposeKayKit?.()"),'real imported meshes must be freed during retry');
 assert(run.includes('async function shareResult()'),'shareable medal must require voluntary action');
 assert(run.includes("action:shareResult"),'result sharing must be accessible from victory');
 assert(!run.includes('window.open("https://wa.me/'),'no unsolicited external sharing on any game event');
}
console.log('MINI WORLDS game feel: physically honest forward aim, obstacle interception, 512px crisp ground, KayKit CC0 GLB, loading fallback & occlusion: PASS');
