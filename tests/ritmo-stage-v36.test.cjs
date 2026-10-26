'use strict';
/* V36 stage-layout regression: scenery only, no XR camera or physical device. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),src=n=>fs.readFileSync(path.join(root,n),'utf8');
const exterior=src('ritmo-exterior.js'),html=src('ritmo.html'),showtime=src('ritmo-stage-showtime.js');
function make(size=.24,quality=2,combo=0,time=2.7){
 const scene={window:{}};
 vm.runInNewContext(exterior,scene,{timeout:4000});
 const boxes=[],circles=[],faces=[],mesh=[],illum=[];
 const touch=p=>assert.ok(p.every(Number.isFinite),'nonfinite stage position: '+p);
 const api={
  mesh,illum,getQuality:()=>quality,
  surface:(m,A,B,C,D)=>{for(const p of [A,B,C,D])touch(p);faces.push([A,B,C,D]);},
  cuboid:(m,x,y,z,w,h,d)=>{touch([x,y,z]);assert.ok(w>0&&h>0&&d>0,'invalid cabinet dimensions');boxes.push({x,y,z,w,h,d,lit:m===illum})},
  annulus:(m,x,y,z,ri,ro,c,a,n,vertical)=>{touch([x,y,z]);circles.push({x,y,z,ri,ro,vertical:!!vertical})},
  disc:(m,x,y,z,r,c,a,n,vertical)=>{touch([x,y,z]);circles.push({x,y,z,r,vertical:!!vertical})}
 };
 scene.window.RitmoExterior.create(api).render(size,time,{combo},{low:.63,mid:.47});
 return {boxes,circles,faces,size,quality};
}
test('V36 cache-busted stage loads in correct order without editing note geometry',()=>{
 assert.match(html,/ritmo-glb-props\.js\?v=36/);
 assert.match(html,/ritmo-exterior\.js\?v=36/);
 assert.match(html,/HORSE DJ V36/);
 assert.ok(html.indexOf('ritmo-exterior.js')<html.indexOf('ritmo-stage-showtime.js'));
 assert.match(showtime,/const back=-1\.15,front=\.94/);
 assert.match(showtime,/const trails=quality===0\?3:5/);
 assert.match(exterior,/const BACK=\.22/);
 assert.ok(!exterior.includes('navigator.xr'));
 assert.match(src('ritmo-glb-props.js'),/const active=new Set\(\['mixer','cdj','turntable'\]\)/);
});
test('one tall LED screen, overhead gantry, and no obscuring black centerpiece',()=>{
 for(const size of [.18,.24,.4]){
  const {boxes,faces}=make(size);
  const panel=boxes.find(b=>b.h===.713&&b.y===.57);
  assert.ok(panel,'single tall wall');
  const upper=panel.y+panel.h;
  assert.ok(upper>1.25,'LED top must be above horse head');
  assert.ok(faces.some(f=>f.some(p=>p[1]>upper+.06)),'lighting bar must be above LED');
 }
 assert.ok(!exterior.includes("drawPart('led-panel'"));
 assert.ok(!exterior.includes("drawPart('led-magenta'"));
 assert.ok(!exterior.includes("drawPart('truss'"));
});
test('PA cabinets are paired, symmetric, on the riser, and face the player',()=>{
 for(const size of [.18,.24,.4]){
  const {boxes,circles}=make(size);
  const lower=boxes.filter(b=>b.w===.173&&b.h===.217);
  const upper=boxes.filter(b=>b.w===.173&&b.h===.183);
  assert.equal(lower.length,2);assert.equal(upper.length,2);
  assert.ok(Math.abs(lower[0].x+lower[1].x)<1e-7,'symmetric stereo placement');
  for(const cabinet of [...lower,...upper])
   assert.ok(Math.abs(cabinet.x)+cabinet.w/2<=(size*4+.29)/2,'box cannot protrude beyond plinth');
  assert.ok(circles.filter(c=>c.vertical&&c.ro>.034).length>=4,'woofers face audience');
 }
 assert.ok(!exterior.includes("drawPart('speaker-sub'"));
 assert.ok(!exterior.includes("drawPart('speaker-mid'"));
});
test('booth is single shell, and default fallback hands reach actual CDJs',()=>{
 const {boxes}=make();
 assert.ok(boxes.some(b=>b.w===.560&&b.h===.235),'one clean booth shell');
 assert.ok(boxes.some(b=>b.w===.605&&b.h===.025),'console worktop remains');
 assert.ok(!exterior.includes('deskOnly:true'));
 assert.ok(!exterior.includes("drawPart('facade'"));
 assert.match(exterior,/hand=\[sign\*\(\.164\+\.013\*sweep\),\.394\+bob/);
 assert.match(exterior,/props\.drawPart\('cdj'/);
});
test('every stage component stays behind protected floor edge at all levels',()=>{
 for(const quality of [0,2])for(const size of [.18,.24,.4])for(const combo of [0,30]){
  const {boxes,circles,faces}=make(size,quality,combo,2.74);
  assert.ok(boxes.length>100 && faces.length>100);
  for(const box of boxes)assert.ok(box.z+box.d/2< -1.15,'scenery box crossed note edge');
  for(const c of circles)assert.ok(c.z+(c.vertical?0:(c.ro||c.r||0))< -1.15);
  for(const f of faces)for(const p of f)assert.ok(p[2]< -1.15);
 }
});
