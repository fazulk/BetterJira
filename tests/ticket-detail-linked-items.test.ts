// @vitest-environment happy-dom
import type { JiraIssueLink } from '@/types/jira'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TicketDetailLinkedItems from '@/components/ticket-detail/TicketDetailLinkedItems'

vi.mock('@/composables/useStatusPreferences', () => ({
  getStatusLane: () => 'started',
  getStatusProgress: () => 0.4,
  useStatusPreferences: () => ({ getStatusColor: () => '#5b8def' }),
}))

const linkedIssues: JiraIssueLink[] = [
  { id: '1', relationship: 'blocks', key: 'OTHER-2', summary: 'First linked ticket', status: 'Done', statusCategory: 'done' },
  { id: '2', relationship: 'is blocked by', key: 'OTHER-3', summary: 'Dependency', status: 'To Do', statusCategory: 'new' },
  { id: '3', relationship: 'blocks', key: 'OTHER-4', summary: 'Second linked ticket', status: 'In Progress', statusCategory: 'indeterminate' },
]

describe('ticket detail linked items', () => {
  it('groups relationships while preserving first appearance and ticket order', () => {
    const wrapper = mount(TicketDetailLinkedItems, { props: { linkedIssues } })

    expect(wrapper.get('h2').text()).toBe('Linked work items')
    expect(wrapper.findAll('h3').map(heading => heading.text())).toEqual(['blocks', 'is blocked by'])
    expect(wrapper.findAll('button').map(button => button.text())).toEqual([
      'OTHER-2First linked ticketDone',
      'OTHER-4Second linked ticketIn Progress',
      'OTHER-3DependencyTo Do',
    ])
    expect(wrapper.findAll('svg')).toHaveLength(3)
  })

  it('uses accessible buttons and emits ticket keys for selection and hover/focus prefetch', async () => {
    const wrapper = mount(TicketDetailLinkedItems, { props: { linkedIssues } })
    const button = wrapper.get('button')

    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('Open OTHER-2: First linked ticket (Done)')
    await button.trigger('mouseenter')
    await button.trigger('focus')
    await button.trigger('click')

    expect(wrapper.emitted('prefetch')).toEqual([['OTHER-2'], ['OTHER-2']])
    expect(wrapper.emitted('select')).toEqual([['OTHER-2']])
  })

  it('hides absent/empty links and updates when detail data arrives or changes', async () => {
    const wrapper = mount(TicketDetailLinkedItems)
    expect(wrapper.find('section').exists()).toBe(false)
    await wrapper.setProps({ linkedIssues })
    expect(wrapper.findAll('button')).toHaveLength(3)
    await wrapper.setProps({ linkedIssues: [] })
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('keeps a key-only ticket navigable', async () => {
    const wrapper = mount(TicketDetailLinkedItems, {
      props: { linkedIssues: [{ relationship: 'Linked to', key: 'OTHER-5', summary: '', status: '', statusCategory: '' }] },
    })
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Open OTHER-5')
    await button.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['OTHER-5']])
  })
})
