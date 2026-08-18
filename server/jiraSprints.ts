import type { Cycle, CycleBoard, SpaceCyclesPayload } from '../shared/cycles'
import type { JiraTicket } from './jiraTypes'
import {
  classifyCycles,
  emptySpaceCycles,
  isCycleBoardType,
  nextCycleName,
} from '../shared/cycles'
import { getSpaceProjectKey } from '../shared/settings'
import { isRecord } from '../shared/typeGuards'
import { ValidationError } from './errors'
import { broadcast } from './events'
import { jiraFetch } from './jiraClient'
import { getTicket } from './jiraIssueQueries'
import { getAppSettings, updateAppSettings } from './settings'
import { LOCAL_SPACE_KEY } from '../shared/localTickets'

const AGILE_BASE_PATH = '/rest/agile/1.0'
const MAX_CLOSED_CYCLES = 20

export async function getSpaceCycles(spaceKey: string): Promise<SpaceCyclesPayload> {
  const space = findSpace(spaceKey)
  if (!space) {
    throw new ValidationError(`Unknown space ${spaceKey}`)
  }
  if (space.key === LOCAL_SPACE_KEY) {
    return emptySpaceCycles(space.key)
  }

  const projectKey = getSpaceProjectKey(space)
  const boards = (await listProjectBoards(projectKey)).filter(board => isCycleBoardType(board.type))
  const boundBoard = resolveBoundBoard(space.boardId, boards)

  if (!boundBoard && boards.length === 1) {
    const board = boards[0]
    if (!board) {
      return {
        ...emptySpaceCycles(space.key, projectKey),
        boards,
      }
    }
    persistSpaceBoardId(space.key, board.id)
    const cycles = await listBoardCycles(board.id)
    return toPayload(space.key, projectKey, board, boards, cycles)
  }

  if (!boundBoard) {
    return {
      ...emptySpaceCycles(space.key, projectKey),
      boards,
      needsBoardPicker: boards.length > 1,
    }
  }

  const cycles = await listBoardCycles(boundBoard.id)
  return toPayload(space.key, projectKey, boundBoard, boards, cycles)
}

export async function setSpaceBoard(spaceKey: string, boardId: number): Promise<SpaceCyclesPayload> {
  const space = findSpace(spaceKey)
  if (!space) {
    throw new ValidationError(`Unknown space ${spaceKey}`)
  }
  if (space.key === LOCAL_SPACE_KEY) {
    throw new ValidationError('The Local space cannot use Jira cycles.')
  }
  if (!Number.isInteger(boardId) || boardId <= 0) {
    throw new ValidationError('boardId must be a positive integer.')
  }

  persistSpaceBoardId(space.key, boardId)
  return getSpaceCycles(space.key)
}

export async function createUpcomingCycle(spaceKey: string, name?: string): Promise<SpaceCyclesPayload> {
  const payload = await getSpaceCycles(spaceKey)
  if (!payload.board) {
    throw new ValidationError('Bind a Scrum board to this team before creating a cycle.')
  }

  await jiraAgileFetch('/sprint', {
    method: 'POST',
    body: {
      name: name?.trim() || nextCycleName(payload.cycles),
      originBoardId: payload.board.id,
    },
  })

  return getSpaceCycles(spaceKey)
}

export async function startCycle(spaceKey: string, sprintId: string): Promise<SpaceCyclesPayload> {
  const cycleId = normalizeSprintId(sprintId)
  const window = buildStartWindow()
  await jiraAgileFetch(`/sprint/${cycleId}`, {
    method: 'PUT',
    body: {
      id: Number(cycleId) || cycleId,
      state: 'active',
      startDate: window.startDate,
      endDate: window.endDate,
    },
  })

  return getSpaceCycles(spaceKey)
}

export async function completeCycle(spaceKey: string, sprintId: string): Promise<SpaceCyclesPayload> {
  const payload = await getSpaceCycles(spaceKey)
  const cycleId = normalizeSprintId(sprintId)
  const incompleteKeys = await listIncompleteSprintIssueKeys(cycleId)
  const upcoming = payload.upcoming && payload.upcoming.id !== cycleId ? payload.upcoming : null

  if (incompleteKeys.length > 0) {
    if (upcoming) {
      await moveIssuesToSprint(upcoming.id, incompleteKeys)
    }
    else {
      await moveIssuesToBacklog(incompleteKeys)
    }
  }

  await jiraAgileFetch(`/sprint/${cycleId}`, {
    method: 'PUT',
    body: {
      id: Number(cycleId) || cycleId,
      state: 'closed',
    },
  })

  return getSpaceCycles(spaceKey)
}

export async function updateTicketSprint(key: string, sprintId: string | null): Promise<JiraTicket> {
  if (sprintId) {
    await moveIssuesToSprint(sprintId, [key])
  }
  else {
    await moveIssuesToBacklog([key])
  }

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}

export async function moveIssuesToSprint(sprintId: string, issueKeys: string[]): Promise<void> {
  const keys = uniqueIssueKeys(issueKeys)
  if (keys.length === 0) {
    return
  }

  await jiraAgileFetch(`/sprint/${normalizeSprintId(sprintId)}/issue`, {
    method: 'POST',
    body: { issues: keys },
  })
}

export async function moveIssuesToBacklog(issueKeys: string[]): Promise<void> {
  const keys = uniqueIssueKeys(issueKeys)
  if (keys.length === 0) {
    return
  }

  await jiraAgileFetch('/backlog/issue', {
    method: 'POST',
    body: { issues: keys },
  })
}

async function listProjectBoards(projectKey: string): Promise<CycleBoard[]> {
  const values = await collectAgilePages('/board', { projectKeyOrId: projectKey })
  return values.flatMap((value) => {
    const board = mapBoard(value)
    return board ? [board] : []
  })
}

async function listBoardCycles(boardId: number): Promise<Cycle[]> {
  const [active, future, closed] = await Promise.all([
    collectAgilePages(`/board/${boardId}/sprint`, { state: 'active' }),
    collectAgilePages(`/board/${boardId}/sprint`, { state: 'future' }),
    collectClosedSprintPages(boardId),
  ])

  const mappedClosed = closed.flatMap((value) => {
    const cycle = mapSprint(value)
    return cycle ? [cycle] : []
  }).sort((left, right) => {
    const leftTime = Date.parse(left.completeDate ?? left.endDate ?? '') || 0
    const rightTime = Date.parse(right.completeDate ?? right.endDate ?? '') || 0
    return rightTime - leftTime
  }).slice(0, MAX_CLOSED_CYCLES)

  return [
    ...active.flatMap((value) => {
      const cycle = mapSprint(value)
      return cycle ? [cycle] : []
    }),
    ...future.flatMap((value) => {
      const cycle = mapSprint(value)
      return cycle ? [cycle] : []
    }),
    ...mappedClosed,
  ]
}

async function listIncompleteSprintIssueKeys(sprintId: string): Promise<string[]> {
  const issues: unknown[] = []
  let startAt = 0

  for (let page = 0; page < 20; page += 1) {
    const data = await jiraAgileFetch(`/sprint/${sprintId}/issue`, {
      params: {
        fields: 'status',
        startAt: String(startAt),
        maxResults: '50',
      },
    })
    if (!isRecord(data) || !Array.isArray(data.issues)) {
      break
    }

    issues.push(...data.issues)
    if (data.issues.length === 0 || startAt + data.issues.length >= (typeof data.total === 'number' ? data.total : 0)) {
      break
    }
    startAt += data.issues.length
  }

  return issues.flatMap((value) => {
    if (!isRecord(value) || typeof value.key !== 'string' || !value.key) {
      return []
    }
    const fields = isRecord(value.fields) ? value.fields : null
    const status = fields && isRecord(fields.status) ? fields.status : null
    const category = status && isRecord(status.statusCategory) ? status.statusCategory : null
    if (category && category.key === 'done') {
      return []
    }
    return [value.key]
  })
}

async function collectAgilePages(
  path: string,
  params: Record<string, string>,
  maxPages = 20,
): Promise<unknown[]> {
  const values: unknown[] = []
  let startAt = 0

  for (let page = 0; page < maxPages; page += 1) {
    const data = await jiraAgileFetch(path, {
      params: {
        ...params,
        startAt: String(startAt),
        maxResults: '50',
      },
    })
    if (!isRecord(data) || !Array.isArray(data.values)) {
      break
    }

    values.push(...data.values)
    if (data.isLast === true || data.values.length === 0) {
      break
    }
    startAt += data.values.length
  }

  return values
}

async function collectClosedSprintPages(boardId: number): Promise<unknown[]> {
  const path = `/board/${boardId}/sprint`
  const pageSize = 50
  const first = await fetchAgilePage(path, { state: 'closed' }, 0, pageSize)
  if (!first) {
    return []
  }

  const values = [...first.values]
  if (first.isLast || first.values.length === 0) {
    return values
  }

  if (typeof first.total === 'number' && first.total > pageSize) {
    const lastStartAt = Math.max(pageSize, Math.floor((first.total - 1) / pageSize) * pageSize)
    const last = await fetchAgilePage(path, { state: 'closed' }, lastStartAt, pageSize)
    if (last) {
      values.push(...last.values)
    }
    return values
  }

  const rest = await collectAgilePages(path, { state: 'closed' }, 8)
  return [...values, ...rest.slice(pageSize)]
}

async function fetchAgilePage(
  path: string,
  params: Record<string, string>,
  startAt: number,
  maxResults: number,
): Promise<{ values: unknown[], isLast: boolean, total?: number } | null> {
  const data = await jiraAgileFetch(path, {
    params: {
      ...params,
      startAt: String(startAt),
      maxResults: String(maxResults),
    },
  })
  if (!isRecord(data) || !Array.isArray(data.values)) {
    return null
  }

  return {
    values: data.values,
    isLast: data.isLast === true || data.values.length === 0,
    total: typeof data.total === 'number' ? data.total : undefined,
  }
}

async function jiraAgileFetch(path: string, options: { method?: string, params?: Record<string, string>, body?: unknown } = {}): Promise<unknown> {
  return jiraFetch(path, {
    ...options,
    basePath: AGILE_BASE_PATH,
  })
}

function findSpace(spaceKey: string) {
  const normalized = spaceKey.trim().toUpperCase()
  return getAppSettings().spaces.find(space => space.key === normalized) ?? null
}

function persistSpaceBoardId(spaceKey: string, boardId: number): void {
  const spaces = getAppSettings().spaces.map(space => (
    space.key === spaceKey
      ? { ...space, boardId }
      : space
  ))
  updateAppSettings({ spaces })
}

function resolveBoundBoard(boardId: number | undefined, boards: CycleBoard[]): CycleBoard | null {
  if (!boardId) {
    return null
  }
  return boards.find(board => board.id === boardId) ?? { id: boardId, name: `Board ${boardId}`, type: 'scrum' }
}

function toPayload(
  spaceKey: string,
  projectKey: string,
  board: CycleBoard,
  boards: CycleBoard[],
  cycles: Cycle[],
): SpaceCyclesPayload {
  const { current, upcoming, previous } = classifyCycles(cycles)
  return {
    spaceKey,
    projectKey,
    board,
    boards,
    cycles,
    current,
    upcoming,
    previous,
    needsBoardPicker: false,
  }
}

function mapBoard(value: unknown): CycleBoard | null {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.name !== 'string' || !value.name) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    type: typeof value.type === 'string' && value.type ? value.type : 'scrum',
  }
}

function mapSprint(value: unknown): Cycle | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'number' || typeof value.id === 'string' ? String(value.id) : ''
  if (!id) {
    return null
  }

  const state = value.state
  if (state !== 'future' && state !== 'active' && state !== 'closed') {
    return null
  }

  const cycle: Cycle = {
    id,
    name: typeof value.name === 'string' && value.name ? value.name : id,
    state,
  }
  if (typeof value.startDate === 'string' && value.startDate) {
    cycle.startDate = value.startDate
  }
  if (typeof value.endDate === 'string' && value.endDate) {
    cycle.endDate = value.endDate
  }
  if (typeof value.completeDate === 'string' && value.completeDate) {
    cycle.completeDate = value.completeDate
  }
  if (typeof value.goal === 'string' && value.goal) {
    cycle.goal = value.goal
  }
  if (typeof value.originBoardId === 'number') {
    cycle.originBoardId = value.originBoardId
  }
  return cycle
}

function normalizeSprintId(sprintId: string): string {
  const trimmed = sprintId.trim()
  if (!trimmed) {
    throw new ValidationError('Sprint id is required.')
  }
  return trimmed
}

function uniqueIssueKeys(issueKeys: string[]): string[] {
  return [...new Set(issueKeys.map(key => key.trim()).filter(key => key.length > 0))]
}

function buildStartWindow(): { startDate: string, endDate: string } {
  const start = new Date()
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}
