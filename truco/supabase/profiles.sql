-- Truco — profile fields + auth + avatar storage
-- Run this once in the Supabase SQL editor, after schema.sql.
--
-- Trust model:
--   • Reads stay open: any anon visitor sees the roster.
--   • Inserts/deletes stay open: anyone in the mesa can add or remove players.
--   • Updates are gated: a player row is "claimed" by setting auth_user_id;
--     only the claimant (or anyone, if still unclaimed) can update fields.
--   • Avatars bucket is public-read, anon-write — same trust model as before.

-- ─── Profile + ownership columns ───────────────────────────────
alter table players
  add column if not exists first_name    text,
  add column if not exists last_name     text,
  add column if not exists phone         text,
  add column if not exists photo_url     text,
  add column if not exists venmo         text,
  add column if not exists zelle         text,
  add column if not exists auth_user_id  uuid references auth.users(id) on delete set null;

create index if not exists players_auth_user_id_idx on players (auth_user_id);

-- ─── Replace the wide-open players RLS with claim-aware policies ──
drop policy if exists "anon full"          on players;
drop policy if exists "all read players"   on players;
drop policy if exists "anon insert players" on players;
drop policy if exists "self update players" on players;
drop policy if exists "anon delete players" on players;

-- Read: anyone (anon or authed) can see the full roster.
create policy "all read players"
  on players for select
  to anon, authenticated
  using (true);

-- Insert: anyone can add a new player to the mesa.
create policy "anon insert players"
  on players for insert
  to anon, authenticated
  with check (true);

-- Update: only the claimant. Unclaimed rows are updateable by anyone
-- (so anyone can claim, and so anon visitors can still rename / retire
-- never-claimed players the same way they do today). Once a row has an
-- auth_user_id, only that user can mutate it.
create policy "self update players"
  on players for update
  to anon, authenticated
  using (auth_user_id is null or auth_user_id = auth.uid())
  with check (auth_user_id is null or auth_user_id = auth.uid());

-- Delete: same gate as update — only the claimant can hard-delete a
-- claimed player. Unclaimed rows remain deletable by anyone.
create policy "self delete players"
  on players for delete
  to anon, authenticated
  using (auth_user_id is null or auth_user_id = auth.uid());

-- ─── Storage: avatars bucket ───────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "anon read avatars"   on storage.objects;
drop policy if exists "anon insert avatars" on storage.objects;
drop policy if exists "anon update avatars" on storage.objects;
drop policy if exists "anon delete avatars" on storage.objects;

create policy "anon read avatars"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "anon insert avatars"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'avatars');

create policy "anon update avatars"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "anon delete avatars"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'avatars');
