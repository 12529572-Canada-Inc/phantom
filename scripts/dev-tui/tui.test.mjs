import assert from 'node:assert/strict'
import test from 'node:test'

import { tasks } from './tasks.mjs'
import { createTaskGroups, formatMenu, updateMenuState } from './tui.mjs'

const availablePrerequisites = {
  docker: { available: true },
  pnpm: { available: true },
  supabase: { available: true },
}

test('category view stays compact and does not render task descriptions', () => {
  const groups = createTaskGroups(tasks)
  const output = formatMenu(
    groups,
    { activeGroupIndex: null, selectedIndex: 0 },
    availablePrerequisites,
    '',
  )

  assert.deepEqual(
    groups.map((group) => group.name),
    ['Environment', 'Services', 'Database', 'Quality'],
  )
  assert.match(output, /› Environment\s+1 task/)
  assert.match(output, /Services\s+7 tasks/)
  assert.doesNotMatch(output, /Check Node, pnpm, Docker/)
  assert.ok(output.split('\n').length <= 10)
})

test('task view renders one group and only the selected description', () => {
  const groups = createTaskGroups(tasks)
  const output = formatMenu(
    groups,
    { activeGroupIndex: 1, selectedIndex: 0 },
    availablePrerequisites,
    '',
  )

  assert.match(output, /Services/)
  assert.match(output, /› Start or rebuild development stack/)
  assert.match(output, /Start local Supabase and rebuild the Docker API stack/)
  assert.doesNotMatch(output, /Stop only Phantom-owned Docker/)
  assert.doesNotMatch(output, /Apply pending migrations/)
  assert.ok(output.split('\n').length <= 17)
})

test('menu navigation opens a group, wraps tasks, and returns to categories', () => {
  const groups = createTaskGroups(tasks)
  let state = { activeGroupIndex: null, selectedIndex: 0 }

  state = updateMenuState(groups, state, 'next')
  assert.deepEqual(state, { activeGroupIndex: null, selectedIndex: 1 })

  state = updateMenuState(groups, state, 'open')
  assert.deepEqual(state, { activeGroupIndex: 1, selectedIndex: 0 })

  state = updateMenuState(groups, state, 'previous')
  assert.deepEqual(state, {
    activeGroupIndex: 1,
    selectedIndex: groups[1].tasks.length - 1,
  })

  state = updateMenuState(groups, state, 'back')
  assert.deepEqual(state, { activeGroupIndex: null, selectedIndex: 1 })
})
