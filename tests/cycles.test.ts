import type { Cycle } from '~/shared/cycles'
import { describe, expect, it } from 'vitest'
import {
  assignedCycleFromTicket,
  classifyCycles,
  cycleDaysRemaining,
  cycleProgress,
  formatCycleDateRange,
  nextCycleName,
  pickPreviousCycle,
  pickUpcomingCycle,
  resolveClassifiedCycles,
  ticketBelongsToCycle,
} from '~/shared/cycles'

function makeCycle(overrides: Partial<Cycle> & Pick<Cycle, 'id' | 'state'>): Cycle {
  return {
    name: `Sprint ${overrides.id}`,
    ...overrides,
  }
}

describe('classifyCycles', () => {
  it('picks the active sprint as current, the soonest future as upcoming, and the latest closed as previous', () => {
    const current = makeCycle({ id: '2', state: 'active', startDate: '2026-08-10T00:00:00.000Z' })
    const later = makeCycle({ id: '4', state: 'future', startDate: '2026-09-07T00:00:00.000Z' })
    const next = makeCycle({ id: '3', state: 'future', startDate: '2026-08-24T00:00:00.000Z' })
    const past = makeCycle({ id: '1', state: 'closed' })

    expect(classifyCycles([past, later, current, next])).toEqual({
      current,
      upcoming: next,
      previous: past,
    })
  })

  it('returns nulls when there is no active or future sprint', () => {
    const past = makeCycle({ id: '1', state: 'closed' })
    expect(classifyCycles([past])).toEqual({
      current: null,
      upcoming: null,
      previous: past,
    })
    expect(classifyCycles([])).toEqual({
      current: null,
      upcoming: null,
      previous: null,
    })
  })
})

describe('resolveClassifiedCycles', () => {
  it('fills previous from ticket sprint membership when the payload omitted it', () => {
    const previous = makeCycle({
      id: '1',
      state: 'closed',
      completeDate: '2026-08-10T00:00:00.000Z',
    })
    const older = makeCycle({
      id: '0',
      state: 'closed',
      completeDate: '2026-07-13T00:00:00.000Z',
    })

    expect(resolveClassifiedCycles({
      cycles: [],
      current: null,
      upcoming: null,
      previous: null,
    }, [
      { sprints: [{ id: previous.id, name: previous.name, state: 'closed' }] },
      { sprints: [{ id: older.id, name: older.name, state: 'closed' }, { id: previous.id, name: previous.name, state: 'closed' }] },
    ]).previous).toEqual({
      id: '1',
      name: previous.name,
      state: 'closed',
    })
  })

  it('keeps payload current ahead of ticket-derived sprints', () => {
    const current = makeCycle({ id: '2', state: 'active' })
    expect(resolveClassifiedCycles({
      cycles: [current],
      current,
      upcoming: null,
      previous: null,
    }, [
      { sprints: [{ id: '9', name: 'Other', state: 'active' }] },
    ]).current).toEqual(current)
  })
})

describe('pickUpcomingCycle', () => {
  it('prefers undated future sprints last and breaks ties by id', () => {
    const dated = makeCycle({ id: '10', state: 'future', startDate: '2026-09-01T00:00:00.000Z' })
    const undatedA = makeCycle({ id: '2', state: 'future' })
    const undatedB = makeCycle({ id: '9', state: 'future' })

    expect(pickUpcomingCycle([undatedB, dated, undatedA])).toEqual(dated)
    expect(pickUpcomingCycle([undatedB, undatedA])?.id).toBe('2')
  })
})

describe('pickPreviousCycle', () => {
  it('picks the most recently completed sprint', () => {
    const older = makeCycle({
      id: '1',
      state: 'closed',
      completeDate: '2026-07-20T00:00:00.000Z',
    })
    const newer = makeCycle({
      id: '2',
      state: 'closed',
      completeDate: '2026-08-10T00:00:00.000Z',
    })
    const alsoNew = makeCycle({
      id: '3',
      state: 'closed',
      endDate: '2026-08-10T00:00:00.000Z',
    })

    expect(pickPreviousCycle([older, newer])).toEqual(newer)
    expect(pickPreviousCycle([older, alsoNew, newer])?.id).toBe('3')
  })
})

describe('nextCycleName', () => {
  it('increments the highest trailing number across sprint names', () => {
    expect(nextCycleName([
      makeCycle({ id: '1', name: 'Sprint 12', state: 'closed' }),
      makeCycle({ id: '2', name: 'Cycle 3', state: 'active' }),
    ])).toBe('Sprint 13')
  })

  it('starts at Sprint 1 when nothing is numbered', () => {
    expect(nextCycleName([makeCycle({ id: 'a', name: 'Planning', state: 'future' })])).toBe('Sprint 1')
    expect(nextCycleName([])).toBe('Sprint 1')
  })
})

describe('cycleProgress', () => {
  it('uses story points when any ticket has them', () => {
    expect(cycleProgress([
      { statusCategory: 'done', storyPoints: 2 },
      { statusCategory: 'indeterminate', storyPoints: 3 },
      { statusCategory: 'new' },
    ])).toEqual({
      completedCount: 1,
      totalCount: 3,
      completedPoints: 2,
      totalPoints: 5,
      usesPoints: true,
      percent: 40,
    })
  })

  it('falls back to issue counts when there are no points', () => {
    expect(cycleProgress([
      { statusCategory: 'done' },
      { statusCategory: 'new' },
    ])).toEqual({
      completedCount: 1,
      totalCount: 2,
      completedPoints: 0,
      totalPoints: 0,
      usesPoints: false,
      percent: 50,
    })
  })
})

describe('assignedCycleFromTicket', () => {
  it('prefers the active sprint, then future, then the last open sprint', () => {
    expect(assignedCycleFromTicket({
      inCurrentSprint: true,
      sprints: [
        { id: '1', name: 'Sprint 1', state: 'closed' },
        { id: '2', name: 'Sprint 2', state: 'active' },
        { id: '3', name: 'Sprint 3', state: 'future' },
      ],
    })).toEqual({ id: '2', name: 'Sprint 2' })

    expect(assignedCycleFromTicket({
      inCurrentSprint: false,
      sprints: [
        { id: '1', name: 'Sprint 1', state: 'closed' },
        { id: '3', name: 'Sprint 3', state: 'future' },
      ],
    })).toEqual({ id: '3', name: 'Sprint 3' })
  })

  it('uses the last sprint when Jira omitted state', () => {
    expect(assignedCycleFromTicket({
      inCurrentSprint: true,
      sprints: [
        { id: '1', name: 'Sprint 1' },
        { id: '2', name: 'Sprint 2' },
      ],
    })).toEqual({ id: '2', name: 'Sprint 2' })
  })

  it('returns null when the ticket has no sprint membership', () => {
    expect(assignedCycleFromTicket({ inCurrentSprint: false })).toBeNull()
  })
})

describe('ticketBelongsToCycle', () => {
  it('treats the active sprint as current even when only inCurrentSprint is set', () => {
    const active = makeCycle({ id: '9', state: 'active' })
    expect(ticketBelongsToCycle({ inCurrentSprint: true }, active)).toBe(true)
    expect(ticketBelongsToCycle({ inCurrentSprint: false, sprints: [{ id: '9' }] }, active)).toBe(true)
    expect(ticketBelongsToCycle({ inCurrentSprint: false }, active)).toBe(false)
  })

  it('matches future and closed sprints by id only', () => {
    const upcoming = makeCycle({ id: '10', state: 'future' })
    expect(ticketBelongsToCycle({ inCurrentSprint: true, sprints: [{ id: '9' }] }, upcoming)).toBe(false)
    expect(ticketBelongsToCycle({ inCurrentSprint: false, sprints: [{ id: '10' }] }, upcoming)).toBe(true)
  })
})

describe('cycle date helpers', () => {
  it('formats a range and remaining days', () => {
    const cycle = makeCycle({
      id: '1',
      state: 'active',
      startDate: '2026-08-10T00:00:00.000Z',
      endDate: '2026-08-24T00:00:00.000Z',
    })
    expect(formatCycleDateRange(cycle)).toContain('–')
    expect(formatCycleDateRange({ startDate: '2026-08-10T00:00:00.000Z' })).toMatch(/^Starts /)
    expect(formatCycleDateRange({})).toBe('No dates')
    expect(cycleDaysRemaining(cycle, Date.parse('2026-08-20T00:00:00.000Z'))).toBe(4)
    expect(cycleDaysRemaining(cycle, Date.parse('2026-08-30T00:00:00.000Z'))).toBe(0)
    expect(cycleDaysRemaining({})).toBeNull()
  })
})
