import type { Buffer } from 'node:buffer'
import type { AiModelOption } from '../../shared/ai'
import type { AssistantProvider } from '../../shared/assistant'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { isAssistantModelId } from '../../shared/assistant'
import { isRecord } from '../../shared/typeGuards'
import { getLocalAiCommandPathEnv, requiresWindowsCommandShell, resolveLocalAiCommand } from './localProviders'

const MODEL_DISCOVERY_TIMEOUT_MS = 30_000
const pendingRequests = new Map<AssistantProvider, Promise<AiModelOption[]>>()

function parseModels(provider: AssistantProvider, entries: unknown): AiModelOption[] {
  if (!Array.isArray(entries)) {
    throw new TypeError('The CLI did not return a model list. Update the CLI and try again.')
  }

  const models = new Map<string, AiModelOption>()
  for (const entry of entries) {
    if (!isRecord(entry) || entry.hidden === true)
      continue
    const id = provider === 'codex' ? entry.model : entry.value
    if (!isAssistantModelId(id))
      continue
    const name = typeof entry.displayName === 'string' && entry.displayName.trim() ? entry.displayName : id
    const label = provider === 'claude' && typeof entry.resolvedModel === 'string'
      ? `${name} (${entry.resolvedModel})`
      : name
    models.set(id, { id, label, provider })
  }

  return [...models.values()]
}

async function discoverModels(provider: AssistantProvider): Promise<AiModelOption[]> {
  const command = resolveLocalAiCommand(provider)
  if (!command) {
    throw new Error(`${provider === 'codex' ? 'Codex' : 'Claude Code'} CLI was not found on this computer.`)
  }

  // Only send control requests: no prompt, model generation, or ticket tools.
  const args = provider === 'codex'
    ? ['app-server']
    : [
        '--print',
        '--input-format',
        'stream-json',
        '--output-format',
        'stream-json',
        '--verbose',
        '--no-session-persistence',
        '--settings',
        '{"disableAllHooks":true}',
        '--tools',
        '',
      ]
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: getLocalAiCommandPathEnv() }
  if (provider === 'claude') {
    // Match the chat path, which uses the user's Claude subscription.
    delete env.ANTHROPIC_API_KEY
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: tmpdir(),
      env,
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: requiresWindowsCommandShell(command),
    })
    const lines = createInterface({ input: child.stdout })
    let settled = false
    let outputBytes = 0
    let requestId = 1
    const models = new Map<string, AiModelOption>()
    const timer = setTimeout(() => finish(new Error('Refreshing models timed out. Check the CLI login and try again.')), MODEL_DISCOVERY_TIMEOUT_MS)

    function finish(error?: Error): void {
      if (settled)
        return
      settled = true
      clearTimeout(timer)
      lines.close()
      child.stdin.destroy()
      child.kill('SIGKILL')
      if (error) {
        reject(error)
        return
      }
      if (models.size === 0) {
        reject(new Error('The CLI returned no available models. Check the CLI login and try again.'))
        return
      }
      if (provider === 'codex') {
        resolve([{ id: 'default', label: 'Codex configured default', provider }, ...models.values()].filter((model, index) => index === 0 || model.id !== 'default'))
        return
      }
      resolve([...models.values()])
    }

    function send(message: unknown): void {
      child.stdin.write(`${JSON.stringify(message)}\n`)
    }

    function listCodexModels(cursor?: string): void {
      requestId += 1
      send({ id: requestId, method: 'model/list', params: { limit: 100, includeHidden: false, ...(cursor ? { cursor } : {}) } })
    }

    child.on('error', () => finish(new Error('Unable to start the CLI to refresh models.')))
    child.stdin.on('error', () => finish(new Error('The CLI closed before returning its model list.')))
    child.on('close', () => finish(new Error('The CLI exited before returning models. Check its login and version.')))
    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length
      if (outputBytes > 1_000_000)
        finish(new Error('The CLI model response was too large.'))
    })
    lines.on('line', (line) => {
      if (settled)
        return
      try {
        const message: unknown = JSON.parse(line)
        if (!isRecord(message))
          return
        if (provider === 'codex') {
          if (message.id !== requestId)
            return
          if (isRecord(message.error))
            throw new Error(typeof message.error.message === 'string' ? message.error.message : 'Codex model discovery failed.')
          if (requestId === 1) {
            send({ method: 'initialized' })
            listCodexModels()
            return
          }
          if (!isRecord(message.result))
            throw new Error('Codex returned an invalid model response.')
          for (const model of parseModels(provider, message.result.data))
            models.set(model.id, model)
          if (typeof message.result.nextCursor === 'string' && message.result.nextCursor) {
            listCodexModels(message.result.nextCursor)
            return
          }
        }
        else {
          if (message.type !== 'control_response' || !isRecord(message.response) || message.response.request_id !== 'models')
            return
          if (message.response.subtype === 'error')
            throw new Error(typeof message.response.error === 'string' ? message.response.error : 'Claude model discovery failed.')
          const response = message.response.response
          for (const model of parseModels(provider, isRecord(response) ? response.models : undefined))
            models.set(model.id, model)
        }
        finish()
      }
      catch (error) {
        finish(error instanceof Error ? error : new Error('Unable to read the CLI model list.'))
      }
    })

    send(provider === 'codex'
      ? { id: 1, method: 'initialize', params: { clientInfo: { name: 'better-jira', version: '1' } } }
      : { type: 'control_request', request_id: 'models', request: { subtype: 'initialize' } })
  })
}

export async function getAssistantModels(provider: AssistantProvider): Promise<AiModelOption[]> {
  const pending = pendingRequests.get(provider)
  if (pending)
    return pending
  const request = discoverModels(provider)
  pendingRequests.set(provider, request)
  try {
    return await request
  }
  finally {
    pendingRequests.delete(provider)
  }
}
