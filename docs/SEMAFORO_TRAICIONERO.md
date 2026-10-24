# Semáforo Traicionero — MODO CAOS

## Acceso y archivos

- Ruta: `/semaforo.html`. Demo 2D y AR WebXR sobre piso real.
- `/semaforo-core.js`: juego determinístico sin dependencia de cámara o DOM.
- `/semaforo-art.js`: representación AR con perspectiva anclada a `/engine.js` y render demo 2D Canvas.
- `/semaforo-runtime.js`: calibración del teléfono, controles, sonidos, HUD, resultados y cliente online experimental.
- Compartido, **sin cambios**: `/engine.js`, sus funciones hit test, anchor, matriz y proyección. Los originales Color/Ball/Territorio/Muro no fueron modificados.

## Reglas

- Individual: VOS, RAYO (veloz), TITO (despistado), ZEN (cauto).
- Semáforo grande manda: verde avanza, amarillo avisa sin sanción, rojo exige quietud tras un margen de 0,66–0,83 segundos.
- Sanción: retroceder 11 % de la pista virtual y perder 1 de 3 vidas. El rojo tiene enfriamiento de 0,94 segundos entre sanciones.
- Duración hasta 76 segundos de carrera más cuenta regresiva (2,4 s), o hasta que todos terminen.
- Semáforos falsos son secundarios y **nunca** cambian el significado del semáforo principal.
- Oro duplica puntos verdes; turbo acelera progreso; otras señales especiales aportan distracción legible sin sanción injusta.
- Bonus de combo al soltar AVANZAR a tiempo en amarillo, limitado a uno por ciclo.
- Colisiones suaves con bots en el mismo carril sin eliminación inmediata.
- Celebración, récord local, clasificación y revancha.

## Entrada segura a AR

1. Abrir en Chrome Android compatible con WebXR immersive-ar/ARCore.
2. Buscar el piso con la cámara, ajustar pista y presionar FIJAR PISTA.
3. Quieto con el teléfono cerca de un segundo para completar calibración (sin reset al empezar).
4. Presionar A JUGAR. El modo predeterminado es **MOVIMIENTO REAL DEL TELÉFONO**, no botones: cuando esté en verde acercá el teléfono unos 6–10 cm hacia el semáforo y regresá suave a la posición inicial; cada impulso válido hace que VOS avance en la pista virtual. Repetilo a un ritmo cómodo sin desplazarte por la habitación. Durante amarillo frená y en rojo quedate quieto.
5. Para jugar de otra manera, tocá **🎮 BOTONES** durante la carrera, y aparecerán los controles en pantalla. **🚶 MOVIMIENTO** vuelve a activar el mando físico. Los botones de la demo 2D se mantienen. No implica seguimiento de pies o cuerpo.
6. RECENTRAR recalibra la referencia del móvil sin mover el anclaje del tablero; pausa el motor mientras recalibra. La ventana de movimiento tolera ~2,8 cm laterales y ~9,5 cm de oscilación accidental al estar quieto en rojo, con >0,7 s de reacción; filtra saltos de relocalización de ARCore.
7. Si falla tracking, el motor deja de procesar avances/penalizaciones hasta recuperar la pose.

La API de WebXR mide **teléfono**, no pies, ni pelvis, ni piernas. No inferir seguimiento corporal. Los impulsos físicos no equivalen a recorrer metros reales.

### Segunda etapa — rediseño centrado en el jugador físico

- `/semaforo-motion.js`: motor separado de detección de impulsos del dispositivo, con desacople de render, calibración, orientación del tablero y reglas.
- La posición del teléfono mueve a VOS de forma virtual; desplazamiento lateral real filtra hacia los carriles. La pequeña trayectoria de ida/vuelta vuelve a armar el impulso; no demanda avanzar físicamente 15 metros ni correr.
- **AR predeterminado sin botones**. Botones a demanda y demo 2D tradicional conservados.
- La pantalla de juego oculta `REUBICAR` (control heredado del motor), muestra indicación física breve al iniciar y libera el centro de la escena.
- Textos AR en español y calibración compacta sin el recuadro fijo enorme.
- `node tests/semaforo-motion.test.cjs`: movimiento físico repetido, reinicio del gesto, tolerancias, señal roja, salto ARCore, movimiento lateral y carrera física completa. Simulación de control *no equivale a prueba de sensores reales*.


## Multijugador experimental — NO CERTIFICADO

- `/salas.html?game=semaforo-traicionero` crea/unifica salas con las RPC `public.mc_*` existentes en el schema separado `modo_caos`; la app comparte la base Viralio y no modifica sus tablas.
- Desde una sala de Semáforo, ABRIR SEMÁFORO Y CALIBRAR lleva a `/semaforo.html?room=<CÓDIGO>`.
- Cada celular entra con **su propia** autenticación Supabase, anclaje AR y calibración.
- El anfitrión inicia cuando los miembros están listos; el reloj se re-alinea al timestamp de inicio del servidor y las señales siguen la misma semilla de sala.
- Los estados de los avatares se envían por canales Realtime privados con pertenencia verificada y polling de respaldo. El navegador publica los propios resultados *provisionales*: **no existe aún validación confiable de puntuación/resultados por servidor**. Los mensajes de otros clientes son datos no confiables y están limitados al modo de visualización.
- No se verificó una sesión verdadera entre 2–4 celulares, reconexión real ni latencia de señales en hardware. Tampoco existe anclaje espacial compartido entre distintos celulares; cada uno ubica su propia pista.
- A fin de llegar a torneo online genuino hay que implementar autoridad de tiempo, puntuación y anti-manipulación en backend, más tests reales de desconexión y presencia.

## Pruebas realizadas

Automáticas y simuladas, **no físicas**:

- Compilación sintáctica de los tres módulos JS.
- `node tests/semaforo.test.cjs` simula cuenta regresiva, señal, reacción, margen, castigo, progresión, reproducibilidad con 50 semillas y cierre con ranking.
- Simulación DOM sin navegador físico: partida completa 2D, resultado con cuatro posiciones y revancha.
- Mock de transformaciones y poses XR: el render SVG proyecta avatares y semáforos sin lanzar excepción; Canvas 2D procesa fotogramas simulados.
- Integridad: SHA de los archivos de los cuatro juegos anteriores y `engine.js` iguales a `main`.
- Preview en Vercel: `READY`. Las URLs por subdominio de preview requieren autenticación SSO; HTTP público y pruebas de cámara no pueden certificarse con este medio.

## Pruebas físicas pendientes

- Android + Chrome + ARCore: cámara, Hit Test sobre superficies de distinto material, anclaje estable, vibración, audio, calibración, recenter y sin teletransporte.
- Actualización de FPS y legibilidad en pantallas reducidas, UI inferior y sombra/anclaje del avatar.
- Dos Android distintos: Auth/Realtime privados y denegación a no-miembros, listas listas, inicio simultáneo, reloj y señal compartidos, resumen sin doble resultado.
- Reintento si un móvil pierde tracking, red o sesión. Medir latencia y gasto sobre proyecto Supabase compartido.
- Revisar visualmente el arte final antes de declararlo calidad premium en hardware.

**Regla de publicación:** la demo individual puede ofrecerse con aclaración de pruebas físicas; online se mantiene como beta y no se anuncia como torneo competitivo validado.
