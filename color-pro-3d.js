'use strict';
/*
 * COLOR RUSH PRO / Native WebGL 3D (visual only)
 * Runs AFTER the existing engine.js render via its optional XR frame hook.
 * Absolutely no changes to positioning, hit testing, tile polygons,
 * calibrating, input, scoring, timing, or the original XR context.
 * Self-contained GLSL ES 1.00; no external render libraries or binary assets.
 * On GPU failures, the original drawing + SVG premium fallback remain active.
 */
(function () {
  if (window.ColorRushPro3D || new URLSearchParams(location.search).get('visual') === 'classic') return;
  const overlay = document.getElementById('overlay');
  const heading = document.getElementById('headline');
  const burst = document.getElementById('burst');
  if (!overlay || !heading || !document.getElementById('tiles')) return;

  const rgbPalette = [
    [0.13,0.95,0.51], [1.0,0.82,0.13], [1.0,0.19,0.32],
    [0.15,0.54,1.0], [0.67,0.30,1.0], [1.0,0.49,0.09]
  ];
  const names = ['VERDE','AMARILLO','ROJO','AZUL','VIOLETA','NARANJA'];
  const bootTime = performance.now();
  let context = null, program = null, sparksProgram = null, sparkBuffer = null;
  let buffers = null, lastSignature = '', ready = false, fault = false, failureCount = 0;
  let activeColor = -1, lastPlayingColor = -1, burstColor = -1, lastTargetRead = 0, lastBurst = '', burstAt = -10000, lastFrameAt = 0, samples = 0;
  let measuredFps = 0, lastFpsAt = 0, gfxError = '', lowFpsIntervals = 0, effectsEnabled = true;
  const STAR_COUNT = 56;
  const STRIDE = 12; // local xyz, normal xyz, UV, tile RGB, palette index
  const srcVertex = [
    'attribute vec3 aPosition;',
    'attribute vec3 aNormal;',
    'attribute vec2 aUV;',
    'attribute vec3 aTint;',
    'attribute float aColorId;',
    'uniform mat4 uPV, uWorld;',
    'uniform float uScale;',
    'varying vec3 vNormal, vWorld, vTint;',
    'varying vec2 vUV;',
    'varying float vColorId;',
    'void main(){',
    ' vec4 p = vec4(aPosition.x*uScale, 0.008 + aPosition.y*uScale, aPosition.z*uScale, 1.0);',
    ' vec4 wp=uWorld*p;',
    ' vWorld=wp.xyz; vNormal=normalize(mat3(uWorld)*aNormal);',
    ' vUV=aUV; vTint=aTint; vColorId=aColorId;',
    ' gl_Position=uPV*wp;',
    '}'
  ].join('\n');
  const srcFragment = [
    "precision mediump float;",
    "uniform float uTime, uKind, uTarget, uPreview, uEnergy;",
    "uniform vec3 uEye;",
    "varying vec3 vNormal, vWorld, vTint;",
    "varying vec2 vUV;",
    "varying float vColorId;",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "void main(){",
    " vec3 N=normalize(vNormal),V=normalize(uEye-vWorld);",
    " vec3 L=normalize(vec3(-0.38,0.83,0.47));",
    " vec3 L2=normalize(vec3(0.62,0.42,-0.62));",
    " float ndl=max(dot(N,L),0.0),ndv=max(dot(N,V),0.0);",
    " float fres=pow(1.0-ndv,3.0);",
    " float h1=pow(max(dot(N,normalize(L+V)),0.0),58.0);",
    " float h2=pow(max(dot(N,normalize(L2+V)),0.0),115.0);",
    " float grain=hash(floor(vUV*vec2(155.0,131.0)))-.5;",
    " float focus=1.0-step(0.3,abs(vColorId-uTarget));",
    " float pulse=0.5+0.5*sin(uTime*4.0);",
    " vec3 col=vec3(0.0);",
    " float a=1.0;",
    " if(uKind<0.5){",
    "   // Brushed graphite alloy, two soft studio highlights and machined finish.",
    "   float brushed=0.010*sin(vUV.y*330.0)+0.014*grain;",
    "   vec3 steel=vec3(0.15,0.19,0.23);",
    "   float ambient=0.34+0.52*ndl+0.18*fres;",
    "   col=steel*(ambient+brushed);",
    "   col+=vec3(.61,.78,.87)*h1*.35+vec3(.20,.48,.63)*h2*.22;",
    "   col+=vTint*(.025+.018*focus);",
    " }else if(uKind<1.5){",
    "   // Dense lacquered glass, not perforated plastic.",
    "   vec2 uv=vUV;",
    "   float rim=max(abs(uv.x-.5),abs(uv.y-.5))*2.0;",
    "   float depth=smoothstep(.45,1.0,rim);",
    "   float barrel=1.0-smoothstep(.0,.52,length(uv-vec2(.5)));",
    "   float studio=1.0-smoothstep(.026,.17,abs(uv.y-(.82-.27*uv.x)));",
    "   float studio2=1.0-smoothstep(.01,.11,abs(uv.y-(.25-.09*uv.x)));",
    "   float spot=pow(max(dot(N,normalize(L+V)),0.0),73.0);",
    "   float grainGlass=0.006*grain;",
    "   float iris=.08+.07*barrel;",
    "   float focusBoost=focus*(.05+.10*pulse);",
    "   col=vTint*(.64+.20*ndl+.10*fres+iris-depth*.19+focusBoost+grainGlass);",
    "   col+=vec3(.82,.97,1.0)*(studio*.20+studio2*.075+spot*.24);",
    "   col+=vTint*.07*pow(fres,1.4);",
    "   a=mix(1.0,.88,uPreview);",
    " }else if(uKind<2.5){",
    "   // Thin lightpipe integrated into the glass bezel.",
    "   col=vTint*(.67+.09*pulse+.20*focus);",
    "   col+=vec3(.14,.22,.24)*h1;",
    " }else if(uKind<3.5){",
    "   col=vec3(.004,.012,.022);",
    "   a=.22;",
    " }else{",
    "   col=vTint*(.24+.14*pulse+.16*focus);",
    "   a=(.24+.15*focus)*uEnergy;",
    " }",
    " gl_FragColor=vec4(clamp(col,0.0,1.0),a);",
    "}",
  ].join('\n');

  const starVS=[
    'attribute vec4 aPoint;', // xyz world-relative local, age
    'attribute vec3 aColor;',
    'uniform mat4 uPV, uWorld;',
    'uniform float uScale, uDpr;',
    'varying vec3 vC;',
    'varying float vA;',
    'void main(){',
    ' vec4 p=uWorld*vec4(aPoint.x*uScale,0.008+aPoint.y*uScale,aPoint.z*uScale,1.0);',
    ' gl_Position=uPV*p;',
    ' gl_PointSize=clamp(70.0/max(0.65,gl_Position.w),2.0,22.0)*uDpr;',
    ' vC=aColor;vA=aPoint.w;',
    '}'
  ].join('\n');
  const starFS=[
    'precision mediump float;',
    'varying vec3 vC;',
    'varying float vA;',
    'void main(){',
    ' vec2 q=gl_PointCoord*2.0-1.0;',
    ' float d=length(q);',
    ' float core=pow(max(0.0,1.0-d),2.2);',
    ' float streak=max(0.0,1.0-abs(q.x)*13.0)*(1.0-abs(q.y));',
    ' streak+=max(0.0,1.0-abs(q.y)*13.0)*(1.0-abs(q.x));',
    ' float alpha=(core+streak*.48)*vA;',
    ' if(alpha<.04)discard;',
    ' gl_FragColor=vec4(min(vec3(1.0),vC*.76+vec3(.35)*core),min(alpha,1.0));',
    '}'
  ].join('\n');

  function compile(g,type,source) {
    const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);
    if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error('CR3D GLSL '+g.getShaderInfoLog(s));
    return s;
  }
  function link(g,vs,fs,names) {
    const p=g.createProgram(),vert=compile(g,g.VERTEX_SHADER,vs),frag=compile(g,g.FRAGMENT_SHADER,fs);
    g.attachShader(p,vert);g.attachShader(p,frag);
    names.forEach((n,i)=>g.bindAttribLocation(p,i,n));
    g.linkProgram(p);
    if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error('CR3D program '+g.getProgramInfoLog(p));
    g.deleteShader(vert);g.deleteShader(frag);
    return p;
  }
  function uniforms(g,p,keys) {
    const o={};keys.forEach(k=>o[k]=g.getUniformLocation(p,k));return o;
  }
  function init(g) {
    context=g;
    program=link(g,srcVertex,srcFragment,['aPosition','aNormal','aUV','aTint','aColorId']);
    sparksProgram=link(g,starVS,starFS,['aPoint','aColor']);
    buffers={};
    ['shadows','metal','glass','light','aura','wave'].forEach(k=>buffers[k]={vbo:g.createBuffer(),count:0});
    sparkBuffer=g.createBuffer();
    init.lit=uniforms(g,program,['uPV','uWorld','uScale','uEye','uTime','uKind','uTarget','uPreview','uEnergy']);
    init.spark=uniforms(g,sparksProgram,['uPV','uWorld','uScale','uDpr']);
    return true;
  }
  const id=(a,b,c)=>[a,b,c];
  function buildGrid(tileColors) {
    const buckets={shadows:[],metal:[],glass:[],light:[],aura:[]};
    function v(buf,p,n,uv,c,index){
      buf.push(p[0],p[1],p[2],n[0],n[1],n[2],uv[0],uv[1],c[0],c[1],c[2],index);
    }
    function quad(group,p0,p1,p2,p3,n,c,ci){
      const b=buckets[group];
      v(b,p0,n,[0,0],c,ci);v(b,p1,n,[1,0],c,ci);v(b,p2,n,[1,1],c,ci);
      v(b,p0,n,[0,0],c,ci);v(b,p2,n,[1,1],c,ci);v(b,p3,n,[0,1],c,ci);
    }
    function box(group,x,z,w,d,y0,y1,c,ci){
      const l=x-w/2,r=x+w/2,t=z-d/2,b=z+d/2;
      quad(group,id(l,y1,t),id(r,y1,t),id(r,y1,b),id(l,y1,b),id(0,1,0),c,ci);
      quad(group,id(l,y0,b),id(r,y0,b),id(r,y0,t),id(l,y0,t),id(0,-1,0),c,ci);
      quad(group,id(l,y0,t),id(r,y0,t),id(r,y1,t),id(l,y1,t),id(0,0,-1),c,ci);
      quad(group,id(r,y0,t),id(r,y0,b),id(r,y1,b),id(r,y1,t),id(1,0,0),c,ci);
      quad(group,id(r,y0,b),id(l,y0,b),id(l,y1,b),id(r,y1,b),id(0,0,1),c,ci);
      quad(group,id(l,y0,b),id(l,y0,t),id(l,y1,t),id(l,y1,b),id(-1,0,0),c,ci);
    }
    function ring(group,x,z,outer,inner,yLow,yHigh,c,ci){
      const corners=[
        [-1,-1],[1,-1],[1,1],[-1,1]
      ];
      for(let k=0;k<4;k++){
        const a=corners[k],b=corners[(k+1)%4];
        const p0=id(x+a[0]*outer,yLow,z+a[1]*outer),p1=id(x+b[0]*outer,yLow,z+b[1]*outer);
        const p2=id(x+b[0]*inner,yHigh,z+b[1]*inner),p3=id(x+a[0]*inner,yHigh,z+a[1]*inner);
        let n=id(a[0]+b[0],.76,a[1]+b[1]);
        const s=Math.hypot(n[0],n[1],n[2]);n=n.map(v=>v/s);
        quad(group,p0,p1,p2,p3,n,c,ci);
      }
    }
    for(let i=0;i<25;i++){
      const x=i%5-2,z=(i/5|0)-2,ci=tileColors[i],c=rgbPalette[ci]||rgbPalette[0];
      quad('shadows',id(x-.468,-.014,z-.468),id(x+.468,-.014,z-.468),
        id(x+.468,-.014,z+.468),id(x-.468,-.014,z+.468),id(0,1,0),c,ci);
      box('metal',x,z,.936,.936,0,.041,c,ci);
      ring('metal',x,z,.467,.429,.042,.073,c,ci);
      quad('glass',id(x-.426,.061,z-.426),id(x+.426,.061,z-.426),
        id(x+.426,.061,z+.426),id(x-.426,.061,z+.426),id(0,1,0),c,ci);
      const e=.425,h=.075,th=.007;
      // Clear, readable glass centers: no distracting neon crosses.
      // Glass edge luminescence
      box('light',x,z-.426,.852,.007,.070,.076,c,ci);
      box('light',x,z+.426,.852,.007,.070,.076,c,ci);
      box('light',x-.426,z,.007,.852,.070,.076,c,ci);
      box('light',x+.426,z,.007,.852,.070,.076,c,ci);
      // Four rivet cavities and corner clamps
      for(const s of [-1,1])for(const q of [-1,1]){
        box('metal',x+s*.446,z+q*.446,.029,.029,.042,.077,c,ci);
        box('aura',x+s*.446,z+q*.446,.009,.009,.078,.081,c,ci);
      }
    }
    // Compact sci-fi arena frame; less than 8cm virtual height above surface.
    for(const s of [-1,1]){
      box('metal',0,s*2.535,5.16,.072,0,.054,rgbPalette[0],0);
      box('metal',s*2.535,0,.072,5.16,0,.054,rgbPalette[0],0);
      box('light',0,s*2.535,5.14,.015,.062,.077,rgbPalette[0],0);
      box('light',s*2.535,0,.015,5.14,.062,.077,rgbPalette[0],0);
      box('aura',0,s*2.535,5.20,.055,.062,.068,rgbPalette[0],0);
      box('aura',s*2.535,0,.055,5.20,.062,.068,rgbPalette[0],0);
      for(const t of [-2.52,2.52]){
        box('metal',s*2.53,t,.14,.14,0,.078,rgbPalette[0],0);
        box('light',s*2.53,t,.07,.07,.08,.087,rgbPalette[0],0);
      }
    }
    const g=context;
    Object.keys(buckets).forEach(k=>{
      const item=buffers[k],data=new Float32Array(buckets[k]);
      g.bindBuffer(g.ARRAY_BUFFER,item.vbo);
      g.bufferData(g.ARRAY_BUFFER,data,g.STATIC_DRAW);
      item.count=data.length/STRIDE;
    });
    return Object.values(buffers).reduce((n,x)=>n+x.count,0);
  }
  function bindVertices(g,buf){
    g.bindBuffer(g.ARRAY_BUFFER,buf);
    const bytes=STRIDE*4;
    for(const [i,n,offset] of [[0,3,0],[1,3,3],[2,2,6],[3,3,8],[4,1,11]]){
      g.enableVertexAttribArray(i);
      g.vertexAttribPointer(i,n,g.FLOAT,false,bytes,offset*4);
    }
  }
  function multiply(a,b){
    const o=new Float32Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];
    return o;
  }
  function drawLit(g,pv,W,eye,time,scale){
    const u=init.lit;
    g.useProgram(program);
    g.uniformMatrix4fv(u.uPV,false,pv);
    g.uniformMatrix4fv(u.uWorld,false,W);
    g.uniform1f(u.uScale,scale);
    g.uniform3f(u.uEye,eye.x,eye.y,eye.z);
    g.uniform1f(u.uTime,time*.001);
    g.uniform1f(u.uTarget,activeColor);
    g.uniform1f(u.uPreview,typeof stage==='string' && stage==='preview'?1:0);
    g.uniform1f(u.uEnergy,1);
    const passes=[
      ['shadows',3,false],['metal',0,true],['glass',1,true],
      ['light',2,true],['aura',4,false]
    ];
    for(const [key,kind,opaque] of passes){
      const batch=buffers[key];
      g.depthMask(opaque);
      if(key==='shadows'){g.disable(g.DEPTH_TEST);}
      else g.enable(g.DEPTH_TEST);
      if(!opaque)g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
      g.uniform1f(u.uKind,kind);
      bindVertices(g,batch.vbo);
      g.drawArrays(g.TRIANGLES,0,batch.count);
    }
  }
  function drawWave(g,time){
    const age=time-burstAt;
    if(age<0||age>=850||burstColor<0 || !buffers.wave)return;
    const t=age/850, radius=.04+t*.42, thickness=.014+.025*t;
    const c=rgbPalette[burstColor], verts=[];
    const push=(x,y,z,u,v)=>{
      verts.push(x,y,z,0,1,0,u,v,c[0],c[1],c[2],burstColor);
    };
    for(let cell=0;cell<25;cell++){
      if(typeof tiles==='undefined'||tiles[cell]!==burstColor)continue;
      const x=cell%5-2,z=(cell/5|0)-2,segments=32;
      for(let j=0;j<segments;j++){
        const a=j*Math.PI*2/segments,b=(j+1)*Math.PI*2/segments;
        const p=(angle,r)=>[x+Math.cos(angle)*r,.105,z+Math.sin(angle)*r];
        const v0=p(a,radius),v1=p(b,radius),v2=p(b,radius+thickness),v3=p(a,radius+thickness);
        push(...v0,0,0);push(...v1,1,0);push(...v2,1,1);
        push(...v0,0,0);push(...v2,1,1);push(...v3,0,1);
      }
    }
    if(!verts.length)return;
    const b=buffers.wave;
    g.bindBuffer(g.ARRAY_BUFFER,b.vbo);
    g.bufferData(g.ARRAY_BUFFER,new Float32Array(verts),g.DYNAMIC_DRAW);
    g.useProgram(program);
    g.uniform1f(init.lit.uKind,4);
    g.uniform1f(init.lit.uEnergy,1-t);
    g.depthMask(false);
    g.enable(g.BLEND);
    g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
    bindVertices(g,b.vbo);
    g.drawArrays(g.TRIANGLES,0,verts.length/STRIDE);
  }
  function drawSparks(g,pv,W,scale,time){
    const age=time-burstAt;
    if(!(age>=0 && age<850) || burstColor<0)return;
    const t=age/850, c=rgbPalette[burstColor],a=[];
    for(let i=0;i<STAR_COUNT;i++){
      const n=(i*31+7)%25;
      const x=(n%5-2),z=((n/5)|0)-2;
      if(typeof tiles==='undefined' || tiles[n]!==burstColor)continue;
      const angle=i*2.39996;
      const speed=0.06+((i*13)%9)*0.019;
      const radius=t*speed*3.0;
      const h=.09+t*(.23+((i*7)%13)*.02);
      a.push(x+Math.cos(angle)*radius,h,z+Math.sin(angle)*radius,(1-t)*(0.7+((i*5)%5)*.07),c[0],c[1],c[2]);
    }
    if(!a.length)return;
    const p=sparksProgram,u=init.spark;
    g.useProgram(p);g.uniformMatrix4fv(u.uPV,false,pv);g.uniformMatrix4fv(u.uWorld,false,W);
    g.uniform1f(u.uScale,scale);g.uniform1f(u.uDpr,Math.min(1.7,devicePixelRatio||1));
    g.depthMask(false);g.disable(g.DEPTH_TEST);
    g.bindBuffer(g.ARRAY_BUFFER,sparkBuffer);
    g.bufferData(g.ARRAY_BUFFER,new Float32Array(a),g.DYNAMIC_DRAW);
    g.enableVertexAttribArray(0);g.vertexAttribPointer(0,4,g.FLOAT,false,28,0);
    g.enableVertexAttribArray(1);g.vertexAttribPointer(1,3,g.FLOAT,false,28,16);
    for(let k=2;k<=4;k++)g.disableVertexAttribArray(k);
    g.drawArrays(g.POINTS,0,a.length/7);
  }
  function targetColor(time){
    if(time-lastTargetRead<115)return;
    lastTargetRead=time;
    const str=(heading.textContent||'').toUpperCase();
    const playing=typeof stage!=='undefined' && stage==='playing';
    let ci=-1;
    if(playing && !/PUNTOS|FALLADA|PREPARADOS|POSICI|TERMINADA|CALIBRA/.test(str)){
      for(let k=0;k<names.length;k++)if(str.includes(names[k])){ci=k;break;}
    }
    activeColor=ci;
    if(ci>=0)lastPlayingColor=ci;
    const b=burst && burst.style.display!=='none' ? burst.textContent : '';
    if(lastPlayingColor>=0 && b && b!==lastBurst && /^\+\d+\s+PUNTOS/.test(b)){
      burstAt=time;burstColor=lastPlayingColor;
    }
    lastBurst=b;
  }
  function cleanGPU(g){
    // engine.js owns a shader + a single position attribute; restore its
    // attribute pointer and expected WebGL state for the next XR frame.
    g.disable(g.DEPTH_TEST);g.depthMask(true);g.disable(g.CULL_FACE);
    g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
    for(let i=0;i<5;i++)g.disableVertexAttribArray(i);
    if(typeof shader!=='undefined' && shader && typeof glBuffer!=='undefined' && glBuffer){
      g.useProgram(shader);g.bindBuffer(g.ARRAY_BUFFER,glBuffer);
      const index=g.getAttribLocation(shader,'pos');
      if(index>=0){g.enableVertexAttribArray(index);g.vertexAttribPointer(index,3,g.FLOAT,false,0,0);}
    }else g.useProgram(null);
  }
  function off(error){
    fault=true;ready=false;
    gfxError=error && error.message?error.message:String(error||'GPU error');
    overlay.classList.remove('crp3d-ready');
    if(++failureCount<3)console.warn('[Color Rush Pro3D] fallback:',gfxError);
    window.ColorRushPro3D.status='fallback';window.ColorRushPro3D.active=false;
    window.ColorRushPro3D.lastError=gfxError;
  }
  function frameTick(time,frame,W){
    if(fault || !W)return;
    const g=(typeof gl!=='undefined')?gl:null;
    if(!g || !frame || (typeof sess==='undefined') || !sess || (typeof ref==='undefined') || !ref)return;
    try{
      if(!program || context!==g)init(g);
      targetColor(time);
      const grid=typeof tiles!=='undefined' && tiles.length===25 ? tiles : null;
      if(!grid)return;
      const signature=grid.join(',');
      if(signature!==lastSignature){buildGrid(grid);lastSignature=signature;}
      const pose=frame.getViewerPose(ref);
      if(!pose||!pose.views.length)return;
      const xrLayer=sess.renderState.baseLayer;
      if(!xrLayer)return;
      g.bindFramebuffer(g.FRAMEBUFFER,xrLayer.framebuffer);
      const size=typeof boardSize!=='undefined'?boardSize:.45;
      for(const view of pose.views){
        const vp=xrLayer.getViewport(view);
        g.viewport(vp.x,vp.y,vp.width,vp.height);
        const pv=multiply(view.projectionMatrix,view.transform.inverse.matrix);
        g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
        g.disable(g.CULL_FACE);g.depthFunc(g.LEQUAL);
        drawLit(g,pv,W,pose.transform.position,time,size);
        if(effectsEnabled){drawWave(g,time);drawSparks(g,pv,W,size,time);}
      }
      if(!ready){ready=true;overlay.classList.add('crp3d-ready');window.ColorRushPro3D.status='active';window.ColorRushPro3D.active=true;}
      if(samples%90===0 && typeof g.getError==='function'){
        const err=g.getError();if(err!==g.NO_ERROR)throw Error('WebGL error '+err);
      }
      samples++;
      if(time-lastFpsAt>1000){
        measuredFps=samples*1000/Math.max(1,time-lastFpsAt);
        if(measuredFps<38)lowFpsIntervals++;else lowFpsIntervals=0;
        if(lowFpsIntervals>=3){effectsEnabled=false;window.ColorRushPro3D.quality='lite';}
        samples=0;lastFpsAt=time;window.ColorRushPro3D.fps=+measuredFps.toFixed(1);
      }
      lastFrameAt=time;
    }catch(e){off(e);}
    finally{
      if(g)try{cleanGPU(g);}catch(e){off(e);}
    }
  }
  window.ColorRushPro3D={version:'2.0.0',visualOnly:true,active:false,status:'waiting-xr',fps:0,quality:'high',lastError:null};
  const old=window.modoCaosXRFrame;
  window.modoCaosXRFrame=function(time,frame,W){
    if(typeof old==='function')try{old(time,frame,W);}catch(e){console.warn('[Color Rush Pro3D] old visual hook',e);}
    frameTick(time,frame,W);
  };
  window.addEventListener('pagehide',()=>{overlay.classList.remove('crp3d-ready');ready=false;}, {once:true});
})();