import * as stylex from '@stylexjs/stylex'
import { defineComponent, shallowRef } from 'vue'
import AssistantConversation from '@/components/AssistantConversation'
import AssistantHistory from '@/components/AssistantHistory'
import { useAssistantNavigation } from '@/composables/useAssistantNavigation'
import { useAssistantSessions, workspaceContext } from '@/composables/useAssistantSessions'
import { breakpoints } from '@/styles/tokens.stylex'

const styles = stylex.create({
  home: { display: 'flex', flexDirection: { default: 'column', [breakpoints.md]: 'row' }, height: '100%', minHeight: 0 },
  conversation: { flexGrow: 1, flexShrink: 1, flexBasis: '0%', minHeight: 0, minWidth: 0 },
})

export default defineComponent({
  name: 'TicketListAssistantHome',
  setup() {
    const sessions = useAssistantSessions()
    const { moveToToolbar } = useAssistantNavigation()
    const empty = shallowRef(sessions.create(workspaceContext, false))
    return () => (
      <div {...stylex.attrs(styles.home)}>
        <AssistantHistory />
        <div {...stylex.attrs(styles.conversation)}>
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
        </div>
      </div>
    )
  },
})
