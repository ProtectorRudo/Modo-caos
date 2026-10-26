'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('ritmo.html'),art=read('ritmo-exterior.js'),runtime=read('ritmo-runtime.js');
function scene(size,quality,combo){
 const ctx={window:{}};
 vm.runInNewContext(art,ctx,{timeout:5000});
 const faces=[],boxes=[],rings=[];
 const check=(x,y,z)=>{assert.ok([x,y,z].every(Number.isFinite));assert.ok(z< -1.15,'geometry crossed note floor')};
 const api={
  mesh:[],illum:[],getQuality:()=>quality,
  surface:(_m,A,B,C,D)=>{for(const [x,y,z] of [A,B,C,D])check(x,y,z);faces.push([A,B,C,D])},
  cuboid:(_m,x,y,z,w,h,d)=>{check(x,y,z+d/2);assert.ok(w>0&&h>0&&d>0);boxes.push({x,y,z,w,h,d})},
  disc:(_m,x,y,z,r,_,_a,_n,vertical)=>{check(x,y,z+(vertical?0:r));rings.push({x,y,z,r,vertical})},
  annulus:(_m,x,y,z,ri,ro,_,_a,_n,vertical)=>{check(x,y,z+(vertical?0:ro));rings.push({x,y,z,r:ro,vertical})}
 };
 ctx.window.RitmoExterior.create(api).render(size,1.95,{combo},{low:.71,mid:.46});
 return {faces,boxes,rings};
}
test('Chrome preserves preview host and share bypass, never sends visitors to production',()=>{
 assert.ok(html.includes("u.host+u.pathname+u.search"),'intent uses current host and path');
 assert.ok(html.includes("encodeURIComponent(clean)"),'Chrome fallback keeps entire preview URL');
 assert.doesNotMatch(html,/href="intent:\/\/modo-caos-eta/);
});
test('V37 must be identifiable at AR render and assets bust obsolete caches',()=>{
 for(const name of ['ritmo-exterior','ritmo-glb-props','ritmo-skinning'])
  assert.ok(html.includes('/'+name+'.js?v=37'),name);
 for(const name of ['ritmo-runtime','ritmo-stage-showtime','ritmo-core','ritmo-audio','ritmo-despacito','ritmo-tracking'])
  assert.ok(html.includes('/'+name+'.js?v=38'),name);
 assert.ok(html.includes('id="sceneVersion"'));
 assert.match(runtime,/NEON PRISM/);
 assert.match(runtime,/V38 · /);
 assert.match(art,/HORSE DJ V37/);
});
test('LED is elevated and continuous: 1.51 m top, truss higher, no legacy GLB facade',()=>{
 const {boxes,faces}=scene(.25,2,0);
 const wall=boxes.find(b=>b.h===.835&&b.y===.675);
 assert.ok(wall&&Math.abs(wall.y+wall.h-1.51)<.0001);
 assert.ok(faces.some(f=>f.some(p=>p[1]>1.60)),'truss must clear full LED screen');
 assert.ok(!art.includes("drawPart('led-panel'"));
 assert.ok(!art.includes("drawPart('led-magenta'"));
 assert.ok(!art.includes("drawPart('facade'"));
});
test('both speakers face player and are fully within portrait-friendly plinth',()=>{
 for(const size of [.18,.25,.32,.40]){
  const {boxes,rings}=scene(size,2,0);
  const low=boxes.filter(b=>b.w===.149&&b.h===.191);
  const high=boxes.filter(b=>b.w===.149&&b.h===.169);
  assert.equal(low.length,2);assert.equal(high.length,2);
  const stageWidth=Math.min(1.18,size*4+.16);
  for(const box of [...low,...high])assert.ok(Math.abs(box.x)+box.w/2<stageWidth/2);
  assert.ok(Math.abs(low[0].x+low[1].x)<.000001);
  assert.ok(rings.filter(r=>r.vertical&&r.r>=.03).length>=4);
 }
});
test('V37 never displaces physical gameplay for 16 render configurations',()=>{
 const stage=read('ritmo-stage-showtime.js');
 assert.match(stage,/const back=-1\.15,front=\.94/);
 assert.match(stage,/let z=\.65,r=size\*\.44/);
 assert.match(stage,/try\{exterior\?\.render\(size,time,game/);
 assert.ok(!art.includes('navigator.xr')&&!art.includes('RitmoCore.tick'));
 for(const quality of [0,2])for(const size of [.18,.25,.32,.40])for(const combo of [0,30]){
  const {boxes,faces}=scene(size,quality,combo);
  assert.ok(boxes.length>100&&faces.length>100,'no empty/dropped scene');
 }
});
