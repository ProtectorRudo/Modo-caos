'use strict';
/* REBOTE MORTAL: validates the exact commit on rawcdn.githack.com.
   No Vercel deployment necessary. Live camera/ARCore must still be tested on Android. */
const assert=require('node:assert/strict');
const sha=process.env.REBOTE_CDN_SHA;
assert.match(sha||'',/^[a-f0-9]{40}$/,'GitHub SHA required');
const base='https://rawcdn.githack.com/ProtectorRudo/Modo-caos/'+sha+'/';
const files=[
 ['rebote.html','text/html','REBOTE MORTAL','./rebote-runtime.js?v=11'],
 ['rebote-core.js','javascript','ReboteCore','function launch'],
 ['rebote-runtime.js','javascript','createRodeadosArCompositor','placementSvg'],
 ['rebote-art.js','javascript','createReboteArt','placementCue'],
 ['rodeados-ar-compositor.js','javascript','createRodeadosArCompositor','ar-composited-world']
];
async function verifyFile([name,mime,mark1,mark2]){
 const url=base+name;
 let reason='';
 for(let attempt=0;attempt<9;attempt++){
  try{
   const resp=await fetch(url,{signal:AbortSignal.timeout(16000),headers:{'User-Agent':'ModoCaos-Rebote-CDN-Verification'}});
   const text=await resp.text();
   const type=resp.headers.get('content-type')||'';
   if(name==='rebote.html')console.log('CDN HEADERS CSP',resp.headers.get('content-security-policy'),'XFO',resp.headers.get('x-frame-options'),'CORP',resp.headers.get('cross-origin-resource-policy'));
   if(resp.ok&&type.includes(mime)&&text.includes(mark1)&&text.includes(mark2)){
    console.log('PASS',name,resp.status,type,text.length);
    return;
   }
   reason='status='+resp.status+', mime='+type+', length='+text.length+', markers='+text.includes(mark1)+'/'+text.includes(mark2);
  }catch(error){reason=error.message}
  console.log('RETRY',attempt+1,name,reason);
  await new Promise(resolve=>setTimeout(resolve,4000));
 }
 throw new Error(name+' external CDN verification failed: '+reason);
}
(async()=>{
 for(const file of files)await verifyFile(file);
 console.log('PASS: exact-commit executable Rebote Mortal HTML/JS is publicly available over HTTPS.');
 console.log('LIVE:',base+'rebote.html');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
