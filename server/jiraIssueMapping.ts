import type {
  JiraApiAttachment,
  JiraApiIssue,
  JiraApiIssueFields,
  JiraApiProject,
  JiraApiSprint,
  JiraApiUser,
  JiraAttachment,
  JiraTeamRef,
  JiraTicket,
} from './jiraTypes'
import { isRecord } from '../shared/typeGuards'
import { jiraFetch } from './jiraClient'
import { extractDescription, extractDescriptionAdf } from './jiraDescription'

let sprintFieldIdPromise: Promise<string | null> | null = null
let teamFieldIdPromise: Promise<string | null> | null = null

export function isJiraApiUser(value: unknown): value is Required<JiraApiUser> {
  if (!isRecord(value))
    return false
  return typeof value.accountId === 'string' && typeof value.displayName === 'string'
}

export function isJiraApiIssue(value: unknown): value is JiraApiIssue {
  return isRecord(value)
}

export function isJiraApiProject(value: unknown): value is JiraApiProject {
  return isRecord(value)
}

function isJiraApiSprint(value: unknown): value is JiraApiSprint {
  return isRecord(value)
}

async function getSprintFieldId(): Promise<string | null> {
  if (!sprintFieldIdPromise) {
    sprintFieldIdPromise = (async () => {
      const data = await jiraFetch('/field/search', {
        params: {
          query: 'Sprint',
          maxResults: '50',
        },
      })

      if (!isRecord(data) || !Array.isArray(data.values)) {
        return null
      }

      for (const field of data.values) {
        if (!isRecord(field) || typeof field.id !== 'string' || field.name !== 'Sprint') {
          continue
        }

        const schema = isRecord(field.schema) ? field.schema : null
        if (schema?.custom === 'com.pyxis.greenhopper.jira:gh-sprint') {
          return field.id
        }
      }

      return null
    })().catch((error: unknown) => {
      sprintFieldIdPromise = null
      throw error
    })
  }

  return sprintFieldIdPromise
}

export async function resolveSprintFieldId(): Promise<string | null> {
  try {
    return await getSprintFieldId()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.warn('Unable to resolve Jira sprint field:', message)
    return null
  }
}

/** Schema types for Jira's native Team field: the current Atlassian Teams type and the legacy Advanced Roadmaps type. */
const TEAM_FIELD_SCHEMA_TYPES = new Set([
  'com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team',
  'com.atlassian.teams:rm-teams-custom-field-team',
])

async function getTeamFieldId(): Promise<string | null> {
  if (!teamFieldIdPromise) {
    teamFieldIdPromise = (async () => {
      const data = await jiraFetch('/field/search', {
        params: {
          query: 'Team',
          maxResults: '50',
        },
      })

      if (!isRecord(data) || !Array.isArray(data.values)) {
        return null
      }

      for (const field of data.values) {
        if (!isRecord(field) || typeof field.id !== 'string') {
          continue
        }

        const schema = isRecord(field.schema) ? field.schema : null
        if (typeof schema?.custom === 'string' && TEAM_FIELD_SCHEMA_TYPES.has(schema.custom)) {
          return field.id
        }
      }

      return null
    })().catch((error: unknown) => {
      teamFieldIdPromise = null
      throw error
    })
  }

  return teamFieldIdPromise
}

export async function resolveTeamFieldId(): Promise<string | null> {
  try {
    return await getTeamFieldId()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.warn('Unable to resolve Jira team field:', message)
    return null
  }
}

function mapTeam(fields: JiraApiIssueFields | undefined, teamFieldId: string | null): JiraTeamRef | undefined {
  if (!fields || !teamFieldId || !isRecord(fields)) {
    return undefined
  }

  const value = fields[teamFieldId]
  if (typeof value === 'string' && value) {
    return { id: value, name: value }
  }

  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) {
    return undefined
  }

  const name = typeof value.title === 'string' && value.title
    ? value.title
    : typeof value.name === 'string' && value.name
      ? value.name
      : value.id

  return { id: value.id, name }
}

function isTicketInCurrentSprint(fields: JiraApiIssueFields | undefined, sprintFieldId: string | null): boolean {
  if (!fields || !sprintFieldId || !isRecord(fields)) {
    return false
  }

  const sprintValue = fields[sprintFieldId]
  if (!Array.isArray(sprintValue)) {
    return false
  }

  return sprintValue.some(sprint => isJiraApiSprint(sprint) && sprint.state === 'active')
}

export function mapAttachment(attachment: JiraApiAttachment): JiraAttachment | null {
  if (typeof attachment.id !== 'string' || !attachment.id)
    return null
  if (typeof attachment.filename !== 'string' || !attachment.filename)
    return null

  const mapped: JiraAttachment = {
    id: attachment.id,
    filename: attachment.filename,
  }

  if (typeof attachment.mimeType === 'string' && attachment.mimeType) {
    mapped.mimeType = attachment.mimeType
  }

  if (typeof attachment.content === 'string' && attachment.content) {
    mapped.content = attachment.content
  }

  if (typeof attachment.thumbnail === 'string' && attachment.thumbnail) {
    mapped.thumbnail = attachment.thumbnail
  }

  return mapped
}

function mapAttachments(attachments: JiraApiAttachment[] | undefined): JiraAttachment[] | undefined {
  if (!attachments?.length)
    return undefined

  const mappedAttachments = attachments
    .map(mapAttachment)
    .filter((attachment): attachment is JiraAttachment => attachment !== null)

  return mappedAttachments.length ? mappedAttachments : undefined
}

export function mapIssue(issue: JiraApiIssue, includeDescription = false, sprintFieldId: string | null = null, teamFieldId: string | null = null): JiraTicket {
  const fields = issue.fields
  const descriptionAdf = includeDescription ? extractDescriptionAdf(fields?.description) : undefined
  const ticket: JiraTicket = {
    key: issue.key ?? '',
    summary: fields?.summary ?? '',
    status: fields?.status?.name ?? '',
    statusCategory: fields?.status?.statusCategory?.key ?? '',
    inCurrentSprint: isTicketInCurrentSprint(fields, sprintFieldId),
    createdAt: fields?.created ?? undefined,
    updatedAt: fields?.updated ?? undefined,
    dueDate: fields?.duedate ?? undefined,
    completedAt: fields?.resolutiondate ?? undefined,
    priority: fields?.priority?.name ?? '',
    issueType: fields?.issuetype?.name ?? '',
    labels: fields?.labels ?? [],
    spaceKey: fields?.project?.key ?? '',
    spaceName: fields?.project?.name ?? fields?.project?.key ?? 'Unknown space',
    team: mapTeam(fields, teamFieldId),
    assignee: fields?.assignee?.displayName ?? 'Unassigned',
    assigneeAccountId: fields?.assignee?.accountId ?? undefined,
    reporter: fields?.reporter?.displayName ?? undefined,
    reporterAccountId: fields?.reporter?.accountId ?? undefined,
    isWatching: fields?.watches?.isWatching ?? undefined,
    watchCount: fields?.watches?.watchCount ?? undefined,
    description: includeDescription ? extractDescription(fields?.description, descriptionAdf) : undefined,
    descriptionAdf,
    attachments: includeDescription ? mapAttachments(fields?.attachment) : undefined,
    self: issue.self ?? '',
    parent: fields?.parent
      ? {
          key: fields.parent.key ?? '',
          summary: fields.parent.fields?.summary ?? '',
          issueType: fields.parent.fields?.issuetype?.name ?? '',
        }
      : undefined,
  }
  return ticket
}
