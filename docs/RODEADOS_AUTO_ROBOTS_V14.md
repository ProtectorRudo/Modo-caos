# RODEADOS 360 V14 — Androides tácticos automáticos (sin descargas del usuario)

## Solicitud de producto

El jugador NO debe ver el LAB M.A.N.U.L., importar ZIP/GLB, crear cuentas o instalar nada. En `/rodeados.html`, seleccionar modo y tocar JUGAR debe cargar directamente enemigos 3D mejorados en la pista calibrada. La URL histórica `/rodeados-manul.html` redirige de forma inmediata a `/rodeados.html?v=14` y conserva `?dev=1` solo para test internos.

## Origen y licencia (trazabilidad verificable)

**Importante: no es el archivo M.A.N.U.L. de Andrei Milin.** Ese modelo de Sketchfab requiere una descarga autenticada y no se dispone de sus bytes; NO anunciarlo como integrado.

Como sustituto funcional libre, se utiliza el humanoide táctico futurista **FREE [Military Soldier] RIGGED**, autor **BAMEN**, licencia **Creative Commons Attribution 4.0**, adaptado en RODEADOS como adversario androide de combate mediante materiales más oscuros, rig original y escala de aproximadamente 1,75 m.

- Autor y asset original: https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- Fuente pública de su fichero GLB ya convertido y animado, con crédito explícito: https://github.com/cktang88/3d-fps, `public/assets/models/characters/soldier.glb` (commit `130ac2a5c856401ec36e7d35afcfefe40c5801f4`)
- El repositorio de origen documenta que las animaciones utilizadas se apoyan en Quaternius Universal Animation Library CC0 y 100STYLE CC BY 4.0 (Ian Mason, Sebastian Starke, Taku Komura): se conserva la atribución aquí.
- Bajo licencia CC BY se permite usar y adaptar el modelo en un juego y redistribuirlo con reconocimiento de autor, fuente, licencia y transformaciones. **No atribuir a M.A.N.U.L. lo que pertenece a BAMEN.**

## Comportamiento y seguridad

- `rodeados-robots-auto.js` arranca al abrir el juego, antes de tocar JUGAR, sin formulario, registro ni selección de avatar. Usa `GLTFLoader`, comprueba encabezado/versión/tamaño real de GLB, reutiliza `buildAdapter` de `rodeados-manul.js`.
- La fuente primaria es `/assets/rodeados/tactical-android.glb` empaquetada en el propio repo por el workflow vendorizador y servida por GitHub Pages. URL secundaria fija a un commit de la distribución reconocida en GitHub/jsDelivr si por retraso no está el archivo empaquetado.
- En falla de red, contenido, WebGL o incompatibilidad de rig, **mantener siempre los robots originales** en lugar de mostrar una pantalla de error, un enemigo invisible o solicitar descargas.
- Se conserva compositor WebXR del juego/Blackzone, separación a escala humana, colisiones y puntos por cabeza del core, munición infinita, bomba y EMP, piso deteriorable y radar.
- Cuatro clones visuales 3D importados simultáneos como presupuesto inicial Android; los demás enemigos aparecen con el aspecto original para mantener todos visibles. Será revisado tras FPS físicos medidos.
- El tamaño de archivo descargado está limitado a 8 MB; carga asincrónica con vencimiento de 11,5 s y respaldo automático. No almacenar claves ni exponer a un formulario la fuente de assets.
- El HTML público muestra una atribución pequeña y enlace a la página del autor bajo CC BY 4.0.
- La página histórica de laboratorio abre la página jugable sin mostrar formulario; `?dev=1` se conserva SOLO para validación interna de importador ZIP/GLB, no se enlaza públicamente.

## Criterios de aceptación y pruebas

- `tests/rodeados-auto-robots.test.cjs`: navega al enlace antiguo y comprueba redirección real; abre juego sin controles de archivo, carga automáticamente GLB válido simulado localmente en WebGL y genera al menos 2 robots premium sin tocar ningún control; dispara y mantiene munición infinita. El GLB usado en test es **sintético**, no se hace pasar por el personaje real.
- Se mantienen `tests/rodeados-browser.test.cjs`, `tests/rodeados-xr-smoke.test.cjs` y pruebas del core de daño/puntos/celdas/bomba.
- Binario vendorizado se valida de forma separada por su GLB magic 0x46546c67, versión 2, longitud exacta y tamaño entre 100 KB y 8 MB.
- Antes de afirmar 10/10 gráfico hay que probar físicamente en el móvil Android ARCore, medir FPS y comprobar si el personaje de la fuente luce efectivamente más serio que los robots previos.

No se alteraron tablas de Viralio ni Te Hice Esto ni se añadieron dependencias a ellos.
