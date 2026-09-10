begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_table(
  'public',
  'player_locations',
  'The latest player locations table exists.'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'player_locations'
  ),
  'Player locations have RLS enabled.'
);

select col_is_pk(
  'public',
  'player_locations',
  'player_id',
  'Each player has at most one latest location.'
);

insert into auth.users (id, email, raw_user_meta_data, instance_id, aud, role)
values
  (
    '33333333-3333-3333-3333-333333333333',
    'location-alice@test.example',
    '{}'::jsonb,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'location-bob@test.example',
    '{}'::jsonb,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'location-charlie@test.example',
    '{}'::jsonb,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
  );

insert into public.players (id, username)
values
  ('33333333-3333-3333-3333-333333333333', 'location-alice'),
  ('44444444-4444-4444-4444-444444444444', 'location-bob');

insert into public.player_locations (player_id, latitude, longitude)
values ('44444444-4444-4444-4444-444444444444', 43.6426, -79.3871);

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.act_as(_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', _user_id::text, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.act_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

grant execute on function tests.act_as(uuid) to anon, authenticated;
grant execute on function tests.act_as_anon() to anon, authenticated;

select tests.act_as_anon();

select throws_ok(
  $$ select * from public.player_locations $$,
  '42501',
  'permission denied for table player_locations',
  'Anonymous users cannot read player locations.'
);

select throws_ok(
  $$
    insert into public.player_locations (player_id, latitude, longitude)
    values ('33333333-3333-3333-3333-333333333333', 43.6532, -79.3832)
  $$,
  '42501',
  'permission denied for table player_locations',
  'Anonymous users cannot write player locations.'
);

select tests.act_as('33333333-3333-3333-3333-333333333333');

select is(
  (select count(*)::integer from public.player_locations),
  0,
  'A player cannot read another player location.'
);

insert into public.player_locations (player_id, latitude, longitude)
values ('33333333-3333-3333-3333-333333333333', 43.6532, -79.3832);

select is(
  (select count(*)::integer from public.player_locations),
  1,
  'A player can insert and read their own location.'
);

select throws_ok(
  $$
    insert into public.player_locations (player_id, latitude, longitude)
    values ('44444444-4444-4444-4444-444444444444', 0, 0)
    on conflict (player_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        updated_at = now()
  $$,
  '42501',
  'new row violates row-level security policy for table "player_locations"',
  'A player cannot upsert another player location.'
);

update public.player_locations
set latitude = 43.6533,
    longitude = -79.3833,
    updated_at = '2000-01-01 00:00:00+00'
where player_id = '33333333-3333-3333-3333-333333333333';

select is(
  (
    select latitude
    from public.player_locations
    where player_id = '33333333-3333-3333-3333-333333333333'
  ),
  43.6533::double precision,
  'A player can update their own location.'
);

select ok(
  (
    select updated_at > now() - interval '1 minute'
    from public.player_locations
    where player_id = '33333333-3333-3333-3333-333333333333'
  ),
  'The database controls the location freshness timestamp.'
);

update public.player_locations
set latitude = 0,
    longitude = 0,
    updated_at = now()
where player_id = '44444444-4444-4444-4444-444444444444';

select is(
  (select count(*)::integer from public.player_locations),
  1,
  'Updating another player location affects no rows.'
);

delete from public.player_locations
where player_id = '44444444-4444-4444-4444-444444444444';

select is(
  (select count(*)::integer from public.player_locations),
  1,
  'Deleting another player location affects no rows.'
);

select throws_ok(
  $$
    insert into public.player_locations (player_id, latitude, longitude)
    values ('33333333-3333-3333-3333-333333333333', 91, -79.3832)
    on conflict (player_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        updated_at = now()
  $$,
  '23514',
  null,
  'Latitude outside the valid range is rejected.'
);

select throws_ok(
  $$
    insert into public.player_locations (player_id, latitude, longitude)
    values ('33333333-3333-3333-3333-333333333333', 43.6532, -181)
    on conflict (player_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        updated_at = now()
  $$,
  '23514',
  null,
  'Longitude outside the valid range is rejected.'
);

delete from public.player_locations
where player_id = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*)::integer from public.player_locations),
  0,
  'A player can delete their own location.'
);

select tests.act_as('44444444-4444-4444-4444-444444444444');

select is(
  (
    select latitude
    from public.player_locations
    where player_id = '44444444-4444-4444-4444-444444444444'
  ),
  43.6426::double precision,
  'Denied cross-player changes leave the other location intact.'
);

select tests.act_as('55555555-5555-5555-5555-555555555555');

insert into public.player_locations (player_id, latitude, longitude)
values ('55555555-5555-5555-5555-555555555555', 43.6532, -79.3832);

select is(
  (select count(*)::integer from public.player_locations),
  1,
  'An authenticated user can store a location before a player profile exists.'
);

delete from public.player_locations
where player_id = '55555555-5555-5555-5555-555555555555';

select is(
  (select count(*)::integer from public.player_locations),
  0,
  'An authenticated user without a player profile can clear their location.'
);

select * from finish();

rollback;
