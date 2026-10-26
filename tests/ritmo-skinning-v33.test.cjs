'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const glbFile=path.join(root,'assets/ritmo/dj-quaternius-punk.glb');
const bytes=()=>Uint8Array.from(fs.readFileSync(glbFile)).buffer;
const loader=read('ritmo-glb-props.js'),skin=read('ritmo-skinning.js'),exterior=read('ritmo-exterior.js'),html=read('ritmo.html');
function setup(){
 const world={fetch:async url=>{
  assert.equal(url,'/assets/ritmo/dj-quaternius-punk.glb');
  return{ok:true,arrayBuffer:async()=>bytes()};
 }};
 new Function('window',loader)(world);
 new Function('window',skin)(world);
 return world;
}
test('actual CC0 Punk GLB joint tree and normalized JOINTS_0 weights are parsed',()=>{
 const w=setup(),info=w.RitmoSkeletalDJ.prepare(bytes(),w.RitmoImportedProps.parse);
 assert.equal(info.skinJointCount,49);
 assert.equal(info.triangles.length,2958);
 assert.equal(info.groups.length,info.triangles.length);
 assert.ok(info.bones.L.shoulder[0]>.1&&info.bones.R.shoulder[0]<-.1);
 assert.ok(info.bones.L.elbow[0]>info.bones.L.shoulder[0]);
 for(const tri of info.groups)for(const weights of tri){
  assert.equal(weights.length,5);
  assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<.00001);
  assert.ok(weights.every(w=>w>=0&&w<=1));
 }
 const a=info.groups.flat().filter(g=>g[1]>0.01||g[2]>0.01);
 assert.ok(a.length>300,'real skeletal left-arm weights detected');
});
test('weighted posed mesh keeps all triangles, finite shape, and stable connection',async()=>{
 const w=setup(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'ready');
 assert.deepEqual(dj.info(),{skinJointCount:49,triangles:2958});
 const faces=[],mesh=[];
 function render(time,quality){
  faces.length=0;
  assert.equal(dj.draw(mesh,(m,A,B,C,D,color)=>{
   assert.equal(m,mesh);assert.deepEqual(C,D);assert.ok(color.length===3);
   for(const p of [A,B,C])assert.ok(p.every(Number.isFinite));
   faces.push({A,B,C,color});
  },time,.65,quality,12),true);
  assert.equal(faces.length,2958,'no checkerboard holes in LOW mode');
  return faces.map(f=>({A:f.A.slice(),B:f.B.slice(),C:f.C.slice()}));
 }
 const pose=render(4.1,2),low=render(4.1,0);
 assert.deepEqual(pose,low,'LOW quality must not drop alternating skeletal triangles');
 let longest=0,over=0;
 for(const {A,B,C} of pose){
  const d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
  longest=Math.max(longest,d(A,B),d(B,C),d(C,A));
  if(Math.max(d(A,B),d(B,C),d(C,A))>.22)over++;
  for(const p of [A,B,C]){
   assert.ok(Math.abs(p[0])<.75,'body should not use T-pose x offset');
   assert.ok(p[1]>.25&&p[1]<.80,'body should stay vertically aligned');
   assert.ok(p[2]<-1.32,'body must stay off note spawn');
  }
 }
 assert.ok(over<7, 'no skeletal triangles visibly shredded; count '+over+' max '+longest);
 const next=render(4.48,2);
 assert.notDeepEqual(pose[37],next[37],'pose must respond to the beat');
});
test('wrist aligns near CDJ coordinates without whole-arm manual x clipping',async()=>{
 const w=setup(),dj=w.RitmoSkeletalDJ.create();
 const data=w.RitmoSkeletalDJ.prepare(bytes(),w.RitmoImportedProps.parse);
 await new Promise(setImmediate);await new Promise(setImmediate);
 const wrists=[],elbows=[];let i=0;
 dj.draw([],(m,A,B,C)=>{
  const src=data.triangles[i++],out=[A,B,C];
  for(let k=0;k<3;k++){
   const p=src[['A','B','C'][k]];
   if(Math.abs(p[0])>.75)wrists.push(out[k]);
   if(Math.abs(p[0])>.32&&Math.abs(p[0])<.41)elbows.push(out[k]);
  }
 },3,.45,2,0);
 assert.ok(wrists.length>60&&elbows.length>60);
 const mean=(a,dim)=>a.reduce((v,p)=>v+p[dim],0)/a.length;
 const wx=wrists.reduce((a,p)=>a+Math.abs(p[0]),0)/wrists.length;
 const ex=elbows.reduce((a,p)=>a+Math.abs(p[0]),0)/elbows.length;
 const wy=mean(wrists,1);
 assert.ok(wx>.09&&wx<.29,'hands align closer to center, x='+wx);
 assert.ok(ex>wx,'elbows bend visibly outward');
 assert.ok(wy>.28&&wy<.53,'hands sit near console, y='+wy);
});
test('safe fallback works if WebXR GLB fails; HTML orders V33 dependencies',async()=>{
 const w={fetch:async()=>{throw Error('offline')}};
 new Function('window',loader)(w);new Function('window',skin)(w);
 const dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'fallback');
 assert.equal(dj.draw([],()=>{},1,.5),false);
 const files=['ritmo-glb-props','ritmo-skinning','ritmo-exterior','ritmo-stage-showtime'];
 for(const f of files)assert.ok(html.includes('/'+f+'.js?v=34'),f);
 for(let i=0;i<files.length-1;i++)assert.ok(html.indexOf('/'+files[i]+'.js?v=34')<html.indexOf('/'+files[i+1]+'.js?v=34'));
 assert.match(exterior,/const BACK=\.22/);
 assert.match(exterior,/if\(!skeletal\?\.draw\(mesh,surface,t,low,quality,combo\)\)/);
 assert.match(exterior,/roof=1\.08/);
});
