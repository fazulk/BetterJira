import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { isJiraAdfDocument } from '../shared/jiraAdf'
import { normalizeLocalTicketKey } from '../shared/localTickets'
import {
  API_HEADERS,
  badRequestResponse,
  generateAiDescriptionResponse,
  isRecord,
  notFoundResponse,
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
    const title = isRecord(body) && typeof body.title === 'string' ? body.title : ''
    try {
      const ticket = updateLocalTicketTitle(ticketKey, title)
      return Response.json(ticket, { headers: API_HEADERS })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update title.'
      return badRequestResponse(message)
    }
  }

  if (segments.length === 4 && segments[3] === 'description' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const descriptionAdf = isRecord(body) && isJiraAdfDocument(body.descriptionAdf)
      ? body.descriptionAdf
      : null
    try {
      const ticket = updateLocalTicketDescription(ticketKey, descriptionAdf)
      return Response.json(ticket, { headers: API_HEADERS })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update description.'
      return badRequestResponse(message)
    }
  }

  if (segments.length === 4 && segments[3] === 'ai-description' && method === 'POST') {
    return generateAiDescriptionResponse(await readBody<unknown>(event))
  }

  if (segments.length === 4 && segments[3] === 'status' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const transitionId = isRecord(body) && typeof body.transitionId === 'string' ? body.transitionId : ''
    try {
      const ticket = updateLocalTicketStatus(ticketKey, transitionId)
      return Response.json(ticket, { headers: API_HEADERS })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status.'
      return badRequestResponse(message)
    }
  }

  if (segments.length === 4 && segments[3] === 'priority' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const priorityName = isRecord(body) && typeof body.priorityName === 'string' ? body.priorityName : ''
    try {
      const ticket = updateLocalTicketPriority(ticketKey, priorityName)
      return Response.json(ticket, { headers: API_HEADERS })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update priority.'
      return badRequestResponse(message)
    }
  }

  if (segments.length === 4 && segments[3] === 'assignee' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const assigneeName = isRecord(body) && body.assigneeName === null
      ? null
      : isRecord(body) && typeof body.assigneeName === 'string'
        ? body.assigneeName
        : null
    try {
      const ticket = updateLocalTicketAssignee(ticketKey, assigneeName)
      return Response.json(ticket, { headers: API_HEADERS })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update assignee.'
      return badRequestResponse(message)
    }
  }

  if (segments.length === 4 && segments[3] === 'labels' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    if (!isRecord(body) || !Array.isArray(body.labels)) {
      return badRequestResponse('labels must be an array of strings.')
    }

    const labels: string[] = []
    for (const label of body.labels) {
      if (typeof label !== 'string') {
        return badRequestResponse('labels must be an array of strings.')
      }
      labels.push(label)
    }

    try {
      const ticket = updateLocalTicketLabels(ticketKey, labels)
      return Response.json(ticket, { headers: API_HEADERS })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update labels.'
      return badRequestResponse(message)
    }
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

  try {
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
  catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create ticket.'
    return badRequestResponse(message)
  }
}
