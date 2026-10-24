# RODEADOS 360 · ingeniería, pruebas y límites (24/10/2026)

## Concepto y procedencia

Nuevo minijuego para Modo Caos desarrollado desde el Word **🎮 MODO CAOS — DESARROLLO INTEGRAL DE RODEADOS 360**. El protagonista es el jugador físico; no se representa como humano 3D ni se mueve con joystick. Cada persona mira y apunta mediante la orientación real del teléfono en AR.

Archivos:
- `/rodeados.html`: portada, modos, controles AR, HUD y estadísticas.
- `/rodeados-core.js`: núcleo determinista y autónomo en metros; seis enemigos, ocho sectores, colisiones, daño, tiros raycasting matemático, oleadas, EMP, puntajes.
- `/rodeados-art.js`: modelos originales de robots articulados a escala 1.6–2.2 m, sombreado y luz, piso, rifle 3D, portales, FX.
- `/rodeados-runtime.js`: renderer Three.js 0.181, sesión nativa WebXR, Hit Test, ancla opcional, matriz estable de arena, gestos, calibración, combates, entrenamiento sin cámara, Supabase sala beta.
- `/tests/rodeados.test.cjs`: pruebas lógicas, ejecutar `node --test tests/rodeados.test.cjs`.
- `.github/workflows/rodeados-tests.yml`: comprobación de sintaxis y core.

## Referencias reutilizadas

**COLOR BASH / COLOR RUSH + Meteoros:** paradigma de hit-test, cuadrícula 5×5, edición táctil (arrastre con un dedo, pellizco para escalar y rotación de dos dedos) y selección manual de una celda; muestreo 1 s quieto y seguimiento del teléfono respecto del mundo. Estos algoritmos se adaptaron en módulo nuevo a Three.js; **no se copió `engine.js` literalmente**, ya que su bucle WebGL propio no comparte framebuffer de forma segura con un segundo renderer XR.

**BLACKZONE V34:** Three.js/WebXR, escala humana, orientación de cámara física, MeshStandardMaterial, sombras de contacto simuladas, robot con articulaciones y golpes por rayo. Robots y armas de RODEADOS 360 son geometría original, no transfieren modelos sanguinolentos ni personajes humanos.

## Flujo AR

1. Botón abre sesión `immersive-ar` HTTPS Chrome Android compatible ARCore. Si no está disponible, advertencia y entrenamiento.
2. Hit Test detecta plano horizontal con normal Y positiva. Se presenta pista cuadrada visible y manipulable.
3. Al fijar se guarda transformación de la arena, tamaño, rotación y traslado; ancla espacial opcional corrige deriva, siempre relativa a la transformación fijada.
4. El jugador toca la celda física donde está; marcador seleccionado permanece visible.
5. Con el teléfono quieto ≈1s, se calcula offset de calibración entre pose observada y centro de celda. La posición continúa siguiéndose en metros reales del teléfono, sin teleportar arena al iniciar.
6. Cuenta regresiva, enemigos desde sectores en toda la periferia; los disparos se calculan con rayo del visor en coordenadas del mundo anclado.

**Nota de seguridad:** WebXR sigue **el teléfono**, no pies ni cuerpo. El juego no obliga a correr, caminar hacia atrás ni identificar muebles automáticamente; la arena virtual no detecta colisiones con muebles reales.

## Modos y niveles

- Supervivencia: 90 s.
- Caos infinito: hasta perder la vida.
- Reflejos extremos: 60 s.
- El Burlón: 75 s, provocaciones y esquivas.
- Jefe final: 90 s, robot de gran tamaño y alta resistencia.

Dificultad y oleadas crecen con tiempo; los robots no aparecen dentro del radio inicial del jugador ni se atraviesan según el algoritmo de separación. Escala de los seis robots calculada en unidades métricas.

## Salas multijugador (BETA NO CERTIFICADA)

La sala se crea/entra mediante `/salas.html` y RPC `mc_*` del proyecto Supabase compartido. El juego busca la sesión existente, verifica membresía de sala y usa canal Realtime privado de la infraestructura ya creada. Los clientes reciben snapshots comprimidos; el anfitrión del juego valida tiros con su core en el navegador. Esto **NO constituye autoridad de servidor confiable** ni suficiente antifraude. Faltan protocolos de reconciliación/reconexión probados, equipos implementados, y en especial **alineación espacial física entre celulares**: actualmente cada teléfono define su arena local; no hay ancla compartida real ni alineación de marcadores de referencia intercambiada.

No tocar ni exponer datos de Viralio o Te Hice Esto. No ampliar SQL ni autenticación global sin revisión de seguridad del trigger compartido `on_maurilio_auth_user_created`.

## Matriz de validación antes de declarar premium / comercial

| Aspecto | Verificación requerida |
|---|---|
| Sintaxis JS y lógica de 360°, raycasting, daño y oleadas | Pruebas Node/CI |
| Entrenamiento 3D sin AR, HUD, reinicio, controles | Chromium o teléfono, test visual |
| Cámara AR nativa, tamaño humano, Hit Test, escala y FPS | **Celular Android ARCore real** |
| Arrastrar/rotar/pellizcar en editor, elegir celda 1–25 | **Celular Android real** |
| Posición estable después de girar 90° / 180° / 360° | **Celular Android real** |
| Disparos en mirilla sin desalineación, recarga y háptica | **Celular Android real** |
| Realtime privado, dos teléfonos conectados | **Dos teléfonos reales y JWT diferentes** |
| Escena espacialmente idéntica entre teléfonos | **No implementado ni comprobado** |
| Antifraude, ranking remoto y servidor autoritativo | **Pendiente** |
| Regresión de otros juegos y rutas públicas | Pruebas CI/HTTP + revisión manual |
| Producción lista para vender | **No hasta completar pruebas físicas** |

## Mejoras posteriores pendientes

Animaciones GLB esqueléticas con licencias verificadas; audio espacial HRTF y música original; optimización y análisis ARCore real; validación antifraude server-side, mejores reconocimientos y retos diarios, alignment multi-AR con puntos compartidos y control de distancia; equipos; tornados de spawn más variados; atención a accesibilidad y fotografía real. Estas tareas no se confunden con funciones verificadas.

## V2 · Diseño y seguridad incorporados (24/10/2026)

- Radar 360° con orientación relativa a la cámara: blanco representa el celular; enemigos próximos se marcan en rojo, jefes en amarillo y otros robots en menta. No muestra datos de objetos/muebles reales.
- Indicador de oleada, racha, confirmación de impacto y daño sin ocupar el centro durante toda la partida.
- Retícula centrada al 50% de la pantalla para corresponder al rayo 3D `(0,0,-1)`.
- La posición estimada fuera del perímetro + 35 cm produce pausa de seguridad, sin animar a correr.
- Ancla WebXR solicitada dentro del siguiente `XRFrame` tras fijar pista. Si `frame.createAnchor` no se ofrece, se intenta Hit Test vivo y, si tampoco funciona, continúa el tracking del sistema de coordenadas local.
- Al usar WebXR inmersivo no se reconfigura dinámicamente el pixel ratio del renderer. El control adaptativo sigue disponible en entrenamiento 3D.
- Test unitario `tests/rodeados-ux.test.cjs`: izquierda/derecha/atrás, orientación del radar, alertas por oleada y daño.
- Chromium/WebGL y WebXR simulado ahora comprueban HUD radar presente durante juego y ausente durante la selección de celda.

**Seguimos sin pruebas físicas certificadas de ARCore ni gameplay online real de dos equipos; estas pruebas de software no las sustituyen.**
