'use strict';
/* Browser check for a direct-to-game HTTPS URL. External CDNs are not trusted for secrets. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const revision='3ab0538ac012ef1c354cb4ea3df14ddca9f11bbf';
const hosts=[
 'https://cdn.githubraw.com/ProtectorRudo/Modo-caos/'+revision+'/meteoros-autonomo.html',
 'https://cdn.statically.io/gh/ProtectorRudo/Modo-caos@'+revision+'/meteoros-autonomo.html'
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  let winners=0;
  for(const url of hosts){
   const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
   try{
    const response=await page.goto(url,{timeout:20000,waitUntil:'domcontentloaded'});
    const demo=page.locator('#demo');
    const good=response?.status()===200 && await demo.isVisible();
    console.log('HOST',url,'HTTP',response?.status(),'MIME',response?.headers()['content-type'],'GAME_VISIBLE',good);
    if(good){
     await demo.click({timeout:3500});
     await page.locator('#begin').waitFor({timeout:3500});
     console.log('DIRECT_PLAYABLE',url);
     winners++;
    }
   }catch(e){console.warn('HOST_UNAVAILABLE',url,e.message.slice(0,200))}
   finally{await page.close()}
  }
  assert(winners>0,'At least one external host must open the HTML game DIRECTLY in Chrome');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
