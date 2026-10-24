"use strict";
/* TERRITORIO X — XR DOM overlay renderer. Every projected cell is anchored to buildWorld().
   22² SVG meshes updated at a capped cadence to maintain mobile AR responsiveness.
*/
(function(root){
root.TerritoryArt=function(svg,T){
 const NS="http://www.w3.org/2000/svg",N=T.N,SCHEME=T.COLORS;
 const create=t=>document.createElementNS(NS,t);
 const newPoly=()=>{const x=create("polygon");svg.appendChild(x);return x;};
 const newLine=()=>{const x=create("polyline");x.setAttribute("fill","none");svg.appendChild(x);return x;};
 const newCircle=()=>{const x=create("circle");svg.appendChild(x);return x;};
 const defs=create("defs");
 defs.innerHTML='<linearGradient id="txFloor" x1="0" y1="0" x2="1" y2="1">'+
   '<stop stop-color="#134558" stop-opacity=".73"/><stop offset="1" stop-color="#051b35" stop-opacity=".88"/></linearGradient>'+
   '<radialGradient id="txPlayerLight"><stop stop-color="#ffffff" stop-opacity=".96"/>'+
   '<stop offset=".45" stop-color="#cffcff" stop-opacity=".75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'+
   '<linearGradient id="txMetal"><stop stop-color="#edffff"/><stop offset=".45" stop-color="#44728c"/>'+
   '<stop offset="1" stop-color="#122b4c"/></linearGradient>';
 svg.appendChild(defs);
 const base=newPoly(),border=newLine(),trim=newLine();
 const grid=Array.from({length:N*N},()=>{
   const v=newPoly();v.setAttribute("stroke","#c7ffff");v.setAttribute("stroke-width",".55");
   v.setAttribute("stroke-opacity",".20");v.setAttribute("stroke-linejoin","round");return v;
 });
 const trails=Array.from({length:4},()=>({glow:newLine(),core:newLine(),head:newCircle()}));
 const avatars=Array.from({length:4},()=>({
   shadow:newPoly(),halo:newCircle(),body:newPoly(),face:newPoly(),high:newPoly(),ring:newLine(),label:create("text")
 }));
 for(const p of avatars){p.label.setAttribute("font-size","10");p.label.setAttribute("font-weight","1000");
   p.label.setAttribute("text-anchor","middle");p.label.setAttribute("paint-order","stroke");
   p.label.setAttribute("stroke","#001626");p.label.setAttribute("stroke-width","2.7");
   svg.appendChild(p.label);
 }
 const pickups=Array.from({length:4},()=>({star:newPoly(),halo:newCircle()}));
 const fx=Array.from({length:6},()=>({ring:newLine(),glow:newCircle()}));
 let pulses=[],lastEvent=0,changed=0,frames=0,previousMap=null;
 const fmt=p=>p.map(q=>q[0].toFixed(1)+","+q[1].toFixed(1)).join(" ");
 function project(m,c){
   return projected(m,c[0],c[1],c[2],innerWidth,innerHeight);
 }
 function face(node,pts,m,fill,stroke,alpha=1){
   const p=pts.map(c=>project(m,c));
   if(p.some(x=>!x)){node.style.display="none";return;}
   node.style.display="";node.setAttribute("points",fmt(p));
   node.setAttribute("fill",fill);node.setAttribute("opacity",alpha);
   if(stroke)node.setAttribute("stroke",stroke);else node.removeAttribute("stroke");
 }
 function stroke(node,pts,m,color,w,opacity=1){
   const p=pts.map(c=>project(m,c));
   if(p.some(x=>!x)){node.style.display="none";return;}
   node.style.display="";node.setAttribute("points",fmt(p));
   node.setAttribute("stroke",color);node.setAttribute("stroke-width",w);
   node.setAttribute("stroke-linejoin","round");node.setAttribute("stroke-linecap","round");
   node.setAttribute("opacity",opacity);
 }
 function setPoint(el,pt,r,fill,alpha=1,strokeColor=null){
   if(!pt){el.style.display="none";return;}
   el.style.display="";el.setAttribute("cx",pt[0]);el.setAttribute("cy",pt[1]);
   el.setAttribute("r",r);el.setAttribute("fill",fill);el.setAttribute("opacity",alpha);
   if(strokeColor){el.setAttribute("stroke",strokeColor);el.setAttribute("stroke-width","1.4");}
 }
 function circle(cx,cy,r,height=.09,div=27){
   return Array.from({length:div+1},(_,i)=>{
     const a=2*Math.PI*i/div;
     return[cx+Math.cos(a)*r,height,cy+Math.sin(a)*r];
   });
 }
 function render(frame,world,g,opts={}){
   const view=frame.getViewerPose(ref)?.views?.[0];
   if(!view||!world)return;
   const m=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,world));
   const scale=opts.boardSize||.45,half=scale*2.5,pitch=5*scale/N;
   const cellPos=(x,y,height=.095)=>[-half+(x+.5)*pitch,height,-half+(y+.5)*pitch];
   const pt=(x,y,h)=>cellPos(x,y,h);
   svg.setAttribute("viewBox","0 0 "+innerWidth+" "+innerHeight);
   const w=half;
   face(base,[[-w,.057,-w],[w,.057,-w],[w,.057,w],[-w,.057,w]],m,"url(#txFloor)","#53b8c6",.98);
   stroke(border,[[-w,.083,-w],[w,.083,-w],[w,.083,w],[-w,.083,w],[-w,.083,-w]],
     m,"#35f5ca",3.5,.95);
   stroke(trim,[[-w*1.015,.071,-w*1.015],[w*1.015,.071,-w*1.015],[w*1.015,.071,w*1.015],
     [-w*1.015,.071,w*1.015],[-w*1.015,.071,-w*1.015]],m,"#50aaff",1.7,.48);
   for(let i=0;i<N*N;i++){
     const y=(i/N)|0,x=i%N,owner=g.owners[i],el=grid[i];
     const left=-half+x*pitch,right=left+pitch,back=-half+y*pitch,front=back+pitch,gap=pitch*.045;
     const coords=[[left+gap,.095,back+gap],[right-gap,.095,back+gap],
       [right-gap,.095,front-gap],[left+gap,.095,front-gap]];
     let fill=owner===-1?"#132f48":SCHEME[owner];
     face(el,coords,m,fill,owner===-1?"#8bb9ca":"#deffff",owner===-1?.46:.93);
     el.setAttribute("stroke-opacity",owner===-1?".19":".72");
     el.setAttribute("stroke-width",owner===-1?".45":"1.15");
   }
   // Every vulnerable trail is a bright continuous polyline that becomes solid land when closed.
   for(let id=0;id<4;id++){
     const p=g.players[id],t=trails[id],c=SCHEME[id];
     let pts=p.trail.map(k=>pt(k%N,(k/N)|0,.137));
     if(p.trail.length)pts.push(pt(p.x,p.y,.139));
     if(pts.length>=2){
       stroke(t.glow,pts,m,c,12,.36);stroke(t.core,pts,m,"#ffffff",4.7,.98);
       const end=project(m,pts[pts.length-1]);setPoint(t.head,end,5.4,c,1,"white");
     }else{t.glow.style.display=t.core.style.display=t.head.style.display="none";}
   }
   // Avatars have a real projected 3D diamond/tower above the AR plane.
   for(let id=0;id<4;id++){
     const p=g.players[id],a=avatars[id],color=SCHEME[id],visible=!p.dead;
     for(const k of ["shadow","halo","body","face","high","ring","label"])a[k].style.display=visible?"":"none";
     if(!visible)continue;
     const [x,,z]=pt(p.x,p.y,.12),r=pitch*.40;
     face(a.shadow,[[x-r,.106,z-r*.6],[x+r,.106,z-r*.6],[x+r,.106,z+r*.6],[x-r,.106,z+r*.6]],
       m,"#001628","none",.54);
     const top=.265+Math.sin((opts.time||0)*12+id)*.009;
     const P0=[x,.13,z-r],P1=[x+r*.82,.13,z],P2=[x,.13,z+r],P3=[x-r*.82,.13,z];
     face(a.body,[P0,P1,[x,top,z],P3],m,color,"#efffff",.97);
     face(a.face,[[x,top,z],P1,P2],m,"#d5ffff",color,.94);
     face(a.high,[[x,top,z],[x-r*.15,top-.028,z],[x,top-.08,z-r*.34]],m,"#ffffff","none",.84);
     stroke(a.ring,circle(x,z,r*.94,.135),m,color,2.6,p.protected>0?.95:.46);
     const head=project(m,[x,top+.038,z]);
     setPoint(a.halo,head,id===opts.you?15:10,"url(#txPlayerLight)",.55);
     if(head){
       a.label.setAttribute("x",head[0]);a.label.setAttribute("y",head[1]-17);
       a.label.setAttribute("fill",id===opts.you?"#ffffff":color);
       a.label.textContent=id===opts.you?"VOS":String(id+1);
     }
   }
   for(let i=0;i<pickups.length;i++){
     const s=g.pickups[i],a=pickups[i];if(!s){a.star.style.display=a.halo.style.display="none";continue;}
     const v=pt(s.x,s.y,.17),radius=pitch*.32,vertices=[];
     for(let k=0;k<10;k++){
       const th=Math.PI*2*k/10-(opts.time||0)*.4;
       const r=k%2===0?radius:radius*.43;
       vertices.push([v[0]+Math.cos(th)*r,.16+Math.sin((opts.time||0)*5)*.025,v[2]+Math.sin(th)*r]);
     }
     face(a.star,vertices,m,"#ffe15a","#ffffff",.98);
     setPoint(a.halo,project(m,[v[0],.22,v[2]]),13,"#ffeaa1",.2);
   }
   if(g.lastEvent?.seq!==lastEvent){
     lastEvent=g.lastEvent.seq;
     const e=g.lastEvent;
     if(["capture","cut","pickup","shield","eliminated"].includes(e.type)){
       pulses.push({x:e.x,y:e.y,color:SCHEME[e.id]||"#dfffff",type:e.type,age:0});
       if(pulses.length>6)pulses.shift();
     }
   }
   pulses=pulses.filter(q=>(q.age+=(opts.dt||.05))<.8);
   fx.forEach((node,i)=>{
     const q=pulses[i];if(!q){node.ring.style.display=node.glow.style.display="none";return;}
     const [x,,z]=pt(q.x,q.y,.16),radius=(q.age+.03)*pitch*8,alpha=Math.max(0,1-q.age/.8);
     stroke(node.ring,circle(x,z,radius,.18,25),m,q.color,4,alpha);
     setPoint(node.glow,project(m,[x,.20,z]),10,"#ffffff",alpha*.4);
   });
   frames++;
 }
 return {render,clear:()=>{pulses=[];lastEvent=0;},stats:()=>({frames,cells:N*N})};
};
})(window);
