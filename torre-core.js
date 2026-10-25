(function(root){
'use strict';
const S=[
 {id:'cubo',name:'Cubo',tone:0,weight:1,parts:[[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]]},
 {id:'ancho',name:'Plataforma',tone:1,weight:1.1,parts:[[[-.85,-.29],[.85,-.29],[.85,.29],[-.85,.29]]]},
 {id:'alto',name:'Columna',tone:2,weight:1,parts:[[[-.29,-.8],[.29,-.8],[.29,.8],[-.29,.8]]]},
 {id:'fino',name:'Lámina',tone:3,weight:.7,parts:[[[-1,-.17],[1,-.17],[1,.17],[-1,.17]]]},
 {id:'triangulo',name:'Triángulo',tone:4,weight:1,parts:[[[-.8,-.52],[.8,-.52],[0,.64]]]},
 {id:'trapecio',name:'Trapecio',tone:5,weight:1.3,parts:[[[-.82,-.45],[.82,-.45],[.42,.45],[-.42,.45]]]},
 {id:'ele',name:'Pieza L',tone:6,weight:1.1,parts:[[[-.63,-.7],[-.17,-.7],[-.17,.69],[-.63,.69]],[[-.17,-.7],[.72,-.7],[.72,-.22],[-.17,-.22]]]},
 {id:'te',name:'Pieza T',tone:1,weight:1.4,parts:[[[-.8,.15],[.8,.15],[.8,.59],[-.8,.59]],[[-.23,-.77],[.23,-.77],[.23,.15],[-.23,.15]]]},
 {id:'zeta',name:'Pieza Z',tone:2,weight:1,parts:[[[-.8,.15],[.26,.15],[.26,.57],[-.8,.57]],[[-.26,-.57],[.8,-.57],[.8,-.15],[-.26,-.15]],[[-.26,-.15],[.26,-.15],[.26,.15],[-.26,.15]]]},
 {id:'cuna',name:'Cuña',tone:3,weight:1.25,parts:[[[-.83,-.37],[.83,-.37],[.83,.37]]]},
 {id:'media',name:'Semicírculo',tone:4,weight:.85,parts:[semi()]},
 {id:'cilindro',name:'Cilindro',tone:5,weight:1.25,parts:[circle(14,.58)]},
 {id:'escalon',name:'Escalón',tone:6,weight:1.15,parts:[[[-.74,-.58],[.74,-.58],[.74,-.08],[-.74,-.08]],[[-.74,-.08],[.12,-.08],[.12,.56],[-.74,.56]]]},
 {id:'raro',name:'Combinado',tone:0,weight:1.7,parts:[[[-.72,-.24],[.72,-.24],[.72,.16],[-.72,.16]],[[-.60,.16],[-.18,.16],[-.18,.74],[-.60,.74]],[[.14,-.68],[.55,-.68],[.55,-.24],[.14,-.24]]]}
];
function circle(n,r){return Array.from({length:n},(_,i)=>[Math.cos(2*Math.PI*i/n)*r,Math.sin(2*Math.PI*i/n)*r])}
function semi(){let p=[[-.66,-.35],[.66,-.35]];for(let i=0;i<=12;i++){let a=Math.PI*i/12;p.push([Math.cos(a)*.66,Math.sin(a)*.66-.35])}return p}
function rng(seed){let n=(seed>>>0)||0x13572468;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296}}
function polygonArea(points){let sum=0;for(let i=0;i<points.length;i++){let a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1]}return Math.abs(sum)*.5}
function select(level,random){if(level===0)return S[0];if(level===1)return S[1];if(level===2)return S[4];const choices=level<7?[0,1,2,3,4,5,6]:level<15?[0,1,2,3,4,5,6,7,8,9,10,12]:S.map((_,i)=>i);
let i=Math.min(choices.length-1,Math.floor(random()*choices.length));return S[choices[i]]}
// Four known choices per building round. The player, not RNG, decides placement order.
function makePack(round,random){
 const kits=[
  [0,1,4,5],[0,2,6,3],[1,5,7,9],[0,6,8,10],
  [2,4,11,12],[3,5,7,13],[1,8,9,11],[2,6,10,13]
 ];
 const idx=Math.max(0,Math.floor(round));
 if(idx<kits.length)return kits[idx].map(i=>S[i]);
 const base=[0,1,2,3,4,5,6,7,8,9,10,11,12,13];
 const choose=(available)=>{let n=Math.min(available.length-1,Math.floor(random()*available.length));return available.splice(n,1)[0]};
 const stable=choose([0,1,2,3,5]);
 const result=[stable],remaining=base.filter(n=>n!==stable);
 while(result.length<4)result.push(choose(remaining));
 return result.map(i=>S[i]);
}
function angleDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from))}
function rotated(points,angle){const c=Math.cos(angle),s=Math.sin(angle);return points.map(([x,y])=>[x*c-y*s,x*s+y*c])}
function bounds(shape,angle=0){let xs=[],ys=[];for(const poly of shape.parts)for(const [x,y] of rotated(poly,angle)){xs.push(x);ys.push(y)}
return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}}
function score(height,pieces){return Math.round(Math.max(0,height)*100)}
function collapsed(items,baseHeight,latestId){const last=items.find(i=>i.id===latestId);if(!last||last.y<-.28||Math.abs(last.x)>1.45)return true;let survivors=items.filter(i=>i.y>-.22&&Math.abs(i.x)<1.38);return survivors.length<items.length||((baseHeight>.62)&&Math.max(...survivors.map(i=>i.top),0)<baseHeight-.24)}
const api={SHAPES:S,rng,select,makePack,angleDelta,rotated,bounds,polygonArea,score,collapsed};
root.TorreCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
