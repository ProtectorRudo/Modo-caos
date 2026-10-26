/* MINI WORLDS — AR floor placement visibility guide.
 * Screen-space lines are projected from the same anchored 3D stage transform,
 * using native WebXR camera matrices. This is a placement diagnostic and
 * sight-line preview; it never substitutes for Three.js scene rendering.
 */
(function(root){
'use strict';
root.MiniWorldsARGuide=function(T,svg){
 let last=0,visible=0;
 const ns='http://www.w3.org/2000/svg';
 const shapes=Array.from({length:8},(_,i)=>{
  const p=document.createElementNS(ns,'polygon');
  p.setAttribute('fill',i===0?'#62ffe1':'#4de3bd');
  p.setAttribute('fill-opacity',i===0?'.19':'.065');
  p.setAttribute('stroke',i===0?'#b4ffe7':'#74ffc2');
  p.setAttribute('stroke-width',i===0?'3.5':'1.8');
  p.setAttribute('stroke-linejoin','round');
  svg.appendChild(p);return p;
 });
 const origin=document.createElementNS(ns,'circle');
 origin.setAttribute('r','7');origin.setAttribute('fill','#fef19e');
 origin.setAttribute('stroke','#193a40');origin.setAttribute('stroke-width','2');
 svg.appendChild(origin);
 const label=document.createElementNS(ns,'text');
 label.setAttribute('font-size','16');label.setAttribute('fill','#fff4ac');
 label.setAttribute('font-weight','900');
 label.setAttribute('stroke','#12303a');label.setAttribute('stroke-width','2.7');
 label.setAttribute('paint-order','stroke');label.textContent='INICIO';
 svg.appendChild(label);
 function hide(){svg.hidden=true;visible=0;return {visible:0,pose:false}}
 function draw(frame,refSpace,stage,placing,force=false){
  if(!frame||!stage||!refSpace)return hide();
  // Screen-space SVG is deliberately restricted to placement/ready. In actual
  // gameplay an emergency guide can be enabled only if rendering drops out.
  if(!placing&&!force)return hide();
  const pose=frame.getViewerPose(refSpace);
  if(!pose?.views?.length)return hide();
  const view=pose.views[0],ww=Math.max(1,innerWidth),hh=Math.max(1,innerHeight);
  const projection=new T.Matrix4().fromArray(view.projectionMatrix)
    .multiply(new T.Matrix4().fromArray(view.transform.inverse.matrix));
  stage.root.updateWorldMatrix(true,false);
  projection.multiply(stage.root.matrixWorld);
  svg.setAttribute('viewBox','0 0 '+ww+' '+hh);
  svg.hidden=false;visible=0;
  function project(x,y,z){
   const q=new T.Vector4(x,y,z,1).applyMatrix4(projection);
   if(!Number.isFinite(q.w)||q.w<=.035)return null;
   let px=(q.x/q.w*.5+.5)*ww,py=(.5-q.y/q.w*.5)*hh;
   if(!Number.isFinite(px)||!Number.isFinite(py))return null;
   return [px,py];
  }
  const pocket=stage.pocket;
  const tiles=pocket?stage.map.platforms.filter(t=>window.MiniWorldsPocket.canSee(t.z,pocket.room,.1)):stage.map.platforms;
  const pocketDz=stage.worldRoot?.position.z||0,pocketDy=stage.worldRoot?.position.y||0;
  for(let i=0;i<shapes.length;i++){
   const tile=tiles[i],shape=shapes[i];
   if(!tile){shape.style.display='none';continue}
   let y=tile.y+.09+pocketDy,w=tile.w*.5,d=tile.d*.5;
   const corners=[[-w,-d],[w,-d],[w,d],[-w,d]]
     .map(([dx,dz])=>project(tile.x+dx,y,tile.z+dz+pocketDz));
   if(corners.some(x=>!x)){shape.style.display='none';continue}
   const onscreen=corners.some(([x,y])=>x>-ww*.3&&x<ww*1.3&&y>-hh*.2&&y<hh*1.2);
   shape.style.display=onscreen?'':'none';
   if(onscreen){shape.setAttribute('points',corners.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' '));visible++}
  }
  const start=project(stage.hero?.root?.position.x||0,(stage.hero?.root?.position.y||0)+.17+pocketDy,(stage.hero?.root?.position.z||0)+pocketDz);
  const showStart=start&&start[0]>=-50&&start[0]<=ww+50&&start[1]>=-50&&start[1]<=hh+50;
  origin.style.display=showStart?'':'none';label.style.display=showStart?'':'none';
  if(showStart){origin.setAttribute('cx',start[0]);origin.setAttribute('cy',start[1]);label.setAttribute('x',start[0]+14);label.setAttribute('y',start[1]-9)}
  last=performance.now();
  return {visible,pose:true,originVisible:!!showStart};
 }
 return {draw,hide,get visible(){return visible}};
};
})(typeof window!=='undefined'?window:globalThis);
