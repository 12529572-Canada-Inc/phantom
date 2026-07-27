# Repository Guidelines

## Project Context

- Phantom is a location-based alternate reality game with capture-the-flag
  mechanics and a cosmic-horror theme.
- The repository is a pnpm and Turborepo monorepo. It contains an Expo/React
  Native mobile client, a Fastify API, shared TypeScript types, and Supabase
  migrations.
- The active repository is `12529572-Canada-Inc/phantom`. `develop` is the
  integration branch and `main` is the release branch.
- This file is the canonical tool-agnostic guidance for coding agents.
  `CLAUDE.md` imports it and should contain only Claude-specific notes.

## Repository Structure

- `apps/mobile/` contains the Expo 51 client:
  - `app/` uses Expo Router for file-based navigation.
  - `app/_layout.tsx` defines the root navigator.
  - `app/(tabs)/` contains tab-routed screens.
  - `app.json` is the source of truth for Expo metadata, native plugins, and
    permission copy.
- `apps/api/` contains the Fastify 4 service:
  - `src/index.ts` currently owns application creation, plugins, the health
    endpoint, and server startup.
  - Production output is emitted to `apps/api/dist/`.
- `packages/types/` contains contracts shared by the mobile client and API.
  Prefer shared domain types here over duplicating interfaces in an app.
- `packages/typescript-config/` contains the strict base TypeScript
  configuration used across the workspace.
- `supabase/migrations/` is the source of truth for the Postgres schema,
  PostGIS setup, row-level security, policies, and database functions.
- `.github/workflows/ci.yml` validates feature branches and pull requests into
  `develop`; `.github/workflows/release.yml` handles release-branch builds.

## Architecture and Security

- Treat Supabase row-level security as the authorization boundary. API and
  client checks may improve user experience, but they do not replace database
  policies.
- Keep Supabase service-role credentials and other secrets on trusted server
  surfaces. Never place a secret in Expo public configuration, committed files,
  logs, or client bundles.
- Validate untrusted API input with Zod before it reaches domain or database
  logic. Return structured errors with appropriate HTTP status codes.
- Keep Fastify route handlers small. As the API grows, move reusable domain
  logic, schemas, and plugins into focused modules under `apps/api/src/`.
- Location data is sensitive. Collect and retain only what a feature needs,
  preserve explicit permission flows, and confirm privacy implications before
  adding background tracking or history.
- Use `@phantom/types` for cross-app contracts, but do not expose
  database-only or secret-bearing structures through that package.

## Development Commands

- `pnpm install` installs all workspace dependencies. CI uses
  `pnpm install --frozen-lockfile`; keep the lockfile committed and current.
- `pnpm dev` starts persistent development tasks through Turbo.
- `pnpm --filter @phantom/mobile dev` starts Expo for the mobile client.
- `pnpm --filter @phantom/api dev` starts the API in watch mode on port `3001`
  unless `PORT` is set.
- `pnpm build` builds all workspaces that define a build task.
- `pnpm lint` runs workspace lint tasks.
- `pnpm type-check` runs workspace TypeScript checks.
- `pnpm format` writes Prettier formatting across TypeScript, TSX, Markdown,
  and JSON files. Review its diff before committing.

Run the narrowest useful command while iterating, then run the relevant
repository-level checks before committing. Do not claim a check passed if the
required tool or service was unavailable.

## Coding Conventions

- TypeScript strict mode and `noUncheckedIndexedAccess` are enabled. Avoid
  `any`; model uncertain input as `unknown` and narrow it deliberately.
- Follow the existing formatting: single quotes, no semicolons, and trailing
  commas where supported. Let Prettier resolve formatting disputes.
- Use PascalCase for React components and exported types, camelCase for
  variables and functions, and descriptive file names that follow the
  surrounding directory.
- Keep Expo screens focused on presentation and orchestration. Extract reusable
  UI and logic into `components/`, `hooks/`, or other focused modules when
  introduced.
- Keep platform-specific behavior explicit with React Native conventions such
  as `.ios.tsx` and `.android.tsx` files when behavior genuinely differs.
- Update native permission text in `apps/mobile/app.json` when a feature adds
  or changes protected device access.

## Database Changes

- Add database changes as new, ordered SQL files in `supabase/migrations/`.
  Do not rewrite a migration that may already have been applied outside a local
  environment.
- Order table creation so referenced relations exist before foreign keys are
  added. Make migrations work from an empty database as well as on the current
  schema.
- Enable RLS on every client-accessible table and add least-privilege policies
  for each supported operation. The baseline `00001_init.sql` migration
  currently permits reads of zones, teams, players, and capture events with
  `using (true)` policies. Treat that as the current product behavior, not a
  precedent: future public access and any tightening of these policies require
  an explicit product decision.
- Use PostGIS geography types and indexed database predicates for proximity
  checks. Do not trust client-computed capture eligibility.
- Include migration, rollback, data-retention, and policy implications in the
  pull request description.

## Testing and Verification

- Add tests alongside new behavior once the relevant test runner is introduced.
  Prioritize capture eligibility, authorization, score changes, location
  boundaries, validation, and shared contract behavior.
- API changes should verify success, validation failure, authorization failure,
  and dependency failure paths.
- Mobile changes should cover the affected navigation and permission states,
  including denied and unavailable location access where applicable.
- Migration and RLS changes must be exercised against a fresh local Supabase
  database and with at least two users to catch cross-user access.
- Until dedicated test scripts exist, the minimum recommended local checks are
  `pnpm lint`, `pnpm type-check`, and `pnpm build`. Current CI automates linting
  and type checking; run the build locally until the workflow expands.

## Commits, Pull Requests, and Changelog

- Branch from `develop` using `feature/<slug>`, `bugfix/<slug>`, or
  `hotfix/<slug>`. Never commit directly to `develop` or `main`.
- Use focused conventional commits such as `feat:`, `fix:`, `docs:`, `test:`,
  `chore:`, and `ci:`.
- Open pull requests against `develop`. Include a summary, linked issue,
  verification evidence, manual test steps, and any environment, migration,
  permission, security, or deployment impact.
- Update `CHANGELOG.md` under `## [Unreleased]` for user-visible changes and
  notable architecture, security, deployment, or developer-tooling changes.
  Follow Keep a Changelog headings such as `Added`, `Changed`, and `Fixed`.
- Do not commit generated build output, local environment files, Expo state,
  logs, or credentials.

## Deployment and Release Notes

- Merges to `main` trigger the release workflow. Treat changes to
  `.github/workflows/release.yml`, Railway configuration, Supabase deployment,
  signing, and mobile release configuration as production-impacting.
- The API is intended for Railway and must listen on `0.0.0.0` using the
  platform-provided `PORT`.
- Expo app versioning and native build numbers belong in the mobile release
  process. Keep release notes aligned with `CHANGELOG.md`.

## Confirm Before Implementing

Ask for direction before making choices that materially affect:

- background location tracking, retention, or player visibility;
- capture radius, anti-cheat logic, scoring, or team membership rules;
- public versus authenticated access in RLS policies;
- new required environment variables or third-party services;
- workspace layout, package manager, deployment targets, or native build
  configuration;
- destructive migrations or production data backfills.
