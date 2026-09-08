import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import type { ProjectAppearance } from '~/shared/settings'
import { computed, defineComponent } from 'vue'
import { Icon } from '#components'
import LabelPill from '@/components/LabelPill'
import StatusIcon from '@/components/StatusIcon'
import { isEpicIssueType } from '@/features/ticket-list/helpers'
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from '~/shared/settings'

const priorityClasses: Record<string, string> = {
  highest: 'text-[#f26d78]',
  high: 'text-[#e59356]',
  medium: 'text-[#d6a84b]',
  low: 'text-[#62a8d8]',
  lowest: 'text-[#8f9198]',
}

const MAX_VISIBLE_LABELS = 3

function formatDate(value: string | undefined): string {
  if (!value)
    return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return ''

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default defineComponent({
  name: 'IssueRow',
  props: {
    ticket: {
      type: Object as PropType<JiraTicket>,
      required: true,
    },
    selected: {
      type: Boolean,
      required: true,
    },
    checked: {
      type: Boolean,
      required: true,
    },
    showId: {
      type: Boolean,
    },
    showStatus: {
      type: Boolean,
    },
    showLabels: {
      type: Boolean,
    },
    showPriority: {
      type: Boolean,
    },
    showStoryPoints: {
      type: Boolean,
    },
    showAssignee: {
      type: Boolean,
    },
    showCreated: {
      type: Boolean,
    },
    showUpdated: {
      type: Boolean,
    },
    showDue: {
      type: Boolean,
    },
    showParent: {
      type: Boolean,
    },
    projectAppearance: {
      type: Object as PropType<ProjectAppearance | null | undefined>,
      default: undefined,
    },
  },
  emits: {
    select: (key: string) => typeof key === 'string',
    prefetch: (key: string) => typeof key === 'string',
    toggleCheck: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    const priorityClass = computed(() => {
      const normalized = props.ticket.priority.trim().toLowerCase()
      return priorityClasses[normalized] ?? 'text-[#8f9198]'
    })

    const initials = computed(() => {
      const name = props.ticket.assignee
      if (!name || name === 'Unassigned')
        return ''
      const parts = name.split(/\s+/).filter(Boolean)
      if (parts.length > 1) {
        return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    })

    const createdLabel = computed(() => formatDate(props.ticket.createdAt))
    const updatedLabel = computed(() => formatDate(props.ticket.updatedAt))
    const dueLabel = computed(() => formatDate(props.ticket.dueDate))
    const visibleLabels = computed(() => {
      const labels: string[] = []
      const seen = new Set<string>()
      for (const label of props.ticket.labels ?? []) {
        const trimmed = label.trim()
        if (!trimmed || seen.has(trimmed))
          continue
        seen.add(trimmed)
        labels.push(trimmed)
      }
      return labels
    })
    const displayedLabels = computed(() => visibleLabels.value.slice(0, MAX_VISIBLE_LABELS))
    const hiddenLabelCount = computed(() => Math.max(0, visibleLabels.value.length - displayedLabels.value.length))
    const hiddenLabelSummary = computed(() => visibleLabels.value.slice(MAX_VISIBLE_LABELS).join(', '))
    const rowIssueKey = computed(() => props.ticket.key)
    const rowPrimarySummary = computed(() => props.ticket.summary)
    const projectChip = computed(() => {
      const parent = props.ticket.parent
      if (props.showParent === false || !parent || !isEpicIssueType(parent.issueType)) {
        return null
      }

      return {
        name: parent.summary,
        icon: props.projectAppearance?.icon ?? DEFAULT_PROJECT_ICON,
        color: props.projectAppearance?.color ?? DEFAULT_PROJECT_COLOR,
      }
    })

    const rowGridTemplate = computed(() => {
      const columns: string[] = []
      if (props.showId !== false)
        columns.push('70px')
      if (props.showStatus !== false)
        columns.push('18px')
      columns.push('minmax(0,1fr)')
      if (projectChip.value)
        columns.push('auto')
      if (props.showLabels !== false && visibleLabels.value.length > 0)
        columns.push('auto')
      if (props.showPriority !== false)
        columns.push('auto')
      if (props.showStoryPoints === true)
        columns.push('auto')
      if (
        props.showAssignee !== false
        || props.showCreated !== false
        || props.showUpdated === true
        || props.showDue === true
      ) {
        columns.push('auto')
      }
      return columns.join(' ')
    })

    function emitSelect(): void {
      emit('select', rowIssueKey.value)
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        emitSelect()
      }
    }

    return () => (
      <div
        role="button"
        tabindex="0"
        class={['linear-row group relative grid min-h-12 w-full cursor-default items-center gap-2 px-4 py-2.5 text-left transition', props.selected ? 'linear-row-active text-[#f0f1f4]' : 'text-[#d6d7dc]']}
        style={{ gridTemplateColumns: rowGridTemplate.value }}
        onMouseenter={() => emit('prefetch', rowIssueKey.value)}
        onClick={emitSelect}
        onKeydown={handleKeydown}
      >
        {props.showId !== false && <span class="truncate font-medium text-[#8f9198]">{rowIssueKey.value}</span>}

        {props.showStatus !== false && (
          <span class="flex h-4 w-4 items-center justify-center">
            <StatusIcon status={props.ticket.status} statusCategory={props.ticket.statusCategory} size={16} />
          </span>
        )}

        <span class="min-w-0 truncate">
          <span class="font-medium">{rowPrimarySummary.value}</span>
        </span>

        {projectChip.value && (
          <span
            class="hidden min-w-0 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-1.5 py-0.5 text-[11px] text-[#aeb0b7] lg:flex"
            title={projectChip.value.name}
          >
            <Icon
              name={`lucide:${projectChip.value.icon}`}
              class="h-3 w-3 shrink-0"
              style={{ color: projectChip.value.color }}
              aria-hidden="true"
            />
            <span class="max-w-40 truncate">{projectChip.value.name}</span>
          </span>
        )}

        {props.showLabels !== false && visibleLabels.value.length > 0 && (
          <span class="hidden max-w-[28rem] flex-wrap items-center justify-end gap-1 md:flex">
            {displayedLabels.value.map(label => <LabelPill key={label} label={label} dense showDot />)}
            {hiddenLabelCount.value > 0 && (
              <span
                class="inline-flex items-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[11px] font-medium leading-[1.25] text-slate-400"
                title={hiddenLabelSummary.value}
              >
                +
                {hiddenLabelCount.value}
              </span>
            )}
          </span>
        )}

        {props.showPriority !== false && (
          <span class="hidden min-w-0 items-center gap-1 text-[12px] text-[#8f9198] lg:flex">
            <span class={['text-[13px]', priorityClass.value]}>▮</span>
            <span class="max-w-24 truncate">{props.ticket.priority || 'No priority'}</span>
          </span>
        )}

        {props.showStoryPoints === true && (
          <span class="hidden min-w-[34px] justify-end text-[12px] text-[#8f9198] lg:flex">
            {props.ticket.storyPoints !== undefined ? `${props.ticket.storyPoints} pts` : '–'}
          </span>
        )}

        {(props.showAssignee !== false || props.showCreated !== false || props.showUpdated === true || props.showDue === true) && (
          <span class="flex min-w-[94px] items-center justify-end gap-2 text-[12px] text-[#8f9198]">
            {props.showAssignee !== false && initials.value && (
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-[#c7c9d0]">{initials.value}</span>
            )}
            {props.showCreated !== false && createdLabel.value && <span class="hidden sm:inline">{createdLabel.value}</span>}
            {props.showUpdated === true && updatedLabel.value && <span class="hidden sm:inline">{updatedLabel.value}</span>}
            {props.showDue === true && dueLabel.value && (
              <span class="hidden sm:inline">
                {`Due ${dueLabel.value}`}
              </span>
            )}
          </span>
        )}
      </div>
    )
  },
})
