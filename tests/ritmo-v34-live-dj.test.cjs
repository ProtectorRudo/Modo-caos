'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const bytes=()=>Uint8Array.from(fs.readFileSync(path.join(root,'assets/ritmo/dj-quaternius-punk.glb'))).buffer;
const codeGLB=read('ritmo-glb-props.js'),codeSkin=read('ritmo-skinning.js'),codeArt=read('ritmo-exterior.js'),page=read('ritmo.html');
function context(){
 const w={fetch:async url=>{
  if(url!=='/assets/ritmo/dj-quaternius-punk.glb')throw Error('unexpected URL');
  return{ok:true,arrayBuffer:async()=>bytes()};
 }};
 new Function('window',codeGLB)(w);
 new Function('window',codeSkin)(w);
 return w;
}
function distance(a,b){return Math.hypot(...a.map((v,i)=>v-b[i]))}
test('genuine 49-bone Quaternius IK aims both skinned hands at CDJ contact pads',async()=>{
 const w=context(),model=w.RitmoSkeletalDJ.prepare(bytes(),w.RitmoImportedProps.parse);
 assert.equal(model.skinJointCount,49);
 for(const time of [0,.55,1.45,3.87]){
  const pose=w.RitmoSkeletalDJ.poseFrame(model.bones,time,.6,0);
  for(const [key,side] of [['L',1],['R',-1]]){
   const limb=pose[key],rest=model.bones[key];
   assert.ok(Number.isFinite(limb.upperAngle)&&Number.isFinite(limb.lowerRelative));
   assert.ok(limb.wristWorld[0]*side>.13&&limb.wristWorld[0]*side<.21);
   assert.ok(limb.wristWorld[1]>.37&&limb.wristWorld[1]<.44);
   assert.ok(limb.wristWorld[2]>-1.44&&limb.wristWorld[2]<-1.39);
   const restSide=side>0?2:4,one=side>0?[0,0,1,0,0]:[0,0,0,0,1];
   const rotated=w.RitmoSkeletalDJ.posePoint(rest.wrist,one,model.bones,time,.6,0,pose);
   assert.ok(distance(rotated,limb.wristWorld)<.025,key+' skinned wrist diverged '+distance(rotated,limb.wristWorld));
   const worldElbow=w.RitmoSkeletalDJ.posePoint(rest.elbow,one,model.bones,time,.6,0,pose);
   assert.ok(Math.abs(worldElbow[0])>Math.abs(rotated[0])+.025,'elbow should bend outward');
   assert.ok(worldElbow[1]>rotated[1]+.045,'elbow should sit above wrist');
  }
 }
 const dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(dj.status(),'ready');
 assert.ok(dj.hands(2,.65,5)?.L);
 assert.notDeepEqual(dj.hands(2,.65,5),dj.hands(2.25,.65,5),'hands animate rhythmically');
});
test('skinning stays continuous under motion and never discards triangles on LOW',async()=>{
 const w=context(),dj=w.RitmoSkeletalDJ.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 for(const time of [.4,2,3.5]){
  let n=0,bad=0,maxEdge=0;
  function render(quality){
   let count=0;
   assert.equal(dj.draw([],(_,A,B,C,D)=>{
    assert.deepEqual(D,C);for(const p of [A,B,C])assert.ok(p.every(Number.isFinite));
    const edges=[distance(A,B),distance(A,C),distance(B,C)];
    const biggest=Math.max(...edges);
    if(biggest>.22)bad++;
    maxEdge=Math.max(maxEdge,biggest);
    count++;
   },time,.55,quality,0),true);
   return count;
  }
  assert.equal(render(2),2958);
  assert.equal(render(0),2958);
  assert.ok(bad<14,'skin deformation stretches too many triangles: '+bad+', max='+maxEdge);
 }
});
test('scene keeps stage feet, dark deck, raised controls, front-note clearance',()=>{
 const calls=[];
 const api={
  mesh:[],illum:[],getQuality:()=>1,
  surface:(m,A,B,C,D)=>{calls.push({type:'surface',z:A[2]});for(const p of [A,B,C,D])assert.ok(p.every(Number.isFinite))},
  cuboid:(m,x,y,z,w,h,d,c1,c2,o)=>{calls.push({type:'box',x,y,z,w,h,d,m});assert.ok([x,y,z,w,h,d].every(Number.isFinite))},
  annulus:(m,x,y,z,r1,r2)=>{calls.push({type:'ring',x,y,z,r1,r2})},
  disc:(m,x,y,z,r)=>{calls.push({type:'disc',x,y,z,r})}
 };
 const props={
  ready:()=>true,has:()=>true,
  draw:(m,surface,opts)=>{calls.push({type:'desk',opts});return true},
  drawPart:(key,m,surface,settings)=>{calls.push({type:'asset',key,settings});return true}
 };
 const hands={L:[.17,.402,-1.42],R:[-.17,.405,-1.42]};
 const w={RitmoImportedProps:{create:()=>props},RitmoSkeletalDJ:{create:()=>({
  draw:(m,s,t,l,q,combo)=>{calls.push({type:'skin',t,l,q,combo});return true},
  hands:()=>hands
 })}};
 new Function('window',codeArt)(w);
 w.RitmoExterior.create(api).render(.25,2,{combo:25},{low:.7,mid:.45});
 const desk=calls.find(x=>x.type==='desk');
 assert.equal(desk.opts.deskOnly,true,'no original mixer under dark worktop');
 const dark=calls.filter(x=>x.type==='box'&&Math.abs(x.y-.355)<.0001&&x.w>.58);
 assert.ok(dark.length>0,'a real dark mixer worktop must be visible');
 const mixer=calls.find(x=>x.type==='asset'&&x.key==='mixer');
 const cdj=calls.find(x=>x.type==='asset'&&x.key==='cdj');
 assert.ok(mixer&&cdj&&cdj.settings.length===2);
 assert.ok(mixer.settings.offset[1]>.37);
 assert.ok(calls.indexOf(desk)<calls.indexOf(mixer));
 const feet=calls.filter(x=>x.type==='box'&&Math.abs(x.y-.014)<.001&&Math.abs(x.w-.095)<.001);
 assert.equal(feet.length,4);
 const front=calls.filter(x=>x.type==='box'&&x.d>.1&&x.y<.40);
 assert.ok(front.every(x=>x.z<-1.15),'scenery must not touch arriving notes');
 const bracelets=calls.filter(x=>x.type==='ring'&&x.r1===.012);
 assert.equal(bracelets.length,2);
});
test('V34 script order and gameplay floor remain protected',()=>{
 for(const n of ['ritmo-glb-props','ritmo-skinning','ritmo-exterior','ritmo-stage-showtime']){
  assert.ok(page.includes('/'+n+'.js?v=34'),n);
 }
 assert.ok(page.indexOf('ritmo-glb-props.js?v=34')<page.indexOf('ritmo-skinning.js?v=34'));
 assert.ok(page.indexOf('ritmo-skinning.js?v=34')<page.indexOf('ritmo-exterior.js?v=34'));
 assert.ok(page.includes('ritmo-runtime.js?v=31'));
 const floor=read('ritmo-stage-showtime.js');
 for(const invariant of ['const trails=quality===0?3:5','let z=.65,r=size*.44','const back=-1.15,front=.94']){
  assert.ok(floor.includes(invariant),invariant);
 }
 assert.ok(codeSkin.includes('JOINTS_0')&&codeSkin.includes('WEIGHTS_0'));
 assert.ok(!codeArt.includes('props?.drawCharacter('));
});
