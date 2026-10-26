const {test,expect}=require('@playwright/test');
test('start cannot be tapped before game handlers are attached',async({page})=>{
 await page.route('**/cuadrante-runtime.js',async route=>{
  await new Promise(resolve=>setTimeout(resolve,1700));await route.continue();
 });
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'commit'});
 await expect(page.locator('#startDemo')).toBeVisible();
 await expect(page.locator('#startDemo')).toBeDisabled();
 await expect(page.locator('#startAr')).toBeDisabled();
 await expect(page.locator('#startDemo')).toBeEnabled({timeout:12000});
 await expect(page.locator('#startAr')).toBeEnabled();
 await page.locator('#startDemo').click();
 await expect(page.locator('#stage canvas')).toBeVisible({timeout:30000});
 await page.locator('#exitBtn').click();
 await expect(page.locator('#home')).toBeVisible();
});