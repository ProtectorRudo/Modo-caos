# REBOTE MORTAL V10 — Lanzamiento nativo Vercel

Rama de preview creada DESPUÉS del merge a main `0984af8b2fcacb73a40d4e44bf48c9fee5b72fd4`. Esta rama **no modifica** los archivos del juego ni afecta al arcade original.

### Requisitos de promoción
- HTML `rebote.html` referencia `rebote-runtime.js?v=10`.
- `rebote-core.js` expone `DUEL_RIVALS`, 6 enemigos, transición KO sin reiniciar WebXR, y modo clásico preservado.
- `rebote-runtime.js` ofrece HUD de rival, selector de modos y botón devolver.
- `rebote-art.js` muestra cada robot con su color.
- Requiere deploy Vercel READY y comprobación de la URL de preview antes de cualquier alias de producción.
- Validación física ARCore en Chrome Android pendiente.
