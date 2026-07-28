/**
 * Characterization tests for the pure filter engine extracted from
 * useTicketListController.ts (refactor plan task 6.2). These lock in what the
 * CURRENT code does — matching is based on normalized (trimmed, lowercased)
 * values, option builders count and dedupe by normalized value, and the
 * current-user clauses have deliberate fallbacks (active-issue for assignee,
 * always-true for local tickets on reporter).
 */
import type { TicketFilterContext } from '@/features/ticket-list/filterEngine'
import type {
  FilterFieldId,
  InitiativeRow,
  ProjectRow,
  SavedViewRow,
  ViewFilterClause,
} from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import { describe, expect, it } from 'vitest'
import {
  buildInitiativeFilterOptions,
  buildIssueFilterOptions,
  buildProjectFilterOptions,
  buildSavedViewFilterOptions,
  countFilterOptions,
  filterTicketsByClauses,
  initiativeMatchesFilter,
  projectMatchesFilter,
  savedViewMatchesFilter,
  ticketMatchesFilter,
} from '@/features/ticket-list/filterEngine'

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
    assignee: 'Nobody',
    self: `https://jira.example.com/browse/${overrides.key}`,
    ...overrides,
  }
}

function makeProject(overrides: Partial<ProjectRow> & { key: string }): ProjectRow {
  return {
    name: `Project ${overrides.key}`,
    spaceKey: 'SPACE',
    spaceName: 'Space',
    health: 'On track',
    priority: 'Medium',
    lead: 'Lead Person',
    targetDate: 'No target',
    issueCount: 0,
    completedCount: 0,
    progress: 0,
    status: 'In Progress',
    ...overrides,
  }
}

function makeInitiative(overrides: Partial<InitiativeRow> & { id: string }): InitiativeRow {
  return {
    name: `Initiative ${overrides.id}`,
    description: '',
    health: 'On track',
    projectCount: 0,
    issueCount: 0,
    completedCount: 0,
    progress: 0,
    lead: 'Lead Person',
    ...overrides,
  }
}

function makeSavedView(overrides: Partial<SavedViewRow> & { id: string }): SavedViewRow {
  return {
    name: `View ${overrides.id}`,
    description: '',
    category: 'Issues',
    owner: 'Owner Person',
    count: 0,
    icon: '▦',
    color: '#000000',
    viewId: overrides.id,
    ...overrides,
  }
}

function makeClause(fieldId: FilterFieldId, value: string): ViewFilterClause {
  return { id: `${fieldId}:${value}`, fieldId, fieldLabel: fieldId, value, valueLabel: value }
}

function makeTicketContext(overrides: Partial<TicketFilterContext> = {}): TicketFilterContext {
  return {
    currentUserName: '',
    getProjectKey: () => null,
    getTicketProject: () => null,
    getTicketInitiativeIds: () => [],
    getProjectTeamFilterEntries: () => [],
    ...overrides,
  }
}

describe('ticketMatchesFilter', () => {
  it('matches status against the normalized status, defaulting to "No status"', () => {
    const ctx = makeTicketContext()
    const ticket = makeTicket({ key: 'T-1', status: '  In Progress ' })
    expect(ticketMatchesFilter(ticket, makeClause('status', 'in progress'), ctx)).toBe(true)
    expect(ticketMatchesFilter(ticket, makeClause('status', 'done'), ctx)).toBe(false)
    const noStatus = makeTicket({ key: 'T-2', status: '' })
    expect(ticketMatchesFilter(noStatus, makeClause('status', 'no status'), ctx)).toBe(true)
  })

  it('matches assignee by normalized name, defaulting to "Unassigned"', () => {
    const ctx = makeTicketContext()
    const ticket = makeTicket({ key: 'T-1', assignee: 'Jane Doe' })
    expect(ticketMatchesFilter(ticket, makeClause('assignee', 'jane doe'), ctx)).toBe(true)
    const unassigned = makeTicket({ key: 'T-2', assignee: '' })
    expect(ticketMatchesFilter(unassigned, makeClause('assignee', 'unassigned'), ctx)).toBe(true)
  })

  it('matches assignee current-user against currentUserName case-insensitively', () => {
    const ctx = makeTicketContext({ currentUserName: 'Jane Doe' })
    const mine = makeTicket({ key: 'T-1', assignee: 'jane doe' })
    const theirs = makeTicket({ key: 'T-2', assignee: 'John Roe' })
    expect(ticketMatchesFilter(mine, makeClause('assignee', 'current-user'), ctx)).toBe(true)
    expect(ticketMatchesFilter(theirs, makeClause('assignee', 'current-user'), ctx)).toBe(false)
  })

  it('falls back to active-issue matching for assignee current-user without a currentUserName', () => {
    const ctx = makeTicketContext({ currentUserName: '' })
    const active = makeTicket({ key: 'T-1', statusCategory: 'indeterminate' })
    const done = makeTicket({ key: 'T-2', statusCategory: 'done' })
    expect(ticketMatchesFilter(active, makeClause('assignee', 'current-user'), ctx)).toBe(true)
    expect(ticketMatchesFilter(done, makeClause('assignee', 'current-user'), ctx)).toBe(false)
  })

  it('matches reporter current-user by name, treating local tickets as always mine', () => {
    const named = makeTicketContext({ currentUserName: 'Jane Doe' })
    const clause = makeClause('reporter', 'current-user')
    expect(ticketMatchesFilter(makeTicket({ key: 'T-1', reporter: 'Jane Doe' }), clause, named)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-2', reporter: 'John Roe' }), clause, named)).toBe(false)
    const anonymous = makeTicketContext({ currentUserName: '' })
    expect(ticketMatchesFilter(makeTicket({ key: 'LOCAL-1', reporter: 'John Roe' }), clause, anonymous)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-3', reporter: 'Jane Doe' }), clause, anonymous)).toBe(false)
  })

  it('matches reporter by normalized name, defaulting to "Unknown"', () => {
    const ctx = makeTicketContext()
    expect(ticketMatchesFilter(makeTicket({ key: 'T-1', reporter: 'Jane Doe' }), makeClause('reporter', 'jane doe'), ctx)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-2' }), makeClause('reporter', 'unknown'), ctx)).toBe(true)
  })

  it('matches priority by normalized value, defaulting to "No priority"', () => {
    const ctx = makeTicketContext()
    expect(ticketMatchesFilter(makeTicket({ key: 'T-1', priority: 'High' }), makeClause('priority', 'high'), ctx)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-2', priority: '' }), makeClause('priority', 'no priority'), ctx)).toBe(true)
  })

  it('matches labels against any normalized label, or "no labels" when empty', () => {
    const ctx = makeTicketContext()
    const labeled = makeTicket({ key: 'T-1', labels: ['Frontend', 'Bug'] })
    expect(ticketMatchesFilter(labeled, makeClause('labels', 'frontend'), ctx)).toBe(true)
    expect(ticketMatchesFilter(labeled, makeClause('labels', 'backend'), ctx)).toBe(false)
    const bare = makeTicket({ key: 'T-2', labels: [] })
    expect(ticketMatchesFilter(bare, makeClause('labels', 'no labels'), ctx)).toBe(true)
  })

  it('matches team by team id, defaulting to "no-team"', () => {
    const ctx = makeTicketContext()
    const teamed = makeTicket({ key: 'T-1', team: { id: 'team-1', name: 'Core' } })
    expect(ticketMatchesFilter(teamed, makeClause('team', 'team-1'), ctx)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-2' }), makeClause('team', 'no-team'), ctx)).toBe(true)
  })

  it('matches named and current sprint filters', () => {
    const ctx = makeTicketContext()
    const ticket = makeTicket({
      key: 'T-1',
      inCurrentSprint: true,
      sprints: [{ id: '42', name: 'Sprint 42' }],
    })
    expect(ticketMatchesFilter(ticket, makeClause('sprint', '42'), ctx)).toBe(true)
    expect(ticketMatchesFilter(ticket, makeClause('sprint', 'current-sprint'), ctx)).toBe(true)
    expect(ticketMatchesFilter(ticket, makeClause('sprint', '99'), ctx)).toBe(false)
  })

  it('matches project via the injected project-key resolver, defaulting to "no-project"', () => {
    const ctx = makeTicketContext({ getProjectKey: ticket => (ticket.key === 'T-1' ? 'EPIC-1' : null) })
    expect(ticketMatchesFilter(makeTicket({ key: 'T-1' }), makeClause('project', 'EPIC-1'), ctx)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-2' }), makeClause('project', 'no-project'), ctx)).toBe(true)
  })

  it('delegates project-property clauses to the resolved project, failing without one', () => {
    const project = makeProject({ key: 'EPIC-1', status: 'Paused' })
    const withProject = makeTicketContext({ getTicketProject: () => project })
    const withoutProject = makeTicketContext()
    const clause = makeClause('projectStatus', 'paused')
    const ticket = makeTicket({ key: 'T-1' })
    expect(ticketMatchesFilter(ticket, clause, withProject)).toBe(true)
    expect(ticketMatchesFilter(ticket, clause, withoutProject)).toBe(false)
  })

  it('matches initiative via the injected initiative-id resolver', () => {
    const ctx = makeTicketContext({ getTicketInitiativeIds: () => ['INIT-1'] })
    const ticket = makeTicket({ key: 'T-1' })
    expect(ticketMatchesFilter(ticket, makeClause('initiative', 'INIT-1'), ctx)).toBe(true)
    expect(ticketMatchesFilter(ticket, makeClause('initiative', 'INIT-2'), ctx)).toBe(false)
  })

  it('matches subscribers on the isWatching flag and shared on watchCount', () => {
    const ctx = makeTicketContext()
    const watching = makeTicket({ key: 'T-1', isWatching: true, watchCount: 2 })
    const silent = makeTicket({ key: 'T-2' })
    expect(ticketMatchesFilter(watching, makeClause('subscribers', 'watching'), ctx)).toBe(true)
    expect(ticketMatchesFilter(silent, makeClause('subscribers', 'not-watching'), ctx)).toBe(true)
    expect(ticketMatchesFilter(watching, makeClause('shared', 'shared'), ctx)).toBe(true)
    expect(ticketMatchesFilter(silent, makeClause('shared', 'shared'), ctx)).toBe(false)
  })

  it('matches externalSource by local vs jira key', () => {
    const ctx = makeTicketContext()
    expect(ticketMatchesFilter(makeTicket({ key: 'LOCAL-7' }), makeClause('externalSource', 'local'), ctx)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-1' }), makeClause('externalSource', 'jira'), ctx)).toBe(true)
    expect(ticketMatchesFilter(makeTicket({ key: 'T-1' }), makeClause('externalSource', 'local'), ctx)).toBe(false)
  })

  it('treats remaining field ids as date filters with an operator value', () => {
    const ctx = makeTicketContext()
    const dated = makeTicket({ key: 'T-1', dueDate: '2026-01-01T00:00:00.000Z' })
    const undated = makeTicket({ key: 'T-2' })
    expect(ticketMatchesFilter(dated, makeClause('dueDate', 'hasDate'), ctx)).toBe(true)
    expect(ticketMatchesFilter(undated, makeClause('dueDate', 'noDate'), ctx)).toBe(true)
    expect(ticketMatchesFilter(undated, makeClause('dueDate', 'hasDate'), ctx)).toBe(false)
  })
})

describe('filterTicketsByClauses', () => {
  it('returns the same array when there are no clauses and ORs clauses within a field', () => {
    const ctx = makeTicketContext()
    const tickets = [
      makeTicket({ key: 'T-1', status: 'To Do' }),
      makeTicket({ key: 'T-2', status: 'Done' }),
      makeTicket({ key: 'T-3', status: 'In Progress' }),
    ]
    expect(filterTicketsByClauses(tickets, [], ctx)).toBe(tickets)
    const filtered = filterTicketsByClauses(
      tickets,
      [makeClause('status', 'to do'), makeClause('status', 'done')],
      ctx,
    )
    expect(filtered.map(ticket => ticket.key)).toEqual(['T-1', 'T-2'])
  })
})

describe('projectMatchesFilter', () => {
  it('matches status/lead/health fields and team via the injected entries', () => {
    const project = makeProject({ key: 'EPIC-1', status: 'Paused', lead: 'Jane Doe', health: 'At risk' })
    const ctx = {
      getProjectTeamFilterEntries: () => [{ value: 'team-1', label: 'Core', icon: '◴' }],
    }
    expect(projectMatchesFilter(project, makeClause('status', 'paused'), ctx)).toBe(true)
    expect(projectMatchesFilter(project, makeClause('projectLead', 'jane doe'), ctx)).toBe(true)
    expect(projectMatchesFilter(project, makeClause('labels', 'at risk'), ctx)).toBe(true)
    expect(projectMatchesFilter(project, makeClause('team', 'team-1'), ctx)).toBe(true)
    expect(projectMatchesFilter(project, makeClause('team', 'team-2'), ctx)).toBe(false)
    expect(projectMatchesFilter(project, makeClause('subscribers', 'watching'), ctx)).toBe(true)
  })
})

describe('initiativeMatchesFilter', () => {
  it('matches status against health, lead against assignee fields, and id against initiative', () => {
    const initiative = makeInitiative({ id: 'INIT-1', health: 'Completed', lead: 'Jane Doe' })
    expect(initiativeMatchesFilter(initiative, makeClause('status', 'completed'))).toBe(true)
    expect(initiativeMatchesFilter(initiative, makeClause('assignee', 'jane doe'))).toBe(true)
    expect(initiativeMatchesFilter(initiative, makeClause('initiative', 'INIT-1'))).toBe(true)
    expect(initiativeMatchesFilter(initiative, makeClause('initiative', 'INIT-2'))).toBe(false)
  })
})

describe('savedViewMatchesFilter', () => {
  it('matches owner for assignee and category-or-name for label-like fields', () => {
    const row = makeSavedView({ id: 'view-1', owner: 'Jane Doe', category: 'Projects', name: 'Roadmap 2026' })
    expect(savedViewMatchesFilter(row, makeClause('assignee', 'jane doe'))).toBe(true)
    expect(savedViewMatchesFilter(row, makeClause('labels', 'projects'))).toBe(true)
    expect(savedViewMatchesFilter(row, makeClause('labels', 'roadmap'))).toBe(true)
    expect(savedViewMatchesFilter(row, makeClause('labels', 'issues'))).toBe(false)
  })
})

describe('countFilterOptions', () => {
  it('dedupes by value keeping the first label/icon and sorts by count desc then label asc', () => {
    const options = countFilterOptions([
      { value: 'done', label: 'Done', icon: '◌' },
      { value: 'todo', label: 'To Do', icon: '◌' },
      { value: 'done', label: 'DONE (later label ignored)', icon: '✓' },
      { value: 'blocked', label: 'Blocked', icon: '◌' },
    ])
    expect(options).toEqual([
      { value: 'done', label: 'Done', icon: '◌', count: 2 },
      { value: 'blocked', label: 'Blocked', icon: '◌', count: 1 },
      { value: 'todo', label: 'To Do', icon: '◌', count: 1 },
    ])
  })
})

describe('option builders', () => {
  it('buildIssueFilterOptions counts statuses and hides current-user assignee without matches', () => {
    const tickets = [
      makeTicket({ key: 'T-1', status: 'To Do', assignee: 'Jane Doe' }),
      makeTicket({ key: 'T-2', status: 'To Do', assignee: 'John Roe' }),
      makeTicket({ key: 'T-3', status: '', assignee: 'Jane Doe' }),
    ]
    const ctx = {
      currentUserName: '',
      projectRows: [],
      displayedProjectRows: [],
      initiativeRows: [],
      getProjectKey: () => null,
    }
    expect(buildIssueFilterOptions(tickets, 'status', ctx)).toEqual([
      { value: 'to do', label: 'To Do', icon: '◌', count: 2 },
      { value: 'no status', label: 'No status', icon: '◌', count: 1 },
    ])
    const anonymousAssignees = buildIssueFilterOptions(tickets, 'assignee', ctx)
    expect(anonymousAssignees.map(option => option.value)).toEqual(['jane doe', 'john roe'])
    const namedAssignees = buildIssueFilterOptions(tickets, 'assignee', { ...ctx, currentUserName: 'Jane Doe' })
    expect(namedAssignees).toContainEqual({ value: 'current-user', label: 'Current user', icon: '♙', count: 2 })
  })

  it('buildIssueFilterOptions lists named sprints and current sprint together', () => {
    const tickets = [
      makeTicket({
        key: 'T-1',
        inCurrentSprint: true,
        storyPoints: 2.5,
        sprints: [{ id: '42', name: 'Sprint 42' }, { id: '41', name: 'Sprint 41' }],
      }),
      makeTicket({
        key: 'T-2',
        inCurrentSprint: true,
        storyPoints: 3,
        sprints: [{ id: '42', name: 'Sprint 42' }, { id: '41', name: 'Sprint 41' }],
      }),
      makeTicket({ key: 'T-3', inCurrentSprint: true, sprints: [{ id: '42', name: 'Sprint 42' }] }),
    ]
    const ctx = {
      currentUserName: '',
      projectRows: [],
      displayedProjectRows: [],
      initiativeRows: [],
      getProjectKey: () => null,
    }

    expect(buildIssueFilterOptions(tickets, 'sprint', ctx)).toEqual([
      { value: 'current-sprint', label: 'Current sprint', icon: '◷', count: 3, storyPoints: 5.5 },
      { value: '42', label: 'Sprint 42', icon: '◷', count: 3, storyPoints: 5.5 },
      { value: '41', label: 'Sprint 41', icon: '◷', count: 2, storyPoints: 5.5 },
    ])
  })

  it('buildProjectFilterOptions counts project statuses', () => {
    const projects = [
      makeProject({ key: 'EPIC-1', status: 'In Progress' }),
      makeProject({ key: 'EPIC-2', status: 'In Progress' }),
      makeProject({ key: 'EPIC-3', status: '' }),
    ]
    const ctx = {
      currentUserName: '',
      initiativeRows: [],
      getProjectTeamFilterEntries: () => [],
    }
    expect(buildProjectFilterOptions(projects, 'status', ctx)).toEqual([
      { value: 'in progress', label: 'In Progress', icon: '◌', count: 2 },
      { value: 'no status', label: 'No status', icon: '◌', count: 1 },
    ])
  })

  it('buildInitiativeFilterOptions maps status to health with health-specific icons', () => {
    const initiatives = [
      makeInitiative({ id: 'INIT-1', health: 'Completed' }),
      makeInitiative({ id: 'INIT-2', health: 'At risk' }),
      makeInitiative({ id: 'INIT-3', health: 'On track' }),
    ]
    expect(buildInitiativeFilterOptions(initiatives, 'status')).toEqual([
      { value: 'at risk', label: 'At risk', icon: '◆', count: 1 },
      { value: 'completed', label: 'Completed', icon: '✓', count: 1 },
      { value: 'on track', label: 'On track', icon: '○', count: 1 },
    ])
  })

  it('buildSavedViewFilterOptions counts owners for assignee', () => {
    const rows = [
      makeSavedView({ id: 'view-1', owner: 'Jane Doe' }),
      makeSavedView({ id: 'view-2', owner: 'Jane Doe' }),
      makeSavedView({ id: 'view-3', owner: 'John Roe' }),
    ]
    expect(buildSavedViewFilterOptions(rows, 'assignee')).toEqual([
      { value: 'jane doe', label: 'Jane Doe', icon: '♙', count: 2 },
      { value: 'john roe', label: 'John Roe', icon: '♙', count: 1 },
    ])
  })
})
