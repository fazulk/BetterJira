// @vitest-environment happy-dom
/**
 * Integration: TicketDetailDescription + real TipTap editor.
 * Opening a ticket seeds the editor from the list-cache placeholder (no
 * description); the real ADF must still land without an empty PUT.
 */
import type { JiraAdfDocument, JiraTicket } from '@/types/jira'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import TicketDetailDescription from '@/components/ticket-detail/TicketDetailDescription.vue'

const mutateAsync = vi.fn()

vi.mock('@/composables/useUpdateTicketDescription', () => ({
  useUpdateTicketDescription: () => ({ mutateAsync }),
}))

vi.mock('@/composables/useUploadTicketAttachment', () => ({
  useUploadTicketAttachment: () => ({ mutateAsync: vi.fn() }),
}))

function adfDoc(text: string): JiraAdfDocument {
  return {
    type: 'doc',
    version: 1,
    content: [
      { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] },
    ],
  }
}

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

describe('opening a ticket does not wipe its description', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows and keeps the real description after the list-cache placeholder', async () => {
    const wrapper = mount(TicketDetailDescription, {
      props: {
        ticket: makeTicket({ key: 'T-1' }),
        detailLoaded: false,
        isLocalTicket: false,
      },
    })

    await nextTick()

    await wrapper.setProps({
      ticket: makeTicket({ key: 'T-1', descriptionAdf: adfDoc('real description') }),
      detailLoaded: true,
    })
    await nextTick()
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)

    const prose = wrapper.find('.tiptap')
    expect(prose.exists()).toBe(true)
    expect(prose.text()).toContain('real description')

    await vi.advanceTimersByTimeAsync(3000)
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(3000)

    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
