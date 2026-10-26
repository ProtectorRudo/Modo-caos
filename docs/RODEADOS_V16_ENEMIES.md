# RODEADOS 360 V16 — dos humanoides reales y araña lobo

## Experiencia del jugador
En `/rodeados.html?v=16`, el jugador no descarga ni selecciona modelos. El juego carga **dos modelos 3D humanoides de combate distintos** y añade una araña lobo de ocho patas articuladas como enemigo especial. Los androides de la primera oleada alternan diseños y la araña aparece de forma legible tras unos 12 segundos, sin irrumpir junto al teléfono. La calibración AR, mira XR, balas infinitas, Bomba Caos, EMP, puntuación y suelo bélico permanecen.

## Modelos humanoides originales y licencia
1. **FREE [Military Soldier] RIGGED** — autor **BAMEN**, **CC BY 4.0**, https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198. GLB original 3.094.592 bytes: `assets/rodeados/tactical-android.glb`.
2. **Military tactical suit (LowPolyGameReady)** — autor **DanlyVostok** (1799danly), **CC BY 4.0**, https://sketchfab.com/3d-models/military-tactical-suit-lowpolygameready-ef698ce36b1545a78ce592dd3db4c7ed. GLB original 4.532.132 bytes: `assets/rodeados/tactical-heavy.glb`.

Ambos recursos se obtienen del repositorio público de distribución de modelos https://github.com/cktang88/3d-fps, commit fijado `130ac2a5c856401ec36e7d35afcfefe40c5801f4`. El repositorio documenta las licencias CC BY, Quaternius CC0 para bibliotecas de animación y el dataset 100STYLE CC BY 4.0 de Ian Mason, Sebastian Starke y Taku Komura cuando corresponda. Nuestro proyecto adapta materiales y escala; conservar atribución y enlace a CC BY 4.0: https://creativecommons.org/licenses/by/4.0/.

**No son Robot M.A.N.U.L.**; su archivo descargable oficial requiere una cuenta Sketchfab autenticada y nunca se afirmó su instalación definitiva. Los modelos seleccionados sí vienen como GLB licenciados y son cargados automáticamente.

## Araña lobo 3D original
`rodeados-spider.js`: nuevo modelo procedural tridimensional con cefalotórax, abdomen texturizado por materiales PBR, franjas dorsales, ojos agrupados luminosos, quelíceros, 8 patas de dos segmentos animadas, vellos por instancing, sombra y barra de daño. Este personaje es **arte procedural original del proyecto**, no un modelo realista de tarántula descargado.

`rodeados-core.js`: tipo `spider` con 3 HP, velocidad 0,83 m/s, 260 puntos base de eliminación y daño de 7. Zona de cabeza baja, torso y patas; los tiros a cabeza real siguen bonificados. Aparece tras 12 segundos como encuentro garantizado si hay espacio y luego ocasionalmente en oleadas superiores. Seguridad: jamás entra a menos de 2,45 metros del usuario lógico; las colisiones AR no requieren caminar.

## Seguridad y rendimiento
- Límite de 4 humanoides importados y animados simultáneamente; demás robots usan el modelo procedural anterior, pero siguen visibles y disparables.
- Araña construida de geometrías simples + fur de `InstancedMesh`, sin texturas externas ni peticiones de red.
- Atributos GLB reales comprobados; el segundo modelo se distribuye con los assets de GitHub Pages, evitando que jugadores instalen archivos.
- Ante fallo de cualquiera de los dos modelos, se mantiene el render de robots anteriores. La araña no depende de esas descargas.
- Los modelos no se atan a la cámara ni se mueve ningún objeto AR físicamente.
- No se modifican otras rutas, Vercel original ni tablas Supabase de Viralio o Te Hice Esto.

## QA
- `tests/rodeados-spider-v16.test.cjs` prueba inicio, zona de cabeza baja, caída por bala, EMP, bomba y distancia segura.
- `tests/rodeados-auto-robots.test.cjs` valida dos modelos reales distintos y alternancia en primera oleada, disparos y ausencia de importador manual.
- `tests/rodeados-spider-browser-v16.cjs` verifica aparición del artrópodo real en render 3D WebGL mientras coexisten humanoides.
- Se mantienen pruebas WebXR Android **simulado**, no sustituyen mediciones físicas ni resultados FPS en teléfono real.

Los jugadores solo tienen que tocar **JUGAR**.
