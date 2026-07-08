import type { Ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchTicket } from '@/api/jira'
import { ticketQueryKey } from '@/composables/queryKeys'
import { getCachedTickets } from '@/composables/useJiraTickets'

export function useJiraTicket(
  ticketKey: Ref<string | null>,
  options?: { queryEnabled?: Ref<boolean> },
) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: computed(() => ticketQueryKey(ticketKey.value)),
    queryFn: () => {
      const key = ticketKey.value
      if (!key) {
        throw new Error('Ticket key is required')
      }
      return fetchTicket(key)
    },
    enabled: computed(() => {
      if (!ticketKey.value)
        return false
      if (options?.queryEnabled && !options.queryEnabled.value)
        return false
      return true
    }),
    // placeholderData (not initialData): the list entry lacks detail-only
    // fields like description/attachments, so it must never count as fresh
    // data or be persisted — only bridge the gap while the real fetch runs.
    placeholderData: () => {
      const key = ticketKey.value
      if (!key)
        return undefined

      const tickets = getCachedTickets(queryClient)
      return tickets?.find(ticket => ticket.key === key)
    },
  })
}
