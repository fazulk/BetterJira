import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchTicketDevStatus } from '@/api/jira'

export const ticketDevStatusQueryKey = (ticketKey: string | null) => ['ticket-dev-status', ticketKey] as const

export function useTicketDevStatus(ticketKey: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ticketDevStatusQueryKey(ticketKey.value)),
    queryFn: async () => {
      const key = ticketKey.value
      if (!key) {
        throw new Error('Ticket key is required.')
      }

      return fetchTicketDevStatus(key)
    },
    enabled: computed(() => !!ticketKey.value),
    staleTime: 60 * 1000,
  })
}
