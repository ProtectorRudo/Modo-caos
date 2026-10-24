# Arquitectura técnica compartida — Modo Caos

## Identidad y objetivos

Arcade social de 1–4 jugadores, videojuegos de 30–90 segundos, inicio intuitivo, estética premium y alta rejugabilidad. Cada juego debe ser fácil de entender en menos de cinco segundos, con tensión, momentos graciosos, sorpresas, rankings, revancha y opciones de compartir.

## Estado del repositorio

Ya contiene la copia completa de los 23 archivos HTML y JavaScript del despliegue público del 24/10/2026. Todos se cotejaron por SHA1 con los hashes de Vercel. Los cambios futuros deben versionarse aquí, probarse en preview y no alterar el dominio antiguo sin validación.

## Stack

- Frontend: HTML/CSS/JavaScript modular. Compartir utilidades de cámara, calibración y menús. WebGL/Three.js cuando aporte calidad real y mantenga FPS.
- AR: Chrome Android, ARCore, WebXR `immersive-ar`, Hit Test. Fijar tablero en el plano físico y mantener todos los objetos en coordenadas del tablero. La cámara rota y se desplaza; la pista no acompaña la pantalla.
- Arquitectura del juego: `core` independiente del render y del dispositivo; `art` representaciones 3D/2D; `runtime` interacción, WebXR, HUD, temporizadores y estado. Errores visuales nunca deben parar el core.
- Assets: GLB comprimidos, texturas optimizadas, partículas controladas, PBR cuando el teléfono lo soporte, efectos de sonido y vibración opcionales.
- Fallback: demo 2D comprobable desde PC y Android sin WebXR.
- Multijugador: Supabase Realtime (Broadcast y Presence) con autenticación anónima, invitación por código, validación de pertenencia a sala, sincronización del reloj y puntuaciones, reconexión, anfitrión autorizado. Una posición espacial común entre dispositivos requiere un mecanismo adicional de alineación de espacios.

## Ruta única de calibración

1. Abrir cámara y detectar superficie horizontal despejada.
2. Fijar pista con una sola acción.
3. Mostrar avatar VOS y centrarlo respecto de la referencia del teléfono.
4. Medir automáticamente la posición del teléfono ≈1 s, mientras se sostiene quieto.
5. Mostrar «LISTO» y habilitar comienzo.
6. Iniciar **sin reemplazar ni borrar la referencia**.
7. Durante la partida: RECENTRAR disponible, pausa durante pérdida de tracking y opción de flechas/joystick.
8. Suavizado por tiempo, zona muerta pequeña y protección de saltos de ARCore. Medir desplazamientos en metros reales, sin multiplicaciones exageradas.

> El teléfono no detecta automáticamente pies ni articulaciones. No pedir que el jugador corra, salte ni atraviese obstáculos mientras mira la pantalla.

## Estándar de interacción

- Pantalla inicial con una llamada a la acción.
- Tutorial integrado a las primeras rondas, no texto extenso.
- Aumento de dificultad legible y justo.
- Modos Solo y Torneo para 2–4 jugadores.
- Código corto y botón directo de WhatsApp para invitar.
- Reconexión y reanudar partida si se desconecta temporalmente.
- Revancha en un toque, récord personal y clasificación con ganador visible.

## Criterios mínimos de aceptación

1. **Inicio:** escena se fija, avatar aparece, calibración termina, botón iniciar funciona, reloj avanza.
2. **Movimiento:** derecha/izquierda físicas producen movimiento suave; el avatar no se pierde sin una flecha de ubicación.
3. **Core:** reglas, colisiones, puntuación, vidas, pausas y reinicio pasan simulaciones determinísticas.
4. **Render:** objetos se mantienen anclados en su lugar real, sin saltos ni overlays que tapen el juego.
5. **Multijugador:** dos móviles reales comparten sala, inicio, eventos y resultados. Distinguir sincronización de estado y alineación de mundos AR.
6. **Regresión:** Color Rush, Ball Rush, Territorio X y Muro Rush siguen funcionando.
7. **Publicación:** comprobar READY, que la URL del despliegue sirve los archivos y que el alias público apunta al despliegue deseado.

## Vercel y GitHub

- Producción actual: `color-rush-ar-demo.vercel.app`, Vercel project `prj_uZe3OiOzgj2iCkr39YvweIyDOuWl`.
- Repositorio central: `ProtectorRudo/Modo-caos` (rama principal `main`).
- **Nunca apuntar el dominio actual a un proyecto sin el código y las pruebas completas.**
- Recomendación: un proyecto Vercel Git conectado a `Modo-caos` para previsualizaciones. Migrar dominio y publicación automática solo con una revisión final.

## Supabase

- NO reutilizar las tablas de clientes y comercios de Viralio; el esquema separado `modo_caos` tiene salas, participantes y resultados.
- Proyecto compartido con Viralio, ID `bwsgxpttnrctklrcjmjs`, región `sa-east-1` (no crear otro proyecto). Aislamiento de tablas con schema privado `modo_caos` y funciones `public.mc_*` accesibles solo con JWT Auth.
- Migración aplicada y sincronizada en `supabase/migrations/20261024_arcade_initial.sql`; ver [Supabase Modo Caos](SUPABASE_MODO_CAOS.md).
- Cliente público: solo clave publicable; nunca `service_role`. Acceso a las RPC con un usuario `auth.uid()` real; habilitar inicio anónimo únicamente tras auditar las políticas de TODOS los productos que comparten este Supabase.
- Habilitar RLS en todas las tablas públicas, evitar puntuación client-side privilegiada y no compartir salas privadas entre terceros.

## Documentación viva

Actualizar este documento cuando cambien motor AR, paths, base, repo o despliegues. Guardar decisiones técnicas, pruebas reales por dispositivo y fuentes de assets/licencias.

## Importación y vinculación verificada

- Copia exacta del deployment `dpl_EZksuDm5Y3gtUoafnDZ2GyjXWc7n`, 23 archivos HTML/JS.
- Código versionado en `ProtectorRudo/Modo-caos`, rama `main`.
- Vercel Git project `modo-caos`, ID `prj_3irMVa8fdbifSh1mvWA67NcDGn1n`.
- Producción original **separada**: `color-rush-ar-demo.vercel.app`.
- **Confirmado**: Modo Caos y Color Rush comparten el MISMO proyecto Supabase `viralio`, pero Modo Caos tiene esquema `modo_caos` privado y funciones RPC con prefijo `mc_`. El duelo existente sigue usando canales Realtime públicos heredados; nuevas salas requieren integración client-side y políticas Realtime privadas.

## Salas online — infraestructura v2

- `/salas.html` contiene pantalla de crear/unirse con enlace WhatsApp, jugadores, marcar listo, inicio sincronizado y pulso de conectividad.
- `/mc-config.js`: URL y publishable key de Supabase (dato público, no secreto); `/mc-rooms-client.js`: RPC autenticadas y canales Realtime `private:true` con tema `mc-room:<uuid>`.
- Esquema aislado `modo_caos` dentro del proyecto Supabase compartido Viralio; migration v2 agrega `mc_resume_room`, `mc_leave_room`, `mc_finish_room`, `mc_heartbeat` y políticas en `realtime.messages` restringidas por pertenencia.
- No se cambian Auth ni Realtime globales, para no afectar otros sistemas. Anonymous Sign-Ins puede requerir activación manual; esta habilitación afecta todo el Supabase compartido.
- **No declarar multijugador AR funcional** hasta vincular estados/colisiones/resultados a cada core y realizar prueba física con dos teléfonos.

## Nuevo minijuego: Semáforo Traicionero (2026-10-24)

- Archivos `/semaforo.html`, `/semaforo-core.js`, `/semaforo-art.js`, `/semaforo-runtime.js`, integrados en `/index.html`; contenido original de los cuatro juegos y `/engine.js` sin alterar.
- Núcleo semillado y determinista: cuatro competidores, señales con reacción justa, engaños, combos, colisiones suaves, récord, resultados y revancha. Demo Canvas 2D y overlay AR proyectado sobre world matrix ya anclada.
- No caminar para cruzar la pista virtual. Avance con botones o empujes cortos del teléfono; rojo filtra desplazamientos de ARCore y tolera 8,5 cm tras una gracia de ~0,74 segundos.
- Recentrar pausa juego sin reiniciar mundo; la cámara se limita a seguimiento de teléfono.
- `/salas.html` ofrece Semáforo para 2–4 participantes, entrada al juego desde el lobby y avisos de beta. RPCs, RLS y datos de otros productos sin modificaciones. La sincronización cliente a cliente carece aún de puntuación validada por servidor y pruebas físicas.
- Ver los pasos, límites y tests en [SEMAFORO_TRAICIONERO.md](SEMAFORO_TRAICIONERO.md); ejecutar `node tests/semaforo.test.cjs`.

## Nuevo minijuego: Lluvia de Meteoros (2026-10-24)

- Archivos `/meteoros.html`, `/meteoros-core.js`, `/meteoros-art.js`, `/meteoros-runtime.js`, integrados en menú y lobby de salas. 72 segundos, tres vidas, tres bots (cuatro perfiles rotativos), combos, fragmentos, escudos, falsas alarmas, cráteres y tormenta final.
- Reutiliza Hit Test, ancla y matriz del mundo `engine.js`. Se agregó un único punto de extensión opcional `window.modoCaosXRFrame(time,frame,W)`, invocado **después de limpiar y dibujar la base XR**, para evitar que el render del juego sea borrado; no cambia el flujo de juegos existentes si no hay callback.
- La arena se fija una vez respecto del plano al pulsar FIJAR. La calibración de ~1 s y RECENTRAR nunca cambian la traslación de esa arena. Avatar controlado con la posición 2D del teléfono en referencia local, tolerancia y protección de saltos de tracking. No representa pies ni tracking corporal.
- Hit-test simulado con Chromium y WebGL (no Android real) pasa el flujo fijar → calibrar → iniciar y renderiza fotogramas. Canvas 2D validado en Chromium. Las simulaciones verifican que quedarse quieto no gana y que desplazarse a ~0,23 m/s puede sobrevivir.
- Salas online de Meteoros son **beta**: semilla/cronómetro compartidos, pero posiciones/resultados proceden del cliente y no hay validación antifraude; falta prueba física con dos teléfonos y reconexiones. `modo_caos` y tablas de Viralio sin cambios.
- Guía completa y límites: [LLUVIA_METEOROS.md](LLUVIA_METEOROS.md). Mantener PR #3 aislada de `main` hasta verificaciones finales.
