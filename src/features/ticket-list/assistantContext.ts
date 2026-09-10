import type { UnwrapNestedRefs } from 'vue'
import type { TicketListController } from './useTicketListController'
import type { AssistantContext } from '~/shared/assistant'
import { isLocalTicketKey } from '~/shared/localTickets'

export function captureAssistantContext(view: UnwrapNestedRefs<TicketListController>): AssistantContext {
  if (view.selectedKey) {
    const ticket = view.selectedTicket
    return { kind: 'ticket', label: view.selectedKey, key: view.selectedKey, summary: ticket?.summary ?? '', local: isLocalTicketKey(view.selectedKey), snapshot: ticket ? JSON.stringify(ticket) : undefined }
  }
  if (view.currentView === 'assistant' || view.isTeamSettingsView)
    return { kind: 'workspace', label: 'Workspace' }
  const issueItems = (tickets: typeof view.tickets) => tickets.map(ticket => ({ key: ticket.key, summary: ticket.summary }))
  const projectItems = (projects: typeof view.searchedProjectRows) => projects.map(project => ({ key: project.key, summary: project.name }))
  let items: { key: string, summary: string }[]
  if (view.currentView === 'search') {
    items = [
      ...(['all', 'issues'].includes(view.searchResultTab) ? issueItems(view.searchedTickets) : []),
      ...(['all', 'projects'].includes(view.searchResultTab) ? projectItems(view.searchedProjectRows) : []),
      ...(['all', 'initiatives'].includes(view.searchResultTab) ? view.searchedInitiativeRows.map(row => ({ key: row.id, summary: row.name })) : []),
    ]
  }
  else if (view.isProjectDisplayView) {
    items = projectItems(view.projectSections.flatMap(section => section.projects))
  }
  else if (view.isInitiativeDisplayView) {
    items = view.initiativeRows.map(row => ({ key: row.id, summary: row.name }))
  }
  else if (view.isViewsDirectory) {
    items = view.displayedSavedViewRows.map(row => ({ key: row.id, summary: row.name }))
  }
  else if (view.isCyclesDirectory) {
    items = (view.cyclePayload?.cycles ?? []).map(cycle => ({ key: cycle.id, summary: cycle.name }))
  }
  else {
    items = issueItems(view.issueSections.flatMap(section => section.tickets))
  }
  return {
    kind: 'view',
    label: view.viewTitle,
    viewId: view.currentView,
    teamKey: view.currentTeamKey ?? undefined,
    cycleId: view.activeCycle ? String(view.activeCycle.id) : undefined,
    search: view.issueSearch,
    filters: JSON.stringify({ filters: view.activeFilterChips, completed: view.completedRange, subIssues: view.showSubIssues, backlog: view.showBacklogIssues, searchTab: view.searchResultTab }),
    totalCount: items.length,
    items: items.slice(0, 50),
    truncated: items.length > 50,
  }
}
