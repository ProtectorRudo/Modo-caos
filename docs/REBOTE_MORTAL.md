# REBOTE MORTAL — Entrega técnica (25/10/2026)

## Alcance actual
Nuevo minijuego aislado en \`rebote.html\`, \`rebote-core.js\`, \`rebote-art.js\` y \`rebote-runtime.js\`. Integración visual en \`index.html\`. Ninguna modificación a \`engine.js\`, Color Rush, Ball Rush, Territorio X, Muro Rush, Meteoros, Rodeados ni Supabase.

- **Juego principal:** Clásico, duración máxima 88 segundos y tres vidas. Fases a los 14, 28, 45 y 62 segundos; final cuando se derrota al jefe o se agota el tiempo / vidas.
- **Mecánica:** esferas tridimensionales, colisiones barridas en paso fijo de 90Hz, retícula de precisión y botón DEVOLVER. Califica como PERFECTO / BUENO / ROCE o explica por qué no se devolvió. Combo y récord local.
- **Variedad:** normales, veloces, curvas, pesadas, dobles secuenciales, señuelos violetas sin daño y explosivas. El jefe puede protegerse o devolver la esfera. El sistema de ataques dobles reintenta sin forzar proyectiles irrespondibles.
- **AR real:** Three.js/WebXR immersive-ar, Hit Test, local reference space y anchors cuando estén disponibles; ajuste de escala, traslación y rotación antes de fijar; calibración de ~1s quieto y RECENTRAR. El mundo queda en coordenadas espaciales del plano real.
- **Protagonista:** cámara/teléfono físico, no un avatar ficticio ni tracking de pies. Sólo apuntar y pulsar el botón.
- **Entrenamiento 3D:** arrastrar en pantalla para apuntar y devolver, sin cámara real. No confundir con AR.
- **Efectos:** robots 3D proceduralmente articulados, arena metalizada, partículas y luces, audio electrónico generado en tiempo real y vibración opcional. No se descargaron recursos de terceros sin licencia.

## Separación técnica
\`ReboteCore\` expone create/make, begin, tick, setView, returnShot, launch, colisiones y snapshot. No depende del DOM/Three.js/WebXR. \`rebote-art\` crea escena y geometría, mientras \`rebote-runtime\` controla WebXR, input, HUD y almacenamiento local. No se cambia el contrato de \`engine.js\`.

## Pruebas y limitaciones
- Simulaciones en motor JavaScript: validación sintáctica y ejecución de impactos perfectos, fallo por apuntado, colisiones barridas, pérdida de escudos con inmunidad, fases, ataques especiales y victoria del jefe.
- Tests versionados: \`tests/rebote.test.cjs\` y \`tests/rebote-browser.test.cjs\`; workflow \`.github/workflows/rebote-tests.yml\`. Las pruebas de Chromium no equivalen a pruebas de teléfono.
- NO se afirma aún haber probado WebXR/ARCore en Android real. Se requiere probar en Chrome Android compatible el montaje, la calibración, la retícula y el impacto desde la posición física.
- NO hay modo multijugador funcional: no se conectaron salas ni se tocaron tablas. Duelo 1v1 / cooperativo / supervivencia / precisión requieren iteración y verificación antes de ofrecerse como completos.
- El robot y las luces son assets procedurales. Para nivel AAA comercial faltarán modelos GLB animados/optimizados y evaluación artística y de rendimiento en hardware real.
- Vista previa protegida por Vercel con enlaces compartidos temporales. La publicación de main se pospone si los checks o límites de despliegue no permiten verificar.

## Pruebas recomendadas en Android
1. Abrir AR, buscar piso, ajustar con dedos (mover / girar / escala), FIJAR, esperar LISTO, iniciar.
2. Mantener el teléfono quieto y luego girarlo: la arena y el robot no deben seguir a la pantalla.
3. Apuntar a la esfera en 3D; pulsar DEVOLVER en tiempo correcto y comprobar efecto / retorno real / daño al robot.
4. Fallar deliberadamente por mal apuntado y por tiempo anticipado, comprobar el motivo.
5. Derrota y REVANCHA sin fijar pista; RECENTRAR no debe mover la referencia espacial.
6. Comprobar golpes especiales y jefe final. Probar pantalla vertical, sonido apagado, reanudación y tracking intermitente.
