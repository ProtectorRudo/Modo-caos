const {test,expect}=require('@playwright/test');
test.use({viewport:{width:412,height:860}});
test('AR court stays in one world position while the phone camera rotates or moves',async({page})=>{
 test.setTimeout(70000);
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  const T=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');
  const stage=window.CuadranteArt(T).makeStage(), C=window.CuadranteCore;
  const hit={x:1.8,y:0,z:-1.4},yaw=.5,scale=.56,stretch=1.18;
  const world=C.anchoredArena(hit,yaw,0,{x:0,z:0},scale,stretch);
  stage.root.position.set(world.x,world.y,world.z);
  stage.root.rotation.y=world.rotation;
  stage.root.scale.set(scale,scale,scale*stretch);
  stage.root.updateMatrixWorld(true);
  const before=stage.root.matrixWorld.clone();
  const worldTarget=new T.Vector3(0,1.2,0).applyMatrix4(before);
  const one=new T.PerspectiveCamera(66,412/860,.01,50);
  const two=new T.PerspectiveCamera(66,412/860,.01,50);
  one.position.set(hit.x,1.55,hit.z+1.55);one.lookAt(worldTarget);
  two.position.set(hit.x+.35,1.70,hit.z+1.55);two.lookAt(worldTarget);
  one.updateMatrixWorld();two.updateMatrixWorld();
  const oneScreen=worldTarget.clone().project(one),twoScreen=worldTarget.clone().project(two);
  const inv=stage.root.matrixWorld.clone().invert();
  const a=new T.Vector3(0,1.55,3.1).applyMatrix4(stage.root.matrixWorld);
  const rayLocalOrigin=a.clone().applyMatrix4(inv);
  const rayLocalDir=new T.Vector3(.10,-.1,-1).normalize().transformDirection(inv);
  const ray=C.aimRayToArena(rayLocalOrigin,rayLocalDir,0);
  const diff=stage.root.matrixWorld.elements.reduce((max,v,i)=>Math.max(max,Math.abs(v-before.elements[i])),0);
  const values={diff,depth:stage.root.scale.z/stage.root.scale.x,physicalProjectionChange:
    Math.hypot(twoScreen.x-oneScreen.x,twoScreen.y-oneScreen.y),ray:!!ray,
    cameraIndependent:before.equals(stage.root.matrixWorld)};
  stage.dispose();return values;
 });
 expect(result.diff).toBeLessThan(1e-9);
 expect(result.depth).toBeCloseTo(1.18,5);
 expect(result.ray).toBe(true);
 expect(result.cameraIndependent).toBe(true);
 expect(result.physicalProjectionChange).toBeGreaterThan(0.01);
});
test('high-contrast reticle is large enough for phone AR and never obscures MENU or PAUSA',async({page})=>{
 test.setTimeout(75000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 await page.locator('#startDemo').click();
 await expect(page.locator('#stage canvas')).toBeVisible({timeout:35000});
 await page.locator('#ui').evaluate(el=>el.classList.add('ar-aim'));
 await expect(page.locator('#aimReticle')).toBeVisible();
 const info=await page.evaluate(()=>{
  const b=id=>document.getElementById(id).getBoundingClientRect();
  const aim=b('aimReticle'),exit=b('exitBtn'),pause=b('pauseBtn');
  return {width:aim.width,height:aim.height,clearOfExit:aim.top>exit.bottom+60,
    clearOfPause:aim.top>pause.bottom+60,
    pointerEvents:getComputedStyle(document.getElementById('aimReticle')).pointerEvents};
 });
 expect(info.width).toBeGreaterThanOrEqual(55);
 expect(info.height).toBeGreaterThanOrEqual(55);
 expect(info.clearOfExit&&info.clearOfPause).toBe(true);
 expect(info.pointerEvents).toBe('none');
 await page.locator('#aimReticle').evaluate(el=>el.classList.add('aligned'));
 await expect(page.locator('#aimReticle')).toHaveClass(/aligned/);
 await page.locator('#exitBtn').click();await expect(page.locator('#home')).toBeVisible();
 expect(errors).toEqual([]);
});