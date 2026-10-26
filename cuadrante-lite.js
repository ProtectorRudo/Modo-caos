/* CUADRANTE · Original lightweight full-game graphics for offline/CDN/WebGL failure.
   Uses the exact CuadranteCore ball, geometry and paddle coordinates, not a mockup. */
(function(root){
'use strict';
root.CuadranteLite=function(container,getState){
 const canvas=document.createElement('canvas');
 canvas.setAttribute('aria-label','CUADRANTE: arena futurista 2D de respaldo con física 3D');
 canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none';
 container.appendChild(canvas);
 const g=canvas.getContext('2d',{alpha:false});
 if(!g)throw new Error('El navegador no puede crear un lienzo 2D.');
 let W=innerWidth,H=innerHeight,pixelRatio=1,raf=0,frameCb=null,lastFrame=0;
 const trails=[],bursts=[],shocks=[];
 const rootGroup={position:{set(){}},scale:{setScalar(){}},rotation:{y:0}};
 const scene={};const camera={position:{set(){}},lookAt(){},updateProjectionMatrix(){}};
 function setSize(w,h){
  W=Math.max(1,w);H=Math.max(1,h);pixelRatio=Math.min(1.65,devicePixelRatio||1);
  canvas.width=Math.round(W*pixelRatio);canvas.height=Math.round(H*pixelRatio);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  g.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 }
 const frontScale=()=>Math.min(W*.54,H*.77)*2.20;
 function p(x,y,z){
  const focal=frontScale()/(7.15-z);
  return [W*.5+x*focal,H*.5-(y-1.20)*focal,focal];
 }
 function line(points,color,width=2,alpha=1){
  g.globalAlpha=alpha;g.beginPath();
  points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
  g.strokeStyle=color;g.lineWidth=width;g.stroke();
  g.globalAlpha=1;
 }
 function quad(a,b,c,d,fill,stroke,alpha=1,blur=0){
  g.globalAlpha=alpha;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.lineTo(...c);g.lineTo(...d);g.closePath();
  g.fillStyle=fill;g.fill();if(stroke){g.shadowColor=stroke;g.shadowBlur=blur;g.strokeStyle=stroke;g.lineWidth=2;g.stroke();g.shadowBlur=0}
  g.globalAlpha=1;
 }
 function face(z,c,alpha=.9){
  const a=p(-1.77,.15,z),b=p(1.77,.15,z),c1=p(1.77,2.27,z),d=p(-1.77,2.27,z);
  quad(a,b,c1,d,'rgba(0,0,0,0)',c,alpha,9);
 }
 function bar(x,y,z,w,h,d,color,alpha=.85){
  const a=p(x-w/2,y-h/2,z),b=p(x+w/2,y-h/2,z),c=p(x+w/2,y+h/2,z),d1=p(x-w/2,y+h/2,z);
  quad(a,b,c,d1,'rgba(11,23,33,.78)',color,alpha,11);
 }
 function paddle(pa,z,color,core){
  const [x,y]=[pa.x,pa.y],sz=.39;
  const v=p(x-sz,y-sz,z),u=p(x+sz,y-sz,z),r=p(x+sz,y+sz,z),l=p(x-sz,y+sz,z);
  quad(v,u,r,l,core,color,1,17);
  const q=p(x,y,z),grad=g.createRadialGradient(q[0],q[1],2,q[0],q[1],q[2]*.32);
  grad.addColorStop(0,color);grad.addColorStop(.45,'#143341');grad.addColorStop(1,'#0d1e2b');
  g.fillStyle=grad;g.beginPath();g.arc(q[0],q[1],Math.max(4,q[2]*.155),0,Math.PI*2);g.fill()
 }
 function ball(x,y,z,radius=1,alpha=1){
  const q=p(x,y,z),r=Math.max(3,.129*q[2]*radius);
  g.globalAlpha=alpha;
  const halo=g.createRadialGradient(q[0],q[1],r*.1,q[0],q[1],r*2.8);
  halo.addColorStop(0,'#fff9df');halo.addColorStop(.2,'#ffb66c');halo.addColorStop(.43,'#ff681e');halo.addColorStop(1,'#ff681e00');
  g.fillStyle=halo;g.beginPath();g.arc(q[0],q[1],r*2.8,0,Math.PI*2);g.fill();
  g.fillStyle='#231d20';g.strokeStyle='#ffb16c';g.lineWidth=Math.max(1,2*radius);
  g.beginPath();g.arc(q[0],q[1],r,0,Math.PI*2);g.fill();g.stroke();
  g.globalAlpha=1;
 }
 function render(){
  const s=getState();
  const bg=g.createRadialGradient(W*.50,H*.53,10,W*.50,H*.54,W*.82);
  bg.addColorStop(0,'#164459');bg.addColorStop(.52,'#071826');bg.addColorStop(1,'#030710');
  g.fillStyle=bg;g.fillRect(0,0,W,H);
  if(!s)return;
  const floorA=p(-1.75,.17,3),floorB=p(1.75,.17,3),floorC=p(1.75,.17,-3),floorD=p(-1.75,.17,-3);
  quad(floorA,floorB,floorC,floorD,'#172b36','#327d91',.93,4);
  for(let i=0;i<=12;i++){
    const z=-3+i*.5,near=i%3===0;
    line([p(-1.74,.17,z),p(1.74,.17,z)],near?'#14788f':'#254252',near?1.8:.8,near?.65:.40);
    if(near)face(z,i%2?'#ff763e':'#09cadb',.27);
  }
  for(let x=-1.75;x<=1.76;x+=.5){
    line([p(x,.18,-3),p(x,.18,3)],'#2b7893',.8,.47);
    line([p(x,2.24,-3),p(x,2.24,3)],'#1b526c',.8,.20);
  }
  for(const y of [.18,2.25]){
    line([p(-1.76,y,-3),p(-1.76,y,3)],y<1?'#00e4ff':'#ff7c30',2,.89);
    line([p(1.76,y,-3),p(1.76,y,3)],y<1?'#00e4ff':'#ff7c30',2,.89);
  }
  face(-3,'#ff723c',.9);face(3,'#08e7fa',.72);
  paddle(s.enemy,-2.89,'#ff893f','#68301e');
  for(const o of root.CuadranteCore.geometry(s)){
   g.save();const q=p(o.x,o.y,o.z);g.translate(q[0],q[1]);
   g.rotate(o.ang||0);const f=q[2];g.strokeStyle=s.duel>2?'#ff863d':'#45eaf4';g.fillStyle='#122b3d';g.lineWidth=2;
   g.shadowColor=g.strokeStyle;g.shadowBlur=13;
   g.fillRect(-o.w*f*.5,-o.h*f*.5,o.w*f,o.h*f);g.strokeRect(-o.w*f*.5,-o.h*f*.5,o.w*f,o.h*f);g.restore();
  }
  if(s.phase==='playing'){
   trails.unshift({...s.ball});if(trails.length>23)trails.pop();
  }else trails.length=0;
  for(let k=trails.length-1;k>=0;k--){const v=trails[k],q=p(v.x,v.y,v.z);g.fillStyle='rgba(255,141,70,'+(.43*(1-k/trails.length)).toFixed(2)+')';g.beginPath();g.arc(q[0],q[1],Math.max(1,5*(1-k/trails.length)),0,Math.PI*2);g.fill()}
  if(s.duel===3&&s.phase==='playing')for(let i=0;i<2;i++)ball(s.ball.x+(i?.33:-.30),s.ball.y+(i?.15:-.18),s.ball.z-.20-i*.17,.7,.24);
  ball(s.ball.x,s.ball.y,s.ball.z);
  paddle(s.player,2.89,'#48f5ff','#103747');
  for(const a of bursts){
   a.x+=a.vx;a.y+=a.vy;a.life-=.04;g.fillStyle='rgba(255,200,140,'+Math.max(0,a.life)+')';
   g.fillRect(a.x,a.y,a.life*5,a.life*5);
  }
  for(let i=bursts.length-1;i>=0;i--)if(bursts[i].life<=0)bursts.splice(i,1);
  for(const a of shocks){
   a.life-=.048;const q=p(a.x,a.y,a.z);g.strokeStyle='rgba(106,255,255,'+Math.max(0,a.life)+')';
   g.lineWidth=2.5;g.beginPath();g.arc(q[0],q[1],(1-a.life)*q[2]*.76,0,Math.PI*2);g.stroke();
  }
  for(let i=shocks.length-1;i>=0;i--)if(shocks[i].life<=0)shocks.splice(i,1);
  const landing=root.CuadranteCore.predictedLanding(s);
  if(s.duel===0&&landing?.reliable&&landing.seconds<1.2&&s.phase==='playing'){
   const q=p(landing.x,landing.y,2.88);g.strokeStyle='rgba(130,255,244,.28)';g.lineWidth=2;
   g.beginPath();g.arc(q[0],q[1],Math.max(8,q[2]*.19),0,Math.PI*2);g.stroke();
  }
 }
 const stage={scene,root:rootGroup,update(){},setQuality(){},spawnImpact(x,y,z){
  const q=p(x,y,z);shocks.push({x,y,z,life:1});
  for(let i=0;i<17;i++){const a=(i/17)*Math.PI*2;
   bursts.push({x:q[0],y:q[1],vx:Math.cos(a)*(1+Math.random()*4),vy:Math.sin(a)*(1+Math.random()*4),life:.65+Math.random()*.35})}
 },dispose(){trails.length=0;bursts.length=0;shocks.length=0}};
 const renderer={isLite:true,domElement:canvas,xr:{isPresenting:false},setPixelRatio(){},
 setSize,render,setAnimationLoop(fn){
  if(raf){cancelAnimationFrame(raf);raf=0}frameCb=fn;
  if(!fn)return;
  const tick=t=>{if(!frameCb)return;frameCb(t,null);raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
 },dispose(){if(raf)cancelAnimationFrame(raf);frameCb=null;canvas.remove()}};
 setSize(innerWidth,innerHeight);
 return {renderer,stage,camera};
};
})(window);
