import type { CacheEntry } from './jiraClient'
import type { JiraApiPriority, JiraCreateIssueType } from './jiraTypes'
import { isRecord } from '../shared/typeGuards'
import { JiraApiError } from './errors'
import {
  getCachedValue,
  getJiraConfig,
  jiraFetch,
  setCachedValue,
  THIRTY_DAYS_MS,
} from './jiraClient'
import { getCandidateProjects, getProject } from './jiraProjects'

export interface JiraPriority {
  id: string
  name: string
}

function isJiraApiPriority(value: unknown): value is Required<JiraApiPriority> {
  if (!isRecord(value))
    return false
  return typeof value.id === 'string' && typeof value.name === 'string'
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
      // The configured project may not exist; fall back to candidate projects.
      if (!(error instanceof JiraApiError && error.status === 404)) {
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

export async function getCreatePriorities(
  issueType: JiraCreateIssueType,
  parentKey?: string | null,
): Promise<JiraPriority[]> {
  void issueType
  void parentKey
  return getAllPriorities()
}
