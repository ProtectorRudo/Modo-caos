# Torre Caos — minijuego 3D/AR

## Rutas y arquitectura
- `/torre.html`: pantalla móvil y HUD; `/torre-core.js`: 14 formas y progresión sin dependencias; `/torre-art.js`: mallas extruidas Three.js, sombras y vista auxiliar; `/torre-runtime.js`: simulación, controles, WebXR y audio.
- Rapier 3D Compat 0.17.3 (WASM integrado) y Three.js 0.167.1 desde jsDelivr CDN versionado (requiere conectividad). No se cambia `engine.js`, el mundo 3D AR propio reutiliza el patrón hit test / `local` / anclaje y añade colisiones verticales que el engine de baldosas no tiene.
- Integración en `index.html`. Sin cambios a Supabase, salas ni al despliegue original `color-rush-ar-demo`.
- Estado: modo Torre Infinita individual; VERSUS, MURO IMPOSIBLE, CAOS EXTREMO y CONSTRUCCIÓN PERFECTA se mantienen pendientes, no simulados como funcionales.

## Mecánica
- Tap sobre el área libre: gira la pieza 90°.
- Arrastrar horizontalmente y soltar: liberación, Rapier aplica gravedad, masa, rozamiento, inercia y contactos. No hay snapping.
- Plano de construcción X/Y; Z y rotaciones X/Y bloqueados, manteniendo cuerpos físicos sólidos 3D (colisionadores hull convexos o compuestos por partes para L/T/Z).
- Tiempo de asentamiento / fallo después de perder pieza, salirse de la plataforma o caer la altura que ya estaba estable. No hay terremotos ni trampas.
- Altura máxima estable y récord local en centímetros, repetición breve del estado de cuerpos registrado en cada fotograma físico.
- Pequeños impactos: sonidos sintetizados en función de la velocidad de colisión y háptica opcional.
- Visor lateral auxiliar ampliable, útil para torres altas.

## Flujo AR
1. Chrome Android + ARCore + contexto HTTPS + soporte `immersive-ar`, `hit-test` y `dom-overlay`.
2. Detectar suelo físico, mostrar plataforma, arrastrar para recolocar, pellizcar para escalar/girar.
3. Fijar plataforma; crear `XRAnchor` si se ofrece, o conservar posición `local`.
4. Piezas ancladas al mundo AR; el teléfono es cámara, no detector de pies. No caminar mientras se juega.
5. Reubicar desde HUD cuando sea necesario (comienza otra partida).
6. Si no hay AR, botón de **JUGAR EN 3D** accesible desde PC/Android.

## Pruebas
- `node tests/torre.test.cjs` valida cantidad y área de polígonos, orden de aprendizaje, aleatoriedad semillada, rotación, puntos y derrumbes. **Ejecutado, OK**.
- `npm install --no-save @dimforge/rapier3d-compat@0.17.3` y `node tests/torre-rapier.test.mjs`: **ejecutado, OK** en Linux Node 24, pruebas numéricas de las 14 figuras físicas, colisionadores compuestos, no penetración del piso, restricciones de plano X/Y y estabilidad de un segundo bloque sobre un cubo. No sustituye a Android real.
- Se probó en **Chromium headless** (390×844 px, WebGL SwiftShader, Playwright) la carga del módulo, botón 3D, entrada a la partida, soltado, retorno a pieza nueva, giro por tap, pausa/reanudación, sonido/vibración y visor auxiliar: cero errores de página/console. Es navegador de escritorio simulado, **NO es prueba física AR Android**.
- Queda pendiente prueba en dos modelos de teléfono Android ARCore y prueba del encuadre de una torre alta. La AR real no se pudo simular de forma equivalente.
- Validar que `/torre.html`, `/torre-core.js`, `/torre-art.js`, `/torre-runtime.js` se sirven con HTTP 200 en preview y que no se alteraron archivos de otros juegos.
- No mezclar código 3D nuevo en `engine.js` global.
- Tamaño inicial de escenario en AR: escala 0,48 (plataforma aprox. 1,2 m de ancho), regulable con dedos de 0,30 a 1,15. La guía de caída usa ray cast real de Rapier, solo como sombra visual, sin corregir la física. Al reubicar una pista en AR se conservan piezas y estado de simulación.
- El selector AR se habilita solamente si `navigator.xr.isSessionSupported('immersive-ar')` confirma soporte, no por la presencia de `navigator.xr`.
- Las geometrías de mallas Three.js se liberan al reintentar para reducir consumo de memoria.

## Corrección AR: plataforma invisible (24/10/2026)

Problema reproducido visualmente por captura de Android: WebXR habilitaba **FIJAR** aun sin verse la geometría de la base 3D. La geometría del preview se renderizaba únicamente con Three.js; una sesión AR puede detectar un hit test sin que una malla sea visible en la composición WebGL.

Corrección aislada en `torre.html` y `torre-runtime.js`:

- Añadido `#xrScene` (SVG en DOM Overlay) para dibujar en el mundo real la base, guías y geometrías visibles a partir de `frame.getViewerPose(ref)`, `view.projectionMatrix` y matriz inversa de la cámara. Multiplica las coordenadas físicas **de la misma escena Three.js**, no ancla el dibujo a la pantalla.
- Se verifica la proyección dentro del viewport antes de habilitar `FIJAR` y se comunica con un texto discreto si el objetivo está fuera de cuadro.
- `#mini` y `#miniBtn` se esconden durante la calibración (anteriormente el CSS usaba un selector descendiente incorrecto: los elementos eran hermanos del stage).
- Si WebGL XR resulta invisible en algún Android, la capa SVG proyectada mantiene visibles plataforma y sólidos, como ruta de compatibilidad; no reemplaza el motor de física.
- Sin cambios en los motores de Color Rush, Ball Rush, Territorio X, Muro Rush, ni en Supabase.

Prueba ejecutada en Chromium con frame WebXR simulado (cámara 390×844, proyección perspectiva local, base en punto `hit-test`): geometría SVG proyectada sobre el piso, cambio de coordenadas al mover la cámara, plataforma visible y botón FIJAR habilitado solamente cuando está en cuadro, minivista escondida, cero errores JS. Prueba separada con cámara mirando fuera de cuadro: cero polígonos, FIJAR deshabilitado. Regresión demo 3D: coloca una pieza y altura computada, cero errores.

**Limitación**: pruebas simuladas del fotograma de XR y del navegador, no prueba física de ARCore en el teléfono de la captura. Se requiere feedback visual del usuario después de desplegar la corrección.
