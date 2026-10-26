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
- Escenario ampliado: fondo acuático de **14 × 33 unidades**, islas laterales y ambientación de punta a punta, anclado sobre el piso físico. Escala AR inicial `0.36`: aproximadamente **6,66 m de ancho × 11,88 m de largo**, escalable entre `0.19` y `0.62`, sin alterar físicas lógicas. El usuario no necesita caminar por esa distancia: el desplazamiento del caballero es virtual, por joystick. WebXR sigue físicamente al teléfono y no ofrece seguimiento corporal; girar el dispositivo para apuntar es normal.
- Modo 3D: cámara libre orbital con zoom, joystick relativo a la cámara y ajuste dinámico de calidad.
- Archivos: `mini-worlds-characters.js`, `assets/mini-worlds/characters/*.gltf`, `tests/mini-worlds-characters.test.cjs`.
- Todo se conserva en el PR de previsualización **#69**, sin tocar `main` ni Supabase compartido.
- **Pendiente antes de producción:** test real en Chrome Android, ARCore hit-test/ancla, calidad de las animaciones, CORS de Knight GLB, FPS/temperatura y confirmación de un deployment Vercel de esta revisión exacta.

## Ampliación del recorrido jugable (misma rama)
- Cada nivel tiene ahora **14 plataformas jugables**, 8 de la ruta principal más 6 islas laterales conectadas.
- **64 monedas**, **18 cajas** (incluidas reforzadas, sorpresas y secretos), **9 enemigos normales**, **3 estrellas escondidas** y un jefe de tres fases por nivel.
- Los límites interiores y las posiciones de monedas y enemigos se validan en **ambos niveles**; la función `ensureLand` proyecta coleccionables mal ubicados sobre una plataforma disponible, conservando hitboxes y la física.
- Los segmentos laterales realmente permiten caminar y recolectar; no son meramente decorativos. El mar y las orillas exteriores ocupan 18,5 × 33 unidades en el render de Three.js.
- `tests/mini-worlds.test.cjs` incluye ahora un décimo control: todas las islas opcionales tienen conexión y no existen monedas, cajas, estrellas ni enemigos terrestres sin piso; 10/10 simulaciones aprobadas.

## Corrección de AR vacío — captura de prueba del usuario (26/10/2026)
- Evidencia física: Chrome Android y ARCore encuentran piso, muestran texto de pista de ~11,9×6,7m y botón FIJAR MUNDO, pero el escenario 3D no se ve en el encuadre. **No se declara solucionado en un teléfono hasta repetir prueba en ARCore**.
- Nuevo `mini-worlds-ar-guide.js` proyecta en el DOM overlay el polígono de la isla inicial y otras siete plataformas, usando exactamente la matriz del frame XR (viewer projection × inverse camera pose × stage.root.matrixWorld). No es un mock de cámara: solo se usa la pose nativa del dispositivo; el polígono debe aparecer donde se sitúa físicamente el objeto.
- Retícula física adicional como tres meshes visibles en `stage.previewBeacon` con materiales `MeshBasicMaterial` y `depthTest:false` para diagnosticar render WebGL, sin tapar UI.
- El rumbo del escenario ahora se fija con `frame.getViewerPose(...)` en la primera lectura válida del piso. El mundo deja de girar cuando el usuario mueve el teléfono durante la colocación.
- El botón FIJAR MUNDO requiere que el inicio se encuentre en el campo visual cuando la pose nativa está disponible. La calibración no mueve el mundo una vez fijado.
- Fallos de animaciones o GLTF no deben detener el `renderer.render`; el HUD muestra el número de llamadas de dibujo de WebGL en colocación. **Si el contador indica cero**, aislar render WebGL sin confundirlo con hit-test.
- Tests: `tests/mini-worlds-ar-visibility.test.cjs` con escenario proyectado dentro/fuera de cámara y presencia de callbacks nativos, separado de simulaciones del motor físico.
- Este cambio sigue en PR #69; ninguna modificación a otros minijuegos o producción.

## Captura AR durante partida: cámara + HUD + joystick, sin mundo 3D (26/10/2026)
- El usuario volvió a confirmar en **foto real** un mundo totalmente invisible incluso después de comenzar la partida (cronómetro 0:03, 3 corazones, joystick, atacar, saltar; ningún mesh visible). Por lo tanto, la corrección anterior de orientar el mundo y proyectar guía no solucionó el problema físico.
- Hipótesis técnica de compositor: con DOM Overlay activado (`domOverlay:{root:document.body}`), el mismo canvas HTML de Three.js seguía visible (`#viewport canvas{display:block}`) mientras el contenido real se dibujaba al framebuffer `XRWebGLLayer`. El canvas visible puede cubrir la capa XR. **Cambio nuevo:** `body.mw-immersive-ar #viewport canvas{display:none!important}`, más ocultamiento explícito del elemento canvas tras `await renderer.xr.setSession(session)`, reactivación al salir. El mundo 3D continúa renderizado mediante `renderer.render` al framebuffer XR.
- Nuevo botón discreto `AR OK · OBJETOS 3D N · MOSTRAR GUÍA` durante juego AR: confirma si existe capa XR y cuántas draw calls de Three se emiten; si está en cero, revisar la lógica/scene render. Si N > 0 y la cámara permanece vacía, diagnosticar compositor/oclusiones. La guía espacial se puede activar al tocar el botón incluso jugando.
- Test `tests/mini-worlds-ar-visibility.test.cjs` amplió la validación de compositor DOM, limpieza y diagnostic toggle; pasó en simulación JS. También aprobaron 10/10 reglas core y sintaxis de 6 scripts.
- **No afirmar que esto arregla el AR en ARCore hasta ver nueva prueba física.** La misma captura puede servir para determinar si quedan fallas de GPU o cámara después del cambio.

## Solución de referencia: compositor AR de RODEADOS 360 (26/10/2026)

**Problema confirmado por prueba física de usuario:** `AR OK · OBJETOS 3D 753`, cámara y HUD vivos, pero ningún objeto del juego visible. No es problema de cargar GLB, calibración o detección de piso. `render.calls > 0` solo verifica que Three.js envió geometría a un framebuffer; **no** confirma que ARCore presente esos píxeles.

**Comparativa real de código:**
- `rodeados-runtime.js` y `rodeados-ar-compositor.js` (rama main) utilizan una capa WebGL HTML transparente *dentro del DOM overlay XR*, sincronizada con la cámara de WebXR, porque algunos Android muestran passthrough/DOM pero no el framebuffer nativo 3D. El renderer nativo se utiliza solo para actualizar la cámara XR y dibuja `nativeXRScene` vacío.
- Esta rama agrega `mini-worlds-ar-compositor.js` siguiendo el mismo patrón probado en RODEADOS: `WebGLRenderer(alpha:true,premultipliedAlpha:true,antialias:false)`, fondo alfa cero y cámara de perspectiva con `matrixWorld`, `matrixWorldInverse` y `projectionMatrix` copiados del ojo XR nativo. La escena 3D original completa, personajes y mapa reciben esa cámara; **las posiciones quedan físicamente ancladas** a la matriz del piso.
- HTML crea `#arWorldOverlay` independiente de `#arFloorGuide` y del HUD, con canvas transparente que **sí queda visible**; el canvas del renderer XR nativo sigue oculto para no tapar la capa.
- `mini-worlds-runtime.js`: en modo AR `renderer.render(xrEmptyScene,camera)` actualiza la cámara XR y `arCompositor.render(view,renderer.xr.getCamera(camera))` dibuja la isla y los modelos encima de la cámara. En modo 3D se mantiene el flujo original, sin compositor.
- Estado de diagnóstico `AR VISIBLE · DIBUJO 3D N` informa las llamadas reales del compositor, o `AR SIN COMPOSITOR` y error visible si la capa no inicia. Se conserva guía geométrica del piso activable por jugador. Cierre y cambio de tamaño limpian/redimensionan el canvas adicional.
- Tests: `tests/mini-worlds-ar-compositor.test.cjs` prueba copia fiel de matrices de la cámara nativa, escena 3D correcta, materiales de transparencia del renderer, resize y cleanup. `tests/mini-worlds-ar-visibility.test.cjs` verifica guías y overlay.

**Limitación:** la revisión está testeada con simulación JS y comparación de arquitectura con RODEADOS, pero no hay prueba física de ARCore de MINI WORLDS aún. Se requiere nueva captura AR tras desplegar esta rama. `main` y producción original permanecen intactos.

## Revisión de jugabilidad y arte (26/10/2026, feedback visual del usuario)

El usuario confirmó con captura AR real la composición exitosa del mundo y el caballero, pero informó caídas falsas sobre tierra, golpe/KO poco satisfactorios y gráficos saturados de vegetación.

**Corrección física estructural**
- `level()` ahora crea **13 causeways con física y malla visible idénticamente posicionadas** por nivel: 7 cruces en la ruta principal y 6 accesos a islas laterales. Los corredores son de 1,70–2,25 unidades de ancho, con una interpolación suave de altura entre las elevaciones vecinas.
- `platformY()` valida el contacto sobre las mismas huellas visuales de plataformas y caminos. La actualización del jugador sube automáticamente desniveles transitables de hasta 0,46 unidades y baja de manera segura hasta 0,55, pero conserva salto doble y caídas auténticas fuera de la tierra.
- Se probaron automáticamente en ambos mundos **todas las rutas principales y los seis ramales**, caminando con el joystick virtual y sin saltos ni fotogramas sin contacto con el suelo. Es una **simulación core**, no una afirmación sobre la precisión física de ARCore real.

**Nuevo combate y recompensas**
- Se corrigió el bug `emit(s,type,data)`: al usar `{type,...data}`, el nombre del evento era sustituido por `type:'patrol'` o `type:'normal'`; impedía que `enemyHit`, `enemyDown`, `boxHit` y `boxBreak` llegaran a sus efectos. Ahora el nombre manda y se conserva `kind` para el subtipo.
- Eventos de ataque con coordenadas 3D exactas de enemigos, cajas y recompensas. Anillos de impacto, estelas de espada, partículas en el objetivo, vibración/sonido distintos para golpe y KO, recompensa `+3` anunciada y desaparición progresiva de enemigos durante ~550 ms.
- Sombras de contacto baratas bajo caballero y enemigos para identificar posición/altura sin exigir shadow maps reales.

**Dirección artística y rendimiento**
- Se dibuja el terreno de los causeways como malla física real, con rampas y bordes visibles; tonos de arena, selva, roca y agua más coherentes.
- Se redujeron palmeras/arbustos/rocas duplicados, liberando recorridos y disminuyendo los GLB clonados y draw calls potenciales. Se conserva la biblioteca de 19 GLB Kenney y los personajes KayKit/Quaternius.
- Minimapa opcional (botón mapa) con trazado de puentes, zonas, enemigos, jefe y posición/orientación del caballero; el diagnóstico AR queda oculto en juego normal y se activa con `?debug=1`.
- El compositor AR adapta resolución según FPS después de ventanas de 180 cuadros, sin alterar reglas físicas ni la ubicación espacial de los objetos.

**Pruebas**: tests originales core 10/10; `tests/mini-worlds-traversal.test.cjs` para ruta y combate; módulos JS con sintaxis válida, HUD completo y tests del compositor. El preview de esta nueva revisión debe verificarse en Vercel y luego probarse físicamente en Chrome Android antes de marcar la experiencia AR como aprobada.

**Limitaciones**: gráficos aún son **low-poly estilizados**, no modelos fotorrealistas ni calidad de consola demostrada; sin medición de FPS en hardware ni prueba de golpes/táctil en el dispositivo del usuario. No se fusionó `main` ni se editó Supabase.

## Mejoras tras prueba visual en AR del 26/10: saltos a islas, cajas, océano, recompensas

**Problemas confirmados por las capturas del usuario:** zonas que parecían tierra firme sin colisión real; el caballero caía cuando intentaba llegar a islas laterales; no se podía aterrizar o permanecer sobre cajas; feedback débil de monedas/KO/cajas; agua visualmente plana. Los cambios que siguen son de preview, no se declara todavía aprobación física de Android.

### Física y terrenos
- `platformY(s,x,z,margin=0)` admite una zona reducida de aterrizaje `margin=.17` cuando se cae cerca del borde de una isla: amortigua fallas injustas sin transformar el mar en piso.
- `BOX_TOP=.59` empareja la tapa física de la caja con `makeBox` y sus visuales GLB (altura ~.6). Separar la colisión lateral del aterrizaje desde arriba permite **pisar la caja, sostenerse y saltar**. Se borra `onBox` si la caja se destruye y el héroe cae al suelo verdadero.
- Se eliminaron las placas arenosas ornamentales de `sprawlingEnvironment` situadas a ±6.5 unidades que parecían islas transitables pero carecían de hitbox. Fueron sustituidas por rocas pequeñas semisumergidas claramente NO transitables.
- No se alteraron los 13 causeways realmente transitables de cada nivel ni el anclaje WebXR.

### Agua, arte y señales
- Océano creado mediante `ShaderMaterial` transparente y una malla de 18.5×33 unidades (24×42 subdivisiones). Tres ondas temporales en el shader de vértices, agua profunda/superficial, ondas refractadas y destellos en fragmentos. `uTime` se actualiza cada frame.
- Espuma suave de costa en una única `LineSegments` con geometría compartida para los perímetros de las 14 plataformas; opacidad suavemente animada. Se eliminó el disco de agua opaco sobre el escenario antiguo.
- Texturas procedurales reutilizables de 128×128 para arena, césped y piedra, generadas desde una semilla estable y compartidas entre materiales; sin peticiones de red.
- Los colores conservan una dirección artística **3D estilizada**. Sigue pendiente revisión visual de WebGL real en el móvil; no se promete fotorrealismo.

### Efectos de recompensa
- Los eventos `coin` y `bonus` transmiten ahora coordenadas 3D del objeto. Carteles `+1`, `+N`, `CRACK!`, `HIT!` y `KO! +3` como sprites orientados a cámara y anclados en el mundo, con `CanvasTexture` cacheadas.
- Las cajas expulsan ocho fragmentos 3D en su posición, con gravedad y giro; las monedas generan partículas y recompensas ascendentes. El sonido de monedas, impactos y destrucción gana una capa corta adicional; menos avisos centrales que tapan el escenario.
- Se corrigió la liberación de recursos de sprites compartidos, fragmentos, partículas y texturas al cerrar la escena.

### Verificaciones
- `tests/mini-worlds-physics-polish.test.cjs`: 12 saltos a islas laterales (seis por nivel), permanencia sobre cajas, salto desde su tapa y eliminación de colisión tras destruirlas, caída genuina al agua, eventos de moneda con coordenadas, componentes de agua y VFX.
- Se mantienen los 10 tests del motor, el test de recorrido y los del compositor WebXR, además de sintaxis JS y coincidencia de IDs HTML. Estas pruebas **no sustituyen** una prueba física en Chrome Android/ARCore con escena y FPS.
- Sin cambios en `main`, juegos existentes o Supabase compartido.
