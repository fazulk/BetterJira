import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import type { ProjectAppearance } from '~/shared/settings'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent } from 'vue'
import { Icon } from '#components'
import LabelPill from '@/components/LabelPill'
import StatusIcon from '@/components/StatusIcon'
import { isEpicIssueType } from '@/features/ticket-list/helpers'
import { uiStyles } from '@/styles/shared'
import { colors } from '@/styles/tokens.stylex'
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from '~/shared/settings'

type PriorityTone = 'highest' | 'high' | 'medium' | 'low' | 'lowest'

const priorityTones: Record<string, PriorityTone> = {
  highest: 'highest',
  high: 'high',
  medium: 'medium',
  low: 'low',
  lowest: 'lowest',
}

const MAX_VISIBLE_LABELS = 3

const styles = stylex.create({
  row: { position: 'relative', display: 'grid', minHeight: '3rem', width: '100%', cursor: 'default', alignItems: 'center', gap: '0.5rem', paddingInline: '1rem', paddingBlock: '0.625rem', textAlign: 'left', color: '#d6d7dc', transitionProperty: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  rowSelected: { color: '#f0f1f4' },
  rowGrid: (gridTemplateColumns: string) => ({ gridTemplateColumns: { default: gridTemplateColumns } }),
  issueKey: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: '#8f9198' },
  statusCell: { display: 'flex', height: '1rem', width: '1rem', alignItems: 'center', justifyContent: 'center' },
  summaryCell: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  summary: { fontWeight: 500 },
  projectChip: { display: { 'default': 'none', '@media (min-width: 64rem)': 'flex' }, minWidth: 0, alignItems: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '0.375rem', paddingBlock: '0.125rem', fontSize: 11, color: '#aeb0b7' },
  projectIcon: (color: string) => ({ width: '0.75rem', height: '0.75rem', flexShrink: 0, color }),
  projectName: { maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  labelsCell: { display: { 'default': 'none', '@media (min-width: 48rem)': 'flex' }, maxWidth: '28rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' },
  hiddenLabelCount: { display: 'inline-flex', alignItems: 'center', borderRadius: '0.75rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, fontWeight: 500, lineHeight: 1.25, color: colors['--color-slate-400'] },
  priorityCell: { display: { 'default': 'none', '@media (min-width: 64rem)': 'flex' }, minWidth: 0, alignItems: 'center', gap: '0.25rem', fontSize: 12, color: '#8f9198' },
  priorityMarker: { fontSize: 13 },
  priorityHighest: { color: '#f26d78' },
  priorityHigh: { color: '#e59356' },
  priorityMedium: { color: '#d6a84b' },
  priorityLow: { color: '#62a8d8' },
  priorityLowest: { color: '#8f9198' },
  priorityLabel: { maxWidth: '6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  storyPoints: { display: { 'default': 'none', '@media (min-width: 64rem)': 'flex' }, minWidth: '34px', justifyContent: 'flex-end', fontSize: 12, color: '#8f9198' },
  metaCell: { display: 'flex', minWidth: '94px', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', fontSize: 12, color: '#8f9198' },
  assigneeAvatar: { display: 'flex', height: '1.25rem', width: '1.25rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.08)', fontSize: 9, color: '#c7c9d0' },
  responsiveDate: { display: { 'default': 'none', '@media (min-width: 40rem)': 'inline' } },
})

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
    const priorityTone = computed<PriorityTone>(() => {
      const normalized = props.ticket.priority.trim().toLowerCase()
      return priorityTones[normalized] ?? 'lowest'
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
        {...stylex.attrs(styles.row, styles.rowGrid(rowGridTemplate.value), props.selected ? styles.rowSelected : null, uiStyles.row, props.selected ? uiStyles.activeRow : null)}
        onMouseenter={() => emit('prefetch', rowIssueKey.value)}
        onClick={emitSelect}
        onKeydown={handleKeydown}
      >
        {props.showId !== false && <span {...stylex.attrs(styles.issueKey)}>{rowIssueKey.value}</span>}

        {props.showStatus !== false && (
          <span {...stylex.attrs(styles.statusCell)}>
            <StatusIcon status={props.ticket.status} statusCategory={props.ticket.statusCategory} size={16} />
          </span>
        )}

        <span {...stylex.attrs(styles.summaryCell)}>
          <span {...stylex.attrs(styles.summary)}>{rowPrimarySummary.value}</span>
        </span>

        {projectChip.value && (
          <span
            {...stylex.attrs(styles.projectChip)}
            title={projectChip.value.name}
          >
            <Icon
              name={`lucide:${projectChip.value.icon}`}
              {...stylex.attrs(styles.projectIcon(projectChip.value.color))}
              aria-hidden="true"
            />
            <span {...stylex.attrs(styles.projectName)}>{projectChip.value.name}</span>
          </span>
        )}

        {props.showLabels !== false && visibleLabels.value.length > 0 && (
          <span {...stylex.attrs(styles.labelsCell)}>
            {displayedLabels.value.map(label => <LabelPill key={label} label={label} dense showDot />)}
            {hiddenLabelCount.value > 0 && (
              <span
                {...stylex.attrs(styles.hiddenLabelCount)}
                title={hiddenLabelSummary.value}
              >
                +
                {hiddenLabelCount.value}
              </span>
            )}
          </span>
        )}

        {props.showPriority !== false && (
          <span {...stylex.attrs(styles.priorityCell)}>
            <span
              {...stylex.attrs(
                styles.priorityMarker,
                priorityTone.value === 'highest' ? styles.priorityHighest : null,
                priorityTone.value === 'high' ? styles.priorityHigh : null,
                priorityTone.value === 'medium' ? styles.priorityMedium : null,
                priorityTone.value === 'low' ? styles.priorityLow : null,
                priorityTone.value === 'lowest' ? styles.priorityLowest : null,
              )}
            >
              ▮
            </span>
            <span {...stylex.attrs(styles.priorityLabel)}>{props.ticket.priority || 'No priority'}</span>
          </span>
        )}

        {props.showStoryPoints === true && (
          <span {...stylex.attrs(styles.storyPoints)}>
            {props.ticket.storyPoints !== undefined ? `${props.ticket.storyPoints} pts` : '–'}
          </span>
        )}

        {(props.showAssignee !== false || props.showCreated !== false || props.showUpdated === true || props.showDue === true) && (
          <span {...stylex.attrs(styles.metaCell)}>
            {props.showAssignee !== false && initials.value && (
              <span {...stylex.attrs(styles.assigneeAvatar)}>{initials.value}</span>
            )}
            {props.showCreated !== false && createdLabel.value && <span {...stylex.attrs(styles.responsiveDate)}>{createdLabel.value}</span>}
            {props.showUpdated === true && updatedLabel.value && <span {...stylex.attrs(styles.responsiveDate)}>{updatedLabel.value}</span>}
            {props.showDue === true && dueLabel.value && (
              <span {...stylex.attrs(styles.responsiveDate)}>
                {`Due ${dueLabel.value}`}
              </span>
            )}
          </span>
        )}
      </div>
    )
  },
})
