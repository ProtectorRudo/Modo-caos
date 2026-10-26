'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const skinSource=read('ritmo-skinning.js'),glbSource=read('ritmo-glb-props.js');
const extSource=read('ritmo-exterior.js'),html=read('ritmo.html'),stage=read('ritmo-stage-showtime.js');
const body=()=>Uint8Array.from(fs.readFileSync(path.join(root,'assets/ritmo/dj-quaternius-punk.glb'))).buffer;
function setup(){
 const w={fetch:async url=>{
  assert.match(url,/^\/assets\/ritmo\/dj-/);
  return {ok:true,arrayBuffer:async()=>body()};
 }};
 new Function('window',glbSource)(w);
 new Function('window',skinSource)(w);
 return w;
}
test('V34 real two-bone IK reaches left and right CDJs from genuine Quaternius GLB',()=>{
 const w=setup(),info=w.RitmoSkeletalDJ.prepare(body(),w.RitmoImportedProps.parse);
 const frame=w.RitmoSkeletalDJ.poseFrame(info.bones,2.7,.66,0);
 assert.ok(frame.L.elbow[0]>frame.L.shoulder[0]);
 assert.ok(frame.R.elbow[0]<frame.R.shoulder[0]);
 for(const [side,id] of [['L',2],['R',4]]){
  const b=info.bones[side],weights=[0,0,0,0,0];weights[id]=1;
  const wrist=w.RitmoSkeletalDJ.posePoint(b.wrist,weights,info.bones,2.7,.66,0,frame);
  const target=frame[side].wristWorld;
  const gap=Math.hypot(...wrist.map((v,i)=>v-target[i]));
  assert.ok(gap<.042,side+' wrist must land on CDJ, gap='+gap);
  assert.ok(wrist[1]>.36&&wrist[1]<.47,'hands must hover at mixing-surface height');
  assert.ok(Math.abs(wrist[0])>.12&&Math.abs(wrist[0])<.22);
 }
});
test('DJ performs real beat-driven two-handed turntable mixing and combo gesture',async()=>{
 const w=setup(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'ready');
 const idle=dj.hands(2.5,.4,0);
 const beat=dj.hands(2.8,.9,0);
 const celebration=dj.hands(2.8,.9,35);
 assert.notDeepEqual(idle,beat);
 assert.ok(celebration.R[1]>beat.R[1]);
 assert.ok(Math.abs(beat.L[0])>.13 && Math.abs(beat.L[0])<.20);
 assert.ok(Math.abs(beat.R[0])>.13 && Math.abs(beat.R[0])<.20);
 const verts=[],mesh=[];
 const callback=(dst,A,B,C,D,c)=>{
  assert.equal(dst,mesh);assert.deepEqual(C,D);
  verts.push([A,B,C]);assert.ok(c.length===3);
 };
 assert.equal(dj.draw(mesh,callback,2.7,.55,2,0),true);
 assert.equal(verts.length,2958);
 assert.ok(verts.flat().every(v=>v.every(Number.isFinite)));
 verts.length=0;
 assert.equal(dj.draw(mesh,callback,2.7,.55,0,0),true);
 assert.equal(verts.length,2958,'low quality must not shred geometry');
});
test('dark CDJ console, shorter panel and contact feet draw only behind note spawn',()=>{
 const log=[],coords=[];
 const api={
  mesh:[],illum:[],getQuality:()=>2,
  surface:(m,A,B,C,D)=>{coords.push(A,B,C,D)},
  cuboid:(m,x,y,z,w,h,d)=>{log.push({type:'box',m,x,y,z,w,h,d});coords.push([x-w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z+d/2])},
  annulus:(m,x,y,z)=>coords.push([x,y,z]),
  disc:(m,x,y,z)=>coords.push([x,y,z])
 };
 const props={
  ready:()=>true,has:()=>true,
  draw:()=>{log.push({type:'desk'});return true},
  drawPart:(key,mesh,surface,cfg)=>{log.push({type:'part',key,cfg});return true}
 };
 const skeletal={draw:()=>true,hands:()=>({L:[.169,.404,-1.418],R:[-.169,.404,-1.418]})};
 const w={RitmoImportedProps:{create:()=>props},RitmoSkeletalDJ:{create:()=>skeletal}};
 new Function('window',extSource)(w);
 const obj=w.RitmoExterior.create(api);
 obj.render(.25,3,{combo:30},{low:.8,mid:.7});
 assert.equal(obj.version,'HORSE DJ V34');
 assert.ok(coords.every(p=>p.every(Number.isFinite)&&p[2]<-1.16),'decorations stay behind note track z=-1.15');
 const desk=log.filter(x=>x.type==='desk');assert.equal(desk.length,1);
 const control=log.find(x=>x.type==='box'&&x.w===.605&&x.h===.025);
 assert.ok(control&&control.y>.34&&control.y<.37);
 const facade=log.find(x=>x.type==='part'&&x.key==='facade');
 assert.ok(facade);
 assert.deepEqual(facade.cfg.scale,[.36,.220,.35]);
 const cdj=log.find(x=>x.type==='part'&&x.key==='cdj');
 assert.ok(cdj&&cdj.cfg.length===2);
 const slab=log.filter(x=>x.type==='box'&&x.h===.028&&x.w===.095);
 assert.equal(slab.length,4,'four real ground-contact feet');
 const truss=log.filter(x=>x.type==='part'&&x.key==='truss');
 assert.equal(truss.length,1);
});
test('V34 loads exactly the new external modules, no floor movement changes',()=>{
 for(const file of ['ritmo-glb-props','ritmo-skinning','ritmo-exterior','ritmo-stage-showtime'])
  assert.ok(html.includes('/'+file+'.js?v=34'),file);
 assert.match(html,/ritmo-runtime\.js\?v=31/);
 assert.ok(!read('ritmo-skinning.js').includes('RitmoCore.tick'));
 assert.match(stage,/const back=-1\.15,front=\.94/);
 assert.match(stage,/const trails=quality===0\?3:5/);
 assert.match(extSource,/const BACK=\.22/);
});
