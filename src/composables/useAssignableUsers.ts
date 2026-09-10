import type { QueryClient } from '@tanstack/vue-query'
import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { computed } from 'vue'
import { fetchAssignableUsers } from '@/api/jira'

const ASSIGNEES_QUERY_KEY = ['ticket-assignees-v2'] as const
const TWO_MINUTES_MS = 2 * 60_000

export const assignableUsersQueryKey = (ticketKey: string | null, query = '') => [...ASSIGNEES_QUERY_KEY, ticketKey, query] as const

export async function resetAssignableUsersCache(queryClient: QueryClient): Promise<void> {
  await queryClient.cancelQueries({ queryKey: ASSIGNEES_QUERY_KEY })
  queryClient.removeQueries({ queryKey: ['ticket-assignees'] })
  await queryClient.resetQueries({ queryKey: ASSIGNEES_QUERY_KEY })
}

export function useAssignableUsers(
  ticketKey: Ref<string | null>,
  options?: { queryEnabled?: Ref<boolean>, search?: Ref<string> },
) {
  const search = computed(() => options?.search?.value.trim().toLowerCase() ?? '')
  const debouncedSearch = refDebounced(search, 250)
  const isDebouncing = computed(() => search.value !== debouncedSearch.value)
  const query = useQuery({
    queryKey: computed(() => assignableUsersQueryKey(ticketKey.value, debouncedSearch.value)),
    queryFn: ({ queryKey }) => {
      const [, key, query] = queryKey
      if (!key)
        throw new Error('Ticket key is required')
      return fetchAssignableUsers(key, query)
    },
    enabled: computed(() => Boolean(ticketKey.value) && (options?.queryEnabled?.value ?? true)),
    staleTime: TWO_MINUTES_MS,
    gcTime: TWO_MINUTES_MS,
    retry: false,
  })

  return {
    ...query,
    // A changed input must not leave results from the previous search selectable.
    data: computed(() => isDebouncing.value || query.isError.value ? undefined : query.data.value),
    error: computed(() => isDebouncing.value ? null : query.error.value),
    isSearchPending: computed(() => isDebouncing.value || query.isFetching.value),
  }
}
