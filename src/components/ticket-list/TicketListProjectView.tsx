import type { PropType } from 'vue'
import type { ProjectRow, ProjectRowFieldId, ProjectSection } from '@/features/ticket-list/types'
import { defineComponent } from 'vue'
import { Icon } from '#components'
import { useProjectAppearances } from '@/composables/useProjectAppearances'

export default defineComponent({
  name: 'TicketListProjectView',
  props: {
    sections: {
      type: Array as PropType<ProjectSection[]>,
      required: true,
    },
    visibleCount: {
      type: Number,
      required: true,
    },
    grouping: {
      type: String,
      required: true,
    },
    gridTemplate: {
      type: String,
      required: true,
    },
    isFieldVisible: {
      type: Function as PropType<(field: ProjectRowFieldId) => boolean>,
      required: true,
    },
    isSectionCollapsed: {
      type: Function as PropType<(section: ProjectSection) => boolean>,
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
  },
  emits: {
    toggleSection: (section: ProjectSection) => Boolean(section),
    prefetch: (key: string) => typeof key === 'string',
    open: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    const { getProjectAppearance } = useProjectAppearances()

    return () => (
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="grid border-b border-white/[0.06] px-4 py-2 text-[12px] text-[#777a83]" style={{ gridTemplateColumns: props.gridTemplate }}>
          <span>Name</span>
          {props.isFieldVisible('health') && <span>Health</span>}
          {props.isFieldVisible('priority') && <span>Priority</span>}
          {props.isFieldVisible('lead') && <span>Lead</span>}
          {props.isFieldVisible('targetDate') && <span>Target date</span>}
          {props.isFieldVisible('issues') && <span>Issues</span>}
          {props.isFieldVisible('status') && <span>Status</span>}
        </div>

        {props.visibleCount > 0
          ? (
              <div>
                {props.sections.map(section => (
                  <section key={section.id}>
                    {props.grouping !== 'none' && (
                      <div class="flex h-8 items-center gap-2 border-b border-white/[0.06] bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]">
                        <button
                          type="button"
                          class="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-[#d7d8dc]"
                          aria-expanded={!props.isSectionCollapsed(section)}
                          onClick={() => emit('toggleSection', section)}
                        >
                          <Icon
                            name="lucide:chevron-down"
                            class={['h-3 w-3 shrink-0 text-[#777a83] transition-transform', props.isSectionCollapsed(section) ? '-rotate-90' : '']}
                            aria-hidden="true"
                          />
                          <span class="truncate">{section.label}</span>
                          <span class="text-[#6f727b]">{section.projects.length}</span>
                        </button>
                      </div>
                    )}

                    {!props.isSectionCollapsed(section) && section.projects.map(project => (
                      <button
                        key={project.key}
                        type="button"
                        class="linear-row grid min-h-12 w-full items-center gap-0 px-4 py-2 text-left"
                        style={{ gridTemplateColumns: props.gridTemplate }}
                        onMouseenter={() => emit('prefetch', project.key)}
                        onClick={() => emit('open', project.key)}
                      >
                        <span class="min-w-0 pr-4">
                          <span class="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#e6e7ea]">
                            <Icon
                              name={`lucide:${getProjectAppearance(project.key).icon}`}
                              class="h-3.5 w-3.5 shrink-0"
                              style={{ color: getProjectAppearance(project.key).color }}
                              aria-hidden="true"
                            />
                            <span class="truncate">{project.name}</span>
                          </span>
                          <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">
                            {project.key}
                            {' '}
                            ·
                            {' '}
                            {project.spaceName}
                          </span>
                        </span>

                        {props.isFieldVisible('health') && (
                          <span>
                            <span class={['inline-flex rounded-full border px-2 py-0.5 text-[11px]', props.getHealthClass(project.health)]}>
                              {project.health}
                            </span>
                          </span>
                        )}
                        {props.isFieldVisible('priority') && <span class="truncate text-[12px] text-[#aeb0b7]">{project.priority}</span>}
                        {props.isFieldVisible('lead') && <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{project.lead}</span>}
                        {props.isFieldVisible('targetDate') && <span class="truncate text-[12px] text-[#8f9198]">{project.targetDate}</span>}

                        {props.isFieldVisible('issues') && (
                          <span class="pr-5">
                            <span class="flex items-center justify-between gap-2 text-[11px] text-[#8f9198]">
                              <span>
                                {project.completedCount}
                                /
                                {project.issueCount}
                              </span>
                              <span>
                                {project.progress}
                                %
                              </span>
                            </span>
                            <span class="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <span class={['block h-full rounded-full', props.getProgressBarClass(project.health)]} style={{ width: `${project.progress}%` }} />
                            </span>
                          </span>
                        )}

                        {props.isFieldVisible('status') && <span class="truncate text-[12px] text-[#aeb0b7]">{project.status}</span>}
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            )
          : (
              <div class="flex h-full min-h-80 items-center justify-center px-6 text-center">
                <div class="max-w-sm">
                  <p class="text-[13px] font-medium text-[#d7d8dc]">No projects found</p>
                  <p class="mt-1 text-[12px] text-[#777a83]">Projects will appear here when enabled teams have project-level work.</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
