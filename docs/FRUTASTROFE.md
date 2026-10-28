# FRUTÁSTROFE · entrega v1 en rama de preview

Fecha: 2026-10-28
Ruta: /frutastrofe.html
Rama: feat/frutastrofe-premium

## Arquitectura
- Core determinista UMD/CommonJS: frutastrofe-core.js.
- Arte WebGL Three.js: frutastrofe-art.js, geometrías originales, iluminación, arena y partículas.
- Runtime: frutastrofe-runtime.js, controles táctiles y de puntero, WebXR, HUD, audio y progreso.
- Interfaz: frutastrofe.html. Nuevo vínculo en index.html.
- Tests: node tests/frutastrofe.test.cjs.

## Funciones
- Campaña de 10 niveles, 0 a 3 estrellas, objetivos, jefe Sandía Gigante, récords y monedas locales.
- Arcade de 60 segundos, fiebre final, fruta dorada, hielo, arcoíris, trampas y combos con cascadas.
- Modo 3D en navegador con controles táctiles directos o botón de disparo.
- AR bajo HTTPS, Chrome Android compatible, WebXR + ARCore: hit test de piso, ubicación de arena en espacio local-floor, mundo no dependiente de cámara. La validación física del anclaje en Android aún está pendiente. No es seguimiento corporal.
- Multijugador local de dos personas: turnos independientes con la misma semilla de partida. Enlace para compartir un reto asíncrono.
- No se anuncia ni se implementa online real (2–4) en esta fase: requeriría sincronización y validación en servidor, pruebas con teléfonos, autenticación y protección de puntuación.
- Ninguna modificación a Supabase compartido ni a los juegos anteriores.

## Auditoría de assets
Se investigaron Kenney Food Kit v2 (200 modelos, CC0: https://kenney.nl/assets/food-kit), Quaternius Ultimate Food Pack (CC0: https://quaternius.com/packs/ultimatefood.html), y Kenney Particle Pack (CC0: https://kenney.nl/assets/particle-pack).

En esta versión se usan modelos y efectos 3D originales hechos con código Three.js para evitar descargas de usuario, activos remotos que fallen y licencias ambiguas. No se afirma que los packs investigados estén integrados. Dependencia CDN Three.js fijada a 0.161.0; no hay modo offline.

## Verificación previa a producción
1. Ejecutar pruebas deterministas Node, validar sintaxis JS y recursos HTTP en preview.
2. Android sin XR: iniciar, jugar, cerrar y comprobar progreso.
3. ARCore real: detección de piso, posición fija tras movimiento de cámara, botón disparar, cierre AR.
4. Medir FPS, carga, jugabilidad y latencia en celulares de diferentes prestaciones.
5. Dos personas: turnos iguales en duelo local. Comprobar enlaces de desafío.
6. Regresión en Color Rush, Ball Rush, Territorio X, Muro Rush y resto del menú.

No declarar AR físicamente probado ni multiplayer online funcional mientras falten esas pruebas.

## Camino de evolución
Nuevos mundos y cosméticos; análisis de packs GLB CC0 con medición de FPS; online con backend autoritativo y revisión de la seguridad de Auth compartida.
