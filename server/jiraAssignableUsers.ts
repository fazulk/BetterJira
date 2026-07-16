import type { JiraAssignableUser } from './jiraTypes'
import { jiraFetch } from './jiraClient'
import { isJiraApiUser } from './jiraIssueMapping'
import { getCandidateProjects } from './jiraProjects'

async function fetchAssignableUsersPageWindow(projectKeys: string): Promise<JiraAssignableUser[]> {
  const pageSize = 100
  const maxSearchableUsers = 1000
  const usersByAccountId = new Map<string, JiraAssignableUser>()

  // Jira slices the global user list before checking assignability, so a single
  // page can miss valid assignees even when more exist later in the first 1000 users.
  for (let startAt = 0; startAt < maxSearchableUsers; startAt += pageSize) {
    const data = await jiraFetch('/user/assignable/multiProjectSearch', {
      params: {
        projectKeys,
        startAt: String(startAt),
        maxResults: String(pageSize),
      },
    })

    if (!Array.isArray(data)) {
      continue
    }

    for (const user of data) {
      if (!isJiraApiUser(user)) {
        continue
      }

      usersByAccountId.set(user.accountId, {
        accountId: user.accountId,
        displayName: user.displayName,
      })
    }
  }

  return [...usersByAccountId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName))
}

export async function getAllAssignableUsers(): Promise<JiraAssignableUser[]> {
  const projects = await getCandidateProjects()
  const projectKeys = [...new Set(projects
    .map(project => typeof project.key === 'string' ? project.key.trim() : '')
    .filter(Boolean))]

  return fetchAssignableUsersPageWindow(projectKeys.join(','))
}
