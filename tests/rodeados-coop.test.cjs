'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../rodeados-core.js');
const ray={origin:{x:0,y:1.5,z:-2.4},direction:{x:0,y:0,z:1}};
test('host and guest fire indefinitely with no reload and separate cadence clocks',()=>{
 const g=G.create({ownerId:'host',seed:42});G.begin(g);
 assert.equal(G.fire(g,ray,'host').ok,true);
 assert.equal(G.fire(g,ray,'guest').ok,true);
 assert.equal(g.ammo,28);assert.equal(g.peerWeapons.guest.ammo,28);
 assert.equal(G.reload(g,'guest'),false);
 assert.equal(g.peerWeapons.guest.reload,0);
 assert.equal(G.fire(g,ray,'guest').ok,false,'guest cadence still enforced');
 assert.equal(G.fire(g,ray,'host').ok,true,'host is independent');
 for(let i=0;i<3;i++)G.advance(g,.07);
 assert.equal(G.fire(g,ray,'guest').ok,true);
 assert.equal(g.peerWeapons.guest.ammo,28);
 assert.equal(g.ammo,28);
});
test('guest burst shots cannot bypass host minimum cadence',()=>{
 const g=G.create({ownerId:'host',seed:13});G.begin(g);
 assert.equal(G.fire(g,ray,'guest').ok,true);
 assert.equal(G.fire(g,ray,'guest').ok,false);
 assert.equal(g.peerWeapons.guest.ammo,28);
 for(let i=0;i<3;i++)G.advance(g,.07);
 assert.equal(G.fire(g,ray,'guest').ok,true);
 assert.equal(g.peerWeapons.guest.ammo,28);
});
test('4 players cannot drain one another ammunition',()=>{
 const g=G.create({ownerId:'p1'});G.begin(g);
 for(const name of ['p2','p3','p4'])G.fire(g,ray,name);
 assert.equal(g.ammo,28);
 for(const name of ['p2','p3','p4'])assert.equal(g.peerWeapons[name].ammo,28);
 G.fire(g,ray,'p1');
 assert.equal(g.ammo,28);
});
test('solo game retains infinite ammo even with custom shooter labels',()=>{
 const g=G.create({seed:23});G.begin(g);G.fire(g,ray,'some-label');
 assert.equal(g.ammo,28);
 assert.equal(Object.keys(g.peerWeapons).length,0);
});
