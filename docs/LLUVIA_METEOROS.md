# Lluvia de Meteoros AR — guía de entrega

Fecha: 24/10/2026. Código: meteoros.html, meteoros-core.js, meteoros-art.js, meteoros-runtime.js.

## Juego

- Solo de 72 s, 3 vidas, tres bots elegidos entre cuatro personalidades por partida, récord local, combos, near miss, escudos, fragmentos, cráteres, meteoritos grandes, señuelos con segunda advertencia y tormenta final.
- Core puro y determinista sin dependencias externas, posiciones/colisiones expresadas en metros. Caen hasta 4 meteoritos en una oleada y se reserva al menos una celda alcanzable durante la preparación.
- Fases: 0–14 s aprendizaje; 14–36 lluvia; 36–57 caos; 57–72 tormenta apocalíptica.
- Motor XR existente engine.js sin editar. Hit Test, ancla opcional y world matrix pertenecen al motor. El motor deja su raster de baldosas invisible y el juego presenta terreno y meteoritos con su propio WebGL (sombras y partículas procedimentales).
- Ubicación del dispositivo, nunca seguimiento del cuerpo o pies. Calibración de 1 s en reposo y zona muerta de 1,8 cm. Saltos de ARCore superiores a 30 cm entre fotogramas se descartan. Pausa por pérdida de pose. RECENTRAR no mueve la arena colocada.
- Se usa radio de arena de 0,64 m alrededor de la referencia inicial: buscar superficie despejada, no correr ni saltar. No corresponde a medir el perímetro de la casa.
- Modo 2D completo con Canvas HD, controles direccionales, click/tap para fijar posición de movimiento, bots, fases, recompensas y resultado final.

## Online: beta, NO finalizado

- Desde salas.html, crear sala del tipo lluvia-meteoros, invitar por WhatsApp, unirse, calibrar cada teléfono, marcar listo e iniciar.
- Reutiliza autenticación y canales privados existentes mc-rooms-client.js; no cambió ninguna tabla ni RPC del esquema modo_caos ni otros servicios de Supabase.
- El reloj se basa en startedAt/serverTime provistos por la sala y las olas se generan con semilla derivada del identificador de sala y startedAt. Cada participante calibra su propio mundo, sin alinear planos AR entre teléfonos.
- Posiciones/vidas/puntos de otros teléfonos se envían por Realtime y se validan superficialmente en el navegador. NO hay sistema autoritativo antifraude, reconexión probada ni prueba física 2–4 teléfonos. No presentar online como funcional verificado ni repartir recompensas competitivas de valor.
- Iniciar una nueva sala para revancha online.

## Checklist de aceptación

Automático: ejecutar node tests/meteoros.test.cjs en la raíz. Verificar semillas, penalizaciones, escudo, puntaje, generación determinista y compatibilidad HTML.

Manual 2D: abrir meteoros.html en Chrome de escritorio/móvil, iniciar demo 2D, moverse con las teclas o tocar la pista, recibir bonus, terminar una partida completa, comprobar resultados/revancha y HUD.

Manual WebXR OBLIGATORIO antes de afirmar compatibilidad: Chrome Android + ARCore y HTTPS, permitir cámara, apuntar a piso despejado, fijar arena, mantener quieto 1 s, verificar LISTO, mover físicamente teléfono 10–30 cm, verificar que avatar sigue a dispositivo y meteoritos siguen anclados al mundo al girar cámara, probar colisiones y pérdida temporal de tracking, recenter, FPS, memoria y fin de partida. Probar al menos dos modelos físicos y diferentes iluminaciones. Ninguna prueba automatizada sustituye estas pruebas.

Regresión: rutas y partida inicial de Color Rush, Ball Rush, Territorio X, Muro Rush y Semáforo. No publicar sobre color-rush-ar-demo: es otro proyecto.

Licencias: gráficos generados por código local WebGL/Canvas; no se descargaron assets de terceros. Audio por WebAudio. No contiene modelos GLB ni texturas PBR externas.

## Auditoría técnica adicional — 24/10/2026

- Se descubrió y corrigió el botón `#lock` oculto y los cuatro nodos DOM ausentes que `engine.js` requiere (`size`, `minus`, `plus`, `rotate`).
- El XR ahora inserta render del minijuego con el callback opcional postlimpieza `window.modoCaosXRFrame` del motor compartido: evita borrar meteoritos al limpiar el framebuffer. Los otros juegos no tienen que usarlo.
- Corrección del diseño de oleadas: una persona inmóvil antes sobrevivía sin daño; ahora las alertas se centran con alta probabilidad cerca de la ubicación física del teléfono en modo solo. Cada oleada solo se confirma si queda una ruta de escape teórica a menos de ~0,33 m, con avisos de al menos 1,68 s.
- Arena fijada al suelo antes de calibrar; una recalibración no vuelve a ubicar el mundo. Zona verde orientativa en oleadas intensas, cráteres y daño único por impacto con breve período de gracia.
- Audio procedimental: avisos y estruendo de explosiones generado por WebAudio sin archivos externos.
- Pruebas desde Actions: `node tests/meteoros.test.cjs` (núcleo y otros juegos), Chromium en pantalla móvil `node tests/meteoros-browser.test.cjs` (Canvas real, iniciar, botones, puntuación, pantalla de sala) y Chromium + Hit Test WebXR **SIMULADO** `node tests/meteoros-xr-smoke.test.cjs` (suelo, ancla, calibración, inicio y llamadas 3D GPU). Estas pruebas sintéticas NO comprueban ARCore físico.
- Se desactivaron CI duplicadas por push en rama de trabajo: PR ejecuta pruebas y `main` conserva controles de push. Preview Git se despliega automáticamente por Vercel, que puede exigir SSO.
- Estado online: no autoritativo, no certificado, no se cambió Supabase.

## Cambio de jugabilidad: protagonista físico sin avatar (24/10/2026)

- **AR en primera persona:** el humano NO se representa con un muñeco 3D. Solo se renderizan los meteoritos, sus zonas de peligro, recompensas y rivales controlados por computadora. Un aro verde orientativo aparece durante la calibración y desaparece al empezar, para que no parezca un avatar.
- **Arena física más grande:** radio fijo 1,12 m (diámetro **2,24 m**), comparable al campo visible de Color Rush; advertencia de jugar sólo en un espacio físico despejado de al menos ~2,5 m. Ninguna necesidad de correr.
- **Fijar → calibrar:** el Hit Test determina piso, altura y orientación; antes de fijar, la previsualización se centra en la proyección horizontal del teléfono. Al tocar FIJAR, se congela *una sola vez* esa posición mundial relativa. Un segundo quieto establece el origen de movimiento del teléfono. Después NO se recentra ni desplaza la escena automáticamente.
- **La posición física estimada es el protagonista:** en los impactos se usa el movimiento del **teléfono**, suavizado respecto de la calibración inicial, NO tracking de pies/cuerpo. En el modo 2D existe sólo un aro verde que muestra posición táctil, sin muñeco.
- **Pendiente**: ARCore real y comodidad en distintas casas (FOV, tamaño de suelo, ubicación inicial, iluminación, FPS); las pruebas automáticas de WebXR usan poses sintéticas, no cámara física.

## Ajuste AR por gestos y superficie CUADRADA — 24/10/2026

- La arena ahora es un **cuadrado**, no un círculo: límites `x,z ∈ [-1.12, +1.12]` del núcleo, colisiones, zonas seguras, IA y bordes visibles coherentes.
- **Durante la previsualización** (antes de FIJAR): arrastrar con un dedo traslada la pista sobre el suelo; pellizcar con dos dedos modifica el tamaño; girar con dos dedos modifica orientación. Botones visibles `−`, `2,24 m`, `+`, `↻ GIRAR` son alternativas.
- El motor compartido `engine.js` ya implementaba gestos: Modo Caos los reutiliza, eliminando el CSS `display:none!important` que los bloqueaba. Ajustes específicos vía `window.modoCaosGestureConfig`: tamaño de tablero motor de 0.32 a 0.65, equivalentes a un lado físico de **1,59–3,24 m** (tamaño predeterminado 2,24 m). Los juegos anteriores siguen con su configuración original.
- La matriz WebXR aplica **traslación, rotación alrededor del centro y escalado** únicamente durante la edición. Se fija al tocar FIJAR y no cambia durante calibración, partida, ni recentrar; el movimiento real del teléfono se divide por la escala elegida antes de efectuar las colisiones. No se representan pies ni se interpreta el teléfono como seguimiento del cuerpo.
- Prueba en Chromium con sesión XR simulada: controles `+ / − / GIRAR`, arrastre, gesto de pinza + torsión multitáctil vía CDP, centro estable al girar, dimensión 3D igual a la elegida, controles ocultos al fijar, calibración 1 s y movimiento del teléfono sin alterar la pista. Aún requiere prueba física con ARCore en Android.

## 24/10/2026 — Reparación AR basada en captura real: piso visible y seguimiento por celda

- El piso antes tenía únicamente un relleno muy transparente, con una cuadrícula poco visible. Ahora WebGL dibuja **25 celdas físicas coloreadas turquesa/azul con opacidad alta**, bordes verdes y realce de la celda elegida. Se conserva la cámara a través del contorno de la pista. El campo sigue siendo cuadrado y ajustable.
- El **primer FIJAR no inicia la calibración arbitraria en el centro**. Se muestra una selección táctil de 5×5 polígonos AR en la cámara. El jugador toca su celda real, como en Color Rush; hay botón *ESTOY EN LA CELDA CENTRAL* cuando corresponde.
- El juego acumula ~1 segundo de pose estable, registra la diferencia entre la pose de teléfono y el centro de la celda elegida: `origin.x = avg.x - cell.x * boardScale` y análogo para z. Luego marca inmediatamente la posición elegida en el núcleo físico.
- Durante la partida aparece un **punto YO pequeño anclado al piso** en la celda donde está el teléfono, no un personaje humano; también se muestra fila/columna en el HUD. Mover el teléfono desplaza ese punto y afecta colisiones. Perder tracking pausa y no provoca golpe imaginario.
- El botón RECENTRAR ahora **vuelve a abrir el selector de celda**, sin trasladar ni rotar la pista fijada; se pausa la partida mientras el jugador recalibra.
- Pruebas WebXR sintéticas: seleccionar la celda 6 (no central), verificar posición x/z -0,448, mover 0,19 m el teléfono y ver el marcador cambiar, recalibrar en celda 12 y comprobar que la matriz XR mundial permanece idéntica. **Todavía hace falta comprobar esto con el teléfono real**.
- No se trabajó en el aspecto de avatares rivales; queda como etapa posterior pedida expresamente.
