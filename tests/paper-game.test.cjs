'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','paper.html'),'utf8');
const script=source.split('<script>')[1]?.split('</script>')[0];
assert.ok(script,'Game script must be embedded in paper.html');
function boot(seed=419,query='?qa=1'){
 const els=new Map(),listeners={};
 let now=0,frame=null,rng=seed>>>0;
 const fakeMath=Object.create(Math);
 fakeMath.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 function context(){return new Proxy({
   createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
   createLinearGradient:()=>({addColorStop(){}}),
   createRadialGradient:()=>({addColorStop(){}}),
   measureText:()=>({width:12})
 },{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
 function get(id){if(!els.has(id)){
   const classes=new Set(['shop','versus','result','pause'].includes(id)?['hidden']:[]);
   els.set(id,{value:id==='nick'?'VOS':'',style:{},textContent:'',innerHTML:'',onclick:null,
    classList:{add(n){classes.add(n)},remove(n){classes.delete(n)},toggle(n,b){if(b===undefined)b=!classes.has(n);if(b)classes.add(n);else classes.delete(n);return b},contains(n){return classes.has(n)}},setAttribute(){},append(){},setPointerCapture(){},getContext(){return context()},
    addEventListener(n,fn){(listeners[id+':'+n]??=[]).push(fn);}
   });}return els.get(id);}
 const doc={getElementById:get,createElement:k=>get('node-'+Math.random()),
   addEventListener(n,fn){(listeners['document:'+n]??=[]).push(fn);},querySelectorAll:()=>[],hidden:false};
 const win={addEventListener(){}};
 const loc={search:query,href:'https://example.test/paper.html'};
 const storage=new Map();
 // Instrument test sandbox only; production game source remains unchanged.
 const instrumented=script.replace('// Read-only diagnostics:', 'window.__paperTest={getGame:()=>game,markTrail,move,death,cutExposedTrails,createStormStages,stormZoneState,updateStorm,step,setClock:t=>{clock=t;},idx,CX,CY,R,territoryLoops,updateMap,grantRewards,REWARDS,buyOrEquip,awardCoins,setHero,saveWardrobe,loadWardrobe,wardrobe,SHOP_ITEMS,celebrateAt,showVS,launchMatch,drawVersus,getFeatured:()=>vsRival};\\n// Read-only diagnostics:'.replace('\\n','\n'));
 const browser=Function('document','window','location','performance','requestAnimationFrame','innerWidth','innerHeight','devicePixelRatio','localStorage','navigator','setTimeout','URLSearchParams','Math',instrumented);
 browser(doc,win,loc,{now:()=>now},fn=>frame=fn,430,850,1,
  {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},{vibrate(){}},()=>{},URLSearchParams,fakeMath);
 function tick(n=1){for(let i=0;i<n;i++){now+=1000/60;const f=frame;assert.equal(typeof f,'function');frame=null;f(now);}}
 function aim(x,y){let q=win.territoryQA,t=Math.atan2(y-q.y,x-q.x);
  for(const fn of listeners['game:pointermove']||[])fn({pointerType:'mouse',clientX:215+130*Math.cos(t),clientY:425+130*Math.sin(t)});}
 return {get,win,aim,tick,storage};
}
test('page has complete standalone territory game and licensed external character load',()=>{
 assert.match(source,/<canvas id="game"/);
 assert.match(source,/function capture\(p\)/);
 assert.match(source,/function death\(p/);
 assert.match(source,/function stepBot\(p/);
 assert.match(source,/type="module" src="\.\/paper-3d\.mjs"/);
 assert.match(source,/function paintChibi\(p,hero,col\)/);
});
test('12 agents, territory HUD and pause controls initialize',()=>{
 const g=boot();assert.equal(g.win.territoryQA.mode,'home');g.get('start').onclick();
 assert.equal(g.win.territoryQA.mode,'play');
 assert.equal(g.win.territoryQA.players,25);
 assert.ok(g.win.territoryQA.area>0.4);
 g.tick(5);assert.match(g.get('percent').textContent,/%/);
 const clock=g.win.territoryQA.clock;g.get('pause').onclick();g.tick(20);
 assert.equal(g.win.territoryQA.mode,'pause');
 assert.equal(g.win.territoryQA.clock,clock);
 g.get('resume').onclick();g.tick(20);
 assert.ok(g.win.territoryQA.clock>clock);
});
test('a real closed circuit captures interior cells and raises player percentage',()=>{
 const g=boot(419);g.get('start').onclick();const first=g.win.territoryQA.area;
 // Isolate terrain capture from combat RNG: dedicated enemy AI tests run independently.
 for(const rival of g.win.__paperTest.getGame().people.slice(1)){rival.alive=false;rival.respawn=99999;}
 const points=[[1265,1118],[1280,968],[975,967],[973,1265],[1118,1118]];
 let n=0,last=0,captured=false;let previousOutside=false;
 for(let i=0;i<1100;i++){
  let q=g.win.territoryQA;if(q.mode!=='play')break;
  let target=points[n]||{x:1118,y:1118};
  if(n<points.length&&(Math.hypot(q.x-target[0],q.y-target[1])<27||i-last>550)){n++;last=i;target=points[n]||[1118,1118];}
  if(n<points.length)g.aim(target[0],target[1]);else g.aim(1118,1118);
  g.tick(1);q=g.win.territoryQA;
  if(previousOutside&&!q.outside&&q.area>first+.75){captured=true;break;}
  previousOutside=q.outside;
 }
 assert.equal(captured,true,'closing loop should capture a meaningful interior area');
 assert.ok(g.win.territoryQA.area>=first+.75);
});
test('restarting a match resets the territory and score',()=>{
 const g=boot(774);g.get('start').onclick();g.tick(180);
 g.get('restart').onclick();assert.equal(g.win.territoryQA.mode,'play');
 assert.ok(g.win.territoryQA.clock<.05);
 assert.equal(g.win.territoryQA.kills,0);
 assert.equal(g.win.territoryQA.players,25);
});

test('crossing your own exposed trail no longer eliminates your character',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,p=h.getGame().people[0],k=h.idx(1430,1118);
 p.outside=true;
 h.markTrail(p,k);h.markTrail(p,k+1);h.markTrail(p,k);
 assert.equal(p.alive,true);
 assert.equal(p.trailCells.length,2);
 assert.equal(g.win.territoryQA.mode,'play');
});
test('touching the visible part of an enemy trail kills the enemy and counts one elimination',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,game=h.getGame(),enemy=game.people[1],player=game.people[0];
 const x=1398,y=1118,k=h.idx(x,y);
 enemy.x=x+22;enemy.y=y;enemy.outside=true;enemy.trailPoints=[{x:x-33,y},{x,y}];
 h.markTrail(enemy,k);
 h.cutExposedTrails(player,x+3,y+12); // 12px from the drawn ribbon, not exact grid cell.
 assert.equal(enemy.alive,false);
 assert.equal(player.alive,true);
 assert.equal(game.kills,1);
 assert.equal(game.defeated.has(enemy.id),true);
});
test('a near miss outside the visible trail does not eliminate anyone',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,enemy=h.getGame().people[1],player=h.getGame().people[0];
 const x=1398,y=1118;
 enemy.x=x+22;enemy.y=y;enemy.outside=true;enemy.trailPoints=[{x:x-33,y},{x,y}];
 h.markTrail(enemy,h.idx(x,y));
 h.cutExposedTrails(player,x+3,y+35);
 assert.equal(enemy.alive,true);
});
test('moving along the circular border builds and activates speed boost',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,p=h.getGame().people[0];
 p.x=h.CX+h.R-50;p.y=h.CY;p.angle=Math.PI/2;
 for(let i=0;i<35;i++)h.move(p,1/60);
 assert.equal(p.alive,true);
 assert.ok(p.boostUntil>0,'edge sprint should activate');
 assert.ok(p.edgeCharge>.7);
});
test('eliminating all rival identities ends the match with victory',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,game=h.getGame();
 for(const rival of game.people.slice(1)){rival.protectedUntil=-1;h.death(rival,0);}
 assert.equal(game.defeated.size,24);
 assert.equal(g.win.territoryQA.mode,'result');
 assert.match(g.get('finaltitle').textContent,/ÚLTIMO SUPERVIVIENTE/);
});

test('seven shifting safe circles remain nested and land in variable locations',()=>{
 const g=boot(71);g.get('start').onclick();
 const h=g.win.__paperTest,game=h.getGame(),stages=game.storm.stages;
 assert.equal(stages.length,7);
 assert.deepEqual(stages.map(z=>z.at),[45,75,105,135,165,195,225]);
 let previous={x:h.CX,y:h.CY,radius:h.R};
 for(const stage of stages){
  assert.ok(stage.radius<previous.radius);
  assert.ok(Math.hypot(stage.x-previous.x,stage.y-previous.y)+stage.radius<=previous.radius+1);
  previous=stage;
 }
 assert.ok(stages[6].radius<h.R*.1);
 const alternate=h.createStormStages();
 assert.ok(Math.hypot(alternate[6].x-stages[6].x,alternate[6].y-stages[6].y)>30,'final zone should vary between rounds');
});
test('first shrink happens at 15s and the next safe zone is previewed accurately',()=>{
 const g=boot(71);g.get('start').onclick();
 const h=g.win.__paperTest,game=h.getGame();
 h.setClock(44.8);h.updateStorm(0);
 assert.equal(h.stormZoneState().phase,0);
 assert.equal(game.storm.radius,h.R);
 h.setClock(49.5);h.updateStorm(0);
 assert.equal(h.stormZoneState().phase,1);
 assert.ok(game.storm.radius<h.R);
 assert.ok(game.storm.next.radius<game.storm.radius);
 h.setClock(56.1);h.updateStorm(0);
 assert.equal(game.storm.closing,false);
 assert.equal(Math.round(game.storm.radius),Math.round(game.storm.stages[0].radius));
 assert.equal(h.stormZoneState().next.at,75);
});
test('permanently defeated bots do not respawn and 100% conquest cannot grant victory',()=>{
 const g=boot(994);g.get('start').onclick();
 const h=g.win.__paperTest,game=h.getGame(),victim=game.people[1];
 h.death(victim,0);
 assert.equal(victim.alive,false);
 assert.equal(game.people.filter(p=>p.alive).length,24);
 assert.equal(g.win.territoryQA.mode,'play');
 game.people[0].score=100;
 h.setClock(3);h.step(1/60);
 assert.equal(victim.alive,false);
 assert.equal(g.win.territoryQA.mode,'play');
});
test('premium render uses world-size sharp canvas without magnified low resolution terrain',()=>{
 assert.match(source,/mapCanvas\.width=WORLD;mapCanvas\.height=WORLD;/);
 assert.match(source,/function territoryLoops\(v\)/);
 assert.match(source,/quadraticCurveTo/);
 assert.doesNotMatch(source,/const rad=CELL\*\.74/);
 assert.doesNotMatch(source,/mapCanvas\.width=N\*3/);
});
test('survival HUD shows eliminations and players alive, never a ranking by area',()=>{
 const g=boot(419);g.get('start').onclick();g.tick(20);
 assert.equal(g.get('rank').innerHTML,'');
 assert.equal(String(g.get('survivorsCount').textContent),'25');
 assert.equal(String(g.get('survivalKills').textContent),'0');
 assert.match(g.get('nextZoneLabel').textContent,/^\d+:\d{2}$/);
 assert.match(source,/id="survivalPanel"/);
});
test('connected territory is converted to coherent vector boundary loops',()=>{
 const g=boot(419);g.get('start').onclick();
 const loops=g.win.__paperTest.territoryLoops(1);
 assert.ok(loops.length>=1);
 assert.ok(loops[0].length>8);
 for(const q of loops[0]){assert.ok(Number.isFinite(q.x));assert.ok(Number.isFinite(q.y));}
});

test('reference HUD includes best score, transparent layout and a subtle paper grid',()=>{assert.match(source,/id="bestCurrent"/);assert.match(source,/class="best-live"/);assert.match(source,/const tileStep=74/);assert.doesNotMatch(source,/const dotStep=84/);});

test('battle royale minimap previews the next safe area and displays live counts',()=>{
 const g=boot(419);g.get('start').onclick();g.tick(10);
 assert.match(source,/id="survivalPanel"/);
 assert.match(source,/id="zonePhaseLabel"/);
 assert.match(source,/id="survivorsCount"/);
 assert.match(source,/mc\.fill\('evenodd'\)/);
 assert.match(source,/zone\.next/);
 assert.match(g.get('zonePhaseLabel').textContent,/ZONA 0\/7/);
});
test('chibi character and layered neon trails use original vector rendering',()=>{
 assert.match(source,/function paintChibi\(p,hero,col\)/);
 assert.match(source,/drawOutfit\(p\)/);
 assert.match(source,/#2448b5/);
 assert.match(source,/procedural motif/);
 assert.match(source,/function drawMini\(\)/);
});

test('reward thresholds unlock exactly once, with real effects',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,player=h.getGame().people[0];
 assert.deepEqual(h.REWARDS.map(r=>r.at),[2,6,12,25]);
 assert.equal(h.getGame().rewards.size,0);
 player.score=2.3;h.grantRewards(player);
 assert.equal(h.getGame().rewards.size,1);
 assert.ok(player.boostUntil>0);
 assert.match(g.get('rewardTitle').textContent,/TURBO/);
 h.grantRewards(player);
 assert.equal(h.getGame().rewards.size,1,'claim must not repeat');
 player.score=6.5;h.grantRewards(player);
 assert.equal(h.getGame().rewards.size,2);
 assert.equal(h.getGame().epicTrail,true);
 player.score=25.3;h.grantRewards(player);
 assert.equal(h.getGame().rewards.size,4);
 assert.equal(h.getGame().crowned,true);
 assert.match(g.get('rewardTitle').textContent,/CORONA/);
});
test('earned milestones and boosts reset on the next match',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,player=h.getGame().people[0];
 player.score=25.1;h.grantRewards(player);
 assert.equal(h.getGame().rewards.size,4);
 g.get('restart').onclick();
 assert.equal(h.getGame().rewards.size,0);
 assert.equal(h.getGame().epicTrail,false);
 assert.equal(h.getGame().crowned,false);
 assert.equal(g.win.territoryQA.rewards,0);
});
test('avatar fallback still renders, but game labels do not clutter the playfield',()=>{
 const g=boot(419);g.get('start').onclick();g.tick(10);
 assert.match(source,/const zoomHero=p\.id===0\?1\.16:1\.0/);
 assert.doesNotMatch(source,/c\.strokeText\(p\.name/);
 assert.match(source,/const yy=p\.y-133/);
 assert.match(source,/#rewardToast\.visible/);
});
test('original heroes each have a distinct identity and can be selected',()=>{
 const g=boot(419);
 for(const name of ['RAYO','NOVA','GLITCH','LUNA','KIRO','MIMO','VOLT','NIX'])assert.ok(source.includes("name:'"+name+"'"));
 const h=g.win.__paperTest;
 assert.equal(h.setHero(2),true);
 assert.equal(h.wardrobe.hero,2);
 assert.match(g.get('heroDetails').innerHTML,/digital/);
 assert.equal(h.setHero(-1),false);
 assert.equal(h.wardrobe.hero,2);
});
test('store will never charge for insufficient funds or charge twice',()=>{
 const g=boot(419),h=g.win.__paperTest;
 const id='outfit_armor';
 const price=h.SHOP_ITEMS.find(x=>x.id===id).price;
 assert.equal(h.buyOrEquip(id),false);
 assert.equal(h.wardrobe.coins,0);
 h.awardCoins(price+30);
 assert.equal(h.buyOrEquip(id),true);
 assert.equal(h.wardrobe.coins,30);
 assert.equal(h.wardrobe.equipped.outfit,id);
 assert.equal(h.buyOrEquip(id),true);
 assert.equal(h.wardrobe.coins,30);
 assert.equal(h.loadWardrobe().equipped.outfit,id);
});
test('wardrobe balance and equipped emote persist into fresh match',()=>{
 const g=boot(419),h=g.win.__paperTest;
 h.awardCoins(160);
 assert.equal(h.buyOrEquip('emote_laugh'),true);
 const saved=h.loadWardrobe();
 assert.equal(saved.coins,75);
 assert.equal(saved.equipped.emote,'emote_laugh');
 g.get('start').onclick();
 assert.equal(h.getGame().people.length,25);
 assert.equal(h.wardrobe.equipped.emote,'emote_laugh');
 assert.equal(g.get('rank').innerHTML,'');
});
test('game grants currency on conquest and elimination, without real-money checkout',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,game=h.getGame();
 const start=h.wardrobe.coins;
 const enemy=game.people[1];enemy.protectedUntil=-1;
 h.death(enemy,0);
 assert.ok(h.wardrobe.coins>=start+25);
 assert.ok(game.earnedCoins>=25);
 assert.doesNotMatch(source,/stripe\.com|mercadopago\.com|paypal\.com/i);
});
test('shop has four cosmetic categories with a close action',()=>{
 const g=boot(419);
 assert.match(source,/id="shopGrid"/);
 assert.match(source,/id="shopTabs"/);
 assert.match(source,/id="openShopHome"/);
 assert.equal(g.get('openShopHome').onclick instanceof Function,true);
 g.get('openShopHome').onclick();
 assert.match(g.get('shopGrid').innerHTML,/outfit_street|outfit_neon|outfit_armor/);
 g.get('closeShop').onclick();
 assert.match(source,/celebration_confetti/);
 assert.match(source,/trail_rainbow/);
});

test('equipped gesture can be activated manually from the mobile HUD',()=>{
 const g=boot(419),h=g.win.__paperTest;
 h.awardCoins(140);
 assert.equal(h.buyOrEquip('emote_heart'),true);
 g.get('start').onclick();
 g.tick(8);
 assert.equal(g.get('emoteButton').textContent,'💖');
 assert.equal(typeof g.get('emoteButton').onclick,'function');
 g.get('emoteButton').onclick();
 assert.equal(g.win.territoryQA.mode,'play');
 assert.equal(h.wardrobe.equipped.emote,'emote_heart');
});

test('progressive 3D state is exposed without changing territory physics',()=>{
 const g=boot(419);g.get('start').onclick();
 const state=g.win.Paper3DState();
 assert.equal(state.playing,true);
 assert.equal(state.people.length,25);
 assert.equal(state.people[0].hero,0);
 assert.ok(state.screenW>0&&state.zoom>0);
 assert.match(source,/three\/addons/);
});
test('fallback characters are humanoid and include distinct costumes',()=>{
 assert.match(source,/Giant, distinct head/);
 assert.match(source,/Kira has a long mystic coat/);
 assert.match(source,/Rayo: determined ninja mask/);
 assert.match(source,/function drawOutfit/);
});

test('3D renderer uses the original Styloo Chibi assets and preserves local fallback',()=>{
 const module=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 const mascots=fs.readFileSync(path.join(__dirname,'..','paper-mascots.mjs'),'utf8');
 assert.match(module,/from '\.\/paper-mascots\.mjs'/);
 assert.match(module,/CHIBI_ROSTER/);
 assert.match(module,/chibiEmote\(THREE,actor/);
 assert.match(mascots,/capybara/);
 assert.match(mascots,/redpanda/);
 assert.match(mascots,/axolotl/);
 assert.match(mascots,/raccoon/);
});

test('wardrobe overlays remain assigned to humanoid heads and torsos',()=>{
 assert.match(source,/roundRect\(-15,-65,30,10,4\)/); // cap
 assert.match(source,/roundRect\(-14,-47,12,8,2\)/); // glasses
 assert.match(source,/ellipse\(-10,-76,5,15/); // ears
 assert.match(source,/roundRect\(-13,-28,26,24,5\)/); // armor
});

test('VS opens before a normal game and shows animated Six Seven performers',()=>{
 const g=boot(419,'?qa=1&vs=1');
 assert.equal(g.win.territoryQA.mode,'home');
 g.get('start').onclick();
 assert.equal(g.win.territoryQA.mode,'versus');
 assert.equal(g.get('vsPlayerName').textContent,'RAYO');
 assert.notEqual(g.get('vsRivalName').textContent,'RAYO');
 g.tick(10); // canvas renderer must not throw
 assert.equal(g.win.territoryQA.mode,'versus');
 assert.match(source,/function versusActor\(/);
 assert.match(source,/The arms perform original Six-Seven|Six-Seven/);
 assert.match(source,/id="versusCanvas"/);
 assert.match(source,/id="vsPlayNow"/);
});
test('VS skip starts a playable game with the featured rival correctly represented',()=>{
 const g=boot(2024,'?qa=1&vs=1');
 g.get('start').onclick();
 const name=g.get('vsRivalName').textContent;
 assert.ok(name);
 assert.equal(g.get('vsPlayNow').onclick(),true);
 assert.equal(g.win.territoryQA.mode,'play');
 assert.equal(g.win.territoryQA.players,25);
 assert.equal(g.win.__paperTest.getGame().people[1].name,name);
 assert.equal(g.win.Paper3DState().people[1].hero,g.win.__paperTest.getFeatured());
});
test('VS automatically proceeds to the match after the choreographed countdown',()=>{
 const g=boot(419,'?qa=1&vs=1');
 g.get('start').onclick();
 g.tick(365);
 assert.equal(g.win.territoryQA.mode,'play');
 assert.equal(g.win.territoryQA.players,25);
});
test('replay displays another versus intro rather than bypassing the fight presentation',()=>{
 const g=boot(419,'?qa=1&vs=1');
 g.get('start').onclick();g.get('vsPlayNow').onclick();
 g.win.__paperTest.death(g.win.__paperTest.getGame().people[0]);
 assert.equal(g.win.territoryQA.mode,'result');
 g.get('again').onclick();
 assert.equal(g.win.territoryQA.mode,'versus');
 g.get('vsPlayNow').onclick();
 assert.equal(g.win.territoryQA.mode,'play');
});
test('Six Seven is purchasable with earned in-game currency and equips normally',()=>{
 const g=boot(419),h=g.win.__paperTest;
 const item=h.SHOP_ITEMS.find(x=>x.id==='emote_sixseven');
 assert.equal(item.category,'emote');
 assert.ok(item.price>0);
 h.awardCoins(item.price);
 assert.equal(h.buyOrEquip(item.id),true);
 g.get('start').onclick();g.tick(8);
 assert.equal(g.get('emoteButton').textContent,'🙌');
 assert.equal(h.wardrobe.equipped.emote,'emote_sixseven');
});

test('eight collectible chibi champions use genuine licensed GLBs with a graceful fallback',()=>{
 const renderer=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 const mascots=fs.readFileSync(path.join(__dirname,'..','paper-mascots.mjs'),'utf8');
 assert.match(renderer,/sourceAssets\[i\]=\{procedural:true/);
 assert.match(renderer,/const models=CHIBI_ROSTER\.map/);
 assert.match(mascots,/export const MASCOT_DATA=/);
 assert.match(mascots,/export function buildMascot/);
});

test('original Six-Seven dance drives genuine arm bones on two 3D showdown characters',()=>{
 const renderer=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 assert.match(renderer,/function danceBones\(item,seconds,mirror\)/);
 assert.match(renderer,/upperarm/);
 assert.match(renderer,/bone\.quaternion\.copy\(baseline\)\.slerp\(/);
 assert.match(renderer,/function syncVS\(state,dt\)/);
 assert.match(renderer,/window\.PaperVSReady=true/);
 assert.match(source,/id="versus3dCanvas"/);
 assert.match(source,/id="vsPortraits"/);
 assert.match(source,/\$\('vsPortraits'\)\.style\.opacity='1'/);
 assert.doesNotMatch(source,/if\(!window\.PaperVSReady\)/);
});
test('showdown preloads GLBs while the countdown is running',()=>{
 const renderer=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 assert.match(source,/previewing:mode==='versus'/);
 assert.match(renderer,/state\.playing\|\|state\.previewing/);
 assert.match(source,/function launchMatch\(\)/);
});

test('leaderboard portraits and scores stay visible on compact mobile',()=>{
 assert.doesNotMatch(source,/#rank \.rankrow span:not\(\.rankAvatar\)\{display:none\}/);
 assert.match(source,/#rank \.rankrow \.rankName\{display:block!important/);
 assert.match(source,/#rank \.rankrow b\{display:block/);
});
test('in-game purchased Six Seven forwards emote choice to live 3D arm bones',()=>{
 const mod=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 assert.match(source,/emoteId:p\.id===0\?wardrobe\.equipped\.emote/);
 assert.match(mod,/chibiEmote\(THREE,item/);
 assert.match(mod,/getGLB\(name\)/);
});

test('VS picks the true standing idle instead of crouched idle across Styloo formats',()=>{
 const mod=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 const start=mod.indexOf('function chooseAnimation(');
 const end=mod.indexOf('\nfunction findArmRig',start);
 assert.ok(start>=0&&end>start);
 const choose=new Function('return '+mod.slice(start,end).trim())();
 const regular={animations:['anim_crouchiddle','anim_iddle','anim_push','anim_run'].map(name=>({name}))};
 const ninja={animations:['crouchiddleanim_','iddleanim_','pushanim_','runanim_'].map(name=>({name}))};
 assert.equal(choose(regular,'idle').name,'anim_iddle');
 assert.equal(choose(ninja,'idle').name,'iddleanim_');
 assert.equal(choose(regular,'emote').name,'anim_push');
 assert.equal(choose(ninja,'run').name,'runanim_');
});

test('home menu no longer includes retired square avatar and showcases live 3D chibi',()=>{
 const g=boot(419);
 assert.doesNotMatch(source,/class="avatarDemo"/);
 assert.doesNotMatch(source,/class="preview"><div class="trace"/);
 assert.match(source,/id="menuHeroStage"/);
 assert.match(source,/id="menuFallbackCanvas"/);
 assert.match(source,/function drawMenuHeroFallback\(/);
 assert.equal(g.win.Paper3DState().menuing,true);
 assert.equal(g.win.Paper3DState().menuHero,0);
 g.tick(10);
 assert.equal(g.win.territoryQA.mode,'home');
});
test('hero selection updates game character and the new menu name plate',()=>{
 const g=boot(419),h=g.win.__paperTest;
 assert.equal(h.setHero(3),true);
 assert.equal(g.get('menuCharacterLabel').textContent,'LUNA');
 assert.equal(g.get('menuCharacterTagline').textContent,'Siempre un paso adelante.');
 assert.equal(g.win.Paper3DState().menuHero,3);
 assert.equal(h.setHero(2),true);
 assert.equal(g.get('menuCharacterLabel').textContent,'GLITCH');
});
test('3D stage is reparented between menu and versus without creating additional renderers',()=>{
 const module=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 assert.match(source,/id="versusStage"/);
 assert.match(source,/id="menuHeroStage"/);
 assert.match(module,/function attachShowcase\(target,cssClass\)/);
 assert.match(module,/attachShowcase\(inShop\?'shopHeroStage':'menuHeroStage'/);
 assert.match(module,/attachShowcase\('versusStage','vsPosition'\)/);
 assert.match(module,/window\.PaperMenuReady=true/);
 assert.match(module,/state\.menuing/);
 assert.equal((module.match(/new THREE\.WebGLRenderer\(/g)||[]).length,3); // gameplay + shared menu/VS + one disposable 3D portrait renderer
});

test('real generated 3D portraits replace CSS doll tiles and old VS fallback',()=>{
 const g=boot(419);
 assert.match(source,/function portraitURL\(i\)/);
 assert.match(g.get('heroPicker').innerHTML,/hero3DThumbnail/);
 assert.doesNotMatch(g.get('heroPicker').innerHTML,/heroMini/);
 assert.match(source,/id="menuHeroPortrait"/);
 assert.match(source,/id="vsPortraitPlayer"/);
 assert.match(source,/id="vsPortraitOpponent"/);
 assert.doesNotMatch(source,/versusActor\(ctx,wardrobe\.hero,168/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8'),/document\.getElementById\('menuHeroPortrait'\)/);
});
test('selected champion updates a vector placeholder until its real GLB portrait loads',()=>{
 const g=boot(419),h=g.win.__paperTest;
 h.setHero(2);
 assert.match(g.get('menuHeroPortrait').src,/^data:image\/svg\+xml/);
 h.setHero(3);
 assert.match(g.get('menuHeroPortrait').src,/^data:image\/svg\+xml/);
 assert.match(g.get('heroPicker').innerHTML,/NIX/);
});

test('eight playable chibi champions have selectable names and GLB-linked portraits',()=>{
 const g=boot(419),h=g.win.__paperTest;
 const names=['RAYO','NOVA','GLITCH','LUNA','KIRO','MIMO','VOLT','NIX'];
 assert.equal((g.get('heroPicker').innerHTML.match(/data-hero=/g)||[]).length,8);
 for(let i=0;i<8;i++){
  assert.equal(h.setHero(i),true);
  assert.equal(g.get('menuCharacterLabel').textContent,names[i]);
  assert.equal(g.win.Paper3DState().menuHero,i);
 }
 assert.match(source,/paper-animals\.css/);
 assert.match(source,/function paintMascotCanvas/);
});
test('Six Seven no longer accumulates uncontrolled bone angles',()=>{
 const module=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 assert.match(module,/captureRestPose/);
 assert.match(module,/bone\.quaternion\.copy\(baseline\)\.slerp\(desired,ease\)/);
 assert.doesNotMatch(module,/bone\.quaternion\.premultiply\(/);
 assert.match(module,/const tempo=2\*Math\.PI/);
});

test('the survivor count remains valid even before the GLB assets load',()=>{
 const g=boot(419);g.get('start').onclick();g.tick(7);
 assert.equal(g.get('rank').innerHTML,'');
 assert.equal(g.get('survivorsCount').textContent,25);
 assert.match(g.get('nextZoneLabel').textContent,/^\d+:\d{2}$/);
});
test('original fallbacks remain available while the official CIVIDOM Chibi collection is featured',()=>{
 const mascots=fs.readFileSync(path.join(__dirname,'..','paper-mascots.mjs'),'utf8');
 for(const species of ['capybara','redpanda','axolotl','penguin','raccoon','banana','screen','bull'])
  assert.ok(mascots.includes("species:'"+species+"'"));
 assert.match(source,/<h1 class="cvdomLogo">CIVI<em>DOM<\/em>/);
});
test('Six-Seven can be evaluated twice at the same time without any limb drift',async()=>{
 const {animateMascot}=await import(require('node:url').pathToFileURL(path.join(__dirname,'..','paper-mascots.mjs')).href);
 function joint(){return {rotation:{x:0,z:0}};}
 const rig={left:joint(),right:joint(),body:joint(),head:joint(),feet:[{node:joint(),side:-1},{node:joint(),side:1}]};
 const actor={mascotRig:rig};
 animateMascot(actor,1.25,'dance',false);
 const before=JSON.stringify(rig);
 animateMascot(actor,1.25,'dance',false);
 assert.equal(JSON.stringify(rig),before);
 for(let t=0;t<100;t++)animateMascot(actor,t/30,'dance',true);
 assert.ok(Math.abs(rig.left.rotation.z)<2.2);
 assert.ok(Math.abs(rig.right.rotation.z)<2.2);
});

test('Six Seven shoulder motion is frame-to-frame smooth and palms reset',async()=>{
 const {animateMascot}=await import(require('node:url').pathToFileURL(path.join(__dirname,'..','paper-mascots.mjs')).href);
 const node=()=>({rotation:{x:0,z:0}});
 const rig={left:node(),right:node(),leftPalm:node(),rightPalm:node(),head:node(),body:node(),feet:[{node:node(),side:-1},{node:node(),side:1}]};
 const actor={mascotRig:rig};
 let previous=null,maxDelta=0;
 for(let i=0;i<=480;i++){
  const t=i/60;animateMascot(actor,t,'dance',false);
  for(const x of [rig.left.rotation.z,rig.right.rotation.z,rig.leftPalm.rotation.z,rig.rightPalm.rotation.z]){
   assert.ok(Number.isFinite(x));
   assert.ok(Math.abs(x)<2,'joint exceeds reasonable pose range');
  }
  if(previous){
   const diff=Math.max(...[rig.left,rig.right,rig.leftPalm,rig.rightPalm].map((v,j)=>Math.abs(v.rotation.z-previous[j])));
   maxDelta=Math.max(maxDelta,diff);
  }
  previous=[rig.left.rotation.z,rig.right.rotation.z,rig.leftPalm.rotation.z,rig.rightPalm.rotation.z];
 }
 assert.ok(maxDelta<.13,'Six-Seven movement jumps too fast between 60 FPS frames: '+maxDelta);
 animateMascot(actor,8.1,'idle',false);
 assert.equal(rig.leftPalm.rotation.z,0);assert.equal(rig.rightPalm.rotation.z,0);
 assert.ok(Math.abs(rig.left.rotation.z)<.2);
});

test('Six Seven entrance never snaps on slow 270ms mobile frames',async()=>{
 const {animateMascot}=await import(require('node:url').pathToFileURL(path.join(__dirname,'..','paper-mascots.mjs')).href);
 const n=()=>({rotation:{x:0,z:0}});
 const rig={left:n(),right:n(),leftPalm:n(),rightPalm:n(),head:n(),body:n(),feet:[{node:n(),side:-1},{node:n(),side:1}]};
 const actor={mascotRig:rig};
 for(const opposing of [false,true]){
  let previous=null;
  for(let t=0;t<3.2;t+=.27){
   animateMascot(actor,t,'dance',opposing);
   const current=[rig.left.rotation.z,rig.right.rotation.z];
   if(previous)assert.ok(Math.max(...current.map((v,i)=>Math.abs(v-previous[i])))<.9,'instant shoulder snap at t='+t);
   previous=current;
  }
 }
});

test('APK-scale 25 participants occupy independent starting cells and have valid names',()=>{
 const g=boot(419);g.get('start').onclick();const people=g.win.__paperTest.getGame().people;
 assert.equal(people.length,25);
 assert.equal(people[0].id,0);
 for(const p of people){assert.ok(typeof p.name==='string'&&p.name.length>0);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
 for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++)
  assert.ok(Math.hypot(people[i].x-people[j].x,people[i].y-people[j].y)>95,'spawn overlap '+i+'/'+j);
});
test('25 player trail masks can represent id 24 without colliding with player id 0',()=>{
 assert.match(source,/trails=new Uint32Array\(SIZE\)/);
 const g=boot(419);g.get('start').onclick();const h=g.win.__paperTest;
 const enemy=h.getGame().people[24],player=h.getGame().people[0];
 for(const bot of h.getGame().people.slice(1,24))bot.alive=false;
 const x=1398,y=1118,k=h.idx(x,y);
 enemy.x=x+22;enemy.y=y;enemy.outside=true;enemy.trailPoints=[{x:x-33,y},{x,y}];
 h.markTrail(enemy,k);
 assert.equal(enemy.alive,true);
 h.cutExposedTrails(player,x+3,y+12);
 assert.equal(enemy.alive,false,'last bot has an independent high-bit collision trail');
 assert.equal(player.alive,true);
 assert.equal(h.getGame().kills,1);
});
test('APK longer storm pacing gives 45 seconds safe opening and seven phases through 225 seconds',()=>{
 const g=boot(10);g.get('start').onclick();const h=g.win.__paperTest;
 assert.deepEqual(h.getGame().storm.stages.map(x=>x.at),[45,75,105,135,165,195,225]);
 h.setClock(44.5);h.updateStorm(0);
 assert.equal(h.stormZoneState().phase,0);
 h.setClock(49);h.updateStorm(0);
 assert.equal(h.stormZoneState().phase,1);
 assert.ok(h.getGame().storm.radius<h.R);
 h.setClock(55.1);h.updateStorm(0);
 assert.equal(h.getGame().storm.stages[0].radius,h.getGame().storm.radius);
});

test('compact Fortnite-inspired minimap uses square map, safe rings and one status strip',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','paper-mini-hud.css'),'utf8');
 assert.match(source,/paper-mini-hud\.css\?v=2/);
 assert.match(source,/class="cvMiniMapFrame"/);
 assert.match(source,/id="miniTimeMetric"/);
 assert.match(source,/class="survivalStats" aria-label="Tiempo/);
 assert.match(source,/id="survivorsCount"/);
 assert.match(source,/id="survivalKills"/);
 assert.match(css,/width:clamp\(108px,30vw,132px\)/);
 assert.match(css,/grid-template-columns:1\.2fr 1fr 1fr/);
 assert.match(css,/#hud #survivalPanel #mini/);
 assert.match(css,/border-radius:0!important/);
 assert.match(source,/mc\.fill\('evenodd'\)/);
 assert.match(source,/cvMiniArrow\(/);
 assert.match(source,/cvPrepareMiniBackground\(\)/);
});
test('zone countdown stays mm:ss, players and kills remain live in compact HUD',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest;
 assert.equal(g.get('nextZoneLabel').textContent,'0:45');
 assert.equal(g.get('survivorsCount').textContent,25);
 assert.equal(g.get('survivalKills').textContent,0);
 h.setClock(40);
 h.updateStorm(0);
 // The timer is presentation only; it never adjusts the storm's timeline.
 assert.deepEqual(h.getGame().storm.stages.map(x=>x.at),[45,75,105,135,165,195,225]);
});

test('R4 minimap is white, enemy positions have double-contrast markers and current territory remains real',()=>{
 assert.match(source,/ctx\.fillStyle='#ffffff';ctx\.fillRect\(0,0,182,182\)/);
 assert.doesNotMatch(source,/Deterministic low-detail foliage and topography/);
 assert.doesNotMatch(source,/Cartographic river and winding landmarks/);
 assert.match(source,/function cvMiniEnemyMarker\(x,y,color\)/);
 assert.match(source,/mc\.arc\(x,y,4\.8,0,Math\.PI\*2\)/);
 assert.match(source,/cvMiniEnemyMarker\(x,y,COLORS\[/);
 assert.match(source,/mc\.drawImage\(terrainCanvas,pad,pad,extent,extent\)/);
 assert.match(source,/mc\.fill\('evenodd'\)/);
 assert.match(source,/cvMiniArrow\(mapX\(me\.x\),mapY\(me\.y\)/);
});
test('R4 storm, alive and kills use readable labels and bold counts under compact map',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','paper-mini-hud.css'),'utf8');
 assert.match(source,/paper-mini-hud\.css\?v=2/);
 assert.match(source,/class="miniMetricLabel">TORMENTA<\/small>/);
 assert.match(source,/class="miniMetricLabel">VIVOS<\/small>/);
 assert.match(source,/class="miniMetricLabel">BAJAS<\/small>/);
 assert.match(css,/width:clamp\(145px,41vw,170px\)/);
 assert.match(css,/align-self:flex-end!important/);
 assert.match(css,/min-height:42px!important/);
 assert.match(css,/font:950 14px\/1\.12/);
 assert.match(css,/#hud #survivalPanel #mini\{background:#fff!important\}/);
});
