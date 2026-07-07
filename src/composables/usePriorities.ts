import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchAllPriorities } from '@/api/jira'
import { PRIORITIES_QUERY_KEY } from '@/composables/queryKeys'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function usePriorities(queryEnabled?: Ref<boolean>) {
  return useQuery({
    queryKey: PRIORITIES_QUERY_KEY,
    queryFn: fetchAllPriorities,
    enabled: computed(() => queryEnabled === undefined || queryEnabled.value),
    staleTime: THIRTY_DAYS_MS,
    gcTime: THIRTY_DAYS_MS,
  })
}
