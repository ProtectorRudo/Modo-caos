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
