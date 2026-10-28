/* JUICEVERSE 3 // premium prelit art for world-projected AR Canvas.
 All models are generated and cached offline on the device in the menu.
 No per-frame textures, network, or new WebGL draw calls. */
(function(root){'use strict';
const PI=Math.PI,TAU=PI*2,cache=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const colors={strawberry:[235,33,74],apple:[228,41,58],orange:[252,143,31],watermelon:[31,184,111],lemon:[247,224,70],gold:[253,194,50],ice:[91,198,242],rainbow:[178,108,241],rotten:[98,120,51],bomb:[45,59,80],boss:[35,187,105]};
const keys=Object.keys(colors);
function grad(c,x,y,xx,yy,a,b,d){const g=c.createLinearGradient(x,y,xx,yy);g.addColorStop(0,a);g.addColorStop(.47,b);g.addColorStop(1,d);return g}
function ellipse(c,x,y,rx,ry,col,rot=0){c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fillStyle=col;c.fill()}
function disc(c,x,y,r,col){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=col;c.fill()}
function path(c,k){
 c.beginPath();
 if(k==='strawberry'){c.moveTo(128,66);c.bezierCurveTo(79,45,41,63,42,109);c.bezierCurveTo(45,163,107,215,128,229);c.bezierCurveTo(158,207,210,152,211,108);c.bezierCurveTo(214,65,170,46,128,66)}
 else if(k==='apple'||k==='rotten'){c.moveTo(128,70);c.bezierCurveTo(75,39,34,77,39,133);c.bezierCurveTo(44,194,76,228,110,221);c.bezierCurveTo(127,215,138,219,149,223);c.bezierCurveTo(184,225,218,186,216,127);c.bezierCurveTo(216,72,173,40,128,70)}
 else if(k==='lemon'){c.moveTo(21,132);c.bezierCurveTo(44,114,36,81,88,67);c.bezierCurveTo(150,48,201,80,218,115);c.bezierCurveTo(219,132,234,135,241,139);c.bezierCurveTo(217,153,224,185,162,206);c.bezierCurveTo(105,225,54,194,40,161);c.bezierCurveTo(35,149,29,140,21,132)}
 else c.ellipse(128,137,k==='boss'?96:89,k==='boss'?97:91,0,0,TAU);
 c.closePath();
}
function sprite(k){
 if(cache.has(k))return cache.get(k);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d',{willReadFrequently:true}),co=colors[k]||colors.apple;
 path(g,k);g.fillStyle='#cccccc';g.fill();
 const pixels=g.getImageData(0,0,256,256),p=pixels.data;
 for(let y=33;y<235;y++)for(let x=20;x<239;x++){
  const id=(y*256+x)*4;if(p[id+3]<120)continue;
  const X=(x-128)/95,Y=(y-136)/99,r2=X*X+Y*Y,Z=Math.sqrt(Math.max(.03,1-Math.min(.97,r2)));
  const diff=clamp(.49+Z*.63-X*.31-Y*.34,.22,1.27);
  const shine=Math.pow(Math.max(0,Z*.72-X*.36-Y*.42),28)*.85;
  const noise=(Math.sin(x*3.47+y*2.61)*Math.cos(y*4.3-x*1.9))*.039;
  let bump=noise,spot=0;
  if(k==='orange'||k==='lemon')bump*=2.0;
  if(k==='watermelon'||k==='boss')bump+=Math.sin(X*36+Y*2.1+Math.sin(Y*8))>0?-.28:.04;
  if(k==='rotten'){const f=Math.sin(x*.13+y*.06)+Math.cos(x*.16-y*.12);spot=f>1.22?-.43:0}
  for(let j=0;j<3;j++){
   const rainbow=k==='rainbow'?[125,81,155][j]*Math.sin(x*.021+y*.023+j*1.95):0;
   p[id+j]=clamp(Math.round(co[j]*(diff+bump+spot)+255*shine+rainbow),0,255);
  }
  p[id+3]=255;
 }
 g.putImageData(pixels,0,0);
 g.save();path(g,k);g.clip();
 const ambient=g.createRadialGradient(74,68,5,128,137,135);
 ambient.addColorStop(0,'rgba(255,255,255,.35)');ambient.addColorStop(.46,'rgba(255,255,255,.02)');ambient.addColorStop(1,'rgba(10,19,40,.34)');
 g.fillStyle=ambient;g.fillRect(20,35,220,209);g.restore();
 path(g,k);g.lineWidth=1.8;g.strokeStyle=k==='bomb'?'rgba(248,72,101,.70)':'rgba(255,247,220,.28)';g.stroke();
 const leaf=grad(g,90,55,170,98,'#aafb84','#51c768','#075a40');
 if(k==='strawberry'){
  for(let i=0;i<5;i++){g.save();g.translate(128,70);g.rotate((i-2)*.67);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-10,-17,-29,-10);g.quadraticCurveTo(-27,2,-9,12);g.closePath();g.fillStyle=leaf;g.fill();g.restore()}
  g.lineWidth=6;g.strokeStyle='#548b35';g.beginPath();g.moveTo(130,68);g.quadraticCurveTo(130,40,143,42);g.stroke();
  for(let j=0;j<8;j++)for(let i=0;i<7;i++){let x=73+i*17+(j%2)*8,y=93+j*15;if(x<51+Math.abs(y-120)*.26||x>206-Math.abs(y-120)*.24||y>215-Math.abs(x-128)*.27)continue;
   ellipse(g,x+1,y+2,3.6,5,'rgba(115,25,30,.40)');ellipse(g,x,y,2.3,3.9,'#ffe3a0')}
 }else if(k==='apple'||k==='rotten'||k==='orange'){
  g.lineWidth=7;g.strokeStyle='#73502e';g.beginPath();g.moveTo(128,75);g.quadraticCurveTo(127,40,143,34);g.stroke();
  g.fillStyle=leaf;g.beginPath();g.moveTo(129,61);g.quadraticCurveTo(170,22,196,53);g.quadraticCurveTo(165,85,129,61);g.fill();
  if(k==='rotten'){
   for(const [x,y,rx,ry] of [[91,129,26,17],[166,167,29,20],[146,205,19,9]]){
    ellipse(g,x,y,rx,ry,'rgba(55,33,85,.87)',-.28);
    g.beginPath();g.ellipse(x,y,rx,ry,-.28,0,TAU);g.strokeStyle='#a7da51';g.lineWidth=2;g.stroke()}
   for(let i=0;i<15;i++)disc(g,65+i*51%139,82+i*77%123,2+i%3,'#9ccc5c');
   g.font='bold 40px system-ui';g.textAlign='center';g.fillStyle='#dfff91';g.fillText('☠',128,158);
   g.fillStyle='#9fe459';ellipse(g,158,214,7,21,'#a8d86b',-.32);
  }else if(k==='orange'){g.save();path(g,k);g.clip();for(let i=0;i<120;i++){disc(g,43+i*89%162,63+i*59%150,(i%3+1)*.48,i%2?'rgba(255,241,192,.19)':'rgba(129,59,17,.22)')}g.restore()}
 }else if(k==='watermelon'||k==='boss'){
  g.save();path(g,k);g.clip();
  for(let i=-3;i<=3;i++){let x=128+i*22;g.beginPath();g.moveTo(x-6,39);g.bezierCurveTo(x+14,79,x+12,171,x-3,235);g.strokeStyle='rgba(5,87,52,.55)';g.lineWidth=i%2?9:5;g.stroke()}g.restore();
  if(k==='boss'){g.fillStyle=grad(g,69,34,183,68,'#fff8c2','#f3bb42','#b47621');g.beginPath();g.moveTo(73,71);g.lineTo(57,29);g.lineTo(91,49);g.lineTo(127,14);g.lineTo(164,46);g.lineTo(194,28);g.lineTo(181,75);g.closePath();g.fill();
   for(let x of [96,159]){ellipse(g,x,122,7,12,'#073a34');disc(g,x-2,118,2,'#fff')}g.strokeStyle='#064238';g.lineWidth=5;g.beginPath();g.arc(128,148,23,.25,Math.PI-.25);g.stroke()}
 }else if(k==='bomb'){
  g.lineWidth=10;g.strokeStyle='#a1b9cb';g.beginPath();g.arc(128,136,92,0,TAU);g.stroke();
  for(let i=0;i<8;i++){const a=i*TAU/8;disc(g,128+87*Math.cos(a),136+87*Math.sin(a),5,'#acc1ce')}
  g.fillStyle='#1a2c40';g.beginPath();g.roundRect(97,28,64,30,7);g.fill();g.fillStyle='#f8ffa3';g.font='900 13px system-ui';g.textAlign='center';g.fillText('DANGER',128,48);
  g.fillStyle=grad(g,74,94,180,184,'#fff4ab','#ffbd49','#e65a35');g.beginPath();g.moveTo(128,86);g.lineTo(178,178);g.lineTo(78,178);g.closePath();g.fill();
  g.lineWidth=3;g.strokeStyle='#fff4cf';g.stroke();g.fillStyle='#172339';g.font='900 74px system-ui';g.fillText('!',128,169);
  g.lineWidth=7;g.strokeStyle='#d5e4e9';g.beginPath();g.moveTo(111,57);g.quadraticCurveTo(100,36,127,19);g.stroke();disc(g,130,20,12,'#ffb852');
 }else if(k==='gold'||k==='ice'||k==='rainbow'){
  g.strokeStyle=k==='ice'?'#d4ffff':'#fff0ae';g.lineWidth=4;g.beginPath();g.arc(128,136,96,0,TAU);g.stroke();
  if(k==='gold'){g.fillStyle='#fffad3';g.font='900 82px system-ui';g.textAlign='center';g.fillText('★',128,164)}
  if(k==='ice'){g.strokeStyle='#e1ffff';g.lineWidth=5;for(let i=0;i<3;i++){g.save();g.translate(128,136);g.rotate(i*Math.PI/3);g.beginPath();g.moveTo(-58,0);g.lineTo(58,0);g.stroke();g.restore()}}
 }
 ellipse(g,89,92,26,10,'rgba(255,255,255,.34)',-.38);
 cache.set(k,c);return c;
}
const cutCache=new Map();
function slicedHalf(kind,side){
 const key=kind+':'+(side<0?'left':'right');
 if(cutCache.has(key))return cutCache.get(key);
 const can=document.createElement('canvas');can.width=can.height=128;
 const c=can.getContext('2d'),fruit=sprite(kind);
 c.save();c.beginPath();c.rect(side<0?0:64,0,64,128);c.clip();
 c.drawImage(fruit,0,0,128,128);c.restore();
 // Exposed glossy flesh on the cut face gives genuine volume to each blast.
 const x=64,y=67,k=kind;
 let shell='#ffe8cf',flesh='#fff1d9';
 if(k==='watermelon'||k==='boss'){shell='#c5ffa9';flesh='#fa5272'}
 else if(k==='strawberry'){shell='#ffeab5';flesh='#f65f87'}
 else if(k==='orange'){shell='#ffe7a6';flesh='#ffb541'}
 else if(k==='apple'){shell='#fee4bc';flesh='#fff5cb'}
 else if(k==='lemon'){shell='#ffffbd';flesh='#fff8ab'}
 else if(k==='rotten'){shell='#aabf6d';flesh='#645071'}
 else if(k==='ice'){shell='#f9ffff';flesh='#beedfd'}
 const shine=c.createLinearGradient(x-14,0,x+14,0);
 shine.addColorStop(0,'rgba(255,255,255,.4)');shine.addColorStop(.48,shell);shine.addColorStop(1,'rgba(56,39,55,.82)');
 c.beginPath();c.ellipse(x,y,13,40,0,0,TAU);c.fillStyle=shine;c.fill();
 c.beginPath();c.ellipse(x,y,8,34,0,0,TAU);c.fillStyle=flesh;c.fill();
 if(k==='orange'||k==='lemon'||k==='watermelon'||k==='strawberry'){
  c.save();c.beginPath();c.ellipse(x,y,8,34,0,0,TAU);c.clip();
  c.strokeStyle='rgba(255,255,241,.62)';c.lineWidth=2;
  for(let i=0;i<5;i++){const yy=34+i*16;c.beginPath();c.moveTo(x-7,yy);c.lineTo(x+7,yy+7);c.stroke()}
  if(k==='watermelon')for(let i=0;i<4;i++)disc(c,x+(i%2?3:-3),45+i*14,2.5,'#231b37');
  c.restore();
 }
 cutCache.set(key,can);return can;
}
function prime(){let i=0;function step(){
 if(i>=keys.length)return;
 const k=keys[i++];sprite(k);
 if(k!=='bomb'&&k!=='rotten'){slicedHalf(k,-1);slicedHalf(k,1)}
 setTimeout(step,18);
 }setTimeout(step,100)}

function poly(c,p,fill,stroke,w=2){if(p.some(x=>!x))return false;c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();c.fillStyle=fill;c.fill();c.lineWidth=w;c.strokeStyle=stroke;c.stroke();return true}
function drawDeck(c,pos,t){
 const coords=[[-2.18,-1.18],[2.18,-1.18],[2.38,-.70],[2.38,.70],[2.18,1.18],[-2.18,1.18],[-2.38,.70],[-2.38,-.70]];
 const p=coords.map(([x,z])=>pos(x,-.075,z)),q=coords.map(([x,z])=>pos(x,-.29,z));if(p.some(x=>!x))return false;
 c.save();c.lineJoin='round';
 for(let i=2;i<6;i+=2)if(q[i]&&q[i+1])poly(c,[p[i],p[i+1],q[i+1],q[i]],'#0a182d','#236485',1.4);
 const v=grad(c,p[0].x,p[0].y,p[5].x,p[5].y,'rgba(86,122,145,.92)','rgba(26,48,74,.92)','rgba(7,18,39,.95)');
 poly(c,p,v,'#2c506a',8);c.shadowColor='#45d9db';c.shadowBlur=8;
 poly(c,p,'rgba(0,0,0,0)','#60f6dd',3);c.shadowBlur=0;
 // Segmented side-lighting and industrial yellow safety marks that read as physical plates.
 for(let edge=0;edge<8;edge++){
  const a=p[edge],b=p[(edge+1)%8];
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  if(len<28)continue;
  c.lineWidth=3;
  for(let f=.12;f<.90;f+=.20){
   const x=a.x+dx*f,y=a.y+dy*f;
   c.strokeStyle=edge%2?'rgba(252,213,91,.75)':'rgba(112,255,221,.80)';
   c.beginPath();c.moveTo(x,y);c.lineTo(x+dx*.09,y+dy*.09);c.stroke();
  }
 }
 c.save();c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();c.clip();
 for(let x=-2;x<=2;x++){const a=pos(x,-.069,-1.15),b=pos(x,-.069,1.15);if(a&&b){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle='rgba(108,191,214,.22)';c.lineWidth=1;c.stroke()}}
 for(let z=-1;z<=1;z++){const a=pos(-2.30,-.069,z),b=pos(2.30,-.069,z);if(a&&b){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle='rgba(108,191,214,.22)';c.stroke()}}
 c.restore();
 for(let i=0;i<8;i++){const a=p[i],b=p[(i+1)%8];disc(c,(a.x+b.x)/2,(a.y+b.y)/2,3,i%2?'#fff2ae':'#8bffe5')}
 c.restore();return true;
}
function drawPortal(c,pos,t,phase=1,fever=false){
 // Orbital juice refinery: central armored heart + five DISTINCT suspended launch pods.
 // World-space points align with the five actual deterministic spawn lanes.
 // Compared with the earlier full-width billboard, this design has vertical height,
 // tapered nozzles, front/back wall thickness and coherent mechanical hierarchy.
 const Y=9.46,Z=-.35,heat=clamp((phase-1)/5+(fever?.55:0),0,1.6);
 const cyan=fever?'#ffca75':'#6af4e3',high=fever?'#fff0ad':'#caff96';
 c.save();c.lineJoin='round';
 const pp=(x,y,z)=>pos(x,y,z);
 function contour(coords,fill,edge,w=1){
  const points=coords.map(q=>pp(q[0],q[1],q[2]));
  if(points.some(q=>!q))return false;
  poly(c,points,fill,edge,w);return true;
 }
 // A gently arched dark cable/hydraulic beam linking all five physically situated pods.
 for(let j=-2;j<2;j++){
  const ax=j*1.05,bx=(j+1)*1.05;
  const a=pp(ax,Y+.47,Z+.09),mid=pp((ax+bx)/2,Y+.67+Math.sin(t*.9+j)*.02,Z+.12),b=pp(bx,Y+.47,Z+.09);
  if(!a||!b||!mid)continue;
  c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(mid.x,mid.y,b.x,b.y);
  c.strokeStyle='#0b2339';c.lineWidth=11;c.stroke();
  c.strokeStyle='#7eb5c5';c.lineWidth=3;c.stroke();
 }
 // Five elevated vertical pods; the outer pair has exactly the positions used
 // by the physics core so fruit visibly emerge from real ducts, not empty space.
 for(let i=-2;i<=2;i++){
  const x=i*1.05,z=Z-.17,front=z-.15,rear=z+.15;
  contour([[x-.28,Y+.43,rear],[x+.28,Y+.43,rear],
   [x+.32,Y-.18,rear],[x+.19,Y-.45,rear],[x-.19,Y-.45,rear],[x-.32,Y-.18,rear]],
   '#122d43','#38637b',2);
  contour([[x-.28,Y+.43,front],[x+.28,Y+.43,front],
   [x+.32,Y-.18,front],[x+.19,Y-.45,front],[x-.19,Y-.45,front],[x-.32,Y-.18,front]],
   i===0?'#2d5a73':'#163752','#a6d9dc',2);
  const notch=pp(x,Y+.34,front-.025),indicator=pp(x,Y-.04,front-.025);
  if(notch&&indicator){
   const r=clamp(Math.abs((pp(x+.17,Y+.34,front-.025)||notch).x-notch.x),2.5,15);
   c.beginPath();c.ellipse(notch.x,notch.y,r*1.48,Math.max(2,r*.7),0,0,TAU);
   c.fillStyle='#061e31';c.fill();c.strokeStyle=cyan;c.lineWidth=1.8;c.stroke();
   c.globalAlpha=.76+.18*Math.sin(t*4+i);
   disc(c,indicator.x,indicator.y,clamp(r*.39,2,5),i===0?high:cyan);c.globalAlpha=1;
  }
  // The launch pipe is a short deep trumpet facing the fruit trajectory.
  const mouth=pp(x,Y-.49,front-.025),lip=pp(x,Y-.42,front-.025);
  if(mouth&&lip){
   const rad=clamp(Math.abs((pp(x+.16,Y-.49,front-.025)||mouth).x-mouth.x),4,13);
   c.beginPath();c.moveTo(lip.x,lip.y);c.lineTo(mouth.x,mouth.y);
   c.lineWidth=rad*1.8;c.strokeStyle='#092337';c.stroke();
   c.beginPath();c.ellipse(mouth.x,mouth.y,rad,Math.max(3,rad*.43),0,0,TAU);
   c.fillStyle='#031b2d';c.fill();c.strokeStyle='#9ce5e7';c.lineWidth=1.6;c.stroke();
   disc(c,mouth.x,mouth.y,Math.max(2,rad*.38),i===0?high:cyan);
  }
 }
 // The round central engine projects out in front, with depth and moving fins.
 const center=pp(0,Y+.16,Z-.55);
 if(center&&center.y>-120&&center.y<innerHeight+100){
  const right=pp(.60,Y+.16,Z-.55),up=pp(0,Y+.60,Z-.55);
  const rx=clamp(right?Math.abs(right.x-center.x):35,16,68),
    ry=clamp(up?Math.abs(up.y-center.y):rx*.8,13,64);
  const core=c.createRadialGradient(center.x-rx*.25,center.y-ry*.18,1,center.x,center.y,Math.max(rx,ry)*1.1);
  core.addColorStop(0,'#e4fff8');core.addColorStop(.18,fever?'#ffc17d':'#94f4e0');
  core.addColorStop(.45,'#235a78');core.addColorStop(.80,'#081f36');core.addColorStop(1,'#020f20');
  c.beginPath();c.ellipse(center.x,center.y,rx*1.15,ry*1.15,0,0,TAU);
  c.fillStyle='#0a1b34';c.fill();c.lineWidth=5;c.strokeStyle='#a5d1de';c.stroke();
  c.beginPath();c.ellipse(center.x,center.y,rx*.85,ry*.85,0,0,TAU);c.fillStyle=core;c.fill();
  c.strokeStyle=cyan;c.lineWidth=2.4;c.stroke();
  for(let i=0;i<5;i++){
   const a=t*(.44+heat*.18)+i*TAU/5;
   c.beginPath();c.moveTo(center.x,center.y);
   c.lineTo(center.x+Math.cos(a)*rx*.62,center.y+Math.sin(a)*ry*.62);
   c.lineWidth=3.2;c.strokeStyle=i%2?high:'#97eef3';c.stroke();
  }
  disc(c,center.x,center.y,clamp(rx*.21,4,12),high);
 }
 // Small amber warning lamps pulse on the sides as the difficulty increases.
 const blink=(Math.sin(t*(3.2+heat*2.3))+1)*.5;
 for(const sign of [-1,1]){
  const lamp=pp(sign*2.19,Y+.53,Z-.1);
  if(!lamp)continue;
  c.globalAlpha=.52+blink*.38;
  disc(c,lamp.x,lamp.y,3.2+heat*1.8,fever?'#ff8065':'#cfff9a');
  c.globalAlpha=1;
 }
 c.restore();
}
function installGun(){
 // Preserve the existing DOM handle and single composite layer for WebXR HUD.
 // The weapon is now a premium JUICE SABER: diagonal blade, real guard, full grip,
 // no gun barrel, muzzle or projectile-related SVG.
 const el=document.getElementById('weapon');if(!el||el.dataset.saber==='1')return;
 el.dataset.saber='1';el.dataset.v3='1';
 el.setAttribute('aria-label','Sable energético para cortar frutas');
 el.innerHTML=[
 '<svg viewBox="0 0 240 335" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
 '<defs>',
 '<linearGradient id="js-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2f8ff"/><stop offset=".24" stop-color="#7ba9c3"/><stop offset=".48" stop-color="#2e4a64"/><stop offset=".76" stop-color="#09182c"/><stop offset="1" stop-color="#91c2d5"/></linearGradient>',
 '<linearGradient id="js-blade" x1="0" y1="0" x2="1" y2=".75"><stop stop-color="#f6ffff"/><stop offset=".2" stop-color="#d7ffe2"/><stop offset=".48" stop-color="#70ffe1"/><stop offset=".84" stop-color="#23bfe4"/><stop offset="1" stop-color="#0a5186"/></linearGradient>',
 '<linearGradient id="js-rubber" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#364d69"/><stop offset=".45" stop-color="#111f35"/><stop offset="1" stop-color="#040d1f"/></linearGradient>',
 '<radialGradient id="js-glow"><stop stop-color="#fff" stop-opacity=".86"/><stop offset=".3" stop-color="#9dffdb" stop-opacity=".64"/><stop offset="1" stop-color="#46ddfb" stop-opacity="0"/></radialGradient>',
 '</defs>',
 '<g class="js-saber">',
 // Blade angled up-right, a clear silhouette separated from the grip.
 '<path d="M97 234Q141 141 190 26Q197 13 195 38L136 239Z" fill="#46e8eb" opacity=".20" stroke="#63f6df" stroke-width="9"/>',
 '<path d="M104 229L192 27L168 111L129 233Z" fill="url(#js-blade)" stroke="#d2fff1" stroke-width="2.5"/>',
 '<path d="M113 222L188 37L164 122L123 225Z" fill="#eafffa" opacity=".68"/>',
 '<path d="M119 218L178 74L153 147L127 223Z" fill="#e8fff8" opacity=".79"/>',
 '<path d="M189 31L196 17L189 57" fill="none" stroke="#f4fff4" stroke-width="3" stroke-linecap="round"/>',
 '<path d="M110 205L150 144M104 220L139 164" stroke="#a2ffdf" stroke-width="2" opacity=".67"/>',
 // Reinforced blade socket plus double claw hilt: chrome material, teal studs.
 '<path d="M92 219L132 220L141 244L112 267L82 243Z" fill="url(#js-metal)" stroke="#b0e1ea" stroke-width="3"/>',
 '<path d="M87 230L59 226L44 244L60 252L92 245" fill="url(#js-metal)" stroke="#a8d4dd" stroke-width="3"/>',
 '<path d="M135 229L162 215L174 226L150 248L134 249" fill="url(#js-metal)" stroke="#a6dfec" stroke-width="3"/>',
 '<path d="M88 233L136 232L129 246L99 251Z" fill="#102b43" stroke="#7dfbdf" stroke-width="2"/>',
 '<path d="M95 242L118 241L126 252L111 271L89 253Z" fill="#1b4860" stroke="#68f0d2" stroke-width="2"/>',
 '<circle cx="104" cy="241" r="6" fill="#dcff98"/><circle cx="146" cy="234" r="4" fill="#bfffee"/>',
 // Full-width textured grip at the bottom: no gun, no floating hilt.
 '<path d="M105 257L132 262L104 324L74 322Z" fill="url(#js-rubber)" stroke="#92b9d1" stroke-width="3"/>',
 '<path d="M108 262L124 265L99 317L83 316Z" fill="#1b344d"/>',
 '<path d="M91 269L119 274M84 286L111 291M77 304L104 309" stroke="#0c1529" stroke-width="5"/>',
 '<path d="M91 270L117 275M85 288L110 293M79 304L102 310" stroke="#7ef2df" stroke-width="1.7" opacity=".65"/>',
 '<path d="M75 317L103 320L98 331L68 330Z" fill="url(#js-metal)" stroke="#a9d4e0" stroke-width="3"/>',
 // Tracking point belongs to the tip of the *blade*, not the old blaster muzzle.
 '<circle id="saberTip" cx="190" cy="26" r="3" fill="#eaffeb" opacity=".15"/>',
 '<circle id="saberPulse" cx="134" cy="176" r="46" fill="url(#js-glow)" opacity="0"/>',
 '</g></svg>'
 ].join('');
}
root.FrutaPremiumArt={sprite,slicedHalf,prime,drawDeck,drawPortal,installGun,stats:()=>({spriteCount:cache.size,cutSprites:cutCache.size,portal:'juice-apocalypse-5-chamber'})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installGun();prime()},{once:true});else{installGun();prime()}
})(typeof window!=='undefined'?window:globalThis);
