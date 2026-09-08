import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { isRecord } from '../shared/typeGuards'
import {
  API_HEADERS,
  badRequestResponse,
  decodePathSegment,
} from './apiRouteUtils'
import {
  completeCycle,
  createUpcomingCycle,
  getSpaceCycles,
  setCurrentSprint,
  setSpaceBoard,
  startCycle,
} from './jiraSprints'

export async function handleCycleApiRoute(
  event: H3Event,
  segments: string[],
  method: string,
): Promise<Response | null> {
  if (segments[0] !== 'spaces' || segments.length < 3) {
    return null
  }

  const spaceKey = decodePathSegment(segments[1] ?? '')
  if (!spaceKey) {
    return badRequestResponse('Space key is required.')
  }

  if (segments.length === 3 && segments[2] === 'cycles' && method === 'GET') {
    const payload = await getSpaceCycles(spaceKey)
    return Response.json(payload, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'cycles' && method === 'POST') {
    const body = await readBody<unknown>(event)
    const name = isRecord(body) && typeof body.name === 'string' ? body.name : undefined
    const payload = await createUpcomingCycle(spaceKey, name)
    return Response.json(payload, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'board' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const boardId = isRecord(body) ? body.boardId : undefined
    if (typeof boardId !== 'number' || !Number.isInteger(boardId) || boardId <= 0) {
      return badRequestResponse('boardId must be a positive integer.')
    }
    const payload = await setSpaceBoard(spaceKey, boardId)
    return Response.json(payload, { headers: API_HEADERS })
  }

  if (segments.length === 4 && segments[2] === 'cycles' && segments[3] === 'current' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const sprintId = isRecord(body) ? body.sprintId : undefined
    if (sprintId !== null && (typeof sprintId !== 'string' || !sprintId.trim())) {
      return badRequestResponse('sprintId must be a non-empty string or null.')
    }
    const payload = await setCurrentSprint(spaceKey, typeof sprintId === 'string' ? sprintId.trim() : null)
    return Response.json(payload, { headers: API_HEADERS })
  }

  if (segments.length === 5 && segments[2] === 'cycles' && segments[4] === 'start' && method === 'POST') {
    const sprintId = decodePathSegment(segments[3] ?? '')
    if (!sprintId) {
      return badRequestResponse('Sprint id is required.')
    }
    const payload = await startCycle(spaceKey, sprintId)
    return Response.json(payload, { headers: API_HEADERS })
  }

  if (segments.length === 5 && segments[2] === 'cycles' && segments[4] === 'complete' && method === 'POST') {
    const sprintId = decodePathSegment(segments[3] ?? '')
    if (!sprintId) {
      return badRequestResponse('Sprint id is required.')
    }
    const payload = await completeCycle(spaceKey, sprintId)
    return Response.json(payload, { headers: API_HEADERS })
  }

  return null
}
