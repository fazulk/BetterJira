import type { Ref } from 'vue'
import type { AssistantChatMessage, AssistantMessageSkill } from '~/shared/assistant'
import { computed, ref } from 'vue'
import { streamAssistantChat } from '@/api/assistant'
import { useAssistantSettings } from '@/composables/useAssistantSettings'

export interface AssistantTranscriptMessage extends AssistantChatMessage {
  id: number
  /** True while this assistant message is still being streamed. */
  pending?: boolean
}

export interface AssistantChatState {
  messages: Ref<AssistantTranscriptMessage[]>
  isStreaming: Ref<boolean>
  statusText: Ref<string>
  errorText: Ref<string>
  nextId: number
  abortController: AbortController | null
}

/**
 * Creates the reactive state backing an assistant chat. Create it at module
 * scope and pass it to `useAssistantChat` to keep a transcript (and any
 * in-flight stream) alive across component mounts.
 */
export function createAssistantChatState(): AssistantChatState {
  return {
    messages: ref<AssistantTranscriptMessage[]>([]),
    isStreaming: ref(false),
    statusText: ref(''),
    errorText: ref(''),
    nextId: 0,
    abortController: null,
  }
}

interface UseAssistantChatOptions {
  ticketKey: Ref<string | null | undefined>
  ticketSummary: Ref<string | null | undefined>
  /** Called after a response is fully and successfully received (not on stop/error). */
  onComplete?: () => void
  /** External state so the transcript can outlive the component. Defaults to per-instance state. */
  state?: AssistantChatState
}

export function useAssistantChat(options: UseAssistantChatOptions) {
  const { settings } = useAssistantSettings()

  const state = options.state ?? createAssistantChatState()
  const { messages, isStreaming, statusText, errorText } = state

  const canSend = computed(() => !isStreaming.value)

  function reset(): void {
    state.abortController?.abort()
    state.abortController = null
    messages.value = []
    isStreaming.value = false
    statusText.value = ''
    errorText.value = ''
  }

  function stop(): void {
    state.abortController?.abort()
    state.abortController = null
    isStreaming.value = false
    statusText.value = ''
    const last = messages.value[messages.value.length - 1]
    if (last && last.role === 'assistant') {
      last.pending = false
      if (!last.content.trim()) {
        last.content = '_Stopped._'
      }
    }
  }

  async function send(text: string, skills?: AssistantMessageSkill[]): Promise<void> {
    const trimmed = text.trim()
    const hasSkills = (skills?.length ?? 0) > 0
    if ((!trimmed && !hasSkills) || isStreaming.value) {
      return
    }

    errorText.value = ''
    statusText.value = ''

    messages.value.push({
      id: state.nextId++,
      role: 'user',
      content: trimmed,
      ...(hasSkills ? { skills } : {}),
    })
    const assistantMessage: AssistantTranscriptMessage = { id: state.nextId++, role: 'assistant', content: '', pending: true }
    messages.value.push(assistantMessage)

    const requestMessages: AssistantChatMessage[] = messages.value
      .filter(message => !(message.role === 'assistant' && message.pending))
      .map(message => ({ role: message.role, content: message.content, skills: message.skills }))

    isStreaming.value = true
    const abortController = new AbortController()
    state.abortController = abortController
    let succeeded = false

    try {
      await streamAssistantChat(
        {
          provider: settings.value.provider,
          model: settings.value.model,
          reasoning: settings.value.reasoning,
          ticketKey: options.ticketKey.value ?? undefined,
          ticketSummary: options.ticketSummary.value ?? undefined,
          messages: requestMessages,
        },
        (chunk) => {
          if (chunk.type === 'delta') {
            assistantMessage.content += chunk.text
            statusText.value = ''
          }
          else if (chunk.type === 'status') {
            statusText.value = chunk.text
          }
          else if (chunk.type === 'error') {
            errorText.value = chunk.message
          }
        },
        abortController.signal,
      )
      succeeded = true
    }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        errorText.value = error instanceof Error ? error.message : 'The assistant request failed.'
      }
    }
    finally {
      assistantMessage.pending = false
      if (errorText.value && !assistantMessage.content.trim()) {
        // Drop the empty assistant bubble so only the error banner shows.
        messages.value = messages.value.filter(message => message.id !== assistantMessage.id)
      }
      isStreaming.value = false
      statusText.value = ''
      if (state.abortController === abortController) {
        state.abortController = null
      }
      if (succeeded && !errorText.value) {
        options.onComplete?.()
      }
    }
  }

  return {
    messages,
    isStreaming,
    statusText,
    errorText,
    canSend,
    send,
    stop,
    reset,
  }
}
