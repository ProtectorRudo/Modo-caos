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
   const side=size*2+.12,z=-1.78,roof=.985;
   // One continuous premium frame. No duplicate old truss crossing the DJ.
   for(const sign of [-1,1]){
    const x=sign*side;
    cuboid(mesh,x,.018,z,.105,.034,.145,S,M,1);
    beam([x,.035,z],[x,roof,z],.015,[.18,.26,.32]);
    beam([x-sign*.027,.035,z],[x-sign*.027,roof,z],.006,[.41,.49,.54]);
    for(let j=0;j<3;j++){
     const yy=.22+j*.22;
     beam([x,yy,z],[x-sign*.027,yy+.19,z],.004,[.39,.45,.52]);
    }
   }
   // The imported CC0 truss replaces rather than overlaps the procedural roof.
   if(!props?.drawPart('truss',mesh,surface,{scale:.445,offset:[0,roof-.085,z]})){
    beam([-side,roof,z],[side,roof,z],.019,M);
    beam([-side,roof-.047,z],[side,roof-.047,z],.008,[.47,.55,.62]);
   }
   for(const sign of [-1,1]){
    const x=sign*(side-.21),col=sign>0?C:P;
    if(!props?.has('moving-head')){
     cuboid(mesh,x,roof-.111,z+.055,.065,.056,.076,S,M,1);
    }
    annulus(illum,x,roof-.13,z+.104,.023,.031,col,.25+.43*pulse,16,true);
    if(quality>0){
     // Low-cost simulated spotlight fans stop BEHIND the note spawn.
     const shake=Math.sin(t*.92+sign*.70)*.065;
     surface(illum,[x-.012,roof-.155,z+.096],[x+.012,roof-.155,z+.096],
       [sign*.17+shake,.48,-1.475],[sign*.04+shake,.48,-1.475],
       col,.025+.055*pulse,3);
    }
   }
  }
  function ledWall(t,low,mid,combo,quality){
   // Dim center / energized edges: the DJ horse stays readable against an
   // animated music-wave background, not an overexposed checkerboard.
   const y=.705,z=-1.873,w=.78,h=.405;
   if(!props?.drawPart('led-panel',mesh,surface,[
    {scale:.395,offset:[-.198,.500,-1.925]},
    {scale:.395,offset:[ .198,.500,-1.925]}
   ]))cuboid(mesh,0,y,z,w,h,.030,[.035,.065,.10],M,1);
   // A dark central niche gives proper foreground / background separation.
   cuboid(mesh,0,.690,z+.045,.288,.365,.006,[.011,.024,.049],[.027,.036,.064],1);
   const cols=quality===0?12:18,rows=quality===0?5:7;
   for(let i=0;i<cols;i++){
    const x=(i+.5-cols/2)*w*.91/cols;
    const edge=Math.min(1,Math.abs(x)/(.35));
    const wave=.5+.5*Math.sin(t*3.65+i*.64);
    const envelope=(.17+.44*low+.22*mid)+.18*wave;
    const raised=Math.min(rows,Math.ceil(envelope*rows));
    for(let j=0;j<rows;j++){
     const yy=y-h*.41+j*h*.82/(rows-1);
     const beat=.5+.5*Math.sin(t*6.2+i*.6+j*.33);
     const col=(i+j)%6===0?P:i%5===0?V:C;
     const on=j<=raised;
     const alpha=(on?.13+.19*beat:.045)*(.20+.80*edge);
     cuboid(illum,x,yy,z+.062,w*.61/cols,h*.47/rows,.006,col,col,alpha,3);
    }
   }
   // Thin continuous waveform, travelling from the center to the edges.
   for(let sign of [-1,1])for(let i=0;i<7;i++){
    const x=sign*(.16+i*.029),amp=.015+.021*low;
    const yy=.69+amp*Math.sin(t*6.8+i*.73+sign);
    cuboid(illum,x,yy,z+.067,.014,.010,.008,sign>0?C:P,
     sign>0?C:P,.26+.26*low,3);
   }
   if(combo>=10){
    const c=combo>=25?P:C;
    for(const sign of [-1,1])
     cuboid(illum,sign*.366,y,z+.070,.010,.355,.006,c,c,
      Math.min(.83,.32+combo*.009),3);
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
   // Match x to the real stage width: speakers stand ON grounded plinths.
   const positions=[-1,1].map(sign=>({x:sign*(size*2+.125),z:-1.56,sign}));
   for(const {x,z,sign} of positions){
    cuboid(mesh,x,.020,z,.190,.040,.223,[.030,.044,.066],[.24,.32,.38],1);
    cuboid(mesh,x,.242,z-.028,.035,.43,.035,S,M,1);
    // Bracket visibly connecting upper cabinet to the post.
    beam([x,.200,z-.09],[x,.326,z-.09],.009,[.35,.43,.50]);
   }
   const subs=positions.map(({x,z})=>({scale:.21,offset:[x,.038,z]}));
   const mids=positions.map(({x,z})=>({scale:.19,offset:[x,.252,z]}));
   const sub=props?.drawPart('speaker-sub',mesh,surface,subs);
   const mid=props?.drawPart('speaker-mid',mesh,surface,mids);
   if(!sub||!mid)for(const {x,z} of positions){
    if(!sub)cuboid(mesh,x,.105,z,.166,.178,.153,S,M,1);
    if(!mid)cuboid(mesh,x,.302,z,.153,.142,.142,S,M,1);
   }
   for(const {x,z,sign} of positions)for(const y of [.139,.329]){
    annulus(illum,x,y,z+.100,.028,.038,sign<0?P:C,
      Math.min(.77,.24+.33*low),18,true);
   }
  }
  function render(size,t,game,a){
   if(!Number.isFinite(size)||size<.18||size>.40||!Number.isFinite(t))return;
   const quality=getQuality(),low=clamp(a.low||0,0,1),mid=clamp(a.mid||0,0,1);
   const combo=game?.combo||0,pulse=clamp((low+mid)*.63,0,1);
   // Strictly scenery behind z=-1.15. Never edit board mesh/note physics.
   const stageZ=-1.57,stageWidth=size*4+.29;
   // Fake ground-contact shadow with a clearly elevated, solid dark riser.
   cuboid(mesh,0,.008,stageZ,stageWidth+.12,.016,.645,
    [.023,.034,.050],[.072,.09,.12],.70,1);
   cuboid(mesh,0,.047,stageZ,stageWidth,.080,.585,
    [.026,.038,.058],[.25,.31,.36],1,1);
   cuboid(illum,0,.092,-1.268,stageWidth-.04,.008,.009,
    [.05,.72,.90],C,.43+.14*low,3);
   // CC0 riser supplies structural details but stays under the rest.
   if(quality>0)props?.drawPart('riser',mesh,surface,{scale:[.34,.21,.36],offset:[0,.011,stageZ]});
   ledWall(t,low,mid,combo,quality);
   if(quality>0)props?.drawPart('led-magenta',mesh,surface,
    {scale:.28,offset:[-.275,.508,-1.952]});
   truss(size,t,pulse,quality);
   if(quality>0){
    props?.drawPart('moving-head',mesh,surface,[
     {scale:.18,offset:[-.31,.786,-1.78]},
     {scale:.18,offset:[ .31,.786,-1.78]}
    ]);
    props?.drawPart('strobe',mesh,surface,{scale:.22,offset:[0,.91,-1.77]});
   }
   stacks(size,low,quality);
   if(!props?.drawCharacter(mesh,surface,t,low,quality,combo))
    avatar(t,low,mid,combo);
   horseHead(t,low,combo,quality);
   // Bomber collar, neckline, zipper and ribbing are visible against the LCD.
   const bob=Math.sin(t*5.2)*(.004+.007*low);
   for(const sign of [-1,1]){
    const neon=sign<0?P:C;
    beam([sign*.10,.625+bob,-1.50],[sign*.037,.591+bob,-1.469],
      .009,[.13,.19,.27]);
    beam([sign*.174,.43+bob,-1.44],[sign*.168,.335+bob,-1.399],
      .004,neon);
    // Hands stay close to the mixer/CDJ wheels, not stretched sideways.
    ball(sign*.169,.338+bob,-1.408,.014,[.63,.38,.25],8,5);
    annulus(illum,sign*.167,.346+bob,-1.396,.010,.017,neon,
      .36+.26*low,12,true);
   }
   beam([0,.592+bob,-1.463],[0,.414+bob,-1.455],.004,
    [.48,.56,.68]);
   // Existing authentic desk/mixer: slightly lower so controller faces show.
   if(props?.ready()){
    props.draw(mesh,surface);
    if(!(props.drawPart('cdj',mesh,surface,[
      {scale:.295,offset:[-.171,.314,-1.438]},
      {scale:.295,offset:[ .171,.314,-1.438]}
    ]) || props.drawPart('turntable',mesh,surface,[
      {scale:.28,offset:[-.171,.314,-1.438]},
      {scale:.28,offset:[ .171,.314,-1.438]}
    ]))){
      for(const x of [-.171,.171]){
       annulus(mesh,x,.342,-1.438,.050,.064,M,1,20);
       disc(illum,x,.345,-1.438,.045,C,.39+.19*low,20);
      }
    }
   }else decks(t,low,quality);
   // Narrow dark facade, ~34% shorter than V31; controls remain visible.
   const facade=props?.drawPart('facade',mesh,surface,{
    scale:[.36,.235,.35],offset:[0,-.016,-1.283]});
   if(!facade)cuboid(mesh,0,.066,-1.28,.54,.145,.045,S,M,1);
   cuboid(illum,0,.147,-1.256,.46,.009,.008,P,P,.39+.20*low,3);
   if(quality>0){
    props?.drawPart('laptop',mesh,surface,{scale:.19,offset:[-.255,.315,-1.62]});
    props?.drawPart('headphones',mesh,surface,{scale:.17,offset:[.249,.323,-1.47]});
    props?.drawPart('monitor',mesh,surface,{scale:.18,offset:[.31,.106,-1.66]});
    props?.drawPart('laser',mesh,surface,{scale:.19,offset:[-.395,.103,-1.78]});
    props?.drawPart('smoke',mesh,surface,{scale:.17,offset:[.400,.102,-1.79]});
   }
   if(combo>=10){
    for(const sign of [-1,1]){
     const c=combo>=25?P:C;
     cuboid(illum,sign*(size*2+.06),.095,stageZ,.007,.013,.48,
       c,c,.20+.35*pulse,3);
    }
   }
   if(combo>=50&&quality>0){
    // Sparse light flakes behind the DJ; avoid a screen-wide particle storm.
    for(let i=0;i<12;i++){
     const x=Math.sin(i*3.9+t*.87)*.43,yy=.70+.22*Math.sin(t*.93+i*2.6);
     cuboid(illum,x,yy,-1.96,.009,.013,.007,i%2?P:C,
      i%2?P:C,.25+.22*Math.sin(t*5.4+i)**2,3);
    }
   }
  }
  return{render,version:'HORSE DJ V32'};
 }
 root.RitmoExterior={create,version:'HORSE DJ V32'};
})(window);