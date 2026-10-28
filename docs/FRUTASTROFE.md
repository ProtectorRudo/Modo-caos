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
