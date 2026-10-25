# RITMO CAOS — guía técnica y verificación

**Fecha:** 25/10/2026. **Rama de desarrollo:** feat/ritmo-caos-20261025.

## Archivos nuevos

- /ritmo.html — selector musical, cinco colores, HUD, colocación de pista y pantallas de resultado, demo 2D.
- /ritmo-core.js — mapas de ritmo deterministas, puntuaciones, precisión, combos, sostenidas, límites de movimiento.
- /ritmo-audio.js — tres bandas sonoras originales sintetizadas con Web Audio, transportadas por AudioContext.currentTime.
- /ritmo-art.js — render de pista en perspectiva con SVG colocado sobre plano AR (DOM overlay) y render 2D Canvas para demo.
- /ritmo-runtime.js — acople al motor WebXR, posición relativa al anclaje, selección de carril inicial, calibración de un segundo, filtros y pausa por pérdida de pose.
- /tests/ritmo.test.cjs — 36 combinaciones de mapa, espacio y dificultad; aciertos, fallos, sostenidas, pausa, finalización.

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

El mapa deriva de compases y patrones melódicos deterministas; no se coloca música de terceros. La dificultad varía densidad, carriles habilitados y transiciones. Los mapas limitan cada salto lateral según metros por carril y tiempo transcurrido, con referencia conservadora de 0,70 m/s, más margen adicional de 0,12 m.

## Verificación realizada (sin confundir con Android real)

- Conexiones Github y Vercel inspeccionadas; rama aislada creada, cambios versionados.
- Sintaxis de los cuatro archivos JavaScript validada en un intérprete JavaScript.
- Suite /tests/ritmo.test.cjs ejecutada en intérprete aislado con dependencias de asserts simuladas: **PASS**.
- 36 combinaciones de canción, dificultad y ancho evaluadas: tiempos estrictamente crecientes, carriles válidos, límite físico de transición, nota acertada y fallada, reinicio y finalización.
- Simulación de sostenida y pausa pasada.
- No se ha ejecutado AR físico, pruebas reales de cámara, render de DOM overlay o audio en Chrome Android.
- No se han comprobado todavía 60 FPS reales, calidad audible de las composiciones ni comportamiento tras interrupciones de la app.
- No se ha implementado ni afirmado multijugador sincrónico; modo en solitario es el objetivo de esta entrega.

## Estado del despliegue

Se solicitó un despliegue **preview** en el proyecto Vercel de Modo Caos. El primer intento devolvió validación de campo target (se corrigió). El segundo fue rechazado por **HTTP 402, código api-deployments-free-per-day**: se superó la cuota diaria de 100 despliegues del equipo. No hay URL pública nueva verificada para Ritmo Caos en este punto. El arcade original y el Supabase compartido no fueron modificados.

**Pasos necesarios antes de publicar:** desbloquear cuota de despliegues, crear preview de la rama, comprobar rutas /ritmo.html y scripts con HTTP 200, ejecutar una ronda completa en Chrome Android con ARCore, verificar que el teléfono se mueve físicamente entre cinco círculos en el piso, validar audio/lane/latencia, pérdida de seguimiento y reinicio; revisar regresión de Color Rush, Ball Rush, Territorio X, Muro Rush y otros juegos actuales. Después se puede aprobar la integración a main y publicar.

## Limitaciones conocidas

- No se usa reconocimiento de pies. El teléfono representa al jugador: debe desplazarse con él.
- Audio generado por osciladores y percusión sintética en Web Audio. La musicalidad y producción final deben escucharse/probarse en equipo real.
- Efectos AR en capa SVG proyectada sobre el suelo, no modelos GLB PBR. Los materiales 3D premium y el espectáculo de concierto requieren revisión visual real.
- Las notas deslizantes se representan visualmente pero no hay todavía comprobación de trayectoria continua; la puntuación de slide usa el carril de destino, al igual que las simples. Las notas "especiales" dan puntos adicionales. Esto NO cumple por completo el requisito avanzado de slides.
- La calificación PERFECTO/GENIAL/BIEN utiliza posición respecto al centro y la ventana temporal de impacto, no una pulsación musical del usuario, ya que el juego es de ocupación de carril.
- La apertura de la cámara, el Hit Test, los gestos para mover/rotar/escalar y el anclaje dependen de /engine.js sin cambios; hay que verificarlo en el dispositivo destino.
