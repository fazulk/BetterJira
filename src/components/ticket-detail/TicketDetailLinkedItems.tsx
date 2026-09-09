import type { PropType } from 'vue'
import type { JiraIssueLink } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent } from 'vue'
import StatusIcon from '@/components/StatusIcon'
import { breakpoints, colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  section: { marginBottom: '2rem' },
  title: { margin: 0, marginBottom: '0.75rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-400'] },
  group: { marginTop: '0.75rem' },
  relationship: { margin: 0, marginBottom: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 400, color: colors['--color-slate-500'] },
  list: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)' },
  row: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.75rem', borderWidth: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.035)' }, color: { 'default': colors['--color-slate-300'], ':hover': colors['--color-slate-100'] }, paddingInline: '0.75rem', paddingBlock: '0.625rem', textAlign: 'left' },
  lastRow: { borderBottomWidth: 0 },
  key: { flexShrink: 0, fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  summary: { minWidth: 0, flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', color: 'currentColor' },
  status: { display: { default: 'none', [breakpoints.md]: 'inline' }, flexShrink: 0, fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
})

export default defineComponent({
  name: 'TicketDetailLinkedItems',
  props: {
    linkedIssues: {
      type: Array as PropType<JiraIssueLink[]>,
      default: () => [],
    },
  },
  emits: {
    prefetch: (key: string) => typeof key === 'string',
    select: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    const groups = computed(() => {
      const grouped = new Map<string, JiraIssueLink[]>()
      for (const link of props.linkedIssues) {
        const group = grouped.get(link.relationship)
        if (group)
          group.push(link)
        else
          grouped.set(link.relationship, [link])
      }
      return [...grouped]
    })

    return () => props.linkedIssues.length > 0 && (
      <section aria-label="Linked work items" {...stylex.attrs(styles.section)}>
        <h2 {...stylex.attrs(styles.title)}>Linked work items</h2>
        {groups.value.map(([relationship, links]) => (
          <div key={relationship} {...stylex.attrs(styles.group)}>
            <h3 {...stylex.attrs(styles.relationship)}>{relationship}</h3>
            <div {...stylex.attrs(styles.list)}>
              {links.map((link, index) => (
                <button
                  key={link.id ?? `${link.key}:${index}`}
                  type="button"
                  aria-label={`Open ${link.key}${link.summary ? `: ${link.summary}` : ''}${link.status ? ` (${link.status})` : ''}`}
                  {...stylex.attrs(styles.row, index === links.length - 1 ? styles.lastRow : null)}
                  onClick={() => emit('select', link.key)}
                  onMouseenter={() => emit('prefetch', link.key)}
                  onFocus={() => emit('prefetch', link.key)}
                >
                  <StatusIcon status={link.status} statusCategory={link.statusCategory} size={16} />
                  <span {...stylex.attrs(styles.key)}>{link.key}</span>
                  <span title={link.summary} {...stylex.attrs(styles.summary)}>{link.summary}</span>
                  <span {...stylex.attrs(styles.status)}>{link.status}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    )
  },
})
