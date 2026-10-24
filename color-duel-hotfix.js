'use strict';
(function(){
  // An online rematch will be introduced once two-phone scoring is verified.
  // Avoid the broken old "restart" action: it had no guest-side handler.
  const btn=document.getElementById('duelAgain');
  if(btn){
    btn.textContent='NUEVA SALA';
    btn.addEventListener('click',function(e){
      e.preventDefault();e.stopImmediatePropagation();
      location.href='/color-duel.html';
    },true);
  }
  const code=document.getElementById('roomCode');
  // Keep a recoverable invite even if share permissions are unavailable.
  if(code)code.title='Compartí este código o el enlace de invitación';
})();