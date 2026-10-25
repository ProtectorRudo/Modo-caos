'use strict';
/* Regression: pista visible → FIJAR PISTA pulsable → calibrar → EMPEZAR.
 * node tests/ritmo-lock.test.cjs
 * No sustituye una prueba física en Android con WebXR.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('ritmo.html','utf8');
const engine=fs.readFileSync('engine.js','utf8');
const runtime=fs.readFileSync('ritmo-runtime.js','utf8');
const css=html.match(/#lock\s*\{([^}]+)\}/);
assert(css,'El botón FIJAR PISTA debe tener estilos');
assert(/display:\s*block\s*;/.test(css[1]),'La CSS no puede ocultar permanentemente FIJAR PISTA');
assert(/pointer-events:\s*auto\s*;/.test(css[1]),'FIJAR PISTA debe recibir toques');
assert(/z-index:\s*1[1-9]\s*;/.test(css[1]),'FIJAR PISTA debe estar encima de la pista');
assert(/id="lock"\s+disabled/.test(html),'El botón debe existir e iniciar bloqueado');
const fn=engine.match(/function setStage\(s\)\{[^\n]+\}/);
assert(fn,'Motor no ofrece el cambio de estado de colocación');
const ids=['lock','play','edit','toolbar','touchpad','calibrate'];
const elements=Object.fromEntries(ids.map(k=>[k,{style:{display:'not-set'}}]));
const context={stage:'intro',$:k=>elements[k]};
vm.runInNewContext(fn[0]+'; this.setStage=setStage;',context);
context.setStage('search');
assert.notEqual(elements.lock.style.display,'none','El botón debe existir al buscar el suelo, aunque esté deshabilitado');
context.setStage('preview');
assert.notEqual(elements.lock.style.display,'none','El botón debe aparecer al detectar suelo');
context.setStage('fixed');
assert.equal(elements.lock.style.display,'none','FIJAR desaparece tras fijar');
assert.equal(elements.play.style.display,'','El motor permite comenzar tras fijar');
assert.match(runtime,/stage==='fixed'&&\!locked\)fixed\(\)/,'Runtime debe entrar en calibración al fijar');
assert.match(runtime,/E\('rtStart'\)\.disabled=false/,'Debe habilitar EMPEZAR al calibrar');
assert.match(runtime,/E\('rtStart'\)\.onclick/,'Debe haber acción real para empezar');
const laneTags=html.match(/data-lane="[0-9]"/g)||[];
assert.equal(laneTags.length,4,'El HTML debe mostrar exactamente cuatro carriles calibrables');
assert(!/data-lane="4"/.test(html),'No debe haber quinto carril');
assert(/repeat\(4,1fr\)/.test(html),'La portada debe mostrar cuatro carriles');
assert(!html.includes('id="localFile"'),'No se debe pedir cargar canciones al jugar');
assert(engine.includes('modoCaosCustomArena'),'Motor debe ocultar la vieja cuadrícula de cinco celdas');
assert(runtime.includes('window.modoCaosCustomArena=true'),'Ritmo activa la arena propia');
assert(runtime.includes('function chooseLane()'),'Debe existir selección obligatoria de carril');
console.log('OK: botón FIJAR, cuatro carriles calibrables, sin carga de archivos y arena personalizada AR');
