import assert from 'node:assert/strict'
import test from 'node:test'
import { redactSecrets, runCommand, runSequence } from './process-runner.mjs'

test('known local service credentials are redacted', () => {
  const output = redactSecrets(`API URL: http://127.0.0.1:54321
anon key: ey-secret
service_role key: service-secret
SUPABASE_SERVICE_ROLE_KEY=environment-secret
DB URL: postgresql://postgres:password@127.0.0.1:54322/postgres`)

  assert.match(output, /API URL: http:\/\/127\.0\.0\.1:54321/)
  assert.doesNotMatch(
    output,
    /ey-secret|service-secret|environment-secret|:password@/,
  )
  assert.match(output, /anon key: \[redacted\]/)
  assert.match(output, /postgres:\[redacted\]@/)
})

test('arguments are passed literally without shell interpolation', async () => {
  const literal = '$(printf unsafe); *.secret; $HOME'
  const result = await runCommand(
    {
      command: process.execPath,
      args: ['-e', 'process.stdout.write(process.argv[1])', literal],
    },
    { capture: true, manageSignals: false },
  )

  assert.equal(result.exitCode, 0)
  assert.equal(result.stdout, literal)
})

test('process exit codes are preserved', async () => {
  const result = await runCommand(
    { command: process.execPath, args: ['-e', 'process.exit(7)'] },
    { capture: true, manageSignals: false },
  )

  assert.equal(result.exitCode, 7)
})

test('a sequence stops after the first failure', async () => {
  const result = await runSequence(
    [
      { command: process.execPath, args: ['-e', 'process.exit(0)'] },
      { command: process.execPath, args: ['-e', 'process.exit(9)'] },
      { command: process.execPath, args: ['-e', 'process.exit(0)'] },
    ],
    { capture: true, manageSignals: false },
  )

  assert.equal(result.exitCode, 9)
  assert.equal(result.results.length, 2)
})

test('aborting a process reports cancellation', async () => {
  const controller = new AbortController()
  const result = await runCommand(
    {
      command: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
    },
    {
      capture: true,
      manageSignals: false,
      signal: controller.signal,
      onSpawn: () => setTimeout(() => controller.abort(), 25),
    },
  )

  assert.equal(result.exitCode, 130)
  assert.equal(result.cancelled, true)
})
