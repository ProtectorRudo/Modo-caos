# Ritmo Caos V33 — DJ caballo con skinning por esqueleto real

## Motivo
La captura física de Android de V32 mostró un torso triangulado y extremidades rotas por una deformación geométrica ad hoc y una nota superpuesta visualmente sobre el frente de la cabina. Esta corrección afecta exclusivamente la escenografía AR.

## Solución
- `ritmo-skinning.js` lee **el GLB real** Quaternius Punk CC0 (de `assets/ritmo/dj-quaternius-punk.glb`). Valida cabecera, buffers, jerarquía de nodos, esqueleto (`skin.joints`, 49 huesos), atributos `JOINTS_0`/`WEIGHTS_0`, materiales y topología del `Punk_Body`. Aplica **linear blend skinning CPU** sobre poses rotadas alrededor de los pivotes **UpperArm.L/R** y **LowerArm.L/R** del esqueleto, ponderadas por los pesos del propio GLB. Renderiza los 2.958 triángulos en el **mismo** batch WebGL1 y espacio mundo XR. No crea un segundo canvas/renderer ni cambia el motor del suelo.
- **No** se utilizan animaciones de Mixamo ni clips FBX del pack: se generan poses de mezcla procedurales alrededor de huesos reales. El resto del cuerpo mantiene los atributos de Quaternius.
- Recoloración coherente del pecho a grafito y piel preservada por material, sin discontinuidades de triángulos por saltos arbitrarios de x, sin saltarse una de cada dos caras en baja calidad.
- Si el GLB no carga o está corrupto, la escena presenta una bomber negra geométrica sin una segunda cabeza, y permanece jugable.
- `ritmo-exterior.js` aplica una traslación **solo de decoración** `-0.22 m` en profundidad al dibujar, no toca cámara/Hit Test ni pista, notas, paneles o score. Evita que el frente de la cabina invada visualmente el comienzo de las notas. Cercha elevada 9,5 cm, menos diagonales; bafles con conos, bases y soportes más integrados.
- `ritmo.html` carga el nuevo `ritmo-skinning.js?v=33` después de `ritmo-glb-props.js` y **antes** de `ritmo-exterior.js?v=33`.

## Pruebas / límites
- `tests/ritmo-skinning-v33.test.cjs`: jerarquía de 49 huesos, 2.958 caras, normalización de pesos, brazos curvos con codos externos y manos alineadas con CDJ, no se descartan caras ni siquiera en LOW, malla sin estiramientos incoherentes, área AR segregada, fallback sin GLB, orden de scripts.
- Regresiones V28–V32 y prueba de impacto `ritmo-impact-alignment.test.cjs` ejecutadas en GitHub Actions.
- Solo JS + pruebas automatizadas, **no es prueba física ARCore/Chrome ni medición de FPS**. Se requiere una captura de usuario para aceptar esta revisión.
- No modificado: `ritmo-core.js`, `ritmo-engine.js`, `ritmo-stage-showtime.js`, `ritmo-runtime.js`, `engine.js`, los cuatro pads, luz del suelo y Supabase. La versión anterior V32 queda recuperable por las versiones de reglas Vercel.
