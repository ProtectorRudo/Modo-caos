"use strict";
/* Ball Rush Arena 2.5: avoid stuck match at zero HP in XR HUD.
   Works with the current UI without touching the WebXR tracker or physics. */
(function(){
  function init(){
    const result=document.getElementById("result");
    const mine=document.getElementById("hpMe");
    const rival=document.getElementById("hpEnemy");
    const title=document.getElementById("endTitle");
    const info=document.getElementById("endSummary");
    const again=document.getElementById("again");
    const hide=document.getElementById("dismiss");
    const hud=document.getElementById("hud");
    if(!result||!mine||!rival||!title||!info||!again||!hide||!hud)return;
    let displayed=false,holdUntil=0;
    const num=x=>x.textContent.replace(/[^♥]/g,"").length;
    again.addEventListener("click",()=>{result.style.display="none";holdUntil=performance.now()+1500;displayed=false;});
    hide.addEventListener("click",()=>{displayed=true;});
    function check(){
      if(hud.style.display!=="flex")return;
      if(performance.now()<holdUntil)return;
      const mineHP=num(mine),oppHP=num(rival);
      if(mineHP>0&&oppHP>0){displayed=false;return;}
      if(displayed)return;
      displayed=true;
      title.textContent=mineHP===0?"¡FIN DE PARTIDA!":oppHP===0?"¡GANASTE!":"FIN DE PARTIDA";
      info.textContent="Vidas restantes: "+mineHP+" / "+oppHP+". Podés volver a jugar.";
      result.style.display="flex";
    }
    setInterval(check,350);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();