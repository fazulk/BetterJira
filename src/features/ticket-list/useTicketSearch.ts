import type { ComputedRef } from 'vue'
import type { InitiativeRow, ProjectRow, SearchTab } from './types'
import type { JiraTicket } from '@/types/jira'
import { computed, ref } from 'vue'

interface UseTicketSearchDeps {
  currentView: ComputedRef<string>
  scopedTickets: ComputedRef<JiraTicket[]>
  issueTickets: ComputedRef<JiraTicket[]>
  projectRows: ComputedRef<ProjectRow[]>
  initiativeRows: ComputedRef<InitiativeRow[]>
  showSubIssues: ComputedRef<boolean>
  filterTicketsForCurrentView: (tickets: JiraTicket[]) => JiraTicket[]
  ticketMatchesQuery: (ticket: JiraTicket, query: string) => boolean
  applyViewFiltersToTickets: (tickets: JiraTicket[]) => JiraTicket[]
  hideSubIssuesWithVisibleParents: (tickets: JiraTicket[]) => JiraTicket[]
  applyViewFiltersToProjects: (projects: ProjectRow[]) => ProjectRow[]
  applyViewFiltersToInitiatives: (initiatives: InitiativeRow[]) => InitiativeRow[]
}

export function useTicketSearch(deps: UseTicketSearchDeps) {
  const issueSearch = ref('')
  const normalizedIssueSearch = computed(() => issueSearch.value.trim().toLowerCase())
  const baseSearchedTickets = computed(() => {
    const query = deps.currentView.value === 'search' ? normalizedIssueSearch.value : ''
    const baseTickets
      = deps.currentView.value === 'search'
        ? deps.filterTicketsForCurrentView(deps.issueTickets.value)
        : deps.filterTicketsForCurrentView(deps.scopedTickets.value)
    if (!query)
      return baseTickets
    return baseTickets.filter(ticket => deps.ticketMatchesQuery(ticket, query))
  })
  const searchedTickets = computed(() => {
    const filteredTickets = deps.applyViewFiltersToTickets(baseSearchedTickets.value)
    return deps.showSubIssues.value ? filteredTickets : deps.hideSubIssuesWithVisibleParents(filteredTickets)
  })
  const searchedProjectRows = computed(() => {
    const query = normalizedIssueSearch.value
    const baseProjects = deps.applyViewFiltersToProjects(deps.projectRows.value)
    if (!query)
      return baseProjects
    return baseProjects.filter(project =>
      [
        project.key,
        project.name,
        project.spaceKey,
        project.spaceName,
        project.health,
        project.priority,
        project.lead,
        project.status,
      ].some(value => value.toLowerCase().includes(query)),
    )
  })
  const searchedInitiativeRows = computed(() => {
    const query = normalizedIssueSearch.value
    const baseInitiatives = deps.applyViewFiltersToInitiatives(deps.initiativeRows.value)
    if (!query)
      return baseInitiatives
    return baseInitiatives.filter(initiative =>
      [initiative.name, initiative.description, initiative.health, initiative.lead].some(value =>
        value.toLowerCase().includes(query),
      ),
    )
  })
  const searchTabs = computed<SearchTab[]>(() => [
    {
      id: 'all',
      label: 'All',
      count:
        searchedTickets.value.length
        + searchedProjectRows.value.length
        + searchedInitiativeRows.value.length,
    },
    { id: 'issues', label: 'Issues', count: searchedTickets.value.length },
    {
      id: 'projects',
      label: 'Projects',
      count: searchedProjectRows.value.length,
    },
    {
      id: 'initiatives',
      label: 'Initiatives',
      count: searchedInitiativeRows.value.length,
    },
    { id: 'documents', label: 'Documents', count: 0 },
  ])

  return {
    issueSearch,
    normalizedIssueSearch,
    baseSearchedTickets,
    searchedTickets,
    searchedProjectRows,
    searchedInitiativeRows,
    searchTabs,
  }
}
