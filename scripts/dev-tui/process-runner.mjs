import { spawn } from 'node:child_process'

const assertCommand = (command, args) => {
  if (typeof command !== 'string' || command.length === 0) {
    throw new TypeError('command must be a non-empty string')
  }

  if (
    !Array.isArray(args) ||
    args.some((argument) => typeof argument !== 'string')
  ) {
    throw new TypeError('args must be an array of strings')
  }
}

const signalProcess = (child, signal) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return
  }

  if (process.platform !== 'win32' && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal)
      return
    } catch {
      // Fall back to signalling the immediate child.
    }
  }

  child.kill(signal)
}

export const formatCommand = ({ command, args }) =>
  [command, ...args]
    .map((part) => (part.includes(' ') ? JSON.stringify(part) : part))
    .join(' ')

export const redactSecrets = (text) =>
  text
    .replace(
      /^(\s*(?:JWT secret|anon key|service_role key|S3 Access Key|S3 Secret Key|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*[=:]\s*).+$/gim,
      '$1[redacted]',
    )
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+(@)/gi, '$1[redacted]$2')

const forwardFiltered = (source, destination, filter) => {
  let pending = ''
  source.on('data', (chunk) => {
    pending += chunk.toString('utf8')
    let delimiter = pending.match(/\r\n|\r|\n/)
    while (delimiter?.index !== undefined) {
      const record = pending.slice(0, delimiter.index)
      destination.write(`${filter(record)}${delimiter[0]}`)
      pending = pending.slice(delimiter.index + delimiter[0].length)
      delimiter = pending.match(/\r\n|\r|\n/)
    }
  })
  source.on('end', () => {
    if (pending.length > 0) {
      destination.write(filter(pending))
    }
  })
}

export const runCommand = async (
  { command, args },
  {
    cwd,
    env = process.env,
    signal,
    capture = false,
    filterOutput,
    manageSignals = true,
    onSpawn,
  } = {},
) => {
  assertCommand(command, args)

  const child = spawn(command, args, {
    cwd,
    env,
    shell: false,
    detached: process.platform !== 'win32',
    stdio: capture || filterOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  })

  const stdout = []
  const stderr = []
  if (capture) {
    child.stdout?.on('data', (chunk) => stdout.push(chunk))
    child.stderr?.on('data', (chunk) => stderr.push(chunk))
  } else if (filterOutput) {
    forwardFiltered(child.stdout, process.stdout, filterOutput)
    forwardFiltered(child.stderr, process.stderr, filterOutput)
  }

  let cancelled = false
  let terminateTimer
  let killTimer
  const cancel = () => {
    if (cancelled) {
      return
    }
    cancelled = true
    signalProcess(child, 'SIGINT')
    terminateTimer = setTimeout(() => signalProcess(child, 'SIGTERM'), 3_000)
    killTimer = setTimeout(() => signalProcess(child, 'SIGKILL'), 5_000)
    terminateTimer.unref()
    killTimer.unref()
  }

  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) {
    cancel()
  }

  if (manageSignals) {
    process.once('SIGINT', cancel)
    process.once('SIGTERM', cancel)
  }

  onSpawn?.(child)

  try {
    const result = await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('close', (exitCode, exitSignal) => {
        resolve({
          exitCode: cancelled ? 130 : (exitCode ?? 1),
          signal: exitSignal,
          cancelled,
          stdout: Buffer.concat(stdout).toString('utf8'),
          stderr: Buffer.concat(stderr).toString('utf8'),
        })
      })
    })

    return result
  } finally {
    clearTimeout(terminateTimer)
    clearTimeout(killTimer)
    signal?.removeEventListener('abort', cancel)
    if (manageSignals) {
      process.removeListener('SIGINT', cancel)
      process.removeListener('SIGTERM', cancel)
    }
  }
}

export const runSequence = async (steps, options = {}) => {
  const results = []

  for (const step of steps) {
    const result = await runCommand(step, options)
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
