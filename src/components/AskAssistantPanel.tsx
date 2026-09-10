import * as stylex from '@stylexjs/stylex'
import { defineComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '#components'
import { useAssistantNavigation } from '@/composables/useAssistantNavigation'
import { useAssistantSessions, workspaceContext } from '@/composables/useAssistantSessions'
import AssistantConversation from './AssistantConversation'

const styles = stylex.create({
  toolbar: { position: 'fixed', bottom: 0, left: 0, right: 0, height: 44, display: 'flex', alignItems: 'center', gap: 8, paddingInline: 12, borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'rgba(255,255,255,.09)', backgroundColor: '#121316', color: '#d7d8dc', zIndex: 45 },
  tabs: { display: 'flex', gap: 4, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', marginLeft: 'auto', minWidth: 0, overflowX: 'auto' },
  tab: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: 200, height: 32, paddingInline: 10, borderRadius: 6, fontSize: 12, backgroundColor: { 'default': 'transparent', ':hover': '#24252a' } },
  active: { backgroundColor: '#292a30', color: '#fff' },
  label: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  agent: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingInline: 12, height: 32, borderLeftWidth: '1px', borderLeftStyle: 'solid', borderLeftColor: 'rgba(255,255,255,.1)' },
  panel: (left: number) => ({ position: 'fixed', left, bottom: 52, width: 'min(420px, calc(100vw - 16px))', height: 'min(600px, calc(100dvh - 68px))', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,.12)', backgroundColor: '#16171b', boxShadow: '0 16px 60px #0008', zIndex: 46 }),
  activity: { color: '#a9acf9', animationName: stylex.keyframes({ '50%': { opacity: 0.3 } }), animationDuration: '1s', animationIterationCount: 'infinite' },
  error: { color: '#fb7185' },
})

export default defineComponent({
  name: 'AskAssistantPanel',
  setup() {
    const sessions = useAssistantSessions()
    const { isHome, isWorkspace, expand } = useAssistantNavigation()
    function createConversation() {
      sessions.create(isWorkspace.value ? workspaceContext : sessions.currentContext.value)
    }
    const tabs = ref<HTMLElement | null>(null)
    const left = ref(8)
    function position() {
      const tab = tabs.value?.querySelector<HTMLElement>('[aria-selected="true"]')
      if (tab)
        left.value = Math.max(8, Math.min(tab.getBoundingClientRect().left, window.innerWidth - 428))
    }
    watch([sessions.selectedId, sessions.minimized, isHome], async () => {
      await nextTick()
      tabs.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      position()
    })
    onMounted(() => window.addEventListener('resize', position))
    onUnmounted(() => window.removeEventListener('resize', position))
    return () => (
      <>
        <nav {...stylex.attrs(styles.toolbar)} aria-label="Agent toolbar">
          <div ref={tabs} role="tablist" aria-label="Conversations" {...stylex.attrs(styles.tabs)} onScroll={position}>
            {sessions.conversations.value.map(conversation => (
              <button
                key={conversation.id}
                role="tab"
                aria-selected={sessions.selectedId.value === conversation.id}
                {...stylex.attrs(styles.tab, sessions.selectedId.value === conversation.id && styles.active)}
                title={conversation.context.label}
                onClick={() => sessions.select(conversation.id)}
                onKeydown={(event: KeyboardEvent) => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                    return
                  event.preventDefault()
                  const list = sessions.conversations.value
                  const index = list.indexOf(conversation)
                  const next = list[(index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]
                  if (next) {
                    sessions.select(next.id)
                    void nextTick(() => tabs.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
                  }
                }}
              >
                <span {...stylex.attrs(styles.label)}>{conversation.context.label}</span>
                {conversation.chat.isStreaming.value && <span aria-label="Working" {...stylex.attrs(styles.activity)}>●</span>}
                {conversation.chat.errorText.value && <span aria-label="Error" {...stylex.attrs(styles.error)}>!</span>}
              </button>
            ))}
          </div>
          <button {...stylex.attrs(styles.agent)} onClick={createConversation}>
            <Icon name="lucide:sparkles" />
            Agent
          </button>
        </nav>
        {!isHome.value && !sessions.minimized.value && sessions.selected.value && (
          <div {...stylex.attrs(styles.panel(left.value))}>
            <AssistantConversation
              key={sessions.selected.value.id}
              conversation={sessions.selected.value}
              onMinimize={() => { sessions.minimized.value = true }}
              onExpand={expand}
              onClose={() => {
                if (sessions.selectedId.value)
                  sessions.close(sessions.selectedId.value)
              }}
            />
          </div>
        )}
      </>
    )
  },
})
