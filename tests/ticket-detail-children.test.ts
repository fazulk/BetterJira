// @vitest-environment happy-dom
import type { JiraTicket } from '@/types/jira'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import TicketDetailChildren from '@/components/ticket-detail/TicketDetailChildren'
import { getChildTicketSections } from '@/features/ticket-detail/childTicketDisplay'

vi.mock('@/components/StatusIcon', () => ({
  default: defineComponent({ setup: () => () => h('span') }),
}))

function ticket(key: string, overrides: Partial<JiraTicket> = {}): JiraTicket {
  return {
    key,
    summary: key,
    status: 'To Do',
    statusCategory: 'new',
    inCurrentSprint: false,
    priority: 'Medium',
    issueType: 'Story',
    labels: [],
    spaceKey: 'BJ',
    spaceName: 'BetterJira',
    assignee: 'Unassigned',
    self: '',
    ...overrides,
  }
}

const tickets = [
  ticket('BJ-10', { summary: 'Beta', status: 'Done', statusCategory: 'done', priority: 'Low', storyPoints: 3, labels: ['frontend', 'backend'], updatedAt: '2026-10-02' }),
  ticket('BJ-2', { summary: 'Alpha', priority: 'High', storyPoints: 0, labels: ['backend'], updatedAt: '2026-10-01' }),
  ticket('BJ-3', { summary: 'Gamma', assignee: 'Alex' }),
]

function keys(sections: ReturnType<typeof getChildTicketSections>) {
  return sections.flatMap(section => section.tickets.map(ticket => ticket.key))
}

function mountChildren(displayControls = true) {
  return mount(TicketDetailChildren, {
    props: {
      displayControls,
      childTickets: tickets,
      ticketKey: 'BJ-1',
      sectionLabel: 'Issues',
      actionLabel: 'Add issue',
      emptyLabel: 'No issues linked',
    },
  })
}

describe('epic child display', () => {
  it('changes grouping, reverses direction, and retains navigation events', async () => {
    const wrapper = mountChildren()
    await wrapper.get('select[aria-label="Group issues by"]').setValue('priority')
    expect(wrapper.findAll('h3').map(header => header.text())).toEqual(['High · 1', 'Medium · 1', 'Low · 1'])
    await wrapper.get('select[aria-label="Group issues by"]').setValue('none')
    await wrapper.get('select[aria-label="Sort issues by"]').setValue('title')
    const rows = () => wrapper.findAll('button').filter(button => button.text().includes('BJ-'))
    expect(rows().map(row => row.findAll('span')[1]!.text())).toEqual(['BJ-2', 'BJ-10', 'BJ-3'])
    await wrapper.get('button[aria-label="Sort descending"]').trigger('click')
    expect(rows().map(row => row.findAll('span')[1]!.text())).toEqual(['BJ-3', 'BJ-10', 'BJ-2'])
    await rows()[0]!.trigger('mouseenter')
    await rows()[0]!.trigger('click')
    expect(wrapper.emitted('prefetch')).toEqual([['BJ-3']])
    expect(wrapper.emitted('select')).toEqual([['BJ-3']])
    await wrapper.setProps({ childTickets: [] })
    expect(wrapper.text()).toContain('No issues linked')
    expect(wrapper.find('select').exists()).toBe(false)
    wrapper.unmount()
  })

  it('sorts each group and places newly synced stories in the selected order', async () => {
    const wrapper = mountChildren()
    await wrapper.get('select[aria-label="Group issues by"]').setValue('label')
    await wrapper.get('select[aria-label="Sort issues by"]').setValue('key')
    const groups = () => wrapper.findAll('h3').map(header => ({
      title: header.text(),
      keys: Array.from(header.element.parentElement!.querySelectorAll('button')).map(row => row.children[1]!.textContent),
    }))
    expect(groups()).toEqual([
      { title: 'backend · 2', keys: ['BJ-2', 'BJ-10'] },
      { title: 'frontend · 1', keys: ['BJ-10'] },
      { title: 'No labels · 1', keys: ['BJ-3'] },
    ])
    await wrapper.get('button[aria-label="Sort descending"]').trigger('click')
    await wrapper.setProps({ childTickets: [...tickets, ticket('BJ-5', { labels: ['backend'] })] })
    expect(groups()[0]).toEqual({ title: 'backend · 3', keys: ['BJ-10', 'BJ-5', 'BJ-2'] })
    await wrapper.setProps({ displayControls: false })
    expect(wrapper.findAll('h3')).toHaveLength(0)
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.findAll('button').slice(1).map(row => row.element.children[1]!.textContent)).toEqual(['BJ-10', 'BJ-2', 'BJ-3', 'BJ-5'])
    wrapper.unmount()
  })

  it('keeps controls off for other ticket types', () => {
    const wrapper = mountChildren(false)
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.findAll('h3')).toHaveLength(0)
    wrapper.unmount()
  })

  it('preserves default order and sorts keys numerically without mutating input', () => {
    expect(keys(getChildTicketSections(tickets, 'none', 'original', 'asc', []))).toEqual(['BJ-10', 'BJ-2', 'BJ-3'])
    expect(keys(getChildTicketSections(tickets, 'none', 'key', 'asc', []))).toEqual(['BJ-2', 'BJ-3', 'BJ-10'])
    expect(tickets.map(ticket => ticket.key)).toEqual(['BJ-10', 'BJ-2', 'BJ-3'])
  })

  it('keeps missing estimates and dates last in both directions, including zero estimates', () => {
    for (const ordering of ['estimate', 'updated'] as const) {
      expect(keys(getChildTicketSections(tickets, 'none', ordering, 'asc', []))).toEqual(['BJ-2', 'BJ-10', 'BJ-3'])
      expect(keys(getChildTicketSections(tickets, 'none', ordering, 'desc', []))).toEqual(['BJ-10', 'BJ-2', 'BJ-3'])
    }
  })

  it('honors preferred statuses for grouping and sorting', () => {
    const statusOrder = ['done:done', 'new:to do']
    expect(getChildTicketSections(tickets, 'status', 'key', 'asc', statusOrder).map(section => section.label)).toEqual(['Done', 'To Do'])
    expect(keys(getChildTicketSections(tickets, 'none', 'status', 'asc', statusOrder))).toEqual(['BJ-10', 'BJ-2', 'BJ-3'])
  })

  it('groups multiple labels and missing values while sorting each group', () => {
    const sections = getChildTicketSections(tickets, 'label', 'key', 'asc', [])
    expect(sections.map(section => [section.label, section.tickets.map(ticket => ticket.key)])).toEqual([
      ['backend', ['BJ-2', 'BJ-10']],
      ['frontend', ['BJ-10']],
      ['No labels', ['BJ-3']],
    ])
    expect(getChildTicketSections(tickets, 'assignee', 'key', 'asc', []).map(section => section.label)).toEqual(['Alex', 'Unassigned'])
  })
})
