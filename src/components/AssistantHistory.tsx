import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref } from 'vue'
import { Icon } from '#components'
import { useAssistantSessions } from '@/composables/useAssistantSessions'
import { breakpoints, colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  panel: { display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: 0, width: { default: '100%', [breakpoints.md]: '18rem' }, maxHeight: { default: '18rem', [breakpoints.md]: 'none' }, borderRightWidth: { default: 0, [breakpoints.md]: 1 }, borderRightStyle: 'solid', borderRightColor: colors['--color-border-default'], borderBottomWidth: { default: 1, [breakpoints.md]: 0 }, borderBottomStyle: 'solid', borderBottomColor: colors['--color-border-default'], padding: '1rem', backgroundColor: colors['--color-surface-1'], color: colors['--color-slate-200'] },
  heading: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' },
  icon: { width: '1rem', height: '1rem', flexShrink: 0, color: colors['--color-slate-400'] },
  count: { marginLeft: 'auto', fontSize: '0.75rem', color: colors['--color-slate-500'] },
  search: { flexShrink: 0, width: '100%', borderWidth: 1, borderStyle: 'solid', borderColor: colors['--color-border-default'], borderRadius: '0.375rem', backgroundColor: colors['--color-surface-2'], padding: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: colors['--color-slate-200'] },
  list: { minHeight: 0, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.25rem', textAlign: 'left', backgroundColor: { 'default': null, ':hover': colors['--color-surface-3'] } },
  text: { flexGrow: 1, minWidth: 0 },
  title: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: colors['--color-slate-200'] },
  metadata: { display: 'block', marginTop: '0.25rem', fontSize: '0.6875rem', color: colors['--color-slate-500'] },
  action: { flexShrink: 0, fontSize: '0.6875rem', color: colors['--color-slate-400'] },
  empty: { fontSize: '0.75rem', lineHeight: 1.6, color: colors['--color-slate-500'] },
  error: { marginBottom: '0.75rem', fontSize: '0.75rem', lineHeight: 1.6, color: colors['--color-rose-400'] },
})

export default defineComponent({
  name: 'AssistantHistory',
  setup() {
    const sessions = useAssistantSessions()
    const search = ref('')
    const filtered = computed(() => {
      const query = search.value.trim().toLocaleLowerCase()
      return sessions.closedConversations.value.filter(({ conversation }) =>
        `${conversation.title.value} ${conversation.context.label} ${conversation.draft.value}`.toLocaleLowerCase().includes(query),
      )
    })
    return () => (
      <aside {...stylex.attrs(styles.panel)} aria-label="Closed chats">
        <h2 {...stylex.attrs(styles.heading)}>
          <Icon name="lucide:history" {...stylex.attrs(styles.icon)} aria-hidden="true" />
          Closed chats
          <span {...stylex.attrs(styles.count)}>{sessions.closedConversations.value.length}</span>
        </h2>
        {sessions.historyError.value && <p role="alert" {...stylex.attrs(styles.error)}>{sessions.historyError.value}</p>}
        {sessions.closedConversations.value.length > 0 && (
          <input
            type="search"
            aria-label="Search closed chats"
            placeholder="Search closed chats…"
            value={search.value}
            {...stylex.attrs(styles.search)}
            onInput={(event) => { search.value = (event.target as HTMLInputElement).value }}
          />
        )}
        <div {...stylex.attrs(styles.list)}>
          {!sessions.closedConversations.value.length
            ? <p {...stylex.attrs(styles.empty)}>Chats you close will appear here. Reopen one to pick up where you left off.</p>
            : !filtered.value.length
                ? <p {...stylex.attrs(styles.empty)}>No closed chats match your search.</p>
                : filtered.value.map(({ conversation, closedAt }) => (
                    <button
                      key={conversation.id}
                      type="button"
                      aria-label={`Reopen chat: ${conversation.title.value}`}
                      title={conversation.title.value}
                      {...stylex.attrs(styles.row)}
                      onClick={() => sessions.reopen(conversation.id)}
                    >
                      <span {...stylex.attrs(styles.text)}>
                        <span {...stylex.attrs(styles.title)}>{conversation.title.value}</span>
                        <span {...stylex.attrs(styles.metadata)}>
                          {conversation.context.label}
                          {' · '}
                          <time datetime={new Date(closedAt).toISOString()} title={new Date(closedAt).toLocaleString()}>{new Date(closedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</time>
                        </span>
                      </span>
                      <span {...stylex.attrs(styles.action)}>Reopen</span>
                    </button>
                  ))}
        </div>
      </aside>
    )
  },
})
