'use strict';
/* Run: node tests/color-premium-visual.test.cjs
   Desktop smoke test: verifies that decorative SVG never alters the
   selectable board polygons. Not a substitute for an ARCore phone test. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'color-solo.html'),'utf8');
const src=fs.readFileSync(path.join(root,'color-premium-art.js'),'utf8');
const css=fs.readFileSync(path.join(root,'color-premium.css'),'utf8');
assert.match(page,/color-premium\.css\?v=crp30/);
assert.match(page,/color-premium-art\.js\?v=crp1/);
assert.ok(page.indexOf('/engine.js?v=110')<page.indexOf('/survivor.js?v=110'));
assert.ok(page.indexOf('/survivor.js?v=110')<page.indexOf('/color-premium-art.js'));
assert.doesNotMatch(css,/#(?:lock|play|edit|calibration-btn)\s*\{[^}]*display\s*:\s*none/);

class Node {
  constructor(tag){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attrs={};this.textContent='';}
  appendChild(n){this.children.push(n);return n;}
  insertBefore(n,ref){let i=this.children.indexOf(ref);if(i<0)this.children.push(n);else this.children.splice(i,0,n);return n;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return Object.hasOwn(this.attrs,k)?this.attrs[k]:null;}
}
const svg=new Node('svg'),heading=new Node('div'),hud=new Node('div'),overlay=new Node('div');
const colors=['#27ef84','#ffd933','#ff4562','#358dff','#b456ff','#ff8929'];
for(let i=0;i<26;i++){
  const p=new Node('polygon');
  p.setAttribute('points','15,10 95,10 95,90 15,90');
  p.setAttribute('fill',colors[(i-1+6)%6]);
  svg.appendChild(p);
}
const before=svg.children.slice();
const originalAttrs=before.map(p=>JSON.stringify(p.attrs));
const ids={tiles:svg,headline:heading,hud,overlay},queue=[],win={};
const ctx={
  document:{hidden:false,getElementById:id=>ids[id]||null,createElementNS:(ns,tag)=>new Node(tag)},
  window:win,
  requestAnimationFrame:fn=>queue.push(fn)
};
vm.runInNewContext(src,ctx,{filename:'color-premium-art.js',timeout:1500});
assert.equal(before.length,26);
assert.equal(svg.children.filter(n=>n.tagName==='polygon').length,26);
const visual=svg.children.find(n=>n.attrs.id==='crp-visual-layer');
assert.ok(visual);
assert.equal(visual.children.length,25);
assert.equal(visual.attrs['pointer-events'],'none');
for(const group of visual.children){
  assert.equal(group.attrs['pointer-events'],'none');
  assert.ok(group.children.length>=10);
  for(const path of group.children){
    assert.equal(path.tagName,'path','no decorative polygons, because calibration relies on polygon indices');
    assert.equal(path.attrs['pointer-events'],'none','never steal tap from selectable original polygon');
  }
}
for(const time of [100,137,174,211]){
  const fn=queue.shift();assert.ok(fn);fn(time);
}
assert.ok(visual.children.every(g=>g.children.some(p=>p.attrs.d&&p.attrs.d.startsWith('M'))));
hud.style.display='flex';heading.textContent='¡VERDE!';
for(const time of [248,285,322,359,396])queue.shift()(time);
assert.equal(heading.style.color,colors[0]);
svg.style.pointerEvents='auto'; // simulator for Survivor's existing tile-picking mode
assert.equal(svg.children.filter(n=>n.tagName==='polygon').length,26);
assert.deepEqual(before.map(p=>JSON.stringify(p.attrs)),originalAttrs,'must not mutate gameplay board polygon attributes');
assert.equal(win.ColorRushPremiumArt.visualOnly,true);
console.log('PASS: 25 tiles + border preserved, calibration click-through, passive effects, solo-only scripts');
