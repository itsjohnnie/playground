-- Truco — profile fields + avatar storage
-- Run this once in the Supabase SQL editor, after schema.sql.
-- Adds optional profile columns to `players` and an `avatars` storage
-- bucket (public read, anon write — same trust model as the app's RLS).

-- ─── Profile columns ───────────────────────────────────────────
alter table players
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists phone      text,
  add column if not exists photo_url  text,
  add column if not exists venmo      text,
  add column if not exists zelle      text;

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
  to anon
  using (bucket_id = 'avatars');

create policy "anon insert avatars"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'avatars');

create policy "anon update avatars"
  on storage.objects for update
  to anon
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "anon delete avatars"
  on storage.objects for delete
  to anon
  using (bucket_id = 'avatars');
