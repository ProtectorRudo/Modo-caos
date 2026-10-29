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
  noteTimes:Object.freeze([4.319,5.619,6.989,8.452,9.799,11.146,12.492,13.839,15.186,16.533,17.879,19.156,20.573,21.92,23.22,24.543,25.89,26.54,27.26,27.864,28.584,29.257,30,30.627,31.347,31.927,32.554,33.297,33.994,34.644,35.364,35.991,36.595,37.314,38.081,38.684,39.381,40.008,40.751,41.332,42.005,42.771,43.328,44.071,44.768,45.418,46.115,46.788,47.369,48.112,48.832,49.435,50.062,50.852,51.502,52.175,52.849,53.545,54.219,54.869,55.565,56.239,56.912,57.585,58.189,58.816,59.582,60.233,60.929,61.603,62.253,62.926,63.646,64.273,65.016,66.339,67.686,68.917,70.264,71.68,73.073,74.443,75.79,77.113])
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
