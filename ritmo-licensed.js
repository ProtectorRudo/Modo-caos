'use strict';
/* INTEGRACIÓN DE MASTERS COMERCIALES LICENCIADOS
 * No se incluye ni se activa ningún hit comercial sin permisos expresos.
 * Para habilitar, el responsable legal debe aportar archivo distribuible,
 * permisos sobre master y composición/sincronización, alcance web/juego/AR.
 * La comprobación de los metadatos NO reemplaza la validación legal.
 * Definir entradas reales (con derechos verificados) mediante register({...}).
 */
(function(root){
 const S=root.RitmoCore?.SONGS;
 if(!S)throw Error('RitmoCore missing');
 const approved=[];
 function register(entry){
  if(!entry||typeof entry!=='object')throw Error('Ficha musical inválida');
  const {id,title,bpm,audioUrl,cueSeconds,duration,rights}=entry;
  if(!/^[a-z0-9_-]{2,42}$/.test(id||'')||S[id])throw Error('Identificador musical inválido o duplicado');
  if(typeof title!=='string'||title.length<3||title.length>120)throw Error('Título faltante');
  if(!Number.isFinite(bpm)||bpm<55||bpm>210||!Number.isFinite(duration)||duration<40||duration>95)throw Error('BPM o duración fuera de rango');
  // Sólo archivos alojados por el operador del juego, misma fuente; jamás YouTube/Spotify.
  if(typeof audioUrl!=='string'||!/^\/media\/ritmo\/[a-z0-9_-]+\.(?:mp3|ogg|m4a|wav)(?:\.b64)?$/i.test(audioUrl))throw Error('Audio debe alojarse en ruta propia /media/ritmo');
  // Explicit uploader attestation is recorded as a claim, not falsely represented as
  // a label-issued license number. Production operator remains responsible for legal review.
  const uploaderAttested=rights?.source==='uploader_attestation'
   &&rights?.affirmsMasterAndComposition===true
   &&rights?.approvedForInteractiveGame===true
   &&rights?.approvedForWebDistribution===true
   &&rights?.claimDate==='2026-10-25';
  if(!uploaderAttested){
   if(!rights||!rights.masterLicenseId||!rights.compositionSyncLicenseId||!rights.approvedForInteractiveGame||
      !rights.approvedForWebDistribution||!rights.validUntil||!rights.territories?.length)
    throw Error('Licencia de master y sincronización incompleta');
   const validUntil=Date.parse(rights.validUntil);
   if(!Number.isFinite(validUntil)||validUntil<Date.now())throw Error('Licencia musical vencida');
  }
  if(!Array.isArray(cueSeconds)||cueSeconds.length<24||cueSeconds.length>400)throw Error('La canción requiere notas marcadas contra la grabación aprobada');
  const cues=cueSeconds.slice();
  for(let i=0;i<cues.length;i++)if(!Number.isFinite(cues[i])||cues[i]<1.2||cues[i]>=duration-.3||
    (i&&cues[i]-cues[i-1]<.16))throw Error('Marcas de tiempo inválidas/solapadas');
  const song=Object.freeze({
   title,genre:'Éxito original · audio autorizado',bpm,bars:Math.ceil(duration*bpm/240),
   beat:100+approved.length,lead:[0,2,4,7],bass:48,scale:[0,2,4,7],
   licensedRecording:true,audioUrl,clipDuration:duration,noteTimes:Object.freeze(cues)
  });
  S[id]=song;approved.push({id,title,duration,rightsHolder:entry.rights.label||(uploaderAttested?'Permisos declarados por el usuario (no verificados)':'Licencia documentada por el operador')});
  return song;
 }
 root.RitmoLicensed={register,available:()=>approved.slice()};
 // No masters preautorizados. El menú únicamente muestra música incluida y con derechos.
})(window);
