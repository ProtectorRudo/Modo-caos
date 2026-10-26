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
   // Bright, layered LED wall instead of the previous giant unlit black box.
   // Two real GLB panel frames add depth; emissive visuals remain shader-driven.
   const y=.70,z=-1.84,w=.80,h=.43;
   if(!props?.drawPart('led-panel',mesh,surface,[
    {scale:.41,offset:[-.203,.485,-1.910]},
    {scale:.41,offset:[ .203,.485,-1.910]}
   ])){
    cuboid(mesh,0,y,z,w,h,.025,[.035,.072,.12],M,1);
   }
   const cols=quality===0?10:14,rows=quality===0?6:8,seconds=t*1.48;
   for(let i=0;i<cols;i++){
    for(let j=0;j<rows;j++){
     const x=(i+.5-cols/2)*w*.89/cols;
     const yy=y+(j+.5-rows/2)*h*.87/rows;
     const wave=Math.sin(i*.69+j*.51-seconds*3.1);
     const surge=.5+.5*Math.sin(t*5.7+i*.79);
     const bass=low*.4+mid*.26;
     const power=.30+.32*surge+.26*wave*wave+.28*bass;
     const col=(i+j)%5===0?P:i%4===0?V:C;
     const shade=power*(j<=Math.round((.25+.55*surge)*(rows-1))?1:.32);
     cuboid(illum,x,yy,z+.054,w*.78/cols,h*.74/rows,.006,col,col,
      Math.min(.81,Math.max(.10,shade)),3);
    }
   }
   // Moving luminous signature; reacts to streaks without covering the DJ.
   for(let i=0;i<7;i++){
    const xx=(i-3)*.086;
    const lift=.032*Math.sin(t*7.4+i*.68);
    cuboid(illum,xx,y+.145+lift,z+.061,.038,.009,.007,i%2?C:P,
     i%2?C:P,.40+.31*low,3);
   }
   if(combo>=10){
    const intensity=Math.min(.9,.30+combo*.012);
    for(const sign of [-1,1]){
     cuboid(illum,sign*.365,y,z+.063,.011,.41,.007,combo>=25?P:C,
      combo>=25?P:C,intensity,3);
    }
   }
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
   // V30 DJ appearance polish: sculpted fringe, face, jacket seams and
   // color accents are real 3D geometry, not flat screen overlays.
   for(let i=-3;i<=3;i++){
    const x=i*.018;
    const hairY=h+.088+Math.cos(i*.38)*.007;
    beam([x,hairY,z+.041],[x+.008*Math.sin(t*.9+i),h+.044,z+.070],.008,[.035,.045,.074]);
   }
   for(const sign of [-1,1]){
    ball(sign*.082,h-.015,z+.005,.017,[.74,.45,.34],8,5);
    const shoulder=sign*.087;
    beam([shoulder,.515+bob,z+.06],[sign*.079,.404+bob,z+.066],
     .006,sign<0?P:C);
    cuboid(illum,sign*.071,.354+bob,z+.088,.011,.015,.006,
     sign<0?P:C,sign<0?P:C,.30+.32*mid,3);
    // Luminous bracelet moves with mixing hands.
    const wristX=sign*(.113+.025*Math.cos(t*5.4+sign));
    const wristY=.330+bob+(combo>=15?.17*(.5+.5*Math.sin(t*4.5))*(sign>0?1:0):0);
    ball(wristX,wristY+.014,z+.152,.011,sign<0?P:C,8,5);
   }
   // Backlit zipper, pocket shapes, and face expressions.
   cuboid(mesh,0,.428+bob,z+.073,.012,.095,.008,[.42,.52,.66],[.72,.79,.85]);
   for(const sign of [-1,1]){
    cuboid(mesh,sign*.049,.398+bob,z+.080,.041,.006,.008,[.21,.27,.45],M);
    cuboid(mesh,sign*.034,h-.042,z+.075,.024,.006,.005,[.29,.19,.22],M);
   }
   beam([-.019,h-.047,z+.079],[0,h-.054,z+.080],.003,[.20,.13,.13]);
   beam([0,h-.054,z+.080],[.019,h-.047,z+.079],.003,[.20,.13,.13]);
  }
  // 3D horse-head mask, styled for the Quaternius Punk character.
  // Not falsely attributed to Quaternius: the mask is original procedural art.
  function horseHead(t,low,combo,quality){
   const sway=.012*Math.sin(t*3.0),bob=Math.sin(t*5.4)*(.006+.010*low);
   const cy=.794+bob,cz=-1.535+sway;
   function oval(x,y,z,rx,ry,rz,c){
    const rings=quality===0?6:9,N=quality===0?9:14;
    for(let j=0;j<rings;j++){
     const a=Math.PI*j/rings,b=Math.PI*(j+1)/rings;
     const at=(v,u)=>[x+rx*Math.sin(v)*Math.cos(u),y+ry*Math.cos(v),z+rz*Math.sin(v)*Math.sin(u)];
     for(let k=0;k<N;k++){
      const v=2*Math.PI*k/N,w=2*Math.PI*(k+1)/N;
      surface(mesh,at(a,v),at(a,w),at(b,w),at(b,v),c,1,0);
     }
    }
   }
   const brown=[.52,.29,.16],light=[.72,.44,.27],dark=[.075,.055,.071];
   // Elongated horse face (NOT a round sphere with two extra ears).
   oval(0,cy,cz,.092,.123,.098,brown);
   oval(0,cy-.078,cz+.080,.073,.065,.115,light);
   oval(0,cy-.103,cz+.131,.069,.041,.091,[.66,.39,.29]);
   // Narrow forehead stripe + separated nostrils + mouth silhouette.
   beam([0,cy+.105,cz+.073],[0,cy-.058,cz+.168],.008,[.91,.79,.62]);
   for(const k of [-1,1]){
    oval(k*.045,cy-.103,cz+.207,.017,.012,.009,dark);
    oval(k*.049,cy+.019,cz+.094,.017,.021,.011,[.015,.024,.032]);
    oval(k*.048,cy+.026,cz+.106,.005,.006,.005,[.83,.96,1]);
    const x=k*.066;
    // Sharp ear pairs, rose inner cartilage and outer brown shell.
    surface(mesh,[x-.023,cy+.090,cz-.020],[x+.026,cy+.090,cz-.020],
      [x+k*.009,cy+.206,cz-.025],[x+k*.009,cy+.206,cz-.025],brown,1,0);
    surface(mesh,[x-.010,cy+.109,cz+.008],[x+.011,cy+.109,cz+.008],
      [x+k*.008,cy+.183,cz-.012],[x+k*.008,cy+.183,cz-.012],P,.66,2);
    oval(k*.091,cy-.006,cz-.006,.026,.039,.036,dark);
    annulus(illum,k*.097,cy,cz+.022,.023,.036,k>0?C:P,.69+.19*low,14,true);
   }
   // Dark mane: individual 3D locks flowing backwards from the crown.
   for(let i=0;i<6;i++){
    const x=(i-2.5)*.021;
    beam([x,cy+.119,cz-.063],[x*.89,cy+.063+i*.006,cz-.13],
      .009,dark);
   }
   // Headphone band, independent of skull topology.
   for(let i=1;i<10;i++){
    const aa=Math.PI*(i-1)/10,bb=Math.PI*i/10;
    beam([.103*Math.cos(aa),cy+.020+.128*Math.sin(aa),cz-.02],
     [.103*Math.cos(bb),cy+.020+.128*Math.sin(bb),cz-.02],
     .010,[.26,.35,.42]);
   }
   // Neon collar fits the character's real neck rather than floating.
   cuboid(mesh,0,cy-.154,cz-.008,.123,.023,.083,dark,[.14,.16,.24]);
   cuboid(illum,0,cy-.128,cz+.042,.119,.012,.007,combo>=20?P:C,
    combo>=20?P:C,.35+.26*low,3);
  }
  function stacks(size,low,quality){
   const positions=[-1,1].map(s=>({
     x:s*(size*2+.21),z:-1.54,s
   }));
   const sub=positions.map(({x,z})=>({scale:.22,offset:[x,.026,z]}));
   const mid=positions.map(({x,z})=>({scale:.22,offset:[x,.269,z]}));
   const okSub=props?.drawPart('speaker-sub',mesh,surface,sub);
   const okMid=props?.drawPart('speaker-mid',mesh,surface,mid);
   if(!okSub||!okMid)for(const {x,z,s} of positions){
     if(!okSub)cuboid(mesh,x,.03,z,.16,.22,.16,S,M);
     if(!okMid)cuboid(mesh,x,.258,z,.15,.17,.14,S,M);
   }
   // Visible bass pulse even though the physical GLB driver is rigid.
   for(const {x,z,s} of positions)for(const y of [.14,.355])
    annulus(illum,x,y,z+.092,.024,.036,s<0?P:C,
      Math.min(.72,.27+.42*low),18,true);
  }
  function render(size,t,game,a){
   if(!Number.isFinite(size)||size<.18||size>.40||!Number.isFinite(t))return;
   const quality=getQuality(),low=clamp(a.low||0,0,1),mid=clamp(a.mid||0,0,1);
   const combo=game?.combo||0,pulse=clamp((low+mid)*.63,0,1);
   // Only scenery outside the -1.15m spawn line. Gameplay geometry untouched.
   // Ground-contact stage shadow and a real modular riser, fully BEHIND the lanes.
   cuboid(mesh,0,.002,-1.57,size*4+.24,.007,.76,[.028,.039,.060],[.061,.068,.090],.55);
   props?.drawPart('riser',mesh,surface,{scale:.34,offset:[0,.011,-1.57]});
   ledWall(t,low,mid,combo,quality);
   // Mix actual magenta/cyan modular panels with animated low-opacity VFX.
   props?.drawPart('led-magenta',mesh,surface,{scale:.32,offset:[-.24,.495,-1.932]});
   truss(size,t,pulse,quality);
   if(quality>0){
    props?.drawPart('truss',mesh,surface,{scale:.45,offset:[0,.87,-1.815]});
    props?.drawPart('moving-head',mesh,surface,[
     {scale:.22,offset:[-.36,.785,-1.72]},
     {scale:.22,offset:[ .36,.785,-1.72]}
    ]);
    props?.drawPart('strobe',mesh,surface,{scale:.30,offset:[0,.922,-1.745]});
   }
   stacks(size,low,quality);
   // Production Quaternius torso, animated by the existing native renderer.
   // Keep procedural torso temporarily if a device cannot decode the model.
   if(!props?.drawCharacter(mesh,surface,t,low,quality))avatar(t,low,mid,combo);
   horseHead(t,low,combo,quality);
   if(props?.ready()){
    props.draw(mesh,surface); // original desk and mixer, unchanged proven GLBs
    if(!(props.drawPart('cdj',mesh,surface,[
     {scale:.29,offset:[-.171,.314,-1.443]},
     {scale:.29,offset:[ .171,.314,-1.443]}
    ]) || props.drawPart('turntable',mesh,surface,[
     {scale:.30,offset:[-.171,.314,-1.443]},
     {scale:.30,offset:[ .171,.314,-1.443]}
    ]))){
     for(const x of [-.17,.17]){
      annulus(mesh,x,.34,-1.443,.050,.064,M,1,20);
      disc(illum,x,.345,-1.443,.044,C,.40+.23*low,20);
     }
    }
   }else decks(t,low,quality);
   const facade=props?.drawPart('facade',mesh,surface,{scale:.36,offset:[0,.012,-1.282]});
   if(!facade)cuboid(mesh,0,.028,-1.275,.53,.227,.036,S,M,1);
   // Accessories stay beside the controls, away from the horse-face silhouette.
   if(quality>0){
    props?.drawPart('laptop',mesh,surface,{scale:.24,offset:[-.255,.336,-1.596]});
    props?.drawPart('headphones',mesh,surface,{scale:.18,offset:[.248,.329,-1.411]});
    props?.drawPart('monitor',mesh,surface,{scale:.22,offset:[.319,.056,-1.470]});
    props?.drawPart('laser',mesh,surface,{scale:.22,offset:[-.39,.08,-1.715]});
    props?.drawPart('smoke',mesh,surface,{scale:.20,offset:[.39,.08,-1.715]});
   }
   // Illuminated facia aligned with the genuine desk; no second podium crossing DJ.
   cuboid(illum,0,.201,-1.251,.46,.013,.006,P,P,.45+.26*low,3);
   if(combo>=20){
    const cc=combo>=50?P:C;
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const x=side*(size*2+.43),y=.20+i*.11,z=-1.65;
      cuboid(illum,x,y,z,.018,.037,.009,cc,cc,
       Math.min(.8,.30+combo*.007),3);
    }
   }
  }
  return{render,version:'HORSE DJ V31'};
 }
 root.RitmoExterior={create,version:'HORSE DJ V31'};
})(window);