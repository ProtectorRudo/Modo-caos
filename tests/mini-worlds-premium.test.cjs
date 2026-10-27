/* Tests the optional premium source layer without network or WebXR.
 * Run: node tests/mini-worlds-premium.test.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../mini-worlds-premium.js'),'utf8');
const original=fs.readFileSync(path.join(__dirname,'../mini-worlds-runtime.js'),'utf8');
const kenney=fs.readFileSync(path.join(__dirname,'../mini-worlds-assets.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../mini-worlds.html'),'utf8');
const C=require('../mini-worlds-core.js');
class Vec3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this}
 setScalar(v){this.x=this.y=this.z=v;return this}
}
class Group{
 constructor(){this.children=[];this.position=new Vec3();this.rotation={x:0,y:0,z:0};
  this.scale=new Vec3(1,1,1);this.parent=null;this.name=''}
 add(o){o.parent=this;this.children.push(o)}
 remove(o){this.children=this.children.filter(x=>x!==o);o.parent=null}
 updateMatrixWorld(){}
 traverse(fn){fn(this);for(const o of this.children)o.traverse?.(fn)}
 clone(){const result=new Group();result.name=this.name;return result}
}
class Box3{
 constructor(){this.min={y:0};this.max={y:1}}
 setFromObject(o){this.min.y=0;this.max.y=Math.max(.0001,o.scale.y);return this}
 getSize(v){return v.set(1,this.max.y-this.min.y,1)}
}
const T={Group,Vector3:Vec3,Box3};
const ctx={window:{},console};vm.runInNewContext(src,ctx);
const Premium=ctx.window.MiniWorldsPremium;
assert.equal(typeof Premium,'function');
const products=Premium(T).sources;
assert.equal(Object.keys(products).length,7,'four Quaternius and three KayKit models');
const urls=Object.values(products).map(x=>x.url);
assert(urls.every(x=>x.startsWith('https://raw.githubusercontent.com/')));
assert(urls.every(x=>/\/[0-9a-f]{40}\//.test(x)),'all remote models pinned to a specific reviewed Git SHA');
assert(urls.every(x=>x.endsWith('.glb')));
const fakeLoader=(url)=>{
 assert(urls.includes(url),'unlisted asset '+url);
 return Promise.resolve({scene:new Group()});
};
function stage(level){
 const map=C.level(level),root=new Group(),kenneyFoliage={visible:true};
 let fallbackCalls=0;
 return {root,map,kenneyFoliage,setPremiumFoliage(on){fallbackCalls++;this.proceduralHidden=on},get fallbackCalls(){return fallbackCalls}};
}
(async()=>{
 const a=stage(0);
 const tropical=await Premium(T,{loadModel:fakeLoader}).decorate(a,0);
 assert.equal(tropical.loaded,4);
 assert.equal(tropical.failed,0);
 assert.equal(tropical.canopies,0,'giant toy broadleaf canopies must never be rendered');
 assert(tropical.placed>=2,'small premium shrubs should still dress the scene');
 assert.equal(a.kenneyFoliage.visible,false,'duplicate Kenney canopy hidden only once loaded');
 assert.equal(a.proceduralHidden,true);
 const b=stage(1);
 const cliff=await Premium(T,{loadModel:fakeLoader}).decorate(b,1);
 assert.equal(cliff.loaded,7);
 assert(cliff.placed>=5&&cliff.canopies===0,'cliff level keeps solid ruins without toy trees');
 assert(b.root.children[0].children.length>0);
 const noNet=stage(0);
 const fail=await Premium(T,{loadModel:async()=>{throw Error('network offline')}}).decorate(noNet,0);
 assert.equal(fail.placed,0);
 assert.equal(fail.failed,4);
 assert.equal(noNet.kenneyFoliage.visible,true,'offline still complete');
 const bushOnly=stage(0);
 const partial=await Premium(T,{loadModel:async url=>{
  if(!url.includes('/bush.glb'))throw Error('failed tree');
  return {scene:new Group()};
 }}).decorate(bushOnly,0);
 assert(partial.placed>0&&partial.canopies===0);
 assert.equal(bushOnly.kenneyFoliage.visible,false,'valid premium shrubs prevent duplicating fallback foliage');
 let resolve;
 const race=stage(0);
 const delayed=new Promise(ok=>resolve=ok);
 const future=Premium(T,{loadModel:()=>delayed}).decorate(race,0);
 await Promise.resolve();await Promise.resolve();
 race.disposePremium();
 resolve({scene:new Group()});
 const closed=await future;
 assert(closed.disposed,'stale stage cannot add asynchronous models');
 assert(!race.premiumNativeActive,'disposed scene must not enable new art');
 assert(html.includes('mini-worlds-premium.js'),'browser must load module');
 assert(original.includes('MiniWorldsPremium(T).decorate(stageRef,level)'));
 assert(src.includes('const restricted=[')&&src.includes('stage.mission?.rescues'),'trees must leave rescue and relay corridors clear');
 assert(src.includes('Deliberately no Quaternius broadleaf spheres'),'premium loader must never spawn giant round trees');
 assert(original.includes('stage.disposePremium?.()'));
 assert(kenney.includes('KENNEY FOLIAGE FALLBACK')&&kenney.includes('premiumNativeActive'));
 console.log('MINI WORLDS premium: 4 Quaternius + 3 KayKit CC0 GLBs, tropical/cliff layouts, offline/partial/network-race fallback — PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
