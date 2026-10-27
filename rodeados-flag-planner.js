/* RODEADOS 360 V19 — map is actually placed in the XR scene.
 * This helper only stores the desired 6/7 count, never invents world positions.
 */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 let count=7;try{const stored=Number(localStorage.getItem('mc-ctf-spawns-v19'));if(stored===6||stored===7)count=stored}catch(_){}
 const show=()=>{
  const active=$('mode')?.value==='ctf';
  if($('flagPlanner'))$('flagPlanner').style.display='none';
  if($('flagIntro'))$('flagIntro').style.display=active?'block':'none';
  if($('lootIntro'))$('lootIntro').style.display=$('mode')?.value==='loot'?'block':'none';
 };
 function init(){
  const select=$('tacticalCount');if(!select)return;
  select.value=String(count);select.onchange=()=>{count=Number(select.value)===6?6:7;
    try{localStorage.setItem('mc-ctf-spawns-v19',String(count))}catch(_){}};
  $('mode')?.addEventListener('change',show);show();
 }
 root.RodeadosFlagPlanner={init,getCount:()=>count,getPlan:()=>null};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof globalThis!=='undefined'?globalThis:this);