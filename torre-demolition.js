(function(root){
'use strict';
// Bright but solid colours: high contrast against the real camera.
const COLORS=['#25dbc9','#ffb347','#755bff','#ff648f','#a886ff','#a8e653','#438cff','#ff8354'];
function color(id){return COLORS[(Math.max(1,Number(id)||1)-1)%COLORS.length]}
function pointInPolygon(poly,x,y){
 if(!Array.isArray(poly)||poly.length<3||!Number.isFinite(x)||!Number.isFinite(y))return false;
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if(!a||!b||!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(b.x)||!Number.isFinite(b.y))return false;
  const ax=b.x-a.x,ay=b.y-a.y,dx=x-a.x,dy=y-a.y;
  const cross=ax*dy-ay*dx,dot=dx*ax+dy*ay,len=ax*ax+ay*ay;
  if(Math.abs(cross)<.001&&dot>=0&&dot<=len)return true;
  if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }
 return hit;
}
function hitAt(regions,x,y){
 // Visible surface wins; never pick by game-list order or by a HUD button.
 let closest=null;
 for(const r of regions||[]){
  if(!Number.isFinite(r.depth)||!pointInPolygon(r.polygon,x,y))continue;
  if(!closest||r.depth<closest.depth)closest=r;
 }
 return closest?closest.id:null;
}
function isTap(a,b,threshold=20){
 return Boolean(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<=threshold);
}
const api={COLORS,color,pointInPolygon,hitAt,isTap};
root.TorreDemolition=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
