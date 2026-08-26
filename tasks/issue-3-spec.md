# Spec: Supabase authentication in Expo

## Objective

Add a secure authentication boundary to the Phantom mobile app. Players can
create an account or sign in with email and password, or sign in with Google,
and their Supabase session survives app restarts in device SecureStore.

## Tech Stack

- Expo SDK 51 and Expo Router 3.5
- React Native 0.74 and React 18.2
- Supabase JS 2.43
- Expo SecureStore for encrypted device persistence
- Expo WebBrowser for the Google OAuth browser handoff

## Commands

- Focused mobile tests: `pnpm --filter @phantom/mobile test`
- Mobile lint: `pnpm --filter @phantom/mobile lint`
- Mobile type check: `pnpm --filter @phantom/mobile type-check`
- Mobile export: `pnpm --filter @phantom/mobile build`
- Repository checks: `pnpm lint && pnpm type-check && pnpm build && pnpm test`

## Project Structure

- `apps/mobile/app/` contains Expo Router screens and route guards.
- `apps/mobile/components/auth/` contains reusable auth UI.
- `apps/mobile/src/auth/` contains the Supabase client, session context, OAuth
  flow, validation, and SecureStore adapter.
- Tests are colocated with pure auth modules under `apps/mobile/src/auth/`.
- `README.md` documents local and hosted Supabase configuration.

## Code Style

```ts
export function validateCredentials(email: string, password: string) {
  return credentialsSchema.safeParse({ email: email.trim(), password })
}
```

Use strict TypeScript, single quotes, no semicolons, descriptive names, and
small components. Authentication failures shown to players must not expose
tokens or internal diagnostic details.

## Testing Strategy

- Unit-test credential validation, OAuth callback parsing, and chunk planning.
- Type-check and lint every mobile source file.
- Export the Expo app to verify routing and bundling.
- Manually verify email sign-up/sign-in, Google OAuth cancellation/success,
  sign-out, and session restoration once Supabase and Google credentials are
  configured.

## Boundaries

- Always: keep the service-role key off the client, validate forms before
  network calls, persist only through SecureStore, and guard authenticated
  routes.
- Ask first: database/RLS changes, background location behavior, or adding an
  auth provider beyond email and Google.
- Never: commit real credentials, log passwords/tokens/sessions, or treat
  client-side checks as authorization.

## Success Criteria

- Unauthenticated players are directed to sign in and cannot open the tabs.
- Players can sign up and sign in with validated email/password credentials.
- Players can start Google OAuth and complete the callback through the
  `phantom` app scheme.
- Supabase sessions restore from SecureStore and refresh while the app is
  active.
- Players can sign out and are returned to the sign-in screen.
- Setup requirements and environment variables are documented without secret
  values.

## Open Questions

- Production Google and Supabase dashboard values are intentionally left for
  environment configuration; no production project mutation is part of this
  issue.
- Email confirmation behavior follows the selected Supabase project's Auth
  settings. The app supports the callback, but does not change that setting.
