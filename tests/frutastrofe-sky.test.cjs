'use strict';
const assert=require('node:assert/strict'),C=require('../frutastrofe-core.js');
const g=C.create({seed:888,mode:'arcade'});
g.begin();assert.equal(g.objects.length,0,'the rain is timed, never spawned in one cluster');
g.update(.05);assert.equal(g.objects.length,1,'first sky fruit is launched when round begins');
const first=g.objects[0];assert(first.y>=9.2&&first.y<=9.8,'first fruit originates high above floor');const initialY=first.y;
for(let i=0;i<8;i++)g.update(.05);assert(first.y<initialY,'gravity pulls fruit down');
assert(Math.abs(first.vx)<.13,'fruit does not shoot sideways from floor');
for(let i=0;i<32;i++)g.update(.05);
assert(g.objects.length>=3,'staggered intro and regular sky rain are present');
const active=g.objects.filter(q=>q.age<.7);const x=active.map(q=>q.x);
assert(new Set(x.map(v=>Math.round(v*10))).size>1,'consecutive fruits use different sky lanes');
let max=0;
for(let i=0;i<30*20&&g.state==='playing';i++){g.update(.05);max=Math.max(max,g.objects.length);assert(g.objects.length<=13,'never flood screen with overlapping objects')}
assert(max>=3,'game sustains a visible but manageable sky shower');
for(const o of g.objects)assert(o.y<10.3,'all fruits remain under ceiling');
const p=C.create({level:3,seed:11});p.begin();for(let i=0;i<12*20;i++)p.update(.05);
assert(p.events.some(e=>e.type==='opportunity'),'combo windows remain scheduled');
console.log('PASS FRUTASTROFE SKY: staggered high-altitude fruit, varied lanes, gravity and capped on-screen density');
