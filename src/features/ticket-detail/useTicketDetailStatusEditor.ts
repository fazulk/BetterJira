import type { Ref } from 'vue'
import type { JiraTicket } from '@/types/jira'
import { computed, ref, watch } from 'vue'
import { useTransitions } from '@/composables/useTransitions'
import { useUpdateTicketStatus } from '@/composables/useUpdateTicketStatus'
import { getTransitionStatusName } from '@/types/jira'
import { getLocalStatusIdFromDisplayName, getLocalTransitions } from '~/shared/localTickets'

interface TicketDetailStatusEditorInput {
  isLocalTicket: Ref<boolean>
  jiraDataEnabled: Ref<boolean>
  ticket: Ref<JiraTicket | null>
  ticketKey: Ref<string | null>
}

export function useTicketDetailStatusEditor(input: TicketDetailStatusEditorInput) {
  const transitionsQuery = useTransitions(input.ticketKey, { queryEnabled: input.jiraDataEnabled })
  const updateStatusMutation = useUpdateTicketStatus()
  const isEditingStatus = ref(false)
  const statusDraft = ref('')
  const statusError = ref<string | null>(null)

  const localTransitionsList = computed(() => {
    if (!input.ticket.value || !input.isLocalTicket.value)
      return []
    const currentId = getLocalStatusIdFromDisplayName(input.ticket.value.status)
    return getLocalTransitions(currentId)
  })

  const anyStatusPending = computed(() => updateStatusMutation.isPending.value)

  async function startEditingStatus() {
    if (!input.ticket.value || anyStatusPending.value)
      return
    statusDraft.value = ''
    statusError.value = null
    isEditingStatus.value = true

    if (input.isLocalTicket.value)
      return

    if (!transitionsQuery.data.value && !transitionsQuery.isFetching.value) {
      try {
        await transitionsQuery.refetch()
      }
      catch {
        statusError.value = 'Failed to load transitions.'
      }
    }
  }

  function cancelEditingStatus() {
    statusDraft.value = ''
    statusError.value = null
    isEditingStatus.value = false
  }

  async function saveStatus() {
    if (!input.ticket.value || anyStatusPending.value)
      return

    if (!statusDraft.value) {
      statusError.value = 'Select a status.'
      return
    }

    const selectedTransition = input.isLocalTicket.value
      ? localTransitionsList.value.find(transition => transition.id === statusDraft.value)
      : transitionsQuery.data.value?.find(transition => transition.id === statusDraft.value)
    if (!selectedTransition) {
      statusError.value = 'Invalid transition.'
      return
    }

    try {
      await updateStatusMutation.mutateAsync({
        key: input.ticket.value.key,
        transitionId: selectedTransition.id,
        // Optimistic status is the destination status, not the transition (button) label.
        // Local transitions already expose statusName; remote ones do too (with fallback).
        statusName: getTransitionStatusName(selectedTransition),
        statusCategory: selectedTransition.statusCategory,
      })
      isEditingStatus.value = false
      statusError.value = null
    }
    catch (err) {
      statusError.value = err instanceof Error ? err.message : 'Failed to update status.'
    }
  }

  watch(input.ticket, () => {
    statusDraft.value = ''
    statusError.value = null
    isEditingStatus.value = false
  }, { immediate: true })

  return {
    anyStatusPending,
    cancelEditingStatus,
    isEditingStatus,
    localTransitionsList,
    saveStatus,
    startEditingStatus,
    statusDraft,
    statusError,
    transitionsQuery,
  }
}
