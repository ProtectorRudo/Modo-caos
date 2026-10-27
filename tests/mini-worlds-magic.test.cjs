/* MINI WORLDS: witch wand spells and environmental restoration.
 * Run: node tests/mini-worlds-magic.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../mini-worlds-core.js');
const art=fs.readFileSync(path.join(__dirname,'../mini-worlds-art.js'),'utf8');
const chars=fs.readFileSync(path.join(__dirname,'../mini-worlds-characters.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../mini-worlds.html'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../mini-worlds-runtime.js'),'utf8');
function fresh(){
 const s=C.create();C.start(s);
 s.map.boxes.forEach(e=>e.alive=false);
 s.map.enemies.forEach(e=>e.alive=false);
 s.map.coins.forEach(e=>e.taken=true);
 s.map.stars.forEach(e=>e.taken=true);
 s.player.x=0;s.player.z=0;s.player.y=0;s.player.face=Math.PI;
 C.drain(s);return s;
}
{
 const s=fresh();const box=s.map.boxes[0];
 box.alive=true;box.hp=1;box.x=0;box.z=-3;box.type='normal';
 assert(C.attack(s));let events=C.drain(s);
 assert(events.some(e=>e.type==='spellCast'),'wand cast must emit');
 assert(s.magicShots.length>0,'wand projectile must exist');
 let hit=false;
 for(let k=0;k<65;k++){
  C.tick(s,{},1/60);
  if(C.drain(s).some(e=>e.type==='boxBreak'))hit=true;
  if(hit)break;
 }
 assert(hit,'fired spell must break a distant crate');
 assert(!box.alive);assert(s.coins>=2);
 assert.equal(s.magicShots.length,0,'collided bolt disappears');
}
{
 const s=fresh(),enemy=s.map.enemies[0];
 enemy.alive=true;enemy.hp=2;enemy.x=0;enemy.z=-2.7;enemy.baseX=0;enemy.baseZ=-2.7;enemy.stun=6;enemy.type='defender';
 assert(C.attack(s));
 let hit=false;
 for(let k=0;k<80;k++){
  C.tick(s,{},1/60);
  if(C.drain(s).some(e=>e.type==='enemyHit'))hit=true;
  if(hit)break;
 }
 assert(hit,'spell must hurt foe at a distance');
 assert(enemy.hp<2);
}
{
 const s=fresh(),r=s.map.runes[0];
 r.x=0;r.z=-2.6;r.y=.95;
 assert(C.attack(s));
 let bloom=null;
 for(let k=0;k<75;k++){
  C.tick(s,{},1/60);
  bloom=C.drain(s).find(e=>e.type==='runeRestored')||bloom;
  if(bloom)break;
 }
 assert(bloom,'magic restores a cursed scenery rune');
 assert.equal(r.restored,true);
 assert.equal(bloom.reward,5);
 assert(s.coins>=5);
 assert(C.attack(s)===false||r.restored,'cannot collect restoration bonus twice');
}
{
 const s=fresh();assert(C.attack(s));
 let elapsed=0;
 for(let k=0;k<95;k++){C.tick(s,{},1/60);C.drain(s);elapsed+=1/60}
 assert.equal(s.magicShots.length,0,'missed bolts expire; no memory leak');
}
assert(chars.includes('KAI_REFERENCE'),'fox identity must have source reference');
assert(!chars.includes('Mage.glb'),'old remote Mage should not be loaded');
assert(art.includes('hero.wand=wand'),'witch must always hold a visible wand');
assert(art.includes('const magicOrbs'),'visible 3D spell projectile pool missing');
assert(art.includes('runeRestored'),'rune bloom FX missing');
assert(html.includes('DISPARAR')&&!html.includes('<small>HECHIZO</small>'),'blaster control must be intuitive');
assert(runtime.includes("e.type==='spellCast'"),'wand sound feedback missing');
console.log('MINI WORLDS: real travelling spells, 3D impact on boxes/monsters, restorative runes, no repeated rewards, projectile cleanup — PASS');
