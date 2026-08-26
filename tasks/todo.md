# Issue #3 task checklist

## Task 1: Secure Supabase client foundation

**Acceptance criteria:**

- [x] Expo-compatible SecureStore, WebBrowser, and URL polyfill dependencies are
      installed.
- [x] Supabase uses chunked SecureStore persistence.
- [x] Missing or malformed public configuration is reported safely.

**Verification:**

- [x] `pnpm --filter @phantom/mobile test`
- [x] `pnpm --filter @phantom/mobile type-check`

**Dependencies:** None

## Task 2: Session-aware routing

**Acceptance criteria:**

- [x] One provider restores and subscribes to Supabase auth state.
- [x] Tabs reject unauthenticated access.
- [x] The app entry route resolves loading, signed-out, and signed-in states.

**Verification:**

- [x] `pnpm --filter @phantom/mobile lint`
- [x] `pnpm --filter @phantom/mobile type-check`

**Dependencies:** Task 1

## Task 3: Email and Google authentication

**Acceptance criteria:**

- [x] Email sign-up/sign-in validate inputs and present safe errors.
- [x] Google OAuth handles success and cancellation through the app scheme.
- [x] A signed-in player can sign out.

**Verification:**

- [x] `pnpm --filter @phantom/mobile test`
- [ ] Manual flow with configured Supabase project

**Dependencies:** Tasks 1 and 2

## Task 4: Documentation and repository verification

**Acceptance criteria:**

- [ ] Environment/provider/redirect setup is documented.
- [ ] `CHANGELOG.md` records the user-visible feature.
- [ ] Relevant repository checks pass.

**Verification:**

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm build`
- [ ] `pnpm test`

**Dependencies:** Tasks 1-3
