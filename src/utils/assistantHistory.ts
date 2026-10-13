import type { AssistantTranscriptMessage } from '@/composables/useAssistantChat'
import type { AssistantContext } from '~/shared/assistant'
import { normalizeAssistantContext } from '~/shared/assistant'
import { isRecord } from '~/shared/typeGuards'

export const ASSISTANT_HISTORY_KEY = 'jira2.assistant.closedChats'

export interface StoredAssistantConversation {
  id: string
  context: AssistantContext
  draft: string
  selectedSkillIds: string[]
  messages: AssistantTranscriptMessage[]
  errorText: string
  closedAt: number
}

function normalizeMessage(value: unknown): AssistantTranscriptMessage | undefined {
  if (!isRecord(value) || (value.role !== 'user' && value.role !== 'assistant') || typeof value.content !== 'string'
    || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id < 0
    || typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt) || Number.isNaN(new Date(value.createdAt).getTime())) {
    return undefined
  }
  return {
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: value.createdAt,
    finishedAt: typeof value.finishedAt === 'number' && Number.isFinite(value.finishedAt) ? value.finishedAt : undefined,
    model: typeof value.model === 'string' ? value.model : undefined,
    reasoning: typeof value.reasoning === 'string' ? value.reasoning : undefined,
    updates: Array.isArray(value.updates) ? value.updates.filter((update): update is string => typeof update === 'string') : undefined,
    skills: Array.isArray(value.skills)
      ? value.skills.filter(isRecord).flatMap(skill => typeof skill.name === 'string' && typeof skill.body === 'string' ? [{ name: skill.name, body: skill.body }] : [])
      : undefined,
    pending: false,
  }
}

export function readAssistantHistory(): StoredAssistantConversation[] {
  if (typeof window === 'undefined')
    return []
  const parsed: unknown = JSON.parse(window.localStorage.getItem(ASSISTANT_HISTORY_KEY) ?? '[]')
  if (!Array.isArray(parsed))
    return []
  const ids = new Set<string>()
  return parsed.flatMap((value) => {
    if (!isRecord(value) || typeof value.id !== 'string' || !value.id || ids.has(value.id)
      || typeof value.closedAt !== 'number' || !Number.isFinite(value.closedAt) || Number.isNaN(new Date(value.closedAt).getTime())
      || !Array.isArray(value.messages)) {
      return []
    }
    const context = normalizeAssistantContext(value.context)
    if (!context)
      return []
    ids.add(value.id)
    return [{
      id: value.id,
      context,
      closedAt: value.closedAt,
      draft: typeof value.draft === 'string' ? value.draft : '',
      selectedSkillIds: Array.isArray(value.selectedSkillIds) ? value.selectedSkillIds.filter((id): id is string => typeof id === 'string') : [],
      messages: value.messages.flatMap((message) => {
        const normalized = normalizeMessage(message)
        return normalized ? [normalized] : []
      }),
      errorText: typeof value.errorText === 'string' ? value.errorText : '',
    }]
  }).sort((a, b) => b.closedAt - a.closedAt)
}

export function writeAssistantHistory(conversations: StoredAssistantConversation[]): void {
  if (typeof window !== 'undefined')
    window.localStorage.setItem(ASSISTANT_HISTORY_KEY, JSON.stringify(conversations))
}
