import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localProjectId, localSupabasePorts } from './local-config.mjs'
import { runCommand } from './process-runner.mjs'

const repositoryRoot = realpathSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
)
const redirectVariables = [
  'COMPOSE_FILE',
  'COMPOSE_PATH_SEPARATOR',
  'COMPOSE_PROJECT_NAME',
  'DOCKER_CONTEXT',
  'DOCKER_HOST',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
  'SUPABASE_WORKDIR',
]

const composeArguments = (workspace) => [
  'compose',
  '--file',
  resolve(workspace, 'compose.yaml'),
  '--project-directory',
  workspace,
  '--project-name',
  localProjectId,
]

export const assertSafeControlEnvironment = (environment) => {
  const activeRedirects = redirectVariables.filter(
    (name) => String(environment[name] ?? '').trim().length > 0,
  )

  if (activeRedirects.length > 0) {
    throw new Error(
      `Refusing destructive action while redirect variables are set: ${activeRedirects.join(', ')}`,
    )
  }
}

export const isLocalDockerEndpoint = (endpoint) =>
  /^(?:unix|npipe):\/\//.test(endpoint.trim())

const isPhantomSupabaseContainer = (container, supabaseProject) =>
  supabaseProject === localProjectId &&
  container.startsWith('supabase_') &&
  container.endsWith(`_${localProjectId}`)

export const findSupabasePortConflicts = (containerBindings) => {
  const conflicts = []

  for (const binding of containerBindings.split(/\r?\n/).filter(Boolean)) {
    const [container, ports, supabaseProject] = binding.split('|')
    if (!container || ports === undefined) continue
    if (isPhantomSupabaseContainer(container, supabaseProject)) continue

    for (const port of Object.values(localSupabasePorts)) {
      if (ports.includes(`:${port}->`)) {
        conflicts.push({ container, port })
      }
    }
  }

  return conflicts
}

export const createNukeAndPavePlan = (workspaceDirectory) => {
  const workspace = resolve(workspaceDirectory)
  const compose = composeArguments(workspace)

  return [
    {
      command: 'docker',
      args: [
        ...compose,
        'down',
        '--volumes',
        '--remove-orphans',
        '--timeout',
        '15',
      ],
    },
    {
      command: 'pnpm',
      args: [
        'exec',
        'supabase',
        'stop',
        '--workdir',
        workspace,
        '--project-id',
        localProjectId,
        '--no-backup',
      ],
    },
    {
      command: 'pnpm',
      args: ['exec', 'supabase', 'start', '--workdir', workspace],
    },
    {
      command: 'pnpm',
      args: [
        'exec',
        'supabase',
        'migration',
        'up',
        '--workdir',
        workspace,
        '--local',
        '--include-all',
      ],
    },
    {
      command: 'docker',
      args: [...compose, 'build', '--no-cache', 'api'],
    },
    {
      command: 'docker',
      args: [...compose, 'up', '--detach', '--force-recreate', '--wait', 'api'],
    },
  ]
}

const assertRegularRepositoryFile = (path, label) => {
  const status = lstatSync(path)
  if (!status.isFile() || status.isSymbolicLink()) {
    throw new Error(`${label} must be a regular file in this checkout.`)
  }
}

const runInspection = async (step, options) => {
  const result = await options.run(step, {
    cwd: options.cwd,
    env: options.env,
    capture: true,
    manageSignals: false,
  })
  if (result.exitCode !== 0) {
    throw new Error(
      `Safety inspection failed: ${step.command} ${step.args.join(' ')}`,
    )
  }
  return result.stdout.trim()
}

export const inspectLocalStackTarget = async ({
  cwd,
  environment = process.env,
  run = runCommand,
  expectedRoot = repositoryRoot,
} = {}) => {
  assertSafeControlEnvironment(environment)

  const workspace = realpathSync(cwd)
  if (workspace !== realpathSync(expectedRoot)) {
    throw new Error('Refusing destructive action outside this checkout.')
  }

  const composeFile = resolve(workspace, 'compose.yaml')
  const supabaseConfig = resolve(workspace, 'supabase/config.toml')
  assertRegularRepositoryFile(composeFile, 'compose.yaml')
  assertRegularRepositoryFile(supabaseConfig, 'supabase/config.toml')

  const config = readFileSync(supabaseConfig, 'utf8')
  if (!/^project_id\s*=\s*"phantom"\s*$/m.test(config)) {
    throw new Error('Local Supabase project_id must be exactly "phantom".')
  }

  const endpoint = await runInspection(
    {
      command: 'docker',
      args: ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'],
    },
    { cwd: workspace, env: environment, run },
  )
  if (!isLocalDockerEndpoint(endpoint)) {
    throw new Error(
      `Refusing non-local Docker endpoint: ${endpoint || '(empty)'}`,
    )
  }

  const services = await runInspection(
    {
      command: 'docker',
      args: [...composeArguments(workspace), 'config', '--services'],
    },
    { cwd: workspace, env: environment, run },
  )
  if (!services.split(/\r?\n/).includes('api')) {
    throw new Error(
      'The checked-in Compose model does not define the API service.',
    )
  }

  const existingResources = await runInspection(
    {
      command: 'docker',
      args: [
        'ps',
        '--all',
        '--filter',
        `label=com.docker.compose.project=${localProjectId}`,
        '--format',
        '{{.Names}}|{{.Label "com.docker.compose.project.config_files"}}|{{.Label "com.supabase.cli.project"}}',
      ],
    },
    { cwd: workspace, env: environment, run },
  )
  for (const resource of existingResources.split(/\r?\n/).filter(Boolean)) {
    const [container, configuredFileList, supabaseProject] = resource.split('|')
    if (isPhantomSupabaseContainer(container, supabaseProject)) continue

    const configuredFiles = (configuredFileList ?? '')
      .split(',')
      .filter(Boolean)
      .map((path) => resolve(path))
    if (configuredFiles.length !== 1 || configuredFiles[0] !== composeFile) {
      throw new Error(
        'Refusing Compose resources owned by another Compose configuration.',
      )
    }
  }

  const containerBindings = await runInspection(
    {
      command: 'docker',
      args: [
        'ps',
        '--format',
        '{{.Names}}|{{.Ports}}|{{.Label "com.supabase.cli.project"}}',
      ],
    },
    { cwd: workspace, env: environment, run },
  )
  const conflicts = findSupabasePortConflicts(containerBindings)
  if (conflicts.length > 0) {
    const details = conflicts
      .map(({ container, port }) => `${port} by "${container}"`)
      .join(', ')
    throw new Error(
      `Refusing destructive action because Phantom ports are published by unrelated Docker containers: ${details}.`,
    )
  }

  return workspace
}

export const runNukeAndPave = async ({
  cwd,
  environment = process.env,
  run = runCommand,
  filterOutput,
} = {}) => {
  const workspace = await inspectLocalStackTarget({
    cwd,
    environment,
    run,
  })
  const results = []

  for (const step of createNukeAndPavePlan(workspace)) {
    const result = await run(step, {
      cwd: workspace,
      env: environment,
      filterOutput,
    })
    results.push({ step, ...result })
    if (result.exitCode !== 0) {
      break
    }
  }

  return {
    exitCode: results.at(-1)?.exitCode ?? 0,
    results,
  }
}
