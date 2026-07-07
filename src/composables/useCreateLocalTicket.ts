import type { CreateLocalTicketInput } from '@/api/localTickets'
import type { JiraTicket } from '@/types/jira'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createLocalTicket } from '@/api/localTickets'
import { localTicketQueryKey } from '@/composables/queryKeys'
import { getCachedTickets, getCachedTicketsQueryKey } from '@/composables/useJiraTickets'

export function useCreateLocalTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateLocalTicketInput) => createLocalTicket(input),
    onSuccess: (createdTicket) => {
      const ticketsQueryKey = getCachedTicketsQueryKey(queryClient)
      const existing = getCachedTickets(queryClient) ?? []
      const existingIndex = existing.findIndex(t => t.key === createdTicket.key)
      const nextList = existingIndex === -1
        ? [...existing, createdTicket]
        : existing.map(t => (t.key === createdTicket.key ? createdTicket : t))
      queryClient.setQueryData<JiraTicket[]>(ticketsQueryKey, nextList)
      queryClient.setQueryData(localTicketQueryKey(createdTicket.key), createdTicket)
    },
  })
}
