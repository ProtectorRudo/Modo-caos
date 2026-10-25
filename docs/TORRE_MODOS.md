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
| 🧩 **Copiá la Figura** | 75 s, tres piezas físicas y un modelo transparente. Existen tres variantes: **Puente**, **Tótem** y **Pirámide**. El modelo se dibuja en Three.js, la mini vista lateral y la capa WebXR. Se compara cada cuerpo estabilizado en forma, X, Y y orientación; no hay encajes automáticos. Victoria al acertar las tres piezas dentro del tiempo. Se puede forzar una variante en pruebas con `?figura=0`, `?figura=1` o `?figura=2`. |
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
3. **Rapier Node**: 14 formas, colisiones, apilamiento y restricciones del plano jugable probadas. Se agregaron aserciones de física para los otros dos modelos de Copiá la Figura, pero **no se pudieron ejecutar después del cierre del entorno temporal de QA**. No declarar esas dos variantes físicamente verificadas.
4. **Sintaxis y lógica**: última revisión `torre-runtime.js`, `torre-art.js` y `torre-modes.js` con análisis sintáctico JavaScript sin errores. Comparación de los tres objetivos contra sus correspondientes geometrías lógicas y validación de meta 175 cm pasaron.
5. **Pendiente imprescindible para certificación 10/10**: prueba física de los seis modos en un Android ARCore real; observación del FPS, proyección de objetivos, manejo de pausa/cambio de aplicación y comportamiento táctil después de varios turnos. Las pruebas Chromium son simuladas y no sustituyen prueba física de celular.

Mantener rama `feat/torre-caos` y PR #31 abiertos sin fusionar automáticamente; la preview de Vercel sirve para validar antes de publicar en producción.
