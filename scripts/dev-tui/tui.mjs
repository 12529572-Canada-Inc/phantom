import { emitKeypressEvents } from 'node:readline'
import { inspectPrerequisites, missingRequirements } from './environment.mjs'
import { executeTask } from './actions.mjs'

const clear = () => process.stdout.write('\u001b[2J\u001b[H')

const readKey = () =>
  new Promise((resolve) => {
    process.stdin.once('keypress', (_value, key) => resolve(key))
  })

const render = (tasks, selected, prerequisites, message) => {
  clear()
  console.log('Phantom development tasks')
  console.log('↑/↓ navigate · Enter run · q/Esc exit\n')

  let group
  tasks.forEach((task, index) => {
    if (task.group !== group) {
      group = task.group
      console.log(`${group}`)
    }

    const cursor = index === selected ? '›' : ' '
    const missing = missingRequirements(task, prerequisites)
    const unavailable =
      missing.length > 0 ? ` (unavailable: ${missing.join(', ')})` : ''
    const destructive = task.destructive ? ' [destructive]' : ''
    console.log(
      `${cursor} ${task.label}${destructive}${unavailable}\n    ${task.description}`,
    )
  })

  if (message) {
    console.log(`\n${message}`)
  }
}

export const runTui = async (tasks, { cwd } = {}) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      'The interactive menu requires a terminal. Use pnpm dev:task -- --list for headless commands.',
    )
    return 64
  }

  const prerequisites = inspectPrerequisites()
  let selected = 0
  let message = ''
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()

  try {
    while (true) {
      render(tasks, selected, prerequisites, message)
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
        selected = (selected - 1 + tasks.length) % tasks.length
      } else if (key.name === 'down' || key.name === 'j') {
        selected = (selected + 1) % tasks.length
      } else if (key.name === 'return') {
        const selectedTask = tasks[selected]
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
