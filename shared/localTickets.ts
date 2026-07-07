import type { JiraAdfDocument } from './jiraAdf'
import { adfToPlainText, isJiraAdfDocument, plainTextToAdf } from './jiraAdf'

export const LOCAL_SPACE_KEY = 'LOCAL'
export const LOCAL_SPACE_NAME = 'Local'
export const LOCAL_ISSUE_TYPE = 'Task'

const LOCAL_KEY_REGEX = /^LOCAL-\d+$/

export type LocalStatusId = 'todo' | 'in_progress' | 'done'

export interface LocalStatusDefinition {
  id: LocalStatusId
  name: string
  statusCategory: 'new' | 'indeterminate' | 'done'
}

export const LOCAL_STATUS_DEFINITIONS: readonly LocalStatusDefinition[] = [
  { id: 'todo', name: 'To Do', statusCategory: 'new' },
  { id: 'in_progress', name: 'In Progress', statusCategory: 'indeterminate' },
  { id: 'done', name: 'Done', statusCategory: 'done' },
] as const

export const LOCAL_PRIORITY_NAMES = [
  'Highest',
  'High',
  'Medium',
  'Low',
  'Lowest',
] as const

export type LocalPriorityName = (typeof LOCAL_PRIORITY_NAMES)[number]

export function isLocalPriorityName(value: string): value is LocalPriorityName {
  return (LOCAL_PRIORITY_NAMES as readonly string[]).includes(value)
}

export function normalizeLocalTicketKey(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const trimmed = value.trim().toUpperCase()
  return LOCAL_KEY_REGEX.test(trimmed) ? trimmed : null
}

export function isLocalTicketKey(key: string | null): boolean {
  return normalizeLocalTicketKey(key) !== null
}

export function getLocalStatusById(id: string): LocalStatusDefinition | undefined {
  return LOCAL_STATUS_DEFINITIONS.find(entry => entry.id === id)
}

export function getLocalStatusIdFromDisplayName(display: string): LocalStatusId {
  const found = LOCAL_STATUS_DEFINITIONS.find(entry => entry.name === display)
  return found?.id ?? 'todo'
}

/** Transition-style options for the UI (id is the next status id). */
export function getLocalTransitions(currentStatusId: LocalStatusId): Array<{
  id: string
  name: string
  statusName: string
  statusCategory: string
}> {
  return LOCAL_STATUS_DEFINITIONS.filter(def => def.id !== currentStatusId).map(def => ({
    id: def.id,
    name: `Move to ${def.name}`,
    statusName: def.name,
    statusCategory: def.statusCategory,
  }))
}

export interface StoredLocalTicket {
  numericId: number
  summary: string
  descriptionAdf: JiraAdfDocument | null
  statusId: LocalStatusId
  priority: string
  assigneeName: string | null
  labels: string[]
  parentKey: string | null
  createdAt: string
  updatedAt: string
  dueDate: string | null
  completedAt: string | null
}

export interface LocalTicketsFile {
  nextId: number
  tickets: StoredLocalTicket[]
}

export interface JiraTicketLike {
  key: string
  summary: string
  status: string
  statusCategory: string
  inCurrentSprint: boolean
  createdAt?: string
  updatedAt?: string
  dueDate?: string
  completedAt?: string
  priority: string
  issueType: string
  labels: string[]
  spaceKey: string
  spaceName: string
  assignee: string
  reporter?: string
  reporterAccountId?: string
  isWatching?: boolean
  watchCount?: number
  description?: string
  descriptionAdf?: JiraAdfDocument
  self: string
  parent?: {
    key: string
    summary: string
    issueType: string
  }
}

export function storedLocalToJiraShape(
  stored: StoredLocalTicket,
  parentSummary: string | null,
): JiraTicketLike {
  const statusDef = getLocalStatusById(stored.statusId)
  const statusName = statusDef?.name ?? 'To Do'
  const statusCategory = statusDef?.statusCategory ?? 'new'
  const descriptionAdf = stored.descriptionAdf ?? undefined
  const plainDescription = descriptionAdf ? adfToPlainText(descriptionAdf) : ''

  const ticket: JiraTicketLike = {
    key: `LOCAL-${stored.numericId}`,
    summary: stored.summary,
    status: statusName,
    statusCategory,
    inCurrentSprint: false,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    dueDate: stored.dueDate ?? undefined,
    completedAt: stored.completedAt ?? undefined,
    priority: stored.priority,
    issueType: LOCAL_ISSUE_TYPE,
    labels: normalizeLabels(stored.labels),
    spaceKey: LOCAL_SPACE_KEY,
    spaceName: LOCAL_SPACE_NAME,
    assignee: stored.assigneeName?.trim() || 'Unassigned',
    description: plainDescription || undefined,
    descriptionAdf,
    self: '',
  }

  if (stored.parentKey && parentSummary !== null) {
    ticket.parent = {
      key: stored.parentKey,
      summary: parentSummary,
      issueType: LOCAL_ISSUE_TYPE,
    }
  }

  return ticket
}

export function normalizeDescriptionAdf(value: unknown): JiraAdfDocument | null {
  if (value === null || value === undefined)
    return null
  if (isJiraAdfDocument(value))
    return value
  if (typeof value === 'string')
    return plainTextToAdf(value)
  return null
}

export function normalizeLocalStatusId(value: unknown): LocalStatusId | null {
  if (value === 'todo' || value === 'in_progress' || value === 'done')
    return value
  return null
}

export function normalizePriorityInput(value: unknown): string {
  if (typeof value !== 'string')
    return 'Medium'
  const trimmed = value.trim()
  return isLocalPriorityName(trimmed) ? trimmed : 'Medium'
}

export function normalizeLabels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const labels: string[] = []
  const seen = new Set<string>()
  for (const label of value) {
    if (typeof label !== 'string') {
      continue
    }

    const trimmed = label.trim()
    const normalized = trimmed.toLowerCase()
    if (!trimmed || seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    labels.push(trimmed)
  }

  return labels
}
