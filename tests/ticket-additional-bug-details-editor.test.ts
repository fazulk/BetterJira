// @vitest-environment happy-dom
import type { JiraAdfDocument, JiraTicket } from '@/types/jira'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JiraDescriptionEditor from '@/components/JiraDescriptionEditor'
import TicketDetailDescription from '@/components/ticket-detail/TicketDetailDescription'
import { ticketQueryKey } from '@/composables/queryKeys'

const api = vi.hoisted(() => ({ updateTicketAdditionalBugDetails: vi.fn(), updateTicketDescription: vi.fn() }))
vi.mock('@/api/jira', async importOriginal => ({
  ...(await importOriginal<typeof import('@/api/jira')>()),
  ...api,
}))

function doc(text: string): JiraAdfDocument {
  return { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}
const ticket: JiraTicket = {
  key: 'TEST-1',
  summary: 'A bug',
  issueType: 'Bug',
  status: 'Open',
  statusCategory: 'new',
  inCurrentSprint: false,
  labels: [],
  priority: '',
  assignee: '',
  spaceKey: 'TEST',
  spaceName: 'Test',
  self: '',
  descriptionAdf: doc('Keep the description'),
  additionalBugDetailsAdf: doc('Bug context'),
  additionalBugDetailsFieldId: 'customfield_12345',
  additionalBugDetailsEditable: true,
}

beforeEach(() => {
  vi.useFakeTimers()
  api.updateTicketAdditionalBugDetails.mockReset()
  api.updateTicketDescription.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('additional bug details editor', () => {
  it.each([true, false])('shows rich text and autosaves only the bug field when editable: %s', async (editable) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const current = { ...ticket, additionalBugDetailsEditable: editable }
    client.setQueryData(ticketQueryKey(ticket.key), current)
    const updatedDoc = doc('Updated bug context')
    api.updateTicketAdditionalBugDetails.mockResolvedValue({ ...current, additionalBugDetailsAdf: updatedDoc })
    const wrapper = mount(TicketDetailDescription, {
      props: { ticket: current, detailLoaded: true, isLocalTicket: false, field: 'additionalBugDetails' },
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
    })
    try {
      await flushPromises()
      expect(wrapper.get('h2').text()).toBe('Additional Bug Details')
      expect(wrapper.get('.tiptap').text()).toContain('Bug context')
      expect(wrapper.getComponent(JiraDescriptionEditor).props('disabled')).toBe(!editable)
      await vi.advanceTimersByTimeAsync(3000)
      expect(api.updateTicketAdditionalBugDetails).not.toHaveBeenCalled()
      await wrapper.get('[data-description-editor-shell]').trigger('focusin')
      wrapper.getComponent(JiraDescriptionEditor).vm.$emit('update:modelValue', updatedDoc)
      await vi.advanceTimersByTimeAsync(3000)
      await flushPromises()
      if (editable) {
        expect(api.updateTicketAdditionalBugDetails).toHaveBeenCalledExactlyOnceWith(ticket.key, updatedDoc)
        expect(client.getQueryData<JiraTicket>(ticketQueryKey(ticket.key))?.descriptionAdf).toEqual(ticket.descriptionAdf)
        expect(wrapper.text()).toContain('Saved')
      }
      else {
        expect(api.updateTicketAdditionalBugDetails).not.toHaveBeenCalled()
      }
      expect(api.updateTicketDescription).not.toHaveBeenCalled()
    }
    finally {
      wrapper.unmount()
      client.clear()
    }
  })
})
