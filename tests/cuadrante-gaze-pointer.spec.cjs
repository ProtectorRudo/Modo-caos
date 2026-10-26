const {test,expect}=require('@playwright/test');
test.use({viewport:{width:980,height:620}});
test('AR gaze hides the large defender; world reticle appears and impact shield fades after 0.2 seconds',async({page})=>{
 test.setTimeout(80000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  const T=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');
  const stage=window.CuadranteArt(T).makeStage();
  const s=window.CuadranteCore.create();window.CuadranteCore.start(s);s.phase='playing';
  stage.update(s,.016);
  const demo=stage.you.visible;
  stage.setAimMode(true);
  stage.update(s,.016);
  const marker=stage.root.getObjectByName('cuadrante-aim-marker');
  const shield=stage.root.getObjectByName('cuadrante-impact-shield');
  const ar={playerHidden:!stage.you.visible,rivalVisible:stage.enemy.visible,
   markerVisible:marker.visible,markerZ:marker.position.z,
   shieldInitiallyHidden:!shield.visible};
  stage.spawnImpact(s.player.x,s.player.y,2.883,'you');
  const shieldOn=shield.visible;
  stage.update(s,.09);const mid=shield.visible;
  stage.update(s,.16);const faded=!shield.visible;
  stage.setAimMode(false);stage.update(s,.016);
  const demoRestored=stage.you.visible&&!marker.visible&&!shield.visible;
  stage.dispose();return {demo,ar,shieldOn,mid,faded,demoRestored};
 });
 expect(result.demo).toBe(true);expect(result.ar).toMatchObject({
  playerHidden:true,rivalVisible:true,markerVisible:true,shieldInitiallyHidden:true});
 expect(result.ar.markerZ).toBeLessThan(0);
 expect(result.shieldOn).toBe(true);expect(result.mid).toBe(true);expect(result.faded).toBe(true);
 expect(result.demoRestored).toBe(true);
 expect(errors).toEqual([]);
});
test('3D demo still exposes touch steering, while AR has its own device reticle',async({page})=>{
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#aimReticle')).toBeHidden();
 await page.locator('#startDemo').click();
 await expect(page.locator('#stage canvas')).toBeVisible({timeout:26000});
 await expect(page.locator('#aimReticle')).toBeHidden();
 await expect(page.locator('#hud')).toBeVisible();
 await page.locator('#exitBtn').click();await expect(page.locator('#home')).toBeVisible();
});