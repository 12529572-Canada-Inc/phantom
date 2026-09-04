# Phantom

> Location-based alternate reality game with capture-the-flag mechanics and a cosmic horror theme.

## Stack

- **Mobile:** Expo (React Native)
- **API:** Fastify (Railway)
- **Database:** Supabase (Postgres + Auth)
- **Monorepo:** pnpm + Turborepo

## Apps

| App           | Description        |
| ------------- | ------------------ |
| `apps/mobile` | Expo mobile client |
| `apps/api`    | Fastify REST API   |

## Getting Started

```bash
pnpm install
pnpm dev:tui
```

The compact interactive development menu opens with task categories. Use arrow
keys (or `j`/`k`) and Enter to open a category and run a task, then use the left
arrow or `b` to return. Use `q`, Escape, or `Ctrl+C` to exit. The menu checks
prerequisites, manages the local stack, shows safe endpoints, launches Expo with
device-specific API guidance, manages the local database, and runs repository
checks.

Every menu action also has a non-interactive task ID:

```bash
pnpm dev:task -- --list
pnpm dev:task -- environment:check
pnpm dev:task -- quality:pre-pr
pnpm dev:task -- database:reset --dry-run
pnpm dev:task -- services:nuke --dry-run
```

Commands stream their output and return the child command's exit code. The
local database reset requires an interactive typed confirmation and refuses to
run without the Supabase CLI's `--local` guard. Arguments are passed directly
to child processes without shell interpolation. Environment checks report only
whether sensitive values are configured; they never print their contents.

The Services category also includes **Nuke and pave local stack**. After the
exact typed confirmation `nuke and pave phantom`, it permanently deletes the
local `phantom` Compose containers, volumes, and network plus all data in the
local Supabase project, then starts Supabase, reapplies migrations, rebuilds the
API image without its build cache, and waits for the API container to become
healthy. Use the `--dry-run` command above to inspect the complete plan without
running prerequisite checks or child processes.

Before deletion, the task refuses redirecting Docker, Compose, or Supabase
environment variables; rejects non-local Docker endpoints; verifies the
checked-in Compose and Supabase configuration; and refuses existing Compose
resources owned by another checkout. Phantom uses the dedicated local Supabase
port block `55320`–`55329`; the preflight refuses to delete anything if an
unrelated Docker container publishes one of those ports. It does not delete
source files, dependencies, environment files, hosted Supabase data, Docker
images, or unrelated Docker projects. Do not run another Phantom stack command
at the same time. Both Compose and local Supabase identify this project as
`phantom`, so two Phantom checkouts share those local namespaces and should not
be run concurrently. The workflow stops after the first failed step; a failure
after teardown can intentionally leave the stack down or partially rebuilt.
Correct the reported problem and rerun the task to finish paving it.

Run `pnpm dev` directly when you want Turbo's persistent development tasks
without the menu.

## Docker development

Docker provides a reproducible API runtime while Expo continues to run on the
host, simulator, emulator, or physical device.

Prerequisites:

- Node.js 22 and pnpm 9
- Docker Desktop or a compatible Docker Engine with Compose

Install dependencies and start the local Supabase services plus the API:

```bash
pnpm install --frozen-lockfile
pnpm docker:start
```

The command builds the API image from the repository root, waits for its
container health check, and publishes `GET http://localhost:3001/health`.
Supabase Studio is available at `http://localhost:55323`. Stop all
project-owned containers and networks with:

```bash
pnpm docker:stop
```

Other commands:

| Command              | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `pnpm docker:build`  | Build the API image without starting services |
| `pnpm docker:logs`   | Follow API container logs                     |
| `pnpm docker:status` | Show API and local Supabase status            |
| `pnpm docker:config` | Validate the Compose configuration            |

From `pnpm dev:tui`, choose **Database → Seed development data** to add
repeatable fictional accounts, teams, zones, and capture history to Phantom's
local Supabase project. It preserves unrelated data and writes randomized test
login credentials to the ignored `.local/seed-accounts.json` file. See
[`docs/development-seed.md`](docs/development-seed.md) for fixture and safety
details.

Routine menu actions delegate Docker lifecycle work to these commands. The
destructive nuke-and-pave task uses its own fixed, guarded command plan so its
full scope is visible in `--dry-run` output.

`API_PORT` changes the host port published by Compose, which sets the
container's `PORT` to `3001`. When running the image directly, `PORT` defaults
to `3001` and may be overridden. The API reaches host-side Supabase at
`http://host.docker.internal:55321`; Compose adds the Linux host-gateway
mapping. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` may be supplied at runtime through the shell or an
uncommitted `.env` file. Never commit those values. The service-role key is
server-only. API startup validates `PORT` and any supplied Supabase values.

### Connecting Expo to the API

Run Expo on the host with `pnpm --filter @phantom/mobile dev`, then configure
the client with the URL appropriate to its runtime:

| Runtime          | API base URL                               |
| ---------------- | ------------------------------------------ |
| iOS simulator    | `http://localhost:3001`                    |
| Android emulator | `http://10.0.2.2:3001`                     |
| Physical device  | `http://<development-machine-LAN-IP>:3001` |

The physical device and development machine must be on the same network, and
the host firewall must allow the selected `API_PORT`.

### Mobile authentication

Copy the mobile environment template and replace its placeholders with the
public values from the Supabase project Connect panel:

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
pnpm --filter @phantom/mobile dev
```

Expo only exposes variables prefixed with `EXPO_PUBLIC_`. The publishable key
(or legacy anon key via `EXPO_PUBLIC_SUPABASE_ANON_KEY`) is safe to include in
the client because Supabase row-level security remains the authorization
boundary. Never add the service-role key to the mobile environment.

Use a Supabase URL reachable from the selected runtime:

| Runtime          | Local Supabase URL                  |
| ---------------- | ----------------------------------- |
| iOS simulator    | `http://127.0.0.1:55321`            |
| Android emulator | `http://10.0.2.2:55321`             |
| Physical device  | `http://<development-LAN-IP>:55321` |

The app persists the Supabase session in encrypted SecureStore and uses
`phantom://auth/callback` for email-confirmation and Google OAuth callbacks.
The redirect uses PKCE so callback URLs carry a short-lived, one-time code
instead of session tokens. That URL must appear in the Supabase Auth redirect
allow list; it is already in the checked-in local `supabase/config.toml`.
Custom schemes require an Expo development build or standalone app rather than
Expo Go.

To enable Google sign-in for a hosted project:

1. Create a Google OAuth client with application type **Web application** and
   the minimal `openid`, email, and profile scopes.
2. Add the Supabase callback shown on the Google provider page (normally
   `https://<project-ref>.supabase.co/auth/v1/callback`) to Google's authorized
   redirect URIs.
3. Enable Google in the Supabase Auth provider settings with that client ID and
   secret. Keep the secret in Google/Supabase configuration, never in Expo.
4. Add `phantom://auth/callback` to the hosted project's Supabase redirect allow
   list.

See Supabase's official [Google provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
and [native deep-linking guide](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
for dashboard details. If email confirmation is enabled, confirmation links use
the same app callback.

### Background location testing

Background tracking is off until a signed-in player selects **Enable** on the
map and grants both foreground and background location access. Phantom stores
one latest position per player in a separate self-only table; stopping tracking
or signing out removes that row. Android shows a persistent notification and
iOS shows the background location indicator while tracking is active.

Expo Go cannot exercise the production background-location behavior. Build and
run a development client on a physical device instead:

```bash
pnpm --filter @phantom/mobile exec expo run:ios --device
pnpm --filter @phantom/mobile exec expo run:android --device
```

For each platform:

1. Sign in, open the map, and confirm **Background signal** starts off.
2. Select **Enable** and grant foreground access followed by background access.
   Android 11 and newer may open the app's system settings for the second step.
3. Move the device and confirm the marker updates and the signed-in player's
   `player_locations.updated_at` value advances.
4. Background the app for at least 30 seconds and confirm updates continue. The
   five-second options are minimum requests; the operating system may throttle
   or batch delivery.
5. Select **Stop** and confirm the row is deleted. Enable it again, sign out,
   and confirm the native task stops and the row is deleted before the session
   clears.

See Expo's [Location background-permission and task documentation](https://docs.expo.dev/versions/latest/sdk/location/#background-location)
for platform constraints and [TaskManager documentation](https://docs.expo.dev/versions/latest/sdk/task-manager/#taskmanagerdefinetasktaskname-taskexecutor)
for the required module-scope task definition.

## Railway deployment

The production API is defined with Railway Infrastructure as Code in
`.railway/railway.ts`. Follow the [deployment runbook](.railway/README.md) to
provision the service, configure the Supabase server variables without
committing secrets, and verify `GET /health` on the public Railway domain.
