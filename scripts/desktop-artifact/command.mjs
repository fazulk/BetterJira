import { spawn } from 'node:child_process'
import process from 'node:process'
import { repoDir } from './config.mjs'

// Release builds (`signing: true`) let electron-builder discover the Developer ID
// identity and pick up APPLE_* notarization credentials from the environment.
// Local `dir` builds pass `signing: false` to skip both and stay fast.
export function buildEnv({ signing = true } = {}) {
  const env = { ...process.env }
  for (const [key, value] of Object.entries(env)) {
    if (value === '') {
      delete env[key]
    }
  }
  if (!signing) {
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    delete env.CSC_LINK
    delete env.CSC_KEY_PASSWORD
    delete env.APPLE_ID
    delete env.APPLE_APP_SPECIFIC_PASSWORD
    delete env.APPLE_TEAM_ID
    delete env.APPLE_API_KEY
    delete env.APPLE_API_KEY_ID
    delete env.APPLE_API_ISSUER
  }
  return env
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoDir,
      env: options.env ?? process.env,
      stdio: options.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      shell: options.shell ?? process.platform === 'win32',
    })

    let stderr = ''
    let stdout = ''
    if (!options.verbose) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
      })
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })
    }

    child.once('error', (error) => {
      rejectPromise(error)
    })

    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr })
        return
      }

      const detail = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
      rejectPromise(
        new Error(
          `Command failed (${command} ${args.join(' ')}): exit ${String(code)}${detail ? `\n${detail}` : ''}`,
        ),
      )
    })
  })
}
