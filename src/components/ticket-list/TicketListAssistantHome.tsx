import { defineComponent, shallowRef } from 'vue'
import AssistantConversation from '@/components/AssistantConversation'
import { useAssistantNavigation } from '@/composables/useAssistantNavigation'
import { useAssistantSessions, workspaceContext } from '@/composables/useAssistantSessions'

export default defineComponent({
  name: 'TicketListAssistantHome',
  setup() {
    const sessions = useAssistantSessions()
    const { moveToToolbar } = useAssistantNavigation()
    const empty = shallowRef(sessions.create(workspaceContext, false))
    return () => (
      <AssistantConversation
        key={sessions.selected.value?.id ?? empty.value.id}
        conversation={sessions.selected.value ?? empty.value}
        fullscreen
        onMinimize={moveToToolbar}
        onClose={() => {
          if (sessions.selectedId.value)
            sessions.close(sessions.selectedId.value)
        }}
        onSubmit={() => {
          if (!sessions.selected.value) {
            sessions.add(empty.value)
            empty.value = sessions.create(workspaceContext, false)
          }
        }}
      />
    )
  },
})
