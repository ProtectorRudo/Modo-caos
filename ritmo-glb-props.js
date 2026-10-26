'use strict';
/* Light native glTF 2.0 GLB geometry adapter for verified CC0 DJ props.
 * File URLs are local first; upstream CORS CDN is an optional cache fallback.
 * Geometry merges into the existing anchored WebGL1 batch. No second canvas.
 * Bounded sizes and triangle counts protect mobile devices.
 * Mesh materials use PBR base colors only; embedded WebP textures intentionally
 * are not decoded here, avoiding extra GPU state and dependency collisions.
 */
(function(root){
 const models=[
  {key:'desk',local:'/assets/ritmo/dj-booth-desk.glb',
   remote:'https://cdn.3dassets.dev/assets/34089/v1/model.glb',
   scale:.304,offset:[0,.012,-1.44]},
  {key:'mixer',local:'/assets/ritmo/dj-mixer.glb',
   remote:'https://cdn.3dassets.dev/assets/34090/v1/model.glb',
   scale:.304,offset:[0,.321,-1.44]},
  // Individual verified CC0 stage props. Never load the complete nightclub.
  ...['facade','turntable','led-panel','speaker-sub','speaker-mid',
      'moving-head','strobe','truss'].map(key=>({
   key,local:'/assets/ritmo/'+(key==='facade'?'dj-booth-facade':'dj-'+key)+'.glb',remote:null
  })),
  ...['cdj','laptop','headphones','monitor','riser','laser','smoke','led-magenta'].map(key=>({
   key,local:'/assets/ritmo/dj-'+key+'.glb',remote:null
  })),
  {key:'quaternius-punk',local:'/assets/ritmo/dj-quaternius-punk.glb',remote:null,mesh:'Punk_Body'}
 ];
 function mult(A,B){const R=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)R[c*4+r]+=A[k*4+r]*B[c*4+k];return R}
 function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
 function nodeMatrix(n){
  if(n.matrix)return new Float32Array(n.matrix);
  const r=n.rotation||[0,0,0,1],q=n.scale||[1,1,1],p=n.translation||[0,0,0];
  const [x,y,z,w]=r,[sx,sy,sz]=q;
  return new Float32Array([
   (1-2*(y*y+z*z))*sx,(2*(x*y+z*w))*sx,(2*(x*z-y*w))*sx,0,
   (2*(x*y-z*w))*sy,(1-2*(x*x+z*z))*sy,(2*(y*z+x*w))*sy,0,
   (2*(x*z+y*w))*sz,(2*(y*z-x*w))*sz,(1-2*(x*x+y*y))*sz,0,
   p[0],p[1],p[2],1
  ]);
 }
 function parse(buf,includeMesh=null){
  if(!(buf instanceof ArrayBuffer)||buf.byteLength<24||buf.byteLength>900000)throw Error('GLB size invalid');
  const v=new DataView(buf);
  if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buf.byteLength)throw Error('Not glTF 2.0');
  const len=v.getUint32(12,true);
  if(len<2||len>buf.byteLength-20||v.getUint32(16,true)!==0x4e4f534a)throw Error('GLB JSON absent');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,len)));
  const binHead=20+len;if(binHead+8>buf.byteLength||v.getUint32(binHead+4,true)!==0x004e4942)throw Error('GLB BIN absent');
  const bin=binHead+8,meta=json,accessors=meta.accessors||[],views=meta.bufferViews||[];
  function read(i){
   const a=accessors[i];if(!a||a.sparse)throw Error('Unsupported accessor');
   const view=views[a.bufferView];if(!view)throw Error('No buffer view');
   const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
   const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
   const step=sizes[a.componentType],size=width*step,base=bin+(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||size;
   if(!width||!step||a.count>40000||a.count<0||stride<size||base+(a.count-1)*stride+size>buf.byteLength)throw Error('Invalid geometry offset');
   function sample(offset){
    switch(a.componentType){
     case 5120:return v.getInt8(offset);
     case 5121:return v.getUint8(offset);
     case 5122:return v.getInt16(offset,true);
     case 5123:return v.getUint16(offset,true);
     case 5125:return v.getUint32(offset,true);
     case 5126:return v.getFloat32(offset,true);
    }
   }
   const norm=a.normalized?({5120:127,5121:255,5122:32767,5123:65535,5125:4294967295}[a.componentType]||1):1;
   const result=[];
   for(let j=0;j<a.count;j++){
    let row=[];
    for(let k=0;k<width;k++)row.push(Math.max(-1,sample(base+j*stride+k*step)/norm));
    // Integer *unnormalized* geometry is allowed. Correct upper limit follows:
    if(!a.normalized)row=row.map((_,k)=>sample(base+j*stride+k*step));
    result.push(row);
   }
   return result;
  }
  const triangles=[];
  let count=0;
  function walk(index,parent){
   const node=(meta.nodes||[])[index];if(!node)return;
   const matrix=mult(parent,nodeMatrix(node));
   if(node.mesh!==undefined && (!includeMesh || meta.meshes?.[node.mesh]?.name===includeMesh)){
    const m=(meta.meshes||[])[node.mesh];
    for(const prim of (m?.primitives||[])){
     if(prim.mode!==undefined&&prim.mode!==4)continue;
     const points=read(prim.attributes?.POSITION);if(points[0]?.length!==3)continue;
     const indices=prim.indices===undefined?points.map((_,i)=>[i]):read(prim.indices);
     const material=(meta.materials||[])[prim.material||0]||{};
     const factor=material.pbrMetallicRoughness?.baseColorFactor||[.65,.68,.73,1];
     let color=factor.slice(0,3).map(a=>Math.min(1,Math.max(.08,a)));
     if(material.pbrMetallicRoughness?.baseColorTexture&&color.every(x=>x>.92))color=[.34,.41,.49];
     const p=local=>[0,1,2].map(r=>matrix[r]*local[0]+matrix[r+4]*local[1]+matrix[r+8]*local[2]+matrix[r+12]);
     for(let j=0;j+2<indices.length;j+=3){
      if(++count>3400)throw Error('GLB triangle budget exceeded');
      const ia=indices[j][0],ib=indices[j+1][0],ic=indices[j+2][0];
      if(!points[ia]||!points[ib]||!points[ic])throw Error('GLB index invalid');
      const A=p(points[ia]),B=p(points[ib]),C=p(points[ic]);
      if([...A,...B,...C].some(x=>!Number.isFinite(x)))throw Error('Nonfinite geometry');
      triangles.push({A,B,C,color});
     }
    }
   }
   for(const child of (node.children||[]))walk(child,matrix);
  }
  const sc=meta.scenes?.[meta.scene||0],roots=sc?.nodes||meta.nodes?.map((_,i)=>i).filter(i=>!meta.nodes.some(n=>n.children?.includes(i)))||[];
  for(const i of roots)walk(i,identity());
  if(!triangles.length)throw Error('Empty mesh');
  return triangles;
 }
 function create(){
  const loaded={},state=Object.fromEntries(models.map(m=>[m.key,'pending']));
  async function fetchModel(m){
   async function grab(url){
    const response=await root.fetch(url,{mode:'cors',cache:'force-cache'});
    if(!response.ok)throw Error('HTTP '+response.status);
    return parse(await response.arrayBuffer(),m.mesh||null);
   }
   try{loaded[m.key]=await grab(m.local);state[m.key]='local'}
   catch(_){
    if(m.remote){try{loaded[m.key]=await grab(m.remote);state[m.key]='cdn'}
     catch(e){state[m.key]='fallback';}}
    else state[m.key]='fallback';
   }
  }
  function load(){if(!root.fetch)return;for(const m of models)fetchModel(m)}
  function ready(){return !!loaded.desk&&!!loaded.mixer}
  function draw(mesh,surface,opts=null){
   if(!ready())return false;
   // V34 draws an independent dark worktop and relocates the mixer above it;
   // old callers still render exactly the two original CC0 models.
   for(const m of models.slice(0,opts?.deskOnly?1:2)){
    const scale=m.scale,off=m.offset;
    for(const tr of loaded[m.key]){
     const p=v=>v.map((x,i)=>x*scale+off[i]);
     const a=p(tr.A),b=p(tr.B),c=p(tr.C);
     // Existing surface uses two triangles; duplicate third vertex yields one
     // good triangle and a degenerate triangle with harmless zero area.
     surface(mesh,a,b,c,c,tr.color,1,0);
    }
   }
   return true;
  }

  function drawPart(key,mesh,surface,placements){
   const triangles=loaded[key];
   if(!triangles)return false;
   const instances=Array.isArray(placements)?placements:[placements];
   if(!instances.length||instances.length>4)return false;
   for(const tr of triangles){
    for(const cfg of instances){
     if(!cfg)continue;
     const scale=cfg.scale||.3,offset=cfg.offset||[0,0,0];
     // V32 permits a shorter DJ fascia without changing its width/depth;
     // other CC0 props still use their original uniform scaling.
     const axes=Array.isArray(scale)?scale:[scale,scale,scale];
     const p=v=>v.map((x,i)=>x*axes[i]+offset[i]);
     surface(mesh,p(tr.A),p(tr.B),p(tr.C),p(tr.C),tr.color,1,0);
    }
   }
   return true;
  }
  // Animate actual Quaternius Punk geometry without changing the WebXR shader:
  // isolate the 2958-triangle shirt/arms mesh and blend a DJ mixing pose
  // in world-space. Legs and human head are intentionally excluded.
  function drawCharacter(mesh,surface,time=0,low=0,quality=2,combo=0){
   const triangles=loaded['quaternius-punk'];
   if(!triangles)return false;
   // V32 two-stage upper/lower arm bend. The original Quaternius Punk
   // has a T-pose: move elbows forward and IN, then place the hands
   // over the two CDJ wheels rather than leave them stretched outward.
   // Blend around shoulders; keep all coordinates in the existing AR anchor.
   const bob=Math.sin(time*5.2)*(.004+.007*low);
   const groove=Math.sin(time*2.7)*.011;
   const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x)};
   const map=p=>{
    const x=p[0],d=Math.abs(x),sign=Math.sign(x)||1;
    const raw=smooth((d-.193)/.60);
    const elbow=Math.sin(raw*Math.PI);
    const lean=Math.sin(time*5.2+sign)*(.009+.011*low);
    // x=0.20 shoulder, x≈0.30 elbow, x≈0.17 hand. CDJ centers ±0.171.
    const armX=.20+.105*elbow-.031*raw;
    const px=sign*(d<.193?d:armX)+(1-raw)*groove*.2;
    const py=(p[1]-1)*.68+.327-.285*raw-.030*elbow+bob
      +(combo>=25&&sign>0?.115*raw*(.5+.5*Math.sin(time*3.7)):0);
    const pz=-1.54+p[2]*.68+.065*raw+.027*elbow
      +raw*lean+(1-raw)*groove;
    return [px,py,pz];
   };
   // In the original GLB the whitish center was dominating the torso:
   // a charcoal bomber jacket makes the horse head the focal point.
   const step=quality===0?2:1;
   for(let i=0;i<triangles.length;i+=step){
    const tri=triangles[i],base=tri.color;
    let color;
    if(Math.max(...base)-Math.min(...base)<.055){
      const t=Math.min(1,Math.max(0,base[0]*1.7));
      color=[.065+.090*t,.085+.105*t,.116+.124*t];
    }else if(base[0]>.4&&base[0]>base[1]*1.30){
      // Skin and warm details retain their original identity.
      color=base.map(v=>Math.min(.86,Math.max(.10,v*1.22+.045)));
    }else color=base.map(v=>Math.min(.80,Math.max(.075,v*1.18+.055)));
    surface(mesh,map(tri.A),map(tri.B),map(tri.C),map(tri.C),color,1,0);
   }
   return true;
  }
  function has(key){return !!loaded[key]}
  load();
  return{ready,draw,drawPart,drawCharacter,has,status:()=>({...state})};
 }
 root.RitmoImportedProps={create,parse};
})(window);