import type { PropType } from 'vue'
import type { DetailAvatarTone, DetailPriorityTone } from '@/features/ticket-detail/useTicketDetailPropertyEditors'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref, vShow, withDirectives } from 'vue'
import { Icon } from '#components'
import StatusIcon from '@/components/StatusIcon'
import { useSpaceCycles } from '@/composables/useSpaceCycles'
import { useUpdateTicketSprint } from '@/composables/useUpdateTicketSprint'
import {

  priorityConfig,
  useTicketDetailPropertyEditors,
} from '@/features/ticket-detail/useTicketDetailPropertyEditors'
import { useTicketDetailStatusEditor } from '@/features/ticket-detail/useTicketDetailStatusEditor'
import { colors } from '@/styles/tokens.stylex'
import { getTransitionLabel } from '@/types/jira'
import { assignedCycleFromTicket } from '~/shared/cycles'
import { LOCAL_PRIORITY_NAMES } from '~/shared/localTickets'

const styles = stylex.create({
  section: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '1rem', transitionProperty: 'padding', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  expanded: { paddingBlock: '1rem' },
  collapsed: { paddingBlock: '0.75rem' },
  sectionButton: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.375rem', borderWidth: 0, backgroundColor: 'transparent', padding: 0, fontSize: '0.875rem', lineHeight: '1.25rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  sectionButtonExpanded: { marginBottom: '0.75rem' },
  chevron: { fontSize: 10, color: colors['--color-slate-600'], transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  chevronCollapsed: { transform: 'rotate(-90deg)' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', lineHeight: '1.25rem' },
  row: { display: 'flex', alignItems: 'center', borderRadius: '0.375rem', paddingInline: '0.25rem', paddingBlock: '0.5rem' },
  rowGap: { gap: '0.5rem' },
  rowStart: { alignItems: 'flex-start', gap: '0.75rem' },
  editStack: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  selectInput: { 'width': '100%', 'borderRadius': '0.375rem', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' }, 'backgroundColor': 'rgba(255, 255, 255, 0.035)', 'paddingInline': '0.5rem', 'paddingBlock': '0.375rem', 'fontSize': '0.75rem', 'lineHeight': '1rem', 'color': colors['--color-slate-200'], 'outlineStyle': 'none', 'transitionProperty': 'border-color', 'transitionDuration': '150ms', 'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)', '::placeholder': { color: colors['--color-slate-600'] } },
  actionRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem' },
  saveButton: { borderRadius: '0.375rem', borderWidth: 0, backgroundColor: colors['--color-accent-indigo'], paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, fontWeight: 500, color: colors['--color-white'], cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.6 } },
  cancelButton: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, color: colors['--color-slate-400'] },
  error: { fontSize: 11, color: colors['--color-rose-300'] },
  loading: { fontSize: 11, color: colors['--color-slate-500'] },
  plainButton: { minWidth: 0, borderWidth: 0, backgroundColor: 'transparent', padding: 0, textAlign: 'left' },
  inlineButton: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem', borderWidth: 0, backgroundColor: 'transparent', padding: 0, textAlign: 'left' },
  statusPill: { display: 'inline-flex', maxWidth: '100%', alignItems: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-200'] },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  avatar: { display: 'flex', width: '1.25rem', height: '1.25rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', fontSize: 9, fontWeight: 700 },
  avatarFallback: { borderColor: 'rgba(100, 116, 139, 0.15)', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: colors['--color-slate-400'] },
  avatarNeutral: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.045)', color: colors['--color-slate-300'] },
  avatarAmber: { borderColor: 'rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: colors['--color-amber-300'] },
  avatarEmerald: { borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: colors['--color-emerald-300'] },
  avatarRose: { borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.2)', color: colors['--color-rose-300'] },
  avatarSky: { borderColor: 'rgba(14, 165, 233, 0.2)', backgroundColor: 'rgba(14, 165, 233, 0.2)', color: colors['--color-sky-300'] },
  combo: { position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  menu: { position: 'absolute', left: 0, top: '100%', zIndex: 50, marginTop: '0.25rem', maxHeight: '16rem', width: '14rem', overflowY: 'auto', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: colors['--color-surface-2'], paddingBlock: '0.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' },
  menuHeader: { paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors['--color-slate-600'] },
  option: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', borderWidth: 0, paddingInline: '0.75rem', paddingBlock: '0.375rem', textAlign: 'left', fontSize: '0.75rem', lineHeight: '1rem', transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  optionActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: colors['--color-slate-100'] },
  optionInactive: { backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, color: colors['--color-slate-300'] },
  divider: { marginInline: '0.5rem', marginBlock: '0.25rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  empty: { paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', fontStyle: 'italic', color: colors['--color-slate-600'] },
  value: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-300'] },
  valueMuted: { color: colors['--color-slate-500'] },
  icon: { width: '1rem', height: '1rem', flexShrink: 0, color: colors['--color-slate-500'] },
  priorityDot: { width: '0.375rem', height: '0.375rem', flexShrink: 0, borderRadius: '9999px' },
  priorityHighest: { backgroundColor: colors['--color-red-400'] },
  priorityHigh: { backgroundColor: colors['--color-orange-400'] },
  priorityMedium: { backgroundColor: colors['--color-yellow-400'] },
  priorityLow: { backgroundColor: colors['--color-sky-400'] },
  priorityLowest: { backgroundColor: colors['--color-slate-400'] },
  priorityFallback: { backgroundColor: colors['--color-slate-500'] },
})

function avatarStyle(tone: DetailAvatarTone) {
  if (tone === 'fallback')
    return styles.avatarFallback
  if (tone === 'amber')
    return styles.avatarAmber
  if (tone === 'emerald')
    return styles.avatarEmerald
  if (tone === 'rose')
    return styles.avatarRose
  if (tone === 'sky')
    return styles.avatarSky
  return styles.avatarNeutral
}

function priorityDotStyle(tone: DetailPriorityTone) {
  if (tone === 'highest')
    return styles.priorityHighest
  if (tone === 'high')
    return styles.priorityHigh
  if (tone === 'medium')
    return styles.priorityMedium
  if (tone === 'low')
    return styles.priorityLow
  if (tone === 'lowest')
    return styles.priorityLowest
  return styles.priorityFallback
}

export default defineComponent({
  name: 'TicketDetailPropertiesSection',
  props: {
    collapsed: {
      type: Boolean,
      required: true,
    },
    isLocalTicket: {
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
    ticketKey: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: {
    toggle: () => true,
  },
  setup(props, { emit, expose }) {
    const ticketRef = computed(() => props.ticket)
    const ticketKeyRef = computed(() => props.ticketKey)
    const isLocalTicketRef = computed(() => props.isLocalTicket)
    const jiraDataEnabledRef = computed(() => props.jiraDataEnabled)

    const propertyEditor = useTicketDetailPropertyEditors({
      isLocalTicket: isLocalTicketRef,
      jiraDataEnabled: jiraDataEnabledRef,
      ticket: ticketRef,
      ticketKey: ticketKeyRef,
    })
    const statusEditor = useTicketDetailStatusEditor({
      isLocalTicket: isLocalTicketRef,
      jiraDataEnabled: jiraDataEnabledRef,
      ticket: ticketRef,
      ticketKey: ticketKeyRef,
    })

    const {
      anyAssigneePending,
      anyPriorityPending,
      anyTeamPending,
      assigneeComboRef,
      assigneeError,
      assigneeHighlightIndex,
      assigneeInputRef,
      assigneeSearch,
      assignableUsersQuery,
      avatarTone,
      cancelEditingAssignee,
      cancelEditingPriority,
      cancelEditingTeam,
      flatComboOptions,
      handleAssigneeKeydown,
      initials,
      isEditingAssignee,
      isEditingPriority,
      isEditingTeam,
      localAssigneeDatalistId,
      localAssigneeDraft,
      localAssigneeSuggestions,
      nonRecentComboOptions,
      prioritiesQuery,
      priorityDraft,
      priorityDraftLocal,
      priorityError,
      recentComboOptions,
      saveAssignee,
      savePriority,
      saveTeam,
      selectAssigneeOption,
      startEditingAssignee,
      startEditingPriority,
      startEditingTeam,
      teamDraft,
      teamError,
      teamOptions,
      teamsQuery,
    } = propertyEditor

    const {
      anyStatusPending,
      cancelEditingStatus,
      isEditingStatus,
      localTransitionsList,
      saveStatus,
      startEditingStatus,
      statusDraft,
      statusError,
      transitionsQuery,
    } = statusEditor

    const cycleSpaceKey = computed(() => (props.isLocalTicket ? null : props.ticket.spaceKey))
    const spaceCycles = useSpaceCycles(cycleSpaceKey)
    const updateTicketSprintMutation = useUpdateTicketSprint()
    const isEditingCycle = ref(false)
    const cycleDraft = ref('')
    const cycleError = ref<string | null>(null)

    const cycleOptions = computed(() => {
      const options: Array<{ id: string, name: string }> = [{ id: '', name: 'No cycle' }]
      const seen = new Set<string>([''])
      if (spaceCycles.current.value) {
        options.push({ id: spaceCycles.current.value.id, name: `Current · ${spaceCycles.current.value.name}` })
        seen.add(spaceCycles.current.value.id)
      }
      if (spaceCycles.upcoming.value) {
        options.push({ id: spaceCycles.upcoming.value.id, name: `Upcoming · ${spaceCycles.upcoming.value.name}` })
        seen.add(spaceCycles.upcoming.value.id)
      }
      if (spaceCycles.previous.value) {
        options.push({ id: spaceCycles.previous.value.id, name: `Previous · ${spaceCycles.previous.value.name}` })
        seen.add(spaceCycles.previous.value.id)
      }
      const assigned = assignedCycleFromTicket(props.ticket)
      if (assigned && assigned.id !== 'current' && !seen.has(assigned.id))
        options.push({ id: assigned.id, name: assigned.name })
      return options
    })

    const assignedCycle = computed(() => assignedCycleFromTicket(props.ticket))
    const assignedCycleId = computed(() => {
      const assigned = assignedCycle.value
      if (!assigned || assigned.id === 'current')
        return spaceCycles.current.value?.id ?? ''
      return assigned.id
    })
    const assignedCycleLabel = computed(() => assignedCycle.value?.name ?? 'No cycle')

    function startEditingCycle(): void {
      cycleDraft.value = assignedCycleId.value
      cycleError.value = null
      isEditingCycle.value = true
    }

    function cancelEditingCycle(): void {
      isEditingCycle.value = false
      cycleError.value = null
    }

    async function saveCycle(): Promise<void> {
      const sprint = cycleDraft.value
        ? spaceCycles.cycleById(cycleDraft.value)
        : null
      try {
        await updateTicketSprintMutation.mutateAsync({
          key: props.ticket.key,
          sprint,
          sprintId: sprint?.id ?? null,
        })
        isEditingCycle.value = false
        cycleError.value = null
      }
      catch (error) {
        cycleError.value = error instanceof Error ? error.message : 'Failed to update cycle.'
      }
    }

    expose({
      startEditingAssignee,
      startEditingPriority,
      startEditingStatus,
    })

    return () => (
      <section
        {...stylex.attrs(styles.section, props.collapsed ? styles.collapsed : styles.expanded)}
      >
        <button
          type="button"
          {...stylex.attrs(styles.sectionButton, props.collapsed ? null : styles.sectionButtonExpanded)}
          aria-expanded={!props.collapsed}
          onClick={() => emit('toggle')}
        >
          <span>Properties</span>
          <span {...stylex.attrs(styles.chevron, props.collapsed ? styles.chevronCollapsed : null)}>▼</span>
        </button>

        {withDirectives(
          <div {...stylex.attrs(styles.list)}>
            <div {...stylex.attrs(styles.row)}>
              {isEditingStatus.value
                ? (
                    <div {...stylex.attrs(styles.editStack)}>
                      <select
                        id="detail-status"
                        v-model={statusDraft.value}
                        {...stylex.attrs(styles.selectInput)}
                      >
                        <option value="" disabled>Move to...</option>
                        {(props.isLocalTicket ? localTransitionsList.value : (transitionsQuery.data.value ?? [])).map(transition => (
                          <option key={transition.id} value={transition.id}>{getTransitionLabel(transition)}</option>
                        ))}
                      </select>
                      <div {...stylex.attrs(styles.actionRow)}>
                        <button
                          {...stylex.attrs(styles.saveButton)}
                          disabled={anyStatusPending.value || (!props.isLocalTicket && transitionsQuery.isFetching.value)}
                          onClick={saveStatus}
                        >
                          {anyStatusPending.value ? '...' : 'Save'}
                        </button>
                        <button
                          {...stylex.attrs(styles.cancelButton)}
                          disabled={anyStatusPending.value}
                          onClick={cancelEditingStatus}
                        >
                          Cancel
                        </button>
                        {statusError.value && <span {...stylex.attrs(styles.error)}>{statusError.value}</span>}
                      </div>
                    </div>
                  )
                : (
                    <button {...stylex.attrs(styles.plainButton)} onClick={startEditingStatus}>
                      <span {...stylex.attrs(styles.statusPill)}>
                        <StatusIcon status={props.ticket.status} statusCategory={props.ticket.statusCategory} size={16} />
                        <span {...stylex.attrs(styles.truncate)}>{props.ticket.status}</span>
                      </span>
                    </button>
                  )}
            </div>

            <div {...stylex.attrs(styles.row, styles.rowStart)}>
              <span {...stylex.attrs(styles.avatar, avatarStyle(avatarTone.value))}>
                {initials.value}
              </span>
              {isEditingAssignee.value && props.isLocalTicket
                ? (
                    <div {...stylex.attrs(styles.editStack)}>
                      <input
                        id="detail-local-assignee"
                        v-model={localAssigneeDraft.value}
                        list={localAssigneeDatalistId.value}
                        {...stylex.attrs(styles.selectInput)}
                        placeholder="Assignee name"
                      />
                      <datalist id={localAssigneeDatalistId.value}>
                        {localAssigneeSuggestions.value.map(name => <option key={name} value={name} />)}
                      </datalist>
                      <div {...stylex.attrs(styles.actionRow)}>
                        <button {...stylex.attrs(styles.saveButton)} disabled={anyAssigneePending.value} onClick={saveAssignee}>
                          {anyAssigneePending.value ? '...' : 'Save'}
                        </button>
                        <button {...stylex.attrs(styles.cancelButton)} onClick={cancelEditingAssignee}>
                          Cancel
                        </button>
                      </div>
                      {assigneeError.value && <span {...stylex.attrs(styles.error)}>{assigneeError.value}</span>}
                    </div>
                  )
                : isEditingAssignee.value
                  ? (
                      <div ref={assigneeComboRef} {...stylex.attrs(styles.combo)}>
                        <input
                          id="detail-assignee-search"
                          ref={assigneeInputRef}
                          v-model={assigneeSearch.value}
                          {...stylex.attrs(styles.selectInput)}
                          placeholder="Search assignees..."
                          onKeydown={handleAssigneeKeydown}
                        />
                        <div {...stylex.attrs(styles.menu)}>
                          {recentComboOptions.value.length > 0 && (
                            <>
                              <div {...stylex.attrs(styles.menuHeader)}>Recent</div>
                              {recentComboOptions.value.map((option, i) => (
                                <button
                                  key={option.accountId}
                                  data-idx={i}
                                  {...stylex.attrs(styles.option, assigneeHighlightIndex.value === i ? styles.optionActive : styles.optionInactive)}
                                  onClick={() => selectAssigneeOption(option.accountId)}
                                  onMouseenter={() => (assigneeHighlightIndex.value = i)}
                                >
                                  {option.displayName}
                                </button>
                              ))}
                              <div {...stylex.attrs(styles.divider)} />
                            </>
                          )}
                          {nonRecentComboOptions.value.map((option, j) => (
                            <button
                              key={option.accountId}
                              data-idx={recentComboOptions.value.length + j}
                              {...stylex.attrs(styles.option, assigneeHighlightIndex.value === recentComboOptions.value.length + j ? styles.optionActive : styles.optionInactive)}
                              onClick={() => selectAssigneeOption(option.accountId)}
                              onMouseenter={() => (assigneeHighlightIndex.value = recentComboOptions.value.length + j)}
                            >
                              {option.displayName}
                            </button>
                          ))}
                          {!flatComboOptions.value.length && !assignableUsersQuery.isSearchPending.value && !assignableUsersQuery.error.value && <div {...stylex.attrs(styles.empty)}>No matching users</div>}
                        </div>
                        <div {...stylex.attrs(styles.actionRow)}>
                          <button {...stylex.attrs(styles.cancelButton)} onClick={cancelEditingAssignee}>
                            Cancel
                          </button>
                          {assignableUsersQuery.isSearchPending.value && <span {...stylex.attrs(styles.loading)}>Loading...</span>}
                          {assignableUsersQuery.error.value && (
                            <>
                              <span {...stylex.attrs(styles.error)}>{assignableUsersQuery.error.value.message}</span>
                              <button {...stylex.attrs(styles.cancelButton)} onClick={() => assignableUsersQuery.refetch()}>
                                Retry
                              </button>
                            </>
                          )}
                          {assigneeError.value && <span {...stylex.attrs(styles.error)}>{assigneeError.value}</span>}
                        </div>
                      </div>
                    )
                  : (
                      <button {...stylex.attrs(styles.inlineButton)} onClick={startEditingAssignee}>
                        <span {...stylex.attrs(styles.value)}>{props.ticket.assignee || 'Unassigned'}</span>
                      </button>
                    )}
            </div>

            {!props.isLocalTicket && (
              <div {...stylex.attrs(styles.row, styles.rowStart)}>
                {isEditingTeam.value
                  ? (
                      <div {...stylex.attrs(styles.editStack)}>
                        <select
                          id="detail-team"
                          v-model={teamDraft.value}
                          {...stylex.attrs(styles.selectInput)}
                        >
                          <option value="">No team</option>
                          {teamOptions.value.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                        </select>
                        <div {...stylex.attrs(styles.actionRow)}>
                          <button {...stylex.attrs(styles.saveButton)} disabled={anyTeamPending.value || teamsQuery.isFetching.value} onClick={saveTeam}>
                            {anyTeamPending.value ? '...' : 'Save'}
                          </button>
                          <button {...stylex.attrs(styles.cancelButton)} disabled={anyTeamPending.value} onClick={cancelEditingTeam}>
                            Cancel
                          </button>
                          {teamsQuery.isFetching.value && <span {...stylex.attrs(styles.loading)}>Loading...</span>}
                          {teamError.value && <span {...stylex.attrs(styles.error)}>{teamError.value}</span>}
                        </div>
                      </div>
                    )
                  : (
                      <button {...stylex.attrs(styles.inlineButton)} onClick={startEditingTeam}>
                        <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
                          <circle cx="5.5" cy="5.5" r="2.25" />
                          <path stroke-linecap="round" d="M1.75 13.25c0-2.07 1.68-3.75 3.75-3.75s3.75 1.68 3.75 3.75" />
                          <path stroke-linecap="round" d="M10.5 3.4a2.25 2.25 0 110 4.2M11.4 9.7c1.66.4 2.85 1.88 2.85 3.55" />
                        </svg>
                        <span {...stylex.attrs(styles.value, props.ticket.team ? null : styles.valueMuted)}>{props.ticket.team?.name ?? 'No team'}</span>
                      </button>
                    )}
              </div>
            )}

            {!props.isLocalTicket && (
              <div {...stylex.attrs(styles.row, styles.rowStart)}>
                {isEditingCycle.value
                  ? (
                      <div {...stylex.attrs(styles.editStack)}>
                        <select id="detail-cycle" v-model={cycleDraft.value} {...stylex.attrs(styles.selectInput)}>
                          {cycleOptions.value.map(option => <option key={option.id || 'none'} value={option.id}>{option.name}</option>)}
                        </select>
                        <div {...stylex.attrs(styles.actionRow)}>
                          <button {...stylex.attrs(styles.saveButton)} disabled={updateTicketSprintMutation.isPending.value} onClick={() => void saveCycle()}>
                            {updateTicketSprintMutation.isPending.value ? '...' : 'Save'}
                          </button>
                          <button {...stylex.attrs(styles.cancelButton)} onClick={cancelEditingCycle}>
                            Cancel
                          </button>
                          {cycleError.value && <span {...stylex.attrs(styles.error)}>{cycleError.value}</span>}
                        </div>
                      </div>
                    )
                  : (
                      <button {...stylex.attrs(styles.inlineButton)} onClick={startEditingCycle}>
                        <Icon name="lucide:circle-play" {...stylex.attrs(styles.icon)} aria-hidden="true" />
                        <span {...stylex.attrs(styles.value, assignedCycle.value ? null : styles.valueMuted)}>{assignedCycleLabel.value}</span>
                      </button>
                    )}
              </div>
            )}

            <div {...stylex.attrs(styles.row, styles.rowStart)}>
              {isEditingPriority.value
                ? (
                    <div {...stylex.attrs(styles.editStack)}>
                      {!props.isLocalTicket
                        ? (
                            <select id="detail-priority" v-model={priorityDraft.value} {...stylex.attrs(styles.selectInput)}>
                              <option value="" disabled>Set priority...</option>
                              {(prioritiesQuery.data.value ?? []).map(priority => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                            </select>
                          )
                        : (
                            <select id="detail-local-priority" v-model={priorityDraftLocal.value} {...stylex.attrs(styles.selectInput)}>
                              {LOCAL_PRIORITY_NAMES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                            </select>
                          )}
                      <div {...stylex.attrs(styles.actionRow)}>
                        <button {...stylex.attrs(styles.saveButton)} disabled={anyPriorityPending.value || (!props.isLocalTicket && prioritiesQuery.isFetching.value)} onClick={savePriority}>
                          {anyPriorityPending.value ? '...' : 'Save'}
                        </button>
                        <button {...stylex.attrs(styles.cancelButton)} disabled={anyPriorityPending.value} onClick={cancelEditingPriority}>
                          Cancel
                        </button>
                        {priorityError.value && <span {...stylex.attrs(styles.error)}>{priorityError.value}</span>}
                      </div>
                    </div>
                  )
                : (
                    <button {...stylex.attrs(styles.inlineButton)} onClick={startEditingPriority}>
                      <span {...stylex.attrs(styles.priorityDot, priorityDotStyle(priorityConfig[props.ticket.priority]?.tone ?? 'fallback'))} />
                      <span {...stylex.attrs(styles.value)}>{props.ticket.priority}</span>
                    </button>
                  )}
            </div>

            {props.ticket.storyPoints !== undefined && (
              <div {...stylex.attrs(styles.row, styles.rowGap)}>
                <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 11.5l3-3 2 2 5-6" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.5 4.5h3v3" />
                </svg>
                <span {...stylex.attrs(styles.value)}>
                  {props.ticket.storyPoints}
                  {' '}
                  {props.ticket.storyPoints === 1 ? 'story point' : 'story points'}
                </span>
              </div>
            )}
          </div>,
          [[vShow, !props.collapsed]],
        )}
      </section>
    )
  },
})
