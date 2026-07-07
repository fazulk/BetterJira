import { updateTicketStatus } from '@/api/jira'
import { updateLocalTicketStatus } from '@/api/localTickets'
import { transitionsQueryKey } from '@/composables/queryKeys'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'
import { isLocalTicketKey } from '~/shared/localTickets'

export function useUpdateTicketStatus() {
  return useTicketFieldMutation({
    mutationFn: ({ key, transitionId }: { key: string, transitionId: string, statusName: string, statusCategory: string }) =>
      isLocalTicketKey(key) ? updateLocalTicketStatus(key, transitionId) : updateTicketStatus(key, transitionId),
    optimistic: (base, { statusName, statusCategory }) => ({ ...base, status: statusName, statusCategory }),
    onSuccessExtra: (updatedTicket, queryClient) => {
      // Available transitions change with status.
      queryClient.invalidateQueries({ queryKey: transitionsQueryKey(updatedTicket.key) })
    },
  })
}
