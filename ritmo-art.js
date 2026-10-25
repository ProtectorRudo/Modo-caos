'use strict';
/* Ritmo Caos — pista AR anclada y escenario 2D para demostración identificada. */
(function(root){
const C=root.RitmoCore.COLORS;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ns='http://www.w3.org/2000/svg';
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function p3(M,x,y,z,w,h){let v=[x,y,z,1],q=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)q[r]+=M[k*4+r]*v[k];if(q[3]<=.03)return null;return[(q[0]/q[3]+1)*w/2,(1-q[1]/q[3])*h/2]}
function polygon(points,fill,stroke='none',sw=1,opacity=1){
 if(points.some(v=>!v))return '';
 return '<polygon points="'+points.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" opacity="'+opacity+'"/>';
}
function worldQuad(P,x1,z1,x2,z2,y,w,h,fill,stroke='none',sw=1,opacity=1){
 return polygon([[x1,z1],[x2,z1],[x2,z2],[x1,z2]].map(v=>p3(P,v[0],y,v[1],w,h)),fill,stroke,sw,opacity);
}
function create(svg,canvas){
 const ctx=canvas.getContext('2d');let lastDraw=0;
 svg.setAttribute('xmlns',ns);
 function ar(frame,W,g,size=.32){
  const pose=frame.getViewerPose(ref);if(!pose||!pose.views.length)return;
  const view=pose.views[0],P=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,W));
  const w=innerWidth,h=innerHeight,x=(i)=>(i-2)*size;
  const playing=g?.state==='playing',elapsed=g?.elapsed||0,lead=2.65;
  let html='<defs><filter id="rbGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>';
  for(let i=0;i<5;i++){
   let a=x(i)-size*.49,b=x(i)+size*.49,color=C[i],lit=g?.lane===i;
   html+=worldQuad(P,a,-1.18,b,.94,.058,w,h,i%2?'#102c51':'#08213d',color,1.35,playing?.66:.48);
   html+=worldQuad(P,a,-1.18,a+.012,.94,.064,w,h,color,color,1,.62);
   html+=worldQuad(P,b-.012,-1.18,b,.94,.064,w,h,color,color,1,.62);
   if(lit)html+=worldQuad(P,a,.44,b,.86,.067,w,h,color,'#ffffff',1,.25);
   let c=p3(P,x(i),.104,.64,w,h),r=p3(P,x(i)+size*.29,.104,.64,w,h);
   if(c&&r){const rad=Math.max(9,Math.min(54,Math.hypot(r[0]-c[0],r[1]-c[1])));html+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(rad*1.3)+'" fill="'+color+'" opacity=".20" filter="url(#rbGlow)"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+rad+'" fill="'+(lit?'#efffff':color)+'" stroke="'+color+'" stroke-width="3" opacity=".92"/>';}
  }
  html+=worldQuad(P,-2.48*size,.60,2.48*size,.68,.075,w,h,'#ffffff','#ffffff',2,.74);
  if(g&&(playing||g.state==='finished')){
   for(const n of g.notes){
    const delta=n.at-elapsed;if(delta>lead||delta<-.22||n.status!=='pending')continue;
    const z=.63-clamp(delta/lead,0,1)*1.79;
    const col=C[n.lane],cx=x(n.lane),sz=size*.28;
    if(n.type==='slide'){const fromX=x(n.fromLane),startZ=z-n.slideDuration/lead*1.79;
     html+=worldQuad(P,Math.min(fromX,cx)-sz*.2,startZ,Math.max(fromX,cx)+sz*.2,z,.11,w,h,col,'#ffffff',1,.36);}
    let vertices=[[cx,z-sz],[cx+sz,z],[cx,z+sz],[cx-sz,z]].map(v=>p3(P,v[0],.135,v[1],w,h));
    html+=polygon(vertices,(n.type==='special'||n.type==='caos')?'#ffffff':col,'#ffffff',2,.96);
    if(n.type==='hold'){const length=Math.min(.65,n.hold/lead*1.79);
     html+=worldQuad(P,cx-sz*.56,z-length,cx+sz*.56,z,.117,w,h,col,col,2,.68);}
   }
  }
  const pos=g?p3(P,x(g.lane),.17,.64,w,h):null;
  if(pos)html+='<text x="'+pos[0]+'" y="'+(pos[1]-33)+'" font-size="15" font-weight="1000" text-anchor="middle" fill="#ffffff" stroke="#06304c" stroke-width="3" paint-order="stroke">VOS</text>';
  svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.innerHTML=html;
 }
 function demo(g){
  const w=innerWidth,h=innerHeight,dpr=Math.min(2,devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const gr=ctx.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#091124');gr.addColorStop(.65,'#0b2440');gr.addColorStop(1,'#070c20');ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
  const center=w/2,top=h*.18,bottom=h*.80,topWidth=Math.min(w*.55,270),bottomWidth=Math.min(w*.92,570);
  const x=(lane,t)=>center+(lane-2)*(topWidth+(bottomWidth-topWidth)*t)/5;
  function line(points,fill,stroke,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=width||1;ctx.strokeStyle=stroke;ctx.stroke()}}
  for(let i=0;i<5;i++){
   const l=i-2.5,r=i-1.5;
   line([[center+l*topWidth/5,top],[center+r*topWidth/5,top],[center+r*bottomWidth/5,bottom],[center+l*bottomWidth/5,bottom]],i%2?'#102744':'#0a1d37',C[i],1.6);
  }
  // Moving beat grid creates depth but stays visually behind the notes.
  for(let i=0;i<11;i++){const t=(i/10+.12*(g?.elapsed||0))%1,y=top+(bottom-top)*t*t;ctx.globalAlpha=t*.15;ctx.strokeStyle='#abfaff';ctx.beginPath();ctx.moveTo(center-(topWidth+(bottomWidth-topWidth)*t)/2,y);ctx.lineTo(center+(topWidth+(bottomWidth-topWidth)*t)/2,y);ctx.stroke();ctx.globalAlpha=1}
  const lead=2.65,elapsed=g?.elapsed||0;
  if(g)for(const n of g.notes){
   const d=n.at-elapsed;if(n.status!=='pending'||d>lead||d<-.24)continue;
   const t=clamp(1-d/lead,0,1),y=top+(bottom-top)*t*t,r=Math.max(9,14+18*t);
   ctx.fillStyle=C[n.lane];ctx.shadowColor=C[n.lane];ctx.shadowBlur=14;ctx.beginPath();ctx.arc(x(n.lane,t),y,r,0,Math.PI*2);ctx.fill();
   ctx.shadowBlur=0;ctx.strokeStyle='#f7ffff';ctx.lineWidth=2.5;ctx.stroke();
   if(n.type==='slide'){const sy=top+(bottom-top)*clamp(t-n.slideDuration/lead,0,1)**2;
    ctx.strokeStyle=C[n.lane];ctx.lineWidth=7*t+3;ctx.globalAlpha=.64;ctx.beginPath();ctx.moveTo(x(n.fromLane,clamp(t-n.slideDuration/lead,0,1)),sy);ctx.lineTo(x(n.lane,t),y);ctx.stroke();ctx.globalAlpha=1;}
   if(n.type==='hold'){ctx.fillStyle=C[n.lane]+'99';ctx.fillRect(x(n.lane,t)-r*.42,y-r-45*t,r*.84,45*t)}
   if(n.type==='special'||n.type==='caos'){ctx.fillStyle='#ffffff';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText('★',x(n.lane,t),y+6)}
  }
  for(let i=0;i<5;i++){
   const px=x(i,1),py=bottom,r=bottomWidth/12.5;
   ctx.shadowColor=C[i];ctx.shadowBlur=g?.lane===i?28:12;ctx.fillStyle=g?.lane===i?'#f7ffff':C[i];ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
   ctx.shadowBlur=0;ctx.lineWidth=3;ctx.strokeStyle=C[i];ctx.stroke();
   if(g?.lane===i){ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.fillText('VOS',px,py-r-15)}
  }
  ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#a8bad3';ctx.fillText('DEMO 2D · FLECHAS O DESLIZÁ',center,h*.89);
 }
 return {ar,demo};
}
root.RitmoArt={create};
})(window);
