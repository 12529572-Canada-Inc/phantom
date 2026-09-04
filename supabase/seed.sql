begin;

insert into public.teams (id, name, color, score)
values
  ('10000000-0000-4000-8000-000000000001', 'Signal Keepers', '#A78BFA', 125),
  ('10000000-0000-4000-8000-000000000002', 'Void Walkers', '#22D3EE', 80)
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  score = excluded.score;

insert into public.players (id, username, team_id, score)
values
  (:'player_one', 'night_seer', '10000000-0000-4000-8000-000000000001', 75),
  (:'player_two', 'void_warden', '10000000-0000-4000-8000-000000000002', 50)
on conflict (id) do update set
  username = excluded.username,
  team_id = excluded.team_id,
  score = excluded.score;

insert into public.zones (id, name, location, radius_meters, captured_by, captured_at)
values
  ('20000000-0000-4000-8000-000000000001', 'The Silent Relay', 'SRID=4326;POINT(-79.3832 43.6532)', 60, '10000000-0000-4000-8000-000000000001', '2026-01-15T02:30:00Z'),
  ('20000000-0000-4000-8000-000000000002', 'Black Star Threshold', 'SRID=4326;POINT(-79.3948 43.6426)', 45, '10000000-0000-4000-8000-000000000002', '2026-01-15T03:00:00Z'),
  ('20000000-0000-4000-8000-000000000003', 'The Unanswered Beacon', 'SRID=4326;POINT(-79.3733 43.6465)', 75, null, null)
on conflict (id) do update set
  name = excluded.name,
  location = excluded.location,
  radius_meters = excluded.radius_meters,
  captured_by = excluded.captured_by,
  captured_at = excluded.captured_at;

insert into public.capture_events (id, zone_id, player_id, team_id, captured_at)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', :'player_one', '10000000-0000-4000-8000-000000000001', '2026-01-15T02:30:00Z'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', :'player_two', '10000000-0000-4000-8000-000000000002', '2026-01-15T03:00:00Z')
on conflict (id) do update set
  zone_id = excluded.zone_id,
  player_id = excluded.player_id,
  team_id = excluded.team_id,
  captured_at = excluded.captured_at;

commit;
