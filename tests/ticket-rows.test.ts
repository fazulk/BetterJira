/**
 * Characterization tests for the base row-derivation pipeline extracted from
 * useTicketListController.ts into useTicketRows.ts (refactor plan task 6.4).
 * These lock in what the CURRENT code does: epic → project aggregation with
 * source-ticket field precedence, parent-chain traversal with a cycle guard,
 * initiative grouping with lead fallback, and the first-wins key→ticket Map
 * that replaced the O(n²) `Array#find` parent lookups.
 */
import type { JiraTicket } from '@/types/jira'
import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { formatCompactDate } from '@/features/ticket-list/helpers'
import { useTicketRows } from '@/features/ticket-list/useTicketRows'

function makeTicket(overrides: Partial<JiraTicket> & { key: string }): JiraTicket {
  return {
    summary: `Summary for ${overrides.key}`,
    status: 'In Progress',
    statusCategory: 'indeterminate',
    inCurrentSprint: false,
    priority: 'Medium',
    issueType: 'Task',
    labels: [],
    spaceKey: 'SPACE',
    spaceName: 'Space',
    assignee: 'Unassigned',
    self: `https://jira.example.com/browse/${overrides.key}`,
    ...overrides,
  }
}

function makeEpic(overrides: Partial<JiraTicket> & { key: string }): JiraTicket {
  return makeTicket({ issueType: 'Epic', ...overrides })
}

function makeInitiative(overrides: Partial<JiraTicket> & { key: string }): JiraTicket {
  return makeTicket({ issueType: 'Initiative', ...overrides })
}

function parentRef(ticket: JiraTicket): NonNullable<JiraTicket['parent']> {
  return { key: ticket.key, summary: ticket.summary, issueType: ticket.issueType }
}

function setup(tickets: JiraTicket[]) {
  const source = ref(tickets)
  return {
    source,
    rows: useTicketRows({ enabledTickets: computed(() => source.value) }),
  }
}

describe('projectRows aggregation', () => {
  it('groups child issues under their epic and counts done issues into progress', () => {
    const epic = makeEpic({ key: 'EPIC-1', summary: 'The epic', status: 'In Progress' })
    const done = makeTicket({
      key: 'ISS-1',
      statusCategory: 'done',
      parent: parentRef(epic),
    })
    const open = makeTicket({ key: 'ISS-2', parent: parentRef(epic) })
    const { rows } = setup([epic, done, open])

    expect(rows.projectRows.value).toHaveLength(1)
    const project = rows.projectRows.value[0]
    expect(project?.key).toBe('EPIC-1')
    expect(project?.name).toBe('The epic')
    expect(project?.issueCount).toBe(2)
    expect(project?.completedCount).toBe(1)
    expect(project?.progress).toBe(50)
    // The epic itself is not counted as one of its own issues.
    expect(project?.health).toBe('On track')
  })

  it('prefers the source (epic) ticket fields even when a child is seen first', () => {
    const epic = makeEpic({
      key: 'EPIC-1',
      summary: 'Epic summary',
      priority: 'High',
      assignee: 'Epic Lead',
      status: 'Blocked',
      dueDate: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      spaceKey: 'EPICSPACE',
      spaceName: 'Epic Space',
    })
    const child = makeTicket({
      key: 'ISS-1',
      priority: 'Low',
      assignee: 'Child Person',
      updatedAt: '2026-05-01T00:00:00.000Z',
      parent: parentRef(epic),
    })
    // Child appears BEFORE the epic in the list.
    const { rows } = setup([child, epic])

    const project = rows.projectRows.value[0]
    expect(project?.name).toBe('Epic summary')
    expect(project?.priority).toBe('High')
    expect(project?.lead).toBe('Epic Lead')
    expect(project?.status).toBe('Blocked')
    expect(project?.health).toBe('At risk')
    expect(project?.targetDateValue).toBe('2026-08-01T00:00:00.000Z')
    expect(project?.spaceKey).toBe('EPICSPACE')
  })

  it('falls back to a child dueDate for targetDate when the epic has none, and takes the max updatedAt', () => {
    const epic = makeEpic({ key: 'EPIC-1', updatedAt: '2026-01-01T00:00:00.000Z' })
    const child = makeTicket({
      key: 'ISS-1',
      dueDate: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      parent: parentRef(epic),
    })
    const { rows } = setup([epic, child])

    const project = rows.projectRows.value[0]
    expect(project?.targetDateValue).toBe('2026-09-15T00:00:00.000Z')
    expect(project?.targetDate).toBe(formatCompactDate('2026-09-15T00:00:00.000Z'))
    expect(project?.updatedAt).toBe('2026-03-01T00:00:00.000Z')
  })

  it('renders "No target" and default labels when the epic is missing from the ticket list', () => {
    const child = makeTicket({
      key: 'ISS-1',
      parent: { key: 'EPIC-GHOST', summary: 'Ghost epic', issueType: 'Epic' },
    })
    const { rows } = setup([child])

    const project = rows.projectRows.value[0]
    expect(project?.key).toBe('EPIC-GHOST')
    expect(project?.name).toBe('Ghost epic')
    expect(project?.targetDate).toBe('No target')
    expect(project?.lead).toBe('Unassigned')
  })

  it('sorts by health rank, then priority rank, then most recently updated, then key', () => {
    const atRisk = makeEpic({ key: 'EPIC-RISK', status: 'Blocked' })
    const completed = makeEpic({ key: 'EPIC-DONE', status: 'Done' })
    const onTrackHigh = makeEpic({ key: 'EPIC-HIGH', status: 'In Progress', priority: 'High' })
    const onTrackLow = makeEpic({ key: 'EPIC-LOW', status: 'In Progress', priority: 'Low' })
    // Give the on-track epics enough done children to clear the <20% at-risk floor.
    const children = [onTrackHigh, onTrackLow].map(epic =>
      makeTicket({ key: `${epic.key}-C1`, statusCategory: 'done', parent: parentRef(epic) }),
    )
    const openChildren = [onTrackHigh, onTrackLow].map(epic =>
      makeTicket({ key: `${epic.key}-C2`, parent: parentRef(epic) }),
    )
    const { rows } = setup([completed, onTrackLow, onTrackHigh, atRisk, ...children, ...openChildren])

    expect(rows.projectRows.value.map(project => project.key)).toEqual([
      'EPIC-RISK',
      'EPIC-HIGH',
      'EPIC-LOW',
      'EPIC-DONE',
    ])
  })
})

describe('parent-chain traversal', () => {
  it('walks a sub-issue → story → epic chain to resolve the project key', () => {
    const epic = makeEpic({ key: 'EPIC-1' })
    const story = makeTicket({ key: 'STORY-1', issueType: 'Story', parent: parentRef(epic) })
    const sub = makeTicket({ key: 'SUB-1', issueType: 'Sub-task', parent: parentRef(story) })
    const { rows } = setup([epic, story, sub])

    expect(rows.getProjectKey(sub)).toBe('EPIC-1')
    expect(rows.getProjectKey(story)).toBe('EPIC-1')
    expect(rows.getProjectKey(epic)).toBe('EPIC-1')
  })

  it('returns null for initiatives and for parent cycles (visitedKeys guard)', () => {
    const initiative = makeInitiative({ key: 'INIT-1' })
    const cycleA = makeTicket({
      key: 'A-1',
      parent: { key: 'B-1', summary: 'B', issueType: 'Task' },
    })
    const cycleB = makeTicket({
      key: 'B-1',
      parent: { key: 'A-1', summary: 'A', issueType: 'Task' },
    })
    const { rows } = setup([initiative, cycleA, cycleB])

    expect(rows.getProjectKey(initiative)).toBeNull()
    expect(rows.getProjectKey(cycleA)).toBeNull()
    expect(rows.getProjectKey(cycleB)).toBeNull()
  })

  it('resolves the initiative parent through the chain, including via loaded parent tickets', () => {
    const initiative = makeInitiative({ key: 'INIT-1', summary: 'Big bet' })
    const epic = makeEpic({ key: 'EPIC-1', parent: parentRef(initiative) })
    const child = makeTicket({ key: 'ISS-1', parent: parentRef(epic) })
    const { rows } = setup([initiative, epic, child])

    const project = rows.projectRows.value[0]
    expect(project?.initiativeKey).toBe('INIT-1')
    expect(project?.initiativeName).toBe('Big bet')
    // Chain walk: the child's parent ref (epic) does not carry the initiative
    // issue type, so resolution goes through the loaded epic ticket.
    expect(rows.getTicketInitiativeIds(child)).toEqual(['INIT-1'])
    expect(rows.getTicketInitiativeIds(initiative)).toEqual(['INIT-1'])
  })
})

describe('baseInitiativeRows', () => {
  it('groups projects under initiatives and aggregates counts/progress', () => {
    const initiative = makeInitiative({ key: 'INIT-1', summary: 'Big bet', assignee: 'Init Lead' })
    const epicA = makeEpic({ key: 'EPIC-A', parent: parentRef(initiative) })
    const epicB = makeEpic({ key: 'EPIC-B', parent: parentRef(initiative) })
    const doneChild = makeTicket({ key: 'ISS-1', statusCategory: 'done', parent: parentRef(epicA) })
    const openChild = makeTicket({ key: 'ISS-2', parent: parentRef(epicB) })
    const { rows } = setup([initiative, epicA, epicB, doneChild, openChild])

    expect(rows.baseInitiativeRows.value).toHaveLength(1)
    const row = rows.baseInitiativeRows.value[0]
    expect(row?.id).toBe('INIT-1')
    expect(row?.name).toBe('Big bet')
    expect(row?.projectCount).toBe(2)
    expect(row?.issueCount).toBe(2)
    expect(row?.completedCount).toBe(1)
    expect(row?.progress).toBe(50)
    expect(row?.lead).toBe('Init Lead')
    expect(row?.description).toBe('Space initiative')
  })

  it('lists initiatives with no projects, and synthesizes rows for unloaded initiative parents', () => {
    const emptyInitiative = makeInitiative({ key: 'INIT-EMPTY' })
    const epic = makeEpic({
      key: 'EPIC-1',
      parent: { key: 'INIT-GHOST', summary: 'Ghost initiative', issueType: 'Initiative' },
    })
    const { rows } = setup([emptyInitiative, epic])

    const ids = rows.baseInitiativeRows.value.map(row => row.id)
    expect(ids).toContain('INIT-EMPTY')
    expect(ids).toContain('INIT-GHOST')
    const ghost = rows.baseInitiativeRows.value.find(row => row.id === 'INIT-GHOST')
    expect(ghost?.name).toBe('Ghost initiative')
    expect(ghost?.description).toBe('Parent of 1 epic from Jira hierarchy')
  })

  it('falls back to the most common project lead when the initiative ticket is unassigned', () => {
    const initiative = makeInitiative({ key: 'INIT-1', assignee: 'Unassigned' })
    const epicA = makeEpic({ key: 'EPIC-A', assignee: 'Alice', parent: parentRef(initiative) })
    const epicB = makeEpic({ key: 'EPIC-B', assignee: 'Alice', parent: parentRef(initiative) })
    const epicC = makeEpic({ key: 'EPIC-C', assignee: 'Bob', parent: parentRef(initiative) })
    const { rows } = setup([initiative, epicA, epicB, epicC])

    expect(rows.baseInitiativeRows.value[0]?.lead).toBe('Alice')
  })
})

describe('lookup helpers', () => {
  it('getTicketProject resolves the aggregated project row for a child issue', () => {
    const epic = makeEpic({ key: 'EPIC-1' })
    const child = makeTicket({ key: 'ISS-1', parent: parentRef(epic) })
    const orphan = makeTicket({ key: 'ISS-ORPHAN' })
    const { rows } = setup([epic, child, orphan])

    expect(rows.getTicketProject(child)?.key).toBe('EPIC-1')
    expect(rows.getTicketProject(orphan)).toBeNull()
  })

  it('getProjectTeamFilterEntries dedupes teams across a project, with a no-team fallback', () => {
    const epic = makeEpic({ key: 'EPIC-1', team: { id: 'team-a', name: 'Team A' } })
    const childA = makeTicket({
      key: 'ISS-1',
      team: { id: 'team-a', name: 'Team A' },
      parent: parentRef(epic),
    })
    const childB = makeTicket({ key: 'ISS-2', parent: parentRef(epic) })
    const { rows } = setup([epic, childA, childB])

    const project = rows.projectRows.value[0]
    expect(project).toBeDefined()
    if (!project)
      return
    expect(rows.getProjectTeamFilterEntries(project)).toEqual([
      { value: 'team-a', label: 'Team A', icon: '◴' },
      { value: 'no-team', label: 'No team', icon: '◴' },
    ])
  })

  it('pins first-wins semantics for duplicate ticket keys (Array#find parity)', () => {
    const initiative = makeInitiative({ key: 'INIT-1', summary: 'Big bet' })
    const epicFirst = makeEpic({
      key: 'EPIC-1',
      summary: 'First epic',
      parent: parentRef(initiative),
    })
    const epicDuplicate = makeEpic({ key: 'EPIC-1', summary: 'Duplicate epic' })
    const child = makeTicket({ key: 'ISS-1', parent: parentRef(epicFirst) })
    const { rows } = setup([epicFirst, epicDuplicate, initiative, child])

    // The FIRST ticket with a given key is the source of truth, exactly like
    // the original `enabledTickets.value.find(...)` lookups.
    const project = rows.projectRows.value[0]
    expect(rows.projectRows.value).toHaveLength(1)
    expect(project?.name).toBe('First epic')
    expect(project?.initiativeKey).toBe('INIT-1')
  })
})
