# REBOTE MORTAL — Entrega técnica (25/10/2026)

## Alcance actual
Nuevo minijuego aislado en \`rebote.html\`, \`rebote-core.js\`, \`rebote-art.js\` y \`rebote-runtime.js\`. Integración visual en \`index.html\`. Ninguna modificación a \`engine.js\`, Color Rush, Ball Rush, Territorio X, Muro Rush, Meteoros, Rodeados ni Supabase.

- **Juego principal:** Clásico, duración máxima 88 segundos y tres vidas. Fases a los 14, 28, 45 y 62 segundos; final cuando se derrota al jefe o se agota el tiempo / vidas.
- **Mecánica:** esferas tridimensionales, colisiones barridas en paso fijo de 90Hz, retícula de precisión y botón DEVOLVER. Califica como PERFECTO / BUENO / ROCE o explica por qué no se devolvió. Combo y récord local.
- **Variedad:** normales, veloces, curvas, pesadas, dobles secuenciales, señuelos violetas sin daño y explosivas. El jefe puede protegerse o devolver la esfera. El sistema de ataques dobles reintenta sin forzar proyectiles irrespondibles.
- **AR real:** Three.js/WebXR immersive-ar, Hit Test, local reference space y anchors cuando estén disponibles; ajuste de escala, traslación y rotación antes de fijar; calibración de ~1s quieto y RECENTRAR. El mundo queda en coordenadas espaciales del plano real.
- **Protagonista:** cámara/teléfono físico, no un avatar ficticio ni tracking de pies. Sólo apuntar y pulsar el botón.
- **Entrenamiento 3D:** arrastrar en pantalla para apuntar y devolver, sin cámara real. No confundir con AR.
- **Efectos:** robots 3D proceduralmente articulados, arena metalizada, partículas y luces, audio electrónico generado en tiempo real y vibración opcional. No se descargaron recursos de terceros sin licencia.

## Separación técnica
\`ReboteCore\` expone create/make, begin, tick, setView, returnShot, launch, colisiones y snapshot. No depende del DOM/Three.js/WebXR. \`rebote-art\` crea escena y geometría, mientras \`rebote-runtime\` controla WebXR, input, HUD y almacenamiento local. No se cambia el contrato de \`engine.js\`.

## Pruebas y limitaciones
- Simulaciones en motor JavaScript: validación sintáctica y ejecución de impactos perfectos, fallo por apuntado, colisiones barridas, pérdida de escudos con inmunidad, fases, ataques especiales y victoria del jefe.
- Tests versionados: \`tests/rebote.test.cjs\` y \`tests/rebote-browser.test.cjs\`; workflow \`.github/workflows/rebote-tests.yml\`. Las pruebas de Chromium no equivalen a pruebas de teléfono.
- NO se afirma aún haber probado WebXR/ARCore en Android real. Se requiere probar en Chrome Android compatible el montaje, la calibración, la retícula y el impacto desde la posición física.
- NO hay modo multijugador funcional: no se conectaron salas ni se tocaron tablas. Duelo 1v1 / cooperativo / supervivencia / precisión requieren iteración y verificación antes de ofrecerse como completos.
- El robot y las luces son assets procedurales. Para nivel AAA comercial faltarán modelos GLB animados/optimizados y evaluación artística y de rendimiento en hardware real.
- Vista previa protegida por Vercel con enlaces compartidos temporales. La publicación de main se pospone si los checks o límites de despliegue no permiten verificar.

## Pruebas recomendadas en Android
1. Abrir AR, buscar piso, ajustar con dedos (mover / girar / escala), FIJAR, esperar LISTO, iniciar.
2. Mantener el teléfono quieto y luego girarlo: la arena y el robot no deben seguir a la pantalla.
3. Apuntar a la esfera en 3D; pulsar DEVOLVER en tiempo correcto y comprobar efecto / retorno real / daño al robot.
4. Fallar deliberadamente por mal apuntado y por tiempo anticipado, comprobar el motivo.
5. Derrota y REVANCHA sin fijar pista; RECENTRAR no debe mover la referencia espacial.
6. Comprobar golpes especiales y jefe final. Probar pantalla vertical, sonido apagado, reanudación y tracking intermitente.

## Cierre técnico v2 (25/10/2026)

- Se agregó un marcador espacial discreto para indicar la posición del teléfono (`VOS`), destellos controlados para impactos perfectos/escudo dañado, una pista de ritmo electrónico sintetizada y degradación automática de densidad de píxeles en entrenamiento 3D si los FPS caen.
- La retícula gráfica se centra exactamente en la línea visual utilizada para calcular el rayo 3D, evitando discrepancias entre lo apuntado y lo golpeado.
- Se sumó `tests/rebote-xr-smoke.test.cjs`: prueba sintética en Chromium que simula `XRFrame`, hit-test, anclaje, cambios de escala, FIJAR, calibración de un segundo, botón DEVOLVER, desplazamiento realista del teléfono sin mover la arena, RECENTRAR y pérdida/retorno de tracking.
- El flujo pasó en GitHub Actions. **Advertencia:** WebXR sintético no verifica la cámara real ni ARCore de Android; esa prueba queda explícitamente pendiente para certificar al juego como premium en dispositivos físicos.
- No se modificaron las tablas de Supabase, Auth ni el multijugador. Seguimiento de `main` por Vercel debe verificarse antes de anunciar enlace definitivo.

### QA de tactilidad y jefe (25/10, actualización)

- Evento `pointerdown` de DEVOLVER inmediato y **un único intento por toque**; el evento `click` posterior no repite la acción, pero la accesibilidad por teclado conserva `click`.
- Cualquier esfera que choque durante el escudo temporal del jugador queda consumida: jamás puede volver a producir daño retardado.
- El jefe final muestra un escudo 3D únicamente en su intervalo real de bloqueo (basado en el mismo estado físico del core). Sus placas de armadura se pierden progresivamente según la vida restante.
- Tests de unidad y prueba sintética XR ampliados para cubrir estas condiciones. Sin alterar juegos anteriores ni bases de datos compartidas.
- **Release:** Vercel limitó la cuota diaria de nuevas compilaciones. No afirmar que esta revisión es pública hasta verificar que el despliegue resuelve exactamente el commit actualizado. La prueba física ARCore queda pendiente, incluso cuando el QA sintético sea verde.

## Endurecimiento de seguimiento AR (25/10/2026)

- WebGL limpia el fondo con alpha 0 para que el passthrough de cámara se componga con el contenido AR en dispositivos compatibles.
- Si el tracking WebXR se interrumpe, la partida se pausa y **no permite CONTINUAR** hasta que el teléfono recupere una muestra de posición/dirección válida. La sesión también se pausa al ocultarse desde `XRSession.visibilitychange`.
- La prueba XR sintética exige alpha 0 y verifica que el botón de reanudar queda deshabilitado hasta recobrar tracking.
- Este test sigue usando un XRFrame simulado. La validación física en Chrome Android + ARCore sigue siendo requisito de aceptación aparte y NO puede sustituirse por simulación.

## Guiado de apuntado y pulido v4

- Indicadores discretos de amenazas en los cuatro bordes, calculados con la orientación 3D real del teléfono, no con los ejes fijos del escenario. Si la esfera está detrás, se muestra aviso para girar despacio.
- Anillo de timing unido a la retícula: amarillo mientras se aproxima la esfera y verde dentro de la ventana válida de devolución. La esfera 3D gana un halo dorado cerca del momento ideal.
- Selección de amenaza por tiempo de aproximación, ignorando señuelos que nunca hacen daño.
- Reutilización de geometrías 3D de proyectiles y liberación de materiales al desaparecer robots y esferas; disminuye presión sobre GPU y memoria en partidas repetidas.
- Pruebas Chromium en demo y WebXR simulado para verificar retícula, medidor y orientación lateral. No reemplazan prueba en móvil real.

## Corrección de botón JUGAR EN AR — 25/10/2026

Incidente reportado desde teléfono: al pulsar `JUGAR EN REALIDAD AUMENTADA`, no había ninguna reacción aparente. La implementación anterior actualizaba solo un texto pequeño si `navigator.xr` no estaba disponible; además no mostraba el estado mientras Chrome solicitaba la sesión y la carga de módulos podía dejar el botón sin manejador.

Corrección: `rebote.html` incorpora diagnóstico independiente del módulo 3D, estado de carga prominente, error de permisos/incompatibilidad, ayuda para abrir en Chrome Android y copiar enlace. `rebote-runtime.js` crea la sesión *sin perder el gesto de usuario* antes de actualizar estado, muestra `ABRIENDO CÁMARA AR`, habilita VOLVER en solicitudes pendientes y distingue fallos `NotAllowedError`, `SecurityError`, `NotSupportedError`, `InvalidStateError` y ausencia de WebXR; protege contra respuestas de sesiones canceladas.

Pruebas Chromium ampliadas: navegador sin `navigator.xr`, rechazo de permisos, solicitud pendiente con cancelación, inicio AR sintético, hit test/calibración/retorno, regreso al entrenamiento y rutas. **No hay validación física Android/ARCore**: pedir abrir enlace directamente con Chrome y comprobar permisos y servicios de Google Play para RA.

## Corrección arena invisible AR (25/10/2026)

Reporte Android REAL: Hit Test y menú de fijación aparecían, pero ni pista ni objetos eran visibles, incluso después de fijar. Causa probable: el framebuffer nativo de WebXR no compone la escena Three.js en Chrome Android/ARCore (el éxito de render simulado no garantiza visibilidad física). 

Solución: reutilizar el compositor WebGL transparente de Rodeados 360 dentro de DOM Overlay nativa, con matrices de cámara XR reales. El framebuffer nativo queda transparente y la escena 3D se dibuja en el overlay con coordenadas espaciales del piso, sin fijar nada a pantalla. Pista 3D altamente contrastada: disco oscuro sólido, grid cian, cuatro balizas y columna central alta con rombo amarillo durante edición. La escena se dibuja con colores sin dependencia de iluminación. Bloquear FIJAR hasta comprobar llamadas GPU positivas y mostrar error si compositor falla. Render 3D sigue anclado al hit-test y las balizas se ocultan después de fijar.

Nueva prueba automatizada verifica canvas visible *dentro* del DOM Overlay, render con draw calls, habilitación de fijación, AR y regresión. **Sigue pendiente validación de visibilidad física en Android/ARCore**, que solo puede hacerse con teléfono real, no atribuir éxito basado en simulación.

### Segunda vía de visibilidad (SVG anclado a XR)

Para cubrir teléfonos donde incluso el segundo lienzo WebGL no llegue a mostrar la superficie, el modo de edición dibuja un contorno y cuadrícula SVG a partir de XRView.projectionMatrix × XRView.transform.inverse.matrix × arena.root.matrixWorld. El resultado está proyectado en los mismos metros del Hit Test, se actualiza con el movimiento/rotación real del celular y se oculta al fijar la pista. No sustituye los robots WebGL, pero evita una pantalla vacía durante la colocación. Prueba Chromium simulado comprueba que el path SVG sigue matrices XR. Validar con ARCore real.

## V8 — Calibración espacial y salto visual (25/10/2026)

- Hit Test usa muestras de suelo recientes y mediana de alturas para evitar saltos; no habilita FIJAR hasta acumular al menos ocho lecturas consistentes y 220 ms de estabilidad. El origen de la arena se coloca unos 0,78 m **delante del teléfono** en la dirección del espectador y solo lo sigue *antes* de fijar. Al fijar queda en espacio XR y la calibración de ~1 s promedio valida un RMS <= 4,5 cm. El inicio no resetea el transform.
- Arena de jugador ligera, semitransparente y de menor radio, con cuadrícula discreta, borde limpio y marca central; los enemigos poseen pad de contacto con el suelo para evitar sensación de flotar. La visibilidad SVG XR y el compositor transparente permanecen intactos.
- Robótica estilo mech premium procedural: casco, visor envolvente, partes redondeadas compartidas, placas de armadura, piernas y brazos articulados, núcleo brillante, respiración mecánica, reacción a daño y jefe final. Sin descargas manuales de modelos ni servicios externos.
- Nuevas esferas luminosas con brillo y estela vectorial. Liberación de geometrías temporales y preservación de geometrías compartidas hasta terminar la escena.
- HUD de móviles reducido para no tapar la mitad inferior de la cámara.
- Tests automáticos XR sintético: piso estabilizado, posición inicial delante de la cámara, calibración estable y sin salto de anclaje, render 3D, retícula, proyectiles, juego, pérdidas de tracking y regresiones. La prueba física ARCore con teléfono **sigue pendiente**.

## V9 — Jugabilidad de rebotes, alturas y brújula de amenazas

- Patrones determinísticos rotativos de siete trayectorias físicas: centro, derecha, alta, izquierda, baja, diagonal alta derecha y diagonal baja izquierda. Alturas del emisor entre 1,06–1,99 m, destinos con desvíos de hasta 43 cm lateral y 39 cm vertical. El objetivo es mover/apuntar el **teléfono** dentro de un lugar despejado; no requiere correr, saltar ni tracking corporal.
- Rebote visible: núcleo esférico texturizado proceduralmente con paneles de pelota, giro rápido, reflejo y estela. DEVOLVER invierte la dirección, impulsa el proyectil hacia el robot, aplica arco visual elástico y genera dos ondas 3D + partículas + sonido boing. La física/barrrido mantiene sus colisiones exactas.
- Los mechs giran su visor hacia el teléfono rastreado, aunque el usuario se mueva alrededor. Radar compacto en pantalla indica VOS, robots (y jefe) y pelota entrante con referencia relativa a la cámara; no mueve el mundo 3D ni sustituye el AR.
- Se mantiene la calibración de V8, la progresión de cinco fases, los combos, los modos demo y la protección al perder tracking. Pruebas automáticas verifican variedad, límites seguros, retorno real, orientaciones y radar; cámara ARCore física requiere nueva prueba del jugador.

## V10 — Duelo de Campeones 1 vs 1 (25/10/2026)

- Modo **DUELO 1 VS 1** elegible en pantalla inicial junto a **CAOS CLÁSICO**, que mantiene sus fases y duración previas.
- Seis rivales consecutivos: CHISPA (tutorial centro), RAYO (cambios laterales), PIXEL (señuelos), VECTOR (altura/diagonales), TURBO (ritmo/pesadas) y NÉMESIS (campeón con escudo de parry). Cada uno aumenta velocidad y frecuencia, varía la movilidad y usa una tabla propia de tipos/carriles. Un único robot vivo y a lo sumo una pelota entrante real a la vez; los señuelos no provocan daño.
- Victoria tras seis KOs; entre rivales hay una pausa de transición de unos dos segundos, se borran ataques pendientes, aparece un nuevo robot con insignia propia y no se reinicia ni la cámara ni el anclaje AR. Barra de salud por rival, número 1/6–6/6, frases de entrada, premio de KO y récord separado.
- Duración máxima de duelos: 210 s; tres vidas conservadas entre rivales; sin carreras, saltos ni rastreo corporal, usando el teléfono como control.
- Pruebas: seis muertes reales mediante colisión barrida y transición automática, límite de un enemigo/una pelota, habilidad progresiva, timeouts y regresiones de Modo Clásico, Chromium 2D y XR simulado. Prueba física Android pendiente.

## V11 — Sincronización del rebote y controles táctiles (25/10/2026)

- Motivo: en Android una presión durante el acercamiento podía perderse por una ventana de 1,18 m y un límite de puntería lateral de 27 cm. Se amplió la tolerancia de captura a 1,38 m y la desviación a 37 cm (ajustada por distancia). El nivel PERFECTO sigue exigiendo puntería precisa.
- Buffer por proyectil: cuando la pelota real está cerca (máximo 1,83 m), se aproxima y está en la mira, un toque ligeramente anticipado se almacena hasta 190–280 ms y se ejecuta en el mismo proyectil cuando entra en ventana. No rebota balones lejanos, señuelos, enemigos nuevos ni ataques fuera de la mira; una presión equivale a un intento.
- Botón DEVOLVER conservado y una zona táctil invisible desde el 38% de la pantalla hasta abajo: dedo/pulgar pueden tocar cualquier lugar libre de ese sector. PAUSA y ajustes conservan sus controles. El evento pointerdown reacciona sin la demora del click; se suprime el click duplicado. Al registrar el toque anticipado se confirma con vibración breve y texto.
- Tests automáticos: input buffer, simulación a 90 Hz, no falsos positivos, misma pelota, conteo de intentos, pequeño desplazamiento lateral, zona de toque en Chromium Android emulado, XR sintético y regresiones.

## V12 — Game feel premium y correcciones finas

- El rebote cargado ya no se cancela al tocar otra vez el área inferior mientras espera la misma pelota: una devolución no suma más de un intento, ni se transfiere a otra pelota.
- El robot anuncia el lanzamiento desde el mundo AR con una carga luminosa en el pecho y levanta el brazo hacia el tiro. Hay una única señal sonora por ataque, sin alertas repetidas.
- Al devolver aparece un feedback visual grande y transitorio de PERFECTO / BUENA / ROCE, con puntuación y CSS accesible; el botón iluminado usa pulsación discreta y respeta movimiento reducido.
- Duelos muestran seis puntos de progreso, bonus crecientes por robot y recuperación de un escudo tras el tercer rival (solo si se había perdido).
- En entrenamiento 3D, tocar la zona inferior devuelve; arrastrar en esa misma zona rota la mira y **no** dispara por error. En AR físico el pointerdown sigue siendo inmediato.
- El motor WebGL usa una geometría de partículas compartida y evita crear sets nuevos por proyectil; se limita la cantidad de partículas simultáneas para preservar FPS.
- Gates: validación Node de doble toque, buffer, telegraph, KO y escudo; Chromium de HUD/tap/swap; WebXR sintético y regresiones. Las pruebas físicas en ARCore siguen requiriendo teléfono real.

## Arena AR inmersiva: escenografía espacial V12 (26/10/2026)

- Estructura **fijada al mismo anclaje WebXR**: plataforma modular de piso industrial en doce paneles 3D delgados, LEDs, anillos de borde y centro visible para el jugador; sin objetos pegados a la cámara ni falsos pasos físicos.
- **Plataforma del contrincante** ubicada detrás del campo de pelotas (z = -2,30 m), donde permanecen los seis robots; plataformas de un mismo equipo ancladas al mundo; el jugador no debe desplazarse hacia esos elementos.
- **Set dressing de arena**: dos columnas tecnológicas, balizas, cajas metálicas con tiras LED, cinco soportes de baranda y una barra de seguridad detrás de la plataforma enemiga. Los elementos grandes quedan fuera del pasillo de disparos para no tapar pelotas o robots.
- **Marcador holográfico 3D** hecho con CanvasTexture local (no descarga ni CDN): cambia nombre del rival para cada duelo, muestra título en clásico y mensaje al terminar. No hay texturas externas ni modelos GLB requeridos para cargar.
- Materiales metálicos PBR en piezas principales, neón transparente en adornos y animación de brillo de bajo coste. Recursos reutilizados para reducir allocations y draw calls; cleanup explícito al cerrar.
- Al usar + / −, **el suelo decorativo del jugador se escala con el tamaño de la pista**, sin escalar adversarios ni alterar física de pelotas; RECENTRAR sigue preservando la transformación del mundo.
- La escenografía es puramente virtual y no indica caminos reales ni requiere esquivar obstáculos. **No hay detección real del cuerpo ni de objetos de la vivienda**; jugar en lugar despejado, sin correr.
- Tests de Chromium y WebXR simulado: 40+ props, geometría compartida, suelo y objetivo fijos al anclaje, tamaño editable y carril de disparos preservado. ARCore físico pendiente.
