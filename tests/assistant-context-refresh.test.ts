import type { AssistantViewState } from '@/features/ticket-list/assistantViewContext'
import type { JiraTicket } from '@/types/jira'
import type { AssistantChatRequest, AssistantContext } from '~/shared/assistant'
import { QueryClient } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { fetchSpaceCycles } from '@/api/cycles'
import { fetchTicket, fetchTickets } from '@/api/jira'
import { fetchLocalTicket, fetchLocalTickets } from '@/api/localTickets'
import { createAssistantContextRefresher } from '@/composables/useAssistantContextRefresh'
import { createAssistantSessions } from '@/composables/useAssistantSessions'
import { getTicketsQueryOptions } from '@/composables/useTicketsQuery'
import { createAssistantViewReader } from '@/features/ticket-list/assistantViewContext'
import { getDefaultViewDisplay } from '@/features/ticket-list/viewDisplay'
import { getDefaultAssistantSettings } from '~/shared/assistant'
import { emptySpaceCycles } from '~/shared/cycles'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

vi.mock('@/api/jira', () => ({ fetchTickets: vi.fn(), fetchTicket: vi.fn() }))
vi.mock('@/api/localTickets', () => ({ fetchLocalTickets: vi.fn(), fetchLocalTicket: vi.fn() }))
vi.mock('@/api/cycles', () => ({ fetchSpaceCycles: vi.fn() }))
vi.mock('@/composables/useAssistantSettings', () => ({ useAssistantSettings: vi.fn() }))
const requests = vi.hoisted(() => [] as AssistantChatRequest[])
vi.mock('@/api/assistant', () => ({
  streamAssistantChat: async (request: AssistantChatRequest, chunk: (value: { type: 'done' }) => void) => {
    requests.push(request)
    chunk({ type: 'done' })
  },
}))

function ticket(key: string, overrides: Partial<JiraTicket> = {}): JiraTicket {
  return { key, summary: key, status: 'Open', statusCategory: 'new', inCurrentSprint: false, priority: 'High', issueType: 'Task', labels: [], spaceKey: 'APP', spaceName: 'App', assignee: 'Jeff', self: '', ...overrides }
}
function viewState(): AssistantViewState {
  return { kind: 'issues', display: { ...getDefaultViewDisplay(), completedRange: 'all', showSubIssuesRange: 'all', showTriageIssuesRange: 'all' }, filters: [], currentUserName: 'Jeff', teamSection: 'all', contextKey: null, directoryTab: 'views', searchTab: 'all', spaceKeys: ['APP', 'OTHER'] }
}
const view: AssistantContext = { kind: 'view', label: 'App issues', viewId: 'app-issues', teamKey: 'APP', filters: 'Priority: High', items: [], totalCount: 0, truncated: false }
const signal = () => new AbortController().signal

beforeEach(() => {
  vi.resetAllMocks()
  requests.length = 0
})

describe('fresh assistant context', () => {
  it('sends new view members on the next turn while retaining the original team and filters', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    const state = viewState()
    state.filters = [{ id: 'high', fieldId: 'priority', fieldLabel: 'Priority', value: 'high', valueLabel: 'High' }]
    const options = getTicketsQueryOptions([{ key: 'APP', name: 'App', enabled: true }], true)
    const read = createAssistantViewReader(view, state)!
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()), undefined, createAssistantContextRefresher(queryClient, options, read))
    const conversation = store.create(view)
    vi.mocked(fetchTickets).mockResolvedValue([ticket('APP-1')])
    await conversation.chat.send('First turn')
    expect(requests[0]?.context).toMatchObject({ totalCount: 1, items: [{ key: 'APP-1' }] })
    // Navigation and filter edits must not retarget an existing conversation.
    store.currentContext.value = { kind: 'workspace', label: 'Workspace' }
    state.filters[0]!.value = 'low'
    state.spaceKeys = ['OTHER']
    vi.mocked(fetchTickets).mockResolvedValue([ticket('APP-2'), ticket('APP-1', { summary: 'Updated' }), ticket('APP-3', { priority: 'Low' }), ticket('OTHER-1', { spaceKey: 'OTHER' })])
    await conversation.chat.send('What changed?')
    expect(fetchTickets).toHaveBeenCalledTimes(2)
    expect(requests[1]?.context).toMatchObject({ viewId: 'app-issues', totalCount: 2, items: [{ key: 'APP-2' }, { key: 'APP-1', summary: 'Updated' }] })
    expect(requests[0]?.context).toMatchObject({ totalCount: 1 })
    expect(queryClient.getQueryData(options.queryKey)).toHaveLength(4)
    queryClient.clear()
  })

  it.each([false, true])('refreshes ticket details and subtasks (local: %s)', async (local) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
    const key = local ? 'LOCAL-1' : 'APP-1'
    const spaceKey = local ? LOCAL_SPACE_KEY : 'APP'
    const parent = ticket(key, { spaceKey, summary: 'Updated parent', description: 'Fresh description' })
    const child = ticket(`${spaceKey}-2`, { spaceKey, parent: { key, summary: parent.summary, issueType: 'Task' } })
    vi.mocked(local ? fetchLocalTicket : fetchTicket).mockResolvedValue(parent)
    vi.mocked(local ? fetchLocalTickets : fetchTickets).mockResolvedValue([parent, child])
    const refresh = createAssistantContextRefresher(queryClient, getTicketsQueryOptions([{ key: spaceKey, name: 'Space', enabled: true }], !local))
    const context = await refresh({ kind: 'ticket', label: key, key, local, summary: 'Old parent', snapshot: '{}' }, signal())
    expect(context).toMatchObject({ key, summary: 'Updated parent' })
    expect(context.kind === 'ticket' && JSON.parse(context.snapshot!)).toMatchObject({ description: 'Fresh description', childTickets: [{ key: child.key }] })
    expect(local ? fetchTicket : fetchLocalTicket).not.toHaveBeenCalled()
    queryClient.clear()
  })

  it('keeps current-cycle scope live, including when the current cycle disappears', async () => {
    const queryClient = new QueryClient()
    const state = viewState()
    state.teamSection = 'cycle-current'
    const read = createAssistantViewReader({ ...view, cycleId: '1' }, state)!
    const cycle = { id: '2', name: 'New current cycle', state: 'active' as const }
    vi.mocked(fetchSpaceCycles).mockResolvedValue({ ...emptySpaceCycles('APP'), cycles: [cycle], current: cycle })
    const refreshed = await read([ticket('APP-2', { sprints: [cycle] }), ticket('APP-1', { sprints: [{ id: '1', name: 'Old' }] })], queryClient)
    expect(refreshed).toMatchObject({ cycleId: '2', items: [{ key: 'APP-2' }] })
    vi.mocked(fetchSpaceCycles).mockResolvedValue(emptySpaceCycles('APP'))
    expect(await read([], queryClient)).toMatchObject({ cycleId: undefined, totalCount: 0 })
    queryClient.clear()
  })

  it('rebuilds search results with the original query and result tab', async () => {
    const queryClient = new QueryClient()
    const state = viewState()
    state.kind = 'search'
    state.searchTab = 'projects'
    const read = createAssistantViewReader({ ...view, viewId: 'search', search: 'release', teamKey: undefined }, state)!
    const refreshed = await read([ticket('APP-1', { summary: 'Release issue' }), ticket('APP-2', { summary: 'Release project', issueType: 'Epic' }), ticket('APP-3', { summary: 'Other project', issueType: 'Epic' })], queryClient)
    expect(refreshed).toMatchObject({ totalCount: 1, items: [{ key: 'APP-2' }] })
    queryClient.clear()
  })

  it('retains hidden groups and the 50-item snapshot limit after refreshing', async () => {
    const queryClient = new QueryClient()
    const state = viewState()
    state.display.grouping = 'status'
    state.display.hiddenIssueGroupIds = { status: ['Done'] }
    const read = createAssistantViewReader(view, state)!
    const refreshed = await read([...Array.from({ length: 55 }, (_, i) => ticket(`APP-${i}`)), ticket('APP-DONE', { status: 'Done' })], queryClient)
    expect(refreshed).toMatchObject({ totalCount: 55, truncated: true })
    expect(refreshed.kind === 'view' && refreshed.items).toHaveLength(50)
    queryClient.clear()
  })
})
