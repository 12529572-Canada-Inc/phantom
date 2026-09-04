import { spawnSync } from 'node:child_process'
import { accessSync, constants, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const version = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'ignore'],
  })

  return result.status === 0 ? result.stdout.trim() : null
}

const installedSupabaseVersion = () => {
  try {
    accessSync(
      resolve(repositoryRoot, 'node_modules/.bin/supabase'),
      constants.X_OK,
    )
    const packageJson = JSON.parse(
      readFileSync(
        resolve(repositoryRoot, 'node_modules/supabase/package.json'),
        'utf8',
      ),
    )
    return typeof packageJson.version === 'string' ? packageJson.version : null
  } catch {
    return null
  }
}

export const inspectPrerequisites = () => {
  const pnpmVersion = version('pnpm', ['--version'])
  const dockerVersion = version('docker', ['--version'])
  const composeVersion = dockerVersion
    ? version('docker', ['compose', 'version', '--short'])
    : null
  const supabaseVersion = installedSupabaseVersion()
  const psqlVersion = version('psql', ['--version'])

  return {
    node: {
      available: Number(process.versions.node.split('.')[0]) >= 22,
      detail: `v${process.versions.node}`,
      guidance: 'Install Node.js 22 or newer.',
    },
    pnpm: {
      available: pnpmVersion !== null && Number(pnpmVersion.split('.')[0]) >= 9,
      detail: pnpmVersion === null ? 'not found' : `v${pnpmVersion}`,
      guidance: 'Enable Corepack and install pnpm 9 or newer.',
    },
    docker: {
      available: dockerVersion !== null && composeVersion !== null,
      detail:
        dockerVersion === null
          ? 'not found'
          : composeVersion === null
            ? 'Compose unavailable'
            : composeVersion,
      guidance: 'Install and start Docker with the Compose plugin.',
    },
    supabase: {
      available: supabaseVersion !== null,
      detail: supabaseVersion ?? 'not found',
      guidance: 'Run pnpm install to install the workspace Supabase CLI.',
    },
    psql: {
      available: psqlVersion !== null,
      detail: psqlVersion ?? 'not found',
      guidance: 'Install the PostgreSQL client tools (psql).',
    },
  }
}

export const optionalEnvironment = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
].map((name) => ({
  name,
  configured: Boolean(process.env[name]),
}))

export const missingRequirements = (task, prerequisites) =>
  task.requires.filter((requirement) => !prerequisites[requirement]?.available)

export const printEnvironmentReport = (prerequisites) => {
  console.log('Prerequisites')
  for (const [name, status] of Object.entries(prerequisites)) {
    const marker = status.available ? '✓' : '✗'
    console.log(`  ${marker} ${name}: ${status.detail}`)
    if (!status.available) {
      console.log(`    ${status.guidance}`)
    }
  }

  console.log('\nOptional API environment')
  for (const item of optionalEnvironment) {
    console.log(`  ${item.name}: ${item.configured ? 'configured' : 'not set'}`)
  }
  console.log('  Values are intentionally hidden.')
}
