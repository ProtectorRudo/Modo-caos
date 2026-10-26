# Ritmo Caos V34 — Horse DJ LIVE MIX

## Contexto de QA físico
En la captura de V33, el caballo tiene torso sólido, pero los codos están abiertos y las manos terminan en la cintura. El objetivo principal es que ambas manos alcancen efectivamente los CDJ, sin desarmar la malla, más una cabina negra de concierto y tarima anclada visualmente al piso.

## Implementación
- **`ritmo-skinning.js`** reutiliza el GLB CC0 Quaternius Punk, sus huesos reales `UpperArm.L/R`, `LowerArm.L/R`, `Hand.L/R` y los atributos `JOINTS_0/WEIGHTS_0`. Implementa un IK bidimensional de **dos huesos por brazo**, con pivote exacto en hombros y codos, restricciones de longitud de brazo y codo hacia afuera. Los objetivos de las manos se posicionan sobre los dos CDJ (±0,169 m, ~0,405 m de alto) y se mueven suavemente al ritmo. Las matrices resultantes se mezclan por los pesos originales GLB y una transición de antebrazos en z. Esto reemplaza el algoritmo V33 de giros fijos, que dejaba los puños sobre las caderas. Conserva la geometría íntegra de **2.958 triángulos también en LOW**.
- **`ritmo-glb-props.js`** admite renderizar el CC0 `dj-booth-desk.glb` sin duplicar el mezclador, mediante opción `deskOnly`. El uso anterior de `draw()` sin argumentos se conserva.
- **`ritmo-exterior.js`** cubre la tapa clara del escritorio con una superficie metálica negra separada, sitúa encima los CDJ y el mezclador, añade aros giratorios, faders, botones y LEDs. Las dos pulseras luminosas reciben las **posiciones reales calculadas por IK**, no dibujan unas manos falsas delante del cuerpo. La tarima tiene cuatro patas con pequeñas sombras de contacto simuladas; conserva pantalla, parlantes y truss V33. El esquema de anclaje AR, coordenadas de la pista y la separación de escenografía de 22 cm están intactos.
- **`ritmo.html`** carga `ritmo-glb-props.js?v=34`, `ritmo-skinning.js?v=34`, `ritmo-exterior.js?v=34` y `ritmo-stage-showtime.js?v=34`. Runtime/audio se mantienen en versión anterior.
- No se descargarán nuevos objetos y no se toca Supabase.

## Validación
- Tests V34: IK sobre huesos reales con metas que coinciden con los CDJ; longitud de brazo y codo, continuidad de todas las caras, validación de soporte físico simulado, capa de trabajo, faders y suelo.
- Regresiones V28–V33, tests de note-hit y sintaxis Node.
- No demuestra resultado visual/fps físico en Android; solicitar screenshot en dispositivo con WebXR para cerrar PR.
