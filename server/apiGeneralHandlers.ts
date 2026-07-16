import type { H3Event } from 'h3'
import { getQuery, readBody } from 'h3'
import { buildUpdatedSinceSearchQuery, normalizeAppSettingsUpdate } from '../shared/settings'
import { isRecord } from '../shared/typeGuards'
import { getAiProviderAvailability, getCliToolAvailability } from './ai/catalog'
import {
  API_HEADERS,
  badRequestResponse,
  getStringQueryValue,
  isCreateIssueType,
  jiraContentResponse,
  parseCreateFields,
  parseRefreshUpdatedSince,
} from './apiRouteUtils'
import {
  createIssue,
  getAccessibleSpaces,
  getAccessibleTeams,
  getAllAssignableUsers,
  getAllPriorities,
  getCreateIssueTypes,
  getCreatePriorities,
  getJiraAttachmentContent,
  getJiraCurrentUser,
  searchTickets,
} from './jira'
import { getAppSettings, updateAppSettings } from './settings'

export async function handleGeneralApiRoute(
  event: H3Event,
  segments: string[],
  method: string,
): Promise<Response | null> {
  if (segments.length === 1 && segments[0] === 'tickets' && method === 'GET') {
    const query = getQuery(event)
    const jql = getStringQueryValue(query.jql)
    const updatedSince = parseRefreshUpdatedSince(getStringQueryValue(query.updatedSince))
    const searchQuery = jql && updatedSince
      ? buildUpdatedSinceSearchQuery(jql, updatedSince)
      : jql
    const tickets = await searchTickets(searchQuery)
    return Response.json(tickets, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'settings' && method === 'GET') {
    return Response.json(getAppSettings(), { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'settings' && method === 'PUT') {
    const body = await readBody<unknown>(event)
    const settings = updateAppSettings(normalizeAppSettingsUpdate(body))
    return Response.json(settings, { headers: API_HEADERS })
  }

  if (segments.length === 2 && segments[0] === 'ai' && segments[1] === 'providers' && method === 'GET') {
    return Response.json({ providers: getAiProviderAvailability(), tools: getCliToolAvailability() }, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'spaces' && method === 'GET') {
    const spaces = await getAccessibleSpaces()
    return Response.json(spaces, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'teams' && method === 'GET') {
    const query = getQuery(event)
    const teams = await getAccessibleTeams(getStringQueryValue(query.query) ?? undefined)
    return Response.json(teams, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'tickets' && method === 'POST') {
    const body = await readBody<unknown>(event)
    const issueType = isRecord(body) ? body.issueType : undefined
    if (!isCreateIssueType(issueType)) {
      return badRequestResponse('issueType must be a non-empty string')
    }

    const parentKey = isRecord(body) && typeof body.parentKey === 'string'
      ? body.parentKey
      : null
    const spaceKey = isRecord(body) && typeof body.spaceKey === 'string'
      ? body.spaceKey
      : null

    const fields = parseCreateFields(isRecord(body) ? body.fields : undefined)
    const ticket = await createIssue({
      issueType,
      spaceKey,
      parentKey,
      fields,
    })

    return Response.json(ticket, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'create-issue-types' && method === 'GET') {
    const query = getQuery(event)
    const parentKey = getStringQueryValue(query.parentKey) ?? null
    const issueTypes = await getCreateIssueTypes(parentKey)
    return Response.json(issueTypes, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'create-assignees' && method === 'GET') {
    const query = getQuery(event)
    const issueType = getStringQueryValue(query.issueType)
    if (!isCreateIssueType(issueType)) {
      return badRequestResponse('issueType query param must be a non-empty string')
    }

    const users = await getAllAssignableUsers()
    return Response.json(users, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'create-priorities' && method === 'GET') {
    const query = getQuery(event)
    const issueType = getStringQueryValue(query.issueType)
    if (!isCreateIssueType(issueType)) {
      return badRequestResponse('issueType query param must be a non-empty string')
    }

    const parentKey = getStringQueryValue(query.parentKey) ?? null
    const priorities = await getCreatePriorities(issueType, parentKey)
    return Response.json(priorities, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'priorities' && method === 'GET') {
    const priorities = await getAllPriorities()
    return Response.json(priorities, { headers: API_HEADERS })
  }

  if (segments.length === 1 && segments[0] === 'jira-me' && method === 'GET') {
    const user = await getJiraCurrentUser()
    return Response.json(user, { headers: API_HEADERS })
  }

  if (segments.length === 3 && segments[0] === 'jira-attachments' && segments[2] === 'content' && method === 'GET') {
    const attachmentId = segments[1]
    if (!attachmentId) {
      return badRequestResponse('Attachment id is required.')
    }

    const jiraResponse = await getJiraAttachmentContent(attachmentId)
    return jiraContentResponse(jiraResponse)
  }

  return null
}
