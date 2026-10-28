# CIVIDOM · Quaternius skinned base (2026-10-28)

## Asset included
- `ubc-superhero-male.glb`: a 741,320-byte GLB from the FREE Standard Universal Base Characters pack by Quaternius, repackaged with preserved skinning by programasweights/avatar.
- Exact copied Git blob SHA: `b3fd79533fdb9fcedd077744f7e120920eb6cc97`
- Source: https://github.com/programasweights/avatar/blob/main/public/assets/character.glb
- Upstream: https://quaternius.com/packs/universalbasecharacters.html
- License: CC0 1.0 Universal; text preserved in LICENSE.txt.
- Inspect: 69 nodes, one skin/65 joints, 3 meshes, 0 embedded animation clips.

## Architecture
- `paper-quaternius.mjs` is CIVIDOM-authored bone-local garment/accessory overlays and bone animation gestures, not an import of the Quaternius Modular Character Outfits Fantasy Standard ZIP.
- The official free Fantasy outfit ZIP is **not** bundled at this stage. Do not market the 12 original outfits or 62 modular parts as present in the current game.
- Four original CIVIDOM personas share the Universal Base humanoid rig and palette/gear, while legacy animal mascots remain selectable.
- If the GLB fails to load, the renderer switches to the old fallback instead of breaking capture, power boxes or storm.
- Uniform clothing is a first-pass prototype; full premium rigged mesh outfits require the authentic Standard pack to be vendored and fitted/retargeted, plus on-device visual QA.
