#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { executeTask } from './actions.mjs'
import { taskById, tasks } from './tasks.mjs'
import { runTui } from './tui.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const printHelp = () => {
  console.log(`Phantom development tasks

Usage:
  pnpm dev:tui
  pnpm dev:task -- --list
  pnpm dev:task -- <task-id> [--dry-run]

Options:
  --list       List task IDs and descriptions
  --dry-run    Show commands without running them
  --help       Show this help

Destructive tasks require an interactive typed confirmation. Values are passed
directly to child processes without shell interpolation.`)
}

const printTasks = () => {
  for (const task of tasks) {
    console.log(`${task.id.padEnd(24)} ${task.description}`)
  }
}

const main = async () => {
  const arguments_ = process.argv
    .slice(2)
    .filter((argument) => argument !== '--')

  if (arguments_.length === 0) {
    return runTui(tasks, { cwd: repositoryRoot })
  }

  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    printHelp()
    return 0
  }

  if (arguments_.includes('--list')) {
    printTasks()
    return 0
  }

  const unknownOptions = arguments_.filter(
    (argument) => argument.startsWith('-') && argument !== '--dry-run',
  )
  if (unknownOptions.length > 0) {
    console.error(`Unknown option: ${unknownOptions.join(', ')}`)
    printHelp()
    return 64
  }

  const taskId = arguments_.find((argument) => !argument.startsWith('-'))
  const selectedTask = taskById.get(taskId)
  if (!selectedTask) {
    console.error(`Unknown task: ${taskId ?? '(missing)'}`)
    printHelp()
    return 64
  }

  return executeTask(selectedTask, {
    cwd: repositoryRoot,
    dryRun: arguments_.includes('--dry-run'),
  })
}

process.exitCode = await main()
