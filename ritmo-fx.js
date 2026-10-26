'use strict';
/* Ritmo Caos FX: compositing 2D over XR/2D with minimal allocations,
 * glow bursts, sparks, streaks, score callouts and sustain auras. */
(function(root){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const PALETTE=['#4cff85','#ff5274','#ffd34c','#438eff'];
 function create(canvas){
  const ctx=canvas.getContext('2d',{alpha:true}),particles=[],labels=[],rings=[];
  const sprites=root.RitmoKenneyVFX||null;
  sprites?.load();
  let last=0,w=1,h=1,flash=0,flashTint='#ffffff',comboPulse=0;
  let reduced=false;try{reduced=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){}
  function size(){
   const W=window.innerWidth||390,H=window.innerHeight||850,dpr=Math.min(2,window.devicePixelRatio||1);
   const cw=Math.round(W*dpr),ch=Math.round(H*dpr);
   if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
   ctx.setTransform(dpr,0,0,dpr,0,0);w=W;h=H;
  }
  function position(lane,spot){
   if(spot&&Number.isFinite(spot[0])&&Number.isFinite(spot[1]))return spot;
   return [w*(lane+.5)/4,h*.74];
  }
  function burst(lane,spot,rating='PERFECTO',combo=0,points=0){
   size();
   const [x,y]=position(lane,spot),color=PALETTE[lane]||'#fff';
   const miss=rating==='FALLO',bonus=rating==='HOLD'||combo>=10;
   const n=reduced?6:miss?5:bonus?27:rating==='PERFECTO'?22:rating==='GENIAL'?15:10;
   // Seedless cosmetic random only. Scoring is completely deterministic in core.
   for(let i=0;i<n&&particles.length<175;i++){
    const angle=Math.random()*Math.PI*2,speed=miss?55+Math.random()*70:(bonus?115:80)+Math.random()*170;
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-50,life:0,ttl:.45+Math.random()*.55,
     r:miss?2:2+Math.random()*3,color:miss?'#ff6680':i%5===0?'#fff':color,
     sprite:!miss&&i%4===0});
   }
   rings.push({x,y,r:12,age:0,ttl:miss?.32:.54,color:miss?'#ff6670':color});
   if(rings.length>12)rings.shift();
   if(!miss){flash=Math.max(flash,bonus?.19:.09);flashTint=color;comboPulse=bonus?.52:.27}
   const word=rating==='HOLD'?'¡SOSTENIDA PERFECTA!':rating==='PERFECTO'?'PERFECTO':rating==='GENIAL'?'GENIAL':rating==='BIEN'?'BIEN':'FALLO';
   labels.push({text:word,x,y:y-22,age:0,ttl:bonus?1.0:.72,color:miss?'#ff8093':color,size:bonus?20:15});
   if(points>0)labels.push({text:'+'+points.toLocaleString('es-AR'),x,y:y+4,age:0,ttl:.85,color:'#ffffff',size:bonus?21:14});
   if(labels.length>7)labels.shift();
  }
  function celebrate(combo){
   size();comboPulse=.95;flash=Math.max(.18,flash);flashTint='#ffd46d';
   for(let i=0;i<(reduced?8:38);i++){
    const lane=i%4,x=w*(lane+.5)/4;
    particles.push({x,y:h*.7,vx:(Math.random()-.5)*380,vy:-Math.random()*340-80,life:0,ttl:.65+Math.random()*.75,
      r:2+Math.random()*4,color:PALETTE[lane]});
   }
   labels.push({text:'🔥 ¡COMBO '+combo+'!',x:w*.5,y:h*.34,age:0,ttl:1.25,color:'#ffe684',size:30});
  }
  function frame(t=performance.now()){
   size();const dt=last?clamp((t-last)/1000,0,.05):.016;last=t;
   ctx.clearRect(0,0,w,h);
   if(flash>.005){
    ctx.globalAlpha=flash*.30;ctx.fillStyle=flashTint;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
    flash=Math.max(0,flash-dt*.8);
   }
   if(comboPulse>.01){
    ctx.save();ctx.globalAlpha=comboPulse*.27;ctx.strokeStyle='#ffe7a7';ctx.lineWidth=4;
    ctx.strokeRect(4,4,w-8,h-8);ctx.restore();comboPulse=Math.max(0,comboPulse-dt*.9);
   }
   for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.life+=dt;if(p.life>=p.ttl){particles.splice(i,1);continue}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;
    const fade=1-p.life/p.ttl;
    ctx.globalAlpha=fade*.92;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=7;
    const image=p.sprite&&sprites?.colored('spark',p.color);
    if(image&&typeof ctx.drawImage==='function'){
     const diameter=Math.max(5,p.r*9*fade);
     ctx.drawImage(image,p.x-diameter/2,p.y-diameter/2,diameter,diameter);
    }else{
     ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.3,p.r*fade),0,Math.PI*2);ctx.fill();
    }
   }
   ctx.shadowBlur=0;ctx.globalAlpha=1;
   for(let i=rings.length-1;i>=0;i--){
    const r=rings[i];r.age+=dt;if(r.age>=r.ttl){rings.splice(i,1);continue}
    const p=r.age/r.ttl;ctx.globalAlpha=(1-p)*.7;ctx.strokeStyle=r.color;ctx.lineWidth=5*(1-p)+.5;
    const halo=sprites?.colored('light',r.color);
    if(halo&&typeof ctx.drawImage==='function'){
     const sz=(r.r+66*p)*3.25;
     ctx.globalAlpha=(1-p)*.29;ctx.drawImage(halo,r.x-sz/2,r.y-sz/2,sz,sz);
     ctx.globalAlpha=(1-p)*.7;
    }
    ctx.beginPath();ctx.arc(r.x,r.y,r.r+66*p,0,Math.PI*2);ctx.stroke();
   }
   ctx.globalAlpha=1;
   ctx.textAlign='center';ctx.textBaseline='middle';
   for(let i=labels.length-1;i>=0;i--){
    const l=labels[i];l.age+=dt;if(l.age>=l.ttl){labels.splice(i,1);continue}
    const p=l.age/l.ttl;ctx.globalAlpha=Math.min(1,1.5*(1-p));
    ctx.font='1000 '+l.size+'px system-ui';ctx.lineWidth=5;ctx.strokeStyle='#08162e';ctx.strokeText(l.text,l.x,l.y-p*35);
    ctx.fillStyle=l.color;ctx.shadowColor=l.color;ctx.shadowBlur=11;ctx.fillText(l.text,l.x,l.y-p*35);ctx.shadowBlur=0;
   }
   ctx.globalAlpha=1;
  }
  function reset(){particles.length=0;labels.length=0;rings.length=0;flash=0;comboPulse=0;last=0;size();ctx.clearRect(0,0,w,h)}
  return {burst,celebrate,frame,reset};
 }
 root.RitmoFx={create};
})(window);
