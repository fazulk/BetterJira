import type { JiraTicket } from '@/types/jira'
import { updateTicketWatching } from '@/api/jira'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'

function getOptimisticWatchCount(ticket: JiraTicket, watching: boolean): number | undefined {
  if (typeof ticket.watchCount !== 'number')
    return undefined

  if (watching && ticket.isWatching !== true) {
    return ticket.watchCount + 1
  }

  if (!watching && ticket.isWatching === true) {
    return Math.max(0, ticket.watchCount - 1)
  }

  return ticket.watchCount
}

export function useUpdateTicketWatching() {
  return useTicketFieldMutation({
    mutationFn: ({ key, watching }: { key: string, watching: boolean }) =>
      updateTicketWatching(key, watching),
    optimistic: (base, { watching }) => {
      const watchCount = getOptimisticWatchCount(base, watching)
      return {
        ...base,
        isWatching: watching,
        ...(typeof watchCount === 'number' ? { watchCount } : {}),
      }
    },
  })
}
