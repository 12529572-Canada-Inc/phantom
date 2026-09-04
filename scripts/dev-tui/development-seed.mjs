import { randomBytes } from 'node:crypto'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inspectLocalStackTarget } from './local-stack.mjs'
import { localSupabaseEndpoints } from './local-config.mjs'
import { runCommand } from './process-runner.mjs'

export const seedAccounts = Object.freeze([
  Object.freeze({ email: 'seer@phantom.local', username: 'night_seer' }),
  Object.freeze({ email: 'warden@phantom.local', username: 'void_warden' }),
])

const createPassword = () => randomBytes(24).toString('base64url')

const loadCredentials = (path) => {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    if (
      Array.isArray(parsed.accounts) &&
      parsed.accounts.length === seedAccounts.length &&
      parsed.accounts.every(
        (account, index) =>
          account.email === seedAccounts[index].email &&
          typeof account.password === 'string' &&
          account.password.length >= 20,
      )
    ) {
      return { credentials: parsed, created: false }
    }
    throw new Error('unexpected credential file contents')
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw new Error(
        `Refusing to replace invalid seed credentials at ${path}. Move the file aside and retry.`,
      )
    }
  }

  return {
    credentials: {
      accounts: seedAccounts.map(({ email }) => ({
        email,
        password: createPassword(),
      })),
    },
    created: true,
  }
}

const readLocalStatus = async (cwd) => {
  const result = await runCommand(
    {
      command: 'pnpm',
      args: ['exec', 'supabase', 'status', '--workdir', cwd, '-o', 'json'],
    },
    { cwd, capture: true, manageSignals: false },
  )
  if (result.exitCode !== 0) {
    throw new Error('Local Phantom Supabase is not running.')
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new Error('Supabase returned an invalid local status response.')
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const parseLocalDatabaseUrl = (rawUrl) => {
  let databaseUrl
  try {
    databaseUrl = new URL(rawUrl)
  } catch {
    throw new Error('Local Supabase database URL is invalid.')
  }
  if (
    databaseUrl.protocol !== 'postgresql:' ||
    databaseUrl.hostname !== '127.0.0.1' ||
    databaseUrl.port !== '55322' ||
    databaseUrl.username !== 'postgres' ||
    databaseUrl.pathname !== '/postgres'
  ) {
    throw new Error('Refusing to seed an unexpected database endpoint.')
  }
  return databaseUrl
}

export const createLocalSeedDatabaseStep = (status, users, cwd) => {
  const databaseUrl = parseLocalDatabaseUrl(status.DB_URL)
  if (users.length !== 2 || users.some(({ id }) => !uuidPattern.test(id))) {
    throw new Error('Local Auth returned invalid seed user IDs.')
  }

  return {
    step: {
      command: 'psql',
      args: [
        '--host',
        databaseUrl.hostname,
        '--port',
        databaseUrl.port,
        '--username',
        databaseUrl.username,
        '--dbname',
        databaseUrl.pathname.slice(1),
        '--no-psqlrc',
        '--set',
        'ON_ERROR_STOP=on',
        '--set',
        `player_one=${users[0].id}`,
        '--set',
        `player_two=${users[1].id}`,
        '--file',
        resolve(cwd, 'supabase/seed.sql'),
      ],
    },
    environment: {
      ...process.env,
      PGPASSWORD: decodeURIComponent(databaseUrl.password),
    },
  }
}

const runDatabaseSeed = async (status, users, cwd) => {
  const { step, environment } = createLocalSeedDatabaseStep(status, users, cwd)
  const result = await runCommand(step, {
    cwd,
    env: environment,
    capture: true,
    manageSignals: false,
  })
  if (result.exitCode !== 0) {
    throw new Error('Unable to write local database fixtures.')
  }
}

const createRequester = (status, fetchImplementation) => {
  if (status.API_URL !== localSupabaseEndpoints.api) {
    throw new Error(
      `Refusing to seed unexpected local Supabase endpoint: ${status.API_URL ?? '(missing)'}.`,
    )
  }
  if (typeof status.SERVICE_ROLE_KEY !== 'string' || !status.SERVICE_ROLE_KEY) {
    throw new Error('Local Supabase service-role key is unavailable.')
  }

  return async (path, { method = 'GET', body } = {}) => {
    const response = await fetchImplementation(`${status.API_URL}${path}`, {
      method,
      headers: {
        apikey: status.SERVICE_ROLE_KEY,
        Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        ...(path.startsWith('/rest/v1/')
          ? { Prefer: 'resolution=merge-duplicates,return=minimal' }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) {
      throw new Error(
        `Local seed request failed at ${path} (${response.status}).`,
      )
    }
    return response
  }
}

const ensureUsers = async (request, credentials, credentialsWereCreated) => {
  const response = await request('/auth/v1/admin/users?page=1&per_page=1000')
  const existing = await response.json()
  if (!Array.isArray(existing.users)) {
    throw new Error('Local Auth returned an invalid user list.')
  }

  const users = []
  for (const [index, account] of seedAccounts.entries()) {
    const credential = credentials.accounts[index]
    const found = existing.users.find((user) => user.email === account.email)
    if (found) {
      if (found.user_metadata?.phantom_seed !== true) {
        throw new Error(
          `Refusing to modify existing non-seed account ${account.email}.`,
        )
      }
      if (credentialsWereCreated) {
        await request(`/auth/v1/admin/users/${found.id}`, {
          method: 'PUT',
          body: { password: credential.password },
        })
      }
      users.push(found)
      continue
    }

    const createdResponse = await request('/auth/v1/admin/users', {
      method: 'POST',
      body: {
        email: account.email,
        password: credential.password,
        email_confirm: true,
        user_metadata: { phantom_seed: true },
      },
    })
    const payload = await createdResponse.json()
    const created = payload.user ?? payload
    if (typeof created.id !== 'string') {
      throw new Error(`Local Auth did not return an ID for ${account.email}.`)
    }
    users.push(created)
  }
  return users
}

export const seedLocalDevelopment = async ({
  cwd,
  credentialDirectory = resolve(cwd, '.local'),
  fetch: fetchImplementation = fetch,
  inspect = inspectLocalStackTarget,
  readStatus = readLocalStatus,
  writeDatabase = runDatabaseSeed,
} = {}) => {
  const workspace = await inspect({ cwd })
  const status = await readStatus(workspace)
  const request = createRequester(status, fetchImplementation)
  parseLocalDatabaseUrl(status.DB_URL)
  const credentialFile = resolve(credentialDirectory, 'seed-accounts.json')
  const { credentials, created } = loadCredentials(credentialFile)

  const users = await ensureUsers(request, credentials, created)
  await writeDatabase(status, users, workspace)

  if (created) {
    mkdirSync(credentialDirectory, { recursive: true, mode: 0o700 })
    writeFileSync(credentialFile, `${JSON.stringify(credentials, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    })
  }
  chmodSync(credentialFile, 0o600)

  return {
    accounts: users.length,
    teams: 2,
    zones: 3,
    captures: 2,
    credentialFile,
  }
}
