import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  assertSafeControlEnvironment,
  createNukeAndPavePlan,
  findSupabasePortConflicts,
  inspectLocalStackTarget,
  isLocalDockerEndpoint,
  runNukeAndPave,
} from './local-stack.mjs'

test('nuke and pave plan is project-scoped, complete, and ordered', () => {
  const workspace = resolve('/tmp/phantom-workspace')
  const composePrefix = [
    'compose',
    '--file',
    resolve(workspace, 'compose.yaml'),
    '--project-directory',
    workspace,
    '--project-name',
    'phantom',
  ]

  assert.deepEqual(createNukeAndPavePlan(workspace), [
    {
      command: 'docker',
      args: [
        ...composePrefix,
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
        'phantom',
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
      args: [...composePrefix, 'build', '--no-cache', 'api'],
    },
    {
      command: 'docker',
      args: [
        ...composePrefix,
        'up',
        '--detach',
        '--force-recreate',
        '--wait',
        'api',
      ],
    },
  ])
})

test('control variables that can redirect destructive commands are refused', () => {
  for (const name of [
    'COMPOSE_FILE',
    'COMPOSE_PROJECT_NAME',
    'DOCKER_CONTEXT',
    'DOCKER_HOST',
    'SUPABASE_WORKDIR',
  ]) {
    assert.throws(
      () => assertSafeControlEnvironment({ [name]: 'hostile-value' }),
      new RegExp(name),
    )
  }
})

test('only local Docker socket endpoints are accepted', () => {
  assert.equal(isLocalDockerEndpoint('unix:///var/run/docker.sock'), true)
  assert.equal(
    isLocalDockerEndpoint('unix:///Users/example/.docker/run/docker.sock'),
    true,
  )
  assert.equal(isLocalDockerEndpoint('npipe:////./pipe/docker_engine'), true)
  assert.equal(isLocalDockerEndpoint('tcp://127.0.0.1:2375'), false)
  assert.equal(isLocalDockerEndpoint('ssh://builder@example.test'), false)
  assert.equal(isLocalDockerEndpoint(''), false)
})

test('port inspection distinguishes Phantom from unrelated containers', () => {
  const bindings = [
    'supabase_db_phantom|0.0.0.0:55322->5432/tcp, [::]:55322->5432/tcp|phantom',
    'another-db|0.0.0.0:55323->5432/tcp, [::]:55323->5432/tcp|',
    'supabase_fake_phantom|0.0.0.0:55324->8025/tcp|',
    'unpublished-service|55325/tcp|',
  ].join('\n')

  assert.deepEqual(findSupabasePortConflicts(bindings), [
    { container: 'another-db', port: 55323 },
    { container: 'supabase_fake_phantom', port: 55324 },
  ])
})

test('preflight refuses a remote Docker endpoint before inspecting resources', async () => {
  const calls = []
  const run = async (step) => {
    calls.push(step)
    return { exitCode: 0, stdout: 'ssh://builder@example.test\n', stderr: '' }
  }

  await assert.rejects(
    inspectLocalStackTarget({ cwd: process.cwd(), run }),
    /non-local Docker endpoint/,
  )
  assert.equal(calls.length, 1)
})

test('preflight refuses Compose resources owned by another checkout', async () => {
  const responses = [
    'unix:///var/run/docker.sock\n',
    'api\n',
    'abc123|/tmp/another-checkout/compose.yaml\n',
  ]
  const run = async () => ({
    exitCode: 0,
    stdout: responses.shift(),
    stderr: '',
  })

  await assert.rejects(
    inspectLocalStackTarget({ cwd: process.cwd(), run }),
    /owned by another Compose configuration/,
  )
})

test('preflight accepts Phantom Supabase containers without Compose config labels', async () => {
  const responses = [
    'unix:///var/run/docker.sock\n',
    'api\n',
    'supabase_db_phantom||phantom\n',
    'supabase_db_phantom|0.0.0.0:55322->5432/tcp|phantom\n',
  ]
  const run = async () => ({
    exitCode: 0,
    stdout: responses.shift(),
    stderr: '',
  })

  assert.equal(
    await inspectLocalStackTarget({ cwd: process.cwd(), run }),
    process.cwd(),
  )
})

test('preflight refuses an unrelated container on a Phantom port', async () => {
  const responses = [
    'unix:///var/run/docker.sock\n',
    'api\n',
    '',
    'another-db|0.0.0.0:55322->5432/tcp\n',
  ]
  const run = async () => ({
    exitCode: 0,
    stdout: responses.shift(),
    stderr: '',
  })

  await assert.rejects(
    inspectLocalStackTarget({ cwd: process.cwd(), run }),
    /55322.*another-db/,
  )
})

test('nuke and pave stops immediately when a destructive step fails', async () => {
  const destructiveSteps = []
  let inspection = 0
  const run = async (step) => {
    if (inspection < 4) {
      const stdout = ['unix:///var/run/docker.sock\n', 'api\n', '', ''][
        inspection
      ]
      inspection += 1
      return { exitCode: 0, stdout, stderr: '' }
    }

    destructiveSteps.push(step)
    return {
      exitCode: destructiveSteps.length === 2 ? 17 : 0,
      stdout: '',
      stderr: '',
    }
  }

  const result = await runNukeAndPave({ cwd: process.cwd(), run })

  assert.equal(result.exitCode, 17)
  assert.equal(destructiveSteps.length, 2)
  assert.deepEqual(
    destructiveSteps.map((step) => [step.command, step.args.at(-1)]),
    [
      ['docker', '15'],
      ['pnpm', '--no-backup'],
    ],
  )
})
