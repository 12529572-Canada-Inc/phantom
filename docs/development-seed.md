# Local development seed

## Objective and acceptance criteria

Provide a Database-category TUI action for local development fixtures: two
fictional email/password accounts, two teams, sample zones, and capture history.
Repeat runs must not duplicate fixtures or overwrite unrelated data. Generated
login credentials stay in an ignored, owner-readable local file. Seeding is
explicit, never part of production migrations or automatic startup.

## Implementation plan

1. Fix Expo's public environment references and verify bundle-time inlining.
2. Add local configuration setup and seed actions under `scripts/dev-tui/`.
3. Verify repeatability and test-account login against local Supabase.

## Commands and testing

Use `pnpm dev:tui` to run the actions. Unit regressions live alongside the task
runner and in `apps/mobile/tests/`; run `pnpm test`, `pnpm lint`,
`pnpm type-check`, and `pnpm build`. Verify local seed execution twice, fixture
counts, test-account login, and preservation of unrelated rows.

## Style and boundaries

Follow existing JavaScript modules: `const taskId = 'database:seed'`, single
quotes, no semicolons, and Prettier formatting. Use existing dependencies.
Always validate the local Docker project and target before writing. Never use
hosted URLs, alter RLS/schema/game rules, reset existing accounts, print server
credentials, or delete data. Ask before expanding fixture scope. Sample zone
locations are fictional test fixtures, not collected player location history.

## Fixtures and credentials

The seed creates `seer@phantom.local` and `warden@phantom.local`, two opposing
teams, three Toronto-area fictional zones, and two capture events. IDs are
stable so rerunning the action updates the fixtures without duplicates.

Passwords are randomly generated and written to `.local/seed-accounts.json`
with owner-only permissions. The directory is ignored by Git. If the file is
lost, the next seed run changes passwords only for accounts already marked as
Phantom seed fixtures; it refuses to modify an account with a matching email
that is not marked as a seed fixture.
