import type { H3Event } from 'h3'
import { readBody, readMultipartFormData } from 'h3'
import { isJiraAdfDocument } from '../shared/jiraAdf'
import { isRecord } from '../shared/typeGuards'
import {
  API_HEADERS,
  badRequestResponse,
  decodePathSegment,
  generateAiDescriptionResponse,
  isJiraRemoteTicketKey,
  jiraContentResponse,
  notFoundResponse,
} from './apiRouteUtils'
import {
  addTicketMessage,
  getAssignableUsers,
  getJiraAttachmentContentByFilename,
  getPriorities,
  getTicket,
  getTicketActivity,
  getTicketMessages,
  getTransitions,
  updateTicketAssignee,
  updateTicketDescription,
  updateTicketLabels,
  updateTicketPriority,
  updateTicketStatus,
  updateTicketTeam,
  updateTicketTitle,
  updateTicketWatching,
  uploadTicketAttachment,
} from './jira'
import { getTicketDevStatus } from './jiraDevStatus'

const MAX_IMAGE_ATTACHMENT_BYTES = 25 * 1024 * 1024

export async function handleRemoteTicketApiRoute(
  event: H3Event,
  segments: string[],
  method: string,
): Promise<Response | null> {
  const jiraRemoteKey = segments.length >= 2 ? segments[1] : undefined
  if (!jiraRemoteKey || segments[0] !== 'tickets' || !isJiraRemoteTicketKey(jiraRemoteKey)) {
    return null
  }

  const ticketKey = jiraRemoteKey

  if (segments.length === 2 && method === 'GET') {
    const ticket = await getTicket(ticketKey)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'messages' && method === 'GET') {
    const messages = await getTicketMessages(ticketKey)
    return Response.json(messages, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'attachments' && method === 'POST') {
    return uploadAttachmentResponse(event, ticketKey)
  }

  if (segments.length === 5 && segments[2] === 'attachments' && segments[4] === 'content' && method === 'GET') {
    const rawFilename = segments[3]
    const filename = rawFilename ? decodePathSegment(rawFilename) : null
    if (!filename) {
      return badRequestResponse('Attachment filename is invalid.')
    }

    try {
      const jiraResponse = await getJiraAttachmentContentByFilename(ticketKey, filename)
      return jiraContentResponse(jiraResponse)
    }
    catch {
      return notFoundResponse()
    }
  }

  if (segments.length === 3 && segments[2] === 'activity' && method === 'GET') {
    const activity = await getTicketActivity(ticketKey)
    return Response.json(activity, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'messages' && method === 'POST') {
    const body = await readBody<unknown>(event)
    const messageText = isRecord(body) && typeof body.body === 'string' ? body.body : ''
    const message = await addTicketMessage(ticketKey, messageText)
    return Response.json(message, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'assignees' && method === 'GET') {
    const assignees = await getAssignableUsers(ticketKey)
    return Response.json(assignees, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'title' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const title = isRecord(body) && typeof body.title === 'string' ? body.title : ''
    const ticket = await updateTicketTitle(ticketKey, title)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'description' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const descriptionAdf = isRecord(body) && isJiraAdfDocument(body.descriptionAdf)
      ? body.descriptionAdf
      : null
    const ticket = await updateTicketDescription(ticketKey, descriptionAdf)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'ai-description' && method === 'POST') {
    return generateAiDescriptionResponse(await readBody<unknown>(event))
  }

  if (segments.length === 3 && segments[2] === 'assignee' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const accountId = isRecord(body) && typeof body.accountId === 'string'
      ? body.accountId
      : null
    const ticket = await updateTicketAssignee(ticketKey, accountId)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'priorities' && method === 'GET') {
    const priorities = await getPriorities(ticketKey)
    return Response.json(priorities, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'priority' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const priorityId = isRecord(body) && typeof body.priorityId === 'string' ? body.priorityId : ''
    const ticket = await updateTicketPriority(ticketKey, priorityId)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'team' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const teamId = isRecord(body) && typeof body.teamId === 'string' && body.teamId.trim()
      ? body.teamId.trim()
      : null
    const ticket = await updateTicketTeam(ticketKey, teamId)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'labels' && method === 'PUT') {
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

    const ticket = await updateTicketLabels(ticketKey, labels)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'transitions' && method === 'GET') {
    const transitions = await getTransitions(ticketKey)
    return Response.json(transitions, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'dev-status' && method === 'GET') {
    const devStatus = await getTicketDevStatus(ticketKey)
    return Response.json(devStatus, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'status' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const transitionId = isRecord(body) && typeof body.transitionId === 'string' ? body.transitionId : ''
    const ticket = await updateTicketStatus(ticketKey, transitionId)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[2] === 'watching' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const watching = isRecord(body) && body.watching === true
    const ticket = await updateTicketWatching(ticketKey, watching)
    return Response.json(ticket, { headers: API_HEADERS })
  }

  return null
}

async function uploadAttachmentResponse(event: H3Event, ticketKey: string): Promise<Response> {
  const formData = await readMultipartFormData(event)
  const filePart = formData?.find(part => part.name === 'file' && part.filename)
  if (!filePart) {
    return badRequestResponse('Image file is required.')
  }

  const mimeType = filePart.type ?? ''
  if (!mimeType.startsWith('image/')) {
    return badRequestResponse('Only image attachments can be pasted into descriptions.')
  }

  if (filePart.data.byteLength > MAX_IMAGE_ATTACHMENT_BYTES) {
    return badRequestResponse('Image is too large to paste into the description.')
  }

  const attachment = await uploadTicketAttachment(ticketKey, {
    filename: sanitizeUploadedFilename(filePart.filename, mimeType),
    mimeType,
    data: new Uint8Array(filePart.data),
  })
  return Response.json(attachment, { headers: API_HEADERS })
}

function sanitizeUploadedFilename(filename: string | undefined, mimeType: string): string {
  const fallbackExtension = mimeType === 'image/jpeg'
    ? 'jpg'
    : mimeType === 'image/gif'
      ? 'gif'
      : mimeType === 'image/webp'
        ? 'webp'
        : 'png'
  const fallbackFilename = `pasted-image-${new Date().toISOString().replace(/[:.]/g, '-')}.${fallbackExtension}`
  const trimmedFilename = filename?.trim()
  if (!trimmedFilename)
    return fallbackFilename

  return trimmedFilename.replace(/[\\/]/g, '-').slice(0, 180) || fallbackFilename
}
