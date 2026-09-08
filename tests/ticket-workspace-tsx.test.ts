// @vitest-environment happy-dom
import type { CommandMenuItem } from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import { DOMWrapper, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import IssueRow from '@/components/IssueRow'
import TicketListCommandMenu from '@/components/ticket-list/TicketListCommandMenu'
import TicketListSelectionBar from '@/components/ticket-list/TicketListSelectionBar'

vi.mock('@/composables/useLabelColors', () => ({
  useLabelColors: () => ({
    getLabelColor: () => '#22c55e',
    openLabelColorMenu: vi.fn(),
  }),
}))

vi.mock('@/composables/useStatusPreferences', () => ({
  getStatusLane: () => 'started',
  getStatusProgress: () => 0.4,
  useStatusPreferences: () => ({
    getStatusColor: () => '#5b8def',
  }),
}))

function makeTicket(overrides: Partial<JiraTicket> & { key: string }): JiraTicket {
  return {
    summary: `Summary for ${overrides.key}`,
    status: 'In Progress',
    statusCategory: 'indeterminate',
    inCurrentSprint: false,
    priority: 'High',
    issueType: 'Task',
    labels: [],
    spaceKey: 'SPACE',
    spaceName: 'Space',
    assignee: 'Jane Doe',
    self: `https://jira.example.com/browse/${overrides.key}`,
    ...overrides,
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ticket workspace TSX components', () => {
  it('keeps IssueRow optional Boolean visibility semantics reactive', async () => {
    const ticket = makeTicket({
      key: 'ENG-123',
      summary: 'Render the converted row',
      labels: ['alpha', 'alpha', ' beta ', '', 'gamma', 'delta'],
      createdAt: '2026-09-08T12:00:00.000Z',
      storyPoints: 5,
      parent: {
        key: 'EPIC-1',
        summary: 'Project Phoenix',
        issueType: 'Epic',
      },
    })
    const wrapper = mount(IssueRow, {
      props: {
        ticket,
        selected: false,
        checked: false,
        projectAppearance: {
          icon: 'rocket',
          color: '#f97316',
        },
      },
    })

    expect(wrapper.props('showId')).toBe(false)
    expect(wrapper.text()).not.toContain('ENG-123')
    expect(wrapper.text()).not.toContain('Project Phoenix')
    expect(wrapper.text()).not.toContain('alpha')
    await wrapper.setProps({
      showId: true,
      showStatus: true,
      showLabels: true,
      showPriority: true,
      showAssignee: true,
      showParent: true,
    })

    expect(wrapper.text()).toContain('ENG-123')
    expect(wrapper.text()).toContain('Render the converted row')
    expect(wrapper.text()).toContain('Project Phoenix')
    expect(wrapper.text()).toContain('alpha')
    expect(wrapper.text()).toContain('+1')
    expect(wrapper.text()).toContain('High')
    expect(wrapper.text()).toContain('JD')
    expect(wrapper.text()).not.toContain('5 pts')

    await wrapper.setProps({
      showId: false,
      showStatus: false,
      showLabels: false,
      showPriority: false,
      showAssignee: false,
      showCreated: false,
      showStoryPoints: true,
      showParent: false,
    })

    expect(wrapper.text()).not.toContain('ENG-123')
    expect(wrapper.text()).not.toContain('Project Phoenix')
    expect(wrapper.text()).not.toContain('alpha')
    expect(wrapper.text()).not.toContain('High')
    expect(wrapper.text()).not.toContain('JD')
    expect(wrapper.text()).toContain('5 pts')

    await wrapper.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('select')).toEqual([['ENG-123']])
  })

  it('keeps TicketListSelectionBar teleported actions and child action gate', async () => {
    const wrapper = mount(TicketListSelectionBar, {
      attachTo: document.body,
      props: {
        count: 2,
        canCreateChild: false,
      },
    })

    expect(document.body.textContent).toContain('2')
    expect(document.body.textContent).toContain('issues selected')
    expect(document.body.textContent).not.toContain('Add sub-issue')

    const clearButton = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent === 'Clear')
    expect(clearButton).toBeInstanceOf(HTMLButtonElement)
    await new DOMWrapper(clearButton as HTMLButtonElement).trigger('click')
    expect(wrapper.emitted('clear')).toEqual([[]])

    await wrapper.setProps({ count: 1, canCreateChild: true })
    expect(document.body.textContent).toContain('issue selected')
    expect(document.body.textContent).toContain('Add sub-issue')
  })

  it('keeps TicketListCommandMenu query, keyboard, activate, and run emits', async () => {
    const item: CommandMenuItem = {
      id: 'open-eng-1',
      label: 'Open ENG-1',
      description: 'Open the issue',
      section: 'Issues',
      icon: 'search',
      execute: vi.fn(),
    }
    const wrapper = mount(TicketListCommandMenu, {
      attachTo: document.body,
      props: {
        open: false,
        query: 'ENG',
        items: [item],
        activeIndex: 0,
      },
    })
    await wrapper.setProps({ open: true })
    await nextTick()

    const inputElement = document.body.querySelector('input')
    expect(inputElement).toBeInstanceOf(HTMLInputElement)
    const input = new DOMWrapper(inputElement as HTMLInputElement)
    await nextTick()
    expect(input.element).toBe(document.activeElement)
    await input.setValue('ENG-1')
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:query')).toEqual([['ENG-1']])
    expect(wrapper.emitted('keydown')?.[0]?.[0]).toMatchObject({ key: 'Enter' })

    const commandElement = document.body.querySelector('[data-command-index="0"]')
    expect(commandElement).toBeInstanceOf(HTMLButtonElement)
    const command = new DOMWrapper(commandElement as HTMLButtonElement)
    await command.trigger('mouseenter')
    await command.trigger('click')

    expect(wrapper.emitted('activate')).toEqual([[0]])
    expect(wrapper.emitted('run')).toEqual([[item]])
  })
})
