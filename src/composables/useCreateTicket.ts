import type { CreateJiraTicketInput, JiraTicket } from '@/types/jira'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createTicket } from '@/api/jira'
import { ticketQueryKey } from '@/composables/queryKeys'
import { mergeCreatedTicketList } from '@/composables/ticketCache'
import { getCachedTickets, getCachedTicketsQueryKey } from '@/composables/useJiraTickets'

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateJiraTicketInput) => createTicket(input),
    onSuccess: (createdTicket) => {
      const existingTickets = getCachedTickets(queryClient) ?? []
      queryClient.setQueryData<JiraTicket[]>(
        getCachedTicketsQueryKey(queryClient),
        mergeCreatedTicketList(existingTickets, createdTicket),
      )
      queryClient.setQueryData(ticketQueryKey(createdTicket.key), createdTicket)
    },
  })
}
