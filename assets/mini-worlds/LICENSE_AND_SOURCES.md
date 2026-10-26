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
