# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added a cosmic-themed mobile map centered on the player's foreground
  location, with permission and service recovery states, a position marker,
  and an accessible recenter control. ([#4](https://github.com/12529572-Canada-Inc/phantom/issues/4))
- Added Supabase email/password and Google authentication to the Expo app with
  guarded routes, encrypted SecureStore session persistence, deep-link callback
  handling, accessible loading/error states, and sign-out. ([#3](https://github.com/12529572-Canada-Inc/phantom/issues/3))
- Added Railway Infrastructure as Code and a production API deployment runbook
  covering Supabase secret handling and `/health` verification. ([#2](https://github.com/12529572-Canada-Inc/phantom/issues/2))
- Added a compact category-first development task menu with headless task IDs,
  prerequisite checks, safe local service and database workflows, repository
  quality checks, typed reset confirmation, and process-runner unit tests.
- Added a guarded TUI nuke-and-pave workflow that recreates the project-scoped
  Docker API stack and local Supabase data from scratch after an exact typed
  confirmation, with dry-run output and local-target safety checks.
- Added a non-root, multi-stage API image, a one-command Docker and local
  Supabase development stack, container health checks, and CI smoke testing.
- Documented Docker environment handling and Expo API URLs for simulators,
  emulators, and physical devices.
- Added canonical repository guidance for coding agents in `AGENTS.md` and a
  thin Claude Code workflow layer in `CLAUDE.md`.
- Added pgTAP coverage for the baseline Supabase schema and row-level security
  behavior with anonymous and multiple authenticated users.
- Added this changelog to track user-visible, architectural, security,
  deployment, and developer-tooling changes.

### Changed

- Added the Expo SDK 51 monorepo Metro configuration and pinned Router peers to
  their SDK-compatible versions so pnpm-isolated iOS and Android exports build
  reproducibly.
- Clarified the baseline public-read policies and distinguished recommended
  local checks from the checks currently enforced by CI.
- Updated CI and release workflows to use Node 24–based action runtimes and the
  root `packageManager` field as the single source for the pnpm version.
- Added the missing shared ESLint configuration and included the API in the
  workspace type-check task so CI validates both applications.

### Fixed

- Fixed the TUI's iOS simulator and Android emulator actions to request a
  platform launch instead of only starting Metro.
- Fixed local stack startup and nuke-and-pave failures when another Supabase
  project is running by assigning Phantom a dedicated port block, refusing
  unrelated Docker port conflicts before teardown, and resuming TUI input
  after typed destructive confirmation.
- Fixed the initial Supabase migration so it applies from an empty database,
  installs required extensions outside the public schema, grants only the
  API-role privileges required by its RLS policies, and indexes zone geography
  for proximity queries. ([#1](https://github.com/12529572-Canada-Inc/phantom/issues/1))

## [0.1.0] - 2026-07-27

### Added

- Added the initial pnpm and Turborepo monorepo scaffold.
- Added an Expo mobile application with Expo Router and location support.
- Added a Fastify API with CORS, security headers, and a health endpoint.
- Added shared TypeScript domain contracts.
- Added the initial Supabase schema for players, teams, zones, and capture
  events with PostGIS and row-level security.
- Added CI for linting and type checking plus an initial release workflow.
