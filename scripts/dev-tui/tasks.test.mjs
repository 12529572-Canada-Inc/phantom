import assert from 'node:assert/strict'
import test from 'node:test'
import { confirmDestructiveAction, isLocalOnlyAction } from './guards.mjs'
import { taskById, tasks } from './tasks.mjs'

test('task IDs are unique and actions do not invoke a shell', () => {
  assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length)

  for (const task of tasks) {
    const actions =
      task.action.type === 'sequence' ? task.action.steps : [task.action]
    for (const action of actions) {
      if (action.type === 'external') {
        assert.equal(typeof action.command, 'string')
        assert.ok(Array.isArray(action.args))
        assert.equal('shell' in action, false)
      }
    }
  }
})

test('database reset is fixed to the local project and requires confirmation', () => {
  const reset = taskById.get('database:reset')

  assert.ok(reset.destructive)
  assert.equal(isLocalOnlyAction(reset), true)
  assert.deepEqual(reset.action.args.slice(-2), ['reset', '--local'])
  assert.match(reset.destructive.target, /127\.0\.0\.1:55322/)
  assert.equal(reset.destructive.confirmation, 'reset local phantom')
})

test('nuke and pave is a fixed local-stack action with explicit confirmation', () => {
  const rebuild = taskById.get('services:nuke')

  assert.ok(rebuild.destructive)
  assert.equal(rebuild.action.type, 'local-stack-rebuild')
  assert.equal(isLocalOnlyAction(rebuild), true)
  assert.match(rebuild.destructive.target, /Compose project \"phantom\"/)
  assert.match(rebuild.destructive.target, /Supabase project \"phantom\"/)
  assert.equal(rebuild.destructive.confirmation, 'nuke and pave phantom')
  assert.match(rebuild.notice, /permanently deletes/i)
})

test('destructive actions that are not provably local are refused', async () => {
  const reset = taskById.get('database:reset')
  const unsafeReset = {
    ...reset,
    action: {
      ...reset.action,
      args: reset.action.args.filter((argument) => argument !== '--local'),
    },
  }

  assert.equal(isLocalOnlyAction(unsafeReset), false)
  await assert.rejects(
    confirmDestructiveAction(unsafeReset),
    /not provably local-only/,
  )
})

test('the local stack action is rejected when its fixed action changes', () => {
  const rebuild = taskById.get('services:nuke')

  assert.equal(
    isLocalOnlyAction({
      ...rebuild,
      action: {
        type: 'external',
        command: 'docker',
        args: ['system', 'prune'],
      },
    }),
    false,
  )
})

test('task definitions and nested destructive actions are immutable', () => {
  const rebuild = taskById.get('services:nuke')

  assert.equal(Object.isFrozen(rebuild), true)
  assert.equal(Object.isFrozen(rebuild.action), true)
  assert.equal(Object.isFrozen(rebuild.destructive), true)
})

test('destructive confirmation requires interactive input and output', async () => {
  const output = {
    isTTY: false,
    write() {},
  }

  assert.equal(
    await confirmDestructiveAction(taskById.get('services:nuke'), {
      input: { isTTY: true },
      output,
    }),
    false,
  )
})

test('pre-PR checks stop-capable commands are defined in expected order', () => {
  const prePr = taskById.get('quality:pre-pr')

  assert.deepEqual(
    prePr.action.steps.map((step) => step.args.at(-1)),
    ['**/*.{ts,tsx,md,json,mjs}', 'lint', 'type-check', 'test', 'build'],
  )
})
