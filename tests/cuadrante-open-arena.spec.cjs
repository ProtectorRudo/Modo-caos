const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844}});
test('open AR stadium retains clear camera sight-lines and original gameplay colliders',async({page})=>{
 test.setTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 const data=await page.evaluate(async()=>{
  const T=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');
  const stage=window.CuadranteArt(T).makeStage();
  const names=[];
  stage.root.traverse(o=>names.push(o.name));
  const floor=stage.root.getObjectByName('cuadrante-ghost-floor');
  const goal=stage.root.getObjectByName('cuadrante-rival-portal');
  const court=stage.root.getObjectByName('cuadrante-open-arena');
  const tiles=names.filter(n=>n==='cuadrante-holographic-floor-tiles');
  const pbr=stage.surfaceMaterials;
  const state=window.CuadranteCore.create();
  window.CuadranteCore.start(state);
  stage.setAimMode(true);
  stage.update(state,.016);
  const hidden=stage.you.visible===false;
  const rival=stage.enemy.visible===true;
  const collider=window.CuadranteCore.bounds;
  const res={open:!!court,portal:!!goal,floor:!!floor,tiles:tiles.length,
   translucent:pbr.matTile.transparent&&pbr.altTile.transparent,
   alpha:pbr.matTile.opacity,playerHidden:hidden,rivalVisible:rival,
   colliderDepth:collider.FRONT-collider.BACK,
   noOpaqueCeiling:!names.includes('cuadrante-opaque-ceiling'),
   noOpaqueBackWall:!names.includes('cuadrante-opaque-rear-wall'),
   modelCount:stage.root.children.length};
  stage.dispose();
  return res;
 });
 expect(data).toMatchObject({open:true,portal:true,floor:true,tiles:2,
  translucent:true,playerHidden:true,rivalVisible:true,noOpaqueCeiling:true,
  noOpaqueBackWall:true,colliderDepth:6});
 expect(data.alpha).toBeLessThan(.73);
 expect(data.modelCount).toBeGreaterThan(16);
 expect(errors).toEqual([]);
});
test('portrait layout keeps score HUD between MENU and PAUSE, with gameplay still running',async({page})=>{
 test.setTimeout(75000);
 await page.goto('http://127.0.0.1:8765/cuadrante.html',{waitUntil:'domcontentloaded'});
 await page.locator('#startDemo').click();
 await expect(page.locator('#stage canvas')).toBeVisible({timeout:35000});
 const pos=await page.evaluate(()=>{
  const rect=id=>{const a=document.getElementById(id).getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom,height:a.height}};
  return {exit:rect('exitBtn'),hud:rect('hud'),pause:rect('pauseBtn')};
 });
 expect(pos.hud.left).toBeGreaterThanOrEqual(pos.exit.right-2);
 expect(pos.hud.right).toBeLessThanOrEqual(pos.pause.left+2);
 expect(pos.hud.height).toBeLessThan(46);
 await expect(page.locator('#hud')).toBeVisible();
 await page.locator('#pauseBtn').click();await expect(page.locator('#modalTitle')).toHaveText('PAUSA');
 await page.getByRole('button',{name:'CONTINUAR'}).click();
 await page.locator('#exitBtn').click();await expect(page.locator('#home')).toBeVisible();
});
