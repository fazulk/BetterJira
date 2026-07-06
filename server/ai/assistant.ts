import type { Buffer } from 'node:buffer'
import type {
  AssistantChatMessage,
  AssistantChatRequest,
  AssistantProvider,
  AssistantReasoning,
  AssistantStreamChunk,
} from '../../shared/assistant'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { resolveAssistantSystemPrompt } from '../../shared/assistant'
import { isRecord } from '../../shared/typeGuards'
import { getAppSettings } from '../settings'
import { getLocalAiCommandPathEnv, resolveLocalAiCommand } from './localProviders'
import { ACLI_JIRA_SKILL } from './skills/acliJiraSkill'

const ASSISTANT_TIMEOUT_MS = 300_000

export type AssistantChunkHandler = (chunk: AssistantStreamChunk) => void

function getCommandPath(provider: AssistantProvider): string {
  const commandPath = resolveLocalAiCommand(provider)
  if (!commandPath) {
    const label = provider === 'codex' ? 'Codex CLI' : 'Claude Code CLI'
    throw new Error(`${label} was not found on this computer.`)
  }

  return commandPath
}

function buildSystemInstructions(request: AssistantChatRequest): string {
  // The persona block is user-editable (Settings → Assistant); the ticket context and
  // the acli reference are appended automatically so tool wiring can't be edited away.
  const persona = resolveAssistantSystemPrompt(getAppSettings().assistant.systemPrompt)
  const ticketContext = request.ticketKey
    ? [
        '',
        '## Current context',
        `The user is viewing Jira ticket ${request.ticketKey}${request.ticketSummary ? `: "${request.ticketSummary}"` : ''}.`,
        `When the user says "this ticket", "this issue", or "this" without naming a key, they mean ${request.ticketKey}.`,
        `Read the live ticket with \`acli jira workitem view ${request.ticketKey} --json\` before answering questions about it.`,
      ].join('\n')
    : ''

  return [
    persona,
    ticketContext,
    '',
    '---',
    '# acli Jira reference',
    '',
    ACLI_JIRA_SKILL,
  ].join('\n')
}

/** Renders a turn's text, appending any attached skill prompts to that turn. */
function renderMessageText(message: AssistantChatMessage): string {
  const content = message.content.trim()
  const skillBlocks = (message.skills ?? []).map(skill =>
    `## Skill: ${skill.name}\n\n${skill.body.trim()}`,
  )

  if (skillBlocks.length === 0) {
    return content
  }

  // A turn can be skill-only; the instruction line then carries the request.
  return [
    ...(content ? [content] : []),
    'Apply the following attached skill instructions to this request:',
    ...skillBlocks,
  ].join('\n\n')
}

function buildConversationText(messages: AssistantChatMessage[]): string {
  const trimmed = messages.filter(message => message.content.trim().length > 0 || (message.skills?.length ?? 0) > 0)

  if (trimmed.length <= 1) {
    return trimmed[0] ? renderMessageText(trimmed[0]) : ''
  }

  const transcript = trimmed
    .map((message) => {
      const speaker = message.role === 'assistant' ? 'Assistant' : 'User'
      return `${speaker}: ${renderMessageText(message)}`
    })
    .join('\n\n')

  return `${transcript}\n\nRespond to the latest user message.`
}

function getReasoningArgsForClaude(reasoning: AssistantReasoning): string[] {
  return ['--effort', reasoning]
}

function buildClaudeArgs(request: AssistantChatRequest, instructions: string): string[] {
  const modelArgs = request.model && request.model !== 'default' ? ['--model', request.model] : []

  return [
    '--print',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--verbose',
    ...modelArgs,
    ...getReasoningArgsForClaude(request.reasoning),
    '--permission-mode',
    'bypassPermissions',
    '--append-system-prompt',
    instructions,
    '--no-session-persistence',
  ]
}

function buildCodexArgs(request: AssistantChatRequest): string[] {
  const modelArgs = request.model && request.model !== 'default' ? ['--model', request.model] : []

  return [
    'exec',
    '--json',
    ...modelArgs,
    '--config',
    `model_reasoning_effort="${request.reasoning}"`,
    '--dangerously-bypass-approvals-and-sandbox',
    '--skip-git-repo-check',
    '--ephemeral',
    '--color',
    'never',
    '-',
  ]
}

interface ParsedLineState {
  /** Tracks how much text we have already emitted per Codex item id. */
  emittedByItem: Map<string, number>
  errorMessage: string | null
}

function parseClaudeLine(line: string, onChunk: AssistantChunkHandler, state: ParsedLineState): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  }
  catch {
    return
  }

  if (!isRecord(parsed)) {
    return
  }

  const record = parsed

  if (record.type === 'stream_event' && isRecord(record.event)) {
    const event = record.event

    if (event.type === 'content_block_delta' && isRecord(event.delta)) {
      const delta = event.delta
      if (delta.type === 'text_delta' && typeof delta.text === 'string') {
        onChunk({ type: 'delta', text: delta.text })
      }
      return
    }

    if (event.type === 'content_block_start' && isRecord(event.content_block)) {
      const block = event.content_block
      if (block.type === 'tool_use' && typeof block.name === 'string') {
        onChunk({ type: 'status', text: `Running ${block.name}…` })
      }
    }
    return
  }

  if (record.type === 'result') {
    if (record.is_error === true) {
      state.errorMessage = typeof record.result === 'string' && record.result.trim()
        ? record.result.trim()
        : 'The assistant request failed.'
    }
  }
}

function parseCodexLine(line: string, onChunk: AssistantChunkHandler, state: ParsedLineState): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  }
  catch {
    return
  }

  if (!isRecord(parsed)) {
    return
  }

  const record = parsed
  const eventType = record.type

  if (
    (eventType === 'item.started' || eventType === 'item.updated' || eventType === 'item.completed')
    && isRecord(record.item)
  ) {
    const item = record.item
    const itemId = typeof item.id === 'string' ? item.id : ''

    if (item.type === 'agent_message' && typeof item.text === 'string') {
      const alreadyEmitted = state.emittedByItem.get(itemId) ?? 0
      if (item.text.length > alreadyEmitted) {
        onChunk({ type: 'delta', text: item.text.slice(alreadyEmitted) })
        state.emittedByItem.set(itemId, item.text.length)
      }
      return
    }

    if (eventType === 'item.started' && item.type === 'command_execution' && typeof item.command === 'string') {
      onChunk({ type: 'status', text: `Running: ${item.command}` })
    }
    return
  }

  if (eventType === 'turn.failed' || eventType === 'error' || eventType === 'thread.error') {
    let message = 'The assistant request failed.'
    if (typeof record.message === 'string') {
      message = record.message
    }
    else if (isRecord(record.error)) {
      const errorField = record.error
      if (typeof errorField.message === 'string') {
        message = errorField.message
      }
    }
    state.errorMessage = message
  }
}

/**
 * Spawns the selected CLI, streams parsed answer chunks to `onChunk`, and resolves
 * when the turn completes. The returned promise rejects only on spawn-level failures;
 * provider-reported errors are surfaced as an `error` chunk before resolving.
 */
export function streamAssistantChat(
  request: AssistantChatRequest,
  onChunk: AssistantChunkHandler,
  signal?: AbortSignal,
): Promise<void> {
  const commandPath = getCommandPath(request.provider)
  const instructions = buildSystemInstructions(request)
  const conversationText = buildConversationText(request.messages)
  const stdinPayload = request.provider === 'codex'
    ? `${instructions}\n\n---\n\n${conversationText}`
    : conversationText
  const args = request.provider === 'codex'
    ? buildCodexArgs(request)
    : buildClaudeArgs(request, instructions)

  return new Promise<void>((resolve, reject) => {
    void (async () => {
      const workingDir = await mkdtemp(join(tmpdir(), `better-jira-${request.provider}-`))
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: [dirname(commandPath), getLocalAiCommandPathEnv()].join(process.platform === 'win32' ? ';' : ':'),
        NO_COLOR: '1',
        TERM: 'dumb',
      }

      // Claude prioritises ANTHROPIC_API_KEY over the user's claude.ai subscription
      // login. Strip it so the assistant uses the same auth as the interactive CLI
      // (the inherited key may be a restricted workspace key that fails).
      if (request.provider === 'claude') {
        delete env.ANTHROPIC_API_KEY
      }

      const child = spawn(commandPath, args, {
        cwd: workingDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const state: ParsedLineState = { emittedByItem: new Map(), errorMessage: null }
      const parseLine = request.provider === 'codex' ? parseCodexLine : parseClaudeLine
      let stdoutBuffer = ''
      let stderr = ''
      let settled = false
      let timedOut = false

      const timeout = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
      }, ASSISTANT_TIMEOUT_MS)

      function onAbort(): void {
        child.kill('SIGTERM')
      }

      if (signal) {
        if (signal.aborted) {
          onAbort()
        }
        else {
          signal.addEventListener('abort', onAbort, { once: true })
        }
      }

      function flushLines(): void {
        let newlineIndex = stdoutBuffer.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = stdoutBuffer.slice(0, newlineIndex).trim()
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1)
          if (line) {
            parseLine(line, onChunk, state)
          }
          newlineIndex = stdoutBuffer.indexOf('\n')
        }
      }

      async function cleanup(): Promise<void> {
        clearTimeout(timeout)
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
        await rm(workingDir, { recursive: true, force: true }).catch(() => {})
      }

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString('utf8')
        flushLines()
      })

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8')
      })

      child.on('error', (error: Error) => {
        if (settled) {
          return
        }
        settled = true
        void cleanup().then(() => reject(error))
      })

      child.on('close', (code: number | null) => {
        if (settled) {
          return
        }
        settled = true

        if (stdoutBuffer.trim()) {
          parseLine(stdoutBuffer.trim(), onChunk, state)
          stdoutBuffer = ''
        }

        void cleanup().then(() => {
          if (timedOut) {
            onChunk({ type: 'error', message: 'The assistant timed out.' })
          }
          else if (state.errorMessage) {
            onChunk({ type: 'error', message: state.errorMessage })
          }
          else if (code !== 0) {
            const detail = stderr.trim() || `Process exited with code ${code ?? 'unknown'}.`
            onChunk({ type: 'error', message: detail })
          }
          else {
            onChunk({ type: 'done' })
          }
          resolve()
        })
      })

      child.stdin.end(stdinPayload)
    })().catch(reject)
  })
}
