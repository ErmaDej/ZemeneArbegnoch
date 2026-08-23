-- ============================================================================
-- Zemene Arbegnoch — Production Core Migration
-- Server-authoritative game state, battle sessions, validated rewards,
-- real leaderboards, referrals, trivia, achievements, resource ledger.
--
-- HOW TO APPLY:
--   Paste this whole file into the Supabase SQL editor (or `supabase db push`)
--   and run it ONCE. Every statement is idempotent.
--
-- AFTER RUNNING, secure the Telegram bot token server-side (do NOT commit it):
--   ALTER DATABASE postgres SET "app.telegram_bot_token" = '<YOUR_BOT_TOKEN>';
--
-- SECURITY NOTE: a Telegram bot token was previously committed to git history
-- in this repository. Revoke it via @BotFather (/revoke) before going live.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PLAYERS: extend with persistent progression + identity
-- ---------------------------------------------------------------------------
alter table public.players add column if not exists avatar_url text;
alter table public.players add column if not exists status text not null default 'active';
alter table public.players add column if not exists total_score bigint not null default 0;
alter table public.players add column if not exists xp bigint not null default 0;
alter table public.players add column if not exists level int not null default 1;
alter table public.players add column if not exists lifetime_battles int not null default 0;
alter table public.players add column if not exists lifetime_wins int not null default 0;
alter table public.players add column if not exists best_accuracy int not null default 0;
alter table public.players add column if not exists best_combo int not null default 0;
alter table public.players add column if not exists referral_code text unique;
alter table public.players add column if not exists referred_by uuid references public.players(id);
alter table public.players add column if not exists last_claim_at timestamptz not null default now();
alter table public.players add column if not exists last_active_at timestamptz not null default now();
create index if not exists players_total_score_idx on public.players (total_score desc);

-- ---------------------------------------------------------------------------
-- 2. RESOURCES + LEDGER (transactional architecture)
-- ---------------------------------------------------------------------------
create table if not exists public.player_resources (
  player_id uuid primary key references public.players(id) on delete cascade,
  fighters numeric not null default 12,
  provisions numeric not null default 40,
  morale numeric not null default 20,
  updated_at timestamptz not null default now()
);
create table if not exists public.resource_ledger (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  resource_type text not null check (resource_type in ('fighters','provisions','morale')),
  amount_delta numeric not null,
  reason text not null,
  source_type text,
  source_id text,
  created_at timestamptz not null default now()
);
create index if not exists resource_ledger_player_idx on public.resource_ledger (player_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. CAMP BUILDINGS
-- ---------------------------------------------------------------------------
create table if not exists public.buildings (
  building_key text primary key,
  name_en text not null,
  name_am text not null,
  produces text not null check (produces in ('fighters','provisions','morale')),
  base_cost numeric not null,
  base_rate numeric not null,
  cost_resource text not null check (cost_resource in ('fighters','provisions','morale')),
  max_level int not null default 200
);
insert into public.buildings (building_key, name_en, name_am, produces, base_cost, base_rate, cost_resource) values
  ('recruit_post', 'Recruit Post', 'የቅጥር ጣቢያ',   'fighters',   20, 0.6, 'provisions'),
  ('grain_store',  'Grain Store',  'የእህል መጋዘን',  'provisions', 15, 1.0, 'morale'),
  ('council_tent', 'Council Tent', 'የምክር ድንኳን',  'morale',     25, 0.5, 'fighters')
on conflict (building_key) do nothing;

create table if not exists public.player_buildings (
  player_id uuid not null references public.players(id) on delete cascade,
  building_key text not null references public.buildings(building_key),
  level int not null default 0 check (level >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, building_key)
);

-- ---------------------------------------------------------------------------
-- 4. CAMPAIGN STAGES (static seed content — legitimate, not mock user data)
--    NEEDS HISTORIAN REVIEW: all historical framing below must be verified
--    by a historian before public launch. Combat framing is abstract.
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_stages (
  id int primary key,
  chapter_number int not null,
  title_en text not null,
  title_am text not null,
  description_en text not null,
  description_am text not null,
  battle_type text not null check (battle_type in ('formation','sniper')),
  enemy_power int not null,
  reward_config jsonb not null,
  score_reward int not null,
  historical_note text not null default 'NEEDS HISTORIAN REVIEW',
  active boolean not null default true
);
insert into public.campaign_stages (id, chapter_number, title_en, title_am, description_en, description_am, battle_type, enemy_power, reward_config, score_reward, historical_note) values
 (1,1,'The Highland Muster','የተራራው ስብስብ','Word spreads across the plateau. Farmers and herders answer the call to defend their homeland.','ዜናው በተራራው ላይ ተሰራጨ። ገበሬዎችና እረኞች አገራቸውን ለመከላከል ጥሪውን መለሱ።','formation',40,'{"provisions":60,"morale":30}',100,'NEEDS HISTORIAN REVIEW: general mobilization framing, no specific claims.'),
 (2,2,'The Mountain Pass','የተራራው መተላለፊያ','A narrow pass must be held. Terrain favors the defenders who know every ridge.','ጠባቡ መተላለፊያ መያዝ አለበት። መልክዓ ምድሩ ለተከላካዮች ይጠቅማል።','sniper',70,'{"fighters":25,"morale":40}',140,'NEEDS HISTORIAN REVIEW: terrain-based defense is illustrative.'),
 (3,3,'Supply Lines','የስንቅ መስመሮች','Guard the caravans carrying grain and gunpowder to the front.','ወደ ግንባር እህልና ባሩድ የሚያጓጉዙ ተሽከርካሪዎችን ጠብቅ።','formation',100,'{"provisions":120,"fighters":20}',180,'NEEDS HISTORIAN REVIEW: logistics theme is generic.'),
 (4,4,'The River Crossing','የወንዙ መሻገሪያ','Formations must cross swollen highland rivers before the rains close the fords.','ዝናቡ ከመዝጋቱ በፊት ወንዞችን መሻገር አለባቸው።','sniper',135,'{"morale":90,"provisions":60}',220,'NEEDS HISTORIAN REVIEW: seasonal logistics are illustrative.'),
 (5,5,'The Long Watch','ረዥም ጥበቃ','Scouts track movements across the ranges through cold nights.','ተመልካቾች በቀዝቃዛ ሌሊቶች እንቅስቃሴዎችን ይከታተላሉ።','formation',175,'{"fighters":45,"morale":60}',260,'NEEDS HISTORIAN REVIEW: reconnaissance theme is generic.'),
 (6,6,'Rally of the Regiments','የክፍለ ጦሮች ስብሰባ','Separate formations unite under a shared banner for the decisive stand.','የተለያዩ ክፍሎች በአንድ ባንዲራ ስር ተባበሩ።','formation',230,'{"provisions":150,"morale":100}',320,'NEEDS HISTORIAN REVIEW: regiments are fictional/campaign names.'),
 (7,7,'Eve of Adwa','የዐድዋ ዋዜማ','The largest force yet assembles on the plains near Adwa. Resolve is tested.','እስካሁን ትልቁ ኃይል በዐድዋ አቅራቢያ ተሰበሰበ።','sniper',300,'{"fighters":70,"morale":140}',400,'NEEDS HISTORIAN REVIEW: lead-up to Adwa 1896; verify dates and framing.'),
 (8,8,'The Day at Adwa','የዐድዋ ቀን','1 March 1896 — remembered as a landmark victory and a source of shared national pride. Presented respectfully and abstractly.','የ1896 ድል — እንደ ብሔራዊ ኩራት ምንጭ ይታወሳል።','formation',380,'{"fighters":120,"provisions":200,"morale":200}',600,'NEEDS HISTORIAN REVIEW: Battle of Adwa (1 March 1896); verify all claims.')
on conflict (id) do update set
  chapter_number = excluded.chapter_number,
  title_en = excluded.title_en,
  title_am = excluded.title_am,
  description_en = excluded.description_en,
  description_am = excluded.description_am,
  battle_type = excluded.battle_type,
  enemy_power = excluded.enemy_power,
  reward_config = excluded.reward_config,
  score_reward = excluded.score_reward,
  historical_note = excluded.historical_note;

create table if not exists public.player_campaign (
  player_id uuid not null references public.players(id) on delete cascade,
  stage_id int not null references public.campaign_stages(id),
  first_completed_at timestamptz,
  best_score int not null default 0,
  best_accuracy int not null default 0,
  best_combo int not null default 0,
  completion_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, stage_id)
);

-- ---------------------------------------------------------------------------
-- 5. BATTLE SESSIONS (server-owned truth for every battle)
-- ---------------------------------------------------------------------------
create table if not exists public.battle_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  stage_id int not null references public.campaign_stages(id),
  battle_type text not null,
  seed bigint not null,
  status text not null default 'created' check (status in ('created','active','submitted','validated','completed','expired','rejected')),
  targets jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  validated_at timestamptz,
  authoritative_score int not null default 0,
  accuracy int not null default 0,
  best_combo int not null default 0,
  hits int not null default 0,
  shots int not null default 0,
  result text check (result in ('victory','defeat','abandoned','rejected')),
  validation_version int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists battle_sessions_player_idx on public.battle_sessions (player_id, started_at desc);
-- Direct client access denied; all interaction goes through RPCs.
alter table public.battle_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- 6. TRIVIA (questions seeded server-side; correct answers validated there)
--    NEEDS HISTORIAN REVIEW: verify every question against cited sources.
-- ---------------------------------------------------------------------------
create table if not exists public.trivia_questions (
  id int primary key,
  question_en text not null,
  question_am text not null,
  options_en jsonb not null,
  options_am jsonb not null,
  correct_index int not null,
  explanation_en text,
  explanation_am text,
  source_note text not null default 'NEEDS HISTORIAN REVIEW',
  active boolean not null default true
);
insert into public.trivia_questions (id, question_en, question_am, options_en, options_am, correct_index, source_note) values
 (1,'In what year was the Battle of Adwa fought?','የዐድዋ ጦርነት በየትኛው ዓመት ተካሄደ?','["1878","1889","1896","1913"]','["1878","1889","1896","1913"]',2,'NEEDS HISTORIAN REVIEW: commonly cited as 1 March 1896.'),
 (2,'The Battle of Adwa took place in which region of present-day Ethiopia?','የዐድዋ ጦርነት በአሁኑ ኢትዮጵያ በየትኛው ክልል ተካሄደ?','["Tigray","Sidama","Gambela","Afar"]','["ትግራይ","ሲዳማ","ጋምቤላ","አፋር"]',0,'NEEDS HISTORIAN REVIEW: Adwa is located in the Tigray region.'),
 (3,'What is the capital city of Ethiopia?','የኢትዮጵያ ዋና ከተማ ማን ናት?','["Gondar","Addis Ababa","Axum","Harar"]','["ጎንደር","አዲስ አበባ","አክሱም","ሐረር"]',1,'NEEDS HISTORIAN REVIEW: Addis Ababa founded in the late 19th century.'),
 (4,'Which script is traditionally used to write Amharic?','አማርኛን ለመጻፍ በባህላዊ የሚጠቀመው ፊደል የትኛው ነው?','["Latin","Ge''ez (Fidel)","Arabic","Cyrillic"]','["ላቲን","ግዕዝ (ፊደል)","ዓረብኛ","ሲሪሊክ"]',1,'NEEDS HISTORIAN REVIEW: Amharic uses the Ge''ez script.'),
 (5,'The anniversary of the Battle of Adwa is commemorated in which month?','የዐድዋ ድል መታሰቢያ በየትኛው ወር ይከበራል?','["January","March","July","November"]','["ጥር","መጋቢት","ሐምሌ","ኅዳር"]',1,'NEEDS HISTORIAN REVIEW: commemorated in early March.'),
 (6,'Which ancient city is famous for its towering carved stelae (obelisks)?','በተቀረጹ ረዣዥም ሐውልቶች የምትታወቀው ጥንታዊ ከተማ የትኛዋ ናት?','["Lalibela","Axum","Dire Dawa","Bahir Dar"]','["ላሊበላ","አክሱም","ድሬዳዋ","ባህር ዳር"]',1,'NEEDS HISTORIAN REVIEW: Axum is known for its ancient stelae.'),
 (7,'Ethiopia''s highland plateau is drained by a major tributary of which river?','የኢትዮጵያ ደጋማ አካባቢ ውሃ የሚፈሰው ወደ የትኛው ወንዝ ነው?','["Congo","Nile","Niger","Zambezi"]','["ኮንጎ","ናይል","ኒጀር","ዛምቤዚ"]',1,'NEEDS HISTORIAN REVIEW: the Blue Nile rises in the Ethiopian highlands.'),
 (8,'Which staple grain, native to Ethiopia, is used to make injera?','እንጀራ ለመስራት የሚያገለግለው የኢትዮጵያ ተወላጅ እህል የትኛው ነው?','["Teff","Rice","Barley","Maize"]','["ጤፍ","ሩዝ","ገብስ","በቆሎ"]',0,'NEEDS HISTORIAN REVIEW: teff is an indigenous Ethiopian grain.'),
 (9,'How many colors are on the traditional Ethiopian tricolor?','በባህላዊ የኢትዮጵያ ባንዲራ ላይ ስንት ቀለሞች አሉ?','["Two","Three","Four","Five"]','["ሁለት","ሶስት","አራት","አምስት"]',1,'NEEDS HISTORIAN REVIEW: green, yellow, and red tricolor.'),
 (10,'The rock-hewn churches celebrated as a heritage site are located at which town?','በቅርስነት የሚታወቁት ከድንጋይ የተፈለፈሉ አብያተ ክርስቲያናት የት ይገኛሉ?','["Lalibela","Adwa","Jimma","Mekelle"]','["ላሊበላ","ዐድዋ","ጅማ","መቀሌ"]',0,'NEEDS HISTORIAN REVIEW: Lalibela''s rock-hewn churches.')
on conflict (id) do nothing;

create table if not exists public.trivia_attempts (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  question_id int not null references public.trivia_questions(id),
  answer_index int not null,
  correct boolean not null,
  rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (player_id, question_id)
);

-- ---------------------------------------------------------------------------
-- 7. REFERRALS + ACHIEVEMENTS + ANTI-CHEAT
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  inviter_id uuid not null references public.players(id),
  invitee_id uuid not null unique references public.players(id),
  referral_code text not null,
  reward_status text not null default 'granted' check (reward_status in ('pending','granted','denied')),
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id text primary key,
  name_en text not null,
  name_am text not null,
  description_en text not null,
  description_am text not null,
  emblem text not null default 'flag',
  stage_required int
);
insert into public.achievements (id, name_en, name_am, description_en, description_am, emblem, stage_required) values
 ('first_muster','The First Muster','የመጀመሪያ ስብስብ','Cleared Chapter 1.','ምዕራፍ 1 አጠናቀቁ።','flag',1),
 ('pass_holder','Keeper of the Pass','የመተላለፊያ ጠባቂ','Cleared Chapter 2.','ምዕራፍ 2 አጠናቀቁ።','mountain',2),
 ('quartermaster','Quartermaster','የስንቅ አስተዳዳሪ','Cleared Chapter 3.','ምዕራፍ 3 አጠናቀቁ።','wheat',3),
 ('banner_bearer','Banner Bearer','ባንዲራ ተሸካሚ','Cleared Chapter 6 and united the regiments.','ምዕራፍ 6 አጠናቀቁ።','banner',6),
 ('adwa_star','Star of Adwa','የዐድዋ ኮከብ','Cleared the final chapter. A collectible emblem of shared pride.','የመጨረሻውን ምዕራፍ አጠናቀቁ።','star',8)
on conflict (id) do nothing;

create table if not exists public.player_achievements (
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

create table if not exists public.anti_cheat_events (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  battle_session_id uuid references public.battle_sessions(id) on delete set null,
  event_type text not null,
  severity text not null default 'low' check (severity in ('low','medium','high')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS: player-scoped read access only; mutations flow exclusively through RPCs.
alter table public.player_resources enable row level security;
alter table public.resource_ledger enable row level security;
alter table public.player_buildings enable row level security;
alter table public.campaign_stages enable row level security;
alter table public.player_campaign enable row level security;
alter table public.trivia_questions enable row level security;
alter table public.trivia_attempts enable row level security;
alter table public.referrals enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
alter table public.anti_cheat_events enable row level security;

drop policy if exists "campaign stages readable" on public.campaign_stages;
create policy "campaign stages readable" on public.campaign_stages for select using (true);
drop policy if exists "trivia questions readable" on public.trivia_questions;
create policy "trivia questions readable" on public.trivia_questions for select using (true);
drop policy if exists "achievements readable" on public.achievements;
create policy "achievements readable" on public.achievements for select using (true);
drop policy if exists "resources own row" on public.player_resources;
create policy "resources own row" on public.player_resources for select using (auth.uid() = player_id);
drop policy if exists "buildings own row" on public.player_buildings;
create policy "buildings own row" on public.player_buildings for select using (auth.uid() = player_id);
drop policy if exists "campaign own row" on public.player_campaign;
create policy "campaign own row" on public.player_campaign for select using (auth.uid() = player_id);
drop policy if exists "ledger own row" on public.resource_ledger;
create policy "ledger own row" on public.resource_ledger for select using (auth.uid() = player_id);
drop policy if exists "trivia attempts own row" on public.trivia_attempts;
create policy "trivia attempts own row" on public.trivia_attempts for select using (auth.uid() = player_id);
drop policy if exists "badges own row" on public.player_achievements;
create policy "badges own row" on public.player_achievements for select using (auth.uid() = player_id);

-- ===========================================================================
-- SERVER-AUTHORITATIVE GAME LOGIC (security definer RPCs)
-- The client renders; these functions decide.
-- Drop-first: CREATE OR REPLACE cannot change a function's return type, so any
-- older/differently-shaped definition is removed before recreation. This keeps
-- re-runs safe on databases where an earlier partial/legacy version exists.
-- ===========================================================================

drop function if exists public.game_init_state();
drop function if exists public.game_link_telegram(text);
drop function if exists public.game_gather(text);
drop function if exists public.game_gather(text, int);
drop function if exists public.game_upgrade_building(text);
drop function if exists public.game_claim_passive();
drop function if exists public.game_start_battle(int);
drop function if exists public.game_submit_battle(uuid, jsonb, text);
drop function if exists public.game_submit_trivia(int, int);
drop function if exists public.game_process_referral(text);
drop function if exists public.game_get_leaderboard(text);
drop function if exists private_game.lcg_next(bigint);
drop function if exists private_game.lcg_frac(bigint);
drop function if exists private_game.build_sniper_targets(bigint, int);
drop function if exists private_game.ensure_player_rows();

create schema if not exists private_game;

-- Deterministic LCG step derived from a session seed (pure: state in → next state out).
create or replace function private_game.lcg_next(state bigint)
returns bigint language sql immutable as $$
  select (state * 1103515245 + 12345) % 2147483648;
$$;

-- Fraction in [0,1) from an LCG state value.
create or replace function private_game.lcg_frac(state bigint)
returns double precision language sql immutable as $$
  select state::double precision / 2147483648.0;
$$;

-- Build the deterministic sniper target schedule from the session seed and
-- stage difficulty. The client renders exactly this schedule; the validator
-- checks every submitted action against it.
create or replace function private_game.build_sniper_targets(
  p_seed bigint,
  p_difficulty int
) returns jsonb language plpgsql immutable as $$
declare
  v_state bigint := p_seed % 2147483647;
  v_rnd double precision;
  v_waves int;
  v_per_wave int;
  v_lanes jsonb := '[[18,28],[48,42],[82,32],[26,62],[74,58],[50,18],[34,76],[66,70],[24,46],[78,48]]';
  v_lane_count int := 10;
  v_targets jsonb := '[]'::jsonb;
  v_i int := 0;
  v_j int;
  v_order int[];
  v_tmp int;
  v_swap_idx int;
  v_spawn_ms int;
  v_tier text;
  v_lifetime int;
  v_value int;
  v_gap_base int;
  v_total int;
begin
  v_waves := 3 + case when p_difficulty >= 4 then 1 else 0 end + case when p_difficulty >= 7 then 1 else 0 end;
  v_per_wave := 4 + least(2, p_difficulty / 3);
  v_total := v_waves * v_per_wave;
  -- Spawn pacing tightens with difficulty (3500ms wave gap down to ~2600ms).
  v_gap_base := 3600 - least(900, p_difficulty * 110);

  for v_i in 0..(v_total - 1) loop
    -- Shuffle of lane indices per target slot (seeded).
    v_order := array(select g from generate_series(0, v_lane_count - 1) g);
    for v_j in reverse v_lane_count - 1..1 loop
      v_state := private_game.lcg_next(v_state);
      v_rnd := private_game.lcg_frac(v_state);
      v_swap_idx := 1 + floor(v_rnd * (v_j + 1))::int;
      v_tmp := v_order[v_swap_idx];
      v_order[v_swap_idx] := v_order[1 + v_j];
      v_order[1 + v_j] := v_tmp;
    end loop;

    v_state := private_game.lcg_next(v_state);
    v_rnd := private_game.lcg_frac(v_state);
    v_tier := case when v_rnd < 0.16 then 'armored' when v_rnd < 0.32 then 'fast' else 'normal' end;
    v_lifetime := case v_tier
      when 'armored' then 2600 - p_difficulty * 60
      when 'fast'    then 1400 - p_difficulty * 40
      else                2300 - p_difficulty * 80 end;
    v_lifetime := greatest(700, v_lifetime);
    v_value := case v_tier when 'armored' then 150 when 'fast' then 200 else 100 end;
    v_spawn_ms := (v_i / v_per_wave) * v_gap_base + (v_i % v_per_wave) * 420 + 600;

    v_targets := v_targets || jsonb_build_object(
      'id', 't' || (v_i + 1),
      'x', v_lanes->(v_order[0])->0,
      'y', v_lanes->(v_order[0])->1,
      'spawnMs', v_spawn_ms,
      'lifetimeMs', v_lifetime,
      'tier', v_tier,
      'value', v_value
    );
  end loop;
  return jsonb_build_object('targets', v_targets, 'durationMs',
    ((v_total - 1) / v_per_wave) * v_gap_base + 420 * (v_per_wave - 1) + 600 + 2600 + 1500,
    'comboWindowMs', 1500, 'minHitRatio', 0.5);
end;
$$;

-- Ensure every player has baseline rows; import legacy JSON-blob state once.
create or replace function private_game.ensure_player_rows()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_legacy jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  insert into public.players (id) values (v_uid)
  on conflict (id) do nothing;

  update public.players
     set referral_code = coalesce(referral_code, 'Z' || upper(substr(encode(gen_random_bytes(6),'hex'), 1, 8))),
         last_active_at = now()
   where id = v_uid;

  insert into public.player_resources (player_id) values (v_uid)
  on conflict (player_id) do nothing;

  -- One-time legacy migration from the old player_states JSON blob.
  if not exists (select 1 from public.resource_ledger where player_id = v_uid) then
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
    insert into public.resource_ledger (player_id, resource_type, amount_delta, reason, source_type)
    values (v_uid, 'provisions', 0, 'legacy_import', 'migration');
  end if;
end;
$$;

create or replace function public.game_init_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_res public.player_resources;
  v_player public.players;
begin
  perform private_game.ensure_player_rows();

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
-- Requires first running, as project owner in the SQL editor:
--   ALTER DATABASE postgres SET "app.telegram_bot_token" = '<token>';
create or replace function public.game_link_telegram(p_init_data text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_token text := current_setting('app.telegram_bot_token', true);
  v_pairs text[];
  v_pair text;
  v_hash text := '';
  v_data_check text[] := '{}';
  v_secret bytea;
  v_computed text;
  v_tid text;
  v_username text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_init_data is null or p_init_data = '' then
    return jsonb_build_object('linked', false, 'reason', 'missing_input');
  end if;
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

  v_secret := hmac('WebAppData', v_token, 'sha256');
  v_computed := encode(hmac(array_to_string(v_data_check, chr(10)), v_secret, 'sha256'), 'hex');

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
create or replace function public.game_gather(p_resource text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_gain numeric;
  v_res public.player_resources;
  v_recent int;
begin
  perform private_game.ensure_player_rows();
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
create or replace function public.game_upgrade_building(p_building_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_b public.buildings;
  v_level int;
  v_cost numeric;
  v_res public.player_resources;
begin
  perform private_game.ensure_player_rows();
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
create or replace function public.game_claim_passive()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_elapsed numeric;
  v_res public.player_resources;
  r record;
begin
  perform private_game.ensure_player_rows();

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
create or replace function public.game_start_battle(p_stage_id int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
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
  perform private_game.ensure_player_rows();

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
    v_encounter := '{"targets": []}'::jsonb;
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
create or replace function public.game_submit_battle(
  p_session_id uuid,
  p_actions jsonb,
  p_formation text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
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
  perform private_game.ensure_player_rows();

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
create or replace function public.game_submit_trivia(p_question_id int, p_answer_index int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_q public.trivia_questions;
  v_correct boolean;
  v_already boolean;
  v_res public.player_resources;
begin
  perform private_game.ensure_player_rows();
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
create or replace function public.game_process_referral(p_referral_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_inviter public.players;
  v_res public.player_resources;
begin
  perform private_game.ensure_player_rows();
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
create or replace function public.game_get_leaderboard(p_kind text default 'global')
returns table (player_id uuid, name text, score bigint, player_rank bigint)
language sql security definer set search_path = '' stable as $$
  select p.id, p.display_name, p.total_score,
         rank() over (order by p.total_score desc)
    from public.players p
   where case
     when p_kind = 'friends' then
       p.id = auth.uid()
       or p.referred_by = auth.uid()
       or p.id = (select referred_by from public.players where id = auth.uid())
     else true end
     and p.total_score > 0
   order by p.total_score desc
   limit 50;
$$;

grant execute on function public.game_init_state() to authenticated;
grant execute on function public.game_link_telegram(text) to authenticated;
grant execute on function public.game_gather(text) to authenticated;
grant execute on function public.game_upgrade_building(text) to authenticated;
grant execute on function public.game_claim_passive() to authenticated;
grant execute on function public.game_start_battle(int) to authenticated;
grant execute on function public.game_submit_battle(uuid, jsonb, text) to authenticated;
grant execute on function public.game_submit_trivia(int, int) to authenticated;
grant execute on function public.game_process_referral(text) to authenticated;
grant execute on function public.game_get_leaderboard(text) to authenticated;
