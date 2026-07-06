import type { JiraAdfDocument, JiraAdfNode } from '../shared/jiraAdf'
import type { CacheEntry } from './jiraClient'
import type {
  JiraApiPriority,
  JiraAssignableUser,
  JiraCreateIssueType,
  JiraTicket,
} from './jiraTypes'
import {
  isRecord,

  normalizeAdf,
} from '../shared/jiraAdf'
import { broadcast } from './events'
import {

  getCachedValue,
  getJiraConfig,
  jiraFetch,
  setCachedValue,
  THIRTY_DAYS_MS,
} from './jiraClient'
import { isJiraApiUser, resolveTeamFieldId } from './jiraIssueMapping'
import { getTicket } from './jiraIssueQueries'
import {
  getCandidateProjects,
  getProject,
  resolveProjectKey,
} from './jiraProjects'

export { addTicketMessage, getTicketActivity, getTicketMessages } from './jiraActivity'
export { getJiraAttachmentContent, getJiraAttachmentContentByFilename, uploadTicketAttachment } from './jiraAttachments'
export { createIssue, getCreateIssueTypes } from './jiraCreateIssue'
export { forceRefreshTickets, getTicket, searchTickets } from './jiraIssueQueries'
export { getAccessibleSpaces, getAccessibleTeams } from './jiraProjects'
export { getJiraCurrentUser, getTransitions, updateTicketStatus, updateTicketWatching } from './jiraTransitions'
export type {
  CreateIssueInput,
  JiraActivityComment,
  JiraActivityHistory,
  JiraActivityItem,
  JiraAssignableUser,
  JiraAttachment,
  JiraCreateFieldValue,
  JiraCreateIssueType,
  JiraCreateIssueTypeOption,
  JiraCurrentUser,
  JiraMessage,
  JiraTicket,
  JiraTransition,
  RefreshTicketsResult,
} from './jiraTypes'

function isJiraApiPriority(value: unknown): value is Required<JiraApiPriority> {
  if (!isRecord(value))
    return false
  return typeof value.id === 'string' && typeof value.name === 'string'
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

export async function getCreatePriorities(
  issueType: JiraCreateIssueType,
  parentKey?: string | null,
): Promise<JiraPriority[]> {
  void issueType
  void parentKey
  return getAllPriorities()
}

export async function updateTicketTitle(key: string, summary: string): Promise<JiraTicket> {
  const nextSummary = summary.trim()
  if (!nextSummary) {
    throw new Error('Title cannot be empty')
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

function jiraSafeMediaAttrs(node: JiraAdfNode): Record<string, unknown> | undefined {
  if (!node.attrs)
    return undefined

  if (node.type === 'media') {
    const attrs: Record<string, unknown> = {}
    const mediaType = node.attrs.type
    const allowedKeys = mediaType === 'external'
      ? ['type', 'url']
      : ['id', 'type', 'collection', 'occurrenceKey', 'alt', 'width', 'height']

    for (const key of allowedKeys) {
      const value = node.attrs[key]
      if (value === undefined || value === null)
        continue
      if (value === '' && !(node.type === 'media' && key === 'collection'))
        continue
      attrs[key] = value
    }

    if (mediaType !== 'external' && attrs.collection === undefined) {
      attrs.collection = ''
    }

    if (typeof attrs.id === 'string' && attrs.id.startsWith('pending:')) {
      throw new Error('Image upload is still pending. Wait for it to finish before saving.')
    }

    return Object.keys(attrs).length ? attrs : undefined
  }

  if (node.type === 'mediaSingle') {
    const attrs: Record<string, unknown> = {}
    for (const key of ['layout', 'width', 'widthType']) {
      const value = node.attrs[key]
      if (value !== undefined && value !== null && value !== '') {
        attrs[key] = value
      }
    }

    return Object.keys(attrs).length ? attrs : undefined
  }

  if (node.type === 'mediaGroup') {
    return undefined
  }

  const attrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === 'src' || key === 'uploadState' || key === 'uploadError' || key === 'clientId')
      continue
    attrs[key] = value
  }

  return Object.keys(attrs).length ? attrs : undefined
}

function stripEditorOnlyMediaAttrs(node: JiraAdfNode): JiraAdfNode {
  const nextNode: JiraAdfNode = {
    type: node.type,
  }

  if (node.text !== undefined) {
    nextNode.text = node.text
  }

  const attrs = jiraSafeMediaAttrs(node)
  if (attrs) {
    nextNode.attrs = attrs
  }

  if (node.marks?.length) {
    nextNode.marks = node.marks.map(mark => ({ ...mark }))
  }

  if (node.content?.length) {
    nextNode.content = node.content.map(stripEditorOnlyMediaAttrs)
  }

  return nextNode
}

function prepareDescriptionForJira(descriptionAdf: JiraAdfDocument | null): JiraAdfDocument | null {
  const normalizedDescription = normalizeAdf(descriptionAdf)
  if (!normalizedDescription)
    return null

  return {
    type: 'doc',
    version: 1,
    content: normalizedDescription.content.map(stripEditorOnlyMediaAttrs),
  }
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

export async function getAssignableUsers(key: string): Promise<JiraAssignableUser[]> {
  return fetchAssignableUsersPageWindow('/user/assignable/search', {
    issueKey: key,
  })
}

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

export interface JiraPriority {
  id: string
  name: string
}

const projectPrioritiesCache = new Map<string, CacheEntry<JiraPriority[]>>()
let allPrioritiesCache: CacheEntry<JiraPriority[]> | null = null

function parsePrioritySearchResponse(data: unknown): JiraPriority[] {
  const priorities = isRecord(data) && Array.isArray(data.values)
    ? data.values
    : Array.isArray(data)
      ? data
      : []

  return priorities
    .filter(isJiraApiPriority)
    .map(priority => ({
      id: priority.id,
      name: priority.name,
    }))
}

async function getProjectPriorities(projectKey: string): Promise<JiraPriority[]> {
  const cachedPriorities = getCachedValue(projectPrioritiesCache, projectKey)
  if (cachedPriorities) {
    return cachedPriorities
  }

  const project = await getProject(projectKey)
  const projectId = project?.id

  if (!projectId) {
    return []
  }

  const data = await jiraFetch('/priority/search', {
    params: {
      projectId,
      maxResults: '100',
    },
  })

  return setCachedValue(projectPrioritiesCache, projectKey, parsePrioritySearchResponse(data))
}

export async function getAllPriorities(): Promise<JiraPriority[]> {
  if (allPrioritiesCache && allPrioritiesCache.expiresAt > Date.now()) {
    return allPrioritiesCache.value
  }

  const candidateProjectKeys = new Set<string>()

  const configuredProjectKey = getJiraConfig().projectKey
  if (configuredProjectKey) {
    try {
      const project = await getProject(configuredProjectKey)
      if (project?.key) {
        candidateProjectKeys.add(project.key)
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : ''
      const isMissingProject = message.includes('No project could be found')
        || message.includes('404')

      if (!isMissingProject) {
        throw error
      }
    }
  }

  if (!candidateProjectKeys.size) {
    const projects = await getCandidateProjects()
    for (const project of projects) {
      if (project.key) {
        candidateProjectKeys.add(project.key)
      }
    }
  }

  const prioritiesById = new Map<string, JiraPriority>()

  for (const projectKey of candidateProjectKeys) {
    const priorities = await getProjectPriorities(projectKey)
    for (const priority of priorities) {
      prioritiesById.set(priority.id, priority)
    }
  }

  const priorities = [...prioritiesById.values()]
  allPrioritiesCache = {
    expiresAt: Date.now() + THIRTY_DAYS_MS,
    value: priorities,
  }

  return priorities
}

export async function getPriorities(key: string): Promise<JiraPriority[]> {
  void key
  return getAllPriorities()
}

export async function updateTicketPriority(key: string, priorityId: string): Promise<JiraTicket> {
  const nextPriorityId = priorityId.trim()
  if (!nextPriorityId) {
    throw new Error('Priority is required')
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
