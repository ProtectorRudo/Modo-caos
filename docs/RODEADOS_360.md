# RODEADOS 360 · ingeniería, pruebas y límites (24/10/2026)

## Concepto y procedencia

Nuevo minijuego para Modo Caos desarrollado desde el Word **🎮 MODO CAOS — DESARROLLO INTEGRAL DE RODEADOS 360**. El protagonista es el jugador físico; no se representa como humano 3D ni se mueve con joystick. Cada persona mira y apunta mediante la orientación real del teléfono en AR.

Archivos:
- `/rodeados.html`: portada, modos, controles AR, HUD y estadísticas.
- `/rodeados-core.js`: núcleo determinista y autónomo en metros; seis enemigos, ocho sectores, colisiones, daño, tiros raycasting matemático, oleadas, EMP, puntajes.
- `/rodeados-art.js`: modelos originales de robots articulados a escala 1.6–2.2 m, sombreado y luz, piso, rifle 3D, portales, FX.
- `/rodeados-runtime.js`: renderer Three.js 0.181, sesión nativa WebXR, Hit Test, ancla opcional, matriz estable de arena, gestos, calibración, combates, entrenamiento sin cámara, Supabase sala beta.
- `/tests/rodeados.test.cjs`: pruebas lógicas, ejecutar `node --test tests/rodeados.test.cjs`.
- `.github/workflows/rodeados-tests.yml`: comprobación de sintaxis y core.

## Referencias reutilizadas

**COLOR BASH / COLOR RUSH + Meteoros:** paradigma de hit-test, cuadrícula 5×5, edición táctil (arrastre con un dedo, pellizco para escalar y rotación de dos dedos) y selección manual de una celda; muestreo 1 s quieto y seguimiento del teléfono respecto del mundo. Estos algoritmos se adaptaron en módulo nuevo a Three.js; **no se copió `engine.js` literalmente**, ya que su bucle WebGL propio no comparte framebuffer de forma segura con un segundo renderer XR.

**BLACKZONE V34:** Three.js/WebXR, escala humana, orientación de cámara física, MeshStandardMaterial, sombras de contacto simuladas, robot con articulaciones y golpes por rayo. Robots y armas de RODEADOS 360 son geometría original, no transfieren modelos sanguinolentos ni personajes humanos.

## Flujo AR

1. Botón abre sesión `immersive-ar` HTTPS Chrome Android compatible ARCore. Si no está disponible, advertencia y entrenamiento.
2. Hit Test detecta plano horizontal con normal Y positiva. Se presenta pista cuadrada visible y manipulable.
3. Al fijar se guarda transformación de la arena, tamaño, rotación y traslado; ancla espacial opcional corrige deriva, siempre relativa a la transformación fijada.
4. El jugador toca la celda física donde está; marcador seleccionado permanece visible.
5. Con el teléfono quieto ≈1s, se calcula offset de calibración entre pose observada y centro de celda. La posición continúa siguiéndose en metros reales del teléfono, sin teleportar arena al iniciar.
6. Cuenta regresiva, enemigos desde sectores en toda la periferia; los disparos se calculan con rayo del visor en coordenadas del mundo anclado.

**Nota de seguridad:** WebXR sigue **el teléfono**, no pies ni cuerpo. El juego no obliga a correr, caminar hacia atrás ni identificar muebles automáticamente; la arena virtual no detecta colisiones con muebles reales.

## Modos y niveles

- Supervivencia: 90 s.
- Caos infinito: hasta perder la vida.
- Reflejos extremos: 60 s.
- El Burlón: 75 s, provocaciones y esquivas.
- Jefe final: 90 s, robot de gran tamaño y alta resistencia.

Dificultad y oleadas crecen con tiempo; los robots no aparecen dentro del radio inicial del jugador ni se atraviesan según el algoritmo de separación. Escala de los seis robots calculada en unidades métricas.

## Salas multijugador (BETA NO CERTIFICADA)

La sala se crea/entra mediante `/salas.html` y RPC `mc_*` del proyecto Supabase compartido. El juego busca la sesión existente, verifica membresía de sala y usa canal Realtime privado de la infraestructura ya creada. Los clientes reciben snapshots comprimidos; el anfitrión del juego valida tiros con su core en el navegador. Esto **NO constituye autoridad de servidor confiable** ni suficiente antifraude. Faltan protocolos de reconciliación/reconexión probados, equipos implementados, y en especial **alineación espacial física entre celulares**: actualmente cada teléfono define su arena local; no hay ancla compartida real ni alineación de marcadores de referencia intercambiada.

No tocar ni exponer datos de Viralio o Te Hice Esto. No ampliar SQL ni autenticación global sin revisión de seguridad del trigger compartido `on_maurilio_auth_user_created`.

## Matriz de validación antes de declarar premium / comercial

| Aspecto | Verificación requerida |
|---|---|
| Sintaxis JS y lógica de 360°, raycasting, daño y oleadas | Pruebas Node/CI |
| Entrenamiento 3D sin AR, HUD, reinicio, controles | Chromium o teléfono, test visual |
| Cámara AR nativa, tamaño humano, Hit Test, escala y FPS | **Celular Android ARCore real** |
| Arrastrar/rotar/pellizcar en editor, elegir celda 1–25 | **Celular Android real** |
| Posición estable después de girar 90° / 180° / 360° | **Celular Android real** |
| Disparos en mirilla sin desalineación, recarga y háptica | **Celular Android real** |
| Realtime privado, dos teléfonos conectados | **Dos teléfonos reales y JWT diferentes** |
| Escena espacialmente idéntica entre teléfonos | **No implementado ni comprobado** |
| Antifraude, ranking remoto y servidor autoritativo | **Pendiente** |
| Regresión de otros juegos y rutas públicas | Pruebas CI/HTTP + revisión manual |
| Producción lista para vender | **No hasta completar pruebas físicas** |

## Mejoras posteriores pendientes

Animaciones GLB esqueléticas con licencias verificadas; audio espacial HRTF y música original; optimización y análisis ARCore real; validación antifraude server-side, mejores reconocimientos y retos diarios, alignment multi-AR con puntos compartidos y control de distancia; equipos; tornados de spawn más variados; atención a accesibilidad y fotografía real. Estas tareas no se confunden con funciones verificadas.

## V2 · Diseño y seguridad incorporados (24/10/2026)

- Radar 360° con orientación relativa a la cámara: blanco representa el celular; enemigos próximos se marcan en rojo, jefes en amarillo y otros robots en menta. No muestra datos de objetos/muebles reales.
- Indicador de oleada, racha, confirmación de impacto y daño sin ocupar el centro durante toda la partida.
- Retícula centrada al 50% de la pantalla para corresponder al rayo 3D `(0,0,-1)`.
- La posición estimada fuera del perímetro + 35 cm produce pausa de seguridad, sin animar a correr.
- Ancla WebXR solicitada dentro del siguiente `XRFrame` tras fijar pista. Si `frame.createAnchor` no se ofrece, se intenta Hit Test vivo y, si tampoco funciona, continúa el tracking del sistema de coordenadas local.
- Al usar WebXR inmersivo no se reconfigura dinámicamente el pixel ratio del renderer. El control adaptativo sigue disponible en entrenamiento 3D.
- Test unitario `tests/rodeados-ux.test.cjs`: izquierda/derecha/atrás, orientación del radar, alertas por oleada y daño.
- Chromium/WebGL y WebXR simulado ahora comprueban HUD radar presente durante juego y ausente durante la selección de celda.

**Seguimos sin pruebas físicas certificadas de ARCore ni gameplay online real de dos equipos; estas pruebas de software no las sustituyen.**

## Co-op beta: cargadores independientes (24/10/2026)

En salas de 2–4 participantes cada usuario tiene su propio cargador de 28 disparos y recarga independiente de 1,35 s, incluso cuando el anfitrión mantiene la simulación de robots. La cadencia de mensajes de disparo de invitados está limitada por el tiempo simulado a 0,16 s y se retransmite el estado de munición de cada integrante mediante snapshots Realtime autenticados; no se requiere migración SQL. El anfitrión sigue controlando vida de equipo y oleadas. Pruebas deterministas en `tests/rodeados-coop.test.cjs` y regresión Chromium.

**Alcance:** la autoridad sigue estando en el navegador anfitrión, no en un servidor antitrampas. No hay aún anclas AR compartidas verificadas y no se probó la experiencia física con dos Android. Las municiones independientes no equivalen a un multijugador espacial certificado.

## Corrección AR Blackzone V25/V34 · robots invisibles en Android (24/10/2026)

**Diagnóstico con captura real:** el radar y los puntos de vida mostraban enemigos pero el mundo WebXR nativo era invisible, incluso cuando el core generaba modelos 3D. El motor Blackzone, referencia ya validada, tiene documentado este fallo específico de Android ARCore/Chrome y lo evita con una segunda capa Three.js transparente **dentro del DOM overlay de la sesión AR**.

RODEADOS ahora aplica el mismo patrón:
- `rodeados-ar-compositor.js`: renderizador WebGL alfa separado, cámara con `matrixWorld`, `matrixWorldInverse` y `projectionMatrix` COPIADAS del ojo XR real. Escenas/robots/piso quedan en coordenadas espaciales del XR ReferenceSpace y NO se fijan a pantalla.
- Renderizador nativo WebXR dibuja `nativeXRScene` (vacía) para refrescar la pose real sin duplicar robots.
- Renderizador del mundo de RODEADOS dibuja la escena íntegra (piso, bots, efectos, arma) sobre el video de ARCore, como Blackzone.
- Se crea y destruye con la sesión XR; entrenamiento de PC mantiene el renderizador original. Se adapta al tamaño de pantalla.
- Si falla al crear la capa, se informa un error claro y **no se inicia una partida invisible**.
- WebXR Chromium simulado verifica ahora que la capa transparente DOM exista, reciba geometría mediante draw calls y renderice enemigos sin errores. Las pruebas NO equivalen a una validación física en Android.

**Archivo original auditado:** `ProtectorRudo/ProtectorRudo.github.io/la-casa-alterada/ar-compositor.js` (Blackzone V25) y `main.js` (Blackzone V34, `nativeXRScene`, `arCompositor.render(...)`).

## V6 · robots a escala, combate y disparo táctil (24/10/2026)

Cambios basados en captura física de Android: el robot invadía toda la pantalla con una estética demasiado bloqueada y no registraba disparos.

- **Dos espacios distintos:** la pista AR ajustable de 1,8–3,7 m sigue siendo la zona segura del jugador; robots de tamaño real ahora patrullan un anillo virtual de **2,95–4,15 m** fuera de la zona de pisadas. No solicitar movimientos hacia los robots.
- Primer robot de 1,75 m de altura **a 3,15 m al frente**, segundo a 3,65 m y 0,86 m lateral; separación de seguridad radial mínima durante combate 2,45 m.
- **Colisiones y tiros consistentes:** intersecciones de rayo con cajas analíticas orientadas por el yaw real del enemigo para cabeza/pecho/piernas en escala métrica; tolerancia de 6 cm por movimiento de mano. Un headshot mata al enemigo básico de 2 HP. El HUD sigue centrado en el eje del visor real, no atado al robot.
- Botón **DISPARAR** escucha `pointerdown` directo como Blackzone, con `click` como respaldo y ventana antirrebote de 175 ms. En Android WebXR una pulsación puede no generar un `click` posterior; antes el cargador permanecía en 28/28.
- Arte procedural renovado: silueta humanoide esbelta (cabeza compacta, torso ovalado, piernas articuladas, visor y juntas lumínicas, placas de armoraje), LEDs y animación por pivotes. Mantiene WebGL/Three.js y compositor AR heredado de Blackzone, sin dependencia de GLB externa ni cambios en el sitio de Blackzone.
- Test `tests/rodeados-combat-v6.test.cjs`: distancias seguras, headshots, impactos de pecho y piernas, disparo lateral con bot rotado, consumo de munición. Test `tests/rodeados-xr-smoke.test.cjs`: tocar realmente el botón DISPARAR en Chromium móvil con WebXR simulado reduce 28 → 27 con un solo disparo y comprueba dos actores a distancia.
- Assets versionados `v=6` en el HTML para evitar caché de JS viejo.

**Límites:** estas pruebas de software no pueden certificar el seguimiento ARCore ni que la estética satisfaga en un Android real. Modo cooperativo sigue beta; no se tocan datos de Viralio/Te Hice Esto.

## V9 — Disparo con peso y Bomba Caos (24/10/2026)

- Disparo: ruido filtrado de corto ataque + graves de caída, chispa y confirmación de impacto diferenciados, retroceso físico del rifle con amortiguación, flash más expresivo, haz energético espacial breve calculado a partir del rayo XR auténtico y destellos metálicos al impactar. Sonido y vibración son opcionales.
- **Bomba Caos:** 1 carga inicial y máxima; lanzamiento a 3,35 m por delante de la orientación real del celular, con arco visual de 480 ms. Explota en un círculo de 2,5 m en el suelo: daño 3 (robots normales), daño 2 (tanques/jefes), aturdimiento 2,6 s a los supervivientes, puntos y bajas acreditados. Sin daño al usuario.
- Recarga: 32 s de tiempo de juego **o** 10 bajas posteriores a la explosión; nunca se regenera instantáneamente por sus propias bajas.
- Efectos: proyectil brillante, dos anillos de onda expansiva anclados al piso, esfera luminosa, chispas limitadas, golpe de graves y vibración. No se alteran proporciones ni distancia de los robots.
- **EMP y bomba son distintos:** EMP frena robots y deja sus puntos de vida por encima de cero; la bomba puede destruir varios. Ambos conservan recargas propias.
- Co-op beta: el anfitrión recibe las solicitudes de bomba y comparte carga, explosión y proyectil mediante snapshots. No se afirma alineación espacial real entre dispositivos.
- Pruebas: `tests/rodeados-bomb.test.cjs` verifica explosión, daño/aturdimiento, 32 s, 10 bajas, rematch, pausa y ausencia de daño propio. Pruebas Chromium/WebGL y WebXR simulado exigen tocar el botón, consumir una sola carga y causar daño a robots visibles.
- Publicar con assets versionados para invalidar caché de Chrome Android. Última prueba pendiente: imagen/sonido físicos en ARCore.

## V10 — Munición infinita y robots cazadores (24/10/2026)

- **Sin balas limitadas ni recarga:** disparo infinito en todos los modos AR y en el entrenamiento 3D. Sin barra de munición que se agote; el HUD indica **∞ BALAS** y desaparece RECARGAR. Se mantiene un intervalo mínimo de aproximadamente 175 ms entre pulsaciones táctiles locales y 160 ms de cadencia validada por el anfitrión para invitados (evita ráfagas abusivas, no limita munición).
- La API de recarga histórica sigue disponible para clientes viejos pero ya no bloquea ninguna bala ni activa demoras. Los estados online mantienen un inventario virtual constante para compatibilidad, sin prometer multijugador plenamente validado en dos móviles.
- **Robots menos infantiles:** placas metálicas desaturadas tipo grafito, silueta con hombros angulares/columna mecánica, visor carmesí pulsante, pequeños movimientos independientes de cabeza, caminata asimétrica, bamboleo suave al avanzar y carga de ataque con brazos y tronco. Sonido robótico grave y direccional (espaciado para evitar saturación) cuando un robot se acerca.
- Mantiene alturas y distancias de aparición V9. Los desplazamientos cosméticos son pequeños y no cambian posiciones físicas de colisión ni precisión del tiro.
- Se conservan calibración, compositor de Blackzone, Bomba Caos, EMP, radar y pausa.
- Nuevas aserciones en tests de core/coop/Chromium/WebXR para demostrar ausencia de consumo de balas, eliminación del botón RECARGAR y continuidad del daño al disparar muchas veces. Falta la comprobación sensorial en Chrome Android real.

## V11 — campo de batalla que se deteriora y headshots de precisión (24/10/2026)

- Al calibrar, las 25 celdas turquesas de la pista siguen visibles y manipulables. En el combate, cambian por un **tablero táctico militar futurista de grafito**, con contornos reforzados, pequeñas marcas de identificación y paneles translúcidos. No bloquean la cámara real.
- Cada golpe sufrido añade daño cosmético persistente a las baldosas próximas a VOS. El radio de la Bomba Caos deja una marca de quemadura y grietas, con un breve brillo naranja. Cada celda guarda `floorDamage[i]` de 0 a 1 y `floorHeat[i]` para desvanecer el brillo temporal. Rejilla, textura y grietas NO cambian el suelo físico, la colisión, el tracking ni el ritmo de partida. La revancha restaura la pista intacta.
- Gráficos móviles: se reutiliza **una sola CanvasTexture** de quemadura entre 25 placas. La geometría táctica y fracturas se crea una vez por sesión; solo se cambia color y opacidad al modificar daño. El suelo se dibuja con Blackzone/WebGL DOM overlay con el mismo anclaje real que los robots.
- Bonos de disparo por zona: **cabeza: 165 puntos base**, torso: 55, piernas: 35. Una baja conserva el bonus de robot; el headshot letal agrega **90** y cada tercer headshot consecutivo agrega **75** extra. Combos y modos especiales continúan aplicando su multiplicador habitual. Un fallo o daño sufrido reinicia la racha de precisión.
- HUD: texto breve y visible «HEADSHOT», «HEADSHOT LETAL» y «RACHA x3», con el puntaje real obtenido y vibración diferenciada.
- Estado online beta: `floorDamage[25]`, `floorHeat[25]` y rachas de precisión viajan en las instantáneas del anfitrión; no se crea ninguna tabla SQL. Alineación física AR entre celulares aún requiere validación.
- Pruebas: `tests/rodeados-war-floor.test.cjs` cubre deterioro, topes, ataques, explosión, premio de cabeza, rachas y reinicio. Chromium 3D y WebXR simulado verifican que **25 placas reales** aparezcan en el motor WebGL en modo combate; Chromium verifica que la explosión produce manchas visibles, no solo valores en el core.

**Pendiente:** verificar la estética y legibilidad del suelo con iluminación ARCore en Android real. No se modifican otros juegos.
