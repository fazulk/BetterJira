import type { QueryClient } from '@tanstack/vue-query'
import type { AssistantContextRefresher } from './useAssistantSessions'
import type { JiraTicket } from '@/types/jira'
import type { AssistantContext } from '~/shared/assistant'
import { useQueryClient } from '@tanstack/vue-query'
import { fetchTicket } from '@/api/jira'
import { fetchLocalTicket } from '@/api/localTickets'
import { localTicketQueryKey, ticketQueryKey } from './queryKeys'
import { useSpaceSettings } from './useSpaceSettings'
import { getTicketsQueryOptions } from './useTicketsQuery'

export type AssistantViewReader = (tickets: JiraTicket[], queryClient: QueryClient) => Promise<AssistantContext>

export function createAssistantContextRefresher(
  queryClient: QueryClient,
  ticketsOptions: ReturnType<typeof getTicketsQueryOptions>,
  readView?: AssistantViewReader,
): AssistantContextRefresher {
  return async (context, signal) => {
    signal.throwIfAborted()
    const [tickets, ticket] = await Promise.all([
      queryClient.fetchQuery({ ...ticketsOptions, staleTime: 0, retry: false }),
      context.kind === 'ticket'
        ? queryClient.fetchQuery({
            queryKey: context.local ? localTicketQueryKey(context.key) : ticketQueryKey(context.key),
            queryFn: () => context.local ? fetchLocalTicket(context.key) : fetchTicket(context.key),
            staleTime: 0,
            retry: false,
          })
        : undefined,
    ])
    signal.throwIfAborted()
    if (context.kind === 'ticket' && ticket) {
      return { ...context, summary: ticket.summary, snapshot: JSON.stringify({ ...ticket, childTickets: tickets.filter(child => child.parent?.key === context.key) }) }
    }
    if (context.kind === 'view' && readView)
      return readView(tickets, queryClient)
    return context
  }
}

export function useAssistantContextRefresh() {
  const queryClient = useQueryClient()
  const { enabledSpaces, hasJiraCredentialsConfigured } = useSpaceSettings()
  function capture(readView?: AssistantViewReader) {
    return createAssistantContextRefresher(queryClient, getTicketsQueryOptions(enabledSpaces.value, hasJiraCredentialsConfigured.value), readView)
  }
  const refresh: AssistantContextRefresher = (context, signal) => capture()(context, signal)
  return { capture, refresh }
}
