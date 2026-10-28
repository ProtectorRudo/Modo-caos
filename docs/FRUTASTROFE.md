# FRUTÁSTROFE · entrega v1 en rama de preview

Fecha: 2026-10-28
Ruta: /frutastrofe.html
Rama: feat/frutastrofe-premium

## Arquitectura
- Core determinista UMD/CommonJS: frutastrofe-core.js.
- Arte WebGL Three.js: frutastrofe-art.js, geometrías originales, iluminación, arena y partículas.
- Runtime: frutastrofe-runtime.js, controles táctiles y de puntero, WebXR, HUD, audio y progreso.
- Interfaz: frutastrofe.html. Nuevo vínculo en index.html.
- Tests: node tests/frutastrofe.test.cjs.

## Funciones
- Campaña de 10 niveles, 0 a 3 estrellas, objetivos, jefe Sandía Gigante, récords y monedas locales.
- Arcade de 60 segundos, fiebre final, fruta dorada, hielo, arcoíris, trampas y combos con cascadas.
- Modo 3D en navegador con controles táctiles directos o botón de disparo.
- AR bajo HTTPS, Chrome Android compatible, WebXR + ARCore: hit test de piso, ubicación de arena en espacio local-floor, mundo no dependiente de cámara. La validación física del anclaje en Android aún está pendiente. No es seguimiento corporal.
- Multijugador local de dos personas: turnos independientes con la misma semilla de partida. Enlace para compartir un reto asíncrono.
- No se anuncia ni se implementa online real (2–4) en esta fase: requeriría sincronización y validación en servidor, pruebas con teléfonos, autenticación y protección de puntuación.
- Ninguna modificación a Supabase compartido ni a los juegos anteriores.

## Auditoría de assets
Se investigaron Kenney Food Kit v2 (200 modelos, CC0: https://kenney.nl/assets/food-kit), Quaternius Ultimate Food Pack (CC0: https://quaternius.com/packs/ultimatefood.html), y Kenney Particle Pack (CC0: https://kenney.nl/assets/particle-pack).

En esta versión se usan modelos y efectos 3D originales hechos con código Three.js para evitar descargas de usuario, activos remotos que fallen y licencias ambiguas. No se afirma que los packs investigados estén integrados. Dependencia CDN Three.js fijada a 0.161.0; no hay modo offline.

## Verificación previa a producción
1. Ejecutar pruebas deterministas Node, validar sintaxis JS y recursos HTTP en preview.
2. Android sin XR: iniciar, jugar, cerrar y comprobar progreso.
3. ARCore real: detección de piso, posición fija tras movimiento de cámara, botón disparar, cierre AR.
4. Medir FPS, carga, jugabilidad y latencia en celulares de diferentes prestaciones.
5. Dos personas: turnos iguales en duelo local. Comprobar enlaces de desafío.
6. Regresión en Color Rush, Ball Rush, Territorio X, Muro Rush y resto del menú.

No declarar AR físicamente probado ni multiplayer online funcional mientras falten esas pruebas.

## Camino de evolución
Nuevos mundos y cosméticos; análisis de packs GLB CC0 con medición de FPS; online con backend autoritativo y revisión de la seguridad de Auth compartida.

## Corrección AR-only: evidencia de cámara sin objetos (28/10/2026)
- Se quitó la entrada a modos 2D/3D. Campaña, arcade y duelo local ahora requieren iniciar WebXR y fijar una pista; los menús pueden seguir mostrando decoración 3D.
- Problema informado: la cámara y el HUD funcionaban, pero arena y frutas no aparecían en la sesión real.
- Se redujo la escala física de la escena a 0,23 para que frutas y piso estén dentro del campo visual habitual al apuntar al suelo.
- Se incorporaron `frutastrofe-ar-projection.js` (matemática en coordenadas de piso) y `frutastrofe-ar-overlay.js` (frutas y contorno SVG proyectados en DOM-overlay, independientemente de que Three componga o no sus mallas en el XR framebuffer). Se usa la pose XR real de cada fotograma; las frutas NO se fijan a píxeles de pantalla.
- Los disparos se alinean con las frutas proyectadas, además de conservar raycast a las mallas 3D.
- Preview de fijación muestra contorno anclado; juego muestra frutas, bomba y suelo. El tracking se conserva al recenter sin reiniciar puntos.
- Se eliminó la sonda asíncrona XR antes de `requestSession()` para preservar la activación de usuario en Chrome Android.
- Tests de proyección física simulada de cámara, perspectiva y visibilidad: `node tests/frutastrofe-ar.test.cjs`. Smoke de navegador móvil con simulación de cámara: `tests/frutastrofe-browser.cjs`.
- **Límite de verificación:** simulación no equivale a prueba física Android/ARCore. Una captura sin geometría fue el motivo de esta revisión; debe comprobarse con teléfono antes de afirmar que está totalmente resuelto.

## Rediseño reactivo AR — Reactor 2 (28/10/2026)
- La crítica de pruebas físicas incluyó imágenes donde las frutas aparecían sin emisor, la arena parecía un contorno vacío, no había arma visible y los aciertos no producían explosiones.
- El `frutastrofe-core.js` ahora crea todas las frutas en la garganta de una máquina física fija (x ~0, y 2.76, z -1.15) y les aplica velocidad inicial, gravedad, movimiento lateral y avance en profundidad. Las trayectorias son deterministas por semilla, con oleadas densas y un límite de objetos activos.
- `frutastrofe-ar-overlay.js` pasó de círculos a un juego de escena proyectada: plataforma sólida con espesor, paneles luminosos y rejilla, reactor con tolva y tanques laterales, emisor de fruta brillante, frutas con volumen simulado, trazas de lanzamiento, destellos, ondas de jugo, gotas y puntos flotantes; sus posiciones provienen de las matrices XR, no de posiciones 2D fijas.
- El arma de primera persona Juice Blaster aparece en el HUD (es el único elemento fijado a pantalla de manera deliberada); utiliza retroceso, flash y disparos visibles que salen de su boca hacia las frutas proyectadas.
- Los sonidos de impacto combinan osciladores y una muestra procedural de ruido filtrado; vibración breve cuando es posible.
- En modo AR, el motor 3D no dibuja duplicados encima del SVG. La proyección conserva el anclaje de superficie y el cálculo de puntería sigue los objetos visibles.
- Se mantuvo modo únicamente AR, progreso y niveles; los juegos existentes no se tocaron.
- Se auditaron Kenney Food Kit CC0 y Poly Haven CC0; no se incorporaron modelos externos porque la ruta WebGL-AR mostraba objetos invisibles en el teléfono y porque los recursos pesados elevan el costo en móviles. Se priorizó render reproducible en el DOM-overlay anclado al espacio real.
- CI: `tests/frutastrofe.test.cjs`, `tests/frutastrofe-ar.test.cjs`, prueba Playwright en dispositivo emulado con escenas y capturas de caída densa, arma, reacción de disparo, pausa y retorno. **No sustituye prueba física ARCore**.

## Cambio a LLUVIA DESDE EL CIELO — 28/10/2026
Tras probar el reactor terrestre en Android, se detectó: las frutas salían del piso y se apilaban. Se rediseñó de nuevo el origen de la acción:
- Portal `SKY JUICE PORTAL` físicamente anclado al mundo XR, elevado alrededor de 1,8 m sobre la plataforma; ya no existe lanzador terrestre.
- Cada fruta nace a altura mundial 9.25–9.67, lleva velocidad vertical inicial descendente y cae por gravedad con pequeño desplazamiento lateral. `baseY` permite una estela de caída, sin inventar trayectorias en píxeles.
- Cinco carriles separados, paso coprimo para que el carril siguiente quede lejos del anterior. Oleadas iniciales y de combo programadas en cola con 0,52–0,57 s entre frutas; grupos separados en vez de aparecer simultáneamente.
- Ritmo de lluvia moderado, máximo 13 objetos activos, no saturar el teléfono; el sistema de combos mantiene oportunidades de tres iguales.
- Frutas y portal usan una escala vertical AR coherente de 0,23×0,80, distinta de la anterior 0,23×0,46 que comprimía demasiado el espacio.
- Explosión con fruta visualmente cortada en dos, destello, ondas superpuestas, 12 chorros direccionales, partículas de jugo y puntuación flotante; efectos proyectados desde el mundo físico con WebXR. Caídas fallidas dejan salpicaduras pequeñas sobre la plataforma.
- Se recomienda levantar ligeramente la cámara para seguir la lluvia del cielo; se añadieron instrucciones en juego. Los gráficos AR usan vectores estilizados, NO se debe anunciar realismo 3D fotográfico todavía.
- `tests/frutastrofe-sky.test.cjs`: validación de altura, cinco carriles, gravedad, límites de densidad y oleadas. Chromium verifica imágenes de la lluvia y un disparo con fruta realmente partida.
- Las pruebas Chromium/CI y CDN aprobadas no equivalen a una prueba de ARCore físico. Mantener preview aislada de producción principal hasta aprobación y pruebas Android.

## 28/10/2026 · Auditoría de rendimiento y rondas por tiempo
- Informe de dispositivo: sostener disparo hacía trabar el AR; las partidas acababan antes del reloj si se alcanzaba el objetivo.
- Cambio de reglas: **todos los niveles de campaña y arcade duran 60 segundos completos**. Los objetivos determinan la victoria sólo al acabar el reloj. Una bomba o error en un nivel limpio penaliza, pero no corta el tiempo. El jefe derrotado tampoco hace finalizar antes del segundo 60.
- Dificultad gradual dentro de cada ronda: seis fases de diez segundos, identificadas en el HUD; la cadencia de generación aumenta un 7,5 % por fase aproximadamente y la aceleración de frutas nuevas aumenta gradualmente, con tope de 13 objetos simultáneos. La Fiebre final sigue presente en los últimos 12 segundos.
- Causa de lentitud: el SVG AR se reconstruía íntegramente con definiciones de gradientes, numerosas salpicaduras y decenas de partículas por tiro; cada disparo forzaba una medición síncrona del layout para reiniciar animaciones CSS.
- Mitigaciones: gradientes SVG persistentes, máximo 42 partículas activas, tres estallidos, dos rayos, seis textos y nueve charcos; 7 chorros por estallido y eliminación de partículas decorativas al aparecer y caer frutas.
- FPS adaptativo para el overlay: entre aproximadamente 12 y 18 actualizaciones por segundo según costo medido de render; el framebuffer XR conserva los cuadros de la cámara. Se omite raycast contra mallas ocultas en AR, sombras WebGL, actualización de partículas 3D ocultas y se usa pixel ratio 1 en AR.
- Disparo continuo: mantiene ~8 disparos/segundo, audio reducido a un solo tono de disparo y retroceso/flash con una única animación CSS en bucle mientras esté presionado; ya no se fuerza `offsetWidth` por cada tiro.
- Verificación: `tests/frutastrofe-timed.test.cjs`, Core QA, smoke de Chromium móvil y smoke del CDN; sigue pendiente prueba física Android ARCore y medición FPS con herramientas del dispositivo para afirmar que está solucionado en todas las gamas.

## 28/10/2026 · Hotfix mayor de rendimiento: compositor AR Canvas
- **Síntoma en Android real**: cada tiro generaba ralentización, incluso después de reducir elementos del SVG.
- **Causa probable identificada en código**: el compositor anterior montaba/desechaba cientos de nodos SVG por fotograma y fabricaba nuevos filtros/definiciones de recorte durante las explosiones. Además había lecturas de rectángulos DOM en el trazado de cada disparo.
- **Cambio de arquitectura**: `frutastrofe-ar-overlay.js` ahora implementa un compositor único Canvas 2D, con sprites prerenderizados y caché (frutas, bombas y podridas), 2 disparos visuales máximos y efectos limitados (24 gotas, 3 ondas). No crea árboles de DOM por fotograma.
- La cámara física, detección de piso y anclaje no se modifican. El Canvas dibuja cada fruta, el portal y la plataforma mediante `FrutaARProjection` y matrices del observador XR. El arma permanece en el HUD.
- **Se eliminan consultas a `getBoundingClientRect` durante trazado de cada disparo**. La boca del arma se aproxima por la geometría fija del HUD. La animación de arma y sonido siguen sin bloqueo.
- **Verificación de navegador real**: Playwright móvil comprueba canvas, frutas proyectadas, pausa, 60 segundos, múltiples disparos y una ráfaga de 1,8 segundos con proyección espacial actualizada a 20 fps. Se registran tiempos de dibujo en milisegundos y el avance del reloj durante el disparo.
- **Límite importante**: las pruebas Chrome automatizadas usan WebXR simulado (no un dispositivo Android ARCore). No se debe garantizar que desapareció la ralentización física hasta recibir una prueba del teléfono real.

## Auditoría visual JUICEVERSE v3 · 28/10/2026

Motivación: las capturas reales mostraban frutas planas con contornos gruesos, una plataforma enorme tipo rectángulo y un bláster parcialmente oculto por la arena. Los efectos ya gustaban al jugador, de modo que el objetivo fue aumentar calidad visual **sin arriesgar los FPS de Android**.

### Nuevo arte
- Nuevo módulo `frutastrofe-premium-art.js` con **11 sprites de alta resolución 256×256**, prerenderizados/cached en Canvas: frutilla con semillas y hojas, naranja con piel porosa, manzana, limón, sandía con vetas, dorada, hielo, arcoíris, bomba blindada con pantalla de advertencia, fruta podrida con marcas de toxicidad y jefe con corona/expresión.
- Simulación de iluminación volumétrica, specular, sombra suave y oclusión ambiental precalculadas en los sprites; nada de filtros caros o geometría GLB durante cada fotograma. Mejora estética sin afirmar que sea fotogrametría o render PBR en tiempo real.
- Arena AR compacta hexagonal con volumen lateral, acero sombreado, grabados discretos, bordes de energía y puntos LED. Sombras de contacto calculadas desde coordenadas del mundo al pie de cada fruta.
- Portal flotante ahora tiene aro energético, placas luminosas segmentadas, núcleo iluminado y movimiento orbital. Permanece en coordenadas del mundo AR, nunca en el HUD.
- Nuevo Juice Blaster MK II original: cromado, carcasa blindada, cañón iluminado y depósito de energía; ubicado delante del Canvas AR, debajo del HUD. La boca sigue sirviendo de origen al haz.
- HUD reducido y reformateado con cristales translúcidos, tipografía pequeña, barras finas, retícula legible y disparador con mejor contraste.
- No se cambió el core de 60 segundos, las seis oleadas, puntería, score, anclaje de Hit Test ni modo exclusivo AR.
- Costo aproximado de dibujo en una prueba automatizada de Chromium: alrededor de 0,43 ms por fotograma antes del pulido final. Los resultados proceden de software/QA simulado, no de un celular físico. Medir dispositivo real.

### Investigación de assets gratuitos
Se revisaron Kenney Food Kit (CC0: https://kenney.nl/assets/food-kit), Quaternius Ultimate Food Pack (CC0: https://quaternius.com/packs/ultimatefood.html), Poly Haven (CC0: https://polyhaven.com/). No se importaron GLB externos: el motor de Frutástrofe usa Canvas 2D sobre la cámara real; cargar modelos 3D en tiempo real habría reabierto el problema de objetos AR invisibles y costo de GPU, y las siluetas entre packs no tenían una identidad lo bastante homogénea. El arte incluido es original y generado por código sin descargas de usuario.

### Validación antes de entrega
- Node: reglas y regresiones, sprites premium con sintaxis JS válida.
- Chromium móvil: 11 sprites de 256px, disparos y explosiones, cámara AR simulada con traslación comprobada, menú AR-only, pausa, HUD y más de 1,8 s de ráfaga continua.
- CDN público: mismas rutas/archivos reproducidos desde un commit Git inmutable.
- Pendiente **prueba real con ARCore físico**: encuadre del portal, tamaño de plataforma, saturación de color al aire libre, FPS y estabilidad de sombras.
- No modificar producción original, repositorio main ni Supabase hasta validar un preview.

## 28/10/2026 · JUICE APOCALYPSE — auditoría visual v4

**Evidencia:** captura física Android reportó portal demasiado grande y recortado, arma superpuesta a la plataforma, cuatro indicadores invasivos, disparos como láser continuo y frutas que parecían pegadas al video. Se priorizó presencia y legibilidad sin cambiar física ni sala online.

**Cambios efectivamente integrados en rama `feat/frutastrofe-premium`:**
- `frutastrofe-premium-art.js`: el portal circular gigante se sustituyó por una máquina de cinco bocas de salida alineadas a los cinco carriles. La carcasa blindada tiene placas biseladas, turbina interna, destellos, animación y cambios de color según fase/fiebre. Todos los puntos se proyectan desde la misma posición física AR.
- `frutastrofe-ar-overlay.js`: frutas con rotación y oscilación sutil, reflejos en especiales, peligros reconocibles con pulsos pequeños e iconos en lugar de etiquetas enormes, trazas de energía de 112 ms que recorren la distancia hacia el blanco (no rayos permanentes), destellos en la boca del arma, manchas de fruta en la plataforma. Efectos delimitados a 24 partículas y 2 pulsos visibles para evitar la regresión de FPS.
- `frutastrofe-premium-art.js`: **mitades de fruta 128×128 precalculadas**, mostrando pulpa, borde y semillas; también se precargan con las texturas originales de 256×256. No se generan geometrías pesadas en cada disparo.
- Pistola MK II: depósito semitransparente de jugo, iluminación, remaches y detalles; reposicionada en zona inferior para evitar ocultar el objetivo. Es el único elemento fijado al HUD.
- `frutastrofe.html`: cuatro indicadores más delgados, barra de objetivo reducida, retícula única, tutorial que se oculta a los 7 s, feedback de fiebre y seis etapas de reactor.
- `frutastrofe-runtime.js`: transmite fase y fiebre al motor artístico y preserva los 60 s, la semilla compartida y la puntería.

**Pruebas:** Node y Chromium móvil simulados + smoke de CDN inmutable, con verificación de las 11 frutas, mitades precalculadas, dimensiones del HUD/arma, arranque/pausa/reinicio, proyección a distinta pose, disparos rápidos durante 1,8 s y modo online sin regresiones. **No equivalen a una prueba física ARCore con dos celulares.**

**Publicación:** el proyecto Vercel `modo-caos` devuelve error HTTP 402 `api-deployments-free-per-day` (límite gratuito diario). Se conserva la rama de prueba y el enlace CDN del commit exacto; producción `main` y proyecto original intactos. No se descargaron modelos externos: el arte programático original mantiene la licencia controlada y evita peso en datos móviles.
