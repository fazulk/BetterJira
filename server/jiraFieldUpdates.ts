import type { JiraAdfDocument } from '../shared/jiraAdf'
import type { JiraTicket } from './jiraTypes'
import { ValidationError } from './errors'
import { broadcast } from './events'
import { jiraFetch } from './jiraClient'
import { prepareDescriptionForJira } from './jiraDescription'
import { resolveTeamFieldId } from './jiraIssueMapping'
import { getTicket } from './jiraIssueQueries'

export async function updateTicketTitle(key: string, summary: string): Promise<JiraTicket> {
  const nextSummary = summary.trim()
  if (!nextSummary) {
    throw new ValidationError('Title cannot be empty')
  }

  await jiraFetch(`/issue/${key}`, {
    method: 'PUT',
    body: {
      fields: {
        summary: nextSummary,
      },
    },
  })

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}

export async function updateTicketDescription(key: string, descriptionAdf: JiraAdfDocument | null): Promise<JiraTicket> {
  await jiraFetch(`/issue/${key}`, {
    method: 'PUT',
    body: {
      fields: {
        description: prepareDescriptionForJira(descriptionAdf),
      },
    },
  })

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}

export async function updateTicketAssignee(key: string, accountId: string | null): Promise<JiraTicket> {
  await jiraFetch(`/issue/${key}/assignee`, {
    method: 'PUT',
    body: {
      accountId,
    },
  })

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}

export async function updateTicketPriority(key: string, priorityId: string): Promise<JiraTicket> {
  const nextPriorityId = priorityId.trim()
  if (!nextPriorityId) {
    throw new ValidationError('Priority is required')
  }

  await jiraFetch(`/issue/${key}`, {
    method: 'PUT',
    body: {
      fields: {
        priority: {
          id: nextPriorityId,
        },
      },
    },
  })

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}

export async function updateTicketTeam(key: string, teamId: string | null): Promise<JiraTicket> {
  const teamFieldId = await resolveTeamFieldId()
  if (!teamFieldId) {
    throw new Error('The Jira Team field is not available in this workspace')
  }

  await jiraFetch(`/issue/${key}`, {
    method: 'PUT',
    body: {
      fields: {
        [teamFieldId]: teamId,
      },
    },
  })

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}

function normalizeLabels(labels: string[]): string[] {
  const normalizedLabels: string[] = []
  const seen = new Set<string>()

  for (const label of labels) {
    const trimmed = label.trim()
    const normalized = trimmed.toLowerCase()
    if (!trimmed || seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    normalizedLabels.push(trimmed)
  }

  return normalizedLabels
}

export async function updateTicketLabels(key: string, labels: string[]): Promise<JiraTicket> {
  await jiraFetch(`/issue/${key}`, {
    method: 'PUT',
    body: {
      fields: {
        labels: normalizeLabels(labels),
      },
    },
  })

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}
