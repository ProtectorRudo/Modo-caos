'use strict';
/* MODO CAOS / SEMÁFORO — small, deliberate phone strokes in AR.
 * WebXR tracks the handset, NOT feet or the player body.
 * All distances are meters in world-locked board coordinates.
 * Gameplay works in a stationary area; no walking required.
 */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const CONFIG=Object.freeze({
  stroke:0.060,     // 6cm deliberate push towards the traffic light
  return:0.046,     // retract 4.6cm before the next push
  redDeadzone:0.095,// 9.5cm jitter-safe stop zone
  sideDeadzone:0.028,
  laneRange:0.25,
  cooldown:290,     // ms anti double counting
  strideSeconds:1.06,
  teleport:0.25,    // XR relocalization is not player motion
  lostMs:450
 });
 function create(config={}){
  const cfg={...CONFIG,...config};
  let center=null,raw=null,smooth=null,strokeBase=0,peak=0,armed=true;
  let credit=0,lastStroke=-10000,lastAt=0,lastSample=0,lastPhase=null;
  let redAnchor=null,redTriggered=false,redOutside=0,stableSince=0,moving=false;
  let strikes=0;
  const neutral=()=>({forward:0,lane:0,motion:0,stride:false,stable:false,tracked:false});
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
  function reset(pos,at=0){
   if(!valid(pos))return false;
   center={x:pos.x,z:pos.z};raw={...center};smooth={...center};
   strokeBase=pos.z;peak=pos.z;armed=true;credit=0;lastStroke=-10000;
   lastAt=at;lastSample=at;lastPhase=null;redAnchor=null;redTriggered=false;
   redOutside=0;stableSince=at;moving=false;strikes=0;return true;
  }
  function start(pos,at=0){
   if(!center)return reset(pos,at);
   if(valid(pos)){
    raw={x:pos.x,z:pos.z};smooth={...raw};strokeBase=pos.z;peak=pos.z;
   }
   armed=true;credit=0;lastStroke=-10000;lastPhase=null;lastAt=at;
   lastSample=at;redAnchor=null;redTriggered=false;redOutside=0;
   stableSince=at;moving=false;return true;
  }
  function update(pos,at,phase='idle',signalTime=0,grace=.74){
   let o=neutral();
   if(!center||!valid(pos)||!Number.isFinite(at)){
    if(valid(pos)&&!center)reset(pos,at);
    return o;
   }
   const elapsed=lastAt>0?clamp((at-lastAt)/1000,.001,.085):.016;
   const stale=(lastSample>0&&at-lastSample>cfg.lostMs);
   const jump=raw?Math.hypot(pos.x-raw.x,pos.z-raw.z):0;
   if(stale||jump>cfg.teleport){
    // A large pose correction or tracking loss cannot generate steps or penalties.
    const dx=raw?pos.x-raw.x:0,dz=raw?pos.z-raw.z:0;
    center.x+=dx;center.z+=dz;
    raw={x:pos.x,z:pos.z};smooth={...raw};strokeBase=pos.z;
    peak=pos.z;armed=true;credit=0;redAnchor=null;redOutside=0;
    redTriggered=false;lastAt=at;lastSample=at;lastPhase=phase;
    return {...o,tracked:true,stable:true,reason:'tracking-reset'};
   }
   lastAt=at;lastSample=at;
   const speed=raw?Math.hypot(pos.x-raw.x,pos.z-raw.z)/elapsed:0;
   raw={x:pos.x,z:pos.z};
   const lerp=1-Math.exp(-elapsed/.065);
   smooth.x+=(pos.x-smooth.x)*lerp;smooth.z+=(pos.z-smooth.z)*lerp;
   const drift=smooth.x-center.x;
   const lane=clamp(Math.sign(drift)*Math.max(0,Math.abs(drift)-cfg.sideDeadzone)/cfg.laneRange,-.83,.83);
   const motionStable=speed<.09;
   if(motionStable){if(moving)stableSince=at;moving=false}
   else moving=true;
   o={...o,lane,stable:!moving&&at-stableSince>150,tracked:true};
   if(lastPhase!==phase){
    lastPhase=phase;redAnchor=null;redTriggered=false;redOutside=0;
    credit=0;armed=true;strokeBase=smooth.z;peak=smooth.z;
   }
   if(phase==='green'){
    // Two-way arm motion allows running virtually without walking across the room.
    if(armed){
     strokeBase=Math.min(strokeBase,smooth.z);
     if(smooth.z-strokeBase>=cfg.stroke&&at-lastStroke>=cfg.cooldown){
      lastStroke=at;peak=smooth.z;credit=cfg.strideSeconds;armed=false;
      o.stride=true;strikes++;
     }
    }else{
     peak=Math.max(peak,smooth.z);
     if(peak-smooth.z>=cfg.return&&at-lastStroke>=cfg.cooldown){
      armed=true;strokeBase=smooth.z;peak=smooth.z;
     }
    }
    o.forward=credit>0?1:0;
    credit=Math.max(0,credit-elapsed);
    return o;
   }
   // Yellow is a stop warning, never a penalty.
   if(phase!=='red'||signalTime<grace){return o}
   if(!redAnchor){redAnchor={...smooth};return o}
   const distance=Math.hypot(smooth.x-redAnchor.x,smooth.z-redAnchor.z);
   if(!redTriggered&&distance>cfg.redDeadzone){
    redOutside+=elapsed;
    if(redOutside>.10){redTriggered=true;o.motion=.25}
   }else redOutside=Math.max(0,redOutside-elapsed);
   return o;
  }
  return Object.freeze({
   reset,start,update,
   get center(){return center&&{...center}},
   get strides(){return strikes},
   get config(){return Object.freeze({...cfg})}
  });
 }
 const api=Object.freeze({create,CONFIG});
 root.SemaforoMotion=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
