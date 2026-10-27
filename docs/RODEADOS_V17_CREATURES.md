# RODEADOS 360 V17 — Invasión, criaturas y armas FPS

## Estado y alcance (26 de octubre de 2026)

Implementación **experimental** sobre la rama `feat/rodeados-creature-combat-v17`, sin cambios en producción ni en otros juegos. El jugador abre `/rodeados.html?v=17` y no descarga archivos ni elige GLB.

### Activos incorporados y licencia

| Archivo (bundled local) | Fuente original y licencia | Uso |
|---|---|---|
| `assets/rodeados/tactical-android.glb` | BAMEN (Sketchfab), CC BY 4.0; ver `docs/RODEADOS_V16_ENEMIES.md` | Humanoide soldado |
| `assets/rodeados/tactical-heavy.glb` | DanlyVostok (Sketchfab), CC BY 4.0; ver `docs/RODEADOS_V16_ENEMIES.md` | Humanoide pesado |
| `assets/rodeados/creep-stalker.glb` | [Gobkit Minion](https://gobkit.com/freebies/minion), CC0 | Criatura acechadora desde 30 s |
| `assets/rodeados/brute-champion.glb` | [Gobkit Orc Warband Champion](https://gobkit.com/freebies/human006), CC0 | Representación alternativa del jefe de 60 s |
| `assets/rodeados/arms-cc0.glb` | [WRAD ARMS](https://github.com/wwwriks/wrad-arms) (archivo GLB), CC0, commit `f3987244176c33d2c20d4f9e139980af12684d87` | Brazos en primera persona (solo vista FPS) |

**Importante:** el Minion y Orc Warband Champion **NO son** los modelos concretos «Creep Creature» de CGTrader y «Minotaur Berserker» de Sketchfab. Las armas 3D actuales son diseños procedurales del proyecto, **NO** descargas de la Sci-Fi Pistol ni de la MP7 o rifle de plasma enlazados antes. No afirmar que esos productos exactos están instalados. Los créditos de los modelos CC BY originales permanecen.

El workflow `.github/workflows/rodeados-v17-assets.yml` descargó, comprobó glTF v2 y empaquetó archivos en GitHub. **No es una herramienta de importación de usuarios.** La vista AR usa el archivo local; una segunda fuente fija funciona como contingencia mientras haya red. La ausencia del recurso no impide jugar: sigue el enemigo procedural y manos originales.

### Mecánica

- Oleadas 1–2: humanoides; desde 12 segundos, araña ya existente.
- A partir de 30 segundos (tercera oleada): acechador `creep`, que corre y zigzaguea; desbloqueo visual de arma táctica.
- A partir de 60 segundos (quinta oleada): jefe de criatura `minotaur` del núcleo representado por Orc Champion cuando el GLB se puede usar; desbloqueo rifle de plasma con +1 daño por impacto. El nombre interno del tipo determina puntos y cajas de colisión; no describe fidelidad anatómica del modelo alternativo.
- Pistola inicial, arma táctica y plasma son geometrías Three.js livianas originales. Los brazos CC0 se colocan exclusivamente junto al arma FPS; no implican tracking de manos.
- 4 máximo modelos externos simultáneos; se da prioridad a criaturas frente a humanoides genéricos.
- Los objetivos y el suelo siguen el ancla WebXR, solo el arma sigue la cámara. Se mantienen headshots, Bomba Caos, EMP, munición infinita y todas las opciones de modo.

### Comprobaciones exigidas antes de producción

1. `node --test tests/rodeados-v17.test.cjs` valida desbloqueo, tipos de enemigo, distancias, impacto en la cabeza y modos.
2. `RODEADOS_REAL_ASSET=1 node tests/rodeados-auto-robots.test.cjs` valida que se carguen efectivamente los 4 GLB de enemigos desde el host local; no se conforma con gráficos sintéticos.
3. `node tests/rodeados-xr-smoke.test.cjs` simula tracking XR; **no equivale a prueba real en teléfono Android**.
4. Verificar visualmente glTF animaciones, manos/arma, perfil GPU, tamaño de descarga y funcionamiento bajo ARCore antes de promocionar a producción.
5. Comprobar URL preview Vercel `READY` y archivos GLB accesibles. No tocar ni conectar producción original.

### Limitaciones técnicas explícitas

El arma táctica por ahora presenta cambio de aspecto, sin ráfaga MP7 física. Los modelos de Gobkit deben ser inspeccionados visualmente en WebXR real; `GLTFLoader` y `buildAdapter` son compatibles con glTF y animaciones pero la orientación exacta puede precisar ajustes. El movimiento del jugador es teléfono, **no** tracking corporal ni manos reales. El online de salas no se declara funcional.
