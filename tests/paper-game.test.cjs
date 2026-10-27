'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','paper.html'),'utf8');
const script=source.split('<script>')[1]?.split('</script>')[0];
assert.ok(script,'Game script must be embedded in paper.html');
function boot(seed=419){
 const els=new Map(),listeners={};
 let now=0,frame=null,rng=seed>>>0;
 const fakeMath=Object.create(Math);
 fakeMath.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 function context(){return new Proxy({
   createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
   measureText:()=>({width:12})
 },{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
 function get(id){if(!els.has(id)){
   els.set(id,{value:id==='nick'?'VOS':'',style:{},textContent:'',innerHTML:'',onclick:null,
    classList:{add(){},remove(){}},setAttribute(){},append(){},setPointerCapture(){},getContext(){return context()},
    addEventListener(n,fn){(listeners[id+':'+n]??=[]).push(fn);}
   });}return els.get(id);}
 const doc={getElementById:get,createElement:k=>get('node-'+Math.random()),
   addEventListener(n,fn){(listeners['document:'+n]??=[]).push(fn);},querySelectorAll:()=>[],hidden:false};
 const win={addEventListener(){}};
 const loc={search:'?qa=1',href:'https://example.test/paper.html'};
 const storage=new Map();
 const browser=Function('document','window','location','performance','requestAnimationFrame','innerWidth','innerHeight','devicePixelRatio','localStorage','navigator','setTimeout','URLSearchParams','Math',script);
 browser(doc,win,loc,{now:()=>now},fn=>frame=fn,430,850,1,
  {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},{vibrate(){}},()=>{},URLSearchParams,fakeMath);
 function tick(n=1){for(let i=0;i<n;i++){now+=1000/60;const f=frame;assert.equal(typeof f,'function');frame=null;f(now);}}
 function aim(x,y){let q=win.territoryQA,t=Math.atan2(y-q.y,x-q.x);
  for(const fn of listeners['game:pointermove']||[])fn({pointerType:'mouse',clientX:215+130*Math.cos(t),clientY:425+130*Math.sin(t)});}
 return {get,win,aim,tick,storage};
}
test('page has complete standalone game and no borrowed external assets',()=>{
 assert.match(source,/<canvas id="game"/);
 assert.match(source,/function capture\(p\)/);
 assert.match(source,/function death\(p/);
 assert.match(source,/function stepBot\(p/);
 assert.doesNotMatch(source,/<script[^>]+src=/);
});
test('12 agents, territory HUD and pause controls initialize',()=>{
 const g=boot();assert.equal(g.win.territoryQA.mode,'home');g.get('start').onclick();
 assert.equal(g.win.territoryQA.mode,'play');
 assert.equal(g.win.territoryQA.players,12);
 assert.ok(g.win.territoryQA.area>0.4);
 g.tick(5);assert.match(g.get('percent').textContent,/%/);
 const clock=g.win.territoryQA.clock;g.get('pause').onclick();g.tick(20);
 assert.equal(g.win.territoryQA.mode,'pause');
 assert.equal(g.win.territoryQA.clock,clock);
 g.get('resume').onclick();g.tick(20);
 assert.ok(g.win.territoryQA.clock>clock);
});
test('a real closed circuit captures interior cells and raises player percentage',()=>{
 const g=boot(419);g.get('start').onclick();const first=g.win.territoryQA.area;
 const points=[[1265,1118],[1280,968],[975,967],[973,1265],[1118,1118]];
 let n=0,last=0,captured=false;let previousOutside=false;
 for(let i=0;i<1100;i++){
  let q=g.win.territoryQA;if(q.mode!=='play')break;
  let target=points[n]||{x:1118,y:1118};
  if(n<points.length&&(Math.hypot(q.x-target[0],q.y-target[1])<27||i-last>550)){n++;last=i;target=points[n]||[1118,1118];}
  if(n<points.length)g.aim(target[0],target[1]);else g.aim(1118,1118);
  g.tick(1);q=g.win.territoryQA;
  if(previousOutside&&!q.outside&&q.area>first+.75){captured=true;break;}
  previousOutside=q.outside;
 }
 assert.equal(captured,true,'closing loop should capture a meaningful interior area');
 assert.ok(g.win.territoryQA.area>=first+.75);
});
test('restarting a match resets the territory and score',()=>{
 const g=boot(774);g.get('start').onclick();g.tick(180);
 g.get('restart').onclick();assert.equal(g.win.territoryQA.mode,'play');
 assert.ok(g.win.territoryQA.clock<.05);
 assert.equal(g.win.territoryQA.kills,0);
 assert.equal(g.win.territoryQA.players,12);
});
