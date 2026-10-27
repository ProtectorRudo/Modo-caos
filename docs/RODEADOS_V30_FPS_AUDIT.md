# RODEADOS 360 — Auditoría técnica V30: rifle torcido
Fecha: 27 de octubre de 2026 · Rama aislada `fix/rodeados-v30-fps-perspective-audit-20261027` · PR #116

## Diagnóstico validado (fotos del teléfono y Chromium 393×852)

1. **Geometría de pantalla:** la implementación V29 comparaba las componentes X/Y del arma en *normalized device coordinates* (NDC). En Android vertical, 1 unidad de Y representa ≈2,17 veces más píxeles que 1 unidad de X; por tanto, el algoritmo marcaba como válida una dirección que visualmente quedaba casi vertical. Medición previa: 61,83° respecto de la horizontal de pantalla.
2. **Optimización desordenada:** se escogía primero la rotación Z (`roll`) del GLB con una escala arbitraria, y luego se ajustaba escala/posición; la perspectiva alteraba la dirección del cañón tras calcular el giro. Las pruebas previas sólo controlaban que el cañón fuera "hacia arriba" y "hacia la mira", no el ángulo en píxeles físicos.
3. **Recorte:** un cálculo previo daba `bounds.bottom=-1.158` y `bounds.right=.985` (fuera de NDC ±1); el modelo quedaba parcialmente cortado y dominaba demasiado la imagen.
4. **Caché del dispositivo:** `rodeados-runtime.js?v=29` seguía importando `rodeados-art.js?v=29`; si no cambia la URL del módulo, Android puede reutilizar el archivo antiguo. Se actualiza a V30 en ambos eslabones.

## Solución aplicada (sin cambiar core ni anclaje)

- Cámara 3D FPS separada del mundo AR (existente y conservada).
- Objetivos semánticos de cañón y culata en la proyección real, con distancia en píxeles corregida mediante `weaponCamera.aspect`.
- Búsqueda iterativa de `roll`, escala y posición del GLB EN la perspectiva final; comprobación posterior a los ajustes de encuadre.
- Reencuadre de toda la malla 3D (no sólo los puntos artificiales), sin tapar la mira.
- Prueba automatizada nueva que mide `pixelSlope`, `angleOnScreenDeg`, visibilidad, caja de la malla, posición de culata y cañón.
- Invalida caché de JS con sufijo `v=30` en HTML y runtime.

## Evidencia automatizada reproducible

Chrome/Playwright con WebGL real y WebXR simulado a 393×852:
- **Antes**: `angleOnScreenDeg=61.83`, cobertura parcial en otra prueba `coverage=.78`.
- **Después**: `angleOnScreenDeg=44.12`, `pixelSlope=.97`, `coverage=1.000`, `bounds.left=-.090`, `right=.881`, `bottom=-.641`, `top=-.183`.
- Screenshot sintética generada y revisada en GitHub Actions: rifle aparece diagonal de manera natural, encuadrado debajo de la retícula.

**No es una prueba física de ARCore Android**. Las posiciones y la orientación real de cámara deben contrastarse en el celular del jugador.

## Riesgo adicional detectado, mantenido separado

La prueba WebXR de humo dispara realmente desde el ray cacheado (un disparo contado, `shots=1`), pero el primer robot sintético no recibe impacto (`hits=0`, estado `DISPARO`). Se experimentó con obtener el rayo desde la cámara real de Three.js y resultó idéntico al rayo XR previo; se **revirtió** para no introducir regresiones injustificadas. Por eso el **gate completo de navegador todavía falla** a pesar de que el test geométrico del rifle sí cumple. No ocultar ese fallo cambiando artificialmente el resultado o declarando el juego certificado. Investigar por separado la coincidencia entre espacio local, robot dibujado, ray caster y posiciones de enemigos.

## Publicación

Este cambio se trabajó en rama aislada sobre V29; `main`, `color-rush-ar-demo` y Supabase compartido NO se tocaron. Sólo debe compartirse como "V30 completa" un deployment Vercel `READY` que incluya el SHA **posterior** al bump de caché del HTML/runtime, y se haya probado efectivamente en un Android. Un deployment previo de esta misma rama no contiene necesariamente la corrección final.