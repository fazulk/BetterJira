import type {
  IssueGroupConfigMap,
  IssueGroupingFieldId,
  IssueOrderingFieldId,
  IssueRowFieldId,
  IssueVisibilityRange,
  ViewFilterClause,
} from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import type { StatusPreferences } from '~/shared/settings'
import { describe, expect, it } from 'vitest'
import { computed, effectScope, ref } from 'vue'
import { useIssueGrouping } from '@/features/ticket-list/useIssueGrouping'
import { getDefaultViewDisplay } from '@/features/ticket-list/viewDisplay'

function makeTicket(overrides: Partial<JiraTicket> & { key: string }): JiraTicket {
  return {
    summary: `Summary ${overrides.key}`,
    status: 'To Do',
    statusCategory: 'new',
    inCurrentSprint: false,
    priority: 'Medium',
    issueType: 'Task',
    labels: [],
    spaceKey: 'ENG',
    spaceName: 'Engineering',
    assignee: 'Unassigned',
    self: `https://jira.example.com/browse/${overrides.key}`,
    ...overrides,
  }
}

function setup(initialTickets: JiraTicket[]) {
  const tickets = ref(initialTickets)
  const currentViewSource = ref('my-issues')
  const listGrouping = ref<IssueGroupingFieldId>('none')
  const listOrdering = ref<IssueOrderingFieldId>('status')
  const listGroupingDirection = ref<'asc' | 'desc'>('asc')
  const listOrderingDirection = ref<'asc' | 'desc'>('asc')
  const issueGroupOrders = ref<IssueGroupConfigMap>({})
  const hiddenIssueGroupIds = ref<IssueGroupConfigMap>({})
  const collapsedIssueSectionIds = ref<string[]>([])
  const completedRange = ref<IssueVisibilityRange>('all')
  const normalizedIssueSearch = ref('')
  const visibleIssueRowFields = ref<IssueRowFieldId[]>(['id', 'status'])
  const currentViewFilters = ref<ViewFilterClause[]>([])
  const statusPreferences = ref<StatusPreferences>({ colors: {}, order: [] })
  const scope = effectScope()
  const grouping = scope.run(() =>
    useIssueGrouping({
      searchedTickets: computed(() => tickets.value),
      scopedTickets: computed(() => tickets.value),
      issueTickets: computed(() => tickets.value),
      currentView: computed(() => currentViewSource.value),
      listGrouping,
      listOrdering,
      listGroupingDirection,
      listOrderingDirection,
      issueGroupOrders,
      hiddenIssueGroupIds,
      collapsedIssueSectionIds,
      visibleIssueRowFields,
      completedRange,
      currentViewFilters,
      statusPreferences: computed(() => statusPreferences.value),
      filterTicketsForCurrentViewWithoutCompletedRange: nextTickets => nextTickets,
      ticketMatchesQuery: (ticket, query) => ticket.key.toLowerCase().includes(query),
      applyViewFiltersToTickets: nextTickets => nextTickets,
      isCompletedIssueVisible: ticket => ticket.statusCategory !== 'done',
      normalizedIssueSearch: computed(() => normalizedIssueSearch.value),
      getDefaultDisplayForView: () => getDefaultViewDisplay(),
      persistViewStateForView: () => {},
      captureDisplay: () => getDefaultViewDisplay(),
    }),
  )
  if (!grouping) {
    throw new Error('effectScope.run returned undefined')
  }
  return {
    tickets,
    currentViewSource,
    listGrouping,
    listOrdering,
    listGroupingDirection,
    listOrderingDirection,
    issueGroupOrders,
    hiddenIssueGroupIds,
    collapsedIssueSectionIds,
    completedRange,
    normalizedIssueSearch,
    statusPreferences,
    scope,
    grouping,
  }
}

function keys(tickets: JiraTicket[]): string[] {
  return tickets.map(ticket => ticket.key)
}

describe('sortTickets', () => {
  it('sorts title ordering in both directions and uses numeric key fallback', () => {
    const { grouping, listOrdering, listOrderingDirection, scope } = setup([
      makeTicket({ key: 'ENG-10', summary: 'Beta' }),
      makeTicket({ key: 'ENG-2', summary: 'Alpha' }),
      makeTicket({ key: 'ENG-1', summary: 'Alpha' }),
    ])
    listOrdering.value = 'title'
    listOrderingDirection.value = 'asc'
    expect(keys(grouping.sortTickets(grouping.issueSections.value[0]?.tickets ?? []))).toEqual([
      'ENG-1',
      'ENG-2',
      'ENG-10',
    ])
    listOrderingDirection.value = 'desc'
    expect(keys(grouping.sortTickets(grouping.issueSections.value[0]?.tickets ?? []))).toEqual([
      'ENG-10',
      'ENG-1',
      'ENG-2',
    ])
    scope.stop()
  })

  it('sorts updated, created, due, priority, and status orderings', () => {
    const { grouping, listOrdering, listOrderingDirection, scope } = setup([
      makeTicket({
        key: 'ENG-1',
        priority: 'Low',
        status: 'Done',
        statusCategory: 'done',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z',
        dueDate: '2026-02-01T00:00:00.000Z',
      }),
      makeTicket({
        key: 'ENG-2',
        priority: 'High',
        status: 'To Do',
        statusCategory: 'new',
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        dueDate: '2026-01-15T00:00:00.000Z',
      }),
    ])
    listOrderingDirection.value = 'asc'

    listOrdering.value = 'updated'
    expect(keys(grouping.sortTickets(grouping.issueSections.value[0]?.tickets ?? []))).toEqual(['ENG-1', 'ENG-2'])

    listOrdering.value = 'created'
    expect(keys(grouping.sortTickets(grouping.issueSections.value[0]?.tickets ?? []))).toEqual(['ENG-2', 'ENG-1'])

    listOrdering.value = 'due'
    expect(keys(grouping.sortTickets(grouping.issueSections.value[0]?.tickets ?? []))).toEqual(['ENG-2', 'ENG-1'])

    listOrdering.value = 'priority'
    expect(keys(grouping.sortTickets(grouping.issueSections.value[0]?.tickets ?? []))).toEqual(['ENG-2', 'ENG-1'])

    listOrdering.value = 'status'
    expect(keys(grouping.sortTickets(grouping.issueSections.value[0]?.tickets ?? []))).toEqual(['ENG-2', 'ENG-1'])
    scope.stop()
  })
})

describe('groupTickets and issue sections', () => {
  it('groups by priority rank and label fallback', () => {
    const { grouping, listGrouping, scope } = setup([
      makeTicket({ key: 'ENG-1', priority: 'Low', labels: [] }),
      makeTicket({ key: 'ENG-2', priority: 'High', labels: ['backend', 'frontend'] }),
    ])
    listGrouping.value = 'priority'
    expect(grouping.issueSections.value.map(section => section.id)).toEqual(['High', 'Low'])

    listGrouping.value = 'label'
    expect(grouping.issueSections.value.map(section => section.id)).toEqual([
      'backend',
      'frontend',
      'No labels',
    ])
    scope.stop()
  })

  it('applies manual group ordering and hidden-group state', () => {
    const { grouping, listGrouping, issueGroupOrders, hiddenIssueGroupIds, scope } = setup([
      makeTicket({ key: 'ENG-1', status: 'To Do', statusCategory: 'new' }),
      makeTicket({ key: 'ENG-2', status: 'In Progress', statusCategory: 'indeterminate' }),
    ])
    listGrouping.value = 'status'
    issueGroupOrders.value = { status: ['In Progress', 'To Do'] }
    hiddenIssueGroupIds.value = { status: ['To Do'] }

    expect(grouping.issueGroupOrderingRows.value.map(row => [row.id, row.visible])).toEqual([
      ['In Progress', true],
      ['To Do', false],
    ])
    expect(grouping.issueSections.value.map(section => section.id)).toEqual(['In Progress'])
    scope.stop()
  })

  it('compares status group labels through status preferences', () => {
    const { grouping, listGrouping, statusPreferences, scope } = setup([
      makeTicket({ key: 'ENG-1', status: 'To Do', statusCategory: 'new' }),
      makeTicket({ key: 'ENG-2', status: 'In Progress', statusCategory: 'indeterminate' }),
    ])
    listGrouping.value = 'status'
    statusPreferences.value = {
      colors: {},
      order: ['indeterminate:in progress', 'new:to do'],
    }

    expect(grouping.issueSections.value.map(section => section.id)).toEqual(['In Progress', 'To Do'])
    expect(grouping.compareStatusGroupLabels('In Progress', 'To Do')).toBeLessThan(0)
    scope.stop()
  })

  it('uses the view/grouping/section collapse-id grammar', () => {
    const { grouping, currentViewSource, listGrouping, collapsedIssueSectionIds, scope } = setup([
      makeTicket({ key: 'ENG-1', priority: 'High' }),
    ])
    currentViewSource.value = 'team:ENG:active'
    listGrouping.value = 'priority'
    const section = grouping.issueSections.value[0]
    if (!section) {
      throw new Error('Expected a section')
    }

    expect(grouping.getIssueSectionCollapseId(section)).toBe('team:ENG:active:priority:High')
    expect(grouping.isIssueSectionCollapsed(section)).toBe(false)
    grouping.toggleIssueSection(section)
    expect(collapsedIssueSectionIds.value).toEqual(['team:ENG:active:priority:High'])
    expect(grouping.isIssueSectionCollapsed(section)).toBe(true)
    expect(grouping.getFlatVisibleTickets()).toEqual([])
    scope.stop()
  })
})
