# Torre Caos — minijuego 3D/AR

## Rutas y arquitectura
- `/torre.html`: pantalla móvil y HUD; `/torre-core.js`: 14 formas y progresión sin dependencias; `/torre-art.js`: mallas extruidas Three.js, sombras y vista auxiliar; `/torre-runtime.js`: simulación, controles, WebXR y audio.
- Rapier 3D Compat 0.17.3 (WASM integrado) y Three.js 0.167.1 desde jsDelivr CDN versionado (requiere conectividad). No se cambia `engine.js`, el mundo 3D AR propio reutiliza el patrón hit test / `local` / anclaje y añade colisiones verticales que el engine de baldosas no tiene.
- Integración en `index.html`. Sin cambios a Supabase, salas ni al despliegue original `color-rush-ar-demo`.
- Estado: modo Torre Infinita individual; VERSUS, MURO IMPOSIBLE, CAOS EXTREMO y CONSTRUCCIÓN PERFECTA se mantienen pendientes, no simulados como funcionales.

## Mecánica
- Tap sobre el área libre: gira la pieza 90°.
- Arrastrar horizontalmente y soltar: liberación, Rapier aplica gravedad, masa, rozamiento, inercia y contactos. No hay snapping.
- Plano de construcción X/Y; Z y rotaciones X/Y bloqueados, manteniendo cuerpos físicos sólidos 3D (colisionadores hull convexos o compuestos por partes para L/T/Z).
- Tiempo de asentamiento / fallo después de perder pieza, salirse de la plataforma o caer la altura que ya estaba estable. No hay terremotos ni trampas.
- Altura máxima estable y récord local en centímetros, repetición breve del estado de cuerpos registrado en cada fotograma físico.
- Pequeños impactos: sonidos sintetizados en función de la velocidad de colisión y háptica opcional.
- Visor lateral auxiliar ampliable, útil para torres altas.

## Flujo AR
1. Chrome Android + ARCore + contexto HTTPS + soporte `immersive-ar`, `hit-test` y `dom-overlay`.
2. Detectar suelo físico, mostrar plataforma, arrastrar para recolocar, pellizcar para escalar/girar.
3. Fijar plataforma; crear `XRAnchor` si se ofrece, o conservar posición `local`.
4. Piezas ancladas al mundo AR; el teléfono es cámara, no detector de pies. No caminar mientras se juega.
5. Reubicar desde HUD cuando sea necesario (comienza otra partida).
6. Si no hay AR, botón de **JUGAR EN 3D** accesible desde PC/Android.

## Pruebas
- `node tests/torre.test.cjs` valida cantidad y área de polígonos, orden de aprendizaje, aleatoriedad semillada, rotación, puntos y derrumbes.
- Faltan pruebas físicas reales con Android ARCore y tests automáticos de navegador / de estabilidad de Rapier dentro del dispositivo. No declararlos superados sin ejecución.
- Validar que `/torre.html`, `/torre-core.js`, `/torre-art.js`, `/torre-runtime.js` se sirven con HTTP 200 en preview y que no se alteraron archivos de otros juegos.
- No mezclar código 3D nuevo en `engine.js` global.
