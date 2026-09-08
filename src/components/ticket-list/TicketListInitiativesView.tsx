import type { PropType } from 'vue'
import type { InitiativeRow, InitiativeRowFieldId, ProjectRow } from '@/features/ticket-list/types'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TicketListInitiativesView',
  props: {
    rows: {
      type: Array as PropType<InitiativeRow[]>,
      required: true,
    },
    gridTemplate: {
      type: String,
      required: true,
    },
    isFieldVisible: {
      type: Function as PropType<(field: InitiativeRowFieldId) => boolean>,
      required: true,
    },
    getHealthClass: {
      type: Function as PropType<(health: ProjectRow['health']) => string>,
      required: true,
    },
    getProgressBarClass: {
      type: Function as PropType<(health: ProjectRow['health']) => string>,
      required: true,
    },
    getRelativeTimeLabel: {
      type: Function as PropType<(value?: string) => string>,
      required: true,
    },
  },
  emits: {
    open: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    return () => (
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="grid border-b border-white/[0.06] px-4 py-2 text-[12px] text-[#777a83]" style={{ gridTemplateColumns: props.gridTemplate }}>
          <span>Name</span>
          {props.isFieldVisible('health') && <span>Health</span>}
          {props.isFieldVisible('lead') && <span>Lead</span>}
          {props.isFieldVisible('projects') && <span>Projects</span>}
          {props.isFieldVisible('issues') && <span>Issues</span>}
          {props.isFieldVisible('updated') && <span>Updated</span>}
        </div>

        {props.rows.length
          ? (
              <div>
                {props.rows.map(initiative => (
                  <button
                    key={initiative.id}
                    type="button"
                    class="linear-row grid min-h-12 w-full items-center px-4 py-2 text-left"
                    style={{ gridTemplateColumns: props.gridTemplate }}
                    onClick={() => emit('open', initiative.id)}
                  >
                    <span class="min-w-0 pr-4">
                      <span class="block truncate text-[13px] font-medium text-[#e6e7ea]">{initiative.name}</span>
                      <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{initiative.description}</span>
                    </span>

                    {props.isFieldVisible('health') && (
                      <span>
                        <span class={['inline-flex rounded-full border px-2 py-0.5 text-[11px]', props.getHealthClass(initiative.health)]}>
                          {initiative.health}
                        </span>
                      </span>
                    )}

                    {props.isFieldVisible('lead') && <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{initiative.lead}</span>}
                    {props.isFieldVisible('projects') && (
                      <span class="text-[12px] text-[#8f9198]">
                        {initiative.projectCount}
                        {' '}
                        {initiative.projectCount === 1 ? 'project' : 'projects'}
                      </span>
                    )}

                    {props.isFieldVisible('issues') && (
                      <span class="pr-5">
                        <span class="flex items-center justify-between gap-2 text-[11px] text-[#8f9198]">
                          <span>
                            {initiative.completedCount}
                            /
                            {initiative.issueCount}
                          </span>
                          <span>
                            {initiative.progress}
                            %
                          </span>
                        </span>
                        <span class="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <span class={['block h-full rounded-full', props.getProgressBarClass(initiative.health)]} style={{ width: `${initiative.progress}%` }} />
                        </span>
                      </span>
                    )}

                    {props.isFieldVisible('updated') && <span class="truncate text-[12px] text-[#777a83]">{props.getRelativeTimeLabel(initiative.updatedAt)}</span>}
                  </button>
                ))}
              </div>
            )
          : (
              <div class="flex h-full min-h-80 items-center justify-center px-6 text-center">
                <div class="max-w-sm">
                  <p class="text-[13px] font-medium text-[#d7d8dc]">No initiatives found</p>
                  <p class="mt-1 text-[12px] text-[#777a83]">Initiatives will appear when projects can be grouped into roadmap work.</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
