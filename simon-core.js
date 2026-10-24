'use strict';
/* MODO CAOS — Simón Traicionero. Núcleo puro, determinista y sin cámara. */
(function(root){
const COLORS=Object.freeze([
 {name:'ROJO',hex:'#ff3159',rgb:[1,.09,.25],hz:261.63},
 {name:'AZUL',hex:'#238aff',rgb:[.08,.40,1],hz:293.66},
 {name:'AMARILLO',hex:'#ffdf30',rgb:[1,.77,.06],hz:329.63},
 {name:'VERDE',hex:'#21f879',rgb:[.08,1,.34],hz:349.23},
 {name:'VIOLETA',hex:'#b65cff',rgb:[.65,.18,1],hz:392},
 {name:'NARANJA',hex:'#ff8b19',rgb:[1,.38,.035],hz:440},
 {name:'CIAN',hex:'#00f4f6',rgb:[0,.80,.91],hz:493.88},
 {name:'ROSA',hex:'#ff48b9',rgb:[1,.12,.58],hz:523.25},
 {name:'BLANCO',hex:'#dbfaff',rgb:[.73,.97,1],hz:587.33}
]);
const TRAPS=Object.freeze(['electrica','identidad','reloj','fantasmas','mentira','apagon','eco','inversa']);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function rand(g){let s=g.seed>>>0;s^=s<<13;s^=s>>>17;s^=s<<5;g.seed=s>>>0;return g.seed/4294967296}
function hash(s){let h=2166136261;for(const x of String(s)){h=Math.imul(h^x.charCodeAt(0),16777619)}return h>>>0||1}
function make({mode='mortal',seed=0x51A0CA05,maxRounds=12}={}){
 if(!['mortal','clasica','panico'].includes(mode))mode='mortal';
 return {mode,initialSeed:(Number(seed)>>>0)||1,seed:(Number(seed)>>>0)||1,
 round:0,maxRounds:mode==='panico'?3:clamp(maxRounds,3,30),
 phase:'idle',trap:null,rule:'REPETÍ LA SECUENCIA',
 sequence:[],expected:[],colorMap:[0,1,2,3,4,5,6,7,8],
 swap:null,electric:-1,highlight:-1,index:0,timeLeft:0,
 score:0,lives:mode==='clasica'?1:3,combo:0,bestCombo:0,
 attempts:0,correct:0,completed:0,elapsed:0,errors:0,bonuses:0,last:'',paused:false,
 lastRoundScore:0};
}
function pickTrap(g){
 if(g.mode==='clasica'||g.round<5)return null;
 if(g.mode==='panico')return ['reloj','fantasmas','inversa'][g.round-1];
 const max=g.round<7?3:g.round<9?6:8;
 return TRAPS[Math.floor(rand(g)*max)];
}
function plan(g){
 g.round++;g.index=0;g.highlight=-1;g.ghost=-1;g.colorMap=[0,1,2,3,4,5,6,7,8];
 g.trap=pickTrap(g);g.swap=null;g.electric=-1;g.last='';
 const size=g.mode==='panico'?clamp(6+g.round,7,9):clamp(2+Math.floor((g.round-1)/2),2,8);
 const seq=[];while(seq.length<size){let j=Math.floor(rand(g)*9);if(seq.length&&j===seq[seq.length-1])j=(j+1+Math.floor(rand(g)*8))%9;seq.push(j)}
 g.sequence=seq;g.expected=seq.slice();g.phase='show';
 if(g.trap==='identidad'){
  const a=Math.floor(rand(g)*9);let b=Math.floor(rand(g)*8);if(b>=a)b++;
  g.swap=[a,b];g.expected=g.sequence.map(c=>c===a?b:c===b?a:c);
 }
 if(g.trap==='inversa')g.expected=seq.slice().reverse();
 if(g.trap==='electrica')g.electric=seq[Math.floor(rand(g)*seq.length)];
 const instructions={electrica:'BALDOSA ELÉCTRICA · ESPERÁ A QUE SE APAGUE',identidad:'LOS COLORES CAMBIAN DE LUGAR · SEGUÍ EL COLOR',reloj:'CONTRARRELOJ · CAMINÁ, NO CORRAS',fantasmas:'IGNORÁ LOS DESTELLOS BLANCOS',mentira:'SIMÓN MIENTE · SEGUÍ LO QUE VES',apagon:'APAGÓN · RECORDÁ SIN LUCES',eco:'IGNORÁ EL SONIDO EXTRA',inversa:'¡REPRODUCÍ TODO AL REVÉS!'};
 g.rule=instructions[g.trap]||'MEMORIZÁ EL ORDEN · DESPUÉS CAMINÁ';
 g.timeLeft=clamp(10+size*5.2+(g.trap==='reloj'?-size*1.0:0),16,72);
 if(g.mode==='panico')g.timeLeft=clamp(14+size*4,30,52);
 return g;
}
function begin(g){if(g.phase!=='idle'&&g.phase!=='finished')return false;if(g.phase==='finished'){const next=make({mode:g.mode,seed:g.initialSeed+1,maxRounds:g.maxRounds});Object.assign(g,next)}plan(g);return true}
function arm(g){if(g.phase!=='show')return false;if(g.swap){const [a,b]=g.swap;[g.colorMap[a],g.colorMap[b]]=[g.colorMap[b],g.colorMap[a]]}
 g.highlight=-1;g.phase='act';g.index=0;return true}
function electricalUnsafe(g,t=0){return g.trap==='electrica'&&((t/1000)%2.5)<1.25}
function input(g,tile,at=0){
 if(g.phase!=='act'||g.paused||!Number.isInteger(tile)||tile<0||tile>8)return {type:'ignored'};
 if(g.trap==='electrica'&&tile===g.electric&&electricalUnsafe(g,at))return {type:'electric'};
 g.attempts++;
 const target=g.expected[g.index];
 if(tile!==target){
  g.errors++;g.combo=0;g.lives--;g.last='wrong';
  g.phase=g.lives<=0?'finished':'retry';
  return {type:g.phase==='finished'?'finished':'wrong',target,lives:g.lives};
 }
 g.correct++;g.index++;g.combo++;g.bestCombo=Math.max(g.combo,g.bestCombo);
 const bonus=Math.round(100+g.round*25+Math.min(g.combo,10)*12+(g.trap?35:0));
 g.score+=bonus;g.last='correct';
 if(g.index===g.expected.length){
  g.completed++;g.bonuses+=Math.round(g.timeLeft*5);
  g.score+=Math.round(g.timeLeft*5)+g.round*90;
  g.phase=g.round>=g.maxRounds?'finished':'won';g.last='round';
  return {type:g.phase==='finished'?'victory':'round',points:bonus,round:g.round};
 }
 return {type:'correct',points:bonus,index:g.index};
}
function retry(g){if(g.phase!=='retry')return false;g.index=0;g.highlight=-1;g.colorMap=[0,1,2,3,4,5,6,7,8];g.phase='show';g.timeLeft=clamp(10+g.sequence.length*5.2,16,72);return true}
function next(g){if(g.phase!=='won')return false;plan(g);return true}
function tick(g,delta){if(g.paused||g.phase!=='act')return false;const dt=clamp(Number(delta)||0,0,.15);g.elapsed+=dt;g.timeLeft-=dt;if(g.timeLeft<=0){g.timeLeft=0;g.lives--;g.errors++;g.combo=0;g.last='timeout';g.phase=g.lives<=0?'finished':'retry';return true}return false}
function stats(g){return {score:Math.round(g.score),round:g.round,completed:g.completed,accuracy:g.attempts?Math.round(100*g.correct/g.attempts):100,bestCombo:g.bestCombo,lives:g.lives,errors:g.errors}}
function positionFromPoint(x,z,pitch){const c=Math.round(x/pitch+1),r=Math.round(z/pitch+1);if(c<0||c>2||r<0||r>2)return -1;return r*3+c}
function isCentered(x,z,tile,pitch,ratio=.31){if(tile<0||tile>8)return false;const cx=(tile%3-1)*pitch,cz=(Math.floor(tile/3)-1)*pitch;return Math.hypot(x-cx,z-cz)<=pitch*ratio}
root.SimonCore=Object.freeze({COLORS,TRAPS,hash,make,begin,arm,input,next,retry,tick,stats,electricalUnsafe,positionFromPoint,isCentered});
})(typeof window!=='undefined'?window:globalThis);
