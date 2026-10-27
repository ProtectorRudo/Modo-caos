# RODEADOS 360 · V29 — Botín AR elegible y rifle FPS

## Pedido y diagnóstico (27/10/2026)

Capturas físicas del modo Botín revelaron un rifle de apariencia desproporcionada/torcida, cinco cajas predefinidas sobre el tablero cercano y robots que aparecían demasiado próximos al usuario. La mecánica no producía la tensión ni el recorrido de Captura la Bandera.

## Botín Maldito renovado (versión de prueba)

1. Fijar la arena de AR y elegir **TU BASE** con la mira, usando el mismo sistema de planificación espacial de Captura la Bandera.
2. Marcar **cinco cofres** elegidos libremente mirando el piso y tocando MARCAR. Cada cofre debe estar a más de 2,35 m de la base, a más de 0,85 m del anterior, dentro del alcance de marcación ±8 m. DESHACER funciona antes de confirmar. No se generan cajas al lado de VOS.
3. Confirmar. Tras calibrar el teléfono durante ≈1 segundo, aparecen cajas y marcadores **anclados al mundo real** y siete puntos de guardia distribuidos alrededor de los cofres, no en la zona inicial del jugador (separación base/guardias ≥3,1 m por construcción antes de redondear/clamping).
4. Jugar durante 120 s. Abrir un cofre estando a menos de 0,82 m con el botón ABRIR. Cada cofre se abre una sola vez. Regresar a la base y EXTRAER a menos de 0,80 m; extraer 1–5 cofres está permitido y entrega una recompensa según el riesgo.
5. El seguimiento del teléfono puede desplazarse más allá del tablero cosmético de 2,6 m como en Captura la Bandera (hasta 40 m como límite de seguridad de datos, sin fingir tracking corporal). Los modelos AR y el cálculo de colisiones siguen en coordenadas fijas ancladas.
6. La revancha mantiene los cinco puntos confirmados, reinicia los cofres y la misión.

### Rifle

Se conserva el asset PBR con licencia CC0. El pase FPS separado del mundo AR lo sitúa más abajo/a la derecha, reduce su silueta y gira la culata/boca para que la retícula central permanezca despejada. No se modifica la dirección real del rayo de disparo XR. El encuadre se evalúa con el volumen 3D proyectado de la malla real.

## Pruebas y limitaciones

- Test determinista: rechazo de planes incompletos/cercanos, siete puntos de guardia remotos, posiciones confirmadas, apertura sólo por proximidad, extracción en base y reinicio.
- Chromium/WebXR simulado: pruebas de planificación táctica para cinco cofres, nuevo HUD y métricas del encuadre del rifle.
- La rama `fix/rodeados-v29-loot-placement-rifle-20261027` se basa en `feat/rodeados-v28-hostage-ten-levels-timewarp` y NO modifica `main` ni el sitio Arcade original.
- **Prueba física indispensable:** Chrome Android ARCore, profundidad/posición de rifle en la pantalla vertical real, persecución hacia los cofres, navegación segura entre muebles y cobertura de red.
- **Límite de despliegue:** el 27/10/2026 Vercel rechazó un despliegue nuevo del último commit por cuota `api-deployments-free-per-day` (402). Un despliegue anterior de la rama NO refleja todos los cambios y no debe presentarse como v29 terminada.
- No se modificaron Supabase, tablas compartidas ni reglas de multijugador. No declarar online certificado.
