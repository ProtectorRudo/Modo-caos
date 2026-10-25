'use strict';
/* Banda sonora 100% sintetizada en navegador; no se descargan obras de terceros. */
(function(root){
 const SONGS=root.RitmoCore.SONGS,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create(){
  let ctx=null,timer=null,startAt=0,nextBeat=0,sourceNodes=new Set(),gain=null,mute=false,track='neon',ended=false;
  function init(){ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();if(!gain){gain=ctx.createGain();gain.gain.value=mute?0:.25;gain.connect(ctx.destination)}return ctx}
  function oscillator(freq,start,dur,wave='sine',vol=.14,slide=null){
   const o=ctx.createOscillator(),g=ctx.createGain();o.type=wave;o.frequency.setValueAtTime(freq,start);
   if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),start+dur);
   g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),start+.007);
   g.gain.exponentialRampToValueAtTime(.0001,start+dur);
   o.connect(g);g.connect(gain);o.start(start);o.stop(start+dur+.02);
   sourceNodes.add(o);o.onended=()=>{sourceNodes.delete(o);try{o.disconnect();g.disconnect()}catch(_){}};
  }
  function noise(start,dur,vol,lowpass=2400){
   const length=Math.max(1,Math.round(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,length,ctx.sampleRate),data=buf.getChannelData(0);
   for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
   const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
   s.buffer=buf;filter.type='lowpass';filter.frequency.value=lowpass;g.gain.value=vol;
   s.connect(filter);filter.connect(g);g.connect(gain);s.start(start);s.stop(start+dur);
   sourceNodes.add(s);s.onended=()=>{sourceNodes.delete(s);try{s.disconnect();filter.disconnect();g.disconnect()}catch(_){}};
  }
  function note(t,beatIdx){
   const song=SONGS[track], b=60/song.bpm,bar=Math.floor(beatIdx/4),accent=beatIdx%4;
   const pitch=SONGS[track].lead,steps=SONGS[track].scale;
   const rootFreq=440*Math.pow(2,(song.bass-69)/12);
   // Independent original drum patterns and harmonic progressions for each style.
   if(accent===0||((track==='fuego'||track==='solar')&&accent===2))oscillator(110,t,.16,'sine',.54,43);
   if(track==='neon'&&accent===2)oscillator(110,t,.14,'sine',.47,48);
   if(accent===1||accent===3){noise(t,.095,.105,1900);oscillator(220,t,.065,'triangle',.04,110)}
   if(track==='solar'){noise(t,.035,.035,5500);noise(t+b*.5,.038,.032,6000)}
   else {noise(t,.039,.044,6800);noise(t+b*.5,.031,.033,7300)}
   const chord=[0,5,3,7][bar%4],bass=rootFreq*Math.pow(2,(chord+(accent===3?7:0))/12);
   oscillator(bass,t,Math.min(b*.67,.42),track==='fuego'?'sawtooth':'triangle',track==='fuego'?.115:.14);
   if(track==='neon'||accent%2===0){
    let semitone=pitch[(bar*2+accent+song.beat)%pitch.length]+(bar%4===3?12:0);
    let hz=440*Math.pow(2,(song.bass+12+semitone-69)/12);
    oscillator(hz,t+b*(track==='solar'?.24:.08),Math.min(.29,b*.68),track==='neon'?'sawtooth':track==='fuego'?'square':'triangle',track==='fuego'?.045:.064);
   }
   if(accent===0&&bar%4===3){for(let j=0;j<3;j++)oscillator(rootFreq*Math.pow(2,([0,4,7][j]+chord+12)/12),t,b*2,'sine',.027)}
  }
  function pump(){
   if(!ctx||ended)return;
   const song=SONGS[track],beat=60/song.bpm,beats=song.bars*4,until=ctx.currentTime+.19;
   while(nextBeat<beats&&startAt+nextBeat*beat<until){note(startAt+nextBeat*beat,nextBeat);nextBeat++}
  }
  async function start(name='neon'){
   stop();track=SONGS[name]?name:'neon';init();ended=false;
   await ctx.resume();startAt=ctx.currentTime+.12;nextBeat=0;pump();timer=setInterval(pump,40);
   return startAt;
  }
  function now(){return ctx?Math.max(0,ctx.currentTime-startAt):0}
  async function pause(){if(ctx?.state==='running')await ctx.suspend()}
  async function resume(){if(ctx?.state==='suspended')await ctx.resume()}
  function stop(){if(timer)clearInterval(timer);timer=null;ended=true;
   for(const n of sourceNodes){try{n.stop()}catch(_){}}
   sourceNodes.clear();
  }
  function volume(v){mute=!!v;if(gain)gain.gain.value=mute?0:.25}
  function state(){return {muted:mute,playing:!!timer&&!ended,started:startAt,track}}
  return {init,start,now,pause,resume,stop,volume,state};
 }
 root.RitmoAudio={create};
})(window);
