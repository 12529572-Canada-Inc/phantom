import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  createLocalSeedDatabaseStep,
  seedAccounts,
  seedLocalDevelopment,
} from './development-seed.mjs'

const status = {
  API_URL: 'http://127.0.0.1:55321',
  DB_URL: 'postgresql://postgres:local-password@127.0.0.1:55322/postgres',
  SERVICE_ROLE_KEY: 'local-service-role-test-key',
}

const response = (body = null, statusCode = 200) => ({
  ok: statusCode >= 200 && statusCode < 300,
  status: statusCode,
  async json() {
    return body
  },
})

test('seeds only the fixed local endpoint and writes protected credentials', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'phantom-seed-'))
  const requests = []
  const fetch = async (url, options = {}) => {
    requests.push({ url, options })
    if (url.includes('/auth/v1/admin/users?')) return response({ users: [] })
    if (url.endsWith('/auth/v1/admin/users')) {
      const account = JSON.parse(options.body)
      const index = seedAccounts.findIndex(
        ({ email }) => email === account.email,
      )
      return response({
        id: `40000000-0000-4000-8000-00000000000${index + 1}`,
        ...account,
      })
    }
    return response()
  }

  const result = await seedLocalDevelopment({
    cwd: workspace,
    credentialDirectory: join(workspace, '.local'),
    fetch,
    inspect: async () => workspace,
    readStatus: async () => status,
    writeDatabase: async () => {},
  })

  assert.equal(result.accounts, 2)
  assert.ok(requests.every(({ url }) => url.startsWith(status.API_URL)))
  assert.ok(
    requests.every(
      ({ options }) => options.headers.apikey === status.SERVICE_ROLE_KEY,
    ),
  )
  const credentialFile = join(workspace, '.local/seed-accounts.json')
  assert.equal(statSync(credentialFile).mode & 0o777, 0o600)
  const credentials = JSON.parse(readFileSync(credentialFile, 'utf8'))
  assert.deepEqual(
    credentials.accounts.map(({ email }) => email),
    seedAccounts.map(({ email }) => email),
  )
  assert.ok(credentials.accounts.every(({ password }) => password.length >= 20))
})

test('repeat runs reuse credentials and update only marked seed accounts', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'phantom-seed-repeat-'))
  const credentialDirectory = join(workspace, '.local')
  const requests = []
  const fetch = async (url, options = {}) => {
    requests.push({ url, options })
    if (url.includes('/auth/v1/admin/users?')) {
      return response({
        users: seedAccounts.map(({ email }, index) => ({
          id: `40000000-0000-4000-8000-00000000000${index + 1}`,
          email,
          user_metadata: { phantom_seed: true },
        })),
      })
    }
    return response()
  }
  const options = {
    cwd: workspace,
    credentialDirectory,
    fetch,
    inspect: async () => workspace,
    readStatus: async () => status,
    writeDatabase: async () => {},
  }

  await seedLocalDevelopment(options)
  const firstCredentials = readFileSync(
    join(credentialDirectory, 'seed-accounts.json'),
    'utf8',
  )
  requests.length = 0
  await seedLocalDevelopment(options)

  assert.equal(
    readFileSync(join(credentialDirectory, 'seed-accounts.json'), 'utf8'),
    firstCredentials,
  )
  assert.equal(
    requests.filter(
      ({ url, options }) =>
        url.includes('/auth/v1/admin/users/') && options.method === 'PUT',
    ).length,
    0,
  )
})

test('refuses an unexpected endpoint before sending fixture data', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'phantom-seed-hosted-'))
  let requested = false

  await assert.rejects(
    seedLocalDevelopment({
      cwd: workspace,
      credentialDirectory: join(workspace, '.local'),
      fetch: async () => {
        requested = true
        return response()
      },
      inspect: async () => workspace,
      readStatus: async () => ({
        ...status,
        API_URL: 'https://project.supabase.co',
      }),
      writeDatabase: async () => {},
    }),
    /expected local Supabase endpoint/,
  )
  assert.equal(requested, false)
})

test('refuses an unexpected database before creating seed users', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'phantom-seed-db-hosted-'))
  let requested = false

  await assert.rejects(
    seedLocalDevelopment({
      cwd: workspace,
      credentialDirectory: join(workspace, '.local'),
      fetch: async () => {
        requested = true
        return response()
      },
      inspect: async () => workspace,
      readStatus: async () => ({
        ...status,
        DB_URL: 'postgresql://postgres:password@db.example.com:5432/postgres',
      }),
      writeDatabase: async () => {},
    }),
    /unexpected database endpoint/,
  )
  assert.equal(requested, false)
})

test('database seed command targets only the fixed Phantom database', () => {
  const users = [
    { id: '40000000-0000-4000-8000-000000000001' },
    { id: '40000000-0000-4000-8000-000000000002' },
  ]
  const { step, environment } = createLocalSeedDatabaseStep(
    status,
    users,
    '/repo',
  )

  assert.equal(step.command, 'psql')
  assert.deepEqual(step.args.slice(0, 8), [
    '--host',
    '127.0.0.1',
    '--port',
    '55322',
    '--username',
    'postgres',
    '--dbname',
    'postgres',
  ])
  assert.equal(step.args.at(-1), '/repo/supabase/seed.sql')
  assert.equal(environment.PGPASSWORD, 'local-password')
})
