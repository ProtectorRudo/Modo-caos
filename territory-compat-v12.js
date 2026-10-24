'use strict';
/* Territory X AR compatibility v1.2.
 * Legacy renderer exports clear(); the game controller calls reset().
 * Bridge those two methods before the controller starts.
 */
(function(){
 const previous=window.TerritoryArt;
 if(typeof previous!=='function'){
   console.error('[Territorio X v1.2] Motor visual no disponible');
   return;
 }
 window.TerritoryArt=function(){
   const renderer=previous.apply(this,arguments);
   if(typeof renderer?.reset!=='function'){
     if(typeof renderer?.clear==='function')renderer.reset=function(){return renderer.clear();};
     else renderer.reset=function(){console.warn('[Territorio X] Se reinició la escena sin efectos');};
   }
   return renderer;
 };
 window.__TX_COMPAT_VERSION='1.2';
})();