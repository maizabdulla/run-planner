-- ============================================================
-- Half Marathon Plan — Supabase schema
-- Run this in Supabase Dashboard > SQL Editor (or via `supabase db push`)
-- ============================================================

create table if not exists workouts (
  id text primary key,
  week int not null,
  phase text not null,
  type text not null,
  title text not null,
  detail text not null,
  km numeric,
  circuit text,
  date date not null,
  done boolean not null default false,
  strava_activity_id bigint,
  actual_distance_km numeric,
  actual_duration_sec int
);

create table if not exists plan_meta (
  id int primary key default 1,
  start_date date not null,
  check (id = 1)
);

-- Strava tokens are only ever read/written by Edge Functions using the
-- service role key. The browser (anon key) must never see these.
create table if not exists strava_tokens (
  id int primary key default 1,
  access_token text,
  refresh_token text,
  expires_at bigint,
  athlete_id bigint,
  check (id = 1)
);

-- Lightweight status flags the frontend IS allowed to read,
-- so it can show "Connected" without ever touching the raw tokens.
create table if not exists app_status (
  id int primary key default 1,
  strava_connected boolean not null default false,
  last_synced_at timestamptz,
  check (id = 1)
);
insert into app_status (id, strava_connected) values (1, false)
  on conflict (id) do nothing;

-- ---------- Row Level Security ----------
alter table workouts enable row level security;
alter table plan_meta enable row level security;
alter table strava_tokens enable row level security;
alter table app_status enable row level security;

-- This is a personal, single-user app: any authenticated user (i.e. you,
-- once logged in via Supabase Auth) gets full read/write on your own data.
create policy "auth read workouts" on workouts for select using (auth.role() = 'authenticated');
create policy "auth insert workouts" on workouts for insert with check (auth.role() = 'authenticated');
create policy "auth update workouts" on workouts for update using (auth.role() = 'authenticated');
create policy "auth delete workouts" on workouts for delete using (auth.role() = 'authenticated');

create policy "auth read plan_meta" on plan_meta for select using (auth.role() = 'authenticated');
create policy "auth insert plan_meta" on plan_meta for insert with check (auth.role() = 'authenticated');
create policy "auth update plan_meta" on plan_meta for update using (auth.role() = 'authenticated');

create policy "auth read app_status" on app_status for select using (auth.role() = 'authenticated');

-- No client (browser) policies on strava_tokens at all — it stays
-- completely inaccessible except to Edge Functions via the service role key.
