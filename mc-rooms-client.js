'use strict';
/*
 * Modo Caos room adapter v1.
 * Supabase project: viralio (shared), project ref bwsgxpttnrctklrcjmjs.
 * Private schema 'modo_caos' exposed ONLY through authenticated public mc_* RPCs.
 * This adapter does not create an Auth session or enable anonymous logins.
 * Realtime private policies and score validation are not yet implemented.
 */
(function (root) {
  function assertString(x, label, max) {
    if (typeof x !== 'string' || !x.trim() || x.length > max) {
      throw new Error(label + ': texto inválido');
    }
    return x.trim();
  }
  function createClient(supabase) {
    if (!supabase || typeof supabase.rpc !== 'function' || !supabase.auth) {
      throw new Error('Modo Caos: se requiere el cliente oficial de Supabase');
    }
    async function ensureAuth() {
      const response = await supabase.auth.getSession();
      if (response.error) throw response.error;
      if (!response.data?.session?.user?.id) {
        throw new Error('Para crear o entrar a salas necesitás una sesión Supabase Auth. Habilitar acceso anónimo solo tras revisar las políticas del proyecto compartido.');
      }
      return response.data.session;
    }
    async function call(name, parameters) {
      await ensureAuth();
      const response = await supabase.rpc('mc_' + name, parameters);
      if (response.error) throw response.error;
      return response.data;
    }
    return Object.freeze({
      async createRoom(game, playerName = 'Anfitrión', maxPlayers = 4) {
        assertString(game, 'Juego', 64);
        if (!/^[a-z][a-z0-9-]{1,63}$/.test(game)) throw new Error('Identificador de juego no válido');
        const name = assertString(playerName, 'Jugador', 24);
        if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) throw new Error('La sala debe admitir 2 a 4 jugadores');
        const result = await call('create_room', {
          p_game_slug: game,
          p_display_name: name,
          p_max_players: maxPlayers
        });
        return result?.[0] || null;
      },
      async joinRoom(code, playerName = 'Jugador') {
        if (!/^[0-9A-F]{8}$/.test(assertString(code, 'Código', 8).toUpperCase())) {
          throw new Error('Código de sala no válido');
        }
        const result = await call('join_room', {
          p_code: code.trim().toUpperCase(),
          p_display_name: assertString(playerName, 'Jugador', 24)
        });
        return result?.[0] || null;
      },
      async setReady(roomId, ready = true) {
        return call('set_ready', {p_room_id: assertString(roomId, 'Sala', 36), p_ready: !!ready});
      },
      async getRoom(roomId) {
        return call('get_room', {p_room_id: assertString(roomId, 'Sala', 36)});
      },
      async startRoom(roomId) {
        return call('start_room', {p_room_id: assertString(roomId, 'Sala', 36)});
      }
    });
  }
  root.ModoCaosRooms = Object.freeze({createClient});
})(typeof window !== 'undefined' ? window : globalThis);
