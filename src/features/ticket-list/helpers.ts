import type { Ref } from 'vue'
import type {
  CustomViewKind,
  DateFilterFieldId,
  DateFilterOperator,
  InsightSlice,
  ProjectGroupingFieldId,
  ProjectRow,
  ViewsDirectoryTabId,
} from './types'
import type { JiraTicket } from '@/types/jira'
import { getLinearIssueSubtype, getStatusGroup } from '@/types/jira'

export function getTeamSectionLabel(section?: string | null): string {
  if (section === 'triage')
    return 'Backlog'
  if (section === 'all')
    return 'All issues'
  if (section === 'backlog')
    return 'Backlog'
  if (section === 'projects')
    return 'Projects'
  if (section === 'views')
    return 'Views'
  if (section === 'project-views')
    return 'Views · Projects'
  if (section === 'ready-qa')
    return 'Ready for QA'
  return 'Active'
}

export function isSubIssueTicket(ticket: JiraTicket): boolean {
  const parentIssueType = ticket.parent?.issueType.trim().toLowerCase()
  return Boolean(parentIssueType && !parentIssueType.includes('epic'))
}

export function normalizeFilterValue(value?: string | null): string {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized || 'none'
}

export function getTicketLabels(ticket: JiraTicket): string[] {
  const labels: string[] = []
  const seen = new Set<string>()
  for (const label of ticket.labels ?? []) {
    const trimmed = label.trim()
    const normalized = normalizeFilterValue(trimmed)
    if (!trimmed || seen.has(normalized))
      continue
    seen.add(normalized)
    labels.push(trimmed)
  }
  return labels
}

export function isActiveIssueTicket(ticket: JiraTicket): boolean {
  return getStatusGroup(ticket.statusCategory) !== 'done'
}

export function dateMatchesOperator(
  value: string | undefined,
  operator: DateFilterOperator,
): boolean {
  const time = getTimeValue(value)
  if (operator === 'hasDate')
    return time > 0
  if (operator === 'noDate')
    return time === 0
  if (time === 0)
    return false

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000
  if (operator === 'past')
    return time < startOfToday
  if (operator === 'today')
    return time >= startOfToday && time < startOfTomorrow

  const maxDays = operator === 'next7' ? 7 : 30
  return time >= startOfToday && time < startOfToday + maxDays * 24 * 60 * 60 * 1000
}

export function getDateFilterOperator(value: string): DateFilterOperator {
  if (value === 'noDate')
    return 'noDate'
  if (value === 'past')
    return 'past'
  if (value === 'today')
    return 'today'
  if (value === 'next7')
    return 'next7'
  if (value === 'next30')
    return 'next30'
  return 'hasDate'
}

export function compareOptionalDates(left?: string, right?: string): number {
  const leftTime = getTimeValue(left)
  const rightTime = getTimeValue(right)
  if (leftTime === 0 && rightTime === 0)
    return 0
  if (leftTime === 0)
    return 1
  if (rightTime === 0)
    return -1
  return leftTime - rightTime
}

export function getIssueTypeIcon(issueType: string): string {
  const subtype = getLinearIssueSubtype(issueType)
  if (subtype === 'Story')
    return '◇'
  if (subtype === 'Bug')
    return '◆'
  if (subtype === 'Feature')
    return '◈'
  return '○'
}

export function buildInsightSlices(
  nextTickets: JiraTicket[],
  getLabel: (ticket: JiraTicket) => string,
  limit = 5,
): InsightSlice[] {
  const counts = new Map<string, number>()
  for (const ticket of nextTickets) {
    const label = getLabel(ticket).trim() || 'None'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const total = nextTickets.length
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({
      id: label,
      label,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
}

export function getStatusRank(statusCategory: string): number {
  const group = getStatusGroup(statusCategory)
  if (group === 'indeterminate')
    return 0
  if (group === 'new')
    return 1
  return 2
}

export function getPriorityRank(priority: string): number {
  const ranks: Record<string, number> = {
    highest: 0,
    high: 1,
    medium: 2,
    low: 3,
    lowest: 4,
  }
  return ranks[priority.trim().toLowerCase()] ?? 5
}

export function getProjectHealth(status: string, progress: number): ProjectRow['health'] {
  const normalizedStatus = status.toLowerCase()
  if (
    normalizedStatus.includes('done')
    || normalizedStatus.includes('complete')
    || progress === 100
  ) {
    return 'Completed'
  }
  if (normalizedStatus.includes('block') || progress < 20) {
    return 'At risk'
  }
  return 'On track'
}

export function getProjectHealthRank(health: ProjectRow['health']): number {
  if (health === 'At risk')
    return 0
  if (health === 'On track')
    return 1
  return 2
}

export function getProjectHealthClass(health: ProjectRow['health']): string {
  if (health === 'Completed')
    return 'bg-[#4dbb83]/10 text-[#63c891] border-[#4dbb83]/20'
  if (health === 'At risk')
    return 'bg-[#e59356]/10 text-[#e9a66c] border-[#e59356]/20'
  return 'bg-[#3f9fd6]/10 text-[#6fb7de] border-[#3f9fd6]/20'
}

export function getProgressBarClass(health: ProjectRow['health']): string {
  if (health === 'Completed')
    return 'bg-[#4dbb83]'
  if (health === 'At risk')
    return 'bg-[#e59356]'
  return 'bg-[#6f73ff]'
}

export function getIssueGroupMarkerClass(label: string): string {
  const normalizedLabel = label.toLowerCase()
  if (
    normalizedLabel.includes('qa')
    || normalizedLabel.includes('deployment')
    || normalizedLabel.includes('done')
    || normalizedLabel.includes('complete')
  ) {
    return 'border-[#3aa7ff] bg-[#3aa7ff]/10'
  }
  if (
    normalizedLabel.includes('progress')
    || normalizedLabel.includes('review')
    || normalizedLabel.includes('blocked')
  ) {
    return 'border-[#e59356] bg-[#e59356]/10'
  }
  if (
    normalizedLabel.includes('todo')
    || normalizedLabel.includes('backlog')
    || normalizedLabel.includes('unstarted')
  ) {
    return 'border-[#d7d8dc] bg-transparent'
  }
  return 'border-[#8f9198] bg-transparent'
}

export function getMostCommonLead(projects: ProjectRow[]): string {
  const counts = new Map<string, number>()
  for (const project of projects) {
    if (project.lead === 'Unassigned')
      continue
    counts.set(project.lead, (counts.get(project.lead) ?? 0) + 1)
  }
  return (
    [...counts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0] ?? 'Unassigned'
  )
}

export function getTimeValue(value?: string | null): number {
  if (!value)
    return 0
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

export function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function formatCompactDate(value?: string | null): string {
  if (!value)
    return 'No target'
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return 'No target'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function getRelativeTimeLabel(value?: string | null): string {
  if (!value)
    return 'No date'
  const time = Date.parse(value)
  if (Number.isNaN(time))
    return 'No date'
  const diffMs = time - Date.now()
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
  })
  if (absMs < hour)
    return relativeFormatter.format(Math.round(diffMs / minute), 'minute')
  if (absMs < day)
    return relativeFormatter.format(Math.round(diffMs / hour), 'hour')
  return relativeFormatter.format(Math.round(diffMs / day), 'day')
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement))
    return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

/**
 * Parses the `team:<key>:<section>` view-id grammar. Returns null for
 * non-team ids. Segments are returned raw: `teamKey` may be undefined
 * (`'team'`) or empty (`'team:'`); callers keep their own validation because
 * some call sites intentionally accept empty keys (locked by tests).
 */
export function parseTeamViewId(viewId: string): { teamKey: string | undefined, section: string | undefined } | null {
  const [scope, teamKey, section] = viewId.split(':')
  return scope === 'team' ? { teamKey, section } : null
}

export type TeamViewSection
  = 'triage' | 'all' | 'active' | 'backlog' | 'projects' | 'views' | 'project-views' | 'settings'
    // 'issues' appears only in custom-view context keys, never as a navigable view id.
    | 'issues'

export function getTeamViewId(teamKey: string, section: TeamViewSection): string {
  return `team:${teamKey}:${section}`
}

/** Whether viewId is any sectioned view of the given team (`team:<key>:*`). */
export function isTeamViewForTeam(viewId: string, teamKey: string): boolean {
  return viewId.startsWith(`team:${teamKey}:`)
}

export function getBaseViewIdForCustomContext(contextKey: string): string {
  const parsed = parseTeamViewId(contextKey)
  if (parsed?.teamKey) {
    return parsed.section === 'projects'
      ? getTeamViewId(parsed.teamKey, 'projects')
      : getTeamViewId(parsed.teamKey, 'all')
  }
  return contextKey
}

export function getViewsDirectoryTabFromViewId(viewId: string): ViewsDirectoryTabId | null {
  if (viewId === 'views' || viewId === 'project-views')
    return viewId
  const section = parseTeamViewId(viewId)?.section
  if (section === 'views' || section === 'project-views')
    return section
  return null
}

export function getCustomViewKind(contextKey: string): CustomViewKind | null {
  if (contextKey === 'my-issues')
    return 'issues'
  if (contextKey === 'projects')
    return 'projects'
  const parsed = parseTeamViewId(contextKey)
  if (!parsed)
    return null
  if (parsed.section === 'issues')
    return 'issues'
  if (parsed.section === 'projects')
    return 'projects'
  return null
}

export function getTicketDateValue(
  ticket: JiraTicket,
  fieldId: DateFilterFieldId,
): string | undefined {
  if (fieldId === 'dueDate')
    return ticket.dueDate
  if (fieldId === 'createdDate')
    return ticket.createdAt
  if (fieldId === 'updatedDate')
    return ticket.updatedAt
  return ticket.completedAt
}

export function getProjectDateValue(
  project: ProjectRow,
  fieldId: DateFilterFieldId,
): string | undefined {
  if (fieldId === 'dueDate')
    return project.targetDateValue
  if (fieldId === 'updatedDate')
    return project.updatedAt
  return undefined
}

export function getProjectGroupingLabel(
  project: ProjectRow,
  grouping: ProjectGroupingFieldId,
): string {
  if (grouping === 'health')
    return project.health
  if (grouping === 'status')
    return project.status || 'No status'
  if (grouping === 'priority')
    return project.priority || 'No priority'
  if (grouping === 'lead')
    return project.lead || 'Unassigned'
  return 'Projects'
}

export function getProjectGroupingRank(label: string, grouping: ProjectGroupingFieldId): number {
  if (grouping === 'health') {
    if (label === 'At risk')
      return 0
    if (label === 'On track')
      return 1
    if (label === 'Completed')
      return 2
  }
  if (grouping === 'priority')
    return getPriorityRank(label)
  return 0
}

export function isEpicIssue(ticket: JiraTicket): boolean {
  return isEpicIssueType(ticket.issueType)
}

export function isEpicIssueType(issueType: string): boolean {
  return issueType.toLowerCase().includes('epic')
}

export function isInitiativeIssue(ticket: JiraTicket): boolean {
  return isInitiativeIssueType(ticket.issueType)
}

export function isInitiativeIssueType(issueType: string): boolean {
  return issueType.toLowerCase().includes('initiative')
}

export function isBacklogIssueTicket(ticket: JiraTicket): boolean {
  return ticket.status.trim().toLowerCase() === 'backlog'
}

/**
 * Visibility state for a row-field list: membership check plus a toggle
 * that refuses to hide the last visible field.
 */
export function createRowFieldVisibility<FieldId>(fields: Ref<FieldId[]>): {
  isVisible: (fieldId: FieldId) => boolean
  toggle: (fieldId: FieldId) => void
} {
  function isVisible(fieldId: FieldId): boolean {
    return fields.value.includes(fieldId)
  }
  function toggle(fieldId: FieldId): void {
    if (isVisible(fieldId)) {
      if (fields.value.length === 1)
        return
      fields.value = fields.value.filter(item => item !== fieldId)
      return
    }
    fields.value = [...fields.value, fieldId]
  }
  return { isVisible, toggle }
}

export function isRecentlyUpdated(value?: string | null): boolean {
  if (!value)
    return false
  const time = Date.parse(value)
  if (Number.isNaN(time))
    return false
  return Date.now() - time < 7 * 24 * 60 * 60 * 1000
}
