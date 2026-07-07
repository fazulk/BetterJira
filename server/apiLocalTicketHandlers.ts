import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { isJiraAdfDocument } from '../shared/jiraAdf'
import { normalizeLocalTicketKey } from '../shared/localTickets'
import { isRecord } from '../shared/typeGuards'
import { generateAiDescriptionResponse } from './apiAiHandlers'
import {
  API_HEADERS,
  badRequestResponse,
  notFoundResponse,
  parseDescriptionBody,
  parseLabelsBody,
  parseNullableStringBodyField,
  parseStringBodyField,
} from './apiRouteUtils'
import {
  createLocalTicket,
  getLocalTicketAsJiraShape,
  listLocalTicketsAsJiraShape,
  updateLocalTicketAssignee,
  updateLocalTicketDescription,
  updateLocalTicketLabels,
  updateLocalTicketPriority,
  updateLocalTicketStatus,
  updateLocalTicketTitle,
} from './localTickets'

export async function handleLocalTicketApiRoute(
  event: H3Event,
  segments: string[],
  method: string,
): Promise<Response | null> {
  if (segments.length === 2 && segments[0] === 'local' && segments[1] === 'tickets' && method === 'GET') {
    return Response.json(listLocalTicketsAsJiraShape(), { headers: API_HEADERS })
  }

  if (segments.length === 2 && segments[0] === 'local' && segments[1] === 'tickets' && method === 'POST') {
    return createLocalTicketResponse(event)
  }

  if (segments.length < 3 || segments[0] !== 'local' || segments[1] !== 'tickets') {
    return null
  }

  const ticketKey = normalizeLocalTicketKey(segments[2])
  if (!ticketKey) {
    return notFoundResponse()
  }

  if (segments.length === 3 && method === 'GET') {
    const ticket = getLocalTicketAsJiraShape(ticketKey)
    if (!ticket) {
      return notFoundResponse()
    }

    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 4 && segments[3] === 'title' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const title = parseStringBodyField(body, 'title')
    const ticket = updateLocalTicketTitle(ticketKey, title)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 4 && segments[3] === 'description' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const descriptionAdf = parseDescriptionBody(body)
    const ticket = updateLocalTicketDescription(ticketKey, descriptionAdf)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 4 && segments[3] === 'ai-description' && method === 'POST') {
    return generateAiDescriptionResponse(await readBody<unknown>(event))
  }

  if (segments.length === 4 && segments[3] === 'status' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const transitionId = parseStringBodyField(body, 'transitionId')
    const ticket = updateLocalTicketStatus(ticketKey, transitionId)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 4 && segments[3] === 'priority' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const priorityName = parseStringBodyField(body, 'priorityName')
    const ticket = updateLocalTicketPriority(ticketKey, priorityName)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 4 && segments[3] === 'assignee' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const assigneeName = parseNullableStringBodyField(body, 'assigneeName')
    const ticket = updateLocalTicketAssignee(ticketKey, assigneeName)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 4 && segments[3] === 'labels' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const labels = parseLabelsBody(body)
    if (labels === null) {
      return badRequestResponse('labels must be an array of strings.')
    }

    const ticket = updateLocalTicketLabels(ticketKey, labels)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  return null
}

async function createLocalTicketResponse(event: H3Event): Promise<Response> {
  const body = await readBody<unknown>(event)
  if (!isRecord(body)) {
    return badRequestResponse('Invalid JSON body.')
  }

  const summary = typeof body.summary === 'string' ? body.summary : ''
  const descriptionAdf = isJiraAdfDocument(body.descriptionAdf) ? body.descriptionAdf : null
  const priority = typeof body.priority === 'string' ? body.priority : undefined
  const assigneeName = body.assigneeName === null
    ? null
    : typeof body.assigneeName === 'string'
      ? body.assigneeName
      : null
  const statusId = typeof body.statusId === 'string' ? body.statusId : undefined
  const parentKey = typeof body.parentKey === 'string' ? body.parentKey : null
  const dueDate = typeof body.dueDate === 'string' ? body.dueDate : null

  const ticket = createLocalTicket({
    summary,
    descriptionAdf,
    priority,
    assigneeName,
    statusId: statusId === 'todo' || statusId === 'in_progress' || statusId === 'done' ? statusId : undefined,
    parentKey,
    dueDate,
  })
  return Response.json(ticket, { headers: API_HEADERS })
}
