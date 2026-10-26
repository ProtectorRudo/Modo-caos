'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const file=()=>Uint8Array.from(fs.readFileSync(path.join(root,'assets/ritmo/dj-quaternius-punk.glb'))).buffer;
const skin=read('ritmo-skinning.js'),loader=read('ritmo-glb-props.js'),scene=read('ritmo-exterior.js'),html=read('ritmo.html');
function setup(){
 const w={fetch:async url=>({ok:true,arrayBuffer:async()=>file()})};
 new Function('window',loader)(w);new Function('window',skin)(w);
 return w;
}
const near=(a,b,e=.015)=>Math.abs(a-b)<=e;
test('real rest skeleton solves wrist coordinates onto two CDJs, with distinct elbow targets',()=>{
 const w=setup(),data=w.RitmoSkeletalDJ.prepare(file(),w.RitmoImportedProps.parse);
 for(const t of [0,1.2,4.5,10.3]){
  const frame=w.RitmoSkeletalDJ.poseFrame(data.bones,t,.55,0);
  for(const [name,ix] of [['L',1],['R',-1]]){
   const b=data.bones[name],f=frame[name];
   const weight=name==='L'?[0,0,1,0,0]:[0,0,0,0,1];
   const warped=w.RitmoSkeletalDJ.posePoint(b.wrist,weight,data.bones,t,.55,0,frame);
   assert.ok(near(warped[0],f.wristWorld[0],.005),name+' actual wrist must reach requested x: '+warped+' vs '+f.wristWorld);
   assert.ok(near(warped[1],f.wristWorld[1],.017),name+' real wrist should be above controller surface: '+warped[1]);
   assert.ok(near(warped[2],f.wristWorld[2],.032),name+' projected wrist z: '+warped[2]);
   assert.ok(Math.abs(warped[0])>=.15&&Math.abs(warped[0])<=.19);
   assert.ok(warped[1]>.375&&warped[1]<.49);
   assert.ok(f.elbow[0]*ix > Math.abs(f.wristWorld[0]/.86)+.027,'elbow must bend away from center, not hands-on-hips pose');
   assert.ok(f.upperLen>.14&&f.lowerLen>.18);
  }
 }
});
test('weighted mesh preserves 2958 triangles, natural elbows and moves hands at BPM',async()=>{
 const w=setup(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'ready');
 const hands0=dj.hands(0,.65,0),hands1=dj.hands(.5,.65,0),raise=dj.hands(1,.8,30);
 assert.ok(hands0&&hands1&&raise);
 assert.notDeepEqual(hands0,hands1,'wrist move on beat');
 assert.ok(raise.R[1]>dj.hands(1,.8,0).R[1],'combo pumps right hand');
 for(const quality of [0,1,2]){
  let count=0,large=0,minZ=Infinity,maxY=-Infinity;
  const batches=[];
  dj.draw([],(mesh,A,B,C,D,color)=>{
   count++;
   assert.deepEqual(C,D);
   const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
   const extent=Math.max(dist(A,B),dist(B,C),dist(A,C));
   if(extent>.22)large++;
   for(const p of [A,B,C]){assert.ok(p.every(Number.isFinite));minZ=Math.min(minZ,p[2]);maxY=Math.max(maxY,p[1])}
   batches.push(color);
  },1.9,.8,quality,20);
  assert.equal(count,2958,'low mode must not create holes');
  assert.ok(large<7,'skinned mesh must not shred: '+large);
  assert.ok(minZ< -1.5&&maxY<.9);
  assert.ok(batches.every(c=>c.length===3&&c.every(Number.isFinite)));
 }
});
test('dark worktop, sound controls, grounded platform and wrist FX are present',()=>{
 assert.ok(scene.includes("props.draw(mesh,surface,{deskOnly:true})"));
 assert.ok(scene.includes("const workY=.355,workZ=-1.437"));
 assert.ok(scene.includes("const controlsY=workY+.029"));
 assert.ok(scene.includes("props.drawPart('cdj'"));
 assert.ok(scene.includes("props.drawPart('mixer'"));
 assert.ok(scene.includes("skeletal?.hands?.(t,low,combo)"));
 assert.ok(scene.includes("cuboid(mesh,fx,.014,fz"));
 assert.ok(scene.includes("const BACK=.22"));
 for(const name of ['ritmo-glb-props','ritmo-skinning','ritmo-exterior','ritmo-stage-showtime']){
  assert.ok(html.includes('/'+name+'.js?v=34'),name);
 }
});
test('gameplay and virtual tracks are original V33 and not pushed by V34',()=>{
 const track=read('ritmo-stage-showtime.js'),rt=read('ritmo-runtime.js');
 assert.ok(track.includes('const trails=quality===0?3:5'));
 assert.ok(track.includes('const back=-1.15,front=.94'));
 assert.ok(html.includes('/ritmo-runtime.js?v=31'));
 assert.ok(!scene.includes('hitTestSource')&&!skin.includes('RitmoCore'));
 assert.ok(!skin.includes('requestAnimationFrame'));
});
