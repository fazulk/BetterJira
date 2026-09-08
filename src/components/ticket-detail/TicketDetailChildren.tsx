import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import StatusIcon from '@/components/StatusIcon'
import { breakpoints, colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  section: { marginBottom: '2rem' },
  header: { marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-400'], margin: 0 },
  action: { borderRadius: '0.375rem', borderWidth: 0, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  list: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)' },
  row: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.75rem', borderWidth: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.035)' }, color: { 'default': colors['--color-slate-300'], ':hover': colors['--color-slate-100'] }, paddingInline: '0.75rem', paddingBlock: '0.625rem', textAlign: 'left' },
  lastRow: { borderBottomWidth: 0 },
  key: { width: '5rem', flexShrink: 0, fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  summary: { minWidth: 0, flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', color: 'currentColor' },
  points: { width: '3.5rem', flexShrink: 0, textAlign: 'right', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  status: { display: { default: 'none', [breakpoints.md]: 'inline' }, flexShrink: 0, fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
  empty: { display: 'flex', minHeight: '3rem', width: '100%', alignItems: 'center', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-600'] },
})

export default defineComponent({
  name: 'TicketDetailChildren',
  props: {
    actionLabel: {
      type: String,
      required: true,
    },
    childTickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    emptyLabel: {
      type: String,
      required: true,
    },
    sectionLabel: {
      type: String,
      required: true,
    },
    ticketKey: {
      type: String,
      required: true,
    },
  },
  emits: {
    create: (key: string) => typeof key === 'string',
    prefetch: (key: string) => typeof key === 'string',
    select: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    return () => (
      <section {...stylex.attrs(styles.section)}>
        <div {...stylex.attrs(styles.header)}>
          <h2 {...stylex.attrs(styles.title)}>{props.sectionLabel}</h2>
          <button
            type="button"
            {...stylex.attrs(styles.action)}
            onClick={() => emit('create', props.ticketKey)}
          >
            {props.actionLabel}
          </button>
        </div>
        {props.childTickets.length
          ? (
              <div {...stylex.attrs(styles.list)}>
                {props.childTickets.map((child, index) => (
                  <button
                    key={child.key}
                    {...stylex.attrs(styles.row, index === props.childTickets.length - 1 ? styles.lastRow : null)}
                    onClick={() => emit('select', child.key)}
                    onMouseenter={() => emit('prefetch', child.key)}
                  >
                    <StatusIcon status={child.status} statusCategory={child.statusCategory} size={16} />
                    <span {...stylex.attrs(styles.key)}>{child.key}</span>
                    <span {...stylex.attrs(styles.summary)}>{child.summary}</span>
                    <span {...stylex.attrs(styles.points)}>
                      {child.storyPoints !== undefined ? `${child.storyPoints} pts` : '–'}
                    </span>
                    <span {...stylex.attrs(styles.status)}>{child.status}</span>
                  </button>
                ))}
              </div>
            )
          : (
              <div {...stylex.attrs(styles.empty)}>
                <span>{props.emptyLabel}</span>
              </div>
            )}
      </section>
    )
  },
})
