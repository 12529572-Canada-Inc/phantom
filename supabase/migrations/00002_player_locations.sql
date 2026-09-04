-- Store only each player's latest precise location outside the publicly
-- readable players table.
create table public.player_locations (
  player_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz default now() not null
);

alter table public.player_locations enable row level security;

revoke all on table public.player_locations from anon;
grant select, insert, update, delete on public.player_locations to authenticated;

create policy "Player location read self"
on public.player_locations
for select
to authenticated
using ((select auth.uid()) = player_id);

create policy "Player location insert self"
on public.player_locations
for insert
to authenticated
with check ((select auth.uid()) = player_id);

create policy "Player location update self"
on public.player_locations
for update
to authenticated
using ((select auth.uid()) = player_id)
with check ((select auth.uid()) = player_id);

create policy "Player location delete self"
on public.player_locations
for delete
to authenticated
using ((select auth.uid()) = player_id);
