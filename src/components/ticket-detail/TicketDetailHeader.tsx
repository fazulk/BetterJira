import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, nextTick, onUnmounted, ref, watch } from 'vue'
import ProjectIconPickerButton from '@/components/ProjectIconPickerButton'
import { useUpdateTicketTitle } from '@/composables/useUpdateTicketTitle'
import { breakpoints, colors } from '@/styles/tokens.stylex'
import { getStatusGroup } from '@/types/jira'

type ProjectDetailHealth = 'On track' | 'At risk' | 'Completed'
type ProjectHealthTone = 'risk' | 'completed' | 'track'

const datePartFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function formatDate(value: string | undefined): string | null {
  if (!value)
    return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return value
  return datePartFormatter.format(parsed)
}

function getProjectDetailHealthTone(health: ProjectDetailHealth): ProjectHealthTone {
  if (health === 'At risk')
    return 'risk'
  if (health === 'Completed')
    return 'completed'
  return 'track'
}

const styles = stylex.create({
  projectMargin: { marginBottom: '1.25rem' },
  noMargin: { marginBottom: 0 },
  titleStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  titleRow: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem' },
  iconButtonOffset: { marginTop: '0.125rem' },
  // Preserve the title's typography over the global form-control font reset.
  titleInput: {
    'minWidth': 0,
    'flex': '1',
    'resize': 'none',
    'overflow': 'hidden',
    'borderWidth': 0,
    'backgroundColor': 'transparent',
    'padding': 0,
    'fontSize': '28px !important',
    // eslint-disable-next-line @stylexjs/valid-styles -- The compiler supports !important; the numeric weight validator does not.
    'fontWeight': '600 !important',
    'lineHeight': '1.25 !important',
    'color': colors['--color-slate-100'],
    'outlineStyle': 'none',
    'appearance': 'none',
    '::placeholder': { color: colors['--color-slate-700'] },
  },
  error: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-300'] },
  parentRow: { marginTop: '0.75rem', display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  parentButton: { display: 'inline-flex', minWidth: 0, alignItems: 'center', gap: '0.375rem', borderRadius: '0.25rem', borderWidth: 0, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.25rem', paddingBlock: '0.125rem', textAlign: 'left', transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  parentIconWrap: { display: 'flex', width: '1rem', height: '1rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', color: colors['--color-cyan-400'] },
  parentIcon: { width: '1rem', height: '1rem' },
  parentKey: { flexShrink: 0, fontWeight: 500, color: colors['--color-slate-400'] },
  parentSummary: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: colors['--color-slate-200'] },
  progressPill: { display: 'inline-flex', height: '1.5rem', flexShrink: 0, alignItems: 'center', gap: '0.25rem', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '0.625rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  progressDot: { width: '0.5rem', height: '0.5rem', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(34, 211, 238, 0.5)' },
  grid: { display: 'grid', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)', fontSize: '0.75rem', lineHeight: '1rem', gridTemplateColumns: { [breakpoints.md]: 'repeat(3, minmax(0, 1fr))', [breakpoints.xl]: 'repeat(6, minmax(0, 1fr))' } },
  gridCell: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem', paddingBlock: '0.625rem', borderRightWidth: { [breakpoints.md]: 1 }, borderRightStyle: { [breakpoints.md]: 'solid' }, borderRightColor: { [breakpoints.md]: 'rgba(255, 255, 255, 0.06)' } },
  gridCellNoMdBottom: { borderBottomWidth: { [breakpoints.md]: 0 } },
  gridCellNoXlBottom: { borderBottomWidth: { [breakpoints.xl]: 0 } },
  gridCellXlRight: { borderRightWidth: { [breakpoints.xl]: 1 }, borderRightStyle: { [breakpoints.xl]: 'solid' }, borderRightColor: { [breakpoints.xl]: 'rgba(255, 255, 255, 0.06)' } },
  gridCellLast: { borderBottomWidth: 0, borderRightWidth: { [breakpoints.md]: 0 } },
  metricLabel: { margin: 0, fontSize: 11, color: colors['--color-slate-600'] },
  healthPill: { marginTop: '0.25rem', display: 'inline-flex', maxWidth: '100%', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.5rem', paddingBlock: '0.125rem', fontWeight: 500 },
  healthRisk: { borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.1)', color: colors['--color-rose-300'] },
  healthCompleted: { borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: colors['--color-emerald-300'] },
  healthTrack: { borderColor: 'rgba(14, 165, 233, 0.2)', backgroundColor: 'rgba(14, 165, 233, 0.1)', color: colors['--color-sky-300'] },
  metricValue: { marginTop: '0.25rem', marginBottom: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: colors['--color-slate-300'] },
  progressHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' },
  progressPercent: { fontWeight: 500, color: colors['--color-slate-300'] },
  progressTrack: { marginTop: '0.5rem', height: '0.375rem', overflow: 'hidden', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  progressFill: { height: '100%', borderRadius: '9999px', transitionProperty: 'all', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  progressWidth: (width: string) => ({ width }),
  progressRisk: { backgroundColor: 'rgba(251, 113, 133, 0.8)' },
  progressCompleted: { backgroundColor: 'rgba(52, 211, 153, 0.8)' },
  progressTrackTone: { backgroundColor: 'rgba(56, 189, 248, 0.8)' },
})

function healthStyle(tone: ProjectHealthTone) {
  if (tone === 'risk')
    return styles.healthRisk
  if (tone === 'completed')
    return styles.healthCompleted
  return styles.healthTrack
}

function progressStyle(tone: ProjectHealthTone) {
  if (tone === 'risk')
    return styles.progressRisk
  if (tone === 'completed')
    return styles.progressCompleted
  return styles.progressTrackTone
}

export default defineComponent({
  name: 'TicketDetailHeader',
  props: {
    childTickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    isProjectDetail: {
      type: Boolean,
      required: true,
    },
    ticket: {
      type: Object as PropType<JiraTicket>,
      required: true,
    },
  },
  emits: {
    prefetch: (key: string) => typeof key === 'string',
    select: (key: string) => typeof key === 'string',
  },
  setup(props, { emit, expose }) {
    const titleDraft = ref('')
    const titleError = ref<string | null>(null)
    const TITLE_SAVE_DEBOUNCE_MS = 3000
    const titleInputRef = ref<HTMLTextAreaElement | null>(null)
    const titleInputActive = ref(false)
    const titleDraftTicketKey = ref<string | null>(null)
    const titlePersistedValue = ref('')
    const titleSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
    const titleSaveInFlight = ref(false)
    const isSyncingTitleDraft = ref(false)

    const updateTitleMutation = useUpdateTicketTitle()

    const detailIssueParent = computed(() => {
      const parent = props.ticket.parent
      if (!parent || parent.issueType.toLowerCase().includes('epic'))
        return null
      return parent
    })

    const detailIssueParentRelationLabel = computed(() => {
      const parent = detailIssueParent.value
      if (!parent)
        return null

      const ticketIssueType = props.ticket.issueType.toLowerCase()
      const parentIssueType = parent.issueType.toLowerCase()
      if (ticketIssueType.includes('epic') && parentIssueType.includes('initiative'))
        return 'Epic of'

      return 'Sub-issue of'
    })

    const detailIssueParentProgressLabel = computed(() => {
      const parent = detailIssueParent.value
      if (!parent)
        return null

      const children = props.childTickets.filter(child => child.parent?.key === parent.key)
      const scopedChildren = children.length > 0 ? children : [props.ticket]
      const completedCount = scopedChildren.filter(child => getStatusGroup(child.statusCategory) === 'done').length
      return `${completedCount}/${scopedChildren.length}`
    })

    const projectCompletedIssueCount = computed(() => (
      props.childTickets.filter(child => getStatusGroup(child.statusCategory) === 'done').length
    ))
    const projectProgress = computed(() => (
      props.childTickets.length > 0
        ? Math.round((projectCompletedIssueCount.value / props.childTickets.length) * 100)
        : 0
    ))
    const projectDetailHealth = computed<ProjectDetailHealth>(() => {
      if (getStatusGroup(props.ticket.statusCategory) === 'done' || projectProgress.value === 100)
        return 'Completed'
      if (props.ticket.status.toLowerCase().includes('block') || projectProgress.value < 25)
        return 'At risk'
      return 'On track'
    })
    const projectTargetDateLabel = computed(() => formatDate(props.ticket.dueDate) ?? 'No target')
    const projectLeadLabel = computed(() => {
      const lead = props.ticket.assignee
      return lead && lead !== 'Unassigned' ? lead : 'Unassigned'
    })
    const projectPriorityLabel = computed(() => props.ticket.priority || 'No priority')
    const projectIssueProgressLabel = computed(() => `${projectCompletedIssueCount.value}/${props.childTickets.length}`)
    const projectHealthTone = computed(() => getProjectDetailHealthTone(projectDetailHealth.value))

    function clearTitleSaveTimer(): void {
      if (!titleSaveTimer.value)
        return
      clearTimeout(titleSaveTimer.value)
      titleSaveTimer.value = null
    }

    function isTitleDraftDirty(): boolean {
      return titleDraft.value.trim() !== titlePersistedValue.value
    }

    function resizeTitleInput(): void {
      nextTick(() => {
        const input = titleInputRef.value
        if (!input)
          return
        input.style.height = 'auto'
        input.style.height = `${input.scrollHeight}px`
      })
    }

    function syncTitleDraftFromTicket(nextTicket: JiraTicket | null): void {
      clearTitleSaveTimer()
      isSyncingTitleDraft.value = true
      titleDraft.value = nextTicket?.summary ?? ''
      titleDraftTicketKey.value = nextTicket?.key ?? null
      titlePersistedValue.value = nextTicket?.summary.trim() ?? ''
      titleError.value = null
      resizeTitleInput()
      nextTick(() => {
        isSyncingTitleDraft.value = false
      })
    }

    function scheduleTitleAutosave(): void {
      clearTitleSaveTimer()
      titleSaveTimer.value = setTimeout(() => {
        void flushTitleAutosave()
      }, TITLE_SAVE_DEBOUNCE_MS)
    }

    function focusTitleInput(): void {
      titleInputActive.value = true
      nextTick(() => {
        titleInputRef.value?.focus()
      })
    }

    function blurTitleInput(): void {
      titleInputRef.value?.blur()
      titleInputActive.value = false
      void flushTitleAutosave()
    }

    function handleTitleFocusIn(): void {
      titleInputActive.value = true
    }

    function handleTitleFocusOut(): void {
      titleInputActive.value = false
      void flushTitleAutosave()
    }

    function handleTitleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        blurTitleInput()
      }
    }

    async function persistTitleDraft(key: string, title: string): Promise<void> {
      await updateTitleMutation.mutateAsync({ key, title })
    }

    async function flushTitleAutosave(): Promise<void> {
      const key = titleDraftTicketKey.value
      if (!key || titleSaveInFlight.value)
        return

      const nextTitle = titleDraft.value.trim()
      if (!nextTitle) {
        clearTitleSaveTimer()
        titleError.value = 'Title cannot be empty.'
        return
      }

      if (nextTitle === titlePersistedValue.value) {
        clearTitleSaveTimer()
        titleError.value = null
        return
      }

      clearTitleSaveTimer()
      titleSaveInFlight.value = true
      titleError.value = null

      try {
        await persistTitleDraft(key, nextTitle)
        if (titleDraftTicketKey.value !== key)
          return

        titlePersistedValue.value = nextTitle
        if (titleDraft.value.trim() !== nextTitle)
          scheduleTitleAutosave()
      }
      catch (err) {
        if (titleDraftTicketKey.value !== key)
          return
        titleError.value = err instanceof Error ? err.message : 'Failed to update title.'
      }
      finally {
        titleSaveInFlight.value = false
      }
    }

    watch(() => props.ticket, (nextTicket) => {
      const nextTicketKey = nextTicket?.key ?? null
      const titleTicketChanged = nextTicketKey !== titleDraftTicketKey.value
      if (titleTicketChanged) {
        void flushTitleAutosave()
        syncTitleDraftFromTicket(nextTicket)
      }
      else if (!titleInputActive.value && !isTitleDraftDirty()) {
        syncTitleDraftFromTicket(nextTicket)
      }
    }, { immediate: true })

    watch(titleDraft, () => {
      resizeTitleInput()
      if (isSyncingTitleDraft.value)
        return
      if (!titleDraftTicketKey.value)
        return

      const nextTitle = titleDraft.value.trim()
      if (!nextTitle) {
        clearTitleSaveTimer()
        titleError.value = 'Title cannot be empty.'
        return
      }

      titleError.value = null
      if (nextTitle === titlePersistedValue.value) {
        clearTitleSaveTimer()
        return
      }

      scheduleTitleAutosave()
    })

    onUnmounted(() => {
      clearTitleSaveTimer()
      void flushTitleAutosave()
    })

    expose({
      focusTitleInput,
    })

    return () => (
      <header>
        <div {...stylex.attrs(props.isProjectDetail ? styles.projectMargin : styles.noMargin)}>
          <div {...stylex.attrs(styles.titleStack)}>
            <div {...stylex.attrs(styles.titleRow)}>
              {props.isProjectDetail && (
                <div {...stylex.attrs(styles.iconButtonOffset)}>
                  <ProjectIconPickerButton projectKey={props.ticket.key} />
                </div>
              )}
              <textarea
                id="detail-title"
                ref={titleInputRef}
                v-model={titleDraft.value}
                {...stylex.attrs(styles.titleInput)}
                maxlength={255}
                rows={1}
                placeholder="Issue title"
                spellcheck={false}
                autocorrect="off"
                autocapitalize="off"
                onFocusin={handleTitleFocusIn}
                onFocusout={handleTitleFocusOut}
                onKeydown={handleTitleKeydown}
              />
            </div>
            {titleError.value && <span {...stylex.attrs(styles.error)}>{titleError.value}</span>}
          </div>
          {detailIssueParent.value && (
            <div {...stylex.attrs(styles.parentRow)}>
              <span>{detailIssueParentRelationLabel.value}</span>
              <button
                type="button"
                {...stylex.attrs(styles.parentButton)}
                onClick={() => emit('select', detailIssueParent.value!.key)}
                onMouseenter={() => emit('prefetch', detailIssueParent.value!.key)}
              >
                <span {...stylex.attrs(styles.parentIconWrap)} aria-hidden="true">
                  <svg {...stylex.attrs(styles.parentIcon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7">
                    <circle cx="8" cy="8" r="5.2" />
                    <path stroke-linecap="round" d="M5.7 10.3 10.3 5.7" />
                  </svg>
                </span>
                <span {...stylex.attrs(styles.parentKey)}>{detailIssueParent.value.key}</span>
                <span {...stylex.attrs(styles.parentSummary)}>{detailIssueParent.value.summary}</span>
              </button>
              {detailIssueParentProgressLabel.value && (
                <span {...stylex.attrs(styles.progressPill)}>
                  <span {...stylex.attrs(styles.progressDot)} />
                  {detailIssueParentProgressLabel.value}
                </span>
              )}
            </div>
          )}
        </div>

        {props.isProjectDetail && (
          <div {...stylex.attrs(styles.grid)}>
            <div {...stylex.attrs(styles.gridCell, styles.gridCellNoXlBottom)}>
              <p {...stylex.attrs(styles.metricLabel)}>Health</p>
              <span {...stylex.attrs(styles.healthPill, healthStyle(projectHealthTone.value))}>
                {projectDetailHealth.value}
              </span>
            </div>
            <div {...stylex.attrs(styles.gridCell, styles.gridCellNoXlBottom)}>
              <p {...stylex.attrs(styles.metricLabel)}>Lead</p>
              <p {...stylex.attrs(styles.metricValue)}>{projectLeadLabel.value}</p>
            </div>
            <div {...stylex.attrs(styles.gridCell, styles.gridCellNoXlBottom, styles.gridCellXlRight)}>
              <p {...stylex.attrs(styles.metricLabel)}>Priority</p>
              <p {...stylex.attrs(styles.metricValue)}>{projectPriorityLabel.value}</p>
            </div>
            <div {...stylex.attrs(styles.gridCell, styles.gridCellNoMdBottom)}>
              <p {...stylex.attrs(styles.metricLabel)}>Target date</p>
              <p {...stylex.attrs(styles.metricValue)}>{projectTargetDateLabel.value}</p>
            </div>
            <div {...stylex.attrs(styles.gridCell, styles.gridCellNoMdBottom)}>
              <p {...stylex.attrs(styles.metricLabel)}>Issues</p>
              <p {...stylex.attrs(styles.metricValue)}>{projectIssueProgressLabel.value}</p>
            </div>
            <div {...stylex.attrs(styles.gridCell, styles.gridCellLast)}>
              <div {...stylex.attrs(styles.progressHeader)}>
                <p {...stylex.attrs(styles.metricLabel)}>Progress</p>
                <span {...stylex.attrs(styles.progressPercent)}>
                  {projectProgress.value}
                  %
                </span>
              </div>
              <div {...stylex.attrs(styles.progressTrack)}>
                <div
                  {...stylex.attrs(styles.progressFill, progressStyle(projectHealthTone.value), styles.progressWidth(`${projectProgress.value}%`))}
                />
              </div>
            </div>
          </div>
        )}
      </header>
    )
  },
})
