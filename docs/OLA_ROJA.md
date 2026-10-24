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

La pista no se mueve después de FIJAR. La posición se proyecta sobre las coordenadas locales del world matrix de /engine.js. La casilla elegida al calibrar determina la traslación de referencia, sin desplazar el tablero. El desplazamiento se obtiene de la traslación del teléfono, no de giros de cámara. Se usa histéresis del 8% de baldosa e invulnerabilidad de 1,55 s tras recibir daño. Un salto instantáneo mayor que 34 cm pausa y exige recalibración. Un fotograma XR inválido congela el core de inmediato y se requiere al menos 500 ms de seguimiento continuo para reanudar; un corte del render XR también deja de avanzar el tiempo, protegiendo de daños por falta de pose.

## Patrones y eventos

Frontal, trasera, lateral, doble, serpiente, corredor móvil, falsa alarma, caos. Generador con xorshift32 y validación temporal de ruta alcanzable a ~0,7 m/s mediante BFS de casillas. Primero aparecen advertencias amarillas, inclusive amenazas que NO se vuelven rojas (falsas alarmas). Los rojos se desplazan por pasos visibles, con energía animada. El planificador mantiene un intervalo mínimo de 0,55 segundos de separación de los impactos entre oleadas consecutivas incluso al cambiar de fase; si no encuentra un patrón alcanzable, usa una alternativa conservadora. Verificar velocidades en dispositivos reales. Eventos de escudo, tiempo lento, zona segura, inversión y tormenta.

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

Vercel project: **modo-caos**, no el antiguo color-rush-ar-demo. Si Vercel no publica por cuota temporal, conservar commit y rama versionada, NO afirmar enlace público. GitHub Pages requiere habilitación inicial por titular del repositorio; no disponible automáticamente con permisos de Github Actions.
Como opción **solo de prueba**, se comprueba la alternativa pública HTTPS raw.githack.com basada en este mismo repositorio. Esta alternativa depende de un tercero, no tiene SLA y puede no ofrecer todas las políticas de permisos XR de Vercel. Nunca denominarla lanzamiento de producción. Usar solo después de validar HTTP, dependencias JS y juego en Chromium remoto. Los demás juegos y el engine.js no se alteraron.

## Mejoras de calibración y lectura de oleadas (revisión 2)

- Tamaño físico inicial: **2,40 × 2,40 m**, 6 casillas por lado de **40 cm**. Antes eran 2,70 m y 45 cm; sigue siendo ajustable con dedos o controles de 2,5 cm.
- Durante la vista previa, botón **CENTRAR PISTA DEBAJO DE MÍ**. Proyecta el teléfono sobre el suelo y sitúa el centro de la casilla 4-4 aproximadamente ahí; en el mismo gesto fija la pista. El teléfono no revela la ubicación exacta de los pies: el jugador puede seleccionar cualquier otra casilla visible y recalibrar durante un segundo. Una vez fijada, no se cambia la posición del tablero al calibrar.
- La primera amenaza se anuncia aproximadamente **3,25 segundos antes**, después 3,05 y finalmente 2,80 según la fase. Las casillas amarillas se pintan 2,35–2,75 segundos antes de la transición a rojo, en vez de ~1 segundo.
- Un **radar 6×6** persistente y discreto en AR muestra dónde está **VOS**, rojo actual y ámbar proyectado para las próximas dos filas/columnas de peligro, con texto de origen/dirección y segundos hasta el próximo impacto.
- Un aviso de orientación nombra origen según el tablero (arriba/abajo/izquierda/derecha), no según la brújula: es necesario mirar la pista o el radar para determinar físicamente la dirección.
- Las pruebas del core verifican que aparecen pistas amarillas con >2 s de margen y que se muestra el patrón siguiente. Las pruebas de WebXR simulado deben confirmar que el móvil queda centrado en 4-4 y que tocar FIJAR no desplaza el piso posteriormente. La velocidad siempre debe probarse caminando en una habitación despejada; **no se requiere ni se recomienda correr**.

Validación pendiente de **Chrome Android + ARCore físico** del usuario: los tests de navegador realizan poses simuladas y no sustituyen el dispositivo real.
