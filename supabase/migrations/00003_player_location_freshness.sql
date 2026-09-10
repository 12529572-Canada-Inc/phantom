create function public.set_player_location_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_player_location_updated_at() from public;

create trigger set_player_location_updated_at
before insert or update on public.player_locations
for each row
execute function public.set_player_location_updated_at();
