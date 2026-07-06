import type { JiraTicket, RefreshTicketsResult } from './jiraTypes'
import { buildUpdatedSinceSearchQuery } from '../shared/settings'
import { isRecord } from '../shared/typeGuards'
import { broadcast } from './events'
import { jiraFetch } from './jiraClient'
import { isJiraApiIssue, mapIssue, resolveSprintFieldId, resolveTeamFieldId } from './jiraIssueMapping'
import { buildDefaultSearchQuery } from './jiraProjects'
import { getAppSettings } from './settings'

const summaryIssueFields = [
  'project',
  'summary',
  'status',
  'priority',
  'issuetype',
  'labels',
  'assignee',
  'reporter',
  'watches',
  'parent',
  'created',
  'updated',
  'duedate',
  'resolutiondate',
]

const detailIssueFields = [
  'project',
  'summary',
  'status',
  'priority',
  'issuetype',
  'labels',
  'assignee',
  'reporter',
  'watches',
  'description',
  'attachment',
  'parent',
  'created',
  'updated',
  'duedate',
  'resolutiondate',
]

/**
 * Re-buckets a ticket into an enabled team-filtered space when its Jira team
 * matches one; otherwise it stays under its project space.
 */
function applyTeamSpaceBucketing(ticket: JiraTicket): JiraTicket {
  const teamId = ticket.team?.id
  if (!teamId) {
    return ticket
  }

  const teamSpace = getAppSettings().spaces.find(space => (
    space.enabled
    && space.teamFilter?.projectKey === ticket.spaceKey
    && space.teamFilter.teamId.toLowerCase() === teamId.toLowerCase()
  ))

  if (!teamSpace) {
    return ticket
  }

  return {
    ...ticket,
    spaceKey: teamSpace.key,
    spaceName: teamSpace.name || ticket.spaceName,
  }
}

export async function searchTickets(jql?: string): Promise<JiraTicket[]> {
  const query = jql ?? buildDefaultSearchQuery()
  if (!query) {
    return []
  }
  const [sprintFieldId, teamFieldId] = await Promise.all([
    resolveSprintFieldId(),
    resolveTeamFieldId(),
  ])
  const issues: unknown[] = []
  let startAt = 0
  let nextPageToken: string | null = null
  const maxResults = 100
  const fields = [...summaryIssueFields]

  if (sprintFieldId) {
    fields.push(sprintFieldId)
  }
  if (teamFieldId) {
    fields.push(teamFieldId)
  }

  while (true) {
    const params: Record<string, string> = {
      jql: query,
      fields: fields.join(','),
      maxResults: String(maxResults),
    }

    if (nextPageToken) {
      params.nextPageToken = nextPageToken
    }
    else {
      params.startAt = String(startAt)
    }

    const data = await jiraFetch('/search/jql', { params })
    const batch = isRecord(data) && Array.isArray(data.issues) ? data.issues : []
    const total = isRecord(data) && typeof data.total === 'number' ? data.total : null
    const isLastPage = isRecord(data) && typeof data.isLast === 'boolean' ? data.isLast : null
    const followingPageToken = isRecord(data) && typeof data.nextPageToken === 'string' && data.nextPageToken.length > 0
      ? data.nextPageToken
      : null

    issues.push(...batch)

    if (batch.length === 0 || isLastPage === true) {
      break
    }

    if (followingPageToken) {
      nextPageToken = followingPageToken
      continue
    }

    if (batch.length < maxResults || (total !== null && issues.length >= total)) {
      break
    }

    startAt += batch.length
  }

  return issues.filter(isJiraApiIssue).map(issue => applyTeamSpaceBucketing(mapIssue(issue, false, sprintFieldId, teamFieldId)))
}

function getIncrementalRefreshQuery(updatedSince?: Date): string | null {
  const query = buildDefaultSearchQuery()
  if (!query) {
    return null
  }

  if (!updatedSince) {
    return query
  }

  return buildUpdatedSinceSearchQuery(query, updatedSince)
}

export async function getTicket(key: string): Promise<JiraTicket> {
  const [sprintFieldId, teamFieldId] = await Promise.all([
    resolveSprintFieldId(),
    resolveTeamFieldId(),
  ])
  const fields = [...detailIssueFields]

  if (sprintFieldId) {
    fields.push(sprintFieldId)
  }
  if (teamFieldId) {
    fields.push(teamFieldId)
  }

  const data = await jiraFetch(`/issue/${key}`, {
    params: {
      fields: fields.join(','),
    },
  })
  return applyTeamSpaceBucketing(mapIssue(isJiraApiIssue(data) ? data : {}, true, sprintFieldId, teamFieldId))
}

export async function forceRefreshTickets(updatedSince?: Date): Promise<RefreshTicketsResult> {
  broadcast('refreshing', { status: 'started' })
  try {
    const query = getIncrementalRefreshQuery(updatedSince)
    const tickets = query ? await searchTickets(query) : []
    const payload: RefreshTicketsResult = {
      tickets,
      updatedAt: Date.now(),
      mode: updatedSince ? 'incremental' : 'full',
    }
    broadcast('tickets', payload)
    return payload
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Background refresh failed'
    console.error('Background refresh failed:', message)
    broadcast('error', { message })
    throw err
  }
}
