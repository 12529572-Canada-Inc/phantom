import { spawnSync } from 'node:child_process'
import {
  inspectPrerequisites,
  missingRequirements,
  printEnvironmentReport,
} from './environment.mjs'
import { confirmDestructiveAction } from './guards.mjs'
import { createNukeAndPavePlan, runNukeAndPave } from './local-stack.mjs'
import {
  formatCommand,
  redactSecrets,
  runCommand,
  runSequence,
} from './process-runner.mjs'

const printDatabaseEndpoints = (cwd) => {
  const status = spawnSync('pnpm', ['exec', 'supabase', 'status'], {
    cwd,
    shell: false,
    stdio: 'ignore',
  })

  if (status.status !== 0) {
    console.error('Local Supabase is not running.')
    return 1
  }

  console.log('Local Supabase is running.')
  console.log('  API: http://127.0.0.1:54321')
  console.log('  Studio: http://127.0.0.1:54323')
  console.log('  Database: 127.0.0.1:54322')
  console.log('  Keys are intentionally hidden.')
  return 0
}

const runExternal = async (action, options) => {
  if (options.dryRun) {
    console.log(`[dry-run] ${formatCommand(action)}`)
    return 0
  }

  const result = await runCommand(action, options)
  return result.exitCode
}

const runAction = async (task, options) => {
  switch (task.action.type) {
    case 'environment-check':
      printEnvironmentReport(options.prerequisites)
      return Object.values(options.prerequisites).every(
        (status) => status.available,
      )
        ? 0
        : 1
    case 'database-status':
      if (options.dryRun) {
        console.log(
          '[dry-run] inspect local Supabase status and safe endpoints',
        )
        return 0
      }
      return printDatabaseEndpoints(options.cwd)
    case 'local-stack-rebuild': {
      if (options.dryRun) {
        for (const step of createNukeAndPavePlan(options.cwd)) {
          console.log(`[dry-run] ${formatCommand(step)}`)
        }
        return 0
      }

      try {
        const result = await runNukeAndPave({
          cwd: options.cwd,
          filterOutput: options.filterOutput,
        })
        for (const stepResult of result.results) {
          const marker = stepResult.exitCode === 0 ? '✓' : '✗'
          console.log(
            `${marker} ${formatCommand(stepResult.step)} (exit ${stepResult.exitCode})`,
          )
        }
        return result.exitCode
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Safety check failed: ${message}`)
        return 78
      }
    }
    case 'sequence': {
      if (options.dryRun) {
        for (const step of task.action.steps) {
          console.log(`[dry-run] ${formatCommand(step)}`)
        }
        return 0
      }

      const result = await runSequence(task.action.steps, options)
      for (const stepResult of result.results) {
        const marker = stepResult.exitCode === 0 ? '✓' : '✗'
        console.log(
          `${marker} ${formatCommand(stepResult.step)} (exit ${stepResult.exitCode})`,
        )
      }
      return result.exitCode
    }
    case 'external':
      return runExternal(task.action, options)
    default:
      throw new Error(`Unknown action type: ${task.action.type}`)
  }
}

export const executeTask = async (
  task,
  {
    cwd,
    dryRun = false,
    prerequisites,
    confirm = confirmDestructiveAction,
    inspect = inspectPrerequisites,
  } = {},
) => {
  if (task.notice) {
    console.log(task.notice)
  }

  if (task.destructive && !dryRun && !(await confirm(task))) {
    console.error('Cancelled; no changes were made.')
    return 64
  }

  const prerequisiteStatuses =
    prerequisites ?? (task.destructive && dryRun ? {} : inspect())
  const missing = missingRequirements(task, prerequisiteStatuses)
  if (missing.length > 0 && !dryRun) {
    console.error(
      `Cannot run ${task.id}: missing ${missing.join(', ')}. Run environment:check for setup guidance.`,
    )
    return 69
  }

  console.log(`\n${task.label}`)
  const exitCode = await runAction(task, {
    cwd,
    dryRun,
    filterOutput: redactSecrets,
    prerequisites: prerequisiteStatuses,
  })
  const summary =
    exitCode === 0
      ? `✓ ${task.label} completed`
      : `✗ ${task.label} failed (exit ${exitCode})`
  console.log(`\n${summary}`)
  return exitCode
}
