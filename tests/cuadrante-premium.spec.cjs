const {test,expect}=require('@playwright/test');
test.use({viewport:{width:1030,height:620}});
test('CC0 models and PBR textures actually load and decorate the live 3D arena',async({page})=>{
 test.setTimeout(90000);
 const began=Date.now();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#startDemo')).toBeEnabled({timeout:12000});
 await page.locator('#startDemo').click();
 await expect(page.locator('#stage canvas')).toBeVisible({timeout:35000});
 await page.waitForFunction(()=>{
  const s=document.querySelector('#stage');
  return s&&s.dataset.premiumModels!==undefined
 },{timeout:50000});
 const counts=await page.locator('#stage').evaluate(el=>({models:Number(el.dataset.premiumModels),pbr:Number(el.dataset.pbrChannels)}));
 console.log('Premium local assets loaded:',JSON.stringify(counts),'after',Date.now()-began,'ms');
 expect(counts.pbr).toBe(4);
 expect(counts.models).toBeGreaterThanOrEqual(5);
 await page.locator('#pauseBtn').click();await expect(page.locator('#modalTitle')).toHaveText('PAUSA');
 await page.getByRole('button',{name:'CONTINUAR'}).click();
 await expect(page.locator('#overlay')).toBeHidden();
 await page.locator('#exitBtn').click();await expect(page.locator('#home')).toBeVisible();
 expect(errors).toEqual([]);
});