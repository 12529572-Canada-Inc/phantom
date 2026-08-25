import { createInterface } from 'node:readline/promises'

export const isLocalOnlyAction = (task) =>
  task.action.type === 'external' &&
  task.action.args.includes('--local') &&
  task.destructive?.target.startsWith('local Supabase project ')

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

  if (!input.isTTY) {
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
