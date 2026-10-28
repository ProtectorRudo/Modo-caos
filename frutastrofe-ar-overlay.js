/* FRUTÁSTROFE AR · Canvas 2D high-performance compositor.
   World geometry uses the real XR pose/anchored floor, not screen stickers.
   No SVG innerHTML churn. Sprites and gradients are generated ONCE. */
(function(root){'use strict';
const P=root.FrutaARProjection,$=id=>document.getElementById(id);
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const palette={strawberry:['#ff9ba8','#ef2454','#921035'],apple:['#ffd0c5','#f63b4b','#8d112a'],orange:['#ffe3aa','#ff9833','#b34e13'],watermelon:['#b1ffe1','#34c786','#086c48'],lemon:['#ffffce','#ffe749','#bb8d08'],gold:['#fff4b8','#fbc03e','#a06612'],ice:['#f5ffff','#71d5ff','#2181b3'],rainbow:['#faeaff','#a685fa','#6d43a9'],rotten:['#b9cb6b','#6c8540','#2f4122'],bomb:['#9aa4bf','#2d344f','#0c1125'],boss:['#ccffe2','#3bd48c','#07643d']};
const LAYER_ID='frutastrofe-canvas';
let canvas=null,ctx=null,width=0,height=0,sprites={},targets=[],mode='idle',renders=0,costMs=0;
const particles=[],splashes=[],shots=[],scores=[],puddles=[],launchBursts=[];let shotsEver=0,stage=1,fever=false;
function now(){return performance.now()/1000}
function layer(){
 if(!canvas){
  canvas=document.getElementById(LAYER_ID);
  if(!canvas){
   canvas=document.createElement('canvas');canvas.id=LAYER_ID;canvas.setAttribute('aria-hidden','true');
   canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;contain:strict;';
   document.body.appendChild(canvas);
  }
  ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
 }
 if(width!==innerWidth||height!==innerHeight){
  width=innerWidth;height=innerHeight;canvas.width=Math.max(1,width);canvas.height=Math.max(1,height);
 }
 canvas.style.display='block';
 return ctx;
}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill()}
function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill()}
function strokeCircle(c,x,y,r,color,w=2){c.beginPath();c.arc(x,y,r,0,TAU);c.lineWidth=w;c.strokeStyle=color;c.stroke()}
function line(c,x1,y1,x2,y2,color,w=2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=w;c.stroke()}
function sprite(kind){
 if(root.FrutaPremiumArt)return root.FrutaPremiumArt.sprite(kind);
 if(sprites[kind])return sprites[kind];
 const c=document.createElement('canvas');c.width=128;c.height=150;
 const a=c.getContext('2d',{alpha:true});const k=palette[kind]?kind:'apple';
 const colors=palette[k],grad=a.createRadialGradient(46,45,4,66,76,67);
 grad.addColorStop(0,colors[0]);grad.addColorStop(.49,colors[1]);grad.addColorStop(1,colors[2]);
 a.translate(64,78);
 a.shadowColor='#050d25';a.shadowBlur=5;a.shadowOffsetY=4;
 a.lineWidth=2.4;a.strokeStyle=kind==='bomb'?'#ff657f':'#fff2cf';
 a.fillStyle=grad;
 if(k==='strawberry'){
  a.beginPath();a.moveTo(0,-37);a.bezierCurveTo(-54,-54,-50,3,0,48);a.bezierCurveTo(48,3,54,-54,0,-37);a.closePath();a.fill();a.stroke();
 }else if(k==='apple'||k==='rotten'){
  a.beginPath();a.moveTo(0,-32);a.bezierCurveTo(-27,-50,-48,-19,-37,17);a.bezierCurveTo(-20,58,-3,41,0,43);
  a.bezierCurveTo(13,52,38,36,40,-5);a.bezierCurveTo(40,-35,16,-49,0,-32);a.closePath();a.fill();a.stroke();
 }else if(k==='lemon'){
  a.beginPath();a.moveTo(-51,0);a.quadraticCurveTo(-35,-10,-36,-27);a.quadraticCurveTo(0,-47,36,-27);
  a.quadraticCurveTo(35,-9,51,0);a.quadraticCurveTo(35,9,36,27);a.quadraticCurveTo(0,47,-36,27);
  a.quadraticCurveTo(-35,10,-51,0);a.fill();a.stroke();
 }else{circle(a,0,0,k==='boss'?47:42,grad);a.stroke()}
 a.shadowBlur=0;a.shadowOffsetY=0;
 if(k==='bomb'){
  strokeCircle(a,0,0,42,'#ff455e',5);
  a.lineWidth=6;a.strokeStyle='#b9c4d8';a.beginPath();a.moveTo(-13,-39);a.quadraticCurveTo(-9,-60,9,-57);a.stroke();
  circle(a,10,-58,6,'#f9fca7');
  a.fillStyle='#fff0a0';a.beginPath();a.moveTo(0,-22);a.lineTo(-23,22);a.lineTo(23,22);a.closePath();a.fill();
  a.fillStyle='#22223c';a.font='bold 28px system-ui';a.textAlign='center';a.fillText('!',0,15);
 }else if(k==='rotten'){
  ellipse(a,15,12,21,18,'#3b304c');ellipse(a,-18,-8,13,12,'#453457');
  for(let i=0;i<8;i++)circle(a,Math.sin(i*2.4)*22,Math.cos(i*1.6)*20,3,'#bfff55');
  a.fillStyle='#efff94';a.font='bold 33px system-ui';a.textAlign='center';a.fillText('☹',0,12);
 }else if(k==='watermelon'||k==='boss'){
  a.save();a.beginPath();a.arc(0,0,41,0,TAU);a.clip();for(let i=-3;i<=3;i++){
   a.strokeStyle='#0a7650';a.lineWidth=i%2?6:4;
   a.beginPath();a.moveTo(i*13,-48);a.quadraticCurveTo(i*13+17,0,i*13,48);a.stroke()
  }a.restore();
  if(k==='boss'){a.fillStyle='#ffdb61';a.beginPath();a.moveTo(-23,-39);a.lineTo(-29,-62);a.lineTo(-11,-50);a.lineTo(0,-69);a.lineTo(13,-50);a.lineTo(29,-62);a.lineTo(23,-39);a.fill()}
 }else if(k==='strawberry'){
  a.fillStyle='#38b65d';for(let i=0;i<5;i++){a.save();a.rotate(i*TAU/5);ellipse(a,0,-33,8,15,'#39bf61');a.restore()}
  for(let i=0;i<24;i++){const y=-19+Math.floor(i/5)*10,x=(i%5-2)*10+(Math.floor(i/5)%2)*3;ellipse(a,x,y,1.8,3,'#ffe7a2')}
 }else{
  if(k==='apple'||k==='orange'){a.strokeStyle='#5f4b24';a.lineWidth=5;line(a,0,-38,4,-54,'#654a2a',5);ellipse(a,17,-40,17,7,'#4db86d')}
  if(['gold','ice','rainbow'].includes(k))strokeCircle(a,0,0,47,'#fff4b6',3);
 }
 ellipse(a,-15,-19,16,7,'rgba(255,255,255,.35)');
 sprites[k]=c;return c;
}
function softLight(c,x,y,r,color,opacity=.3){
 const g=c.createRadialGradient(x,y,0,x,y,Math.max(1,r));g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');
 c.globalAlpha=opacity;circle(c,x,y,r,g);c.globalAlpha=1;
}
function polygon(c,pts,fill,stroke='#46ebdd',w=2){
 if(pts.some(p=>!p))return false;
 c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x,pts[i].y);
 c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=w;c.stroke();return true;
}
function draw(view,origin,scale,objects,kind='playing'){
 const c=layer();if(!c||!view||!origin)return [];
 const start=performance.now(),t=start/1000;
 c.clearRect(0,0,width,height);
 const pos=(x,y,z)=>P.projection(view,origin,scale,{x,y,z},width,height);
 // Render a coherent premium metal dais and a physically anchored sky rift.
 // They share the same AR view/projection as every falling fruit.
 if(root.FrutaPremiumArt){
  root.FrutaPremiumArt.drawDeck(c,pos,t);
  root.FrutaPremiumArt.drawPortal(c,pos,t,stage,fever);
 }else{
  const corners=[pos(-2.3,-.08,-1.6),pos(2.3,-.08,-1.6),pos(2.3,-.08,1.6),pos(-2.3,-.08,1.6)];
  polygon(c,corners,'rgba(12,28,54,.88)','#58efdd',3);
 }
 // Ejection flashes connect each fruit's first appearance to a real portal nozzle.
 for(let i=launchBursts.length-1;i>=0;i--){
  const burst=launchBursts[i],age=t-burst.at;
  if(age>.21){launchBursts.splice(i,1);continue}
  const p=pos(burst.x,burst.y,burst.z);if(!p)continue;
  const alpha=1-age/.21;
  c.save();c.globalAlpha=alpha*.75;
  strokeCircle(c,p.x,p.y,6+age*70,burst.kind==='bomb'?'#ff837e':'#b5ffdf',2.3);
  c.globalAlpha=alpha*.42;circle(c,p.x,p.y,5+age*20,'#ebffad');c.restore();
 }
 targets=[];
 if(kind==='playing'){
  // Contact shadows on the REAL anchored deck; their strength depends on height.
  // This makes flying targets read as objects in 3D space, not stickers on a screen.
  for(const o of objects||[]){
   if(o.y>5.5||o.y<0||o.kind==='boss')continue;
   const foot=pos(o.x,-.064,o.z);
   if(!foot||foot.y<50||foot.y>height+40)continue;
   const rad=clamp(13+o.y*1.8,13,26),opacity=clamp(.28-o.y*.028,.07,.27);
   c.save();c.translate(foot.x,foot.y);c.scale(1,.42);
   const shade=c.createRadialGradient(0,0,1,0,0,rad);
   shade.addColorStop(0,'rgba(3,11,27,'+opacity+')');
   shade.addColorStop(1,'rgba(3,11,27,0)');
   circle(c,0,0,rad,shade);c.restore();
  }
  const byId=new Map((objects||[]).map(o=>[o.id,o]));
  const mapped=P.targets(view,origin,scale,objects,width,height).sort((a,b)=>b.depth-a.depth);
  for(const q of mapped){
   if(q.y<66||q.y>height-86)continue;
   targets.push(q);
   const r=clamp(q.r,20,86),img=sprite(q.kind),o=byId.get(q.id),age=o?.age||0;
   // Small specular shimmer + readable spin convey movement without more 3D GPU passes.
   c.save();c.translate(q.x,q.y);
   const wobble=1+Math.sin(age*5+q.id)*.018;
   c.rotate(clamp((o?.rot||0)*.085,-.22,.22));
   c.scale(wobble,1/wobble);
   c.drawImage(img,-r*1.18,-r*1.31,r*2.36,r*2.63);
   c.restore();
   if(['gold','ice','rainbow'].includes(q.kind)){
    c.globalAlpha=.36+.20*Math.sin(t*7+q.id);strokeCircle(c,q.x,q.y,r*1.13,'#fff7bb',1.8);c.globalAlpha=1;
   }
   if(q.kind==='bomb'||q.kind==='rotten'){
    const danger=q.kind==='bomb',co=danger?'#ff5872':'#baff66';
    c.globalAlpha=.68+.22*Math.sin(t*(danger?12:6));strokeCircle(c,q.x,q.y,r*1.21,co,danger?3.3:2.1);c.globalAlpha=1;
    // Warning by silhouette and colored mechanical pulse, not intrusive red labels.
    const tagY=q.y+r*1.28;
    c.fillStyle=danger?'rgba(74,9,31,.90)':'rgba(38,66,21,.90)';
    c.beginPath();c.roundRect(q.x-18,tagY-8,36,17,7);c.fill();
    c.font='900 12px system-ui';c.textAlign='center';c.fillStyle='#fff7c9';
    c.fillText(danger?'!':'☠',q.x,tagY+4);
   }
  }
 }
 // Bounded visual effects; each draws a few canvas primitives, never replaces DOM.
 for(let i=splashes.length-1;i>=0;i--){
  const p=splashes[i],age=t-p.at;if(age>.42){splashes.splice(i,1);continue}
  const q=pos(p.x,p.y,p.z);if(!q)continue;
  const a=1-age/.42,r=11+age*(p.combo?150:110),co=palette[p.kind]?.[1]||'#91e9ff';
  c.globalAlpha=a*.65;softLight(c,q.x,q.y,r*1.4,co,.38*a);
  strokeCircle(c,q.x,q.y,r,co,4*a);strokeCircle(c,q.x,q.y,r*.76,'#fffbc4',2.5*a);
  c.globalAlpha=a;
  // Two fruit halves rendered from the same cached atlas, clipped once per half.
  if(age<.27&&!['bomb','rotten'].includes(p.kind)){
   for(const side of [-1,1]){
    c.save();c.translate(q.x+side*age*100,q.y-age*43);c.rotate(side*age*3);
    const piece=root.FrutaPremiumArt?.slicedHalf(p.kind,side);
    if(piece)c.drawImage(piece,-44,-53,88,105);
    else{c.beginPath();if(side<0)c.rect(-64,-64,64,128);else c.rect(0,-64,64,128);c.clip();c.drawImage(sprite(p.kind),-44,-53,88,105)}
    c.restore();
   }
  }
  c.globalAlpha=1;
 }
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i],age=t-p.at;if(age>p.life){particles.splice(i,1);continue}
  const q=pos(p.x+p.vx*age,p.y+p.vy*age-2.8*age*age,p.z+p.vz*age);if(!q)continue;
  c.globalAlpha=1-age/p.life;circle(c,q.x,q.y,3.3,p.color);c.globalAlpha=1;
 }
 for(let i=shots.length-1;i>=0;i--){
  const p=shots[i],age=t-p.at;
  // High-speed juice plasma bolts: short LOCAL streaks moving toward the real target,
  // never a full-screen vertical line obscuring the player's room.
  if(age>.095){shots.splice(i,1);continue}
  const k=clamp(age/.095,0,1),alpha=1-k,gunWidth=clamp(width*.35,119,144);
  // CSS weapon uses viewport width 35%, left 43% and bottom 2px.
  // This projected muzzle stays at exactly the same virtual geometry,
  // without invoking getBoundingClientRect during every WebXR frame.
  const sx=width*.43,sy=height-14-gunWidth*(298/240);
  const dx=p.x-sx,dy=p.y-sy,d=Math.hypot(dx,dy)||1;
  const head=clamp(k*1.45,0,1);
  const px=sx+dx*head,py=sy+dy*head;
  const unitX=dx/d,unitY=dy/d;
  const streak=Math.min(48,d*.24);
  const tailX=px-unitX*streak,tailY=py-unitY*streak;
  c.save();c.lineCap='round';
  c.globalAlpha=alpha*.50;line(c,tailX,tailY,px,py,'#24d8ec',9);c.globalAlpha=alpha;
  line(c,tailX,tailY,px,py,'#f5fff0',3.1);
  const light=c.createRadialGradient(px,py,0,px,py,13);
  light.addColorStop(0,'rgba(255,255,245,.94)');light.addColorStop(.44,'rgba(131,255,217,.54)');light.addColorStop(1,'rgba(25,184,222,0)');
  circle(c,px,py,13,light);
  // The muzzle flashes for the initial 30ms; no disembodied light beam to the floor.
  if(k<.37){const flare=c.createRadialGradient(sx,sy,0,sx,sy,19);
   flare.addColorStop(0,'rgba(255,255,231,.95)');flare.addColorStop(.33,'rgba(122,255,224,.46)');flare.addColorStop(1,'rgba(18,180,232,0)');
   c.globalAlpha=(.37-k)/.37;circle(c,sx,sy,19,flare);
  }
  if(p.hit&&head>.91){c.globalAlpha=alpha*.8;strokeCircle(c,p.x,p.y,5+(head-.91)*90,'#dfff93',2.7)}
  c.restore();
 }
 for(let i=scores.length-1;i>=0;i--){
  const p=scores[i],age=t-p.at;if(age>.75){scores.splice(i,1);continue}
  const q=pos(p.x,p.y+age,p.z);if(!q)continue;
  c.globalAlpha=1-age/.75;c.textAlign='center';c.font='900 20px system-ui';
  c.lineWidth=3;c.strokeStyle='#121627';c.strokeText('+'+p.value,q.x,q.y-22);c.fillStyle='#dfff65';c.fillText('+'+p.value,q.x,q.y-22);c.globalAlpha=1;
 }
 for(let i=puddles.length-1;i>=0;i--){
  const p=puddles[i],age=t-p.at;if(age>1.7){puddles.splice(i,1);continue}
  const q=pos(p.x,0,p.z);if(q){c.globalAlpha=.30*(1-age/1.7);ellipse(c,q.x,q.y,18+age*9,6+age*3,p.color);c.globalAlpha=1}
 }
 mode=kind;renders++;costMs=costMs*.8+(performance.now()-start)*.2;
 return targets.slice();
}
function impact(p,kind='apple',combo=false){
 if(!p)return;const at=now(),color=palette[kind]?.[1]||'#5ee2e9';
 splashes.push({x:p.x,y:p.y,z:p.z,kind,combo,at});if(splashes.length>3)splashes.shift();
 for(let i=0;i<(combo?9:6);i++){
  const a=(i/9)*TAU,sp=1+Math.random()*2;
  particles.push({x:p.x,y:p.y,z:p.z,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp+1.1,vz:(Math.random()-.5)*1.6,at,life:.38+Math.random()*.25,color});
 }
 if(particles.length>24)particles.splice(0,particles.length-24);
 if(kind!=='bomb'&&kind!=='rotten'){puddles.push({x:p.x,z:p.z,kind,color,at});if(puddles.length>6)puddles.shift()}
}
function shot(x,y,hit=true){shotsEver++;shots.push({x:x??width/2,y:y??height*.48,hit,at:now()});if(shots.length>2)shots.shift()}
function popup(p,value){if(p)scores.push({...p,value:Math.round(value),at:now()});if(scores.length>5)scores.shift()}
function land(p){if(p){puddles.push({...p,color:palette[p.kind]?.[1]||'#84ffff',at:now()});if(puddles.length>6)puddles.shift()}}
function emerge(p){if(!p)return;launchBursts.push({x:p.x,y:p.y,z:p.z,kind:p.kind,at:now()});if(launchBursts.length>4)launchBursts.shift()}
function clear(){
 if(canvas){canvas.style.display='none';ctx?.clearRect(0,0,width,height)}
 particles.length=splashes.length=shots.length=scores.length=puddles.length=targets.length=launchBursts.length=0;mode='idle';
}
root.FrutaAROverlay={draw,clear,impact,shot,popup,land,emerge,
 setStage(phase,isFever){stage=clamp(Number(phase)||1,1,6);fever=!!isFever},
 get targets(){return targets},get state(){return mode},
 get diagnostics(){return {engine:'canvas2d',boltDurationMs:95,boltMaxStreakPx:48,premium:true,sprites:root.FrutaPremiumArt?.stats().spriteCount||Object.keys(sprites).length,renders,averageDrawMs:costMs,particles:particles.length,shots:shots.length,shotsEver,launchBursts:launchBursts.length,splashes:splashes.length,svgNodes:0,hasSkyPortal:!!canvas}}};
})(typeof window!=='undefined'?window:globalThis);
