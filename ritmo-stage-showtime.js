'use strict';
/*
 NEON PRISM v28 — substantially redesigned AR concert stage.
 All geometry is attached to the SAME real-world WebXR floor matrix as the proven renderer.
 Native WebGL1, no remote runtime assets or imported asset format assumptions.
 Two batched GPU passes. If unavailable, runtime falls back to NEON STUDIO then SVG.
*/
(function(root){
 const C=[[.23,1,.49],[1,.19,.39],[1,.82,.16],[.12,.48,1]];
 const VS=String.raw`
attribute vec3 aPos;attribute vec3 aNormal;attribute vec4 aColor;attribute float aMat;
uniform mat4 uMVP;varying vec3 vP;varying vec3 vN;varying vec4 vC;varying float vM;
void main(){gl_Position=uMVP*vec4(aPos,1.);vP=aPos;vN=aNormal;vC=aColor;vM=aMat;}`;
 const FS=String.raw`
precision mediump float;
uniform float uTime;uniform float uBass;uniform float uBeat;
varying vec3 vP;varying vec3 vN;varying vec4 vC;varying float vM;
void main(){
 vec3 n=normalize(vN+vec3(.0001));
 vec3 l=normalize(vec3(-.42,.84,.47));
 float diffuse=max(.08,dot(n,l));
 float edge=pow(max(0.,dot(reflect(-l,n),normalize(vec3(.14,.76,.63)))),9.);
 float alloy=1.-step(.5,vM),glass=step(.5,vM)*(1.-step(1.5,vM));
 float gem=step(1.5,vM)*(1.-step(2.5,vM)),emissive=step(2.5,vM);
 float brushed=.94+.06*sin(vP.x*130.+vP.z*93.);
 float channel=.94+.06*sin(vP.z*18.-uTime*2.7);
 float lit=alloy*(.36+.70*diffuse+.26*edge)*brushed
  +glass*(.68+.23*diffuse+.48*edge)*channel
  +gem*(.64+.40*diffuse+.67*edge)
  +emissive*(1.20+.28*uBass+.14*uBeat+.11*sin(uTime*4.5+vP.z*12.));
 gl_FragColor=vec4(min(vec3(1.),vC.rgb*lit),vC.a);
}`;
 const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
 const tint=(c,s)=>c.map(q=>Math.min(1,q*s));
 function multiply(A,B){const R=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)R[c*4+r]+=A[k*4+r]*B[c*4+k];return R}
 function project(M,x,y,z,w,h){const v=[x,y,z,1],q=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)q[r]+=M[k*4+r]*v[k];return q[3]>.025?[(q[0]/q[3]+1)*w*.5,(1-q[1]/q[3])*h*.5]:null}
 function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('PRISM shader: '+gl.getShaderInfoLog(s));return s}
 function create(){
  let gpu=null,gpuGL=null,quality=2,mode='auto',meanMs=16,prevMs=0,frames=0,status='ESPERANDO AR',lastSpot=[null,null,null,null];
  const mesh=[],illum=[],waves=[];
   // Independent decorator: errors cannot prevent rhythm gameplay.
   const exterior=root.RitmoExterior?.create({mesh,illum,surface,cuboid,annulus,disc,getQuality:()=>quality});
  function vertex(target,p,n,col,a,mat){target.push(...p,...n,...col,a,mat)}
  function surface(target,A,B,Cc,D,col,a=.99,mat){
   const v=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],w=[Cc[0]-A[0],Cc[1]-A[1],Cc[2]-A[2]];
   let n=[v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],v[0]*w[1]-v[1]*w[0]];
   const m=Math.hypot(...n)||1;n=n.map(x=>x/m);if(n[1]<-.75)n=[n[0],-n[1],n[2]];
   const shader=mat===undefined?(target===illum?3:a<.81?1:0):mat;
   for(const p of [A,B,Cc,A,Cc,D])vertex(target,p,n,col,a,shader);
  }
  function floor(target,x0,x1,z0,z1,y,col,a=.8,mat){surface(target,[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],col,a,mat)}
  function cuboid(target,x,y,z,w,h,d,col,top=col,alpha=1,mat){
   const a=x-w/2,b=x+w/2,p=z-d/2,q=z+d/2,t=y+h;
   surface(target,[a,t,p],[b,t,p],[b,t,q],[a,t,q],top,alpha,mat);
   surface(target,[a,y,q],[b,y,q],[b,t,q],[a,t,q],col,alpha,mat);
   surface(target,[b,y,p],[a,y,p],[a,t,p],[b,t,p],col,alpha,mat);
   surface(target,[a,y,p],[a,y,q],[a,t,q],[a,t,p],col,alpha,mat);
   surface(target,[b,y,q],[b,y,p],[b,t,p],[b,t,q],col,alpha,mat);
  }
  function annulus(target,x,y,z,ri,ro,col,alpha=.8,segments=20,vertical=false){
   const pt=(r,t)=>vertical?[x+r*Math.cos(t),y+r*Math.sin(t),z]:[x+r*Math.cos(t),y,z+r*Math.sin(t)];
   for(let i=0;i<segments;i++){const a=i*6.283185307/segments,b=(i+1)*6.283185307/segments;surface(target,pt(ri,a),pt(ro,a),pt(ro,b),pt(ri,b),col,alpha,vertical?2:3)}
  }
  function disc(target,x,y,z,r,col,a=1,N=16,vertical=false){
   const pt=(t)=>vertical?[x+r*Math.cos(t),y+r*Math.sin(t),z]:[x+r*Math.cos(t),y,z+r*Math.sin(t)];
   const center=[x,y,z];for(let i=0;i<N;i++){const p=pt(i*6.283185307/N),q=pt((i+1)*6.283185307/N);surface(target,center,p,q,center,col,a,2)}
  }
  function jewel(x,y,z,r,c,accent=false){
   // A large readable polished energy puck, deliberately not a small cone.
   const N=10,top=y+.035;
   for(let k=0;k<N;k++){
    const a=k*6.283185307/N,b=(k+1)*6.283185307/N;
    const at=(ang,rad,yy)=>[x+Math.cos(ang)*rad,yy,z+Math.sin(ang)*rad];
    surface(mesh,at(a,r,y),at(b,r,y),at(b,r*.77,top),at(a,r*.77,top),k%2?tint(c,.67):c,.97,2);
    surface(mesh,at(a,r*.77,top),at(b,r*.77,top),[x,top+.012,z],[x,top+.012,z],accent?[1,.93,.58]:tint(c,1.05),.96,2);
   }
   annulus(illum,x,top+.017,z,r*.67,r*.94,c,.85,20);
   disc(illum,x,top+.024,z,r*.31,[.90,1,1],.69,18);
   annulus(illum,x,top+.028,z,r*1.0,r*1.26,c,.27,20);
   if(accent)annulus(illum,x,top+.029,z,r*1.30,r*1.49,[1,.94,.51],.52,20);
  }
  function speaker(x,y,z,bass){
   cuboid(mesh,x,.018,z,.20,.28,.13,[.025,.038,.055],[.14,.18,.24],1);
   for(const yy of [y,y+.104]){
    annulus(mesh,x,yy,z+.072,.039,.057,[.19,.23,.29],1,22,true);
    annulus(illum,x,yy,z+.075,.042,.050,[.14,.80,1],.35+.30*bass,22,true);
    disc(mesh,x,yy,z+.069,.037,[.057,.075,.10],1,20,true);
    annulus(mesh,x,yy,z+.071,.017,.026,[.23,.27,.32],1,20,true);
    disc(mesh,x,yy,z+.072,.015,[.036,.052,.064],1,18,true);
   }
   for(const side of [-1,1])cuboid(mesh,x+side*.089,.022,z+.078,.006,.272,.008,[.34,.42,.48],[.47,.56,.64]);
  }
  function stage(size,time,game,band){
   const active=game?.state==='playing'&&!game?.paused;
   const low=active?cap(Math.sqrt(band.low??.08)*1.45,0,1):.12;
   const mid=active?cap(Math.sqrt(band.mid??.08)*1.18,0,1):.15;
   const high=active?cap(Math.sqrt(band.high??.05)*1.15,0,1):.15;
   const back=-1.15,front=.94,left=-2*size,right=2*size;
   const beat=(1+Math.sin(time*5.4))/2;
   // Slim glass podium with shared machined metal outer body, not 4 black boxes.
   cuboid(mesh,0,.018,-.102,size*4.025,.025,2.20,[.011,.024,.037],[.052,.077,.098],.74);
   floor(illum,left,right,back,front,.048,[.015,.12,.18],.19,3);
   for(let lane=0;lane<4;lane++){
    const x=(lane-1.5)*size,c=C[lane],a=x-size*.474,b=x+size*.474;
    // Tall color-rich translucent channel with an inlaid beveled chrome border.
    floor(illum,a,b,back,front,.055,tint(c,.36),.33,1);
    floor(illum,x-size*.38,x+size*.38,back,front,.056,c,.08+.065*low,3);
    for(const sign of [-1,1]){
     const edge=x+sign*size*.485;
     cuboid(mesh,edge,.045,-.10,.009,.013,2.10,[.14,.20,.25],[.45,.53,.58],.98);
     cuboid(illum,edge,.059,-.1,.007,.006,2.10,c,c,.97,3);
     floor(illum,edge-.015,edge+.015,back,front,.063,c,.17,3);
    }
    // The raceway flows towards YOU in repeated beat-linked LED waves.
    if(quality>0){
     for(let j=0;j<15;j++){
      let z=back+.10+j*(front-back)/15;
      floor(illum,a+.028,b-.028,z,z+.009,.064,tint(c,.92),j%3===0?.27:.15,3);
     }
     const phase=((time*(.25+.33*low))%1);
     for(let j=0;j<5;j++){
      const z=back+.12+((j/5+phase)%1)*(front-back-.20);
      floor(illum,a+.038,b-.038,z,z+.022,.065,[.72,1,1],.23+.12*low,3);
     }
    }
    // Hero reactor target: raised chrome decagon with 3 concentric luminous rings.
    let z=.65,r=size*.44;
    cuboid(mesh,x,.032,z,size*.94,.045,size*.86,[.023,.057,.075],[.17,.22,.28],1);
    annulus(mesh,x,.080,z,r*.69,r*1.05,[.32,.40,.46],.98,24);
    annulus(illum,x,.085,z,r*.67,r*.92,c,.88+.1*low,24);
    annulus(illum,x,.091,z,r*.42,r*.50,[.82,.98,1],.38,24);
    disc(illum,x,.095,z,r*.19,c,.55,20);
    disc(illum,x,.099,z,r*.078,[1,1,1],.95,16);
    annulus(illum,x,.103,z,r*1.08,r*1.15,c,.23,24);
   }
   // Only a thin scoring marker, anchored at EXACT z=.65 note/receptor position.
   floor(illum,left-.035,right+.035,.645,.654,.110,[.71,1,1],.16+.10*low,3);
   // A clearly different music-machine silhouette: curved portal towers, floating
   // equalizer bars and luminous signature circle above the console.
   for(const side of [-1,1]){
    const xx=side*(right-.045),z=back-.10;
    cuboid(mesh,xx,.018,z,.050,.52,.075,[.075,.10,.14],[.29,.34,.40]);
    cuboid(illum,xx,.025,z+.033,.014,.48,.013,[.16,.75,1],[.16,.75,1],.80,3);
    // Strong elevated corner rings, not just square floor rectangles.
    annulus(illum,xx,.55,z+.042,.040,.061,[1,.76,.30],.70+.15*low,18,true);
    speaker(side*(size*1.73),.104,back-.11,low);
   }
   cuboid(mesh,0,.548,back-.10,right-left-.07,.046,.075,[.080,.10,.14],[.22,.32,.37]);
   cuboid(illum,0,.60,back-.10,right-left-.08,.012,.035,[.12,.84,1],[.12,.84,1],.88,3);
   // 3D levitating illuminated crown behind the mixing station.
   annulus(illum,0,.375,back-.115,.185,.205,[.18,.80,1],.31+.23*mid,42,true);
   annulus(illum,0,.375,back-.111,.136,.147,[.82,.95,1],.23,42,true);
   // Console is now light-transparent instead of huge unlit black square.
   cuboid(mesh,0,.020,back-.17,.43,.125,.12,[.02,.05,.07],[.06,.14,.18]);
   cuboid(illum,0,.055,back-.10,.365,.054,.008,[.09,.40,.52],[.09,.40,.52],.32,3);
   for(let i=0;i<15;i++){
    const xx=(i-7)*.024,k=i%3===0?low:i%2?mid:high;
    const height=.035+.21*(.14+.62*k+.16*Math.sin(time*6.3+i*.73));
    let c=i%3===0?[.24,1,.61]:i%3===1?[1,.37,.64]:[.19,.68,1];
    cuboid(illum,xx,.13,back-.070,.014,height,.012,c,c,.74,3);
   }
   if(quality>0&&active){
    // Four short cone-shaped concert spotlights kept BEHIND the notes.
    for(let lane=0;lane<4;lane++){
     const x=(lane-1.5)*size,c=C[lane],opacity=.07+.10*low;
     surface(illum,[x-.025,.56,back-.08],[x+.025,.56,back-.08],
      [x+.095,.08,back+.39],[x-.095,.08,back+.39],c,opacity,3);
    }
   }
   try{exterior?.render(size,time,game,{low,mid,high,beat})}catch(_){/* safe fallback */}
   if(!game)return;
   // The player's own lane glows with a responsive halo, not a screen-fixed sprite.
   const player=cap(game.lane,0,3),x=(player-1.5)*size,c=C[player];
   annulus(illum,x,.137,.65,size*.42,size*.51,c,.61,28);
   if(game.holdActive){
    const lane=game.holdActive.note.lane,x=(lane-1.5)*size,cc=C[lane],progress=cap(game.holdActive.progress,0,1);
    const N=32;for(let i=0;i<Math.ceil(N*progress);i++){
     const a=i*6.283185307/N,b=(i+1)*6.283185307/N;
     const p=(r,t)=>[x+Math.cos(t)*r,.150,.65+Math.sin(t)*r];
     surface(illum,p(size*.48,a),p(size*.61,a),p(size*.61,b),p(size*.48,b),cc,.90,3);
    }
   }
   if(active||game.state==='finished'){
    const lead=2.65;
    for(const note of game.notes){
     const dt=note.at-game.elapsed,holding=game.holdActive?.id===note.id;
     if(note.status!=='pending'||(!holding&&dt<-.26)||dt>lead+.09)continue;
     const x=(note.lane-1.5)*size,z=.65-cap(dt/lead,0,1)*1.79;
     const accent=note.type==='caos'||note.type==='special',c=accent?[1,.83,.24]:C[note.lane],r=size*.35;
     jewel(x,.126,z,r,c,accent);
     if(note.type==='hold'){
      let tail=Math.min(.90,Math.max(.28,note.hold/lead*1.79));
      if(holding)tail*=Math.max(.03,1-cap(game.holdActive.progress,0,1));
      floor(illum,x-r*.66,x+r*.66,z-tail,z,.156,c,.36,3);
      floor(illum,x-r*.18,x+r*.18,z-tail,z,.162,[.89,1,1],.32,3);
     }else if(note.type==='slide'&&Number.isFinite(note.fromLane)){
      const from=(note.fromLane-1.5)*size;
      floor(illum,Math.min(from,x)-r*.24,Math.max(from,x)+r*.24,z-.09,z+.020,.164,c,.48,3);
     }
    }
   }
   for(let k=waves.length-1;k>=0;k--){
    const h=waves[k],p=(time-h.t)/.68;
    if(p>=1){waves.splice(k,1);continue}if(p<0)continue;
    const x=(h.lane-1.5)*size,cc=C[h.lane],radius=size*(.3+p*.65);
    annulus(illum,x,.145+p*.080,.65,radius,radius+size*.054,cc,(1-p)*.92,20);
    if(quality>0)for(let j=0;j<12;j++){
     const a=j*.5236+h.seed,rr=radius*(.5+p*.32);
     cuboid(illum,x+Math.cos(a)*rr,.17+.17*p*(1-p),.65+Math.sin(a)*rr,
      .007,.018,.006,cc,cc,(1-p)*.65,3);
    }
   }
  }
  function init(gl){
   const v=compile(gl,gl.VERTEX_SHADER,VS),f=compile(gl,gl.FRAGMENT_SHADER,FS),p=gl.createProgram();
   gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('PRISM link: '+gl.getProgramInfoLog(p));
   gpu={program:p,buf:gl.createBuffer(),pos:gl.getAttribLocation(p,'aPos'),normal:gl.getAttribLocation(p,'aNormal'),color:gl.getAttribLocation(p,'aColor'),material:gl.getAttribLocation(p,'aMat'),
      mvp:gl.getUniformLocation(p,'uMVP'),time:gl.getUniformLocation(p,'uTime'),bass:gl.getUniformLocation(p,'uBass'),beat:gl.getUniformLocation(p,'uBeat')};
   gpuGL=gl;status='PRISM ACTIVO';
  }
  function draw(gl,buffer,additive){
   if(!buffer.length)return;
   gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(buffer),gl.DYNAMIC_DRAW);
   for(const [loc,len,offset] of [[gpu.pos,3,0],[gpu.normal,3,12],[gpu.color,4,24],[gpu.material,1,40]]){
    if(loc<0)continue;
    gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,len,gl.FLOAT,false,44,offset);
   }
   gl.blendFunc(gl.SRC_ALPHA,additive?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
   gl.drawArrays(gl.TRIANGLES,0,buffer.length/11);
  }
  function render(gl,view,W,t,game,size,analysis){
   if(!gl||!view||!W)return false;
   try{
    if(!gpu||gpuGL!==gl)init(gl);
    const bands=analysis?.()||{low:.20,mid:.28,high:.25};
    const dt=prevMs?cap(t-prevMs,0,100):16;prevMs=t;meanMs=meanMs*.92+dt*.08;
    if(++frames%90===0)quality=mode==='low'?0:mode==='high'?2:meanMs>29?0:meanMs>23?1:2;
    mesh.length=0;illum.length=0;stage(size,t*.001,game,bands);
    const P=multiply(view.projectionMatrix,multiply(view.transform.inverse.matrix,W));
    lastSpot=C.map((v,i)=>project(P,(i-1.5)*size,.14,.65,root.innerWidth||390,root.innerHeight||850));
    gl.useProgram(gpu.program);gl.uniformMatrix4fv(gpu.mvp,false,P);
    gl.uniform1f(gpu.time,t*.001);gl.uniform1f(gpu.bass,bands.low||0);
    gl.uniform1f(gpu.beat,(1+Math.sin((game?.elapsed||0)*(game?.bpm||106)*Math.PI/30))*.5);
    gl.enable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
    draw(gl,mesh,false);
    gl.depthMask(false);draw(gl,illum,true);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
    status=quality===0?'PRISM LIGERO':'PRISM PREMIUM';return true;
   }catch(e){status='PRISM FALLBACK: '+String(e?.message||e);return false}
  }
  function hit(lane,rating){
   if(!Number.isInteger(lane)||lane<0||lane>3)return;
   if(waves.length>=10)waves.shift();
   waves.push({lane,rating,t:(typeof performance!=='undefined'?performance.now():Date.now())/1000,seed:Math.random()});
  }
  function setQuality(q){if(['auto','high','low'].includes(q)){mode=q;quality=q==='low'?0:2}return mode}
  return{render,hit,setQuality,mode:()=>mode,status:()=>status,quality:()=>quality,spot:i=>lastSpot[i]};
 }
 root.RitmoStageShowtime={create,version:'NEON PRISM V28'};
})(window);