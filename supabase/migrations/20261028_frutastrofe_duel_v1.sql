-- Frutástrofe 1v1 v1; private schema only. No Viralio data changes.
create table modo_caos.fruta_matches (
 room_id uuid not null references modo_caos.rooms(id) on delete cascade,
 round_number integer not null check(round_number between 1 and 100),
 seed bigint not null check(seed between 0 and 4294967295),
 started_at timestamptz not null,
 duration_seconds smallint not null default 60 check(duration_seconds = 60),
 created_at timestamptz not null default now(),
 primary key(room_id,round_number)
);
create table modo_caos.fruta_scores (
 room_id uuid not null,
 round_number integer not null,
 user_id uuid not null,
 score integer not null default 0 check(score between 0 and 1000000),
 shots integer not null default 0 check(shots between 0 and 800),
 hits integer not null default 0 check(hits between 0 and 800),
 chains integer not null default 0 check(chains between 0 and 500),
 is_final boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(room_id,round_number,user_id),
 foreign key (room_id,round_number) references modo_caos.fruta_matches(room_id,round_number) on delete cascade,
 foreign key (room_id,user_id) references modo_caos.players(room_id,user_id) on delete cascade
);
create index fruta_scores_room_round_idx on modo_caos.fruta_scores(room_id,round_number);
alter table modo_caos.fruta_matches enable row level security;
alter table modo_caos.fruta_scores enable row level security;
revoke all on modo_caos.fruta_matches,modo_caos.fruta_scores from public,anon,authenticated;

create function public.mc_fruta_start(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r modo_caos.rooms%rowtype; v_count int; v_bad int; v_round int; v_seed bigint; v_start timestamptz;
begin
 if auth.uid() is null then raise exception 'Se requiere sesión autenticada';end if;
 select * into r from modo_caos.rooms where id=p_room_id for update;
 if not found or r.game_slug<>'frutastrofe' or r.host_user_id<>auth.uid() or r.status<>'lobby'
 then raise exception 'Solo el anfitrión puede iniciar el duelo en espera';end if;
 select count(*),count(*) filter(where not ready) into v_count,v_bad
 from modo_caos.players where room_id=p_room_id;
 if v_count<>2 or v_bad<>0 then raise exception 'Ambos jugadores deben tener arena fija y estar listos';end if;
 if r.round_number>=100 then raise exception 'Sala agotada; creá otra';end if;
 v_round:=r.round_number+1;v_seed:=floor(random()*4294967296)::bigint;
 v_start:=clock_timestamp()+interval '7 seconds';
 insert into modo_caos.fruta_matches(room_id,round_number,seed,started_at)
 values(p_room_id,v_round,v_seed,v_start);
 update modo_caos.rooms set status='playing',round_number=v_round,started_at=v_start,finished_at=null
 where id=p_room_id;
 return jsonb_build_object('round',v_round,'seed',v_seed,'startedAt',v_start,'duration',60);
end $$;

create function public.mc_fruta_state(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r modo_caos.rooms%rowtype; v_match modo_caos.fruta_matches%rowtype;
begin
 if auth.uid() is null then raise exception 'Sesión requerida';end if;
 if not exists(select 1 from modo_caos.players where room_id=p_room_id and user_id=auth.uid())
 then raise exception 'No pertenecés a esta sala';end if;
 select * into r from modo_caos.rooms where id=p_room_id and game_slug='frutastrofe';
 if not found then raise exception 'Sala de Frutástrofe no encontrada';end if;
 select * into v_match from modo_caos.fruta_matches where room_id=p_room_id and round_number=r.round_number;
 return jsonb_build_object(
  'id',r.id,'code',r.code,'status',r.status,'round',r.round_number,
  'hostUserId',r.host_user_id,'serverTime',clock_timestamp(),
  'seed',v_match.seed,'startedAt',v_match.started_at,'duration',60,
  'players',coalesce((select jsonb_agg(jsonb_build_object(
    'userId',p.user_id,'name',p.display_name,'slot',p.slot,'ready',p.ready,
    'lastSeenAt',p.last_seen_at,'score',coalesce(s.score,0),'shots',coalesce(s.shots,0),
    'hits',coalesce(s.hits,0),'chains',coalesce(s.chains,0),'final',coalesce(s.is_final,false)
  ) order by p.slot)
    from modo_caos.players p left join modo_caos.fruta_scores s on
     s.room_id=p.room_id and s.user_id=p.user_id and s.round_number=r.round_number
    where p.room_id=p_room_id),'[]'::jsonb)
 );
end $$;

create function public.mc_fruta_score(
 p_room_id uuid,p_round integer,p_score integer,p_shots integer,p_hits integer,
 p_chains integer,p_final boolean default false)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_room modo_caos.rooms%rowtype; v_match modo_caos.fruta_matches%rowtype;
 v_prev modo_caos.fruta_scores%rowtype; v_now timestamptz:=clock_timestamp();
begin
 if auth.uid() is null then raise exception 'Sesión requerida';end if;
 if not exists(select 1 from modo_caos.players where room_id=p_room_id and user_id=auth.uid())
 then raise exception 'No pertenecés a la sala';end if;
 select * into v_room from modo_caos.rooms where id=p_room_id for update;
 if not found or v_room.game_slug<>'frutastrofe' or v_room.status<>'playing' or v_room.round_number<>p_round
 then raise exception 'No hay una ronda activa válida';end if;
 select * into v_match from modo_caos.fruta_matches where room_id=p_room_id and round_number=p_round;
 if not found then raise exception 'Ronda no encontrada';end if;
 if v_now < v_match.started_at-interval '2 seconds' or v_now > v_match.started_at+interval '90 seconds'
 then raise exception 'Fuera del intervalo de juego';end if;
 if p_score is null or p_score<0 or p_score>1000000 or p_shots is null or p_shots<0 or p_shots>800
   or p_hits is null or p_hits<0 or p_hits>p_shots or p_chains is null or p_chains<0 or p_chains>500
   or p_score>p_hits*3000+1500
 then raise exception 'Puntuación fuera de límites';end if;
 if p_final and v_now < v_match.started_at+interval '58 seconds'
 then raise exception 'La ronda todavía no terminó';end if;
 select * into v_prev from modo_caos.fruta_scores where room_id=p_room_id and round_number=p_round and user_id=auth.uid() for update;
 if found then
   if v_prev.is_final then return true;end if;
   if p_shots<v_prev.shots or p_hits<v_prev.hits or p_chains<v_prev.chains
   then raise exception 'Contadores no pueden retroceder';end if;
   if v_now-v_prev.updated_at<interval '350 milliseconds' and not p_final then return true;end if;
   update modo_caos.fruta_scores set score=p_score,shots=p_shots,hits=p_hits,chains=p_chains,is_final=p_final,updated_at=v_now
   where room_id=p_room_id and round_number=p_round and user_id=auth.uid();
 else
   insert into modo_caos.fruta_scores(room_id,round_number,user_id,score,shots,hits,chains,is_final,updated_at)
   values(p_room_id,p_round,auth.uid(),p_score,p_shots,p_hits,p_chains,p_final,v_now);
 end if;
 if (select count(*) from modo_caos.fruta_scores
   where room_id=p_room_id and round_number=p_round and is_final)=2 then
   update modo_caos.rooms set status='finished',finished_at=v_now where id=p_room_id and status='playing';
 end if;
 return true;
end $$;

create function public.mc_fruta_finalize(p_room_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_time timestamptz;
begin
 if auth.uid() is null or not exists(
  select 1 from modo_caos.players where room_id=p_room_id and user_id=auth.uid()
 ) then raise exception 'Sin acceso a sala';end if;
 select m.started_at into v_time from modo_caos.rooms r
 join modo_caos.fruta_matches m on m.room_id=r.id and m.round_number=r.round_number
 where r.id=p_room_id and r.status='playing';
 if v_time is null or clock_timestamp()<v_time+interval '75 seconds' then return false;end if;
 update modo_caos.rooms set status='finished',finished_at=clock_timestamp() where id=p_room_id and status='playing';
 return found;
end $$;

create function public.mc_fruta_rematch(p_room_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare r modo_caos.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'Sesión requerida';end if;
 select * into r from modo_caos.rooms where id=p_room_id for update;
 if not found or r.game_slug<>'frutastrofe' or r.host_user_id<>auth.uid() or r.status<>'finished'
 then raise exception 'Solo el anfitrión puede preparar una revancha terminada';end if;
 update modo_caos.rooms set status='lobby',started_at=null,finished_at=null where id=p_room_id;
 update modo_caos.players set ready=false where room_id=p_room_id;
 return true;
end $$;

revoke all on function public.mc_fruta_start(uuid), public.mc_fruta_state(uuid),
 public.mc_fruta_score(uuid,integer,integer,integer,integer,integer,boolean),
 public.mc_fruta_finalize(uuid), public.mc_fruta_rematch(uuid) from public,anon;
grant execute on function public.mc_fruta_start(uuid), public.mc_fruta_state(uuid),
 public.mc_fruta_score(uuid,integer,integer,integer,integer,integer,boolean),
 public.mc_fruta_finalize(uuid), public.mc_fruta_rematch(uuid) to authenticated;
