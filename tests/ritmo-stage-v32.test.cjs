'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const glb=read('ritmo-glb-props.js'),exterior=read('ritmo-exterior.js');
const stage=read('ritmo-stage-showtime.js'),page=read('ritmo.html');
function make(real){
 const tri=[],lit=[],pts=[],calls=[],panels=[];
 const quality=real.quality??2;
 const emit=(target,ps)=>{for(const p of ps){assert.ok(p.every(Number.isFinite));pts.push(p);target.push(...p)}};
 const api={
  mesh:tri,illum:lit,getQuality:()=>quality,
  surface:(target,A,B,C,D,col,opacity)=>{emit(target,[A,B,C,D]);calls.push({type:'face',z:A[2],opacity})},
  cuboid:(target,x,y,z,w,h,d,shade,bevel,opacity)=>{emit(target,[[x-w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z+d/2]]);if(target===lit)panels.push({x,y,z,opacity})},
  annulus:(target,x,y,z,r1,r2)=>emit(target,[[x-r2,y,z],[x+r2,y,z]]),
  disc:(target,x,y,z,r)=>emit(target,[[x-r,y,z],[x+r,y,z]])
 };
 const props={
  ready:()=>true,has:key=>true,
  drawPart:(key,mesh,surface,settings)=>{calls.push({type:'part',key,settings});return true},
  drawCharacter:(mesh,surface,t,l,q,combo)=>{calls.push({type:'body',t,l,q,combo});return true},
  draw:(mesh,surface)=>{calls.push({type:'desk'});return true}
 };
 const window={RitmoImportedProps:{create:()=>props},RitmoSkeletalDJ:{create:()=>({draw:(mesh,surface,t,l,q,combo)=>{calls.push({type:'body',t,l,q,combo});return true}})}};
 new Function('window',exterior)(window);
 const scene=window.RitmoExterior.create(api);
 return{scene,tri,lit,pts,calls,panels};
}
test('V32 changes exterior only, keeps untouched scoring floor and input scripts',()=>{
 assert.match(stage,/const back=-1\.15,front=\.94/);
 assert.match(stage,/const trails=quality===0\?3:5/);
 assert.match(stage,/let z=\.65,r=size\*\.44/);
 assert.match(stage,/try\{exterior\?\.render\(size,time,game/);
 assert.match(page,/ritmo-glb-props\.js\?v=34/);
 assert.match(page,/ritmo-exterior\.js\?v=34/);
 assert.match(page,/ritmo-stage-showtime\.js\?v=34/);
 assert.ok(page.includes('/ritmo-runtime.js?v=31'), 'core game behavior stays V31');
});
test('V33 replaces manual XY warp with named GLB bones and weighted skinning',()=>{
 const skin=read('ritmo-skinning.js');
 assert.match(skin,/JOINTS_0/);
 assert.match(skin,/WEIGHTS_0/);
 assert.match(skin,/LowerArm\.L/);
 assert.match(skin,/UpperArm\.R/);
 assert.ok(exterior.includes('skeletal?.draw('));
 assert.ok(!exterior.includes('props?.drawCharacter('));
});
test('grounded symmetric speakers, low fascia and single truss are behind floor',()=>{
 const x=make({quality:2});
 x.scene.render(.25,2,{combo:20},{low:.8,mid:.4});
 for(const [xx,yy,zz] of x.pts){
  assert.ok(zz< -1.14,'stage geometry invaded lanes: '+JSON.stringify([xx,yy,zz]));
 }
 const fac=x.calls.find(v=>v.type==='part'&&v.key==='facade');
 assert.deepEqual(fac.settings.scale,[.36,.220,.35]);
 const trusses=x.calls.filter(v=>v.type==='part'&&v.key==='truss');
 assert.equal(trusses.length,1,'no duplicated truss');
 const subs=x.calls.find(v=>v.type==='part'&&v.key==='speaker-sub');
 const mids=x.calls.find(v=>v.type==='part'&&v.key==='speaker-mid');
 assert.equal(subs.settings.length,2);assert.equal(mids.settings.length,2);
 assert.equal(subs.settings[0].offset[0],-subs.settings[1].offset[0]);
 assert.equal(mids.settings[0].offset[0],-mids.settings[1].offset[0]);
 assert.equal(subs.settings[0].offset[1],.038);
 const decals=x.panels.filter(p=>Math.abs(p.z+2.031)<.009);
 const center=decals.filter(p=>Math.abs(p.x)<.13);
 const sides=decals.filter(p=>Math.abs(p.x)>.29);
 assert.ok(center.length>0&&sides.length>0);
 const avg=a=>a.reduce((sum,r)=>sum+r.opacity,0)/a.length;
 assert.ok(avg(center)<avg(sides)*.52,'center of LED should dim below side columns');
 assert.ok(x.calls.some(v=>v.type==='body'&&v.combo===20));
});
test('low-quality exterior still preserves LED feedback and uses procedural fallback safely',()=>{
 const x=make({quality:0});
 x.scene.render(.25,4,{combo:0},{low:.3,mid:.25});
 assert.ok(x.tri.length>150 && x.lit.length>80);
 assert.ok(x.pts.every(p=>p.every(Number.isFinite)));
});
