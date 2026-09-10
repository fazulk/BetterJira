import type { JiraAssignableUser } from '@/types/jira'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, effectScope, nextTick, ref } from 'vue'
import { assignableUsersQueryKey, resetAssignableUsersCache, useAssignableUsers } from '@/composables/useAssignableUsers'

const fetchAssignableUsers = vi.hoisted(() => vi.fn())
vi.mock('@/api/jira', () => ({ fetchAssignableUsers }))

const jeff = { accountId: 'jeff', displayName: 'Jeff Fasulkey' }
const cleanups: Array<() => void> = []

function setup(initialSearch = '', queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const ticketKey = ref<string | null>('LMD-1569')
  const search = ref(initialSearch)
  const enabled = ref(true)
  const query = app.runWithContext(() => scope.run(() => useAssignableUsers(ticketKey, { search, queryEnabled: enabled })))!
  cleanups.push(() => {
    scope.stop()
    queryClient.clear()
  })
  return { query, search, ticketKey, enabled, queryClient }
}

afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  fetchAssignableUsers.mockReset()
  vi.useRealTimers()
})

describe('ticket assignee search', () => {
  it('replaces the legacy cached list with issue-specific suggestions', async () => {
    const client = new QueryClient()
    client.setQueryData(['ticket-assignees', 'LMD-1569'], [])
    fetchAssignableUsers.mockResolvedValue([jeff])
    const { query } = setup('', client)
    await vi.waitFor(() => expect(query.data.value).toEqual([jeff]))
    expect(fetchAssignableUsers).toHaveBeenCalledExactlyOnceWith('LMD-1569', '')
  })

  it('debounces typing and hides earlier options before the new request starts', async () => {
    vi.useFakeTimers()
    fetchAssignableUsers.mockResolvedValue([jeff])
    const { query, search } = setup()
    await vi.advanceTimersByTimeAsync(0)
    expect(query.data.value).toEqual([jeff])
    search.value = 'Je'
    await nextTick()
    expect(query.data.value).toBeUndefined()
    expect(query.isSearchPending.value).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    search.value = ' Jeff '
    await nextTick()
    await vi.advanceTimersByTimeAsync(249)
    expect(fetchAssignableUsers).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchAssignableUsers).toHaveBeenLastCalledWith('LMD-1569', 'jeff')
    expect(query.data.value).toEqual([jeff])
  })

  it('ignores a slow response after the search or ticket changes', async () => {
    vi.useFakeTimers()
    let resolveOld!: (users: JiraAssignableUser[]) => void
    fetchAssignableUsers.mockImplementationOnce(() => new Promise<JiraAssignableUser[]>((resolve) => {
      resolveOld = resolve
    }))
    const { query, search, ticketKey } = setup('slow')
    fetchAssignableUsers.mockResolvedValue([jeff])
    search.value = 'Jeff'
    await nextTick()
    await vi.advanceTimersByTimeAsync(250)
    expect(query.data.value).toEqual([jeff])
    ticketKey.value = 'LMD-1570'
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)
    resolveOld([{ accountId: 'old', displayName: 'Old result' }])
    await vi.advanceTimersByTimeAsync(0)
    expect(query.data.value).toEqual([jeff])
    expect(fetchAssignableUsers).toHaveBeenLastCalledWith('LMD-1570', 'jeff')
  })

  it('exposes an error and supports an explicit retry', async () => {
    fetchAssignableUsers.mockRejectedValueOnce(new Error('Jira unavailable'))
    const { query } = setup('Jeff')
    await vi.waitFor(() => expect(query.error.value?.message).toBe('Jira unavailable'))
    expect(query.data.value).toBeUndefined()
    expect(query.isSearchPending.value).toBe(false)
    fetchAssignableUsers.mockResolvedValue([jeff])
    await query.refetch()
    expect(query.data.value).toEqual([jeff])
    expect(query.error.value).toBeNull()
  })

  it('refreshes after two minutes on reopen and resets active results on connection changes', async () => {
    vi.useFakeTimers()
    fetchAssignableUsers.mockResolvedValue([jeff])
    const { query, enabled, queryClient } = setup()
    await vi.advanceTimersByTimeAsync(0)
    enabled.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(120_001)
    enabled.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchAssignableUsers).toHaveBeenCalledTimes(2)
    queryClient.setQueryData(['ticket-assignees', 'LMD-1569'], [jeff])
    fetchAssignableUsers.mockResolvedValue([])
    await resetAssignableUsersCache(queryClient)
    expect(query.data.value).toEqual([])
    expect(queryClient.getQueryData(['ticket-assignees', 'LMD-1569'])).toBeUndefined()
    expect(queryClient.getQueryData(assignableUsersQueryKey('LMD-1569'))).toEqual([])
  })
})
