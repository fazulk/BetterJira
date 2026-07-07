import type { QueryClient, QueryKey } from '@tanstack/vue-query'
import type { JiraTicket } from '@/types/jira'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { TICKETS_QUERY_KEY } from '@/composables/queryKeys'
import { detailTicketQueryKey, mergeTicketList } from '@/composables/ticketCache'
import { getCachedTickets, getCachedTicketsQueryKey } from '@/composables/useJiraTickets'

export function applyTicketUpdateToCaches(queryClient: QueryClient, updatedTicket: JiraTicket): void {
  const listQueryKey = getCachedTicketsQueryKey(queryClient)
  const existingTickets = getCachedTickets(queryClient) ?? []
  queryClient.setQueryData(listQueryKey, mergeTicketList(existingTickets, updatedTicket))
  queryClient.setQueryData(detailTicketQueryKey(updatedTicket.key), updatedTicket)
}

interface TicketFieldMutationConfig<TVars extends { key: string }> {
  mutationFn: (vars: TVars) => Promise<JiraTicket>
  /**
   * Optimistic patch applied to the cached ticket while the mutation is in
   * flight. Omit for onSuccess-only mutations (e.g. labels).
   */
  optimistic?: (base: JiraTicket, vars: TVars) => JiraTicket
  /**
   * Whether the optimistic patch is also written into the tickets list cache
   * (default true). The description mutation only patches the detail cache.
   */
  optimisticUpdatesList?: boolean
  /** Extra cache work after a successful mutation (e.g. invalidations). */
  onSuccessExtra?: (updatedTicket: JiraTicket, queryClient: QueryClient) => void
}

interface TicketFieldMutationContext {
  previousTickets: JiraTicket[] | undefined
  previousTicket: JiraTicket | undefined
  detailQueryKey: QueryKey
  listQueryKey: QueryKey
}

/**
 * Shared optimistic-update/rollback/cache-merge shell for single-ticket field
 * mutations. Handles both local and Jira tickets via key dispatch.
 */
export function useTicketFieldMutation<TVars extends { key: string }>(
  config: TicketFieldMutationConfig<TVars>,
) {
  const queryClient = useQueryClient()
  const { optimistic } = config

  return useMutation({
    mutationFn: config.mutationFn,
    onMutate: optimistic
      ? async (vars: TVars): Promise<TicketFieldMutationContext> => {
        const detailQueryKey = detailTicketQueryKey(vars.key)
        const listQueryKey = getCachedTicketsQueryKey(queryClient)

        await queryClient.cancelQueries({ queryKey: TICKETS_QUERY_KEY })
        await queryClient.cancelQueries({ queryKey: detailQueryKey })

        const previousTickets = getCachedTickets(queryClient)
        const previousTicket = queryClient.getQueryData<JiraTicket>(detailQueryKey)
        const optimisticBaseTicket = previousTicket ?? previousTickets?.find(ticket => ticket.key === vars.key)

        if (config.optimisticUpdatesList !== false && previousTickets && optimisticBaseTicket) {
          queryClient.setQueryData<JiraTicket[]>(
            listQueryKey,
            mergeTicketList(previousTickets, optimistic(optimisticBaseTicket, vars)),
          )
        }

        if (previousTicket) {
          queryClient.setQueryData<JiraTicket>(detailQueryKey, optimistic(previousTicket, vars))
        }

        return { previousTickets, previousTicket, detailQueryKey, listQueryKey }
      }
      : undefined,
    onError: (_err: Error, _vars: TVars, context: TicketFieldMutationContext | undefined) => {
      if (!context)
        return
      if (context.previousTickets) {
        queryClient.setQueryData(context.listQueryKey, context.previousTickets)
      }
      if (context.previousTicket) {
        queryClient.setQueryData(context.detailQueryKey, context.previousTicket)
      }
    },
    onSuccess: (updatedTicket: JiraTicket) => {
      applyTicketUpdateToCaches(queryClient, updatedTicket)
      config.onSuccessExtra?.(updatedTicket, queryClient)
    },
  })
}
