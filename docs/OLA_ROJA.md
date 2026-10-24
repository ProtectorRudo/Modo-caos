# OLA ROJA — especificación, implementación y estado de validación

Actualizado: 24/10/2026.

## Alcance

Nuevo juego físico de Modo Caos: **el jugador es la persona real**. La cuadrícula es 6×6; cámara del teléfono en Chrome Android + WebXR Hit Test, pista anclada al suelo mediante /engine.js, elección explícita de la celda donde se encuentra la persona y calibración de ~1 segundo quieto. **NO** hay joystick en realidad aumentada. El seguimiento espacial del teléfono representa de forma aproximada la ubicación de la persona; no rastrea sus pies. No exige correr ni saltar.

## Archivos

- /ola.html: menú, HUD, pista AR y selector de casilla, pausa, resultados, sonido y modos.
- /ola-core.js: motor independiente con semilla, 8 patrones, telegráficos amarillo/rojo, lógica de tres vidas, puntos, combos, invulnerabilidad, victoria/derrota, infinito.
- /ola-art.js: WebGL para 36 baldosas world-locked (renderiza luego de limpiar el XR framebuffer) + Canvas para demo 2D.
- /ola-runtime.js: entrada XR, seguimiento espacial 2D del móvil relativo a W, calibración de una casilla, movimiento en metros, tolerancia ante saltos de ARCore, pausa de tracking, HUD, sonidos, récord y compartir.
- /tests/ola.test.cjs: lógica y colisiones.
- /tests/ola-browser.test.cjs: navegador Chromium móvil real en modo 2D.
- /tests/ola-xr-smoke.test.cjs: navegador y WebGL reales **con frames y poses WebXR simulados**.
- /.github/workflows/ola-tests.yml: pruebas y regresión automatizadas.

La pista no se mueve después de FIJAR. La posición se proyecta sobre las coordenadas locales del world matrix de /engine.js. La casilla elegida al calibrar determina la traslación de referencia, sin desplazar el tablero. El desplazamiento se obtiene de la traslación del teléfono, no de giros de cámara. Se usa histéresis del 8% de baldosa e invulnerabilidad de 1,55 s tras recibir daño. Un salto instantáneo mayor que 34 cm pausa y exige recalibración.

## Patrones y eventos

Frontal, trasera, lateral, doble, serpiente, corredor móvil, falsa alarma, caos. Generador con xorshift32 y validación temporal de ruta alcanzable a ~0,7 m/s mediante BFS de casillas. Primero aparecen advertencias amarillas; los rojos se desplazan por pasos visibles. Eventos de escudo, tiempo lento, zona segura, inversión y tormenta.

Modos: Clásico 90 segundos, Infinito con puntuación, récord local y compartir desde el celular. Demo 2D separada que permite control por toque/teclado explícitamente sin afirmar que simula seguimiento corporal.

## Controles AR

1. Encontrar piso con cámara.
2. Mover la pista con un dedo y escalar/rotar con dos dedos; ± y rotar opcionales.
3. FIJAR PISTA.
4. Elegir una celda dentro de la pista proyectada o central desde botón.
5. Mantener teléfono quieto ~1 s y ver marca VOS.
6. EMPEZAR, desplazarse caminando lentamente dentro del espacio despejado.
7. Botón ⊕ para RECALIBRAR sin mover la pista.

No habrá multiplayer en esta etapa. No se modifican bases Supabase de Viralio, ni Te Hice Esto. Alineación AR compartida sigue pendiente.

## Verificación

Pruebas automatizadas de core, regresión de minijuegos, Chromium 2D y WebXR sintético en GitHub Actions. Estas pruebas no sustituyen la ejecución física con Android/ARCore. Se debe validar con teléfono real la detección del suelo, escala correcta, ubicación de casilla, seguimiento caminando, latencia, colisiones, pérdida/relocalización de tracking, FPS y seguridad física antes de considerar el AR certificado.

## Publicación

Vercel project: **modo-caos**, no el antiguo color-rush-ar-demo. Si Vercel no publica por cuota temporal, conservar commit y rama versionada, NO afirmar enlace público. GitHub Pages requiere habilitación inicial por titular del repositorio; no disponible automáticamente con permisos de Github Actions. Los demás juegos y el engine.js no se alteraron.
