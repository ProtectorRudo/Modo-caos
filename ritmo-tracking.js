'use strict';
/*
 * Ritmo Caos V38: lateral XR position stabilizer.
 * Input is REAL WebXR phone-camera position in floor-anchor meters.
 * No body tracking, no screen-space motion, no movement of the AR floor.
 */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const median=values=>{const a=values.slice().sort((x,y)=>x-y);return a[Math.floor(a.length/2)]};
 function create(selected=1,origin=0,worldWidth=.25){
  if(!Number.isInteger(selected)||selected<0||selected>3)throw Error('Invalid calibrated lane');
  if(!Number.isFinite(origin)||!(worldWidth>.04))throw Error('Invalid XR anchor calibration');
  let center=origin,good=origin,lastT=null,filtered=selected,lane=selected,candidate=-1,candidateAt=0,pending=null;
  let samples=[origin],relocalized=0,transitions=0;
  function result(){return{lane,offset:clamp(filtered,lane-.46,lane+.46),filtered,relocalized,transitions}}
  function recover(x,t){
   if(!Number.isFinite(x))return result();
   center+=x-good;good=x;lastT=t;
   filtered=lane;samples=[x];candidate=-1;pending=null;
   return result();
  }
  function update(x,t,dt){
   if(!Number.isFinite(x)||!Number.isFinite(t))return result();
   const seconds=clamp(Number.isFinite(dt)?dt:lastT===null?.016:(t-lastT)/1000,.008,.12);
   lastT=t;
   const delta=x-good;
   // A real player cannot teleport >18 cm in one normal camera frame.
   // On repeated XR relocalization values keep the SAME lane and shift
   // only our *relative origin*, never the actual floor/world transform.
   const impossible=Math.abs(delta)>Math.max(.18,seconds*2.0)&&seconds<.085;
   if(impossible){
    if(pending&&Math.abs(x-pending.x)<.07)pending.count++;
    else pending={x,count:1};
    if(pending.count>=3){
     center+=x-good;good=x;samples=[x];filtered=lane;pending=null;candidate=-1;relocalized++;
    }
    return result();
   }
   pending=null;good=x;samples.push(x);
   if(samples.length>5)samples.shift();
   const stable=median(samples),target=clamp(selected+(stable-center)/worldWidth,0,3);
   const gain=1-Math.exp(-seconds/.065);
   filtered+=clamp((target-filtered)*gain,-seconds*7.5,seconds*7.5);
   const next=filtered>lane+.60&&lane<3?lane+1:filtered<lane-.60&&lane>0?lane-1:lane;
   if(next!==lane){
    if(candidate!==next){candidate=next;candidateAt=t}
    // AR jitter can last one or two frames. Require continuous evidence.
    const rawProves=next>lane?target>lane+.63:target<lane-.63;
    if(rawProves&&t-candidateAt>=90){
     lane=next;candidate=-1;transitions++;
    }
   }else{candidate=-1}
   return result();
  }
  return {update,recover,snapshot:result,version:'V38 XR DEBOUNCE'};
 }
 root.RitmoTracking={create,version:'V38 XR DEBOUNCE'};
})(typeof window!=='undefined'?window:globalThis);
