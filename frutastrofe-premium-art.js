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
function prime(){let i=0;function step(){if(i>=keys.length)return;sprite(keys[i++]);setTimeout(step,18)}setTimeout(step,100)}
function poly(c,p,fill,stroke,w=2){if(p.some(x=>!x))return false;c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();c.fillStyle=fill;c.fill();c.lineWidth=w;c.strokeStyle=stroke;c.stroke();return true}
function drawDeck(c,pos,t){
 const coords=[[-2.28,-1.55],[2.28,-1.55],[2.52,-.9],[2.52,.95],[2.24,1.55],[-2.24,1.55],[-2.52,.95],[-2.52,-.9]];
 const p=coords.map(([x,z])=>pos(x,-.075,z)),q=coords.map(([x,z])=>pos(x,-.29,z));if(p.some(x=>!x))return false;
 c.save();c.lineJoin='round';
 for(let i=2;i<6;i+=2)if(q[i]&&q[i+1])poly(c,[p[i],p[i+1],q[i+1],q[i]],'#0a182d','#236485',1.4);
 const v=grad(c,p[0].x,p[0].y,p[5].x,p[5].y,'rgba(86,122,145,.92)','rgba(26,48,74,.92)','rgba(7,18,39,.95)');
 poly(c,p,v,'#2c506a',8);c.shadowColor='#45d9db';c.shadowBlur=8;
 poly(c,p,'rgba(0,0,0,0)','#60f6dd',3);c.shadowBlur=0;
 c.save();c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();c.clip();
 for(let x=-2;x<=2;x++){const a=pos(x,-.069,-1.5),b=pos(x,-.069,1.5);if(a&&b){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle='rgba(108,191,214,.22)';c.lineWidth=1;c.stroke()}}
 for(let z=-1;z<=1;z++){const a=pos(-2.4,-.069,z),b=pos(2.4,-.069,z);if(a&&b){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle='rgba(108,191,214,.22)';c.stroke()}}
 c.restore();
 for(let i=0;i<8;i++){const a=p[i],b=p[(i+1)%8];disc(c,(a.x+b.x)/2,(a.y+b.y)/2,3,i%2?'#fff2ae':'#8bffe5')}
 c.restore();return true;
}
function drawPortal(c,pos,t){
 const ring=[];for(let i=0;i<=40;i++){const a=i*TAU/40;ring.push(pos(Math.cos(a)*2.4,9.46+.1*Math.sin(a*3),-.32+Math.sin(a)*.64))}
 c.save();c.beginPath();let prev=false;for(const p of ring){if(!p){prev=false;continue}prev?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);prev=true}
 c.lineWidth=12;c.strokeStyle='rgba(51,234,231,.23)';c.stroke();c.lineWidth=4;c.strokeStyle='#9bffee';c.stroke();
 c.lineWidth=2;c.setLineDash([14,13]);c.lineDashOffset=-t*38;c.strokeStyle='#e4ff99';c.stroke();c.setLineDash([]);
 const cp=pos(0,9.46,-.32);if(cp&&cp.y>-90&&cp.y<innerHeight+90){
  const g=c.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,72);g.addColorStop(0,'rgba(230,255,211,.7)');g.addColorStop(.33,'rgba(55,233,217,.25)');g.addColorStop(1,'rgba(44,212,242,0)');
  disc(c,cp.x,cp.y,72,g);
  c.fillStyle='#ecfff8';c.textAlign='center';c.font='900 10px system-ui';c.fillText('JUICE GATE',cp.x,cp.y-28)
 }c.restore()
}
function installGun(){
 const el=document.getElementById('weapon');if(!el||el.dataset.v3)return;
 el.dataset.v3='1';
 el.innerHTML=[
 '<svg viewBox="0 0 240 335" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>',
 '<linearGradient id="jbx" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#cde5f0"/><stop offset=".17" stop-color="#708eaa"/><stop offset=".43" stop-color="#203f61"/><stop offset=".71" stop-color="#11253f"/><stop offset="1" stop-color="#071426"/></linearGradient>',
 '<linearGradient id="jbc" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#faffeb"/><stop offset=".30" stop-color="#91fff0"/><stop offset=".61" stop-color="#25d2d4"/><stop offset="1" stop-color="#237bb7"/></linearGradient>',
 '<linearGradient id="jbg" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#e6ffa4"/><stop offset=".4" stop-color="#b3f65a"/><stop offset="1" stop-color="#668e36"/></linearGradient>',
 '<radialGradient id="jbm"><stop stop-color="#ffffff"/><stop offset=".2" stop-color="#f2ff9d"/><stop offset=".58" stop-color="#46f7db"/><stop offset="1" stop-color="#235d95"/></radialGradient>',
 '<radialGradient id="jbf"><stop stop-color="#ffffff" stop-opacity=".99"/><stop offset=".25" stop-color="#a0ffe8" stop-opacity=".85"/><stop offset=".6" stop-color="#4deaff" stop-opacity=".28"/><stop offset="1" stop-color="#19baf9" stop-opacity="0"/></radialGradient>',
 '</defs><g class="jb-body">',
 '<path d="M103 156L171 165L204 277Q197 320 154 331L127 298L97 222Z" fill="#091529" stroke="#7a9bb1" stroke-width="3"/>',
 '<path d="M122 194L158 190L184 285Q172 312 153 310L130 284L107 227Z" fill="url(#jbx)" stroke="#aacdd5" stroke-width="2"/>',
 '<path d="M130 229L175 218M135 249L179 241M144 266L187 260M150 285L189 277" stroke="#0c223c" stroke-width="5" opacity=".75"/>',
 '<path d="M77 88L159 69L203 112L199 190L162 235L95 228L50 182L54 124Z" fill="url(#jbx)" stroke="#b1d4df" stroke-width="3"/>',
 '<path d="M81 119L155 100L181 127L175 184L151 206L86 193L75 159Z" fill="#0a2948" stroke="#4f7c9a" stroke-width="2"/>',
 '<path d="M91 128L161 114L171 149L91 166Z" fill="url(#jbc)" stroke="#c8ffe5" stroke-width="2"/>',
 '<path d="M95 171L160 157L169 176L99 191Z" fill="url(#jbg)" stroke="#efffd5" stroke-width="2"/>',
 '<path d="M102 134L151 122M110 144L158 130" stroke="#fafff0" stroke-width="2" opacity=".60"/>',
 '<path d="M49 123L73 104L95 116L103 180L79 197L46 165Z" fill="url(#jbx)" stroke="#88b3d1" stroke-width="3"/>',
 '<circle cx="72" cy="145" r="17" fill="#0c2941" stroke="#75fff1" stroke-width="3"/><circle cx="72" cy="145" r="7" fill="url(#jbm)"/>',
 '<path d="M145 207L180 196L175 225L148 229Z" fill="#0e4c63" stroke="#7ef4de" stroke-width="2"/>',
 '<path d="M159 206L154 218L168 215L157 228" stroke="#f0ffa2" stroke-width="4" fill="none"/>',
 '<path d="M99 40L158 36L172 103L91 113Z" fill="url(#jbx)" stroke="#c2e4ee" stroke-width="4"/>',
 '<path d="M106 49L149 47L156 96L100 100Z" fill="#0f2947"/><path d="M109 58L145 56M111 75L149 72M113 90L152 87" stroke="url(#jbc)" stroke-width="4"/>',
 '<ellipse cx="129" cy="39" rx="37" ry="17" fill="#091e34" stroke="#b8d9eb" stroke-width="5"/>',
 '<ellipse cx="129" cy="38" rx="28" ry="13" fill="#174f6c" stroke="#52f1d9" stroke-width="3"/>',
 '<ellipse cx="129" cy="37" rx="17" ry="9" fill="url(#jbm)"/>',
 '<ellipse id="gunFlash" cx="129" cy="34" rx="56" ry="59" fill="url(#jbf)" opacity="0"/>',
 '<path d="M61 196L85 188L94 230L78 243L58 228Z" fill="#10283f" stroke="#5ad2e1" stroke-width="3"/>',
 '<path d="M69 206L83 202L85 226L72 231Z" fill="#b8ff8b" stroke="#dfffca" stroke-width="1.5"/>',
 '<path d="M92 112L117 105" stroke="#eefcff" stroke-width="3" opacity=".7"/>',
 '</g></svg><div class="gun-name">JUICE <b>BLASTER MK II</b> <span>∞</span></div>'
 ].join('');
}
root.FrutaPremiumArt={sprite,prime,drawDeck,drawPortal,installGun,stats:()=>({spriteCount:cache.size})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installGun();prime()},{once:true});else{installGun();prime()}
})(typeof window!=='undefined'?window:globalThis);
