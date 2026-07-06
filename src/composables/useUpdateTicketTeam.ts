import type { JiraTeamRef, JiraTicket } from '@/types/jira'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { updateTicketTeam } from '@/api/jira'
import { ticketQueryKey } from '@/composables/useJiraTicket'
import { getCachedTickets, getCachedTicketsQueryKey, TICKETS_QUERY_KEY } from '@/composables/useJiraTickets'

function mergeTicket(tickets: JiraTicket[], updatedTicket: JiraTicket) {
  return tickets.map(ticket => (
    ticket.key === updatedTicket.key
      ? {
          ...ticket,
          ...updatedTicket,
        }
      : ticket
  ))
}

export function useUpdateTicketTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, team }: { key: string, team: JiraTeamRef | null }) =>
      updateTicketTeam(key, team?.id ?? null),
    onMutate: async ({ key, team }) => {
      const ticketsQueryKey = getCachedTicketsQueryKey(queryClient)

      await queryClient.cancelQueries({ queryKey: TICKETS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: ticketQueryKey(key) })

      const previousTickets = getCachedTickets(queryClient)
      const previousTicket = queryClient.getQueryData<JiraTicket>(ticketQueryKey(key))
      const optimisticBaseTicket = previousTicket ?? previousTickets?.find(ticket => ticket.key === key)

      if (previousTickets && optimisticBaseTicket) {
        queryClient.setQueryData<JiraTicket[]>(
          ticketsQueryKey,
          mergeTicket(previousTickets, {
            ...optimisticBaseTicket,
            team: team ?? undefined,
          }),
        )
      }

      if (previousTicket) {
        queryClient.setQueryData<JiraTicket>(ticketQueryKey(key), {
          ...previousTicket,
          team: team ?? undefined,
        })
      }

      return { previousTickets, previousTicket, key, ticketsQueryKey }
    },
    onError: (_err, _variables, context) => {
      if (!context)
        return
      if (context.previousTickets) {
        queryClient.setQueryData(context.ticketsQueryKey, context.previousTickets)
      }
      if (context.previousTicket) {
        queryClient.setQueryData(ticketQueryKey(context.key), context.previousTicket)
      }
    },
    onSuccess: (updatedTicket) => {
      const ticketsQueryKey = getCachedTicketsQueryKey(queryClient)
      const existingTickets = getCachedTickets(queryClient) ?? []
      queryClient.setQueryData(ticketsQueryKey, mergeTicket(existingTickets, updatedTicket))
      queryClient.setQueryData(ticketQueryKey(updatedTicket.key), updatedTicket)
    },
  })
}
