-- APLICADO: Supabase existente 'viralio' (bwsgxpttnrctklrcjmjs)
-- Migration history: 20261024114736_modo_caos_shared_arcade_v1
-- Modo Caos usa schema PRIVADO modo_caos y RPC públicas mc_*.
-- No ejecutar dos veces en la misma base: ya consta en el historial.
-- La versión anterior de este archivo (public.arcade_*) era una propuesta NO aplicada.

-- Modo Caos v1 inside existing Supabase 'viralio'.
-- Exclusively additive operations under schema modo_caos + public mc_* RPCs.
-- Never modify existing Viralio / Te Hice Esto tables or settings.
create schema if not exists modo_caos;
revoke all on schema modo_caos from public, anon, authenticated;

create table modo_caos.rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check (code ~ '^[0-9A-F]{8}$'),
 game_slug text not null check (game_slug ~ '^[a-z][a-z0-9-]{1,63}$'),
 host_user_id uuid not null references auth.users(id) on delete cascade,
 max_players smallint not null default 4 check (max_players between 2 and 4),
 status text not null default 'lobby' check (status in ('lobby','playing','finished')),
 round_number integer not null default 0 check (round_number between 0 and 100),
 created_at timestamptz not null default now(),
 started_at timestamptz,
 finished_at timestamptz
);

create table modo_caos.players (
 room_id uuid not null references modo_caos.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 slot smallint not null check (slot between 1 and 4),
 display_name text not null check (char_length(display_name) between 1 and 24),
 ready boolean not null default false,
 joined_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 primary key (room_id,user_id),
 unique (room_id,slot)
);

create table modo_caos.round_results (
 room_id uuid not null,
 user_id uuid not null,
 round_number smallint not null check (round_number between 1 and 100),
 game_slug text not null check (game_slug ~ '^[a-z][a-z0-9-]{1,63}$'),
 points integer not null check (points between 0 and 1000000),
 created_at timestamptz not null default now(),
 primary key (room_id,user_id,round_number),
 foreign key (room_id,user_id) references modo_caos.players(room_id,user_id) on delete cascade
);
create index rooms_host_ix on modo_caos.rooms(host_user_id,created_at desc);
create index players_user_ix on modo_caos.players(user_id);
create index results_room_ix on modo_caos.round_results(room_id,round_number);

alter table modo_caos.rooms enable row level security;
alter table modo_caos.players enable row level security;
alter table modo_caos.round_results enable row level security;
-- RLS is deny-by-default. No direct API grants or policies on this private schema.
revoke all on all tables in schema modo_caos from public, anon, authenticated;

-- Public REST RPC endpoint for room creation. Authenticated users only.
-- SECURITY DEFINER required for controlled inserts into private schema.
create function public.mc_create_room(
 p_game_slug text,
 p_display_name text default 'Anfitrión',
 p_max_players smallint default 4
)
returns table(room_id uuid, room_code text)
language plpgsql security definer
set search_path = ''
as $$
declare
 v_user uuid := (select auth.uid());
 v_code text;
 v_id uuid;
 v_name text := left(coalesce(nullif(btrim(p_display_name),''),'Anfitrión'),24);
 v_count integer;
begin
 if v_user is null then raise exception 'Se requiere una sesión de juego autenticada'; end if;
 if p_game_slug is null or p_game_slug !~ '^[a-z][a-z0-9-]{1,63}$'
 then raise exception 'Juego inválido'; end if;
 if p_max_players is null or p_max_players < 2 or p_max_players > 4
 then raise exception 'Se permiten entre 2 y 4 jugadores'; end if;
 select count(*) into v_count
 from modo_caos.rooms r
 where r.host_user_id=v_user and r.status in ('lobby','playing')
 and r.created_at > now() - interval '12 hours';
 if v_count >= 5 then raise exception 'Ya creaste demasiadas salas activas'; end if;
 for attempt in 1..12 loop
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  begin
   insert into modo_caos.rooms(code,game_slug,host_user_id,max_players)
   values (v_code,p_game_slug,v_user,p_max_players) returning id into v_id;
   insert into modo_caos.players(room_id,user_id,slot,display_name)
   values(v_id,v_user,1,v_name);
   return query select v_id,v_code;
   return;
  exception when unique_violation then null;
  end;
 end loop;
 raise exception 'No se pudo generar un código único';
end $$;

create function public.mc_join_room(
 p_code text,
 p_display_name text default 'Jugador'
)
returns table(room_id uuid, player_slot smallint)
language plpgsql security definer
set search_path = ''
as $$
declare
 v_user uuid := (select auth.uid());
 v_room modo_caos.rooms%rowtype;
 v_slot smallint;
 v_name text := left(coalesce(nullif(btrim(p_display_name),''),'Jugador'),24);
begin
 if v_user is null then raise exception 'Se requiere una sesión de juego autenticada'; end if;
 if p_code is null or upper(btrim(p_code)) !~ '^[0-9A-F]{8}$'
 then raise exception 'Código de sala inválido'; end if;
 select * into v_room from modo_caos.rooms r
 where r.code=upper(btrim(p_code))
 and r.status='lobby'
 and r.created_at>now()-interval '24 hours'
 for update;
 if not found then raise exception 'La sala no existe o ya empezó'; end if;
 select p.slot into v_slot from modo_caos.players p
 where p.room_id=v_room.id and p.user_id=v_user;
 if v_slot is null then
  select (count(*)+1)::smallint into v_slot from modo_caos.players p where p.room_id=v_room.id;
  if v_slot > v_room.max_players then raise exception 'La sala está llena'; end if;
  insert into modo_caos.players(room_id,user_id,slot,display_name)
  values(v_room.id,v_user,v_slot,v_name);
 end if;
 return query select v_room.id,v_slot;
end $$;

create function public.mc_set_ready(p_room_id uuid,p_ready boolean)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare v_user uuid := (select auth.uid());
begin
 if v_user is null then raise exception 'Se requiere autenticación'; end if;
 if p_ready is null then raise exception 'Estado inválido'; end if;
 update modo_caos.players p set ready=p_ready,last_seen_at=now()
 where p.room_id=p_room_id and p.user_id=v_user
   and exists (select 1 from modo_caos.rooms r where r.id=p_room_id and r.status='lobby');
 return found;
end $$;

create function public.mc_get_room(p_room_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_doc jsonb;
begin
 if v_user is null then raise exception 'Se requiere autenticación'; end if;
 if not exists (select 1 from modo_caos.players p
 where p.room_id=p_room_id and p.user_id=v_user)
 then raise exception 'No tenés acceso a esta sala'; end if;
 select jsonb_build_object(
  'id',r.id,'code',r.code,'game',r.game_slug,'status',r.status,
  'maxPlayers',r.max_players,'round',r.round_number,
  'startedAt',r.started_at,'createdAt',r.created_at,
  'players',coalesce((select jsonb_agg(jsonb_build_object(
      'slot',p.slot,'name',p.display_name,'ready',p.ready
   ) order by p.slot) from modo_caos.players p where p.room_id=r.id),'[]'::jsonb)
 ) into v_doc from modo_caos.rooms r where r.id=p_room_id;
 return v_doc;
end $$;

create function public.mc_start_room(p_room_id uuid)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_room modo_caos.rooms%rowtype;
 v_count int; v_not_ready int; v_start timestamptz;
begin
 if v_user is null then raise exception 'Se requiere autenticación'; end if;
 select * into v_room from modo_caos.rooms r where r.id=p_room_id for update;
 if not found or v_room.host_user_id<>v_user or v_room.status<>'lobby'
 then raise exception 'Solo el anfitrión puede iniciar una sala abierta'; end if;
 select count(*),count(*) filter (where not ready)
 into v_count,v_not_ready from modo_caos.players p where p.room_id=p_room_id;
 if v_count<2 or v_not_ready>0 then raise exception 'Todos los jugadores deben estar listos'; end if;
 v_start:=now()+interval '3 seconds';
 update modo_caos.rooms set status='playing',started_at=v_start where id=p_room_id;
 return v_start;
end $$;

-- No client write RPC is provided for round_results:
-- scores must eventually be checked by trusted server-side game logic.
revoke all on function public.mc_create_room(text,text,smallint) from public, anon;
revoke all on function public.mc_join_room(text,text) from public, anon;
revoke all on function public.mc_set_ready(uuid,boolean) from public, anon;
revoke all on function public.mc_get_room(uuid) from public, anon;
revoke all on function public.mc_start_room(uuid) from public, anon;
grant execute on function public.mc_create_room(text,text,smallint) to authenticated;
grant execute on function public.mc_join_room(text,text) to authenticated;
grant execute on function public.mc_set_ready(uuid,boolean) to authenticated;
grant execute on function public.mc_get_room(uuid) to authenticated;
grant execute on function public.mc_start_room(uuid) to authenticated;
