# Color Rush Solo — Premium Visual Layer (2026-10-27)

## Alcance
- Rama: design/color-rush-visual-premium-20261027.
- Solo color-solo.html carga los estilos y la capa SVG premium.
- Sin cambios en engine.js, survivor.js, color-duel.js ni color-duel.html; intactos WebXR, calibración, anclaje, reglas, puntuación y tiempos.
- NO fusionar en producción antes de una prueba AR en Android y preview desplegada.

## Arquitectura
- color-premium-art.js: capa SVG pasiva sobre los polígonos originales; 25 grupos con paths (no polygons). Degradados de metal/cristal, volumen simulado, microtrama, bordes luminosos y foco por color. Aproximadamente 29 FPS máximos.
- pointer-events:none en todos los adornos; los 26 polígonos originales conservan su identidad, orden y eventos.
- color-premium.css: HUD y menú futurista, sin ocultar controles necesarios. Respeta el estado del temporizador impuesto por la lógica.
- tests/color-premium-visual.test.cjs: smoke test de polígonos originales, calibración, geometría y carga solo en modo Solo.

## Auditoría
El render actual combina WebGL plano y proyección SVG. Sustituir el render por Three.js o crear otra sesión XR pondría en riesgo la parte funcional. Para esta entrega conservadora se eligió una capa visual proyectada que NO añade un motor XR ni altera físicas.
Limitación reconocida: es metal y cristal simulado mediante SVG, no PBR 3D real u oclusión física.

## Fuentes CC0 investigadas, no incorporadas
- https://ambientcg.com/view?id=MetalPlates017A
- https://kenney.nl/assets/particle-pack
- https://kenney.nl/assets/sci-fi-sounds
Esos archivos requieren descarga, medición y pruebas de rendimiento móvil. No se integraron en este cambio puramente visual; los gráficos son procedurales y no se modifica el audio.

## Estado de pruebas
- Inspección del código original en GitHub: COMPLETA.
- Parseo JavaScript del módulo visual: PASS.
- Simulación DOM: 25 grupos, 26 polígonos intactos, adorno sin eventos de puntero y geometrías proyectadas: PASS.
- Test con Node desde checkout: PENDIENTE de ejecución.
- Android real / WebXR / FPS: NO REALIZADO.
- Vercel preview: BLOQUEADO. La API devolvió HTTP 402, api-deployments-free-per-day (más de 100 despliegues en 24 horas). No se ha publicado el cambio.
- Producción original: NO MODIFICADA.

## Requisitos para publicar
1. Ejecutar node tests/color-premium-visual.test.cjs y pruebas de regresión.
2. Desplegar preview cuando se restablezca el cupo Vercel.
3. Verificar READY y respuestas 200 para HTML, CSS y JS.
4. Probar en Android: piso, fijar, calibrar tocando cualquier baldosa, movimiento, reglas, cambiar color, puntuación y reubicar; medir FPS y capas.
5. Solo entonces revisar y fusionar. Mantener intocado el dominio original color-rush-ar-demo.