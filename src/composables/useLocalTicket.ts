import type { Ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchLocalTicket } from '@/api/localTickets'
import { getCachedTickets } from '@/composables/useJiraTickets'
import { isLocalTicketKey } from '~/shared/localTickets'

export const localTicketQueryKey = (ticketKey: string | null) => ['local-ticket', ticketKey] as const

export function useLocalTicket(ticketKey: Ref<string | null>) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: computed(() => localTicketQueryKey(ticketKey.value)),
    queryFn: () => {
      const key = ticketKey.value
      if (!key) {
        throw new Error('Ticket key is required')
      }
      return fetchLocalTicket(key)
    },
    enabled: computed(() => Boolean(ticketKey.value && isLocalTicketKey(ticketKey.value))),
    initialData: () => {
      const key = ticketKey.value
      if (!key)
        return undefined

      const tickets = getCachedTickets(queryClient)
      return tickets?.find(ticket => ticket.key === key)
    },
  })
}
