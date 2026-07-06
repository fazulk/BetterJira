import type { Ref } from 'vue'
import type { JiraAssignableUser } from '@/types/jira'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchAssignableUsers } from '@/api/jira'

export const assignableUsersQueryKey = (ticketKey: string | null) => ['ticket-assignees', ticketKey] as const
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

export function useAssignableUsers(
  ticketKey: Ref<string | null>,
  options?: { queryEnabled?: Ref<boolean> },
) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: computed(() => assignableUsersQueryKey(ticketKey.value)),
    queryFn: () => {
      const key = ticketKey.value
      if (!key) {
        throw new Error('Ticket key is required')
      }
      return fetchAssignableUsers(key)
    },
    enabled: computed(() => {
      if (!ticketKey.value)
        return false
      if (options?.queryEnabled && !options.queryEnabled.value)
        return false
      return true
    }),
    initialData: () => {
      const key = ticketKey.value
      if (!key)
        return undefined
      return queryClient.getQueryData<JiraAssignableUser[]>(assignableUsersQueryKey(key))
    },
    initialDataUpdatedAt: () => {
      const key = ticketKey.value
      if (!key)
        return undefined
      return queryClient.getQueryState(assignableUsersQueryKey(key))?.dataUpdatedAt
    },
    staleTime: TWO_DAYS_MS,
    gcTime: TWO_DAYS_MS,
  })
}
