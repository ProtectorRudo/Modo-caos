'use strict';
/* Lluvia de Meteoros — procedural 3D WebGL inside the native WebXR framebuffer
   and a fully playable high-DPI 2D Canvas renderer. No external assets required. */
(function(root){
const TAU=Math.PI*2,clamp=(a,l,h)=>Math.max(l,Math.min(h,a)),ARENA=1.12;
const id=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let k=0;k<4;k++)for(let row=0;row<4;row++)r[4*c+row]+=a[4*k+row]*b[4*c+k];return r}
function transform(x,y,z,sx=1,sy=1,sz=1){const a=id();a[0]=sx;a[5]=sy;a[10]=sz;a[12]=x;a[13]=y;a[14]=z;return a}
function mesh(kind){
 let vertices=[],normals=[];
 const tri=(a,b,c)=>{for(const p of [a,b,c]){vertices.push(...p.slice(0,3));const l=Math.hypot(p[0],p[1],p[2])||1;normals.push(p[0]/l,p[1]/l,p[2]/l)}};
 if(kind==='rock'||kind==='globe'){
  const lat=kind==='rock'?10:9,lon=kind==='rock'?15:12;
  function v(t,p){
   let n=kind==='rock'?1+.22*Math.sin(p*5+t*8)+.11*Math.sin(p*11-t*6)+.055*Math.sin(p*21+t*16):1;
   return [Math.sin(t)*Math.cos(p)*n,Math.cos(t)*n,Math.sin(t)*Math.sin(p)*n];
  }
  for(let a=0;a<lat;a++)for(let b=0;b<lon;b++){
   let t0=Math.PI*a/lat,t1=Math.PI*(a+1)/lat,p0=TAU*b/lon,p1=TAU*(b+1)/lon;
   let A=v(t0,p0),B=v(t1,p0),C=v(t1,p1),D=v(t0,p1);
   tri(A,B,C);tri(A,C,D);
  }
 }else if(kind==='disc'||kind==='ring'){
  const n=48,inner=kind==='ring'?.83:0;
  for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
   const P=(r,p)=>[Math.cos(p)*r,0,Math.sin(p)*r];
   tri(P(inner,a),P(1,a),P(1,b));tri(P(inner,a),P(1,b),P(inner,b));
  }
 }else if(kind==='flame'){
  const n=12;for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
   tri([0,-1.1,0],[Math.cos(a),.8,Math.sin(a)],[Math.cos(b),.8,Math.sin(b)]);
  }
 }else if(kind==='box'){
  const V=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  for(const f of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[4,0,3,7]]){
   tri(V[f[0]],V[f[1]],V[f[2]]);tri(V[f[0]],V[f[2]],V[f[3]]);
  }
 }
 return{v:new Float32Array(vertices),n:new Float32Array(normals),count:vertices.length/3};
}
function create3D(gl){
 const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const vs='attribute vec3 aPos;attribute vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModel;varying vec3 vNorm;varying vec3 vPos;varying vec3 vLocal;void main(){vec4 w=uModel*vec4(aPos,1.);vNorm=normalize(mat3(uModel)*aNormal);vPos=w.xyz;vLocal=aPos;gl_Position=uMvp*vec4(aPos,1.);}';
 const fs='precision mediump float;varying vec3 vNorm;varying vec3 vPos;varying vec3 vLocal;uniform vec4 uTint;uniform float uGlow;uniform float uMode;uniform float uTime;void main(){vec3 L=normalize(vec3(.22,.82,.56));float d=clamp(dot(normalize(vNorm),L),0.,1.);float rim=pow(1.-abs(dot(normalize(vNorm),normalize(vec3(0.,.65,1.)))),2.);vec3 rgb=uTint.rgb*(.33+.66*d)+uTint.rgb*uGlow+vec3(.16,.22,.27)*rim;if(uMode>.5&&uMode<1.5){float bands=sin(vLocal.x*23.+vLocal.y*14.+sin(vLocal.z*11.)*3.);float hot=(1.-smoothstep(.66,.97,abs(bands)))*(.53+.47*sin(uTime*6.+vLocal.z*13.));float stone=.65+.35*sin(vLocal.x*16.+vLocal.z*12.);rgb=rgb*stone+vec3(1.32,.25,.018)*hot*.67;rgb+=vec3(.28,.045,.015)*pow(1.-abs(bands),5.);}else if(uMode>1.5){rgb=mix(rgb,vec3(1.0,.38,.045),.42+.25*sin(uTime*13.+vLocal.y*7.));}gl_FragColor=vec4(rgb,uTint.a);}';
 const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 const loc=(s)=>gl.getUniformLocation(p,s),aPos=gl.getAttribLocation(p,'aPos'),aNormal=gl.getAttribLocation(p,'aNormal');
 const mvp=loc('uMvp'),model=loc('uModel'),tint=loc('uTint'),glow=loc('uGlow'),material=loc('uMode'),uTime=loc('uTime');
 const geom={};for(const k of ['rock','globe','disc','ring','flame','box']){
  const g=mesh(k);g.vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,g.vbo);gl.bufferData(gl.ARRAY_BUFFER,g.v,gl.STATIC_DRAW);
  g.nbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,g.nbo);gl.bufferData(gl.ARRAY_BUFFER,g.n,gl.STATIC_DRAW);geom[k]=g;
 }
 const colors={mint:[.18,.98,.81,1],blue:[.20,.62,.97,1],gold:[1,.70,.26,1],orange:[1,.28,.08,1],
 red:[1,.10,.21,1],dark:[.018,.046,.086,.88],stone:[.30,.16,.16,1],ash:[.045,.058,.077,.95],white:[.83,1,1,1],purple:[.60,.34,1,1]};
 let vp=id(),world=id(),draws=0,frameTime=0;
 function draw(kind,x,y,z,sx,sy,sz,c,em=0){
  const g=geom[kind];if(!g)return;
  const local=transform(x,y,z,sx,sy,sz),w=multiply(world,local);
  gl.bindBuffer(gl.ARRAY_BUFFER,g.vbo);gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,g.nbo);gl.enableVertexAttribArray(aNormal);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,0,0);
  gl.uniformMatrix4fv(mvp,false,multiply(vp,w));gl.uniformMatrix4fv(model,false,w);gl.uniform4fv(tint,c);gl.uniform1f(glow,em);gl.uniform1f(material,kind==='rock'?1:kind==='flame'?2:0);gl.uniform1f(uTime,frameTime);
  gl.drawArrays(gl.TRIANGLES,0,g.count);draws++;
 }
 function render(frame,W,g){
  if(!frame||!W||!g||!gl)return{draws:0};const pose=frame.getViewerPose(ref),xrLayer=sess.renderState.baseLayer;if(!pose)return{draws:0};
  world=W;draws=0;const now=g.elapsed;frameTime=now;
  gl.useProgram(p);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
  for(const view of pose.views){
   const viewport=xrLayer.getViewport(view);gl.bindFramebuffer(gl.FRAMEBUFFER,xrLayer.framebuffer);
   gl.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
   vp=multiply(view.projectionMatrix,view.transform.inverse.matrix);
   // Premium 5x5 physical floor: 25 solid-looking, contrasted cells, not a ghost grid.
   // Camera remains visible around and faintly through tiles to preserve depth cues.
   draw('box',0,.011,0,ARENA,.010,ARENA,[.018,.088,.155,.84]);
   const pitch=ARENA*2/5,half=pitch*.483;
   for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const x=(col-2)*pitch,z=(row-2)*pitch;
    const picked=g.calibrationCell===row*5+col;
    const shade=(row+col)%2;
    const alarm=g.events.some(e=>!e.cancelled&&!e.fake&&e.impact>now&&e.impact-now<1.1&&Math.hypot(e.x-x,e.z-z)<e.radius+pitch*.6);
    const pulse=.52+.48*Math.sin(now*10);
    const fill=picked?[.25,1,.60,.98]:alarm?[.96,.18+.11*pulse,.09,.93]:shade?[.07,.53,.78,.94]:[.04,.68,.63,.94];
    draw('box',x,.028,z,half,.005,half,fill,picked?.70:alarm?.18+.16*pulse:.32);
    if(alarm)draw('box',x,.040,z,half*.88,.001,half*.88,[1,.32,.10,.11+.12*pulse],.15);
    if(picked)draw('box',x,.038,z,pitch*.46,.003,pitch*.46,[.19,.95,.75,.26],.36);
   }
   for(const s of [-1,1]){
    draw('box',s*ARENA,.047,0,.016,.019,ARENA,[.23,1,.79,.98],.68);
    draw('box',0,.047,s*ARENA,ARENA,.019,.016,[.23,1,.79,.98],.68);
   }
   // Human is indicated by a small FLOOR-LOCKED point (no humanoid avatar).
   // It follows the recalibrated phone pose inside the physical square.
   if(g.calibrated&&g.players[0].alive){
    const you=g.players[0],breath=.5+.5*Math.sin(now*7);
    draw('disc',you.x,.051,you.z,.085,.004,.085,[.12,1,.72,.40],.35);
    draw('ring',you.x,.068,you.z,.09+breath*.013,.004,.09+breath*.013,[.51,1,.83,1],.90);
    draw('globe',you.x,.078,you.z,.022,.022,.022,[.83,1,.94,1],.60);
   }
   if(!g.online&&g.wave>4&&g.safeHint&&g.elapsed<g.safeHint.until){
    const s=g.safeHint,pulse=.5+.5*Math.sin(now*6);
    draw('disc',s.x,.039,s.z,.080,.001,.080,[.10,1,.55,.10],.12);
    draw('ring',s.x,.065,s.z,.10+pulse*.023,.003,.10+pulse*.023,[.24,1,.63,.85],.70);
   }
   for(const b of g.bonuses){
    let c=b.type==='shield'?colors.mint:colors.purple;
    draw('ring',b.x,.05,b.z,.105,.004,.105,c,.45);
    draw('globe',b.x,.14+Math.sin(now*6)*.018,b.z,.065,.068,.065,c,.72);
   }
   for(const e of g.events){
    if(e.cancelled)continue;
    const remain=e.impact-now,warning=remain>0,pulse=.6+.4*Math.sin(now*15),radius=e.radius+.073;
    if(warning){
     const red=remain<Math.max(.62,e.lead*.40),col=red?colors.red:colors.gold;
     draw('disc',e.x,.037,e.z,radius,.002,radius,[col[0],col[1],col[2],red?.22:.13],.10);
     draw('ring',e.x,.051,e.z,radius+.015,.003,radius+.015,[...col.slice(0,3),.85],.45*pulse);
     draw('ring',e.x,.048,e.z,radius*(.52+.20*pulse),.003,radius*(.52+.20*pulse),col,.3);
     const progress=clamp(1-remain/e.lead,0,1),height=.13+2.25*(1-progress)*(1-progress),scale=e.kind==='giant'?.15:.10;
     draw('rock',e.x,height,e.z,scale,scale,scale,[.17,.095,.083,1],.33);
     const tail=scale*(e.kind==='giant'?2.0:1.7);
     for(let f=0;f<5;f++){
      const y=height+.11+f*.078,fade=(5-f)/5,wobble=Math.sin(now*12+f*1.3+e.x*7)*.012;
      draw('flame',e.x+wobble,y,e.z+.01*f,tail*(.56+.38*fade),tail*.55*(.56+.42*fade),tail*(.56+.38*fade),
       f%2?[1,.30,.035,.62*fade]:[1,.80,.10,.73*fade],.82);
     }
     // Small glowing embers detach from the tail; bounded fixed draw count for mobile FPS.
     for(let f=0;f<3;f++){
      const a=now*(1.1+f*.2)+f*2.094+e.z*7,dist=(.10+f*.035)*Math.sin(now*5+f);
      draw('globe',e.x+Math.cos(a)*dist,height+.19+f*.10,e.z+Math.sin(a)*dist,
       .012,.014,.012,[1,.43+.13*f,.09,.74],.84);
     }
    }else if(remain>-(e.crater?e.craterTime+.36:.38)){
     const effect=clamp(-remain/.40,0,1),spread=radius*(1+effect*2);
     draw('disc',e.x,.033,e.z,radius*1.18,.003,radius*1.18,[.025,.012,.025,.94],.04);
     for(let crack=0;crack<6;crack++){const a=TAU*crack/6+e.x;
      const rr=radius*(.49+.14*Math.sin(now*7+crack));
      draw('box',e.x+Math.cos(a)*rr,.043,e.z+Math.sin(a)*rr,.028,.001,.014,[1,.22,.04,.64],.62);
     }
     draw('ring',e.x,.065,e.z,spread,.009,spread,[1,.38,.10,(1-effect)*.85],.56);
     if(remain>-.49){
      const size=radius*(1.25+effect*1.65);
      draw('globe',e.x,.17+effect*.12,e.z,size,size*.75,size, [1,.34,.08,(1-effect)*.60],.77);
      for(let k=0;k<10;k++){const a=TAU*k/10+e.x*7;
       const vx=Math.cos(a)*effect*spread,vz=Math.sin(a)*effect*spread;
       draw('rock',e.x+vx,.12+Math.abs(Math.sin(a*3+now*6))*.08+effect*.22,e.z+vz,
        .023,.025,.022,[.64,.22,.10,Math.max(.08,1-effect)],.58)}
     }
    }
   }
   // First-person AR: no humanoid VOS — the person holding the camera IS the player.
   // Calibration marker is the picked 5x5 cell and then the tracked floor point.
   g.players.forEach((h,i)=>{
    if(i===0||!h.alive)return;const walking=h.kind!=='human'&&h.dist>.03;
    const bob=.012*Math.sin(now*12+i),sz=.095,x=h.x,z=h.z;
    draw('disc',x,.044,z,.083,.002,.083,[0,.05,.09,.52]);
    if(h.shield)draw('ring',x,.058,z,.137,.003,.137,colors.mint,.58);
    const tint=i===0?colors.mint:i===1?colors.blue:i===2?colors.gold:colors.purple;
    draw('box',x,.23+bob,z,.069,.094,.054,tint,.12);
    draw('globe',x,.393+bob,z,.063,.067,.059,colors.white,.16);
    draw('box',x,.39+bob,z+.056,.043,.013,.010,colors.dark,.45);
    const limbShift=walking?Math.sin(now*12+i)*.025:Math.sin(now*6+i)*.014;
    for(const s of [-1,1]){
     draw('box',x+s*.046,.11,z+s*limbShift,.024,.065,.026,tint);
     draw('box',x+s*.091,.23,z-s*limbShift,.018,.067,.018,tint);
    }
    if(i===0)draw('ring',x,.055,z,.110,.003,.110,colors.mint,.90);
   });
  }
  gl.disable(gl.DEPTH_TEST);return{draws};
 }
 return {render};
}
function draw2D(ctx,width,height,g,ms){
 const dpr=Math.min(root.devicePixelRatio||1,2),c=ctx.canvas;if(c.width!==Math.round(width*dpr)||c.height!==Math.round(height*dpr)){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr)}
 ctx.setTransform(dpr,0,0,dpr,0,0);const w=width,h=height,t=(ms||0)/1000;
 let sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#040916');sky.addColorStop(.52,'#111e35');sky.addColorStop(1,'#020915');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 for(let i=0;i<65;i++){const x=(Math.sin(i*117.38)*.5+.5)*w,y=((i*34.14+t*(i%3+1)*.7)%100)/100*h;
 ctx.fillStyle='rgba(193,221,255,'+(.22+(i%4)*.13)+')';ctx.fillRect(x,y,1.5,1.5)}
 const scale=Math.min(w*.76/(2*ARENA),h*.52/(2*ARENA)),cx=w*.50,cy=h*.52;
 const P=(x,z,y=0)=>[cx+x*scale,cy+z*scale*.68-y*scale*.85];
 const circle=(x,y,r,col,blur=0)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=blur;ctx.fill();ctx.shadowBlur=0};
 ctx.save();ctx.translate(cx,cy);ctx.scale(1,.68);
 const grad=ctx.createLinearGradient(-scale*ARENA,-scale*ARENA,scale*ARENA,scale*ARENA);
 grad.addColorStop(0,'#183750');grad.addColorStop(1,'#071624');
 ctx.fillStyle=grad;ctx.fillRect(-scale*ARENA,-scale*ARENA,2*scale*ARENA,2*scale*ARENA);
 const pitch=scale*ARENA*2/5,heat=.5+.5*Math.sin(t*8);
 for(let rz=0;rz<5;rz++)for(let rx=0;rx<5;rx++){
  const fx=(rx-2)*pitch,fz=(rz-2)*pitch;
  const danger=g.events.some(e=>!e.cancelled&&!e.fake&&e.impact>g.elapsed&&e.impact-g.elapsed<1.1&&
    Math.hypot(e.x-(rx-2)*ARENA*2/5,e.z-(rz-2)*ARENA*2/5)<e.radius+ARENA*.14);
  ctx.fillStyle=danger?'rgba(255,53,42,'+(.38+.26*heat)+')':(rx+rz)%2?'#105e7c':'#0c4d6c';
  ctx.fillRect(fx-pitch*.48,fz-pitch*.48,pitch*.96,pitch*.96);
  if(danger){ctx.strokeStyle='#ff9061';ctx.lineWidth=2;ctx.strokeRect(fx-pitch*.46,fz-pitch*.46,pitch*.92,pitch*.92)}
 }
 ctx.strokeStyle='#64ffe3';ctx.lineWidth=5;ctx.shadowColor='#5bffdc';ctx.shadowBlur=14;
 ctx.strokeRect(-scale*ARENA,-scale*ARENA,2*scale*ARENA,2*scale*ARENA);ctx.shadowBlur=0;
 ctx.globalAlpha=.46;ctx.strokeStyle='#48c1e4';ctx.lineWidth=1;
 for(let n=-4;n<=4;n++){const v=n*scale*ARENA*.2;
  ctx.beginPath();ctx.moveTo(v,-scale*ARENA);ctx.lineTo(v,scale*ARENA);
  ctx.moveTo(-scale*ARENA,v);ctx.lineTo(scale*ARENA,v);ctx.stroke()}
 ctx.restore();
 if(!g.online&&g.wave>4&&g.safeHint&&g.elapsed<g.safeHint.until){
  const [x,y]=P(g.safeHint.x,g.safeHint.z),pulse=.5+.5*Math.sin(t*8);
  ctx.save();ctx.translate(x,y);ctx.scale(1,.68);ctx.beginPath();ctx.arc(0,0,scale*(.10+.017*pulse),0,TAU);
  ctx.fillStyle='#33ff7850';ctx.fill();ctx.strokeStyle='#7bffc2';ctx.lineWidth=3;ctx.shadowColor='#5cffa5';ctx.shadowBlur=12;ctx.stroke();ctx.restore();
 }
 for(const b of g.bonuses){const [x,y]=P(b.x,b.z);
 circle(x,y,10,b.type==='shield'?'#63ffda':'#ac70ff',18);ctx.font='19px system-ui';ctx.textAlign='center';ctx.fillText(b.type==='shield'?'🛡':'💎',x,y-12+Math.sin(t*6)*3)}
 for(const e of g.events){
  const remaining=e.impact-g.elapsed,p=P(e.x,e.z),r=(e.radius+.073)*scale;
  if(remaining>0){
   const red=remaining<Math.max(.62,e.lead*.4),color=red?'#ff4263':'#ffca60';
   ctx.save();ctx.translate(p[0],p[1]);ctx.scale(1,.68);ctx.fillStyle=red?'#ff3d4533':'#ffd1452e';
   ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=17;
   ctx.lineWidth=3+Math.sin(t*14)*1.2;ctx.stroke();ctx.shadowBlur=0;ctx.restore();
   const progress=clamp(1-remaining/e.lead,0,1);
   const height=(1-progress)*(1-progress)*h*.38,radius=e.kind==='giant'?22:15,yy=p[1]-height-22;
   for(let k=6;k>=1;k--){
    circle(p[0]-k*2.6,yy-k*13,radius*(1.85-k*.19),'rgba(255,'+(70+k*24)+',29,'+(.16+k*.08)+')',13);
    const sparkX=p[0]+Math.sin(k*2.2+g.elapsed*9)*radius*.78;
    circle(sparkX,yy-k*15,radius*.105,'rgba(255,225,96,'+(.55+k*.05)+')',6);
   }
   let rock=ctx.createRadialGradient(p[0]-5,yy-7,2,p[0],yy,radius);
   rock.addColorStop(0,'#ffdb7e');rock.addColorStop(.20,'#eb7131');rock.addColorStop(.65,'#4f3344');rock.addColorStop(1,'#1b1524');
   circle(p[0],yy,radius,rock,16);
   ctx.save();ctx.globalAlpha=clamp(1-remaining/e.lead,0,1)*.84;ctx.strokeStyle=color;
   ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();
   ctx.arc(p[0],p[1],r*(1.28+.1*Math.sin(t*13)),0,TAU);ctx.stroke();ctx.restore();
   ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillStyle=color;
   ctx.fillText(remaining<.75?'¡AHORA!':e.kind==='tricky'?'¿CAMBIA DE RUMBO?':'',p[0],p[1]+r+14);
  }else if(remaining>-(e.crater?e.craterTime+.36:.38)){
   const q=clamp(-remaining/.5,0,1);
   ctx.save();ctx.translate(...p);ctx.scale(1,.68);
   circle(0,0,r*1.1,'#0d0a16');ctx.strokeStyle='#ff7e41';ctx.lineWidth=3*(1-q)+.5;
   for(let shard=0;shard<9;shard++){const a=TAU*shard/9+e.x*4;
    const dist=(q+.12)*r*2,xx=Math.cos(a)*dist,yy=Math.sin(a)*dist;
    circle(xx,yy,Math.max(1,(1-q)*3.8),'rgba(255,138,52,'+(.84*(1-q))+')',6);
   }
   ctx.beginPath();ctx.arc(0,0,r*(1+q*2.4),0,TAU);ctx.stroke();
   ctx.restore();if(q<.95)circle(p[0],p[1]-24*q,15+q*r*.6,'rgba(255,93,32,'+(.6*(1-q))+')',25);
  }
 }
 for(const a of [...g.players].sort((a,b)=>a.z-b.z)){
  if(!a.alive)continue;const [x,y]=P(a.x,a.z),vos=a.id==='you',c=a.color;
  if(vos){
   // 2D touchscreen fallback needs a cue, not a puppet/humanoid avatar.
   ctx.save();ctx.strokeStyle='#65ffbe';ctx.fillStyle='#59ffd526';ctx.shadowBlur=18;ctx.shadowColor='#63ffce';ctx.lineWidth=4;
   ctx.beginPath();ctx.ellipse(x,y,Math.max(9,scale*.095),Math.max(6,scale*.064),0,0,TAU);ctx.fill();ctx.stroke();ctx.restore();
  }else{
   ctx.fillStyle='#000a';ctx.beginPath();ctx.ellipse(x,y+4,13,6,0,0,TAU);ctx.fill();
   circle(x,y-16,12,c,14);circle(x,y-34+(Math.sin(t*11+a.dist*3)*2),11,'#f4faff');
   ctx.fillStyle='#122338';ctx.fillRect(x-7,y-36,14,5);
  }
  ctx.fillStyle='#fff';ctx.font=(vos?'1000 13px':'800 9px')+' system-ui';ctx.textAlign='center';
  ctx.shadowBlur=5;ctx.shadowColor='#000';ctx.fillText(vos?'TU POSICIÓN':a.name,x,vos?y-23:y-51);ctx.shadowBlur=0;
  if(a.shield){ctx.strokeStyle='#6fffd9';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y-20,20,24,0,0,TAU);ctx.stroke()}
 }
 if(g.elapsed>54&&g.stage==='playing'){
  ctx.fillStyle='rgba(255,42,45,'+(.035+.038*Math.sin(t*7)**2)+')';ctx.fillRect(0,0,w,h);
 }
 if(g.fx.some(f=>f.type==='streak'&&g.elapsed-f.at<1)){
  const alpha=clamp(1-g.fx.filter(f=>f.type==='streak').slice(-1)[0]?.at+g.elapsed,0,1);
  ctx.fillStyle='rgba(240,189,42,'+(.030*(1-alpha))+')';ctx.fillRect(0,0,w,h);
 }
}
root.MeteorosArt=Object.freeze({create3D,draw2D});
})(typeof window!=='undefined'?window:globalThis);
