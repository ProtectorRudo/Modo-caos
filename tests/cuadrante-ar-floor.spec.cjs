const {test,expect}=require('@playwright/test');
test.use({viewport:{width:420,height:850}});
test('AR hit-test unavailable: never fake a floor with camera-only video',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__cameraCalls=0;
  Object.defineProperty(navigator,'xr',{configurable:true,value:{
   requestSession:()=>Promise.reject(new DOMException('WebXR Hit Test no disponible','NotSupportedError'))
  }});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:()=>{window.__cameraCalls++;return Promise.reject(new Error('Camera use forbidden in this test'))}
  }});
 });
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#startAr')).toBeEnabled();
 await page.locator('#startAr').click();
 await expect(page.locator('#modalTitle')).toHaveText('NO SE PUDO DETECTAR EL PISO',{timeout:20000});
 await expect(page.locator('#stage canvas')).toBeVisible();
 expect(await page.evaluate(()=>window.__cameraCalls)).toBe(0);
 await expect(page.locator('#cameraFeed')).toBeHidden();
 await expect(page.locator('#fixArena')).toBeHidden();
 await page.getByRole('button',{name:'JUGAR EN MODO 3D'}).click();
 await expect(page.locator('#overlay')).toBeHidden();
 await expect(page.locator('#hud')).toBeVisible();
 await page.locator('#exitBtn').click();
 await expect(page.locator('#home')).toBeVisible();
 expect(errors).toEqual([]);
});
test('AR floor preview controls are clearly locked before tracking',async({page})=>{
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#fixArena')).toBeDisabled();
 await expect(page.locator('#placeTitle')).toContainText('DETECTÁ EL PISO');
 const result=await page.evaluate(()=>({
  script:document.querySelector('script[src$="cuadrante-runtime.js"]')!==null,
  core:typeof window.CuadranteCore.horizontalHit==='function'
 }));
 expect(result.script&&result.core).toBe(true);
});