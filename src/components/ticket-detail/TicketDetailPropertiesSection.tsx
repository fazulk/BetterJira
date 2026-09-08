import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
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
import { getTransitionLabel } from '@/types/jira'
import { assignedCycleFromTicket } from '~/shared/cycles'
import { LOCAL_PRIORITY_NAMES } from '~/shared/localTickets'

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
      avatarColor,
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
        class={[
          'rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 transition-[padding]',
          props.collapsed ? 'py-3' : 'py-4',
        ]}
      >
        <button
          type="button"
          class={['flex w-full items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200', { 'mb-3': !props.collapsed }]}
          aria-expanded={!props.collapsed}
          onClick={() => emit('toggle')}
        >
          <span>Properties</span>
          <span class={['text-[10px] text-slate-600 transition-transform', { '-rotate-90': props.collapsed }]}>▼</span>
        </button>

        {withDirectives(
          <div class="space-y-1 text-sm">
            <div class="flex items-center rounded-md px-1 py-2">
              {isEditingStatus.value
                ? (
                    <div class="min-w-0 space-y-2">
                      <select
                        id="detail-status"
                        v-model={statusDraft.value}
                        class="w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]"
                      >
                        <option value="" disabled>Move to...</option>
                        {(props.isLocalTicket ? localTransitionsList.value : (transitionsQuery.data.value ?? [])).map(transition => (
                          <option key={transition.id} value={transition.id}>{getTransitionLabel(transition)}</option>
                        ))}
                      </select>
                      <div class="flex flex-wrap items-center gap-1.5">
                        <button
                          class="rounded-md bg-accent-indigo px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={anyStatusPending.value || (!props.isLocalTicket && transitionsQuery.isFetching.value)}
                          onClick={saveStatus}
                        >
                          {anyStatusPending.value ? '...' : 'Save'}
                        </button>
                        <button
                          class="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.04]"
                          disabled={anyStatusPending.value}
                          onClick={cancelEditingStatus}
                        >
                          Cancel
                        </button>
                        {statusError.value && <span class="text-[11px] text-rose-300">{statusError.value}</span>}
                      </div>
                    </div>
                  )
                : (
                    <button class="min-w-0 text-left" onClick={startEditingStatus}>
                      <span class="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-xs font-medium text-slate-200">
                        <StatusIcon status={props.ticket.status} statusCategory={props.ticket.statusCategory} size={16} />
                        <span class="truncate">{props.ticket.status}</span>
                      </span>
                    </button>
                  )}
            </div>

            <div class="flex items-start gap-3 rounded-md px-1 py-2">
              <span class={['flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold', avatarColor.value]}>
                {initials.value}
              </span>
              {isEditingAssignee.value && props.isLocalTicket
                ? (
                    <div class="min-w-0 space-y-2">
                      <input
                        id="detail-local-assignee"
                        v-model={localAssigneeDraft.value}
                        list={localAssigneeDatalistId.value}
                        class="w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]"
                        placeholder="Assignee name"
                      />
                      <datalist id={localAssigneeDatalistId.value}>
                        {localAssigneeSuggestions.value.map(name => <option key={name} value={name} />)}
                      </datalist>
                      <div class="flex flex-wrap items-center gap-1.5">
                        <button class="rounded-md bg-accent-indigo px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={anyAssigneePending.value} onClick={saveAssignee}>
                          {anyAssigneePending.value ? '...' : 'Save'}
                        </button>
                        <button class="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.04]" onClick={cancelEditingAssignee}>
                          Cancel
                        </button>
                      </div>
                      {assigneeError.value && <span class="text-[11px] text-rose-300">{assigneeError.value}</span>}
                    </div>
                  )
                : isEditingAssignee.value
                  ? (
                      <div ref={assigneeComboRef} class="relative min-w-0 space-y-2">
                        <input
                          id="detail-assignee-search"
                          ref={assigneeInputRef}
                          v-model={assigneeSearch.value}
                          class="w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16]"
                          placeholder="Search assignees..."
                          onKeydown={handleAssigneeKeydown}
                        />
                        <div class="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-white/[0.08] bg-surface-2 py-1 shadow-xl shadow-black/40">
                          {recentComboOptions.value.length > 0 && (
                            <>
                              <div class="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">Recent</div>
                              {recentComboOptions.value.map((option, i) => (
                                <button
                                  key={option.accountId}
                                  data-idx={i}
                                  class={['flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors', assigneeHighlightIndex.value === i ? 'bg-white/[0.08] text-slate-100' : 'text-slate-300 hover:bg-white/[0.04]']}
                                  onClick={() => selectAssigneeOption(option.accountId)}
                                  onMouseenter={() => (assigneeHighlightIndex.value = i)}
                                >
                                  {option.displayName}
                                </button>
                              ))}
                              <div class="mx-2 my-1 border-t border-white/[0.06]" />
                            </>
                          )}
                          {nonRecentComboOptions.value.map((option, j) => (
                            <button
                              key={option.accountId}
                              data-idx={recentComboOptions.value.length + j}
                              class={['flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors', assigneeHighlightIndex.value === recentComboOptions.value.length + j ? 'bg-white/[0.08] text-slate-100' : 'text-slate-300 hover:bg-white/[0.04]']}
                              onClick={() => selectAssigneeOption(option.accountId)}
                              onMouseenter={() => (assigneeHighlightIndex.value = recentComboOptions.value.length + j)}
                            >
                              {option.displayName}
                            </button>
                          ))}
                          {!flatComboOptions.value.length && <div class="px-3 py-2 text-xs italic text-slate-600">No matching users</div>}
                        </div>
                        <div class="flex items-center gap-1.5">
                          <button class="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.04]" onClick={cancelEditingAssignee}>
                            Cancel
                          </button>
                          {assignableUsersQuery.isFetching.value && <span class="text-[11px] text-slate-500">Loading...</span>}
                          {assigneeError.value && <span class="text-[11px] text-rose-300">{assigneeError.value}</span>}
                        </div>
                      </div>
                    )
                  : (
                      <button class="flex min-w-0 items-center gap-2 text-left" onClick={startEditingAssignee}>
                        <span class="min-w-0 truncate text-sm text-slate-300">{props.ticket.assignee || 'Unassigned'}</span>
                      </button>
                    )}
            </div>

            {!props.isLocalTicket && (
              <div class="flex items-start rounded-md px-1 py-2">
                {isEditingTeam.value
                  ? (
                      <div class="min-w-0 space-y-2">
                        <select
                          id="detail-team"
                          v-model={teamDraft.value}
                          class="w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]"
                        >
                          <option value="">No team</option>
                          {teamOptions.value.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                        </select>
                        <div class="flex flex-wrap items-center gap-1.5">
                          <button class="rounded-md bg-accent-indigo px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={anyTeamPending.value || teamsQuery.isFetching.value} onClick={saveTeam}>
                            {anyTeamPending.value ? '...' : 'Save'}
                          </button>
                          <button class="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.04]" disabled={anyTeamPending.value} onClick={cancelEditingTeam}>
                            Cancel
                          </button>
                          {teamsQuery.isFetching.value && <span class="text-[11px] text-slate-500">Loading...</span>}
                          {teamError.value && <span class="text-[11px] text-rose-300">{teamError.value}</span>}
                        </div>
                      </div>
                    )
                  : (
                      <button class="flex min-w-0 items-center gap-2 text-left" onClick={startEditingTeam}>
                        <svg class="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
                          <circle cx="5.5" cy="5.5" r="2.25" />
                          <path stroke-linecap="round" d="M1.75 13.25c0-2.07 1.68-3.75 3.75-3.75s3.75 1.68 3.75 3.75" />
                          <path stroke-linecap="round" d="M10.5 3.4a2.25 2.25 0 110 4.2M11.4 9.7c1.66.4 2.85 1.88 2.85 3.55" />
                        </svg>
                        <span class={['truncate text-sm', props.ticket.team ? 'text-slate-300' : 'text-slate-500']}>{props.ticket.team?.name ?? 'No team'}</span>
                      </button>
                    )}
              </div>
            )}

            {!props.isLocalTicket && (
              <div class="flex items-start rounded-md px-1 py-2">
                {isEditingCycle.value
                  ? (
                      <div class="min-w-0 space-y-2">
                        <select id="detail-cycle" v-model={cycleDraft.value} class="w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]">
                          {cycleOptions.value.map(option => <option key={option.id || 'none'} value={option.id}>{option.name}</option>)}
                        </select>
                        <div class="flex flex-wrap items-center gap-1.5">
                          <button class="rounded-md bg-accent-indigo px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={updateTicketSprintMutation.isPending.value} onClick={() => void saveCycle()}>
                            {updateTicketSprintMutation.isPending.value ? '...' : 'Save'}
                          </button>
                          <button class="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.04]" onClick={cancelEditingCycle}>
                            Cancel
                          </button>
                          {cycleError.value && <span class="text-[11px] text-rose-300">{cycleError.value}</span>}
                        </div>
                      </div>
                    )
                  : (
                      <button class="flex min-w-0 items-center gap-2 text-left" onClick={startEditingCycle}>
                        <Icon name="lucide:circle-play" class="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                        <span class={['truncate text-sm', assignedCycle.value ? 'text-slate-300' : 'text-slate-500']}>{assignedCycleLabel.value}</span>
                      </button>
                    )}
              </div>
            )}

            <div class="flex items-start rounded-md px-1 py-2">
              {isEditingPriority.value
                ? (
                    <div class="min-w-0 space-y-2">
                      {!props.isLocalTicket
                        ? (
                            <select id="detail-priority" v-model={priorityDraft.value} class="w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]">
                              <option value="" disabled>Set priority...</option>
                              {(prioritiesQuery.data.value ?? []).map(priority => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                            </select>
                          )
                        : (
                            <select id="detail-local-priority" v-model={priorityDraftLocal.value} class="w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]">
                              {LOCAL_PRIORITY_NAMES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                            </select>
                          )}
                      <div class="flex flex-wrap items-center gap-1.5">
                        <button class="rounded-md bg-accent-indigo px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={anyPriorityPending.value || (!props.isLocalTicket && prioritiesQuery.isFetching.value)} onClick={savePriority}>
                          {anyPriorityPending.value ? '...' : 'Save'}
                        </button>
                        <button class="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.04]" disabled={anyPriorityPending.value} onClick={cancelEditingPriority}>
                          Cancel
                        </button>
                        {priorityError.value && <span class="text-[11px] text-rose-300">{priorityError.value}</span>}
                      </div>
                    </div>
                  )
                : (
                    <button class="flex min-w-0 items-center gap-2 text-left" onClick={startEditingPriority}>
                      <span class={['h-1.5 w-1.5 shrink-0 rounded-full', priorityConfig[props.ticket.priority]?.bg || 'bg-slate-500']} />
                      <span class="truncate text-sm text-slate-300">{props.ticket.priority}</span>
                    </button>
                  )}
            </div>

            {props.ticket.storyPoints !== undefined && (
              <div class="flex items-center gap-2 rounded-md px-1 py-2">
                <svg class="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 11.5l3-3 2 2 5-6" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.5 4.5h3v3" />
                </svg>
                <span class="text-sm text-slate-300">
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
