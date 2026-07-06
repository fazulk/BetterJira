import type { QueryClient, QueryKey } from '@tanstack/vue-query'
import type { TicketsPayload } from '@/api/jira'
import type { JiraTicket } from '@/types/jira'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { fetchTickets, refreshCache } from '@/api/jira'
import { fetchLocalTickets } from '@/api/localTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { useToast } from '@/composables/useToast'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'
import { buildEnabledSpaceSearchQuery } from '~/shared/settings'
import { isRecord } from '~/shared/typeGuards'

export const TICKETS_QUERY_KEY = ['tickets'] as const
const TICKETS_QUERY_SCHEMA_VERSION = 'labels-v1'

export function ticketsQueryKey(spaceKeys: readonly string[]): QueryKey {
  return [...TICKETS_QUERY_KEY, TICKETS_QUERY_SCHEMA_VERSION, ...spaceKeys]
}

function isTicketsQueryKey(queryKey: QueryKey): boolean {
  return queryKey.length > 0 && queryKey[0] === TICKETS_QUERY_KEY[0]
}

export function getCachedTicketsQueryKey(queryClient: QueryClient): QueryKey {
  const ticketQueries = queryClient.getQueryCache()
    .findAll({ queryKey: TICKETS_QUERY_KEY })
    .filter(query => isTicketsQueryKey(query.queryKey))

  const [firstTicketQuery, ...remainingTicketQueries] = ticketQueries
  if (!firstTicketQuery) {
    return TICKETS_QUERY_KEY
  }

  return remainingTicketQueries.reduce((latestQuery, query) => (
    query.state.dataUpdatedAt > latestQuery.state.dataUpdatedAt
      ? query
      : latestQuery
  ), firstTicketQuery).queryKey
}

export function getCachedTickets(queryClient: QueryClient): JiraTicket[] | undefined {
  return queryClient.getQueryData<JiraTicket[]>(getCachedTicketsQueryKey(queryClient))
}

function isTicketsPayload(value: unknown): value is TicketsPayload {
  return isRecord(value) && Array.isArray(value.tickets)
}

function isJiraTicketPayload(value: unknown): value is JiraTicket {
  return isRecord(value) && typeof value.key === 'string'
}

function mergeJiraAndLocalTickets(jiraTickets: JiraTicket[], localTickets: JiraTicket[]): JiraTicket[] {
  const byKey = new Map<string, JiraTicket>()
  for (const ticket of jiraTickets) {
    byKey.set(ticket.key, ticket)
  }

  for (const ticket of localTickets) {
    byKey.set(ticket.key, ticket)
  }

  return [...byKey.values()].sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0
    return rightTime - leftTime
  })
}

export function getLatestRemoteUpdatedAt(tickets: JiraTicket[]): string | undefined {
  let latestTimestamp = -1
  let latestUpdatedAt: string | undefined

  for (const ticket of tickets) {
    if (ticket.spaceKey === LOCAL_SPACE_KEY || !ticket.updatedAt) {
      continue
    }

    const parsedTimestamp = Date.parse(ticket.updatedAt)
    if (Number.isNaN(parsedTimestamp) || parsedTimestamp <= latestTimestamp) {
      continue
    }

    latestTimestamp = parsedTimestamp
    latestUpdatedAt = ticket.updatedAt
  }

  return latestUpdatedAt
}

export function applyTicketsPayloadToQueryCache(
  queryClient: QueryClient,
  queryKey: QueryKey,
  payload: TicketsPayload,
  includeLocalTickets: boolean,
): void {
  if (!Array.isArray(payload.tickets)) {
    return
  }

  const current = queryClient.getQueryData<JiraTicket[]>(queryKey) ?? []
  const localTickets = includeLocalTickets
    ? current.filter(ticket => ticket.spaceKey === LOCAL_SPACE_KEY)
    : []
  const currentRemoteTickets = current.filter(ticket => ticket.spaceKey !== LOCAL_SPACE_KEY)
  const nextRemoteTickets = payload.mode === 'incremental'
    ? mergeJiraAndLocalTickets(currentRemoteTickets, payload.tickets)
    : payload.tickets

  queryClient.setQueryData(queryKey, mergeJiraAndLocalTickets(nextRemoteTickets, localTickets))
}

export function useJiraTickets() {
  const queryClient = useQueryClient()
  const { enabledSpaces, hasJiraCredentialsConfigured } = useSpaceSettings()
  const { showError } = useToast()
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  const refreshingFromSSE = ref(false)
  let eventSource: EventSource | null = null
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null
  const enabledSpaceKeys = computed(() => [...enabledSpaces.value.map(space => space.key)].sort())
  const activeTicketsQueryKey = computed(() => ticketsQueryKey(enabledSpaceKeys.value))

  const ticketsQuery = useQuery({
    queryKey: activeTicketsQueryKey,
    refetchOnMount: false,
    queryFn: async () => {
      const localTickets = enabledSpaceKeys.value.includes(LOCAL_SPACE_KEY) ? await fetchLocalTickets() : []
      if (!hasJiraCredentialsConfigured.value) {
        return mergeJiraAndLocalTickets([], localTickets)
      }

      const jql = buildEnabledSpaceSearchQuery(enabledSpaces.value)
      const jiraTickets = jql ? await fetchTickets({ jql }) : []
      return mergeJiraAndLocalTickets(jiraTickets, localTickets)
    },
  })

  watch(ticketsQuery.data, (data) => {
    if (!data)
      return
    lastUpdated.value = new Date()
    error.value = null
  }, { immediate: true })

  watch(ticketsQuery.error, (err) => {
    if (!err)
      return
    const message = err instanceof Error ? err.message : 'Failed to load tickets'
    error.value = message
    showError(message)
  }, { immediate: true })

  const tickets = computed(() => ticketsQuery.data.value ?? [])

  const groupedByStatus = computed(() => {
    const groups: Record<string, JiraTicket[]> = {}
    for (const t of tickets.value) {
      const key = t.status
      if (!groups[key])
        groups[key] = []
      groups[key].push(t)
    }
    return groups
  })

  const loading = computed(() => ticketsQuery.isLoading.value)
  const fetching = computed(() => ticketsQuery.isFetching.value)

  function clearRefreshTimeout() {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout)
      refreshTimeout = null
    }
  }

  function stopRefreshing() {
    refreshingFromSSE.value = false
    clearRefreshTimeout()
  }

  function startRefreshTimeout() {
    clearRefreshTimeout()
    refreshTimeout = setTimeout(async () => {
      if (!refreshingFromSSE.value)
        return

      console.warn('Refresh timed out, falling back to direct fetch')
      try {
        await queryClient.fetchQuery({
          queryKey: activeTicketsQueryKey.value,
          queryFn: async () => {
            const localTickets = enabledSpaceKeys.value.includes(LOCAL_SPACE_KEY) ? await fetchLocalTickets() : []
            if (!hasJiraCredentialsConfigured.value) {
              return mergeJiraAndLocalTickets([], localTickets)
            }

            const jql = buildEnabledSpaceSearchQuery(enabledSpaces.value)
            const jiraTickets = jql ? await fetchTickets({ jql }) : []
            return mergeJiraAndLocalTickets(jiraTickets, localTickets)
          },
        })
      }
      catch {
        error.value = 'Refresh timed out'
      }
      finally {
        stopRefreshing()
      }
    }, 15_000)
  }

  const refreshMutation = useMutation({
    mutationFn: refreshCache,
    onMutate: () => {
      error.value = null
    },
    onSuccess: (payload) => {
      applyTicketsPayload(payload)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Refresh failed'
      error.value = message
      showError(message)
      stopRefreshing()
    },
  })

  const refreshing = computed(() => refreshMutation.isPending.value || refreshingFromSSE.value)

  async function refresh() {
    if (refreshing.value)
      return
    if (!hasJiraCredentialsConfigured.value) {
      await queryClient.invalidateQueries({
        queryKey: activeTicketsQueryKey.value,
      })
      return
    }

    try {
      const updatedSince = getLatestRemoteUpdatedAt(queryClient.getQueryData<JiraTicket[]>(activeTicketsQueryKey.value) ?? [])
      await refreshMutation.mutateAsync(updatedSince ? { updatedSince } : {})
    }
    catch {
      // handled by onError in mutation
    }
  }

  function applyTicketsPayload(payload: TicketsPayload) {
    applyTicketsPayloadToQueryCache(
      queryClient,
      activeTicketsQueryKey.value,
      payload,
      enabledSpaceKeys.value.includes(LOCAL_SPACE_KEY),
    )
    lastUpdated.value = payload.updatedAt ? new Date(payload.updatedAt) : new Date()
    stopRefreshing()
  }

  function applySseError(message?: string) {
    const nextMessage = message || 'Refresh failed'
    error.value = nextMessage
    showError(nextMessage)
    stopRefreshing()
  }

  function mergeUpdatedTicket(updatedTicket: JiraTicket) {
    queryClient.setQueryData<JiraTicket[]>(activeTicketsQueryKey.value, (current = []) =>
      current.map((ticket) => {
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
      }))

    queryClient.setQueryData(['ticket', updatedTicket.key], updatedTicket)
  }

  function mergeCreatedTicket(createdTicket: JiraTicket) {
    queryClient.setQueryData<JiraTicket[]>(activeTicketsQueryKey.value, (current = []) => {
      const existingIndex = current.findIndex(ticket => ticket.key === createdTicket.key)
      if (existingIndex === -1) {
        return [...current, createdTicket]
      }

      return current.map((ticket) => {
        if (ticket.key === createdTicket.key) {
          return {
            ...ticket,
            ...createdTicket,
          }
        }

        if (ticket.parent?.key === createdTicket.key) {
          return {
            ...ticket,
            parent: {
              ...ticket.parent,
              summary: createdTicket.summary,
              issueType: createdTicket.issueType,
            },
          }
        }

        return ticket
      })
    })

    queryClient.setQueryData(['ticket', createdTicket.key], createdTicket)
  }

  function connectSSE() {
    eventSource = new EventSource('/api/events')

    eventSource.addEventListener('tickets', (e) => {
      try {
        const payload: unknown = JSON.parse(e.data)
        if (!isTicketsPayload(payload)) {
          throw new TypeError('Invalid tickets payload')
        }
        applyTicketsPayload(payload)
      }
      catch {
        applySseError('Failed to parse ticket update')
      }
    })

    eventSource.addEventListener('refreshing', () => {
      refreshingFromSSE.value = true
      startRefreshTimeout()
    })

    eventSource.addEventListener('ticket-updated', (e) => {
      try {
        const updatedTicket: unknown = JSON.parse(e.data)
        if (!isJiraTicketPayload(updatedTicket)) {
          throw new TypeError('Invalid ticket payload')
        }
        mergeUpdatedTicket(updatedTicket)
      }
      catch {
        applySseError('Failed to parse ticket update')
      }
    })

    eventSource.addEventListener('ticket-created', (e) => {
      try {
        const createdTicket: unknown = JSON.parse(e.data)
        if (!isJiraTicketPayload(createdTicket)) {
          throw new TypeError('Invalid ticket payload')
        }
        mergeCreatedTicket(createdTicket)
      }
      catch {
        applySseError('Failed to parse ticket create')
      }
    })

    eventSource.addEventListener('error', (e) => {
      if (e instanceof MessageEvent) {
        try {
          const payload: unknown = JSON.parse(e.data)
          applySseError(isRecord(payload) && typeof payload.message === 'string' ? payload.message : undefined)
        }
        catch {
          applySseError('Refresh failed')
        }
      }

      if (eventSource?.readyState === EventSource.CLOSED) {
        stopRefreshing()
        setTimeout(connectSSE, 3000)
      }
    })
  }

  function disconnectSSE() {
    eventSource?.close()
    eventSource = null
  }

  onMounted(() => {
    connectSSE()
  })

  onUnmounted(() => {
    disconnectSSE()
    clearRefreshTimeout()
  })

  return {
    tickets,
    groupedByStatus,
    loading,
    fetching,
    refreshing,
    error,
    lastUpdated,
    refresh,
  }
}
