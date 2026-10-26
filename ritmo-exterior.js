'use strict';
/* RITMO CAOS — exterior espacial con DJ 3D. No modifica piso, notas, botones ni AR.
 * Diseñado para un solo batch WebGL1 y el MISMO anclaje de la pista; sin CDNs
 * externos ni descargas del usuario. CC0 assets pueden sumarse más adelante.
 */
(function(root){
 function create(api){
  const {mesh,illum,surface,cuboid,annulus,disc,getQuality}=api;
  const M=[.28,.37,.46],S=[.014,.025,.046],C=[.08,.84,1],P=[1,.19,.46],V=[.48,.21,1],W=[.85,.95,1];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Locally vendored CC0 props are optional; procedural DJ booth remains fallback.
  const props=root.RitmoImportedProps?.create();
  function ball(x,y,z,r,color,seg=10,rings=7){
   for(let j=0;j<rings;j++){
    const th=j*Math.PI/rings,ph=(j+1)*Math.PI/rings;
    for(let i=0;i<seg;i++){
     const a=i*2*Math.PI/seg,b=(i+1)*2*Math.PI/seg;
     const pos=(v,u)=>[x+r*Math.sin(v)*Math.cos(u),y+r*Math.cos(v),z+r*Math.sin(v)*Math.sin(u)];
     surface(mesh,pos(th,a),pos(th,b),pos(ph,b),pos(ph,a),color,1,0);
    }
   }
  }
  function beam(A,B,r,c){
   const d=B.map((p,i)=>p-A[i]),m=Math.hypot(...d);
   if(m<.001)return;
   const n=d.map(p=>p/m),ref=Math.abs(n[1])>.92?[1,0,0]:[0,1,0];
   let u=[n[1]*ref[2]-n[2]*ref[1],n[2]*ref[0]-n[0]*ref[2],n[0]*ref[1]-n[1]*ref[0]];
   const len=Math.hypot(...u);u=u.map(p=>p/len);
   const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
   const point=(p,a)=>p.map((q,i)=>q+r*(u[i]*Math.cos(a)+v[i]*Math.sin(a)));
   for(let i=0;i<7;i++){
    const a=i*2*Math.PI/7,b=(i+1)*2*Math.PI/7;
    surface(mesh,point(A,a),point(A,b),point(B,b),point(B,a),c,1,0);
   }
  }
  function led(x,y,z,c,r=.008){cuboid(illum,x,y,z,r,r,.006,c,c,.85,3)}
  function truss(size,t,pulse,quality){
   const side=2*size+.15,z=-1.79,top=1.04;
   for(const s of [-1,1]){
    const x=s*side;
    beam([x,.03,z],[x,top,z],.013,M);
    beam([x-s*.03,.03,z],[x-s*.03,top,z],.006,W);
    for(let i=0;i<5;i++){
     const h=.10+i*.17;
     beam([x,h,z],[x-s*.03,h+.17,z],.004,M);
     beam([x-s*.03,h,z],[x,h+.17,z],.004,W);
    }
    cuboid(mesh,x,.02,z,.09,.03,.12,S,M);
   }
   beam([-side,top,z],[side,top,z],.016,M);
   beam([-side,top-.065,z],[side,top-.065,z],.008,W);
   for(let j=0;j<7;j++){
    const x=-side+j*side/3;
    beam([x,top-.065,z],[x+.047,top,z],.004,M);
   }
   for(const s of [-1,1]){
    for(const x of [s*(side-.12),s*(side-.32)]){
     cuboid(mesh,x,top-.16,z+.06,.073,.076,.065,S,M);
     annulus(illum,x,top-.105,z+.10,.022,.030,s>0?C:P,.47+.36*pulse,18,true);
     if(quality){
      const sway=Math.sin(t*1.4+x*7)*.15;
      // Light fan remains behind the spawn line, never obstructs receptors.
      surface(illum,[x-.02,top-.11,z+.11],[x+.02,top-.11,z+.11],
        [x+sway+.10,.19,z+.39],[x+sway-.10,.19,z+.39],s>0?C:V,.04+.08*pulse,3);
     }
    }
   }
  }
  function ledWall(t,low,mid,combo,quality){
   const x=0,y=.695,z=-1.86,w=.72,h=.47;
   cuboid(mesh,x,y,z,w,h,.025,S,M);
   cuboid(mesh,x,y,z+.018,w-.022,h-.024,.009,[.014,.036,.068],[.021,.055,.096]);
   const N=quality?15:9,rows=quality?8:5;
   for(let i=0;i<N;i++){
    const a=.19+.31*low+.17*mid+.22*(.5+.5*Math.sin(t*5.8+i*.92));
    const n=Math.max(1,Math.floor(a*rows));
    for(let j=0;j<n;j++){
     const xx=(i/(N-1)-.5)*w*.83,yy=y-h*.35+j*h*.64/rows;
     led(xx,yy,z+.026,i%3===0?C:i%3===1?P:V,quality?.008:.012);
    }
   }
   if(combo>=10)annulus(illum,0,y+.155,z+.030,.028,.038,combo>=30?P:C,.33+.25*low,20,true);
  }
  function decks(t,low,quality){
   const z=-1.35,y=.314;
   cuboid(mesh,0,.235,z,.59,.074,.247,S,M);
   cuboid(mesh,0,y-.005,z,.605,.014,.253,[.04,.07,.10],W);
   cuboid(mesh,0,.19,z+.11,.54,.095,.013,S,[.075,.10,.16]);
   cuboid(illum,0,.245,z+.118,.50,.015,.01,P,P,.61,3);
   for(const s of [-1,1]){
    const x=s*.18;
    cuboid(mesh,x,y,z,.208,.017,.194,S,[.08,.11,.15]);
    annulus(mesh,x,y+.016,z,.059,.070,M,1,24);
    disc(mesh,x,y+.021,z,.055,[.055,.065,.095],1,22);
    annulus(illum,x,y+.028,z,.040,.050,s<0?P:C,.61+.25*low,24);
    disc(mesh,x,y+.031,z,.013,W,1,14);
    beam([x,y+.033,z],[x+.028*Math.cos(t*1.5+s),y+.033,z+.028*Math.sin(t*1.5+s)],.003,W);
    for(let k=0;k<3;k++)led(x+s*.073,y+.039,z-.044+k*.030,k===1?P:C,.009);
   }
   cuboid(mesh,0,y,z,.10,.023,.185,[.055,.065,.10],M);
   if(quality)for(let k=0;k<4;k++){
    const x=(k-1.5)*.022;
    cuboid(mesh,x,y+.018,z-.038,.008,.02,.012,M,W);
    cuboid(illum,x,y+.038,z+.021,.009,.004,.039,k%2?C:P,k%2?C:P,.8,3);
   }
  }
  function avatar(t,low,mid,combo){
   const z=-1.53,bob=Math.sin(t*5.7)*(.005+.01*low);
   const raise=combo>=15?.17*(.5+.5*Math.sin(t*4.5)):0;
   // Articulated original humanoid DJ: shoes, jacket, face, glasses,
   // headphones, moving hands on turntables. Not screen-fixed or a 2D sprite.
   for(const s of [-1,1]){
    beam([s*.066,.17,z],[s*.066,.36,z],.035,[.075,.078,.14]);
    cuboid(mesh,s*.073,.163,z+.028,.074,.025,.12,S,M);
   }
   cuboid(mesh,0,.35+bob,z,.18,.23,.112,[.055,.070,.15],[.10,.065,.25]);
   cuboid(mesh,0,.425+bob,z+.062,.181,.12,.017,[.12,.07,.27],[.25,.09,.39]);
   for(const s of [-1,1]){
    const shoulder=[s*.11,.51+bob,z];
    const elbow=[s*(.157+.014*Math.sin(t*5+s)),.423+bob+raise*(s>0?.7:0),z+.025];
    const wrist=[s*(.113+.025*Math.cos(t*5.4+s)),.33+bob+raise*(s>0?1:0),z+.144];
    beam(shoulder,elbow,.029,[.044,.095,.20]);
    beam(elbow,wrist,.025,[.065,.12,.25]);
    ball(wrist[0],wrist[1],wrist[2],.022,[.80,.54,.39],8,5);
   }
   beam([0,.555+bob,z],[0,.635+bob,z],.026,[.79,.49,.34]);
   const h=.731+bob;
   ball(0,h,z,.074,[.79,.51,.37],14,9);
   ball(0,h+.042,z-.021,.072,[.045,.046,.075],12,6);
   cuboid(mesh,0,h+.078,z+.035,.147,.023,.091,[.04,.048,.079],M);
   cuboid(mesh,0,h+.062,z+.093,.17,.012,.046,[.04,.052,.087],M);
   ball(0,h-.01,z+.078,.013,[.68,.40,.27],8,5);
   for(const s of [-1,1]){
    cuboid(mesh,s*.035,h+.014,z+.073,.057,.026,.018,[.020,.087,.13],C,1,2);
    led(s*.035,h+.022,z+.087,C,.019);
    ball(s*.077,h+.016,z,.030,[.06,.065,.11],10,6);
    annulus(illum,s*.084,h+.016,z+.023,.016,.025,s===1?C:P,.60+.22*mid,16,true);
   }
   for(let j=1;j<10;j++){
    const a=Math.PI*(j-1)/9,b=Math.PI*j/9;
    beam([.083*Math.cos(a),h+.024+.083*Math.sin(a),z],
      [.083*Math.cos(b),h+.024+.083*Math.sin(b),z],.007,W);
   }
   beam([-.080,.55+bob,z+.058],[0,.562+bob,z+.059],.007,P);
   beam([0,.562+bob,z+.059],[.080,.55+bob,z+.058],.007,C);
  }
  function stacks(size,low,quality){
   for(const s of [-1,1]){
    const x=s*(size*2+.245),z=-1.44;
    cuboid(mesh,x,.018,z,.159,.311,.164,S,M);
    cuboid(mesh,x,.055,z+.087,.135,.255,.005,[.04,.055,.087],S);
    for(const y of [.113,.229]){
     annulus(mesh,x,y,z+.091,.032,.052,M,.98,18,true);
     disc(mesh,x,y,z+.093,.029,[.039,.056,.085],1,18,true);
     annulus(illum,x,y,z+.099,.036,.048,s>0?C:V,.50+.30*low,18,true);
     disc(illum,x,y,z+.096,.015,C,.19+.35*low,16,true);
    }
    if(quality)for(let k=0;k<3;k++)led(x-s*.068,.07+k*.082,z+.089,C,.010);
   }
  }
  function render(size,t,game,a){
   if(!Number.isFinite(size)||size<.18||size>.40||!Number.isFinite(t))return;
   const quality=getQuality(),low=clamp(a.low||0,0,1),mid=clamp(a.mid||0,0,1);
   const pulse=clamp((low+mid)*.63,0,1);
   // All added geometry is BEHIND the back edge (z < -1.15), or outside
   // the four-lane board. Existing note targets and collision rules unchanged.
   ledWall(t,low,mid,game?.combo||0,quality);
   truss(size,t,pulse,quality);
   stacks(size,low,quality);
   avatar(t,low,mid,game?.combo||0);
   if(!props?.draw(mesh,surface))decks(t,low,quality);
   if(quality)for(const s of [-1,1]){
    const x=s*(2*size+.36),z=-1.67;
    cuboid(mesh,x,.014,z,.052,.41,.066,S,M);
    for(let j=0;j<5;j++)cuboid(illum,x,.07+j*.071,z+.039,.021,.028,.008,j%2?P:C,j%2?P:C,.24+.37*pulse,3);
   }
  }
  return{render,version:'DJ LIVE V29'};
 }
 root.RitmoExterior={create,version:'DJ LIVE V29'};
})(window);