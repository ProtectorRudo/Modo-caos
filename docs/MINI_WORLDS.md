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

## Estabilidad espacial y joystick al caminar alrededor del mundo (26/10/2026)

**Problema real reportado:** con escenario AR y avatar visibles, al caminar con el teléfono para seguir al caballero los objetos parecían moverse y la dirección del joystick dejaba de ser intuitiva.

**Causas concretas encontradas en `mini-worlds-runtime.js`:**
1. `updateAnchor` reescribía `stage.root.position` en todos los frames desde `frame.getPose(anchor.anchorSpace,referenceSpace)`, sin conservar exactamente la colocación elegida ni suavizar las revisiones SLAM del ancla. Esos ajustes podían producir traslaciones visibles del escenario bajo el jugador.
2. El joystick en modo AR pasaba `input.x,input.z` directamente a la física como si los ejes de mundo no cambiasen en pantalla. Al rotar el teléfono, las instrucciones visuales «arriba», «abajo» y laterales dejaban de coincidir con la perspectiva de cámara.

**Cambios:**
- Nuevo módulo puro `mini-worlds-spatial.js`: cálculo de rumbo horizontal a partir de la orientación real de la cámara XR (descarta inclinación vertical), dirección de joystick relativa a cámara e inversión por rumbo del escenario, snapshot/restauración de posición, orientación y escala del mundo.
- `FIJAR MUNDO` crea `spatialLock` inmutable. `maintainWorldLock` restaura la misma transformación exacta de la raíz del escenario; los cambios posteriores de posición de XRAnchor NO reubican ni giran la isla automáticamente. El XRReferenceSpace local es el único marco de coordenadas de juego durante la sesión, y el usuario puede usar RECENTRAR de manera explícita.
- `XRAnchor` sigue disponible como diagnóstico de seguimiento: si una relocalización varía más de 0,42 m respecto de la observación inicial, se avisa suavemente que RECENTRAR podría ser necesario, sin teletransportar el mundo. Creación asíncrona con token de colocación evita anclas viejas si se recentra o cierra la sesión.
- El movimiento AR se calcula usando rumbo real de cámara vs rumbo fijo del mundo, y se **congela el rumbo de dirección de un mismo contacto del joystick** hasta levantar el dedo, para que girar físicamente el teléfono durante una maniobra no desvíe la trayectoria virtual a mitad del movimiento. Un toque nuevo toma la orientación actual del teléfono.
- Al cambiar de nivel, `newStage` recupera el snapshot exacto del mismo mundo, no recalibra siguiendo el móvil. Sin cambios a modo 3D demo.

**Regresión:** `tests/mini-worlds-spatial.test.cjs` valida 400 movimientos simulados de cámara, las direcciones en varios ángulos e inversiones respecto del mundo, rumbo estable durante la pulsación y un rumbo nuevo al volver a tocar. 10 tests previos y pruebas de islas/cajas continúan aprobados.

**Precaución física:** una transformación virtual fija no garantiza precisión espacial absoluta: ARCore/WebXR pueden sufrir drift o saltos de relocalización según textura, iluminación y movimiento del móvil. No afirmar 100% de estabilidad hasta test presencial sobre un camino real. Mantener al usuario atento a obstáculos físicos; NO pedir que siga físicamente el avatar ni que camine grandes distancias mirando la pantalla.

## Pasada de diversión, impacto y ritmo — 26/10/2026

**Objetivo aprobado:** pasar de un plataformas funcional a una aventura AR con recompensa continua, golpes con feedback claro, cajas sorpresa, combos visibles, Furia temporal y ambientación viva. Se mantiene la cámara XR, anclaje espacial, joystick relativo a cámara y física de suelo/cajas.

### Core determinista (mini-worlds-core.js)
- `chaos:{charge,fury,chain,window,best,bonusCoins}` por partida. Las monedas cargan +3, las cajas destruidas +16, los enemigos derrotados +25 y las estrellas +32. Con 100 puntos comienza **Furia durante 7 s**; no puede recargarse durante Furia.
- Rachas de acciones encadenadas (`advanceChain`) con reloj de 1,55 s para monedas y 3,3 s para cajas/enemigos; bonus en cadenas 3/5/8 por +3/+5/+8 monedas, respectivamente. Recibir daño corta cadena. La barra Furia se reinicia al activarse.
- Furia aumenta desplazamiento moderadamente (3,1→3,65 unidades/s), amplía el alcance de espada un 22%, aplica doble daño a enemigos/cajas, duplica monedas recogidas y recompensas de KO y cajas. Sigue sin inmortalidad ni teletransporte.
- Algunas cajas dan +5 monedas adicionales, un corazón si hace falta o un orbe de +18 de carga. Los resultados se eligen con una fórmula determinista por caja y nivel: **sin servicios remotos, dinero real ni azar de pago**.
- Magnetismo corto de monedas dentro de ~0,92 unidades, con velocidad acotada; el objeto 3D sigue las mismas coordenadas reales usadas para recogerlo.
- Eventos de estrellas, caídas y jefes entregan coordenadas 3D para efectos alineados al mundo.

### Arte, sonidos y UI (mini-worlds-art.js / -runtime.js / .html)
- Barra compacta **CAOS/FURIA**, temporizador y banner de combo. Contador de monedas reacciona con animación. Durante Furia se ilumina el botón ATACAR y el HUD recibe un acento dorado.
- Aura 3D de Furia con anillo y 8 chispas, vegetación con viento sutil, repliegue visual de enemigos al ser golpeados, ondas de choque sobre piso/agua, textos 3D de combos y premios.
- Intro, transición de fases y derrota del jefe con impactos anclados a la arena, coronas concéntricas, partículas y mensaje breve. Al caer al agua se produce una salpicadura en la ubicación original.
- Música original sintetizada acelera y cambia el timbre durante Furia; sonidos y vibración por combo, tesoros, KO y fases de jefe. No se añadieron canciones protegidas.
- Efectos de partículas optimizados: tope de 74 chispas simultáneas, geometría y materiales compartidos. Texturas de texto recompensas cacheadas. Se evita congelar cuadros de la cámara AR por «hit stop», que resultaría incómodo al caminar.

### Pruebas y límites
- `tests/mini-worlds-juice.test.cjs` valida determinismo de premios, rachas, Furia una vez por ciclo, no-recarga, duración de siete segundos, duplicación de monedas, interrupción por daño y conexiones con HUD/efectos.
- Se conservaron/regresaron tests de motor (10 casos), recorrido de dos niveles, física de cajas e islas, compositor AR y orientación espacial. Sintaxis JS y referencias DOM verificadas.
- **Sin simulación física de FPS ni prueba visual real en Android después de esta pasada.** No declarar 10/10 o calidad de consola hasta capturas y jugabilidad del usuario. Mantener PR #69 draft, sin fusionar main ni publicar sobre el arcade original.

## Paisajes premium gratuitos, primera integración real (26/10/2026)

Con autorización expresa del usuario se conectó una nueva capa de naturaleza y arquitectura **con siete archivos GLB reales de terceros, CC0**, en lugar de limitarse a generar árboles procedurales o recomendar packs. Se conserva el motor AR, la geometría de piso y los elementos interactivos.

**Fase instalada:**
- **Mundo 1 La Isla Despierta**: tres variantes de árboles y un arbusto del *Stylized Nature MegaKit Standard* de Quaternius. Clones GLB escalados por su tamaño real, ubicados al borde de 12 plataformas físicamente existentes, despejando corredores y mostrando hojas y materiales del artista.
- **Mundo 2 El Acantilado Perdido**: naturaleza menos abundante y además modelos de torres, muros y rocas del *KayKit Medieval Hexagon Pack* de Kay Lousberg. Dos torres encuadran la arena del jefe, los muros ambientan ruinas laterales y las rocas complementan el acantilado sin sumar plataformas engañosas.
- `mini-worlds-premium.js` realiza carga asíncrona de hasta 4/7 recursos, cada URL `raw.githubusercontent.com` está fijada a un commit, los modelos se verificaron mediante la API de contenido GitHub (tamaños y Git blob SHA) y la procedencia/licencia CC0 se registran en `assets/mini-worlds/LICENSE_AND_SOURCES.md`.
- `mini-worlds-assets.js` coloca vegetación Kenney en un grupo fallback separado. Si cargan de verdad al menos tres árboles Quaternius, el fallback ornamental duplicado se oculta; si la red falla o solo aparece el arbusto, conserva la vegetación previa. `mini-worlds-art.js` conserva solo unas pocas palmeras nativas para la estética de isla.
- Ningún objeto nuevo se convierte en collider ni ancla. La física continúa regida por `MiniWorldsCore`: 14 zonas y 13 caminos conectados por nivel, con saltos, cajas sólidas, monedas, enemigos, jefes y joystick relativo a cámara. No depende de caminar físicamente detrás del avatar.
- `tests/mini-worlds-premium.test.cjs` simula éxito, fallo de red, fallo parcial y cierre durante la carga, además de contar modelos por bioma y verificar fuentes fijadas. Se mantienen y pasan siete suites previas del core, físicas, controles, audiovisual y compositor.

**Importantísimo:** estos assets se cargan automáticamente para el jugador, pero están **alojados en repositorios públicos externos**, todavía no empaquetados en el repositorio del juego por limitaciones de transferencia de archivos binarios de esta sesión. También queda pendiente integrar directamente el pack **KayKit Platformer** gratuito; sí usamos arquitectura genuina **KayKit Medieval Hexagon** para las ruinas. La preview necesita probarse en Chrome Android y confirmar carga HTTPS/CORS, aspecto, FPS y que el nuevo escenario permanezca anclado al suelo. No afirmar “premium 10/10” ni “publicado” hasta QA real.

## Rediseño para un living normal + aventura de una brujita (26/10/2026)

**Feedback usuario:** 11,9 m de pista AR en una casa normal son impracticables; al seguirla con el teléfono se pierde el final y aumentan los problemas de tracking. Se pidió una combinación original de plataformas y exploración/transformación mágica inspirada por Astro Bot y las mecánicas de Epic Mickey, **sin usar contenido Disney ni reproducir el juego**. El caballero se sustituye por brujita con varita y disparos.

### Arquitectura de cuatro mundos de bolsillo (mini-worlds-pocket.js)

- Se mantiene el mapa **lógico** completo con sus 14 plataformas, colisiones, 13 caminos conectados, monedas y enemigos, pero se presenta **una zona 3D por vez**. El área física de colocación predeterminada pasa a aproximadamente **1,9 × 2,5 m** (`scale=.215`); controles de escala 0,155–0,345. No es necesario atravesar físicamente toda la casa: se utiliza joystick.
- 4 zonas reversibles en el mismo anclaje: **Bosque de los Hechizos**, **Jardines Escondidos**, **Templo de las Nubes**, **Trono del Guardián**. Los sectores 3 y 4 están en una **segunda planta virtual** elevada; se vuelve con el joystick cruzando la transición anterior.
- Al cruzar un umbral lógico, el portal realiza un cambio explícito con destello y sonido. **Nunca se mueve o interpola continuamente el suelo AR mientras el jugador camina.** Transformaciones separadas: `stage.root` es ancla física fija WebXR, `stage.worldRoot` es solo el contenido virtual de la zona actual. `MiniWorldsPocket` desactiva capas de sectores remotos y vuelve a usar el mismo volumen AR; el agua se concentra en la región visible. Esto evita tener 12 m de objetos simultáneos fuera de una casa normal.
- El jugador puede volver a zonas previas. La física/progreso lógico no se reinician durante la transición y no se crean islas decorativas sin hitboxes. El reparto de escenarios reutiliza naturaleza Quaternius + arquitectura KayKit ya integradas. El minimapa conserva la ruta total.
- La demo 3D sigue al héroe en coordenadas visuales de la zona activa. La guía nativa de piso dibuja las plataformas del sector actual, no los primeros 12 m del mapa completo.

### Nueva protagonista y combate mágico

- **Heroína:** `Mage.glb` de Kay Lousberg / KayKit Character Pack Adventurers, mismo pack CC0 que el caballero anterior. Fuente oficial en https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 ; archivo `addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb` (GitHub ref main), tamaño verificado 3 589 240 bytes. Pose/animaciones de casting/attack, sombrero violeta y varita luminosa. Si falla la descarga externa, un avatar procedural original de brujita sustituye el GLB.
- Se eliminó la espada como arma del jugador. Botón **HECHIZO** lanza proyectiles 3D que recorren el mapa lógico a ~8,3 unidades/s, con alcance y vida acotados, colisión substepped contra cajas, enemigos y jefes vulnerables. Impactos cercanos se confirman al instante para evitar toques frustrantes. Se mantienen dificultad, corazones, Furia y recompensas existentes.
- Tres **símbolos florales malditos** por nivel pueden restaurarse a distancia con hechizos. La magia transforma visualmente cristal oscuro → flor con pétalos, ilumina la zona y concede +5 monedas y carga CAOS solo una vez. Inspiración general de mundos restaurables, sin pintar/borrar objetos de Disney ni usar elementos de esa franquicia.
- Se conservaron las criaturas, dos jefes, monedas, cajas sólidas, portales y efectos del agua. La nueva capa de magia usa geometrías/malla de proyectiles reutilizable con doce posiciones GPU para Android.

### QA a realizar y límites del prototipo

- `tests/mini-worlds-pocket.test.cjs`: 4 habitaciones, dos alturas, 6 transiciones de ida/vuelta, agua fija en cada sector y posición del ancla inmutable.
- `tests/mini-worlds-magic.test.cjs`: lanzamiento real, colisión de proyectiles lejanos con cajas y monstruos, restauración de flora sin repetir premio, expiración de proyectiles, Mage en navegador, varita y botones.
- Mantener tests del core, recorridos, 12 saltos laterales, cajas, combo/Furia, anclaje espacial y compositor.
- **Pendiente:** prueba física en Chrome/ARCore para confirmar escala, visibilidad de portales, oclusión, tracking y dirección del joystick. Sin pruebas de FPS real no llamar esto versión final. Las cargas GLB externas siguen sujetas a disponibilidad CORS y eventual empaquetado local. No publicar en `main` ni alterar otros juegos o Supabase.


## Rediseño visual ORIN — robot expresivo y acabado de mundos (27/10/2026)

**Rama de experimentación:** `feat/mini-worlds-robot-premium-20261027`. No se cambió `main` ni la producción antigua.

- Se distribuyó **RobotExpressive.glb** de Tomás Laulhé / Quaternius y Don McCurdy bajo CC0, copiado por SHA exacto desde el repositorio oficial de Three.js y guardado localmente en `assets/mini-worlds/characters/`. El personaje tiene expresiones y animaciones reales y se carga automáticamente, sin subir archivos ni introducir dependencias nuevas al usuario.
- `mini-worlds-characters.js` conserva los 8 monstruos originales de Quaternius, asigna las animaciones correctas de robot (idle, walking, running, jump, punch), hace ajustes PBR sutiles a la carcasa y mantiene la misma cápsula de colisión física del núcleo. El usuario conserva el **HECHIZO** de energía, que sigue siendo un proyectil con alcance y física de `core`.
- `mini-worlds-art.js` incorpora un **robot procedural original** como fallback sin red: carcasa blanca con clearcoat, visor oscuro, ojos luminosos, brazos articulados y mochilita; mantiene sombras de contacto, las animaciones legadas y las físicas.
- `mini-worlds-finish.js` agrega 13 balizas de navegación cromáticas junto a superficies EXISTENTES, iluminación de recorte cian/violeta y efectos energéticos asociados al personaje (jets, aro y chispas). Sus balizas son hijos del mundo lógico y son reindexadas por `MiniWorldsPocket`, no se fijan a la cámara ni se habilitan como suelo.
- Los packs Kenney 19 GLB, Quaternius 8 criaturas glTF embebidas y los siete modelos de naturaleza/ruinas con fallback siguen disponibles. Física, cuatro bolsillos AR, joystick relativo a cámara, enemigos, cajas, monedas, portales, jefe y guardado se conservaron.
- **Validación:** `tests/mini-worlds-robot-premium.test.cjs` verifica archivo GLB y metadata, importación automática, seguridad de ancla y presencia de la capa 3D. Las suites anteriores del core y AR deben ejecutarse en CI.
- **Pendiente de prueba física:** FPS de Android, calidad estética con capturas, CORS de las decoraciones externas, WebXR ARCore con ancla real y alternancia de niveles. Las pruebas estáticas o de Node no sustituyen estas verificaciones.


## El zorro aventurero con blaster — 27/10/2026
- **Rama de preview:** `feat/mini-worlds-kai-blaster-20261027`, creada sobre la preview de Mini Worlds, sin alterar `main`, Supabase ni el arcade original.
- **Personaje elegido:** KAI, el zorro aventurero, con disparo como habilidad principal. **Situación real de licencia y archivo:** el modelo de Sketchfab https://sketchfab.com/3d-models/kai-the-little-fox-warrior-animated-aa56e447b578470b8d6b1b9587fd29ac pertenece a Realidad Aumentada Empezando Desde Cero, licencia CC BY 4.0 (requiere atribución); la descarga oficial del GLB/ZIP exige OAuth de Sketchfab: https://sketchfab.com/developers/download-api/downloading-models. No había acceso a esa sesión. **El mesh exacto NO está incorporado ni debe anunciarse como si lo estuviera.**
- **Avance implementado de inmediato:** zorro antropomórfico 3D ORIGINAL modelado en tiempo de ejecución en `mini-worlds-art.js`: cabeza expresiva con orejas, ojos, hocico, pelo, cola móvil, ropa de aventurero, insignia y materiales PBR. Este zorro jugable tiene silueta afín a la dirección artística elegida sin copiar geometría o texturas de KAI.
- **Blaster:** cañón, empuñadura, bobinas, boca luminosa, fogonazo y retroceso integrados en el rig espacial del zorro. El botón ahora dice **DISPARAR**. `MiniWorldsCore.attack` ya tenía disparos físicos (legacy `spellCast`): impactos contra cajas, criaturas, runas y jefes; son los mismos proyectiles/collision substeps, no disparos falsos solo de render. Nuevo sonido electrónico y vibración opcional.
- **Integridad:** todos los enemigos y jefes animados Quaternius mantienen sus modelos locales; no se reescribe `mini-worlds-core.js`, ni `mini-worlds-spatial.js`, ni `mini-worlds-pocket.js`, ni anclas XR. 4 habitaciones y segundo nivel permanecen idénticos.
- **Siguiente incorporación exacta de KAI:** obtener el archivo legítimamente mediante acceso Sketchfab autorizado, versionarlo con atribución, revisar rig y sus 8 clips (KAI no trae salto explícito), optimizar texturas/glTF para WebXR, crear adaptador visual a la cápsula física y verificar rendimiento. El público nunca debe descargar/subir assets manualmente.
- **QA:** el workflow `.github/workflows/mini-worlds-premium.yml` ejecuta suites de juego, combate, AR simulado, protagonista y sintaxis; nunca declarar FPS, anclaje AR real ni calidad 10/10 sin Android/ARCore.


## MINI WORLDS — KAI Y LOS MUNDOS PERDIDOS, campaña de rescate (27/10/2026)

**Rama propuesta para preview:** `feat/mini-worlds-rescue-missions-20261027` basada en la rama zorro+blaster. No integrar `main` ni publicar en producción sin prueba en Android.

### Cambio de premisa
No se gana juntando monedas ni cruzando el nivel: cada aventura exige **misiones con propósito** y progreso persistente. Los dos mapas y los cuatro sectores físicos de bolsillo se reutilizan; todavía no hay tres biomas nuevos independientes.

**Tres misiones jugables:**
1. **Rescate en el Vacío:** localizar y rescatar 2 de 3 habitantes reales (el tercero es opcional), disparar a 2 balizas/cristales mediante el core existente y alcanzar el portal espacial en 260 s. El jefe de arena se deshabilita en esta misión para no conceder victoria prematura; un resultado perfecto exige los 3 rescates y tiempo menor a 185 s.
2. **Defendé el Corazón:** rescatar opcionalmente a un técnico, impedir que 3 oleadas de 3 enemigos dañen un reactor (12 HP), mantenerlo vivo 65 s y regresar físicamente a su posición para estabilizarlo antes de 90 s. Los enemigos tienen hitboxes y daño real del motor existente. Si el reactor llega a cero: derrota y opción de revancha.
3. **El Ladrón de Cristales:** derrotar 3 enemigos guardianes de lugares separados, recoger personalmente los 3 cristales que sueltan, desbloquear la vulnerabilidad real del jefe Yeti y vencerlo antes de 300 s. Un explorador opcional ofrece otra recompensa persistente. El jefe no puede recibir daño hasta reunir las piezas.

**Aldea con persistencia local:**
- `progress.missions` se guarda en la clave existente `mc-mini-worlds-save-v1`. Tiene índice de desbloqueo, récords por misión, lista única de habitantes rescatados y número de partidas completadas. **No hay sincronización entre dispositivos ni economía backend**.
- 1 habitante: taller, blaster dispara con menor cooldown real; 3: jardín, 15 s extra en próximas misiones; 5: observatorio, 2,4 s de invulnerabilidad inicial.
- Tres estrellas por misión basadas en objetivo completado, rescates opcionales, eficiencia, integridad del reactor o supervivencia. Las medallas y mejores tiempos se conservan.
- El minimapa se muestra por defecto y marca rescates, balizas, enemigos objetivos, fragmentos, reactor y salida; puede cerrarse.

**Arquitectura:**
- `/mini-worlds-missions.js` — máquina de misiones pura, sin Three, DOM ni cámara, con `init/tick/drain/status/medal`.
- `/mini-worlds-mission-art.js` — pequeños personajes 3D con caras, balizas, reactor, fragmentos y puerta; objetos ubicados en coordenadas del **mundo lógico** ANTES de `MiniWorldsPocket.create`.
- `mini-worlds-runtime.js` — inyección en tick fijo 60Hz, scoreboard, progreso `localStorage`, selector, modal de derrota/victoria y HUD.
- `mini-worlds-core.js` — único cambio físico: respeta `player.blasterBoost` al calcular la cadencia del disparo; el core original conserva física, colisiones, gravedad y daño.
- `mini-worlds.html` — tres tarjetas de misión + aldea reconstruible + objetivos durante la partida. Entrada AR/demo y anclaje espacial sin cambios.

**Pruebas:** `node tests/mini-worlds-missions.test.cjs`; la CI de rama `.github/workflows/mini-worlds-premium.yml` ejecuta además las 13 suites originales y sintaxis de módulos. Testea progresión/rescate, acceso al portal, reactor con daño físico y derrota, jefe protegido y cristales, límites de tiempo y ausencia de manipulación de worldAnchor; no equivale a una prueba física Android.

**Pendiente para producción:** rendimiento real de los nuevos objetivos en WebXR/ARCore, visualización real de cada isla, lectura del minimapa en Android, experiencia de una misión completa con usuario, balance y sonido contextual. El modelo 3D exacto KAI de Sketchfab sigue sin poder descargarse de forma autenticada (documentado arriba): la rama utiliza un zorro 3D original, no el asset exacto.

### Instrucciones de misión antes de jugar — 27/10/2026
- `readyCard` se abre para **las 3 misiones**, en modo 3D y tras fijar el mundo en AR. Muestra nombre, objetivo, límite de tiempo, **3 pasos breves** y desafío opcional. La misión se toma de `MiniWorldsMissions.MISSIONS[id].steps` y `.bonus`, no de texto genérico.
- Única acción: **«¡ENTENDIDO, A JUGAR!»**. El contador se pone en marcha solo en `C.start(game)` y el panel se oculta en `layout('playing')` sin emitir un nuevo anuncio que tape la escena.
- Después del botón solo queda el HUD de progreso y minimapa que el jugador puede cerrar. La tarjeta vuelve a aparecer al reiniciar o al pasar a otra misión, sin duplicar los pasos. `fixWorld` ya no sobrescribe el título de misión con «MUNDO FIJADO».
- Pruebas agregadas al test de misiones, cubriendo las tres guías, botón, punto de activación del reloj y visibilidad del panel. **Pendiente** QA visual en teléfono.


## MINI WORLDS — región ampliada + acabado de islas (27/10/2026)
**Rama preview:** `feat/mini-worlds-grand-islands-20261027` (encadenada sobre `feat/mini-worlds-rescue-missions-20261027`; sin modificar `main`, Color Rush original, ni tablas Supabase).

### Problema reportado por el usuario
- En Android/AR, podía recorrer solo unos pasos y cambiaba de escenario con demasiada frecuencia. Las 4 salas anteriores cubrían solo ~6 unidades lógicas cada una; el espacio AR visible se percibía demasiado pequeño.
- Su captura muestra bloques rectangulares grandes, roca y vegetación parcialmente superpuestas a KAI, agua simplificada y objetivos poco legibles.

### Solución de recorrido
- **4 microzonas -> 2 regiones largas:** `mini-worlds-pocket.js` agrupa la ruta en `[-12.10,3.3]` y `[-28.5,-12.10]` unidades lógicas, con **un solo cambio principal de región** en lugar de tres automáticos. El primer cambio anterior a z=-5 no ocurre más. En retroceso, el recorrido permanece reversible.
- Tamaño inicial `scale=.235` vs .215, área por región ~**4.1 m × 3.9 m**. Ajustable por pinza/escala; **NO requiere desplazamiento físico**: recorrer con joystick y mirar con el teléfono en un lugar seguro. La física y el avatar mantienen las mismas coordenadas lógicas; las islas laterales conservan sus caminos y colisiones.
- El `anchorRoot` inmóvil sigue siendo el objeto anclado a WebXR; el hijo `worldRoot` cambia solo en el único umbral entre regiones. No vinculamos el mapa a la posición de la cámara.
- Laguna y costa adaptadas a la región larga, `ocean.scale.set(.92,.56,1)`; los indicadores de calibración y dimensiones se actualizaron.

### Solución visual
- **Nuevo módulo `mini-worlds-diorama.js`** (puro arte): faldas costeras de roca triangulada con facetas y colores, material rugoso, cascajo de costa, vegetación, brotes, flores y piedras instanciadas por biome para limitar draw calls, luciérnagas flotantes y protección visual de KAI ante objetos premium Quaternius que obstaculizan la línea de visión. No crea nueva física, no cambia hitboxes.
- Terreno base menos rectangular: se estrecha la base opaca antigua para dejar expuesta la costa esculpida; parches orgánicos en la superficie jugable mantienen altura física. Agua shader refinada con tintes, cintas de espuma, caústicas y brillo.
- Los habitantes tienen flechas luminosas flotantes, haloes y aspecto más legible; las balizas obtienen pedestales y marcadores verticales en el mundo real, sin tapar la HUD.
- Los activos Quaternius/Kenney CC0 actuales se conservan, así como KAI zorro 3D original y el blaster. **No se integró el KAI exacto de Sketchfab** (descarga autenticada pendiente, documentada).
- `mini-worlds.html` importa el módulo nuevo y reduce algo el tamaño del minimapa.

### QA y limitaciones
- CI con `tests/mini-worlds-pocket.test.cjs` verifica que no haya salto a los 5/8/11 pasos de profundidad, área más grande, único umbral y world anchor inmutable; `tests/mini-worlds-diorama.test.cjs` valida mallas reales, instancing y liberación de recursos; el resto de 14 suites continúa.
- **No son pruebas físicas.** Se necesita probar captura real en Chrome Android/ARCore: anclaje, visualización de las dos regiones completas, FPS móvil, oclusión dinámica, geometrías, portales y juego de misiones 1-3. No afirmar que ya iguala a la imagen conceptual de Astro Bot.


## Mini Worlds — combate justo, textura nítida y arte CC0 (27/10/2026)

**Rama aislada:** `feat/mini-worlds-game-feel-premium-20261027`, base `feat/mini-worlds-grand-islands-20261027`. No hacer merge ni tocar producción del arcade original sin verificación en Android.

### Jugabilidad primero
- El blaster añade asistencia **limitada a 28° delante del protagonista** y alcance de 7 unidades. Prioriza balizas en rescate y enemigos en defensa; el proyectil continúa siendo físico, con subpasos, hitboxes y obstáculos. No gira para disparar por detrás, no apunta fuera de cámara ni atraviesa cajas/monstruos.
- Nuevo `MiniWorldsMissions.guidance(s)`: objetivo contextual y dirección relativa al personaje, como «RESCATÁ A LUMI», «ACTIVÁ LA BALIZA», «DETENÉ AL INVASOR» o «ENTRÁ AL PORTAL». Aparece en un indicador pequeño sin interrumpir la partida ni abrir paneles de instrucciones.
- Habitantes rescatados realizan un pequeño salto, giro y desaparición celebratoria durante ~0,9 s en el mundo AR, sin congelar controles.
- Tras ganar, el jugador puede tocar **«DESAFIAR A UN AMIGO»** para compartir (Web Share API) su misión, medallas, tiempo y rescates; alternativa copiar. Desafío social asíncrono, **no** multijugador real.

### Calidad gráfica y costo móvil
- Texturas de arena, piedra y césped generadas a 512×512 (antes 128×128), anisotropía 4× y atlas sRGB; se conservan materiales PBR, mipmaps y texturas compartidas. Límite inicial de resolución de demo ~1,75x en celular; ajuste dinámico según FPS.
- `mini-worlds-kaykit.js` carga opcionalmente **un solo GLB de 396.480 bytes** que contiene un subconjunto del `KayKit Forest Nature Pack` gratuito (rocas, arbustos y tres siluetas de árboles), con **una textura atlas compartida**. El GLB es una compilación CC0 de Station Sciences: https://github.com/Station-Sciences/bot-crossing/blob/8cd9d76b3bf5eddaec7d4ba88f0d1c0547a312dc/public/assets/CREDITS.md, archivo `public/assets/forest.glb`. Origen de los modelos: Kay Lousberg https://kaylousberg.itch.io/kaykit-forest — licencia CC0 1.0, uso comercial permitido. El GLB remoto se sirve desde raw.githubusercontent.com a una revisión fija, no se incluye el binario en este repositorio. Si la red o CORS falla, el juego continúa con el arte disponible.
- Hasta 14 instancias decorativas: colocación en bordes de plataformas y sin ampliar superficies transitables; quedan en el `worldRoot` del ancla espacial, entran al `pocket.reindex()`, comparten mesh/atlas y se limpian con `disposeKayKit`. Las copas del GLB participan del cutaway de KAI para no taparlo.
- **Ningún modelo adicional debe descargarse o cargarse manualmente por el jugador**. El runtime resuelve GLB automáticamente; Android real/FPS/carga efectiva de la URL exigen verificación física.
- La versión anterior ya contiene Quaternius y Kenney. Esta integración es complementaria y optativa para no romper los árboles/monstruos existentes.

### Pruebas y limitaciones
- `tests/mini-worlds-gamefeel.test.cjs`: prueba acierto con asistencia de frente, rechazo de blancos laterales, impacto físico en cajas antes de enemigos, progreso del indicador de misión y presencia de recursos y limpieza de GLB. Más 15 suites previas en GitHub Actions.
- **No afirmar que el arte ya tiene calidad cinematográfica 10/10 o FPS estables sin capturas y prueba física Chrome Android/ARCore.** Las capas de recursos remotos pueden fallar por red/cambios del host; la publicación principal permanece sin modificar.


## Corrección tras capturas AR: visibilidad del protagonista (27/10/2026)
- Problema verificado visualmente en tres capturas del usuario: copas verdes gigantes cruzaban el primer plano, solapaban a KAI y a los habitantes; demasiadas rocas y enemigos dominaban la pantalla. Aunque las islas se veían más pobladas, costaba jugar y entender qué rescatar.
- **Raíz técnica:** tres capas independientes de vegetación (original Kenney + Quaternius premium + KayKit), 12 árboles Quaternius de ~2,4–3,3 unidades de altura, tres árboles KayKit más, y detección de oclusión basada en distancia al **centro** del árbol. Varias copas se interponían sin que el sistema reconociera su gran volumen.
- Rama aislada `fix/mini-worlds-clear-view-20261027`: árboles Quaternius **máximo cinco**, con altura cercana a 1,3, tamaño máximo de copa 1,45 y ubicación exterior condicionada por distancia a spawn, habitantes, balizas y corredores principales; KayKit se usa para **arbustos y rocas bajos**, no como segundo bosque. La flora Kenney se mantiene como fallback cuando fallan los modelos premium.
- `mini-worlds-diorama.js` ahora usa `Box3` de cada modelo para comprobar el volumen completo de copa entre cámara y KAI, incluso cuando el tronco está por detrás del zorro. Solo afecta a visuales, no a colisiones, posición del jugador, input, WebXR ni world anchor.
- Monstruos secundarios ~0,64–0,85 de alto en su visual (hitboxes lógicas sin cambios); rocas y acantilados decorativos reducidos. Minimapa de 92×122 y título duplicado oculto durante la partida, manteniendo misión y rumbo legibles.
- Tests CI cubren límite de copas, no superposición de áreas clave, ausencia de teletransporte adicional y la desaparición/restauración de una copa que obstruye a KAI. En Android real todavía faltan **capturas de esta versión específica**, FPS y validación táctil para confirmar la mejora.


## Mini Worlds — Árboles, rocas, columnas y enemigos con cuerpo físico (27/10/2026)

**Origen:** el usuario reportó que KAI atraviesa árboles, rocas y cualquier decorado, rompiendo la inmersión. Las mallas Quaternius/KayKit/Kenney y la vegetación nativa eran visuales sin registro de colisión.

**Rama correctiva:** `fix/mini-worlds-solid-scenery-20261027` basada en `fix/mini-worlds-clear-view-20261027`. No fusionar con `main` ni editar otros juegos sin validación.

- `mini-worlds-core.js`: `addScenery(s,def)` incorpora un cilindro/círculo sólido lógico (x,z,y,radio,alto,categoría) para cada decorado relevante. `solveScenery` permite deslizamiento a su alrededor, bloquea atravesarlo y deja que un salto libre supere rocas bajas, **sin** cambiar hitboxes de plataformas, cajas o portales.
- Seguridad de navegación: no registra una roca/árbol si bloquearía la aparición, puntos de control, habitantes, balizas, cajas o pasarelas estrechas. **Si un adorno no admite colisión sin bloquear misiones, se quita visualmente** (no se deja una pared invisible ni un árbol traspasable). Flores, césped, partículas y elementos recolectables permanecen sin colisión, intencionalmente.
- `mini-worlds-art.js`: palmeras, rocas nativas y columnas de ruinas registran los colliders reales al crear el nivel. Las columnas apuntan al grupo visual de las ruinas, nunca a toda la plataforma.
- `mini-worlds-assets.js` (Kenney), `mini-worlds-premium.js` (Quaternius) y `mini-worlds-kaykit.js`: al descargar cada GLB, registran el cuerpo basado en la altura y huella estimada de la malla o descartan ese objeto si obstruye un objetivo. Todos en coordenadas lógicas del mismo tablero anclado.
- `mini-worlds-runtime.js`: un registro de pares malla ↔ cuerpo `stage.registerSolid` se actualiza cada frame fijo. Si el mesh se oculta por corte visual de copa, cambio de región o fallback de modelos, su collider también se desactiva; al reaparecer se reactiva. Si un nuevo GLB llega mientras KAI está cerca de su base, no se crea súbitamente una colisión encima del jugador.
- Enemigos terrestres impiden atravesar sus cuerpos mientras estén vivos. El respawn con invulnerabilidad tiene período de gracia para no desviar el punto de control. Los disparos del protagonista y los proyectiles enemigos se detienen en árboles, piedras o columnas sólidas.
- `tests/mini-worlds-solid-scenery.test.cjs`: corre 60 Hz para verificar colisiones reales, salto sobre piedra baja, desactivación de obstáculos invisibles, disparo bloqueado, monstruos con cuerpo, rutas de rescate abiertas y acoplamiento de recursos 3D. Se ejecuta junto con todas las suites previas.

**Límites reales:** pruebas automáticas sin teléfono AR físico; obstáculos aproximados mediante volúmenes conservadores, no geometría triangular completa, para mantener FPS móvil. Es imprescindible inspeccionar capturas reales y confirmar que ni la cámara, ni el joystick, ni los portales se descalibran.
