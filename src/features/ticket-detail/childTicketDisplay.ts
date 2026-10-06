import type { JiraTicket } from '@/types/jira'
import { compareStatusesByPreference } from '@/composables/useStatusPreferences'
import { getPriorityRank, getTimeValue } from '@/features/ticket-list/helpers'
import { getIssueGroupingLabels } from '@/features/ticket-list/useIssueGrouping'

export type ChildTicketGrouping = 'none' | 'status' | 'assignee' | 'priority' | 'label'
export type ChildTicketOrdering = 'original' | 'key' | 'title' | 'status' | 'priority' | 'assignee' | 'estimate' | 'updated'

export function getChildTicketSections(
  tickets: JiraTicket[],
  grouping: ChildTicketGrouping,
  ordering: ChildTicketOrdering,
  direction: 'asc' | 'desc',
  statusOrder: readonly string[],
): { label: string, tickets: JiraTicket[] }[] {
  const multiplier = direction === 'asc' ? 1 : -1
  const sorted = [...tickets].sort((left, right) => {
    if (ordering === 'original')
      return 0
    let comparison = 0
    if (ordering === 'key') {
      comparison = left.key.localeCompare(right.key, undefined, { numeric: true })
    }
    else if (ordering === 'title') {
      comparison = left.summary.localeCompare(right.summary)
    }
    else if (ordering === 'status') {
      comparison = compareStatusesByPreference(left, right, statusOrder)
    }
    else if (ordering === 'priority') {
      comparison = getPriorityRank(left.priority) - getPriorityRank(right.priority)
    }
    else if (ordering === 'assignee') {
      comparison = (left.assignee || 'Unassigned').localeCompare(right.assignee || 'Unassigned')
    }
    else if (ordering === 'estimate') {
      if (left.storyPoints === undefined && right.storyPoints !== undefined)
        return 1
      if (right.storyPoints === undefined && left.storyPoints !== undefined)
        return -1
      comparison = (left.storyPoints ?? 0) - (right.storyPoints ?? 0)
    }
    else if (ordering === 'updated') {
      const leftTime = getTimeValue(left.updatedAt ?? left.createdAt)
      const rightTime = getTimeValue(right.updatedAt ?? right.createdAt)
      if (!leftTime && rightTime)
        return 1
      if (!rightTime && leftTime)
        return -1
      comparison = leftTime - rightTime
    }
    return multiplier * comparison || left.key.localeCompare(right.key, undefined, { numeric: true })
  })
  if (grouping === 'none')
    return [{ label: '', tickets: sorted }]

  const groups = new Map<string, JiraTicket[]>()
  for (const ticket of sorted) {
    for (const label of getIssueGroupingLabels(ticket, grouping)) {
      const group = groups.get(label)
      if (group)
        group.push(ticket)
      else
        groups.set(label, [ticket])
    }
  }
  return [...groups.entries()]
    .sort(([leftLabel, leftTickets], [rightLabel, rightTickets]) => {
      if (grouping === 'status')
        return compareStatusesByPreference(leftTickets[0]!, rightTickets[0]!, statusOrder)
      if (grouping === 'priority')
        return getPriorityRank(leftLabel) - getPriorityRank(rightLabel) || leftLabel.localeCompare(rightLabel)
      return leftLabel.localeCompare(rightLabel)
    })
    .map(([label, groupTickets]) => ({ label, tickets: groupTickets }))
}
