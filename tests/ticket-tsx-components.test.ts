// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import CreateTicketModalFooter from '@/components/create-ticket/CreateTicketModalFooter'
import CreateTicketSubtypeSelector from '@/components/create-ticket/CreateTicketSubtypeSelector'
import CreateTicketTeamSelector from '@/components/create-ticket/CreateTicketTeamSelector'
import TicketDetailChildren from '@/components/ticket-detail/TicketDetailChildren'

vi.mock('@/components/StatusIcon', () => ({
  default: defineComponent({
    name: 'StatusIcon',
    setup() {
      return () => h('span', { 'data-test-id': 'status-icon' })
    },
  }),
}))

describe('ticket TSX components', () => {
  it('keeps team selector null model semantics and exposed focus', async () => {
    const wrapper = mount(CreateTicketTeamSelector, {
      attachTo: document.body,
      props: {
        effectiveSpaceKey: null,
        isCreatePending: false,
        isSpaceLocked: false,
        selectedSpaceName: 'Alpha',
        spaces: [{ key: 'ALPHA', name: 'Alpha' }],
      },
    })

    const select = wrapper.get('select')
    expect(select.element.value).toBe('')

    await select.setValue('ALPHA')
    expect(wrapper.emitted('update:spaceKey')).toEqual([['ALPHA']])

    ;(wrapper.vm as unknown as { focus: () => void }).focus()
    expect(document.activeElement).toBe(select.element)
  })

  it('preserves footer create-more and submit/close events', async () => {
    const wrapper = mount(CreateTicketModalFooter, {
      props: {
        canSubmit: true,
        createMore: false,
        isCreatePending: false,
        isLocalSpace: true,
      },
    })

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('button[aria-label="Add attachment"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Cancel')?.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Create local issue')?.trigger('click')

    expect(wrapper.emitted('update:createMore')).toEqual([[true]])
    expect(wrapper.emitted('attachment')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('updates selected issue type from the subtype selector', async () => {
    const wrapper = mount(CreateTicketSubtypeSelector, {
      props: {
        createIssueTypesError: null,
        effectiveParentKey: null,
        getCreateIssueTypeLabel: issueType => issueType,
        isCreatePending: false,
        isIssueTypeLocked: false,
        isLoadingIssueTypes: false,
        isLocalSpace: false,
        issueTypeOptions: ['Task', 'Bug'],
        selectedIssueType: 'Task',
      },
    })

    await wrapper.findAll('button').find(button => button.text() === 'Bug')?.trigger('click')

    expect(wrapper.emitted('update:selectedIssueType')).toEqual([['Bug']])
  })

  it('renders child tickets and emits select/prefetch/create', async () => {
    const wrapper = mount(TicketDetailChildren, {
      props: {
        actionLabel: 'Add sub-issue',
        childTickets: [{
          key: 'BJ-2',
          summary: 'Child ticket',
          status: 'To Do',
          statusCategory: 'new',
          inCurrentSprint: false,
          priority: 'Medium',
          issueType: 'Task',
          labels: [],
          spaceKey: 'BJ',
          spaceName: 'BetterJira',
          assignee: 'Unassigned',
          self: 'https://jira.example.test/browse/BJ-2',
          storyPoints: 3,
        }],
        emptyLabel: 'No sub-issues',
        sectionLabel: 'Sub-issues',
        ticketKey: 'BJ-1',
      },
    })

    await wrapper.findAll('button').find(button => button.text() === 'Add sub-issue')?.trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('Child ticket'))?.trigger('mouseenter')
    await wrapper.findAll('button').find(button => button.text().includes('Child ticket'))?.trigger('click')

    expect(wrapper.text()).toContain('3 pts')
    expect(wrapper.emitted('create')).toEqual([['BJ-1']])
    expect(wrapper.emitted('prefetch')).toEqual([['BJ-2']])
    expect(wrapper.emitted('select')).toEqual([['BJ-2']])
  })
})
