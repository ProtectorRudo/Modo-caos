'use strict';
/**
 * Color Rush Pro finishing - visual UI + position reticle only.
 * Does not read or change game timers, score, coordinates, calibration,
 * touch handlers, hit polygons, or XR world matrices.
 */
(function(){
  if(window.ColorRushProFinish)return;
  const overlay=document.getElementById('overlay'),svg=document.getElementById('tiles');
  if(!overlay||!svg)return;
  const heading=document.getElementById('headline');
  const palette=['#39FFB6','#FFD54A','#FF426F','#3DA4FF','#BA65FF','#FF982E'];
  const names=['VERDE','AMARILLO','ROJO','AZUL','VIOLETA','NARANJA'];
  const ns='http://www.w3.org/2000/svg';
  let ring=null,innerRing=null,marker=null,arrow=null;
  let phase='',lastTick=0,lastCx=0,lastCy=0;
  const make=(tag,attrs)=>{
    const e=document.createElementNS(ns,tag);
    for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);
    e.style.pointerEvents='none';
    return e;
  };
  function getMarker(){
    const el=[...svg.querySelectorAll('circle')].find(n=>!n.hasAttribute('data-crp-marker'));
    if(!el)return null;
    if(marker===el)return marker;
    marker=el;
    marker.classList.add('crp-player-dot');
    const label=[...svg.querySelectorAll('text')].find(n=>n.textContent.trim()==='YO');
    if(label)label.classList.add('crp-player-label');
    ring=make('circle',{'data-crp-marker':'halo',r:'26',fill:'none',stroke:'#ffffff','stroke-width':'2.7','stroke-dasharray':'12 7','stroke-opacity':'.95'});
    innerRing=make('circle',{'data-crp-marker':'inner',r:'20',fill:'none',stroke:'#4dffdc','stroke-width':'2.1','stroke-opacity':'.8'});
    svg.insertBefore(ring,marker);
    svg.insertBefore(innerRing,marker);
    if(!arrow){
      arrow=document.createElement('div');
      arrow.id='crp-player-edge';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='⌄ VOS';
      overlay.appendChild(arrow);
    }
    return marker;
  }
  function tick(){
    const active=typeof stage!=='undefined' && stage==='playing';
    if(phase!==String(active)){
      phase=String(active);
      overlay.classList.toggle('crp-live',active);
    }
    const h=(heading?.textContent||'').toUpperCase();
    const colorId=active?names.findIndex(n=>h.includes(n)):-1;
    if(colorId>=0){
      overlay.style.setProperty('--crp-target',palette[colorId]);
      heading.style.color=palette[colorId];
      heading.style.textShadow='0 3px 16px #06111d,0 0 12px '+palette[colorId]+'66';
    }else if(heading){
      heading.style.removeProperty('color');
      heading.style.removeProperty('text-shadow');
    }
    if(!getMarker())return;
    const showing=marker.style.display!=='none' && marker.getAttribute('cx')!==null;
    let cx=Number(marker.getAttribute('cx')),cy=Number(marker.getAttribute('cy'));
    const valid=showing&&Number.isFinite(cx)&&Number.isFinite(cy);
    if(ring){ring.style.display=innerRing.style.display=valid?'':'none';}
    if(!valid){if(arrow)arrow.style.display='none';return;}
    lastCx=cx;lastCy=cy;
    const now=performance.now(),pulse=.5+.5*Math.sin(now/235);
    ring.setAttribute('cx',cx);ring.setAttribute('cy',cy);
    innerRing.setAttribute('cx',cx);innerRing.setAttribute('cy',cy);
    ring.setAttribute('r',(25+pulse*2.2).toFixed(1));
    ring.setAttribute('stroke-opacity',(.57+.35*pulse).toFixed(2));
    innerRing.setAttribute('r','19');
    const w=window.innerWidth,hg=window.innerHeight;
    const below=cy>hg-(active?138:195);
    const above=cy<80;
    const toLeft=cx<32,toRight=cx>w-32;
    if(arrow && (below||above||toLeft||toRight)){
      arrow.style.display='block';
      arrow.style.left=Math.max(62,Math.min(w-62,cx))+'px';
      arrow.textContent=(above?'⌃':below?'⌄':toRight?'›':'‹')+' VOS';
      arrow.style.bottom=(below?'141px':'auto');
      arrow.style.top=(above?'102px':(toRight||toLeft)?Math.max(100,Math.min(hg-172,cy))+'px':'auto');
    }else if(arrow)arrow.style.display='none';
  }
  const interval=setInterval(tick,85);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){overlay.classList.remove('crp-live');if(arrow)arrow.style.display='none';}
  });
  window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  window.ColorRushProFinish=Object.freeze({version:'3.0.0',visualOnly:true});
})();