import type { JiraAssignableUser, JiraCreateIssueType } from './jiraTypes'
import { jiraFetch } from './jiraClient'
import { isJiraApiUser } from './jiraIssueMapping'
import { resolveProjectKey } from './jiraProjects'

async function fetchAssignableUsersPageWindow(
  path: '/user/assignable/multiProjectSearch' | '/user/assignable/search',
  params: Record<string, string>,
): Promise<JiraAssignableUser[]> {
  const pageSize = 100
  const maxSearchableUsers = 1000
  const usersByAccountId = new Map<string, JiraAssignableUser>()

  // Jira slices the global user list before checking assignability, so a single
  // page can miss valid assignees even when more exist later in the first 1000 users.
  for (let startAt = 0; startAt < maxSearchableUsers; startAt += pageSize) {
    const data = await jiraFetch(path, {
      params: {
        ...params,
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

export async function getAssignableUsers(key: string): Promise<JiraAssignableUser[]> {
  return fetchAssignableUsersPageWindow('/user/assignable/search', {
    issueKey: key,
  })
}

export async function getCreateAssignableUsers(
  issueType: JiraCreateIssueType,
  parentKey?: string | null,
  spaceKey?: string | null,
): Promise<JiraAssignableUser[]> {
  const projectKey = await resolveProjectKey(issueType, parentKey, spaceKey)
  return fetchAssignableUsersPageWindow('/user/assignable/multiProjectSearch', {
    projectKeys: projectKey,
  })
}
