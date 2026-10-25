'use strict';
/* node tests/ritmo-calibracion.test.cjs
 * Simulated phone poses; tests application logic, not physical ARCore tracking.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const scripts=['ritmo-core.js','ritmo-catalog.js','ritmo-art.js','ritmo-runtime.js'];
const scope={window:null,innerWidth:390,innerHeight:844,devicePixelRatio:1};
scope.window=scope;scope.addEventListener=()=>{};
scope.ref={};scope.sess={};scope.stage='fixed';scope.boardSize=.25;
scope.tiles=Array(25).fill(0);scope.colors=Array(6).fill('#112233');scope.rgb=Array(6).fill([0,0,0]);
scope.performance={now:()=>now};scope.navigator={vibrate:()=>{}};
scope.localStorage={getItem:()=>null,setItem:()=>{}};
scope.location={href:'/'};
scope.requestAnimationFrame=()=>{};scope.setInterval=()=>{};
let now=0;const elements={};
const btns=Array.from({length:4},(_,i)=>({dataset:{lane:String(i)},classList:{
 selected:false,toggle(k,v){this.selected=v},remove(){this.selected=false}}}));
const ctx=new Proxy({}, {get:(obj,k)=>obj[k]||(k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{})});
scope.document={getElementById(id){
 if(elements[id])return elements[id];
 return elements[id]={id,style:{},textContent:'',innerHTML:'',value:({song:'neon',difficulty:'normal',latency:'0'})[id]??'',
 disabled:false,addEventListener(){},querySelectorAll(){return btns},getContext(){return ctx},setAttribute(){},
 classList:{add(){},remove(){},toggle(){}}};
}};
scope.RitmoAudio={create:()=>({clock:0,init(){},start:async()=>0,stop(){},now(){return this.clock},pause:async()=>{},resume:async()=>{},volume(){}})};
vm.createContext(scope);
for(const script of scripts)vm.runInContext(fs.readFileSync(script,'utf8'),scope,{filename:script});
const M=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],view={projectionMatrix:M,transform:{inverse:{matrix:M}}};
function frame(x){return {getViewerPose(){return {emulatedPosition:false,transform:{position:{x,y:1.1,z:.2}},views:[view]}}}}
function step(x,count=1){for(let i=0;i<count;i++){now+=17;scope.modoCaosXRFrame(now,frame(x),M)}}
const el=id=>elements[id];
assert.equal(scope.RitmoCore.LANES,4);
assert.equal(scope.modoCaosGestureConfig.label(.25),'1.00 m');
step(0,15);
assert.match(el('calTitle').textContent,/EN QUÉ COLOR/);
assert.equal(el('rtStart').disabled,true,'No se puede jugar sin indicar carril');
assert.equal(btns.filter(x=>x.classList.selected).length,0);
btns[1].onclick();step(0,90);
assert.equal(el('rtStart').disabled,false,'Auto calibración debe finalizar');
assert.match(el('calTitle').textContent,/LISTO/);
el('rtStart').onclick();
Promise.resolve().then(()=>{
 step(0,5);
 for(let i=0;i<90;i++)step(i*.5/89);
 assert.match(el('where').textContent,/AZUL/,'50cm a la derecha desde segundo carril = cuarto');
 el('rtRecenter').onclick();
 assert.match(el('calTitle').textContent,/EN QUÉ COLOR/);
 assert.equal(el('rtStart').disabled,true);
 btns[2].onclick();step(.5,90);
 assert.equal(el('rtStart').disabled,false,'Recentrar calibra sin cambiar la pista');
 console.log('OK: cuatro carriles, 1m, selección obligatoria, calibración de 1s, movimiento lateral y recentrado');
}).catch(e=>{console.error(e);process.exitCode=1});
