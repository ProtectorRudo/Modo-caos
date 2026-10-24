"use strict";
(function(host){
  const C=Object.freeze({SIDE:1.065,BALL_R:.066,GOAL_HALF:.70,PADDLE_HALF:.295,BOOST_HALF:.425,
    POD_R:.154,POD_COLLIDER_R:.152,IMPULSE_SECONDS:2.2,MAX_PADDLE:.44,ROUND_SECONDS:90});
  const WALL=C.SIDE-C.BALL_R, sides=["bottom","top","left","right"];
  const corners=[
    {x:-C.SIDE,z:-C.SIDE,sx:-1,sz:-1,name:"NO"},
    {x:C.SIDE,z:-C.SIDE,sx:1,sz:-1,name:"NE"},
    {x:C.SIDE,z:C.SIDE,sx:1,sz:1,name:"SE"},
    {x:-C.SIDE,z:C.SIDE,sx:-1,sz:1,name:"SO"}
  ];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),random=(a,b)=>a+Math.random()*(b-a);
  function event(g,kind,side="",x=g.ball.x,z=g.ball.z,detail=""){
    g.eventSeq++;g.lastEvent={seq:g.eventSeq,kind,side,x,z,detail};
  }
  function initial(){
    const g={ball:{x:0,z:0,vx:0,vz:0,r:C.BALL_R},p:{bottom:0,top:0,left:0,right:0},
      hp:{bottom:6,top:6,left:6,right:6},power:{bottom:0,top:0,left:0,right:0},
      time:0,serveTimer:0,activePod:0,launchCount:0,phase:"charging",winner:"",
      eventSeq:0,lastEvent:{seq:0,kind:"ready",side:"",x:0,z:0},goalSeq:0,lastGoalSide:""};
    prepareServe(g,Math.floor(Math.random()*4));return g;
  }
  function prepareServe(g,id){
    const i=((id%4)+4)%4,c=corners[i],b=g.ball,a=C.SIDE-.162;
    g.activePod=i;g.launchCount++;g.phase="charging";g.serveTimer=1.18;
    b.x=c.sx*a;b.z=c.sz*a;b.vx=0;b.vz=0;
    event(g,"charge","",b.x,b.z,String(i));
  }
  function launch(g){
    const c=corners[g.activePod],b=g.ball;
    b.vx=-c.sx*random(1.12,1.43);b.vz=-c.sz*random(.99,1.38);
    g.phase="playing";g.serveTimer=0;
    event(g,"launch","",b.x,b.z,String(g.activePod));
  }
  function segment(g,side){
    const p=clamp(g.p[side],-C.MAX_PADDLE,C.MAX_PADDLE);
    const half=g.power[side]>0?C.BOOST_HALF:C.PADDLE_HALF;
    return{start:Math.max(-C.GOAL_HALF,p-half),end:Math.min(C.GOAL_HALF,p+half),center:p,half};
  }
  function shieldWorld(g,side,y=.20){
    const r=segment(g,side),d=WALL;
    switch(side){
      case"bottom":return[[r.start,y,d],[r.end,y,d]];
      case"top":return[[r.start,y,-d],[r.end,y,-d]];
      case"left":return[[-d,y,r.start],[-d,y,r.end]];
      default:return[[d,y,r.start],[d,y,r.end]];
    }
  }
  function isGoalZone(x){return Math.abs(x)<=C.GOAL_HALF;}
  function isSaved(g,side,x){const r=segment(g,side);return x>=r.start&&x<=r.end;}
  function boost(g,side){
    if(!g||g.winner||g.phase!=="playing"||g.power[side]>.01)return false;
    g.power[side]=C.IMPULSE_SECONDS;
    const p=segment(g,side),b=g.ball,pos=
      side==="bottom"?{x:p.center,z:WALL}:side==="top"?{x:p.center,z:-WALL}:
      side==="left"?{x:-WALL,z:p.center}:{x:WALL,z:p.center};
    const direct=Math.hypot(b.x-pos.x,b.z-pos.z)<.83;
    if(direct){
      if(side==="bottom"||side==="top"){
        b.vx=clamp((b.x-p.center)*.75,-1.3,1.3);b.vz=(side==="bottom"?-1:1)*2.53;
      }else{b.vz=clamp((b.z-p.center)*.75,-1.3,1.3);b.vx=(side==="left"?1:-1)*2.53;}
      g.power[side]=1.25;
    }
    event(g,direct?"boost_hit":"boost",side,b.x,b.z,direct?"direct":"shield");return true;
  }
  function collisionPod(g,pod){
    const b=g.ball,dx=b.x-pod.x,dz=b.z-pod.z,d=Math.hypot(dx,dz),r=C.POD_COLLIDER_R+C.BALL_R;
    if(d>=r)return false;
    const nx=dx/(d||1),nz=dz/(d||1);
    b.x=pod.x+nx*(r+.003);b.z=pod.z+nz*(r+.003);
    const dot=b.vx*nx+b.vz*nz;
    if(dot<0){b.vx-=2*dot*nx;b.vz-=2*dot*nz;}
    event(g,"pod_hit","",b.x,b.z,String(corners.indexOf(pod)));return true;
  }
  function reboundCorner(g,side){
    const b=g.ball;
    if(side==="bottom"||side==="top"){b.z=(side==="bottom"?WALL-.003:-WALL+.003);b.vz=(side==="bottom"?-1:1)*Math.max(Math.abs(b.vz),.65);}
    else{b.x=(side==="left"?-WALL+.003:WALL-.003);b.vx=(side==="left"?1:-1)*Math.max(Math.abs(b.vx),.65);}
    event(g,"rail_hit",side,b.x,b.z);
  }
  function bounce(g,side,x){
    const b=g.ball,s=segment(g,side),powered=g.power[side]>0;
    const off=clamp((x-s.center)/s.half,-1,1),v=clamp(Math.hypot(b.vx,b.vz)*1.06+(powered?.55:0),1.15,3.12);
    if(side==="bottom"||side==="top"){
      b.vx=clamp(b.vx+off*.72,-1.73,1.73);
      b.vz=(side==="bottom"?-1:1)*Math.max(.7,Math.sqrt(Math.max(.49,v*v-b.vx*b.vx)));
      b.z=(side==="bottom"?WALL-.004:-WALL+.004);
    }else{
      b.vz=clamp(b.vz+off*.72,-1.73,1.73);
      b.vx=(side==="left"?1:-1)*Math.max(.7,Math.sqrt(Math.max(.49,v*v-b.vz*b.vz)));
      b.x=(side==="left"?-WALL+.004:WALL-.004);
    }
    g.power[side]=0;event(g,powered?"shield_hit":"hit",side,b.x,b.z);
  }
  function goal(g,side){
    if(g.hp[side]===0){reboundCorner(g,side);return;}
    g.hp[side]=Math.max(0,g.hp[side]-1);
    g.lastGoalSide=side;g.goalSeq++;
    event(g,"goal",side,g.ball.x,g.ball.z);
    if(g.hp.bottom===0||g.hp.top===0){
      g.phase="finished";g.winner=g.hp.bottom>g.hp.top?"bottom":"top";
    }else{
      const next=(g.activePod+1+Math.floor(Math.random()*3))%4;
      prepareServe(g,next);
    }
  }
  function updateBots(g,dt,online){
    const b=g.ball;
    ["top","left","right"].forEach((side,i)=>{
      if(side==="top"&&online)return;
      const at=side==="top"?b.x:b.z;
      const wanted=clamp(at*(.82-i*.06)+Math.sin(g.time*(1.2+i*.3))*.044,-C.MAX_PADDLE,C.MAX_PADDLE);
      g.p[side]+=clamp(wanted-g.p[side],-dt*(.93+i*.17),dt*(.93+i*.17));
    });
  }
  function tick(g,delta,bottomX,topX,online){
    if(!g||g.winner||g.phase==="finished")return g;
    delta=clamp(delta||0,0,.055);
    const subdivisions=Math.max(1,Math.ceil(delta/.006)),dt=delta/subdivisions;
    for(let i=0;i<subdivisions;i++){
      g.time+=dt;
      g.p.bottom=clamp(Number(bottomX)||0,-C.MAX_PADDLE,C.MAX_PADDLE);
      if(online)g.p.top=clamp(Number(topX)||0,-C.MAX_PADDLE,C.MAX_PADDLE);
      updateBots(g,dt,!!online);
      for(const s of sides)g.power[s]=Math.max(0,g.power[s]-dt);
      if(g.phase==="charging"){
        g.serveTimer=Math.max(0,g.serveTimer-dt);
        if(g.serveTimer<=0)launch(g);
        continue;
      }
      const b=g.ball;b.x+=b.vx*dt;b.z+=b.vz*dt;
      let hitPod=false;
      for(const p of corners)if(collisionPod(g,p)){hitPod=true;break;}
      if(hitPod)continue;
      if(b.z>=WALL&&b.vz>0){
        if(!isGoalZone(b.x))reboundCorner(g,"bottom");
        else if(isSaved(g,"bottom",b.x))bounce(g,"bottom",b.x);
        else goal(g,"bottom");
      }else if(b.z<=-WALL&&b.vz<0){
        if(!isGoalZone(b.x))reboundCorner(g,"top");
        else if(isSaved(g,"top",b.x))bounce(g,"top",b.x);
        else goal(g,"top");
      }
      if(g.phase!=="playing")continue;
      if(b.x>=WALL&&b.vx>0){
        if(!isGoalZone(b.z))reboundCorner(g,"right");
        else if(isSaved(g,"right",b.z))bounce(g,"right",b.z);
        else goal(g,"right");
      }else if(b.x<=-WALL&&b.vx<0){
        if(!isGoalZone(b.z))reboundCorner(g,"left");
        else if(isSaved(g,"left",b.z))bounce(g,"left",b.z);
        else goal(g,"left");
      }
      if(g.time>=C.ROUND_SECONDS&&!g.winner){
        g.phase="finished";
        g.winner=g.hp.bottom===g.hp.top?"draw":g.hp.bottom>g.hp.top?"bottom":"top";
        event(g,"finish","",b.x,b.z);
      }
    }
    return g;
  }
  host.BallPhysics25={C,WALL,corners,sides,clamp,initial,prepareServe,launch,segment,shieldWorld,isGoalZone,isSaved,tick,boost,collisionPod};
})(window);