'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ritmo-glb-props.js'),'utf8');
const festival=fs.readFileSync(path.join(root,'ritmo-exterior.js'),'utf8');
const stage=fs.readFileSync(path.join(root,'ritmo-stage-showtime.js'),'utf8');
const html=fs.readFileSync(path.join(root,'ritmo.html'),'utf8');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'assets/ritmo/V30_ASSET_PROVENANCE.json'),'utf8'));
const expected={facade:384,turntable:848,'led-panel':1024,'speaker-sub':624,'speaker-mid':396,'moving-head':724,strobe:656,truss:1120};
const parseWorld={};new Function('window',source)(parseWorld);
const parser=parseWorld.RitmoImportedProps.parse;
function bytes(filename){return Uint8Array.from(fs.readFileSync(path.join(root,'assets/ritmo',filename))).buffer}
test('all eight CC0 GLBs are installed locally with valid model geometry',()=>{
 assert.equal(provenance.length,8);
 for(const record of provenance){
  assert.match(record.cdnUrl,/^https:\/\/cdn\.3dassets\.dev\/assets\/\d+\/v1\/model\.glb$/);
  assert.equal(record.license,'CC0');
  const key=record.file==='dj-booth-facade.glb'?'facade':record.file.replace(/^dj-|\.glb$/g,'');
  const data=bytes(record.file);
  assert.equal(data.byteLength,record.size);
  const tris=parser(data);
  assert.equal(tris.length,expected[key],record.file);
  for(const tri of tris)for(const p of [tri.A,tri.B,tri.C])assert.ok(p.every(Number.isFinite));
 }
});
test('the loader renders all imported CC0 objects in spatial scene with no new renderer',async()=>{
 const requested=[];
 const world={fetch:async url=>{
  requested.push(url);
  if(!url.startsWith('/assets/ritmo/'))throw Error('no remote resource expected');
  return {ok:true,arrayBuffer:async()=>bytes(path.basename(url))};
 }};
 new Function('window',source)(world);
 const props=world.RitmoImportedProps.create();
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(props.ready(),true);
 for(const key of Object.keys(expected))assert.equal(props.has(key),true,key);
 assert.ok(requested.every(url=>url.startsWith('/assets/ritmo/')));
 const vertices=[];
 const surface=(target,A,B,C,D)=>{assert.deepEqual(C,D);vertices.push(...A,...B,...C)};
 for(const [key,n] of Object.entries(expected)){
  vertices.length=0;
  const instances=key==='speaker-sub'?[{scale:.2,offset:[-.7,0,-1.5]},{scale:.2,offset:[.7,0,-1.5]}]:
   [{scale:.3,offset:[0,0,-1.5]}];
  assert.equal(props.drawPart(key,[],surface,instances),true);
  assert.equal(vertices.length,9*n*instances.length);
  assert.ok(vertices.every(Number.isFinite));
 }
});
test('no extra DJ object intersects the score zone or changes the moving floor',()=>{
 const begin=stage.indexOf('const back=-1.15,front=.94');
 const end=stage.indexOf('// V30 removes the old duplicated portal');
 assert.ok(begin>=0&&end>begin);
 const floor=stage.slice(begin,end);
 for(const marker of ['size*4.025','const phase=(time*(.25+.33*low))%1','const trails=quality===0?3:5','let z=.65,r=size*.44'])
  assert.ok(floor.includes(marker),marker);
 assert.ok(!festival.includes('RitmoCore.tick')&&!festival.includes('requestHitTestSource'));
 assert.match(festival,/try|drawPart/);
});
test('V30 scripts precede game runtime and are cache-busted',()=>{
 for(const file of ['ritmo-glb-props','ritmo-exterior','ritmo-stage-showtime'])assert.ok(html.includes('/'+file+'.js?v=30'),file);
 assert.ok(html.indexOf('/ritmo-glb-props.js?v=30')<html.indexOf('/ritmo-exterior.js?v=30'));
 assert.ok(html.indexOf('/ritmo-exterior.js?v=30')<html.indexOf('/ritmo-stage-showtime.js?v=30'));
 assert.ok(html.indexOf('/ritmo-stage-showtime.js?v=30')<html.indexOf('/ritmo-runtime.js?v=28'));
});
