import type { ComputedRef, Ref } from 'vue'
import type { IssueVisibilityRange } from './types'
import type { JiraTicket } from '@/types/jira'
import { getStatusGroup } from '@/types/jira'
import { getTicketLabels, getTimeValue, isBacklogIssueTicket, isSubIssueTicket } from './helpers'

interface UseTicketVisibilityDeps {
  currentTeamSection: ComputedRef<string | null>
  completedRange: Ref<IssueVisibilityRange>
  showSubIssuesRange: Ref<IssueVisibilityRange>
  showTriageIssuesRange: Ref<IssueVisibilityRange>
}

export function useTicketVisibility(deps: UseTicketVisibilityDeps) {
  function filterTicketsForCurrentView(nextTickets: JiraTicket[]): JiraTicket[] {
    return filterTicketsForCurrentViewWithoutCompletedRange(nextTickets).filter(
      isCompletedIssueVisible,
    )
  }
  function filterTicketsForCurrentViewWithoutCompletedRange(
    nextTickets: JiraTicket[],
  ): JiraTicket[] {
    return nextTickets.filter(
      ticket =>
        isTicketInCurrentTeamSection(ticket)
        && isSubIssueVisible(ticket)
        && isBacklogIssueVisible(ticket),
    )
  }
  function isTicketInCurrentTeamSection(ticket: JiraTicket): boolean {
    const section = deps.currentTeamSection.value
    if (section === null)
      return true
    if (section === 'active' || !section)
      return true
    if (section === 'triage')
      return isBacklogIssueTicket(ticket)
    if (section === 'backlog')
      return isBacklogIssueTicket(ticket)
    return true
  }
  function isCompletedIssueVisible(ticket: JiraTicket): boolean {
    if (getStatusGroup(ticket.statusCategory) !== 'done')
      return true
    return isDateVisibleInRange(deps.completedRange.value, ticket.completedAt ?? ticket.updatedAt)
  }
  function hideSubIssuesWithVisibleParents(nextTickets: JiraTicket[]): JiraTicket[] {
    const visibleTicketKeys = new Set(nextTickets.map(ticket => ticket.key))
    return nextTickets.filter(
      ticket =>
        !isSubIssueTicket(ticket)
        || !ticket.parent?.key
        || !visibleTicketKeys.has(ticket.parent.key),
    )
  }
  function isSubIssueVisible(ticket: JiraTicket): boolean {
    if (!isSubIssueTicket(ticket))
      return true
    return isDateVisibleInRange(deps.showSubIssuesRange.value, ticket.createdAt ?? ticket.updatedAt)
  }
  function isBacklogIssueVisible(ticket: JiraTicket): boolean {
    if (!isBacklogIssueTicket(ticket))
      return true
    return isDateVisibleInRange(deps.showTriageIssuesRange.value, ticket.createdAt ?? ticket.updatedAt)
  }
  function isDateVisibleInRange(
    range: IssueVisibilityRange,
    dateValue: string | undefined,
  ): boolean {
    if (range === 'all')
      return true
    if (range === 'hidden')
      return false
    const timeValue = getTimeValue(dateValue)
    if (timeValue === 0)
      return false
    const rangeMs
      = range === 'day'
        ? 24 * 60 * 60 * 1000
        : range === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000
    return Date.now() - timeValue <= rangeMs
  }
  function ticketMatchesQuery(ticket: JiraTicket, query: string): boolean {
    return [
      ticket.key,
      ticket.summary,
      ticket.status,
      ticket.priority,
      ticket.issueType,
      ticket.assignee,
      ticket.reporter,
      ticket.spaceKey,
      ticket.spaceName,
      ticket.parent?.key,
      ticket.parent?.summary,
      ...getTicketLabels(ticket),
    ].some(value => value?.toLowerCase().includes(query))
  }

  return {
    filterTicketsForCurrentView,
    filterTicketsForCurrentViewWithoutCompletedRange,
    isTicketInCurrentTeamSection,
    isCompletedIssueVisible,
    hideSubIssuesWithVisibleParents,
    isSubIssueVisible,
    isBacklogIssueVisible,
    isDateVisibleInRange,
    ticketMatchesQuery,
  }
}
