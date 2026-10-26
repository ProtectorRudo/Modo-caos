'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ritmo-exterior.js'),'utf8');
const stage=fs.readFileSync(path.join(root,'ritmo-stage-showtime.js'),'utf8');
const html=fs.readFileSync(path.join(root,'ritmo.html'),'utf8');
const opts={window:{}};
vm.runInNewContext(source,opts,{timeout:2000});
function setup(quality=2){
 const mesh=[],illum=[],positions=[];
 function add(arr,vertices){
  for(const point of vertices){assert(point.every(Number.isFinite));positions.push(point);arr.push(...point)}
 }
 const api={
  mesh,illum,getQuality:()=>quality,
  surface:(arr,A,B,C,D)=>add(arr,[A,B,C,D]),
  cuboid:(arr,x,y,z,w,h,d)=>add(arr,[[x-w/2,y,z-d/2],[x+w/2,y+h,z+d/2]]),
  annulus:(arr,x,y,z,ri,ro)=>add(arr,[[x-ro,y-ro,z-ro],[x+ro,y+ro,z+ro]]),
  disc:(arr,x,y,z,r)=>add(arr,[[x-r,y-r,z-r],[x+r,y+r,z+r]])
 };
 return{api,positions,mesh,illum,renderer:opts.window.RitmoExterior.create(api)};
}
test('external 3D decorator registers safely without changing core',()=>{
 assert.ok(opts.window.RitmoExterior);
 assert.ok(stage.includes('exterior?.render(size,time,game'));
 assert.ok(!source.includes('navigator.xr')&&!source.includes('RitmoCore'));
});
test('load order: exterior before premium WebGL scene',()=>{
 assert.ok(html.indexOf('/ritmo-exterior.js')>0);
 assert.ok(html.indexOf('/ritmo-exterior.js')<html.indexOf('/ritmo-stage-showtime.js'));
});
test('DJ, LED, turntables, light rig and speakers produce finite world geometry',()=>{
 const v=setup();v.renderer.render(.25,1,{combo:0},{low:.15,mid:.30});
 assert.ok(v.mesh.length>300);
 assert.ok(v.illum.length>100);
 for(const p of v.positions)assert.ok(p.every(Number.isFinite));
});
test('scenery does not enter four-lane note spawn, scoring or walking zone',()=>{
 const v=setup();
 for(let i=0;i<10;i++)v.renderer.render(.25,i/10,{combo:10+i},{low:.45,mid:.55});
 for(const [x,y,z] of v.positions){
  // The space closer to the user (z >= -1.15) remains empty in the 1m-wide track.
  assert.ok(z< -1.14 || Math.abs(x)>.50,JSON.stringify({x,y,z}));
 }
});
test('combo and music animate the avatar and lights',()=>{
 const v=setup();
 v.renderer.render(.25,0,{combo:0},{low:0,mid:0});
 const first=JSON.stringify(v.positions);
 v.positions.length=0;v.mesh.length=0;v.illum.length=0;
 v.renderer.render(.25,.5,{combo:30},{low:1,mid:1});
 assert.notEqual(first,JSON.stringify(v.positions));
 assert.ok(v.illum.length>100);
});
test('low graphics mode still shows the complete DJ',()=>{
 const v=setup(0);
 v.renderer.render(.25,1,{combo:0},{low:.1,mid:.1});
 assert.ok(v.mesh.length>300 && v.illum.length>40);
});
