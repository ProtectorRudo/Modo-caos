# RODEADOS 360 V22 — Armas 3D gratuitas e integradas

## Alcance y control de publicación

Rama: `feat/rodeados-v22-cc0-premium-weapons`, PR #100, **base V21, no main**. No cambia juegos anteriores, tablas de Supabase ni producción original `color-rush-ar-demo`.

El usuario no debe importar, seleccionar ni descargar ningún archivo: estos cuatro modelos se empaquetan en la propia carpeta `assets/rodeados/` y se cargan automáticamente por `rodeados-robots-auto.js` antes del inicio del combate, con fallback procedimental solo para la primera persona.

## Modelos CC0 realmente incluidos

| Uso | Archivo empaquetado | Fuente CC0 verificada | Tamaño |
|---|---|---|---|
| Pistola jugador | `player-scifi-pistol.glb` | Quaternius Sci-Fi Gun Pack, colección [CC0-Public-Domain-Models](https://github.com/Papyszoo/CC0-Public-Domain-Models/tree/main/packs/quaternius-scifigun) | 72.588 B |
| Carabina táctica jugador | `player-tactical-carbine.glb` | Quaternius Sci-Fi Modular Guns Pack, misma colección | 97.832 B |
| Rifle plasma jugador | `player-plasma-rifle.glb` | Quaternius Sci-Fi Gun Pack, misma colección | 136.036 B |
| Rifle enemigo | `enemy-assault-rifle.glb` | Quaternius Ultimate Guns Pack, misma colección | 61.844 B |
| Brazos FPS ya existentes | `arms-cc0.glb` | [WRAD ARMS](https://github.com/wwwriks/wrad-arms), CC0 | 456.328 B |

Licencia de los cuatro modelos de Quaternius: **Creative Commons Zero (CC0 1.0)**, según `pack.json` de cada colección y licencia de la fuente pública. No requieren atribución, pero se mantienen aquí los créditos. Archivo original V20 `rodeados-weapons-v20.js` permanece como fallback para el jugador si falla un GLB, **no** se usa para equipar enemigos.

Descarga y validación automática: `.github/workflows/rodeados-v22-assets.yml`, comprueba cabecera GLB, versión glTF 2, tamaño bajo 1 MB, mallas y empaqueta los cuatro ficheros sin intervención del usuario.

## Integración gráfica

- `rodeados-weapons-v22.js`: normalización automática del eje de longitud del arma a +Z, escala para visualización móvil (~0,35 m pistola; 0,62/0,66 m fusiles), malla auténtica, pequeño fogonazo y materiales del archivo original. Se ubica únicamente en el rig de vista FPS, que sigue la cámara WebXR. No afecta ancla de piso, jugador, colisiones ni rayos de disparo.
- `rodeados-art.js`: cambia visual de arma según `G.weaponTier(game)`. El objeto procedural anterior **se oculta** cuando el arma GLB real del tier se ha cargado. No se duplican modelos ni se muestran armas grandes hechas de cubos. Conserva brazo WRAD CC0 ya instalado.
- `rodeados-robots-auto.js`: **eliminado el rifle procedural gigante pegado al torso enemigo**. Nuevo rifle CC0 solo cuando un soldado animado dispone de un hueso inequívoco de mano derecha, y se actualiza siguiendo ese hueso. Si no hay una mano detectada o posición físicamente razonable, el arma se **oculta** — mejor soldado sin rifle visible que uno flotante o atravesando su cuerpo. La araña y monstruos no reciben arma.
- Máximo 4 actores externos originales simultáneos para proteger GPU móvil. El archivo `tactical-heavy.glb` defectuoso permanece en cuarentena.

## Pruebas necesarias

1. El workflow `rodeados-v22-qa.yml` verifica sintaxis, regresiones reglas/core, navegador y WebXR **simulado**.
2. `RODEADOS_REAL_ASSET=1 node tests/rodeados-auto-robots.test.cjs` valida que **los cuatro GLB reales** están cargados, tres tiers visuales instalados y solo se montan rifles enemigos asociados a una articulación válida.
3. Revisión **física** con Chrome Android y ARCore: verificar que la pistola y el fusil ocupan una fracción cómoda de la pantalla, el fogonazo coincide con el retículo, el soldado no muestra el arma si está mal vinculada y las texturas/animaciones se ven correctas a 30+ FPS.
4. Este cambio no crea multijugador: las salas siguen pendientes de sincronización/QA real.

**No afirmar calidad 10/10 ni listar como validado en teléfono** hasta que una persona lo pruebe físicamente y confirme posición, proporciones y FPS en el dispositivo.
