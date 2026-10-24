# Supabase de Modo Caos — conexión compartida y aislada

**Estado verificado 24/10/2026:** Modo Caos usa el proyecto Supabase existente **Viralio**, ID `bwsgxpttnrctklrcjmjs`, región `sa-east-1`. No se creó ni se contrató un proyecto nuevo. **Te Hice Esto sigue separado y activo.**

## Aislamiento

- Esquema PRIVADO: `modo_caos` (no expuesto en la Data API de Supabase).
- Tablas: `modo_caos.rooms`, `modo_caos.players`, `modo_caos.round_results`.
- RLS habilitado en las tres tablas; ningún `anon` ni `authenticated` tiene acceso SQL directo al esquema. Las funciones públicas limitadas acceden tras verificar `auth.uid()`.
- Las tablas de comercios, recompensas, sesiones y campañas de Viralio permanecen intactas.
- Utilizan los mismos recursos de cómputo, cuota gratuita, autenticación y conexión del proyecto Supabase; **aisladas lógicamente, no físicamente**.

## RPC disponibles

Todas en el esquema `public`, ejecutables únicamente con el rol `authenticated`. El usuario debe haber iniciado sesión con Supabase Auth.

| RPC | Uso |
| --- | --- |
| `mc_create_room(p_game_slug, p_display_name, p_max_players)` | Generar sala con código hex de 8 caracteres; admite 2–4 jugadores. Crea anfitrión en slot 1. |
| `mc_join_room(p_code, p_display_name)` | Entrar a sala por invitación, máximo cuatro integrantes. Devuelve ID y slot. |
| `mc_set_ready(p_room_id, p_ready)` | Marcar preparado a un miembro de la sala. |
| `mc_get_room(p_room_id)` | Consultar los datos y roster de la sala, solo si pertenecés. |
| `mc_start_room(p_room_id)` | Iniciar si sos anfitrión y todos están preparados; devuelve tiempo inicial futuro para sincronizar. |

Migración realmente aplicada: `modo_caos_shared_arcade_v1` (`20261024114736`), SQL en [archivo versionado](../supabase/migrations/20261024_arcade_initial.sql). **No ejecutarla por segunda vez en Viralio.**

## Cliente web

Archivo `mc-rooms-client.js` expone `window.ModoCaosRooms.createClient(supabaseClient)`. Recibe el objeto del SDK `@supabase/supabase-js`; no contiene contraseñas ni tokens. Necesita una sesión Supabase Auth con JWT válido. Ejemplo:

```js
const mc = window.ModoCaosRooms.createClient(supabase);
const created = await mc.createRoom('semaforo-traicionero', 'Jugador 1', 4);
const joined = await mc.joinRoom(created.room_code, 'Jugador 2'); // segundo dispositivo/sesión
const info = await mc.getRoom(created.room_id);
```

**Atención:** el ejemplo `joinRoom` necesita otra sesión, no la misma del anfitrión. No implica que ya esté conectado un juego.

## Realtime y ciclo de sala (v2 aplicado)

Migración aplicada: `modo_caos_realtime_lifecycle_v2` (2026-10-24), fuente [SQL v2](../supabase/migrations/20261024_realtime_lifecycle_v2.sql).

- `mc_resume_room(p_code)`: retomar tu sala con la **misma sesión** incluso si está jugando.
- `mc_leave_room(p_room_id)`: salir; el anfitrión no puede abandonar una partida activa sin finalizarla.
- `mc_finish_room(p_room_id)`: el anfitrión termina la partida.
- `mc_heartbeat(p_room_id)`: presencia persistida y timestamp servidor.
- `mc_get_room(p_room_id)`: entrega al miembro el roster con `userId`, `hostUserId`, `serverTime` y `startedAt`.
- Dos políticas `mc_only_members_*_v2` sobre `realtime.messages`, SELECT e INSERT para extensiones Broadcast/Presence. Sólo para canales privados con tema `mc-room:<uuid>`, comprobando membresía por JWT.
- El proyecto compartido puede permitir **canales públicos antiguos**; no se cambió esa configuración global para proteger Color Rush. Antes de afirmar aislamiento completo de canales hay que probar contra intento de suscripción pública con el mismo tema.

Frontend: `/salas.html`, `/mc-config.js`, `/mc-rooms-client.js`, `/mc-lobby.js`. La URL y la clave **publishable** del cliente son públicas por diseño, nunca se usa clave secret o service_role.

## Pendiente ANTES de prometer online 1–4

1. **ACCIÓN EN EL PANEL DE SUPABASE:** abrir https://supabase.com/dashboard/project/bwsgxpttnrctklrcjmjs/auth/providers y comprobar/activar **Anonymous Sign-Ins**. La conexión actual no ofrece una herramienta para modificar proveedores Auth. Luego entrar a https://modo-caos-eta.vercel.app/salas.html y crear una sala desde un dispositivo real. Afecta a TODO el proyecto, por eso auditar previamente las RLS de Viralio (los invitados anónimos tienen rol SQL `authenticated`). Recomendable proteger altas con CAPTCHA y límites de abuso.
2. [IMPLEMENTADO EN SQL] Políticas para Broadcast/Presence en temas `mc-room:<uuid>` y canales frontend `private:true`. Pendiente prueba real de suscripción autorizada/no autorizada y revisar el ajuste global de acceso público sin romper Color Rush.
3. [IMPLEMENTADA LA SALA] Pantalla crear/unirse/esperar, pulso y lista de participantes, inicio y retomar sesión con polling si Realtime falla. Pendiente conectar partidas AR y resultados de juegos.
4. Diseñar validación oficial de resultados en un servidor confiable; `round_results` no permite que el navegador escriba puntuaciones a voluntad.
5. Probar host + invitados en dos a cuatro teléfonos Android reales y revisar consumo de cuotas en la base compartida.
6. Documentar pruebas, aislamientos y errores antes de habilitar torneos.

### Verificaciones realizadas

- Tres tablas `modo_caos` existentes, vacías y con RLS activado.
- Esquema inaccesible para `anon` y `authenticated` a nivel SQL directo.
- Cinco funciones RPC sólo ejecutables por `authenticated`.
- `mc_create_room` sin sesión devuelve error y no crea registros.
- Contadores de tablas de Viralio conservados tras la migración.

No copiar claves `service_role` ni secretos al frontend o a GitHub.

## Auditoría de entrega 24/10/2026

- Proyecto compartido: 47 tablas públicas auditadas; todas tienen RLS habilitado. Otras funciones `SECURITY DEFINER` accesibles a usuarios autenticados fueron revisadas; utilizan controles `auth.uid()` y pertenencia/rol. Esto no equivale a una auditoría formal exhaustiva de otros productos.
- Tablas `modo_caos` siguen sin acceso SQL directo ni para `anon` ni para `authenticated`.
- Las políticas `realtime.messages` fueron verificadas para leer/escribir sólo `broadcast` y `presence` con tópico `mc-room:<uuid>` y membresía comprobada. El acceso Realtime público de los productos existentes no se modificó.
- Las funciones `mc_*` se han verificado en la BD; invocación de no-miembros sin `auth.uid()` denegada, sin escrituras. No se probó aún el flujo real con dos JWT de usuarios invitados.
- Interfaz `/salas.html` y cuatro juegos anteriores devuelven HTTP 200 en Vercel; GitHub despliega `main` con el código nuevo.
- La prueba **PULSO ENTRE CELULARES** ignora señales del propio dispositivo, para evitar falsos positivos.
- Las funciones `SECURITY DEFINER` visibles a usuarios autenticados disparan avisos del auditor de Supabase; su uso es intencional porque permiten operaciones controladas sobre un esquema privado. Revalidar los controles de membresía siempre que se amplíen las RPC.
- **Bloqueos antes de declarar multiplayer completo:** Anonymous Sign-Ins si está deshabilitado; prueba de acceso privado con invitado autorizado y no autorizado; verificación con 2 Android; sincronización de juego y puntuaciones servidor; migración futura de canales públicos antiguos si se quiere desactivar globalmente el acceso público Realtime.

## Riesgo descubierto en Auth compartido (antes de abrir a público)

El proyecto `bwsgxpttnrctklrcjmjs` tiene un trigger existente llamado `on_maurilio_auth_user_created` sobre `auth.users`. Cada alta de Auth, incluyendo `signInAnonymously()`, ejecuta `public.maurilio_handle_new_auth_user()`, que crea un registro en `public.maurilio_accounts`.

**Esto se verificó sin persistir usuarios de prueba (transacción con ROLLBACK).** Implicación: si Modo Caos crece, los usuarios invitados también podrían crear registros de otro producto dentro de la infraestructura compartida. NO se alteró el trigger ajeno ni se escribieron datos ajenos de forma permanente. Debe planificarse una exención para invitados identificados como Modo Caos, preservando totalmente el comportamiento de otros productos, o separar la identidad de los jugadores antes del lanzamiento público.

Desde esta versión, las altas anónimas de Modo Caos agregan metadatos orientativos `app=modo_caos`, **no aptos para autorización** por ser controlados desde el navegador. Sirven únicamente para identificar registros y facilitar una futura exención consensuada del trigger existente.

## Prueba de lógica transaccional con tres usuarios

Probamos en PostgreSQL con `SET LOCAL ROLE authenticated`, JWT `request.jwt.claim.sub` diferentes y tres cuentas de prueba temporales. Pasaron crear sala, anfitrión, ingreso segundo usuario, bloqueo de inicio con alguien no listo, rechazo de tercero ajeno a sala, autorizaciones Realtime por pertenencia, marcado Listo, inicio futuro, consulta de estado, retomar sesión, heartbeat, finalizar, salir y revocación de membresía. El test utilizó `BEGIN ... ROLLBACK`: no quedaron cuentas, salas ni registros de los triggers. **No sustituye comprobar Auth real y Realtime por WebSocket entre dos teléfonos.**
