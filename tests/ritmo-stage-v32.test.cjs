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
 assert.match(page,/ritmo-glb-props\.js\?v=33/);
 assert.match(page,/ritmo-exterior\.js\?v=33/);
 assert.match(page,/ritmo-stage-showtime\.js\?v=33/);
 assert.ok(page.includes('/ritmo-runtime.js?v=31'), 'core game behavior stays V31');
});
test('horse DJ elbow and wrist curve in toward the two CDJ targets',async()=>{
 const filename=path.join(root,'assets/ritmo/dj-quaternius-punk.glb');
 const world={fetch:async url=>({
  ok:true,arrayBuffer:async()=>Uint8Array.from(fs.readFileSync(path.join(root,url))).buffer
 })};
 new Function('window',glb)(world);
 // fetch path's leading slash must be resolved under repository checkout.
 const originalFetch=world.fetch;
 world.fetch=async url=>({ok:true,arrayBuffer:async()=>{
  const target=path.join(root,url.replace(/^\/+/,''));
  return Uint8Array.from(fs.readFileSync(target)).buffer;
 }});
 const character=world.RitmoImportedProps.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.ok(character.has('quaternius-punk'));
 const original=world.RitmoImportedProps.parse(
  Uint8Array.from(fs.readFileSync(filename)).buffer,'Punk_Body'
 );
 let index=0,wrists=[],elbows=[],mesh=[];
 const output=[];
 const surface=(m,A,B,C,D,col)=>{assert.equal(m,mesh);output.push([A,B,C]);};
 assert.equal(character.drawCharacter(mesh,surface,3,.65,2,0),true);
 assert.equal(output.length,2958);
 for(let i=0;i<original.length;i++){
  for(let j=0;j<3;j++){
   const p=original[i][['A','B','C'][j]],v=output[i][j],d=Math.abs(p[0]);
   if(d>.74)wrists.push(v);
   if(d>.41&&d<.51)elbows.push(v);
  }
 }
 assert.ok(wrists.length>100&&elbows.length>30);
 const wx=wrists.reduce((a,p)=>a+Math.abs(p[0]),0)/wrists.length;
 const ex=elbows.reduce((a,p)=>a+Math.abs(p[0]),0)/elbows.length;
 const wy=wrists.reduce((a,p)=>a+p[1],0)/wrists.length;
 assert.ok(wx>=.14&&wx<.225, 'hands near ±0.17m CDJs; got '+wx);
 assert.ok(ex>wx+.055,'elbows remain farther outward than hands');
 assert.ok(wy>.29&&wy<.43,'hands near mixer surface, got '+wy);
 for(const rows of output)for(const p of rows){assert.ok(p.every(Number.isFinite));assert.ok(p[2]<-1.15)}
});
test('reduced quality halves dynamic Punk polygons without changing coordinates',async()=>{
 const w={fetch:async url=>({ok:true,arrayBuffer:async()=>Uint8Array.from(fs.readFileSync(path.join(root,url.replace(/^\/+/,'')))).buffer})};
 new Function('window',glb)(w);
 const props=w.RitmoImportedProps.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 const tally=q=>{let count=0;props.drawCharacter([],()=>count++,1,.4,q);return count};
 assert.equal(tally(2),2958);
 assert.equal(tally(0),1479);
});
test('grounded symmetric speakers, low fascia and single truss are behind floor',()=>{
 const x=make({quality:2});
 x.scene.render(.25,2,{combo:20},{low:.8,mid:.4});
 for(const [xx,yy,zz] of x.pts){
  assert.ok(zz< -1.14,'stage geometry invaded lanes: '+JSON.stringify([xx,yy,zz]));
 }
 const fac=x.calls.find(v=>v.type==='part'&&v.key==='facade');
 assert.deepEqual(fac.settings.scale,[.36,.235,.35]);
 const trusses=x.calls.filter(v=>v.type==='part'&&v.key==='truss');
 assert.equal(trusses.length,1,'no duplicated truss');
 const subs=x.calls.find(v=>v.type==='part'&&v.key==='speaker-sub');
 const mids=x.calls.find(v=>v.type==='part'&&v.key==='speaker-mid');
 assert.equal(subs.settings.length,2);assert.equal(mids.settings.length,2);
 assert.equal(subs.settings[0].offset[0],-subs.settings[1].offset[0]);
 assert.equal(mids.settings[0].offset[0],-mids.settings[1].offset[0]);
 assert.equal(subs.settings[0].offset[1],.038);
 const decals=x.panels.filter(p=>Math.abs(p.z+1.811)<.009);
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
