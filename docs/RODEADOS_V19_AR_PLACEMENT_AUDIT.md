# RODEADOS 360 V19 — auditoría de siete modos y colocación táctica real

## Estado y ubicación

- Rama: `feat/rodeados-v19-real-tactical-ar-audit`; PR **#96** contra la rama experimental V18, no fusionado con `main`.
- Esta implementación **no altera** el proyecto Vercel original `color-rush-ar-demo`, las tablas de Viralio ni Supabase.
- Vista de prueba: `/rodeados.html?v=19` en la preview del branch V19. La preview de Vercel puede estar protegida por autenticación; compartir mediante enlace temporal cuando esté READY.
- Pruebas: core Node determinista, navegador real Chromium, WebGL y **WebXR sintético** con posiciones y cuaterniones simulados. Esto **NO prueba** ARCore real ni tracking de muebles, ni la calidad visual en un teléfono físico.

## Qué estaba mal en Captura la Bandera V18

1. El mapa de base, bandera y spawns se dibujaba sobre `home` como un SVG **antes de abrir AR**, mientras que tras fijar el piso el usuario debía escoger una celda como en supervivencia. La selección no representaba la colocación AR real.
2. Había una formación de puntos por defecto que era usada aunque el usuario no confirmara posiciones reales.
3. El núcleo trasladaba posiciones de spawn a un anillo virtual si estaban demasiado cerca del origen. El marcador visible podía no coincidir con el lugar real de generación.
4. Al acercarse a la bandera o base se recogía/entregaba automáticamente, lo cual generaba mensajes de «bandera robada» inesperados.
5. El modelo `tactical-heavy.glb` mostraba un accesorio superior desprendido/pose poco agresiva en capturas de AR.

## Solución V19

### Flujo obligatorio en WebXR

1. Entrar a AR, detectar piso y ajustar/fijar tablero mediante el editor existente.
2. Para `ctf` aparece la nueva **fase táctica**, sin pantalla de selección de celda:
   - Apuntar el retículo al piso anclado → **MARCAR MI BASE**.
   - Apuntar a otra ubicación separada al menos 1 m → **MARCAR BANDERA**.
   - Elegir **6 o 7 entradas enemigas**. Para **cada** ubicación, elegir modelo de enemigo: SOLDADO, PERSEGUIDOR, ARAÑA, CRIATURA, PESADO o ALEATORIO. Apuntar, tocar **MARCAR ENTRADA N** y ver el marcador 3D.
   - **DESHACER** elimina el último punto y permite corregirlo.
   - **CONFIRMAR MAPA** solo se habilita cuando están colocados todos. No existe autoconfirmación.
3. Calibrar automáticamente el teléfono inmóvil ~1 segundo, asociando la posición lógica de jugador a **la base realmente elegida**, no a una celda predeterminada.
4. Inicio de ronda. La base, bandera y los seis/siete puntos se representan en coordenadas `art.root`, con anclaje al piso, mientras la cámara se mueve.
5. Recoger y entregar bandera requiere **proximidad + pulsar botón**. La puntuación solo aumenta al completar la entrega. El HUD muestra metros aproximados y la dirección de base/bandera; no confunde una oleada con una captura.
6. En la **demo 3D sin cámara** se usa el mismo editor de campos y apuntado por cámara virtual.

### Reglas de seguridad

- El teléfono no detecta pies ni obstáculos reales. No correr, no atravesar muebles, evitar colocar objetivos en zonas físicamente inaccesibles.
- Base/bandera deben quedar dentro del tablero y separadas al menos 1m. Cada spawn debe quedar al menos a 2,65m de la base; spawns entre sí al menos 40cm. Si una posición no pasa el control, se muestra la razón y el usuario la elige nuevamente, sin sustituirla silenciosamente.
- Una vez empezada la partida los enemigos pueden **moverse** o mantener distancia defensiva del teléfono. Las ubicaciones elegidas son sus puntos de **entrada**, no una obligación de permanecer en una casilla.
- El ancla AR debe fijarse de nuevo cada sesión; el plano V19 solo persiste entre revancha dentro de esa misma sesión. Sin alineación AR entre teléfonos no se ofrece multijugador confiable.
- El render de WebXR no incluye oclusión certificada por muebles: algunos modelos podrían verse «delante» de una mesa real aunque su posición está anclada al mundo. Esto requiere pruebas físicas y, para oclusión real, una tecnología adicional compatible.

## Auditoría de las siete misiones

| Modo | Hallazgo | Cambio / prueba |
|---|---|---|
| Invasión en Casa | Spawns calculados desde `game.player` podían seguir al teléfono aunque los seis portales debían quedar fijos al mundo. | Ahora los seis puntos están en coordenadas del origen de la arena. Test verifica que caminar no desplaza un portal. |
| Botín Maldito | La extracción funciona solo cerca de la base, pero la superposición de cofres en la mira podía dificultar validar disparos. | Test usa rayos individuales y verifica que un cofre solo se abre una vez y que sobrevivir sin extraer no da victoria. Falta balance visual en teléfono. |
| Tiempo Roto | EMP tenía enfriamiento de 24 segundos, casi sin diferencia respecto de EMP convencional. | Reduce el enfriamiento a 13s en este modo; conserva ralentización durante tres segundos. Test del reloj y de cooldown. |
| El Último Refugio | El HUD no indicaba si el usuario estaba suficientemente cerca de las tres estaciones. | Estado de proximidad, control **ACTIVAR** habilitado solo a distancia válida y prueba de victoria cuando reactor y estaciones sobreviven. |
| Caos Mutante | Mutaciones aplicaban en core pero faltaba validar activación a intervalos. | Tests deterministas 15, 30s y tipos de mutación; sigue pendiente revisar impacto visual/FPS físico. |
| Colosos 360 | Tres fases de jefe modificaban casi exclusivamente mensajes HUD/vida. | Fases 2/3 aumentan agresividad, recarga de ataque y movimiento de presión; tests de transición, eliminación de tres jefes y derrota por tiempo. |
| Captura la Bandera | Mapa SVG ficticio, autospawns, autointeracción, selección de celda común, objetivo distinto de la posición del usuario. | Editor táctico XR, confirmación, coordenadas exactas, selección de tipo por punto, deshacer y pruebas completas de capturas manuales + WebXR sintético. |

## Enemigos

- Se **pone en cuarentena visual** el segundo humanoide táctico (el GLB pesado que presentó un accesorio suelto). El archivo licenciado sigue guardado para diagnóstico, pero ese actor no se representa en combate.
- En su lugar se utiliza el soldado táctico estable de V17 con rifle 3D de geometría ligera y efecto de fogonazo sincronizado al estado de ataque. No prometer que es una nueva animación Mocap de disparo ni un modelo descargado externo; el rifle es procedural.
- Se preservan araña, acechador CC0, jefe CC0, armas FPS y la posibilidad de ver otros enemigos.
- Limitar GLB externos simultáneos a 4 y revisar rendimiento real en Android.

## Pruebas

- `node --test tests/rodeados-v18-missions.test.cjs`: reglas de los siete, objetivos, CTF exacto, reinicios, derrota y victoria, compatibilidad clásica.
- `node tests/rodeados-v18-browser.test.cjs`: selección de modos, configuración de seis puntos por UI, tipo de enemigo, deshacer, confirmación y modo 3D.
- `node tests/rodeados-v19-xr-tactical.test.cjs`: **WebXR sintético**, piso fijo, retículo, base/flag ubicados con orientación del teléfono, etapa táctica obligatoria, sin selección de celda y deshacer. No sustituye una prueba ARCore física.
- `node tests/rodeados-xr-smoke.test.cjs`: regresión del anclaje y del disparo.
- `node tests/rodeados-auto-robots.test.cjs`: modelo estable y exclusión del pesado defectuoso.
- `node tests/rodeados-manul-preview.test.cjs`: compatibilidad del laboratorio anterior (los controles del nuevo modo son opcionales).

## Pendiente antes de promoción

1. Prueba física con Chrome Android + ARCore: precisión de cada marcador, distancia de recogida/entrega y world-lock con rotación/caminar sin perder la referencia.
2. Validación de la carga 3D, visual del rifle, FPS sostenidos y reflejos de materiales en el teléfono.
3. Balance con personas reales, especialmente distancias requeridas para configurar 6–7 entradas en habitaciones pequeñas, daño de jefes, cofres superpuestos y accesibilidad de estaciones.
4. Evaluación de oclusión/detección de muebles y UX para entornos reducidos.
5. Sincronización multijugador real y pruebas con dos móviles antes de prometer juego online.
6. No fusionar `main`, no cambiar producción ni migrar base de datos sin aprobar los controles anteriores.
