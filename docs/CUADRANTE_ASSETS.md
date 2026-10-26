# CUADRANTE — assets profesionales integrados

## Alcance

Los recursos de este paquete se cargan **desde el mismo alojamiento del juego**. El jugador no descarga ni instala archivos manualmente. Las importaciones son decorativas; el motor de física, el seguimiento AR y la detección de colisiones no dependen de ellas. Si alguna descarga falla o el equipo es limitado, CUADRANTE conserva la arena y los sonidos de respaldo.

| Recurso | Licencia | Qué se integró |
|---|---|---|
| [Quaternius Modular Sci-Fi MEGAKIT Standard](https://quaternius.com/packs/modularscifimegakit.html) | CC0-1.0 | 11 modelos glTF (pilares, puertas, pisos y barandillas) con buffers locales; se colocan alrededor de la arena como decoración |
| [Kenney Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0-1.0 | 8 pistas OGG para golpes, rebotes, cambios de arena, puntos y SMASH |
| [ambientCG Metal032](https://ambientcg.com/a/Metal032) | CC0-1.0 | 4 mapas PBR WebP 512×512 (color, normal OpenGL, rugosidad y metalicidad) |

### Construcción y procedencia

El script `scripts/build-cuadrante-assets.py` utiliza solamente los ZIP gratuitos públicos, valida que los elementos existan, recorta archivos y genera `assets/cuadrante/manifest.json` con SHA256 de los ZIP originales y de los sonidos/mapas locales. La carpeta completa debe pesar menos de 12 MiB; nunca incluir el ZIP de más de 40 MB en el repositorio. Fuente de modelos: licencia CC0 declarada por el autor y publicada en OpenGameArt. Kenney y ambientCG también declaran CC0.

En el archivo Standard gratuito algunos materiales glTF hacen referencia a mapas externos no distribuidos en el ZIP. En esos casos el script **genera pequeñas texturas neutras** para que los modelos geométricos se rendericen sin prometer los shaders de la edición Source de pago.

### Uso técnico

- `cuadrante-premium.js` importa los modelos con `GLTFLoader` al grupo `stage.root`, garantizando la misma transformación anclada en WebXR que la arena. Ninguna de esas piezas crea colisiones nuevas.
- Se aplica PBR solo al suelo de la arena; las defensas mantienen sus materiales y colores reconocibles.
- Los sonidos reales se precargan únicamente después del gesto JUGAR y se reproducen con WebAudio. Si falta OGG se conserva el sintetizador original.
- El modo Canvas 2D sigue funcionando con toda la física sin glTF ni WebGL.
- Todas las descargas son `./assets/cuadrante/**` locales, y se reutilizan vía caché HTTP. La única dependencia externa del render 3D es el motor Three.js y su cargador, que tienen mecanismos de respaldo.

### Validación

`python3 tests/cuadrante-assets.test.py` verifica la integridad del paquete, enlaces relativos de cada glTF, encabezados OGG y WebP y presupuesto de tamaño. `tests/cuadrante-premium.spec.cjs` inicia Chromium WebGL y verifica que entren al menos cinco piezas y los cuatro mapas PBR al escenario.

**Pendiente de prueba física:** calidad visual/FPS en Android real, calibración AR y estabilidad espacial. No equivale a una prueba de hardware.
