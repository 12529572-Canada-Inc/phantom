import assert from 'node:assert/strict'
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import test from 'node:test'
import { executeTask } from './actions.mjs'
import { taskById } from './tasks.mjs'

test('database status runs Supabase from the supplied workspace directory', async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'phantom-dev-tui-'))
  const workspaceDirectory = join(temporaryDirectory, 'workspace')
  const markerPath = join(temporaryDirectory, 'cwd.txt')
  const fakePnpmPath = join(temporaryDirectory, 'pnpm')
  const originalPath = process.env.PATH
  const originalMarkerPath = process.env.PHANTOM_TEST_CWD_MARKER

  mkdirSync(workspaceDirectory)
  writeFileSync(
    fakePnpmPath,
    `#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
writeFileSync(process.env.PHANTOM_TEST_CWD_MARKER, process.cwd())
`,
  )
  chmodSync(fakePnpmPath, 0o755)

  process.env.PATH = `${temporaryDirectory}${delimiter}${originalPath}`
  process.env.PHANTOM_TEST_CWD_MARKER = markerPath

  try {
    const exitCode = await executeTask(taskById.get('database:status'), {
      cwd: workspaceDirectory,
      prerequisites: {
        pnpm: { available: true },
        supabase: { available: true },
      },
    })

    assert.equal(exitCode, 0)
    assert.equal(
      realpathSync(readFileSync(markerPath, 'utf8')),
      realpathSync(workspaceDirectory),
    )
  } finally {
    if (originalPath === undefined) {
      delete process.env.PATH
    } else {
      process.env.PATH = originalPath
    }
    if (originalMarkerPath === undefined) {
      delete process.env.PHANTOM_TEST_CWD_MARKER
    } else {
      process.env.PHANTOM_TEST_CWD_MARKER = originalMarkerPath
    }
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})
