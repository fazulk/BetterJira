import type { Buffer } from 'node:buffer'
import type { LocalAiProvider } from '../localProviders'
import type { ProviderPrompt } from './openai'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { getLocalAiCommandPathEnv, requiresWindowsCommandShell, resolveLocalAiCommand } from '../localProviders'

const LOCAL_GENERATION_TIMEOUT_MS = 120_000

interface CommandResult {
  stdout: string
  stderr: string
}

function getLocalProviderLabel(provider: LocalAiProvider): string {
  return provider === 'codex' ? 'Codex CLI' : 'Claude Code CLI'
}

function buildLocalCliPrompt(prompt: ProviderPrompt): string {
  return [
    'You are helping rewrite a Jira ticket description.',
    'Return only the improved Jira description. Do not include a preamble, analysis, code fences, or follow-up questions.',
    'Use concise Jira-friendly Markdown/plain text that can be converted into Jira rich text.',
    '',
    prompt.userPrompt,
  ].join('\n')
}

function runCommand(commandPath: string, args: string[], stdin: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false

    const child = spawn(commandPath, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: [dirname(commandPath), getLocalAiCommandPathEnv()].join(process.platform === 'win32' ? ';' : ':'),
        NO_COLOR: '1',
        TERM: 'dumb',
      },
      shell: requiresWindowsCommandShell(commandPath),
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, LOCAL_GENERATION_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error: Error) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)
      reject(error)
    })

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)

      if (timedOut) {
        reject(new Error('The local AI provider timed out.'))
        return
      }

      if (code !== 0) {
        const message = stderr.trim() || stdout.trim() || `Process exited with ${signal ?? `code ${code ?? 'unknown'}`}.`
        reject(new Error(message))
        return
      }

      resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
    })

    child.stdin.end(stdin)
  })
}

function getLocalCommand(provider: LocalAiProvider): string {
  const commandPath = resolveLocalAiCommand(provider)
  if (!commandPath) {
    throw new Error(`${getLocalProviderLabel(provider)} was not found on this computer.`)
  }

  return commandPath
}

export async function generateWithCodex(prompt: ProviderPrompt): Promise<string> {
  const commandPath = getLocalCommand('codex')
  const workingDir = await mkdtemp(join(tmpdir(), 'better-jira-codex-'))
  const outputPath = join(workingDir, 'description.txt')
  const modelArgs = prompt.model === 'default' ? [] : ['--model', prompt.model]

  try {
    const result = await runCommand(commandPath, [
      'exec',
      ...modelArgs,
      '--config',
      'model_reasoning_effort="low"',
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--ephemeral',
      '--ignore-rules',
      '--color',
      'never',
      '--cd',
      workingDir,
      '--output-last-message',
      outputPath,
      '-',
    ], buildLocalCliPrompt(prompt))

    const output = await readFile(outputPath, 'utf8').catch(() => result.stdout)
    return output.trim()
  }
  finally {
    await rm(workingDir, { recursive: true, force: true })
  }
}

export async function generateWithClaude(prompt: ProviderPrompt): Promise<string> {
  const commandPath = getLocalCommand('claude')
  const modelArgs = prompt.model === 'default' ? [] : ['--model', prompt.model]
  const result = await runCommand(commandPath, [
    '--print',
    ...modelArgs,
    '--effort',
    'low',
    '--output-format',
    'text',
    '--no-session-persistence',
    '--disable-slash-commands',
    '--tools',
    '',
    '--',
  ], buildLocalCliPrompt(prompt))
  return result.stdout.trim()
}
