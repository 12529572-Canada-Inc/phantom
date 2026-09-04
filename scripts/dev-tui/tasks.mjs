import { localDatabaseTarget, localStackTarget } from './local-config.mjs'

const external = (command, args) => ({
  type: 'external',
  command,
  args,
})

const freezeAction = (action) => {
  const args = action.args
    ? { args: Object.freeze([...action.args]) }
    : undefined

  if (action.type === 'sequence') {
    return Object.freeze({
      ...action,
      steps: Object.freeze(action.steps.map((step) => freezeAction(step))),
    })
  }

  return Object.freeze({ ...action, ...args })
}

const task = (definition) =>
  Object.freeze({
    ...definition,
    requires: Object.freeze([...definition.requires]),
    action: freezeAction(definition.action),
    ...(definition.destructive
      ? { destructive: Object.freeze({ ...definition.destructive }) }
      : {}),
  })

export const tasks = Object.freeze([
  task({
    id: 'environment:check',
    group: 'Environment',
    label: 'Check prerequisites',
    description:
      'Check Node, pnpm, Docker, Supabase CLI, psql, and optional API environment variables.',
    requires: [],
    action: { type: 'environment-check' },
  }),
  task({
    id: 'services:start',
    group: 'Services',
    label: 'Start or rebuild development stack',
    description: 'Start local Supabase and rebuild the Docker API stack.',
    requires: ['pnpm', 'docker', 'supabase'],
    action: external('pnpm', ['docker:start']),
  }),
  task({
    id: 'services:stop',
    group: 'Services',
    label: 'Stop development stack',
    description: 'Stop only Phantom-owned Docker and Supabase services.',
    requires: ['pnpm', 'docker', 'supabase'],
    action: external('pnpm', ['docker:stop']),
  }),
  task({
    id: 'services:nuke',
    group: 'Services',
    label: 'Nuke and pave local stack',
    description:
      'Permanently replace Phantom Docker resources and local Supabase data.',
    requires: ['pnpm', 'docker', 'supabase'],
    notice:
      'WARNING: This permanently deletes local Supabase data and the local Docker Compose project "phantom" (containers, volumes, and network), then rebuilds both from scratch. Source files, dependencies, environment files, hosted Supabase, and unrelated Docker projects are preserved.',
    destructive: {
      target: localStackTarget,
      confirmation: 'nuke and pave phantom',
    },
    action: { type: 'local-stack-rebuild' },
  }),
  task({
    id: 'services:status',
    group: 'Services',
    label: 'Show service status',
    description:
      'Show Docker service health and safe local Supabase endpoints.',
    requires: ['pnpm', 'docker', 'supabase'],
    action: external('pnpm', ['docker:status']),
  }),
  task({
    id: 'services:logs',
    group: 'Services',
    label: 'Follow API logs',
    description: 'Stream API container logs until interrupted.',
    requires: ['pnpm', 'docker'],
    action: external('pnpm', ['docker:logs']),
  }),
  task({
    id: 'services:expo:ios',
    group: 'Services',
    label: 'Launch Expo for iOS simulator',
    description: 'Launch Expo with API guidance for the iOS simulator.',
    requires: ['pnpm'],
    notice: 'Expo API URL: http://localhost:3001',
    action: external('pnpm', ['--filter', '@phantom/mobile', 'dev', '--ios']),
  }),
  task({
    id: 'services:expo:android',
    group: 'Services',
    label: 'Launch Expo for Android emulator',
    description: 'Launch Expo with API guidance for the Android emulator.',
    requires: ['pnpm'],
    notice: 'Expo API URL: http://10.0.2.2:3001',
    action: external('pnpm', [
      '--filter',
      '@phantom/mobile',
      'dev',
      '--android',
    ]),
  }),
  task({
    id: 'services:expo:device',
    group: 'Services',
    label: 'Launch Expo for a physical device',
    description: 'Launch Expo and show LAN connection guidance.',
    requires: ['pnpm'],
    notice:
      'Use http://<development-machine-LAN-IP>:3001; both devices must share a network.',
    action: external('pnpm', ['--filter', '@phantom/mobile', 'dev']),
  }),
  task({
    id: 'database:start',
    group: 'Database',
    label: 'Start local Supabase',
    description: 'Start the Supabase project configured in this repository.',
    requires: ['pnpm', 'supabase'],
    action: external('pnpm', ['exec', 'supabase', 'start']),
  }),
  task({
    id: 'database:stop',
    group: 'Database',
    label: 'Stop local Supabase',
    description: 'Stop only the local Supabase project.',
    requires: ['pnpm', 'supabase'],
    action: external('pnpm', ['exec', 'supabase', 'stop']),
  }),
  task({
    id: 'database:migrate',
    group: 'Database',
    label: 'Apply pending migrations',
    description: 'Apply pending migrations to the local database.',
    requires: ['pnpm', 'supabase'],
    action: external('pnpm', [
      'exec',
      'supabase',
      'migration',
      'up',
      '--local',
    ]),
  }),
  task({
    id: 'database:reset',
    group: 'Database',
    label: 'Reset local database',
    description: 'Recreate only the local Phantom database from migrations.',
    requires: ['pnpm', 'supabase'],
    destructive: {
      target: localDatabaseTarget,
      confirmation: 'reset local phantom',
    },
    action: external('pnpm', ['exec', 'supabase', 'db', 'reset', '--local']),
  }),
  task({
    id: 'database:status',
    group: 'Database',
    label: 'Show local database endpoints',
    description: 'Show local API and Studio endpoints without printing keys.',
    requires: ['pnpm', 'supabase'],
    action: { type: 'database-status' },
  }),
  task({
    id: 'database:seed',
    group: 'Database',
    label: 'Seed development data',
    description:
      'Idempotently add fictional accounts, teams, zones, and capture history to local Phantom Supabase.',
    requires: ['pnpm', 'docker', 'supabase', 'psql'],
    notice:
      'Seeds only local Phantom Supabase. Existing unrelated data is preserved.',
    action: { type: 'local-development-seed' },
  }),
  task({
    id: 'quality:format',
    group: 'Quality',
    label: 'Format repository',
    description: 'Write Prettier formatting changes.',
    requires: ['pnpm'],
    action: external('pnpm', ['format']),
  }),
  task({
    id: 'quality:format-check',
    group: 'Quality',
    label: 'Check formatting',
    description: 'Check repository formatting without writing files.',
    requires: ['pnpm'],
    action: external('pnpm', [
      'exec',
      'prettier',
      '--check',
      '**/*.{ts,tsx,md,json,mjs}',
    ]),
  }),
  task({
    id: 'quality:lint',
    group: 'Quality',
    label: 'Run lint',
    description: 'Run workspace lint tasks.',
    requires: ['pnpm'],
    action: external('pnpm', ['lint']),
  }),
  task({
    id: 'quality:type-check',
    group: 'Quality',
    label: 'Run type checks',
    description: 'Run workspace TypeScript checks.',
    requires: ['pnpm'],
    action: external('pnpm', ['type-check']),
  }),
  task({
    id: 'quality:test',
    group: 'Quality',
    label: 'Run tests',
    description: 'Run repository tests.',
    requires: ['pnpm'],
    action: external('pnpm', ['test']),
  }),
  task({
    id: 'quality:build',
    group: 'Quality',
    label: 'Build workspaces',
    description: 'Build all workspaces that define a build task.',
    requires: ['pnpm'],
    action: external('pnpm', ['build']),
  }),
  task({
    id: 'quality:pre-pr',
    group: 'Quality',
    label: 'Run pre-PR checks',
    description:
      'Check formatting, lint, types, tests, and builds in sequence.',
    requires: ['pnpm'],
    action: {
      type: 'sequence',
      steps: [
        external('pnpm', [
          'exec',
          'prettier',
          '--check',
          '**/*.{ts,tsx,md,json,mjs}',
        ]),
        external('pnpm', ['lint']),
        external('pnpm', ['type-check']),
        external('pnpm', ['test']),
        external('pnpm', ['build']),
      ],
    },
  }),
])

export const taskById = new Map(
  tasks.map((definition) => [definition.id, definition]),
)
