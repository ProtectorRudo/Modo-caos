'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(p==='/')p='/index.html';
 const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,buf)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.glb')?'model/gltf-binary':'application/octet-stream'}).end(buf));
});
(async()=>{
 let browser;try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const problems=[];page.on('pageerror',e=>problems.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/rodeados.html?v=27',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RodeadosAutoRobots?.status?.weapons?.rifleLoaded===true,null,{timeout:30000});
  await page.locator('#startDemo').click();
  await page.waitForFunction(()=>window.__RodeadosDebug?.stage==='playing',null,{timeout:14000});
  await page.waitForFunction(()=>window.__RodeadosDebug?.viewWeapon?.framing?.dominantVisible===true,null,{timeout:10000});
  const framing=await page.evaluate(()=>__RodeadosDebug.viewWeapon.framing);
  assert.equal(framing.source,'polyhaven-pbr-762-rifle');
  assert(framing.coverage>.90&&framing.bounds.right<.67&&framing.width!==0);
  console.log('FPS_AIM',JSON.stringify(framing.aim));
  assert(framing.aim.upward===true,
   'the rifle muzzle must project ABOVE the shoulder stock, not into the floor: '+JSON.stringify(framing.aim));
  assert(framing.aim.towardReticle>.70,
   'the rifle barrel must visually aim toward the center reticle: '+JSON.stringify(framing.aim));
  const outfile=path.resolve(root,'docs/QA/rodeados-v27-rifle-aim-mobile.png');
  fs.mkdirSync(path.dirname(outfile),{recursive:true});
  await page.screenshot({path:outfile,animations:'disabled'});
  console.log('FPS_SCREENSHOT',outfile,'bounds',JSON.stringify(framing),'pngBytes',fs.statSync(outfile).size,'errors',JSON.stringify(problems));
  assert.deepEqual(problems,[]);
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
