# Color Rush Pro · Visual Audit V3 (27-10-2026)

## Scope
Redesign purely visual on `color-solo.html`. **No changes to gameplay**: `engine.js`, `survivor.js`, `color-duel.js`, AR hit-test, calibration, movement, positions, scoring, sounds and timers remain intact. Original 26 selectable SVG polygons (25 tiles + frame) remain exactly as before. Other games and Supabase not touched.

## Real-world screenshot audit
User-provided screenshot of the WebGL 3D implementation in AR: excessive dark tile frame, low-end checkered/plastic appearance, little material reflection and light reaction, HUD covering too much of the camera, calibration buttons stacked, player's YO marker partly hidden. These are **observed visual defects**, not confirmed logic errors.

## External license and performance research
- [ambientCG](https://ambientcg.com/view?id=MetalPlates017A): CC0 PBR sci-fi metal reference and alternative texture source. Large multi-map textures not bundled; inappropriate on colored glass surfaces and impose mobile downloads.
- [Poly Haven Metal Plate](https://polyhaven.com/a/metal_plate): CC0 industrial metal reference. Its dirty worn texture is less appropriate for a pristine futuristic arcade, and 8K downloads unnecessarily heavy; not bundled.
- [Kenney Particle Pack](https://kenney.nl/assets/particle-pack): CC0 source for 80 FX sprites. Compared to present shader particles. Not bundled to avoid extra transparency overdraw and preserve gameplay FPS.
- [Khronos OES_standard_derivatives](https://registry.khronos.org/webgl/extensions/OES_standard_derivatives/): WebGL1 derivatives require extension; avoid making rendering dependent on it.
- [Meta WebXR performance](https://developers.meta.com/vr/documentation/web/webxr-perf-bp/): prefer few geometry draws, compressed/limited textures and restrained transparent effects.

**Design choice:** external resources were examined and excluded from the shipped build where they would reduce performance or break stylistic continuity. Adopt their physical material cues via original shader code instead. **No third-party files downloaded/integrated**; this is explicit.

## Implemented
1. Wider colored glass visible area, from width .780 to .852 board units: surface area about +19% relative to previous 0.780². The darker frame now narrower.
2. Raised machined bezel reduced in thickness and height; corner details smaller.
3. Replaced checkerboard with clean lacquered glass shader: Fresnel, simulated depth-vignette, two diagonal studio light reflections, controlled micrograins, target-color pulse.
4. Brighter brushed graphite metal shader with two specular lobes.
5. Pulsating narrow rim lights and existing success energy waves, particles kept; previous auto-lite performance mode retained.
6. UI during round changed to compact 2-column button bar, a slimmer score HUD and timer, reduced diagnostic control, keeping every original button/action.
7. Player YOU marker gains animated halo and a small offscreen directional cue. It reads the original DOM-projected coordinates and **never changes them**.
8. Parameter `?visual=classic` continues to bypass native 3D and use original premium SVG fallback.

## Files
- `color-pro-3d.js`: shader/material and mesh proportions; self-contained native WebGL1, uses existing XR context/frame hook.
- `color-pro-finish.js`: passive overlay/CSS class switch, marker halo and on-screen cue; no game events.
- `color-premium.css`: live-game compact layout + high contrast visual marker.
- `color-solo.html`: three versioned visual JS/CSS references.
- Tests: `tests/color-premium-visual.test.cjs`, `tests/color-pro3d-smoke.test.cjs`, `tests/color-pro-finish.test.cjs`, `tests/color-pro3d-webgl.html`.

## Quality gates
1. Node visual tests (original polygons and interactions preserved; native 3D state/fallback; new HUD/YO guide).
2. Chromium WebGL1 shader compile and render smoke (desktop simulation, not phone).
3. Preview deploy in Vercel for exact final Git SHA, inspect READY and asset routes.
4. Manual Android Chrome/ARCore: 25 tiles fully visible, position indicator, calibrated tile pointer, success/fail, tracking pause, restart, FPS on real phone. **Not yet performed**.
5. Do not merge to main or alter original `color-rush-ar-demo` until step 4 passes.

## Visual caveat
The new shader is physically inspired, not scanned photogrammetric PBR nor true environment reflections/occlusion. Never claim true full room reflections or foot tracking. Mobile review may require brightness/contrast tweaks.
