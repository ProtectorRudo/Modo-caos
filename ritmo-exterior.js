'use strict';
/* RITMO CAOS — exterior espacial con DJ 3D. No modifica piso, notas, botones ni AR.
 * Diseñado para un solo batch WebGL1 y el MISMO anclaje de la pista; sin CDNs
 * externos ni descargas del usuario. CC0 assets pueden sumarse más adelante.
 */
(function(root){
 function create(api){
  const {mesh,illum,getQuality}=api;
  // Scenery-only spatial recession. Score lane back edge is z=-1.15;
  // a 22 cm empty depth gap keeps arriving notes clear of the facade.
  // The AR board, hit tests, camera and pads are not translated.
  const BACK=.22;
  const move=p=>[p[0],p[1],p[2]-BACK];
  const surface=(dst,A,B,C,D,...rest)=>
    api.surface(dst,move(A),move(B),move(C),move(D),...rest);
  const cuboid=(dst,x,y,z,...rest)=>api.cuboid(dst,x,y,z-BACK,...rest);
  const annulus=(dst,x,y,z,...rest)=>api.annulus(dst,x,y,z-BACK,...rest);
  const disc=(dst,x,y,z,...rest)=>api.disc(dst,x,y,z-BACK,...rest);
  const M=[.28,.37,.46],S=[.014,.025,.046],C=[.08,.84,1],P=[1,.19,.46],V=[.48,.21,1],W=[.85,.95,1];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Locally vendored CC0 props are optional; procedural DJ booth remains fallback.
  const props=root.RitmoImportedProps?.create();
  const skeletal=root.RitmoSkeletalDJ?.create();
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
    // Compact concert lighting positioned above the display.
    const half=Math.min(.555,(size*4+.115)*.5+.037),z=-1.992,roof=1.635;
    for(const sign of [-1,1]){
      const x=sign*half;
      beam([x,.724,z],[x,roof,z],.011,[.17,.26,.34]);
      cuboid(mesh,x,.705,z,.035,.026,.068,[.14,.20,.27],[.28,.37,.43],1);
      annulus(illum,x,roof-.018,z+.033,.011,.023,sign<0?P:C,.32+.31*pulse,16,true);
    }
    beam([-half,roof,z],[half,roof,z],.013,[.35,.43,.51]);
    beam([-half,roof-.042,z+.032],[half,roof-.042,z+.032],.009,[.19,.28,.37]);
    for(const sign of [-1,1]){
      const x=sign*(half*.68),c=sign<0?P:C;
      cuboid(mesh,x,roof-.118,z+.072,.079,.090,.083,[.034,.053,.071],[.22,.29,.35],1);
      disc(mesh,x,roof-.080,z+.120,.023,[.075,.11,.16],1,16,true);
      annulus(illum,x,roof-.080,z+.124,.012,.023,c,.63+.20*pulse,16,true);
      if(quality>0){
        const sway=.085*Math.sin(t*.9+sign);
        surface(illum,[x-.020,roof-.097,z+.131],[x+.020,roof-.097,z+.131],
          [x+sway+.055,.99,-1.685],[x+sway-.055,.99,-1.685],c,.034+.038*pulse,3);
      }
    }
  }
   function ledWall(size,t,low,mid,combo,quality){
    // One elevated framed LED display, with no black central obstruction.
    const z=-1.952,w=Math.min(1.06,size*4+.115),base=.675,h=.835,half=w*.5;
    cuboid(mesh,0,base,z,w,h,.026,[.030,.046,.070],[.10,.17,.22],1);
    cuboid(mesh,0,base+.021,z+.020,w-.041,h-.044,.009,[.012,.030,.056],[.021,.049,.081],1);
    for(const sign of [-1,1]){
      cuboid(mesh,sign*(half-.010),base-.010,z+.037,.020,h+.028,.045,[.22,.32,.39],[.38,.53,.61],1);
      cuboid(illum,sign*(half-.024),base+.009,z+.048,.006,h-.018,.006,
        sign<0?P:C,sign<0?P:C,.26+.18*low,3);
    }
    for(const yy of [base-.014,base+h-.004])
      cuboid(mesh,0,yy,z+.041,w+.022,.022,.042,[.17,.25,.34],[.40,.51,.60],1);
    cuboid(illum,0,base+h+.004,z+.047,w-.065,.006,.006,C,C,.31+.17*low,3);
    const count=quality===0?18:28,usable=w*.84,barW=usable/count*.67;
    for(let i=0;i<count;i++){
      const x=(i+.5-count*.5)*(usable/count);
      const wave=.5+.5*Math.sin(i*.72+t*4.3),texture=.5+.5*Math.sin(t*3.2-i*.35);
      const energy=Math.min(1,.12+.48*low+.23*mid+.22*wave);
      const high=.088+.53*(.45*energy+.35*wave+.20*texture);
      const atten=.38+.62*Math.min(1,Math.abs(x)/(w*.28));
      const c=i%9===0?P:i%7===0?V:C,y=base+.067;
      cuboid(illum,x,y,z+.057,barW,high,.006,c,c,(.19+.40*energy)*atten,3);
      cuboid(illum,x,y+high+.014,z+.058,barW,.010,.006,W,W,.16+.18*low,3);
    }
    for(let j=0;j<3;j++)
      cuboid(illum,0,base+h-.122+j*.038,z+.059,w*.81-j*.067,.004,.007,
        j===1?P:C,j===1?P:C,.12+.10*mid,3);
    if(combo>=10)for(const sign of [-1,1]){
      const c=combo>=25?P:C;
      cuboid(illum,sign*(half-.034),base+.048,z+.065,.011,h-.090,.007,
        c,c,.25+.28*Math.min(1,combo/30),3);
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
  function fallbackBomber(t,low){
    const bob=Math.sin(t*5.2)*(.004+.007*low),z=-1.545;
    // Fallback is a real mixing pose: elbows close to the jacket, hands on
    // their turntables. Previous wide elbows visibly resembled hands on hips.
    cuboid(mesh,0,.455+bob,z,.206,.260,.105,
      [.045,.061,.097],[.10,.14,.21],1);
    for(const sign of [-1,1]){
      const phase=t*5.0+(sign>0?1.65:0),sweep=Math.sin(phase);
      const shoulder=[sign*.110,.585+bob,z+.012];
      const elbow=[sign*(.196+.006*sweep),.492+bob,z+.071];
      const hand=[sign*(.164+.013*sweep),.394+bob+.009*sweep,-1.403];
      beam(shoulder,elbow,.036,[.051,.079,.130]);
      beam(elbow,hand,.027,[.065,.099,.157]);
      cuboid(mesh,hand[0],hand[1]+.005,hand[2]-.012,
        .035,.021,.040,[.079,.11,.16],[.14,.18,.23],1);
      ball(hand[0],hand[1],hand[2]+.017,.018,[.68,.42,.27],8,5);
    }
  }
  // 3D horse-head mask, styled for the Quaternius Punk character.
  // Not falsely attributed to Quaternius: the mask is original procedural art.
  function horseHead(t,low,combo,quality){
   const sway=.012*Math.sin(t*3.0),bob=Math.sin(t*5.4)*(.006+.010*low);
   const cy=.794+bob,cz=-1.535+sway;
   function oval(x,y,z,rx,ry,rz,c){
    const rings=quality===0?9:14,N=quality===0?14:22;
    for(let j=0;j<rings;j++){
     const a=Math.PI*j/rings,b=Math.PI*(j+1)/rings;
     const at=(v,u)=>[x+rx*Math.sin(v)*Math.cos(u),y+ry*Math.cos(v),z+rz*Math.sin(v)*Math.sin(u)];
     for(let k=0;k<N;k++){
      const v=2*Math.PI*k/N,w=2*Math.PI*(k+1)/N;
      surface(mesh,at(a,v),at(a,w),at(b,w),at(b,v),c,1,0);
     }
    }
   }
   const brown=[.48,.278,.155],light=[.69,.425,.258],dark=[.065,.052,.072];
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
   // Sculpted muzzle and catchlights, anchored on the moving horse head.
   oval(0,cy-.117,cz+.208,.052,.021,.020,[.61,.35,.22]);
   for(const side of [-1,1]){
     oval(side*.044,cy-.107,cz+.226,.014,.009,.006,[.035,.030,.041]);
     oval(side*.051,cy+.028,cz+.119,.006,.007,.004,[.97,.99,1]);
     beam([side*.051,cy+.057,cz+.100],[side*.038,cy+.052,cz+.108],.004,[.23,.14,.10]);
     oval(side*.097,cy-.003,cz+.030,.026,.030,.030,[.025,.035,.054]);
     annulus(illum,side*.111,cy-.003,cz+.047,.025,.031,side<0?P:C,.44+.24*low,18,true);
   }
   beam([-.024,cy-.148,cz+.189],[0,cy-.153,cz+.197],.004,[.18,.095,.090]);
   beam([0,cy-.153,cz+.197],[.024,cy-.148,cz+.189],.004,[.18,.095,.090]);
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
    // V37 portrait-safe PA, inset to keep both cabinets fully visible.
    const stageW=Math.min(1.18,size*4+.16);
    const dx=Math.min(.422,stageW*.37),z=-1.688;
    for(const sign of [-1,1]){
      const x=sign*dx,c=sign<0?P:C;
      cuboid(mesh,x,.086,z,.164,.025,.198,[.024,.037,.056],[.22,.29,.37],1);
      for(const [bottom,h,r] of [[.111,.191,.049],[.302,.169,.039]]){
        cuboid(mesh,x,bottom,z,.149,h,.157,[.029,.041,.061],[.105,.157,.209],1);
        cuboid(mesh,x,bottom+.009,z+.081,.134,h-.018,.009,
          [.014,.025,.041],[.031,.044,.064],1);
        const yy=bottom+h*.58,zFront=z+.088;
        disc(mesh,x,yy,zFront,r,[.056,.074,.092],1,24,true);
        annulus(mesh,x,yy,zFront+.004,r*.61,r*.90,[.28,.35,.42],1,24,true);
        disc(mesh,x,yy,zFront+.006,r*.43,[.075,.099,.12],1,20,true);
        annulus(illum,x,yy,zFront+.009,r*.78,r*.85,c,.39+.27*low,24,true);
      }
      disc(mesh,x,.426,z+.095,.012,[.37,.46,.54],1,16,true);
      cuboid(illum,x,.498,z+.031,.090,.008,.008,c,c,.38+.25*low,3);
      cuboid(mesh,x,.475,z,.147,.013,.167,[.19,.26,.34],[.38,.48,.54],1);
    }
  }
   function render(size,t,game,a){
   if(!Number.isFinite(size)||size<.18||size>.40||!Number.isFinite(t))return;
   const quality=getQuality(),low=clamp(a.low||0,0,1),mid=clamp(a.mid||0,0,1);
   const combo=game?.combo||0,pulse=clamp((low+mid)*.63,0,1);
   // Strictly scenery behind z=-1.15. Never edit board mesh/note physics.
   const stageZ=-1.57,stageWidth=Math.min(1.18,size*4+.16);
   // Stage feet and their short shadows are scenery-only; the actual WebXR
   // hit-tested physical floor remains at y=0 and never moves.
   // Fake ground-contact shadow with a clearly elevated, solid dark riser.
   cuboid(mesh,0,.008,stageZ,stageWidth+.12,.016,.645,
    [.023,.034,.050],[.072,.09,.12],.70,1);
   for(const sign of [-1,1])for(const depth of [-1,1]){
    const fx=sign*(stageWidth*.42),fz=stageZ+depth*.225;
    cuboid(mesh,fx,.014,fz,.095,.028,.092,[.025,.033,.045],[.15,.18,.23],1);
    cuboid(mesh,fx,.003,fz,.138,.006,.134,[.016,.021,.030],[.025,.032,.041],.38);
   }
   cuboid(mesh,0,.047,stageZ,stageWidth,.080,.585,
    [.026,.038,.058],[.25,.31,.36],1,1);
   cuboid(illum,0,.092,-1.268,stageWidth-.04,.008,.009,
    [.05,.72,.90],C,.43+.14*low,3);
   // CC0 riser supplies structural details but stays under the rest.
   // The built-in riser already covers the entire stage footprint.
   ledWall(size,t,low,mid,combo,quality);
   // V36 uses one procedural display and one raised truss. Imported fixtures
   // were crossing the display at different scales.
   truss(size,t,pulse,quality);
   stacks(size,low,quality);
   // Joint-weighted CPU skinning of Quaternius GLB. No UV-shredding or
   // hand-written world-space arm stretching. A solid bomber is the fallback.
   if(!skeletal?.draw(mesh,surface,t,low,quality,combo))
    fallbackBomber(t,low);
   horseHead(t,low,combo,quality);
   // Bomber collar and genuine dark DJ worktop are separate from the
   // CC0 desk, so the CDJs are not swallowed by a white table surface.
   const bob=Math.sin(t*5.2)*(.004+.007*low);
   for(const sign of [-1,1]){
    const neon=sign<0?P:C;
    beam([sign*.099,.628+bob,-1.50],[sign*.034,.589+bob,-1.471],
     .009,[.15,.19,.27]);
   }
   beam([0,.590+bob,-1.462],[0,.438+bob,-1.456],.004,[.35,.44,.56]);
   // A single closed console supports the turntables; the imported desk
   // contained a duplicate pale tabletop and floating side shelves.
   cuboid(mesh,0,.105,-1.450,.560,.235,.285,
     [.034,.050,.071],[.14,.20,.26],1);
   for(const sign of [-1,1])
     cuboid(mesh,sign*.267,.111,-1.440,.016,.237,.273,
       [.12,.17,.24],[.26,.35,.43],1);
   const workY=.355,workZ=-1.437,workWidth=.605,workDepth=.292;
   // Real visible black worktop + metal lip + subtle colored reflections.
   cuboid(mesh,0,workY,workZ,workWidth,.025,workDepth,
    [.028,.040,.057],[.23,.31,.37],1);
   cuboid(mesh,0,workY+.015,workZ-.004,workWidth-.023,.007,workDepth-.026,
    [.044,.060,.080],[.13,.19,.25],1);
   cuboid(illum,0,workY+.012,workZ+.139,workWidth-.08,.004,.006,
    C,C,.35+.23*low,3);
   const controlsY=workY+.029;
   if(props?.ready()){
    props.drawPart('mixer',mesh,surface,{scale:.262,offset:[0,controlsY,-1.437]});
    if(!(props.drawPart('cdj',mesh,surface,[
       {scale:.292,offset:[-.168,controlsY,-1.438]},
       {scale:.292,offset:[ .168,controlsY,-1.438]}
    ]) || props.drawPart('turntable',mesh,surface,[
       {scale:.278,offset:[-.168,controlsY,-1.438]},
       {scale:.278,offset:[ .168,controlsY,-1.438]}
    ]))){
      for(const x of [-.168,.168]){
       annulus(mesh,x,controlsY+.008,workZ,.052,.070,[.19,.24,.30],1,24);
       disc(illum,x,controlsY+.011,workZ,.041,C,.30+.24*low,20);
      }
    }
   }
   // V35: wider readable platters, pulsing mixer feedback clearly visible.
   for(const sign of [-1,1]){
    const col=sign<0?P:C;
    annulus(illum,sign*.168,controlsY+.020,-1.42,.060,.070,col,.55+.23*low,24);
   }
   // The glossy platter rings and central faders remain readable on Android,
   // even when a CC0 asset has an untextured metal face.
   for(const sign of [-1,1]){
    const x=sign*.168,shade=sign<0?P:C;
    annulus(illum,x,controlsY+.013,workZ+.007,.045,.051,shade,.34+.17*low,22);
    for(let k=0;k<3;k++)cuboid(illum,x+sign*.060,controlsY+.016,
     workZ-.055+k*.035,.008,.007,.011,k%2?C:P,k%2?C:P,.39+.16*mid,3);
   }
   for(let k=0;k<5;k++){
    const x=(k-2)*.016;
    cuboid(mesh,x,controlsY+.022,workZ+.016,.009,.015,.011,[.33,.39,.45],W);
    cuboid(illum,x,controlsY+.033,workZ+.012,.006,.005,.018,k%2?C:P,
     k%2?C:P,.28+.29*low,3);
   }
   // True skinning wrist positions, two distinct moving hand markers.
   // Deck presses flash where the fingers meet the controls, not near the waist.
   const hands=skeletal?.hands?.(t,low,combo);
   if(hands)for(const key of ['L','R']){
    const at=hands[key],col=key==='L'?P:C;
    const xx=at[0],yy=at[1],zz=at[2];
    annulus(illum,xx,yy+.003,zz,.012,.022,col,.49+.31*low,16,true);
    cuboid(illum,xx,.385,-1.393,.045,.006,.022,col,col,.25+.35*low,3);
   }
   // Narrow dark facade, ~34% shorter than V31; controls remain visible.
   // A single flush fascia; removed the oversized imported front slab.
   cuboid(mesh,0,.105,-1.294,.500,.193,.023,
     [.039,.060,.084],[.16,.23,.31],1);
   cuboid(mesh,0,.123,-1.277,.462,.148,.008,
     [.025,.035,.057],[.055,.076,.11],1);
   cuboid(illum,0,.267,-1.262,.449,.008,.006,P,P,.39+.20*low,3);
   // A reactive, visible front equalizer replaces the nearly flat magenta
   // box. Animated even during positioning (uses the stage clock).
   for(let i=0;i<17;i++){
    const x=(i-8)*.025,phase=t*6.3+i*.62;
    const height=.013+.069*(.35+.65*Math.sin(phase)*Math.sin(phase))*(.6+.4*low);
    const col=i%4===0?C:i%4===1?P:V;
    cuboid(illum,x,.137,-1.261,.012,height,.007,col,col,.34+.27*low,3);
   }
   // Empty sides are intentional: no accessory crosses the PA or the DJ.
   if(quality>0)for(const sign of [-1,1]){
     const x=sign*.328,c=sign<0?P:C;
     cuboid(mesh,x,.108,-1.731,.082,.047,.072,[.06,.09,.12],[.22,.29,.35],1);
     annulus(illum,x,.164,-1.728,.020,.030,c,.23+.19*low,14);
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
     const x=Math.sin(i*3.9+t*.87)*.36,yy=.83+.23*Math.sin(t*.93+i*2.6);
     cuboid(illum,x,yy,-1.96,.009,.013,.007,i%2?P:C,
      i%2?P:C,.25+.22*Math.sin(t*5.4+i)**2,3);
    }
   }
  }
  return{render,version:'HORSE DJ V37'};
 }
 root.RitmoExterior={create,version:'HORSE DJ V37'};
})(window);