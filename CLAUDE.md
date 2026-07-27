# CLAUDE.md

@AGENTS.md

`AGENTS.md` is the canonical project guidance. Keep shared architecture,
security, testing, branch, and release rules there rather than duplicating them
in this file.

## Claude Code Workflow

- Read the nearest relevant source, package manifest, and configuration before
  editing. Use focused searches for broad discovery.
- Plan before schema, RLS, background-location, native-permission, or
  deployment work because those changes have a wider security or operational
  impact.
- Keep changes scoped to the requested feature and preserve unrelated work in
  a dirty worktree.
- Before committing, run the narrowest relevant checks followed by
  `pnpm lint`, `pnpm type-check`, and `pnpm build` when dependencies and
  services are available.
- Review the output of `pnpm format` because it writes files rather than only
  checking them.
- Update `CHANGELOG.md` under `## [Unreleased]` for notable changes.

## Reporting

State what changed, what was verified, and what remains unverified. Call out
mobile-device, Supabase, Docker, Railway, and native-build checks explicitly
when the environment did not support them.
