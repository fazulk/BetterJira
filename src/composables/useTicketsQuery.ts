import type { AppSpaceSetting } from '~/shared/settings'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchTickets } from '@/api/jira'
import { fetchLocalTickets } from '@/api/localTickets'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'
import { buildEnabledSpaceSearchQuery } from '~/shared/settings'
import { ticketsQueryKey } from './queryKeys'
import { mergeJiraAndLocalTickets } from './ticketCache'
import { useSpaceSettings } from './useSpaceSettings'

export function getTicketsQueryOptions(spaces: readonly AppSpaceSetting[], hasJiraCredentials: boolean) {
  const keys = spaces.map(space => space.key).sort()
  const jql = hasJiraCredentials ? buildEnabledSpaceSearchQuery(spaces) : null
  return {
    queryKey: ticketsQueryKey(keys),
    refetchOnMount: false as const,
    queryFn: async () => {
      const [remote, local] = await Promise.all([
        jql ? fetchTickets({ jql }) : [],
        keys.includes(LOCAL_SPACE_KEY) ? fetchLocalTickets() : [],
      ])
      return mergeJiraAndLocalTickets(remote, local)
    },
  }
}

export function useTicketsQuery() {
  const { enabledSpaces, hasJiraCredentialsConfigured } = useSpaceSettings()
  return useQuery(computed(() => getTicketsQueryOptions(enabledSpaces.value, hasJiraCredentialsConfigured.value)))
}
