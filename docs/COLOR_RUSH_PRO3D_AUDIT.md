# Color Rush Pro3D — auditoría técnica y visual (27-10-2026)

## Alcance innegociable
- Cambio EXCLUSIVAMENTE de presentación del Color Rush Solo.
- Archivos funcionales no modificados: engine.js, survivor.js, color-duel.js, color-duel.html.
- No se han cambiado reloj, rounds, posiciones, offsets, anclajes, resolución del suelo, lógica de detección, puntuación, vibración, sonido ni Supabase.
- No se ha actualizado main, el alias modo-caos-eta ni color-rush-ar-demo.

## Comparación antes/después
| Antes | En la rama premium |
| --- | --- |
| Polígonos SVG + cuadrados WebGL planos | Los 26 polígonos permanecen para calibración; capa WebGL 3D encima |
| Sin volumen | Cuerpos 3D con altura, biseles y rivetes |
| Colores planos | Superficies tipo cristal coloreado, brillo Fresnel y respuesta a luz direccional |
| Borde verde proyectado | Marco industrial volumétrico con iluminación de perímetro |
| Efectos en DOM | Brillos, partículas y ondas de energía espaciales en aciertos |
| UI demo | HUD premium y estilo arcade |

## Integración técnica
- El nuevo color-pro-3d.js usa el hook **ya existente** window.modoCaosXRFrame(time, frame, W), invocado al final de engine.js onFrame. NO intercepta getViewerPose, getHitTestResults ni los eventos del usuario.
- Se reutilizan exactamente el WebGLRenderingContext, framebuffer XR, ref, world transform y viewport del engine actual. No se solicita una nueva sesión inmersiva, cámara ni anclaje.
- 25 baldosas y un perímetro generados como lotes de geometría estática: sombras, metal, cristal, luces, aura. 5 draw calls por vista, más un draw call de ondas y otro de partículas cuando hay aciertos.
- Material de acero con iluminación procedural y microdetalle; cristal con brillo especular, Fresnel estilizado, gradiente por color, línea de borde; no se añadieron texturas o paquetes externos que pudieran saturar la red móvil.
- Las posiciones geométricas están expresadas en el sistema local del mismo board, usan boardSize y multiplicación por W sin modificarlo. Base a 8 mm sobre el plano estimado para evitar flotación.
- El SVG original sigue existiendo, con los mismos 26 nodos polygon e índices. Cuando WebGL3D queda activo se reduce exclusivamente el **pintado** de los nodos, manteniendo fill válido y eventos; el marcador YO del modo Solo conserva prioridad SVG.
- El fallback SVG premium se recalcula cuando la capa 3D no está activa. Si un shader falla o una operación WebGL lanza error, el código abandona 3D y vuelve a ese fallback.
- Forzar fallback desde URL: /color-solo.html?visual=classic (conserva Skin/SVG premium, sin capa 3D).

## Pruebas realizadas
1. Revisión del código real en ProtectorRudo/Modo-caos, rama main, engine.js y survivor.js.
2. Prueba del SVG: los 26 polígonos originales se mantienen, ningún adorno añade polígonos, los paths decorativos tienen pointer-events:none.
3. Node smoke: hook nativo, reconstrucción de lotes por cambio de colores, estados active/fallback y recuperación de error GPU, partículas tras +PUNTOS.
4. GitHub Actions 'Color Rush visual-only regression': ejecuta ambas pruebas Node y compila shaders GLSL ES100 con Chromium WebGL 1 cuando Chromium está disponible.
5. Visuales y shaders están aislados, sin paquetes npm, CDN, base de datos ni cambios en la configuración.

## Pendiente crítico — NO declarar producción terminada
- Prueba física con Android Chrome/ARCore: superficie, fijar, calibrar tocando baldosa bajo usuario, posición estimada YO, rondas completas, fail/success, fallback GPU, reubicar, perder seguimiento.
- Inspección visual real de luz/colores, bordes de acero, presencia de todos los 25 paneles, oclusión con entorno y FPS sostenidos.
- Verificar en Vercel una preview del SHA FINAL: READY + GET 200 de /color-solo.html, /color-pro-3d.js, /color-premium-art.js y /color-premium.css.
- La API de Vercel respondió HTTP 402 api-deployments-free-per-day (>100 despliegues). Una preview generada para un SHA anterior NO corresponde al contenido final de la rama.
- No fusionar el PR antes de esos pasos.

## Licencias y recursos
- Render 3D, shaders, geometría y partículas de producción propia, sin archivos externos descargados.
- Se auditaron ambientCG (materiales CC0) y Kenney Particle Pack (CC0). No se empaquetaron por ahora: esta implementación busca máxima compatibilidad sin hacer descargas grandes en clientes móviles.
- Si posteriormente se incorporan mapas PBR externos, exportar formatos comprimidos, conservar respaldo de licencia y medir FPS.

## Rollback
- Quitar script color-pro-3d.js desde color-solo.html devuelve la capa SVG premium.
- Quitar CSS/JS premium solo del HTML devuelve el aspecto previo; sin tocar engine.js o survivor.js.
- El parámetro ?visual=classic desactiva únicamente la capa 3D para facilitar diagnóstico.

## Regresión básica requerida
node tests/color-premium-visual.test.cjs
node tests/color-pro3d-smoke.test.cjs
Browser WebGL: tests/color-pro3d-webgl.html
Comparar archivos engine.js y survivor.js contra main: sin cambios.