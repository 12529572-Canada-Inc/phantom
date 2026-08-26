import { emitKeypressEvents } from 'node:readline'
import { inspectPrerequisites, missingRequirements } from './environment.mjs'
import { executeTask } from './actions.mjs'

const clear = () => process.stdout.write('\u001b[2J\u001b[H')

const readKey = () =>
  new Promise((resolve) => {
    process.stdin.once('keypress', (_value, key) => resolve(key))
  })

export const createTaskGroups = (tasks) => {
  const groups = []
  const groupByName = new Map()

  for (const task of tasks) {
    let group = groupByName.get(task.group)
    if (!group) {
      group = { name: task.group, tasks: [] }
      groupByName.set(task.group, group)
      groups.push(group)
    }
    group.tasks.push(task)
  }

  return groups
}

const wrapIndex = (index, change, length) =>
  length === 0 ? 0 : (index + change + length) % length

export const updateMenuState = (groups, state, intent) => {
  if (intent === 'back' && state.activeGroupIndex !== null) {
    return {
      activeGroupIndex: null,
      selectedIndex: state.activeGroupIndex,
    }
  }

  if (intent === 'open' && state.activeGroupIndex === null) {
    if (!groups[state.selectedIndex]) return state
    return { activeGroupIndex: state.selectedIndex, selectedIndex: 0 }
  }

  const change = intent === 'previous' ? -1 : intent === 'next' ? 1 : 0
  if (change === 0) return state

  const itemCount =
    state.activeGroupIndex === null
      ? groups.length
      : (groups[state.activeGroupIndex]?.tasks.length ?? 0)

  return {
    ...state,
    selectedIndex: wrapIndex(state.selectedIndex, change, itemCount),
  }
}

export const formatMenu = (groups, state, prerequisites, message) => {
  const activeGroup =
    state.activeGroupIndex === null ? null : groups[state.activeGroupIndex]
  const lines = ['Phantom development tasks']

  if (!activeGroup) {
    lines.push('Select a category')
    lines.push('↑/↓ navigate · Enter open · q/Esc exit', '')
    groups.forEach((group, index) => {
      const cursor = index === state.selectedIndex ? '›' : ' '
      const count = `${group.tasks.length} task${group.tasks.length === 1 ? '' : 's'}`
      lines.push(`${cursor} ${group.name.padEnd(16)} ${count}`)
    })
  } else {
    lines.push(activeGroup.name)
    lines.push('↑/↓ navigate · Enter run · ←/b back · q/Esc exit', '')
    activeGroup.tasks.forEach((task, index) => {
      const cursor = index === state.selectedIndex ? '›' : ' '
      const missing = missingRequirements(task, prerequisites)
      const unavailable = missing.length > 0 ? ' [unavailable]' : ''
      const destructive = task.destructive ? ' [destructive]' : ''
      lines.push(`${cursor} ${task.label}${destructive}${unavailable}`)
    })

    const selectedTask = activeGroup.tasks[state.selectedIndex]
    if (selectedTask) {
      const missing = missingRequirements(selectedTask, prerequisites)
      lines.push('', selectedTask.description)
      if (missing.length > 0) {
        lines.push(`Unavailable: ${missing.join(', ')}`)
      }
    }
  }

  if (message) lines.push('', message)
  return lines.join('\n')
}

const render = (groups, state, prerequisites, message) => {
  clear()
  console.log(formatMenu(groups, state, prerequisites, message))
}

export const runTui = async (tasks, { cwd } = {}) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      'The interactive menu requires a terminal. Use pnpm dev:task -- --list for headless commands.',
    )
    return 64
  }

  const prerequisites = inspectPrerequisites()
  const groups = createTaskGroups(tasks)
  let state = { activeGroupIndex: null, selectedIndex: 0 }
  let message = ''
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()

  try {
    while (true) {
      render(groups, state, prerequisites, message)
      const key = await readKey()
      message = ''

      if (
        key.name === 'q' ||
        key.name === 'escape' ||
        (key.ctrl && key.name === 'c')
      ) {
        clear()
        return 0
      }

      if (key.name === 'up' || key.name === 'k') {
        state = updateMenuState(groups, state, 'previous')
      } else if (key.name === 'down' || key.name === 'j') {
        state = updateMenuState(groups, state, 'next')
      } else if (key.name === 'left' || key.name === 'b') {
        state = updateMenuState(groups, state, 'back')
      } else if (key.name === 'return') {
        if (state.activeGroupIndex === null) {
          state = updateMenuState(groups, state, 'open')
          continue
        }

        const selectedTask =
          groups[state.activeGroupIndex]?.tasks[state.selectedIndex]
        if (!selectedTask) continue
        const missing = missingRequirements(selectedTask, prerequisites)
        if (missing.length > 0) {
          message = `Unavailable: ${missing.join(', ')}. Run Check prerequisites for guidance.`
          continue
        }

        clear()
        process.stdin.setRawMode(false)
        const exitCode = await executeTask(selectedTask, {
          cwd,
          prerequisites,
        })
        console.log('\nPress Enter to return to the menu.')
        await new Promise((resolve) => process.stdin.once('data', resolve))
        process.stdin.setRawMode(true)
        message =
          exitCode === 0
            ? `${selectedTask.label} succeeded.`
            : `${selectedTask.label} exited with ${exitCode}.`
      }
    }
  } finally {
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }
}
