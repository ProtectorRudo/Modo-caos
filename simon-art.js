'use strict';
/* Simón AR: nueve placas físicas luminosas y anfitrión robótico; WebGL nativo. */
(function(root){
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let k=0;k<4;k++)for(let n=0;n<4;n++)r[c*4+n]+=a[k*4+n]*b[c*4+k];return r}
function box(x,y,z,sx,sy,sz){const m=I();m[0]=sx;m[5]=sy;m[10]=sz;m[12]=x;m[13]=y;m[14]=z;return m}
const F=[
 [-1,-1,1,1,-1,1,1,1,1,-1,-1,1,1,1,1,-1,1,1],
 [1,-1,-1,-1,-1,-1,-1,1,-1,1,-1,-1,-1,1,-1,1,1,-1],
 [-1,-1,-1,-1,-1,1,-1,1,1,-1,-1,-1,-1,1,1,-1,1,-1],
 [1,-1,1,1,-1,-1,1,1,-1,1,-1,1,1,1,-1,1,1,1],
 [-1,1,1,1,1,1,1,1,-1,-1,1,1,1,1,-1,-1,1,-1],
 [-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,-1,1,-1,1,-1,-1,1]
];
function create(gl){
 const vs='attribute vec3 pos;uniform mat4 mvp;varying vec3 v;void main(){v=pos;gl_Position=mvp*vec4(pos,1.);}';
 const fs='precision mediump float;varying vec3 v;uniform vec4 tint;uniform float shine;void main(){float edge=max(abs(v.x),abs(v.z));float d=0.76+0.22*clamp(v.y+.25,0.,1.);float s=pow(max(0.,1.-length(v.xz)*.62),2.);vec3 c=tint.rgb*(d+.24*s+shine);c+=vec3(.16,.20,.29)*(1.-smoothstep(.82,1.,edge))*.10;gl_FragColor=vec4(c,tint.a);}';
 function shader(type,source){let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(F.flat()),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(program,'pos'),uMvp=gl.getUniformLocation(program,'mvp'),uTint=gl.getUniformLocation(program,'tint'),uShine=gl.getUniformLocation(program,'shine');
 let VP=I(),W=I(),draws=0;
 function cube(x,y,z,sx,sy,sz,color,shine=0){const m=mul(VP,mul(W,box(x,y,z,sx,sy,sz)));gl.uniformMatrix4fv(uMvp,false,m);gl.uniform4fv(uTint,color);gl.uniform1f(uShine,shine);gl.drawArrays(gl.TRIANGLES,0,36);draws++}
 function render(frame,world,session,ref,g,pitch,selected,player,time,blackout=false){
  if(!session||!ref||!frame||!world)return 0;
  const pose=frame.getViewerPose(ref),layer=session.renderState.baseLayer;if(!pose)return 0;
  W=world;draws=0;gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
  for(const view of pose.views){
   const v=layer.getViewport(view);gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.viewport(v.x,v.y,v.width,v.height);
   VP=mul(view.projectionMatrix,view.transform.inverse.matrix);
   const side=pitch*1.5;const C=root.SimonCore.COLORS;
   cube(0,.009,0,side,.009,side,[.014,.032,.071,.75],.20);
   for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const i=row*3+col,x=(col-1)*pitch,z=(row-1)*pitch;
    const key=g.colorMap?g.colorMap[i]:i,colr=C[key].rgb;
    const active=g.highlight===key||g.highlight===i&&g.phase==='show';
    const flash=active?(Math.sin(time*.021)*.08+.92):0;
    const elec=g.trap==='electrica'&&g.phase==='act'&&g.electric===i&&root.SimonCore.electricalUnsafe(g,time);
    const picked=selected===i||player?.tile===i;
    const dim=blackout?.22:1;
    cube(x,.021,z,pitch*.485,.013,pitch*.485,[.02,.06,.14,.96],.08);
    cube(x,.038,z,pitch*.451,.011,pitch*.451,[colr[0]*.27*dim,colr[1]*.27*dim,colr[2]*.27*dim,.99],.12+flash*.4);
    cube(x,.049,z,pitch*.407,.003,pitch*.407,
     [Math.min(1,colr[0]*(.71+flash*.4))*dim,Math.min(1,colr[1]*(.71+flash*.4))*dim,Math.min(1,colr[2]*(.71+flash*.4))*dim,.96],.15+flash*.50);
    if(g.ghost===i&&g.phase==='show')cube(x,.066,z,pitch*.48,.006,pitch*.48,[.78,1,1,.96],1.2);
    if(active||elec||picked){
     const color=elec?[1,.15,.09,.83]:picked?[.7,1,.88,.86]:[1,1,1,.93];
     cube(x,.056,z,pitch*.436,.003,pitch*.436,color,.38+flash*.28);
     cube(x,.060,z,pitch*.385,.004,pitch*.385,
      [colr[0]*dim,colr[1]*dim,colr[2]*dim,.96],.42+flash*.48);
    }
    for(const sx of [-1,1]){
     cube(x+sx*pitch*.45,.050,z,pitch*.007,.007,pitch*.443,[colr[0],colr[1],colr[2],.98],.7);
     cube(x,.050,z+sx*pitch*.45,pitch*.445,.007,pitch*.007,[colr[0],colr[1],colr[2],.98],.7);
    }
   }
   for(const s of [-1,1]){
    cube(s*side,.047,0,pitch*.012,.012,side,[.13,1,.91,.9],.9);
    cube(0,.047,s*side,side,.012,pitch*.012,[.13,1,.91,.9],.9);
   }
   if(player&&player.tile>=0&&player.tile<9){
    const px=player.x,pz=player.z;
    cube(px,.071,pz,pitch*.16,.009,pitch*.16,[.11,1,.66,.83],.75);
    cube(px,.09,pz,pitch*.062,.022,pitch*.062,[.82,1,.99,.92],.8);
   }
   // SIMÓN: anfitrión robótico holográfico suspendido fuera de las nueve baldosas.
   const z=-side-pitch*.18,bob=Math.sin(time*.003)*.028;
   cube(0,.27+bob,z,pitch*.29,.20,pitch*.15,[.07,.17,.35,.92],.38);
   cube(0,.29+bob,z+pitch*.154,pitch*.24,.14,pitch*.018,[.04,.89,.95,.96],.52);
   const expression=g.phase==='retry'||g.phase==='finished'&&g.lives===0;
   for(const x of [-pitch*.085,pitch*.085])cube(x,.32+bob,z+pitch*.178,pitch*.029,expression?pitch*.013:pitch*.039,pitch*.01,expression?[1,.22,.34,1]:[.90,1,1,1],.85);
   cube(0,.235+bob,z+pitch*.179,pitch*.11,pitch*.012,pitch*.012,[.99,.29,.69,.96],.65);
   cube(0,.51+bob,z,pitch*.018,pitch*.06,pitch*.018,[.13,.83,1,1],.8);
   cube(0,.58+bob,z,pitch*.055,pitch*.055,pitch*.055,[.19,1,.77,.96],1);
  }
  gl.disable(gl.DEPTH_TEST);return draws;
 }
 function destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program)}
 return{render,destroy};
}
root.SimonArt=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
