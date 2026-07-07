/**
 * Characterization tests for the issue focus/multi-select state extracted
 * from useTicketListController.ts into useIssueSelection.ts (refactor plan
 * task 6.5). Locks in toggle/anchor semantics, range merging via the visible
 * flat ticket list, focus-follows-selection, and the reconciliation watch
 * that drops focus/anchor when the displayed tickets change.
 */
import type { IssueSection } from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import { describe, expect, it } from 'vitest'
import { computed, effectScope, nextTick, ref } from 'vue'
import { useIssueSelection } from '@/features/ticket-list/useIssueSelection'

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

function setup(initialKeys: string[]) {
  const tickets = ref(initialKeys.map(key => makeTicket({ key })))
  const selectedKey = ref<string | null>(null)
  const collapsedIssueSectionIds = ref<string[]>([])
  const issueSections = computed<IssueSection[]>(() => [
    { id: 'all', label: 'All', tickets: tickets.value },
  ])
  const scope = effectScope()
  const selection = scope.run(() =>
    useIssueSelection({
      selectedKey,
      issueSections,
      collapsedIssueSectionIds,
      tickets: computed(() => tickets.value),
      getFlatVisibleTickets: () => issueSections.value.flatMap(section => section.tickets),
      getDisplayedIssueRowKey: ticket => ticket.key,
    }),
  )
  if (!selection) {
    throw new Error('effectScope.run returned undefined')
  }
  return { tickets, selectedKey, scope, selection }
}

describe('initial reconciliation', () => {
  it('focuses the first visible ticket immediately', () => {
    const { selection, scope } = setup(['A-1', 'A-2'])
    expect(selection.focusedIssueKey.value).toBe('A-1')
    expect(selection.selectionAnchorKey.value).toBeNull()
    scope.stop()
  })

  it('leaves focus null when there are no visible tickets', () => {
    const { selection, scope } = setup([])
    expect(selection.focusedIssueKey.value).toBeNull()
    scope.stop()
  })
})

describe('toggleCheckedIssue', () => {
  it('adds then removes a key and moves the anchor to the toggled key', () => {
    const { selection, scope } = setup(['A-1', 'A-2'])
    selection.toggleCheckedIssue('A-2')
    expect(selection.checkedIssueKeys.value).toEqual(['A-2'])
    expect(selection.checkedIssueKeySet.value.has('A-2')).toBe(true)
    expect(selection.checkedIssueCount.value).toBe(1)
    expect(selection.selectionAnchorKey.value).toBe('A-2')
    selection.toggleCheckedIssue('A-2')
    expect(selection.checkedIssueKeys.value).toEqual([])
    // Anchor stays on the last toggled key even after unchecking.
    expect(selection.selectionAnchorKey.value).toBe('A-2')
    scope.stop()
  })
})

describe('checkedIssues', () => {
  it('resolves checked keys to tickets, dropping keys with no ticket', () => {
    const { selection, scope } = setup(['A-1', 'A-2'])
    selection.toggleCheckedIssue('A-2')
    selection.toggleCheckedIssue('GONE-1')
    expect(selection.checkedIssues.value.map(ticket => ticket.key)).toEqual(['A-2'])
    expect(selection.checkedIssueCount.value).toBe(2)
    scope.stop()
  })
})

describe('addCheckedIssueRange', () => {
  it('merges the anchor→target range into the existing checked set', () => {
    const { selection, scope } = setup(['A-1', 'A-2', 'A-3', 'A-4'])
    selection.toggleCheckedIssue('A-1')
    selection.addCheckedIssueRange('A-2', 'A-4')
    expect(selection.checkedIssueKeys.value).toEqual(['A-1', 'A-2', 'A-3', 'A-4'])
    scope.stop()
  })

  it('works with a reversed (target above anchor) range', () => {
    const { selection, scope } = setup(['A-1', 'A-2', 'A-3'])
    selection.addCheckedIssueRange('A-3', 'A-1')
    expect(selection.checkedIssueKeys.value).toEqual(['A-1', 'A-2', 'A-3'])
    scope.stop()
  })

  it('falls back to just the target when the anchor is not visible', () => {
    const { selection, scope } = setup(['A-1', 'A-2'])
    selection.addCheckedIssueRange('GONE-1', 'A-2')
    expect(selection.checkedIssueKeys.value).toEqual(['A-2'])
    scope.stop()
  })
})

describe('clearCheckedIssues', () => {
  it('empties the checked set and the anchor', () => {
    const { selection, scope } = setup(['A-1', 'A-2'])
    selection.toggleCheckedIssue('A-1')
    selection.clearCheckedIssues()
    expect(selection.checkedIssueKeys.value).toEqual([])
    expect(selection.selectionAnchorKey.value).toBeNull()
    scope.stop()
  })
})

describe('focus follows selection', () => {
  it('moves focus to the opened ticket key and keeps it when deselected', async () => {
    const { selection, selectedKey, scope } = setup(['A-1', 'A-2'])
    selectedKey.value = 'A-2'
    await nextTick()
    expect(selection.focusedIssueKey.value).toBe('A-2')
    selectedKey.value = null
    await nextTick()
    expect(selection.focusedIssueKey.value).toBe('A-2')
    scope.stop()
  })
})

describe('reconciliation watch', () => {
  it('re-focuses the first ticket when the focused ticket disappears', async () => {
    const { selection, tickets, scope } = setup(['A-1', 'A-2', 'A-3'])
    selection.focusedIssueKey.value = 'A-3'
    tickets.value = tickets.value.filter(ticket => ticket.key !== 'A-3')
    await nextTick()
    expect(selection.focusedIssueKey.value).toBe('A-1')
    scope.stop()
  })

  it('keeps focus when the focused ticket is still visible', async () => {
    const { selection, tickets, scope } = setup(['A-1', 'A-2', 'A-3'])
    selection.focusedIssueKey.value = 'A-2'
    tickets.value = tickets.value.filter(ticket => ticket.key !== 'A-3')
    await nextTick()
    expect(selection.focusedIssueKey.value).toBe('A-2')
    scope.stop()
  })

  it('drops the anchor when the anchor ticket disappears but keeps checked keys', async () => {
    const { selection, tickets, scope } = setup(['A-1', 'A-2'])
    selection.toggleCheckedIssue('A-2')
    tickets.value = tickets.value.filter(ticket => ticket.key !== 'A-2')
    await nextTick()
    expect(selection.selectionAnchorKey.value).toBeNull()
    expect(selection.checkedIssueKeys.value).toEqual(['A-2'])
    scope.stop()
  })

  it('clears focus and anchor when no tickets are visible', async () => {
    const { selection, tickets, scope } = setup(['A-1'])
    selection.selectionAnchorKey.value = 'A-1'
    tickets.value = []
    await nextTick()
    expect(selection.focusedIssueKey.value).toBeNull()
    expect(selection.selectionAnchorKey.value).toBeNull()
    scope.stop()
  })
})
