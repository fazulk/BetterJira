import type {
  CreateIssueInput,
  JiraCreateFieldValue,
  JiraCreateIssueType,
  JiraCreateIssueTypeOption,
  JiraTicket,
} from './jiraTypes'
import {
  isJiraAdfDocument,
  normalizeAdf,
  plainTextToAdf,
} from '../shared/jiraAdf'
import { isRecord } from '../shared/typeGuards'
import { JiraApiError } from './errors'
import { broadcast } from './events'
import { getJiraConfig, jiraFetch } from './jiraClient'
import { resolveTeamFieldId } from './jiraIssueMapping'
import { getTicket } from './jiraIssueQueries'
import {
  getAvailableChildIssueTypeOptions,
  isCreateIssueType,
  matchesIssueType,
  normalizeIssueType,
} from './jiraIssueTypePolicy'
import {
  getCandidateProjects,
  getProject,
  getProjectIssueTypes,
  getProjectKeyFromIssueKey,
  resolveProjectKey,
} from './jiraProjects'
import { getAppSettings } from './settings'

type SupportedCreateFieldKey = 'summary' | 'description' | 'priority' | 'assignee' | 'duedate'

interface SupportedCreateFieldDescriptor {
  key: SupportedCreateFieldKey
  label: string
  required: boolean
}

const SUPPORTED_CREATE_FIELDS: SupportedCreateFieldDescriptor[] = [
  { key: 'summary', label: 'Title', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'assignee', label: 'Assignee', required: false },
  { key: 'duedate', label: 'Due Date', required: false },
]

interface JiraApiCreateField {
  key?: string
  required?: boolean
}

async function getIssueTypeCreateFields(projectKey: string, issueTypeId: string): Promise<JiraApiCreateField[]> {
  const data = await jiraFetch(`/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${encodeURIComponent(issueTypeId)}`)
  if (!isRecord(data) || !Array.isArray(data.fields)) {
    return []
  }

  return data.fields.filter(isRecord).map(field => ({
    key: typeof field.key === 'string' ? field.key : undefined,
    required: typeof field.required === 'boolean' ? field.required : undefined,
  }))
}

async function getCreateIssueTypeOptions(projectKey: string): Promise<JiraCreateIssueTypeOption[]> {
  const issueTypes = await getProjectIssueTypes(projectKey)

  const options = await Promise.all(issueTypes.map(async (issueType) => {
    if (!issueType.id || !issueType.name) {
      return null
    }

    const fields = await getIssueTypeCreateFields(projectKey, issueType.id)
    const parentField = fields.find(field => field.key === 'parent')

    return {
      id: issueType.id,
      name: issueType.name,
      subtask: issueType.subtask ?? false,
      hierarchyLevel: issueType.hierarchyLevel ?? 0,
      parentRequired: parentField?.required ?? false,
      parentSupported: Boolean(parentField),
    } satisfies JiraCreateIssueTypeOption
  }))

  return options
    .filter((option): option is JiraCreateIssueTypeOption => option !== null)
    .sort((left, right) => (
      right.hierarchyLevel - left.hierarchyLevel
      || left.name.localeCompare(right.name)
    ))
}

async function getParentValidatedCreateIssueTypeOptions(parentKey: string): Promise<JiraCreateIssueTypeOption[]> {
  const parentProjectKey = getProjectKeyFromIssueKey(parentKey)
  if (!parentProjectKey) {
    throw new Error(`Invalid parent key: ${parentKey}`)
  }

  // Children are created in the parent's project, so only its hierarchy
  // matters. Scanning every candidate project here made this both slow
  // (50 × per-issue-type createmeta calls) and wrong: foreign projects
  // contributed issue types Jira rejects for this parent.
  const [parent, issueTypeOptions] = await Promise.all([
    getTicket(parentKey),
    getCreateIssueTypeOptions(parentProjectKey),
  ])

  return getAvailableChildIssueTypeOptions(parent.issueType, issueTypeOptions)
}

export async function getCreateIssueTypes(parentKey?: string | null): Promise<JiraCreateIssueTypeOption[]> {
  if (parentKey) {
    return getParentValidatedCreateIssueTypeOptions(parentKey)
  }

  const configuredProjectKey = getJiraConfig().projectKey
  if (configuredProjectKey) {
    try {
      const project = await getProject(configuredProjectKey)
      if (project?.key) {
        return (await getCreateIssueTypeOptions(project.key)).filter(issueType => !issueType.parentRequired)
      }
    }
    catch (error) {
      // The configured project may not exist; fall back to candidate projects.
      if (!(error instanceof JiraApiError && error.status === 404)) {
        throw error
      }
    }
  }

  const projects = await getCandidateProjects()
  const seenIssueTypes = new Set<string>()
  const mergedIssueTypes: JiraCreateIssueTypeOption[] = []

  for (const project of projects) {
    if (!project.key) {
      continue
    }

    const projectIssueTypes = await getCreateIssueTypeOptions(project.key)
    for (const issueType of projectIssueTypes) {
      const normalizedIssueTypeName = normalizeIssueType(issueType.name)
      if (issueType.parentRequired || seenIssueTypes.has(normalizedIssueTypeName)) {
        continue
      }

      seenIssueTypes.add(normalizedIssueTypeName)
      mergedIssueTypes.push(issueType)
    }
  }

  return mergedIssueTypes.sort((left, right) => (
    right.hierarchyLevel - left.hierarchyLevel
    || left.name.localeCompare(right.name)
  ))
}

async function getMatchedIssueType(issueType: JiraCreateIssueType, projectKey: string): Promise<{ id: string, subtask: boolean }> {
  const issueTypes = await getProjectIssueTypes(projectKey)
  const matchedIssueType = issueTypes.find(candidate => matchesIssueType(candidate.name, issueType))

  if (!matchedIssueType?.id) {
    throw new Error(`Issue type ${issueType} is not available for project ${projectKey}`)
  }

  return { id: matchedIssueType.id, subtask: matchedIssueType.subtask ?? false }
}

async function getIssueTypeOption(issueType: JiraCreateIssueType, projectKey: string): Promise<JiraCreateIssueTypeOption> {
  const issueTypeOptions = await getCreateIssueTypeOptions(projectKey)
  const matchedIssueType = issueTypeOptions.find(candidate => matchesIssueType(candidate.name, issueType))

  if (!matchedIssueType) {
    throw new Error(`Issue type ${issueType} is not available for project ${projectKey}`)
  }

  return matchedIssueType
}

function serializeFieldValue(
  definition: SupportedCreateFieldDescriptor,
  value: JiraCreateFieldValue,
): unknown {
  if (definition.key === 'description') {
    if (value === null)
      return null
    if (typeof value === 'string') {
      const nextValue = value.trim()
      return nextValue ? plainTextToAdf(nextValue) : null
    }

    return isJiraAdfDocument(value) ? normalizeAdf(value) : null
  }

  if (definition.key === 'priority') {
    if (typeof value !== 'string' || !value.trim())
      return null
    return { id: value.trim() }
  }

  if (definition.key === 'assignee') {
    if (typeof value !== 'string' || !value.trim())
      return null
    return { accountId: value.trim() }
  }

  if (definition.key === 'duedate') {
    if (typeof value !== 'string' || !value.trim())
      return null
    return value.trim()
  }

  if (typeof value !== 'string')
    return ''
  return value.trim()
}

function validateRequiredFields(
  definitions: SupportedCreateFieldDescriptor[],
  providedFields: Record<string, JiraCreateFieldValue>,
): void {
  for (const definition of definitions) {
    if (!definition.required)
      continue

    const value = providedFields[definition.key]
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${definition.label} is required`)
    }
  }
}

function buildCreateFieldsPayload(
  definitions: SupportedCreateFieldDescriptor[],
  providedFields: Record<string, JiraCreateFieldValue>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const definition of definitions) {
    const value = providedFields[definition.key]
    if (value === undefined)
      continue

    const serializedValue = serializeFieldValue(definition, value)

    if (serializedValue === null)
      continue
    if (typeof serializedValue === 'string' && serializedValue === '')
      continue
    if (Array.isArray(serializedValue) && serializedValue.length === 0)
      continue

    payload[definition.key] = serializedValue
  }

  return payload
}

async function validateParent(
  issueType: JiraCreateIssueType,
  parentKey: string | null | undefined,
  spaceKey?: string | null,
): Promise<void> {
  const projectKey = await resolveProjectKey(issueType, parentKey, spaceKey)
  const childIssueType = await getIssueTypeOption(issueType, projectKey)

  if (!parentKey) {
    if (childIssueType.parentRequired) {
      throw new Error(`${issueType} requires a parent`)
    }
    return
  }

  if (!childIssueType.parentSupported) {
    throw new Error(`${issueType} cannot have a parent`)
  }

  const allowedIssueTypes = await getParentValidatedCreateIssueTypeOptions(parentKey)
  const isAllowedForParent = allowedIssueTypes.some(candidate => matchesIssueType(candidate.name, issueType))
  if (isAllowedForParent) {
    return
  }

  const parent = await getTicket(parentKey)
  throw new Error(`${issueType} cannot be added under ${parent.issueType} ${parentKey}`)
}

/** Pre-fills the Jira Team field when the issue is created from a team-filtered space. */
async function applyTeamSpacePrefill(
  createPayload: Record<string, unknown>,
  spaceKey: string | null | undefined,
  projectKey: string,
): Promise<void> {
  const normalizedSpaceKey = spaceKey?.trim().toUpperCase()
  if (!normalizedSpaceKey) {
    return
  }

  const space = getAppSettings().spaces.find(candidate => candidate.key === normalizedSpaceKey)
  if (!space?.teamFilter || space.teamFilter.projectKey !== projectKey) {
    return
  }

  const teamFieldId = await resolveTeamFieldId()
  if (teamFieldId) {
    createPayload[teamFieldId] = space.teamFilter.teamId
  }
}

export async function createIssue(input: CreateIssueInput): Promise<JiraTicket> {
  if (!isCreateIssueType(input.issueType)) {
    throw new Error(`Unsupported issue type: ${input.issueType}`)
  }

  await validateParent(input.issueType, input.parentKey, input.spaceKey)

  const projectKey = await resolveProjectKey(input.issueType, input.parentKey, input.spaceKey)
  const matchedIssueType = await getMatchedIssueType(input.issueType, projectKey)

  validateRequiredFields(SUPPORTED_CREATE_FIELDS, input.fields)

  const fields = buildCreateFieldsPayload(SUPPORTED_CREATE_FIELDS, input.fields)
  const createPayload: Record<string, unknown> = {
    project: { key: projectKey },
    issuetype: { id: matchedIssueType.id },
    ...fields,
  }

  if (input.parentKey) {
    createPayload.parent = { key: input.parentKey }
  }

  // Subtasks inherit the team from their parent; Jira rejects an explicit value.
  if (!matchedIssueType.subtask) {
    await applyTeamSpacePrefill(createPayload, input.spaceKey, projectKey)
  }

  const data = await jiraFetch('/issue', {
    method: 'POST',
    body: {
      fields: createPayload,
    },
  })

  const issueKey = isRecord(data) && typeof data.key === 'string' ? data.key : null
  if (!issueKey) {
    throw new Error('Jira create response did not include an issue key')
  }

  const createdTicket = await getTicket(issueKey)
  broadcast('ticket-created', createdTicket)
  return createdTicket
}
