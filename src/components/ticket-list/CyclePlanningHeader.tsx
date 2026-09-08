import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import type { Cycle } from '~/shared/cycles'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref } from 'vue'
import { colors } from '@/styles/tokens.stylex'
import { cycleDaysRemaining, cycleProgress, formatCycleDateRange } from '~/shared/cycles'

const styles = stylex.create({
  root: { flexShrink: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1.5rem', paddingBlock: '1rem' },
  header: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' },
  titleBlock: { minWidth: 0 },
  title: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 16, fontWeight: 600, color: '#f0f1f4' },
  description: { marginTop: '0.25rem', fontSize: 12, color: '#8f9198' },
  actions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.375rem' },
  addWrapper: { position: 'relative' },
  addButton: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.045)', ':hover': 'rgba(255, 255, 255, 0.07)' }, paddingInline: '0.625rem', paddingBlock: '0.25rem', fontSize: 12, color: '#d7d8dc', opacity: { ':disabled': 0.5 } },
  menu: { position: 'absolute', top: '2.25rem', right: 0, zIndex: 30, width: '18rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: '#15161a', padding: '0.5rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)' },
  input: { marginBottom: '0.25rem', width: '100%', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', paddingInline: '0.5rem', paddingBlock: '0.375rem', fontSize: 12, color: colors['--color-slate-200'], outlineStyle: 'none' },
  option: { display: 'flex', width: '100%', flexDirection: 'column', borderRadius: '0.375rem', paddingInline: '0.5rem', paddingBlock: '0.375rem', textAlign: 'left', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
  optionKey: { fontSize: 11, color: '#8f9198' },
  optionSummary: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#e6e7ea' },
  emptyOption: { paddingInline: '0.5rem', paddingBlock: '0.5rem', fontSize: 12, color: '#8f9198' },
  progressBlock: { marginTop: '0.75rem' },
  track: { height: '0.375rem', overflow: 'hidden', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  fill: (width: string) => ({ height: '100%', width, borderRadius: '9999px', backgroundColor: '#5b8def' }),
  stats: { marginTop: '0.375rem', fontSize: 11, color: '#8f9198' },
})

export default defineComponent({
  name: 'CyclePlanningHeader',
  props: {
    cycle: {
      type: [Object, null] as PropType<Cycle | null>,
      required: true,
    },
    kind: {
      type: String as PropType<'current' | 'upcoming' | 'previous' | 'sprint'>,
      required: true,
    },
    tickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    addableTickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    isMutating: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    add: (ticketKey: string) => typeof ticketKey === 'string',
  },
  setup(props, { emit }) {
    const addOpen = ref(false)
    const addQuery = ref('')

    const progress = computed(() => cycleProgress(props.tickets))
    const remaining = computed(() => (
      props.cycle && (props.kind === 'current' || props.kind === 'upcoming')
        ? cycleDaysRemaining(props.cycle)
        : null
    ))
    const canAddIssues = computed(() => props.kind === 'current' || props.kind === 'upcoming')
    const emptyTitle = computed(() => {
      if (props.kind === 'upcoming')
        return 'No upcoming cycle'
      if (props.kind === 'previous')
        return 'No previous cycle'
      return 'No active cycle'
    })
    const emptyDescription = computed(() => {
      if (props.kind === 'current')
        return 'Start the upcoming cycle when one exists.'
      if (props.kind === 'previous')
        return 'No completed sprint on this team’s board.'
      return 'No upcoming sprint on this team’s board.'
    })
    const filteredAddable = computed(() => {
      const query = addQuery.value.trim().toLowerCase()
      const tickets = props.addableTickets
      if (!query) {
        return tickets.slice(0, 8)
      }
      return tickets.filter(ticket =>
        ticket.key.toLowerCase().includes(query) || ticket.summary.toLowerCase().includes(query),
      ).slice(0, 8)
    })

    function addTicket(key: string): void {
      emit('add', key)
      addQuery.value = ''
      addOpen.value = false
    }

    return () => (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header)}>
          <div {...stylex.attrs(styles.titleBlock)}>
            <h2 {...stylex.attrs(styles.title)}>
              {props.cycle?.name ?? emptyTitle.value}
            </h2>
            <p {...stylex.attrs(styles.description)}>
              {props.cycle
                ? (
                    <>
                      {formatCycleDateRange(props.cycle)}
                      {remaining.value !== null && (
                        <span>
                          {` · ${remaining.value}d left`}
                        </span>
                      )}
                    </>
                  )
                : emptyDescription.value}
            </p>
          </div>
          <div {...stylex.attrs(styles.actions)}>
            {props.cycle && canAddIssues.value && (
              <div {...stylex.attrs(styles.addWrapper)}>
                <button
                  type="button"
                  {...stylex.attrs(styles.addButton)}
                  disabled={props.isMutating}
                  onClick={() => { addOpen.value = !addOpen.value }}
                >
                  Add issue
                </button>
                {addOpen.value && (
                  <div {...stylex.attrs(styles.menu)}>
                    <input
                      v-model={addQuery.value}
                      {...stylex.attrs(styles.input)}
                      placeholder="Search issues"
                    />
                    {filteredAddable.value.map(ticket => (
                      <button
                        key={ticket.key}
                        type="button"
                        {...stylex.attrs(styles.option)}
                        onClick={() => addTicket(ticket.key)}
                      >
                        <span {...stylex.attrs(styles.optionKey)}>{ticket.key}</span>
                        <span {...stylex.attrs(styles.optionSummary)}>{ticket.summary}</span>
                      </button>
                    ))}
                    {filteredAddable.value.length === 0 && (
                      <p {...stylex.attrs(styles.emptyOption)}>No matching issues</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {props.cycle && (
          <div {...stylex.attrs(styles.progressBlock)}>
            <div {...stylex.attrs(styles.track)}>
              <div {...stylex.attrs(styles.fill(`${progress.value.percent}%`))} />
            </div>
            <p {...stylex.attrs(styles.stats)}>
              {progress.value.percent}
              %
              {' · '}
              {progress.value.usesPoints
                ? `${progress.value.completedPoints}/${progress.value.totalPoints} points`
                : `${progress.value.completedCount}/${progress.value.totalCount} issues`}
            </p>
          </div>
        )}
      </div>
    )
  },
})
