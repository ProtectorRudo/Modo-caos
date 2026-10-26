'use strict';
/* One short Android vibration PER successfully scored note.
 * No press-based interaction, repeated vibrations for a sustain head,
 * misses, or extra combo tremors. Browser support is optional.
 */
(function(root){
 function create(device){
  const seen=new Set();let enabled=true;
  function scored(noteId){
   if(!enabled||!Number.isInteger(noteId)||noteId<0||seen.has(noteId))return false;
   seen.add(noteId);
   if(seen.size>800)seen.clear();
   try{
    if(typeof device?.vibrate==='function')return device.vibrate(18)!==false;
   }catch(_){}
   return false;
  }
  return {scored,reset:()=>seen.clear(),enabled:()=>enabled,setEnabled:v=>{enabled=!!v}};
 }
 root.RitmoHaptics={create,durationMs:18};
})(window);
