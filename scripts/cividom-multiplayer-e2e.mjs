import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const base='http://127.0.0.1:4173/paper.html?qa=1';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let host,guest,hctx,gctx,code='',phase='init';
const logs={host:[],guest:[],events:[]};
const record=(name,page)=>{
 page.on('pageerror',e=>logs[name].push('ERROR '+e.message));
 page.on('console',m=>{if(m.type()==='error')logs[name].push('CONSOLE '+m.text().slice(0,200))});
};
try{
 hctx=await browser.newContext({viewport:{width:412,height:840},isMobile:true,hasTouch:true});
 gctx=await browser.newContext({viewport:{width:412,height:840},isMobile:true,hasTouch:true});
 host=await hctx.newPage();guest=await gctx.newPage();
 await host.route('**/paper-3d.mjs*',r=>r.fulfill({status:200,contentType:'text/javascript',body:'// 2D smoke mode'}));
 await guest.route('**/paper-3d.mjs*',r=>r.fulfill({status:200,contentType:'text/javascript',body:'// 2D smoke mode'}));
 record('host',host);record('guest',guest);
 phase='load-host';
 await host.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await host.waitForFunction(()=>!!window.CividomOnlineUI,{timeout:35000});
 phase='create';
 await host.locator('#cv-online-button').click();
 await host.locator('#cv-nick').fill('Cividom Host QA');
 await host.locator('#cv-action').click();
 await host.waitForFunction(()=>window.CividomOnlineUI?.getRoom()?.length===8,{timeout:45000});
 code=await host.evaluate(()=>window.CividomOnlineUI.getRoom());
 logs.events.push('created '+code);
 phase='join';
 await guest.goto(base+'&room='+code,{waitUntil:'domcontentloaded',timeout:45000});
 await guest.waitForFunction(()=>!!window.CividomOnlineUI,{timeout:35000});
 await guest.locator('#cv-nick').fill('Invitado QA');
 await guest.locator('#cv-action').click();
 await guest.waitForFunction(()=>window.CividomOnlineUI?.getRoom()?.length===8,{timeout:45000});
 await host.waitForFunction(()=>document.querySelectorAll('#cv-people .player').length===2,{timeout:30000});
 logs.events.push('both joined');
 phase='ready';
 await host.locator('#cv-ready').click();
 await guest.locator('#cv-ready').click();
 await host.waitForFunction(()=>!document.getElementById('cv-go').disabled,{timeout:30000});
 logs.events.push('both ready');
 phase='start';
 await host.locator('#cv-go').click();
 await host.waitForFunction(()=>window.CividomOnlineBridge?.role()==='host',{timeout:25000});
 await guest.waitForFunction(()=>window.CividomOnlineBridge?.role()==='guest',{timeout:25000});
 logs.events.push('both playing');
 phase='sync';
 await guest.waitForFunction(()=>window.CividomOnlineBridge?.state().seq>2,{timeout:30000});
 await guest.mouse.move(360,425);
 await guest.waitForTimeout(1300);
 const h=await host.evaluate(()=>({
  status:window.CividomOnlineBridge.state(),
  players:window.Paper3DState().people.length,
  guest:window.Paper3DState().people[1],
  clock:window.Paper3DState().clock
 }));
 const g=await guest.evaluate(()=>({
  status:window.CividomOnlineBridge.state(),
  players:window.Paper3DState().people.length,
  guest:window.Paper3DState().people[1],
  clock:window.Paper3DState().clock
 }));
 logs.events.push({h,g});
 assert.equal(h.players,25);
 assert.equal(g.players,25);
 assert.ok(g.status.seq>2,'host must deliver authoritative frames to guest');
 assert.ok(Math.abs(h.guest.x-g.guest.x)<140,'both browsers must see same guest position');
 assert.ok(Math.abs(h.guest.y-g.guest.y)<140,'both browsers must see same guest position');
 assert.ok(Math.abs(h.clock-g.clock)<2,'both browsers must share match clock');
 await mkdir('artifacts',{recursive:true});
 await host.screenshot({path:'artifacts/cividom-room-host.png'});
 await guest.screenshot({path:'artifacts/cividom-room-guest.png'});
 logs.result='PASS';
 console.log('CIVIDOM_MULTIPLAYER_E2E_PASS='+JSON.stringify({h,g,code}));
}catch(e){
 logs.result='FAIL';logs.phase=phase;logs.error=e.stack||String(e);
 console.error('CIVIDOM_MULTIPLAYER_E2E_FAILURE='+JSON.stringify({phase,error:String(e),code}));
 try{await host?.screenshot({path:'artifacts/cividom-room-host-failure.png'})}catch(_){}
 try{await guest?.screenshot({path:'artifacts/cividom-room-guest-failure.png'})}catch(_){}
 process.exitCode=1;
}finally{
 await mkdir('artifacts',{recursive:true});
 await writeFile('artifacts/cividom-online-e2e.json',JSON.stringify(logs,null,2));
 await hctx?.close();await gctx?.close();await browser.close();
}
