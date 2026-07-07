import type { ComputedRef, Ref } from 'vue'
import type { TicketFilterContext } from './filterEngine'
import type { InitiativeRow, ProjectClosedRange, ProjectRow, SavedViewRow, ViewFilterClause } from './types'
import type { JiraTicket } from '@/types/jira'
import type { CustomView, CustomViewDisplay } from '~/shared/settings'
import { getFilterFieldLabel } from './filterDisplay'
import {
  filterInitiativesByClauses,
  filterProjectsByClauses,
  filterSavedViewsByClauses,
  filterTicketsByClauses,
  projectMatchesFilter as projectMatchesFilterClause,
  ticketMatchesFilter as ticketMatchesFilterClause,
} from './filterEngine'

interface ProjectTeamFilterEntry {
  value: string
  label: string
  icon: string
}

interface UseViewFiltersDeps {
  currentView: Ref<string>
  currentViewFilters: Ref<ViewFilterClause[]>
  currentUserName: ComputedRef<string>
  getProjectKey: (ticket: JiraTicket) => string | null
  getTicketProject: (ticket: JiraTicket) => ProjectRow | null
  getTicketInitiativeIds: (ticket: JiraTicket) => string[]
  getProjectTeamFilterEntries: (project: ProjectRow) => ProjectTeamFilterEntry[]
  projectClosedRange: Ref<ProjectClosedRange>
  isDateVisibleInRange: (range: ProjectClosedRange, dateValue: string | undefined) => boolean
  viewEditorDraft: Ref<CustomView | null>
  getDefaultDisplayForView: (viewId: string) => CustomViewDisplay
  persistViewStateForView: (viewId: string, filters: ViewFilterClause[], display: CustomViewDisplay) => void
  captureDisplay: () => CustomViewDisplay
  applyDisplay: (display: CustomViewDisplay) => void
  withViewDisplaySyncSuppressed: (callback: () => void) => void
  removeViewOverride: (viewId: string) => void
}

export function useViewFilters(deps: UseViewFiltersDeps) {
  function getTicketFilterContext(): TicketFilterContext {
    return {
      currentUserName: deps.currentUserName.value,
      getProjectKey: deps.getProjectKey,
      getTicketProject: deps.getTicketProject,
      getTicketInitiativeIds: deps.getTicketInitiativeIds,
      getProjectTeamFilterEntries: deps.getProjectTeamFilterEntries,
    }
  }
  function applyViewFiltersToTickets(nextTickets: JiraTicket[]): JiraTicket[] {
    return filterTicketsByClauses(nextTickets, deps.currentViewFilters.value, getTicketFilterContext())
  }
  function ticketMatchesFilter(ticket: JiraTicket, filter: ViewFilterClause): boolean {
    return ticketMatchesFilterClause(ticket, filter, getTicketFilterContext())
  }
  function applyViewFiltersToProjects(nextProjects: ProjectRow[]): ProjectRow[] {
    return filterProjectsByClauses(nextProjects, deps.currentViewFilters.value, {
      getProjectTeamFilterEntries: deps.getProjectTeamFilterEntries,
    })
  }
  function projectMatchesFilter(project: ProjectRow, filter: ViewFilterClause): boolean {
    return projectMatchesFilterClause(project, filter, {
      getProjectTeamFilterEntries: deps.getProjectTeamFilterEntries,
    })
  }
  function applyProjectClosedRange(projects: ProjectRow[]): ProjectRow[] {
    return projects.filter(
      project =>
        project.health !== 'Completed'
        || deps.isDateVisibleInRange(deps.projectClosedRange.value, project.updatedAt),
    )
  }
  function applyViewFiltersToInitiatives(nextInitiatives: InitiativeRow[]): InitiativeRow[] {
    return filterInitiativesByClauses(nextInitiatives, deps.currentViewFilters.value)
  }
  function applyViewFiltersToSavedViews(nextViews: SavedViewRow[]): SavedViewRow[] {
    return filterSavedViewsByClauses(nextViews, deps.currentViewFilters.value)
  }
  function setActiveCustomViewFilters(filters: ViewFilterClause[]): void {
    deps.persistViewStateForView(deps.currentView.value, filters, deps.captureDisplay())
  }
  function getFilterClause(fieldId: ViewFilterClause['fieldId'], value: string): ViewFilterClause | null {
    return (
      deps.currentViewFilters.value.find(
        filter => filter.fieldId === fieldId && filter.value === value,
      ) ?? null
    )
  }
  function isFilterClauseSelected(fieldId: ViewFilterClause['fieldId'], value: string): boolean {
    return getFilterClause(fieldId, value) !== null
  }
  function toggleFilterClause(fieldId: ViewFilterClause['fieldId'], value: string, valueLabel: string): void {
    if (isFilterClauseSelected(fieldId, value)) {
      setActiveCustomViewFilters(
        deps.currentViewFilters.value.filter(
          filter => !(filter.fieldId === fieldId && filter.value === value),
        ),
      )
      return
    }
    const fieldLabel = getFilterFieldLabel(fieldId)
    const nextFilter: ViewFilterClause = {
      id: `${fieldId}:${value}:${Date.now()}`,
      fieldId,
      fieldLabel,
      value,
      valueLabel,
    }
    setActiveCustomViewFilters([...deps.currentViewFilters.value, nextFilter])
  }
  function removeFilterClause(filterId: string) {
    setActiveCustomViewFilters(deps.currentViewFilters.value.filter(filter => filter.id !== filterId))
  }
  function clearCurrentViewFilters() {
    const defaults = deps.getDefaultDisplayForView(deps.currentView.value)
    if (deps.viewEditorDraft.value && deps.currentView.value === deps.viewEditorDraft.value.id) {
      deps.viewEditorDraft.value = {
        ...deps.viewEditorDraft.value,
        filters: [],
        display: defaults,
      }
      deps.withViewDisplaySyncSuppressed(() => {
        deps.applyDisplay(defaults)
      })
      return
    }

    deps.removeViewOverride(deps.currentView.value)
    deps.withViewDisplaySyncSuppressed(() => {
      deps.applyDisplay(defaults)
    })
  }

  return {
    getTicketFilterContext,
    applyViewFiltersToTickets,
    ticketMatchesFilter,
    applyViewFiltersToProjects,
    projectMatchesFilter,
    applyProjectClosedRange,
    applyViewFiltersToInitiatives,
    applyViewFiltersToSavedViews,
    setActiveCustomViewFilters,
    getFilterClause,
    isFilterClauseSelected,
    toggleFilterClause,
    removeFilterClause,
    clearCurrentViewFilters,
  }
}
