# RODEADOS 360 V24 — FPS fotorealista para móviles verticales

**Estado:** PR #103, rama `feat/rodeados-v24-polyhaven-premium-fps` basada en V23, **no fusionada a main ni publicada en producción**. No modifica banderas, oleadas, física, puntuaciones, tablas Supabase ni otros juegos. Vercel respondió HTTP 402 `api-deployments-free-per-day` (más de 100 deployments) al crear preview, por lo que ninguna preview V24 jugable quedó verificada. No afirmar lo contrario.

## Modelo principal nuevo (no low-poly toy)

[Service Pistol — Poly Haven](https://polyhaven.com/a/service_pistol), autor Mateusz Sadek, **CC0**, licencia pública sin obligación de atribución. Arte original fotorrealista con metal desgastado, madera y texturas PBR de color, metal/roughness y normales. GLB empaquetado: `assets/rodeados/player-pbr-service-pistol.glb` (1.467.348 bytes). Texturas redimensionadas a 768 px vía glTF Transform sin pérdidas de datos geométricos.

El GLTF original contenía **dos pistolas** y piezas sueltas (magazine empty, bullet). `fitPolyHavenServicePistol` conserva solo `pistol_a`, `slide_a`, `magazine_loaded`, `hammer_a` y `trigger_a`; elimina las piezas dobles que agrandaban el bounding box y se superponían.

Pipeline reproducible: `.github/workflows/rodeados-v24-polyhaven.yml` descarga del API oficial, valida MD5/tamaños de glTF, BIN y tres texturas, convierte y empaqueta GLB, valida glTF2 y límites para móvil, realiza commit en rama aislada. El usuario no descarga nada.

## Encuadre premium en AR

`rodeados-art.js` integra el GLB real, reemplaza únicamente la pistola de jugador y conserva armas Quaternius CC0 de nivel táctico/plasma y fallback cuando falle el GLB. No coloca la pistola en el mundo anclado sino en el viewmodel de primera persona.

- Posición calculada desde la matriz de proyección de la cámara real de WebXR: objetivo visual **x=+0,73 e y=-0,57 NDC** (abajo a la derecha).
- Rotación aproximadamente 28° hacia adentro para silueta de 3/4, escala 69% del GLB ya normalizado.
- Animación muy suave de respiración y pequeño retroceso. Armas y controles permanecen separados del ancla de bandera.
- Los viejos brazos WRAD se ocultan en modo pistola PBR porque se montaban sobre la geometría nueva; otras armas mantienen el tratamiento anterior.
- El retículo permanece en el centro, sin necesidad de controlar la dirección del arma para disparar.
- Las nuevas comprobaciones de navegador y WebXR simulado evalúan **origen realista PBR**, geometría de mallas, posición al lado derecho y dentro del frustum, carga sin interacción, core y regresiones del juego.

## Límite de verificación

**Las pruebas en Chromium usan software WebGL y WebXR simulado.** Todavía es obligatorio comprobar en Chrome Android + ARCore el tamaño, la orientación, el clipping en móviles de distintas proporciones, la estabilidad de FPS al cargar textura PBR, los efectos de fogonazo/impacto y que el disparo coincida con el retículo. No afirmar calidad 10/10 antes de pruebas físicas.

El despliegue bloqueado Vercel requiere reintento autorizado cuando se restablezca la cuota. No cambiar plan ni publicar a producción original sin aprobación.
