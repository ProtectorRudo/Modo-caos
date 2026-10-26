# MINI WORLDS — aventura AR modular (preview, 26/10/2026)

**Rama:** `feature/mini-worlds-20261026` · No mezclar con main sin probar en Android.

## Alcance entregado
- `/mini-worlds.html`: menú propio, dos niveles disponibles por progresión, HUD y controles táctiles.
- `/mini-worlds-core.js`: física semideterminística a 60 Hz, gravedad, salto y doble salto, coyote time, buffer de salto, 3 corazones, reaparición/checkpoints, plataformas irregulares, colisión sólida con cajas, daño con inmunidad, monedas, estrellas, cuatro clases de enemigos, proyectiles y jefe con tres fases.
- `/mini-worlds-art.js`: escenas geométricas 3D totalmente originales: isla, palmeras, ruinas, cascada, playa, puente, cristales y rocas del acantilado; personaje Orin, enemigos, cajas reforzadas, estrellas, monedas, cangrejo mecánico y efectos.
- `/mini-worlds-runtime.js`: Three.js 0.160.1, render WebGL, modo 3D sin cámaras con órbita y zoom, calidad dinámica para móviles, joystick, saltar y golpear, WebAudio original, vibración opcional, `localStorage`, pausa y WebXR `immersive-ar` con `hit-test` y `dom-overlay`.
- `/mini-worlds-assets.js`: carga opcional progresiva de 19 modelos GLB locales, decoración orgánica por sectores y reemplazo visual de monedas, estrellas y cajas. No cambia reglas ni hitboxes. Si una carga falla, queda el modelo 3D original.
- Menú general enlaza el juego exclusivamente en la rama.
- Niveles: **La Isla Despierta** y **El Acantilado Perdido**. Para evitar promesas exageradas, los otros 16 niveles de la hoja de ruta no existen todavía.

## Controles
Móvil: joystick circular izquierda; saltar y golpear derecha, con multi-touch.
Escritorio: WASD/flechas, Espacio, J/K.
AR: superficie horizontal, gesto 1 dedo mover, 2 dedos rotar/zoom, botones girar y cambiar escala, **FIJAR MUNDO**. AR real es distinto al modo 3D.
El escenario permanece asociado al hit-test/ancla espacial del teléfono; movimiento del avatar por joystick, no hay tracking de pies.

## Materiales y licencias
El protagonista ORIN, el jefe, la geometría base, los efectos y la música sintetizada son originales. Además hay **19 modelos Kenney bajo CC0** — 14 Nature Kit y 5 Platformer Kit — alojados dentro de `assets/mini-worlds/kenney/`. Fuente concreta, licencia y lista individual: [LICENSE_AND_SOURCES.md](../assets/mini-worlds/LICENSE_AND_SOURCES.md).
Librería externa: Three.js 0.160.1, licencia MIT, importada desde jsDelivr y con respaldo en unpkg. El motor 3D requiere internet al primer uso.

## Pruebas
- `node tests/mini-worlds.test.cjs`: 9 pruebas de estados, física, saltos, cajas, monedas, estrellas, enemigos, proyectiles, daño, checkpoint, jefes y pausa. Corridas en entorno JS aislado y aprobadas.
- Sintaxis de los tres ficheros JavaScript inspeccionada y compilada.
- **No verificado**: ejecución gráfica real en teléfono, rendimiento 30–60 FPS, carga GLB *en WebGL real*, permisos de cámara, seguimiento espacial WebXR/ARCore, controles multitáctiles, ni transiciones de niveles reales. Mantener estatus de PREVIEW hasta completar.
- **Despliegue de preview:** la creación manual vía API devolvió HTTP 402 `api-deployments-free-per-day`, pero el despliegue automático desde GitHub completó **READY** el 26/10/2026 para commit `6293a922e214f5b3dab427c81b0d49d19b8c7b8b` en la URL `https://modo-caos-ej95846tk-protector-rudo-s-projects.vercel.app/`. Vercel Web Fetch confirmó HTTP 200 en `/mini-worlds.html`, `/mini-worlds-core.js`, `/mini-worlds-art.js`, `/mini-worlds-runtime.js` y `/index.html`. El preview tiene SSO: para compartirlo, usar URL temporal con `_vercel_share`. Esto **no prueba** controles ni render gráfico en hardware.
- Sin migraciones Supabase, sin cambios en tablas ni credenciales, sin afectar otras rutas.

## Próximas validaciones antes de publicación
1. [COMPROBADO] Vercel preview READY del commit con lógica y docs iniciales; rutas `/mini-worlds.html` y tres JS con HTTP 200.
2. Usar Chrome desktop y Chrome Android para probar joystick multitáctil, salto, golpes, cajas, enemigos, final del jefe, guardado y segundo nivel.
3. Probar permiso AR/hit-test, fijación, escala, orientación, ancla, cambio de nivel sin recalibrar y pérdida de tracking en dos Android ARCore.
4. Ajustar balance, rendimiento y geometrías con capturas físicas. Efectuar controles de regresión sobre /color.html, /ball.html, /territorio.html, /muro.html, /cuadrante.html y los otros juegos.
5. Sólo después de pruebas correctas y aprobación explícita, integrar en main.

## Nota de ingeniería
La versión contiene núcleo y contenidos jugables de dos aventuras pero **no constituye todavía los 18 niveles ni una versión certificada en móviles**. Evitar llamar "terminada" a la versión hasta verificar el recorrido completo en navegador real.

## Arte GLB (upgrade en rama)
- 19 recursos GLB verificados en GitHub (370.788 bytes en total), todos locales y con licencia CC0 de Kenney.
- Modelos importados con `GLTFLoader` dinámico compatible con importmap de Three.js. Fallo de recursos no detiene la partida.
- **Importante:** el último deploy READY comprobado puede contener una revisión anterior de la rama. No atribuir los 19 modelos a un link Vercel sin verificar el hash de commit del deployment y las rutas de assets.

## Actualización: caballero, monstruos y jefes gigantes — 26/10/2026
- Personaje principal seleccionado: **Knight de KayKit Adventurers**, GLB con rig y animaciones, cargado automáticamente desde GitHub público (aún pendiente de redistribución local por tamaño).
- Enemigos: **Cute Animated Monsters** de Quaternius, 6 especies en 4 roles. Ocho modelos `.gltf` integrados en GitHub incluyendo jefes, todos con esqueletos, animaciones y recursos embebidos (modelos validados estructuralmente).
- **Nivel 1: DRAGÓN DORADO** (YellowDragon), **Nivel 2: REY YETI** (Yeti); los dos gigantes tienen interfaz de núcleo vulnerable y conservan 3 fases del motor.
- Escenario ampliado: fondo acuático de **14 × 33 unidades**, islas laterales y ambientación de punta a punta, anclado sobre el piso físico. Escala AR inicial `0.36`: aproximadamente **5,04 m de ancho × 11,88 m de largo**, escalable entre `0.19` y `0.62`, sin alterar físicas lógicas. El usuario no necesita caminar por esa distancia: el desplazamiento del caballero es virtual, por joystick. WebXR sigue físicamente al teléfono y no ofrece seguimiento corporal; girar el dispositivo para apuntar es normal.
- Modo 3D: cámara libre orbital con zoom, joystick relativo a la cámara y ajuste dinámico de calidad.
- Archivos: `mini-worlds-characters.js`, `assets/mini-worlds/characters/*.gltf`, `tests/mini-worlds-characters.test.cjs`.
- Todo se conserva en el PR de previsualización **#69**, sin tocar `main` ni Supabase compartido.
- **Pendiente antes de producción:** test real en Chrome Android, ARCore hit-test/ancla, calidad de las animaciones, CORS de Knight GLB, FPS/temperatura y confirmación de un deployment Vercel de esta revisión exacta.
