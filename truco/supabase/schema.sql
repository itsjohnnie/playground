-- Truco — Supabase schema
-- Run this once in the Supabase SQL editor.
-- Source of truth: truco/DESIGN.md §5.1

-- ─── Tables ─────────────────────────────────────────────────────

create table if not exists players (
  id          text primary key,                       -- ULID-ish, generated client-side
  name        text not null,
  joined_at   timestamptz not null default now(),
  retired_at  timestamptz
);

create table if not exists matches (
  id                  text primary key,
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  team_a_name         text not null,
  team_a_player_ids   text[] not null,
  team_b_name         text not null,
  team_b_player_ids   text[] not null,
  score_a             int  not null default 0,
  score_b             int  not null default 0,
  winner              text,                            -- 'A' | 'B' | null
  abandoned           bool not null default false
);

create table if not exists events (
  id          bigserial primary key,
  match_id    text not null references matches(id) on delete cascade,
  team        text not null check (team in ('A', 'B')),
  points      int  not null,
  reason      text not null,
  round_mode  text not null check (round_mode in ('redondo', 'picapica')),
  at          timestamptz not null default now()
);

create index if not exists events_match_id_idx on events (match_id, at);
create index if not exists matches_started_at_idx on matches (started_at desc);

-- Single-row "current state" pointer (which match is active).
create table if not exists app_state (
  id                text primary key default 'singleton' check (id = 'singleton'),
  active_match_id   text references matches(id) on delete set null
);
insert into app_state (id, active_match_id)
values ('singleton', null)
on conflict (id) do nothing;

-- ─── Row-level security ────────────────────────────────────────
-- Anonymous = full access. The Supabase URL itself is the access
-- credential. Suitable for an internal app shared with friends.

alter table players   enable row level security;
alter table matches   enable row level security;
alter table events    enable row level security;
alter table app_state enable row level security;

drop policy if exists "anon full" on players;
drop policy if exists "anon full" on matches;
drop policy if exists "anon full" on events;
drop policy if exists "anon full" on app_state;

create policy "anon full" on players   for all to anon using (true) with check (true);
create policy "anon full" on matches   for all to anon using (true) with check (true);
create policy "anon full" on events    for all to anon using (true) with check (true);
create policy "anon full" on app_state for all to anon using (true) with check (true);

-- ─── Realtime ──────────────────────────────────────────────────
-- Publish all four tables so subscribers get postgres_changes events.

alter publication supabase_realtime add table players;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table app_state;
