import { ref } from 'vue'
import { createAssistantChatState } from '@/composables/useAssistantChat'

// Module-scope store so the assistant panel — its transcript, draft, pinned
// ticket, and any in-flight stream — survives navigation anywhere in the app.
// The panel itself is mounted globally in app.vue.
const isOpen = ref(false)
const minimized = ref(false)
const expanded = ref(false)
const ticketKey = ref<string | null>(null)
const ticketSummary = ref<string | null>(null)
const chatState = createAssistantChatState()
const draft = ref('')

export function useAssistantPanel() {
  /**
   * Opens the panel pinned to a ticket (Linear-style: the chat stays about this
   * ticket until re-targeted or reset). Re-pinning from another ticket keeps
   * the transcript; the composer chip shows the active pin.
   */
  function openForTicket(key: string, summary: string | null): void {
    ticketKey.value = key
    ticketSummary.value = summary
    isOpen.value = true
    minimized.value = false
  }

  function close(): void {
    isOpen.value = false
  }

  return {
    isOpen,
    minimized,
    expanded,
    ticketKey,
    ticketSummary,
    chatState,
    draft,
    openForTicket,
    close,
  }
}
