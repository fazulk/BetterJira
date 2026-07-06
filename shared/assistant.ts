import type { AiModelOption } from './ai'
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_CODEX_MODEL,
  getAiModelsForProvider,
} from './ai'
import { isRecord } from './typeGuards'

/** Providers that back the "Ask" chat assistant. These are local CLIs we proxy to. */
export type AssistantProvider = 'claude' | 'codex'
export const ASSISTANT_PROVIDERS: AssistantProvider[] = ['claude', 'codex']

export type AssistantReasoning = 'low' | 'medium' | 'high'
export const ASSISTANT_REASONING_LEVELS: AssistantReasoning[] = ['low', 'medium', 'high']

export interface AssistantSettings {
  provider: AssistantProvider
  model: string
  reasoning: AssistantReasoning
  /** Editable behaviour/persona block prepended to the assistant's system prompt. */
  systemPrompt: string
}

export const DEFAULT_ASSISTANT_PROVIDER: AssistantProvider = 'claude'
export const DEFAULT_ASSISTANT_REASONING: AssistantReasoning = 'medium'

/**
 * Default behaviour/persona block for the "Ask" assistant. The ticket context and the
 * acli Jira reference are appended automatically server-side, so this only covers tone
 * and ground rules. Editable from Settings → Assistant.
 */
export const DEFAULT_ASSISTANT_SYSTEM_PROMPT: string = [
  'You are the BetterJira assistant, embedded inside the BetterJira desktop app.',
  'You help the user read and manage Jira tickets by running the acli command-line tool.',
  'Use the acli reference below. Prefer acli over guessing; run read commands to ground your answers in live data.',
  'Be concise and conversational. When you change a ticket, state exactly what you changed and include the issue link.',
  'You are running with full permissions and no confirmation prompts, so double-check destructive actions before running them.',
].join('\n')

/** A user-defined skill attached to a single chat turn. */
export interface AssistantMessageSkill {
  name: string
  /** Markdown prompt injected alongside the user's message for that turn. */
  body: string
}

export interface AssistantChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Skills attached to this (user) turn; their bodies are injected server-side. */
  skills?: AssistantMessageSkill[]
}

export interface AssistantChatRequest {
  provider: AssistantProvider
  model: string
  reasoning: AssistantReasoning
  /** Key of the ticket the user is currently viewing, used as context. */
  ticketKey?: string
  /** Summary of the current ticket, passed so the assistant has immediate context. */
  ticketSummary?: string
  messages: AssistantChatMessage[]
}

/**
 * Server-sent stream chunks for an assistant chat turn.
 * - `delta`: incremental assistant answer text to append.
 * - `status`: transient activity (e.g. a tool/command the agent ran).
 * - `done`: the turn finished successfully.
 * - `error`: the turn failed; `message` explains why.
 */
export type AssistantStreamChunk
  = | { type: 'delta', text: string }
    | { type: 'status', text: string }
    | { type: 'done' }
    | { type: 'error', message: string }

export function isAssistantProvider(value: unknown): value is AssistantProvider {
  return value === 'claude' || value === 'codex'
}

export function isAssistantReasoning(value: unknown): value is AssistantReasoning {
  return value === 'low' || value === 'medium' || value === 'high'
}

export function getAssistantProviderLabel(provider: AssistantProvider): string {
  return provider === 'codex' ? 'Codex' : 'Claude'
}

/** Label shown on the trigger button, e.g. "Ask Claude" / "Ask Codex". */
export function getAssistantActionLabel(provider: AssistantProvider): string {
  return `Ask ${getAssistantProviderLabel(provider)}`
}

export function getAssistantModelsForProvider(provider: AssistantProvider): AiModelOption[] {
  return getAiModelsForProvider(provider)
}

export function getDefaultAssistantModel(provider: AssistantProvider): string {
  return provider === 'codex' ? DEFAULT_CODEX_MODEL : DEFAULT_CLAUDE_MODEL
}

export function isSupportedAssistantModel(provider: AssistantProvider, model: string): boolean {
  return getAssistantModelsForProvider(provider).some(option => option.id === model)
}

export function getAssistantReasoningLabel(reasoning: AssistantReasoning): string {
  if (reasoning === 'low')
    return 'Low'
  if (reasoning === 'high')
    return 'High'
  return 'Medium'
}

/** Keeps a stored prompt as-is (preserving user formatting); falls back to the default. */
export function normalizeAssistantSystemPrompt(value: unknown): string {
  return typeof value === 'string' ? value : DEFAULT_ASSISTANT_SYSTEM_PROMPT
}

/** Resolves the effective prompt at request time: a blank value means "use the built-in". */
export function resolveAssistantSystemPrompt(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_ASSISTANT_SYSTEM_PROMPT
}

export function normalizeAssistantSettings(
  provider: unknown,
  model: unknown,
  reasoning: unknown,
  systemPrompt?: unknown,
): AssistantSettings {
  const normalizedProvider = isAssistantProvider(provider) ? provider : DEFAULT_ASSISTANT_PROVIDER
  const normalizedModel = typeof model === 'string' && isSupportedAssistantModel(normalizedProvider, model)
    ? model
    : getDefaultAssistantModel(normalizedProvider)
  const normalizedReasoning = isAssistantReasoning(reasoning) ? reasoning : DEFAULT_ASSISTANT_REASONING

  return {
    provider: normalizedProvider,
    model: normalizedModel,
    reasoning: normalizedReasoning,
    systemPrompt: normalizeAssistantSystemPrompt(systemPrompt),
  }
}

export function getDefaultAssistantSettings(): AssistantSettings {
  return {
    provider: DEFAULT_ASSISTANT_PROVIDER,
    model: getDefaultAssistantModel(DEFAULT_ASSISTANT_PROVIDER),
    reasoning: DEFAULT_ASSISTANT_REASONING,
    systemPrompt: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  }
}

function normalizeMessageSkills(value: unknown): AssistantMessageSkill[] {
  if (!Array.isArray(value)) {
    return []
  }

  const skills: AssistantMessageSkill[] = []
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }
    const record = entry
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    const body = typeof record.body === 'string' ? record.body : ''
    if (name && body.trim()) {
      skills.push({ name, body })
    }
  }
  return skills
}

function normalizeChatMessages(value: unknown): AssistantChatMessage[] {
  if (!Array.isArray(value)) {
    return []
  }

  const messages: AssistantChatMessage[] = []
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }
    const record = entry
    const role = record.role === 'assistant' ? 'assistant' : 'user'
    const content = typeof record.content === 'string' ? record.content : ''
    const skills = role === 'user' ? normalizeMessageSkills(record.skills) : []
    // A user turn can be skill-only (attach a skill and send with no typed text).
    if (content.trim().length > 0 || skills.length > 0) {
      messages.push(skills.length > 0 ? { role, content, skills } : { role, content })
    }
  }
  return messages
}

/** Validates a raw request body into a chat request, or returns null when unusable. */
export function normalizeAssistantChatRequest(value: unknown): AssistantChatRequest | null {
  if (!isRecord(value)) {
    return null
  }

  const record = value
  const settings = normalizeAssistantSettings(record.provider, record.model, record.reasoning)
  const messages = normalizeChatMessages(record.messages)
  const lastMessage = messages[messages.length - 1]

  if (!lastMessage || lastMessage.role !== 'user') {
    return null
  }

  return {
    provider: settings.provider,
    model: settings.model,
    reasoning: settings.reasoning,
    ticketKey: typeof record.ticketKey === 'string' && record.ticketKey.trim() ? record.ticketKey.trim() : undefined,
    ticketSummary: typeof record.ticketSummary === 'string' && record.ticketSummary.trim() ? record.ticketSummary.trim() : undefined,
    messages,
  }
}
