import type { PropType } from 'vue'
import type { IssueRowDisplayProps, IssueSection } from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import { defineComponent } from 'vue'
import { Icon } from '#components'
import IssueRow from '@/components/IssueRow'
import StatusIcon from '@/components/StatusIcon'
import { useProjectAppearances } from '@/composables/useProjectAppearances'

export default defineComponent({
  name: 'TicketListIssueSections',
  props: {
    sections: {
      type: Array as PropType<IssueSection[]>,
      required: true,
    },
    visibleCount: {
      type: Number,
      required: true,
    },
    hiddenCompletedCount: {
      type: Number,
      required: true,
    },
    completedRange: {
      type: String,
      required: true,
    },
    focusedIssueKey: {
      type: String as PropType<string | null>,
      required: true,
    },
    checkedIssueKeySet: {
      type: Object as PropType<Set<string>>,
      required: true,
    },
    rowDisplayProps: {
      type: Object as PropType<IssueRowDisplayProps>,
      required: true,
    },
    emptyTitle: {
      type: String,
      required: true,
    },
    emptyDescription: {
      type: String,
      required: true,
    },
    showHeaders: {
      type: Boolean,
      required: true,
    },
    getRowKey: {
      type: Function as PropType<(ticket: JiraTicket) => string>,
      required: true,
    },
    isCollapsed: {
      type: Function as PropType<(section: IssueSection) => boolean>,
      required: true,
    },
    isStatusGrouping: {
      type: Boolean,
    },
    getStatusCategoryForGroupLabel: {
      type: Function as PropType<((label: string) => string) | undefined>,
      default: undefined,
    },
  },
  emits: {
    showCompleted: () => true,
    toggleSection: (section: IssueSection) => Boolean(section),
    select: (key: string) => typeof key === 'string',
    prefetch: (key: string) => typeof key === 'string',
    toggleCheck: (key: string) => typeof key === 'string',
  },
  setup(props, { emit, attrs }) {
    const { getTicketProjectAppearance } = useProjectAppearances()

    return () => (
      <div class={['min-w-0 overflow-y-auto', attrs.class]}>
        {props.sections.length && props.visibleCount > 0
          ? (
              <div>
                {props.sections.map(section => (
                  <section key={section.id}>
                    {props.showHeaders && (
                      <div class="flex h-8 items-center gap-2 border-b border-white/[0.06] bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]">
                        <button
                          type="button"
                          class="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-[#d7d8dc]"
                          aria-expanded={!props.isCollapsed(section)}
                          onClick={() => emit('toggleSection', section)}
                        >
                          <Icon
                            name="lucide:chevron-down"
                            class={['h-3 w-3 shrink-0 text-[#777a83] transition-transform', props.isCollapsed(section) ? '-rotate-90' : '']}
                            aria-hidden="true"
                          />
                          {props.isStatusGrouping && props.getStatusCategoryForGroupLabel && (
                            <StatusIcon status={section.label} statusCategory={props.getStatusCategoryForGroupLabel(section.label)} size={16} />
                          )}
                          <span class="truncate">{section.label}</span>
                          <span class="text-[#6f727b]">{section.tickets.length}</span>
                        </button>
                      </div>
                    )}
                    {!props.isCollapsed(section) && section.tickets.map((ticket) => {
                      const rowKey = props.getRowKey(ticket)
                      return (
                        <IssueRow
                          key={rowKey}
                          ticket={ticket}
                          selected={props.focusedIssueKey === rowKey}
                          checked={props.checkedIssueKeySet.has(rowKey)}
                          projectAppearance={getTicketProjectAppearance(ticket)}
                          {...props.rowDisplayProps}
                          onSelect={key => emit('select', key)}
                          onPrefetch={key => emit('prefetch', key)}
                          onToggleCheck={key => emit('toggleCheck', key)}
                        />
                      )
                    })}
                  </section>
                ))}
              </div>
            )
          : (
              <div class="flex h-full min-h-80 items-center justify-center px-6 text-center">
                <div class="max-w-sm">
                  <p class="text-[13px] font-medium text-[#d7d8dc]">{props.emptyTitle}</p>
                  <p class="mt-1 text-[12px] text-[#777a83]">{props.emptyDescription}</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
