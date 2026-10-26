'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..'),src=n=>fs.readFileSync(path.join(base,n),'utf8');
const loader=src('ritmo-glb-props.js'),art=src('ritmo-exterior.js');
const html=src('ritmo.html'),runtime=src('ritmo-runtime.js'),stage=src('ritmo-stage-showtime.js');
function file(name){return Uint8Array.from(fs.readFileSync(path.join(base,'assets/ritmo',name))).buffer}
const CC0=JSON.parse(src('assets/ritmo/V31_ASSET_PROVENANCE.json'));
test('genuine Quaternius Punk body loads from checked CC0 mirror with 2958 triangles',()=>{
 const w={};new Function('window',loader)(w);
 const glb=file('dj-quaternius-punk.glb');
 assert.equal(glb.byteLength,702512);
 const body=w.RitmoImportedProps.parse(glb,'Punk_Body');
 assert.equal(body.length,2958);
 let bounds=[Infinity,-Infinity];
 for(const t of body)for(const p of [t.A,t.B,t.C]){
  assert.ok(p.every(Number.isFinite));
  bounds[0]=Math.min(bounds[0],p[1]);bounds[1]=Math.max(bounds[1],p[1]);
 }
 assert.ok(bounds[0]>=.95&&bounds[1]<=1.65);
 assert.equal(CC0.avatar.license,'CC0 1.0');
 assert.equal(CC0.avatar.author,'Quaternius');
});
test('all 8 stage model GLBs exist under CC0 and decode with 3400 triangle limit',()=>{
 const w={};new Function('window',loader)(w);
 assert.equal(CC0.props.length,8);
 for(const model of CC0.props){
  const tris=w.RitmoImportedProps.parse(file(model.file));
  assert.equal(tris.length,model.triangles,model.file);
  assert.equal(model.license,'CC0 1.0');
  assert.ok(tris.every(t=>[...t.A,...t.B,...t.C].every(Number.isFinite)));
 }
});
test('horse body animates in local XR space, not attached to camera',async()=>{
 const w={fetch:async url=>{
  if(!url.startsWith('/assets/ritmo/'))throw Error('unexpected remote '+url);
  const fname=url.split('/').pop();
  return{ok:true,arrayBuffer:async()=>file(fname)};
 }};
 new Function('window',loader)(w);
 const props=w.RitmoImportedProps.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(props.has('quaternius-punk'),true,JSON.stringify(props.status()));
 const verts=[],mesh=[];
 const surface=(target,A,B,C,D,col)=>{assert.equal(target,mesh);assert.deepEqual(C,D);assert.ok(col.length===3);verts.push(...A,...B,...C)};
 assert.equal(props.drawCharacter(mesh,surface,2,.35),true);
 assert.equal(verts.length,2958*9);
 const a=verts.slice(0,36);
 assert.ok(verts.every(Number.isFinite));
 for(let i=0;i<verts.length;i+=3){
  assert.ok(verts[i]>=-.47&&verts[i]<=.47,'horse DJ body must fit booth width');
  assert.ok(verts[i+1]>=.10&&verts[i+1]<=.82,'horse DJ must be torso-height');
  assert.ok(verts[i+2]<-1.16,'horse DJ may not occupy user note floor');
 }
 verts.length=0;
 props.drawCharacter(mesh,surface,2.31,1);
 assert.notDeepEqual(verts.slice(0,36),a,'DJ body must follow beat and move');
});
test('horse head and stage are anchored decorations; no duplicated giant miss overlay',()=>{
 assert.ok(art.includes('function horseHead('));
 assert.ok(art.includes("props?.drawCharacter(mesh,surface,t,low,quality)"));
 assert.ok(art.includes("props?.drawPart('riser'"));
 assert.ok(art.includes("props?.drawPart('cdj'"));
 assert.ok(art.includes("props?.drawPart('laser'"));
 assert.ok(art.includes("props?.drawPart('smoke'"));
 assert.ok(!runtime.includes('notify(msg,470)'));
 assert.ok(!runtime.includes('notify(msg,440)'));
 assert.ok(stage.includes('const trails=quality===0?3:5'));
 assert.ok(stage.includes("const back=-1.15,front=.94"));
 assert.ok(html.includes('/ritmo-exterior.js?v=31'));
 assert.ok(html.includes('/ritmo-stage-showtime.js?v=31'));
 assert.ok(html.includes('/ritmo-glb-props.js?v=31'));
});
test('simulated live DJ scene draws finite geometry and beat reaction without touching AR core',()=>{
 const meshes=[],glows=[],coords=[];
 const add=(target,pts)=>{for(const p of pts){assert.ok(p.every(Number.isFinite));coords.push(p);target.push(...p)}};
 const api={mesh:meshes,illum:glows,getQuality:()=>1,
  surface:(m,A,B,C,D)=>add(m,[A,B,C,D]),
  cuboid:(m,x,y,z,w,h,d)=>add(m,[[x-w/2,y,z-d/2],[x+w/2,y+h,z+d/2]]),
  annulus:(m,x,y,z,ri,ro)=>add(m,[[x-ri,y,z],[x+ro,y,z]]),
  disc:(m,x,y,z,r)=>add(m,[[x-r,y,z],[x+r,y,z]])};
 const window={};vm.runInNewContext(art,{window,Float32Array,Math},{timeout:3500});
 const dj=window.RitmoExterior.create(api);
 dj.render(.25,2,{combo:20},{low:.8,mid:.65});
 assert.ok(meshes.length>300&&glows.length>100);
 assert.ok(coords.every(v=>v.every(Number.isFinite)));
});
