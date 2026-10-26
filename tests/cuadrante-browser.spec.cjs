const {test,expect}=require('@playwright/test');
test.use({viewport:{width:960,height:520}});
test('3D arcade loads, plays, pauses and returns to menu',async({page})=>{
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#home')).toBeVisible();
 await expect(page.locator('#startDemo')).toBeVisible();
 await page.locator('#startDemo').click();
 await expect(page.locator('#home')).toBeHidden({timeout:35000});
 await expect(page.locator('#hud')).toBeVisible();
 await expect(page.locator('#contactGauge')).toBeVisible();
 await expect(page.locator('#recenterBtn')).toBeHidden();
 await expect(page.locator('#stage canvas')).toHaveCount(1);
 await expect(page.locator('#placeControls')).toBeHidden();
 const layer=page.locator('#touchLayer');const bb=await layer.boundingBox();expect(bb).not.toBeNull();
 await page.mouse.move(bb.x+bb.width*.54,bb.y+bb.height*.57);await page.mouse.down();
 await page.mouse.move(bb.x+bb.width*.70,bb.y+bb.height*.48,{steps:5});await page.mouse.up();
 const result=await page.evaluate(()=>({meter:document.getElementById('contactFill').style.transform,
   score:document.getElementById('youScore').textContent,
   hasCanvas:!!document.querySelector('#stage canvas'),
   moving:window.getComputedStyle(document.getElementById('stage')).display!=='none'}));
 expect(result.moving).toBe(true);expect(result.hasCanvas).toBe(true);
 expect(result.meter).toMatch(/^scaleX\(\d+(?:\.\d+)?\)$/);
 await page.locator('#pauseBtn').click();
 await expect(page.locator('#modalTitle')).toHaveText('PAUSA');
 await page.getByRole('button',{name:'CONTINUAR'}).click();
 await expect(page.locator('#overlay')).toBeHidden();
 await page.locator('#exitBtn').click();
 await expect(page.locator('#home')).toBeVisible();
 expect(pageErrors).toEqual([]);
});
