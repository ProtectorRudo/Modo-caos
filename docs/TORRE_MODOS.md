# Torre Caos — seis modalidades jugables

## Alcance
Se incorporaron **Torre Infinita (1), Equilibrio Mortal (2), Peso Pesado (4), Copiá la Figura (5), Cinco Piezas (6) y Demolición Caótica (8)** en **/torre.html**. Un único selector de seis tarjetas aparece antes de entrar al juego. El jugador elige el desafío y luego abre el modo AR (WebXR en Chrome Android/ARCore) o el modo 3D de respaldo. Cambiar modo desde Pausa o Resultado vuelve al selector.

Toda la implementación se mantiene aislada dentro de /torre* y docs/tests propios, además del enlace en el menú /index.html. No modifica engine.js, Color Rush, Ball Rush, Territorio X, Muro Rush, Supabase ni la producción del proyecto Color Rush original.

## Reglas reales
| Modalidad | Regla y fin de partida |
| --- | --- |
| 🏗️ **Torre Infinita** | Seleccionar y colocar cualquier pieza de la bandeja, girando con dos dedos; récord de altura física estable. Fin cuando se derrumba. No hay límite de tiempo. |
| ⚖️ **Equilibrio Mortal** | 60 s. Plataforma física comienza con 210 cm de ancho; se reduce después de cada dos bloques hasta 84 cm. La nueva base sustituye realmente al colisionador del soporte, no es un dibujo. Si la torre cae, pierde. Si termina el tiempo, resultado con altura estable. |
| 💪 **Peso Pesado** | 60 s. Plataforma de cuerpo rígido que puede rotar alrededor de Z, con un muelle de torque y topes mecánicos de ±0,45 rad. La gravedad y los impactos de cada bloque modifican la inclinación. Exceder aproximadamente 22° durante 0,7 s provoca derrota. La tabla y sus luces giran con el soporte; la proyección AR refleja esa rotación. |
| 🧩 **Copiá la Figura** | 75 s, tres piezas físicas y una **imagen de referencia en un panel separado**. Variantes: **Puente**, **Tótem** y **Casita**. El jugador construye en la plataforma vacía, nunca encima del modelo. Elige explícitamente cada pieza de la bandeja y en cualquier orden. Valida forma, posiciones **relativas** y orientación solo después de estabilizar la física. Victoria al reproducir las tres piezas dentro del tiempo. Se puede forzar una variante en pruebas con `?figura=0`, `?figura=1` o `?figura=2`. |
| 🎯 **Cinco Piezas** | Exactamente cinco formas conocidas (cubo, plataforma, columna, trapecio, L), disponibles juntas desde el principio. Construir una torre **estable de al menos 175 cm**, usando las cinco. No hay más entregas ni límite de tiempo. Fin después de colocar y estabilizar la quinta o tras derrumbe. |
| 💥 **Demolición Caótica** | 60 s, tres extracciones. Una construcción inicial de ocho cubos reales se asienta en Rapier. Elegir desde ocho botones qué bloque retirar; la pieza se elimina del mundo físico y puede provocar reacciones en cadena. 100 puntos por cada bloque desplazado, caído o volcado, más 20 por extracción, con máximo de puntos alcanzado a lo largo de la partida. **Cuatro o más bloques derribados** = demolición maestra. |

## Experiencia compartida
- Calibración AR: colocar plataforma sobre suelo real con Hit Test, agrandar/achicar, girar y fijar. Controles de juego: elegir pieza; toque para girar 90°, giro continuo con dos dedos, arrastrar y soltar para soltarla a la gravedad. Durante la partida AR los gráficos tienen capas Canvas2D/SVG/DOM además de Three.js, con anclaje al espacio.
- Física Rapier 3D con colisionadores de las formas reales, restricciones del plano vertical, paso fijo 1/60s y colisiones/masa/densidad.
- HUD con nombre del desafío, meta, tiempo restante si corresponde, altura o puntos, récord personal específico de cada modo, elección de pieza y visor auxiliar.
- Persistencia local por modalidad en `mc_torre_best_<modo>`, sin inventar rankings online.
- Botón de reinicio y botón «Cambiar modo» en Pausa y Resultado.
- Se preserva detección de derrumbe global, recuperación de oscilaciones y repetición de estados reales. Demolición no usa ese sistema de derrota porque precisamente busca derrumbar la estructura.
- Temporizadores basados en tiempo real de fotogramas, independientes del paso fijo de física; no siguen corriendo durante pausa o calibración.

## QA realizado y límites
1. **Unitarias puras**: seis configuraciones, encogimiento de base, coincidencia de siluetas, victoria/derrota del límite de cinco bloques y puntuación de demolición. Estas pruebas se ejecutaron satisfactoriamente antes de introducir la variedad final de tres siluetas y la meta de 175 cm; las aserciones nuevas se comprobaron además de forma independiente en el entorno JavaScript.
2. **Chromium + Rapier**: selector y arranque de los seis modos, cero errores JS; Puente completado físicamente con tres piezas, altura ~58 cm, «¡FIGURA PERFECTA!»; Cinco Piezas llegó físicamente a 205 cm con exactamente cinco bloques; Demolición retiró tres soportes, hizo caer seis bloques y obtuvo 640 puntos; Equilibrio Mortal achicó la base dos veces mientras la torre seguía estable; Peso Pesado mostró inclinación verdadera y se ajustó tras detectar vuelco excesivo.
3. **Rapier Node**: 14 formas, colisiones, apilamiento y restricciones del plano jugable probadas. Las tres plantillas actuales (Puente, Tótem y Casita) fueron verificadas con cuerpos reales en Rapier; la plantilla anterior de Pirámide se descartó porque sus piezas colisionaban y caían fuera de la base.
4. **Sintaxis y lógica**: última revisión `torre-runtime.js`, `torre-art.js` y `torre-modes.js` con análisis sintáctico JavaScript sin errores. Comparación de los tres objetivos contra sus correspondientes geometrías lógicas y validación de meta 175 cm pasaron.
5. **Pendiente imprescindible para certificación 10/10**: prueba física de los seis modos en un Android ARCore real; observación del FPS, proyección de objetivos, manejo de pausa/cambio de aplicación y comportamiento táctil después de varios turnos. Las pruebas Chromium son simuladas y no sustituyen prueba física de celular.

Mantener rama `feat/torre-caos` y PR #31 abiertos sin fusionar automáticamente; la preview de Vercel sirve para validar antes de publicar en producción.

## 25/10/2026 — Copiá la Figura: referencia independiente (corrección solicitada)

**Flujo**: entrar a Copiá la Figura → elegir modo 3D o AR → observar un panel siempre visible **FIGURA OBJETIVO** arriba a la derecha → **elegir una pieza por propia voluntad** en la bandeja (el juego deja de autoseleccionar la primera) → arrastrar, orientar con dos dedos y colocarla en la **plataforma totalmente vacía** → el motor deja estabilizarla y actualiza el progreso 1/3, 2/3 o 3/3 → victoria si se reproduce la estructura física.

- **Imagen de referencia real**: Canvas2D de 320×274 px dibuja las geometrías exactas con materiales coloreados, líneas de contraste, base y título; se representa en un panel fijo de interfaz independiente de la cámara, del Hit Test y de las coordenadas del tablero. Nunca es un objeto AR ni un ghost sobre los bloques.
- Se elimina expresamente `art.setTarget(currentTarget,...)`, el ghost proyectado por `renderARSpatial` y el contorno objetivo de `drawMini`. La mini vista lateral del jugador se oculta solo en este modo. El resto de modalidades no se modifica.
- La bandeja exhibe **exactamente** las tres formas necesarias antes de empezar. No se autoselecciona ninguna: el jugador elige el orden. El motor de físicas existente conserva la ubicación manual, los giros, las colisiones y la caída.
- La comparación utiliza `matchTarget` independiente de la traslación horizontal de la figura completa, y verifica el grafo de bloques mediante emparejamiento sin duplicados, forma, diferencias relativas (±0,17 m en X y ±0,16 m en altura) y ángulo ±0,36 rad. **No hay snapping ni autocolocación**. El progreso se actualiza únicamente una vez estabilizadas las piezas.
- Reemplazada antigua plantilla Pirámide por **Casita** (base rectangular, cuerpo cúbico y techo triangular) después de que las pruebas reales de Rapier demostraran que dos cubos contiguos sobre la base antigua se empujaban y la derribaban.
- AR y 3D usan la misma lógica de validación. En AR, la imagen queda fija como interfaz de referencia, pero los bloques siguen anclados físicamente al piso real.

**Pruebas ejecutadas**: unitarias `node tests/torre-modes.test.cjs`, `node tests/torre.test.cjs`, física `node tests/torre-rapier.test.mjs` (las 14 formas + estabilidad de las tres plantillas), y tres partidas completas en Playwright+Chromium con motor Rapier real (390×844): Puente con orden de cubos invertido y estructura desplazada 26 cm, Tótem y Casita, cada uno alcanzó 1/3 → 2/3 → 3/3 y terminó en «¡FIGURA PERFECTA!» sin error JavaScript. Comprobado que la referencia es visible, la mini vista se oculta, la geometría fantasma 3D está vacía, el jugador empieza sin pieza activa, las tres miniaturas aparecen y la imagen está por encima de la bandeja sin superposición. Regresión de los otros cinco modos 5/5 sin errores en navegador y con selector/bandeja funcional.

**Límite de verificación:** pruebas WebGL en Chromium automatizado y físicas Rapier reales, **no prueba WebXR/ARCore en el celular del usuario**; falta validar visualmente el tamaño y posición del panel en Android físico antes de integrar en producción.

## 25/10/2026 — Objetivo miniatura, sin tapar visión AR

Captura real de Android: la referencia ocupaba aproximadamente la mitad del ancho útil y buena parte del alto del campo visual. Corregido **solo para el modo Copiá la Figura**:

- Tarjeta con imagen objetivo y contador visible en tamaño **compacto por defecto** (aprox. 117 × 169 CSS px en viewport 390 × 844; ~6 % de la superficie de pantalla, frente al antiguo panel mucho mayor).
- Tarjeta en esquina superior derecha, debajo del HUD, sin superposición con la bandeja. Contiene nombre del modelo, miniatura y progreso `0/3`.
- **Ampliación voluntaria** al tocar la tarjeta o el icono `⤢`; botón accesible con `aria-expanded` y etiquetas «Ampliar / Reducir». Ampliada: ~261 × 336 px en 390 × 844. Tocarla de nuevo la reduce.
- La ampliación **se reduce automáticamente** al seleccionar o mover una pieza, por lo que no tapa la torre cuando se construye. Una partida nueva inicia compacta. Mantiene los cuerpos físicos, cámara AR y validación de referencias separadas del mundo.
- Prueba automatizada Chromium móvil con 390×844, 360×740 y 430×932: miniatura compacta 5–7 % de la pantalla; zoom y reducción en un toque, selección de pieza autocolapsa, contador e imagen visibles, la bandeja no queda tapada, cero errores JavaScript.
- Regresión Playwright: otros 5 modos arrancan en fase `playing`, sin mostrar el panel de referencia y con cero errores.
- Persisten pendientes la observación manual del tamaño visual y el toque en un teléfono ARCore real.


## 25/10/2026 — Demolición Caótica: interacción directa y piezas premium

Solicitud basada en prueba AR en Android: la torre ya estaba montada, pero cada extracción se hacía mediante un inventario inferior; las ocho piezas tenían el mismo material celeste casi transparente. Esta revisión modifica **solamente** ese modo.

- **Sin bandeja inferior**: el inventario de bloques de Demolición se elimina del DOM durante la ronda; se oculta también la mini vista lateral para liberar el campo AR. Sigue visible un texto corto: «TOCÁ UN BLOQUE PARA SACARLO». HUD usa **PTS** en vez de la anterior unidad CM para puntos y récord de demolición.
- **Toque sobre pieza real**: en 3D el motor `TorreArt.pickBlockAt(x,y)` usa `THREE.Raycaster` contra los meshes sólidos y excluye los `LineSegments` decorativos. En WebXR, la misma geometría visible se proyecta cada fotograma con la cámara XR en polígonos de pantalla, se registran sus profundidades y se elige la superficie más cercana que contenga el dedo (`TorreDemolition.hitAt`). Los cubos y la zona de toque siguen fijados espacialmente; nunca se hace una selección por posición fija de pantalla. Un toque corto extrae inmediatamente; deslizar el dedo o tocar afuera no consume intentos. Solo se permite tocar durante `playing` y con extracciones disponibles.
- **Efectos y física**: borde resaltado al presionar, realce de material con emissive, destello en la posición de la pieza, sonido, vibración y texto breve al extraer. Se retira el cuerpo rígido Rapier y su mesh; los demás reaccionan y los puntos se recalculan con la lógica existente, sin simulación de derrumbe inventada.
- **Arte de bloques**: ocho colores diferentes (`#25dbc9`, `#ffb347`, `#755bff`, `#ff648f`, `#a886ff`, `#a8e653`, `#438cff`, `#ff8354`), uno por ID de pieza. Materiales opacos `MeshPhysicalMaterial` de plástico brillante, clearcoat, volumen extruido biselado, caras laterales más oscuras, panel frontal en relieve, filetes de luz, sombras suaves y realce de selección. La ruta visual AR ya existente Canvas2D/SVG/HTML usa el mismo color por pieza y añade gradientes y líneas de relieve, para los dispositivos en los que Three.js XR no se compone correctamente.
- **Arquitectura**: `torre-demolition.js` funciones puras de color y hit testing; `tests/torre-demolition.test.cjs` prueba detección de polígonos, prioridad de profundidad, toque fuera de la figura, deslizamiento e IDs/colores. Cambios acotados a `torre.html`, `torre-runtime.js`, `torre-art.js`, sin tocar motores comunes, Supabase ni los otros juegos.

**QA ejecutada**: `node tests/torre-demolition.test.cjs`, `tests/torre.test.cjs`, `tests/torre-modes.test.cjs` y `tests/torre-rapier.test.mjs`: OK. **Playwright/Chromium 390×844** con simulación Rapier: 8 cuerpos 3D con 8 colores distintos, bandeja y mini vista ocultas; click fuera y arrastre sin consumo; click en el bloque 7 retira **exactamente el ID 7**, pasa de 8 a 7 cuerpos y 1 extracción, tras estabilización suma 20 pts. Cero errores JavaScript. **Simulación del fotograma AR**: 48 regiones táctiles correspondientes a 8 cuerpos y 8 colores distintos; el toque en polígono de bloque 7 lo retira con el mismo resultado, sin lista de botones y sin errores. **Regresión**: los otros cinco modos arrancan y permiten arrastrar/soltar pieza, 5/5 sin errores.

**Pendiente**: probar físicamente ARCore en el celular Android real (especialmente correspondencia entre dedo y cubo desde diferentes ángulos, contraste de colores con la cámara y FPS). No declarar AR físico verificado solo por simulación.

## 25/10/2026 — Demolición Caótica: 10 rondas, 40 figuras y puntuación continua

Cambio solicitado tras probar el modo de extracción directa: antes solo había una torre de **dos columnas rectas** con cuatro niveles, y tras tres extracciones se acababa la partida. Ahora funciona como una campaña breve de **10 rondas**, elegidas entre **40 figuras** con siluetas distintas.

- **Biblioteca de 40 construcciones authored** en `torre-demolition.js`. Cada figura es una distribución de columnas de cubos con alturas diferentes (3 o 4 columnas, 4–16 piezas), construida con las dimensiones y separaciones físicas del motor Rapier. Hay castillos, torres asimétricas, escalones, picos y valles; la primera dificultad incluye columnas altas aisladas, evitando el muro anterior de dos filas uniformes.
- **Aleatoriedad sin repeticiones:** `D.plan(random)` usa Fisher–Yates por nivel para escoger 10 figuras distintas, 2 del nivel 1, 3 del 2, 3 del 3 y 2 del 4. El primer escenario y el orden cambian entre partidas; la complejidad aumenta progresivamente.
- **Tres extracciones por figura** y **32 segundos por ronda**. Tras la tercera extracción se espera el asentamiento físico del derrumbe, se concede puntaje y se pasa automáticamente a una figura nueva mediante transición visual breve de ~1,35 s. Si se agota el tiempo, también avanza. Al completar la décima, pantalla final y récord.
- **Puntos acumulados:** 100 puntos por cubo derribado (desplazamiento físico real) + 20 por extracción + 50 por cada caída adicional en cadena, sin resetear el total entre figuras. Si se usan las tres extracciones dentro de los 32 s, se suma 2 puntos por segundo restante. El HUD muestra total, ronda/10, nombre de figura, extracciones restantes y una barra de progreso.
- **Calibración AR intacta entre rondas:** la transición elimina únicamente cuerpos Rapier y mallas de la torre; mantiene el mundo físico, la plataforma anclada, posición, escala y orientación del grupo Three.js. No vuelve a pedir cámara ni Hit Test. No se altera ningún juego ni modalidad ajena.
- **Registros:** récord local del puntaje total para las 10 rondas, y resumen de cada figura para la pantalla final. Un nuevo intento genera otra selección aleatoria.

### Verificación realizada

1. `node tests/torre-demolition-rounds.test.cjs`: biblioteca de 40 siluetas geométricamente únicas, cuerpos apoyados, 220 barajas distintas con 10 figuras sin repetir y dificultad creciente, puntuación por combos y tiempo restante.
2. Físicas Rapier auténticas, no animaciones dibujadas: **40/40** estructuras apoyadas durante 245 pasos de simulación, ninguna se derrumbó sola. Ejemplo: castillo inicial con 5 piezas, al retirar base central se cayeron **dos cubos**, 270 puntos.
3. Partida Chromium móvil 390×844 con Rapier real y script QA: **10/10 rondas** y 10 IDs sin repetir; puntuación acumulada, intermisiones, trofeo final, récord, reinicio y nuevo deck correctos; sin excepciones JavaScript. Escenario alternativo: tiempo agotado en ronda uno y transición normal a ronda dos.
4. Regresión navegador de Torre Infinita, Equilibrio Mortal, Peso Pesado, Copiá la Figura y Cinco Piezas, **5/5 sin errores**. Bandeja en esos modos y panel especial solo en Demolición.

**Pendiente de verificar físicamente:** FPS, hit test y tamaño en un dispositivo Android compatible con ARCore; los resultados del navegador de pruebas no sustituyen esa prueba.


### Solicitud de publicación — 25/10/2026
Esta rama reúne el código integrado en main para las diez rondas de Demolición Caótica y sirve para verificar el despliegue automático de Vercel antes de asignar el dominio habitual. No contiene alteraciones a otros minijuegos.
