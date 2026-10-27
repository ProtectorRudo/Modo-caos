/* MINI WORLDS — two spacious AR continents, meaningful virtual exploration,
 * reversible navigation and strict spatial anchor preservation.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const get=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const C=require('../mini-worlds-core.js'),ctx={window:{}};
vm.runInNewContext(get('mini-worlds-pocket.js'),ctx);
const P=ctx.window.MiniWorldsPocket;
class G{
 constructor(){this.children=[];this.position={x:0,y:0,z:0};this.visible=true;this.parent=null;this.name=''}
 add(o){if(o.parent)o.parent.children=o.parent.children.filter(x=>x!==o);o.parent=this;this.children.push(o)}
}
assert.equal(P.ROOMS.length,2,'four cramped pocket rooms should become two long chapters');
assert.equal(P.roomAtZ(1.2),0);
assert.equal(P.roomAtZ(-5),0,'no early jump to another world after five steps');
assert.equal(P.roomAtZ(-8),0,'old automatic portal at -5 should be gone');
assert.equal(P.roomAtZ(-11),0,'player should be able to cross two former rooms without jumping');
assert.equal(P.roomAtZ(-14),1);
assert.equal(P.roomAtZ(-24),1);
const size=P.displayLength(.235);
assert(size.width>3.5&&size.length>4,'the AR island should be noticeably larger');
assert(size.width<4.5&&size.length<4.8,'each region must remain usable from one safe standing spot');
const anchor=new G(),world=new G();anchor.add(world);
anchor.position={x:.25,y:-.11,z:-.48};
const nodes=[-2,-8,-16,-24].map((z,i)=>{const o=new G();o.position.z=z;o.name='segment '+i;world.add(o);return o});
const hero=new G(),sea=new G();sea.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z}};
world.add(hero);world.add(sea);
const stage={root:anchor,worldRoot:world,map:C.level(0),hero:{root:hero},ocean:{o:sea}};
const pocket=P.create({Group:G},stage);
assert.equal(pocket.room,0);
assert.equal(nodes[0].parent.visible,true);
assert.equal(nodes[1].parent.visible,true,'both first chapter biomes share one world');
assert.equal(nodes[2].parent.visible,false);
assert.equal(nodes[3].parent.visible,false);
assert.equal(sea.parent,world,'water stays in local chapter instead of moving tracked XR anchor');
assert.equal(sea.scale.x,.92);assert.equal(sea.scale.y,.56);
assert.equal(pocket.sync(-8),false,'walking in the first large region must never teleport');
assert.equal(pocket.transitions,0);
assert.equal(pocket.sync(-11.9),false);
for(const [z,id] of [[-13,1],[-25,1],[-9,0],[-16,1],[-1,0]]){
 const was=pocket.room,transition=pocket.sync(z);
 assert.equal(pocket.room,id);
 assert.equal(Boolean(transition),was!==id,'only region boundaries may trigger a portal');
 assert.equal(world.position.z,P.ROOMS[id].offset);
 assert.equal(world.position.y,P.ROOMS[id].floor*1.55);
 assert.equal(anchor.position.x,.25);assert.equal(anchor.position.y,-.11);assert.equal(anchor.position.z,-.48);
 assert.equal(hero.parent,world,'fox must never be hidden by a sector switch');
 assert(Math.abs(sea.position.z+world.position.z+5.35)<.001);
 for(let i=0;i<4;i++)assert.equal(nodes[i].parent.visible,Math.floor(i/2)===id,'entire 2-region visual partition follows physics');
}
assert.equal(pocket.transitions,4,'only deliberate long-distance crossings change zones');
assert.equal(pocket.sync(0),false);
const runtime=get('mini-worlds-runtime.js'),html=get('mini-worlds.html'),art=get('mini-worlds-art.js');
assert(runtime.includes('stage.pocket?.sync(game.player.z)'),'logical progress drives portal switching');
assert(runtime.includes('scale=.235'),'the bigger AR footprint must be the actual default');
assert(runtime.includes('stage.root.rotation.y'),'tracked XR anchor must remain independent from virtual region');
assert(art.includes('root:anchorRoot,worldRoot:root'),'world transform cannot become XR anchor');
assert(html.includes('mini-worlds-pocket.js')&&html.includes('mini-worlds-diorama.js'));
console.log('MINI WORLDS: 2 long AR regions >3.5m, no jump at old portal, reverse traversal, immutable anchor, wider lagoon: PASS');
