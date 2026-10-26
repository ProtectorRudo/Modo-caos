# MINI WORLDS — Asset manifest · Kenney CC0

## Proveniencia y condiciones
- **Autor original:** Kenney / Kenney.nl.
- **Colecciones:** Nature Kit y Platformer Kit. Licencia [Creative Commons Zero (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).
- **Sitio oficial:** https://kenney.nl/assets/platformer-kit — marcado CC0, permiso de uso comercial.
- **Copias GLB (conversión de terceros):** https://github.com/Hidencod/tge-assets — este repositorio indica que sus packs GLB son conversiones de modelos Kenney CC0, originales del artista Kenney.
- **Origen concreto:** `Hidencod/tge-assets/packs/nature-kit` y `packs/platformer-kit` (rama main, consultados el 26/10/2026).
- **Estado:** 19 archivos GLB verificados y copiados dentro de `/assets/mini-worlds/kenney/`. Ningún asset protegido de Astro Bot se ha utilizado.
- **Atribución:** no obligatoria por CC0; acreditamos al autor igualmente.
- **Entrega:** la app carga los 19 archivos desde el mismo origen HTTPS del juego. El usuario no tiene que cargar archivos. Si falla alguna carga, continúan las figuras 3D originales.
- **Integración:** `mini-worlds-assets.js` realiza caché local por sesión, instancias clonadas, escala proporcional y despoblado de la escena anterior. El avatar ORIN y el cangrejo jefe conservan identidad y diseño originales de MINI WORLDS.

## Selección de Nature Kit (14 GLB)
| Archivo | Uso |
|---|---|
| tree-palmdetailedtall.glb | Palmas altas en costas |
| tree-palmbend.glb | Silueta inclinada en bordes |
| tree-palmshort.glb | Palmas bajas y variados |
| tree-detailed.glb | Árboles del acantilado |
| plant-bushdetailed.glb | Sotobosque en selva |
| grass-leafslarge.glb | Plantas alrededor de plataformas |
| flower-yellowb.glb | Flores costeras |
| rock-largea.glb | Rocas de bordes |
| rock-tallb.glb | Pilares de roca |
| stone-largeb.glb | Ruinas / arena de jefe |
| cliff-waterfall-rock.glb | Fondo de cascada |
| bridge-woodround.glb | Puente escénico |
| canoe.glb | Canoa junto a la playa |
| campfire-stones.glb | Fogata en campamento |

## Selección de Platformer Kit (5 GLB)
| Archivo | Uso |
|---|---|
| crate.glb | Caja normal, de monedas y misteriosa |
| crate-strong.glb | Caja reforzada, tres golpes |
| chest.glb | Caja especial / cofre secreto |
| coin-gold.glb | Monedas coleccionables |
| star.glb | Estrellas escondidas |

## Reglas de rendimiento y mantenimiento
1. Nunca colocar modelos 3D sobre controles de juego, los objetos decorativos están en márgenes.
2. Prefetch/concurrencia en lotes de cinco recursos. No bloquear el loop principal por modelado.
3. Geometrías y materiales GPU liberados al cambiar de escena.
4. No declarar 60 FPS ni AR real verificada sin un test físico con Android ARCore y Chrome.
5. No añadir modelos CC-BY sin registrar autor, licencia y atribución.
6. Versionar todos los recursos y sus fuentes en GitHub.

## Personajes animados seleccionados (26/10/2026)

**Protagonista:** Knight.glb de Kay Lousberg — KayKit Character Pack Adventurers 1.0, licencia Creative Commons Zero CC0 1.0. [Fuente oficial](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) y [licencia oficial](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/blob/main/LICENSE.txt). El archivo original está en `addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb` (~3.66 MB). Debido al límite de lectura de archivos binarios grandes de la conexión GitHub, *no se pudo incorporar una copia binaria local en este avance*. `mini-worlds-characters.js` lo descarga automáticamente, sin pedir ninguna acción al jugador, desde `raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/...`. Si falla, la representación 3D procedural original continúa habilitada. Para lanzamiento estable, empaquetar y comprimir el Knight.glb dentro del mismo origen del juego.

**Enemigos:** Quaternius, Cute Animated Monsters Pack (agosto de 2020), 21 monstruos en catálogo, CC0 personal y comercial. [Fuente oficial y licencia](https://quaternius.com/packs/cutemonsters), [mirror de archivos glTF](https://github.com/agentkaerf/FreeModels/tree/main/Cute%20Animated%20Monsters%20-%20Aug%202020/glTF) (contenido CC0 descrito por su propietario). Archivos `assets/mini-worlds/characters/{Alien,Bat,Cactus,Cyclops,Mushroom,Ghost}.gltf`, todos completos, glTF 2.0 con buffer interno, texturas y clips. Por roles: Alien/Mushroom patrulla, Bat/Ghost volador, Cyclops defensor y Cactus lanzador.

**Jefes iniciales:** modelos YellowDragon y Yeti del **mismo pack Quaternius** y misma licencia CC0. Archivos locales `assets/mini-worlds/characters/YellowDragon.gltf` y `Yeti.gltf`; los modelos se escalan de forma visual, tienen núcleo vulnerable independiente y mantienen la física y las 3 fases del motor. Dragón Dorado en la primera misión y Rey Yeti en la segunda.

**Limitaciones y no afirmaciones:** verificada presencia de esqueletos, buffers embebidos y clips glTF mediante inspección de los archivos. No verificados todavía el resultado visual en Chrome WebGL, carga CORS del caballero en todos los dispositivos, clip de espada exacto del caballero, ni el posicionamiento real en Android ARCore. Mantenerlos bajo revisión de preview. No usar personajes o marcas originales de Astro Bot.

## Naturaleza y ruinas premium importadas (26/10/2026)

A diferencia de las 19 piezas Kenney autohospedadas, los siete GLB de esta ampliación se cargan automáticamente desde URLs inmutables `raw.githubusercontent.com` asociadas a commits públicos de sus repositorios de origen. **No están copiados aún dentro de este repositorio**. Son arte opcional: si la descarga remota falla, se conserva el escenario Kenney/procedural, completo, con todas sus colisiones y controles.

### Quaternius — Stylized Nature MegaKit, edición Standard, CC0

Fuente oficial: https://quaternius.com/packs/stylizednaturemegakit.html (edición Standard gratuita, modelos glTF, licencia indicada en la página: CC0).

Copias GLB optimizadas para web de `anshaneja5/skyline-run`, commit fijo `0c41526d8d4130c37c15e219c2c3737fa8cb4ad8`, créditos de tercero https://github.com/anshaneja5/skyline-run/blob/0c41526d8d4130c37c15e219c2c3737fa8cb4ad8/CREDITS.md :

| Alias código | Archivo remoto verificado | Tamaño | Git blob SHA |
|---|---|---:|---|
| canopyA | `public/assets/models/tree1.glb` | 516 044 bytes | `80bd662cc51f983986f4e201463dc3a729a6cd4a` |
| canopyB | `public/assets/models/tree2.glb` | 446 732 bytes | `0197de65879eb650247c8d56ac52da34489938cb` |
| canopyC | `public/assets/models/tree3.glb` | 332 440 bytes | `828786b4bdb5224a8b3672f5e5d6cebe1c65bd93` |
| shrub | `public/assets/models/bush.glb` | 108 520 bytes | `84b4153c17e988a658e56d4093b0028d1b034c3f` |

### Kay Lousberg — KayKit Medieval Hexagon Pack, CC0

Pack original: https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/tree/84fa4e91af6a88989be7c99e0891cede11f2ca38 .

GLBs de `kikoncuo/jevfire`, commit fijo `5df83b558bf635e006d31f8f2fc2798d0e3ff051`, con procedencia y licencia preservadas en https://github.com/kikoncuo/jevfire/blob/main/web/ASSETS.md .

| Alias código | Archivo remoto verificado | Tamaño | Git blob SHA |
|---|---|---:|---|
| medievalTower | `web/public/assets/tower.glb` | 130 876 bytes | `d4bace4e1157841d5270e6a6fbb3d8120b7781dc` |
| medievalWall | `web/public/assets/wall.glb` | 48 220 bytes | `493bfe3f0df0d0fcad99c21b6eeea813b6dd145c` |
| medievalRock | `web/public/assets/rock.glb` | 18 800 bytes | `b3edff0760b3e01088fbae75afbd14c42c827829` |

### Distribución y limitaciones

- `mini-worlds-premium.js` carga de forma automática los **cuatro modelos Quaternius para el primer nivel** y los **siete para el segundo**, normaliza por altura real y coloca instancias clonadas solo en márgenes de las plataformas físicas, sin alterar colisiones ni AR.
- Cuando al menos tres copias de canopy se colocan correctamente, se oculta el grupo de palmas/arbustos Kenney duplicados. Se conservan algunas palmeras autóctonas y los modelos jugables de monedas, cofres, puentes y rocas. Si solo cargan arbustos, no se eliminan los árboles anteriores.
- Se preserva el snapshot de anclaje WebXR, el movimiento relativo a cámara y la navegación por los 13 caminos físicamente jugables. Se aborta la incorporación si la escena se desecha antes de completar las descargas.
- El total nuevo es de aproximadamente **1,4 MB** para el paisaje tropical y unos **200 KB adicionales** de ruinas medievales en el segundo mundo. Carga sujeta al acceso HTTPS/CORS a GitHub.
- **No atribuir a KayKit Platformer Pack** estas tres piezas de arquitectura: proceden de **KayKit Medieval Hexagon**, aunque su función es decorar un juego de plataformas. La integración directa del pack Platformer de KayKit quedó pendiente porque no se obtuvo un subconjunto GLB distribuible y verificable, sin recurso pagado ni intervención manual.
- Pruebas: metadata GitHub de los siete archivos/SHAs, mock GLTF de colocación y reemplazo, regresiones del motor original. No se confirmó aún render visual ni FPS del primer y segundo mundo sobre Android real. Para producción definitiva conviene copiar los siete GLB a nuestro mismo origen, previa herramienta autorizada para transferencias binarias.
