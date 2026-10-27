/* RODEADOS 360 V18 — one-tap map editor for the CTF mission.
 * Placement is relative to the calibrated floor origin, not a shared AR map.
 * Keep six or seven spawn locations; markers are never screen-anchored in 3D.
 */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg',key='mc-rodeados-v18-flagplan';
 const circle=(count=7)=>Array.from({length:count},(_,i)=>{
  const a=2*Math.PI*i/count;return {x:+(Math.sin(a)*3.35).toFixed(2),z:+(Math.cos(a)*3.35).toFixed(2)};
 });
 const defaults=()=>({base:{x:0,z:.79},flag:{x:0,z:-.79},spots:circle(7)});
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const clone=x=>JSON.parse(JSON.stringify(x));
 let plan=defaults(),tool='base',slot=0;
 try{const raw=JSON.parse(localStorage.getItem(key));if(raw&&Array.isArray(raw.spots)&&[6,7].includes(raw.spots.length)){
  plan={base:raw.base,flag:raw.flag,spots:raw.spots};
 }}catch(_){}
 const size=300,s=30,toX=x=>size/2+x*s,toY=z=>size/2+z*s;
 function el(tag,attrs,parent){
  const node=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
  parent.appendChild(node);return node;
 }
 function draw(){
  const map=$('flagMap');if(!map)return;
  map.replaceChildren();map.setAttribute('viewBox','0 0 300 300');
  el('rect',{x:5,y:5,width:290,height:290,rx:14,fill:'#0a1c29',stroke:'#446576','stroke-width':2},map);
  for(let n=-4;n<=4;n++){
   el('line',{x1:toX(n),y1:15,x2:toX(n),y2:285,stroke:'#294453','stroke-dasharray':'3 7'},map);
   el('line',{x1:15,y1:toY(n),x2:285,y2:toY(n),stroke:'#294453','stroke-dasharray':'3 7'},map);
  }
  el('rect',{x:toX(-1.3),y:toY(-1.3),width:2.6*s,height:2.6*s,rx:4,fill:'#1c3945','fill-opacity':.5,stroke:'#67d7da','stroke-dasharray':'5 4'},map);
  for(const [p,color,r,title] of [[plan.base,'#4cbaff',13,'B'],[plan.flag,'#ffca4b',13,'F']]){
   el('circle',{cx:toX(p.x),cy:toY(p.z),r,fill:color,stroke:'#efffff','stroke-width':2},map);
   el('text',{x:toX(p.x),y:toY(p.z)+5,'text-anchor':'middle','font-size':14,'font-weight':900,fill:'#06111a'},map).textContent=title;
  }
  plan.spots.forEach((p,i)=>{
   el('circle',{cx:toX(p.x),cy:toY(p.z),r:11,fill:i===slot&&tool==='spawn'?'#ff536f':'#9e334e',stroke:'#ffc4d2','stroke-width':i===slot&&tool==='spawn'?3:1.5},map);
   el('text',{x:toX(p.x),y:toY(p.z)+4,'text-anchor':'middle','font-size':11,'font-weight':800,fill:'#fff'},map).textContent=i+1;
  });
  const controls=$('flagPlanner');
  controls.querySelectorAll('[data-flag-tool]').forEach(b=>{
   b.classList.toggle('active',b.dataset.flagTool===tool);
  });
  $('flagPlannerHint').textContent=tool==='spawn'?
   'Tocá el borde para reubicar el punto enemigo '+(slot+1)+'/'+plan.spots.length+'. Se pasa al siguiente automáticamente.':
   tool==='flag'?'Tocá dentro del cuadrado para elegir dónde está la bandera enemiga.':
   'Tocá dentro del cuadrado para elegir tu base. Mantené una distancia suficiente de la bandera.';
  $('flagCount').textContent=plan.spots.length+' ENTRADAS ENEMIGAS';
 }
 function put(event){
  const map=$('flagMap'),rect=map.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width*size,z=(event.clientY-rect.top)/rect.height*size;
  let p={x:+((x-150)/s).toFixed(2),z:+((z-150)/s).toFixed(2)};
  if(tool==='spawn'){
   const l=Math.hypot(p.x,p.z)||1;
   p={x:+(p.x/l*clamp(l,2.8,4.45)).toFixed(2),z:+(p.z/l*clamp(l,2.8,4.45)).toFixed(2)};
   plan.spots[slot]=p;slot=(slot+1)%plan.spots.length;
  }else{
   p={x:clamp(p.x,-1.1,1.1),z:clamp(p.z,-1.1,1.1)};
   const other=tool==='base'?plan.flag:plan.base;
   if(Math.hypot(p.x-other.x,p.z-other.z)<.95){
    $('flagPlannerHint').textContent='⚠ BASE Y BANDERA DEBEN ESTAR A MÁS DE 95 CM. ELEGÍ OTRO LUGAR.';
    return;
   }
   plan[tool]=p;
  }
  try{localStorage.setItem(key,JSON.stringify(plan))}catch(_){}
  draw();
 }
 function init(){
  if(!$('flagPlanner')||!$('flagMap'))return;
  $('flagMap').addEventListener('click',put);
  $('flagPlanner').querySelectorAll('[data-flag-tool]').forEach(b=>b.addEventListener('click',()=>{tool=b.dataset.flagTool;draw()}));
  $('flagSix').onclick=()=>{plan.spots=circle(6);slot=0;save();draw()};
  $('flagSeven').onclick=()=>{plan.spots=circle(7);slot=0;save();draw()};
  $('flagReset').onclick=()=>{plan=defaults();slot=0;save();draw()};
  $('mode').addEventListener('change',show);show();draw();
 }
 function save(){try{localStorage.setItem(key,JSON.stringify(plan))}catch(_){}}
 function show(){$('flagPlanner').style.display=$('mode').value==='ctf'?'block':'none'}
 root.RodeadosFlagPlanner={init,getPlan:()=>clone(plan),reset:()=>{plan=defaults();slot=0;save();draw()}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof globalThis!=='undefined'?globalThis:this);
