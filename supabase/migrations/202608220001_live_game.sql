-- Zemene Arbegnoch: authenticated, per-player persistence and event trail.
-- Run with `supabase db push` (or paste into the Supabase SQL editor) before release.
-- Anonymous sign-ins must be enabled in Supabase Auth for Telegram Mini App guests.

create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_id text unique,
  display_name text not null default 'Arbegna',
  language_pref text not null default 'am' check (language_pref in ('am', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_states (
  user_id uuid primary key references public.players(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.players(id) on delete cascade,
  event_type text not null check (char_length(event_type) <= 64),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_events_user_created_idx on public.game_events (user_id, created_at desc);

alter table public.players enable row level security;
alter table public.player_states enable row level security;
alter table public.game_events enable row level security;

drop policy if exists "players own row" on public.players;
create policy "players own row" on public.players for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "state own row" on public.player_states;
create policy "state own row" on public.player_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "events own row" on public.game_events;
create policy "events own row" on public.game_events for select using (auth.uid() = user_id);
create policy "events insert own row" on public.game_events for insert with check (auth.uid() = user_id);

-- Keep updated_at server-authored on every upsert.
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists players_updated_at on public.players;
create trigger players_updated_at before update on public.players for each row execute function public.touch_updated_at();
drop trigger if exists player_states_updated_at on public.player_states;
create trigger player_states_updated_at before update on public.player_states for each row execute function public.touch_updated_at();
