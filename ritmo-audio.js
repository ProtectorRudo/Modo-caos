'use strict';
/* Banda sonora 100% sintetizada en navegador; no se descargan obras de terceros. */
(function(root){
 const SONGS=root.RitmoCore.SONGS,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create(){
  let ctx=null,timer=null,startAt=0,nextBeat=0,nextMelody=0,melodyQueue=[],sourceNodes=new Set(),gain=null,mute=false,track='neon',ended=false;
  let personalBuffer=null,personalSong=null,personalSource=null,analysis=null;
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
   if(!song.publicDomain&&(track==='neon'||accent%2===0)){
    let semitone=pitch[(bar*2+accent+song.beat)%pitch.length]+(bar%4===3?12:0);
    let hz=440*Math.pow(2,(song.bass+12+semitone-69)/12);
    oscillator(hz,t+b*(track==='solar'?.24:.08),Math.min(.29,b*.68),track==='neon'?'sawtooth':track==='fuego'?'square':'triangle',track==='fuego'?.045:.064);
   }
   if(accent===0&&bar%4===3){for(let j=0;j<3;j++)oscillator(rootFreq*Math.pow(2,([0,4,7][j]+chord+12)/12),t,b*2,'sine',.027)}
  }
  function melodyNotes(song){
   if(!song.publicDomain||!song.melody)return [];
   const cycle=song.melody.reduce((sum,n)=>sum+n.length,0),out=[];
   for(let r=0;r*cycle<song.bars*4;r++)for(const n of song.melody){
    if(n.at+r*cycle<song.bars*4)out.push({beat:n.at+r*cycle,midi:n.midi,duration:n.length});
   }
   return out;
  }
  function pump(){
   if(!ctx||ended||SONGS[track]?.requiresFile)return;
   const song=SONGS[track],beat=60/song.bpm,beats=song.bars*4,until=ctx.currentTime+.19;
   while(nextBeat<beats&&startAt+nextBeat*beat<until){note(startAt+nextBeat*beat,nextBeat);nextBeat++}
   while(nextMelody<melodyQueue.length&&startAt+melodyQueue[nextMelody].beat*beat<until){
    const m=melodyQueue[nextMelody++],frequency=440*Math.pow(2,(m.midi-69)/12);
    oscillator(frequency,startAt+m.beat*beat,Math.min(1.2,m.duration*beat*.84),song.instrument==='brass'?'sawtooth':'triangle',song.instrument==='brass'?.049:.095);
   }
  }
  async function start(name='neon'){
   stop();track=SONGS[name]?name:'neon';init();ended=false;
   await ctx.resume();startAt=ctx.currentTime+.12;nextBeat=0;nextMelody=0;melodyQueue=melodyNotes(SONGS[track]);
   if(SONGS[track].requiresFile){
    if(!personalBuffer||personalSong!==track)throw Error('Elegí el archivo de esta canción antes de comenzar.');
    personalSource=ctx.createBufferSource();personalSource.buffer=personalBuffer;personalSource.connect(gain);
    personalSource.start(startAt);sourceNodes.add(personalSource);personalSource.onended=()=>sourceNodes.delete(personalSource);
   }else{pump();timer=setInterval(pump,40)}
   return startAt;
  }
  function now(){return ctx?Math.max(0,ctx.currentTime-startAt):0}
  async function pause(){if(ctx?.state==='running')await ctx.suspend()}
  async function resume(){if(ctx?.state==='suspended')await ctx.resume()}
  function stop(){if(timer)clearInterval(timer);timer=null;ended=true;
   for(const n of sourceNodes){try{n.stop()}catch(_){}}
   sourceNodes.clear();personalSource=null;
  }

  // El archivo nunca sale del dispositivo: ni fetch ni envío al backend.
  async function loadLocal(file,name){
   if(!SONGS[name]?.requiresFile)throw Error('Este perfil no requiere un archivo.');
   if(!file||file.size>38*1024*1024)throw Error('Seleccioná un audio de hasta 38 MB.');
   if(file.type&&!file.type.startsWith('audio/')&&!/\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(file.name))throw Error('Seleccioná un archivo de audio.');
   init();await ctx.resume();
   const bytes=await file.arrayBuffer();
   const decoded=await ctx.decodeAudioData(bytes);
   if(decoded.duration<24)throw Error('La grabación es demasiado corta.');
   personalBuffer=decoded;personalSong=name;
   const beat=60/SONGS[name].bpm;
   // Un estimador de pulsos localiza el desfase global frente al BPM conocido.
   // El resultado puede corregirse desde el control de sincronización.
   const channel=decoded.getChannelData(0),rate=decoded.sampleRate,step=.02;
   const count=Math.min(Math.floor(Math.min(decoded.duration,45)/step),2200);
   const energy=new Float32Array(count);
   let max=0;
   for(let i=0;i<count;i++){
    const start=Math.floor(i*step*rate),end=Math.min(channel.length,start+Math.round(step*rate)),stride=4;
    let e=0,k=0;for(let j=start;j<end;j+=stride){e+=channel[j]*channel[j];k++}
    energy[i]=Math.sqrt(e/Math.max(1,k));max=Math.max(max,energy[i]);
   }
   const onset=new Float32Array(count);let average=0;
   for(let i=2;i<count;i++){
    average=average*.92+energy[i]*.08;
    onset[i]=Math.max(0,energy[i]-Math.max(energy[i-1],average*.9));
   }
   let bestPhase=0,best=-1e20;
   for(let phase=0;phase<beat;phase+=.012){
    let total=0,samples=0;
    for(let time=phase+beat*2;time<Math.min(38,decoded.duration-1);time+=beat){
     const bin=Math.round(time/step);if(bin>=2&&bin<count-2){total+=onset[bin];samples++}
    }
    if(samples&&total/samples>best){best=total/samples;bestPhase=phase}
   }
   analysis={beatPhase:bestPhase,confidence:max?best/max:0,duration:decoded.duration,bpm:SONGS[name].bpm,filename:file.name};
   SONGS[name].phaseSeconds=bestPhase;
   SONGS[name].clipDuration=Math.min(decoded.duration-.25,SONGS[name].bars*4*beat+bestPhase);
   return analysis;
  }
  function localStatus(){return analysis;}

  function volume(v){mute=!!v;if(gain)gain.gain.value=mute?0:.25}
  function state(){return {muted:mute,playing:!!timer&&!ended,started:startAt,track}}
  return {init,start,now,pause,resume,stop,volume,state,loadLocal,localStatus};
 }
 root.RitmoAudio={create};
})(window);
