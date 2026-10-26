'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const loader=read('ritmo-glb-props.js'),skin=read('ritmo-skinning.js'),exterior=read('ritmo-exterior.js');
const page=read('ritmo.html'),floor=read('ritmo-stage-showtime.js');
const glb=()=>Uint8Array.from(fs.readFileSync(path.join(dir,'assets/ritmo/dj-quaternius-punk.glb'))).buffer;
function setup(){
 const root={fetch:async url=>({ok:true,arrayBuffer:async()=>glb()})};
 new Function('window',loader)(root);
 new Function('window',skin)(root);
 return root;
}
test('IK end effectors land on actual musical controllers, not DJ hips',async()=>{
 const w=setup(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'ready');
 const frame=w.RitmoSkeletalDJ.poseFrame(
  w.RitmoSkeletalDJ.prepare(glb(),w.RitmoImportedProps.parse).bones,2.3,.50,0
 );
 for(const side of ['L','R']){
  const arm=frame[side];
  assert.ok(Math.abs(arm.lowerRelative)>0.25,'elbow must be flexed '+side);
  assert.ok(Math.abs(arm.upperAngle)>0.30,'shoulder must face mixing table '+side);
 }
 for(const t of [0,1.1,2.3,3.4,4.7]){
  const hands=dj.hands(t,.6,0);
  for(const [key,sign] of [['L',1],['R',-1]]){
   const p=hands[key];
   assert.ok(Math.abs(p[0]-sign*.168)<.034,'CDJ x '+key+' '+JSON.stringify(p));
   assert.ok(p[1]>.370&&p[1]<.445,'CDJ y '+key+' '+JSON.stringify(p));
   assert.ok(Math.abs(p[2]+1.438)<.040,'CDJ z '+key+' '+JSON.stringify(p));
  }
 }
 const pre=dj.hands(1.4,.6,0),after=dj.hands(1.8,.6,0);
 assert.notDeepEqual(pre,after,'hands should move naturally with music');
});
test('full genuine 2958 triangle skinned mesh remains intact in low mode',async()=>{
 const w=setup(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 const draw=q=>{
  const triangles=[];dj.draw([],(_m,A,B,C,D,c)=>{
   assert.deepEqual(C,D);triangles.push([A,B,C]);
  },3.3,.6,q,0);return triangles;
 };
 const hi=draw(2),low=draw(0);
 assert.equal(hi.length,2958);
 assert.deepEqual(low,hi,'LOW quality must not discard faces');
 let stretched=0,longest=0;
 for(const triangle of hi){
  const distance=(p,q)=>Math.hypot(...p.map((v,i)=>v-q[i]));
  const d=Math.max(distance(triangle[0],triangle[1]),distance(triangle[1],triangle[2]),distance(triangle[2],triangle[0]));
  longest=Math.max(longest,d);
  if(d>.22)stretched++;
  for(const p of triangle){
   assert.ok(p.every(Number.isFinite));
   assert.ok(p[2]<-1.28,'DJ must not overlap gameplay note spawning');
  }
 }
 assert.ok(stretched<7,'avoid shredded triangles: '+stretched+', max='+longest);
});
test('professional stage and distinct V34 assets preserve exact scoring floor',()=>{
 for(const f of ['ritmo-glb-props','ritmo-skinning','ritmo-exterior','ritmo-stage-showtime'])
  assert.ok(page.includes('/'+f+'.js?v=35'),f);
 assert.ok(page.includes('/ritmo-runtime.js?v=31'),'runtime unchanged');
 assert.ok(floor.includes('const trails=quality===0?3:5'));
 assert.ok(floor.includes('const back=-1.15,front=.94'));
 assert.ok(exterior.includes('deskOnly:true'));
 assert.ok(exterior.includes("drawPart('mixer'"));
 assert.ok(exterior.includes("drawPart('cdj'"));
 assert.ok(exterior.includes('const hands=skeletal?.hands?.(t,low,combo);'));
 assert.ok(exterior.includes('HORSE DJ V35'));
 assert.ok(exterior.includes('stageWidth*.43'));
 assert.ok(exterior.includes('const BACK=.22'));
});
test('GLB unavailable leaves fallback body and controls functional',async()=>{
 const w={fetch:async()=>{throw Error('offline')}};
 new Function('window',loader)(w);new Function('window',skin)(w);
 const dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'fallback');
 assert.equal(dj.hands(0,.3,0),null);
 assert.equal(dj.draw([],()=>{},1,.4),false);
});
