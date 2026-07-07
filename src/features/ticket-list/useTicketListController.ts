import type { ComponentPublicInstance } from 'vue'
import type { TicketFilterContext } from './filterEngine'
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
  InitiativeRowFieldId,
  IssueRowDisplayProps,
  IssueVisibilityRange,
  MyIssuesViewId,
  ProjectClosedRange,
  ProjectGroupingFieldId,
  ProjectOrderingFieldId,
  ProjectPropertyFilterFieldId,
  ProjectRow,
  ProjectRowFieldId,
  ProjectSection,
  SavedViewRow,
  SavedViewRowFieldId,
  SearchResultTab,
  SearchTab,
  ViewFilterClause,
  ViewsDirectoryTabId,
  ViewTab,
} from './types'
import type { JiraTicket } from '@/types/jira'
import type {
  CustomView,
  CustomViewDisplay,
} from '~/shared/settings'
import { useQueryClient } from '@tanstack/vue-query'
import { useLocalStorage } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useCustomViews } from '@/composables/useCustomViews'
import { useFavoriteViews as usePersistedFavoriteViews } from '@/composables/useFavoriteViews'
import { useJiraCurrentUser } from '@/composables/useJiraCurrentUser'
import { useJiraTickets } from '@/composables/useJiraTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { useStatusPreferences } from '@/composables/useStatusPreferences'
import { useViewOverrides } from '@/composables/useViewOverrides'
import { useCommandMenu } from '@/features/ticket-list/useCommandMenu'
import { useCustomViewDirectory } from '@/features/ticket-list/useCustomViewDirectory'
import { useFavoriteViews } from '@/features/ticket-list/useFavoriteViews'
import { useIssueGrouping } from '@/features/ticket-list/useIssueGrouping'
import { useIssueSelection } from '@/features/ticket-list/useIssueSelection'
import { useSidebarResize } from '@/features/ticket-list/useSidebarResize'
import { useTicketNavigation } from '@/features/ticket-list/useTicketNavigation'
import { useTicketRows } from '@/features/ticket-list/useTicketRows'
import { useTicketVisibility } from '@/features/ticket-list/useTicketVisibility'
import { useViewEditor } from '@/features/ticket-list/useViewEditor'
import { useViewStatePersistence } from '@/features/ticket-list/useViewStatePersistence'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import {
  clausesToCustomViewFilters,
  getFilterFieldLabel,
} from './filterDisplay'
import {
  buildDateFilterOptions,
  buildInitiativeFilterOptions,
  buildIssueFilterOptions,
  buildProjectFilterOptions,
  buildSavedViewFilterOptions,
  filterInitiativesByClauses,
  filterProjectsByClauses,
  filterSavedViewsByClauses,
  filterTicketsByClauses,
  initiativeMatchesFilter,
  projectMatchesFilter as projectMatchesFilterClause,
  savedViewMatchesFilter,
  ticketMatchesFilter as ticketMatchesFilterClause,
} from './filterEngine'
import {
  compareOptionalDates,
  createRowFieldVisibility,
  getBaseViewIdForCustomContext,
  getDisplayedIssueRowKey,
  getIssueGroupMarkerClass,
  getPriorityRank,
  getProgressBarClass,
  getProjectGroupingLabel,
  getProjectGroupingRank,
  getProjectHealthClass,
  getProjectHealthRank,
  getRelativeTimeLabel,
  getTeamViewId,
  getTimeValue,
  getViewsDirectoryTabFromViewId,
  isEditableTarget,
  isEpicIssue,
  isInitiativeIssue,
  parseTeamViewId,
  sortTicketsByActivity as sortTicketsByActivityHelper,
} from './helpers'
import {
  dateFilterFields,
  filterMenuEntries,
  initiativeRowFieldOptions,
  issueGroupingOptions,
  issueOrderingOptions,
  issueRowFieldOptions,
  issueVisibilityRangeOptions,
  projectClosedRangeOptions,
  projectGroupingOptions,
  projectOrderingOptions,
  projectPropertyFilterFields,
  projectRowFieldOptions,
  savedViewRowFieldOptions,
} from './options'
import {
  copyIssueGroupConfigMap,
  filterClausesMatch,
  normalizeIssueGroupingFieldId,
  normalizeIssueOrderingFieldId,
  normalizeIssueRowFields,
  normalizeIssueVisibilityRange,
  normalizeProjectClosedRange,
  normalizeProjectGroupingFieldId,
  normalizeProjectOrderingFieldId,
  normalizeProjectRowFields,
  viewDisplayMatches,
} from './viewDisplay'

export function useTicketListController() {
  const { tickets, fetching, refreshing, refresh } = useJiraTickets()
  const queryClient = useQueryClient()
  const route = useRoute()
  const {
    enabledSpaces,
    hasJiraCredentialsConfigured,
    isLoading: isLoadingSpaceSettings,
    deleteSpace,
    setSidebarSettings,
  } = useSpaceSettings()
  const {
    statusPreferences,
  } = useStatusPreferences()
  const {
    favoriteViews,
    isFavoriteView,
    getFavoriteView,
    toggleFavoriteView,
    setFavoriteViewIssueCountVisible,
  } = usePersistedFavoriteViews()
  const { customViews, getCustomView, customViewsForContext } = useCustomViews()
  const { viewOverrides, getViewOverride, upsertViewOverride, removeViewOverride } = useViewOverrides()
  const jiraMeQuery = useJiraCurrentUser(hasJiraCredentialsConfigured)
  const sidebarCollapsed = useLocalStorage('jira2.sidebar.collapsed', false)
  const collapsedSidebarWidth = 48
  const { sidebarWidth, startSidebarResize } = useSidebarResize({ sidebarCollapsed })
  const router = useRouter()
  // The active view is encoded in the URL (`?view=<id>`) so that switching views
  // creates real browser/Electron history entries. `persistedView` mirrors the active
  // view synchronously: it's the authoritative value within a tick (the route only
  // updates after the async navigation resolves) and restores the last view across
  // app restarts.
  const persistedView = useLocalStorage('jira2.currentView', 'my-issues')
  const currentView = computed<string>({
    get() {
      const viewParam = route.query.view
      if (typeof viewParam === 'string' && viewParam.length > 0) {
        return viewParam
      }
      return persistedView.value
    },
    set(view) {
      persistedView.value = view
      void navigateTo({ path: '/', query: { view } })
    },
  })
  // Keep `persistedView` aligned with the route after navigations and back/forward,
  // so synchronous reads (e.g. when opening/closing a ticket) never see a stale view.
  watch(
    () => route.query.view,
    (viewParam) => {
      if (typeof viewParam === 'string' && viewParam.length > 0) {
        persistedView.value = viewParam
      }
    },
  )
  // Registered before useViewStatePersistence so its currentView sync watch
  // never observes these removed legacy view ids.
  watchEffect(() => {
    if (
      currentView.value === 'inbox'
      || currentView.value === 'my-subscribed'
      || currentView.value === 'my-activity'
    ) {
      currentView.value = 'my-issues'
    }
  })
  const issueSearch = ref('')
  const displayOptionsOpen = ref(false)
  const groupOrderingOpen = ref(false)
  const hasFinishedInitialWorkspaceLoad = ref(false)
  const searchInputRef = ref<HTMLInputElement | null>(null)
  function setSearchInputRef(element: Element | ComponentPublicInstance | null): void {
    searchInputRef.value = element instanceof HTMLInputElement ? element : null
  }
  const pendingGotoKey = ref(false)
  const searchResultTab = useLocalStorage<SearchResultTab>('jira2.linear.searchTab', 'all')
  const filterMenuOpen = ref(false)
  const activeFilterEntryId = ref<FilterEntryId>('status')
  const activeDateFilterId = ref<DateFilterFieldId>('dueDate')
  const activeProjectPropertyFilterId = ref<ProjectPropertyFilterFieldId>('projectStatus')
  const filterFieldSearchQuery = ref('')
  const filterSearchQuery = ref('')
  type ViewEditorMode = 'create' | 'edit'
  const viewEditorMode = ref<ViewEditorMode | null>(null)
  const viewEditorDraft = ref<CustomView | null>(null)
  const viewEditorPreviousViewId = ref<string | null>(null)
  const viewEditorPreviousDisplay = ref<CustomViewDisplay | null>(null)
  const customViewContextMenu = ref({ open: false, viewId: '', x: 0, y: 0 })
  const {
    listGrouping,
    listOrdering,
    projectGrouping,
    projectOrdering,
    projectClosedRange,
    listGroupingDirection,
    listOrderingDirection,
    issueGroupOrders,
    hiddenIssueGroupIds,
    completedRange,
    showSubIssuesRange,
    showTriageIssuesRange,
    showSubIssues,
    showBacklogIssues,
    collapsedIssueSectionIds,
    collapsedProjectSectionIds,
    visibleIssueRowFields,
    visibleProjectRowFields,
    visibleInitiativeRowFields,
    visibleSavedViewRowFields,
    currentViewFilters,
    captureDisplay,
    applyDisplay,
    getDefaultFiltersForView,
    getDefaultDisplayForView,
    resolveDisplayForView,
    persistViewStateForView,
    withViewDisplaySyncSuppressed,
  } = useViewStatePersistence({
    currentView,
    viewEditorDraft,
    customViews,
    getCustomView,
    viewOverrides,
    getViewOverride,
    upsertViewOverride,
    removeViewOverride,
  })
  const { isVisible: isIssueRowFieldVisible, toggle: toggleIssueRowField }
    = createRowFieldVisibility(visibleIssueRowFields)
  const { isVisible: isProjectRowFieldVisible, toggle: toggleProjectRowField }
    = createRowFieldVisibility(visibleProjectRowFields)
  const { isVisible: isInitiativeRowFieldVisible, toggle: toggleInitiativeRowField }
    = createRowFieldVisibility(visibleInitiativeRowFields)
  const { isVisible: isSavedViewRowFieldVisible, toggle: toggleSavedViewRowField }
    = createRowFieldVisibility(visibleSavedViewRowFields)
  const selectedKey = computed<string | null>({
    get() {
      return typeof route.params.key === 'string' ? route.params.key : null
    },
    set(key) {
      // Read from `persistedView` (not `currentView`/the route) so that a view switch
      // queued in the same tick isn't overwritten by a stale route value.
      const view = persistedView.value
      if (key) {
        void navigateTo({ path: `/${key}`, query: { view } })
        return
      }
      void navigateTo({ path: '/', query: { view } })
    },
  })
  const enabledSpaceKeys = computed(() => new Set(enabledSpaces.value.map(space => space.key)))
  const enabledTickets = computed(() =>
    tickets.value.filter(ticket => enabledSpaceKeys.value.has(ticket.spaceKey)),
  )
  const {
    projectRows,
    baseInitiativeRows,
    getProjectKey,
    getTicketProject,
    getTicketInitiativeIds,
    getProjectTeamFilterEntries,
  } = useTicketRows({ enabledTickets })
  const projectTicketKeySet = computed(() => {
    const keys = new Set<string>()
    for (const ticket of enabledTickets.value) {
      if (isEpicIssue(ticket)) {
        keys.add(ticket.key)
      }
    }
    return keys
  })
  const initiativeTicketKeySet = computed(() => {
    const keys = new Set<string>()
    for (const ticket of enabledTickets.value) {
      if (isInitiativeIssue(ticket)) {
        keys.add(ticket.key)
      }
    }
    return keys
  })
  const issueTickets = computed(() =>
    enabledTickets.value.filter(
      ticket => !projectTicketKeySet.value.has(ticket.key) && !initiativeTicketKeySet.value.has(ticket.key),
    ),
  )
  const currentUserName = computed(() => jiraMeQuery.data.value?.displayName.trim() ?? '')
  const selectedTicket = computed(() =>
    selectedKey.value
      ? (tickets.value.find(ticket => ticket.key === selectedKey.value) ?? null)
      : null,
  )
  const issueRowDisplayProps = computed<IssueRowDisplayProps>(() => ({
    showId: isIssueRowFieldVisible('id'),
    showStatus: isIssueRowFieldVisible('status'),
    showLabels: isIssueRowFieldVisible('labels'),
    showPriority: isIssueRowFieldVisible('priority'),
    showAssignee: isIssueRowFieldVisible('assignee'),
    showCreated: isIssueRowFieldVisible('created'),
    showUpdated: isIssueRowFieldVisible('updated'),
    showDue: isIssueRowFieldVisible('due'),
    showParent: isIssueRowFieldVisible('project'),
  }))
  const projectGridTemplate = computed(() => getProjectGridTemplate())
  const initiativeGridTemplate = computed(() => getInitiativeGridTemplate())
  const savedViewGridTemplate = computed(() => getSavedViewGridTemplate())
  const effectiveSidebarWidth = computed(() =>
    sidebarCollapsed.value ? collapsedSidebarWidth : sidebarWidth.value,
  )
  const showInitialWorkspaceOverlay = computed(
    () =>
      !hasFinishedInitialWorkspaceLoad.value
      && !isLoadingSpaceSettings.value
      && hasJiraCredentialsConfigured.value
      && fetching.value,
  )
  const activeCustomView = computed(() => {
    if (viewEditorDraft.value && currentView.value === viewEditorDraft.value.id) {
      return viewEditorDraft.value
    }
    return getCustomView(currentView.value)
  })
  const activeBaseViewId = computed(() =>
    activeCustomView.value
      ? getBaseViewIdForCustomContext(activeCustomView.value.contextKey)
      : currentView.value,
  )
  function getContextKeyForViewId(viewId: string): string | null {
    const parsed = parseTeamViewId(viewId)
    if (parsed?.teamKey) {
      const { teamKey, section } = parsed
      if (section === 'projects' || section === 'project-views') {
        return getTeamViewId(teamKey, 'projects')
      }
      if (section === 'views' || section === 'all' || section === 'active' || section === 'backlog') {
        return getTeamViewId(teamKey, 'issues')
      }
      return null
    }
    if (viewId === 'projects') {
      return 'projects'
    }
    if (viewId === 'views') {
      return 'my-issues'
    }
    if (viewId === 'project-views') {
      return 'projects'
    }
    if (isMyIssuesView(viewId)) {
      return 'my-issues'
    }
    return null
  }
  const activeCustomViewContextKey = computed(() => activeCustomView.value?.contextKey ?? null)
  const contextKeyForCurrentView = computed(
    () => activeCustomViewContextKey.value ?? getContextKeyForViewId(activeBaseViewId.value),
  )
  const supportsCustomViews = computed(() => contextKeyForCurrentView.value !== null)
  const currentTeamKey = computed(() => {
    const parsed = parseTeamViewId(activeBaseViewId.value)
    return parsed ? (parsed.teamKey ?? null) : null
  })
  const currentTeamName = computed(() => {
    const key = currentTeamKey.value
    if (!key)
      return null
    return enabledSpaces.value.find(space => space.key === key)?.name ?? key
  })
  const currentTeamSection = computed(() => {
    const parsed = parseTeamViewId(activeBaseViewId.value)
    return parsed ? (parsed.section ?? 'active') : null
  })
  const {
    filterTicketsForCurrentView,
    filterTicketsForCurrentViewWithoutCompletedRange,
    isCompletedIssueVisible,
    hideSubIssuesWithVisibleParents,
    isDateVisibleInRange,
    ticketMatchesQuery,
  } = useTicketVisibility({
    currentTeamSection,
    completedRange,
    showSubIssuesRange,
    showTriageIssuesRange,
  })
  const currentTeamAppearance = computed(() => {
    const key = currentTeamKey.value
    if (!key)
      return null
    const space = enabledSpaces.value.find(entry => entry.key === key)
    return resolveSpaceAppearance(space ?? { key, name: key })
  })
  const currentTeamSectionLabel = computed(() => {
    switch (currentTeamSection.value) {
      case 'triage':
        return 'Triage'
      case 'projects':
        return 'Projects'
      case 'views':
      case 'project-views':
        return 'Views'
      case 'settings':
        return 'Settings'
      case 'all':
      case 'active':
      case 'backlog':
        return 'Issues'
      default:
        return null
    }
  })
  const isViewsDirectory = computed(
    () => getViewsDirectoryTabFromViewId(currentView.value) !== null,
  )
  const activeViewsDirectoryTab = computed<ViewsDirectoryTabId>(
    () => getViewsDirectoryTabFromViewId(currentView.value) ?? 'views',
  )
  const isProjectDisplayView = computed(
    () => activeBaseViewId.value === 'projects' || currentTeamSection.value === 'projects',
  )
  const isInitiativeDisplayView = computed(() => currentView.value === 'initiatives')
  const isTeamSettingsView = computed(() => currentTeamSection.value === 'settings')
  const isIssueDisplayView = computed(
    () =>
      !isProjectDisplayView.value
      && !isInitiativeDisplayView.value
      && !isViewsDirectory.value
      && !isTeamSettingsView.value,
  )
  const currentTeamTickets = computed(() => {
    const key = currentTeamKey.value
    if (!key)
      return []
    return issueTickets.value.filter(ticket => ticket.spaceKey === key)
  })
  function isMyIssuesView(viewId: string): viewId is MyIssuesViewId {
    return viewId === 'my-issues' || viewId === 'my-created'
  }
  const viewTitle = computed(() => {
    if (selectedTicket.value)
      return selectedTicket.value.key
    if (activeCustomView.value)
      return activeCustomView.value.name
    if (isMyIssuesView(activeBaseViewId.value))
      return 'My issues'
    if (currentView.value === 'initiatives')
      return 'Initiatives'
    if (activeBaseViewId.value === 'projects')
      return 'Projects'
    if (isViewsDirectory.value)
      return 'Views'
    if (currentView.value === 'search')
      return 'Search'
    if (currentTeamName.value)
      return currentTeamName.value
    return 'Issues'
  })
  const {
    customViewTabs,
    baseDisplayedSavedViewRows,
    displayedSavedViewRows,
    customViewBelongsInFavoriteViewsDirectory,
    customViewToSavedViewRow,
    getIssueTicketsForCustomView,
    getProjectRowsForCustomView,
    deriveViewLabel,
  } = useCustomViewDirectory({
    customViews,
    getCustomView,
    customViewsForContext,
    contextKeyForCurrentView,
    activeViewsDirectoryTab,
    currentTeamKey,
    currentUserName,
    enabledSpaces,
    viewEditorDraft,
    issueTickets,
    projectRows,
    applyViewFiltersToSavedViews,
    projectMatchesFilter,
    ticketMatchesFilter,
    sortTicketsByActivity: sortTicketsByActivityHelper,
  })
  const viewTabs = computed<ViewTab[]>(() => {
    if (isMyIssuesView(activeBaseViewId.value)) {
      return [
        { id: 'my-issues', label: 'Assigned' },
        { id: 'my-created', label: 'Created' },
        ...customViewTabs.value,
      ]
    }
    if (
      currentTeamKey.value
      && (currentTeamSection.value === 'all'
        || currentTeamSection.value === 'active'
        || currentTeamSection.value === 'backlog')
    ) {
      return [
        { id: getTeamViewId(currentTeamKey.value, 'all'), label: 'All issues' },
        { id: getTeamViewId(currentTeamKey.value, 'active'), label: 'Active' },
        { id: getTeamViewId(currentTeamKey.value, 'backlog'), label: 'Backlog' },
        ...customViewTabs.value,
      ]
    }
    if (activeBaseViewId.value === 'projects' || currentTeamSection.value === 'projects') {
      return [{ id: activeBaseViewId.value, label: 'All projects' }, ...customViewTabs.value]
    }
    if (isViewsDirectory.value) {
      const teamKey = currentTeamKey.value
      return [
        { id: teamKey ? getTeamViewId(teamKey, 'views') : 'views', label: 'Issues' },
        { id: teamKey ? getTeamViewId(teamKey, 'project-views') : 'project-views', label: 'Projects' },
      ]
    }
    return []
  })
  const scopedTickets = computed(() => {
    if (activeBaseViewId.value === 'my-created') {
      return issueTickets.value
    }
    if (activeBaseViewId.value === 'my-issues') {
      return issueTickets.value
    }
    if (currentTeamKey.value) {
      const teamTickets = currentTeamTickets.value
      return teamTickets
    }
    return issueTickets.value
  })
  const normalizedIssueSearch = computed(() => issueSearch.value.trim().toLowerCase())
  const normalizedFilterSearch = computed(() => filterSearchQuery.value.trim().toLowerCase())
  const normalizedFilterFieldSearch = computed(() =>
    filterFieldSearchQuery.value.trim().toLowerCase(),
  )
  const activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = currentViewFilters.value.map(
      (filter): ActiveFilterChip => ({
        kind: 'clause',
        id: filter.id,
        filterId: filter.id,
        fieldLabel: filter.fieldLabel,
        valueLabel: filter.valueLabel,
      }),
    )
    if (isProjectDisplayView.value) {
      if (projectClosedRange.value !== getDefaultDisplayForView(currentView.value).projectClosedRange) {
        chips.push({
          kind: 'inclusion',
          id: 'project-inclusion:completed',
          inclusionId: 'completedProjects',
          fieldLabel: 'Completed projects',
          valueLabel: getProjectClosedRangeLabel(projectClosedRange.value),
        })
      }
      return chips
    }
    if (!isIssueDisplayView.value) {
      return chips
    }
    const defaults = getDefaultDisplayForView(currentView.value)
    if (completedRange.value !== defaults.completedRange) {
      chips.push({
        kind: 'inclusion',
        id: 'issue-inclusion:completed',
        inclusionId: 'completed',
        fieldLabel: 'Completed issues',
        valueLabel: getIssueVisibilityRangeLabel(completedRange.value),
      })
    }
    if (showSubIssuesRange.value !== defaults.showSubIssuesRange) {
      chips.push({
        kind: 'inclusion',
        id: 'issue-inclusion:sub-issues',
        inclusionId: 'subIssues',
        fieldLabel: 'Sub-issues',
        valueLabel: getIssueVisibilityRangeLabel(showSubIssuesRange.value),
      })
    }
    if (showTriageIssuesRange.value !== defaults.showTriageIssuesRange) {
      chips.push({
        kind: 'inclusion',
        id: 'issue-inclusion:backlog',
        inclusionId: 'backlog',
        fieldLabel: 'Backlog',
        valueLabel: getIssueVisibilityRangeLabel(showTriageIssuesRange.value),
      })
    }
    return chips
  })
  const hasModifiedFilterOptions = computed(() => {
    const defaults = getDefaultDisplayForView(currentView.value)
    return (
      !filterClausesMatch(currentViewFilters.value, getDefaultFiltersForView(currentView.value))
      || (isProjectDisplayView.value && projectClosedRange.value !== defaults.projectClosedRange)
      || (isIssueDisplayView.value
        && (completedRange.value !== defaults.completedRange
          || showSubIssuesRange.value !== defaults.showSubIssuesRange
          || showTriageIssuesRange.value !== defaults.showTriageIssuesRange))
    )
  })
  const hasModifiedDisplayOptions = computed(() => {
    const defaults = getDefaultDisplayForView(currentView.value)
    return !viewDisplayMatches(captureDisplay(), defaults)
  })
  const activeViewIsCustomView = computed(() => getCustomView(currentView.value) !== null)
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
    // Every other filter-menu entry id is itself a filter field id.
    return entryId
  })
  const filterableTickets = computed(() => filterTicketsForCurrentView(scopedTickets.value))
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
  const baseSearchedTickets = computed(() => {
    const query = currentView.value === 'search' ? normalizedIssueSearch.value : ''
    const baseTickets
      = currentView.value === 'search'
        ? filterTicketsForCurrentView(issueTickets.value)
        : filterTicketsForCurrentView(scopedTickets.value)
    if (!query)
      return baseTickets
    return baseTickets.filter(ticket => ticketMatchesQuery(ticket, query))
  })
  const searchedTickets = computed(() => {
    const filteredTickets = applyViewFiltersToTickets(baseSearchedTickets.value)
    return showSubIssues.value ? filteredTickets : hideSubIssuesWithVisibleParents(filteredTickets)
  })
  const searchedProjectRows = computed(() => {
    const query = normalizedIssueSearch.value
    const baseProjects = applyViewFiltersToProjects(projectRows.value)
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
    // initiativeRows is declared later with the other row builders; this computed runs after setup completes.
    // eslint-disable-next-line ts/no-use-before-define
    const baseInitiatives = applyViewFiltersToInitiatives(initiativeRows.value)
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
  const {
    issueSections,
    issueGroupOrderingRows,
    visibleIssueCount,
    hiddenCompletedCount,
    getStatusCategoryForGroupLabel,
    sortTickets,
    toggleIssueGroupVisibility,
    resetCurrentIssueGroupOrdering,
    startIssueGroupDrag,
    finishIssueGroupDrag,
    dropIssueGroup,
    toggleOrderingDirection,
    isIssueSectionCollapsed,
    shouldShowIssueSectionHeader,
    toggleIssueSection,
    getFlatVisibleTickets,
  } = useIssueGrouping({
    searchedTickets,
    scopedTickets,
    issueTickets,
    currentView,
    listGrouping,
    listOrdering,
    listGroupingDirection,
    listOrderingDirection,
    issueGroupOrders,
    hiddenIssueGroupIds,
    collapsedIssueSectionIds,
    completedRange,
    statusPreferences,
    filterTicketsForCurrentViewWithoutCompletedRange,
    ticketMatchesQuery,
    applyViewFiltersToTickets,
    isCompletedIssueVisible,
    normalizedIssueSearch,
  })
  const baseDisplayedProjectRows = computed(() => {
    const key = currentTeamKey.value
    if (currentTeamSection.value !== 'projects' || !key) {
      return projectRows.value
    }
    return projectRows.value.filter(project => project.spaceKey === key)
  })
  const displayedProjectRows = computed(() =>
    sortProjectsByOrdering(
      applyProjectClosedRange(applyViewFiltersToProjects(baseDisplayedProjectRows.value)),
    ),
  )
  const projectSections = computed<ProjectSection[]>(() => {
    if (projectGrouping.value === 'none') {
      return [
        {
          id: 'all',
          label:
            displayedProjectRows.value.length === 1
              ? '1 project'
              : `${displayedProjectRows.value.length} projects`,
          projects: displayedProjectRows.value,
        },
      ]
    }
    return groupProjects(displayedProjectRows.value, projectGrouping.value)
  })
  const visibleProjectCount = computed(() =>
    projectSections.value.reduce((count, section) => count + section.projects.length, 0),
  )
  const initiativeRows = computed(() => applyViewFiltersToInitiatives(baseInitiativeRows.value))
  const {
    currentViewIsFavoritable,
    favoriteViewNavItems,
    restoreFavoriteViewFilters,
    toggleCurrentViewFavorite,
  } = useFavoriteViews({
    currentView,
    currentViewFilters,
    favoriteViews,
    getFavoriteView,
    toggleFavoriteView,
    getCustomView,
    getViewOverride,
    getDefaultFiltersForView,
    persistViewStateForView,
    captureDisplay,
    resolveDisplayForView,
    issueTickets,
    projectRows,
    baseInitiativeRows,
    customViews,
    deriveViewLabel,
    getIssueTicketsForCustomView,
    getProjectRowsForCustomView,
    customViewBelongsInFavoriteViewsDirectory,
    customViewToSavedViewRow,
    isDateVisibleInRange,
    ticketMatchesFilter,
    projectMatchesFilter,
    initiativeMatchesFilter,
    savedViewMatchesFilter,
  })
  watchEffect(() => {
    if (hasFinishedInitialWorkspaceLoad.value) {
      return
    }
    if (isLoadingSpaceSettings.value || !hasJiraCredentialsConfigured.value) {
      return
    }
    if (!fetching.value) {
      hasFinishedInitialWorkspaceLoad.value = true
    }
  })
  watch(selectedKey, (key) => {
    if (key) {
      displayOptionsOpen.value = false
      closeFilterMenu()
    }
  })
  const {
    focusedIssueKey,
    selectionAnchorKey,
    checkedIssueKeySet,
    checkedIssues,
    checkedIssueCount,
    toggleCheckedIssue,
    clearCheckedIssues,
    addCheckedIssueRange,
    copyCheckedIssueKeys,
  } = useIssueSelection({
    selectedKey,
    issueSections,
    collapsedIssueSectionIds,
    tickets,
    getFlatVisibleTickets,
    getDisplayedIssueRowKey,
  })
  function closeTicketForEditor(): void {
    if (selectedKey.value === null)
      return
    selectedKey.value = null
  }
  function handleViewChangeForEditor(viewId: string): void {
    currentView.value = viewId
    focusedIssueKey.value = null
    clearCheckedIssues()
    closeTicketForEditor()
  }
  const {
    copyCustomView,
    saveCustomViewAndRemoveOverride,
    startCreateView,
    saveViewEditor,
    cancelViewEditor,
    discardViewEditorAndSwitch,
    updateViewEditorName,
    updateViewEditorDescription,
    updateViewEditorIcon,
    updateViewEditorColor,
    openViewEditorFilters,
    openViewEditorSettings,
    closeCustomViewContextMenu,
    activateCustomView,
    handleViewTabContextMenu,
    editContextCustomView,
    deleteContextCustomView,
  } = useViewEditor({
    viewEditorMode,
    viewEditorDraft,
    viewEditorPreviousViewId,
    viewEditorPreviousDisplay,
    customViewContextMenu,
    customViews,
    viewOverrides,
    setSidebarSettings,
    currentView,
    contextKeyForCurrentView,
    currentViewFilters,
    captureDisplay,
    applyDisplay,
    resolveDisplayForView,
    withViewDisplaySyncSuppressed,
    getCustomView,
    isFavoriteView,
    toggleFavoriteView,
    focusedIssueKey,
    clearCheckedIssues,
    closeTicket: closeTicketForEditor,
    openFilterMenu,
    displayOptionsOpen,
    filterMenuOpen,
    handleViewChange: handleViewChangeForEditor,
  })
  const {
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    isCreateModalOpen,
    isAddSpaceModalOpen,
    createIssueType,
    createParentKey,
    issueTypeLocked,
    parentLocked,
    prefetchTicket,
    openTicket,
    closeTicket,
    openFirstCheckedIssue,
    openSettings,
    closeSearchView,
    handleViewChange,
    openAddSpaceModal,
    closeAddSpaceModal,
    handleLeaveSpace,
    openGlobalCreate,
    openChildCreate,
    closeCreateModal,
    handleTicketCreated,
    openRelativeVisibleTicket,
  } = useTicketNavigation({
    queryClient,
    router,
    route,
    persistedView,
    currentView,
    selectedKey,
    focusedIssueKey,
    checkedIssues,
    clearCheckedIssues,
    issueSections,
    getFlatVisibleTickets,
    selectionAnchorKey,
    addCheckedIssueRange,
    viewEditorMode,
    discardViewEditorAndSwitch,
    searchResultTab,
    searchInputRef,
    openCommandMenu,
    closeCustomViewContextMenu,
    deleteSpace,
  })
  function handleFavoriteViewChange(viewId: string) {
    restoreFavoriteViewFilters(viewId)
    handleViewChange(viewId)
  }
  function handleViewTabClick(tab: ViewTab): void {
    closeCustomViewContextMenu()
    if (tab.custom) {
      activateCustomView(tab.id)
      return
    }
    handleViewChange(tab.id)
  }
  const {
    commandMenuOpen,
    commandQuery,
    commandActiveIndex,
    commandItems,
    closeCommandMenu,
    runCommandItem,
    handleCommandMenuKeydown,
  } = useCommandMenu({
    enabledSpaces,
    projectRows,
    issueTickets,
    scopedTickets,
    sortTickets,
    openTicket,
    handleViewChange,
    openGlobalCreate,
    openSettings,
    handleRefresh,
  })
  function getActiveFilterContext(): FilterContextKind {
    if (isProjectDisplayView.value)
      return 'projects'
    if (currentView.value === 'initiatives')
      return 'initiatives'
    if (isViewsDirectory.value)
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
      currentUserName: currentUserName.value,
      projectRows: projectRows.value,
      displayedProjectRows: baseDisplayedProjectRows.value,
      initiativeRows: baseInitiativeRows.value,
      getProjectKey,
    })
  }
  function getProjectFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    return buildProjectFilterOptions(baseDisplayedProjectRows.value, fieldId, {
      currentUserName: currentUserName.value,
      initiativeRows: baseInitiativeRows.value,
      getProjectTeamFilterEntries,
    })
  }
  function getInitiativeFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    return buildInitiativeFilterOptions(baseInitiativeRows.value, fieldId)
  }
  function getSavedViewFilterOptions(fieldId: FilterFieldId): FilterOption[] {
    return buildSavedViewFilterOptions(baseDisplayedSavedViewRows.value, fieldId)
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
      projectRows: baseDisplayedProjectRows.value,
      initiativeRows: baseInitiativeRows.value,
      savedViewRows: baseDisplayedSavedViewRows.value,
    })
  }
  function getTicketFilterContext(): TicketFilterContext {
    return {
      currentUserName: currentUserName.value,
      getProjectKey,
      getTicketProject,
      getTicketInitiativeIds,
      getProjectTeamFilterEntries,
    }
  }
  function applyViewFiltersToTickets(nextTickets: JiraTicket[]): JiraTicket[] {
    return filterTicketsByClauses(nextTickets, currentViewFilters.value, getTicketFilterContext())
  }
  function ticketMatchesFilter(ticket: JiraTicket, filter: ViewFilterClause): boolean {
    return ticketMatchesFilterClause(ticket, filter, getTicketFilterContext())
  }
  function applyViewFiltersToProjects(nextProjects: ProjectRow[]): ProjectRow[] {
    return filterProjectsByClauses(nextProjects, currentViewFilters.value, {
      getProjectTeamFilterEntries,
    })
  }
  function projectMatchesFilter(project: ProjectRow, filter: ViewFilterClause): boolean {
    return projectMatchesFilterClause(project, filter, { getProjectTeamFilterEntries })
  }
  function applyProjectClosedRange(projects: ProjectRow[]): ProjectRow[] {
    return projects.filter(
      project =>
        project.health !== 'Completed'
        || isDateVisibleInRange(projectClosedRange.value, project.updatedAt),
    )
  }
  function sortProjectsByOrdering(projects: ProjectRow[]): ProjectRow[] {
    if (projectOrdering.value === 'manual') {
      return projects
    }
    return [...projects].sort((left, right) => compareProjects(left, right, projectOrdering.value))
  }
  function compareProjects(
    left: ProjectRow,
    right: ProjectRow,
    ordering: ProjectOrderingFieldId,
  ): number {
    if (ordering === 'name')
      return left.name.localeCompare(right.name)
    if (ordering === 'health')
      return getProjectHealthRank(left.health) - getProjectHealthRank(right.health)
    if (ordering === 'priority')
      return getPriorityRank(left.priority) - getPriorityRank(right.priority)
    if (ordering === 'lead')
      return left.lead.localeCompare(right.lead)
    if (ordering === 'targetDate')
      return compareOptionalDates(left.targetDateValue, right.targetDateValue)
    if (ordering === 'updated')
      return getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt)
    if (ordering === 'progress')
      return right.progress - left.progress
    return 0
  }
  function groupProjects(
    projects: ProjectRow[],
    grouping: ProjectGroupingFieldId,
  ): ProjectSection[] {
    const groups = new Map<string, ProjectRow[]>()
    for (const project of projects) {
      const label = getProjectGroupingLabel(project, grouping)
      groups.set(label, [...(groups.get(label) ?? []), project])
    }
    return [...groups.entries()]
      .map(([label, groupProjects]) => ({
        id: `${grouping}:${label}`,
        label,
        projects: groupProjects,
      }))
      .sort(
        (left, right) =>
          getProjectGroupingRank(left.label, grouping)
          - getProjectGroupingRank(right.label, grouping) || left.label.localeCompare(right.label),
      )
  }
  function applyViewFiltersToInitiatives(nextInitiatives: InitiativeRow[]): InitiativeRow[] {
    return filterInitiativesByClauses(nextInitiatives, currentViewFilters.value)
  }
  function applyViewFiltersToSavedViews(nextViews: SavedViewRow[]): SavedViewRow[] {
    return filterSavedViewsByClauses(nextViews, currentViewFilters.value)
  }
  function setActiveCustomViewFilters(filters: ViewFilterClause[]): void {
    persistViewStateForView(currentView.value, filters, captureDisplay())
  }
  function getFilterClause(fieldId: FilterFieldId, value: string): ViewFilterClause | null {
    return (
      currentViewFilters.value.find(
        filter => filter.fieldId === fieldId && filter.value === value,
      ) ?? null
    )
  }
  function isFilterClauseSelected(fieldId: FilterFieldId, value: string): boolean {
    return getFilterClause(fieldId, value) !== null
  }
  function toggleFilterClause(fieldId: FilterFieldId, value: string, valueLabel: string): void {
    if (isFilterClauseSelected(fieldId, value)) {
      setActiveCustomViewFilters(
        currentViewFilters.value.filter(
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
    setActiveCustomViewFilters([...currentViewFilters.value, nextFilter])
  }
  function removeFilterClause(filterId: string) {
    setActiveCustomViewFilters(currentViewFilters.value.filter(filter => filter.id !== filterId))
  }
  function removeActiveFilterChip(chip: ActiveFilterChip): void {
    if (chip.kind === 'clause') {
      removeFilterClause(chip.filterId)
      return
    }
    const defaults = getDefaultDisplayForView(currentView.value)
    if (chip.inclusionId === 'completed') {
      completedRange.value = normalizeIssueVisibilityRange(defaults.completedRange)
      return
    }
    if (chip.inclusionId === 'subIssues') {
      showSubIssuesRange.value = normalizeIssueVisibilityRange(defaults.showSubIssuesRange)
      return
    }
    if (chip.inclusionId === 'completedProjects') {
      projectClosedRange.value = normalizeProjectClosedRange(defaults.projectClosedRange)
      return
    }
    showTriageIssuesRange.value = normalizeIssueVisibilityRange(defaults.showTriageIssuesRange)
  }
  function clearCurrentViewFilters() {
    const defaults = getDefaultDisplayForView(currentView.value)
    if (viewEditorDraft.value && currentView.value === viewEditorDraft.value.id) {
      viewEditorDraft.value = {
        ...viewEditorDraft.value,
        filters: [],
        display: defaults,
      }
      withViewDisplaySyncSuppressed(() => {
        applyDisplay(defaults)
      })
      return
    }

    removeViewOverride(currentView.value)
    withViewDisplaySyncSuppressed(() => {
      applyDisplay(defaults)
    })
  }
  function openFilterMenu() {
    closeCustomViewContextMenu()
    filterMenuOpen.value = true
    displayOptionsOpen.value = false
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
  function saveCurrentViewFilters() {
    startCreateView()
  }
  function saveCurrentViewChangesToThisView(): void {
    const customView = getCustomView(currentView.value)
    if (!customView) {
      return
    }

    saveCustomViewAndRemoveOverride({
      ...copyCustomView(customView),
      filters: clausesToCustomViewFilters(currentViewFilters.value),
      display: captureDisplay(),
    })
  }
  function resetIssueDisplayOptions() {
    const defaults = getDefaultDisplayForView(currentView.value)
    listGrouping.value = normalizeIssueGroupingFieldId(defaults.grouping)
    listOrdering.value = normalizeIssueOrderingFieldId(defaults.ordering)
    listGroupingDirection.value = defaults.groupingDirection
    listOrderingDirection.value = defaults.orderingDirection
    issueGroupOrders.value = copyIssueGroupConfigMap(defaults.issueGroupOrders)
    hiddenIssueGroupIds.value = copyIssueGroupConfigMap(defaults.hiddenIssueGroupIds)
    collapsedIssueSectionIds.value = [...defaults.collapsedIssueSectionIds]
    visibleIssueRowFields.value = normalizeIssueRowFields(defaults.visibleIssueRowFields)
    persistViewStateForView(currentView.value, currentViewFilters.value, captureDisplay())
  }
  function resetProjectDisplayOptions() {
    const defaults = getDefaultDisplayForView(currentView.value)
    projectGrouping.value = normalizeProjectGroupingFieldId(defaults.projectGrouping)
    projectOrdering.value = normalizeProjectOrderingFieldId(defaults.projectOrdering)
    projectClosedRange.value = normalizeProjectClosedRange(defaults.projectClosedRange)
    collapsedProjectSectionIds.value = [...defaults.collapsedProjectSectionIds]
    visibleProjectRowFields.value = normalizeProjectRowFields(defaults.visibleProjectRowFields)
    persistViewStateForView(currentView.value, currentViewFilters.value, captureDisplay())
  }
  function openGroupOrdering() {
    groupOrderingOpen.value = true
  }
  function closeGroupOrdering() {
    groupOrderingOpen.value = false
  }
  function buildGridTemplate<FieldId>(
    leadColumn: string,
    columnWidths: ReadonlyArray<readonly [FieldId, string]>,
    isVisible: (fieldId: FieldId) => boolean,
  ): string {
    return [
      leadColumn,
      ...columnWidths.filter(([fieldId]) => isVisible(fieldId)).map(([, width]) => width),
    ].join(' ')
  }
  function getProjectGridTemplate(): string {
    return buildGridTemplate<ProjectRowFieldId>(
      'minmax(220px,1.4fr)',
      [
        ['health', '108px'],
        ['priority', '94px'],
        ['lead', '130px'],
        ['targetDate', '104px'],
        ['issues', '150px'],
        ['status', '116px'],
      ],
      isProjectRowFieldVisible,
    )
  }
  function getInitiativeGridTemplate(): string {
    return buildGridTemplate<InitiativeRowFieldId>(
      'minmax(260px,1.4fr)',
      [
        ['health', '112px'],
        ['lead', '124px'],
        ['projects', '132px'],
        ['issues', '156px'],
        ['updated', '112px'],
      ],
      isInitiativeRowFieldVisible,
    )
  }
  function getSavedViewGridTemplate(): string {
    return buildGridTemplate<SavedViewRowFieldId>(
      'minmax(260px,1fr)',
      [
        ['type', '112px'],
        ['items', '88px'],
        ['owner', '132px'],
        ['updated', '112px'],
      ],
      isSavedViewRowFieldVisible,
    )
  }
  function openCommandMenu(initialQuery = '') {
    closeCustomViewContextMenu()
    commandQuery.value = initialQuery
    commandActiveIndex.value = 0
    commandMenuOpen.value = true
    displayOptionsOpen.value = false
    closeFilterMenu()
  }
  function closeDisplayOptions() {
    displayOptionsOpen.value = false
    groupOrderingOpen.value = false
  }
  function toggleDisplayOptions() {
    closeCustomViewContextMenu()
    if (!displayOptionsOpen.value) {
      closeFilterMenu()
      groupOrderingOpen.value = false
    }
    displayOptionsOpen.value = !displayOptionsOpen.value
  }
  function handleDocumentPointerDown(event: PointerEvent) {
    const target = event.target
    if (!(target instanceof Node))
      return
    const clickedMenu = target instanceof Element ? target.closest('[data-ticket-list-menu]') : null
    const clickedMenuName = clickedMenu?.getAttribute('data-ticket-list-menu')

    if (customViewContextMenu.value.open && clickedMenuName !== 'custom-view-context') {
      closeCustomViewContextMenu()
    }
    if (displayOptionsOpen.value) {
      if (clickedMenuName === 'display-options') {
        return
      }
      closeDisplayOptions()
    }
    if (filterMenuOpen.value) {
      if (clickedMenuName === 'filters') {
        return
      }
      closeFilterMenu()
    }
  }
  function getProjectSectionCollapseId(section: ProjectSection): string {
    return `${currentView.value}:${projectGrouping.value}:${section.id}`
  }
  function isProjectSectionCollapsed(section: ProjectSection): boolean {
    if (projectGrouping.value === 'none')
      return false
    return collapsedProjectSectionIds.value.includes(getProjectSectionCollapseId(section))
  }
  function toggleProjectSection(section: ProjectSection): void {
    const sectionId = getProjectSectionCollapseId(section)
    collapsedProjectSectionIds.value = isProjectSectionCollapsed(section)
      ? collapsedProjectSectionIds.value.filter(id => id !== sectionId)
      : [...collapsedProjectSectionIds.value, sectionId]
  }
  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented)
      return

    const key = event.key.toLowerCase()
    if ((event.metaKey || event.ctrlKey) && key === 'k') {
      event.preventDefault()
      openCommandMenu()
      return
    }
    if (displayOptionsOpen.value && key === 'escape') {
      event.preventDefault()
      if (groupOrderingOpen.value) {
        closeGroupOrdering()
        return
      }
      closeDisplayOptions()
      return
    }
    if (filterMenuOpen.value && key === 'escape') {
      event.preventDefault()
      closeFilterMenu()
      return
    }
    if (commandMenuOpen.value) {
      if (key === 'escape') {
        event.preventDefault()
        closeCommandMenu()
      }
      return
    }
    if (currentView.value === 'search' && key === 'escape' && event.target === searchInputRef.value) {
      event.preventDefault()
      closeSearchView()
      return
    }
    if (isCreateModalOpen.value || isEditableTarget(event.target)) {
      return
    }
    if (selectedKey.value) {
      if (key === 'escape') {
        event.preventDefault()
        closeTicket()
      }
      return
    }
    if (pendingGotoKey.value) {
      pendingGotoKey.value = false
      if (key === 's') {
        event.preventDefault()
        openSettings()
      }
      return
    }
    if (currentView.value === 'search' && key === 'escape') {
      event.preventDefault()
      closeSearchView()
      return
    }

    function getFallbackVisibleIssueKey(): string | null {
      const firstVisibleTicket = getFlatVisibleTickets()[0]
      return firstVisibleTicket ? getDisplayedIssueRowKey(firstVisibleTicket) : null
    }

    const keyHandlers: Array<{ match: () => boolean, run: () => void }> = [
      {
        match: () => key === 'g',
        run: () => {
          pendingGotoKey.value = true
          window.setTimeout(() => {
            pendingGotoKey.value = false
          }, 1200)
        },
      },
      {
        match: () => key === '/',
        run: () => handleViewChange('search'),
      },
      {
        match: () => key === 'c',
        run: () => openGlobalCreate(),
      },
      {
        match: () => key === 'x' && (selectedKey.value || focusedIssueKey.value || getFallbackVisibleIssueKey()) !== null,
        run: () => {
          const keyToToggle = selectedKey.value || focusedIssueKey.value || getFallbackVisibleIssueKey()
          if (!keyToToggle)
            return
          if (event.shiftKey) {
            const anchorKey = selectionAnchorKey.value ?? keyToToggle
            selectionAnchorKey.value = anchorKey
            addCheckedIssueRange(anchorKey, keyToToggle)
            return
          }
          toggleCheckedIssue(keyToToggle)
        },
      },
      {
        match: () => key === 'j' || key === 'arrowdown',
        run: () => openRelativeVisibleTicket(1, event.shiftKey),
      },
      {
        match: () => key === 'k' || key === 'arrowup',
        run: () => openRelativeVisibleTicket(-1, event.shiftKey),
      },
      {
        match: () => key === 'enter' && (focusedIssueKey.value ?? getFallbackVisibleIssueKey()) !== null,
        run: () => {
          const keyToOpen = focusedIssueKey.value ?? getFallbackVisibleIssueKey()
          if (keyToOpen) {
            openTicket(keyToOpen)
          }
        },
      },
      {
        match: () => key === 'escape' && checkedIssueCount.value > 0,
        run: () => clearCheckedIssues(),
      },
    ]

    const handler = keyHandlers.find(candidate => candidate.match())
    if (!handler)
      return
    event.preventDefault()
    handler.run()
  }
  async function handleRefresh() {
    await refresh()
    if (selectedKey.value) {
      queryClient.invalidateQueries({
        queryKey: ticketQueryKey(selectedKey.value),
      })
    }
  }
  onMounted(() => {
    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
    document.addEventListener('keydown', handleGlobalKeydown, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
    document.removeEventListener('keydown', handleGlobalKeydown, true)
  })
  return {
    tickets,
    refreshing,
    isFavoriteView,
    sidebarCollapsed,
    currentView,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    issueSearch,
    displayOptionsOpen,
    groupOrderingOpen,
    listGrouping,
    listOrdering,
    projectGrouping,
    projectOrdering,
    projectClosedRange,
    listOrderingDirection,
    completedRange,
    showSubIssues,
    showBacklogIssues,
    visibleIssueRowFields,
    visibleProjectRowFields,
    visibleInitiativeRowFields,
    visibleSavedViewRowFields,
    isCreateModalOpen,
    isAddSpaceModalOpen,
    createIssueType,
    createParentKey,
    issueTypeLocked,
    parentLocked,
    commandMenuOpen,
    commandQuery,
    commandActiveIndex,
    setSearchInputRef,
    focusedIssueKey,
    searchResultTab,
    filterMenuOpen,
    activeFilterEntryId,
    activeDateFilterId,
    activeProjectPropertyFilterId,
    filterFieldSearchQuery,
    filterSearchQuery,
    viewEditorMode,
    viewEditorDraft,
    customViewContextMenu,
    issueRowFieldOptions,
    issueGroupingOptions,
    issueOrderingOptions,
    projectGroupingOptions,
    projectOrderingOptions,
    projectClosedRangeOptions,
    issueVisibilityRangeOptions,
    projectRowFieldOptions,
    initiativeRowFieldOptions,
    savedViewRowFieldOptions,
    dateFilterFields,
    projectPropertyFilterFields,
    selectedKey,
    selectedTicket,
    issueRowDisplayProps,
    projectGridTemplate,
    initiativeGridTemplate,
    savedViewGridTemplate,
    effectiveSidebarWidth,
    showInitialWorkspaceOverlay,
    supportsCustomViews,
    currentTeamKey,
    currentTeamName,
    currentTeamAppearance,
    currentTeamSectionLabel,
    isViewsDirectory,
    isProjectDisplayView,
    isInitiativeDisplayView,
    isTeamSettingsView,
    isIssueDisplayView,
    viewTitle,
    viewTabs,
    activeFilterChips,
    hasModifiedFilterOptions,
    hasModifiedDisplayOptions,
    activeViewIsCustomView,
    visibleFilterMenuEntries,
    activeFilterEntry,
    activeValueFilterFieldId,
    activeFilterOptions,
    activeDateFilterOptions,
    searchedTickets,
    searchedProjectRows,
    searchedInitiativeRows,
    searchTabs,
    issueSections,
    issueGroupOrderingRows,
    visibleIssueCount,
    hiddenCompletedCount,
    checkedIssueKeySet,
    checkedIssues,
    checkedIssueCount,
    projectSections,
    visibleProjectCount,
    initiativeRows,
    displayedSavedViewRows,
    currentViewIsFavoritable,
    favoriteViewNavItems,
    toggleCurrentViewFavorite,
    setFavoriteViewIssueCountVisible,
    commandItems,
    getDisplayedIssueRowKey,
    isFilterClauseSelected,
    toggleFilterClause,
    removeActiveFilterChip,
    clearCurrentViewFilters,
    openFilterMenu,
    toggleFilterMenu,
    saveCurrentViewFilters,
    saveCurrentViewChangesToThisView,
    getProjectHealthClass,
    getProgressBarClass,
    getIssueGroupMarkerClass,
    getStatusCategoryForGroupLabel,
    isIssueRowFieldVisible,
    toggleIssueRowField,
    resetIssueDisplayOptions,
    resetProjectDisplayOptions,
    openGroupOrdering,
    closeGroupOrdering,
    toggleIssueGroupVisibility,
    resetCurrentIssueGroupOrdering,
    startIssueGroupDrag,
    finishIssueGroupDrag,
    dropIssueGroup,
    toggleOrderingDirection,
    isProjectRowFieldVisible,
    toggleProjectRowField,
    isInitiativeRowFieldVisible,
    toggleInitiativeRowField,
    isSavedViewRowFieldVisible,
    toggleSavedViewRowField,
    getRelativeTimeLabel,
    startSidebarResize,
    prefetchTicket,
    openTicket,
    closeTicket,
    toggleCheckedIssue,
    clearCheckedIssues,
    openFirstCheckedIssue,
    copyCheckedIssueKeys,
    openSettings,
    startCreateView,
    saveViewEditor,
    cancelViewEditor,
    updateViewEditorName,
    updateViewEditorDescription,
    updateViewEditorIcon,
    updateViewEditorColor,
    openViewEditorFilters,
    openViewEditorSettings,
    handleViewTabClick,
    handleViewTabContextMenu,
    editContextCustomView,
    deleteContextCustomView,
    handleViewChange,
    handleFavoriteViewChange,
    openAddSpaceModal,
    closeAddSpaceModal,
    handleLeaveSpace,
    openChildCreate,
    closeCreateModal,
    handleTicketCreated,
    openCommandMenu,
    closeCommandMenu,
    toggleDisplayOptions,
    runCommandItem,
    isIssueSectionCollapsed,
    shouldShowIssueSectionHeader,
    toggleIssueSection,
    isProjectSectionCollapsed,
    toggleProjectSection,
    handleCommandMenuKeydown,
    handleRefresh,
  }
}

export type TicketListController = ReturnType<typeof useTicketListController>
