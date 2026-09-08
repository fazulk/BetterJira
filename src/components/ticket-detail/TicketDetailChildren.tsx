import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import { defineComponent } from 'vue'
import StatusIcon from '@/components/StatusIcon'

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
      <section class="mb-8">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-xs font-medium text-slate-400">{props.sectionLabel}</h2>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
            onClick={() => emit('create', props.ticketKey)}
          >
            {props.actionLabel}
          </button>
        </div>
        {props.childTickets.length
          ? (
              <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
                {props.childTickets.map(child => (
                  <button
                    key={child.key}
                    class="group flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 text-left last:border-b-0 hover:bg-white/[0.035]"
                    onClick={() => emit('select', child.key)}
                    onMouseenter={() => emit('prefetch', child.key)}
                  >
                    <StatusIcon status={child.status} statusCategory={child.statusCategory} size={16} />
                    <span class="w-20 shrink-0 text-xs text-slate-500">{child.key}</span>
                    <span class="min-w-0 flex-1 truncate text-sm text-slate-300 group-hover:text-slate-100">{child.summary}</span>
                    <span class="w-14 shrink-0 text-right text-xs text-slate-500">
                      {child.storyPoints !== undefined ? `${child.storyPoints} pts` : '–'}
                    </span>
                    <span class="hidden shrink-0 text-xs text-slate-600 md:inline">{child.status}</span>
                  </button>
                ))}
              </div>
            )
          : (
              <div class="flex min-h-12 w-full items-center rounded-lg border border-dashed border-white/[0.08] px-3 py-2 text-sm text-slate-600">
                <span>{props.emptyLabel}</span>
              </div>
            )}
      </section>
    )
  },
})
