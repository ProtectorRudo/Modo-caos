'use strict';
/* RITMO CAOS V34 — actual Quaternius Punk joint-weighted skin deformation.
 * Runs in the EXISTING anchored WebGL1 world (no extra scene or renderer).
 * The CC0 GLB supplies its real named bones and JOINTS_0 / WEIGHTS_0.
 * Its FBX animations are not bundled: motion here is procedural joint pose.
 * Fails closed: the exterior draws a coherent solid fallback bomber jacket.
 */
(function(root){
 const PATH='/assets/ritmo/dj-quaternius-punk.glb',MAX=900000;
 const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 function multiply(A,B){const R=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)R[c*4+r]+=A[k*4+r]*B[c*4+k];return R}
 function nodeMatrix(n){
  if(n.matrix)return n.matrix;
  const [x,y,z,w]=n.rotation||[0,0,0,1],q=n.scale||[1,1,1],p=n.translation||[0,0,0];
  const [sx,sy,sz]=q;
  return [(1-2*(y*y+z*z))*sx,2*(x*y+z*w)*sx,2*(x*z-y*w)*sx,0,
   2*(x*y-z*w)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+x*w)*sy,0,
   2*(x*z+y*w)*sz,2*(y*z-x*w)*sz,(1-2*(x*x+y*y))*sz,0,
   p[0],p[1],p[2],1];
 }
 function readGLB(buffer){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>MAX||buffer.byteLength<24)throw Error('Punk GLB size invalid');
  const dv=new DataView(buffer),jsLength=dv.getUint32(12,true);
  if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==buffer.byteLength||dv.getUint32(16,true)!==0x4e4f534a)throw Error('Bad glTF header');
  const doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsLength)));
  const pos=20+jsLength;
  if(dv.getUint32(pos+4,true)!==0x004e4942)throw Error('Missing glTF BIN chunk');
  return {doc,dv,bin:pos+8};
 }
 function accessor(glb,index){
  const {doc,dv,bin}=glb,a=doc.accessors?.[index],view=doc.bufferViews?.[a?.bufferView];
  if(!a||!view||a.sparse||a.count>40000)throw Error('Unsupported skin accessor');
  const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const length={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a.componentType];
  if(!width||!length)throw Error('Bad skin component type');
  const size=width*length,stride=view.byteStride||size,base=bin+(view.byteOffset||0)+(a.byteOffset||0);
  if(stride<size||base+(a.count-1)*stride+size>dv.byteLength)throw Error('Skin out of GLB bounds');
  const rows=[];
  for(let i=0;i<a.count;i++){
   const row=[];
   for(let j=0;j<width;j++){
    const offset=base+i*stride+j*length;
    let v;
    switch(a.componentType){
     case 5120:v=dv.getInt8(offset);break;case 5121:v=dv.getUint8(offset);break;
     case 5122:v=dv.getInt16(offset,true);break;case 5123:v=dv.getUint16(offset,true);break;
     case 5125:v=dv.getUint32(offset,true);break;case 5126:v=dv.getFloat32(offset,true);break;
    }
    if(a.normalized){const d={5120:127,5121:255,5122:32767,5123:65535,5125:4294967295}[a.componentType]||1;v=Math.max(-1,v/d)}
    row.push(v);
   }
   rows.push(row);
  }
  return rows;
 }
 function prepare(buffer,parser){
  const glb=readGLB(buffer),{doc}=glb,body=doc.meshes?.find(m=>m.name==='Punk_Body');
  if(!body)throw Error('Quaternius Punk_Body missing');
  const nodes=doc.nodes||[],parents=Array(nodes.length).fill(-1);
  nodes.forEach((n,i)=>(n.children||[]).forEach(child=>{parents[child]=i}));
  const matrices=nodes.map((_,i)=>{let chain=[],n=i,limit=0;
   while(n>=0&&limit++<nodes.length){chain.push(n);n=parents[n]}
   let M=identity();for(let j=chain.length-1;j>=0;j--)M=multiply(M,nodeMatrix(nodes[chain[j]]));return M;
  });
  function joint(name){
   const i=nodes.findIndex(n=>n.name===name);if(i<0)throw Error('Punk joint '+name+' absent');
   return [matrices[i][12],matrices[i][13],matrices[i][14]];
  }
  const bones={
   L:{shoulder:joint('UpperArm.L'),elbow:joint('LowerArm.L'),wrist:joint('Hand.L')},
   R:{shoulder:joint('UpperArm.R'),elbow:joint('LowerArm.R'),wrist:joint('Hand.R')}
  };
  const bodyNode=nodes.find(n=>n.mesh!==undefined&&doc.meshes[n.mesh]?.name==='Punk_Body');
  const skin=doc.skins?.[bodyNode?.skin];
  if(!skin||!skin.joints||skin.joints.length<30||!skin.inverseBindMatrices)throw Error('Punk skeletal joints missing');
  const influences=skin.joints.map(id=>{
   let cur=id,n=0;
   while(cur>=0&&n++<nodes.length){
    const name=nodes[cur]?.name;
    if(name==='LowerArm.L')return 2;
    if(name==='UpperArm.L')return 1;
    if(name==='LowerArm.R')return 4;
    if(name==='UpperArm.R')return 3;
    cur=parents[cur];
   }
   return 0;
  });
  // Retain native rest vertex positions from existing proven GLB parser.
  const triangles=parser(buffer,'Punk_Body');
  const vertices=[],groups=[],colors=[];
  for(const prim of body.primitives){
   const joints=accessor(glb,prim.attributes.JOINTS_0);
   const weights=accessor(glb,prim.attributes.WEIGHTS_0);
   const index=prim.indices===undefined?joints.map((_,i)=>[i]):accessor(glb,prim.indices);
   const material=doc.materials?.[prim.material||0]?.name||'';
   for(let i=0;i+2<index.length;i+=3){
    const pack=[];
    for(let j=0;j<3;j++){
     const idx=index[i+j][0],weight=weights[idx],jointIndices=joints[idx],result=[0,0,0,0,0];
     if(!weight||!jointIndices)throw Error('Punk missing vertex weights');
     for(let k=0;k<4;k++)result[influences[jointIndices[k]]||0]+=Math.max(0,weight[k]||0);
     const sum=result.reduce((a,b)=>a+b,0);
     if(sum<.90||sum>1.10)throw Error('Bad Quaternius skin weights');
     pack.push(result.map(w=>w/sum));
    }
    groups.push(pack);
    colors.push(material==='Skin'?[.61,.39,.26]:material==='Earrings'?[.45,.35,.22]:[.080,.117,.159]);
   }
  }
  if(groups.length!==triangles.length||groups.length!==2958)throw Error('Skinned triangle count mismatch');
  return{bones,triangles,groups,colors,skinJointCount:skin.joints.length};
 }
 function rotateZ(p,pivot,angle){
  const dx=p[0]-pivot[0],dy=p[1]-pivot[1],c=Math.cos(angle),s=Math.sin(angle);
  return [pivot[0]+c*dx-s*dy,pivot[1]+s*dx+c*dy,p[2]];
 }
 // Two-bone inverse kinematics in the GLB's native rest-bone plane.
 // The end-effectors touch the physical CDJs (world y~0.4) and the
 // shoulder+elbow pivot rotations retain smooth JOINTS_0 weighted seams.
 function poseFrame(bones,time,low=0,combo=0){
  const phase=time*5.1,smooth=x=>x*x*(3-2*x);
  const frame={};
  for(const [key,sign,offset] of [['L',1,0],['R',-1,1]]){
   const b=bones[key],s=b.shoulder,e=b.elbow,w=b.wrist;
   const S=[s[0],s[1]],E=[e[0],e[1]],W=[w[0],w[1]];
   const raise=combo>=25&&key==='R' ? .048*smooth(.5+.5*Math.sin(time*2.3)):0;
   // V35 unmistakable mixing action: wrists move over the INNER half of the
   // CDJ platter and occasionally the central faders. A ~3cm alternating
   // sweep is visible even on a tiny mobile screen.
   const sweep=Math.sin(phase+offset*1.75);
   const handX=sign*(.137+.028*(.5+.5*sweep));
   const handY=.414+.033*Math.sin(phase+offset*1.75)+raise;
   const handZ=-1.389+.017*Math.cos(phase+offset);
   const T=[handX/.86,1+(handY-.300-.030)/.60];
   const upperLen=Math.hypot(E[0]-S[0],E[1]-S[1]);
   const lowerLen=Math.hypot(W[0]-E[0],W[1]-E[1]);
   const dx=T[0]-S[0],dy=T[1]-S[1];
   const distance=Math.max(1e-5,Math.hypot(dx,dy));
   const reach=Math.min(upperLen+lowerLen-1e-5,Math.max(Math.abs(upperLen-lowerLen)+1e-5,distance));
   const target=[S[0]+dx*reach/distance,S[1]+dy*reach/distance];
   const d=Math.hypot(target[0]-S[0],target[1]-S[1]),ux=(target[0]-S[0])/d,uy=(target[1]-S[1])/d;
   const a=(upperLen*upperLen-lowerLen*lowerLen+d*d)/(2*d);
   const h=Math.sqrt(Math.max(0,upperLen*upperLen-a*a));
   // Outward-bent elbow (the original V33 hands-on-hips pose is inverted).
   const elbow=[S[0]+ux*a-sign*uy*h,S[1]+uy*a+sign*ux*h];
   const upperAngle=Math.atan2(elbow[1]-S[1],elbow[0]-S[0])-
      Math.atan2(E[1]-S[1],E[0]-S[0]);
   const lowerAngle=Math.atan2(target[1]-elbow[1],target[0]-elbow[0])-
      Math.atan2(W[1]-E[1],W[0]-E[0]);
   frame[key]={shoulder:S,elbow,upperAngle,lowerRelative:lowerAngle-upperAngle,
      wristWorld:[handX,handY,handZ],upperLen,lowerLen};
  }
  return frame;
 }
 function posePoint(p,weights,bones,time,low,combo,frame=null){
  frame=frame||poseFrame(bones,time,low,combo);
  const acc=[p[0]*weights[0],p[1]*weights[0],p[2]*weights[0]];
  for(const [name,upperId,lowerId] of [['L',1,2],['R',3,4]]){
   const b=frame[name];
   const upper=rotateZ(p,b.shoulder,b.upperAngle);
   const lower=rotateZ(upper,b.elbow,b.lowerRelative);
   for(let k=0;k<3;k++)acc[k]+=upper[k]*weights[upperId]+lower[k]*weights[lowerId];
  }
  const shoulderWeight=weights[1]+weights[3],forearmWeight=weights[2]+weights[4];
  const armWeight=shoulderWeight+forearmWeight;
  const groove=Math.sin(time*2.6)*.006*(1-armWeight);
  const bob=Math.sin(time*5.2)*(.004+.006*low);
  // Drive elbows forwards in depth with the genuine blended bone weights.
  // This prevents the characteristic "hands on hips" silhouette of V33/V34.
  return [acc[0]*.86+groove,
   (acc[1]-1)*.60+.300+bob+.030*armWeight,
   -1.55+(acc[2]+.081*shoulderWeight+.162*forearmWeight)*.68];
 }
 function create(){
  let model=null,status='loading';
  async function load(){
   try{
    if(typeof root.fetch!=='function'||typeof root.RitmoImportedProps?.parse!=='function')throw Error('GLB loader not available');
    const response=await root.fetch(PATH,{mode:'cors',cache:'force-cache'});
    if(!response.ok)throw Error('HTTP '+response.status);
    model=prepare(await response.arrayBuffer(),root.RitmoImportedProps.parse);
    status='ready';
   }catch(e){model=null;status='fallback'}
  }
  load();
  function draw(mesh,surface,time=0,low=0,quality=2,combo=0){
   if(!model)return false;
   const {triangles,groups,colors,bones}=model;
   const frame=poseFrame(bones,time,low,combo);
   // Preserve every triangle, including LOW: skipping half created holes.
   for(let k=0;k<triangles.length;k++){
    const tr=triangles[k],wg=groups[k],color=colors[k];
    const A=posePoint(tr.A,wg[0],bones,time,low,combo,frame);
    const B=posePoint(tr.B,wg[1],bones,time,low,combo,frame);
    const C=posePoint(tr.C,wg[2],bones,time,low,combo,frame);
    surface(mesh,A,B,C,C,color,1,0);
   }
   return true;
  }
  function hands(time=0,low=0,combo=0){
   if(!model)return null;
   const frame=poseFrame(model.bones,time,low,combo);
   return {L:posePoint(model.bones.L.wrist,[0,0,1,0,0],model.bones,time,low,combo,frame),R:posePoint(model.bones.R.wrist,[0,0,0,0,1],model.bones,time,low,combo,frame)};
  }
  return{draw,hands,status:()=>status,info:()=>model&&{skinJointCount:model.skinJointCount,triangles:model.triangles.length}};
 }
 root.RitmoSkeletalDJ={create,prepare,posePoint,poseFrame};
})(window);
