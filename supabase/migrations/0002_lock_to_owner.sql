-- ============================================================
-- 0002 — Lock data to a single owner + add Strava detail columns
--
-- BEFORE RUNNING: replace OWNER_UID_HERE (both occurrences of the
-- placeholder below) with your own auth user id. Find it in the Supabase
-- dashboard under Authentication > Users — click your user, copy the UID.
--
-- ALSO DO THIS (dashboard, not SQL): Authentication > Providers > Email >
-- turn OFF "Enable sign ups". Otherwise a stranger can still create an
-- account; these policies stop them seeing your data, but there's no reason
-- to allow the account in the first place.
-- ============================================================

-- ---------- Extra columns for richer Strava data ----------
alter table workouts add column if not exists elevation_m numeric;
alter table workouts add column if not exists avg_hr numeric;
alter table workouts add column if not exists strava_activity_url text;

-- Preview-only fields that should also persist server-side
alter table plan_meta add column if not exists rest_days smallint[] default '{5,6}';
alter table plan_meta add column if not exists goal_pace_min_per_km numeric;
alter table plan_meta add column if not exists unit text default 'km';
alter table plan_meta add column if not exists dismissed_missed text[] default '{}';

-- ---------- Replace the "any authenticated user" policies ----------
drop policy if exists "auth read workouts"   on workouts;
drop policy if exists "auth insert workouts" on workouts;
drop policy if exists "auth update workouts" on workouts;
drop policy if exists "auth delete workouts" on workouts;
drop policy if exists "auth read plan_meta"   on plan_meta;
drop policy if exists "auth insert plan_meta" on plan_meta;
drop policy if exists "auth update plan_meta" on plan_meta;
drop policy if exists "auth read app_status"  on app_status;

-- Single-owner policies. Replace the UUID below with your own user id.
create policy "owner all workouts" on workouts
  for all
  using      (auth.uid() = 'OWNER_UID_HERE'::uuid)
  with check (auth.uid() = 'OWNER_UID_HERE'::uuid);

create policy "owner all plan_meta" on plan_meta
  for all
  using      (auth.uid() = 'OWNER_UID_HERE'::uuid)
  with check (auth.uid() = 'OWNER_UID_HERE'::uuid);

create policy "owner read app_status" on app_status
  for select
  using (auth.uid() = 'OWNER_UID_HERE'::uuid);

-- strava_tokens intentionally still has NO client policies at all.
-- Only Edge Functions (service role) can read or write it.
