import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import type { TicketDevStatusPullRequestStatus } from '~/shared/devStatus'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, nextTick, reactive, ref, vShow, watch, withDirectives } from 'vue'
import { Icon } from '#components'
import LabelPill from '@/components/LabelPill'
import TicketDetailPropertiesSection from '@/components/ticket-detail/TicketDetailPropertiesSection'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { useTicketDevStatus } from '@/composables/useTicketDevStatus'
import { useUpdateTicketLabels } from '@/composables/useUpdateTicketLabels'
import { uiStyles } from '@/styles/shared'
import { breakpoints, colors } from '@/styles/tokens.stylex'
import { buildJiraIssueUrl } from '@/utils/jiraIssueUrl'

interface PropertiesSectionExpose {
  startEditingAssignee: () => void
  startEditingPriority: () => void
  startEditingStatus: () => void
}

const PULL_REQUEST_STATUS_TONES: Record<TicketDevStatusPullRequestStatus, TicketDevStatusPullRequestStatus> = {
  OPEN: 'OPEN',
  MERGED: 'MERGED',
  DECLINED: 'DECLINED',
  DRAFT: 'DRAFT',
  UNKNOWN: 'UNKNOWN',
}

const styles = stylex.create({
  aside: { minHeight: 0, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: colors['--color-issue-detail-bg'], paddingInline: '1rem', paddingBlock: '1rem', [breakpoints.lg]: { overflowY: 'auto', borderTopWidth: 0 } },
  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  quickActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' },
  iconButton: { display: 'inline-flex', width: '1.75rem', height: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.035)', ':hover': 'rgba(255, 255, 255, 0.06)' }, color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  icon: { width: '0.875rem', height: '0.875rem' },
  successIcon: { color: colors['--color-emerald-400'] },
  ticketKey: { marginLeft: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-500'] },
  section: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '1rem', transitionProperty: 'padding', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  sectionExpanded: { paddingBlock: '1rem' },
  sectionCollapsed: { paddingBlock: '0.75rem' },
  sectionButton: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.375rem', borderWidth: 0, backgroundColor: 'transparent', padding: 0, fontSize: '0.875rem', lineHeight: '1.25rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  sectionButtonExpanded: { marginBottom: '0.75rem' },
  chevron: { fontSize: 10, color: colors['--color-slate-600'], transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  chevronCollapsed: { transform: 'rotate(-90deg)' },
  contentStack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  compactStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  editStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  labelEditor: { display: 'flex', minHeight: '2.25rem', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', paddingInline: '0.5rem', paddingBlock: '0.375rem' },
  draftLabel: { display: 'inline-flex', maxWidth: '100%', alignItems: 'center', gap: '0.25rem', borderRadius: '0.75rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.04)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, fontWeight: 500, color: colors['--color-slate-200'] },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  removeLabel: { borderWidth: 0, backgroundColor: 'transparent', padding: 0, color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  labelInput: { 'minWidth': '6rem', 'flex': '1', 'borderWidth': 0, 'backgroundColor': 'transparent', 'fontSize': '0.75rem', 'lineHeight': '1rem', 'color': colors['--color-slate-200'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  actionRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem' },
  saveButton: { borderRadius: '0.375rem', borderWidth: 0, backgroundColor: colors['--color-accent-indigo'], paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, fontWeight: 500, color: colors['--color-white'], cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.6 } },
  cancelButton: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, color: colors['--color-slate-400'], cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.6 } },
  error: { fontSize: 11, color: colors['--color-rose-300'] },
  labelsList: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' },
  empty: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-600'] },
  addLabelButton: { display: 'inline-flex', width: '1.75rem', height: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', borderWidth: 0, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, fontSize: '0.875rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] }, transitionProperty: 'color, background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.4 } },
  rowLink: { display: 'flex', width: '100%', minWidth: 0, alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', borderWidth: 0, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.25rem', paddingBlock: '0.375rem', textAlign: 'left', color: colors['--color-slate-500'], transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  rowLinkHoverText: { color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] } },
  rowIcon: { display: 'flex', width: '1.25rem', height: '1.25rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  rowIconColor: (color: string) => ({ color }),
  projectText: { minWidth: 0, flex: '1' },
  projectName: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  devUnavailable: { display: 'flex', alignItems: 'center', gap: '0.5rem', paddingInline: '0.25rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  retry: { borderWidth: 0, backgroundColor: 'transparent', padding: 0, fontWeight: 500, color: colors['--color-slate-300'], textUnderlineOffset: '2px', transitionProperty: 'text-decoration-line', transitionDuration: '150ms', textDecorationLine: { 'default': 'none', ':hover': 'underline' } },
  prLink: { display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: '0.5rem', borderRadius: '0.375rem', paddingInline: '0.25rem', paddingBlock: '0.375rem', textDecorationLine: 'none', backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, transitionProperty: 'background-color', transitionDuration: '150ms' },
  prContent: { minWidth: 0, flex: '1', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  prName: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  prBranch: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: colors['--color-slate-500'] },
  statusPill: { marginTop: '0.125rem', display: 'inline-flex', flexShrink: 0, alignItems: 'center', borderRadius: '0.25rem', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.375rem', paddingBlock: '0.125rem', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' },
  prOpen: { borderColor: 'rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: colors['--color-sky-300'] },
  prMerged: { borderColor: 'rgba(192, 132, 252, 0.3)', backgroundColor: 'rgba(192, 132, 252, 0.1)', color: colors['--color-purple-300'] },
  prDeclined: { borderColor: 'rgba(251, 113, 133, 0.3)', backgroundColor: 'rgba(251, 113, 133, 0.1)', color: colors['--color-rose-300'] },
  prNeutral: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: colors['--color-slate-400'] },
  jiraTypeRow: { display: 'flex', alignItems: 'center' },
  jiraTypePill: { display: 'inline-flex', maxWidth: '100%', justifySelf: 'flex-start', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-400'] },
  jiraLink: { display: 'inline-flex', height: '1.75rem', alignItems: 'center', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.625rem', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, textDecorationLine: 'none', transitionProperty: 'color, background-color', transitionDuration: '150ms' },
  peopleRow: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', paddingInline: '0.125rem' },
  peopleLabel: { width: '9rem', flexShrink: 0, paddingTop: '0.125rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  peopleValue: { minWidth: 0, fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-300'] },
})

function pullRequestStatusStyle(status: TicketDevStatusPullRequestStatus) {
  if (status === 'OPEN')
    return styles.prOpen
  if (status === 'MERGED')
    return styles.prMerged
  if (status === 'DECLINED')
    return styles.prDeclined
  return styles.prNeutral
}

function normalizeLabels(labels: string[]): string[] {
  const nextLabels: string[] = []
  const seen = new Set<string>()

  for (const label of labels) {
    const trimmed = label.trim()
    const normalized = trimmed.toLowerCase()
    if (!trimmed || seen.has(normalized))
      continue

    seen.add(normalized)
    nextLabels.push(trimmed)
  }

  return nextLabels
}

function labelsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length)
    return false

  return left.every((label, index) => label === right[index])
}

export default defineComponent({
  name: 'TicketDetailSidebar',
  props: {
    isLocalTicket: {
      type: Boolean,
      required: true,
    },
    isProjectDetail: {
      type: Boolean,
      required: true,
    },
    jiraDataEnabled: {
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
    const { jiraConnection } = useSpaceSettings()
    const { getProjectAppearance } = useProjectAppearances()

    const copiedKey = ref(false)
    const copiedUrl = ref(false)
    const propertiesRef = ref<PropertiesSectionExpose | null>(null)
    const collapsedSections = reactive({
      properties: false,
      labels: false,
      project: false,
      development: false,
      jira: false,
    })

    const devStatusTicketKey = computed(() => (
      !props.isLocalTicket && props.jiraDataEnabled ? props.ticket.key : null
    ))
    const { data: devStatus, isError: devStatusFailed, refetch: refetchDevStatus } = useTicketDevStatus(devStatusTicketKey)
    const devStatusPullRequests = computed(() => devStatus.value?.pullRequests ?? [])
    const devStatusUnavailable = computed(() => devStatusFailed.value && devStatusPullRequests.value.length === 0)

    const jiraUrl = computed(() => buildJiraIssueUrl(jiraConnection.value.baseUrl, props.ticket.key))
    const detailJiraTypeLabel = computed(() => (
      !props.isLocalTicket && props.ticket.issueType ? props.ticket.issueType : null
    ))
    const detailTestedBy = computed(() => {
      const name = props.ticket.testedBy?.trim()
      return name || null
    })
    const detailApprovers = computed(() => {
      const names = (props.ticket.approvers ?? [])
        .map(name => name.trim())
        .filter(Boolean)
      return names.length ? names : null
    })
    const detailApprovedToProductionBy = computed(() => {
      const name = props.ticket.approvedToProductionBy?.trim()
      return name || null
    })
    const hasWorkflowPeople = computed(() => Boolean(
      detailTestedBy.value
      || detailApprovers.value
      || detailApprovedToProductionBy.value,
    ))
    const detailProjectParent = computed(() => {
      const parent = props.ticket.parent
      if (!parent || !parent.issueType.toLowerCase().includes('epic'))
        return null
      return parent
    })
    const detailProjectParentLabel = computed(() => detailProjectParent.value?.summary ?? '')
    const detailLabels = computed(() => normalizeLabels(props.ticket.labels ?? []))
    const updateTicketLabelsMutation = useUpdateTicketLabels()
    const isEditingLabels = ref(false)
    const labelsDraft = ref<string[]>([])
    const labelDraft = ref('')
    const labelError = ref('')
    const labelInputRef = ref<HTMLInputElement | null>(null)
    const canEditLabels = computed(() => props.isLocalTicket || props.jiraDataEnabled)
    const anyLabelsPending = computed(() => updateTicketLabelsMutation.isPending.value)

    function toggleSection(section: keyof typeof collapsedSections): void {
      collapsedSections[section] = !collapsedSections[section]
    }

    async function copyJiraUrl(): Promise<void> {
      const currentJiraUrl = jiraUrl.value
      if (!currentJiraUrl)
        return

      await navigator.clipboard.writeText(currentJiraUrl)
      copiedUrl.value = true
      setTimeout(() => {
        copiedUrl.value = false
      }, 1500)
    }

    async function copyTicketKey(): Promise<void> {
      await navigator.clipboard.writeText(props.ticket.key)
      copiedKey.value = true
      setTimeout(() => {
        copiedKey.value = false
      }, 1500)
    }

    function startEditingLabels(): void {
      if (!canEditLabels.value)
        return

      labelsDraft.value = [...detailLabels.value]
      labelDraft.value = ''
      labelError.value = ''
      isEditingLabels.value = true
      nextTick(() => labelInputRef.value?.focus())
    }

    function cancelEditingLabels(): void {
      isEditingLabels.value = false
      labelsDraft.value = []
      labelDraft.value = ''
      labelError.value = ''
    }

    function addLabelDraft(): void {
      const label = labelDraft.value.trim()
      if (!label)
        return

      labelsDraft.value = normalizeLabels([...labelsDraft.value, label])
      labelDraft.value = ''
      labelError.value = ''
    }

    function removeLabelDraft(labelToRemove: string): void {
      const normalizedLabelToRemove = labelToRemove.toLowerCase()
      labelsDraft.value = labelsDraft.value.filter(label => label.toLowerCase() !== normalizedLabelToRemove)
    }

    function handleLabelInputKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault()
        addLabelDraft()
        return
      }

      if (event.key === 'Backspace' && !labelDraft.value && labelsDraft.value.length > 0)
        labelsDraft.value = labelsDraft.value.slice(0, -1)
    }

    async function saveLabels(): Promise<void> {
      if (!canEditLabels.value || anyLabelsPending.value)
        return

      addLabelDraft()
      const nextLabels = normalizeLabels(labelsDraft.value)
      labelsDraft.value = nextLabels

      if (labelsEqual(nextLabels, detailLabels.value)) {
        cancelEditingLabels()
        return
      }

      try {
        await updateTicketLabelsMutation.mutateAsync({ key: props.ticket.key, labels: nextLabels })
        isEditingLabels.value = false
        labelError.value = ''
      }
      catch (error) {
        labelError.value = error instanceof Error ? error.message : 'Failed to update labels.'
      }
    }

    watch(() => props.ticket.key, () => {
      cancelEditingLabels()
    })

    function startEditingAssignee() {
      return propertiesRef.value?.startEditingAssignee()
    }

    function startEditingPriority() {
      return propertiesRef.value?.startEditingPriority()
    }

    function startEditingStatus() {
      return propertiesRef.value?.startEditingStatus()
    }

    expose({
      startEditingAssignee,
      startEditingPriority,
      startEditingStatus,
    })

    return () => (
      <aside {...stylex.attrs(styles.aside, uiStyles.stableScrollbar)}>
        <div {...stylex.attrs(styles.stack)}>
          {!props.isLocalTicket && (
            <div {...stylex.attrs(styles.quickActions)}>
              <button
                type="button"
                {...stylex.attrs(styles.iconButton)}
                aria-label={`Copy Jira link for ${props.ticket.key}`}
                title="Copy Jira link"
                disabled={!jiraUrl.value}
                onClick={() => void copyJiraUrl()}
              >
                {!copiedUrl.value
                  ? (
                      <svg {...stylex.attrs(styles.icon)} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                      </svg>
                    )
                  : (
                      <svg {...stylex.attrs(styles.icon, styles.successIcon)} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
              </button>
              <button
                type="button"
                {...stylex.attrs(styles.iconButton)}
                aria-label={`Copy issue ID ${props.ticket.key}`}
                title="Copy issue ID"
                onClick={() => void copyTicketKey()}
              >
                {!copiedKey.value
                  ? (
                      <svg {...stylex.attrs(styles.icon)} fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
                        <path stroke-linecap="round" d="M8 10h4.5M8 14h8" />
                        <circle cx="16.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
                      </svg>
                    )
                  : (
                      <svg {...stylex.attrs(styles.icon, styles.successIcon)} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
              </button>
              <span {...stylex.attrs(styles.ticketKey)}>{props.ticket.key}</span>
            </div>
          )}

          <TicketDetailPropertiesSection
            ref={propertiesRef}
            collapsed={collapsedSections.properties}
            isLocalTicket={props.isLocalTicket}
            jiraDataEnabled={props.jiraDataEnabled}
            ticket={props.ticket}
            ticketKey={props.ticket.key}
            onToggle={() => toggleSection('properties')}
          />

          <section {...stylex.attrs(styles.section, collapsedSections.labels ? styles.sectionCollapsed : styles.sectionExpanded)}>
            <button type="button" {...stylex.attrs(styles.sectionButton, collapsedSections.labels ? null : styles.sectionButtonExpanded)} aria-expanded={!collapsedSections.labels} onClick={() => toggleSection('labels')}>
              <span>Labels</span>
              <span {...stylex.attrs(styles.chevron, collapsedSections.labels ? styles.chevronCollapsed : null)}>▼</span>
            </button>

            {withDirectives(
              <div {...stylex.attrs(styles.contentStack)}>
                {isEditingLabels.value
                  ? (
                      <div {...stylex.attrs(styles.editStack)}>
                        <div {...stylex.attrs(styles.labelEditor)}>
                          {labelsDraft.value.map(label => (
                            <span key={label} {...stylex.attrs(styles.draftLabel)}>
                              <span {...stylex.attrs(styles.truncate)}>{label}</span>
                              <button type="button" {...stylex.attrs(styles.removeLabel)} aria-label={`Remove label ${label}`} onClick={() => removeLabelDraft(label)}>
                                ×
                              </button>
                            </span>
                          ))}
                          <input
                            ref={labelInputRef}
                            v-model={labelDraft.value}
                            {...stylex.attrs(styles.labelInput)}
                            placeholder="Add label..."
                            disabled={anyLabelsPending.value}
                            onBlur={addLabelDraft}
                            onKeydown={handleLabelInputKeydown}
                          />
                        </div>
                        <div {...stylex.attrs(styles.actionRow)}>
                          <button type="button" {...stylex.attrs(styles.saveButton)} disabled={anyLabelsPending.value} onClick={() => void saveLabels()}>
                            {anyLabelsPending.value ? '...' : 'Save'}
                          </button>
                          <button type="button" {...stylex.attrs(styles.cancelButton)} disabled={anyLabelsPending.value} onClick={cancelEditingLabels}>
                            Cancel
                          </button>
                          {labelError.value && <span {...stylex.attrs(styles.error)}>{labelError.value}</span>}
                        </div>
                      </div>
                    )
                  : (
                      <div {...stylex.attrs(styles.labelsList)}>
                        {detailLabels.value.map(label => <LabelPill key={label} label={label} showDot />)}
                        {detailLabels.value.length === 0 && <span {...stylex.attrs(styles.empty)}>No labels</span>}
                        <button
                          type="button"
                          {...stylex.attrs(styles.addLabelButton)}
                          title={canEditLabels.value ? 'Edit labels' : 'Configure Jira credentials to edit labels'}
                          aria-label="Edit labels"
                          disabled={!canEditLabels.value}
                          onClick={startEditingLabels}
                        >
                          +
                        </button>
                      </div>
                    )}
              </div>,
              [[vShow, !collapsedSections.labels]],
            )}
          </section>

          {!props.isProjectDetail && (
            <section {...stylex.attrs(styles.section, collapsedSections.project ? styles.sectionCollapsed : styles.sectionExpanded)}>
              <button type="button" {...stylex.attrs(styles.sectionButton, collapsedSections.project ? null : styles.sectionButtonExpanded)} aria-expanded={!collapsedSections.project} onClick={() => toggleSection('project')}>
                <span>Project</span>
                <span {...stylex.attrs(styles.chevron, collapsedSections.project ? styles.chevronCollapsed : null)}>▼</span>
              </button>

              {withDirectives(
                <div>
                  {detailProjectParent.value
                    ? (
                        <button
                          type="button"
                          {...stylex.attrs(styles.rowLink)}
                          onClick={() => emit('select', detailProjectParent.value!.key)}
                          onMouseenter={() => emit('prefetch', detailProjectParent.value!.key)}
                        >
                          <span {...stylex.attrs(styles.rowIcon, styles.rowIconColor(getProjectAppearance(detailProjectParent.value.key).color))}>
                            <Icon name={`lucide:${getProjectAppearance(detailProjectParent.value.key).icon}`} {...stylex.attrs(styles.icon)} aria-hidden="true" />
                          </span>
                          <span {...stylex.attrs(styles.projectText)}>
                            <span {...stylex.attrs(styles.projectName)}>{detailProjectParentLabel.value}</span>
                          </span>
                        </button>
                      )
                    : (
                        <button type="button" {...stylex.attrs(styles.rowLink, styles.rowLinkHoverText)}>
                          <span {...stylex.attrs(styles.rowIcon)}>
                            <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                              <path stroke-linejoin="round" d="m8 1.8 5.2 3v6L8 13.8l-5.2-3v-6L8 1.8Z" />
                              <path stroke-linejoin="round" d="M2.9 4.9 8 7.8l5.1-2.9M8 7.8v5.8" />
                            </svg>
                          </span>
                          <span {...stylex.attrs(styles.projectText)}>
                            <span {...stylex.attrs(styles.projectName)}>Add to project</span>
                          </span>
                        </button>
                      )}
                </div>,
                [[vShow, !collapsedSections.project]],
              )}
            </section>
          )}

          {(devStatusPullRequests.value.length > 0 || devStatusUnavailable.value) && (
            <section {...stylex.attrs(styles.section, collapsedSections.development ? styles.sectionCollapsed : styles.sectionExpanded, uiStyles.fadeIn)}>
              <button type="button" {...stylex.attrs(styles.sectionButton, collapsedSections.development ? null : styles.sectionButtonExpanded)} aria-expanded={!collapsedSections.development} onClick={() => toggleSection('development')}>
                <span>Development</span>
                <span {...stylex.attrs(styles.chevron, collapsedSections.development ? styles.chevronCollapsed : null)}>▼</span>
              </button>

              {withDirectives(
                <div {...stylex.attrs(styles.compactStack)}>
                  {devStatusUnavailable.value && (
                    <div {...stylex.attrs(styles.devUnavailable)}>
                      <span>Couldn't load development activity.</span>
                      <button type="button" {...stylex.attrs(styles.retry)} onClick={() => refetchDevStatus()}>
                        Retry
                      </button>
                    </div>
                  )}
                  {devStatusPullRequests.value.map(pullRequest => (
                    <a key={pullRequest.url} href={pullRequest.url} target="_blank" rel="noopener noreferrer" {...stylex.attrs(styles.prLink)}>
                      <span {...stylex.attrs(styles.rowIcon)}>
                        <Icon name="lucide:git-pull-request" {...stylex.attrs(styles.icon)} aria-hidden="true" />
                      </span>
                      <span {...stylex.attrs(styles.prContent)}>
                        <span {...stylex.attrs(styles.prName)}>{pullRequest.name}</span>
                        {pullRequest.sourceBranch && <span {...stylex.attrs(styles.prBranch)}>{pullRequest.sourceBranch}</span>}
                      </span>
                      <span {...stylex.attrs(styles.statusPill, pullRequestStatusStyle(PULL_REQUEST_STATUS_TONES[pullRequest.status]))}>
                        {pullRequest.status}
                      </span>
                    </a>
                  ))}
                </div>,
                [[vShow, !collapsedSections.development]],
              )}
            </section>
          )}

          <section {...stylex.attrs(styles.section, collapsedSections.jira ? styles.sectionCollapsed : styles.sectionExpanded)}>
            <button type="button" {...stylex.attrs(styles.sectionButton, collapsedSections.jira ? null : styles.sectionButtonExpanded)} aria-expanded={!collapsedSections.jira} onClick={() => toggleSection('jira')}>
              <span>Jira</span>
              <span {...stylex.attrs(styles.chevron, collapsedSections.jira ? styles.chevronCollapsed : null)}>▼</span>
            </button>

            {withDirectives(
              <div {...stylex.attrs(styles.compactStack)}>
                {detailJiraTypeLabel.value && (
                  <div {...stylex.attrs(styles.jiraTypeRow)}>
                    <span {...stylex.attrs(styles.jiraTypePill)}>
                      <span {...stylex.attrs(styles.truncate)}>{detailJiraTypeLabel.value}</span>
                    </span>
                  </div>
                )}
                {!props.isLocalTicket && jiraUrl.value && (
                  <a href={jiraUrl.value} target="_blank" rel="noopener noreferrer" {...stylex.attrs(styles.jiraLink)}>
                    Open in Jira
                  </a>
                )}
                {hasWorkflowPeople.value && (
                  <div {...stylex.attrs(styles.compactStack)}>
                    {detailApprovers.value && (
                      <div {...stylex.attrs(styles.peopleRow)}>
                        <span {...stylex.attrs(styles.peopleLabel)}>Approvers</span>
                        <span {...stylex.attrs(styles.peopleValue)}>{detailApprovers.value.join(', ')}</span>
                      </div>
                    )}
                    {detailTestedBy.value && (
                      <div {...stylex.attrs(styles.peopleRow)}>
                        <span {...stylex.attrs(styles.peopleLabel)}>Tested by</span>
                        <span {...stylex.attrs(styles.peopleValue)}>{detailTestedBy.value}</span>
                      </div>
                    )}
                    {detailApprovedToProductionBy.value && (
                      <div {...stylex.attrs(styles.peopleRow)}>
                        <span {...stylex.attrs(styles.peopleLabel)}>Approved to production by</span>
                        <span {...stylex.attrs(styles.peopleValue)}>{detailApprovedToProductionBy.value}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>,
              [[vShow, !collapsedSections.jira]],
            )}
          </section>
        </div>
      </aside>
    )
  },
})
