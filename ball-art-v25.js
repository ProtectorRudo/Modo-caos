"use strict";
/* Ball Rush 2.5 — projected 3D corner launchers + bounded scoring mouths. */
(function(host){
  host.BallArenaRenderer25=function(svg,physics){
    const P=physics,C=P.C,NS="http://www.w3.org/2000/svg",SIDES=P.sides,PODS=P.corners;
    const col=["#41f9d0","#ff73a6","#ffce70","#b899ff"];
    const mk=t=>document.createElementNS(NS,t);
    const poly=()=>{const v=mk("polygon");svg.appendChild(v);return v;};
    const line=()=>{const v=mk("polyline");v.setAttribute("fill","none");svg.appendChild(v);return v;};
    const circ=()=>{const v=mk("circle");svg.appendChild(v);return v;};
    const defs=mk("defs");
    defs.innerHTML='<linearGradient id="ball25floor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#183d54"/><stop offset=".56" stop-color="#08243b"/><stop offset="1" stop-color="#081c2a"/></linearGradient>'+
      '<linearGradient id="ball25metal" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#d9f4ff"/><stop offset=".25" stop-color="#577f99"/><stop offset=".76" stop-color="#19394f"/><stop offset="1" stop-color="#081726"/></linearGradient>'+
      '<linearGradient id="ball25glass" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#eaffff"/><stop offset=".3" stop-color="#61cfff"/><stop offset="1" stop-color="#184d81"/></linearGradient>'+
      '<radialGradient id="ball25plasma"><stop stop-color="#fff"/><stop offset=".31" stop-color="#e7ffff"/><stop offset=".65" stop-color="#74d9ff"/><stop offset="1" stop-color="#325af0"/></radialGradient>'+
      '<radialGradient id="ball25halo"><stop stop-color="#a7faff" stop-opacity=".84"/><stop offset="1" stop-color="#2e72ff" stop-opacity="0"/></radialGradient>';
    svg.appendChild(defs);
    const floor=poly(),border=line(),center=[line(),line()],grid=Array.from({length:12},line);
    const gates=SIDES.map(()=>({mouth:poly(),left:poly(),right:poly(),post1:poly(),post2:poly(),gate:line()}));
    const emitters=PODS.map(()=>({
      base:poly(),walls:Array.from({length:12},poly),top:poly(),inner:poly(),
      ring1:line(),ring2:line(),rim:line(),nozzle:poly(),charge:line()
    }));
    const ships=SIDES.map(()=>({
      shadow:poly(),hull:poly(),armorL:poly(),armorR:poly(),finL:poly(),finR:poly(),
      canopy:poly(),canopyHi:poly(),nose:poly(),jet1:poly(),jet2:poly(),fire1:poly(),fire2:poly(),
      shieldAura:line(),shield:line(),core:line(),cap1:circ(),cap2:circ()
    }));
    const tailSoft=line(),tailBright=line(),glow=circ(),ball=circ(),core=circ();
    glow.setAttribute("fill","url(#ball25halo)");
    ball.setAttribute("fill","url(#ball25plasma)");ball.setAttribute("stroke","#ffffff");ball.setAttribute("stroke-width","1.6");
    core.setAttribute("fill","#fff");
    const sparks=Array.from({length:13},()=>Array.from({length:7},line)),fx=[];
    const nametag=mk("text");nametag.textContent="VOS";nametag.setAttribute("text-anchor","middle");
    nametag.setAttribute("font-size","11");nametag.setAttribute("font-weight","900");nametag.setAttribute("fill","#bdffed");
    nametag.setAttribute("stroke","#002c3c");nametag.setAttribute("stroke-width","2.5");
    nametag.setAttribute("paint-order","stroke");svg.appendChild(nametag);
    const fmt=p=>p.map(v=>v[0].toFixed(1)+","+v[1].toFixed(1)).join(" ");
    const project=(m,p)=>projected(m,p[0],p[1],p[2],innerWidth,innerHeight);
    function face(n,p,m,color,stroke,opacity=1){
      const projectedArray=p.map(v=>project(m,v));
      if(projectedArray.some(v=>!v)){n.style.display="none";return;}
      n.style.display="";n.setAttribute("points",fmt(projectedArray));
      n.setAttribute("fill",color);n.setAttribute("opacity",opacity);
      if(stroke)n.setAttribute("stroke",stroke);else n.removeAttribute("stroke");
    }
    function path(n,p,m,color,width=2,opacity=1){
      const projectedArray=p.map(v=>project(m,v));
      if(projectedArray.some(v=>!v)){n.style.display="none";return;}
      n.style.display="";n.setAttribute("points",fmt(projectedArray));
      n.setAttribute("stroke",color);n.setAttribute("stroke-width",width);
      n.setAttribute("stroke-linecap","round");n.setAttribute("stroke-linejoin","round");
      n.setAttribute("opacity",opacity);
    }
    function circular(x,z,r,y=.11,count=20){
      return Array.from({length:count+1},(_,i)=>{
        const a=i*Math.PI*2/count;return[x+Math.cos(a)*r,y,z+Math.sin(a)*r];
      });
    }
    function ground(m,flip){
      const F=p=>[p[0]*flip,p[1],p[2]*flip],r=C.SIDE;
      face(floor,[[-r,.05,-r],[r,.05,-r],[r,.05,r],[-r,.05,r]].map(F),m,"url(#ball25floor)","#236789",.86);
      path(border,[[-r,.084,-r],[r,.084,-r],[r,.084,r],[-r,.084,r],[-r,.084,-r]].map(F),m,"#5bf2d9",3,.65);
      for(let i=0;i<6;i++){
        const s=-r+(i+1)*2*r/7;
        path(grid[i],[[s,.081,-r],[s,.081,r]].map(F),m,"#3d87a8",1,.20);
        path(grid[i+6],[[-r,.081,s],[r,.081,s]].map(F),m,"#3d87a8",1,.20);
      }
      path(center[0],circular(0,0,.37,.087,32).map(F),m,"#31b7d6",2,.52);
      path(center[1],circular(0,0,.16,.09,26).map(F),m,"#58ffdb",2.6,.75);
    }
    function endPoint(side,u,d,y){
      if(side==="bottom")return[u,y,d];
      if(side==="top")return[u,y,-d];
      if(side==="left")return[-d,y,u];
      return[d,y,u];
    }
    function drawGoals(m,flip){
      const r=C.SIDE,k=C.GOAL_HALF,rot=p=>[p[0]*flip,p[1],p[2]*flip];
      for(let i=0;i<4;i++){
        const side=SIDES[i],g=gates[i],color=col[i];
        const pts=(a,b,y=.085,depth1=r-.025,depth2=r+.06)=>
          [endPoint(side,a,depth1,y),endPoint(side,b,depth1,y),
           endPoint(side,b,depth2,y),endPoint(side,a,depth2,y)].map(rot);
        // Exact scoring interval [-0.70,+0.70] centred between fluorescent posts.
        face(g.mouth,pts(-k,k),m,color,"#edffff",.33);
        // Solid lateral bumper rails outside the scoring interval.
        face(g.left,pts(-r,-k,.115,r-.072,r+.05),m,"url(#ball25metal)",color,.98);
        face(g.right,pts(k,r,.115,r-.072,r+.05),m,"url(#ball25metal)",color,.98);
        face(g.post1,pts(-k-.044,-k+.044,.17,r-.035,r+.034),m,"#ddffff",color,1);
        face(g.post2,pts(k-.044,k+.044,.17,r-.035,r+.034),m,"#ddffff",color,1);
        path(g.gate,[endPoint(side,-k,r-.025,.138),endPoint(side,k,r-.025,.138)].map(rot),m,color,4,.77);
      }
    }
    function drawPods(m,flip,g,tm){
      const r=C.POD_R,rot=p=>[p[0]*flip,p[1],p[2]*flip];
      for(let i=0;i<4;i++){
        const c=PODS[i],pod=emitters[i],active=i===g.activePod&&g.phase==="charging";
        const xx=c.x,zz=c.z;
        const t=circular(xx,zz,r,.196,12),b=circular(xx,zz,r+.017,.07,12);
        face(pod.base,b.slice(0,-1).map(rot),m,"#0b283d","#588aa2");
        for(let j=0;j<12;j++){
          const panel=[b[j],b[j+1],t[j+1],t[j]];
          const metal=j%3===0?"#426e83":j%2===0?"#25495f":"#163247";
          face(pod.walls[j],panel.map(rot),m,metal,"#6e98ac",.96);
        }
        face(pod.top,t.slice(0,-1).map(rot),m,"url(#ball25metal)","#beebff",1);
        path(pod.rim,circular(xx,zz,r,.205,24).map(rot),m,active?"#defffa":"#55c1cf",active?5.3:3.1);
        path(pod.ring1,circular(xx,zz,r*.76,.21,24).map(rot),m,active?"#ffeda7":"#51bbd0",active?4:2.5,active?.95:.80);
        path(pod.ring2,circular(xx,zz,r*.42,.22,20).map(rot),m,active?"#edffff":"#82d8eb",active?3.5:2.2);
        face(pod.inner,circular(xx,zz,r*.30,.228,16).slice(0,-1).map(rot),m,
          active?"#d4ffff":"#0f5876",active?"#ffffff":"#3bc6da",active?1:.94);
        const y=.18,midX=xx-c.sx*.11,midZ=zz-c.sz*.11,tipX=xx-c.sx*.183,tipZ=zz-c.sz*.183;
        face(pod.nozzle,[[xx-c.sx*.07,y,zz-c.sz*.07],
            [midX-c.sz*.04,y-.02,midZ+c.sx*.04],
            [tipX,y-.04,tipZ],
            [midX+c.sz*.04,y-.02,midZ-c.sx*.04]].map(rot),
          m,active?"#cffffa":"#64afc6","#ccffff");
        if(active){
          const flicker=.72+.26*Math.sin(tm*17);
          path(pod.charge,[[midX,.22,midZ],[g.ball.x,.225,g.ball.z]].map(rot),m,"#faffff",3.7,flicker);
        }else pod.charge.style.display="none";
      }
    }
    function shipWorld(g,side,u,v,y){
      const a=g.p[side],dist=P.WALL+.154;
      if(side==="bottom")return[a+u,y,dist-v];
      if(side==="top")return[a+u,y,-dist+v];
      if(side==="left")return[-dist+v,y,a+u];
      return[dist-v,y,a+u];
    }
    function drawShips(m,flip,g,tm,team){
      nametag.style.display="none";
      for(let i=0;i<4;i++){
        const side=SIDES[i],s=ships[i],y=.164+Math.sin(tm*16+i)*.009;
        const main=col[i],dark=i===0?"#0c746b":i===1?"#9d376e":i===2?"#ab6c2a":"#5c44b4";
        const rot=p=>[p[0]*flip,p[1],p[2]*flip],V=a=>a.map(v=>shipWorld(g,side,v[0],v[2],v[1])).map(rot);
        face(s.shadow,V([[-.19,.079,-.14],[.19,.079,-.14],[.19,.079,.14],[-.19,.079,.14]]),m,"#001423","none",.54);
        face(s.hull,V([[-.12,y,-.16],[.12,y,-.16],[.17,y+.045,.014],[0,y+.07,.129],[-.17,y+.045,.014]]),m,"url(#ball25metal)","#e8ffff");
        face(s.armorL,V([[-.17,y+.04,.0],[-.055,y+.16,.034],[0,y+.06,.13],[-.09,y+.03,.085]]),m,dark,main);
        face(s.armorR,V([[.17,y+.04,.0],[.055,y+.16,.034],[0,y+.06,.13],[.09,y+.03,.085]]),m,main,"#e3ffff");
        face(s.finL,V([[-.12,y+.09,-.07],[-.23,y-.015,-.10],[-.20,y+.04,.02],[-.105,y+.1,.04]]),m,dark,main);
        face(s.finR,V([[.12,y+.09,-.07],[.23,y-.015,-.10],[.20,y+.04,.02],[.105,y+.1,.04]]),m,main,"#e5ffff");
        face(s.canopy,V([[-.07,y+.145,-.04],[0,y+.235,.015],[.07,y+.145,-.04],[0,y+.09,-.11]]),m,"url(#ball25glass)","#f0ffff");
        face(s.canopyHi,V([[-.028,y+.165,-.025],[0,y+.217,.01],[.025,y+.17,-.03]]),m,"#eeffff");
        face(s.nose,V([[-.04,y+.09,.102],[.04,y+.09,.102],[0,y+.08,.127]]),m,"#f2ffff",main);
        face(s.jet1,V([[-.135,y-.025,-.16],[-.11,y-.025,-.16],[-.115,y-.06,-.20],[-.14,y-.06,-.20]]),m,"#5bdafa","#e5ffff");
        face(s.jet2,V([[.135,y-.025,-.16],[.11,y-.025,-.16],[.115,y-.06,-.20],[.14,y-.06,-.20]]),m,"#5bdafa","#e5ffff");
        const f=.12+.02*Math.sin(tm*29+i*2);
        face(s.fire1,V([[-.135,y-.035,-.20],[-.11,y-.035,-.20],[-.125,y-.08,-.20-f]]),m,"#7efcfb");
        face(s.fire2,V([[.135,y-.035,-.20],[.11,y-.035,-.20],[.125,y-.08,-.20-f]]),m,"#7efcfb");
        // SAME exact endpoints from physics; not an approximate visual collision.
        const shield=P.shieldWorld(g,side,.206).map(rot);
        const powered=g.power[side]>0;
        path(s.shieldAura,shield,m,powered?"#ffe49b":main,powered?25:15,powered?.32:.19);
        path(s.shield,shield,m,powered?"#ffdfa0":main,powered?10:7,.98);
        path(s.core,shield,m,"#f5ffff",powered?3:2,.98);
        const endpoints=shield.map(p=>project(m,p));
        [s.cap1,s.cap2].forEach((el,j)=>{
          if(!endpoints[j]){el.style.display="none";return;}
          el.style.display="";el.setAttribute("cx",endpoints[j][0]);el.setAttribute("cy",endpoints[j][1]);
          el.setAttribute("r",powered?6:4.5);el.setAttribute("fill","#efffff");el.setAttribute("stroke",main);
          el.setAttribute("stroke-width","2");
        });
        if(side===team){
          const pp=project(m,rot(shipWorld(g,side,0,-.035,y+.38)));
          if(pp){nametag.style.display="";nametag.setAttribute("x",pp[0]);nametag.setAttribute("y",pp[1]);}
        }
      }
    }
    let history=[],trailVersion=0;
    function drawBall(m,flip,g,tm){
      const b=g.ball,pos=project(m,[b.x*flip,.24,b.z*flip]),far=project(m,[(b.x+b.r)*flip,.24,b.z*flip]);
      if(pos&&far){
        const radius=Math.max(8,Math.min(70,Math.hypot(pos[0]-far[0],pos[1]-far[1])));
        for(const el of [glow,ball,core]){el.style.display="";el.setAttribute("cx",pos[0]);el.setAttribute("cy",pos[1]);}
        glow.setAttribute("r",radius*(g.phase==="charging"?3.2:2.8));
        ball.setAttribute("r",radius*(g.phase==="charging"?.85+.15*Math.sin(tm*14):1));
        core.setAttribute("r",radius*.22);
      }else{glow.style.display=ball.style.display=core.style.display="none";}
      if(g.phase==="charging")history=[];
      else{history.push({x:b.x,z:b.z});if(history.length>12)history.shift();}
      if(history.length>1){
        const pts=history.map(p=>[p.x*flip,.20,p.z*flip]);
        path(tailSoft,pts,m,"#61c8ff",12,.21);path(tailBright,pts,m,"#a1faff",4,.68);
      }else tailSoft.style.display=tailBright.style.display="none";
    }
    function drawFX(m,flip,dt){
      for(let i=fx.length-1;i>=0;i--){fx[i].t+=dt;if(fx[i].t>.64)fx.splice(i,1);}
      sparks.forEach((arr,i)=>{
        const f=fx[i];
        arr.forEach((node,j)=>{
          if(!f){node.style.display="none";return;}
          const angle=j*2*Math.PI/arr.length;
          const r=f.t*(f.type==="launch"?.66:.48);
          const q1=[(f.x+Math.cos(angle)*r*.42)*flip,.21,(f.z+Math.sin(angle)*r*.42)*flip];
          const q2=[(f.x+Math.cos(angle)*r)*flip,.24,(f.z+Math.sin(angle)*r)*flip];
          path(node,[q1,q2],m,f.color,f.type==="boost_hit"?3.3:2.2,1-f.t/.64);
        });
      });
    }
    function emit(x,z,color,type){
      fx.push({x,z,color,type:type||"hit",t:0});if(fx.length>13)fx.shift();
    }
    function render(frame,world,g,opts){
      const view=frame.getViewerPose(ref)?.views?.[0];if(!view||!world)return;
      const m=mul(view.projectionMatrix,mul(view.transform.inverse.matrix,world));
      const flip=opts.guest?-1:1;
      const tm=opts.time||0;
      svg.setAttribute("viewBox","0 0 "+innerWidth+" "+innerHeight);
      ground(m,flip);drawGoals(m,flip);drawPods(m,flip,g,tm);
      drawShips(m,flip,g,tm,opts.me||"bottom");
      drawBall(m,flip,g,tm);drawFX(m,flip,opts.dt||.016);
    }
    return{render,emit,reset:()=>{history=[];fx.length=0;}};
  };
})(window);