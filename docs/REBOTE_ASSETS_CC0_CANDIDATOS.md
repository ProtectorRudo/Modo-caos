# Rebote Mortal — shortlist verificada de assets 3D gratuitos (2026-10-26)

**Estado:** investigación/licencia/formato; **NO integrados**, sin reemplazo automático y sin prueba Android/WebXR física. Branch de trabajo V12, no producción.

## Seis robots candidatos para duelos

Creador original: **Quaternius**. Distribución individual **Poly Pizza**, fichas indican Public Domain (CC0) y **FBX/GLTF**. El archivo real necesita descargarse, inspeccionarse, optimizarse y probar animación antes de integrarse.

| Rival | Modelo | Ficha pública |
|---|---|---|
| CHISPA | Robot Enemy | https://poly.pizza/m/1gNo5ezvmr |
| RAYO | Robot Enemy Flying | https://poly.pizza/m/lF3jeRJwiH |
| PIXEL | Robot Enemy Flying Gun | https://poly.pizza/m/UDTM6X1y9a |
| VECTOR | Robot Enemy Legs Gun | https://poly.pizza/m/lFZfDh2hzP |
| TURBO | Robot Enemy Large Gun | https://poly.pizza/m/mWojM4i2IH |
| NÉMESIS | Robot Enemy Large | https://poly.pizza/m/mPDR0L5uKx |

Alternativas opcionales:
- **Sci-Fi Essentials Kit**: https://quaternius.com/packs/scifiessentialskit.html (CC0, 65 total, Standard gratuito parcial de 37 modelos, FBX/OBJ/glTF, paquete Standard en itch de 159 MB). NO usar paquete entero web.
- **Animated Mech Pack**: https://quaternius.com/packs/animatedmech.html (CC0, 4 robots animados, badge glTF, verificar descarga estándar antes de escoger).
- **Cyberpunk Game Kit**: https://quaternius.com/packs/cyberpunkgamekit.html (CC0, 71 modelos, plataformas, enemigos, torretas, glTF).

## Arenas (pistas) candidatas

1. **Kenney Modular Space Kit** (40 piezas CC0, kit completo 7 MB, glTF FBX OBJ). https://kenney.nl/assets/modular-space-kit . Descarga alternativa autora original https://opengameart.org/content/modular-space-kit
2. **Quaternius Modular Sci-Fi MegaKit** (277 piezas teóricas, descarga Standard gratuita 60-70% del pack, CC0, FBX/OBJ/glTF): https://quaternius.com/packs/modularscifimegakit.html
3. **Quaternius Cyberpunk Game Kit** (71 piezas; modular/neón/industrial, CC0 glTF): https://quaternius.com/packs/cyberpunkgamekit.html
4. **Kenney Space Station Kit** (90 piezas; CC0): https://kenney.nl/assets/space-station-kit

### Diseño AR seguro

- Conservar **engine/Hit Test y anclaje espacial existente**, calibración Color Rush, función recentrar, cámara del móvil como controlador. Nada 2D adherido a pantalla salvo HUD.
- Construir **únicamente un disco/plataforma baja de aproximadamente 1.4–2.2 m**, con módulos perimetrales sin obstaculizar movimiento físico ni requerir que el usuario camine rápido. Sin paredes virtuales grandes o escenarios tipo pasillo que oculten la habitación; robots separados adelante ~2.3 m.
- Para 6 duelos, precargar **un solo modelo** (y el siguiente opcional) en GLB/glTF, cachear por URL/versión; unload y dispose apropiados. Nunca descargar el ZIP original desde la sesión del jugador.
- Escalas correctas: bounding box a 1.6–1.8 m para robots humanoides, tamaños relativos para robots voladores, posición en contacto con plano estable, frente a la cámara, AnimationMixer (si hay clips), idle/ataque/impacto/muerte. Validar `gltf.animations` ejes/rig antes de asegurar acciones disponibles; si faltan, mezclar animaciones procedurales.
- Perf inicial propuesto **budget por escena**: 1 robot visible; 1-2 pelotas; 2-4 geometrías decorativas de plataforma; recursos específicos por ronda ~ 1–3 MB GLB comprimidos; textura 512–1024 px selectiva; sin sombras dinámicas costosas (blob shadow); apuntar a 60fps y validar en Moto Android real. Son **objetivos propuestos**, no mediciones.
- Estrategia segura `GLTFLoader` Three.js + `SkeletonUtils.clone` solo si se duplican SkinnedMesh, `AnimationMixer`, fallback al robot procedural actual si falla un recurso, 3D demo+XR synthetic+ARcore Android manual. Bundle local versionado en repo/CDN Vercel, no depender de sitios terceros en tiempo de juego.

### Verificación pendiente antes de integración

- Descargar seis archivos individuales, registrar SHA256, tamaño en bytes, clips reales y conteo de triángulos draw calls; confirmar licencia dentro de paquete.
- Verificar CORS/HTTPS si descargas automáticas; ideal subir modelos al mismo origen Vercel.
- Probar carga de GLB, skinned meshes, orientación +Z, textura, normalización de escala, AnimationMixer y sombras contacto en WebGL móvil.
- Montar **arena 1** sin paredes; variante 2 o 3 solo tras medir FPS; mantener los otros minijuegos intactos.
- QA por modo demo y AR Android físico; no marcar listo hasta probar.

Fuentes técnicas: https://threejs.org/docs/pages/GLTFLoader , https://threejs.org/manual/pages/animation-system.html
