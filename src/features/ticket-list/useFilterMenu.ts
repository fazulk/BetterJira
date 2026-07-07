import type { ComputedRef, Ref } from 'vue'
import type {
  ActiveFilterChip,
  DateFilterFieldId,
  DateFilterOption,
  FilterContextKind,
  FilterEntryId,
  FilterFieldId,
  FilterMenuEntry,
  FilterOption,
  InitiativeRow,
  IssueVisibilityRange,
  ProjectClosedRange,
  ProjectPropertyFilterFieldId,
  ProjectRow,
  SavedViewRow,
  ViewFilterClause,
} from './types'
import type { JiraTicket } from '@/types/jira'
import type { CustomViewDisplay } from '~/shared/settings'
import { computed, ref, watch } from 'vue'
import {
  buildDateFilterOptions,
  buildInitiativeFilterOptions,
  buildIssueFilterOptions,
  buildProjectFilterOptions,
  buildSavedViewFilterOptions,
} from './filterEngine'
import { filterMenuEntries, issueVisibilityRangeOptions, projectClosedRangeOptions } from './options'
import {
  filterClausesMatch,
  normalizeIssueVisibilityRange,
  normalizeProjectClosedRange,
  viewDisplayMatches,
} from './viewDisplay'

interface ProjectTeamFilterEntry {
  value: string
  label: string
  icon: string
}

interface UseFilterMenuDeps {
  currentView: Ref<string>
  currentViewFilters: Ref<ViewFilterClause[]>
  isProjectDisplayView: ComputedRef<boolean>
  isIssueDisplayView: ComputedRef<boolean>
  isViewsDirectory: ComputedRef<boolean>
  scopedTickets: ComputedRef<JiraTicket[]>
  projectRows: ComputedRef<ProjectRow[]>
  baseDisplayedProjectRows: ComputedRef<ProjectRow[]>
  baseInitiativeRows: ComputedRef<InitiativeRow[]>
  baseDisplayedSavedViewRows: ComputedRef<SavedViewRow[]>
  currentUserName: ComputedRef<string>
  completedRange: Ref<IssueVisibilityRange>
  showSubIssuesRange: Ref<IssueVisibilityRange>
  showTriageIssuesRange: Ref<IssueVisibilityRange>
  projectClosedRange: Ref<ProjectClosedRange>
  filterTicketsForCurrentView: (tickets: JiraTicket[]) => JiraTicket[]
  getProjectKey: (ticket: JiraTicket) => string | null
  getProjectTeamFilterEntries: (project: ProjectRow) => ProjectTeamFilterEntry[]
  getDefaultFiltersForView: (viewId: string) => ViewFilterClause[]
  getDefaultDisplayForView: (viewId: string) => CustomViewDisplay
  captureDisplay: () => CustomViewDisplay
  removeFilterClause: (filterId: string) => void
  closeCustomViewContextMenu: () => void
  displayOptionsOpen: Ref<boolean>
}

export function useFilterMenu(deps: UseFilterMenuDeps) {
  const filterMenuOpen = ref(false)
  const activeFilterEntryId = ref<FilterEntryId>('status')
  const activeDateFilterId = ref<DateFilterFieldId>('dueDate')
  const activeProjectPropertyFilterId = ref<ProjectPropertyFilterFieldId>('projectStatus')
  const filterFieldSearchQuery = ref('')
  const filterSearchQuery = ref('')
  const normalizedFilterSearch = computed(() => filterSearchQuery.value.trim().toLowerCase())
  const normalizedFilterFieldSearch = computed(() =>
    filterFieldSearchQuery.value.trim().toLowerCase(),
  )
  const activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = deps.currentViewFilters.value.map(
      (filter): ActiveFilterChip => ({
        kind: 'clause',
        id: filter.id,
        filterId: filter.id,
        fieldLabel: filter.fieldLabel,
        valueLabel: filter.valueLabel,
      }),
    )
    if (deps.isProjectDisplayView.value) {
      if (deps.projectClosedRange.value !== deps.getDefaultDisplayForView(deps.currentView.value).projectClosedRange) {
        chips.push({
          kind: 'inclusion',
          id: 'project-inclusion:completed',
          inclusionId: 'completedProjects',
          fieldLabel: 'Completed projects',
          valueLabel: getProjectClosedRangeLabel(deps.projectClosedRange.value),
        })
      }
      return chips
    }
    if (!deps.isIssueDisplayView.value) {
      return chips
    }
    const defaults = deps.getDefaultDisplayForView(deps.currentView.value)
    if (deps.completedRange.value !== defaults.completedRange) {
      chips.push({
        kind: 'inclusion',
        id: 'issue-inclusion:completed',
        inclusionId: 'completed',
        fieldLabel: 'Completed issues',
        valueLabel: getIssueVisibilityRangeLabel(deps.completedRange.value),
      })
    }
    if (deps.showSubIssuesRange.value !== defaults.showSubIssuesRange) {
      chips.push({
        kind: 'inclusion',
        id: 'issue-inclusion:sub-issues',
        inclusionId: 'subIssues',
        fieldLabel: 'Sub-issues',
        valueLabel: getIssueVisibilityRangeLabel(deps.showSubIssuesRange.value),
      })
    }
    if (deps.showTriageIssuesRange.value !== defaults.showTriageIssuesRange) {
      chips.push({
        kind: 'inclusion',
        id: 'issue-inclusion:backlog',
        inclusionId: 'backlog',
        fieldLabel: 'Backlog',
        valueLabel: getIssueVisibilityRangeLabel(deps.showTriageIssuesRange.value),
      })
    }
    return chips
  })
  const hasModifiedFilterOptions = computed(() => {
    const defaults = deps.getDefaultDisplayForView(deps.currentView.value)
    return (
      !filterClausesMatch(deps.currentViewFilters.value, deps.getDefaultFiltersForView(deps.currentView.value))
      || (deps.isProjectDisplayView.value && deps.projectClosedRange.value !== defaults.projectClosedRange)
      || (deps.isIssueDisplayView.value
        && (deps.completedRange.value !== defaults.completedRange
          || deps.showSubIssuesRange.value !== defaults.showSubIssuesRange
          || deps.showTriageIssuesRange.value !== defaults.showTriageIssuesRange))
    )
  })
  const hasModifiedDisplayOptions = computed(() => {
    const defaults = deps.getDefaultDisplayForView(deps.currentView.value)
    return !viewDisplayMatches(deps.captureDisplay(), defaults)
  })
  const visibleFilterMenuEntries = computed<FilterMenuEntry[]>(() => {
    const query = normalizedFilterFieldSearch.value
    if (!query)
      return filterMenuEntries
    return filterMenuEntries.filter(entry => entry.label.toLowerCase().includes(query))
  })
  const activeFilterEntry = computed<FilterMenuEntry>(() => {
    const entry = filterMenuEntries.find(candidate => candidate.id === activeFilterEntryId.value)
    return entry ?? { id: 'status', label: 'Status', icon: '◌', hasSubmenu: true }
  })
  const activeValueFilterFieldId = computed<FilterFieldId>(() => {
    const entryId = activeFilterEntryId.value
    if (entryId === 'dates')
      return activeDateFilterId.value
    if (entryId === 'projectProperties')
      return activeProjectPropertyFilterId.value
    return entryId
  })
  const filterableTickets = computed(() => deps.filterTicketsForCurrentView(deps.scopedTickets.value))
  const activeFilterOptions = computed<FilterOption[]>(() => {
    const options = getFilterOptions(activeValueFilterFieldId.value)
    const query = normalizedFilterSearch.value
    if (!query)
      return options
    return options.filter(option => option.label.toLowerCase().includes(query))
  })
  const activeDateFilterOptions = computed<DateFilterOption[]>(() =>
    getDateFilterOptions(activeDateFilterId.value),
  )

  watch(visibleFilterMenuEntries, (entries) => {
    const firstEntry = entries[0]
    if (!firstEntry || entries.some(entry => entry.id === activeFilterEntryId.value))
      return
    activeFilterEntryId.value = firstEntry.id
  })

  function getActiveFilterContext(): FilterContextKind {
    if (deps.isProjectDisplayView.value)
      return 'projects'
    if (deps.currentView.value === 'initiatives')
      return 'initiatives'
    if (deps.isViewsDirectory.value)
      return 'views'
    return 'issues'
  }
  function getFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    const context = getActiveFilterContext()
    if (context === 'projects')
      return getProjectFilterOptions(fieldId)
    if (context === 'initiatives')
      return getInitiativeFilterOptions(fieldId)
    if (context === 'views')
      return getSavedViewFilterOptions(fieldId)
    return getIssueFilterOptions(fieldId)
  }
  function getIssueFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    return buildIssueFilterOptions(filterableTickets.value, fieldId, {
      currentUserName: deps.currentUserName.value,
      projectRows: deps.projectRows.value,
      displayedProjectRows: deps.baseDisplayedProjectRows.value,
      initiativeRows: deps.baseInitiativeRows.value,
      getProjectKey: deps.getProjectKey,
    })
  }
  function getProjectFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    return buildProjectFilterOptions(deps.baseDisplayedProjectRows.value, fieldId, {
      currentUserName: deps.currentUserName.value,
      initiativeRows: deps.baseInitiativeRows.value,
      getProjectTeamFilterEntries: deps.getProjectTeamFilterEntries,
    })
  }
  function getInitiativeFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    return buildInitiativeFilterOptions(deps.baseInitiativeRows.value, fieldId)
  }
  function getSavedViewFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    return buildSavedViewFilterOptions(deps.baseDisplayedSavedViewRows.value, fieldId)
  }
  function getIssueVisibilityRangeLabel(range: IssueVisibilityRange): string {
    return issueVisibilityRangeOptions.find(option => option.id === range)?.label ?? range
  }
  function getProjectClosedRangeLabel(range: ProjectClosedRange): string {
    return projectClosedRangeOptions.find(option => option.id === range)?.label ?? range
  }
  function getDateFilterOptions(fieldId: DateFilterFieldId): DateFilterOption[] {
    return buildDateFilterOptions(getActiveFilterContext(), fieldId, {
      tickets: filterableTickets.value,
      projectRows: deps.baseDisplayedProjectRows.value,
      initiativeRows: deps.baseInitiativeRows.value,
      savedViewRows: deps.baseDisplayedSavedViewRows.value,
    })
  }
  function removeActiveFilterChip(chip: ActiveFilterChip): void {
    if (chip.kind === 'clause') {
      deps.removeFilterClause(chip.filterId)
      return
    }
    const defaults = deps.getDefaultDisplayForView(deps.currentView.value)
    if (chip.inclusionId === 'completed') {
      deps.completedRange.value = normalizeIssueVisibilityRange(defaults.completedRange)
      return
    }
    if (chip.inclusionId === 'subIssues') {
      deps.showSubIssuesRange.value = normalizeIssueVisibilityRange(defaults.showSubIssuesRange)
      return
    }
    if (chip.inclusionId === 'completedProjects') {
      deps.projectClosedRange.value = normalizeProjectClosedRange(defaults.projectClosedRange)
      return
    }
    deps.showTriageIssuesRange.value = normalizeIssueVisibilityRange(defaults.showTriageIssuesRange)
  }
  function openFilterMenu() {
    deps.closeCustomViewContextMenu()
    filterMenuOpen.value = true
    deps.displayOptionsOpen.value = false
  }
  function closeFilterMenu() {
    filterMenuOpen.value = false
    filterFieldSearchQuery.value = ''
    filterSearchQuery.value = ''
  }
  function toggleFilterMenu() {
    if (filterMenuOpen.value) {
      closeFilterMenu()
      return
    }
    openFilterMenu()
  }

  return {
    filterMenuOpen,
    activeFilterEntryId,
    activeDateFilterId,
    activeProjectPropertyFilterId,
    filterFieldSearchQuery,
    filterSearchQuery,
    activeFilterChips,
    hasModifiedFilterOptions,
    hasModifiedDisplayOptions,
    visibleFilterMenuEntries,
    activeFilterEntry,
    activeValueFilterFieldId,
    filterableTickets,
    activeFilterOptions,
    activeDateFilterOptions,
    getActiveFilterContext,
    getFilterOptions,
    getIssueFilterOptions,
    getProjectFilterOptions,
    getInitiativeFilterOptions,
    getSavedViewFilterOptions,
    getIssueVisibilityRangeLabel,
    getProjectClosedRangeLabel,
    getDateFilterOptions,
    removeActiveFilterChip,
    openFilterMenu,
    closeFilterMenu,
    toggleFilterMenu,
  }
}
