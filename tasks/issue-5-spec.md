# Spec: Private real-time player location tracking

## Objective

Let a signed-in player explicitly opt into background location tracking. While
enabled, Phantom keeps only that player's latest precise coordinates in
Supabase, refreshes the map marker as the device moves, and removes the stored
position when tracking stops or the player signs out.

## Tech Stack

- Expo SDK 51, Expo Location 17, and Expo TaskManager 11.8
- React Native 0.74 and React 18.2
- Supabase JS 2.43 with PostgreSQL row-level security
- Node's built-in test runner for mobile domain logic and pgTAP for RLS

## Commands

- Focused mobile tests: `pnpm --filter @phantom/mobile test`
- Database policy tests: `pnpm exec supabase test db`
- Mobile lint: `pnpm --filter @phantom/mobile lint`
- Mobile type check: `pnpm --filter @phantom/mobile type-check`
- Mobile export: `pnpm --filter @phantom/mobile build`
- Repository checks: `pnpm lint && pnpm type-check && pnpm build && pnpm test`

## Project Structure

- `apps/mobile/src/location/` owns background task registration, permission
  orchestration, latest-position persistence, and tracking lifecycle logic.
- `apps/mobile/src/map/` owns foreground map location state.
- `apps/mobile/components/map/` contains the opt-in tracking control and map
  status presentation.
- `supabase/migrations/` adds the latest-position table and policies.
- `supabase/tests/` verifies all allowed and denied location-data operations.

## Code Style

```ts
export function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
}
```

Use strict TypeScript, single quotes, no semicolons, descriptive names, and
small testable functions. Errors shown to players must not include coordinate,
token, or internal provider details.

## Testing Strategy

- Unit-test coordinate validation and permission/lifecycle outcomes with fake
  gateways before connecting them to Expo and Supabase.
- Test foreground updates and cleanup without depending on device timing.
- Use pgTAP with anonymous and two authenticated users to prove that players
  can only read, write, and delete their own location row.
- Type-check, lint, and export the mobile app after integration.
- Manually verify background delivery on physical iOS and Android development
  builds because Expo Go cannot exercise the production background behavior.

## Boundaries

- Always: require explicit in-app opt-in, enforce ownership with RLS, validate
  coordinate ranges, retain one latest row only, and stop/clear on sign-out.
- Ask first: sharing positions with teammates or other players, retaining
  location history, changing the five-second target, or adding server-side
  capture eligibility.
- Never: expose location rows to anonymous clients, ship a service-role key in
  the mobile app, log precise coordinates, or claim exact background timing
  that the operating system cannot guarantee.

## Success Criteria

- Tracking is inactive until a signed-in player explicitly enables it.
- Enabling requests foreground permission before background permission and
  reports denied/unavailable states without starting the task.
- The native task requests updates at a five-second minimum where supported,
  writes only the newest delivered fix, and the foreground map marker updates
  as the device moves.
- Supabase retains at most one location row per player; only that player can
  select, insert, update, or delete it.
- Disabling tracking and signing out stop native updates and attempt to remove
  the stored location before the session is cleared.
- Permission copy explains continuous location use, and Android displays a
  persistent foreground-service notification while tracking.

## Open Questions

- None blocking implementation. Background scheduling is best-effort on both
  platforms and must be verified on physical-device development builds.
