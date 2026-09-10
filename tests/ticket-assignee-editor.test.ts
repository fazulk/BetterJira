// @vitest-environment happy-dom
import type { JiraTicket } from '@/types/jira'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, effectScope, nextTick, ref } from 'vue'
import { useTicketDetailPropertyEditors } from '@/features/ticket-detail/useTicketDetailPropertyEditors'

const { fetchAssignableUsers, mutateAsync } = vi.hoisted(() => ({ fetchAssignableUsers: vi.fn(), mutateAsync: vi.fn() }))
vi.mock('@/api/jira', () => ({ fetchAssignableUsers }))
vi.mock('@/composables/useUpdateTicketAssignee', () => ({ useUpdateTicketAssignee: () => ({ mutateAsync, isPending: ref(false) }) }))
vi.mock('@/composables/useUpdateTicketPriority', () => ({ useUpdateTicketPriority: () => ({ isPending: ref(false) }) }))
vi.mock('@/composables/useUpdateTicketTeam', () => ({ useUpdateTicketTeam: () => ({ isPending: ref(false) }) }))
vi.mock('@/composables/usePriorities', () => ({ usePriorities: () => ({ data: ref([]) }) }))
vi.mock('@/composables/useJiraTeams', () => ({ useJiraTeams: () => ({ data: ref([]) }) }))

const cleanups: Array<() => void> = []

afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  localStorage.clear()
  fetchAssignableUsers.mockReset()
  mutateAsync.mockReset()
  vi.useRealTimers()
})

describe('existing-ticket assignee editor', () => {
  it('saves the selected search result with its name and supports keyboard selection after loading', async () => {
    vi.useFakeTimers()
    const client = new QueryClient()
    const app = createApp({ render: () => null })
    app.use(VueQueryPlugin, { queryClient: client })
    const scope = effectScope()
    const ticket = ref<JiraTicket>({
      key: 'LMD-1569',
      summary: 'Subtask',
      status: 'Open',
      statusCategory: 'new',
      inCurrentSprint: false,
      priority: 'Medium',
      issueType: 'Sub-task',
      labels: [],
      spaceKey: 'LMD',
      spaceName: 'LifeMD',
      assignee: 'Unassigned',
      self: '',
    })
    const editor = app.runWithContext(() => scope.run(() => useTicketDetailPropertyEditors({
      ticket,
      ticketKey: ref(ticket.value.key),
      jiraDataEnabled: ref(true),
      isLocalTicket: ref(false),
    })))!
    cleanups.push(() => {
      editor.cancelEditingAssignee()
      scope.stop()
      client.clear()
    })
    fetchAssignableUsers.mockImplementation(async (_key: string, query: string) => query ? [{ accountId: 'jeff', displayName: 'Jeff Fasulkey' }] : [])
    mutateAsync.mockResolvedValue(ticket.value)
    await editor.startEditingAssignee()
    await vi.advanceTimersByTimeAsync(0)
    editor.assigneeSearch.value = 'Fasulkey'
    await nextTick()
    editor.handleAssigneeKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(editor.assigneeHighlightIndex.value).toBe(0)
    await vi.advanceTimersByTimeAsync(250)
    expect(editor.flatComboOptions.value).toEqual([{ accountId: 'jeff', displayName: 'Jeff Fasulkey' }])
    editor.handleAssigneeKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))
    await vi.advanceTimersByTimeAsync(0)
    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith({ key: 'LMD-1569', accountId: 'jeff', assigneeName: 'Jeff Fasulkey' })
  })
})
