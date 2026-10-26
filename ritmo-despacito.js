'use strict';
/* Despacito (Remix) · supplied user master (Luis Fonsi, Daddy Yankee, Justin Bieber).
 * Master derived from the user's uploaded recording, 00:55–02:15 (80s).
 * Audio distributed by the project's pinned GitHub/Vercel base64 Ogg route.
 * Rights claim is user-attested and must not be confused with independently verified contracts.
 */
(function(root){
 const song=Object.freeze({
  id:'despacito_remix_justin',
  title:'Despacito (Remix) · Fonsi, Daddy Yankee & Justin Bieber',
  bpm:89.10290948, duration:80,
  audioUrl:'/media/ritmo/despacito-remix-80s.ogg.b64',
  noteTimes:Object.freeze([4.36,5.68,6.99,8.527,9.874,11.22,12.567,13.914,15.261,16.56,17.954,19.17,20.648,21.995,23.25,24.468,25.815,26.59,27.32,27.939,28.59,29.182,30.075,30.63,31.34,31.97,32.485,33.31,33.99,34.67,35.42,35.935,36.52,37.239,38.006,38.71,39.43,40.07,40.72,41.407,41.93,42.77,43.285,44.09,44.81,45.47,46.17,46.81,47.325,48.16,48.84,49.46,50,50.86,51.51,52.19,52.774,53.55,54.23,54.9,55.49,56.25,56.837,57.6,58.115,58.77,59.507,60.158,60.854,61.528,62.18,62.851,63.67,64.34,65.03,66.264,67.611,68.88,70.25,71.605,73.1,74.44,75.8,77.038])
 });
 const rights={
  source:'uploader_attestation',
  affirmsMasterAndComposition:true,
  approvedForInteractiveGame:true,
  approvedForWebDistribution:true,
  claimDate:'2026-10-25',
  label:'Permisos declarados por quien proporcionó el MP3 (no verificados independientemente)'
 };
 const registered=root.RitmoLicensed.register({...song,cueSeconds:song.noteTimes,rights});
 root.RitmoDespacito={info:()=>song,registered:()=>!!registered};
})(window);
