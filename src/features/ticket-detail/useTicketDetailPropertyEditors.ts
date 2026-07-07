import type { Ref } from 'vue'
import type { JiraTicket } from '@/types/jira'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useAssignableUsers } from '@/composables/useAssignableUsers'
import { useJiraTeams } from '@/composables/useJiraTeams'
import { getCachedTickets } from '@/composables/useJiraTickets'
import { usePriorities } from '@/composables/usePriorities'
import { useUpdateTicketAssignee } from '@/composables/useUpdateTicketAssignee'
import { useUpdateTicketPriority } from '@/composables/useUpdateTicketPriority'
import { useUpdateTicketTeam } from '@/composables/useUpdateTicketTeam'
import { readLocalStorageStringArray } from '@/utils/browserStorage'
import { isLocalTicketKey } from '~/shared/localTickets'

interface TicketDetailPropertyEditorsInput {
  isLocalTicket: Ref<boolean>
  jiraDataEnabled: Ref<boolean>
  ticket: Ref<JiraTicket | null>
  ticketKey: Ref<string | null>
}

export const priorityConfig: Record<string, { color: string, bg: string }> = {
  Highest: { color: 'text-red-400', bg: 'bg-red-400' },
  High: { color: 'text-orange-400', bg: 'bg-orange-400' },
  Medium: { color: 'text-yellow-400', bg: 'bg-yellow-400' },
  Low: { color: 'text-sky-400', bg: 'bg-sky-400' },
  Lowest: { color: 'text-slate-400', bg: 'bg-slate-400' },
}

const avatarColors = [
  'bg-white/[0.045] text-slate-300 border-white/[0.08]',
  'bg-amber-500/20 text-amber-300 border-amber-500/20',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
  'bg-rose-500/20 text-rose-300 border-rose-500/20',
  'bg-sky-500/20 text-sky-300 border-sky-500/20',
]

function getAssigneeAvatarColor(name: string | undefined) {
  if (!name || name === 'Unassigned')
    return 'bg-slate-500/15 text-slate-400 border-slate-500/15'
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

function getAssigneeInitials(name: string | undefined) {
  if (!name || name === 'Unassigned')
    return '?'
  const parts = name.split(/\s+/)
  const firstPart = parts[0]
  const secondPart = parts[1]
  if (firstPart && secondPart)
    return `${firstPart[0] ?? ''}${secondPart[0] ?? ''}`
  return name.slice(0, 2)
}

export function useTicketDetailPropertyEditors(input: TicketDetailPropertyEditorsInput) {
  const queryClient = useQueryClient()
  const assignableUsersQuery = useAssignableUsers(input.ticketKey, { queryEnabled: input.jiraDataEnabled })
  const prioritiesQuery = usePriorities(input.jiraDataEnabled)
  const updateAssigneeMutation = useUpdateTicketAssignee()
  const updatePriorityMutation = useUpdateTicketPriority()
  const teamsQuery = useJiraTeams(input.jiraDataEnabled)
  const updateTeamMutation = useUpdateTicketTeam()

  const priorityDraftLocal = ref('')
  const localAssigneeDraft = ref('')
  const isEditingAssignee = ref(false)
  const assigneeDraft = ref('')
  const assigneeError = ref<string | null>(null)
  const assigneeSearch = ref('')
  const assigneeHighlightIndex = ref(0)
  const assigneeInputRef = ref<HTMLInputElement | null>(null)
  const assigneeComboRef = ref<HTMLDivElement | null>(null)
  const isEditingPriority = ref(false)
  const priorityDraft = ref('')
  const priorityError = ref<string | null>(null)
  const isEditingTeam = ref(false)
  const teamDraft = ref('')
  const teamError = ref<string | null>(null)

  const recentAssigneeIds = ref<string[]>(readLocalStorageStringArray('recent-assignees'))

  function addRecentAssignee(accountId: string) {
    if (accountId === '__unassigned__')
      return
    const updated = [accountId, ...recentAssigneeIds.value.filter(id => id !== accountId)].slice(0, 5)
    recentAssigneeIds.value = updated
    localStorage.setItem('recent-assignees', JSON.stringify(updated))
  }

  const assignableOptions = computed(() => [
    { accountId: '__unassigned__', displayName: 'Unassigned' },
    ...(assignableUsersQuery.data.value ?? []),
  ])

  const recentComboOptions = computed(() => {
    const ids = recentAssigneeIds.value
    if (!ids.length)
      return []
    const query = assigneeSearch.value.toLowerCase().trim()
    const all = assignableUsersQuery.data.value ?? []
    const recent = ids
      .map(id => all.find(user => user.accountId === id))
      .filter((user): user is NonNullable<typeof user> => !!user)
    if (!query)
      return recent
    return recent.filter(option => option.displayName.toLowerCase().includes(query))
  })

  const nonRecentComboOptions = computed(() => {
    const recentIds = new Set(recentAssigneeIds.value)
    const query = assigneeSearch.value.toLowerCase().trim()
    const all = assignableOptions.value
    const filtered = query ? all.filter(option => option.displayName.toLowerCase().includes(query)) : all
    return filtered.filter(option => !recentIds.has(option.accountId))
  })

  const flatComboOptions = computed(() => [...recentComboOptions.value, ...nonRecentComboOptions.value])

  function handleAssigneeClickOutside(event: MouseEvent) {
    const target = event.target
    if (target instanceof Node && assigneeComboRef.value && !assigneeComboRef.value.contains(target)) {
      cancelEditingAssignee()
    }
  }

  function selectAssigneeOption(accountId: string) {
    assigneeDraft.value = accountId
    assigneeSearch.value = ''
    addRecentAssignee(accountId)
    nextTick(() => saveAssignee())
  }

  function scrollAssigneeHighlightIntoView() {
    nextTick(() => {
      const item = assigneeComboRef.value?.querySelector(`[data-idx="${assigneeHighlightIndex.value}"]`)
      item?.scrollIntoView({ block: 'nearest' })
    })
  }

  function handleAssigneeKeydown(event: KeyboardEvent) {
    const options = flatComboOptions.value
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      assigneeHighlightIndex.value = Math.min(assigneeHighlightIndex.value + 1, options.length - 1)
      scrollAssigneeHighlightIntoView()
    }
    else if (event.key === 'ArrowUp') {
      event.preventDefault()
      assigneeHighlightIndex.value = Math.max(assigneeHighlightIndex.value - 1, 0)
      scrollAssigneeHighlightIntoView()
    }
    else if (event.key === 'Enter') {
      event.preventDefault()
      const highlightedOption = options[assigneeHighlightIndex.value]
      if (highlightedOption) {
        selectAssigneeOption(highlightedOption.accountId)
      }
    }
    else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditingAssignee()
    }
  }

  const localAssigneeSuggestions = computed(() => {
    const names = new Set<string>()
    for (const ticket of getCachedTickets(queryClient) ?? []) {
      if (isLocalTicketKey(ticket.key) && ticket.assignee && ticket.assignee !== 'Unassigned') {
        names.add(ticket.assignee)
      }
    }
    return [...names].sort()
  })

  const localAssigneeDatalistId = computed(() => `local-assignee-dl-${input.ticketKey.value ?? 'none'}`)
  const anyPriorityPending = computed(() => updatePriorityMutation.isPending.value)
  const anyAssigneePending = computed(() => updateAssigneeMutation.isPending.value)
  const avatarColor = computed(() => getAssigneeAvatarColor(input.ticket.value?.assignee))
  const initials = computed(() => getAssigneeInitials(input.ticket.value?.assignee))

  async function startEditingAssignee() {
    if (!input.ticket.value || anyAssigneePending.value)
      return

    if (input.isLocalTicket.value) {
      localAssigneeDraft.value = input.ticket.value.assignee === 'Unassigned' ? '' : input.ticket.value.assignee
      assigneeError.value = null
      isEditingAssignee.value = true
      return
    }

    assigneeDraft.value = input.ticket.value.assigneeAccountId ?? '__unassigned__'
    assigneeError.value = null
    assigneeSearch.value = ''
    assigneeHighlightIndex.value = 0
    isEditingAssignee.value = true
    document.addEventListener('mousedown', handleAssigneeClickOutside)

    nextTick(() => {
      assigneeInputRef.value?.focus()
    })

    if (!assignableUsersQuery.data.value && !assignableUsersQuery.isFetching.value) {
      try {
        await assignableUsersQuery.refetch()
      }
      catch {
        assigneeError.value = 'Failed to load assignees.'
      }
    }
  }

  function cancelEditingAssignee() {
    if (input.isLocalTicket.value) {
      localAssigneeDraft.value = input.ticket.value?.assignee === 'Unassigned' ? '' : (input.ticket.value?.assignee ?? '')
    }
    else {
      assigneeDraft.value = input.ticket.value?.assigneeAccountId ?? '__unassigned__'
    }

    assigneeError.value = null
    assigneeSearch.value = ''
    isEditingAssignee.value = false
    document.removeEventListener('mousedown', handleAssigneeClickOutside)
  }

  async function saveAssignee() {
    if (!input.ticket.value || anyAssigneePending.value)
      return

    if (input.isLocalTicket.value) {
      const nextName = localAssigneeDraft.value.trim() || null
      const currentName = input.ticket.value.assignee === 'Unassigned' ? null : input.ticket.value.assignee
      if (nextName === currentName) {
        isEditingAssignee.value = false
        assigneeError.value = null
        return
      }

      try {
        await updateAssigneeMutation.mutateAsync({ key: input.ticket.value.key, assigneeName: nextName })
        isEditingAssignee.value = false
        assigneeError.value = null
      }
      catch (err) {
        assigneeError.value = err instanceof Error ? err.message : 'Failed to update assignee.'
      }
      return
    }

    const nextAccountId = assigneeDraft.value === '__unassigned__' ? null : assigneeDraft.value
    const currentAccountId = input.ticket.value.assigneeAccountId ?? null
    if (nextAccountId === currentAccountId) {
      isEditingAssignee.value = false
      assigneeError.value = null
      document.removeEventListener('mousedown', handleAssigneeClickOutside)
      return
    }

    const selectedAssignee = assignableOptions.value.find(option => option.accountId === assigneeDraft.value)
    const assigneeName = selectedAssignee?.displayName ?? 'Unassigned'

    try {
      await updateAssigneeMutation.mutateAsync({ key: input.ticket.value.key, accountId: nextAccountId, assigneeName })
      isEditingAssignee.value = false
      assigneeError.value = null
      document.removeEventListener('mousedown', handleAssigneeClickOutside)
    }
    catch (err) {
      assigneeError.value = err instanceof Error ? err.message : 'Failed to update assignee.'
    }
  }

  async function startEditingPriority() {
    if (!input.ticket.value || anyPriorityPending.value)
      return

    if (input.isLocalTicket.value) {
      priorityDraftLocal.value = input.ticket.value.priority
      priorityError.value = null
      isEditingPriority.value = true
      return
    }

    priorityDraft.value = ''
    priorityError.value = null
    isEditingPriority.value = true

    if (!prioritiesQuery.data.value && !prioritiesQuery.isFetching.value) {
      try {
        await prioritiesQuery.refetch()
      }
      catch {
        priorityError.value = 'Failed to load priorities.'
      }
    }
  }

  function cancelEditingPriority() {
    priorityDraft.value = ''
    priorityDraftLocal.value = input.ticket.value?.priority ?? ''
    priorityError.value = null
    isEditingPriority.value = false
  }

  async function savePriority() {
    if (!input.ticket.value || anyPriorityPending.value)
      return

    if (input.isLocalTicket.value) {
      if (!priorityDraftLocal.value) {
        priorityError.value = 'Select a priority.'
        return
      }

      if (priorityDraftLocal.value === input.ticket.value.priority) {
        isEditingPriority.value = false
        priorityError.value = null
        return
      }

      try {
        await updatePriorityMutation.mutateAsync({ key: input.ticket.value.key, priorityName: priorityDraftLocal.value })
        isEditingPriority.value = false
        priorityError.value = null
      }
      catch (err) {
        priorityError.value = err instanceof Error ? err.message : 'Failed to update priority.'
      }
      return
    }

    if (!priorityDraft.value) {
      priorityError.value = 'Select a priority.'
      return
    }

    const selectedPriority = prioritiesQuery.data.value?.find(priority => priority.id === priorityDraft.value)
    if (!selectedPriority) {
      priorityError.value = 'Invalid priority.'
      return
    }

    if (selectedPriority.name === input.ticket.value.priority) {
      isEditingPriority.value = false
      priorityError.value = null
      return
    }

    try {
      await updatePriorityMutation.mutateAsync({
        key: input.ticket.value.key,
        priorityId: selectedPriority.id,
        priorityName: selectedPriority.name,
      })
      isEditingPriority.value = false
      priorityError.value = null
    }
    catch (err) {
      priorityError.value = err instanceof Error ? err.message : 'Failed to update priority.'
    }
  }

  const anyTeamPending = computed(() => updateTeamMutation.isPending.value)

  const teamOptions = computed(() => {
    const teams = teamsQuery.data.value ?? []
    const currentTeam = input.ticket.value?.team
    if (currentTeam && !teams.some(team => team.id === currentTeam.id)) {
      return [currentTeam, ...teams]
    }
    return teams
  })

  async function startEditingTeam() {
    if (!input.ticket.value || anyTeamPending.value || input.isLocalTicket.value)
      return

    teamDraft.value = input.ticket.value.team?.id ?? ''
    teamError.value = null
    isEditingTeam.value = true

    if (!teamsQuery.data.value && !teamsQuery.isFetching.value) {
      try {
        await teamsQuery.refetch()
      }
      catch {
        teamError.value = 'Failed to load teams.'
      }
    }
  }

  function cancelEditingTeam() {
    teamDraft.value = input.ticket.value?.team?.id ?? ''
    teamError.value = null
    isEditingTeam.value = false
  }

  async function saveTeam() {
    if (!input.ticket.value || anyTeamPending.value)
      return

    const currentTeamId = input.ticket.value.team?.id ?? ''
    if (teamDraft.value === currentTeamId) {
      isEditingTeam.value = false
      teamError.value = null
      return
    }

    const selectedTeam = teamDraft.value
      ? teamOptions.value.find(team => team.id === teamDraft.value) ?? null
      : null
    if (teamDraft.value && !selectedTeam) {
      teamError.value = 'Invalid team.'
      return
    }

    try {
      await updateTeamMutation.mutateAsync({ key: input.ticket.value.key, team: selectedTeam })
      isEditingTeam.value = false
      teamError.value = null
    }
    catch (err) {
      teamError.value = err instanceof Error ? err.message : 'Failed to update team.'
    }
  }

  watch(assigneeSearch, () => {
    assigneeHighlightIndex.value = 0
  })

  watch(input.ticket, (nextTicket) => {
    assigneeDraft.value = nextTicket?.assigneeAccountId ?? '__unassigned__'
    assigneeError.value = null
    isEditingAssignee.value = false
    localAssigneeDraft.value = nextTicket?.assignee === 'Unassigned' ? '' : (nextTicket?.assignee ?? '')
    priorityDraft.value = ''
    priorityDraftLocal.value = nextTicket?.priority ?? ''
    priorityError.value = null
    isEditingPriority.value = false
    teamDraft.value = nextTicket?.team?.id ?? ''
    teamError.value = null
    isEditingTeam.value = false
  }, { immediate: true })

  onUnmounted(() => {
    document.removeEventListener('mousedown', handleAssigneeClickOutside)
  })

  return {
    anyAssigneePending,
    anyPriorityPending,
    anyTeamPending,
    assignableUsersQuery,
    assigneeComboRef,
    assigneeError,
    assigneeHighlightIndex,
    assigneeInputRef,
    assigneeSearch,
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
  }
}
