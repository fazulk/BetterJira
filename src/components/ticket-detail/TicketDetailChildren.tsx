import type { PropType } from 'vue'
import type { ChildTicketGrouping, ChildTicketOrdering } from '@/features/ticket-detail/childTicketDisplay'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref } from 'vue'
import StatusIcon from '@/components/StatusIcon'
import { getChildTicketSections } from '@/features/ticket-detail/childTicketDisplay'
import { breakpoints, colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  section: { marginBottom: '2rem' },
  header: { marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' },
  controls: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  control: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: colors['--color-slate-500'] },
  select: { maxWidth: '9rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: colors['--color-issue-detail-bg'], color: colors['--color-slate-300'], padding: '0.25rem', fontSize: '0.75rem' },
  group: { marginBottom: '0.75rem' },
  groupTitle: { margin: 0, paddingBlock: '0.5rem', fontSize: '0.75rem', fontWeight: 500, color: colors['--color-slate-400'] },
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
    displayControls: {
      type: Boolean,
      default: false,
    },
    statusOrder: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
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
    const grouping = ref<ChildTicketGrouping>('none')
    const ordering = ref<ChildTicketOrdering>('original')
    const direction = ref<'asc' | 'desc'>('asc')
    const sections = computed(() => getChildTicketSections(
      props.childTickets,
      props.displayControls ? grouping.value : 'none',
      props.displayControls ? ordering.value : 'original',
      direction.value,
      props.statusOrder,
    ))

    return () => (
      <section {...stylex.attrs(styles.section)}>
        <div {...stylex.attrs(styles.header)}>
          <h2 {...stylex.attrs(styles.title)}>{props.sectionLabel}</h2>
          <div {...stylex.attrs(styles.controls)}>
            {props.displayControls && props.childTickets.length > 0 && (
              <>
                <label {...stylex.attrs(styles.control)}>
                  Group
                  <select aria-label="Group issues by" v-model={grouping.value} {...stylex.attrs(styles.select)}>
                    <option value="none">None</option>
                    <option value="status">Status</option>
                    <option value="assignee">Assignee</option>
                    <option value="priority">Priority</option>
                    <option value="label">Label</option>
                  </select>
                </label>
                <label {...stylex.attrs(styles.control)}>
                  Sort
                  <select aria-label="Sort issues by" v-model={ordering.value} {...stylex.attrs(styles.select)}>
                    <option value="original">Default</option>
                    <option value="key">Issue key</option>
                    <option value="title">Title</option>
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                    <option value="assignee">Assignee</option>
                    <option value="estimate">Story points</option>
                    <option value="updated">Updated</option>
                  </select>
                </label>
                {ordering.value !== 'original' && (
                  <button
                    type="button"
                    aria-label={direction.value === 'asc' ? 'Sort descending' : 'Sort ascending'}
                    title={direction.value === 'asc' ? 'Sort descending' : 'Sort ascending'}
                    {...stylex.attrs(styles.action)}
                    onClick={() => { direction.value = direction.value === 'asc' ? 'desc' : 'asc' }}
                  >
                    {direction.value === 'asc' ? '↑' : '↓'}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              {...stylex.attrs(styles.action)}
              onClick={() => emit('create', props.ticketKey)}
            >
              {props.actionLabel}
            </button>
          </div>
        </div>
        {props.childTickets.length
          ? (
              <div>
                {sections.value.map(section => (
                  <div key={section.label} {...stylex.attrs(section.label ? styles.group : null)}>
                    {section.label && (
                      <h3 {...stylex.attrs(styles.groupTitle)}>
                        {section.label}
                        {' '}
                        ·
                        {' '}
                        {section.tickets.length}
                      </h3>
                    )}
                    <div {...stylex.attrs(styles.list)}>
                      {section.tickets.map((child, index) => (
                        <button
                          key={child.key}
                          type="button"
                          {...stylex.attrs(styles.row, index === section.tickets.length - 1 ? styles.lastRow : null)}
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
                  </div>
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
