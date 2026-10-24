-- MODO CAOS · Esquema inicial del arcade (PENDIENTE DE APLICAR)
-- Proyecto destino: un NUEVO proyecto Supabase dedicado, no Viralio.
-- Las conexiones cliente deben usar Supabase Auth signInAnonymously()
-- para obtener auth.uid(). Los resultados oficiales se escriben SOLO desde backend seguro.
-- Migración preparada el 24-10-2026. Nunca guardar service_role en cliente.

create table if not exists public.arcade_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9A-F]{8}$'),
  game_slug text not null check (game_slug ~ '^[a-z][a-z0-9-]{1,63}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  max_players integer not null default 4 check (max_players between 1 and 4),
  status text not null default 'lobby'
    check (status in ('lobby','running','finished','expired')),
  round_number integer not null default 0 check (round_number >= 0),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.arcade_room_players (
  room_id uuid not null references public.arcade_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Jugador'
    check (length(display_name) between 1 and 24),
  slot integer not null check (slot between 1 and 4),
  ready boolean not null default false,
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, slot)
);

create table if not exists public.arcade_round_results (
  room_id uuid not null,
  user_id uuid not null,
  round_number integer not null check (round_number between 1 and 100),
  game_slug text not null check (game_slug ~ '^[a-z][a-z0-9-]{1,63}$'),
  points integer not null check (points >= 0),
  duration_ms integer check (duration_ms between 0 and 3600000),
  created_at timestamptz not null default now(),
  primary key (room_id, user_id, round_number),
  foreign key (room_id, user_id)
    references public.arcade_room_players(room_id, user_id) on delete cascade
);

create index if not exists arcade_rooms_created_idx
  on public.arcade_rooms (created_at desc);
create index if not exists arcade_room_players_user_idx
  on public.arcade_room_players (user_id);
create index if not exists arcade_round_results_room_idx
  on public.arcade_round_results (room_id, round_number);

-- Membership helper: SECURITY DEFINER prevents recursive RLS from blocking
-- roster reads, without exposing any other person's room membership.
create or replace function public.arcade_is_member(p_room_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.arcade_room_players p
    where p.room_id = p_room_id and p.user_id = auth.uid()
  );
$$;

-- Make the host the first room participant, atomically.
create or replace function public.arcade_register_host()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.arcade_room_players
    (room_id,user_id,display_name,slot)
  values (new.id,new.host_user_id,'Anfitrión',1);
  return new;
end;
$$;

drop trigger if exists arcade_register_host_trg on public.arcade_rooms;
create trigger arcade_register_host_trg
after insert on public.arcade_rooms
for each row execute function public.arcade_register_host();

-- Create rooms through an RPC; never let browsers directly choose host IDs.
create or replace function public.arcade_create_room(
  p_game_slug text,
  p_display_name text default 'Anfitrión',
  p_max_players integer default 4
)
returns table(room_id uuid, room_code text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_code text;
begin
  if v_user is null then raise exception 'Se requiere sesión autenticada'; end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z][a-z0-9-]{1,63}$'
    then raise exception 'Identificador de juego no válido'; end if;
  if p_max_players not between 1 and 4
    then raise exception 'La sala admite entre 1 y 4 jugadores'; end if;
  for attempt in 1..10 loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    begin
      insert into public.arcade_rooms(code,game_slug,host_user_id,max_players)
      values (v_code,p_game_slug,v_user,p_max_players)
      returning id into v_id;
      update public.arcade_room_players
      set display_name = left(coalesce(nullif(trim(p_display_name),''),'Anfitrión'),24)
      where public.arcade_room_players.room_id = v_id
        and public.arcade_room_players.user_id = v_user;
      room_id := v_id; room_code := v_code; return next; return;
    exception when unique_violation then
      -- Retry a random invite code collision; other violations propagate.
      null;
    end;
  end loop;
  raise exception 'No se pudo generar una sala única';
end;
$$;

-- Guest gets room ID by knowing the invitation code; serialize concurrent joins.
create or replace function public.arcade_join_room(
  p_code text,
  p_display_name text default 'Jugador'
)
returns table(room_id uuid, player_slot integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_room public.arcade_rooms%rowtype;
  v_slot integer;
begin
  if v_user is null then raise exception 'Se requiere sesión autenticada'; end if;
  select * into v_room from public.arcade_rooms
   where code = upper(trim(p_code)) and status = 'lobby' for update;
  if not found then raise exception 'Sala inexistente o ya iniciada'; end if;
  select slot into v_slot from public.arcade_room_players
   where public.arcade_room_players.room_id = v_room.id
     and user_id = v_user;
  if v_slot is null then
    select coalesce(max(slot),0)+1 into v_slot
     from public.arcade_room_players where public.arcade_room_players.room_id = v_room.id;
    if v_slot > v_room.max_players then raise exception 'Sala llena'; end if;
    insert into public.arcade_room_players(room_id,user_id,display_name,slot)
    values (v_room.id,v_user,
      left(coalesce(nullif(trim(p_display_name),''),'Jugador'),24),v_slot);
  end if;
  room_id := v_room.id; player_slot := v_slot; return next;
end;
$$;

alter table public.arcade_rooms enable row level security;
alter table public.arcade_room_players enable row level security;
alter table public.arcade_round_results enable row level security;

create policy "Miembros ven su sala" on public.arcade_rooms
 for select to authenticated
 using (host_user_id = auth.uid() or public.arcade_is_member(id));

create policy "Solo anfitrión controla la sala" on public.arcade_rooms
 for update to authenticated
 using (host_user_id = auth.uid())
 with check (host_user_id = auth.uid());

create policy "Miembros ven participantes" on public.arcade_room_players
 for select to authenticated
 using (public.arcade_is_member(room_id));

create policy "Jugador actualiza presencia" on public.arcade_room_players
 for update to authenticated
 using (user_id = auth.uid())
 with check (user_id = auth.uid());

create policy "Miembros ven resultados" on public.arcade_round_results
 for select to authenticated
 using (public.arcade_is_member(room_id));

-- Make table privileges explicit: public/anon cannot access session data;
-- the browser cannot write official scores. Backend must validate results.
revoke all on public.arcade_rooms from public, anon, authenticated;
revoke all on public.arcade_room_players from public, anon, authenticated;
revoke all on public.arcade_round_results from public, anon, authenticated;
grant select on public.arcade_rooms to authenticated;
grant update(status,round_number,started_at,ended_at,last_activity_at)
 on public.arcade_rooms to authenticated;
grant select on public.arcade_room_players to authenticated;
grant update(display_name,ready,last_seen_at)
 on public.arcade_room_players to authenticated;
grant select on public.arcade_round_results to authenticated;

revoke all on function public.arcade_is_member(uuid) from public;
revoke all on function public.arcade_create_room(text,text,integer) from public;
revoke all on function public.arcade_join_room(text,text) from public;
grant execute on function public.arcade_is_member(uuid) to authenticated;
grant execute on function public.arcade_create_room(text,text,integer) to authenticated;
grant execute on function public.arcade_join_room(text,text) to authenticated;

-- NEXT STEP (separate migration): secure Realtime private Broadcast and Presence
-- by checking that auth.uid() belongs to the UUID room in realtime.topic().
-- Also add backend validated round writes and cleanup of stale rooms.
