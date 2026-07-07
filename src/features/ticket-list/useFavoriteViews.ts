import type { ComputedRef, Ref } from 'vue'
import type { FavoriteViewNavItem, FilterContextKind, FilterFieldId, InitiativeRow, IssueVisibilityRange, ProjectClosedRange, ProjectRow, SavedViewRow, ViewFilterClause } from './types'
import type { JiraTicket } from '@/types/jira'
import type { CustomView, CustomViewDisplay, FavoriteView, FavoriteViewFilter } from '~/shared/settings'
import { computed } from 'vue'
import { getStatusGroup } from '@/types/jira'
import { customViewFiltersToClauses, isFilterFieldId } from './filterDisplay'
import { getBaseViewIdForCustomContext, getCustomViewKind, getViewsDirectoryTabFromViewId, isBacklogIssueTicket, isSubIssueTicket, parseTeamViewId } from './helpers'
import { filterGroupsMatch, normalizeIssueVisibilityRange, normalizeProjectClosedRange } from './viewDisplay'

interface UseFavoriteViewsDeps {
  currentView: Ref<string>
  currentViewFilters: Ref<ViewFilterClause[]>
  favoriteViews: ComputedRef<FavoriteView[]>
  getFavoriteView: (viewId: string) => FavoriteView | null
  toggleFavoriteView: (viewId: string, filters: FavoriteViewFilter[]) => void
  getCustomView: (viewId: string) => CustomView | null
  getViewOverride: (viewId: string) => { filters: FavoriteViewFilter[] } | null
  getDefaultFiltersForView: (viewId: string) => ViewFilterClause[]
  persistViewStateForView: (viewId: string, filters: ViewFilterClause[], display: CustomViewDisplay) => void
  captureDisplay: () => CustomViewDisplay
  resolveDisplayForView: (viewId: string) => CustomViewDisplay
  issueTickets: ComputedRef<JiraTicket[]>
  projectRows: ComputedRef<ProjectRow[]>
  baseInitiativeRows: ComputedRef<InitiativeRow[]>
  customViews: Ref<CustomView[]>
  deriveViewLabel: (viewId: string) => string
  getIssueTicketsForCustomView: (contextKey: string) => JiraTicket[]
  getProjectRowsForCustomView: (contextKey: string) => ProjectRow[]
  customViewBelongsInFavoriteViewsDirectory: (view: CustomView, viewId: string) => boolean
  customViewToSavedViewRow: (view: CustomView) => SavedViewRow
  isDateVisibleInRange: (range: IssueVisibilityRange | ProjectClosedRange, dateValue: string | undefined) => boolean
  ticketMatchesFilter: (ticket: JiraTicket, filter: ViewFilterClause) => boolean
  projectMatchesFilter: (project: ProjectRow, filter: ViewFilterClause) => boolean
  initiativeMatchesFilter: (initiative: InitiativeRow, filter: ViewFilterClause) => boolean
  savedViewMatchesFilter: (view: SavedViewRow, filter: ViewFilterClause) => boolean
}

export function useFavoriteViews(deps: UseFavoriteViewsDeps) {
  const currentViewIsFavoritable = computed(() => deps.currentView.value !== 'search')
  const favoriteViewNavItems = computed<FavoriteViewNavItem[]>(() =>
    deps.favoriteViews.value
      // 'inbox' favorites can persist from builds that predate the inbox removal
      .filter(view => view.id !== 'inbox')
      .map((view) => {
        const customView = deps.getCustomView(view.id)
        return {
          id: view.id,
          label: deps.deriveViewLabel(view.id),
          icon: customView?.icon,
          color: customView?.color,
          count: view.showIssueCount ? getFavoriteViewCount(view) : undefined,
          showIssueCount: view.showIssueCount,
        }
      }),
  )

  function getFavoriteViewCount(view: FavoriteView): number | undefined {
    const context = getFavoriteViewFilterContext(view.id)
    if (context === null) {
      return undefined
    }

    const filters = getFavoriteViewFilterClauses(view)
    if (context === 'issues') {
      return getFavoriteViewIssueTickets(view.id)
        .filter(ticket => favoriteTicketMatchesDisplay(view.id, ticket))
        .filter(ticket => filterGroupsMatch(ticket, filters, deps.ticketMatchesFilter))
        .length
    }

    if (context === 'projects') {
      const display = deps.resolveDisplayForView(view.id)
      const closedRange = normalizeProjectClosedRange(display.projectClosedRange)
      return getFavoriteViewProjectRows(view.id)
        .filter(project => favoriteProjectMatchesClosedRange(project, closedRange))
        .filter(project => filterGroupsMatch(project, filters, deps.projectMatchesFilter))
        .length
    }

    if (context === 'initiatives') {
      return deps.baseInitiativeRows.value
        .filter(initiative => filterGroupsMatch(initiative, filters, deps.initiativeMatchesFilter))
        .length
    }

    return getFavoriteViewSavedViewRows(view.id)
      .filter(row => filterGroupsMatch(row, filters, deps.savedViewMatchesFilter))
      .length
  }

  function getFavoriteViewFilterContext(viewId: string): FilterContextKind | null {
    const customView = deps.getCustomView(viewId)
    if (customView) {
      return getCustomViewKind(customView.contextKey)
    }

    const baseViewId = getFavoriteViewBaseId(viewId)
    if (baseViewId === 'initiatives') {
      return 'initiatives'
    }
    if (isFavoriteProjectView(baseViewId)) {
      return 'projects'
    }
    if (getViewsDirectoryTabFromViewId(baseViewId) !== null) {
      return 'views'
    }
    if (isFavoriteTeamSettingsView(baseViewId)) {
      return null
    }
    return 'issues'
  }

  function getFavoriteViewFilterClauses(view: FavoriteView): ViewFilterClause[] {
    if (deps.getCustomView(view.id)) {
      const override = deps.getViewOverride(view.id)
      return override ? customViewFiltersToClauses(override.filters) : deps.getDefaultFiltersForView(view.id)
    }
    return toViewFilterClauses(view.filters)
  }

  function getFavoriteViewBaseId(viewId: string): string {
    const customView = deps.getCustomView(viewId)
    return customView ? getBaseViewIdForCustomContext(customView.contextKey) : viewId
  }

  function getFavoriteViewTeamKey(viewId: string): string | null {
    return parseTeamViewId(getFavoriteViewBaseId(viewId))?.teamKey || null
  }

  function getFavoriteViewTeamSection(viewId: string): string | null {
    const parsed = parseTeamViewId(getFavoriteViewBaseId(viewId))
    return parsed ? (parsed.section ?? 'active') : null
  }

  function isFavoriteProjectView(viewId: string): boolean {
    return viewId === 'projects' || parseTeamViewId(viewId)?.section === 'projects'
  }

  function isFavoriteTeamSettingsView(viewId: string): boolean {
    return parseTeamViewId(viewId)?.section === 'settings'
  }

  function getFavoriteViewIssueTickets(viewId: string): JiraTicket[] {
    const customView = deps.getCustomView(viewId)
    if (customView) {
      return deps.getIssueTicketsForCustomView(customView.contextKey)
    }
    const teamKey = getFavoriteViewTeamKey(viewId)
    const baseTickets = teamKey
      ? deps.issueTickets.value.filter(ticket => ticket.spaceKey === teamKey)
      : deps.issueTickets.value

    return baseTickets.filter(ticket => favoriteTicketMatchesTeamSection(viewId, ticket))
  }

  function favoriteTicketMatchesTeamSection(viewId: string, ticket: JiraTicket): boolean {
    const section = getFavoriteViewTeamSection(viewId)
    if (section === null) {
      return true
    }
    if (section === 'triage' || section === 'backlog') {
      return isBacklogIssueTicket(ticket)
    }
    return true
  }

  function favoriteTicketMatchesDisplay(viewId: string, ticket: JiraTicket): boolean {
    const display = deps.resolveDisplayForView(viewId)
    return (
      favoriteSubIssueMatchesDisplay(ticket, display)
      && favoriteBacklogIssueMatchesDisplay(ticket, display)
      && favoriteCompletedIssueMatchesDisplay(ticket, display)
    )
  }

  function favoriteSubIssueMatchesDisplay(ticket: JiraTicket, display: CustomViewDisplay): boolean {
    if (!isSubIssueTicket(ticket)) {
      return true
    }
    return deps.isDateVisibleInRange(
      normalizeIssueVisibilityRange(display.showSubIssuesRange),
      ticket.createdAt ?? ticket.updatedAt,
    )
  }

  function favoriteBacklogIssueMatchesDisplay(ticket: JiraTicket, display: CustomViewDisplay): boolean {
    if (!isBacklogIssueTicket(ticket)) {
      return true
    }
    return deps.isDateVisibleInRange(
      normalizeIssueVisibilityRange(display.showTriageIssuesRange),
      ticket.createdAt ?? ticket.updatedAt,
    )
  }

  function favoriteCompletedIssueMatchesDisplay(ticket: JiraTicket, display: CustomViewDisplay): boolean {
    if (getStatusGroup(ticket.statusCategory) !== 'done') {
      return true
    }
    return deps.isDateVisibleInRange(
      normalizeIssueVisibilityRange(display.completedRange),
      ticket.completedAt ?? ticket.updatedAt,
    )
  }

  function getFavoriteViewProjectRows(viewId: string): ProjectRow[] {
    const customView = deps.getCustomView(viewId)
    if (customView) {
      return deps.getProjectRowsForCustomView(customView.contextKey)
    }
    const teamKey = getFavoriteViewTeamKey(viewId)
    return teamKey
      ? deps.projectRows.value.filter(project => project.spaceKey === teamKey)
      : deps.projectRows.value
  }

  function favoriteProjectMatchesClosedRange(
    project: ProjectRow,
    closedRange: ProjectClosedRange,
  ): boolean {
    return project.health !== 'Completed' || deps.isDateVisibleInRange(closedRange, project.updatedAt)
  }

  function getFavoriteViewSavedViewRows(viewId: string): SavedViewRow[] {
    return deps.customViews.value
      .filter(view => deps.customViewBelongsInFavoriteViewsDirectory(view, viewId))
      .map(view => deps.customViewToSavedViewRow(view))
  }

  function hasKnownFilterFieldId(
    filter: FavoriteViewFilter,
  ): filter is FavoriteViewFilter & { fieldId: FilterFieldId } {
    return isFilterFieldId(filter.fieldId)
  }
  function getCurrentFavoriteViewFilters(): FavoriteViewFilter[] {
    return deps.currentViewFilters.value.map(filter => ({
      id: filter.id,
      fieldId: filter.fieldId,
      fieldLabel: filter.fieldLabel,
      value: filter.value,
      valueLabel: filter.valueLabel,
    }))
  }
  function toViewFilterClauses(filters: FavoriteViewFilter[]): ViewFilterClause[] {
    return filters.filter(hasKnownFilterFieldId).map(filter => ({
      id: filter.id,
      fieldId: filter.fieldId,
      fieldLabel: filter.fieldLabel,
      value: filter.value,
      valueLabel: filter.valueLabel,
    }))
  }
  function restoreFavoriteViewFilters(viewId: string) {
    const favoriteView = deps.getFavoriteView(viewId)
    if (!favoriteView || deps.getCustomView(viewId))
      return
    deps.persistViewStateForView(
      viewId,
      toViewFilterClauses(favoriteView.filters),
      deps.currentView.value === viewId ? deps.captureDisplay() : deps.resolveDisplayForView(viewId),
    )
  }
  function toggleCurrentViewFavorite() {
    if (!currentViewIsFavoritable.value)
      return
    deps.toggleFavoriteView(deps.currentView.value, getCurrentFavoriteViewFilters())
  }

  return {
    currentViewIsFavoritable,
    favoriteViewNavItems,
    getFavoriteViewCount,
    getFavoriteViewFilterContext,
    getFavoriteViewFilterClauses,
    getFavoriteViewBaseId,
    getFavoriteViewTeamKey,
    getFavoriteViewTeamSection,
    isFavoriteProjectView,
    isFavoriteTeamSettingsView,
    getFavoriteViewIssueTickets,
    favoriteTicketMatchesTeamSection,
    favoriteTicketMatchesDisplay,
    favoriteSubIssueMatchesDisplay,
    favoriteBacklogIssueMatchesDisplay,
    favoriteCompletedIssueMatchesDisplay,
    getFavoriteViewProjectRows,
    favoriteProjectMatchesClosedRange,
    getFavoriteViewSavedViewRows,
    getCurrentFavoriteViewFilters,
    toViewFilterClauses,
    restoreFavoriteViewFilters,
    toggleCurrentViewFavorite,
  }
}
