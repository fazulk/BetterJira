import { updateTicketPriority } from '@/api/jira'
import { updateLocalTicketPriority } from '@/api/localTickets'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'
import { isLocalTicketKey } from '~/shared/localTickets'

export function useUpdateTicketPriority() {
  return useTicketFieldMutation({
    // priorityId identifies the Jira priority; local tickets are keyed by name.
    mutationFn: ({ key, priorityId, priorityName }: { key: string, priorityName: string, priorityId?: string }) => {
      if (isLocalTicketKey(key))
        return updateLocalTicketPriority(key, priorityName)
      if (!priorityId)
        return Promise.reject(new Error('priorityId is required for Jira tickets'))
      return updateTicketPriority(key, priorityId)
    },
    optimistic: (base, { priorityName }) => ({ ...base, priority: priorityName }),
  })
}
