/* FRUTÁSTROFE · AR world-projected SVG graphics independent of WebGL compositor. */
(function(root){'use strict';
const P=root.FrutaARProjection,$=id=>document.getElementById(id),round=n=>Math.round(n*10)/10;
const colors={strawberry:['#ff93a5','#f52c56','#9b173f'],apple:['#ffb4a9','#f84250','#ac153e'],orange:['#ffe19a','#ff9a29','#ca4b19'],watermelon:['#acffd8','#21c883','#087553'],lemon:['#ffffb4','#ffe450','#b78b10'],gold:['#fffad0','#ffc735','#c8841c'],ice:['#eaffff','#6dcaff','#2370ae'],rainbow:['#ffb1fa','#a273ff','#5e35ba'],bomb:['#7d83a3','#30334e','#111328'],rotten:['#a1b771','#65823b','#3b4e1a'],boss:['#afffd0','#25b67a','#076843']};
const defs='<defs><radialGradient id="fx-glow"><stop stop-color="#b6ffee" stop-opacity=".5"/><stop offset="1" stop-color="#48ddf2" stop-opacity="0"/></radialGradient><linearGradient id="fx-floor" x1="0%" y1="0%" x2="100%" y2="0%"><stop stop-color="#54effb"/><stop offset=".5" stop-color="#aaff68"/><stop offset="1" stop-color="#fd73bd"/></linearGradient>'+Object.entries(colors).map(([key,p])=>'<radialGradient id="fx-'+key+'" cx="29%" cy="20%" r="88%"><stop stop-color="'+p[0]+'"/><stop offset=".53" stop-color="'+p[1]+'"/><stop offset="1" stop-color="'+p[2]+'"/></radialGradient>').join('')+'</defs>';
function shape(k){
 if(k==='bomb')return '<circle r="40" fill="url(#fx-bomb)" stroke="#ff8793" stroke-width="3"/><path d="M-13 -37l13 -12 13 12M0 -49L9 -61" fill="none" stroke="#ffdc74" stroke-width="5"/><path d="M0 -24L23 19H-23Z" fill="#ffbe44" stroke="#22172b" stroke-width="2"/><text text-anchor="middle" y="12" font-size="22" font-weight="1000" fill="#241826">!</text>';
 if(k==='boss'||k==='watermelon')return '<circle r="40" fill="url(#fx-'+k+')" stroke="#c8ffe1" stroke-width="2.5"/><path d="M-26 -30Q-14 -5 -25 27M-8 -37Q4 1 -8 37M12 -36Q26 0 12 35M28 -25Q38 0 29 25" fill="none" stroke="#126f46" stroke-width="6" opacity=".76"/><ellipse cx="-15" cy="-18" rx="13" ry="7" fill="#fff" opacity=".32"/>'+(k==='boss'?'<path d="M-19 -44L-25 -69 -8 -57 1 -70 12 -55 25 -66 20 -42Z" fill="#ffdd62" stroke="#fff3b4" stroke-width="3"/>':'');
 if(k==='strawberry')return '<path d="M0 41C-13 26 -43 5 -39 -19C-35 -48 -9 -37 0 -35C19 -49 45 -37 38 -12C35 8 17 30 0 41Z" fill="url(#fx-strawberry)" stroke="#ffd0d6" stroke-width="2"/><path d="M-28 -34L-13 -42L0 -33L13 -43L29 -35L16 -29L8 -23L0 -31L-10 -24Z" fill="#42c46f"/><path d="M0 -35L3 -52" stroke="#76db84" stroke-width="5"/><g fill="#ffe5a5" opacity=".95"><ellipse cx="-17" cy="-9" rx="2" ry="4"/><ellipse cx="12" cy="-12" rx="2" ry="4"/><ellipse cx="1" cy="10" rx="2" ry="4"/><ellipse cx="-12" cy="19" rx="2" ry="4"/><ellipse cx="19" cy="9" rx="2" ry="4"/></g>';
 if(k==='lemon')return '<path d="M-42 0Q-31 -9 -31 -21C-12 -39 13 -39 31 -19Q31 -6 42 0Q31 7 31 20C12 39 -13 39 -31 19Q-31 7 -42 0Z" fill="url(#fx-lemon)" stroke="#fff4ac" stroke-width="3"/><ellipse cx="-14" cy="-16" rx="12" ry="7" fill="#fff" opacity=".28"/>';
 if(k==='rotten')return '<circle r="39" fill="url(#fx-rotten)" stroke="#bfd07a" stroke-width="2"/><ellipse cx="12" cy="14" rx="17" ry="12" fill="#422c59" opacity=".82"/><ellipse cx="-17" cy="-10" rx="11" ry="9" fill="#3f3954" opacity=".6"/><path d="M0 -37L5 -52" stroke="#68492e" stroke-width="6"/>';
 const spec=k==='gold'?'#fff6b1':k==='ice'?'#ccf7ff':'#efffcd',leaf=k==='apple'||k==='orange'?'<path d="M0 -36Q17 -59 30 -41Q16 -31 0 -36Z" fill="#53bd6b" stroke="#206b43" stroke-width="2"/><path d="M0 -35L3 -51" stroke="#5c3b25" stroke-width="5"/>':'';
 return '<circle r="40" fill="url(#fx-'+k+')" stroke="'+spec+'" stroke-width="3"/>'+leaf+'<ellipse cx="-14" cy="-16" rx="13" ry="8" fill="#fff" opacity=".35"/>';
}
let visible=[],state='idle';
function draw(view,origin,scale,objects,mode='playing'){
 const svg=$('arWorld');if(!svg||!view||!origin)return [];
 const w=innerWidth,h=innerHeight;svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.style.display='block';
 const ring=P.floorOutline(view,origin,scale,3.35,w,h),center=P.projection(view,origin,scale,{x:0,y:.03,z:0},w,h);
 let html=defs;
 if(ring.length===48){html+='<polygon points="'+ring.map(([x,y])=>round(x)+','+round(y)).join(' ')+'" fill="#2acbe5" fill-opacity=".07" stroke="url(#fx-floor)" stroke-width="4" stroke-linejoin="round" opacity=".96"/>';for(let j=0;j<8;j++){const q=ring[j*6],p=ring[(j*6+1)%48];html+='<line x1="'+round(q[0])+'" y1="'+round(q[1])+'" x2="'+round(p[0])+'" y2="'+round(p[1])+'" stroke="#e6ffe7" stroke-width="6" opacity=".5"/>'}}
 if(center)html+='<circle cx="'+round(center.x)+'" cy="'+round(center.y)+'" r="'+(mode==='search'?23:12)+'" fill="none" stroke="#ccff79" stroke-width="3"/><circle cx="'+round(center.x)+'" cy="'+round(center.y)+'" r="4" fill="#f7ffe5"/>';
 visible=[];
 if(mode==='playing'){
  const list=P.targets(view,origin,scale,objects,w,h).sort((a,b)=>b.depth-a.depth);
  for(const q of list){
   if(q.y<50||q.y>h-100)continue;
   visible.push(q);
   html+='<g transform="translate('+round(q.x)+' '+round(q.y)+') scale('+round(q.r/40)+')"><circle r="52" fill="url(#fx-glow)" opacity=".7"/>'+shape(q.kind)+'</g>';
  }
 }
 svg.innerHTML=html;state=mode;return visible;
}
function clear(){const svg=$('arWorld');if(svg){svg.innerHTML='';svg.style.display='none'}visible=[];state='idle'}
root.FrutaAROverlay={draw,clear,get targets(){return visible},get state(){return state}};
})(typeof window!=='undefined'?window:globalThis);
