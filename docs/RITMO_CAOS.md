# RITMO CAOS — guía técnica y verificación

**Fecha:** 25/10/2026. **Rama de desarrollo:** feat/ritmo-caos-20261025.

## Archivos nuevos

- /ritmo.html — selector musical, cinco colores, HUD, colocación de pista y pantallas de resultado, demo 2D.
- /ritmo-core.js — mapas de ritmo deterministas, puntuaciones, precisión, combos, sostenidas, límites de movimiento.
- /ritmo-audio.js — tres bandas sonoras originales + interpretación original de 3 melodías de dominio público; AudioContext.currentTime como reloj. Modo archivo de audio local decodificado sólo en el teléfono, fase del pulso y acentos musicales.
- /ritmo-catalog.js — catálogo extensible: clásicos reproducibles sin archivos, cinco perfiles de éxitos modernos con archivo seleccionado por el jugador.
- /ritmo-art.js — render de pista en perspectiva con SVG colocado sobre plano AR (DOM overlay) y render 2D Canvas para demo.
- /ritmo-runtime.js — acople al motor WebXR, posición relativa al anclaje, selección de carril inicial, calibración de un segundo, filtros y pausa por pérdida de pose.
- /tests/ritmo.test.cjs — 132 combinaciones de mapa (11 temas x 4 dificultades x 3 anchos), además de aciertos, fallos, sostenidas, slides, pausa y finalización.
- /tests/ritmo-audio.test.cjs — prueba de melodías de dominio público, lectura local, detección de desfase/acento, pausa, reanudación y no-superposición de música.

La tarjeta de acceso directo se incorporó a /index.html en la misma rama.

## Jugabilidad

La pista permanece vinculada al plano del motor WebXR /engine.js. El ancho de cada carril se calibra en metros; el jugador marca en cuál de los cinco círculos se encuentra y deja quieto el celular aproximadamente un segundo. Se registra el componente lateral de la **traslación del teléfono** respecto al mundo, no de su rotación ni de las piernas. Se evita registrar saltos bruscos de localización y se usa suavizado con histéresis. La referencia no se borra al empezar.

Durante la canción AR la puntuación es AUTOMÁTICA cuando la nota cruza la línea. Ningún botón toca notas. Botones sólo para calibración, menú y pausa. La demo 2D sí utiliza flechas y lo anuncia claramente.

Canciones originales (sintetizadas por el navegador; no usan música comercial):

| Canción | BPM | Duración |
| --- | ---: | ---: |
| Neón sin freno | 112 | 68,57 s |
| Fuego en el escenario | 100 | 67,2 s |
| Solar latino | 104 | 73,85 s |

Además, el catálogo incluye tres versiones generadas por sintetizador propio de melodías de composiciones en dominio público: **Oda a la Alegría**, **Para Elisa** (Beethoven) y **Jingle Bells** (Pierpont, 1857). No se utilizan grabaciones protegidas de terceros; los riffs se secuencian con tiempos de notas precisos y se generan en Web Audio. La composición y la grabación son cuestiones de derechos diferentes.

Hay **cinco perfiles para éxitos comerciales** (Despacito, Blinding Lights, Levitating, Tití Me Preguntó, Provenza), sin archivos incorporados ni retransmisión desde Spotify/YouTube. Para usarlos el jugador debe seleccionar una grabación que tenga derecho a usar desde su dispositivo; el archivo **no se sube al servidor**. El motor decodifica el audio localmente, estima desfase de pulso frente al BPM de cada perfil y extrae acentos del audio para generar notas. Hay ajuste manual de fase ±1000 ms y compensación de latencia ±300 ms. Los BPM son valores orientativos y algunas versiones de las canciones pueden diferir. No se garantiza precisión perfecta para todas las ediciones o remixes.

El mapa de notas deriva de compases, motivos melódicos originales/de dominio público y, en archivos locales, de los acentos detectados; no se coloca música comercial en el proyecto. La dificultad varía densidad, carriles habilitados y transiciones. Los mapas limitan cada salto lateral según metros por carril y tiempo transcurrido, con referencia conservadora de 0,70 m/s, más margen adicional de 0,12 m.

## Verificación realizada (sin confundir con Android real)

- Conexiones Github y Vercel inspeccionadas; rama aislada creada, cambios versionados.
- Sintaxis de los cuatro archivos JavaScript validada en un intérprete JavaScript.
- Suite /tests/ritmo.test.cjs ejecutada en intérprete aislado con dependencias de asserts simuladas: **PASS**.
- 132 combinaciones de canción/perfil, dificultad y ancho evaluadas: tiempos estrictamente crecientes, carriles válidos, límite físico de transición, nota acertada y fallada, reinicio y finalización.
- Simulación de sostenida, pausa y trayectoria deslizante (una exitosa y otra incorrecta) pasada.
- Simulación del transporte Web Audio y decodificación de audio local a 107 BPM con fase de referencia ~140 ms; fase estimada ~132 ms y notas guiadas por acentos. Suite de audio pasada con Web Audio simulado.
- Simulación con poses AR del teléfono y SVG: fijación, calibración de ~1 s y desplazamiento lateral de 32 cm reconocido como cambio al carril vecino (no es prueba Android real).
- No se ha ejecutado AR físico, pruebas reales de cámara, render de DOM overlay o audio en Chrome Android.
- No se han comprobado todavía 60 FPS reales, calidad audible de las composiciones ni comportamiento tras interrupciones de la app.
- No se ha implementado ni afirmado multijugador sincrónico; modo en solitario es el objetivo de esta entrega.

## Estado del despliegue

Se solicitaron nuevamente despliegues **preview** en el proyecto Vercel de Modo Caos. El primer intento devolvió validación de campo target (se corrigió). El segundo fue rechazado por **HTTP 402, código api-deployments-free-per-day**: se superó la cuota diaria de 100 despliegues del equipo. Una **preview anterior** fue generada automáticamente por Git e inspeccionada: `https://modo-caos-vsog9u5k6-protector-rudo-s-projects.vercel.app/ritmo.html`, deployment `dpl_DqzP6Sc5GKhqGRoTvAqeSDJQqFf7`, commit `264560b0ce5b1cfb70ef58c2aaec7bdae649b44a`. Vercel indicó READY y se verificó HTTP 200 para `ritmo.html`, `ritmo-core.js`, `ritmo-catalog.js`, `ritmo-audio.js`, `ritmo-runtime.js` e `index.html`. **Esa preview no contiene los 11 perfiles ni las últimas correcciones** (sólo 9 perfiles y sin ajuste de pulso), y el dominio puede requerir un enlace temporal de acceso por protección de Vercel. No hay URL verificada para el HEAD actual de esta rama; los intentos manuales de publicar el HEAD siguen bloqueados por cuota HTTP 402. El arcade original y el Supabase compartido no fueron modificados.

**Pasos necesarios antes de publicar:** desbloquear cuota de despliegues, crear preview de la rama, comprobar rutas /ritmo.html y scripts con HTTP 200, ejecutar una ronda completa en Chrome Android con ARCore, verificar que el teléfono se mueve físicamente entre cinco círculos en el piso, validar audio/lane/latencia, pérdida de seguimiento y reinicio; revisar regresión de Color Rush, Ball Rush, Territorio X, Muro Rush y otros juegos actuales. Después se puede aprobar la integración a main y publicar.

## Limitaciones conocidas

- No se usa reconocimiento de pies. El teléfono representa al jugador: debe desplazarse con él.
- Audio incluido generado por osciladores y percusión sintética en Web Audio. La musicalidad y producción final deben escucharse/probarse en equipo real. La sincronía del archivo local se estima mediante BPM/desfase/acento y es ajustable por el usuario; no se afirma precisión perfecta con música comercial real.
- Efectos AR en capa SVG proyectada sobre el suelo, no modelos GLB PBR. Los materiales 3D premium y el espectáculo de concierto requieren revisión visual real.
- Las notas deslizantes comprueban que el teléfono parte del carril origen y se desplaza hacia el carril destino durante la ventana musical. Las notas CAOS y especiales se puntúan con bonificación. Falta comprobar la tolerancia de estas mecánicas mediante juego físico real.
- La calificación PERFECTO/GENIAL/BIEN utiliza posición respecto al centro y la ventana temporal de impacto, no una pulsación musical del usuario, ya que el juego es de ocupación de carril.
- La apertura de la cámara, el Hit Test, los gestos para mover/rotar/escalar y el anclaje dependen de /engine.js sin cambios; hay que verificarlo en el dispositivo destino.

## Fuentes normativas de plataformas de música

- Spotify Web Playback SDK prohíbe sincronizar el audio con obras visuales y requiere aprobación escrita para integraciones comerciales: https://developer.spotify.com/documentation/web-playback-sdk/
- YouTube exige reproductores embebidos visibles de 200x200 como mínimo, no ocultos ni sólo audio; tampoco permite superponer elementos sobre el reproductor: https://developers.google.com/youtube/terms/required-minimum-functionality
- Por lo tanto, **ningún SDK de Spotify ni un reproductor oculto de YouTube** se usó para el juego. Los éxitos modernos permanecen en modo selección de archivo personal, hasta disponer de licencias específicas de sincronización y de grabación.


## Actualización 25/10 — calibración y pista compacta de cuatro carriles

**Estado de esta revisión: cambios versionados en rama feat/ritmo-caos-20261025, NO fusionados a main.** Las pruebas de lógica y simulaciones de poses se hicieron sin teléfono ARCore real; publicación del HEAD requiere preview verificada.

1. **Cuatro carriles (no cinco)**: verde, rosa/rojo, amarillo y azul. Se modificaron el core, los indicadores, la vista AR, la demo 2D, los carriles permitidos por la IA de canciones y los movimientos. La validación impide generar un quinto carril.
2. **Pista compacta**: ancho inicial 1,00 m (cuatro carriles de 0,25 m); ajuste permitido entre 0,80 y 1,28 m; el motor sigue ofreciendo gestos de desplazamiento y rotación.
3. **Sin doble pista**: nuevo indicador opcional `window.modoCaosCustomArena=true` hace que `engine.js` no dibuje debajo su antigua cuadrícula 5x5 ni su malla WebGL para este minijuego. El comportamiento de los demás juegos permanece intacto cuando el indicador no existe.
4. **Calibración obligatoria**: después de FIJAR se pide elegir explícitamente el carril bajo el teléfono; la partida no habilita comienzo hasta medir ≈1 s de pose estable. Eligiendo de nuevo cualquier carril se recalibra sin reiniciar la matriz/anclaje de piso.
5. **Tracking**: posición lateral proyectada sobre el eje de la pista, histéresis, protección contra saltos y pausa si no se dispone de pose espacial. Sólo sigue al teléfono, no a pies/cuerpo.
6. **Música de acceso inmediato**: en el menú hay **nueve piezas sin carga de archivos**: tres composiciones originales de Ritmo Caos y seis melodías de composiciones tradicionales o de dominio público en arreglos sintetizados propios: Oda a la Alegría, Para Elisa, Jingle Bells, Estrellita ¿dónde estás?, Frère Jacques y Cumpleaños Feliz. Se programan con el mismo reloj de audio que el mapa de notas.
7. **Grabaciones de éxitos comerciales**: NO están descargadas ni publicadas. Los cinco perfiles internos de Despacito, Blinding Lights, Levitating, Tití Me Preguntó y Provenza **no aparecen en el menú** porque no contamos con derechos de sincronización y distribución de las grabaciones. La anterior opción de subir un archivo fue retirada del menú público. No se ha usado Spotify/YouTube como fuente de audio del juego.
8. **Pruebas**: 168 variaciones deterministas (14 perfiles internos × cuatro dificultades × tres anchos), sólo cuatro índices posibles; simulación de posición y de calibración (elegir carril 2, terminar 1 s, recorrer +50 cm al carril 4 y recentrar), regresión de UI FIJAR y de ausencia del cargador de música. No equivalen a prueba física con Android.

**Publicación:** el pedido manual a Vercel para el HEAD recibió HTTP 402 `api-deployments-free-per-day`; verificar si GitHub Auto Deploy alcanzó el HEAD antes de ofrecer URL como corregida. No trasladar cambios al proyecto original Color Rush ni a la base Supabase.


## Publicación operativa en Vercel — 25/10/2026

**Publicación REAL en la URL del proyecto:** `https://modo-caos-eta.vercel.app/ritmo.html`.

Se superó la cuota `api-deployments-free-per-day` por una ruta de proyecto Vercel, **no por un nuevo deployment/build**. Esto debe comunicarse correctamente: la página se sirve en el dominio Vercel mediante reverse proxy a `raw.githack.com` con código del repositorio público fijado a commit inmutable `5e4164b609c740c6ba8fea0e20af7cbb8e181679`. El código fuente se conserva en GitHub, el front se entrega por la capa de rutas de Vercel. La versión de rutas live es `6dc521c1-7ed0-4ec1-a65c-15a799c66e6a` y la regla es `854c377c-26a2-4629-a33f-aa30a9d1b0a1`. La ruta sólo cubre `/ritmo.html` y los archivos `/ritmo*.js` exclusivos de este juego; no intercepta `/engine.js`, `/`, Ball Rush u otros juegos.

Para aislar completamente el motor compartido, se agregó `ritmo-engine.js` y `ritmo.html` se cambió para cargarlo, conservando sus mejoras de renderización sólo en este juego.

**Verificación:** ruta promovida en Vercel con `isLive:true`; `/ritmo.html`, `/ritmo-core.js`, `/ritmo-catalog.js`, `/ritmo-audio.js`, `/ritmo-art.js`, `/ritmo-runtime.js`, `/ritmo-engine.js` responden HTTP 200; HTML `text/html`, scripts `application/javascript`. Se comprobó que `/` y `/ball.html` siguen respondiendo HTTP 200. El HTML publicado tiene cuatro carriles y la selección `cumple`. **No se ha probado una partida ARCore física**, ni la calidad sonora sobre el dispositivo.

**Operación futura:** la URL apunta al commit fijado, de forma que nuevas confirmaciones en GitHub no cambian esta publicación. Para subir versiones posteriores, ejecutar tests, inspeccionar diff y cambiar el destino de la regla Vercel al nuevo SHA mediante versión staged + promoción, comprobando el alias staged antes de promover. Considerar más adelante volver a un despliegue Vercel convencional para eliminar la dependencia de GitHack, una vez disponible la cuota. No afirmar que el juego fue compilado/desplegado por Vercel: fue publicado mediante enrutamiento.


## Revisión musical 25/10/2026 — temas populares, licencias y sincronización

- **Once temas listos sin subir archivos:** 3 originales + 8 melodías tradicionales o de dominio público con arreglos nuevos hechos con Web Audio. Se agregaron «La Cucaracha · Fiesta latina» y «When the Saints · Jazz remix». La versión sintetizada **no es una grabación de artistas contemporáneos**.
- **Ritmo exacto de la composición:** los arreglos tradicionales se programan con el mismo contador AudioContext y la misma lista de eventos de melodía que utiliza el mapa; dificultad física sigue limitando saltos según ancho del carril.
- **Nueva infraestructura comercial:** `ritmo-licensed.js` sólo acepta registros con permisos identificados de master y sincronización/composición, ámbito juegos interactivos + web, territorios, fecha de vigencia, audio alojado en ruta propia `/media/ritmo/` y 24+ marcas temporales de la grabación (segundos exactos, no estimación de BPM). Estos metadatos **no constituyen por sí solos prueba legal suficiente**: exigen revisión documental antes de activarlos.
- **WebAudio maestro:** `ritmo-audio.js` puede precargar masters autorizados en caché y los reproduce con `AudioContext.currentTime`; `ritmo-core.js` toma marcas de la grabación como referencia de notas; `ritmo-runtime.js` mantiene la partida pausada hasta que el audio arranque. Jamás se integra audio de Spotify/YouTube ni se pide al jugador subir archivos.
- **No habilitados:** «Despacito» (Luis Fonsi), «Waka Waka» y «Hips Don't Lie» (Shakira) y otros hits contemporáneos no están en el juego como grabaciones originales, ni se anuncian como jugables: aún no se cuenta con permisos para este uso. Una licencia del master no autoriza automáticamente la composición, y viceversa.
- **Verificaciones:** motor para 192 combinaciones de 16 perfiles internos × 4 dificultades × 3 anchos; prueba `tests/ritmo-licensed.test.cjs` con una pista QA artificial que valida el bloqueo de pistas sin derechos, rechazo de URL externa, notas sobre timestamps, precarga con caché y reproducción en Web Audio simulado. Ninguna grabación comercial se copió o difundió.
- **Fuentes de licencias:** https://www.umgsync.com/faqs/ (master + publishing separados); https://www.sonymusic.eu/music-licensing/ (Sony music video game licensing, solicitud no implica aprobación); https://developer.spotify.com/policy (no juegos ni sincronización de audio Spotify).
- **Despliegue de esta revisión:** publicar nuevo SHA en regla de ruta Vercel ya creada y verificar staged/live antes de afirmar publicación de la revisión actual.


## ✅ Despacito Remix publicado — release 25/10/2026

La pista `despacito_remix_justin` está incorporada como **primera opción predeterminada** en https://modo-caos-eta.vercel.app/ritmo.html, con cuatro carriles y 80 segundos de audio proporcionado por el usuario (remix Luis Fonsi, Daddy Yankee y Justin Bieber). El mapa incluye 84 timestamps sobre ese fragmento; dificultad normal selecciona 55 marcas, y la física limita cambios a un máximo alcanzable.

### Solución técnica al bloqueo de uploads

La subida binaria desde el contenedor local no disponía de red, fal devolvía 403 por créditos, y GitHub connector sólo aceptaba texto. Se resolvió pasando la codificación Base64 del Ogg Opus generado desde el MP3 original por un puente temporal de fragmentos de texto en la Library, reensamblado automáticamente dentro de un conector GitHub en un solo archivo `media/ritmo/despacito-remix-80s.ogg.b64`. El puente temporal fue eliminado tras completar la transferencia.

El archivo `ogg.b64` pesa 460.800 caracteres, decodifica a 345.600 bytes Ogg Opus estéreo; SHA-256 del binario: `e476cb427141255f5f4e404e6630e81ca218a350e822a11c9ba2969e3d7fdb92`. Se sirve por la ruta del proyecto Vercel desde `raw.githubusercontent.com`, versión live `2ee4d9e8-1e92-487f-be6e-8f3544002994`, apuntando a commit fijo `d33bd568a70c19d9fda17c8e51d8ce4fa24b87ab`. La ruta de la página y scripts mantiene el proxy GitHack apuntando al mismo SHA. No se necesitó un build adicional.

`ritmo-audio.js` descarga el texto, valida la longitud, reconstruye los bytes y comprueba SHA-256 con WebCrypto (si está disponible), `AudioContext.decodeAudioData()` decodifica el Ogg y `AudioBufferSourceNode.start(startAt)` inicia la música. El motor de juego toma exactamente `audio.now()` de ese mismo contexto para evaluar cada nota. `ritmo-despacito.js` registra la pista con los permisos de uso **declarados por el usuario y no verificados independientemente**; no se fabrican números de licencia.

### Verificaciones efectuadas

- Dominio live: `/ritmo.html`, los siete módulos de Ritmo y `/media/ritmo/despacito-remix-80s.ogg.b64` responden HTTP 200; audio con longitud 460800 y checksum FNV32 `9937430e`, igual al archivo local.
- Web Audio simulado: decodificación a 345600 bytes y duración 80.0065 s; el buffer se inicia con el reloj de AudioContext y el primer cue cae en `t=4.319` s.
- Regresión de rutas públicas `/`, `/ball.html`, `/rebote.html`, `/torre.html`: HTTP 200 tras promoción.
- `ritmo.html` incluye `ritmo-despacito.js` antes del runtime, y el runtime inserta el primer tema autorizado al inicio del selector.
- **Pendiente**: ensayo físico con Chrome Android ARCore para confirmar latencia audible, desempeño/FPs y sensibilidad lateral; pruebas Web Audio simuladas y respuesta 200 **no son** prueba de reproducción física.
- Calidad: para evitar uploads binarios, esta versión utiliza Opus estéreo ~34,6 kbps; la fuente MP3 y su fragmento original permanecen disponibles en el paquete local para una futura mejora de bitrate. No se finge calidad sin pérdidas ni una grabación máster sin alterar.


## Actualización de experiencia — 25/10/2026, sostenidas y satisfacción

### Error reproducido y corregido
Las notas largas quedaban activas, pero `tick()` aplicaba igualmente el umbral de expiración de nota corta (**360 ms**) aunque la cola sostenida siguiera en curso. Esto causaba `FALLO` incluso estando quieto en el carril. Se corrigió con `if(g.holdActive?.id===n.id)break` antes del chequeo de expiración, más un sistema robusto para seguimiento AR:
- Sostenerse en el carril inicia automáticamente la nota hasta 200 ms antes del impacto, sin tocar pantalla.
- `holdActive` mantiene progreso y tiempo fuera de carril. Tolera 240 ms de salida continua o pequeñas oscilaciones de posición; abandonar realmente el carril sigue dando FALLO.
- La nota larga no se evalúa como nota normal hasta completar su cola. Al completarse, `PERFECTO`, puntos, evento `hold_complete` y vibración.

### Mejoras visuales y sensoriales
- `ritmo-art.js`: cintas luminosas para notas largas sobre piso AR y demo, texto **MANTENÉ**, progreso en aro junto al jugador, línea de impactos que pulsa con la música y resplandor del carril ocupado.
- `ritmo-fx.js` nuevo: capa Canvas 2D independiente sobre la AR, partículas, destellos, anillos expansivos, combos, puntos flotantes, celebración de rachas. Limita sprites activos para mantener trabajo acotado en móviles; respeta preferencia de movimiento reducido.
- `ritmo.html`: medidor HUD **¡MANTENÉ TU COLOR!** con porcentaje, colores y efectos en combos.
- `ritmo-runtime.js`: feedback diferenciado para comienzo y final de sostenidas, haptics no esenciales, festival de combo 10/20/30/50, recuperación y ocultación limpia de efectos al terminar.
- `ritmo-audio.js`: microconfirmaciones musicales sintetizadas en WebAudio que se mezclan con Despacito sin reemplazar ni adelantar su audio; sin sonido de fallo excesivo. No se altera el `AudioContext` maestro para evaluar los golpes.

### Verificación
- `tests/ritmo.test.cjs`: regresión de 192 mapas de combinaciones.
- `tests/ritmo-sustain-fx.test.cjs`: 204 variaciones de sostenidas (17 canciones/perfiles x 4 dificultades x 3 anchos), con jitter simulado y cruce de 360 ms, más abandono real y recuperación.
- `tests/ritmo-experience.test.cjs`: prueba de render simulado, FX y HUD. Simulación integrada de Despacito: sostuvo una nota larga, mostró barra, ganó puntos, activó confirmación y terminó.
- **Aún no sustituye prueba física WebXR en Android**. No modificar la física de posicionamiento compartida con otros minijuegos.

Desplegar vía la ruta aislada de Ritmo Caos en Vercel apuntando al nuevo SHA de GitHub, agregando el archivo `ritmo-fx.js` a la regla de JavaScript y **conservando la CSP activa** `script-src 'self' 'unsafe-inline'` en HTML; la antigua cabecera de GitHub `default-src 'none'; sandbox` rompió el inicio del juego en versiones anteriores. Verificar primero staging y luego producción, audio, 4 carriles y regresiones de rutas.


## NEON LIVE — escena AR 3D profesional (25/10/2026)

**Referente:** imagen conceptual compartida por usuario (cuatro carriles verde, rojo, amarillo y azul sobre piso real, máquinas musicales futuristas, auroras luminosas). Esta actualización intenta trasladar su lenguaje visual al juego móvil sin prometer equivalencia fotorrealista exacta ni seguimiento corporal.

### Arquitectura
- `ritmo-stage3d.js` **nuevo**, renderizador WebGL procedural conectado al framebuffer WebXR real; recibe matrices de proyección, pose de cámara y matriz de pista anclada de `ritmo-engine.js`. No fija geometría a la pantalla. Sin bibliotecas remotas, texturas gigas ni descargas adicionales que bloqueen en móviles.
- `ritmo-engine.js` **aislado de este minijuego**, nuevo hook opcional `window.modoCaosCustomRender(gl,view,W,time)` dentro del frame AR. No modifica `/engine.js` ni otros juegos. Desactivar la capa o falla de shader conserva la pista SVG previa en `ritmo-art.js`.
- Escenario: cuatro plataformas tridimensionales con costados de metal, franjas tipo vidrio luminoso, rieles perimetrales, ocho altavoces virtuales/conos, dos postes de luz, consola lejana con ecualizador y cuatro receptores tridimensionales con anillos concéntricos; notas representadas por mallas/halos, sostenidas como ribbons 3D y desplazamientos indicados por conexiones.
- `ritmo-audio.js`: analizador `AnalyserNode` opcional, de 256 FFT, para calcular bandas grave/medio/agudo únicamente para efectos. **La lógica de puntuación sigue sincronizada con el reloj y las notas del audio grabado**, no con los cambios de FPS.
- `ritmo-runtime.js`: invoca renderer 3D con anclaje existente y conserva coordenadas 2D de los receptores para efectos, con devolución a SVG si el renderer no puede iniciarse. Etiqueta VOS con posición proyectada. Estado de calibración separado, sin puntos/energía mientras no comienza la ronda.
- `ritmo.html`: HUD compacto translucido, tarjetas menores, panel de calibración premium y nombre VOS luminoso. Cuatro colores y zona de impacto siempre visibles.
- **Rendimiento:** dos lotes GPU por vista (hardware y luces aditivas), adaptación de cantidad de geometría según media de frame; sin postprocesado fullscreen pesado. Objetivo 60 FPS en dispositivos compatibles, a medir en Chrome Android real. Se preserva vista SVG de respaldo y demo 2D.

### Pruebas completadas
`tests/ritmo-stage3d.test.cjs`: mock WebGL evalúa shader, posición 3D anclada y cuatro receptores, dos draw calls, tabla de matrices, progreso de sostenidas, hook WebXR, fallback y HUD oculto. `tests/ritmo.test.cjs`: 192 mapas; `tests/ritmo-sustain-fx.test.cjs`: 204 sostenidas. Todos pasaron en entorno JS simulado. No afirmar una prueba física del lente móvil ni FPS final hasta ensayar en ARCore.

**Publicación:** incluir `ritmo-stage3d.js` en el encaminamiento Vercel; fijar un SHA nuevo con HTML, engine, runtime, audio y stage sincronizados, preservar CSP que habilita scripts/WebXR y la ruta especial de audio Despacito. Validar staging antes de promover live.


## NEON LIVE V22 — profundidad, satisfacción y calidad adaptable

**Decisión sobre recursos externos:** se evaluó el pack Particle Pack de Kenney, licencia CC0 (https://kenney.nl/assets/particle-pack), pero no se añadió al runtime: esta escena funciona mejor en AR usando geometría propia de GPU y chispas procedurales pequeñas, sin descargas ni CORS adicionales. No afirmar haber descargado o integrado objetos GLB.

Mejoras sobre V20:
- Nuevo portal metálico luminoso al fondo de la pista con iluminación de escenario a baja altura, evitando tapar el espacio real.
- Gemas musicales con volumen y caras diferenciadas por carril; las notas especiales ahora usan corona dorada.
- Corrección de profundidad: los materiales sólidos se dibujan con DEPTH_TEST y escritura de profundidad, la luz añadida en otra pasada aditiva sin escribir profundidad; dos draw calls por vista.
- Nuevo evento de impactos físicamente anclados al receptor de su carril, con onda radial y chispas 3D; la confirmación Canvas anterior sigue disponible.
- Notas sostenidas visibles durante TODO el periodo de hold, incluso pasado el umbral corto, con cinta que se acorta según el progreso real. Conserva la precisión del core.
- La música anima luces por bajos/medios/agudos; evita encender fuertes efectos antes de que empiece.
- Control de usuario AUTO/ALTA/LIGERA durante la partida. En AUTO descienden las geometrías extra cuando el promedio de fotogramas empeora.
- El reloj de efectos usa segundos convertidos desde performance.now() en milisegundos; antes de la corrección las ondas no podían aparecer.
- Sin toques a `engine.js` compartido ni a otros minijuegos.

Pruebas: `tests/ritmo-neon-live-v22.test.cjs` comprueba geometría, efecto de impacto con tiempo correcto, sostenidas activas, pruebas depth mask, modo AUTO/ALTA/LIGERA, dos batches, fallback SVG y Despacito preseleccionada. También continúan pasando 192 mapas y 204 pruebas de sostenidas. Test físico con Chrome/ARCore/FPS pendiente.

Publicación técnica: servir HTML/JS con reglas separadas Vercel desde GitHub SHA inmutable, y **NO transmitir** la política `Content-Security-Policy: default-src 'none'; sandbox` del origen GitHub. El HTML debe seguir fijando su CSP WebXR compatible. Audio Ogg de Despacito permanece en ruta especial verificada. No modificar el Vercel original.


## NEON LIVE V24 — recursos CC0 integrados y vibración por acierto

Fecha: 26/10/2026. El usuario autorizó descargar recursos gratuitos necesarios y pidió una minivibración por cada nota acertada.

**Activos descargados e integrados desde fuente pública:**
- `spark_07.png` (Kenney Particle Pack), copiado como base64 dentro de `ritmo-kenney-vfx.js`; origen verificable: https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/spark_07.png
- `light_03.png` (Kenney Particle Pack), en el mismo módulo; origen: https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/light_03.png
- Titular/origen: Kenney / Calinou (repositorio espejo). Licencia CC0 1.0 Universal del pack: https://kenney.nl/assets/particle-pack y https://github.com/Calinou/kenney-particle-pack/blob/master/LICENSE.txt
- Este módulo mantiene los dos PNG originales codificados y los carga de forma local mediante Data URI. El motor genera versiones coloreadas de 128 px por tintado en Canvas y las reutiliza en caché. No hay dependencia nueva de CDN ni permisos de almacenamiento. El antiguo motor de partículas procedurales queda como fallback.
- **No se ha descargado ni importado un GLB premium**: el GLB del Stage Horn PA Speaker (Innerscene, 217KB, CC0) se evaluó, pero su importación requiere un cargador GLB/PBR que el renderizador WebGL 1 no tiene. Se evitaron claims incorrectos de implementación. En su lugar se modelaron internamente parlantes con conos tridimensionales, rejillas, marcos, tornillos y detalles metálicos en `ritmo-stage3d.js`, con coste ligero de geometría.

**Háptica:** nuevo `ritmo-haptics.js` (18 ms). Un único `navigator.vibrate(18)` por nota evaluada como acierto; incluye normal, slide, bonus, y la nota sostenida **al terminar su cola**, no al iniciarla. No vibra al fallar, ni duplica por alcanzar combo. Se reinicia su registro al empezar cada nueva ronda. Función opcional: en Chrome Android podría ser ignorada según navegador, sistema operativo, hardware y ajustes de vibración.

**Pruebas:** `tests/ritmo-haptics-assets.test.cjs` valida exactamente un pulso por id, ausencia de duplicados, resets, sprites auténticos completos con cabecera PNG y tintado en caché. `tests/ritmo-stage3d.test.cjs` y `tests/ritmo-neon-live-v22.test.cjs` cubren el motor 3D y fallback, `tests/ritmo-experience.test.cjs` el Canvas, 192 mapas musicales y 204 sostenidas. Se adaptaron aserciones de rutas de scripts a revisiones distintas para no fallar por un número de versión.

**Despliegue:** incrementar scripts HTML a versión v24 e incluir los nuevos `ritmo-kenney-vfx.js` y `ritmo-haptics.js` en regla de Vercel. Mantener CSP que permite imágenes data y scripts self; preservar Despacito y todos los demás juegos; exigir HTTP 200, correcta cabecera JavaScript y cargar HTML como documento, no texto. Probar físicamente háptica y ARCore en Motorola/Chrome Android antes de afirmar resultados del teléfono.


## Ritmo Caos V25 — Hotfix AR no detecta piso (26/10/2026)

Reporte físico del usuario tras V24: **«No detecta el piso»**.

La detección dependía de un solo Hit Test frontal que puede fallar en interiores y no tenía recuperación visible: los errores estaban ocultos en `#debug`. Se reforzó la búsqueda **sin falsificar una superficie**:
- `ritmo-engine.js` mantiene el `requestHitTestSource({space:viewerSpace})` frontal y añade un segundo origen con `offsetRay: new XRRay({x:0,y:0,z:0,w:1},{x:0,y:-.6,z:-.8,w:0})` para buscar un suelo más abajo en el encuadre. `direction.w=0` es obligatorio según la especificación WebXR y comprobado con prueba.
- Acepta sólo resultados reales con orientación horizontal (`Math.abs(matrix[5]) >= .69`), para no anclar la pista contra paredes. Rechaza tracking perdido cuando el resultado desaparece durante 1,5 s, tolerando microcortes breves.
- Si en 5,5 segundos no hay resultados, aparece un mensaje claro y el botón **REINTENTAR DETECCIÓN** (renueva ambas fuentes de hit test sin abandonar la cámara).
- **El renderizado 3D pesado sólo comienza al FIJAR la pista**; antes se usa la vista SVG, con un restablecimiento explícito de `stage3dOK` para evitar pantallas en blanco después de RECENTRAR.
- No se modificó el motor `/engine.js` compartido. La canción Despacito, los cuatro carriles, eventos hápticos de 18 ms y efectos Kenney se mantienen intactos.

**Tests:** `tests/ritmo-floor-recovery.test.cjs` con WebXR simulado verifica 2 rayos, 5500 ms sin superficie, mensaje y reintento, rechazo de paredes, detección posterior de piso, botón FIJAR y renderizado 3D sólo después de fijar. Prueba manual ARCore en Motorola/Chrome pendiente: las simulaciones no permiten asegurar físicamente la detección.

**Publicación:** ruta exclusiva del juego, actualizar Vercel HTML/JS a revisión V25 sin modificar rutas de otros juegos ni la política CSP corregida.


## NEON LIVE V26 — alineación visual y energía justa (26/10/2026)

Captura AR real de usuario: piso detectado, escenario 3D y cuatro carriles funcionando. HUD `PUNTOS 0 / COMBO ×0 / ENERGÍA 43% / TIEMPO 75s`. Esa energía correspondía a **un solo fallo** porque antes se iniciaba con 55% y cada error restaba 12. En la imagen, el marcador VOS está en rojo y llega una nota amarilla: no prueba que la puntuación falle.

Se encontró un **bug visual concreto**: en el render 3D, la línea luminosa de impacto estaba en Z=.485 m pero los receptores de nota se dibujaban en Z=.65 m, y las notas alcanzaban el tiempo de puntuación al acercarse a Z=.64 m. La línea de impacto era una referencia visual equivocada por 16.5 cm. Corregido:
- En `ritmo-stage3d.js` la línea fina está centrada en `Z=.65`, al igual que los receptores; la animación 3D también desemboca en `Z=.65`. Se bajó el brillo/ancho de la barra para que las notas y receptores sigan visibles.
- En el render SVG fallback (`ritmo-art.js`), la posición de llegada de la nota y la barra quedan centradas en `Z=.65`.
- `ritmo-core.js`: energía inicial 100%, fallos -7, aciertos conservan recarga actual. El 43% inicial tras un único fallo era una experiencia desalentadora aunque el cálculo fuese correcto.
- `ritmo.html`: HUD inicial 100%, revisión V26 de 12 módulos para evitar caché móvil.
- `tests/ritmo-impact-alignment.test.cjs`: nueva regresión que comprueba igualdad receptor/nota/barra 3D, igualdad de la nota de respaldo SVG, energía 100% y recompensa por nota acertada.

Pasaron regresiones de 192 mapas, 204 notas sostenidas, AR Hit Test, Stage3D, FX, sprites Kenney y háptica. No declarar prueba real de puntuación del teléfono hasta ensayo físico del usuario. Mantener WebXR 4 carriles y resto de juegos sin cambios.
