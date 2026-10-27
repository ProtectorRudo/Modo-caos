'use strict';
/*
 * Color Rush / Premium Visual Layer 1.0
 * Passive SVG decoration: no physics, coordinates, hit-testing, session,
 * scoring, tile polygons, calibration or game-state changes.
 * The original 26 SVG polygons remain unchanged and fully interactive.
 * The decorations use SVG paths with pointer-events:none.
 */
(function () {
  const svg = document.getElementById('tiles');
  if (!svg || svg.dataset.crPremiumArt) return;
  const NS = 'http://www.w3.org/2000/svg';
  const palette = ['#27ef84','#ffd933','#ff4562','#358dff','#b456ff','#ff8929'];
  const titles = ['VERDE','AMARILLO','ROJO','AZUL','VIOLETA','NARANJA'];
  const fills = palette.map(x => x.toLowerCase());
  const originals = Array.from(svg.children).filter(n => n.tagName.toLowerCase() === 'polygon');
  if (originals.length !== 26) return;
  svg.dataset.crPremiumArt = '1';

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function gradient(id, stops, p) {
    const g = el('linearGradient',{id:id,x1:'3%',y1:'0%',x2:'92%',y2:'100%'},p);
    for(const s of stops) el('stop',{'offset':s[0],'stop-color':s[1],'stop-opacity':s[2] == null ? 1 : s[2]},g);
  }
  function tint(hex, mix, factor) {
    const n = parseInt(hex.slice(1),16), m = parseInt(mix.slice(1),16);
    const channels = [16,8,0].map(i => Math.max(0,Math.min(255,Math.round(((n>>i)&255)*(1-factor)+((m>>i)&255)*factor))));
    return '#' + channels.map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  const defs = el('defs',{'id':'crp-defs'},null);
  svg.insertBefore(defs,svg.firstChild);
  gradient('crp-metal',[['0%','#8595aa'],['10%','#344456'],['32%','#101924'],['58%','#283748'],['86%','#101823'],['100%','#64788b']],defs);
  gradient('crp-side',[['0%','#53647a'],['28%','#202b39'],['55%','#0c121c'],['100%','#02080f']],defs);
  gradient('crp-shine',[['0%','#ffffff',.36],['52%','#ffffff',.065],['100%','#ffffff',0]],defs);
  gradient('crp-specular',[['0%','#ffffff',.23],['28%','#ffffff',.085],['67%','#050e18',.08],['100%','#000000',.22]],defs);
  for(let i=0;i<palette.length;i++){
    const c=palette[i];
    gradient('crp-glass-'+i,[['0%',tint(c,'#ffffff',.28)],['19%',tint(c,'#ffffff',.08)],['49%',tint(c,'#031224',.14)],['77%',tint(c,'#00111c',.36)],['100%',tint(c,'#030911',.47)]],defs);
  }
  const grains = el('pattern',{id:'crp-grain',patternUnits:'userSpaceOnUse',width:'22',height:'22'},defs);
  el('path',{d:'M0 0L22 22 M-11 11L11 33 M11 -11L33 11',stroke:'#ffffff','stroke-opacity':'.08','stroke-width':'.65',fill:'none'},grains);
  const micro=el('pattern',{id:'crp-micro',patternUnits:'userSpaceOnUse',width:'9',height:'9'},defs);
  el('path',{d:'M0 9L9 0',stroke:'#ffffff','stroke-opacity':'.06','stroke-width':'.55',fill:'none'},micro);

  const layer = el('g',{id:'crp-visual-layer','pointer-events':'none','aria-hidden':'true'},svg);
  layer.style.pointerEvents='none';
  const items=[];
  for(let i=0;i<25;i++){
    const g=el('g',{'pointer-events':'none','data-tile':String(i)},layer);
    g.style.pointerEvents='none';
    const add=(attrs)=>el('path',Object.assign({'pointer-events':'none'},attrs),g);
    items.push({
      group:g,
      shadow:add({fill:'#030711','fill-opacity':'.46'}),
      side:add({fill:'url(#crp-side)'}),
      edge:add({fill:'url(#crp-metal)',stroke:'#09121c','stroke-width':'3.5','stroke-linejoin':'round'}),
      bolts:add({fill:'none',stroke:'#101822','stroke-width':'2.1','stroke-linecap':'round'}),
      inset:add({fill:'#091724',stroke:'#8599a9','stroke-opacity':'.58','stroke-width':'1.2'}),
      glow:add({fill:'none',stroke:palette[0],'stroke-width':'7','stroke-opacity':'.15','stroke-linejoin':'round'}),
      glass:add({fill:'url(#crp-glass-0)','stroke-linejoin':'round'}),
      texture:add({fill:'url(#crp-grain)','fill-opacity':'.46'}),
      gloss:add({fill:'url(#crp-specular)'}),
      spec:add({fill:'url(#crp-shine)'}),
      seam:add({fill:'none',stroke:'#ffffff','stroke-opacity':'.52','stroke-width':'1','stroke-linejoin':'round'}),
      light:add({fill:'none',stroke:palette[0],'stroke-width':'2.5','stroke-linecap':'round'}),
      focus:add({fill:'none',stroke:'#ffffff','stroke-width':'3','stroke-opacity':'0','stroke-linejoin':'round'})
    });
  }

  const pth = pts => 'M' + pts.map(p => p[0].toFixed(1)+','+p[1].toFixed(1)).join('L') + 'Z';
  const open = pts => 'M' + pts.map(p => p[0].toFixed(1)+','+p[1].toFixed(1)).join('L');
  const blend=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const inset=(ps,t)=>{let x=0,y=0;for(const p of ps){x+=p[0];y+=p[1]}x/=ps.length;y/=ps.length;return ps.map(p=>[x+(p[0]-x)*t,y+(p[1]-y)*t])};
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  let last=0,frames=0;
  function update(ts){
    requestAnimationFrame(update);
    if(document.hidden || ts-last<34) return;
    last=ts;
    let visible=0;
    const heading=(document.getElementById('headline')?.textContent||'').toUpperCase();
    const targetNames=titles.filter(x=>new RegExp('(^|[^A-Z])'+x+'([^A-Z]|$)').test(heading));
    const hud=document.getElementById('hud');
    const active=!!hud && hud.style.display==='flex' && targetNames.length>0 && !/PISTA LISTA|CALIBRAD|RONDA FALLADA|PUNTOS/.test(heading);
    const picked=active?targetNames.map(x=>titles.indexOf(x)):[];
    const heartbeat=.50+.50*Math.sin(ts/205);

    for(let i=0;i<25;i++){
      const source=originals[i+1],a=items[i];
      const txt=source.getAttribute('points')||'';
      if(source.style.display==='none'||!txt){a.group.style.display='none';continue;}
      const v=txt.split(/[ ,]+/).map(Number);
      if(v.length!==8||v.some(n=>!Number.isFinite(n))){a.group.style.display='none';continue;}
      const q=[[v[0],v[1]],[v[2],v[3]],[v[4],v[5]],[v[6],v[7]]];
      if(Math.min(dist(q[0],q[1]),dist(q[2],q[3]))<6){a.group.style.display='none';continue;}
      a.group.style.display='';
      visible++;
      const color=(source.getAttribute('fill')||'').toLowerCase();
      const idx=Math.max(0,fills.indexOf(color)),c=palette[idx];
      const focused=picked.includes(idx);
      const w=Math.min(dist(q[0],q[1]),dist(q[2],q[3]));
      const size=Math.max(1.1,Math.min(6.8,w*.048));
      const deep=Math.max(1.8,Math.min(8.5,size*1.3));
      const base=q.map(p=>[p[0],p[1]+deep]);
      const inner=inset(q,.82),microInner=inset(q,.76);
      const center=inset(q,.62);
      const topBand=[blend(inner[0],inner[3],.055),blend(inner[1],inner[2],.055),blend(inner[1],inner[2],.32),blend(inner[0],inner[3],.32)];
      const topSheen=[blend(inner[0],inner[3],.07),blend(inner[1],inner[2],.07),blend(inner[1],inner[2],.17),blend(inner[0],inner[3],.17)];
      const offset=[q[2],q[3],[q[3][0],q[3][1]+deep],[q[2][0],q[2][1]+deep]];
      a.shadow.setAttribute('d',pth(base));
      a.side.setAttribute('d',pth(offset));
      a.edge.setAttribute('d',pth(q));
      a.edge.setAttribute('stroke-width',Math.max(1.4,size*.66).toFixed(1));
      a.inset.setAttribute('d',pth(inner));
      a.inset.setAttribute('stroke-width',Math.max(.6,size*.23).toFixed(1));
      a.glow.setAttribute('d',pth(microInner));
      a.glow.setAttribute('stroke',c);
      a.glow.setAttribute('stroke-width',(focused?size*2.5:size*1.45).toFixed(1));
      a.glow.setAttribute('stroke-opacity',(focused?.14+.12*heartbeat:.085).toFixed(3));
      a.glass.setAttribute('d',pth(microInner));
      a.glass.setAttribute('fill','url(#crp-glass-'+idx+')');
      a.glass.setAttribute('stroke',c);
      a.glass.setAttribute('stroke-width',(focused?Math.max(1.8,size*.5):Math.max(1.15,size*.35)).toFixed(1));
      a.texture.setAttribute('d',pth(microInner));
      a.gloss.setAttribute('d',pth(center));
      a.spec.setAttribute('d',pth(topSheen));
      a.seam.setAttribute('d',pth(inset(q,.92)));
      a.light.setAttribute('d',open([inner[3],inner[2]])+' '+open([inner[0],inner[3]]));
      a.light.setAttribute('stroke',c);
      a.light.setAttribute('stroke-opacity',focused?(0.66+heartbeat*.34).toFixed(2):'.65');
      a.light.setAttribute('stroke-width',(focused?size*.48:size*.29).toFixed(1));
      a.focus.setAttribute('d',pth(inner));
      a.focus.setAttribute('stroke-opacity',focused?(.27+.42*heartbeat).toFixed(2):'0');
      a.focus.setAttribute('stroke-width',(focused?size*.6:1).toFixed(1));
      const sq=Math.max(1.8,Math.min(4,size*.52));
      a.bolts.setAttribute('d',q.map(p=>'M'+(p[0]-sq*.5).toFixed(1)+','+p[1].toFixed(1)+'l'+sq.toFixed(1)+',0').join(''));
    }
    if(frames++%8===0){
      const overlay=document.getElementById('overlay');
      if(overlay)overlay.dataset.crPremium=visible?'visible':'hidden';
      const h=document.getElementById('headline');
      if(h && active && picked.length===1){h.style.color=palette[picked[0]];h.style.textShadow='0 3px 14px #000, 0 0 24px '+palette[picked[0]]+'55';}
      else if(h){h.style.color='';h.style.textShadow='';}
    }
  }
  requestAnimationFrame(update);
  window.ColorRushPremiumArt = Object.freeze({version:'1.0.0',tileCount:items.length,visualOnly:true});
})();