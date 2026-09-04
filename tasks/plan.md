# Implementation Plan: Issue #5 real-time location tracking

## Overview

Build the feature in three privacy-first slices: protect the latest position in
the database, add an explicit background-tracking lifecycle, then connect live
foreground updates and controls to the map.

## Architecture Decisions

- Store location in a separate `player_locations` table so the existing public
  player/leaderboard rows cannot leak precise coordinates.
- Use one primary-keyed row per player instead of a history table; upserts
  replace the prior fix and opt-out deletes it.
- Enforce self-only access for every operation with grants plus RLS policies.
- Define the TaskManager handler at module scope and import it from the root
  layout so the native runtime can invoke it without mounting React views.
- Use Expo's background task for persistence and a foreground location watcher
  for responsive local map rendering. Neither path assumes the OS will deliver
  an update at an exact wall-clock interval.

## Task List

### Phase 1: Private latest-position storage

- [x] Add the `player_locations` migration with coordinate constraints,
      least-privilege grants, and self-only RLS.
- [x] Add pgTAP coverage for anonymous and cross-player denial plus owner CRUD.

### Checkpoint: Data boundary

- [x] Fresh-database migration and focused RLS tests pass.

### Phase 2: Background tracking lifecycle

- [x] Add Expo TaskManager and native background-location configuration.
- [x] Add tested permission, start, stop, validation, persistence, and cleanup
      logic.
- [x] Stop tracking and clear the latest position before sign-out.

### Checkpoint: Tracking core

- [x] Focused mobile tests, lint, and type-check pass.

### Phase 3: Live map and handoff

- [x] Stream foreground position changes into the existing player marker.
- [x] Add accessible enable/disable controls and safe tracking status messages.
- [x] Update the changelog and physical-device manual test guidance.

### Checkpoint: Complete

- [x] Repository checks pass.
- [x] Manual iOS/Android development-build steps are documented.

## Risks and Mitigations

| Risk                                              | Impact | Mitigation                                                               |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| Existing public `players` reads expose new fields | High   | Isolate coordinates in a self-only table.                                |
| A player writes another player's position         | High   | Primary-key ownership checks on insert/update/delete.                    |
| Tracking continues after sign-out                 | High   | Stop the native task before deleting data and clearing auth.             |
| Invalid native coordinates reach storage          | Medium | Validate in mobile code and PostgreSQL constraints.                      |
| OS throttles the five-second target               | Medium | Configure supported minimum intervals and document best-effort behavior. |
| Background APIs appear to work in Expo Go         | Medium | Require physical-device development-build verification.                  |

## Open Questions

- None blocking implementation.
