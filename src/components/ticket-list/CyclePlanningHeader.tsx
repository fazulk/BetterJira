import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import type { Cycle } from '~/shared/cycles'
import { computed, defineComponent, ref } from 'vue'
import { cycleDaysRemaining, cycleProgress, formatCycleDateRange } from '~/shared/cycles'

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
      <div class="shrink-0 border-b border-white/[0.06] px-6 py-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-[16px] font-semibold text-[#f0f1f4]">
              {props.cycle?.name ?? emptyTitle.value}
            </h2>
            <p class="mt-1 text-[12px] text-[#8f9198]">
              {props.cycle
                ? (
                    <>
                      {formatCycleDateRange(props.cycle)}
                      {remaining.value !== null && (
                        <span>
                          {' '}
                          ·
                          {remaining.value}
                          d left
                        </span>
                      )}
                    </>
                  )
                : emptyDescription.value}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            {props.cycle && canAddIssues.value && (
              <div class="relative">
                <button
                  type="button"
                  class="rounded-md border border-white/[0.08] bg-white/[0.045] px-2.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.07] disabled:opacity-50"
                  disabled={props.isMutating}
                  onClick={() => { addOpen.value = !addOpen.value }}
                >
                  Add issue
                </button>
                {addOpen.value && (
                  <div class="absolute top-9 right-0 z-30 w-72 overflow-hidden rounded-lg border border-white/[0.08] bg-[#15161a] p-2 shadow-xl shadow-black/40">
                    <input
                      v-model={addQuery.value}
                      class="mb-1 w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-[12px] text-slate-200 outline-none"
                      placeholder="Search issues"
                    />
                    {filteredAddable.value.map(ticket => (
                      <button
                        key={ticket.key}
                        type="button"
                        class="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-white/[0.06]"
                        onClick={() => addTicket(ticket.key)}
                      >
                        <span class="text-[11px] text-[#8f9198]">{ticket.key}</span>
                        <span class="truncate text-[12px] text-[#e6e7ea]">{ticket.summary}</span>
                      </button>
                    ))}
                    {filteredAddable.value.length === 0 && (
                      <p class="px-2 py-2 text-[12px] text-[#8f9198]">No matching issues</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {props.cycle && (
          <div class="mt-3">
            <div class="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div class="h-full rounded-full bg-[#5b8def]" style={{ width: `${progress.value.percent}%` }} />
            </div>
            <p class="mt-1.5 text-[11px] text-[#8f9198]">
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
