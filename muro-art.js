'use strict';
/* MURO RUSH — XR floor and approaching five-panel walls. */
(function(root){
root.MuroRushArt=function(svg){
 const NS='http://www.w3.org/2000/svg',el=t=>document.createElementNS(NS,t);
 const add=(t,parent=svg)=>{const n=el(t);parent.appendChild(n);return n};
 const defs=add('defs');
 defs.innerHTML='<linearGradient id="mr-floor"><stop stop-color="#0e3145" stop-opacity=".95"/><stop offset=".52" stop-color="#071a36" stop-opacity=".9"/><stop offset="1" stop-color="#17365c" stop-opacity=".96"/></linearGradient><linearGradient id="mr-wall"><stop stop-color="#87a9bf"/><stop offset=".12" stop-color="#234562"/><stop offset=".57" stop-color="#0c1c34"/><stop offset="1" stop-color="#173a56"/></linearGradient>';
 const poly=()=>add('polygon'),line=()=>{const n=add('polyline');n.setAttribute('fill','none');return n},circle=()=>add('circle');
 const base=poly(),border=line(),tracks=Array.from({length:5},poly),rails=Array.from({length:6},line);
 const dashes=Array.from({length:5},()=>Array.from({length:3},line)),laneLight=Array.from({length:5},poly);
 const impact=line(),basePulse=line();
 const panels=Array.from({length:5},()=>({side:poly(),front:poly(),top:poly(),rail:line(),light:line(),stitch:line()}));
 const aperture={outline:line(),glow:line(),label:add('text'),floor:poly()};
 for(const [k,v] of Object.entries({'text-anchor':'middle','font-weight':'1000','font-size':'12',fill:'#dffff9',stroke:'#002738','stroke-width':'3','paint-order':'stroke'}))aperture.label.setAttribute(k,v);
 const player={glow:circle(),puck:circle(),outline:circle(),name:add('text'),beam:line(),shadow:circle()};
 for(const [k,v] of Object.entries({'text-anchor':'middle','font-weight':'1000','font-size':'14',fill:'#ffffff',stroke:'#082e43','paint-order':'stroke','stroke-width':'3'}))player.name.setAttribute(k,v);
 let frames=0,visibleWalls=0;
 const fmt=pts=>pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
 const project=(m,x,y,z)=>{const p=projected(m,x,y,z,innerWidth,innerHeight);return p&&Number.isFinite(p[0])&&Number.isFinite(p[1])?p:null};
 function face(node,m,xyz,fill,strokeColor,opacity=1,width=1){
  const pts=xyz.map(q=>project(m,q[0],q[1],q[2]));
  if(pts.some(p=>!p)){node.style.display='none';return false}
  node.style.display='';node.setAttribute('points',fmt(pts));node.setAttribute('fill',fill);
  node.setAttribute('stroke',strokeColor||'none');node.setAttribute('stroke-width',width);
  node.setAttribute('opacity',opacity);return true;
 }
 function stroke(node,m,xyz,color,width,opacity=1){
  const pts=xyz.map(q=>project(m,q[0],q[1],q[2]));
  if(pts.some(p=>!p)){node.style.display='none';return false}
  node.style.display='';node.setAttribute('points',fmt(pts));node.setAttribute('stroke',color);
  node.setAttribute('stroke-width',width);node.setAttribute('opacity',opacity);
  node.setAttribute('stroke-linecap','round');node.setAttribute('stroke-linejoin','round');return true;
 }
 function dot(node,p,r,fill,outline='none',thick=0){
  if(!p){node.style.display='none';return}
  node.style.display='';node.setAttribute('cx',p[0]);node.setAttribute('cy',p[1]);
  node.setAttribute('r',r);node.setAttribute('fill',fill);
  node.setAttribute('stroke',outline);node.setAttribute('stroke-width',thick);
 }
 function hideWall(){
  for(const p of panels)for(const n of Object.values(p))n.style.display='none';
  for(const n of Object.values(aperture))n.style.display='none';
  impact.style.display='none';basePulse.style.display='none';visibleWalls=0;
 }
 function render(frame,world,g,opts={}){
  const pose=frame?.getViewerPose(ref),view=pose?.views?.[0];
  if(!view||!world)return{visible:false};
  const m=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,world));
  svg.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight);
  const tile=opts.tile||.45,half=tile*2.5,near=half*.88,far=-half*.88;
  const xAt=i=>-half+i*tile,pz=near;
  face(base,m,[[-half,.025,-half],[half,.025,-half],[half,.025,half],[-half,.025,half]],'url(#mr-floor)','#56e9ec',.95,1.1);
  stroke(border,m,[[-half,.035,-half],[half,.035,-half],[half,.035,half],[-half,.035,half],[-half,.035,-half]],'#4bf9d4',4,.98);
  for(let lane=0;lane<5;lane++){
   const l=xAt(lane),r=l+tile,gap=tile*.017,on=g.wall?.open.includes(lane);
   face(tracks[lane],m,[[l+gap,.039,-half],[r-gap,.039,-half],[r-gap,.039,half],[l+gap,.039,half]],lane%2?'#153451':'#0c2e49','#77c7eb',.87,.6);
   face(laneLight[lane],m,[[l+tile*.06,.05,-half*.8],[r-tile*.06,.05,-half*.8],[r-tile*.06,.05,half*.92],[l+tile*.06,.05,half*.92]],
     on?'#40ffc4':'#051a2b',on?'#78ffe4':'none',on?.18:.06,on?1.4:0);
   for(let k=0;k<3;k++){
    const z=-half+.23*half+k*.63*half;
    stroke(dashes[lane][k],m,[[l+tile*.5,.055,z],[l+tile*.5,.055,z+.14*half]],on?'#5bfcd8':'#63a6c6',2,on?.88:.25);
   }
  }
  for(let i=0;i<6;i++)stroke(rails[i],m,[[xAt(i),.064,-half],[xAt(i),.064,half]],'#4c98b7',1.6,.45);
  const px=half*(g.playerX||0),origin=project(m,px,.14,pz);
  const ring=Array.from({length:27},(_,i)=>{const a=i*Math.PI*2/26,r=tile*.29;return[px+Math.cos(a)*r,.075,pz+Math.sin(a)*r]});
  stroke(player.beam,m,ring,'#5dffe0',3.3,.92);
  dot(player.shadow,project(m,px,.09,pz),17,'#041727b6');
  dot(player.glow,origin,14,'#63ffe6a8');
  dot(player.puck,origin,9,'#2effb5','#eaffff',3);
  dot(player.outline,origin,19,'none','#ffffff',2);
  const name=project(m,px,.39,pz);
  player.name.style.display=name?'':'none';
  if(name){player.name.setAttribute('x',name[0]);player.name.setAttribute('y',name[1]-13);player.name.textContent='VOS';}
  if(!g.wall||!(g.phase==='wave'||g.phase==='between')){hideWall();frames++;return{visible:true,player:name}}
  const w=g.wall,progress=g.phase==='wave'?w.progress:1,z=far+(near-far)*progress,zBack=z-.035,
    hue=w.color||'#40ffcf',top=.94;
  let shown=0;
  for(let i=0;i<5;i++){
   const p=panels[i];if(w.open.includes(i)){for(const v of Object.values(p))v.style.display='none';continue;}
   const l=xAt(i)+tile*.013,r=xAt(i+1)-tile*.013;
   const visible=face(p.front,m,[[l,.072,z],[r,.072,z],[r,top,z],[l,top,z]],'url(#mr-wall)',hue,.99,2);
   face(p.side,m,[[r,.072,z],[r,top,z],[r,top,zBack],[r,.072,zBack]],'#061a36',hue,.96,1.7);
   face(p.top,m,[[l,top,z],[r,top,z],[r,top,zBack],[l,top,zBack]],hue,'#c8ffff',.9,1);
   stroke(p.rail,m,[[l,.19,z+.001],[r,.19,z+.001]],hue,5,.97);
   stroke(p.light,m,[[l,top*.76,z+.002],[r,top*.76,z+.002]],hue,2.6,.83);
   stroke(p.stitch,m,[[l+tile*.18,top*.53,z+.002],[r-tile*.18,top*.53,z+.002]],'#edffff',3,.77);
   if(visible)shown++;
  }
  const min=Math.min(...w.open),max=Math.max(...w.open),left=xAt(min),right=xAt(max+1);
  const rect=[[left,.055,z],[left,top,z],[right,top,z],[right,.055,z]];
  stroke(aperture.glow,m,rect,'#0cffe4',13,.26);
  stroke(aperture.outline,m,rect,'#c9fff1',3.4,1);
  face(aperture.floor,m,[[left,.064,z-.11],[right,.064,z-.11],[right,.064,z+.12],[left,.064,z+.12]],'#3bffbd','#e5ffff',.24,2);
  const mid=project(m,(left+right)*.5,top+.14,z);
  aperture.label.style.display=mid?'':'none';
  if(mid){aperture.label.setAttribute('x',mid[0]);aperture.label.setAttribute('y',mid[1]);aperture.label.textContent=w.kind==='switch'&&!w.shifted?'¡CAMBIARÁ!':'PASÁ POR ACÁ';}
  stroke(impact,m,[[-half,.078,near],[half,.078,near]],'#ffe6b0',4,progress>.82?.75:.27);
  stroke(basePulse,m,[[left,.066,z],[right,.066,z]],'#66ffca',4,.88);
  visibleWalls=shown;frames++;
  return{visible:true,player:name,hole:mid,panels:shown,depth:progress};
 }
 return{render,clear:hideWall,stats:()=>({frames,panels:visibleWalls})};
};
})(window);
