'use strict';
/* node tests/ritmo-experience.test.cjs
 * Headless rendering regression. A mock canvas cannot validate Android FPS or
 * physical ARCore, but covers game effects and full hold HUD integration.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=globalThis;
global.innerWidth=392;global.innerHeight=844;global.devicePixelRatio=1;
global.ref={};
global.matchMedia=()=>({matches:false});
global.performance={now:()=>1000};
require('../ritmo-core.js');
require('../ritmo-catalog.js');
require('../ritmo-art.js');
require('../ritmo-fx.js');
const html=fs.readFileSync('ritmo.html','utf8');
const runtime=fs.readFileSync('ritmo-runtime.js','utf8');
assert(html.includes('id="fxCanvas"')&&html.includes('id="holdHud"'));
assert(/ritmo-fx\.js\?v=\d+/.test(html));
assert(runtime.includes("type==='hold_complete'")&&runtime.includes("holdFill"));
assert(runtime.includes("audio.feedback?.('HOLD_COMPLETE'"));
assert(runtime.includes("fx?.celebrate("));
let strokes=0,draws=0;
const ctx=new Proxy({},{
 get(obj,key){
  if(Object.prototype.hasOwnProperty.call(obj,key))return obj[key];
  if(key==='createLinearGradient')return()=>({addColorStop(){}});
  return()=>{if(key==='stroke')strokes++;if(key==='fill')draws++};
 },
 set(obj,key,val){obj[key]=val;return true}
});
const canvas={width:0,height:0,getContext(){return ctx}};
const svg={innerHTML:'',setAttribute(){}};
const art=RitmoArt.create(svg,canvas);
const fx=RitmoFx.create({width:0,height:0,getContext(){return ctx}});
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const frame={getViewerPose(){return{views:[{projectionMatrix:I,transform:{inverse:{matrix:I}}}]}}};
const game=RitmoCore.make('neon','normal',.25);
RitmoCore.start(game);
const note=game.notes.find(n=>n.type==='hold');
game.cursor=note.id;game.elapsed=note.at-.3;
RitmoCore.setPosition(game,note.lane,note.at-.15);RitmoCore.tick(game,note.at-.15);
assert(game.holdActive,'No sustain active');
art.ar(frame,I,game,.25);
assert(svg.innerHTML.includes('MANTENÉ'),'AR sustain must show text and charging ring');
assert(Array.isArray(art.spot(note.lane)),'Position projection for particle effects');
art.demo(game);
fx.burst(note.lane,art.spot(note.lane),'HOLD',12,2000);
fx.celebrate(20);
for(let i=0;i<10;i++)fx.frame(1000+16*i);
fx.reset();
assert(strokes>0&&draws>0,'Effects did not draw');
console.log('OK: active AR/demo sustained ribbon, four-lane particle overlays, point burst and combo visuals');
