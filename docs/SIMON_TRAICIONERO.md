# Simón Traicionero — implementación AR 3×3 (24/10/2026)

## Objetivo y accesos
Juego de memoria sobre nueve cerámicos reales, basado en el documento «DESARROLLO INTEGRAL DE SIMÓN TRAICIONERO». Fuentes: `simon.html`, `simon-core.js`, `simon-art.js`, `simon-runtime.js`. Menú y selector de salas beta integrados; motor compartido `engine.js` permanece compatible con los demás juegos mediante una **opción opt-in**.

**Rama para pruebas:** `feat/simon-traicionero-ar`. No utilizar el proyecto antiguo `color-rush-ar-demo` para este juego.

## Flujo WebXR
1. Chrome Android/ARCore abre cámara mediante `immersive-ar` con Hit Test y DOM overlay.
2. El motor busca una superficie real y visualiza una cuadrícula WebGL **3×3** en lugar de la cuadrícula 5×5 original mediante `window.modoCaosXRCustomBoard=true`.
3. Arrastrar, pellizcar con dos dedos, girar y fijar. Paso de `boardSize` = distancia entre centros de celdas de 0,32–0,80 m.
4. Elegir celda inicial 1–9. Se muestrea el `XRViewerPose` durante 1,05 s. Si las muestras varían más de 9,5 cm, se repite la muestra.
5. Desplazamiento: posición local de **teléfono** calculada a partir de `W` (matriz fija del tablero), más el offset de calibración; no se infiere seguimiento real de pies.
6. Identificar celda estimada, zona interior y **permanencia de 630 ms** cerca del centro; bloquear rebotes y activación duplicada hasta la salida de la celda. Recalibración disponible sin perder la puntuación.
7. Una pérdida de pose mayor a 1 s pausa la acción. Reanudar sólo tras recuperar la posición.

## Modos y trampas
- `clasica`: secuencias sin trampas, una vida; `mortal`: tres vidas, trampas y desafío escalonado; `panico`: tres rondas largas y rápidas.
- Ocho eventos: eléctrica, identidad/intercambio de colores, reloj, fantasmas, mentira visual/sonora (seguir lo visual), apagón de los **objetos virtuales**, eco de audio e inversión de secuencia.
- Un generador xorshift produce secuencias por semilla reproducibles; no se generan repeticiones inmediatamente consecutivas.
- El tiempo activo depende de la longitud de la secuencia y hay pausas entre fases. No correr ni saltar.

## Reutilización y degradación
- WebGL nativo, tablero de nueve baldosas, relieve, bordes neón, host robótico, colores intensos, destellos de acierto/error y marcador VOS.
- El dibujo opt-in sólo reemplaza las baldosas predeterminadas cuando `modoCaosXRCustomBoard` está activo. Otros juegos conservan sus 25 celdas.
- Modo 2D convencional, jugable mediante toques; **se anuncia claramente que no es AR**.
- Síntesis de voz optativa; señales y mensajes legibles sin voz. Control básico de volumen/silencio.

## Multijugador
- Opción `simon-traicionero` visible en salas y navegación al juego; el navegador muestra aviso de beta.
- **NO está implementada la validación autoritativa del resultado ni la sincronización final entre dos móviles reales.** Sin nuevas RPCs no se deben dar puntos competitivos oficiales; esta versión individual no debe presentarse como multijugador completo.
- Aislamiento de la BD compartida: esta entrega **no realiza ninguna migración** y no modifica tablas de Viralio, Te Hice Esto ni Auth.

## Validación y pendientes
- Núcleo: tests determinísticos de los tres modos, vidas, timeout, reintentos, las ocho trampas y transiciones.
- Revisión estática de sintaxis JS y de elementos DOM; Chromium móvil para iniciar juego 2D, reproducir secuencia, introducir aciertos y llegar a ronda 2. Ver `tests/simon.test.cjs`, `tests/simon-browser.test.cjs`, `.github/workflows/simon-tests.yml`.
- **PENDIENTE:** prueba física Android/ARCore con 9 posiciones, distancias reales, giros, gesto de pinza, pose perdida, seguimiento y seguridad.
- **PENDIENTE:** prueba online independiente 2–4 JWT/dispositivos y resultados validados por servidor.
- **PUBLICACIÓN:** la cuota de la cuenta Vercel devolvió `api-deployments-free-per-day` (402; límite de despliegues diarios). GitHub Pages alternativo requiere habilitar GitHub Pages con permisos adecuados; el workflow existente falla en `actions/configure-pages` por `Resource not accessible by integration`. No declarar desplegada esta rama hasta que un endpoint HTTP de la versión final responda.
