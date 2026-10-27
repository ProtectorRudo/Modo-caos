# RODEADOS 360 V28 — Tiempo Roto y Rescate del Rehén

## Estado de publicación

- PR experimental [#113](https://github.com/ProtectorRudo/Modo-caos/pull/113) contra V27; **NO fusionado con main**.
- Código y pruebas versionados; **Vercel rechazó publicar HEAD V28** con HTTP 402 (`api-deployments-free-per-day`). Cualquier preview antigua de este branch es PARCIAL, no confundirla con la versión final.
- Captura la Bandera sigue usando exactamente el mismo mapa AR manual, base, bandera fija, transporte al recoger y spawns elegidos por el jugador. No se tocó su lógica.
- El rifle orientado hacia retículo heredado de V27 se carga mediante cache-busting `rodeados-art.js?v=28` para evitar arte anterior en la versión jugable.
- Core Node + Chromium WebGL + WebXR **sintético**, no pruebas físicas en ARCore ni multijugador humano certificado.

## Rescate del Rehén (10 niveles)

1. Se selecciona `RESCATE DEL REHÉN` desde el menú, **sin pantallas ni editores tácticos**.
2. El piso se fija/calibra igual que en los modos clásicos y permanece anclado durante toda la sesión.
3. Cada nivel genera automáticamente **siete entradas enemigas** en posiciones aleatorias alrededor del rehén. Semilla reproducible para tests; nuevas posiciones en cada etapa.
4. Rehén civil naranja aparece en modelo 3D, fijado al suelo real. Se apunta y se dispara a guardias; se camina con el teléfono a distancia menor a 0,75 m y se pulsa **LIBERAR REHÉN**.
5. Tras liberar al rehén, su visual acompaña la posición lógica calibrada del teléfono hasta la base. Al volver a menos de 0,85 m se pulsa **ENTREGAR REHÉN**. Sin teletransporte ni autoentrega.
6. Tras entregar, hay 2,5 segundos de transición y empieza automáticamente la etapa siguiente. Se conserva la puntuación y hasta 14 puntos de vida se recuperan. Se genera un rehén nuevo con nuevos guardias.
7. Hay un reloj específico de cada nivel (~41 s iniciales y hasta 29 s en nivel 10); si vence sin rescatar se pierde la misión. Si el rehén pierde salud mientras es escoltado también se pierde.
8. Dificultad progresiva: 2–6 guardias iniciales, más HP cada tres etapas, mayor frecuencia de aparición y menor tiempo; desde nivel 8, guardias pesados y patrullas rápidas.
9. Nivel 10 entrega termina la misión con título **¡SALVASTE A LOS 10 REHENES!**.
10. El teléfono no detecta obstáculos o pies. El juego **no debe pedir correr ni atravesar muebles**. Solamente se conocen poses del teléfono; los objetos virtuales no ocluyen necesariamente con muebles reales.

## Tiempo Roto (75 s)

- El combate normal no se interrumpe. Ciclo repetible de 12 s: **6 s normales → 3 s con IA congelada → 3 s de rebote temporal**. Esta condición afecta la simulación del movimiento, ataque y stun, no solo el texto del HUD.
- Pulsar **⏳ ROMPER TIEMPO** aplica congelación extra de 4 s, con recarga de 11 s. Sigue avanzando el cronómetro de la partida, de modo que no hay forma de alargar indefinidamente el tiempo.
- Efectos distintos: bordes azul/cian y líneas temporales durante la congelación; bordes cálidos y un dial acelerado durante el rebote. Se utiliza CSS liviano (sin shader de fullscreen costoso en ARCore).
- El HUD informa el tiempo restante de la fase, la habilidad y el momento de peligro. La mecánica cambia automáticamente aunque el jugador nunca pulse EMP.

## Pruebas automatizadas

- `node --test tests/rodeados-v28-rescue-timewarp.test.cjs`: diez entregas consecutivas, RNG, 7 spawns, distancia de pickup/delivery, movimiento world-lock, derrota por tiempo, salud, fractura y rebote automáticos, EMP manual 4s, regresión CTF.
- `node --test tests/rodeados-v18-missions.test.cjs tests/rodeados-v17.test.cjs`: no romper modos anteriores, duración actualizada 75 s.
- `node tests/rodeados-v28-browser.test.cjs`: UI AR preparada, rehén visible, siete spawns, botón LIBERAR inactivo lejos y activación del efecto temporal en navegador.
- `node tests/rodeados-xr-smoke.test.cjs`, `node tests/rodeados-v19-xr-tactical.test.cjs`, `node tests/rodeados-v18-browser.test.cjs`: WebXR sintético, retina móvil y CTF sin alteraciones.
- Antes de fusionar/pasar a producción: prueba en Android + ARCore de tracking, ancla del rehén, desplazamiento, botones y rendimiento, y prueba física de las diez etapas por una persona.

