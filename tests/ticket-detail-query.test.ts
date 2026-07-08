/**
 * Regression tests for the intermittent "missing description" bug.
 *
 * The ticket detail query is seeded from the ticket LIST cache, whose entries
 * omit `description`/`attachments`. Seeding via `initialData` made TanStack
 * Query treat that partial ticket as FRESH data (dataUpdatedAt = now), so with
 * the app's 20s staleTime the real detail fetch never fired and the ticket
 * rendered without its description.
 */
import type { JiraTicket } from '@/types/jira'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, effectScope, ref } from 'vue'
import { ticketsQueryKey } from '@/composables/queryKeys'
import { useJiraTicket } from '@/composables/useJiraTicket'

const fetchTicket = vi.hoisted(() => vi.fn())

vi.mock('@/api/jira', async importOriginal => ({
  ...(await importOriginal<typeof import('@/api/jira')>()),
  fetchTicket,
}))

function makeTicket(overrides: Partial<JiraTicket> & { key: string }): JiraTicket {
  return {
    summary: `Summary for ${overrides.key}`,
    status: 'To Do',
    statusCategory: 'new',
    inCurrentSprint: false,
    priority: 'Medium',
    issueType: 'Task',
    labels: [],
    spaceKey: 'SPACE',
    spaceName: 'Space',
    assignee: 'nobody',
    self: `https://jira.example.com/browse/${overrides.key}`,
    ...overrides,
  }
}

// Mirrors the app's real defaults in plugins/vue-query.client.ts — the bug
// only manifests with a non-zero staleTime.
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  })
}

const cleanups: Array<() => void> = []

function runComposable<T>(queryClient: QueryClient, fn: () => T): T {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  let result!: T
  app.runWithContext(() => {
    result = scope.run(fn) as T
  })
  cleanups.push(() => {
    scope.stop()
    queryClient.clear()
  })
  return result
}

afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  fetchTicket.mockReset()
})

describe('useJiraTicket', () => {
  it('fetches the full ticket even when the list cache holds a partial entry', async () => {
    const queryClient = makeQueryClient()
    queryClient.setQueryData(ticketsQueryKey(['SPACE']), [makeTicket({ key: 'T-1' })])
    fetchTicket.mockResolvedValue(makeTicket({ key: 'T-1', description: 'full description' }))

    const query = runComposable(queryClient, () => useJiraTicket(ref('T-1')))

    // Instant display from the list cache is preserved...
    expect(query.data.value?.summary).toBe('Summary for T-1')

    // ...but the detail fetch must still fire and fill in the missing fields.
    await vi.waitFor(() => expect(fetchTicket).toHaveBeenCalledWith('T-1'))
    await vi.waitFor(() => expect(query.data.value?.description).toBe('full description'))
  })

  it('does not write the partial list entry into the detail query cache', async () => {
    const queryClient = makeQueryClient()
    queryClient.setQueryData(ticketsQueryKey(['SPACE']), [makeTicket({ key: 'T-1' })])
    let resolveFetch!: (ticket: JiraTicket) => void
    fetchTicket.mockReturnValue(new Promise<JiraTicket>((resolve) => {
      resolveFetch = resolve
    }))

    runComposable(queryClient, () => useJiraTicket(ref('T-1')))

    // While the detail fetch is in flight, the cache (which gets persisted to
    // localStorage) must not contain the description-less list entry.
    expect(queryClient.getQueryData(['ticket', 'T-1'])).toBeUndefined()
    resolveFetch(makeTicket({ key: 'T-1', description: 'full description' }))
    await vi.waitFor(() => expect(queryClient.getQueryData(['ticket', 'T-1'])).toBeDefined())
  })
})
