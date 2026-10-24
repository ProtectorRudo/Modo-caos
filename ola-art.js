'use strict';
/* OLA ROJA — WebGL de baldosas en espacio real y Canvas 2D para laboratorio.
 * El world matrix llega desde /engine.js, nunca se vincula a la pantalla. */
(function(root){
const N=6,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgb={safe:[.025,.135,.24,1],border:[.075,.87,.99,1],yellow:[1,.61,.09,1],red:[1,.075,.12,1],white:[.93,1,1,1]};
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let k=0;k<4;k++)for(let r=0;r<4;r++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function create3D(gl){
 const v='attribute vec3 aPosition;attribute vec4 aColor;uniform mat4 uMVP;varying vec4 vColor;void main(){gl_Position=uMVP*vec4(aPosition,1.);vColor=aColor;}';
 const f='precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}';
 const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 const buf=gl.createBuffer(),position=gl.getAttribLocation(p,'aPosition'),color=gl.getAttribLocation(p,'aColor'),mvp=gl.getUniformLocation(p,'uMVP');
 function render(frame,ref,W,g,tile,opts={}){
  const pose=frame.getViewerPose(ref);if(!pose)return;
  const state=opts.preview?'preview':opts.calibrating?'calibrate':'playing';
  const states=state==='preview'||state==='calibrate'?Array(36).fill('safe'):root.OlaRojaCore.cells(g);
  const floats=[];let count=0,low=.038;
  function vertex(x,y,z,c){floats.push(x,y,z,...c);count++}
  function tri(a,b,c,col){vertex(...a,col);vertex(...b,col);vertex(...c,col)}
  function quad(x0,z0,x1,z1,y,col){tri([x0,y,z0],[x1,y,z0],[x1,y,z1],col);tri([x0,y,z0],[x1,y,z1],[x0,y,z1],col)}
  function ring(x,z,r,y,col,width=.028,segments=20){
   for(let j=0;j<segments;j++){let a=j*TAU/segments,b=(j+1)*TAU/segments;
    const q=(rr,ang)=>[x+Math.cos(ang)*rr,y,z+Math.sin(ang)*rr];
    tri(q(r,a),q(r,b),q(r-width,b),col);tri(q(r,a),q(r-width,b),q(r-width,a),col);
   }
  }
  const pulse=.70+.30*Math.sin(performance.now()*.006);
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
   const i=r*N+c,s=states[i],x=(c-3)*tile,z=(r-3)*tile,margin=tile*.035;
   const dark=s==='red'?[.31,.014,.042,.97]:s==='yellow'?[.30,.17,.03,.95]:[(c+r)%2?.045:.035,.14,.23,.91];
   quad(x+margin,z+margin,x+tile-margin,z+tile-margin,low,dark);
   const edge=s==='red'?[1,.16*pulse,.17,.99]:s==='yellow'?[1,.70*pulse,.12,.99]:[.09,.78+(c+r)%3*.06,.95,.96];
   const width=s==='red'?tile*.038:tile*.020,y=low+.005;
   quad(x+margin,z+margin,x+tile-margin,z+margin+width,y,edge);
   quad(x+margin,z+tile-margin-width,x+tile-margin,z+tile-margin,y,edge);
   quad(x+margin,z+margin,x+margin+width,z+tile-margin,y,edge);
   quad(x+tile-margin-width,z+margin,x+tile-margin,z+tile-margin,y,edge);
   if(s==='red'){
    quad(x+tile*.30,z+tile*.16,x+tile*.39,z+tile*.84,low+.008,[1,.22,.10,.42*pulse]);
    quad(x+tile*.55,z+tile*.16,x+tile*.64,z+tile*.84,low+.008,[1,.22,.10,.35*pulse]);
   }
   if(s==='yellow')quad(x+tile*.2,z+tile*.46,x+tile*.8,z+tile*.54,low+.01,[1,.89,.28,.86]);
  }
  // Marco físico de pista; el indicador de jugador se dibuja en el mismo mundo.
  const length=N*tile,edge=.012*length;const glow=[.16,1,.87,.92];
  quad(-length/2,-length/2,length/2,-length/2+edge,low+.012,glow);
  quad(-length/2,length/2-edge,length/2,length/2,low+.012,glow);
  quad(-length/2,-length/2,-length/2+edge,length/2,low+.012,glow);
  quad(length/2-edge,-length/2,length/2,length/2,low+.012,glow);
  if(opts.calibrated){
   const x=(g.pos.x-3)*tile,z=(g.pos.z-3)*tile;
   const marker=g.invuln>0?[1,.65,.53,.96]:[.95,1,1,1];
   ring(x,z,tile*.31,low+.032,marker,tile*.07);
   ring(x,z,tile*.43,low+.025,[.30,1,.92,.60*pulse],tile*.014);
   quad(x-tile*.055,z-tile*.055,x+tile*.055,z+tile*.055,low+.035,marker);
  }
  const data=new Float32Array(floats);
  gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(color);
  gl.vertexAttribPointer(position,3,gl.FLOAT,false,28,0);gl.vertexAttribPointer(color,4,gl.FLOAT,false,28,12);
  gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const layer=frame.session.renderState.baseLayer;
  gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
  for(const view of pose.views){const vp=layer.getViewport(view);gl.viewport(vp.x,vp.y,vp.width,vp.height);
   gl.uniformMatrix4fv(mvp,false,mul(view.projectionMatrix,mul(view.transform.inverse.matrix,W)));
   gl.drawArrays(gl.TRIANGLES,0,count);
  }
 }
 return {render};
}
function create2D(canvas){
 const ctx=canvas.getContext('2d');let metrics={x:0,y:0,tile:0};
 function render(g,t=0){
  const w=canvas.width=canvas.clientWidth*devicePixelRatio,h=canvas.height=canvas.clientHeight*devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  const W=canvas.clientWidth,H=canvas.clientHeight;
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#111a34');bg.addColorStop(1,'#020916');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const size=Math.min(W-24,H*.64,525),tile=size/6,x=(W-size)/2,y=H*.48-size/2+20;
  metrics={x,y,tile};
  const states=root.OlaRojaCore.cells(g);
  for(let r=0;r<6;r++)for(let c=0;c<6;c++){
   const s=states[r*6+c],bx=x+c*tile,by=y+r*tile,pulse=.55+.45*Math.sin(t*.007+c*.36+r*.6);
   ctx.shadowBlur=s==='red'?19:s==='yellow'?12:8;ctx.shadowColor=s==='red'?'#ff193c':s==='yellow'?'#ffb32d':'#13c7ff';
   ctx.fillStyle=s==='red'?'#801123':s==='yellow'?'#8c560d':(c+r)%2?'#082b45':'#103451';
   ctx.fillRect(bx+3,by+3,tile-6,tile-6);
   ctx.lineWidth=s==='red'?3.8:2;ctx.strokeStyle=s==='red'?'#ff344c':s==='yellow'?'#ffd04a':'#16b8e5';
   ctx.strokeRect(bx+3,by+3,tile-6,tile-6);
   if(s==='red'){ctx.fillStyle='rgba(255,80,89,'+(.24+.25*pulse)+')';ctx.fillRect(bx+tile*.40,by+tile*.16,tile*.2,tile*.68)}
   if(s==='yellow'){ctx.fillStyle='#fff0a6';ctx.fillRect(bx+tile*.25,by+tile*.46,tile*.5,tile*.09)}
  }
  ctx.shadowBlur=0;ctx.strokeStyle='#55ffef';ctx.lineWidth=4;ctx.strokeRect(x,y,size,size);
  if(g.stage!=='ready'||g.pos){
   const px=x+g.pos.x*tile,py=y+g.pos.z*tile;
   ctx.shadowBlur=24;ctx.shadowColor='#a8fff6';
   ctx.beginPath();ctx.arc(px,py,tile*.3,0,TAU);ctx.fillStyle='#a5fff841';ctx.fill();
   ctx.lineWidth=4;ctx.strokeStyle='#f2ffff';ctx.stroke();ctx.shadowBlur=0;
   ctx.font='900 '+Math.max(11,tile*.25)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('VOS',px,py-tile*.43);
  }
  ctx.font='800 11px system-ui';ctx.fillStyle='#9cb9c8';ctx.textAlign='center';
  ctx.fillText('DEMO 2D · DESLIZÁ / TOCÁ PARA MOVERTE',W/2,y+size+28);
  return metrics;
 }
 function point(x,y){const c=Math.floor((x-metrics.x)/metrics.tile),r=Math.floor((y-metrics.y)/metrics.tile);
  return c>=0&&c<6&&r>=0&&r<6?{x:c+.5,z:r+.5}:null}
 return {render,point};
}
root.OlaRojaArt=Object.freeze({create3D,create2D,mul});
})(typeof window!=='undefined'?window:globalThis);
