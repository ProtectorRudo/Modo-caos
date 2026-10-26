# MINI WORLDS — aventura AR modular (preview, 26/10/2026)

**Rama:** `feature/mini-worlds-20261026` · No mezclar con main sin probar en Android.

## Alcance entregado
- `/mini-worlds.html`: menú propio, dos niveles disponibles por progresión, HUD y controles táctiles.
- `/mini-worlds-core.js`: física semideterminística a 60 Hz, gravedad, salto y doble salto, coyote time, buffer de salto, 3 corazones, reaparición/checkpoints, plataformas irregulares, colisión sólida con cajas, daño con inmunidad, monedas, estrellas, cuatro clases de enemigos, proyectiles y jefe con tres fases.
- `/mini-worlds-art.js`: escenas geométricas 3D totalmente originales: isla, palmeras, ruinas, cascada, playa, puente, cristales y rocas del acantilado; personaje Orin, enemigos, cajas reforzadas, estrellas, monedas, cangrejo mecánico y efectos.
- `/mini-worlds-runtime.js`: Three.js 0.160.1 cargado desde CDN, render WebGL, modo 3D libre sin cámaras, joystick, saltar, golpear, retroalimentación WebAudio original y vibración opcional, `localStorage` para récords/desbloqueos, pausa y menú, y WebXR `immersive-ar` con `hit-test` y `dom-overlay`.
- Menú general enlaza el juego exclusivamente en la rama.
- Niveles: **La Isla Despierta** y **El Acantilado Perdido**. Para evitar promesas exageradas, los otros 16 niveles de la hoja de ruta no existen todavía.

## Controles
Móvil: joystick circular izquierda; saltar y golpear derecha, con multi-touch.
Escritorio: WASD/flechas, Espacio, J/K.
AR: superficie horizontal, gesto 1 dedo mover, 2 dedos rotar/zoom, botones girar y cambiar escala, **FIJAR MUNDO**. AR real es distinto al modo 3D.
El escenario permanece asociado al hit-test/ancla espacial del teléfono; movimiento del avatar por joystick, no hay tracking de pies.

## Materiales y licencias
Todos los modelos, geometrías, decoraciones, partículas y música generativa son originales y programáticos en este desarrollo: no se integraron descargas ajenas, así que no se han añadido obligaciones de atribución de assets.
Librería externa: Three.js 0.160.1, licencia MIT, importada desde jsDelivr y con respaldo en unpkg. El motor 3D requiere internet al primer uso.

## Pruebas
- `node tests/mini-worlds.test.cjs`: 9 pruebas de estados, física, saltos, cajas, monedas, estrellas, enemigos, proyectiles, daño, checkpoint, jefes y pausa. Corridas en entorno JS aislado y aprobadas.
- Sintaxis de los tres ficheros JavaScript inspeccionada y compilada.
- **No verificado**: ejecución gráfica real en teléfono, performance 30–60 FPS, permisos de cámara, seguimiento espacial WebXR/ARCore, pruebas táctiles en navegadores móviles, ni transiciones de niveles reales. Mantener estatus de PREVIEW hasta completar.
- **Limitación de despliegue:** Vercel API devolvió HTTP 402 `api-deployments-free-per-day` al solicitar un nuevo preview el 26/10/2026. No se ha publicado esta rama en Vercel. No asumir que otros deployments de Modo Caos contienen estos cambios.
- Sin migraciones Supabase, sin cambios en tablas ni credenciales, sin afectar otras rutas.

## Próximas validaciones antes de publicación
1. Vercel preview READY del último commit, rutas /mini-worlds.html y tres JS con HTTP 200.
2. Usar Chrome desktop y Chrome Android para probar joystick multitáctil, salto, golpes, cajas, enemigos, final del jefe, guardado y segundo nivel.
3. Probar permiso AR/hit-test, fijación, escala, orientación, ancla, cambio de nivel sin recalibrar y pérdida de tracking en dos Android ARCore.
4. Ajustar balance, rendimiento y geometrías con capturas físicas. Efectuar controles de regresión sobre /color.html, /ball.html, /territorio.html, /muro.html, /cuadrante.html y los otros juegos.
5. Sólo después de pruebas correctas y aprobación explícita, integrar en main.

## Nota de ingeniería
La versión contiene núcleo y contenidos jugables de dos aventuras pero **no constituye todavía los 18 niveles ni una versión certificada en móviles**. Evitar llamar "terminada" a la versión hasta verificar el recorrido completo en navegador real.
