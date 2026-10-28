# Frutástrofe AR — Duelo online 1v1 (2026-10-28)

## Qué está implementado
El modo individual permanece intacto. El menú de Frutástrofe incluye ahora **Duelo online**, con apodo, crear sala de 2, unirse por código, copiar enlace y compartir por WhatsApp.

Flujo de cada teléfono Android:
1. Abrir Frutástrofe. Uno crea una sala; envía enlace `frutastrofe.html?duel=XXXXXXXX`.
2. El otro abre el enlace y entra con apodo. El servidor valida pertenencia a la sala.
3. Ambos abren la cámara WebXR, detectan el piso y fijan una arena independiente en sus propios espacios físicos.
4. Tras fijar la arena, cada uno marca **LISTO**. Sólo el anfitrión puede iniciar, y el backend exige 2 integrantes listos.
5. El backend fija un inicio futuro de 7 segundos, un número de ronda y una semilla de 32 bits. Ambas instancias del núcleo generan **las mismas oleadas** con actualización en pasos fijos de 50 ms. Los tiros y combos de uno no alteran la RNG de lanzamiento del otro.
6. Dura exactamente 60 segundos del reloj del servidor; cada teléfono muestra la puntuación del rival recibida por canal privado Supabase Broadcast. Hay snapshots autenticados en PostgreSQL para recuperación durante cortes de Realtime.
7. Al vencer el reloj, cada participante informa su resultado. El servidor cierra la sala cuando terminan ambos; también se puede cerrar una partida abandonada tras 75 segundos.
8. El anfitrión puede habilitar la revancha; ambos vuelven a marcar LISTO y se sortea otra semilla sin borrar resultados anteriores.

## Archivos y arquitectura
- `frutastrofe-online.js`: cliente Supabase, sala, enlace, presencia, estado, marcador, reloj y revancha.
- `frutastrofe-runtime.js`: adaptación WebXR y motor de juego; usa el estado online únicamente cuando corresponde.
- `frutastrofe-core.js`: `syncWave` separa la secuencia de frutas de las acciones locales. Offline mantiene su funcionamiento.
- `frutastrofe.html`: interfaz online y score rival sin invadir el HUD.
- `mc-config.js`, `mc-rooms-client.js`: utilidades existentes de autenticación y Realtime privadas, compartidas con otros juegos sin modificarlas.
- `supabase/migrations/20261028_frutastrofe_duel_v1.sql`: aplicada al proyecto `bwsgxpttnrctklrcjmjs`, añade exclusivamente tablas `modo_caos.fruta_matches`, `modo_caos.fruta_scores` y RPC `public.mc_fruta_*` protegidas.

## Seguridad y límites conocidos
- Sólo usuarios autenticados y miembros pueden leer el estado; sólo el anfitrión puede iniciar y preparar la revancha. Los terceros no tienen acceso directo a las tablas, que permanecen en schema privado con RLS y sin grants.
- El código contiene *score bounding*, contadores de tiros y comprobación de intervalos. **No es anti-cheat autoritativo**: la puntuación se calcula en el navegador, por lo que este modo es una competición **casual beta** y no habilita premios reales ni ranking de dinero.
- Los canales Realtime usan `private:true` y políticas de membresía ya existentes. Las políticas son válidas sólo si el proveedor y configuración de Realtime permiten autenticar a los dos dispositivos.
- Cada teléfono tiene un mundo WebXR **independiente**. Los dos jugadores ven el mismo calendario de frutas y reloj pero NO los mismos objetos físicos alineados ni el avatar del otro; eso requiere anclaje espacial compartido y más tecnología.
- El proyecto Supabase es **compartido** con Viralio y otros productos. Se añadieron sólo objetos del namespace `modo_caos`. El trigger global preexistente en `auth.users` puede crear un registro lateral de otro producto cuando alguien inicia sesión anónima. No se ha modificado ese trigger sin autorización. Antes de exponer a gran escala, auditar esa repercusión y los límites de Auth.
- Anonymous Sign-Ins debe estar habilitado en el proyecto (revisar proveedor); si falla, el juego muestra el error real, no jugadores falsos.
- No se ha probado aún una partida completa con 2 Android físicos distintos, ambos usando WebXR y una conexión real; la finalización está condicionada a esa prueba. No se debe anunciar producción online totalmente verificada sin esos datos.

## Verificaciones realizadas
- Migración aplicada satisfactoriamente en Supabase; roles `anon` tienen EXECUTE denegado en las cinco RPC y `authenticated` puede invocarlas. Tablas privadas con RLS y sin acceso directo.
- Test SQL con transacción y rollback de dos usuarios: crear, unirse, negar inicio al invitado, ambos listos, iniciar ronda, semilla/estado iguales, dos puntuaciones finales, cierre y revancha. No persistieron jugadores ni salas de prueba.
- `tests/frutastrofe-online.test.cjs`: dos motores con la misma semilla pero disparos diferentes mantienen exactamente las mismas oleadas 60s.
- `tests/frutastrofe-browser.cjs`: verifica modo online visible, formulario, retorno al modo individual y juego AR simulado.
- GitHub Actions corre QA y prueba enlace público del commit inmutable; Vercel gratuito puede estar limitado por cuota diaria, utilizar CDN verificado mientras tanto.
