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
pnpm dev
```

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
Supabase Studio is available at `http://localhost:54323`. Stop all
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

`API_PORT` changes the published host port. The container always listens on
port `3001`. The API reaches host-side Supabase at
`http://host.docker.internal:54321`; Compose adds the Linux host-gateway
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
