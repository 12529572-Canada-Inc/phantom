# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added canonical repository guidance for coding agents in `AGENTS.md` and a
  thin Claude Code workflow layer in `CLAUDE.md`.
- Added this changelog to track user-visible, architectural, security,
  deployment, and developer-tooling changes.

## [0.1.0] - 2026-07-27

### Added

- Added the initial pnpm and Turborepo monorepo scaffold.
- Added an Expo mobile application with Expo Router and location support.
- Added a Fastify API with CORS, security headers, and a health endpoint.
- Added shared TypeScript domain contracts.
- Added the initial Supabase schema for players, teams, zones, and capture
  events with PostGIS and row-level security.
- Added CI for linting and type checking plus an initial release workflow.
