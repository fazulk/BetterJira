import type { ViewFilterClause } from './types'
import type { AssistantViewReader } from '@/composables/useAssistantContextRefresh'
import type { AssistantContext } from '~/shared/assistant'
import type { CustomViewDisplay } from '~/shared/settings'
import { computed, ref } from 'vue'
import { fetchSpaceCycles } from '@/api/cycles'
import { fetchAppSettings } from '@/api/settings'
import { spaceCyclesQueryKey } from '@/composables/useSpaceCycles'
import { APP_SETTINGS_QUERY_KEY } from '@/composables/useSpaceSettings'
import { normalizeAssistantContext } from '~/shared/assistant'
import { emptySpaceCycles, resolveClassifiedCycles } from '~/shared/cycles'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'
import { filterInitiativesByClauses, filterProjectsByClauses, filterSavedViewsByClauses, filterTicketsByClauses, projectMatchesFilter, ticketMatchesFilter } from './filterEngine'
import { getCycleSprintIdFromSection, getCycleViewKind, isEpicIssue, isInitiativeIssue, sortTicketsByActivity } from './helpers'
import { useCustomViewDirectory } from './useCustomViewDirectory'
import { getIssueGroupingLabels } from './useIssueGrouping'
import { useTicketRows } from './useTicketRows'
import { useTicketSearch } from './useTicketSearch'
import { useTicketVisibility } from './useTicketVisibility'
import { normalizeIssueGroupingFieldId, normalizeIssueVisibilityRange, normalizeProjectClosedRange } from './viewDisplay'

export interface AssistantViewState {
  kind: 'issues' | 'projects' | 'initiatives' | 'views' | 'cycles' | 'search'
  display: CustomViewDisplay
  filters: ViewFilterClause[]
  currentUserName: string
  teamSection: string | null
  contextKey: string | null
  directoryTab: 'views' | 'project-views'
  searchTab: string
  spaceKeys: string[]
}

/** Keep the original scope while rebuilding its results from fresh data, even off-screen. */
export function createAssistantViewReader(context: AssistantContext, state: AssistantViewState): AssistantViewReader | undefined {
  const original = normalizeAssistantContext(context)
  if (original?.kind !== 'view')
    return undefined
  const captured = JSON.parse(JSON.stringify(state)) as AssistantViewState
  const { display, filters, currentUserName, teamSection } = captured
  return async (allTickets, queryClient) => {
    const tickets = allTickets.filter(ticket => captured.spaceKeys.includes(ticket.spaceKey))
    const rows = useTicketRows({ enabledTickets: computed(() => tickets) })
    const issueTickets = tickets.filter(ticket => !isEpicIssue(ticket) && !isInitiativeIssue(ticket))
    const teamTickets = original.teamKey ? issueTickets.filter(ticket => ticket.spaceKey === original.teamKey) : issueTickets
    const cycleKind = getCycleViewKind(teamSection)
    const cyclePayload = cycleKind && original.teamKey && original.teamKey !== LOCAL_SPACE_KEY
      ? await queryClient.fetchQuery({ queryKey: spaceCyclesQueryKey(original.teamKey), queryFn: () => fetchSpaceCycles(original.teamKey!), staleTime: 0, retry: false })
      : undefined
    const cycles = resolveClassifiedCycles(cyclePayload ?? emptySpaceCycles(original.teamKey ?? ''), teamTickets)
    const activeCycle = cycleKind === 'current' ? cycles.current : cycleKind === 'upcoming' ? cycles.upcoming : cycleKind === 'previous' ? cycles.previous : cycles.cycles.find(cycle => cycle.id === getCycleSprintIdFromSection(teamSection))
    const visibility = useTicketVisibility({
      currentTeamSection: computed(() => teamSection),
      completedRange: ref(normalizeIssueVisibilityRange(display.completedRange)),
      showSubIssuesRange: ref(normalizeIssueVisibilityRange(display.showSubIssuesRange)),
      showTriageIssuesRange: ref(normalizeIssueVisibilityRange(display.showTriageIssuesRange)),
      cycleFilter: computed(() => !cycleKind || cycleKind === 'directory' ? null : activeCycle ? { match: 'id', sprintId: activeCycle.id } : { match: 'none' }),
    })
    const filterContext = { ...rows, currentUserName }
    const search = useTicketSearch({
      currentView: computed(() => original.viewId),
      scopedTickets: computed(() => teamTickets),
      issueTickets: computed(() => issueTickets),
      projectRows: rows.projectRows,
      initiativeRows: computed(() => filterInitiativesByClauses(rows.baseInitiativeRows.value, filters)),
      showSubIssues: computed(() => display.showSubIssuesRange !== 'hidden'),
      ...visibility,
      applyViewFiltersToTickets: tickets => filterTicketsByClauses(tickets, filters, filterContext),
      applyViewFiltersToProjects: projects => filterProjectsByClauses(projects, filters, rows),
      applyViewFiltersToInitiatives: initiatives => filterInitiativesByClauses(initiatives, filters),
    })
    search.issueSearch.value = original.search ?? ''
    const visibleIssues = search.searchedTickets.value
    const grouping = normalizeIssueGroupingFieldId(display.grouping)
    const hiddenGroups = display.hiddenIssueGroupIds[grouping] ?? []
    const issues = captured.kind === 'search'
      ? visibleIssues
      : visibleIssues.filter(ticket => (
          grouping === 'none' ? !hiddenGroups.includes(original.viewId === 'my-issues' || original.viewId === 'my-created' ? original.viewId : 'all') : getIssueGroupingLabels(ticket, grouping).some(label => !hiddenGroups.includes(label))
        ))
    const projects = captured.kind === 'search'
      ? search.searchedProjectRows.value
      : filterProjectsByClauses(rows.projectRows.value, filters, rows).filter(project => (
          (!original.teamKey || project.spaceKey === original.teamKey)
          && (project.health !== 'Completed' || visibility.isDateVisibleInRange(normalizeProjectClosedRange(display.projectClosedRange), project.updatedAt))
        ))
    const initiatives = captured.kind === 'search' ? search.searchedInitiativeRows.value : filterInitiativesByClauses(rows.baseInitiativeRows.value, filters)
    const issueItems = issues.map(ticket => ({ key: ticket.key, summary: ticket.summary }))
    const projectItems = projects.map(project => ({ key: project.key, summary: project.name }))
    const initiativeItems = initiatives.map(row => ({ key: row.id, summary: row.name }))
    let items = issueItems
    if (captured.kind === 'projects') {
      items = projectItems
    }
    else if (captured.kind === 'initiatives') {
      items = initiativeItems
    }
    else if (captured.kind === 'cycles') {
      items = cycles.cycles.map(cycle => ({ key: cycle.id, summary: cycle.name }))
    }
    else if (captured.kind === 'search') {
      items = [...(['all', 'issues'].includes(captured.searchTab) ? issueItems : []), ...(['all', 'projects'].includes(captured.searchTab) ? projectItems : []), ...(['all', 'initiatives'].includes(captured.searchTab) ? initiativeItems : [])]
    }
    else if (captured.kind === 'views') {
      const settings = await queryClient.fetchQuery({ queryKey: APP_SETTINGS_QUERY_KEY, queryFn: fetchAppSettings, staleTime: 0, retry: false })
      const customViews = settings.sidebar.customViews
      const directory = useCustomViewDirectory({
        customViews: ref(customViews),
        getCustomView: id => customViews.find(view => view.id === id) ?? null,
        customViewsForContext: key => customViews.filter(view => view.contextKey === key),
        contextKeyForCurrentView: computed(() => captured.contextKey),
        activeViewsDirectoryTab: computed(() => captured.directoryTab),
        currentTeamKey: computed(() => original.teamKey ?? null),
        currentUserName: computed(() => currentUserName),
        enabledSpaces: computed(() => settings.spaces.filter(space => space.enabled)),
        viewEditorDraft: ref(null),
        issueTickets: computed(() => issueTickets),
        projectRows: rows.projectRows,
        applyViewFiltersToSavedViews: views => filterSavedViewsByClauses(views, filters),
        projectMatchesFilter: (project, filter) => projectMatchesFilter(project, filter, rows),
        ticketMatchesFilter: (ticket, filter) => ticketMatchesFilter(ticket, filter, filterContext),
        sortTicketsByActivity,
      })
      items = directory.displayedSavedViewRows.value.map(row => ({ key: row.id, summary: row.name }))
    }
    return { ...original, cycleId: cycleKind && cycleKind !== 'directory' ? activeCycle?.id : original.cycleId, items: items.slice(0, 50), totalCount: items.length, truncated: items.length > 50 }
  }
}
