# CIVIDOM Premium Power Crates — Third-party licenses

Only two original 3DAssets.dev sources are used. Both are CC0 1.0 Universal (public domain), permit commercial games, modification and redistribution, and do not require attribution.

- **Ammo Crate Pickup (Hero Shooter Harbour Payload)**: https://3dassets.dev/assets/hero-shooter-harbour-payload-pickup-ammo-crate-2eac260e — CC0, ~1,336 triangles, animated spin, GLB https://cdn.3dassets.dev/assets/27680/v1/model.glb.
- **Elite Locked Crate (Wipe Day Survival Island)**: https://3dassets.dev/assets/wipe-day-survival-island-elite-locked-crate-bede223e — CC0, 208 triangles, open/close animations, GLB https://cdn.3dassets.dev/assets/27451/v1/model.glb.
- CC0 license: https://creativecommons.org/publicdomain/zero/1.0/

Build-time `scripts/vendor-power-crates.py` verifies glTF v2 structure, bounds size and copies only these approved assets into `assets/powercrates`. If the vendor is unavailable, the game renders the original authored premium 2.5D visual fallback without stopping gameplay. The fixed links are fallback CDN sources for the same CC0 models; the player never downloads or installs anything manually.

**Fab Free Stylized Crates Set was evaluated for its art direction only. It is not bundled or fetched by these scripts, since its library download requires an external gated marketplace action.**

All added color shells, badges, particles, and animations outside the source GLBs are CIVIDOM-original; this integration changes no loot probabilities, pickup radius, powers, territory, or storm timing.
