# RODEADOS 360 — V31 · Auditoría de enemigos premium + atmósfera bélica

## Objetivo
Enemigos premium, gratuitos, legalmente utilizables, con esqueleto y animaciones reales. Guerra ambiental ligera sin ocultar la cámara, sin colocar humo delante del jugador ni romper AR/persecución/colisiones/objetivos de los modos anteriores.

## Inspección de assets y licencias

- **BAMEN, “FREE [Military Soldier] RIGGED”**: CC BY 4.0, esqueleto y múltiples animaciones, ya incluido en `assets/rodeados/tactical-android.glb` y usado desde `rodeados-robots-auto.js`. Créditos visibles en `rodeados.html`. https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198
- **DanlyVostok, “Military tactical suit”**: CC BY 4.0, importado como `tactical-heavy.glb`. Mantener en cuarentena visual hasta garantizar poses y accesorios, especialmente auricular defectuoso. https://sketchfab.com/3d-models/military-tactical-suit-lowpolygameready-ef698ce36b1545a78ce592dd3db4c7ed
- **S.W.A.T Operator Cop** (SihaGames, Sketchfab, CC BY) y **Robot M.A.N.U.L.** (Andrei Milin, Sketchfab, CC BY) fueron investigados, pero sus descargas oficiales requieren acceso a Sketchfab. No se han importado ni se inventa una instalación sin sus GLB originales. Fuentes: https://sketchfab.com/3d-models/swat-operator-cop-game-ready-animated-1b30188ed90449fea1777bb17637f54c y https://sketchfab.com/3d-models/robot-manul-9e95bc80bfa643d8b890cfa4f83e8b3d
- Quaternius Universal Animation Library: CC0 con >120 clips, material ya incorporado a la fuente BAMEN retargeteada desde cktang88/3d-fps; no se agregan archivos externos adicionales hasta validar mapeos específicos. https://quaternius.com/packs/universalanimationlibrary.html
- Gobkit criaturas CC0 y Quaternius armas CC0: fuentes existentes, no modificadas.

## Implementación V31

- Tres variantes PBR compartiendo un solo rig legítimo, real y completamente animado: EXPLORADOR AZUL, ASALTO GRAFITO, ÉLITE OBSIDIANA. No son modelos nuevos falsamente atribuidos a SWAT o M.A.N.U.L.: son variaciones visuales del mismo soldado BAMEN. Los mapas originales PBR, `SkeletonUtils.clone`, clips y hitboxes permanecen intactos.
- Los enemigos iniciales ordinarios ahora se distribuyen de manera determinista entre tres aspectos, evitando clones idénticos en pantalla. Flanqueadores rápidos usan explorador; jefes/pesados usan obsidiana. Max 4 personajes importados 3D por combate.
- Ataque con clips rifle/aim/shoot upright si disponibles antes de fallback a melee; pequeña patada articulada sobre los huesos del brazo, aplicada después de AnimationMixer.
- 4 plumas de humo bélico bajo, 8 planos cruzados y un material WebGL ShaderMaterial compartido; transparencia máxima 0,095 sin textura ni solicitud de red. Anclados a las esquinas del tablero AR, sin filtros fullscreen. Humo cercano a VOS se oculta para no tapar la visión; deshabilitado durante colocación/calibración.
- Calidad adaptativa: menos plumas y menor opacidad a <38 FPS. Pequeño retumbo distante mediante Web Audio (respetando sonido on/off), nunca a volumen elevado.
- Cache-bust: `rodeados.html?v=31` -> `rodeados-runtime.js?v=31` -> `rodeados-art.js?v=31` + `rodeados-robots-auto.js?v=31` -> `rodeados-manul.js?v=31`.

## QA obligatorio antes de publicar como terminado

1. Cargar los GLB reales en Chromium: clips, esqueleto, variantes, sombreado y materiales.
2. Comprobar bandera, botín, rescate, enemigo frente/detrás, disparos y bajas; smoke no debe bloquear FX ni alterar colisión.
3. WebXR simulado: anclaje del escenario, 4 plumas, no pantalla de niebla, FPS y framebuffer alpha; corroborar en ARCore físico.
4. No fusionar a main ni tocar Vercel original/ Supabase. Publicar PREVIEW únicamente cuando Vercel permita y verificar SHA/READY/HTTP 200.

Limitaciones explícitas: esta rama incorpora variantes animadas del modelo legal ya disponible y humo procedimental optimizado. Los assets oficiales SWAT/ M.A.N.U.L. permanecen candidatos sin descarga autenticada; no se puede declarar que están integrados. Las capturas Chromium/WebXR simulado no certifican ARCore real.
