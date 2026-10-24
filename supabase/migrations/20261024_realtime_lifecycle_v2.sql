-- Applied to shared Supabase project bwsgxpttnrctklrcjmjs on 2026-10-24.
-- Supabase migration version: 20261024121010, name: modo_caos_realtime_lifecycle_v2
-- Run in another fresh environment after the v1 migration, not again on Viralio.

-- modo_caos multiplayer v2: room lifecycle, private Realtime policy scoped by membership.
-- Non-destructive addition to shared Supabase project bwsgxpttnrctklrcjmjs.
-- Do not disable globally public Realtime: older Color Rush uses public channels.
-- Auth anonymous provider must be configured separately after global RLS audit.

create function public.mc_realtime_allowed(p_topic text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare v_room uuid;
begin
 if auth.uid() is null
    or p_topic is null
    or p_topic !~ '^mc-room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then return false; end if;
 v_room := substr(p_topic, 9)::uuid;
 return exists(
  select 1 from modo_caos.players p
  join modo_caos.rooms r on r.id=p.room_id
  where p.user_id=auth.uid()
    and p.room_id=v_room
    and r.created_at > now() - interval '48 hours'
 );
end;
$$;
revoke all on function public.mc_realtime_allowed(text) from public,anon;
grant execute on function public.mc_realtime_allowed(text) to authenticated;

-- Realtime policies are additive, apply only to topic "mc-room:<room-uuid>".
-- Existing public Realtime channel traffic retains its existing settings.
create policy "mc_only_members_read_broadcast_presence_v2"
on realtime.messages
for select to authenticated
using (
 realtime.messages.extension in ('broadcast','presence')
 and public.mc_realtime_allowed((select realtime.topic()))
);
create policy "mc_only_members_write_broadcast_presence_v2"
on realtime.messages
for insert to authenticated
with check (
 realtime.messages.extension in ('broadcast','presence')
 and public.mc_realtime_allowed((select realtime.topic()))
);

create function public.mc_resume_room(p_code text)
returns table(room_id uuid,player_slot smallint,room_status text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
 if auth.uid() is null then raise exception 'Se requiere autenticación'; end if;
 if p_code is null or upper(btrim(p_code)) !~ '^[0-9A-F]{8}$'
 then raise exception 'Código inválido'; end if;
 return query
  select r.id,p.slot,r.status
  from modo_caos.rooms r
  join modo_caos.players p on p.room_id=r.id
  where r.code=upper(btrim(p_code)) and p.user_id=auth.uid()
    and r.created_at>now()-interval '48 hours';
 if not found then raise exception 'No sos integrante de esta sala'; end if;
end;
$$;
revoke all on function public.mc_resume_room(text) from public,anon;
grant execute on function public.mc_resume_room(text) to authenticated;

create function public.mc_leave_room(p_room_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare v_status text; v_host uuid;
begin
 if auth.uid() is null then raise exception 'Se requiere autenticación'; end if;
 select r.status,r.host_user_id into v_status,v_host
 from modo_caos.rooms r where r.id=p_room_id for update;
 if not found then return false; end if;
 if v_host=auth.uid() then
  if v_status='playing' then
   raise exception 'El anfitrión debe finalizar una partida antes de salir';
  end if;
  delete from modo_caos.rooms where id=p_room_id and host_user_id=auth.uid();
  return found;
 end if;
 delete from modo_caos.players p where p.room_id=p_room_id and p.user_id=auth.uid();
 return found;
end;
$$;
revoke all on function public.mc_leave_room(uuid) from public,anon;
grant execute on function public.mc_leave_room(uuid) to authenticated;

create function public.mc_finish_room(p_room_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
 if auth.uid() is null then raise exception 'Se requiere autenticación'; end if;
 update modo_caos.rooms r set status='finished',finished_at=now()
 where r.id=p_room_id and r.host_user_id=auth.uid() and r.status='playing';
 return found;
end;
$$;
revoke all on function public.mc_finish_room(uuid) from public,anon;
grant execute on function public.mc_finish_room(uuid) to authenticated;

create function public.mc_heartbeat(p_room_id uuid)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare v_now timestamptz := clock_timestamp();
begin
 if auth.uid() is null then raise exception 'Se requiere autenticación'; end if;
 update modo_caos.players p set last_seen_at=v_now
 where p.room_id=p_room_id and p.user_id=auth.uid();
 if not found then raise exception 'No pertenecés a la sala'; end if;
 return v_now;
end;
$$;
revoke all on function public.mc_heartbeat(uuid) from public,anon;
grant execute on function public.mc_heartbeat(uuid) to authenticated;

-- Return authenticated membership identity for safe client-side host identification.
-- This is visible ONLY to already authenticated participants.
create or replace function public.mc_get_room(p_room_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_doc jsonb;
begin
 if v_user is null then raise exception 'Se requiere autenticación'; end if;
 if not exists (
  select 1 from modo_caos.players p
  where p.room_id=p_room_id and p.user_id=v_user
 ) then raise exception 'No tenés acceso a esta sala'; end if;
 select jsonb_build_object(
  'id',r.id,'code',r.code,'game',r.game_slug,'status',r.status,
  'hostUserId',r.host_user_id,'maxPlayers',r.max_players,
  'round',r.round_number,'startedAt',r.started_at,
  'finishedAt',r.finished_at,'createdAt',r.created_at,
  'serverTime',clock_timestamp(),
  'players',coalesce((
   select jsonb_agg(jsonb_build_object(
    'userId',p.user_id,'slot',p.slot,'name',p.display_name,
    'ready',p.ready,'lastSeenAt',p.last_seen_at
   ) order by p.slot)
   from modo_caos.players p where p.room_id=r.id
  ),'[]'::jsonb)
 ) into v_doc
 from modo_caos.rooms r where r.id=p_room_id;
 return v_doc;
end;
$$;
revoke all on function public.mc_get_room(uuid) from public,anon;
grant execute on function public.mc_get_room(uuid) to authenticated;
