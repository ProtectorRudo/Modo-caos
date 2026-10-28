/* MODO CAOS · FRUTÁSTROFE · proyección AR independiente de Three.js.
   Proyecta objetos REALES del mundo local al DOM-overlay del teléfono.
   Nunca fija frutas a coordenadas de pantalla: cada cuadro usa pose de WebXR. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FrutaARProjection=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function transform(m,x,y,z){return [
 m[0]*x+m[4]*y+m[8]*z+m[12],
 m[1]*x+m[5]*y+m[9]*z+m[13],
 m[2]*x+m[6]*y+m[10]*z+m[14],
 m[3]*x+m[7]*y+m[11]*z+m[15]
]}
function projection(view,origin,scale,p,width,height){
 if(!view||!origin||!p||!(scale>0))return null;
 const inv=view.transform?.inverse?.matrix,proj=view.projectionMatrix;
 if(!inv||!proj||!Number.isFinite(origin.x))return null;
 // The game world uses an identity rotation anchored to the physical floor.
 const x=origin.x+p.x*scale,y=origin.y+p.y*scale*.46,z=origin.z+p.z*scale;
 const a=transform(inv,x,y,z),b=transform(proj,a[0],a[1],a[2]);
 if(b[3]<=.02||!Number.isFinite(b[0]/b[3]))return null;
 const ndcx=b[0]/b[3],ndcy=b[1]/b[3],ndcz=b[2]/b[3];
 if(ndcz<-.2||ndcz>1.1)return null;
 return {x:(ndcx+1)*width*.5,y:(1-ndcy)*height*.5,depth:ndcz,nx:ndcx,ny:ndcy};
}
function diameter(view,origin,scale,p,r,width,height){
 const center=projection(view,origin,scale,p,width,height);
 if(!center)return null;
 const right=projection(view,origin,scale,{x:p.x+r,y:p.y,z:p.z},width,height);
 const up=projection(view,origin,scale,{x:p.x,y:p.y+r,z:p.z},width,height);
 const px=right?Math.abs(right.x-center.x):0,py=up?Math.abs(up.y-center.y):0;
 const radius=clamp(Math.max(px,py),13,95);
 return {...center,r:radius,visible:center.x>-radius&&center.x<width+radius&&center.y>-radius&&center.y<height+radius};
}
function targets(view,origin,scale,items,width,height){
 const result=[];
 for(const o of items||[]){
  const p=diameter(view,origin,scale,o,o.kind==='boss'?1.4:Math.max(.30,o.r||.3)*1.25,width,height);
  if(p&&p.visible)result.push({id:o.id,kind:o.kind,...p});
 }
 return result;
}
function floorOutline(view,origin,scale,radius,width,height){
 const points=[];for(let i=0;i<48;i++){
  const a=i*Math.PI/24;
  const p=projection(view,origin,scale,{x:Math.sin(a)*radius,y:-.15,z:Math.cos(a)*radius},width,height);
  points.push(p?[p.x,p.y]:null);
 }return points;
}
return Object.freeze({projection,diameter,targets,floorOutline,transform});
});