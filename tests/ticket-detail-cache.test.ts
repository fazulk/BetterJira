// @vitest-environment happy-dom
import type { JiraTicket } from '@/types/jira'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import TicketDetailChildren from '@/components/ticket-detail/TicketDetailChildren'
import TicketDetail from '@/components/TicketDetail'
import { ticketsQueryKey } from '@/composables/queryKeys'
import { applyTicketsPayloadToQueryCache } from '@/composables/useJiraTickets'

vi.mock('@/composables/useSpaceSettings', () => ({
  useSpaceSettings: () => ({ enabledSpaces: ref([{ key: 'APP', name: 'App' }]), hasJiraCredentialsConfigured: ref(true), jiraConnection: ref({ baseUrl: 'https://jira.example.com' }), settings: ref({ statusPreferences: { order: ['new:open'], colors: {} } }) }),
}))
vi.mock('@/composables/usePinnedTickets', () => ({ usePinnedTickets: () => ({ isPinned: () => false, togglePinnedTicket: vi.fn() }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }) }))
vi.mock('@/composables/useJiraTicket', () => ({ useJiraTicket: () => ({ data: ref(undefined), isPlaceholderData: ref(false), isError: ref(false) }) }))
vi.mock('@/composables/useLocalTicket', () => ({ useLocalTicket: () => ({ data: ref(undefined), isError: ref(false) }) }))

const parent: JiraTicket = { key: 'APP-1', summary: 'Parent', status: 'Open', statusCategory: 'new', inCurrentSprint: false, priority: 'Medium', issueType: 'Task', labels: [], spaceKey: 'APP', spaceName: 'App', assignee: '', self: '' }

describe('ticket detail cache updates', () => {
  it.each(['Task', 'Epic'])('shows newly synced children without remounting a %s', async (issueType) => {
    const currentParent = { ...parent, issueType }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    const queryKey = ticketsQueryKey(['APP'])
    queryClient.setQueryData(queryKey, [currentParent])
    const wrapper = shallowMount(TicketDetail, { props: { ticketKey: parent.key }, global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
    try {
      expect(wrapper.getComponent(TicketDetailChildren).props('displayControls')).toBe(issueType === 'Epic')
      expect(wrapper.getComponent(TicketDetailChildren).props('statusOrder')).toEqual(['new:open'])
      expect(wrapper.getComponent(TicketDetailChildren).props('childTickets')).toEqual([])
      const child = { ...parent, key: 'APP-2', summary: 'New subtask', parent: { key: parent.key, summary: parent.summary, issueType: currentParent.issueType } }
      applyTicketsPayloadToQueryCache(queryClient, queryKey, { mode: 'incremental', tickets: [child] }, false)
      await flushPromises()
      expect(wrapper.getComponent(TicketDetailChildren).props('childTickets')).toEqual([child])
      queryClient.setQueryData(queryKey, [currentParent])
      await flushPromises()
      expect(wrapper.getComponent(TicketDetailChildren).props('childTickets')).toEqual([])
    }
    finally {
      wrapper.unmount()
      queryClient.clear()
    }
  })
})
