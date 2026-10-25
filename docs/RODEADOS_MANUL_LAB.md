# RODEADOS 360 — LAB Robot M.A.N.U.L.

## Estado: cargador implementado, archivo auténtico pendiente

Se implementó un laboratorio web separado `/rodeados-manul.html` que permite probar la integración visual del modelo gratuito **Robot M.A.N.U.L.** de **Andrei Milin**, publicado en Sketchfab bajo licencia **CC BY (Creative Commons Attribution)**. Fuente y autor:

- https://sketchfab.com/3d-models/robot-manul-9e95bc80bfa643d8b890cfa4f83e8b3d
- Andrei Milin / @milinam2002
- Modelo original: ~21.600 triángulos, rigged, materiales actualizados en 2022.

**IMPORTANTE:** todavía NO se descargó ni integró de manera permanente el modelo auténtico, porque la API oficial de descarga de Sketchfab exige login/autenticación de una cuenta de Sketchfab, sin conector instalado para ello. La implementación NO evade esa autenticación y NO finge que un modelo de demostración sea M.A.N.U.L.

Documentación oficial: https://sketchfab.com/developers/download-api/downloading-models

## Cómo probar con el modelo original

1. Abrir **https://sketchfab.com/3d-models/robot-manul-9e95bc80bfa643d8b890cfa4f83e8b3d** con una cuenta propia de Sketchfab.
2. Pulsar **Download 3D Model**, seleccionar **glTF** y guardar el ZIP sin descomprimir.
3. Abrir la página de prueba **/rodeados-manul.html**, elegir ese ZIP en «Seleccionar ZIP/GLB».
4. Confirmar «MODELO CARGADO» y las estadísticas del rig/triángulos; entrar a **ENTRENAMIENTO 3D** para verlo en acción. También permite abrir AR, pero exige validación física en Android.
5. Si aparecen errores de arte o animación, volver a los modelos actuales con «VOLVER A ROBOTS ORIGINALES».

Si se desea sustituir permanentemente a los robots de producción, hace falta disponer del ZIP/GLB auténtico (adjuntarlo a la conversación o subirlo a la biblioteca de assets autorizada) y **probarlo físicamente en Android AR antes de activar la opción por defecto**. No depositar secretos OAuth ni contraseñas de Sketchfab en GitHub.

## Implementación

- `rodeados-manul.js`: importa de forma opcional el ZIP glTF + bin/texturas o GLB usando Three.js GLTFLoader 0.181, JSZip y SkeletonUtils. La herramienta no se importa en `rodeados.html`; solo funciona en laboratorio.
- `rodeados-art.js`: permite registrar un adaptador puramente visual, clonarlo por enemigo y restaurar inmediatamente los modelos procedural originales. El render se mantiene en `art.root` AR anclado.
- Escala normalizada a 1,75 m para enemigo normal; enemigos élite conservan la escala externa controlada por el juego. El personaje se centra sin afectar trayectoria ni posición.
- Animación: se intenta usar clips del archivo (idle/walk/run/attack/stun). Si el archivo solo tiene huesos, se usan pequeñas rotaciones de cabeza, brazo y pierna sobre el rig. M.A.N.U.L. original está rigged, pero no se verificó que incluya clips.
- Performance: máximo 90.000 triángulos por instancia; reducción a 1024 px de mapas grandes y límite de 55 MB por archivo para evitar bloqueos en Android. No hay promesa de FPS todavía.
- Motor de impactos y bonus de cabeza, disparos infinitos, tracking WebXR, pistas, daño al piso, Bomba Caos, EMP, reglas y Supabase quedan sin cambios.
- Si una instancia o animación falla, vuelve a su robot original. Si la importación entera falla, el juego sigue utilizable.

## Pruebas que NO sustituyen un móvil real

`tests/rodeados-manul-preview.test.cjs` prueba en Chromium móvil simulado importación real de archivos de glTF binario sintético y ZIP estilo Sketchfab, reemplazo por instancias GLTFLoader, disparos, ammo infinita y retorno al modelo original. El GLB sintético del test **NO es Robot M.A.N.U.L.**. Las pruebas físicas y visuales del asset real continúan pendientes.
