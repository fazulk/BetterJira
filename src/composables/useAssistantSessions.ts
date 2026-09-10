import type { Ref } from 'vue'
import type { AssistantContext, AssistantSettings } from '~/shared/assistant'
import { computed, ref, shallowRef } from 'vue'
import { getDefaultAssistantSettings, normalizeAssistantContext } from '~/shared/assistant'
import { useAssistantChat } from './useAssistantChat'

export const workspaceContext: AssistantContext = { kind: 'workspace', label: 'Workspace' }

export function createAssistantSessions(settings: Ref<AssistantSettings>, onComplete?: (context: AssistantContext) => void) {
  const conversations = shallowRef<AssistantConversation[]>([])
  const selectedId = ref<string | null>(null)
  const minimized = ref(true)
  const currentContext = shallowRef<AssistantContext>(workspaceContext)
  const previousScreen = ref<string | null>(null)
  const selected = computed(() => conversations.value.find(chat => chat.id === selectedId.value) ?? null)

  function create(context: AssistantContext = currentContext.value, register = true) {
    const captured = normalizeAssistantContext(context) ?? workspaceContext
    const chat = useAssistantChat({
      settings,
      context: captured,
      ticketKey: ref(captured.kind === 'ticket' ? captured.key : undefined),
      ticketSummary: ref(captured.kind === 'ticket' ? captured.summary : undefined),
      onComplete: () => onComplete?.(captured),
    })
    const conversation = {
      id: crypto.randomUUID(),
      context: captured,
      draft: ref(''),
      selectedSkillIds: ref<string[]>([]),
      chat,
      title: computed(() => chat.messages.value.find(message => message.role === 'user')?.content.split('\n')[0]?.trim() || captured.label),
    }
    if (register)
      add(conversation)
    return conversation
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
    conversations.value.find(chat => chat.id === id)?.chat.stop()
    const index = conversations.value.findIndex(chat => chat.id === id)
    conversations.value = conversations.value.filter(chat => chat.id !== id)
    if (selectedId.value === id)
      selectedId.value = conversations.value[Math.max(0, index - 1)]?.id ?? null
  }

  return { conversations, selectedId, selected, minimized, currentContext, previousScreen, create, add, select, close }
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
const sessions = createAssistantSessions(settings, context => completed?.(context))
export function configureAssistantSessions(value: AssistantSettings, onComplete: (context: AssistantContext) => void) {
  settings.value = value
  completed = onComplete
}
export const useAssistantSessions = () => sessions
