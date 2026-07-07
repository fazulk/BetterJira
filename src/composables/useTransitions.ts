import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchTransitions } from '@/api/jira'
import { transitionsQueryKey } from '@/composables/queryKeys'

export function useTransitions(
  ticketKey: Ref<string | null>,
  options?: { queryEnabled?: Ref<boolean> },
) {
  return useQuery({
    queryKey: computed(() => transitionsQueryKey(ticketKey.value)),
    queryFn: () => {
      const key = ticketKey.value
      if (!key) {
        throw new Error('Ticket key is required')
      }
      return fetchTransitions(key)
    },
    enabled: computed(() => {
      if (!ticketKey.value)
        return false
      if (options?.queryEnabled && !options.queryEnabled.value)
        return false
      return true
    }),
    staleTime: 20_000,
  })
}
