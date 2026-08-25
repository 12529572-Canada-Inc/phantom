begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select ok(
  exists (
    select 1
    from pg_extension
    where extname = 'postgis'
  ),
  'PostGIS is enabled.'
);

select is(
  (
    select count(*)::integer
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('players', 'teams', 'zones', 'capture_events')
  ),
  4,
  'The initial game tables exist.'
);

select is(
  (
    select format_type(attribute.atttypid, attribute.atttypmod)
    from pg_attribute as attribute
    join pg_class as relation on relation.oid = attribute.attrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'zones'
      and attribute.attname = 'location'
      and not attribute.attisdropped
  ),
  'geography(Point,4326)',
  'Zones store WGS 84 geography points.'
);

select is(
  (
    select count(*)::integer
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in ('players', 'teams', 'zones', 'capture_events')
      and relation.relrowsecurity
  ),
  4,
  'RLS is enabled on every game table.'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('players', 'teams', 'zones', 'capture_events')
  ),
  5,
  'The baseline read and player self-update policies exist.'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'zones'
      and indexdef like '%USING gist (location)%'
  ),
  'Zone locations have a GiST index.'
);

insert into auth.users (id, email, raw_user_meta_data, instance_id, aud, role)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'alice@test.example',
    '{}'::jsonb,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bob@test.example',
    '{}'::jsonb,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
  );

insert into public.teams (id, name, color)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Test Team',
  '#000000'
);

insert into public.players (id, username, team_id)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'alice',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bob',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  );

insert into public.zones (id, name, location)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Test Zone',
  st_setsrid(st_makepoint(-79.3832, 43.6532), 4326)::geography
);

insert into public.capture_events (zone_id, player_id, team_id)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

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

select is(
  (select count(*)::integer from public.teams),
  1,
  'Anonymous users can read teams.'
);

select is(
  (select count(*)::integer from public.players),
  2,
  'Anonymous users can read players.'
);

select is(
  (select count(*)::integer from public.zones),
  1,
  'Anonymous users can read zones.'
);

select is(
  (select count(*)::integer from public.capture_events),
  1,
  'Anonymous users can read capture events.'
);

select tests.act_as('11111111-1111-1111-1111-111111111111');

update public.players
set username = 'alice-updated'
where id = '11111111-1111-1111-1111-111111111111';

select is(
  (
    select username
    from public.players
    where id = '11111111-1111-1111-1111-111111111111'
  ),
  'alice-updated',
  'Players can update their own record.'
);

select throws_ok(
  $$
    update public.players
    set score = 1000000
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '42501',
  'permission denied for table players',
  'Players cannot update their own score.'
);

update public.players
set username = 'bob-hacked'
where id = '22222222-2222-2222-2222-222222222222';

select is(
  (
    select username
    from public.players
    where id = '22222222-2222-2222-2222-222222222222'
  ),
  'bob',
  'Players cannot update another player record.'
);

select tests.act_as_anon();

select throws_ok(
  $$
    update public.players
    set username = 'alice-anon-hacked'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '42501',
  'permission denied for table players',
  'Anonymous users cannot update player records.'
);

select * from finish();

rollback;
