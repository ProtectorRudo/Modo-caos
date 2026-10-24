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

## Pendiente ANTES de prometer online 1–4

1. Verificar y eventualmente habilitar `signInAnonymously()` en Supabase Auth. Afecta a TODO el proyecto, por eso auditar previamente las RLS de Viralio (los invitados anónimos tienen rol SQL `authenticated`). Recomendable proteger altas con CAPTCHA y límites de abuso.
2. Configurar canales Realtime PRIVADOS con reglas de membresía basadas en UUID de sala. Los canales antiguos de Color Rush no hacen eso; no declarar el nuevo sistema seguro en Realtime hasta probarlo.
3. Conectar interfaz de crear/unirse/esperar/jugar, reconexión, sincronización del reloj y mensajes.
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
