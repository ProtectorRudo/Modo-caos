# RODEADOS 360 V18 — siete misiones AR con objetivos propios

**Estado:** rama `feat/rodeados-seven-missions-v18` (basada en V17), aislada de `main` y del proyecto Vercel original `color-rush-ar-demo`. QA automatizada (Node, Chromium WebGL y XR sintético) superada en run 40496245206 para el commit `23f8a8f`; **no** es una prueba física con Android/ARCore. No publicar a producción sin prueba en dispositivo y revisión visual.

## Cómo jugar

1. Abrir `/rodeados.html?v=18`; elegir una misión en el selector. Las cinco modalidades antiguas permanecen disponibles.
2. Para Captura la Bandera, antes de abrir AR: mover en el minimapa **MI BASE**, **BANDERA**, elegir **6 PUNTOS** o **7 PUNTOS**, tocar **ENEMIGOS** y reubicar los accesos numerados. Se guarda la disposición relativa en el navegador. La configuración por defecto funciona sin editar.
3. Pulsar **ENTRAR EN REALIDAD AUMENTADA** → detectar piso → colocar/anclar mundo → calibrar posición del teléfono → **DEFENDERME**. El escenario/objetivos usan `art.root` del mundo, no la cámara. Solo arma/FPS sigue la cámara.
4. Si no hay ARCore, usar **ENTRENAMIENTO 3D SIN CÁMARA**: arrastrar para apuntar, botones para disparar, W/A/S/D o flechas táctiles para desplazarse en Botín, Refugio y Bandera. La demo es control virtual, no seguimiento físico.
5. Completar la misión, ver puntos/capturas, revancha.

## Reglas de los siete modos

| Modo | Límite | Mecánica y condición de éxito |
|---|---:|---|
| Invasión en Casa (`invasion`) | 75s | Enemigos desde seis portales y brechas adicionales cada 25s. Resistir vivo. |
| Botín Maldito (`loot`) | 90s | Cinco cofres metálicos con cerraduras disparables; cada uno solo puede abrirse una vez. Volver a base y pulsar **EXTRAER** antes de tiempo. Se puede asegurar parte del botín. |
| Tiempo Roto (`timewarp`) | 60s | EMP activa una ventana de ralentización 3s además del aturdimiento base. Reloj del juego no se ralentiza. Sobrevivir. |
| El Último Refugio (`refuge`) | 75s | Enemigos atacan el reactor y bajan su integridad; activar tres estaciones cercanas con **ACTIVAR** y resistir con reactor intacto. |
| Caos Mutante (`mutant`) | 90s | Cambios cada 15s: frenesí, blindados, puntos dobles, curación y tormenta con rivales extra. Resistir. |
| Colosos 360 (`colossus`) | 90s | Tres jefes sucesivos de resistencia ascendente y tres fases por umbrales de vida. Derrotarlos antes del tiempo. |
| Captura la Bandera (`ctf`) | 150s | Ir a bandera enemiga con el teléfono, recoger automáticamente a menos de 43cm o botón, volver a base (46cm) y puntuar; repetir tantas veces como se pueda. Guardianes rodean el objetivo, interceptores cubren retorno, cazadores persiguen. Al recibir daño fuerte llevando bandera, cae durante 8s con gracia de 1,6s para no recogerla al instante. Cada entrega agrega 650 + 100 por número de captura. Mínimo una captura al llegar al tiempo para completar misión. |

### Espacio, alcance y calibración

- Las posiciones se guardan en **metros relativos al plano**: no se está mapeando la casa ni sus paredes. El plano editorial del mapa es 2D y no lee muebles.
- Se validan seis/siete spawns; al iniciar la simulación, la posición de aparición se aleja del teléfono para preservar al menos 2,45m de distancia si el punto elegido quedaba demasiado cerca. Por eso es una zona de aparición preferente, no una garantía absoluta de ubicación exacta.
- El tracking móvil mide **el teléfono**, no pies, avatar real, cuerpo ni mando. Evitar correr, saltar o atravesar objetos físicos con la cámara en alto.
- La configuración de bandera persiste en `localStorage`, pero **el ancla XR no** sobrevive automáticamente a cerrar/reabrir sesión. Volver a fijar y calibrar piso en cada sesión.
- El botón **RECENTRAR** sigue el mecanismo existente; no reconstruir `art.root` durante el combate.
- Escenario de AR y modo demo comparten reglas; el multijugador en sala no propaga todavía las misiones V18, ni existe alineación espacial compartida verificada. **V18 debe considerarse SOLO local**; no prometer CTF online.

## Archivos

- `rodeados-missions.js`: decorador de `RodeadosCore`, reglas, resultados y puntuación. Sin Three.js ni navegador, testeable en Node.
- `rodeados-mission-art.js`: portales, bandera, base, cofres, núcleo, tres estaciones y señales 3D. Todo bajo `art.root`, no frente a la cámara.
- `rodeados-flag-planner.js`: editor táctico 2D y almacenamiento del plano. No sube la información personal del hogar a servidor.
- `rodeados-runtime.js`: HUD, interacciones, tutorial de comienzo, demo con teclas/flechas.
- `rodeados.html`: selector agrupado (7 nuevos + 5 previos), editor y HUD.
- `tests/rodeados-v18-missions.test.cjs`: regresión de reglas/siete misiones; `tests/rodeados-v18-browser.test.cjs`: interacción del selector, editor y demo en Chromium.
- `.github/workflows/rodeados-v18-qa.yml`: pruebas de reglas V17/V18, render en Chromium y WebXR simulado.

## Limitaciones y tareas antes de publicar

1. **ARCore real**: medir anclaje, celdas, desplazamiento y entrega de bandera con un Android compatible. El test XR sintético no simula pérdidas reales de tracking.
2. **Calidad visual en móvil**: verificar FPS, modelos Gobkit CC0 y animaciones, iluminación, posición/cobertura 3D del objetivo. Portales, cajas, reactor y banderas son geometría procedural original (no una colección de assets AAA externos).
3. **Balance**: observar jugadores reales en todos los niveles, distancia efectiva al reactor/cofres, dificultad de los tres jefes y calidad de la experiencia. Son modos implementados y testeados por software, no certificación de un juego premium terminado.
4. **Online**: replicar `mission`, eventos, config de flag y scores con estado autoritativo antes de habilitar sala 2–4; no tocar Supabase compartido ni políticas de Viralio para este lanzamiento.
5. **Lanzamiento**: mantener PR separado, desplegar solo preview Vercel y confirmar acceso público/READY. No fusionar con `main` ni alterar `color-rush-ar-demo` sin aceptación y pruebas en dispositivos.
