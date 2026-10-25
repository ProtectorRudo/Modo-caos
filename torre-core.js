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
/**
 * Structural collapse rules for TORRE INFINITA. Only measures simulated
 * rigid-body positions/rotations, never manufactured animation. Caller must
 * debounce failures (~0.7s) so a wobble that recovers is not penalized.
 *
 * reference: snapshots of the PREVIOUS accepted stable tower. An intentional
 * rotation while holding the *new* piece is not part of this reference.
 */
function diagnoseCollapse(items,baseHeight=0,latestId,reference=[]){
 if(!items.length)return {failed:false,reason:null};
 const last=items.find(p=>p.id===latestId);
 if(!last)return {failed:true,reason:'pieza_perdida'};
 if(items.some(p=>p.y<-.28||Math.abs(p.x)>1.45||(Number.isFinite(p.minY)&&p.minY<-.26)))
  return {failed:true,reason:'pieza_fuera'};
 const highest=Math.max(...items.map(p=>Number.isFinite(p.top)?p.top:p.y),.14)-.14;
 // The tower has lost a meaningful fraction of its former stable height.
 if(baseHeight>.48&&baseHeight-highest>.19&&highest<baseHeight*.78)
  return {failed:true,reason:'altura_perdida'};
 // At least three blocks have fallen back onto the floor. In a vertical
 // tower game this is a spill, even if a standing rectangle keeps the
 // bounding-box height deceptively high (the screenshot regression).
 const grounded=items.filter(p=>Number.isFinite(p.minY)&&p.minY<=.19&&p.y>-.28);
 if(items.length>=3&&grounded.length>=3&&grounded.length>=Math.ceil(items.length*.62))
  return {failed:true,reason:'piezas_desparramadas'};
 // Multiple ground contacts over a large width: the pile broke apart,
 // regardless of whether one tall block remains upright.
 const xs=items.map(p=>p.x);
 const span=Math.max(...xs)-Math.min(...xs);
 if(items.length>=3&&grounded.length>=2&&span>1.34)
  return {failed:true,reason:'torre_dispersa'};
 // A previously settled load-bearing piece has been moved radically.
 // Relative-to-baseline checks allow intentionally rotated weird shapes.
 if(reference&&reference.length){
  let moved=0;
  for(const prior of reference){
   const now=items.find(p=>p.id===prior.id);
   if(!now)continue;
   const tipping=Number.isFinite(now.angle)&&Number.isFinite(prior.angle)&&Math.abs(angleDelta(prior.angle,now.angle))>.92;
   const slipping=Math.abs(now.x-prior.x)>.42;
   const sinking=prior.y-now.y>.26;
   if(tipping||slipping||sinking)moved++;
  }
  if(moved>=Math.max(1,Math.ceil(reference.length*.34))&&(grounded.length>=2||highest<baseHeight-.12))
   return {failed:true,reason:'estructura_desarmada'};
 }
 return {failed:false,reason:null};
}
function collapsed(items,baseHeight,latestId,reference=[]){
 return diagnoseCollapse(items,baseHeight,latestId,reference).failed;
}
const api={SHAPES:S,rng,select,makePack,angleDelta,rotated,bounds,polygonArea,score,collapsed,diagnoseCollapse};
root.TorreCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
