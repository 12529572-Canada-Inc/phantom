-- Enable PostGIS for location queries
create extension if not exists postgis;

-- Players table
create table public.players (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  team_id uuid references public.teams(id),
  score integer default 0 not null,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Teams table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text not null,
  score integer default 0 not null,
  created_at timestamptz default now()
);

-- Zones table (capture points)
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location geography(Point, 4326) not null,
  radius_meters integer default 50 not null,
  captured_by uuid references public.teams(id),
  captured_at timestamptz,
  created_at timestamptz default now()
);

-- Capture events log
create table public.capture_events (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.zones(id) not null,
  player_id uuid references public.players(id) not null,
  team_id uuid references public.teams(id) not null,
  captured_at timestamptz default now()
);

-- RLS
alter table public.players enable row level security;
alter table public.zones enable row level security;
alter table public.capture_events enable row level security;
alter table public.teams enable row level security;

-- Public read for zones + teams + leaderboard
create policy "Public read zones" on public.zones for select using (true);
create policy "Public read teams" on public.teams for select using (true);
create policy "Public read players" on public.players for select using (true);
create policy "Public read captures" on public.capture_events for select using (true);

-- Players can update their own record
create policy "Player update self" on public.players for update using (auth.uid() = id);
