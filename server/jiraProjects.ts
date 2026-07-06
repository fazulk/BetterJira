import type { JiraSpaceDirectoryEntry } from '../shared/settings'
import type {
  JiraApiIssueType,
  JiraApiProject,
  JiraCreateIssueType,
  JiraTeamRef,
} from './jiraTypes'
import {
  buildEnabledSpaceSearchQuery,

} from '../shared/settings'
import { isRecord } from '../shared/typeGuards'
import { getJiraConfig, jiraFetch } from './jiraClient'
import { isJiraApiProject } from './jiraIssueMapping'
import { matchesIssueType } from './jiraIssueTypePolicy'
import { getAppSettings } from './settings'

export function buildDefaultSearchQuery(): string | null {
  const enabledSpaces = getAppSettings().spaces.filter(space => space.enabled)
  return buildEnabledSpaceSearchQuery(enabledSpaces)
}

/** Resolves a settings space key (including team-filtered space keys) to its Jira project key. */
export function getProjectKeyForSpaceKey(spaceKey: string | null | undefined): string | null {
  const normalizedSpaceKey = normalizeProjectKey(spaceKey)
  if (!normalizedSpaceKey) {
    return null
  }

  const space = getAppSettings().spaces.find(candidate => candidate.key === normalizedSpaceKey)
  return space?.teamFilter ? space.teamFilter.projectKey : normalizedSpaceKey
}

export async function getCandidateProjects(): Promise<JiraApiProject[]> {
  const data = await jiraFetch('/project/search', {
    params: {
      maxResults: '50',
    },
  })

  if (!isRecord(data) || !Array.isArray(data.values)) {
    throw new Error('Unable to resolve a Jira project for issue creation')
  }

  const projects = data.values.filter(isJiraApiProject)
  if (!projects.length) {
    throw new Error('No Jira project is available for issue creation')
  }

  return projects
}

export async function getAccessibleSpaces(): Promise<JiraSpaceDirectoryEntry[]> {
  const projects = await getCandidateProjects()
  const spacesByKey = new Map<string, JiraSpaceDirectoryEntry>()

  for (const project of projects) {
    const key = typeof project.key === 'string' ? project.key.trim().toUpperCase() : ''
    if (!key || spacesByKey.has(key)) {
      continue
    }

    const name = typeof project.name === 'string' && project.name.trim().length > 0
      ? project.name.trim()
      : key

    spacesByKey.set(key, {
      key,
      name,
    })
  }

  return [...spacesByKey.values()].sort((left, right) => (
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    || left.key.localeCompare(right.key, undefined, { sensitivity: 'base' })
  ))
}

function stripJqlSuggestionMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .trim()
}

/** Lists Jira Team field options via JQL autocomplete suggestions. Teams are org-wide, not project-scoped. */
export async function getAccessibleTeams(query?: string): Promise<JiraTeamRef[]> {
  const params: Record<string, string> = { fieldName: 'Team[Team]' }
  if (query) {
    params.fieldValue = query
  }

  const data = await jiraFetch('/jql/autocompletedata/suggestions', { params })
  if (!isRecord(data) || !Array.isArray(data.results)) {
    return []
  }

  const teamsById = new Map<string, JiraTeamRef>()

  for (const result of data.results) {
    if (!isRecord(result) || typeof result.value !== 'string' || !result.value) {
      continue
    }

    const displayName = typeof result.displayName === 'string'
      ? stripJqlSuggestionMarkup(result.displayName)
      : ''

    teamsById.set(result.value, {
      id: result.value,
      name: displayName || result.value,
    })
  }

  return [...teamsById.values()].sort((left, right) => (
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  ))
}

export async function getProject(projectKey: string): Promise<JiraApiProject | null> {
  const project = await jiraFetch(`/project/${encodeURIComponent(projectKey)}`)
  return isJiraApiProject(project) ? project : null
}

function normalizeProjectKey(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const normalizedValue = value.trim().toUpperCase()
  return normalizedValue.length > 0 ? normalizedValue : null
}

async function projectSupportsIssueType(projectKey: string, issueType: JiraCreateIssueType): Promise<boolean> {
  const issueTypes = await getProjectIssueTypes(projectKey)
  return issueTypes.some(candidate => matchesIssueType(candidate.name, issueType))
}

export async function resolveProjectKey(
  issueType: JiraCreateIssueType,
  parentKey?: string | null,
  spaceKey?: string | null,
): Promise<string> {
  const normalizedSpaceKey = getProjectKeyForSpaceKey(spaceKey)

  if (parentKey) {
    const parentProjectKey = getProjectKeyFromIssueKey(parentKey)
    if (!parentProjectKey) {
      throw new Error(`Invalid parent key: ${parentKey}`)
    }

    if (normalizedSpaceKey) {
      if (normalizedSpaceKey !== parentProjectKey && !matchesIssueType(issueType, 'Epic')) {
        throw new Error(`Parent ${parentKey} belongs to ${parentProjectKey}; choose that space or remove the parent`)
      }

      const project = await getProject(normalizedSpaceKey)
      if (!project?.key) {
        throw new Error(`Space ${normalizedSpaceKey} is not available in Jira`)
      }

      if (!(await projectSupportsIssueType(normalizedSpaceKey, issueType))) {
        throw new Error(`Issue type ${issueType} is not available for project ${normalizedSpaceKey}`)
      }

      return normalizedSpaceKey
    }

    if (await projectSupportsIssueType(parentProjectKey, issueType)) {
      return parentProjectKey
    }

    if (!matchesIssueType(issueType, 'Epic')) {
      return parentProjectKey
    }
  }

  if (normalizedSpaceKey) {
    const project = await getProject(normalizedSpaceKey)
    if (!project?.key) {
      throw new Error(`Space ${normalizedSpaceKey} is not available in Jira`)
    }

    if (!(await projectSupportsIssueType(normalizedSpaceKey, issueType))) {
      throw new Error(`Issue type ${issueType} is not available for project ${normalizedSpaceKey}`)
    }

    return normalizedSpaceKey
  }

  const configuredProjectKey = getJiraConfig().projectKey
  if (configuredProjectKey) {
    try {
      const project = await getProject(configuredProjectKey)
      if (project && typeof project.key === 'string' && project.key) {
        if (await projectSupportsIssueType(project.key, issueType)) {
          return project.key
        }
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

  const projects = await getCandidateProjects()
  for (const project of projects) {
    if (typeof project.key !== 'string' || !project.key) {
      continue
    }

    if (await projectSupportsIssueType(project.key, issueType)) {
      return project.key
    }
  }

  throw new Error(`Issue type ${issueType} is not available in any accessible Jira project`)
}

export async function getProjectIssueTypes(projectKey: string): Promise<JiraApiIssueType[]> {
  const data = await jiraFetch(`/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`)
  if (!isRecord(data) || !Array.isArray(data.issueTypes)) {
    return []
  }

  return data.issueTypes
    .filter(isRecord)
    .map(issueType => ({
      id: typeof issueType.id === 'string' ? issueType.id : undefined,
      name: typeof issueType.name === 'string' ? issueType.name : undefined,
      subtask: typeof issueType.subtask === 'boolean' ? issueType.subtask : undefined,
      hierarchyLevel: typeof issueType.hierarchyLevel === 'number' ? issueType.hierarchyLevel : undefined,
    }))
}

export function getProjectKeyFromIssueKey(issueKey: string): string | null {
  const separatorIndex = issueKey.indexOf('-')
  if (separatorIndex <= 0) {
    return null
  }

  return issueKey.slice(0, separatorIndex)
}
