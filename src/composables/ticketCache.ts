import type { QueryKey } from '@tanstack/vue-query'
import type { JiraTicket } from '@/types/jira'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { isLocalTicketKey } from '~/shared/localTickets'

/**
 * Canonical list-cache merge for a ticket update: the matching entry gets a
 * shallow merge, and entries whose parent matches get their parent summary
 * and issue type refreshed. Semantics are locked by tests/cache-merge.test.ts.
 */
export function mergeTicketList(tickets: JiraTicket[], updatedTicket: JiraTicket): JiraTicket[] {
  return tickets.map((ticket) => {
    if (ticket.key === updatedTicket.key) {
      return {
        ...ticket,
        ...updatedTicket,
      }
    }

    if (ticket.parent?.key === updatedTicket.key) {
      return {
        ...ticket,
        parent: {
          ...ticket.parent,
          summary: updatedTicket.summary,
          issueType: updatedTicket.issueType,
        },
      }
    }

    return ticket
  })
}

/** List merge for a created ticket: canonical merge, appending when absent. */
export function mergeCreatedTicketList(tickets: JiraTicket[], createdTicket: JiraTicket): JiraTicket[] {
  if (!tickets.some(ticket => ticket.key === createdTicket.key)) {
    return [...tickets, createdTicket]
  }
  return mergeTicketList(tickets, createdTicket)
}

/** Detail-cache key for a ticket, dispatching on local vs Jira key. */
export function detailTicketQueryKey(key: string): QueryKey {
  return isLocalTicketKey(key) ? localTicketQueryKey(key) : ticketQueryKey(key)
}
