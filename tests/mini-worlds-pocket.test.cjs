/* MINI WORLDS: compact XR portal rooms, reversible navigation and anchor invariance.
 * Run: node tests/mini-worlds-pocket.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../mini-worlds-pocket.js'),'utf8');
const core=fs.readFileSync(path.join(__dirname,'../mini-worlds-core.js'),'utf8');
const art=fs.readFileSync(path.join(__dirname,'../mini-worlds-art.js'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../mini-worlds-runtime.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../mini-worlds.html'),'utf8');
const C=require('../mini-worlds-core.js');
class G{
 constructor(){this.children=[];this.position={x:0,y:0,z:0};this.visible=true;this.parent=null;this.name=''}
 add(o){if(o.parent)o.parent.children=o.parent.children.filter(c=>c!==o);o.parent=this;this.children.push(o)}
}
const ctx={window:{}};vm.runInNewContext(code,ctx);
const P=ctx.window.MiniWorldsPocket;
assert.equal(P.ROOMS.length,4);
assert.equal(P.roomAtZ(0),0);assert.equal(P.roomAtZ(-8),1);
assert.equal(P.roomAtZ(-14),2);assert.equal(P.roomAtZ(-24),3);
const footprint=P.displayLength(.215);
assert(footprint.width>2&&footprint.width<3,'living-room width must remain 2–3 m');
assert(footprint.length<2.5,'active room length must fit ordinary home');
const anchor=new G(),world=new G();anchor.add(world);
anchor.position.x=.25;anchor.position.y=-.11;anchor.position.z=-.48;
const nodes=[0,-8,-14,-24].map((z,i)=>{const o=new G();o.position.z=z;o.name='sector '+i;world.add(o);return o});
const hero=new G(),ocean=new G();hero.position.z=0;ocean.position.z=-11.35;
ocean.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z}};
world.add(hero);world.add(ocean);
const stage={root:anchor,worldRoot:world,map:C.level(0),hero:{root:hero},ocean:{ocean,o:ocean}};
const pocket=P.create({Group:G},stage);
assert.equal(pocket.room,0);assert.equal(nodes[0].parent.visible,true);
assert.equal(nodes[3].parent.visible,false);
assert.equal(ocean.parent,world,'water follows the fixed pocket footprint');
assert.equal(ocean.scale.x,.66);assert.equal(ocean.scale.y,.265);
assert.equal(world.position.z,0);
for(const [z,room] of [[-8,1],[-14,2],[-24,3],[-14,2],[-8,1],[0,0]]){
 const result=pocket.sync(z);
 assert.equal(pocket.room,room);assert(result&&result.room===room);
 assert.equal(world.position.z,P.ROOMS[room].offset);
 assert.equal(world.position.y,P.ROOMS[room].floor*1.55);
 assert.equal(anchor.position.x,.25);assert.equal(anchor.position.y,-.11);assert.equal(anchor.position.z,-.48);
 assert.equal(nodes[room].parent.visible,true,'active room must appear');
 for(let i=0;i<4;i++)if(i!==room)assert.equal(nodes[i].parent.visible,false,'distant rooms must not render');
 assert.equal(hero.parent,world,'witch must remain visible and follow logical progress');
 assert(Math.abs(ocean.position.z+world.position.z+2)<.001,'water is stable in room space');
}
assert.equal(pocket.transitions,6,'forward and reverse transitions must work');
assert.equal(pocket.sync(0),false,'no room reallocation while idle');
assert(runtime.includes('stage.pocket?.sync(game.player.z)'),'core logical progress drives portal switching');
assert(runtime.includes('stage.root.rotation.y'),'fixed tracked anchor must be retained');
assert(runtime.includes('scale=.215'),'default physical placement must be compact');
assert(art.includes('root:anchorRoot,worldRoot:root'),'world scene transform must be independent of XR anchor');
assert(html.includes('mini-worlds-pocket.js')&&html.includes('portalFlash'),'portal transitions must be loaded');
console.log('MINI WORLDS: 4 pocket rooms, 2 virtual floors, 2.5×1.9 m footprint, 6 reversible transitions and immutable AR anchor — PASS');
