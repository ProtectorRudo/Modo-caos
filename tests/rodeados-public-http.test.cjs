'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const https=require('node:https');
const origin='https://modo-caos-eta.vercel.app';
const paths=[
 ['/rodeados.html', /RODEADOS 360/],
 ['/rodeados-core.js', /RodeadosCore/],
 ['/rodeados-ux.js', /RodeadosUX/],
 ['/rodeados-art.js', /createRodeadosArt/],
 ['/rodeados-runtime.js', /startXR/],
 ['/rodeados-progression.js', /RodeadosProgress/],
 ['/index.html', /Modo Caos|MODO CAOS/i]
];
function get(url,redirects=0){
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:16000,headers:{'user-agent':'ModoCaos-Public-Deployment-Check/1.0','accept':'text/html,application/javascript,*/*'}},res=>{
   const body=[];res.on('data',d=>body.push(d));res.on('end',()=>{
    const text=Buffer.concat(body).toString('utf8');
    if(res.statusCode>=300&&res.statusCode<400&&res.headers.location&&redirects<3){
     resolve(get(new URL(res.headers.location,url).href,redirects+1));
    }else resolve({status:res.statusCode,body:text,contentType:res.headers['content-type']||''});
   });
  });req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',reject);
 });
}
for(const [path,expected] of paths){
 test('public '+path,async()=>{
  const url=origin+path;
  const data=await get(url);
  console.log(url,'status',data.status,'content-type',data.contentType,'bytes',data.body.length,'head',data.body.slice(0,90).replace(/\s+/g,' '));
  assert.equal(data.status,200,'HTTP 200 requerido');
  assert.match(data.body,expected,'El archivo real debe contener el módulo esperado, no una página de login/error');
  assert.doesNotMatch(data.body.slice(0,1000),/vercel authentication|authentication required|deployment protection/i);
 });
}
