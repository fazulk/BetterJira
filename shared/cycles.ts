export type CycleState = 'future' | 'active' | 'closed'

export interface CycleBoard {
  id: number
  name: string
  type: string
}

export interface Cycle {
  id: string
  name: string
  state: CycleState
  startDate?: string
  endDate?: string
  completeDate?: string
  goal?: string
  originBoardId?: number
}

export interface SpaceCyclesPayload {
  spaceKey: string
  projectKey: string
  board: CycleBoard | null
  boards: CycleBoard[]
  cycles: Cycle[]
  current: Cycle | null
  upcoming: Cycle | null
  previous: Cycle | null
  needsBoardPicker: boolean
}

export interface CycleProgress {
  completedCount: number
  totalCount: number
  completedPoints: number
  totalPoints: number
  percent: number
  usesPoints: boolean
}

export const DEFAULT_CYCLE_DURATION_DAYS = 14

export function isCycleBoardType(type: string): boolean {
  return type === 'scrum' || type === 'simple'
}

export function emptySpaceCycles(spaceKey: string, projectKey = ''): SpaceCyclesPayload {
  return {
    spaceKey,
    projectKey,
    board: null,
    boards: [],
    cycles: [],
    current: null,
    upcoming: null,
    previous: null,
    needsBoardPicker: false,
  }
}

export function classifyCycles(cycles: readonly Cycle[]): {
  current: Cycle | null
  upcoming: Cycle | null
  previous: Cycle | null
} {
  return {
    current: cycles.find(cycle => cycle.state === 'active') ?? null,
    upcoming: pickUpcomingCycle(cycles.filter(cycle => cycle.state === 'future')),
    previous: pickPreviousCycle(cycles.filter(cycle => cycle.state === 'closed')),
  }
}

export function cyclesFromTicketSprints(
  tickets: ReadonlyArray<{
    sprints?: ReadonlyArray<{ id: string, name: string, state?: string }>
  }>,
): Cycle[] {
  const byId = new Map<string, Cycle>()
  for (const ticket of tickets) {
    for (const sprint of ticket.sprints ?? []) {
      const state = toCycleState(sprint.state)
      if (!state) {
        continue
      }
      const existing = byId.get(sprint.id)
      if (!existing) {
        byId.set(sprint.id, { id: sprint.id, name: sprint.name, state })
        continue
      }
      existing.state = preferCycleState(existing.state, state)
      if (sprint.name) {
        existing.name = sprint.name
      }
    }
  }
  return [...byId.values()]
}

export function resolveClassifiedCycles(
  payload: Pick<SpaceCyclesPayload, 'cycles' | 'current' | 'upcoming' | 'previous'>,
  tickets: ReadonlyArray<{
    sprints?: ReadonlyArray<{ id: string, name: string, state?: string }>
  }> = [],
): {
  cycles: Cycle[]
  current: Cycle | null
  upcoming: Cycle | null
  previous: Cycle | null
} {
  const cycles = mergeCycleLists(payload.cycles, cyclesFromTicketSprints(tickets))
  const classified = classifyCycles(cycles)
  return {
    cycles,
    current: payload.current ?? classified.current,
    upcoming: payload.upcoming ?? classified.upcoming,
    previous: payload.previous ?? classified.previous,
  }
}

function toCycleState(value: string | undefined): CycleState | null {
  return value === 'future' || value === 'active' || value === 'closed' ? value : null
}

function preferCycleState(left: CycleState, right: CycleState): CycleState {
  const rank: Record<CycleState, number> = { closed: 1, future: 2, active: 3 }
  return rank[right] > rank[left] ? right : left
}

function mergeCycleLists(primary: readonly Cycle[], extra: readonly Cycle[]): Cycle[] {
  const byId = new Map<string, Cycle>()
  for (const cycle of [...extra, ...primary]) {
    const existing = byId.get(cycle.id)
    byId.set(cycle.id, existing
      ? {
          ...existing,
          ...cycle,
          name: cycle.name || existing.name,
          state: preferCycleState(existing.state, cycle.state),
        }
      : cycle)
  }
  return [...byId.values()]
}

export function pickUpcomingCycle(futureCycles: readonly Cycle[]): Cycle | null {
  if (futureCycles.length === 0) {
    return null
  }

  return [...futureCycles].sort(compareUpcomingCycles)[0] ?? null
}

export function pickPreviousCycle(closedCycles: readonly Cycle[]): Cycle | null {
  if (closedCycles.length === 0) {
    return null
  }

  return [...closedCycles].sort(comparePreviousCycles)[0] ?? null
}

export function compareUpcomingCycles(left: Cycle, right: Cycle): number {
  const leftTime = getTimeOrInfinity(left.startDate)
  const rightTime = getTimeOrInfinity(right.startDate)
  if (leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return left.id.localeCompare(right.id, undefined, { numeric: true })
}

export function comparePreviousCycles(left: Cycle, right: Cycle): number {
  const leftTime = getCompletedTime(left)
  const rightTime = getCompletedTime(right)
  if (leftTime !== rightTime) {
    return rightTime - leftTime
  }

  return right.id.localeCompare(left.id, undefined, { numeric: true })
}

export function nextCycleName(cycles: readonly Cycle[]): string {
  let max = 0
  for (const cycle of cycles) {
    const match = cycle.name.match(/(\d+)\s*$/)
    if (!match) {
      continue
    }
    const value = Number(match[1])
    if (Number.isFinite(value)) {
      max = Math.max(max, value)
    }
  }

  return `Sprint ${max + 1}`
}

export function buildCycleWindow(now = new Date(), durationDays = DEFAULT_CYCLE_DURATION_DAYS): {
  startDate: string
  endDate: string
} {
  const start = new Date(now.getTime())
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

export function cycleProgress(
  tickets: ReadonlyArray<{ statusCategory: string, storyPoints?: number }>,
): CycleProgress {
  const totalCount = tickets.length
  const completedTickets = tickets.filter(ticket => ticket.statusCategory === 'done')
  const totalPoints = tickets.reduce((total, ticket) => total + (ticket.storyPoints ?? 0), 0)
  const completedPoints = completedTickets.reduce((total, ticket) => total + (ticket.storyPoints ?? 0), 0)
  const usesPoints = totalPoints > 0
  const completed = usesPoints ? completedPoints : completedTickets.length
  const total = usesPoints ? totalPoints : totalCount

  return {
    completedCount: completedTickets.length,
    totalCount,
    completedPoints,
    totalPoints,
    usesPoints,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}

export function ticketBelongsToCycle(
  ticket: { inCurrentSprint: boolean, sprints?: ReadonlyArray<{ id: string }> },
  cycle: Pick<Cycle, 'id' | 'state'>,
): boolean {
  const inNamedSprint = (ticket.sprints ?? []).some(sprint => sprint.id === cycle.id)
  if (cycle.state === 'active') {
    return ticket.inCurrentSprint || inNamedSprint
  }
  return inNamedSprint
}

export function assignedCycleFromTicket(ticket: {
  inCurrentSprint: boolean
  sprints?: ReadonlyArray<{ id: string, name: string, state?: string }>
}): { id: string, name: string } | null {
  const sprints = ticket.sprints ?? []
  const active = sprints.find(sprint => sprint.state === 'active')
  if (active) {
    return { id: active.id, name: active.name }
  }
  const future = sprints.find(sprint => sprint.state === 'future')
  if (future) {
    return { id: future.id, name: future.name }
  }
  if (sprints.length === 0) {
    return ticket.inCurrentSprint ? { id: 'current', name: 'Current cycle' } : null
  }
  const lastOpen = [...sprints].reverse().find(sprint => sprint.state !== 'closed')
  return lastOpen ?? sprints[sprints.length - 1] ?? null
}

export function formatCycleDateRange(cycle: Pick<Cycle, 'startDate' | 'endDate'>): string {
  const start = formatShortDate(cycle.startDate)
  const end = formatShortDate(cycle.endDate)
  if (start && end) {
    return `${start} – ${end}`
  }
  if (start) {
    return `Starts ${start}`
  }
  if (end) {
    return `Ends ${end}`
  }
  return 'No dates'
}

export function cycleDaysRemaining(cycle: Pick<Cycle, 'endDate'>, now = Date.now()): number | null {
  if (!cycle.endDate) {
    return null
  }

  const endTime = Date.parse(cycle.endDate)
  if (Number.isNaN(endTime)) {
    return null
  }

  return Math.max(0, Math.ceil((endTime - now) / (24 * 60 * 60 * 1000)))
}

function getTimeOrInfinity(value: string | undefined): number {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }
  const time = Date.parse(value)
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function getCompletedTime(cycle: Pick<Cycle, 'completeDate' | 'endDate' | 'id'>): number {
  const time = Date.parse(cycle.completeDate ?? cycle.endDate ?? '')
  return Number.isNaN(time) ? 0 : time
}

function formatShortDate(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
