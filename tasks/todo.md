# Issue #5 task checklist

## Task 1: Protect the latest player position

**Acceptance criteria:**

- [x] A player has at most one stored latitude/longitude pair.
- [x] Anonymous users cannot access location rows.
- [x] Authenticated players cannot access another player's location row.

**Verification:**

- [x] `pnpm exec supabase test db supabase/tests/player_locations_rls.sql`

**Dependencies:** None

## Task 2: Add background tracking lifecycle

**Acceptance criteria:**

- [x] Tracking starts only after foreground and background permission grants.
- [x] The background handler validates and persists only the newest fix.
- [x] Disable and sign-out stop updates and clear the latest row.

**Verification:**

- [x] `pnpm --filter @phantom/mobile test`
- [x] `pnpm --filter @phantom/mobile type-check`

**Dependencies:** Task 1

## Task 3: Update the live map experience

**Acceptance criteria:**

- [ ] The player marker updates from foreground location events.
- [ ] The map exposes accessible opt-in, active, denied, error, and stop states.
- [ ] Permission and foreground-service copy explain continuous tracking.

**Verification:**

- [ ] `pnpm --filter @phantom/mobile lint`
- [ ] `pnpm --filter @phantom/mobile build`
- [ ] Manual physical-device development-build test on iOS and Android

**Dependencies:** Task 2

## Task 4: Finish verification and handoff

**Acceptance criteria:**

- [ ] `CHANGELOG.md` records the user-visible and privacy-sensitive change.
- [ ] Relevant repository checks pass.
- [ ] Remaining manual verification is documented precisely.

**Verification:**

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm build`
- [ ] `pnpm test`

**Dependencies:** Tasks 1-3
