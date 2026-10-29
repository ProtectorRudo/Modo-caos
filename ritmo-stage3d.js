'use strict';
/* NEON LIVE: four-lane physically anchored procedural WebGL stage.
 * Reuses the existing XR framebuffer. No runtime downloads or external CDNs.
 * Transparent rails, faceted pads, music reactive equalizer and 3D note ribbons. */
(function(root){
 const COLORS=[[.19,1,.48],[1,.20,.37],[1,.85,.18],[.10,.49,1]];
 const VS="attribute vec3 aPos;attribute vec4 aColor;uniform mat4 uMVP;varying vec4 vCol;varying vec3 vPos;void main(){gl_Position=uMVP*vec4(aPos,1.);vCol=aColor;vPos=aPos;}";
 const FS="precision mediump float;uniform float uBeat;uniform float uTime;varying vec4 vCol;varying vec3 vPos;void main(){float etched=step(.973,fract(vPos.z*13.5))*0.085+step(.988,fract(vPos.x*28.))*0.038;float grain=.975+.025*sin(vPos.x*89.+vPos.z*74.);float shimmer=.95+.05*sin(uTime*3.+vPos.z*9.);float sound=1.+uBeat*.17;vec3 col=vCol.rgb*(grain*shimmer*sound+etched);gl_FragColor=vec4(min(vec3(1.),col),vCol.a);}";
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
 function project(M,x,y,z,w,h){const v=[x,y,z,1],q=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)q[r]+=M[k*4+r]*v[k];if(q[3]<.025)return null;return[(q[0]/q[3]+1)*w/2,(1-q[1]/q[3])*h/2]}
 function shader(gl,type,src){let q=gl.createShader(type);gl.shaderSource(q,src);gl.compileShader(q);if(!gl.getShaderParameter(q,gl.COMPILE_STATUS))throw Error('Stage shader: '+gl.getShaderInfoLog(q));return q}
 function create(){
  let glRef=null,gpu=null,quality=2,avg=16,last=0,nframes=0,state='ESPERANDO GPU',spots=[null,null,null,null],visualMode='auto';
  const hitWaves=[];
  const solid=[],glow=[];
  const muted=(c,m)=>c.map(x=>Math.min(1,x*m));
  function vert(b,p,c,a){b.push(p[0],p[1],p[2],c[0],c[1],c[2],a)}
  function face(b,A,B,C,D,c,a=1){
   vert(b,A,c,a);vert(b,B,c,a);vert(b,C,c,a);
   vert(b,A,c,a);vert(b,C,c,a);vert(b,D,c,a);
  }
  function quad(b,x0,x1,z0,z1,y,c,a=1){face(b,[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],c,a)}
  function box(b,x,y,z,w,h,d,c,top=c,a=1){
   const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,y1=y+h;
   face(b,[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],top,a);
   face(b,[x0,y,z1],[x0,y1,z1],[x0,y1,z0],[x0,y,z0],c,a);
   face(b,[x1,y,z0],[x1,y1,z0],[x1,y1,z1],[x1,y,z1],c,a);
   face(b,[x0,y,z1],[x1,y,z1],[x1,y1,z1],[x0,y1,z1],c,a);
   face(b,[x1,y,z0],[x0,y,z0],[x0,y1,z0],[x1,y1,z0],c,a);
  }
  function ring(b,x,y,z,ri,ro,c,a=1,steps=16,vertical=false){
   const coord=(r,theta)=>vertical?[x+Math.cos(theta)*r,y+Math.sin(theta)*r,z]:[x+Math.cos(theta)*r,y,z+Math.sin(theta)*r];
   for(let i=0;i<steps;i++){let u=i*2*Math.PI/steps,v=(i+1)*2*Math.PI/steps;face(b,coord(ri,u),coord(ro,u),coord(ro,v),coord(ri,v),c,a)}
  }
  function speakerDriver(x,y,z,r,low){
   // Conical woven-metal driver mounted in a rim and recessed dust cap.
   const steps=18,front=z+.064;
   ring(solid,x,y,front,r*.78,r,[.095,.12,.16],1,steps,true);
   ring(solid,x,y,front+.002,r*.69,r*.78,[.025,.03,.045],1,steps,true);
   const ringPoint=(radius,angle,depth)=>[x+Math.cos(angle)*radius,y+Math.sin(angle)*radius,depth];
   for(let i=0;i<steps;i++){
    const a=i*2*Math.PI/steps,b=(i+1)*2*Math.PI/steps;
    face(solid,ringPoint(r*.69,a,front+.005),ringPoint(r*.69,b,front+.005),
      ringPoint(r*.16,b,front-.013),ringPoint(r*.16,a,front-.013),
      i%2?[.11,.13,.16]:[.20,.23,.26],1);
   }
   ring(glow,x,y,front+.01,r*.78,r*.87,[.25,.68,.99],.34+low*.25,steps,true);
   ring(solid,x,y,front-.011,0,r*.17,[.035,.05,.07],1,steps,true);
   if(quality>0){
    for(let j=-2;j<=2;j++){
     let xx=x+j*r*.28;
     face(glow,[xx-.0009,y-r*.61,front+.015],[xx+.0009,y-r*.61,front+.015],
        [xx+.0009,y+r*.61,front+.015],[xx-.0009,y+r*.61,front+.015],
        [.22,.29,.39],.34);
    }
   }
  }
  function crystal(b,x,y,z,r,c){
   // 3D faceted note nucleus, readable without any large downloaded texture.
   const edges=10;
   for(let i=0;i<edges;i++){
    let a=i*2*Math.PI/edges,v=(i+1)*2*Math.PI/edges;
    const p=(rad,t,h)=>[x+Math.cos(t)*rad,y+h,z+Math.sin(t)*rad];
    const tint=i%2===0?c:muted(c,.64);
    face(b,p(r*.64,a,0),p(r*.64,v,0),p(r*.78,v,.026),p(r*.78,a,.026),tint,.94);
    face(b,p(r*.78,a,.026),p(r*.78,v,.026),p(.025,v,.085),p(.025,a,.085),i%3===0?[.89,.98,1]:muted(c,.87),.92);
   }
   ring(glow,x,y+.094,z,r*.35,r*.62,c,.68,16);
  }
  function drawHitWaves(t,size){
   for(let i=hitWaves.length-1;i>=0;i--){
    const h=hitWaves[i],age=t-h.time/1000,life=h.rating==='HOLD'?.95:.73;
    if(age<0)continue;
    if(age>life){hitWaves.splice(i,1);continue}
    const p=age/life,c=COLORS[h.lane],x=(h.lane-1.5)*size,z=.65;
    const radius=size*(.24+p*.45),alpha=(1-p)*(h.rating==='FALLO'?.16:.83);
    ring(glow,x,.18+p*.09,z,radius,radius+size*.055,c,alpha,18);
    if(quality>0&&h.rating!=='FALLO'){
     const n=h.rating==='HOLD'?14:9;
     for(let j=0;j<n;j++){
      let a=j*6.283185307/n+Math.sin(h.seed+j)*.27,
      rad=.015+p*size*.36,
      xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad,
      yy=.20+.20*p*(1-p)+.045*Math.sin(a*5+p*3);
      box(glow,xx,yy,zz,.008+size*.013,.015+.014*(1-p),.007,c,c,alpha*.72);
     }
    }
   }
  }
  function build(size,t,game,en){
   const elapsed=game?.elapsed||0,playing=game?.state==='playing'&&!game?.paused;
   // Boost weak phone speakers modestly, but keep ambient lights calm before PLAY.
   const low=playing?clamp(Math.sqrt(en.low??.08)*1.45,0,1):.20;
   const mid=playing?clamp(Math.sqrt(en.mid??.07)*1.15,0,1):.20;
   const high=playing?clamp(Math.sqrt(en.high??.05)*1.05,0,1):.15;
   const f=-1.18,n=.93,L=-2*size,R=2*size;
   quad(solid,L-.055,R+.055,f-.05,n+.06,.020,[.010,.019,.039],.77);
   for(let lane=0;lane<4;lane++){
    let x=(lane-1.5)*size,c=COLORS[lane],a=x-size*.46,b=x+size*.46;
    box(solid,x,.028,-.122,size*.93,.038,2.11,[.019,.034,.054],[.035,.061,.099],.95);
    quad(solid,a,b,f,n,.068,muted(c,.12),.60);
    quad(solid,x-size*.025,x+size*.025,f,n,.073,muted(c,.54),.38);
    quad(glow,a+.005,a+.013,f,n,.08,c,.91);
    quad(glow,b-.013,b-.005,f,n,.08,c,.91);
    quad(glow,a-.021,a+.024,f,n,.078,c,.13);
    quad(glow,b-.024,b+.021,f,n,.078,c,.13);
    if(quality>0)for(let j=0;j<17;j++){
     let z=f+.12+j*(n-f)/18;
     quad(solid,a+.014,b-.014,z,z+.007,.081,[.25,.43,.55],j%3===0?.18:.075);
    }
    // Extruded target pad and layered neon annuli
    let z=.65,r=size*.39;
    box(solid,x,.029,z,size*.85,.049,size*.84,[.025,.046,.068],[.075,.105,.147]);
    ring(solid,x,.091,z,r*.67,r,[.09,.13,.19],.92,20);
    ring(glow,x,.096,z,r*.70,r*.87,c,.95,20);
    ring(glow,x,.101,z,r*.08,r*.32,c,.46,20);
    ring(glow,x,.107,z,0,r*.08,[.83,1,1],.81,16);
    ring(glow,x,.106,z,r*1.02,r*1.11,c,.28,20);
   }
   for(const side of [-1,1]){
    let x=side*(R+.014);
    box(solid,x,.026,-.116,.034,.065,2.16,[.035,.056,.083],[.14,.18,.23]);
    box(glow,x,.091,-.116,.013,.008,2.09,[.12,.70,1],[.12,.70,1],.90);
    if(quality>0)for(let k=0;k<8;k++){
     let z=f+.16+k*.245;box(solid,x,.075,z,.048,.052,.070,[.08,.10,.13],[.22,.27,.34]);
     quad(glow,x-.019,x+.019,z-.018,z+.018,.131,[1,.49,.13],.67);
    }
    // Small holographic light towers and speakers at far end, never screen-fixed
    const back=f-.11,sx=side*(size*1.68);
    box(solid,sx,.033,back,.18,.29,.13,[.025,.037,.056],[.12,.16,.23]);
    // Cabinet trim, bolts, recessed dual speakers and central horn.
    for(let sideX of [-1,1]){
     box(solid,sx+sideX*.076,.037,back+.067,.006,.278,.004,[.31,.36,.40],[.43,.50,.54],.91);
     for(let yy of [.050,.296]){
      ring(solid,sx+sideX*.071,yy,back+.072,0,.004,[.42,.47,.52],1,8,true);
     }
    }
    speakerDriver(sx,.118,back,.060,low);
    speakerDriver(sx,.237,back,.042,mid);
    ring(glow,sx,.239,back+.080,.048,.056,[.18,.86,1],.18+high*.18,16,true);
    const bx=side*(R+.06);
    box(solid,bx,.028,f+.22,.052,.24,.05,[.075,.08,.10],[.19,.24,.29]);
    box(glow,bx,.270,f+.22,.047,.02,.06,[.97,.50,.12],[1,.76,.31],.91);
   }
   // Spatial concert arch; low enough not to obstruct the real environment.
   // Adds stage presence without moving the notes off their four floor lanes.
   for(const side of [-1,1]){
    const x=side*(R-.035),z=f-.075;
    box(solid,x,.030,z,.045,.39,.054,[.045,.059,.092],[.15,.19,.27],.96);
    box(glow,x,.035,z+.033,.014,.365,.009,[.20,.79,1],[.20,.79,1],.69);
    ring(glow,x,.414,z+.031,.024,.049,[1,.69,.22],.52+.28*low,16,true);
   }
   box(solid,0,.420,f-.075,R-L-.05,.040,.057,[.071,.082,.12],[.23,.27,.35],.93);
   box(glow,0,.464,f-.075,R-L-.11,.013,.025,[.24,.82,1],[.24,.82,1],.60+low*.21);
   if(quality>0&&playing){
    // Transparent world-space fan lights, not screen-fixed effects.
    for(let k=0;k<4;k++){
     const x=(k-1.5)*size,c=COLORS[k],power=.08+.14*clamp(low+.25*mid,0,1),z=f-.035;
     face(glow,[x-.025,.43,z],[x+.025,.43,z],[x+.095,.10,z+.27],[x-.095,.10,z+.27],c,power);
    }
   }
   // 3D receiver crossbar and soft halo
   box(glow,0,.088,.65,R-L+.19,.008,.010,[.73,.97,1],[.73,.97,1],.34);
   quad(glow,L-.07,R+.07,.644,.656,.096,[.24,.82,1],.16+low*.12);
   // Futuristic console at the distant end with audio-reactive spectrum
   let z=f-.13;
   box(solid,0,.038,z,.50,.27,.095,[.022,.035,.053],[.11,.16,.22]);
   box(solid,0,.31,z,.52,.035,.11,[.06,.07,.1],[.18,.23,.30]);
   box(glow,0,.094,z+.052,.45,.17,.004,[.035,.18,.36],[.035,.18,.36],.71);
   if(quality>0)for(let j=0;j<11;j++){
    let x=(j-5)*.035,k=j%3===0?low:j%2?mid:high;
    let height=.024+.114*clamp(k*.78+.15+.16*Math.sin(t*7+j),0,1);
    const c=j%3===0?[.37,1,.63]:j%3===1?[1,.29,.63]:[.22,.64,1];
    box(glow,x,.109,z+.06,.023,height,.006,c,c,.85);
   }
   if(game){
    let lane=clamp(game.lane,0,3),x=(lane-1.5)*size,col=COLORS[lane];
    ring(glow,x,.168,.65,size*.32,size*.40,col,.75,20);
    ring(glow,x,.174,.65,0,size*.11,[.90,1,1],.82,18);
    if(game.holdActive){
     let hn=game.holdActive.note.lane,p=clamp(game.holdActive.progress,0,1),xx=(hn-1.5)*size,c=COLORS[hn];
     for(let j=0;j<Math.ceil(24*p);j++){
      let a=j*Math.PI/12,b=(j+1)*Math.PI/12;
      const pt=(r,t)=>[xx+Math.cos(t)*r,.178,.65+Math.sin(t)*r];
      face(glow,pt(size*.41,a),pt(size*.51,a),pt(size*.51,b),pt(size*.41,b),c,.95);
     }
    }
    if(playing||game.state==='finished'){
     const lead=2.65;
     for(const note of game.notes){
      let dt=note.at-elapsed,holding=game.holdActive?.id===note.id;if(note.status!=='pending'||(!holding&&dt<-0.26)||dt>lead+.08)continue;
      const x=(note.lane-1.5)*size,special=note.type==='caos'||note.type==='special',c=special?[1,.83,.24]:COLORS[note.lane],z=.65-clamp(dt/lead,0,1)*1.79,r=size*.24;
      crystal(solid,x,.108,z,r,c);
      ring(glow,x,.140,z,r*.62,r*.95,c,.89,16);
      ring(glow,x,.145,z,0,r*.38,[.93,1,1],.77,16);
      ring(glow,x,.149,z,r*.98,r*1.21,c,.20,16);
      if(special)ring(glow,x,.153,z,r*1.23,r*1.48,[1,.96,.63],.68,18);
      if(note.type==='hold'){
       let len=Math.min(.88,Math.max(.27,note.hold/lead*1.79));
       if(holding)len*=Math.max(.02,1-clamp(game.holdActive.progress,0,1));
       const tail=z-.02;
       quad(solid,x-r*.58,x+r*.58,tail-len,tail,.139,muted(c,.41),.83);
       quad(glow,x-r*.16,x+r*.16,tail-len,tail,.153,[.84,1,1],.41);
       if(quality>0)for(let j=0;j<5;j++)quad(glow,x-r*.63,x-r*.55,tail-len+j*len/5,tail-len+(j+.62)*len/5,.158,c,.77);
      }else if(note.type==='slide'&&Number.isFinite(note.fromLane)){
       let other=(note.fromLane-1.5)*size;
       quad(glow,Math.min(other,x)-r*.18,Math.max(other,x)+r*.18,z-.12,z+.028,.137,c,.57);
      }
     }
    }
   }
   if(playing||game?.state==='finished')drawHitWaves(t,size);
  }
  function init(gl){
   let vertShader=shader(gl,gl.VERTEX_SHADER,VS),fragShader=shader(gl,gl.FRAGMENT_SHADER,FS),p=gl.createProgram();
   gl.attachShader(p,vertShader);gl.attachShader(p,fragShader);gl.linkProgram(p);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Stage link: '+gl.getProgramInfoLog(p));
   gpu={p,buf:gl.createBuffer(),pos:gl.getAttribLocation(p,'aPos'),color:gl.getAttribLocation(p,'aColor'),mvp:gl.getUniformLocation(p,'uMVP'),time:gl.getUniformLocation(p,'uTime'),beat:gl.getUniformLocation(p,'uBeat')};
   glRef=gl;state='3D ACTIVO';
  }
  function batch(gl,a,additive){
   if(!a.length)return;
   gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(gpu.pos);gl.vertexAttribPointer(gpu.pos,3,gl.FLOAT,false,28,0);
   gl.enableVertexAttribArray(gpu.color);gl.vertexAttribPointer(gpu.color,4,gl.FLOAT,false,28,12);
   gl.blendFunc(gl.SRC_ALPHA,additive?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
   gl.drawArrays(gl.TRIANGLES,0,a.length/7);
  }
  function render(gl,view,W,now,game,size,analysis){
   if(!gl||!view||!W)return false;
   try{
    if(!gpu||glRef!==gl)init(gl);
    const en=analysis?.()||{low:.28,mid:.34,high:.28},elapsed=game?.elapsed||0;
    const dt=last?clamp(now-last,0,110):16;last=now;avg=avg*.93+dt*.07;
    if(++nframes%90===0)quality=visualMode==='low'?0:visualMode==='high'?2:avg>27?0:avg>21?1:2;
    solid.length=0;glow.length=0;build(size,now*.001,game,en);
    const P=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,W)),width=root.innerWidth||392,height=root.innerHeight||850;
    spots=COLORS.map((c,i)=>project(P,(i-1.5)*size,.16,.65,width,height));
    gl.useProgram(gpu.p);gl.uniformMatrix4fv(gpu.mvp,false,P);gl.uniform1f(gpu.time,now*.001);
    gl.uniform1f(gpu.beat,(Math.cos(elapsed*(game?.bpm||100)*Math.PI/30)+1)*.27+en.low*.4);
    // Opaque concert hardware uses correct depth; additive stage glows stay translucent.
    gl.enable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);
    if(gl.depthFunc&&gl.LEQUAL!==undefined)gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);batch(gl,solid,false);
    gl.depthMask(false);batch(gl,glow,true);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
    state=quality===0?'3D LIGERO':'3D ACTIVO';
    return true;
   }catch(e){state='3D FALLBACK: '+String(e.message||e);return false}
  }
  function hit(lane,rating='PERFECTO'){
   if(!Number.isInteger(lane)||lane<0||lane>3)return;
   if(hitWaves.length>=12)hitWaves.shift();
   hitWaves.push({lane,rating,time:typeof performance!=='undefined'?performance.now():Date.now(),seed:lane+hitWaves.length});
  }
  function setQuality(mode){
   if(!['auto','high','low'].includes(mode))return visualMode;
   visualMode=mode;quality=mode==='low'?0:2;return visualMode;
  }
  return {render,hit,setQuality,mode:()=>visualMode,spot:lane=>spots[lane]||null,status:()=>state,quality:()=>quality};
 }
 root.RitmoStage3D={create};
})(window);
