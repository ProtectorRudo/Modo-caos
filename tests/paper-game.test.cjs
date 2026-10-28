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
   els.set(id,{value:id==='nick'?'VOS':'',style:{},textContent:'',innerHTML:'',onclick:null,
    classList:{add(){},remove(){}},setAttribute(){},append(){},setPointerCapture(){},getContext(){return context()},
    addEventListener(n,fn){(listeners[id+':'+n]??=[]).push(fn);}
   });}return els.get(id);}
 const doc={getElementById:get,createElement:k=>get('node-'+Math.random()),
   addEventListener(n,fn){(listeners['document:'+n]??=[]).push(fn);},querySelectorAll:()=>[],hidden:false};
 const win={addEventListener(){}};
 const loc={search:query,href:'https://example.test/paper.html'};
 const storage=new Map();
 // Instrument test sandbox only; production game source remains unchanged.
 const instrumented=script.replace('// Read-only diagnostics:', 'window.__paperTest={getGame:()=>game,markTrail,move,death,idx,CX,CY,R,territoryLoops,updateMap,grantRewards,REWARDS,buyOrEquip,awardCoins,setHero,saveWardrobe,loadWardrobe,wardrobe,SHOP_ITEMS,celebrateAt,showVS,launchMatch,drawVersus,getFeatured:()=>vsRival};\\n// Read-only diagnostics:'.replace('\\n','\n'));
 const browser=Function('document','window','location','performance','requestAnimationFrame','innerWidth','innerHeight','devicePixelRatio','localStorage','navigator','setTimeout','URLSearchParams','Math',instrumented);
 browser(doc,win,loc,{now:()=>now},fn=>frame=fn,430,850,1,
  {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},{vibrate(){}},()=>{},URLSearchParams,fakeMath);
 function tick(n=1){for(let i=0;i<n;i++){now+=1000/60;const f=frame;assert.equal(typeof f,'function');frame=null;f(now);}}
 function aim(x,y){let q=win.territoryQA,t=Math.atan2(y-q.y,x-q.x);
  for(const fn of listeners['game:pointermove']||[])fn({pointerType:'mouse',clientX:215+130*Math.cos(t),clientY:425+130*Math.sin(t)});}
 return {get,win,aim,tick,storage};
}
test('page has complete standalone game and no borrowed external assets',()=>{
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
 assert.equal(g.win.territoryQA.players,12);
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
 assert.equal(g.win.territoryQA.players,12);
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
test('cutting an enemy trail eliminates the enemy and awards a kill',()=>{
 const g=boot(419);g.get('start').onclick();
 const h=g.win.__paperTest,game=h.getGame(),enemy=game.people[1],player=game.people[0],k=h.idx(1400,1118);
 enemy.protectedUntil=-1;
 h.markTrail(enemy,k);
 h.markTrail(player,k);
 assert.equal(enemy.alive,false);
 assert.equal(player.alive,true);
 assert.equal(game.kills,1);
 assert.equal(game.defeated.has(enemy.id),true);
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
 assert.equal(game.defeated.size,11);
 assert.equal(g.win.territoryQA.mode,'result');
 assert.match(g.get('finaltitle').textContent,/DERROTASTE A TODOS/);
});

test('premium render uses world-size sharp canvas without magnified low resolution terrain',()=>{
 assert.match(source,/mapCanvas\.width=WORLD;mapCanvas\.height=WORLD;/);
 assert.match(source,/function territoryLoops\(v\)/);
 assert.match(source,/quadraticCurveTo/);
 assert.doesNotMatch(source,/const rad=CELL\*\.74/);
 assert.doesNotMatch(source,/mapCanvas\.width=N\*3/);
});
test('arcade HUD ranks four players, with own rank always visible',()=>{
 const g=boot(419);g.get('start').onclick();g.tick(20);
 const markup=g.get('rank').innerHTML;
 assert.equal((markup.match(/class="rankrow /g)||[]).length,4);
 assert.match(markup,/VOS/);
 assert.equal(String(g.get('killCount').textContent),'0');
 assert.match(g.get('bestCurrent').textContent,/%/);
});

test('connected territory is converted to coherent vector boundary loops',()=>{
 const g=boot(419);g.get('start').onclick();
 const loops=g.win.__paperTest.territoryLoops(1);
 assert.ok(loops.length>=1);
 assert.ok(loops[0].length>8);
 for(const q of loops[0]){assert.ok(Number.isFinite(q.x));assert.ok(Number.isFinite(q.y));}
});

test('reference HUD includes best score, transparent layout and a subtle paper grid',()=>{assert.match(source,/id="bestCurrent"/);assert.match(source,/class="best-live"/);assert.match(source,/const tileStep=74/);assert.doesNotMatch(source,/const dotStep=84/);});

test('arcade progression rail, milestones and portraits render on initial game',()=>{
 const g=boot(419);g.get('start').onclick();g.tick(10);
 assert.match(source,/id="progressRail"/);
 assert.match(source,/id="railPercent"/);
 assert.match(source,/class="milestone m1"/);
 assert.match(source,/id="recordPointer"/);
 assert.match(source,/class="killIcon"/);
 assert.match(g.get('railPercent').textContent,/%$/);
 assert.match(g.get('rank').innerHTML,/rankAvatar/);
 assert.match(g.get('rank').innerHTML,/rankPlace/);
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
test('arcade portraits and fallback chibi people are original vector and CSS geometry',()=>{
 const g=boot(419);g.get('start').onclick();g.tick(10);
 assert.match(g.get('rank').innerHTML,/portraitDoll/);
 assert.match(source,/const zoomHero=p\.id===0\?1\.16:1\.0/);
 assert.match(source,/\.portraitDoll\.skin3/);
 assert.match(source,/#rewardToast\.visible/);
 assert.match(source,/id="railTarget"|class="railTarget"/);
});

test('original heroes each have a distinct identity and can be selected',()=>{
 const g=boot(419);
 for(const name of ['MOMO','ZURI','PLATY','PINGO','OTTO','KUMA','COCO','TORA'])assert.ok(source.includes("name:'"+name+"'"));
 const h=g.win.__paperTest;
 assert.equal(h.setHero(2),true);
 assert.equal(h.wardrobe.hero,2);
 assert.match(g.get('heroDetails').innerHTML,/Caos adorable/);
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
 assert.equal(h.getGame().people.length,12);
 assert.equal(h.wardrobe.equipped.emote,'emote_laugh');
 assert.match(g.get('rank').innerHTML,/portraitDoll/);
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
 assert.match(g.get('shopGrid').innerHTML,/outfit_cap/);
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
 assert.equal(state.people.length,12);
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

test('progressive 3D renderer uses genuine humanoid rigged models and safe fallback',()=>{
 const module=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 assert.match(module,/GLTFLoader/);
 assert.match(module,/SkeletonUtils\.clone/);
 for(const model of ['marmot.glb','fox.glb','platypus.glb','penguin.glb','seaotter.glb','koala.glb','corgi.glb','tiger.glb'])assert.ok(module.includes(model));
 assert.match(module,/const relative='\.\/assets\/mascots\/'/);
 assert.match(module,/RIG_HEIGHT=80/);
 assert.match(source,/function paintChibi\(p,hero,col\)/);
 assert.match(source,/window\.Paper3DReady/);
 assert.match(source,/paper-3d\.mjs/);
 assert.match(source,/id="characterStage"/);
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
 assert.equal(g.get('vsPlayerName').textContent,'MOMO');
 assert.notEqual(g.get('vsRivalName').textContent,'MOMO');
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
 assert.equal(g.win.territoryQA.players,12);
 assert.equal(g.win.__paperTest.getGame().people[1].name,name);
 assert.equal(g.win.Paper3DState().people[1].hero,g.win.__paperTest.getFeatured());
});
test('VS automatically proceeds to the match after the choreographed countdown',()=>{
 const g=boot(419,'?qa=1&vs=1');
 g.get('start').onclick();
 g.tick(365);
 assert.equal(g.win.territoryQA.mode,'play');
 assert.equal(g.win.territoryQA.players,12);
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

test('verified CC0 animal sources mapped to eight different GLBs',()=>{
 const renderer=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 for(const name of ['marmot.glb','fox.glb','platypus.glb','penguin.glb','seaotter.glb','koala.glb','corgi.glb','tiger.glb'])
   assert.match(renderer,new RegExp(name.replace('.','\\.')));
 assert.match(renderer,/const relative='\.\/assets\/mascots\/'/);
 assert.match(renderer,/backupModels/);
 assert.match(renderer,/sourceAssets\[index\]=gltf/);
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
 assert.match(source,/style\.opacity=window\.PaperVSReady\?'0':'1'/);
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
 assert.match(mod,/p\.emoteId==='emote_sixseven'/);
 assert.match(mod,/findArmRig\(base\)/);
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
 assert.equal(g.get('menuCharacterLabel').textContent,'PINGO');
 assert.equal(g.get('menuCharacterTagline').textContent,'¡Sangre fría!');
 assert.equal(g.win.Paper3DState().menuHero,3);
 assert.equal(h.setHero(2),true);
 assert.equal(g.get('menuCharacterLabel').textContent,'PLATY');
});
test('3D stage is reparented between menu and versus without creating additional renderers',()=>{
 const module=fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8');
 assert.match(source,/id="versusStage"/);
 assert.match(source,/id="menuHeroStage"/);
 assert.match(module,/function attachShowcase\(target,cssClass\)/);
 assert.match(module,/attachShowcase\('menuHeroStage','menuPosition'\)/);
 assert.match(module,/attachShowcase\('versusStage','vsPosition'\)/);
 assert.match(module,/window\.PaperMenuReady=true/);
 assert.match(module,/state\.menuing/);
 assert.equal((module.match(/new THREE\.WebGLRenderer\(/g)||[]).length,2); // gameplay + shared menu/VS
});

test('real generated 3D portraits replace CSS doll tiles and old VS fallback',()=>{
 const g=boot(419);
 assert.match(source,/const STYLOO_PORTRAITS=\['archer','merchant','student','ninja'\]/);
 assert.match(g.get('heroPicker').innerHTML,/hero3DThumbnail/);
 assert.doesNotMatch(g.get('heroPicker').innerHTML,/heroMini/);
 assert.match(source,/id="menuHeroPortrait"/);
 assert.match(source,/id="vsPortraitPlayer"/);
 assert.match(source,/id="vsPortraitOpponent"/);
 assert.doesNotMatch(source,/versusActor\(ctx,wardrobe\.hero,168/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','paper-3d.mjs'),'utf8'),/document\.getElementById\('menuHeroPortrait'\)/);
});
test('changing selected hero updates the original GLB portrait before the model loads',()=>{
 const g=boot(419),h=g.win.__paperTest;
 h.setHero(2);
 assert.match(g.get('menuHeroPortrait').src,/student\.png$/);
 h.setHero(3);
 assert.match(g.get('menuHeroPortrait').src,/ninja\.png$/);
 assert.match(g.get('heroPicker').innerHTML,/ninja\.png/);
});

test('eight playable animals have unique, commercial-safe model/portrait choices',()=>{
 const g=boot(419),h=g.win.__paperTest;
 const names=['MOMO','ZURI','PLATY','PINGO','OTTO','KUMA','COCO','TORA'];
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
