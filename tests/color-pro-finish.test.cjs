'use strict';
/* Visual-only smoke; camera/physics data never touched. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'color-solo.html'),'utf8');
const js=fs.readFileSync(path.join(root,'color-pro-finish.js'),'utf8');
const css=fs.readFileSync(path.join(root,'color-premium.css'),'utf8');
assert.match(page,/color-pro-finish\.js\?v=pro30/);
assert.ok(page.indexOf('survivor.js')<page.indexOf('color-pro-finish.js'));
assert.match(css,/#overlay\.crp-live #bottom[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
assert.match(css,/#overlay\.crp-live #calibration-btn[\s\S]*grid-column:1/);
assert.doesNotMatch(js,/\.requestSession\(|\.getHitTestResults\(|\.createAnchor\(|tiles\[[^\]]+\]\s*=/);
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={display:'',removeProperty(k){delete this[k]},setProperty(k,v){this[k]=v}};this.textContent='';const classes=new Set();this.classList={add:k=>classes.add(k),toggle:(k,v)=>{if(v)classes.add(k);else classes.delete(k)},remove:k=>classes.delete(k),contains:k=>classes.has(k)};}
 setAttribute(k,v){this.attributes[k]=String(v)}
 getAttribute(k){return this.attributes[k]??null}
 hasAttribute(k){return Object.hasOwn(this.attributes,k)}
 appendChild(c){this.children.push(c);return c}
 insertBefore(c,b){let i=this.children.indexOf(b);if(i<0)this.children.push(c);else this.children.splice(i,0,c);return c}
 querySelectorAll(tag){return this.children.filter(c=>c.tagName===tag)}
}
const overlay=new Element('div'),svg=new Element('svg'),heading=new Element('div');
heading.textContent='¡VIOLETA!';
const marker=new Element('circle');marker.setAttribute('cx',150);marker.setAttribute('cy',910);
marker.style.display='block';svg.appendChild(marker);
const text=new Element('text');text.textContent='YO';svg.appendChild(text);
for(let i=0;i<26;i++)svg.appendChild(new Element('polygon'));
let cb=null,intervals=0;
const elements={overlay,tiles:svg,headline:heading};
const doc={hidden:false,getElementById:k=>elements[k]||null,createElementNS:(ns,tag)=>new Element(tag),createElement:tag=>new Element(tag),addEventListener(){}};
const win={innerWidth:390,innerHeight:1000,addEventListener(){}};
const context={document:doc,window:win,stage:'playing',setInterval:f=>{cb=f;return ++intervals},clearInterval(){},performance:{now:()=>500}};
vm.runInNewContext(js,context,{timeout:1300});
assert.equal(typeof cb,'function');
cb();
assert.equal(overlay.classList.contains('crp-live'),true);
assert.equal(heading.style.color,'#BA65FF');
assert.equal(svg.children.filter(c=>c.tagName==='polygon').length,26);
assert.equal(svg.children.filter(c=>c.tagName==='circle').length,3);
const halo=svg.children.find(c=>c.getAttribute('data-crp-marker')==='halo');
assert.equal(halo.style.pointerEvents,'none');
assert.equal(halo.getAttribute('cx'),'150');
assert.equal(overlay.children.length,1);
assert.equal(overlay.children[0].style.display,'block');
assert.ok(overlay.children[0].textContent.includes('VOS'));
context.stage='finished';cb();
assert.equal(overlay.classList.contains('crp-live'),false);
console.log('PASS: HUD mode, location reticle, offscreen YO guide and preserved 26 calibration polygons');
