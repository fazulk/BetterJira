import type {
  JiraActivityComment,
  JiraActivityHistory,
  JiraActivityItem,
  JiraApiChangelogHistory,
  JiraApiChangelogItem,
  JiraApiComment,
  JiraApiIssue,
  JiraMessage,
} from './jiraTypes'
import { plainTextToAdf } from '../shared/jiraAdf'
import { isRecord } from '../shared/typeGuards'
import { jiraFetch } from './jiraClient'
import { extractDescription } from './jiraDescription'

function isJiraApiIssue(value: unknown): value is JiraApiIssue {
  return isRecord(value)
}

function mapComment(comment: JiraApiComment): JiraMessage {
  return {
    id: comment.id ?? '',
    author: comment.author?.displayName ?? 'Unknown',
    createdAt: comment.created ?? '',
    body: extractDescription(comment.body).trim(),
    parentMessageId: extractParentMessageId(comment),
  }
}

function getHistoryValue(value: string | null | undefined): string | null {
  const nextValue = value?.trim()
  return nextValue || null
}

function formatHistoryAction(author: string, field: string, from: string | null, to: string | null): string {
  const normalizedField = field.trim().toLowerCase()

  if (normalizedField === 'status') {
    if (from && to)
      return `moved from ${from} to ${to}`
    if (to)
      return `moved to ${to}`
    return 'changed status'
  }

  if (normalizedField === 'assignee') {
    if (to && to === author && !from)
      return 'self-assigned the issue'
    if (to)
      return `assigned the issue to ${to}`
    if (from)
      return `removed ${from} as assignee`
    return 'changed assignee'
  }

  if (normalizedField === 'priority') {
    if (to)
      return `set priority to ${to}`
    return 'changed priority'
  }

  if (normalizedField === 'summary') {
    return 'renamed the issue'
  }

  if (normalizedField === 'issuetype') {
    if (from && to)
      return `changed type from ${from} to ${to}`
    if (to)
      return `changed type to ${to}`
    return 'changed type'
  }

  if (normalizedField === 'parent') {
    if (from && to)
      return `moved parent from ${from} to ${to}`
    if (to)
      return `added parent ${to}`
    if (from)
      return `removed parent ${from}`
    return 'changed parent'
  }

  const readableField = field.trim() || 'field'
  if (from && to)
    return `changed ${readableField} from ${from} to ${to}`
  if (to)
    return `set ${readableField} to ${to}`
  if (from)
    return `cleared ${readableField}`
  return `changed ${readableField}`
}

function formatHistoryBody(author: string, field: string, from: string | null, to: string | null): string {
  return `${author} ${formatHistoryAction(author, field, from, to)}`
}

function joinHistoryActions(actions: string[]): string {
  if (actions.length === 0)
    return 'changed the issue'
  if (actions.length === 1)
    return actions[0] ?? 'changed the issue'
  if (actions.length === 2)
    return `${actions[0]} and ${actions[1]}`

  const leadingActions = actions.slice(0, -1)
  const finalAction = actions[actions.length - 1] ?? 'changed the issue'
  return `${leadingActions.join(', ')}, and ${finalAction}`
}

function isJiraApiChangelogHistory(value: unknown): value is JiraApiChangelogHistory {
  return isRecord(value)
}

function isJiraApiChangelogItem(value: unknown): value is JiraApiChangelogItem {
  return isRecord(value)
}

const visibleChangelogFields = new Set([
  'assignee',
  'issuetype',
  'parent',
  'priority',
  'status',
  'summary',
])

function shouldShowChangelogItem(item: JiraApiChangelogItem): boolean {
  const field = item.field?.trim().toLowerCase()
  return field ? visibleChangelogFields.has(field) : false
}

function mapChangelogHistory(history: JiraApiChangelogHistory): JiraActivityHistory[] {
  const author = history.author?.displayName ?? 'Unknown'
  const createdAt = history.created ?? ''
  const historyId = history.id ?? createdAt
  const items = Array.isArray(history.items)
    ? history.items.filter(isJiraApiChangelogItem).filter(shouldShowChangelogItem)
    : []

  if (items.length > 1) {
    const actions = items.map(item => (
      formatHistoryAction(
        author,
        item.field?.trim() || 'field',
        getHistoryValue(item.fromString),
        getHistoryValue(item.toString),
      )
    ))
    const primaryField = items[0]?.field?.trim() || 'field'

    return [{
      kind: 'history',
      id: historyId,
      author,
      createdAt,
      body: `${author} ${joinHistoryActions(actions)}`,
      field: primaryField,
    }]
  }

  return items.map((item, index) => {
    const field = item.field?.trim() || 'field'
    const from = getHistoryValue(item.fromString)
    const to = getHistoryValue(item.toString)

    return {
      kind: 'history',
      id: `${historyId}:${index}`,
      author,
      createdAt,
      body: formatHistoryBody(author, field, from, to),
      field,
      from: from ?? undefined,
      to: to ?? undefined,
    }
  })
}

function getActivityCreatedAtMs(item: JiraActivityItem): number {
  const createdAtMs = Date.parse(item.createdAt)
  return Number.isNaN(createdAtMs) ? Number.MIN_SAFE_INTEGER : createdAtMs
}

async function getTicketCreatedActivity(key: string): Promise<JiraActivityHistory | null> {
  const data = await jiraFetch(`/issue/${key}`, {
    params: {
      fields: 'created,reporter',
    },
  })

  if (!isJiraApiIssue(data) || !data.fields?.created) {
    return null
  }

  const author = data.fields.reporter?.displayName ?? 'Unknown'
  return {
    kind: 'history',
    id: `${key}:created`,
    author,
    createdAt: data.fields.created,
    body: author === 'Unknown' ? 'Issue created' : `${author} created the issue`,
    field: 'created',
  }
}

function normalizeJiraCommentId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const nextValue = value.trim()
  return /^\d+$/.test(nextValue) ? nextValue : null
}

function extractParentCommentIdFromValue(
  value: unknown,
  path: string[] = [],
  visited = new Set<unknown>(),
): string | null {
  if (value === null || value === undefined)
    return null
  if (typeof value !== 'object')
    return null
  if (visited.has(value))
    return null

  visited.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedId = extractParentCommentIdFromValue(item, path, visited)
      if (nestedId)
        return nestedId
    }
    return null
  }

  if (!isRecord(value))
    return null

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase()
    const nextPath = [...path, normalizedKey]
    const pathHintsParent = nextPath.some(segment => segment.includes('parent'))
    const pathHintsComment = nextPath.some(segment => (
      segment.includes('comment')
      || segment.includes('thread')
      || segment === 'id'
    ))

    if (pathHintsParent && pathHintsComment) {
      const directId = normalizeJiraCommentId(nestedValue)
      if (directId)
        return directId

      if (isRecord(nestedValue)) {
        const nestedId = normalizeJiraCommentId(nestedValue.id)
        if (nestedId)
          return nestedId
      }
    }

    const nestedId = extractParentCommentIdFromValue(nestedValue, nextPath, visited)
    if (nestedId)
      return nestedId
  }

  return null
}

function extractParentMessageId(comment: JiraApiComment): string | null {
  if (!Array.isArray(comment.properties)) {
    return null
  }

  for (const property of comment.properties) {
    const parentMessageId = extractParentCommentIdFromValue(property.value, [
      typeof property.key === 'string' ? property.key.toLowerCase() : 'property',
    ])
    if (parentMessageId) {
      return parentMessageId
    }
  }

  return null
}

export async function getTicketMessages(key: string): Promise<JiraMessage[]> {
  const data = await jiraFetch(`/issue/${key}/comment`, {
    params: {
      expand: 'properties',
      orderBy: '-created',
    },
  })

  if (!isRecord(data) || !Array.isArray(data.comments))
    return []

  return data.comments.map(mapComment)
}

async function getTicketChangelog(key: string): Promise<JiraApiChangelogHistory[]> {
  const histories: JiraApiChangelogHistory[] = []
  let startAt = 0
  const maxResults = 100

  while (true) {
    const data = await jiraFetch(`/issue/${key}/changelog`, {
      params: {
        startAt: String(startAt),
        maxResults: String(maxResults),
      },
    })

    const values = isRecord(data) && Array.isArray(data.values)
      ? data.values
      : isRecord(data) && Array.isArray(data.histories)
        ? data.histories
        : []
    const batch = values.filter(isJiraApiChangelogHistory)

    histories.push(...batch)

    const isLast = isRecord(data) && typeof data.isLast === 'boolean' ? data.isLast : false
    if (batch.length === 0 || isLast) {
      break
    }

    const total = isRecord(data) && typeof data.total === 'number' ? data.total : null
    const nextStartAt = startAt + batch.length
    if (total !== null && nextStartAt >= total) {
      break
    }

    startAt = nextStartAt
  }

  return histories
}

export async function getTicketActivity(key: string): Promise<JiraActivityItem[]> {
  const [comments, createdActivity] = await Promise.all([
    getTicketMessages(key),
    getTicketCreatedActivity(key),
  ])
  let histories: JiraApiChangelogHistory[] = []

  try {
    histories = await getTicketChangelog(key)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Jira changelog'
    console.warn(`Unable to load Jira changelog for ${key}: ${message}`)
  }

  const commentActivity = comments.map((message): JiraActivityComment => ({
    kind: 'comment',
    id: message.id,
    author: message.author,
    createdAt: message.createdAt,
    body: message.body,
    parentMessageId: message.parentMessageId,
  }))
  const historyActivity = histories.flatMap(mapChangelogHistory)
  const creationActivity = createdActivity ? [createdActivity] : []

  return [...creationActivity, ...commentActivity, ...historyActivity].sort((left, right) => (
    getActivityCreatedAtMs(left) - getActivityCreatedAtMs(right)
    || left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' })
  ))
}

export async function addTicketMessage(key: string, body: string): Promise<JiraMessage> {
  const nextBody = body.trim()
  if (!nextBody) {
    throw new Error('Message cannot be empty')
  }

  const data = await jiraFetch(`/issue/${key}/comment`, {
    method: 'POST',
    body: {
      body: plainTextToAdf(nextBody),
    },
  })

  return mapComment(isRecord(data) ? data : {})
}
