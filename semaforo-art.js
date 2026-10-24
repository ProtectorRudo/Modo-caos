'use strict';
/* SEMÁFORO TRAICIONERO — XR SVG projection + 2D cinematic canvas.
 * The XR pose and fixed board matrix are owned by the shared /engine.js.
 */
(function(root){
 const NS='http://www.w3.org/2000/svg',colors={green:'#48ffb9',amber:'#ffd269',red:'#ff5b84'};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const rgba=(hex,alpha)=>hex+Math.round(alpha*255).toString(16).padStart(2,'0');
 function create(svg){
  const node=(tag,parent=svg)=>{const n=document.createElementNS(NS,tag);parent.appendChild(n);return n};
  const defs=node('defs');
  defs.innerHTML='<linearGradient id="sf-track" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#112f57"/><stop offset=".5" stop-color="#091932"/><stop offset="1" stop-color="#142f50"/></linearGradient><linearGradient id="sf-body"><stop stop-color="#f8ffff"/><stop offset=".35" stop-color="#47dbc9"/><stop offset="1" stop-color="#0e526f"/></linearGradient><filter id="sf-glow"><feGaussianBlur stdDeviation="3"/></filter>';
  const floor=node('polygon'),track=node('polygon'),border=node('polyline'),finish=node('polyline');
  const rails=Array.from({length:9},()=>node('polyline'));
  const dashes=Array.from({length:7},()=>node('polyline'));
  const lampHousing=node('polygon'),pole=node('polyline'),lamps=Array.from({length:3},()=>node('circle'));
  const lightGlow=node('circle'),title=node('text');
  const decoys=Array.from({length:2},()=>({light:node('circle'),frame:node('polygon')}));
  const avatars=Array.from({length:4},()=>({
   shadow:node('ellipse'),glow:node('circle'),legs:[node('polyline'),node('polyline')],
   torso:node('polygon'),arms:[node('polyline'),node('polyline')],head:node('circle'),
   visor:node('polyline'),name:node('text'),badge:node('circle')
  }));
  const pointString=a=>a.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  function renderAR(frame,world,g,{tile=.45}={}){
   const pose=frame?.getViewerPose(ref),view=pose?.views?.[0];
   if(!view||!world)return{visible:false};
   const matrix=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,world));
   svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
   const P=(x,y,z)=>{const v=projected(matrix,x,y,z,innerWidth,innerHeight);
    return v&&Number.isFinite(v[0])&&Number.isFinite(v[1])?v:null};
   function poly(n,pts,fill,stroke='none',width=1,opacity=1){
    const ps=pts.map(q=>P(...q));if(ps.some(p=>!p)){n.style.display='none';return false}
    n.style.display='';n.setAttribute('points',pointString(ps));n.setAttribute('fill',fill);
    n.setAttribute('stroke',stroke);n.setAttribute('stroke-width',width);n.setAttribute('opacity',opacity);return true;
   }
   function line(n,pts,stroke,width=2,opacity=1){
    const ps=pts.map(q=>P(...q));if(ps.some(p=>!p)){n.style.display='none';return}
    n.style.display='';n.setAttribute('points',pointString(ps));n.setAttribute('fill','none');
    n.setAttribute('stroke',stroke);n.setAttribute('stroke-width',width);n.setAttribute('opacity',opacity);
    n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');
   }
   function dot(n,x,y,z,r,fill,stroke='none',width=0){
    const p=P(x,y,z);if(!p){n.style.display='none';return null}
    n.style.display='';n.setAttribute('cx',p[0]);n.setAttribute('cy',p[1]);n.setAttribute('r',r);
    n.setAttribute('fill',fill);n.setAttribute('stroke',stroke);n.setAttribute('stroke-width',width);return p;
   }
   const h=tile*2.36,zNear=h*.88,zFar=-h*.88,span=zNear-zFar;
   poly(floor,[[-h,.04,-h],[h,.04,-h],[h,.04,h],[-h,.04,h]],'url(#sf-track)','#36d8fa',1.8,.88);
   poly(track,[[-h*.8,.055,zFar],[h*.8,.055,zFar],[h*.8,.055,zNear],[-h*.8,.055,zNear]],'#102c4bea','#6fffd6',3,.94);
   line(border,[[-h*.8,.069,zNear],[-h*.8,.069,zFar],[h*.8,.069,zFar],[h*.8,.069,zNear]],'#72ffe3',4);
   for(let i=0;i<9;i++){
    const z=zFar+i*span/8;
    line(rails[i],[[-h*.8,.07,z],[h*.8,.07,z]],i===0?'#ffe6a5':'#4199c2',i===0?5:1.1,i===0?1:.25);
   }
   for(let i=0;i<7;i++){
    const z=zNear-(i+.5)*span/7;
    line(dashes[i],[[0,.074,z],[0,.074,z-.095]],'#75c9fa',3,.6);
   }
   const barZ=zFar-.03;
   line(finish,[[-h*.76,.08,barZ],[h*.76,.08,barZ]],'#fff1a2',7);
   const hot=colors[g.signal]||colors.green;
   line(pole,[[0,.09,zFar-.14],[0,1.03,zFar-.14]],'#69ccec',10);
   poly(lampHousing,[[-.18,.49,zFar-.12],[.18,.49,zFar-.12],[.18,1.11,zFar-.12],[-.18,1.11,zFar-.12]],'#071729','#79cce2',3);
   const lens=['red','amber','green'];
   for(let i=0;i<3;i++)dot(lamps[i],0,.99-i*.2,zFar-.118,13,
      g.signal===lens[i]?colors[lens[i]]:'#233954',g.signal===lens[i]?'#faffff':'#48637f',2.3);
   const activeY=.99-lens.indexOf(g.signal)*.2;
   for(let k=0;k<2;k++){
    const dd=decoys[k],side=k===0?-1:1,xx=side*tile*1.85;
    if(g.trap==='fake'&&g.state==='playing'){
     const fake=g.signal==='red'?'green':g.signal==='green'?'red':'green';
     poly(dd.frame,[[xx-.14,.31,zFar],[xx+.14,.31,zFar],[xx+.14,.59,zFar],[xx-.14,.59,zFar]],'#11233f','#ffb8dd',1.8,.87);
     dot(dd.light,xx,.45,zFar,12,colors[fake],'#ffffff',2);
    }else{dd.light.style.display='none';dd.frame.style.display='none'}
   }
   dot(lightGlow,0,activeY,zFar-.115,22,hot+'42');
   let visible=0,player=null;
   for(let i=0;i<4;i++){
    const p=g.players[i],v=avatars[i];
    if(!p){Object.values(v).flat().forEach(n=>n.style.display='none');continue}
    const x=p.lane*h*.87,z=zNear-(p.progress/100)*span,
     bob=Math.sin(g.raceTime*13+i)*.018*(g.signal==='green'?1:.32),
     y=.19+bob,c=p.color||'#50ffe0',scale=p.eliminated?.45:1;
    dot(v.glow,x,.09,z,16,c+'77');dot(v.shadow,x,.077,z,13,'#051427aa');
    line(v.legs[0],[[x-.042,y-.045,z],[x-.055*scale,.092,z+.037]],'#dafffd',3.3);
    line(v.legs[1],[[x+.042,y-.045,z],[x+.055*scale,.092,z-.035]],'#dafffd',3.3);
    poly(v.torso,[[x-.073,y-.035,z],[x+.073,y-.035,z],[x+.052,y+.115,z],[x-.052,y+.115,z]],
       i===0?'url(#sf-body)':c,'#efffff',1.9,.98);
    line(v.arms[0],[[x-.061,y+.087,z],[x-.098,y+.015,z]],c,5);
    line(v.arms[1],[[x+.061,y+.087,z],[x+.098,y+.016,z]],c,5);
    const head=dot(v.head,x,y+.185,z,11,'#f6e9d7','#ffffff',2);
    line(v.visor,[[x-.034,y+.188,z+.002],[x+.034,y+.188,z+.002]],'#1e3b62',4);
    dot(v.badge,x,y+.041,z,3.2,'#f9ffff');
    const name=P(x,y+.33,z);
    v.name.style.display=name?'':'none';
    if(name){v.name.setAttribute('x',name[0]);v.name.setAttribute('y',name[1]);
     v.name.setAttribute('text-anchor','middle');v.name.setAttribute('font-size',i===0?'15':'11');
     v.name.setAttribute('font-weight','1000');v.name.setAttribute('paint-order','stroke');
     v.name.setAttribute('stroke','#051429');v.name.setAttribute('stroke-width','3');
     v.name.setAttribute('fill',i===0?'#e9fff7':c);v.name.textContent=p.name}
    if(i===0){player=name;visible++}
   }
   const lbl=P(0,1.28,zFar);
   title.style.display=lbl?'':'none';
   if(lbl){title.setAttribute('x',lbl[0]);title.setAttribute('y',lbl[1]);title.setAttribute('text-anchor','middle');
    title.setAttribute('font-weight','1000');title.setAttribute('font-size','18');title.setAttribute('fill',hot);
    title.setAttribute('stroke','#051427');title.setAttribute('stroke-width','4');title.setAttribute('paint-order','stroke');
    title.textContent=g.state==='playing'?({green:'VERDE',amber:'AMARILLO',red:'ROJO'}[g.signal]||'LISTO'):'LISTO';}
   return{visible:!!visible,player};
  }
  return {renderAR,clear(){for(const n of svg.children)if(n!==defs)n.style.display='none'}};
 }
 function drawDemo(ctx,w,h,g,t){
  const dpr=Math.min(root.devicePixelRatio||1,2),cw=w*dpr,ch=h*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const c=ctx,sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#041026');
  sky.addColorStop(.46,'#0f2948');sky.addColorStop(1,'#041526');c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(let j=0;j<13;j++){
   let xx=w*(j/12),amp=18+Math.sin(t*.0006+j)*12;
   c.strokeStyle='rgba(45,192,240,.10)';c.lineWidth=1;
   c.beginPath();c.moveTo(xx,0);c.lineTo(xx+amp,h*.61);c.stroke();
  }
  const y0=h*.30,y1=h*.73,xc=w*.5,wt=w*.35,wb=w*.94;
  const X=(l,z)=>xc+l*(wt+(wb-wt)*z)*.5,Y=z=>y0+(y1-y0)*z;
  const poly=(points,fill,stroke=null,lw=1)=>{
   c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));
   c.closePath();c.fillStyle=fill;c.fill();
   if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}
  };
  poly([[X(-1,0),Y(0)],[X(1,0),Y(0)],[X(1,1),Y(1)],[X(-1,1),Y(1)]],'#0b2847','#46e6e4',3);
  for(let z=0;z<=1.001;z+=.10){
   const y=Y(z),alpha=.2+.25*z;
   c.strokeStyle=`rgba(79,220,248,${alpha})`;c.lineWidth=1+z;
   c.beginPath();c.moveTo(X(-1,z),y);c.lineTo(X(1,z),y);c.stroke();
  }
  for(let l=-1;l<=1.1;l+=.5){
   c.strokeStyle='#368ab1';c.lineWidth=2;c.beginPath();
   c.moveTo(X(l,0),Y(0));c.lineTo(X(l,1),Y(1));c.stroke();
  }
  c.shadowColor='#8cffe5';c.shadowBlur=19;c.strokeStyle='#79ffe0';c.lineWidth=4;
  c.beginPath();c.moveTo(X(-1,1),Y(1));c.lineTo(X(-1,0),Y(0));c.lineTo(X(1,0),Y(0));c.lineTo(X(1,1),Y(1));c.stroke();c.shadowBlur=0;
  for(let k=0;k<8;k++){
   const l=-.9+(k%4)*.48,yy=Y(0)-3;
   c.fillStyle=(k%2)?'#fffad2':'#173b59';
   c.fillRect(X(l,0),yy,Math.max(8,wt*.10),6);
  }
  // Large traffic-light prop, visually unmistakable even on small screens.
  const bx=w*.5,by=h*.12,unit=Math.max(54,Math.min(91,w*.19));
  c.shadowColor='#000c1d';c.shadowBlur=30;
  poly([[bx-unit*.64,by-unit*.5],[bx+unit*.64,by-unit*.5],[bx+unit*.64,by+unit*1.20],[bx-unit*.64,by+unit*1.20]],'#061424','#72dcfd',3);
  c.shadowBlur=0;c.fillStyle='#0a2237';c.fillRect(bx-4,by+unit*1.2,8,y0-(by+unit*1.2)+3);
  ['red','amber','green'].forEach((v,i)=>{
   const cy=by-unit*.23+i*unit*.49,r=unit*.187,active=g.signal===v;
   c.beginPath();c.arc(bx,cy,r,0,Math.PI*2);
   c.shadowColor=active?colors[v]:'transparent';c.shadowBlur=active?35:0;
   c.fillStyle=active?colors[v]:'#1e3a56';c.fill();
   c.shadowBlur=0;c.lineWidth=2;c.strokeStyle=active?'#f8ffff':'#47627e';c.stroke();
   if(active){c.beginPath();c.arc(bx-r*.32,cy-r*.36,r*.3,0,Math.PI*2);c.fillStyle='#ffffffbc';c.fill()}
  });
  // Decoy lights visibly secondary. Never override the main light's rules.
  if(g.trap==='fake'&&g.state==='playing'){
   const side=t%2100<1050?.12:.88;
   const fake=g.signal==='red'?'green':'red';
   c.fillStyle=colors[fake];c.shadowColor=colors[fake];c.shadowBlur=17;
   c.beginPath();c.arc(w*side,y0+22,10,0,Math.PI*2);c.fill();c.shadowBlur=0;
   c.font='800 10px system-ui';c.textAlign='center';c.fillText('SEÑUELO',w*side,y0+45);
  }
  const order=[...g.players].sort((a,b)=>b.progress-a.progress);
  const avatar=(p)=>{
   const z=1-clamp(p.progress/100,0,1)*.94,x=X(p.lane,z),y=Y(z),
   scale=.62+z*.72,size=20*scale,walk=Math.sin(t*.013+(p.id.length||1))*3*(g.signal==='green'?1:.16);
   c.fillStyle='#010d20aa';c.beginPath();c.ellipse(x,y+4,size*.75,size*.25,0,0,Math.PI*2);c.fill();
   c.shadowColor=p.color;c.shadowBlur=p.kind==='human'?22:9;
   c.strokeStyle=p.color;c.lineWidth=2.5;c.beginPath();c.ellipse(x,y,18*scale,8*scale,0,0,Math.PI*2);c.stroke();c.shadowBlur=0;
   if(!p.eliminated){
    c.lineCap='round';c.strokeStyle='#c8effc';c.lineWidth=5*scale;
    c.beginPath();c.moveTo(x-5*scale,y-22*scale);c.lineTo(x-8*scale+walk,y-6*scale);
    c.moveTo(x+5*scale,y-22*scale);c.lineTo(x+7*scale-walk,y-6*scale);c.stroke();
    const body=c.createLinearGradient(x,y-50*scale,x,y-20*scale);
    body.addColorStop(0,p.color);body.addColorStop(1,'#10435e');
    poly([[x-11*scale,y-47*scale],[x+11*scale,y-47*scale],[x+9*scale,y-22*scale],[x-9*scale,y-22*scale]],body,'#ecffff',1.6);
    c.strokeStyle=p.color;c.lineWidth=4*scale;c.beginPath();
    c.moveTo(x-10*scale,y-44*scale);c.lineTo(x-18*scale,y-27*scale+walk);
    c.moveTo(x+10*scale,y-44*scale);c.lineTo(x+18*scale,y-27*scale-walk);c.stroke();
    c.fillStyle='#f6e3cb';c.beginPath();c.arc(x,y-56*scale,9*scale,0,Math.PI*2);c.fill();
    c.fillStyle='#0f4160';c.fillRect(x-7*scale,y-59*scale,14*scale,4*scale);
   }
   c.font=`900 ${Math.round(11*scale)}px system-ui`;c.textAlign='center';
   c.strokeStyle='#03142e';c.lineWidth=4;c.strokeText(p.name,x,y-73*scale);
   c.fillStyle=p.kind==='human'?'#ffffff':p.color;c.fillText(p.name,x,y-73*scale);
  };
  order.forEach(avatar);
  const vig=c.createRadialGradient(w*.5,h*.5,w*.1,w*.5,h*.5,w*.8);
  vig.addColorStop(0,'#00000000');vig.addColorStop(1,'#000b22b5');c.fillStyle=vig;c.fillRect(0,0,w,h);
 }
 root.SemaforoArt=Object.freeze({create,drawDemo,colors});
})(typeof window!=='undefined'?window:globalThis);
