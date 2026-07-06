import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchAvailableTeams } from '@/api/settings'

const FIVE_MINUTES_MS = 5 * 60_000

/** Unfiltered Jira team directory. Shares the cache entry AddSpaceModal uses for an empty search. */
export function useJiraTeams(queryEnabled?: Ref<boolean>) {
  return useQuery({
    queryKey: ['jira-teams', ''] as const,
    queryFn: () => fetchAvailableTeams(),
    enabled: computed(() => queryEnabled === undefined || queryEnabled.value),
    staleTime: FIVE_MINUTES_MS,
  })
}
