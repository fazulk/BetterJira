import type {
  JiraApiTransition,
  JiraCurrentUser,
  JiraTicket,
  JiraTransition,
} from './jiraTypes'
import { isRecord } from '../shared/typeGuards'
import { broadcast } from './events'
import { jiraFetch } from './jiraClient'
import { getTicket } from './jiraIssueQueries'

function isJiraApiTransition(value: JiraApiTransition): value is Required<Pick<JiraApiTransition, 'id' | 'name'>> & JiraApiTransition {
  return typeof value.id === 'string' && typeof value.name === 'string'
}

export async function getTransitions(key: string): Promise<JiraTransition[]> {
  const data = await jiraFetch(`/issue/${key}/transitions`)
  if (!isRecord(data) || !Array.isArray(data.transitions))
    return []

  return data.transitions
    .filter(isJiraApiTransition)
    .map(t => ({
      id: t.id,
      name: t.name,
      statusCategory: t.to?.statusCategory?.key ?? 'indeterminate',
    }))
}

export async function updateTicketStatus(key: string, transitionId: string): Promise<JiraTicket> {
  await jiraFetch(`/issue/${key}/transitions`, {
    method: 'POST',
    body: {
      transition: { id: transitionId },
    },
  })

  const updatedTicket = await getTicket(key)
  broadcast('ticket-updated', updatedTicket)
  return updatedTicket
}

export async function getJiraCurrentUser(): Promise<JiraCurrentUser> {
  const data = await jiraFetch('/myself')
  if (
    !isRecord(data)
    || typeof data.accountId !== 'string'
    || !data.accountId.trim()
    || typeof data.displayName !== 'string'
    || !data.displayName.trim()
  ) {
    throw new Error('Jira /myself response did not include accountId and displayName')
  }

  return {
    accountId: data.accountId.trim(),
    displayName: data.displayName.trim(),
  }
}

export async function updateTicketWatching(key: string, watching: boolean): Promise<JiraTicket> {
  const currentUser = await getJiraCurrentUser()

  if (watching) {
    await jiraFetch(`/issue/${key}/watchers`, {
      method: 'POST',
      body: currentUser.accountId,
    })
  }
  else {
    await jiraFetch(`/issue/${key}/watchers`, {
      method: 'DELETE',
      params: {
        accountId: currentUser.accountId,
      },
    })
  }

  return getTicket(key)
}
