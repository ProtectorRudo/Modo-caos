/* MINI WORLDS: rescue -> defense -> heist -> village economy, deterministic Node tests. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../mini-worlds-core.js'),M=require('../mini-worlds-missions.js');
assert.equal(M.MISSIONS.length,3,'three meaningfully different missions must be selectable');
{
 const s=C.create(M.MISSIONS[0].level),m=M.init(s,0);C.start(s);
 assert.equal(s.map.boss.alive,false,'rescue run must not be auto-completed by killing a boss');
 s.player.x=m.exit.x;s.player.z=m.exit.z;s.player.y=m.exit.y;
 M.tick(s,1/60);assert.equal(s.phase,'playing','exit locked without rescue and relays');
 for(const r of m.rescues.slice(0,2)){
  s.player.x=r.x;s.player.z=r.z;s.player.y=r.y;
  M.tick(s,1/60);assert(r.rescued,'resident must be physically rescued');
 }
 assert.equal(M.drain(s).filter(e=>e.type==='missionRescue').length,2);
 s.player.x=m.exit.x;s.player.z=m.exit.z;s.player.y=m.exit.y;M.tick(s,1/60);
 assert.equal(s.phase,'playing','cannot leave without blaster relay puzzle');
 s.map.runes[0].restored=true;s.map.runes[1].restored=true;M.tick(s,1/60);
 assert.equal(s.phase,'won','rescuing two inhabitants and powering relays opens extraction');
 assert.equal(M.medal(s),2,'optional last rescue must award a second star');
 assert.equal(M.drain(s).filter(e=>e.type==='missionWin').length,1,'win only once');
 M.tick(s,1/60);assert.equal(M.drain(s).filter(e=>e.type==='missionWin').length,0);
}
{
 const s=C.create(0),m=M.init(s,0);C.start(s);
 for(const r of m.rescues){s.player.x=r.x;s.player.z=r.z;s.player.y=r.y;M.tick(s,1/60)}
 m.relays.forEach(id=>s.map.runes[id].restored=true);
 s.clock=149;s.player.x=m.exit.x;s.player.y=m.exit.y;s.player.z=m.exit.z;M.tick(s,1/60);
 assert.equal(M.medal(s),3,'optional rescue plus good time grants a perfect rescue medal');
}
{
 const s=C.create(M.MISSIONS[1].level),m=M.init(s,1);C.start(s);M.tick(s,1/60);
 assert.equal(m.wave,1,'defense starts first real wave immediately');
 assert.equal(s.map.enemies.filter(e=>e.alive).length,3,'first wave must activate actual combat enemies');
 assert.equal(s.map.boss.alive,false);
 const e=s.map.enemies[0];e.x=m.reactor.x;e.z=m.reactor.z;e.stun=0;
 const before=m.reactor.health;M.tick(s,1/60);
 assert.equal(m.reactor.health,before-1,'enemy reaching reactor must deal real damage');
 assert(M.drain(s).some(e=>e.type==='missionReactorHit'));
 m.reactor.health=1;e.x=m.reactor.x;e.z=m.reactor.z;e.stun=0;
 M.tick(s,1/60);assert.equal(s.phase,'failed','destroyed reactor loses the mission');
 assert(M.drain(s).some(e=>e.type==='missionFail'));
}
{
 const s=C.create(1),m=M.init(s,1);C.start(s);
 s.clock=65.02;s.player.x=m.exit.x;s.player.z=m.exit.z;s.player.y=m.exit.y;
 M.tick(s,1/60);
 assert.equal(s.phase,'won','65s survival and return to the core completes defense');
 assert.equal(m.wave,3);assert.equal(M.medal(s),3,'perfect defense deserves best rank');
}
{
 const s=C.create(1),m=M.init(s,2);C.start(s);
 assert.equal(m.fragments.length,3);
 M.tick(s,1/60);assert(s.map.boss.invuln>=1,'boss locked until stolen fragments recovered');
 for(const f of m.fragments){
  const enemy=s.map.enemies[f.id];enemy.alive=false;
  s.player.x=enemy.x;s.player.z=enemy.z;s.player.y=C.platformY(s,enemy.x,enemy.z)||0;
  M.tick(s,1/60);
  assert(f.dropped&&f.claimed,'vanquishing a thief must drop a physically collectable fragment');
 }
 assert(m.fragments.every(f=>f.claimed)&&m.exit.active,'all three real fragments unlock boss');
 assert.equal(s.map.boss.invuln,0);
 s.phase='won';M.tick(s,1/60);
 assert(m.completed,'boss defeat must finalize completed heist');
 assert.equal(M.drain(s).filter(e=>e.type==='missionWin').length,1);
}
{
 const s=C.create(),m=M.init(s,0);C.start(s);s.clock=m.seconds+.01;M.tick(s,1/60);
 assert.equal(s.phase,'failed','mission time limit is an actual losing condition');
}
{
 const root=path.join(__dirname,'..'),get=n=>fs.readFileSync(path.join(root,n),'utf8');
 const runtime=get('mini-worlds-runtime.js'),html=get('mini-worlds.html'),art=get('mini-worlds-mission-art.js');
 const pocket=get('mini-worlds-pocket.js'),core=get('mini-worlds-core.js');
 for(const id of ['villageGrid','villageCount','missionGoal','missionReactor','readyCopy'])
  assert(html.includes('id="'+id+'"'),'missing mission or village UI '+id);
 assert(html.includes('mini-worlds-missions.js')&&html.includes('mini-worlds-mission-art.js'));
 assert(runtime.includes('M.init(game,missionId)')&&runtime.includes('M.tick(game,1/60)'),'mission engine must run from fixed timestep');
 assert(runtime.includes('progress.missions.residents')&&runtime.includes('localStorage'),'village must persist');
 assert(runtime.includes('stage.missionVisual?.update(game,dt,elapsed)'),'mission art must animate');
 assert(runtime.includes('M.medal(game)')&&runtime.includes('function defeat(reason)'),'victory and failure must show meaningful feedback');
 assert(art.includes('world.add(g)')&&art.includes('RESCATE'),'rescue characters must inhabit logical world');
 assert(!art.includes('camera.position')&&!art.includes('stage.root.position'),'mission art must not move anchored AR');
 assert(pocket.includes('dynamicAlways')&&core.includes('function updateMagicShots'),'old anchor and combat must remain');
}
{
 const root=path.join(__dirname,'..'),get=n=>fs.readFileSync(path.join(root,n),'utf8');
 const runtime=get('mini-worlds-runtime.js'),html=get('mini-worlds.html');
 for(const def of M.MISSIONS){
  assert.equal(def.steps?.length,3,def.title+' must explain mission in three simple steps');
  assert(def.steps.every(x=>typeof x==='string'&&x.length>=18),'each mission step must be readable');
  assert(def.bonus?.startsWith('EXTRA:'),'each mission has optional replay incentive');
 }
 for(const id of ['readyKicker','readyTitle','readyCopy','readySteps','readyBonus','readyClock','begin']){
  assert(html.includes('id="'+id+'"'),'missing pre-mission briefing element '+id);
 }
 assert(html.includes('¡ENTENDIDO, A JUGAR!'),'briefing must have a single obvious start button');
 assert(html.includes('aria-modal="true"')&&html.includes('role="dialog"'),'accessible briefing dialog missing');
 assert(runtime.includes('function refreshMissionBriefing()'),'mission intro must be dynamic');
 assert(runtime.includes("for(const instruction of def.steps"),'all three steps must render');
 assert(runtime.includes("refreshMissionBriefing();layout('ready')"),'3D demo and AR must show briefing before gameplay');
 assert(runtime.includes("refreshMissionBriefing();layout('ready');"),'ready UI must be synchronized');
 assert(runtime.includes("$('fixWorld').disabled=true;refreshMissionBriefing();layout('ready');"),'AR placement must display mission briefing, not a generic success title');
 assert(runtime.includes("C.start(game);mapOpen=false;"),'time starts only on button press and player has clear AR view');
 const start=runtime.slice(runtime.indexOf('function startGame(){'),runtime.indexOf('function pause(){'));
 assert(start.includes("layout('playing')")&&!start.includes('notice('),'start must dismiss briefing without popups');
 assert(runtime.includes("$('ready').hidden=state!=='ready'"),'intro must vanish while game is active');
 assert(runtime.includes("$('begin').onclick=startGame"),'real start action must be wired');
 assert(runtime.includes("const steps=$('readySteps');steps.replaceChildren()"),'briefing must refresh on repeat missions without duplicating instructions');
}
console.log('MINI WORLDS mission arc: 3 objective types, timed failures, physically rescued civilians, 3-wave reactor, boss lock, 3-medal grading, persistent town UI and AR invariants: PASS');
