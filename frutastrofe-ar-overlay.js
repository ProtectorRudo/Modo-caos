/* FRUTÁSTROFE REACTOR 2 · AR spatial vector renderer
   Everything in the arena is projected from a fixed WebXR floor origin.
   The visible blaster is a first-person HUD device, never confused with floor geometry. */
(function(root){'use strict';
const P=root.FrutaARProjection,$=id=>document.getElementById(id);
const n=v=>Math.round(v*10)/10,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const skins={
 strawberry:['#ffbbc5','#fe3860','#9b0c41','#e7ffbf'],apple:['#ffced0','#ed304e','#81082e','#65ce5f'],
 orange:['#ffe5a5','#ff9b24','#b83d06','#45ce70'],watermelon:['#b6ffe5','#2ecb81','#08764d','#b2ffdf'],
 lemon:['#ffffd9','#ffe84a','#a88909','#b7f591'],gold:['#fff7c8','#ffca3d','#95511e','#fff4a3'],
 ice:['#faffff','#8adeff','#2273b5','#ecffff'],rainbow:['#fff1ff','#b38aff','#6035a8','#ff8fdc'],
 bomb:['#8288ab','#252941','#090b1e','#ff5d68'],rotten:['#c0ca73','#6a8f43','#37451c','#482d66'],
 boss:['#c5ffe7','#34d88d','#056840','#f9cf59']
};
const defs=(()=>{
 let s='<defs><linearGradient id="fp-deck" x1="0" y1="0" x2=".84" y2="1"><stop stop-color="#283f64" stop-opacity=".92"/><stop offset=".45" stop-color="#152846" stop-opacity=".83"/><stop offset="1" stop-color="#091127" stop-opacity=".85"/></linearGradient>';
 s+='<linearGradient id="fp-side" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#13213a"/><stop offset="1" stop-color="#030b19"/></linearGradient>';
 s+='<linearGradient id="fp-rim" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#36ebfb"/><stop offset=".5" stop-color="#e1ff6a"/><stop offset="1" stop-color="#ff5cb2"/></linearGradient>';
 s+='<linearGradient id="fp-steel" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#8cadd3"/><stop offset=".22" stop-color="#3b5275"/><stop offset=".7" stop-color="#1a2846"/><stop offset="1" stop-color="#0c172e"/></linearGradient>';
 s+='<linearGradient id="fp-bright" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0ffff"/><stop offset=".25" stop-color="#80eff2"/><stop offset=".6" stop-color="#24bfe6"/><stop offset="1" stop-color="#1557ab"/></linearGradient>';
 s+='<radialGradient id="fp-nozzle"><stop stop-color="#ffffff"/><stop offset=".2" stop-color="#e9ff9e"/><stop offset=".48" stop-color="#49f5d8"/><stop offset=".85" stop-color="#2466bb"/><stop offset="1" stop-color="#090e2c"/></radialGradient>';
 s+='<radialGradient id="fp-halo"><stop stop-color="#a6fff6" stop-opacity=".70"/><stop offset=".42" stop-color="#4ff3d2" stop-opacity=".25"/><stop offset="1" stop-color="#26a9f6" stop-opacity="0"/></radialGradient>';
 s+='<radialGradient id="fp-bloom"><stop stop-color="#fff" stop-opacity="1"/><stop offset=".15" stop-color="#fffbaf" stop-opacity=".93"/><stop offset=".5" stop-color="#54e9ef" stop-opacity=".32"/><stop offset="1" stop-color="#58d8f0" stop-opacity="0"/></radialGradient>';
 s+='<linearGradient id="fp-shot" x1="0" y1="1" x2=".5" y2="0"><stop stop-color="#27d9ff" stop-opacity="0"/><stop offset=".35" stop-color="#9dfbff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>';
 for(const [k,p] of Object.entries(skins)){
  s+='<radialGradient id="fp-'+k+'" cx=".28" cy=".18" r=".94"><stop stop-color="'+p[0]+'"/><stop offset=".29" stop-color="'+p[1]+'"/><stop offset=".76" stop-color="'+p[1]+'"/><stop offset="1" stop-color="'+p[2]+'"/></radialGradient>';
 }
 s+='<radialGradient id="fp-shine"><stop stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>';
 s+='<filter id="fp-shadow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4"/></filter>';
 s+='<filter id="fp-glow" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="3"/></filter>';
 s+='<filter id="fp-deep" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="3" flood-color="#060817" flood-opacity=".75"/></filter>';
 s+='<clipPath id="fp-melon-clip"><circle cx="0" cy="0" r="39"/></clipPath>';s+='</defs>';return s
})();
function fruitArt(kind,spin=0){
 const k=skins[kind]?kind:'apple',g='url(#fp-'+k+')';
 let s='<ellipse cx="8" cy="11" rx="45" ry="42" fill="#070c21" opacity=".56" filter="url(#fp-shadow)"/>';
 if(k==='strawberry'){
  s+='<path d="M0 46C-5 37 -36 12 -39 -10C-44 -43 -20 -42 -2 -38C13 -52 43 -39 39 -13C36 14 10 36 0 46Z" fill="'+g+'" stroke="#ffb4c9" stroke-width="1.4"/>';
  s+='<path d="M-32 -35L-18 -48 -4 -34 12 -49 31 -37 15 -33 6 -23 -4 -30 -18 -25Z" fill="#36b75f" stroke="#198a42" stroke-width="1.4"/><path d="M-2 -38Q-1 -54 4 -61" fill="none" stroke="#6b6b32" stroke-width="5"/>';
  for(let i=0;i<31;i++){const x=Math.sin(i*2.399)*24,y=-18+(i%6)*9+(i%3)*2;if(Math.abs(x)+Math.abs(y*.36)<43)s+='<ellipse cx="'+n(x)+'" cy="'+n(y)+'" rx="1.9" ry="3.6" fill="#ffefa0" opacity=".82" transform="rotate('+n(x/5)+' '+n(x)+' '+n(y)+')"/>'}
 }else if(k==='watermelon'||k==='boss'){
  s+='<circle r="40" fill="'+g+'" stroke="#b5ffcc" stroke-width="2"/>';
  s+='<g clip-path="url(#fp-melon-clip)">';for(let i=-3;i<=3;i++)s+='<path d="M'+(i*11)+' -39Q'+(i*11+10)+' 2 '+(i*11)+' 39" stroke="#126748" stroke-width="'+(i%2?6:4)+'" opacity=".78" fill="none"/>';s+='</g>';
  if(k==='boss')s+='<path d="M-25 -38L-30 -61 -12 -51 0 -70 11 -51 31 -60 25 -38Z" fill="#ffdb63" stroke="#fff3b0" stroke-width="3"/><path d="M-24 -9L-8 -12M7 -12L23 -10" stroke="#092439" stroke-width="5"/><ellipse cx="-13" cy="0" rx="5" ry="8" fill="#091b33"/><ellipse cx="14" cy="0" rx="5" ry="8" fill="#091b33"/><path d="M-10 19Q0 27 12 16" stroke="#123044" stroke-width="4" fill="none"/>';
 }else if(k==='bomb'){
  s+='<circle r="43" fill="#140d25" stroke="#ff536b" stroke-width="5"/>';
  s+='<circle r="38" fill="url(#fp-bomb)" stroke="#717c9b" stroke-width="2"/>';
  s+='<path d="M-16 -36Q-13 -58 5 -56L12 -52" fill="none" stroke="#adb9cb" stroke-width="8"/>';
  s+='<circle cx="14" cy="-59" r="7" fill="#faffa2"/><path d="M14 -64L21 -79M19 -61L34 -61M10 -65L3 -77" stroke="#ff8f50" stroke-width="3"/>';
  s+='<path d="M-36 -4Q-3 -44 33 -4" stroke="#ffe377" stroke-width="6" stroke-dasharray="9 6" fill="none"/>';
  s+='<path d="M-22 4L0 -23L22 4L0 29Z" fill="#fff1a2" stroke="#ff983f" stroke-width="3"/>';
  s+='<path d="M0 -14V11" stroke="#251529" stroke-width="6"/><circle cy="20" r="4" fill="#251529"/>';
  s+='<path d="M-26 29Q0 42 25 28" fill="none" stroke="#ff627d" stroke-width="4"/>';
 }else if(k==='lemon'){
  s+='<path d="M-47 0Q-35 -13 -35 -25Q-2 -46 30 -26Q32 -8 48 0Q32 8 33 27Q0 47 -34 26Q-35 14 -47 0Z" fill="'+g+'" stroke="#fff6a3" stroke-width="1.8"/>';
 }else if(k==='apple'||k==='rotten'){
  s+='<path d="M0 -29C-12 -42 -37 -36 -40 -9C-43 19 -25 42 -8 43Q0 40 9 43C28 43 43 16 40 -9C37 -35 14 -45 0 -29Z" fill="'+g+'" stroke="#ffcdcd" stroke-width="1.4"/><path d="M0 -33Q1 -48 9 -53" stroke="#6e5131" stroke-width="6" fill="none"/><path d="M4 -42Q19 -60 36 -43Q21 -29 4 -42Z" fill="#53bf69" stroke="#29804e" stroke-width="1.5"/>';
  if(k==='rotten'){
   s+='<ellipse cx="14" cy="16" rx="24" ry="19" fill="#41304c" stroke="#c1e65c" stroke-width="2" opacity=".92"/>';
   s+='<ellipse cx="-20" cy="-9" rx="15" ry="14" fill="#54405d" opacity=".93"/>';
   for(let i=0;i<13;i++){const a=i*2.399,r=10+(i%3)*9;s+='<circle cx="'+n(Math.cos(a)*r)+'" cy="'+n(Math.sin(a)*r)+'" r="'+(2+i%4)+'" fill="'+(i%2?'#b2fc55':'#261d42')+'" opacity=".75"/>'}
   s+='<path d="M-10 -8L-3 0L-9 9M9 -8L3 0L10 9" stroke="#eaff8b" stroke-width="3" fill="none"/><path d="M-12 22Q0 13 12 22" stroke="#d9fc98" stroke-width="3.8" fill="none"/>';
   s+='<ellipse cx="-23" cy="20" rx="10" ry="7" fill="#83e668" opacity=".6"/>';
  }
 }else{
  s+='<circle r="40" fill="'+g+'" stroke="'+(k==='gold'?'#ffe79a':'#fbf6cc')+'" stroke-width="'+(['gold','ice','rainbow'].includes(k)?3:1.8)+'"/>';
  if(k==='orange')s+='<circle r="6" cx="1" cy="-37" fill="#b85a23"/><path d="M-3 -36Q16 -60 30 -40Q15 -28 -3 -36Z" fill="#4caa6c" stroke="#24734d" stroke-width="2"/>';
  if(k==='gold'||k==='rainbow'||k==='ice')s+='<circle r="49" fill="none" stroke="'+(k==='gold'?'#ffda64':'#c6ffff')+'" stroke-dasharray="4 8" stroke-width="3" opacity=".8"/>';
 }
 if(k!=='bomb'){
  s+='<ellipse cx="-14" cy="-20" rx="20" ry="13" transform="rotate(-27 -14 -20)" fill="url(#fp-shine)" opacity=".84"/><path d="M25 15Q17 37 -5 39" fill="none" stroke="#211437" stroke-width="4" opacity=".13"/>';
 }
 s+='<ellipse cx="-18" cy="-17" rx="10" ry="4" transform="rotate(-32 -18 -17)" fill="#fff" opacity=".20"/>';
 return s;
}
const seen=[],particles=[],shots=[],puddles=[],splashes=[],numbers=[];let state='idle',lastView=null,lastOrigin=null,lastScale=null,lastTs=0;
function addBurst(obj,kind='apple',count=22,boost=1){
 if(!obj||!Number.isFinite(obj.x))return;
 const t=performance.now()/1000,colors=(skins[kind]||skins.apple);
 for(let i=0;i<Math.min(65,count);i++){const a=i*2.399963+Math.random()*.27,spd=(.8+Math.random()*2.4)*boost;
  particles.push({x:obj.x,y:obj.y,z:obj.z,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd*.86+1.1,vz:(Math.random()-.5)*1.3,life:.45+Math.random()*.45,start:t,r:.025+Math.random()*.05,col:colors[(i%3)+1],shape:i%4===0?'star':'drop'})}
 if(particles.length>130)particles.splice(0,particles.length-130);
}
function impact(obj,kind,combo=false){addBurst(obj,kind,combo?48:24,combo?1.3:1);splashes.push({...obj,kind,combo,t:performance.now()/1000});if(splashes.length>7)splashes.shift();
 if(obj&&kind!=='bomb'&&kind!=='rotten'){puddles.push({...obj,t:performance.now()/1000,col:skins[kind]?.[1]||'#f35a8b'});if(puddles.length>12)puddles.shift()}
}
function emerge(obj){if(obj)addBurst(obj,obj.kind,6,.55)}
function land(obj){
 if(!obj)return;
 const t=performance.now()/1000,col=skins[obj.kind]?.[1]||'#69dfff';
 puddles.push({...obj,t,col});if(puddles.length>16)puddles.shift();
 addBurst({...obj,y:.3},obj.kind,8,.65);
}
function popup(obj,points){if(obj&&Number.isFinite(obj.x)){numbers.push({...obj,text:'+'+Math.round(points),t:performance.now()/1000});if(numbers.length>12)numbers.shift()}}
function shot(x,y,hit=true,kind='apple'){
 const t=performance.now()/1000;shots.push({x:x??innerWidth*.5,y:y??innerHeight*.48,t,hit,kind});
 if(shots.length>6)shots.shift();
 const gun=$('weapon');if(gun){gun.classList.remove('firing');void gun.offsetWidth;gun.classList.add('firing')}
}
function poly(points,fill,stroke,strokeWidth=1,attrs=''){
 if(points.some(p=>!p))return '';
 return '<polygon points="'+points.map(p=>n(p.x)+','+n(p.y)).join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+strokeWidth+'" '+attrs+'/>';
}
function draw(view,origin,scale,objects,mode='playing'){
 const svg=$('arWorld');if(!svg||!view||!origin)return [];
 const w=innerWidth,h=innerHeight,t=performance.now()/1000;
 svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.style.display='block';
 const pos=(x,y,z)=>P.projection(view,origin,scale,{x,y,z},w,h);
 const wide=.23; // world size in core game units; actual physical scale supplied by engine
 let html=defs;
 // 3D extruded, lit deck: never just an empty outline.
 const quad=[pos(-3.0,-.08,-2.35),pos(3.0,-.08,-2.35),pos(3.0,-.08,2.35),pos(-3.0,-.08,2.35)];
 const bottom=[pos(-3.0,-.38,-2.35),pos(3.0,-.38,-2.35),pos(3.0,-.38,2.35),pos(-3.0,-.38,2.35)];
 if(quad.every(Boolean)){
  html+=poly([quad[3],quad[2],bottom[2],bottom[3]],'url(#fp-side)','#1db0d6',2,'opacity=".93"');
  html+=poly(quad,'url(#fp-deck)','url(#fp-rim)',4,'opacity=".97"');
  for(let x=-2;x<=2;x++){const a=pos(x,-.075,-2.25),b=pos(x,-.075,2.25);if(a&&b)html+='<path d="M'+n(a.x)+' '+n(a.y)+'L'+n(b.x)+' '+n(b.y)+'" stroke="#4ee1f0" stroke-width="1.1" opacity=".33"/>'}
  for(let z=-2;z<=2;z++){const a=pos(-2.9,-.075,z),b=pos(2.9,-.075,z);if(a&&b)html+='<path d="M'+n(a.x)+' '+n(a.y)+'L'+n(b.x)+' '+n(b.y)+'" stroke="#80f0ee" stroke-width="1.1" opacity=".29"/>'}
  for(const x of [-2.75,2.75])for(const z of [-2.1,2.1]){const p=pos(x,-.055,z);if(p)html+='<circle cx="'+n(p.x)+'" cy="'+n(p.y)+'" r="3.5" fill="#fcfbab" opacity=".84"/>'}
 }
 else {
  // Partial view: remain visible instead of silently disappearing.
  const ring=P.floorOutline(view,origin,scale,3.0,w,h);let path='',prev=false;
  for(const q of ring){if(q){path+=(prev?'L':'M')+n(q[0])+','+n(q[1])+' ';prev=true}else prev=false}
  html+='<path d="'+path+'" fill="none" stroke="url(#fp-rim)" stroke-width="5" opacity=".95"/>';
 }
 // THE SKY RIFT: a luminous floating dispenser roughly 1.8 m above the anchored floor.
 // This portal, its lightning and every fruit share real-world XR coordinates.
 const portalY=9.46,portalZ=-.32;
 const ringPoints=[];
 for(let i=0;i<=48;i++){
  const a=i*Math.PI/24;
  ringPoints.push(pos(Math.cos(a)*2.8,portalY+.13*Math.sin(a*3),portalZ+Math.sin(a)*.67));
 }
 let ringPath='',pen=false;
 for(const p of ringPoints){if(p){ringPath+=(pen?'L':'M')+n(p.x)+' '+n(p.y)+' ';pen=true}else pen=false}
 const centerPortal=pos(0,portalY,portalZ);
 if(ringPath){
  html+='<path d="'+ringPath+'" fill="none" stroke="#48eaf7" stroke-width="13" opacity=".18" filter="url(#fp-glow)"/>';
  html+='<path d="'+ringPath+'" fill="none" stroke="url(#fp-rim)" stroke-width="5" opacity=".90" stroke-linecap="round"/>';
  html+='<path d="'+ringPath+'" fill="none" stroke="#f9ffe8" stroke-dasharray="5 22" stroke-dashoffset="'+n(t*50)+'" stroke-width="2.5" opacity=".78"/>';
 }
 if(centerPortal&&centerPortal.y>-180&&centerPortal.y<h+90){
  const px=n(centerPortal.x),py=n(centerPortal.y),pulse=.7+.3*Math.sin(t*5);
  html+='<ellipse cx="'+px+'" cy="'+py+'" rx="110" ry="26" fill="url(#fp-halo)" opacity="'+n(pulse)+'"/>';
  html+='<circle cx="'+px+'" cy="'+py+'" r="'+n(8+3*pulse)+'" fill="url(#fp-bloom)" opacity=".85"/>';
  html+='<text x="'+px+'" y="'+n(py-24)+'" text-anchor="middle" font-size="12" font-weight="1000" stroke="#0e1438" stroke-width="4" paint-order="stroke" letter-spacing="2.2" fill="#ddfff8">SKY JUICE PORTAL</text>';
 }
 // Atmospheric sparkles are also located in world coordinates, not stuck to the HUD.
 for(let i=0;i<14;i++){
  const x=Math.sin(i*2.4+t*.16)*2.4,z=-.32+Math.cos(i*2.4+t*.16)*.59,
    y=8.90+.32*Math.sin(i*3.2+t*1.3);
  const p=pos(x,y,z);if(!p)continue;
  const alpha=.25+.4*Math.sin(i*1.7+t*1.6)**2;
  html+='<path d="M'+n(p.x-3)+' '+n(p.y)+'L'+n(p.x+3)+' '+n(p.y)+' M'+n(p.x)+' '+n(p.y-3)+'L'+n(p.x)+' '+n(p.y+3)+'" stroke="'+(i%3?'#7feeff':'#faffac')+'" opacity="'+n(alpha)+'" stroke-width="1.5"/>';
 }
 // A quiet receiving pad on the floor: there is no physical floor launcher.
 const pad=pos(0,.0,-.5),padL=pos(-1.12,.02,-.54),padR=pos(1.12,.02,-.54);
 if(pad&&padL&&padR){
  html+='<path d="M'+n(padL.x)+' '+n(padL.y)+'L'+n(padR.x)+' '+n(padR.y)+'" stroke="#81ffcd" stroke-width="3" opacity=".75"/>';
  html+='<text x="'+n(pad.x)+'" y="'+n(pad.y-8)+'" text-anchor="middle" font-size="11" font-weight="900" letter-spacing="1" fill="#cffff7" stroke="#0b1832" stroke-width="3" paint-order="stroke">JUICE LANDING ZONE</text>';
 }
 seen.length=0;
 if(mode==='playing'){
  const all=P.targets(view,origin,scale,objects,w,h).sort((a,b)=>b.depth-a.depth);
  const objs=new Map((objects||[]).map(x=>[x.id,x]));
  // Faint vertical fall trails emphasize gravity. Only new, recently-emerged fruits.
  for(const q of all){
   const o=objs.get(q.id);
   if(!o||o.age>.72||q.y<-160||q.y>h+160)continue;
   const from=pos(o.x,o.baseY,o.z);
   if(from){
    const alpha=n(Math.max(0,1-o.age/.72)*.3);
    html+='<path d="M'+n(from.x)+' '+n(from.y)+' Q'+n((from.x+q.x)/2)+' '+n((from.y+q.y)/2)+' '+n(q.x)+' '+n(q.y)+'" stroke="'+(skins[q.kind]?.[1]||'#a1e9ff')+'" stroke-width="3" fill="none" opacity="'+alpha+'"/>';
   }
  }
  for(const q of all){
   const o=objs.get(q.id);if(q.y<72||q.y>h-85)continue;
   seen.push(q);
   const r=clamp(q.r*(o?.kind==='boss'?1.1:1),20,87);
   // fake contact shadow with perspective size, fruit has dimensional bevel + reflections
   if(q.kind==='bomb'||q.kind==='rotten'){
    const danger=q.kind==='bomb',pulse=.70+.25*Math.sin(t*(danger?16:6)+q.id),col=danger?'#ff566a':'#cbff43';
    html+='<circle cx="'+n(q.x)+'" cy="'+n(q.y)+'" r="'+n(r*(1.31+.075*pulse))+'" fill="none" stroke="'+col+'" stroke-width="'+n(3.8*pulse)+'" stroke-dasharray="'+(danger?'11 6':'3 7')+'" opacity="'+n(pulse)+'"/>';
    html+='<circle cx="'+n(q.x)+'" cy="'+n(q.y)+'" r="'+n(r*1.58)+'" fill="url(#fp-halo)" opacity="'+n(pulse*.18)+'"/>';
   }
   html+='<g transform="translate('+n(q.x)+' '+n(q.y)+') scale('+n(r/40)+') rotate('+n((o?.rot||0)*10)+')">';
   html+='<circle r="62" fill="url(#fp-halo)" opacity=".45"/>';
   html+=fruitArt(q.kind);
   html+='</g>';
   if(q.kind==='bomb'||q.kind==='rotten'){
    const warning=q.kind==='bomb'?'BOMBA':'PODRIDA',bg=q.kind==='bomb'?'#df264a':'#4d5e2c';
    const tx=n(q.x),ty=n(q.y+r+15),ww=warning==='BOMBA'?53:67;
    html+='<rect x="'+n(tx-ww/2)+'" y="'+n(ty-11)+'" width="'+ww+'" height="18" rx="8" fill="'+bg+'" stroke="#fff4c8" stroke-width="1.5"/><text x="'+tx+'" y="'+n(ty+2)+'" text-anchor="middle" font-size="10" font-weight="1000" fill="#ffffff" letter-spacing=".7">'+warning+'</text>';
   }
  }
 }
 // POLISHED EXPLOSIONS: light flash, sliced halves, chromatic shockwave and juicy arcs.
 for(let i=splashes.length-1;i>=0;i--){
  const b=splashes[i],age=t-b.t;
  if(age>.82){splashes.splice(i,1);continue}
  const q=pos(b.x,b.y,b.z);if(!q)continue;
  const alpha=clamp(1-age/.82,0,1),boost=b.combo?1.6:1,rad=(12+age*102)*boost,
     hue=skins[b.kind]?.[1]||'#f58aff',cx=n(q.x),cy=n(q.y);
  html+='<circle cx="'+cx+'" cy="'+cy+'" r="'+n(rad*1.45)+'" fill="url(#fp-bloom)" opacity="'+n(alpha*.44)+'"/>';
  // layered shockwave: thick low-energy halo + high-frequency luminous rim
  html+='<circle cx="'+cx+'" cy="'+cy+'" r="'+n(rad)+'" fill="none" stroke="'+hue+'" stroke-width="'+n((9+4*boost)*alpha)+'" opacity="'+n(alpha*.63)+'"/>';
  html+='<circle cx="'+cx+'" cy="'+cy+'" r="'+n(rad*.78)+'" fill="none" stroke="#fff9dd" stroke-width="'+n(3.4*alpha)+'" opacity="'+n(alpha*.72)+'"/>';
  // visibly split the fruit in two; each half tumbles away before fading out
  if(age<.52&&!['boss','bomb','rotten'].includes(b.kind)){
   const r=36+(b.combo?14:0),move=age*120;
   const id='slice-'+i;
   html+='<defs><clipPath id="'+id+'a"><rect x="-53" y="-60" width="53" height="120"/></clipPath><clipPath id="'+id+'b"><rect x="0" y="-60" width="53" height="120"/></clipPath></defs>';
   const scales=n(.8+age*.13),pieceAlpha=n(Math.min(1,alpha*1.5));
   html+='<g transform="translate('+n(q.x-move)+' '+n(q.y-age*75)+') rotate('+n(-age*240)+') scale('+scales+')" clip-path="url(#'+id+'a)" opacity="'+pieceAlpha+'">'+fruitArt(b.kind)+'</g>';
   html+='<g transform="translate('+n(q.x+move)+' '+n(q.y-age*75)+') rotate('+n(age*220)+') scale('+scales+')" clip-path="url(#'+id+'b)" opacity="'+pieceAlpha+'">'+fruitArt(b.kind)+'</g>';
  }
  // Radial spurts with tapered highlight and chunky juice beads
  for(let k=0;k<12;k++){
   const a=k*Math.PI/6+.3+b.x*.45,r2=rad*(.77+.2*Math.sin(k*2.4));
   const x1=q.x+Math.cos(a)*rad*.27,y1=q.y+Math.sin(a)*rad*.27,
     x2=q.x+Math.cos(a)*r2,y2=q.y+Math.sin(a)*r2;
   html+='<path d="M'+n(x1)+' '+n(y1)+' Q'+n((x1+x2)/2+Math.sin(a)*4)+' '+n((y1+y2)/2-Math.cos(a)*4)+' '+n(x2)+' '+n(y2)+'" stroke="'+hue+'" stroke-width="'+n((4.5+k%3)*alpha)+'" stroke-linecap="round" fill="none" opacity="'+n(alpha)+'"/>';
   html+='<ellipse cx="'+n(x2)+'" cy="'+n(y2)+'" rx="'+n(3+6*alpha)+'" ry="'+n(5+10*alpha)+'" transform="rotate('+n(a*57.295+90)+' '+n(x2)+' '+n(y2)+')" fill="'+hue+'" stroke="#fffbed" stroke-width="1.2" opacity="'+n(alpha)+'"/>';
  }
 }
 for(let i=numbers.length-1;i>=0;i--){const m=numbers[i],age=t-m.t;if(age>.85){numbers.splice(i,1);continue}
  const p=pos(m.x,m.y+age*1.2,m.z);if(p)html+='<text x="'+n(p.x)+'" y="'+n(p.y-22)+'" text-anchor="middle" font-size="'+n(17+age*12)+'" font-weight="1000" stroke="#09112c" stroke-width="5" paint-order="stroke" fill="#f4ff7c" opacity="'+n(1-age/.85)+'">'+m.text+'</text>';
 }
 // Puddles left by impacts (world-locked)
 for(let i=puddles.length-1;i>=0;i--){const q=puddles[i],age=t-q.t;if(age>2.4){puddles.splice(i,1);continue}
  const p=pos(q.x,-.06,q.z);if(p){const a=clamp((1-age/2.4)*.47,0,.46);html+='<ellipse cx="'+n(p.x)+'" cy="'+n(p.y)+'" rx="'+n(22+age*12)+'" ry="'+n(6+age*3)+'" fill="'+q.col+'" opacity="'+n(a)+'"/>'}}
 // Ejected juice: world particles with gravity, projected through the same XR pose.
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i],age=t-p.start;
  if(age>p.life){particles.splice(i,1);continue}
  const q=pos(p.x+p.vx*age,p.y+p.vy*age-3.2*age*age,p.z+p.vz*age);
  if(!q)continue;
  const alpha=clamp((1-age/p.life),0,1),r=clamp(1.5+p.r*68*alpha,1.8,6.5);
  html+='<ellipse cx="'+n(q.x)+'" cy="'+n(q.y)+'" rx="'+n(r)+'" ry="'+n(r*(p.shape==='star'?.8:1.45))+'" transform="rotate('+n(age*260)+' '+n(q.x)+' '+n(q.y)+')" fill="'+p.col+'" stroke="#ffffff" stroke-width=".4" opacity="'+n(alpha)+'"/>';
 }
 for(let i=shots.length-1;i>=0;i--){
  const sh=shots[i],age=t-sh.t;if(age>.19){shots.splice(i,1);continue}
  const alpha=clamp(1-age/.19,0,1),gun=$('weapon'),gunRect=gun?.getBoundingClientRect(),sx=gunRect?gunRect.left+gunRect.width*.492:w*.50,sy=gunRect?gunRect.top+gunRect.width*(48/260):h*.84,tx=n(sh.x),ty=n(sh.y);
  const a=n(alpha),flare=n(11+20*alpha),vx=tx-sx,vy=ty-sy,dist=Math.hypot(vx,vy)||1,
    nx=-vy/dist,ny=vx/dist,mx=sx+vx*.57,my=sy+vy*.57;
  html+='<path d="M'+n(sx)+' '+n(sy)+'L'+tx+' '+ty+'" fill="none" stroke="#22d8f8" stroke-linecap="round" stroke-width="'+n(19*alpha)+'" opacity="'+n(alpha*.32)+'" filter="url(#fp-glow)"/>';
  html+='<path d="M'+n(sx)+' '+n(sy)+'L'+tx+' '+ty+'" fill="none" stroke="#2cdbff" stroke-linecap="round" stroke-width="'+n(9*alpha)+'" opacity="'+n(alpha*.83)+'"/>';
  html+='<path d="M'+n(sx)+' '+n(sy)+'L'+tx+' '+ty+'" fill="none" stroke="#f3fff9" stroke-linecap="round" stroke-width="'+n(2.6*alpha)+'" opacity="'+a+'"/>';
  // electrically jittered split branches, computed from projectile direction
  for(let k of [-1,1]){
   const offset=k*(9+3*Math.sin(t*62+k));
   html+='<path d="M'+n(sx+nx*k*2)+' '+n(sy+ny*k*2)+'Q'+n(mx+nx*offset)+' '+n(my+ny*offset)+' '+n(tx-nx*k*2)+' '+n(ty-ny*k*2)+'" fill="none" stroke="#7bfeff" stroke-width="'+n(1.6*alpha)+'" opacity="'+n(alpha*.78)+'"/>';
  }
  // Muzzle detonation: an energetic sunburst attached to the actual blaster muzzle.
  html+='<circle cx="'+n(sx)+'" cy="'+n(sy)+'" r="'+flare+'" fill="url(#fp-bloom)" opacity="'+n(alpha*.95)+'"/>';
  html+='<circle cx="'+n(sx)+'" cy="'+n(sy)+'" r="'+n(6+age*75)+'" fill="none" stroke="#efffa3" stroke-width="'+n(4*alpha)+'" opacity="'+a+'"/>';
  for(let k=0;k<8;k++){const angle=k*Math.PI/4+t*16,rr=(15+age*70)*(k%2?.7:1);
   html+='<path d="M'+n(sx+Math.cos(angle)*9)+' '+n(sy+Math.sin(angle)*9)+'L'+n(sx+Math.cos(angle)*rr)+' '+n(sy+Math.sin(angle)*rr)+'" stroke="'+(k%2?'#a3fffa':'#fcff9d')+'" stroke-width="'+n(2.2*alpha)+'" stroke-linecap="round" opacity="'+a+'"/>';
  }
  html+='<circle cx="'+tx+'" cy="'+ty+'" r="'+n(13+age*80)+'" stroke="'+(sh.hit?'#fbff98':'#68ffff')+'" stroke-width="'+n(4*alpha)+'" fill="none" opacity="'+a+'"/>';
 }
 svg.innerHTML=html;state=mode;lastView=view;lastOrigin=origin;lastScale=scale;lastTs=t;return seen.slice();
}
function clear(){const svg=$('arWorld');if(svg){svg.innerHTML='';svg.style.display='none'}seen.length=0;particles.length=0;shots.length=0;puddles.length=0;splashes.length=0;numbers.length=0;state='idle';lastView=null}
root.FrutaAROverlay={draw,clear,impact,shot,popup,emerge,land,get targets(){return seen},get state(){return state},get diagnostics(){return {visible:seen.length,particles:particles.length,shots:shots.length,splashes:splashes.length,hasSkyPortal:!!lastView}}};
})(typeof window!=='undefined'?window:globalThis);
