import type { IssueVisibilityRange } from '@/features/ticket-list/types'
import type { CycleTicketFilter } from '@/features/ticket-list/useTicketVisibility'
import type { JiraTicket } from '@/types/jira'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, ref } from 'vue'
import { useTicketVisibility } from '@/features/ticket-list/useTicketVisibility'

afterEach(() => {
  vi.useRealTimers()
})

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

function setup() {
  const currentTeamSection = ref<string | null>(null)
  const completedRange = ref<IssueVisibilityRange>('all')
  const showSubIssuesRange = ref<IssueVisibilityRange>('all')
  const showTriageIssuesRange = ref<IssueVisibilityRange>('all')
  const scope = effectScope()
  const visibility = scope.run(() =>
    useTicketVisibility({
      currentTeamSection: computed(() => currentTeamSection.value),
      completedRange,
      showSubIssuesRange,
      showTriageIssuesRange,
    }),
  )
  if (!visibility) {
    throw new Error('effectScope.run returned undefined')
  }
  return {
    currentTeamSection,
    completedRange,
    showSubIssuesRange,
    showTriageIssuesRange,
    scope,
    visibility,
  }
}

describe('isDateVisibleInRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T12:00:00.000Z'))
  })

  it('handles all and hidden ranges without reading the date', () => {
    const { visibility, scope } = setup()
    expect(visibility.isDateVisibleInRange('all', undefined)).toBe(true)
    expect(visibility.isDateVisibleInRange('hidden', '2026-01-31T12:00:00.000Z')).toBe(false)
    scope.stop()
  })

  it('requires a parseable date for relative ranges', () => {
    const { visibility, scope } = setup()
    expect(visibility.isDateVisibleInRange('day', undefined)).toBe(false)
    expect(visibility.isDateVisibleInRange('day', 'not-a-date')).toBe(false)
    scope.stop()
  })

  it('applies day, week, and month windows from Date.now', () => {
    const { visibility, scope } = setup()
    expect(visibility.isDateVisibleInRange('day', '2026-01-30T13:00:00.000Z')).toBe(true)
    expect(visibility.isDateVisibleInRange('day', '2026-01-30T11:00:00.000Z')).toBe(false)
    expect(visibility.isDateVisibleInRange('week', '2026-01-24T13:00:00.000Z')).toBe(true)
    expect(visibility.isDateVisibleInRange('week', '2026-01-24T11:00:00.000Z')).toBe(false)
    expect(visibility.isDateVisibleInRange('month', '2026-01-01T13:00:00.000Z')).toBe(true)
    expect(visibility.isDateVisibleInRange('month', '2026-01-01T11:00:00.000Z')).toBe(false)
    scope.stop()
  })
})

describe('current-view visibility predicates', () => {
  it('filters triage/backlog sections to backlog issues', () => {
    const { currentTeamSection, visibility, scope } = setup()
    const active = makeTicket({ key: 'ENG-1', status: 'In Progress' })
    const backlog = makeTicket({ key: 'ENG-2', status: 'Backlog' })

    currentTeamSection.value = 'triage'
    expect(visibility.filterTicketsForCurrentView([active, backlog]).map(ticket => ticket.key)).toEqual(['ENG-2'])

    currentTeamSection.value = 'backlog'
    expect(visibility.filterTicketsForCurrentView([active, backlog]).map(ticket => ticket.key)).toEqual(['ENG-2'])
    scope.stop()
  })

  it('filters cycle working views by sprint membership', () => {
    const currentTeamSection = ref<string | null>('cycle-current')
    const completedRange = ref<IssueVisibilityRange>('all')
    const showSubIssuesRange = ref<IssueVisibilityRange>('all')
    const showTriageIssuesRange = ref<IssueVisibilityRange>('all')
    const cycleFilter = ref<CycleTicketFilter | null>({ match: 'current', sprintId: '9' })
    const scope = effectScope()
    const visibility = scope.run(() =>
      useTicketVisibility({
        currentTeamSection: computed(() => currentTeamSection.value),
        completedRange,
        showSubIssuesRange,
        showTriageIssuesRange,
        cycleFilter: computed(() => cycleFilter.value),
      }),
    )
    if (!visibility) {
      throw new Error('effectScope.run returned undefined')
    }

    const inSprint = makeTicket({ key: 'ENG-1', inCurrentSprint: true, sprints: [{ id: '9', name: 'Sprint 9' }] })
    const upcoming = makeTicket({ key: 'ENG-2', sprints: [{ id: '10', name: 'Sprint 10' }] })
    const other = makeTicket({ key: 'ENG-3' })

    expect(visibility.filterTicketsForCurrentView([inSprint, upcoming, other]).map(ticket => ticket.key)).toEqual(['ENG-1'])

    cycleFilter.value = { match: 'id', sprintId: '10' }
    expect(visibility.filterTicketsForCurrentView([inSprint, upcoming, other]).map(ticket => ticket.key)).toEqual(['ENG-2'])

    cycleFilter.value = { match: 'none' }
    expect(visibility.filterTicketsForCurrentView([inSprint, upcoming, other])).toEqual([])
    scope.stop()
  })

  it('applies completed, sub-issue, and backlog date ranges', () => {
    const {
      completedRange,
      showSubIssuesRange,
      showTriageIssuesRange,
      visibility,
      scope,
    } = setup()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T12:00:00.000Z'))
    completedRange.value = 'hidden'
    showSubIssuesRange.value = 'hidden'
    showTriageIssuesRange.value = 'hidden'

    const active = makeTicket({ key: 'ENG-1' })
    const completed = makeTicket({
      key: 'ENG-2',
      status: 'Done',
      statusCategory: 'done',
      completedAt: '2026-01-31T11:00:00.000Z',
    })
    const subIssue = makeTicket({
      key: 'ENG-3',
      parent: { key: 'ENG-1', summary: 'Parent', issueType: 'Story' },
      createdAt: '2026-01-31T11:00:00.000Z',
    })
    const backlog = makeTicket({
      key: 'ENG-4',
      status: 'Backlog',
      createdAt: '2026-01-31T11:00:00.000Z',
    })

    expect(visibility.filterTicketsForCurrentView([active, completed, subIssue, backlog]).map(ticket => ticket.key)).toEqual(['ENG-1'])
    scope.stop()
  })
})

describe('hideSubIssuesWithVisibleParents', () => {
  it('hides sub-issues whose parent is already visible', () => {
    const { visibility, scope } = setup()
    const parent = makeTicket({ key: 'ENG-1', issueType: 'Story' })
    const child = makeTicket({
      key: 'ENG-2',
      parent: { key: 'ENG-1', summary: 'Parent story', issueType: 'Story' },
    })
    const orphan = makeTicket({
      key: 'ENG-3',
      parent: { key: 'ENG-404', summary: 'Missing parent', issueType: 'Story' },
    })

    expect(visibility.hideSubIssuesWithVisibleParents([parent, child, orphan]).map(ticket => ticket.key)).toEqual([
      'ENG-1',
      'ENG-3',
    ])
    scope.stop()
  })
})

describe('ticketMatchesQuery', () => {
  it('matches normalized queries against ticket, parent, and label fields', () => {
    const { visibility, scope } = setup()
    const ticket = makeTicket({
      key: 'ENG-42',
      summary: 'Ship the sidebar',
      status: 'In QA',
      priority: 'High',
      issueType: 'Bug',
      assignee: 'Ada Lovelace',
      reporter: 'Grace Hopper',
      spaceKey: 'OPS',
      spaceName: 'Operations',
      labels: ['customer-facing'],
      parent: { key: 'ENG-1', summary: 'Parent Initiative', issueType: 'Story' },
    })

    expect(visibility.ticketMatchesQuery(ticket, 'sidebar')).toBe(true)
    expect(visibility.ticketMatchesQuery(ticket, 'ada')).toBe(true)
    expect(visibility.ticketMatchesQuery(ticket, 'parent initiative')).toBe(true)
    expect(visibility.ticketMatchesQuery(ticket, 'customer-facing')).toBe(true)
    expect(visibility.ticketMatchesQuery(ticket, 'missing')).toBe(false)
    scope.stop()
  })
})
