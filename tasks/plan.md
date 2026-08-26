# Implementation Plan: Issue #3 Supabase authentication

## Overview

Build authentication as four small slices: establish secure client storage,
provide app-wide session state, add guarded email and Google flows, then
document and verify the complete mobile experience.

## Architecture Decisions

- Keep Supabase credentials in `EXPO_PUBLIC_` environment variables. These are
  public client credentials; the service-role key remains server-only.
- Centralize the Supabase session in React context so route guards and screens
  consume one subscription.
- Store session data in bounded SecureStore chunks because native keychains may
  reject large values.
- Use Supabase's browser OAuth flow with the existing `phantom` scheme so one
  implementation works on both iOS and Android.

## Task List

### Phase 1: Secure client foundation

- [x] Add Expo-compatible auth dependencies and a tested SecureStore adapter.
- [x] Configure the Supabase client and environment validation.
- [x] Add foreground token refresh with the session provider.

### Checkpoint: Foundation

- [x] Focused auth tests, mobile lint, and mobile type-check pass.

### Phase 2: Session boundary

- [x] Add an auth provider that restores and subscribes to the session.
- [x] Guard the tabs and redirect users from the entry route by auth state.

### Phase 3: Player flows

- [x] Add accessible sign-in and sign-up screens with validation and safe
      loading/error states.
- [x] Add Google OAuth callback handling and a sign-out action.

### Checkpoint: Core features

- [x] Email, OAuth callback, cancellation, session restoration, and sign-out
      paths are represented in code and testable helpers.

### Phase 4: Handoff

- [x] Document environment, redirect, Google provider, and manual-test setup.
- [x] Add the user-visible changelog entry. Repository checks remain below.

### Checkpoint: Complete

- [x] All automated acceptance criteria pass.
- [x] Remaining manual checks require only project credentials/provider setup.

## Risks and Mitigations

| Risk                                                        | Impact | Mitigation                                                           |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| Session payload exceeds a native SecureStore value limit    | High   | Split values into bounded chunks and remove stale chunks on updates. |
| OAuth redirect is not allowlisted                           | High   | Use one documented `phantom://auth/callback` URL everywhere.         |
| Missing client environment causes an opaque startup failure | Medium | Validate configuration and show a safe configuration screen.         |
| Email confirmation returns outside the in-app browser       | Medium | Handle both browser results and app deep-link callbacks.             |

## Open Questions

- None blocking implementation. Hosted provider configuration remains a manual
  environment step because credentials are not stored in this repository.
