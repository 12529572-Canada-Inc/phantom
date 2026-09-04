import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { localSupabasePorts } from './local-config.mjs'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const supabaseConfig = readFileSync(
  resolve(repositoryRoot, 'supabase/config.toml'),
  'utf8',
)

const section = (name, config = supabaseConfig) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const remainder = config.split(new RegExp(`\\[${escapedName}\\]\\r?\\n`))[1]
  return remainder?.split(/\r?\n\[/)[0]
}

test('Supabase sections parse with LF and CRLF line endings', () => {
  const config = '[api]\nport = 55321\n\n[db]\nport = 55322\n'

  assert.equal(section('api', config), 'port = 55321\n')
  assert.equal(
    section('api', config.replaceAll('\n', '\r\n')),
    'port = 55321\r\n',
  )
})

test('Phantom uses a dedicated Supabase port block', () => {
  assert.deepEqual(localSupabasePorts, {
    shadowDatabase: 55320,
    api: 55321,
    database: 55322,
    studio: 55323,
    mailpit: 55324,
    smtp: 55325,
    pop3: 55326,
    analytics: 55327,
    pooler: 55329,
  })

  const defaultSupabasePorts = new Set([
    54320, 54321, 54322, 54323, 54324, 54325, 54326, 54327, 54329,
  ])
  for (const port of Object.values(localSupabasePorts)) {
    assert.equal(defaultSupabasePorts.has(port), false)
  }
})

test('Supabase configuration declares every Phantom local port', () => {
  assert.match(section('api'), /port = 55321/)
  assert.match(section('db'), /port = 55322/)
  assert.match(section('db'), /shadow_port = 55320/)
  assert.match(section('db.pooler'), /port = 55329/)
  assert.match(section('studio'), /port = 55323/)
  assert.match(section('local_smtp'), /port = 55324/)
  assert.match(section('local_smtp'), /smtp_port = 55325/)
  assert.match(section('local_smtp'), /pop3_port = 55326/)
  assert.match(section('analytics'), /port = 55327/)
})

test('application defaults use the Phantom Supabase API port', () => {
  const compose = readFileSync(resolve(repositoryRoot, 'compose.yaml'), 'utf8')
  const mobileEnvironment = readFileSync(
    resolve(repositoryRoot, 'apps/mobile/.env.example'),
    'utf8',
  )

  assert.match(compose, /host\.docker\.internal:55321/)
  assert.doesNotMatch(compose, /host\.docker\.internal:54321/)
  assert.match(mobileEnvironment, /127\.0\.0\.1:55321/)
})
