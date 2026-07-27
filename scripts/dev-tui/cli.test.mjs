import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = resolve(dirname(fileURLToPath(import.meta.url)), 'index.mjs')

test('pnpm-style argument separators are accepted', () => {
  const result = spawnSync(
    process.execPath,
    [script, '--', 'database:reset', '--dry-run'],
    {
      encoding: 'utf8',
      shell: false,
    },
  )

  assert.equal(result.status, 0)
  assert.match(result.stdout, /supabase db reset --local/)
})
