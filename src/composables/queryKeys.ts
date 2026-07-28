import type { QueryKey } from '@tanstack/vue-query'

export const TICKETS_QUERY_KEY = ['tickets'] as const
export const TICKETS_QUERY_SCHEMA_VERSION = 'story-points-v2'

export function ticketsQueryKey(spaceKeys: readonly string[]): QueryKey {
  return [...TICKETS_QUERY_KEY, TICKETS_QUERY_SCHEMA_VERSION, ...spaceKeys]
}

export const ticketQueryKey = (ticketKey: string | null) => ['ticket', ticketKey] as const

export const localTicketQueryKey = (ticketKey: string | null) => ['local-ticket', ticketKey] as const

export const transitionsQueryKey = (ticketKey: string | null) => ['ticket-transitions', ticketKey] as const

export const PRIORITIES_QUERY_KEY = ['priorities'] as const
