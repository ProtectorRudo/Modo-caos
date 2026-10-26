# Ritmo Caos — DJ Live V29 (26/10/2026)

## Scope y objetivos
- Rama de trabajo: `feat/ritmo-dj-exterior-20261026`, basada en `feat/ritmo-4-carriles-20261025` (NEON PRISM V28).
- **Sin cambiar** `ritmo-core.js`, `ritmo-runtime.js`, `ritmo-engine.js`, `ritmo-audio.js`, `ritmo-haptics.js`, `engine.js`, sensores ni calibración.
- La pista, cuatro pads, desplazamiento lateral, notas y geometría de scoring de NEON PRISM permanecen iguales.
- Nuevo `ritmo-exterior.js` dibujado en el mismo espacio WebXR mediante el compositor de dos pases del juego. La decoración no requiere un segundo contexto GPU.
- Nuevo avatar humanoide de DJ en 3D generado mediante malla procedural: cabeza, pelo, visera, auriculares, brazos articulados, manos y ropa. Bob de cabeza y brazos según tiempo, bajos, medios y combos.
- Escenografía: pantalla LED con ecualizador, cabina con dos platos, mezclador, cerchas metálicas, focos, haces translúcidos, torres y altavoces con pulsación de bajos. Todo por detrás de z=-1.15 m o fuera de ±2 carriles.

## Render y degradación
- `ritmo-stage-showtime.js` registra `RitmoExterior.create` e invoca `render` al final de sus elementos exteriores. Si la decoración falla se ignora el error y se mantiene NEON PRISM y los anteriores fallback.
- La calidad baja reduce focos secundarios, LEDs y detalles conservando el DJ.
- Sin nuevas importaciones de Three.js ni contextos GPU: dos GLB locales se convierten en mallas del compositor actual. Se hacen solicitudes opcionales a archivos estáticos GLB, sin afectar las solicitudes de cámara.
- **No afirmar fotorealismo**: son mallas 3D estilizadas de producción propia; no equivalen a un avatar humano escaneado.

## Modelos 3D reales CC0 incorporados
- Pack [Nightclub and DJ Booth](https://3dassets.dev/packs/nightclub-and-dj-booth) por **3DAssets.dev**; licencia **CC0 1.0 Universal** (incluye uso comercial).
- Descargados y versionados automáticamente por GitHub Actions en la rama:
  - `assets/ritmo/dj-booth-desk.glb` — 32.688 bytes y 688 triángulos; fuente https://cdn.3dassets.dev/assets/34089/v1/model.glb
  - `assets/ritmo/dj-mixer.glb` — 57.268 bytes y 1.338 triángulos; fuente https://cdn.3dassets.dev/assets/34090/v1/model.glb
- Adaptador nuevo `ritmo-glb-props.js` lee glTF 2.0 GLB de forma liviana (matrices, mallas, materiales baseColorFactor) y envía la geometría al **mismo buffer de WebGL1/WebXR**. Se leen primero los assets LOCALES y opcionalmente el CDN sólo si faltan. Si alguna importación falla, vuelve al mixer y los platos procedurales.
- El avatar humanoide 3D sigue siendo **original procedural**; no se descargó un personaje humano real de terceros. El loader glTF no muestra sus texturas WebP incrustadas, sino materiales básicos: no afirmar que renderice el PBR completo.
- Revisión real del formato (GLB2/BIN), parseo de los dos binarios por el adaptador, conteo de triángulos y coordenadas verificadas con prueba simulada. El usuario no debe descargar ni instalar archivos.

## Validaciones
- Sintaxis JavaScript validada para módulos modificados.
- Pruebas simuladas con geometrías finitas, luz, combos, fallback `quality=0` y ausencia de intrusión en cuatro carriles.
- CI GitHub Actions `Ritmo Caos V29 — AR render and vendored DJ GLB checks`: **SUCCESS** sobre commit `ccda6dfc856a8e984eb878c6ad3ced559f5b83d1`. Incluye `node --check` de cuatro módulos y `node --test tests/ritmo-glb-v29.test.cjs tests/ritmo-exterior.test.cjs tests/ritmo-prism-v28.test.cjs`. https://github.com/ProtectorRudo/Modo-caos/actions/runs/40332901121
- Falta ejecutar Chrome Android + ARCore con Hit Test real, verificar FPS y presencia de manos/visera y calibración física.

## Despliegue
- GitHub tiene los cambios en rama aislada y producción original no fue modificada.
- 26/10: intento explícito Vercel preview rechazado **HTTP 402** `api-deployments-free-per-day` (límite de 100 despliegues gratuitos diarios), respuesta pide reintentar cuando se restablezca la cuota.
- No tratar V29 como desplegada ni dar un enlace V28 como si contuviera el DJ V29. Requiere nuevo preview READY del SHA final y prueba física antes de promocionar.
