import type { Ref } from 'vue'
import type { StoredAssistantConversation } from '@/utils/assistantHistory'
import type { AssistantContext, AssistantSettings } from '~/shared/assistant'
import { computed, ref, shallowRef } from 'vue'
import { readAssistantHistory, writeAssistantHistory } from '@/utils/assistantHistory'
import { getDefaultAssistantSettings, normalizeAssistantContext } from '~/shared/assistant'
import { createAssistantChatState, useAssistantChat } from './useAssistantChat'

export const workspaceContext: AssistantContext = { kind: 'workspace', label: 'Workspace' }

export type AssistantContextRefresher = (context: AssistantContext, signal: AbortSignal) => Promise<AssistantContext>

export function createAssistantSessions(settings: Ref<AssistantSettings>, onComplete?: (context: AssistantContext) => void, refreshContext?: AssistantContextRefresher) {
  const conversations = shallowRef<AssistantConversation[]>([])
  const closedConversations = shallowRef<{ conversation: AssistantConversation, closedAt: number }[]>([])
  const historyError = ref('')
  const selectedId = ref<string | null>(null)
  const minimized = ref(true)
  const currentContext = shallowRef<AssistantContext>(workspaceContext)
  const captureContextRefresher = shallowRef<(() => AssistantContextRefresher) | undefined>()
  const previousScreen = ref<string | null>(null)
  const selected = computed(() => conversations.value.find(chat => chat.id === selectedId.value) ?? null)

  function create(context: AssistantContext = currentContext.value, register = true) {
    const captured = normalizeAssistantContext(context) ?? workspaceContext
    const refresh = context === currentContext.value ? captureContextRefresher.value?.() ?? refreshContext : refreshContext
    const conversation = createConversation(captured, refresh)
    if (register)
      add(conversation)
    return conversation
  }

  function createConversation(captured: AssistantContext, refresh?: AssistantContextRefresher, stored?: StoredAssistantConversation): AssistantConversation {
    const latest = shallowRef(captured)
    const state = createAssistantChatState()
    if (stored) {
      state.messages.value = stored.messages
      state.nextId = stored.messages.reduce((next, message) => Math.max(next, message.id + 1), 0)
      state.errorText.value = stored.errorText
    }
    const chat = useAssistantChat({
      state,
      settings,
      context: captured,
      refreshContext: refresh && (async (signal) => {
        const refreshed = normalizeAssistantContext(await refresh(latest.value, signal)) ?? latest.value
        if (!signal.aborted)
          latest.value = refreshed
        return refreshed
      }),
      ticketKey: ref(captured.kind === 'ticket' ? captured.key : undefined),
      ticketSummary: ref(captured.kind === 'ticket' ? captured.summary : undefined),
      onComplete: context => onComplete?.(context ?? latest.value),
    })
    return {
      id: stored?.id ?? crypto.randomUUID(),
      get context() { return latest.value },
      draft: ref(stored?.draft ?? ''),
      selectedSkillIds: ref<string[]>(stored?.selectedSkillIds ?? []),
      chat,
      title: computed(() => chat.messages.value.find(message => message.role === 'user')?.content.split('\n')[0]?.trim() || captured.label),
    }
  }

  try {
    closedConversations.value = readAssistantHistory().map(stored => ({ conversation: createConversation(stored.context, refreshContext, stored), closedAt: stored.closedAt }))
  }
  catch {
    historyError.value = 'Could not load closed chats from this device.'
  }

  function persistHistory() {
    try {
      writeAssistantHistory(closedConversations.value.map(({ conversation, closedAt }) => ({
        id: conversation.id,
        context: conversation.context,
        draft: conversation.draft.value,
        selectedSkillIds: conversation.selectedSkillIds.value,
        messages: conversation.chat.messages.value,
        errorText: conversation.chat.errorText.value,
        closedAt,
      })))
      historyError.value = ''
    }
    catch {
      historyError.value = 'Closed chats could not be saved. They are available until you restart the app.'
    }
  }

  function add(conversation: AssistantConversation) {
    conversations.value = [...conversations.value, conversation]
    select(conversation.id)
  }

  function select(id: string) {
    selectedId.value = id
    minimized.value = false
  }

  function close(id: string) {
    const index = conversations.value.findIndex(chat => chat.id === id)
    const conversation = conversations.value[index]
    if (!conversation)
      return
    if (conversation.chat.isStreaming.value)
      conversation.chat.stop()
    closedConversations.value = [{ conversation, closedAt: Date.now() }, ...closedConversations.value]
    conversations.value = conversations.value.filter(chat => chat.id !== id)
    if (selectedId.value === id)
      selectedId.value = conversations.value[Math.max(0, index - 1)]?.id ?? null
    persistHistory()
  }

  function reopen(id: string) {
    const closed = closedConversations.value.find(entry => entry.conversation.id === id)
    if (!closed)
      return
    closedConversations.value = closedConversations.value.filter(entry => entry.conversation.id !== id)
    add(closed.conversation)
    persistHistory()
  }

  return { conversations, closedConversations, historyError, selectedId, selected, minimized, currentContext, captureContextRefresher, previousScreen, create, add, select, close, reopen }
}

export interface AssistantConversation {
  id: string
  context: AssistantContext
  draft: Ref<string>
  selectedSkillIds: Ref<string[]>
  title: Ref<string>
  chat: ReturnType<typeof useAssistantChat>
}

const settings = ref(getDefaultAssistantSettings())
let completed: ((context: AssistantContext) => void) | undefined
let refresh: AssistantContextRefresher | undefined
const sessions = createAssistantSessions(settings, context => completed?.(context), async (context, signal) => refresh ? refresh(context, signal) : context)
export function configureAssistantSessions(value: AssistantSettings, onComplete: (context: AssistantContext) => void, refreshContext: AssistantContextRefresher) {
  settings.value = value
  completed = onComplete
  refresh = refreshContext
}
export const useAssistantSessions = () => sessions
