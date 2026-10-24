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
