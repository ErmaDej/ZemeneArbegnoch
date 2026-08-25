-- ============================================================================
-- Zemene Arbegnoch — PLAYER IDENTITY LAUNCH FIX (standalone, fully idempotent)
--
-- WHAT THIS FIXES
--   1. Drops the players.id -> auth.users(id) foreign key. Telegram-derived
--      player UUIDs can never exist in auth.users, so that FK made every game
--      RPC fail with a foreign-key violation and blocked the game at launch.
--   2. Recreates private_game.ensure_player_rows so ANY caller identity
--      (Telegram-hash UUID or web-session UUID) gets real player rows.
--   3. Converts all public.game_* RPCs to SECURITY DEFINER. They were
--      security invoker while RLS grants only SELECT policies — their writes
--      were silently zero-row no-ops.
--   4. game_start_battle no longer falls back to "first player row" when
--      unauthenticated (fail closed instead).
--   5. game_get_leaderboard accepts p_player_uuid so the friends view works
--      without a Supabase auth session.
--
-- HOW TO RUN
--   Paste this whole file into the Supabase SQL editor and run once.
--   Re-running is always safe (every statement is idempotent).
--
-- AFTER RUNNING (once, if not already done):
--   insert into private_game.bot_settings (key, value)
--   values ('telegram_bot_token', '<YOUR_BOT_TOKEN>')
--   on conflict (key) do update set value = excluded.value;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop any foreign key from players to auth.users (the launch blocker).
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.players'::regclass
       and contype = 'f'
       and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.players drop constraint %I', c.conname);
  end loop;
end $$;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 2. Drop every historical RPC signature so re-runs tolerate older schemas.
--    CREATE OR REPLACE updates same-signature bodies but cannot remove
--    superseded signatures.
-- ---------------------------------------------------------------------------
drop function if exists public.game_init_state();
drop function if exists public.game_init_state(uuid);
drop function if exists public.game_link_telegram(text);
drop function if exists public.game_link_telegram(text, uuid);
drop function if exists public.game_gather(text);
drop function if exists public.game_gather(text, int);
drop function if exists public.game_gather(text, uuid);
drop function if exists public.game_upgrade_building(text);
drop function if exists public.game_upgrade_building(text, uuid);
drop function if exists public.game_claim_passive();
drop function if exists public.game_claim_passive(uuid);
drop function if exists public.game_start_battle(int);
drop function if exists public.game_start_battle(int, uuid);
drop function if exists public.game_submit_battle(uuid, jsonb, text);
drop function if exists public.game_submit_battle(uuid, jsonb, text, uuid);
drop function if exists public.game_submit_trivia(int, int);
drop function if exists public.game_submit_trivia(int, int, uuid);
drop function if exists public.game_process_referral(text);
drop function if exists public.game_process_referral(text, uuid);
drop function if exists public.game_get_leaderboard(text);
drop function if exists public.game_get_leaderboard(text, uuid);
drop function if exists private_game.ensure_player_rows();
drop function if exists private_game.ensure_player_rows(uuid);

-- Ensure every player has baseline rows. Accepts any caller-derived identity
-- (Telegram-hash UUID or web-session UUID); the players table is no longer
-- FK-bound to auth.users, so these rows can always be created.
create or replace function private_game.ensure_player_rows(p_user_id uuid = null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_legacy jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  insert into public.players (id) values (v_uid)
  on conflict (id) do nothing;

  update public.players
     set referral_code = coalesce(referral_code, 'Z' || upper(substr(encode(extensions.gen_random_bytes(6),'hex'), 1, 8))),
         last_active_at = now()
   where id = v_uid;

  insert into public.player_resources (player_id) values (v_uid)
  on conflict (player_id) do nothing;

  -- One-time legacy migration from the old player_states JSON blob.
  if not exists (select 1 from public.resource_ledger where player_id = v_uid) then
    if to_regclass('public.player_states') is not null then
      select state into v_legacy from public.player_states where user_id = v_uid;
      if v_legacy is not null and jsonb_typeof(v_legacy) = 'object' then
        update public.player_resources set
          fighters   = greatest(fighters, coalesce((v_legacy->'resources'->>'fighters')::numeric, fighters)),
          provisions = greatest(provisions, coalesce((v_legacy->'resources'->>'provisions')::numeric, provisions)),
          morale     = greatest(morale, coalesce((v_legacy->'resources'->>'morale')::numeric, morale))
        where player_id = v_uid;
        update public.players set total_score = greatest(total_score, coalesce((v_legacy->>'score')::bigint, 0))
         where id = v_uid;
        if v_legacy ? 'upgradeLevels' and jsonb_typeof(v_legacy->'upgradeLevels') = 'object' then
          insert into public.player_buildings (player_id, building_key, level)
          select v_uid, e.key, greatest(0, least(500, (e.value #>> '{}')::int))
          from jsonb_each(v_legacy->'upgradeLevels') e
          where e.key in (select building_key from public.buildings)
          on conflict (player_id, building_key) do update set level = excluded.level;
        end if;
        if v_legacy ? 'completedChapters' and jsonb_typeof(v_legacy->'completedChapters') = 'array' then
          insert into public.player_campaign (player_id, stage_id, first_completed_at, completion_count)
          select v_uid, (c.value #>> '{}')::int, now(), 1
          from jsonb_array_elements(v_legacy->'completedChapters') c
          where (c.value #>> '{}')::int in (select id from public.campaign_stages)
          on conflict (player_id, stage_id) do nothing;
        end if;
      end if;
    end if;
    insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type)
    values (v_uid, 'provisions', 0, 'legacy_import', 'migration');
  end if;
end;
$$;

-- SECURITY DEFINER: these RPCs enforce ownership in-function (e.g. battle
-- sessions must belong to the caller's player id) and run as the owner so the
-- SELECT-only RLS policies on game tables cannot silently zero-row their
-- mutations. Direct client table access stays locked by RLS.
create or replace function public.game_init_state(p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_res public.player_resources;
  v_player public.players;
begin
  perform private_game.ensure_player_rows(p_player_uuid);

  select * into v_res from public.player_resources where player_id = v_uid;
  select * into v_player from public.players where id = v_uid;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'displayName', v_player.display_name,
      'telegramLinked', v_player.telegram_id is not null,
      'totalScore', v_player.total_score,
      'xp', v_player.xp,
      'level', v_player.level,
      'lifetimeBattles', v_player.lifetime_battles,
      'lifetimeWins', v_player.lifetime_wins,
      'bestAccuracy', v_player.best_accuracy,
      'bestCombo', v_player.best_combo,
      'referralCode', v_player.referral_code,
      'referredBy', v_player.referred_by
    ),
    'resources', jsonb_build_object(
      'fighters', floor(v_res.fighters),
      'provisions', floor(v_res.provisions),
      'morale', floor(v_res.morale)
    ),
    'buildings', coalesce((
      select jsonb_object_agg(building_key, level) from public.player_buildings where player_id = v_uid
    ), '{}'::jsonb),
    'completedStages', coalesce((
      select jsonb_agg(stage_id order by stage_id) from public.player_campaign
       where player_id = v_uid and first_completed_at is not null
    ), '[]'::jsonb),
    'stageStats', coalesce((
      select jsonb_object_agg(stage_id, jsonb_build_object('bestScore', best_score, 'bestAccuracy', best_accuracy, 'stars',
        case when best_accuracy >= 90 then 3 when best_accuracy >= 70 then 2 else 1 end))
        from public.player_campaign where player_id = v_uid and first_completed_at is not null
    ), '{}'::jsonb),
    'answeredTrivia', coalesce((
      select jsonb_agg(question_id) from public.trivia_attempts where player_id = v_uid
    ), '[]'::jsonb),
    'unlockedAchievements', coalesce((
      select jsonb_agg(achievement_id) from public.player_achievements where player_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

-- Validate Telegram WebApp initData server-side (official HMAC-SHA256 algo).
-- Requires the bot token stored once in private_game.bot_settings
-- (key = 'telegram_bot_token') — see the secrets block above.
-- Accepts an optional deterministic player UUID (derived from Telegram user ID
-- on the client, or a fixed mock UUID for web browser testing).
create or replace function public.game_link_telegram(p_init_data text, p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_token text;
  v_pairs text[];
  v_pair text;
  v_hash text := '';
  v_data_check text[] := '{}';
  v_secret bytea;
  v_computed text;
  v_tid text;
  v_username text;
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
begin
  if v_uid is null or p_init_data is null or p_init_data = '' then
    return jsonb_build_object('linked', false, 'reason', 'missing_input');
  end if;

  -- The player row must exist before we can bind telegram_id to it (or log an
  -- anti-cheat event against it).
  perform private_game.ensure_player_rows(v_uid);

  select value into v_token from private_game.bot_settings where key = 'telegram_bot_token';
  if v_token is null or v_token = '' then
    return jsonb_build_object('linked', false, 'reason', 'server_not_configured');
  end if;

  foreach v_pair in array string_to_array(p_init_data, '&') loop
    if v_pair like 'hash=%' then
      v_hash := lower(substr(v_pair, 6));
    elsif v_pair like 'signature=%' then
      -- newer Ed25519 field; ignored for HMAC validation
      null;
    else
      v_data_check := array_append(v_data_check, v_pair);
      if v_pair like 'user=%' then
        v_tid := substring(v_pair from '%22id%22(?:%3A|:)([0-9]+)');
        v_username := substring(v_pair from '%22username%22(?:%3A|:)%22([^%&]+)');
      end if;
    end if;
  end loop;

  if v_hash = '' or v_tid is null then
    return jsonb_build_object('linked', false, 'reason', 'malformed');
  end if;

  v_secret := extensions.hmac('WebAppData', v_token, 'sha256');
  v_computed := encode(extensions.hmac(array_to_string(v_data_check, chr(10)), v_secret, 'sha256'), 'hex');

  if v_computed <> lower(v_hash) then
    insert into public.anti_cheat_events (player_id, event_type, severity, metadata)
    values (v_uid, 'telegram_signature_mismatch', 'high', '{}'::jsonb);
    return jsonb_build_object('linked', false, 'reason', 'invalid_signature');
  end if;

  update public.players
     set telegram_id = v_tid,
         display_name = coalesce(nullif(v_username, ''), display_name, 'Arbegna')
   where id = v_uid and (telegram_id is null or telegram_id = v_tid);

  return jsonb_build_object('linked', true, 'telegramId', v_tid);
end;
$$;

-- Tap-to-gather: small fixed gains, rate-limited server-side.
create or replace function public.game_gather(p_resource text, p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_gain numeric;
  v_res public.player_resources;
  v_recent int;
begin
  perform private_game.ensure_player_rows(p_player_uuid);
  if p_resource not in ('fighters','provisions','morale') then
    raise exception 'invalid resource';
  end if;

  select count(*) into v_recent from public.resource_ledger
   where player_id = v_uid and reason = 'gather' and created_at > now() - interval '60 seconds';
  if v_recent >= 30 then
    insert into public.anti_cheat_events (player_id, event_type, severity, metadata)
    values (v_uid, 'gather_rate_exceeded', 'medium', jsonb_build_object('recent', v_recent));
    raise exception 'rate limited';
  end if;

  v_gain := case p_resource when 'fighters' then 1 when 'provisions' then 3 else 2 end;

  update public.player_resources set
    fighters   = fighters   + case when p_resource = 'fighters'   then v_gain else 0 end,
    provisions = provisions + case when p_resource = 'provisions' then v_gain else 0 end,
    morale     = morale     + case when p_resource = 'morale'     then v_gain else 0 end,
    updated_at = now()
  where player_id = v_uid
  returning * into v_res;

  insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type)
  values (v_uid, p_resource, v_gain, 'gather', 'camp_tap');

  return jsonb_build_object('gained', v_gain, 'resourceType', p_resource,
    'resources', jsonb_build_object(
      'fighters', floor(v_res.fighters), 'provisions', floor(v_res.provisions), 'morale', floor(v_res.morale)));
end;
$$;

-- Building upgrade: costs and levels decided entirely server-side.
create or replace function public.game_upgrade_building(p_building_key text, p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_b public.buildings;
  v_level int;
  v_cost numeric;
  v_res public.player_resources;
begin
  perform private_game.ensure_player_rows(p_player_uuid);
  select * into v_b from public.buildings where building_key = p_building_key;
  if v_b is null then raise exception 'unknown building'; end if;

  select coalesce(level, 0) into v_level from public.player_buildings
   where player_id = v_uid and building_key = p_building_key;
  if v_level >= v_b.max_level then raise exception 'max level'; end if;

  v_cost := floor(v_b.base_cost * power(1.55, v_level));

  select * into v_res from public.player_resources where player_id = v_uid for update;
  if (case v_b.cost_resource
        when 'fighters' then v_res.fighters
        when 'provisions' then v_res.provisions
        else v_res.morale end) < v_cost then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_resources');
  end if;

  update public.player_resources set
    fighters   = fighters   - case when v_b.cost_resource = 'fighters'   then v_cost else 0 end,
    provisions = provisions - case when v_b.cost_resource = 'provisions' then v_cost else 0 end,
    morale     = morale     - case when v_b.cost_resource = 'morale'     then v_cost else 0 end,
    updated_at = now()
  where player_id = v_uid
  returning * into v_res;

  insert into public.player_buildings (player_id, building_key, level)
  values (v_uid, p_building_key, v_level + 1)
  on conflict (player_id, building_key) do update set level = excluded.level, updated_at = now();

  insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type, source_id)
  values (v_uid, v_b.cost_resource, -v_cost, 'building_purchase', 'building', p_building_key);

  update public.players set xp = xp + 5 where id = v_uid;

  return jsonb_build_object('ok', true, 'buildingKey', p_building_key, 'level', v_level + 1,
    'resources', jsonb_build_object('fighters', floor(v_res.fighters), 'provisions', floor(v_res.provisions), 'morale', floor(v_res.morale)));
end;
$$;

-- Passive production claim (idle output since last claim, capped at 8h).
create or replace function public.game_claim_passive(p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_elapsed numeric;
  v_res public.player_resources;
  r record;
begin
  perform private_game.ensure_player_rows(p_player_uuid);

  select extract(epoch from (now() - last_claim_at)) into v_elapsed from public.players where id = v_uid for update;
  update public.players set last_claim_at = now(), last_active_at = now() where id = v_uid;
  v_elapsed := least(coalesce(v_elapsed, 0), 28800); -- 8h cap
  if v_elapsed < 15 then
    select * into v_res from public.player_resources where player_id = v_uid;
    return jsonb_build_object('claimedSeconds', 0,
      'resources', jsonb_build_object('fighters', floor(v_res.fighters), 'provisions', floor(v_res.provisions), 'morale', floor(v_res.morale)));
  end if;

  update public.player_resources set
    fighters   = fighters   + floor(coalesce((select sum(b.base_rate * pb.level) from public.player_buildings pb join public.buildings b on b.building_key = pb.building_key where pb.player_id = v_uid and b.produces = 'fighters'), 0) * v_elapsed),
    provisions = provisions + floor(coalesce((select sum(b.base_rate * pb.level) from public.player_buildings pb join public.buildings b on b.building_key = pb.building_key where pb.player_id = v_uid and b.produces = 'provisions'), 0) * v_elapsed),
    morale     = morale     + floor(coalesce((select sum(b.base_rate * pb.level) from public.player_buildings pb join public.buildings b on b.building_key = pb.building_key where pb.player_id = v_uid and b.produces = 'morale'), 0) * v_elapsed),
    updated_at = now()
  where player_id = v_uid
  returning * into v_res;

  for r in
    select b.produces as rt, floor(sum(b.base_rate * pb.level) * v_elapsed) as amt
      from public.player_buildings pb join public.buildings b on b.building_key = pb.building_key
     where pb.player_id = v_uid group by b.produces
  loop
    if r.amt > 0 then
      insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type)
      values (v_uid, r.rt, r.amt, 'passive_generation', 'camp');
    end if;
  end loop;

  return jsonb_build_object('claimedSeconds', floor(v_elapsed),
    'resources', jsonb_build_object('fighters', floor(v_res.fighters), 'provisions', floor(v_res.provisions), 'morale', floor(v_res.morale)));
end;
$$;

-- Start a battle: validates unlock, creates session + deterministic encounter.
-- Accepts an optional deterministic player UUID (derived from Telegram user ID
-- on the client, or a fixed mock UUID for web browser testing).
create or replace function public.game_start_battle(p_stage_id int, p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_stage public.campaign_stages;
  v_max_completed int;
  v_seed bigint := floor(random() * 2147483647);
  v_session public.battle_sessions;
  v_encounter jsonb;
  v_res public.player_resources;
  v_cleared int;
  v_player_power int;
  v_cfg jsonb;
begin
  -- Fail closed: never act on behalf of an arbitrary player row.
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  perform private_game.ensure_player_rows(v_uid);

  select * into v_stage from public.campaign_stages where id = p_stage_id and active;
  if v_stage is null then raise exception 'unknown stage'; end if;

  select coalesce(max(stage_id), 0) into v_max_completed
    from public.player_campaign where player_id = v_uid and first_completed_at is not null;
  if p_stage_id > v_max_completed + 1 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  -- Expire any stale sessions.
  update public.battle_sessions set status = 'expired'
   where player_id = v_uid and status in ('created','active') and expires_at < now();

  select * into v_res from public.player_resources where player_id = v_uid;
  select count(*) into v_cleared from public.player_campaign where player_id = v_uid and first_completed_at is not null;
  v_player_power := floor(v_res.fighters * 2 + v_res.morale * 1.2 + v_res.provisions * 0.15 + v_cleared * 25 + 30);

  if v_stage.battle_type = 'sniper' then
    v_encounter := private_game.build_sniper_targets(v_seed, v_stage.id);
    v_cfg := jsonb_build_object('enemyPower', v_stage.enemy_power,
                                'minHitRatio', v_encounter->'minHitRatio',
                                'comboWindowMs', v_encounter->'comboWindowMs');
  else
    -- Formation/mixed battles: server snapshots both powers at start and later
    -- resolves the outcome deterministically from the session seed.
    v_encounter := jsonb_build_object('targets', '[]'::jsonb, 'durationMs', 8000);
    v_cfg := jsonb_build_object(
      'enemyPower', v_stage.enemy_power,
      'playerPower', v_player_power,
      'roll', 82 + (v_seed % 37),
      'formations', '{"shieldwall":1.08,"scouts":1.14,"rally":1.10}'::jsonb,
      'resolveAfterMs', 8000);
  end if;

  insert into public.battle_sessions (player_id, stage_id, battle_type, seed, status, targets, config, expires_at)
  values (v_uid, p_stage_id, v_stage.battle_type, v_seed, 'active', v_encounter->'targets',
          v_cfg, now() + make_interval(secs => ((v_encounter->>'durationMs')::int + 30000) / 1000.0))
  returning * into v_session;

  return jsonb_build_object(
    'ok', true,
    'sessionId', v_session.id,
    'battleType', v_session.battle_type,
    'seed', v_seed,
    'stageId', p_stage_id,
    'targets', v_encounter->'targets',
    'durationMs', v_encounter->'durationMs',
    'config', v_cfg);
end;
$$;

-- Submit + validate a battle. This is the authoritative scoring path.
-- Accepts an optional deterministic player UUID (derived from Telegram user ID
-- on the client, or a fixed mock UUID for web browser testing).
create or replace function public.game_submit_battle(
  p_session_id uuid,
  p_actions jsonb,
  p_formation text default null,
  p_player_uuid uuid = null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_s public.battle_sessions;
  v_stage public.campaign_stages;
  v_action jsonb;
  v_target jsonb;
  v_hits int := 0;
  v_shots int := 0;
  v_best_combo int := 0;
  v_combo int := 0;
  v_last_hit_t int := -99999;
  v_prev_ms int := 0;
  v_score int := 0;
  v_accuracy int := 0;
  v_victory boolean := false;
  v_first_completion boolean := false;
  v_repeat boolean := false;
  v_mult numeric;
  v_reward jsonb := '{}'::jsonb;
  v_rw_key text;
  v_rw_val jsonb;
  v_score_gain int := 0;
  v_res public.player_resources;
  v_new_badge text;
  v_new_badges jsonb := '[]'::jsonb;
  v_hit_ids text[] := '{}';
  v_fast int := 0;
  v_t int;
  v_tid text;
  v_bonus numeric;
  v_effective numeric;
begin
  perform private_game.ensure_player_rows(p_player_uuid);

  select * into v_s from public.battle_sessions where id = p_session_id for update;
  if v_s is null or v_s.player_id <> v_uid then
    raise exception 'session not found';
  end if;
  if v_s.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'session_closed', 'status', v_s.status);
  end if;
  if now() > v_s.expires_at then
    update public.battle_sessions set status = 'expired' where id = p_session_id;
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select * into v_stage from public.campaign_stages where id = v_s.stage_id;

  if v_s.battle_type = 'sniper' then
    ------------------------------------------------------------------
    -- TARGET SWEEP VALIDATION
    ------------------------------------------------------------------
    if jsonb_typeof(p_actions) <> 'array' then
      update public.battle_sessions set status = 'rejected', result = 'rejected', validated_at = now() where id = p_session_id;
      return jsonb_build_object('ok', false, 'reason', 'bad_payload');
    end if;

    for v_action in select * from jsonb_array_elements(p_actions) loop
      v_shots := v_shots + 1;
      v_t := coalesce((v_action->>'t')::int, -1);
      v_tid := v_action->>'targetId';

      -- Actions must arrive in chronological order.
      if v_t < v_prev_ms then
        update public.battle_sessions set status = 'rejected', result = 'rejected', validated_at = now() where id = p_session_id;
        insert into public.anti_cheat_events (player_id, battle_session_id, event_type, severity, metadata)
        values (v_uid, p_session_id, 'action_sequence_invalid', 'high', jsonb_build_object('t', v_t, 'prev', v_prev_ms));
        return jsonb_build_object('ok', false, 'reason', 'sequence');
      end if;
      -- Plausible fire rate: no human taps meaningfully faster than 60ms apart.
      if v_t - v_prev_ms < 60 then v_fast := v_fast + 1; end if;
      v_prev_ms := v_t;

      -- Target must exist in the server-authored encounter...
      select tg into v_target from jsonb_array_elements(v_s.targets) tg where tg->>'id' = v_tid;
      if v_target is not null
         -- ...be within its legal availability window...
         and v_t >= (v_target->>'spawnMs')::int
         and v_t <= (v_target->>'spawnMs')::int + (v_target->>'lifetimeMs')::int
         -- ...and not have been hit already.
         and not (v_tid = any(v_hit_ids)) then
        v_hit_ids := array_append(v_hit_ids, v_tid);
        v_hits := v_hits + 1;
        if v_t - v_last_hit_t <= coalesce((v_s.config->>'comboWindowMs')::int, 1500) then
          v_combo := v_combo + 1;
        else
          v_combo := 1;
        end if;
        v_last_hit_t := v_t;
        if v_combo > v_best_combo then v_best_combo := v_combo; end if;
        v_mult := 1 + least(v_combo - 1, 10) * 0.05;
        v_score := v_score + round((v_target->>'value')::int * v_mult)::int;
      end if;
    end loop;

    -- Impossible input patterns get quarantined, never paid.
    if v_shots > 0 and v_fast::numeric / v_shots > 0.3 then
      update public.battle_sessions set status = 'rejected', result = 'rejected', validated_at = now() where id = p_session_id;
      insert into public.anti_cheat_events (player_id, battle_session_id, event_type, severity, metadata)
      values (v_uid, p_session_id, 'impossible_fire_rate', 'high', jsonb_build_object('shots', v_shots, 'fast', v_fast));
      return jsonb_build_object('ok', false, 'reason', 'implausible_input');
    end if;

    v_accuracy := case when v_shots > 0 then round(100.0 * v_hits / v_shots)::int else 0 end;
    v_victory := v_shots > 0 and v_hits >= ceil(jsonb_array_length(v_s.targets) * coalesce((v_s.config->>'minHitRatio')::numeric, 0.5));

  else
    ------------------------------------------------------------------
    -- FORMATION BATTLE VALIDATION (deterministic seeded resolve)
    ------------------------------------------------------------------
    if p_formation not in ('shieldwall','scouts','rally') then
      p_formation := 'shieldwall';
    end if;
    v_bonus := (v_s.config->'formations'->>p_formation)::numeric;
    v_effective := (v_s.config->>'playerPower')::numeric * v_bonus * ((v_s.config->>'roll')::numeric / 100.0);
    v_victory := v_effective >= (v_s.config->>'enemyPower')::numeric;
    v_accuracy := case when v_victory
      then greatest(55, least(95, 55 + (v_s.seed % 41)::int))
      else least(54, 20 + (v_s.seed % 35)::int) end;
    v_best_combo := 0;
    v_score := case when v_victory then 50 + (v_s.seed % 51)::int else 10 + (v_s.seed % 21)::int end;
  end if;

  ----------------------------------------------------------------------
  -- AUTHORITATIVE REWARD PIPELINE (atomic)
  ----------------------------------------------------------------------
  select not exists(
    select 1 from public.player_campaign
     where player_id = v_uid and stage_id = v_s.stage_id and first_completed_at is not null
  ) into v_first_completion;
  v_repeat := not v_first_completion;

  if v_victory then
    if v_repeat then
      select coalesce(jsonb_object_agg(e.k, floor((e.value #>> '{}')::numeric * 0.25)), '{}'::jsonb)
        into v_reward
        from jsonb_each(v_stage.reward_config) e(k, value);
      v_score_gain := floor(v_stage.score_reward * 0.25);
    else
      v_reward := v_stage.reward_config;
      v_score_gain := v_stage.score_reward;
    end if;
  end if;

  update public.player_resources set
    fighters   = fighters   + coalesce((v_reward->>'fighters')::numeric, 0),
    provisions = provisions + coalesce((v_reward->>'provisions')::numeric, 0),
    morale     = morale     + coalesce((v_reward->>'morale')::numeric, 0),
    updated_at = now()
  where player_id = v_uid
  returning * into v_res;

  for v_rw_key, v_rw_val in select * from jsonb_each(v_reward) loop
    insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type, source_id)
    values (v_uid, v_rw_key, (v_rw_val #>> '{}')::numeric, 'battle_reward', 'battle_session', p_session_id::text);
  end loop;

  update public.players set
    total_score = total_score + case when v_victory then v_score_gain else v_score / 10 end,
    xp = xp + greatest(1, v_score / 10),
    lifetime_battles = lifetime_battles + 1,
    lifetime_wins = lifetime_wins + case when v_victory then 1 else 0 end,
    best_accuracy = greatest(best_accuracy, v_accuracy),
    best_combo = greatest(best_combo, v_best_combo),
    last_active_at = now()
  where id = v_uid;

  update public.players set level = greatest(level, xp / 100 + 1) where id = v_uid;

  insert into public.player_campaign (player_id, stage_id, first_completed_at, best_score, best_accuracy, best_combo, completion_count)
  values (v_uid, v_s.stage_id, case when v_victory then now() else null end, v_score, v_accuracy, v_best_combo, 1)
  on conflict (player_id, stage_id) do update set
    first_completed_at = coalesce(public.player_campaign.first_completed_at, excluded.first_completed_at),
    best_score = greatest(public.player_campaign.best_score, excluded.best_score),
    best_accuracy = greatest(public.player_campaign.best_accuracy, excluded.best_accuracy),
    best_combo = greatest(public.player_campaign.best_combo, excluded.best_combo),
    completion_count = public.player_campaign.completion_count + 1,
    updated_at = now();

  if v_first_completion and v_victory then
    for v_new_badge in
      select a.id from public.achievements a
       where a.stage_required = v_s.stage_id
         and not exists (select 1 from public.player_achievements pa where pa.player_id = v_uid and pa.achievement_id = a.id)
    loop
      insert into public.player_achievements (player_id, achievement_id) values (v_uid, v_new_badge);
      v_new_badges := v_new_badges || to_jsonb(v_new_badge);
    end loop;
  end if;

  update public.battle_sessions set
    status = 'validated',
    result = case when v_victory then 'victory' else 'defeat' end,
    authoritative_score = v_score,
    accuracy = v_accuracy,
    best_combo = v_best_combo,
    hits = v_hits,
    shots = v_shots,
    submitted_at = now(),
    validated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'ok', true,
    'result', case when v_victory then 'victory' else 'defeat' end,
    'score', v_score,
    'scoreGain', case when v_victory then v_score_gain else 0 end,
    'accuracy', v_accuracy,
    'bestCombo', v_best_combo,
    'hits', v_hits,
    'shots', v_shots,
    'rewards', v_reward,
    'newBadges', v_new_badges,
    'firstCompletion', v_first_completion and v_victory,
    'totalScore', (select total_score from public.players where id = v_uid),
    'resources', jsonb_build_object('fighters', floor(v_res.fighters), 'provisions', floor(v_res.provisions), 'morale', floor(v_res.morale)));
end;
$$;

-- Trivia: correct index checked server-side; reward granted exactly once.
create or replace function public.game_submit_trivia(p_question_id int, p_answer_index int, p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_q public.trivia_questions;
  v_correct boolean;
  v_already boolean;
  v_res public.player_resources;
begin
  perform private_game.ensure_player_rows(p_player_uuid);
  select * into v_q from public.trivia_questions where id = p_question_id and active;
  if v_q is null then raise exception 'unknown question'; end if;

  select exists(select 1 from public.trivia_attempts where player_id = v_uid and question_id = p_question_id) into v_already;
  v_correct := (p_answer_index = v_q.correct_index);

  insert into public.trivia_attempts (player_id, question_id, answer_index, correct, rewarded)
  values (v_uid, p_question_id, p_answer_index, v_correct, v_correct and not v_already)
  on conflict (player_id, question_id) do update set answer_index = excluded.answer_index;

  if v_correct and not v_already then
    update public.player_resources set
      fighters = fighters + 10, provisions = provisions + 40, morale = morale + 25, updated_at = now()
    where player_id = v_uid returning * into v_res;

    insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type, source_id)
    values (v_uid, 'provisions', 40, 'trivia_reward', 'trivia_question', p_question_id::text),
           (v_uid, 'fighters', 10, 'trivia_reward', 'trivia_question', p_question_id::text),
           (v_uid, 'morale', 25, 'trivia_reward', 'trivia_question', p_question_id::text);

    update public.players set total_score = total_score + 50, xp = xp + 10 where id = v_uid;

    return jsonb_build_object('correct', true, 'rewarded', true, 'scoreGain', 50,
      'resources', jsonb_build_object('fighters', floor(v_res.fighters), 'provisions', floor(v_res.provisions), 'morale', floor(v_res.morale)));
  end if;

  return jsonb_build_object('correct', v_correct, 'rewarded', false, 'scoreGain', 0);
end;
$$;

-- Referral attribution: server-validated, one-time, self-referral blocked.
create or replace function public.game_process_referral(p_referral_code text, p_player_uuid uuid = null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_player_uuid, auth.uid());
  v_inviter public.players;
  v_res public.player_resources;
begin
  perform private_game.ensure_player_rows(p_player_uuid);
  if p_referral_code is null or length(trim(p_referral_code)) < 4 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select * into v_inviter from public.players where referral_code = upper(left(trim(p_referral_code), 16));
  if v_inviter is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_inviter.id = v_uid then return jsonb_build_object('ok', false, 'reason', 'self_referral'); end if;

  update public.players set referred_by = v_inviter.id where id = v_uid and referred_by is null;
  if not found then return jsonb_build_object('ok', false, 'reason', 'already_referred'); end if;

  insert into public.referrals (inviter_id, invitee_id, referral_code) values (v_inviter.id, v_uid, v_inviter.referral_code);

  -- Reward both parties once.
  update public.player_resources set fighters = fighters + 15, provisions = provisions + 50, morale = morale + 30, updated_at = now()
  where player_id = v_uid returning * into v_res;
  insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type, source_id)
  values (v_uid, 'provisions', 50, 'referral_reward', 'referral', v_inviter.id::text),
         (v_uid, 'fighters', 15, 'referral_reward', 'referral', v_inviter.id::text),
         (v_uid, 'morale', 30, 'referral_reward', 'referral', v_inviter.id::text);

  update public.player_resources set fighters = fighters + 15, provisions = provisions + 50, morale = morale + 30, updated_at = now()
  where player_id = v_inviter.id;
  insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type, source_id)
  values (v_inviter.id, 'provisions', 50, 'referral_reward', 'referral', v_uid::text),
         (v_inviter.id, 'fighters', 15, 'referral_reward', 'referral', v_uid::text),
         (v_inviter.id, 'morale', 30, 'referral_reward', 'referral', v_uid::text);

  return jsonb_build_object('ok', true,
    'resources', jsonb_build_object('fighters', floor(v_res.fighters), 'provisions', floor(v_res.provisions), 'morale', floor(v_res.morale)));
end;
$$;

-- Real leaderboard: only actual players, honest empty states upstream.
-- p_player_uuid scopes the "friends" view when no Supabase auth session exists.
create or replace function public.game_get_leaderboard(p_kind text default 'global', p_player_uuid uuid = null)
returns table (player_id uuid, name text, score bigint, player_rank bigint)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.total_score,
         rank() over (order by p.total_score desc)
    from public.players p
   where case
     when p_kind = 'friends' then
       p.id = coalesce(p_player_uuid, auth.uid())
       or p.referred_by = coalesce(p_player_uuid, auth.uid())
       or p.id = (select referred_by from public.players where id = coalesce(p_player_uuid, auth.uid()))
     else true end
     and p.status = 'active'
     and p.total_score > 0
   order by p.total_score desc
   limit 50;
$$;

grant execute on function public.game_init_state(uuid) to anon, authenticated;
grant execute on function public.game_link_telegram(text, uuid) to anon, authenticated;
grant execute on function public.game_gather(text, uuid) to anon, authenticated;
grant execute on function public.game_upgrade_building(text, uuid) to anon, authenticated;
grant execute on function public.game_claim_passive(uuid) to anon, authenticated;
grant execute on function public.game_start_battle(int, uuid) to anon, authenticated;
grant execute on function public.game_submit_battle(uuid, jsonb, text, uuid) to anon, authenticated;
grant execute on function public.game_submit_trivia(int, int, uuid) to anon, authenticated;
grant execute on function public.game_process_referral(text, uuid) to anon, authenticated;
grant execute on function public.game_get_leaderboard(text, uuid) to anon, authenticated;

