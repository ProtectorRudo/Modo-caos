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
- Sin importaciones nuevas de Three.js, extensiones, URLs ni texturas: no se afecta detección de piso ni solicitudes de cámara.
- **No afirmar fotorealismo**: son mallas 3D estilizadas de producción propia; no equivalen a un avatar humano escaneado.

## Modelos gratuitos revisados, no integrados
- Pack **Nightclub and DJ Booth**, 3DAssets.dev, 56 GLB / licencia **CC0 1.0 Universal**: https://3dassets.dev/packs/nightclub-and-dj-booth
- Cuenta con consola, deck, mixer, parlantes y luces, pero el WebGL1 nativo del juego no importa GLB directamente. Integrar sin antes desarrollar y probar lector glTF o convertir assets en build implicaría riesgo al render AR.
- **No se descargaron ni instalaron GLB de terceros en esta V29**. El jugador tampoco debe descargarlos. Esta fase prioriza un avatar y escenario 3D inmediato que funciona con el renderer probado.

## Validaciones
- Sintaxis JavaScript validada para módulos modificados.
- Pruebas simuladas con geometrías finitas, luz, combos, fallback `quality=0` y ausencia de intrusión en cuatro carriles.
- Test de regresión específico: `node --test tests/ritmo-exterior.test.cjs` (agregado al repositorio, debe ejecutarse en entorno Node).
- Falta ejecutar Chrome Android + ARCore con Hit Test real, verificar FPS y presencia de manos/visera y calibración física.

## Despliegue
- GitHub tiene los cambios en rama aislada y producción original no fue modificada.
- 26/10: intento explícito Vercel preview rechazado **HTTP 402** `api-deployments-free-per-day` (límite de 100 despliegues gratuitos diarios), respuesta pide reintentar cuando se restablezca la cuota.
- No tratar V29 como desplegada ni dar un enlace V28 como si contuviera el DJ V29. Requiere nuevo preview READY del SHA final y prueba física antes de promocionar.
