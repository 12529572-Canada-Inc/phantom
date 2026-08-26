import { createInterface } from 'node:readline/promises'

const isLocalDatabaseReset = (task) =>
  task.id === 'database:reset' &&
  task.action.type === 'external' &&
  task.action.command === 'pnpm' &&
  JSON.stringify(task.action.args) ===
    JSON.stringify(['exec', 'supabase', 'db', 'reset', '--local']) &&
  task.destructive?.target ===
    'local Supabase project "phantom" at 127.0.0.1:54322' &&
  task.destructive?.confirmation === 'reset local phantom'

const isLocalStackRebuild = (task) =>
  task.id === 'services:nuke' &&
  task.action.type === 'local-stack-rebuild' &&
  task.destructive?.target ===
    'local Docker Compose project "phantom" and local Supabase project "phantom"' &&
  task.destructive?.confirmation === 'nuke and pave phantom'

export const isLocalOnlyAction = (task) =>
  isLocalDatabaseReset(task) || isLocalStackRebuild(task)

export const confirmDestructiveAction = async (
  task,
  { input = process.stdin, output = process.stdout } = {},
) => {
  if (!task.destructive) {
    return true
  }

  if (!isLocalOnlyAction(task)) {
    throw new Error(
      `Refusing destructive task "${task.id}" because it is not provably local-only.`,
    )
  }

  if (!input.isTTY || !output.isTTY) {
    output.write(
      'Refusing destructive action without an interactive terminal. Use --dry-run to inspect it.\n',
    )
    return false
  }

  output.write(`Target: ${task.destructive.target}\n`)
  const prompt = createInterface({ input, output })
  try {
    const answer = await prompt.question(
      `Type "${task.destructive.confirmation}" to continue: `,
    )
    return answer === task.destructive.confirmation
  } finally {
    prompt.close()
  }
}
