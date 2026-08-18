/**
 * Characterization tests for the ticket cache-merge semantics.
 *
 * These tests lock in what the CURRENT code does (discovered by reading and
 * running it), ahead of a refactor that will consolidate the duplicated merge
 * algorithm. The canonical exported helper is `mergeTicketList` in
 * src/composables/useLocalTickets.ts; the private `mergeTicket` clone in
 * src/composables/useUpdateTicketTitle.ts (and `mergeUpdatedTicket` inside
 * useJiraTickets) implement the same algorithm.
 */
import type { JiraTicket } from '@/types/jira'
import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it } from 'vitest'
import { TICKETS_QUERY_KEY, ticketsQueryKey } from '@/composables/queryKeys'
import { mergeTicketList } from '@/composables/ticketCache'
import { getCachedTickets, getCachedTicketsQueryKey } from '@/composables/useJiraTickets'

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

function nth<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined)
    throw new Error(`Expected an item at index ${index}`)
  return item
}

describe('mergeTicketList', () => {
  it('replaces the entry matching by key with a shallow merge {...ticket, ...updatedTicket}', () => {
    const original = makeTicket({
      key: 'T-1',
      summary: 'old summary',
      status: 'To Do',
      description: 'old description',
      parent: { key: 'P-1', summary: 'parent', issueType: 'Epic' },
    })
    const updated = makeTicket({
      key: 'T-1',
      summary: 'new summary',
      status: 'In Progress',
      // no `description` property and no `parent` property at all
    })
    delete updated.description

    const result = nth(mergeTicketList([original], updated), 0)

    // New object, not the original or the updated ticket itself.
    expect(result).not.toBe(original)
    expect(result).not.toBe(updated)

    // Fields present on the updated ticket win.
    expect(result.summary).toBe('new summary')
    expect(result.status).toBe('In Progress')

    // Shallow merge: keys absent from the updated ticket survive from the
    // original. Note `parent` survives too — the self-match branch does NOT
    // clear or refresh the parent when the updated ticket has no parent key.
    expect(result.description).toBe('old description')
    expect(result.parent).toBe(original.parent)
  })

  it('shallow merge replaces (does not deep-merge) nested objects present on the updated ticket', () => {
    const original = makeTicket({
      key: 'T-1',
      parent: { key: 'P-old', summary: 'old parent', issueType: 'Epic' },
      labels: ['keep-me?'],
    })
    const updated = makeTicket({
      key: 'T-1',
      parent: { key: 'P-new', summary: 'new parent', issueType: 'Story' },
      labels: [],
    })

    const result = nth(mergeTicketList([original], updated), 0)

    // The updated ticket's parent object replaces the old one wholesale.
    expect(result.parent).toBe(updated.parent)
    // Arrays are replaced by reference too.
    expect(result.labels).toBe(updated.labels)
  })

  it('refreshes exactly parent.summary and parent.issueType on children of the updated ticket', () => {
    const child = makeTicket({
      key: 'C-1',
      summary: 'child summary',
      status: 'To Do',
      parent: { key: 'P-1', summary: 'old parent summary', issueType: 'Epic' },
    })
    const updatedParent = makeTicket({
      key: 'P-1',
      summary: 'new parent summary',
      status: 'Done',
      issueType: 'Initiative',
      assignee: 'someone-new',
    })

    const result = nth(mergeTicketList([child], updatedParent), 0)

    // New ticket object with a new parent object.
    expect(result).not.toBe(child)
    expect(result.parent).not.toBe(child.parent)

    // Exactly these parent fields propagate: summary and issueType.
    // parent.key is preserved from the old parent via the spread.
    expect(result.parent).toEqual({
      key: 'P-1',
      summary: 'new parent summary',
      issueType: 'Initiative',
    })

    // Nothing else on the child changes.
    expect(result.summary).toBe('child summary')
    expect(result.status).toBe('To Do')
    expect(result.assignee).toBe('nobody')
  })

  it('passes non-matching entries through by identity', () => {
    const unrelated = makeTicket({ key: 'U-1' })
    const noParent = makeTicket({ key: 'U-2' }) // exercises ticket.parent?.key with no parent
    const otherParent = makeTicket({
      key: 'U-3',
      parent: { key: 'OTHER-1', summary: 'other', issueType: 'Epic' },
    })
    const updated = makeTicket({ key: 'T-1' })

    const result = mergeTicketList([unrelated, noParent, otherParent], updated)

    expect(result[0]).toBe(unrelated)
    expect(result[1]).toBe(noParent)
    expect(result[2]).toBe(otherParent)
  })

  it('returns a new empty array for an empty list', () => {
    const input: JiraTicket[] = []
    const result = mergeTicketList(input, makeTicket({ key: 'T-1' }))

    expect(result).toEqual([])
    expect(result).not.toBe(input) // .map always returns a new array
  })

  it('does NOT append the updated ticket when it is not present in the list', () => {
    const existing = makeTicket({ key: 'A-1' })
    const result = mergeTicketList([existing], makeTicket({ key: 'MISSING-1' }))

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(existing)
  })

  it('self-match wins over parent-match: a ticket that is its own parent gets merged, parent is not refreshed', () => {
    // A ticket whose key AND parent.key both equal the updated key. The key
    // check runs first, so the parent-propagation branch is never reached.
    const selfParented = makeTicket({
      key: 'T-1',
      summary: 'old',
      parent: { key: 'T-1', summary: 'stale parent summary', issueType: 'Epic' },
    })
    const updated = makeTicket({ key: 'T-1', summary: 'new', issueType: 'Story' })
    // Updated ticket has no `parent` property, so the shallow merge keeps the
    // stale parent object untouched — it is NOT refreshed to the new summary.

    const result = nth(mergeTicketList([selfParented], updated), 0)

    expect(result.summary).toBe('new')
    expect(result.parent).toBe(selfParented.parent)
    expect(result.parent).toEqual({
      key: 'T-1',
      summary: 'stale parent summary',
      issueType: 'Epic',
    })
  })

  it('updates every matching entry, including duplicates and multiple children', () => {
    const dupA = makeTicket({ key: 'T-1', summary: 'dup a' })
    const dupB = makeTicket({ key: 'T-1', summary: 'dup b' })
    const childA = makeTicket({
      key: 'C-1',
      parent: { key: 'T-1', summary: 'old', issueType: 'Task' },
    })
    const childB = makeTicket({
      key: 'C-2',
      parent: { key: 'T-1', summary: 'old', issueType: 'Task' },
    })
    const updated = makeTicket({ key: 'T-1', summary: 'fresh', issueType: 'Story' })

    const result = mergeTicketList([dupA, dupB, childA, childB], updated)

    expect(nth(result, 0).summary).toBe('fresh')
    expect(nth(result, 1).summary).toBe('fresh')
    expect(nth(result, 2).parent?.summary).toBe('fresh')
    expect(nth(result, 3).parent?.summary).toBe('fresh')
    expect(nth(result, 2).parent?.issueType).toBe('Story')
  })
})

// getCachedTicketsQueryKey / getCachedTickets are pure enough to test with a
// standalone QueryClient in node: they only use getQueryCache().findAll() and
// getQueryData(), neither of which requires a Vue component context.
describe('getCachedTicketsQueryKey / getCachedTickets', () => {
  it('returns the bare TICKETS_QUERY_KEY constant (by identity) when no tickets queries are cached', () => {
    const queryClient = new QueryClient()

    expect(getCachedTicketsQueryKey(queryClient)).toBe(TICKETS_QUERY_KEY)
    expect(getCachedTickets(queryClient)).toBeUndefined()
  })

  it('ticketsQueryKey prefixes with TICKETS_QUERY_KEY and a schema version segment', () => {
    expect(ticketsQueryKey(['A', 'B'])).toEqual(['tickets', 'sprint-state-v1', 'A', 'B'])
    expect(ticketsQueryKey([])).toEqual(['tickets', 'sprint-state-v1'])
  })

  it('returns the single cached tickets query key and its data', () => {
    const queryClient = new QueryClient()
    const key = ticketsQueryKey(['SPACE'])
    const tickets = [makeTicket({ key: 'T-1' })]
    queryClient.setQueryData(key, tickets)

    expect(getCachedTicketsQueryKey(queryClient)).toEqual(key)
    expect(getCachedTickets(queryClient)).toEqual(tickets)
  })

  it('ignores queries whose key does not start with "tickets"', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['ticket', 'T-1'], makeTicket({ key: 'T-1' }))
    queryClient.setQueryData(['spaces'], [])

    expect(getCachedTicketsQueryKey(queryClient)).toBe(TICKETS_QUERY_KEY)
  })

  it('picks the tickets query with the most recent dataUpdatedAt among multiple entries', () => {
    const queryClient = new QueryClient()
    const olderKey = ticketsQueryKey(['A'])
    const newerKey = ticketsQueryKey(['B'])
    const olderTickets = [makeTicket({ key: 'OLD-1' })]
    const newerTickets = [makeTicket({ key: 'NEW-1' })]

    queryClient.setQueryData(olderKey, olderTickets, { updatedAt: 1_000 })
    queryClient.setQueryData(newerKey, newerTickets, { updatedAt: 2_000 })

    expect(getCachedTicketsQueryKey(queryClient)).toEqual(newerKey)
    expect(getCachedTickets(queryClient)).toEqual(newerTickets)
  })

  it('breaks dataUpdatedAt ties in favor of the first-inserted query (strict > comparison)', () => {
    const queryClient = new QueryClient()
    const firstKey = ticketsQueryKey(['FIRST'])
    const secondKey = ticketsQueryKey(['SECOND'])

    queryClient.setQueryData(firstKey, [makeTicket({ key: 'F-1' })], { updatedAt: 5_000 })
    queryClient.setQueryData(secondKey, [makeTicket({ key: 'S-1' })], { updatedAt: 5_000 })

    expect(getCachedTicketsQueryKey(queryClient)).toEqual(firstKey)
  })

  it('matches loosely on the "tickets" prefix: even a bare ["tickets"] entry participates', () => {
    const queryClient = new QueryClient()
    const bareTickets = [makeTicket({ key: 'BARE-1' })]
    queryClient.setQueryData([...TICKETS_QUERY_KEY], bareTickets, { updatedAt: 9_000 })
    queryClient.setQueryData(ticketsQueryKey(['A']), [makeTicket({ key: 'A-1' })], { updatedAt: 1_000 })

    expect(getCachedTicketsQueryKey(queryClient)).toEqual(['tickets'])
    expect(getCachedTickets(queryClient)).toEqual(bareTickets)
  })
})
