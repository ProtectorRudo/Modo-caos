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
