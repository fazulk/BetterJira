import type { ComponentPublicInstance } from 'vue'
import type { TicketFilterContext } from './filterEngine'
import type {
  ActiveFilterChip,
  CommandMenuItem,
  DateFilterFieldId,
  DateFilterOption,
  FavoriteViewNavItem,
  FilterContextKind,
  FilterEntryId,
  FilterFieldId,
  FilterMenuEntry,
  FilterOption,
  InitiativeRow,
  InitiativeRowFieldId,
  IssueGroupingFieldId,
  IssueGroupOrderingRow,
  IssueRowDisplayProps,
  IssueRowFieldId,
  IssueSection,
  IssueVisibilityRange,
  MyIssuesViewId,
  ProjectAccumulator,
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
  FavoriteView,
  FavoriteViewFilter,
} from '~/shared/settings'
import { useQueryClient } from '@tanstack/vue-query'
import { useLocalStorage } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { fetchTicket } from '@/api/jira'
import { fetchLocalTicket } from '@/api/localTickets'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { useCustomViews } from '@/composables/useCustomViews'
import { useFavoriteViews } from '@/composables/useFavoriteViews'
import { useJiraCurrentUser } from '@/composables/useJiraCurrentUser'
import { useJiraTickets } from '@/composables/useJiraTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { compareStatusesByPreference, useStatusPreferences } from '@/composables/useStatusPreferences'
import { useViewOverrides } from '@/composables/useViewOverrides'
import { useViewStatePersistence } from '@/features/ticket-list/useViewStatePersistence'
import { getStatusGroup } from '@/types/jira'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import { isLocalTicketKey } from '~/shared/localTickets'
import { DEFAULT_CUSTOM_VIEW_COLOR, DEFAULT_CUSTOM_VIEW_ICON } from '~/shared/settings'
import {
  clausesToCustomViewFilters,
  customViewFiltersToClauses,
  getFilterFieldLabel,
  isFilterFieldId,
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
  formatCompactDate,
  getBaseViewIdForCustomContext,
  getCustomViewKind,
  getIssueGroupMarkerClass,
  getIssueTypeIcon,
  getMostCommonLead,
  getPriorityRank,
  getProgressBarClass,
  getProjectGroupingLabel,
  getProjectGroupingRank,
  getProjectHealth,
  getProjectHealthClass,
  getRelativeTimeLabel,
  getTeamSectionLabel,
  getTicketLabels,
  getTimeValue,
  getViewsDirectoryTabFromViewId,
  isEditableTarget,
  isEpicIssue,
  isEpicIssueType,
  isInitiativeIssue,
  isInitiativeIssueType,
  isSubIssueTicket,
  parseTeamViewId,
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
  copyViewDisplay,
  filterClausesMatch,
  filterGroupsMatch,
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
  } = useFavoriteViews()
  const { customViews, getCustomView, customViewsForContext } = useCustomViews()
  const { viewOverrides, getViewOverride, upsertViewOverride, removeViewOverride } = useViewOverrides()
  const jiraMeQuery = useJiraCurrentUser(hasJiraCredentialsConfigured)
  const sidebarCollapsed = useLocalStorage('jira2.sidebar.collapsed', false)
  const defaultSidebarWidth = 300
  const minSidebarWidth = 208
  const maxSidebarWidth = 360
  const collapsedSidebarWidth = 48
  const sidebarWidth = useLocalStorage('jira2.sidebar.width', defaultSidebarWidth)
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
  const canGoBack = ref(false)
  const canGoForward = ref(false)
  function syncNavigationHistoryState(): void {
    const state: unknown = window.history.state
    canGoBack.value = typeof state === 'object' && state !== null && 'back' in state && state.back != null
    canGoForward.value = typeof state === 'object' && state !== null && 'forward' in state && state.forward != null
  }
  function goBack(): void {
    if (canGoBack.value) {
      router.back()
    }
  }
  function goForward(): void {
    if (canGoForward.value) {
      router.forward()
    }
  }
  const issueSearch = ref('')
  const displayOptionsOpen = ref(false)
  const groupOrderingOpen = ref(false)
  const isResizingSidebar = ref(false)
  const activePointerId = ref<number | null>(null)
  const isCreateModalOpen = ref(false)
  const isAddSpaceModalOpen = ref(false)
  const createIssueType = ref('Task')
  const createParentKey = ref<string | null>(null)
  const issueTypeLocked = ref(false)
  const parentLocked = ref(false)
  const hasFinishedInitialWorkspaceLoad = ref(false)
  const commandMenuOpen = ref(false)
  const commandQuery = ref('')
  const commandActiveIndex = ref(0)
  const commandInputRef = ref<HTMLInputElement | null>(null)
  const searchInputRef = ref<HTMLInputElement | null>(null)
  function setSearchInputRef(element: Element | ComponentPublicInstance | null): void {
    searchInputRef.value = element instanceof HTMLInputElement ? element : null
  }
  const lastNonSearchView = ref(currentView.value === 'search' ? 'my-issues' : currentView.value)
  const draggedIssueGroupId = ref<string | null>(null)
  const pendingGotoKey = ref(false)
  const focusedIssueKey = ref<string | null>(null)
  const checkedIssueKeys = ref<string[]>([])
  const selectionAnchorKey = ref<string | null>(null)
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
  function copyCustomView(view: CustomView): CustomView {
    return {
      ...view,
      filters: view.filters.map(filter => ({ ...filter })),
      display: copyViewDisplay(view.display),
    }
  }
  function saveCustomViewAndRemoveOverride(view: CustomView): void {
    const savedView = copyCustomView(view)
    const existingIndex = customViews.value.findIndex(existingView => existingView.id === savedView.id)
    const nextCustomViews = existingIndex === -1
      ? [savedView, ...customViews.value]
      : customViews.value.map(existingView => (
          existingView.id === savedView.id ? savedView : existingView
        ))
    const nextViewOverrides = { ...viewOverrides.value }
    delete nextViewOverrides[savedView.id]

    void setSidebarSettings({
      customViews: nextCustomViews,
      viewOverrides: nextViewOverrides,
    })
  }
  function removeCustomViewAndOverride(viewId: string): void {
    const nextViewOverrides = { ...viewOverrides.value }
    delete nextViewOverrides[viewId]

    void setSidebarSettings({
      customViews: customViews.value.filter(view => view.id !== viewId),
      viewOverrides: nextViewOverrides,
    })
  }
  if (typeof sidebarWidth.value !== 'number' || Number.isNaN(sidebarWidth.value)) {
    sidebarWidth.value = defaultSidebarWidth
  }
  sidebarWidth.value = Math.min(maxSidebarWidth, Math.max(minSidebarWidth, sidebarWidth.value))
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
        return `team:${teamKey}:projects`
      }
      if (section === 'views' || section === 'all' || section === 'active' || section === 'backlog') {
        return `team:${teamKey}:issues`
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
  watchEffect(() => {
    if (
      currentView.value === 'inbox'
      || currentView.value === 'my-subscribed'
      || currentView.value === 'my-activity'
    ) {
      currentView.value = 'my-issues'
    }
  })
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
  const customViewTabs = computed<ViewTab[]>(() => {
    const contextKey = contextKeyForCurrentView.value
    if (!contextKey) {
      return []
    }
    const draft = viewEditorDraft.value
    const tabs: ViewTab[] = customViewsForContext(contextKey)
      .filter(view => view.id !== draft?.id)
      .map(view => ({
        id: view.id,
        label: view.name,
        custom: true,
        icon: view.icon,
        color: view.color,
      }))
    if (draft && draft.contextKey === contextKey) {
      tabs.push({
        id: draft.id,
        label: draft.name.trim() || 'New view',
        custom: true,
        draft: true,
        icon: draft.icon,
        color: draft.color,
      })
    }
    return tabs
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
        { id: `team:${currentTeamKey.value}:all`, label: 'All issues' },
        { id: `team:${currentTeamKey.value}:active`, label: 'Active' },
        { id: `team:${currentTeamKey.value}:backlog`, label: 'Backlog' },
        ...customViewTabs.value,
      ]
    }
    if (activeBaseViewId.value === 'projects' || currentTeamSection.value === 'projects') {
      return [{ id: activeBaseViewId.value, label: 'All projects' }, ...customViewTabs.value]
    }
    if (isViewsDirectory.value) {
      const tabPrefix = currentTeamKey.value ? `team:${currentTeamKey.value}:` : ''
      return [
        { id: `${tabPrefix}views`, label: 'Issues' },
        { id: `${tabPrefix}project-views`, label: 'Projects' },
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
    if (activeFilterEntryId.value === 'dates')
      return activeDateFilterId.value
    if (activeFilterEntryId.value === 'projectProperties')
      return activeProjectPropertyFilterId.value
    if (activeFilterEntryId.value === 'status')
      return 'status'
    if (activeFilterEntryId.value === 'assignee')
      return 'assignee'
    if (activeFilterEntryId.value === 'reporter')
      return 'reporter'
    if (activeFilterEntryId.value === 'priority')
      return 'priority'
    if (activeFilterEntryId.value === 'labels')
      return 'labels'
    if (activeFilterEntryId.value === 'suggestedLabel')
      return 'suggestedLabel'
    if (activeFilterEntryId.value === 'project')
      return 'project'
    if (activeFilterEntryId.value === 'team')
      return 'team'
    if (activeFilterEntryId.value === 'initiative')
      return 'initiative'
    if (activeFilterEntryId.value === 'subscribers')
      return 'subscribers'
    if (activeFilterEntryId.value === 'shared')
      return 'shared'
    if (activeFilterEntryId.value === 'sharedWith')
      return 'sharedWith'
    return 'externalSource'
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
    // projectRows is declared later with the other row builders; this computed runs after setup completes.
    // eslint-disable-next-line ts/no-use-before-define
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
  const baseIssueSections = computed<IssueSection[]>(() => {
    if (isMyIssuesView(currentView.value) && listGrouping.value === 'none') {
      const label = currentView.value === 'my-created' ? 'Created by you' : 'Assigned to you'
      return [
        {
          id: currentView.value,
          label,
          tickets: sortTickets(searchedTickets.value),
        },
      ]
    }
    if (listGrouping.value === 'none' || currentView.value === 'search') {
      return [
        {
          id: 'all',
          label:
            searchedTickets.value.length === 1
              ? '1 issue'
              : `${searchedTickets.value.length} issues`,
          tickets: sortTickets(searchedTickets.value),
        },
      ]
    }
    return groupTickets(
      searchedTickets.value,
      ticket => getIssueGroupingLabels(ticket, listGrouping.value),
      label => getIssueGroupingRank(label, listGrouping.value),
    )
  })
  const issueSections = computed<IssueSection[]>(() =>
    baseIssueSections.value.filter(section => !isIssueGroupHidden(section.id)),
  )
  const issueGroupOrderingRows = computed<IssueGroupOrderingRow[]>(() =>
    baseIssueSections.value.map(section => ({
      id: section.id,
      label: section.label,
      count: section.tickets.length,
      visible: !isIssueGroupHidden(section.id),
    })),
  )
  const visibleIssueCount = computed(() =>
    issueSections.value.reduce((count, section) => count + section.tickets.length, 0),
  )
  const hiddenCompletedCount = computed(() => {
    if (completedRange.value === 'all')
      return 0
    const baseTickets
      = currentView.value === 'search'
        ? filterTicketsForCurrentViewWithoutCompletedRange(issueTickets.value)
        : filterTicketsForCurrentViewWithoutCompletedRange(scopedTickets.value)
    const query = currentView.value === 'search' ? normalizedIssueSearch.value : ''
    const searchedTickets = query
      ? baseTickets.filter(ticket => ticketMatchesQuery(ticket, query))
      : baseTickets
    return applyViewFiltersToTickets(searchedTickets).filter(
      ticket => !isCompletedIssueVisible(ticket),
    ).length
  })
  const checkedIssueKeySet = computed(() => new Set(checkedIssueKeys.value))
  const checkedIssues = computed(() =>
    checkedIssueKeys.value
      .map(key => tickets.value.find(ticket => ticket.key === key))
      .filter((ticket): ticket is JiraTicket => Boolean(ticket)),
  )
  const checkedIssueCount = computed(() => checkedIssueKeys.value.length)
  const projectRows = computed<ProjectRow[]>(() => {
    const projects = new Map<string, ProjectAccumulator>()
    for (const ticket of enabledTickets.value) {
      const projectKey = getProjectKey(ticket)
      if (!projectKey)
        continue
      const existing = projects.get(projectKey)
      const sourceTicket = getProjectSourceTicket(ticket, projectKey)
      const initiativeParent = getInitiativeParent(sourceTicket ?? ticket)
      const nextProject = existing ?? {
        key: projectKey,
        name: sourceTicket?.summary ?? ticket.parent?.summary ?? ticket.summary,
        spaceKey: sourceTicket?.spaceKey ?? ticket.spaceKey,
        spaceName: sourceTicket?.spaceName ?? ticket.spaceName,
        priority: sourceTicket?.priority ?? ticket.priority,
        lead: sourceTicket?.assignee ?? ticket.assignee,
        targetDate: sourceTicket?.dueDate ?? ticket.dueDate,
        status: sourceTicket?.status ?? ticket.status,
        updatedAt: sourceTicket?.updatedAt ?? ticket.updatedAt,
        initiativeKey: initiativeParent?.key,
        initiativeName: initiativeParent?.summary,
        issues: [],
      }
      if (!existing && sourceTicket) {
        nextProject.priority = sourceTicket.priority
        nextProject.lead = sourceTicket.assignee
        nextProject.targetDate = sourceTicket.dueDate
        nextProject.status = sourceTicket.status
        nextProject.updatedAt = sourceTicket.updatedAt
      }
      if (initiativeParent && !nextProject.initiativeKey) {
        nextProject.initiativeKey = initiativeParent.key
        nextProject.initiativeName = initiativeParent.summary
      }
      if (ticket.key !== projectKey) {
        nextProject.issues = [...nextProject.issues, ticket]
      }
      if (!nextProject.targetDate && ticket.dueDate) {
        nextProject.targetDate = ticket.dueDate
      }
      if (getTimeValue(ticket.updatedAt) > getTimeValue(nextProject.updatedAt)) {
        nextProject.updatedAt = ticket.updatedAt
      }
      projects.set(projectKey, nextProject)
    }
    return [...projects.values()]
      .map((project) => {
        const issueCount = project.issues.length
        const completedCount = project.issues.filter(
          ticket => getStatusGroup(ticket.statusCategory) === 'done',
        ).length
        const progress = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0
        return {
          key: project.key,
          name: project.name,
          spaceKey: project.spaceKey,
          spaceName: project.spaceName,
          health: getProjectHealth(project.status, progress),
          priority: project.priority || 'No priority',
          lead: project.lead && project.lead !== 'Unassigned' ? project.lead : 'Unassigned',
          targetDate: formatCompactDate(project.targetDate),
          targetDateValue: project.targetDate,
          issueCount,
          completedCount,
          progress,
          status: project.status,
          updatedAt: project.updatedAt,
          initiativeKey: project.initiativeKey,
          initiativeName: project.initiativeName,
        }
      })
      .sort(
        (left, right) =>
          getProjectHealthRank(left.health) - getProjectHealthRank(right.health)
          || getPriorityRank(left.priority) - getPriorityRank(right.priority)
          || getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
      )
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
  const baseInitiativeRows = computed<InitiativeRow[]>(() => {
    const groups = new Map<
      string,
      {
        key: string
        name: string
        ticket: JiraTicket | null
        projects: ProjectRow[]
      }
    >()

    for (const ticket of enabledTickets.value) {
      if (!isInitiativeIssue(ticket)) {
        continue
      }

      groups.set(ticket.key, {
        key: ticket.key,
        name: ticket.summary,
        ticket,
        projects: [],
      })
    }

    for (const project of projectRows.value) {
      if (!project.initiativeKey) {
        continue
      }

      const ticket = getInitiativeSourceTicket(project.initiativeKey)
      const existing = groups.get(project.initiativeKey)
      const group = existing ?? {
        key: project.initiativeKey,
        name: ticket?.summary ?? project.initiativeName ?? project.initiativeKey,
        ticket,
        projects: [],
      }

      if (ticket && !group.ticket) {
        group.ticket = ticket
        group.name = ticket.summary
      }

      group.projects.push(project)
      groups.set(group.key, group)
    }

    return [...groups.values()]
      .map((group) => {
        const issueCount = group.projects.reduce((count, project) => count + project.issueCount, 0)
        const completedCount = group.projects.reduce(
          (count, project) => count + project.completedCount,
          0,
        )
        const progress = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0
        const lead = group.ticket?.assignee && group.ticket.assignee !== 'Unassigned'
          ? group.ticket.assignee
          : getMostCommonLead(group.projects)

        return {
          id: group.key,
          name: group.ticket?.summary ?? group.name,
          description: getInitiativeDescription(group.ticket, group.projects.length),
          health: getInitiativeHealth(group.ticket, group.projects, progress),
          projectCount: group.projects.length,
          issueCount,
          completedCount,
          progress,
          lead,
          updatedAt: [group.ticket?.updatedAt, ...group.projects.map(project => project.updatedAt)]
            .sort((left, right) => getTimeValue(right) - getTimeValue(left))[0],
        }
      })
      .sort(
        (left, right) =>
          getProjectHealthRank(left.health) - getProjectHealthRank(right.health)
          || getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt)
          || left.id.localeCompare(right.id, undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
      )
  })
  const initiativeRows = computed(() => applyViewFiltersToInitiatives(baseInitiativeRows.value))
  const savedViewRows = computed<SavedViewRow[]>(() =>
    customViews.value
      .filter(view => customViewBelongsInCurrentViewsDirectory(view))
      .map(view => customViewToSavedViewRow(view)),
  )
  const baseDisplayedSavedViewRows = computed(() => savedViewRows.value)
  const displayedSavedViewRows = computed(() =>
    applyViewFiltersToSavedViews(baseDisplayedSavedViewRows.value),
  )
  const currentViewIsFavoritable = computed(() => currentView.value !== 'search')
  const favoriteViewNavItems = computed<FavoriteViewNavItem[]>(() =>
    favoriteViews.value
      // 'inbox' favorites can persist from builds that predate the inbox removal
      .filter(view => view.id !== 'inbox')
      .map((view) => {
        const customView = getCustomView(view.id)
        return {
          id: view.id,
          label: deriveViewLabel(view.id),
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
        .filter(ticket => filterGroupsMatch(ticket, filters, ticketMatchesFilter))
        .length
    }

    if (context === 'projects') {
      const display = resolveDisplayForView(view.id)
      const closedRange = normalizeProjectClosedRange(display.projectClosedRange)
      return getFavoriteViewProjectRows(view.id)
        .filter(project => favoriteProjectMatchesClosedRange(project, closedRange))
        .filter(project => filterGroupsMatch(project, filters, projectMatchesFilter))
        .length
    }

    if (context === 'initiatives') {
      return baseInitiativeRows.value
        .filter(initiative => filterGroupsMatch(initiative, filters, initiativeMatchesFilter))
        .length
    }

    return getFavoriteViewSavedViewRows(view.id)
      .filter(row => filterGroupsMatch(row, filters, savedViewMatchesFilter))
      .length
  }

  function getFavoriteViewFilterContext(viewId: string): FilterContextKind | null {
    const customView = getCustomView(viewId)
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
    if (getCustomView(view.id)) {
      const override = getViewOverride(view.id)
      return override ? customViewFiltersToClauses(override.filters) : getDefaultFiltersForView(view.id)
    }
    return toViewFilterClauses(view.filters)
  }

  function getFavoriteViewBaseId(viewId: string): string {
    const customView = getCustomView(viewId)
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
    const teamKey = getFavoriteViewTeamKey(viewId)
    const baseTickets = teamKey
      ? issueTickets.value.filter(ticket => ticket.spaceKey === teamKey)
      : issueTickets.value

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
    const display = resolveDisplayForView(viewId)
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
    return isDateVisibleInRange(
      normalizeIssueVisibilityRange(display.showSubIssuesRange),
      ticket.createdAt ?? ticket.updatedAt,
    )
  }

  function favoriteBacklogIssueMatchesDisplay(ticket: JiraTicket, display: CustomViewDisplay): boolean {
    if (!isBacklogIssueTicket(ticket)) {
      return true
    }
    return isDateVisibleInRange(
      normalizeIssueVisibilityRange(display.showTriageIssuesRange),
      ticket.createdAt ?? ticket.updatedAt,
    )
  }

  function favoriteCompletedIssueMatchesDisplay(ticket: JiraTicket, display: CustomViewDisplay): boolean {
    if (getStatusGroup(ticket.statusCategory) !== 'done') {
      return true
    }
    return isDateVisibleInRange(
      normalizeIssueVisibilityRange(display.completedRange),
      ticket.completedAt ?? ticket.updatedAt,
    )
  }

  function getFavoriteViewProjectRows(viewId: string): ProjectRow[] {
    const teamKey = getFavoriteViewTeamKey(viewId)
    return teamKey
      ? projectRows.value.filter(project => project.spaceKey === teamKey)
      : projectRows.value
  }

  function favoriteProjectMatchesClosedRange(
    project: ProjectRow,
    closedRange: ProjectClosedRange,
  ): boolean {
    return project.health !== 'Completed' || isDateVisibleInRange(closedRange, project.updatedAt)
  }

  function getFavoriteViewSavedViewRows(viewId: string): SavedViewRow[] {
    return customViews.value
      .filter(view => customViewBelongsInFavoriteViewsDirectory(view, viewId))
      .map(view => customViewToSavedViewRow(view))
  }

  function customViewBelongsInFavoriteViewsDirectory(view: CustomView, viewId: string): boolean {
    const kind = getCustomViewKind(view.contextKey)
    const tab = getViewsDirectoryTabFromViewId(getFavoriteViewBaseId(viewId))
    if (kind === null || tab === null) {
      return false
    }
    if ((tab === 'project-views') !== (kind === 'projects')) {
      return false
    }
    const favoriteTeamKey = getFavoriteViewTeamKey(viewId)
    const viewTeamKey = getCustomViewTeamKey(view.contextKey)
    return favoriteTeamKey ? viewTeamKey === favoriteTeamKey : viewTeamKey === null
  }

  function customViewBelongsInCurrentViewsDirectory(view: CustomView): boolean {
    const kind = getCustomViewKind(view.contextKey)
    if (kind === null) {
      return false
    }
    if ((activeViewsDirectoryTab.value === 'project-views') !== (kind === 'projects')) {
      return false
    }
    const activeTeamKey = currentTeamKey.value
    const viewTeamKey = getCustomViewTeamKey(view.contextKey)
    return activeTeamKey ? viewTeamKey === activeTeamKey : viewTeamKey === null
  }
  function getCustomViewTeamKey(contextKey: string): string | null {
    return parseTeamViewId(contextKey)?.teamKey || null
  }
  function customViewToSavedViewRow(view: CustomView): SavedViewRow {
    const kind = getCustomViewKind(view.contextKey)
    const stats = getCustomViewStats(view)
    return {
      id: view.id,
      name: view.name,
      description: view.description,
      category: kind === 'projects' ? 'Projects' : 'Issues',
      owner: currentUserName.value || 'Me',
      count: stats.count,
      updatedAt: stats.updatedAt,
      icon: view.icon,
      color: view.color,
      viewId: view.id,
    }
  }
  function getCustomViewStats(view: CustomView): {
    count: number
    updatedAt?: string
  } {
    const filters = customViewFiltersToClauses(view.filters)
    const kind = getCustomViewKind(view.contextKey)
    if (kind === 'projects') {
      const projects = getProjectRowsForCustomView(view.contextKey).filter(project =>
        filterGroupsMatch(project, filters, projectMatchesFilter),
      )
      const updatedAt = [...projects].sort(
        (left, right) => getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt),
      )[0]?.updatedAt
      return { count: projects.length, updatedAt }
    }
    const tickets = getIssueTicketsForCustomView(view.contextKey).filter(ticket =>
      filterGroupsMatch(ticket, filters, ticketMatchesFilter),
    )
    return {
      count: tickets.length,
      updatedAt: sortTicketsByActivity(tickets)[0]?.updatedAt,
    }
  }
  function getIssueTicketsForCustomView(contextKey: string): JiraTicket[] {
    if (contextKey === 'my-issues') {
      return issueTickets.value
    }
    const teamKey = getCustomViewTeamKey(contextKey)
    if (teamKey) {
      return issueTickets.value.filter(ticket => ticket.spaceKey === teamKey)
    }
    return issueTickets.value
  }
  function getProjectRowsForCustomView(contextKey: string): ProjectRow[] {
    const teamKey = getCustomViewTeamKey(contextKey)
    if (teamKey) {
      return projectRows.value.filter(project => project.spaceKey === teamKey)
    }
    return projectRows.value
  }
  function hasKnownFilterFieldId(
    filter: FavoriteViewFilter,
  ): filter is FavoriteViewFilter & { fieldId: FilterFieldId } {
    return isFilterFieldId(filter.fieldId)
  }
  function deriveViewLabel(viewId: string): string {
    const customView = getCustomView(viewId)
    if (customView)
      return customView.name
    if (viewId === 'my-issues')
      return 'My issues · Assigned'
    if (viewId === 'my-created')
      return 'My issues · Created'
    if (viewId === 'initiatives')
      return 'Initiatives'
    if (viewId === 'projects')
      return 'Projects'
    if (viewId === 'views')
      return 'Views · Issues'
    if (viewId === 'project-views')
      return 'Views · Projects'
    const parsed = parseTeamViewId(viewId)
    if (parsed?.teamKey) {
      const { teamKey, section } = parsed
      const teamName = enabledSpaces.value.find(space => space.key === teamKey)?.name || teamKey
      const sectionLabel = getTeamSectionLabel(section)
      const kind = section === 'projects' || section === 'project-views'
        ? 'projects'
        : section === 'views'
          ? null
          : 'issues'
      const parts = [sectionLabel]
      if (kind && !sectionLabel.toLowerCase().includes(kind)) {
        parts.push(kind)
      }
      parts.push(teamName)
      return parts.join(' ')
    }
    const savedView = savedViewRows.value.find(row => row.viewId === viewId)
    return savedView?.name ?? viewId
  }
  function getCurrentFavoriteViewFilters(): FavoriteViewFilter[] {
    return currentViewFilters.value.map(filter => ({
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
    const favoriteView = getFavoriteView(viewId)
    if (!favoriteView || getCustomView(viewId))
      return
    persistViewStateForView(
      viewId,
      toViewFilterClauses(favoriteView.filters),
      currentView.value === viewId ? captureDisplay() : resolveDisplayForView(viewId),
    )
  }
  function toggleCurrentViewFavorite() {
    if (!currentViewIsFavoritable.value)
      return
    toggleFavoriteView(currentView.value, getCurrentFavoriteViewFilters())
  }
  const commandSearchQuery = computed(() => commandQuery.value.trim().toLowerCase())
  const navigationCommands = computed<CommandMenuItem[]>(() => {
    const teamCommands = enabledSpaces.value.flatMap<CommandMenuItem>(space => [
      {
        id: `team:${space.key}:active`,
        label: `${space.name || space.key} issues`,
        description: `Open active issues for ${space.key}`,
        section: 'Teams',
        icon: space.key.slice(0, 1).toUpperCase(),
        execute: () => handleViewChange(`team:${space.key}:active`),
      },
      {
        id: `team:${space.key}:backlog`,
        label: `${space.name || space.key} backlog`,
        description: `Open backlog for ${space.key}`,
        section: 'Teams',
        icon: space.key.slice(0, 1).toUpperCase(),
        execute: () => handleViewChange(`team:${space.key}:backlog`),
      },
      {
        id: `team:${space.key}:projects`,
        label: `${space.name || space.key} projects`,
        description: `Open projects for ${space.key}`,
        section: 'Teams',
        icon: '◈',
        execute: () => handleViewChange(`team:${space.key}:projects`),
      },
      {
        id: `team:${space.key}:views`,
        label: `${space.name || space.key} views`,
        description: `Open saved views for ${space.key}`,
        section: 'Teams',
        icon: '◌',
        execute: () => handleViewChange(`team:${space.key}:views`),
      },
    ])
    return [
      {
        id: 'create',
        label: 'Create issue',
        description: 'Open the new issue composer',
        section: 'Actions',
        icon: '＋',
        execute: () => openGlobalCreate(),
      },
      {
        id: 'refresh',
        label: 'Sync Jira',
        description: 'Refresh issues and selected issue details',
        section: 'Actions',
        icon: '↻',
        execute: () => {
          void handleRefresh()
        },
      },
      {
        id: 'my-issues',
        label: 'My issues',
        description: 'Open assigned active issues',
        section: 'Navigation',
        icon: '◎',
        execute: () => handleViewChange('my-issues'),
      },
      {
        id: 'search',
        label: 'Search',
        description: 'Open workspace search',
        section: 'Navigation',
        icon: 'search',
        execute: () => handleViewChange('search'),
      },
      {
        id: 'initiatives',
        label: 'Initiatives',
        description: 'Open roadmap rollups',
        section: 'Navigation',
        icon: '◇',
        execute: () => handleViewChange('initiatives'),
      },
      {
        id: 'projects',
        label: 'Projects',
        description: 'Open project table',
        section: 'Navigation',
        icon: '◈',
        execute: () => handleViewChange('projects'),
      },
      {
        id: 'views',
        label: 'Views',
        description: 'Open saved views',
        section: 'Navigation',
        icon: '◌',
        execute: () => handleViewChange('views'),
      },
      {
        id: 'settings',
        label: 'Settings',
        description: 'Open workspace settings',
        section: 'Navigation',
        icon: '⚙',
        execute: openSettings,
      },
      ...teamCommands,
    ]
  })
  const projectCommandItems = computed<CommandMenuItem[]>(() => {
    const query = commandSearchQuery.value
    const baseProjects = query
      ? projectRows.value.filter(project =>
          [
            project.key,
            project.name,
            project.spaceKey,
            project.spaceName,
            project.health,
            project.priority,
            project.lead,
            project.status,
            'project',
            'projects',
            'epic',
            'epics',
          ].some(value => value.toLowerCase().includes(query)),
        )
      : projectRows.value
    return baseProjects
      .slice(0, 20)
      .map(project => ({
        id: `project:${project.key}`,
        label: project.name,
        description: `${project.key} · ${project.status} · ${project.lead}`,
        section: 'Projects',
        icon: '◈',
        execute: () => openTicket(project.key),
      }))
  })
  const issueCommandItems = computed<CommandMenuItem[]>(() => {
    const query = commandSearchQuery.value
    const baseTickets = query
      ? issueTickets.value.filter(ticket =>
          [
            ticket.key,
            ticket.summary,
            ticket.status,
            ticket.priority,
            ticket.assignee,
            ticket.spaceKey,
            ticket.spaceName,
          ].some(value => value?.toLowerCase().includes(query)),
        )
      : scopedTickets.value
    return sortTickets(baseTickets)
      .slice(0, 20)
      .map(ticket => ({
        id: `issue:${ticket.key}`,
        label: ticket.summary,
        description: `${ticket.key} · ${ticket.status} · ${ticket.assignee || 'Unassigned'}`,
        section: 'Issues',
        icon: getIssueTypeIcon(ticket.issueType),
        execute: () => openTicket(ticket.key),
      }))
  })
  const commandItems = computed<CommandMenuItem[]>(() => {
    const query = commandSearchQuery.value
    const navigationItems = query
      ? navigationCommands.value.filter(item =>
          [item.label, item.description, item.section].some(value =>
            value?.toLowerCase().includes(query),
          ),
        )
      : navigationCommands.value
    return [...navigationItems, ...projectCommandItems.value, ...issueCommandItems.value].slice(0, 40)
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
      focusedIssueKey.value = key
      displayOptionsOpen.value = false
      closeFilterMenu()
    }
  })
  watch(commandMenuOpen, (isOpen) => {
    if (!isOpen)
      return
    commandActiveIndex.value = 0
    nextTick(() => {
      commandInputRef.value?.focus()
    })
  })
  watch(commandSearchQuery, () => {
    commandActiveIndex.value = 0
  })
  watch(commandItems, (items) => {
    if (commandActiveIndex.value >= items.length) {
      commandActiveIndex.value = Math.max(items.length - 1, 0)
    }
  })
  watch(
    [issueSections, collapsedIssueSectionIds],
    () => {
      const flatTickets = getFlatVisibleTickets()
      if (!flatTickets.length) {
        focusedIssueKey.value = null
        selectionAnchorKey.value = null
        return
      }
      if (
        !focusedIssueKey.value
        || !flatTickets.some(ticket => getDisplayedIssueRowKey(ticket) === focusedIssueKey.value)
      ) {
        focusedIssueKey.value = flatTickets[0] ? getDisplayedIssueRowKey(flatTickets[0]) : null
      }
      if (
        selectionAnchorKey.value
        && !flatTickets.some(ticket => getDisplayedIssueRowKey(ticket) === selectionAnchorKey.value)
      ) {
        selectionAnchorKey.value = null
      }
    },
    { immediate: true },
  )
  function groupTickets(
    nextTickets: JiraTicket[],
    getLabels: (ticket: JiraTicket) => string[],
    getRank: (label: string) => number,
  ): IssueSection[] {
    const groups = new Map<string, JiraTicket[]>()
    for (const ticket of nextTickets) {
      for (const label of getLabels(ticket)) {
        groups.set(label, [...(groups.get(label) ?? []), ticket])
      }
    }
    return [...groups.entries()]
      .sort((left, right) => compareIssueGroupEntries(left, right, getRank))
      .map(([label, sectionTickets]) => ({
        id: label,
        label,
        tickets: sortTickets(sectionTickets),
      }))
  }
  function compareIssueGroupEntries(
    left: [string, JiraTicket[]],
    right: [string, JiraTicket[]],
    getRank: (label: string) => number,
  ): number {
    const manualOrder = issueGroupOrders.value[listGrouping.value] ?? []
    const leftManualIndex = manualOrder.indexOf(left[0])
    const rightManualIndex = manualOrder.indexOf(right[0])
    if (leftManualIndex !== -1 || rightManualIndex !== -1) {
      if (leftManualIndex === -1)
        return 1
      if (rightManualIndex === -1)
        return -1
      return leftManualIndex - rightManualIndex
    }
    if (listGrouping.value === 'status') {
      const statusComparison = compareStatusGroupLabels(left[0], right[0])
      return listGroupingDirection.value === 'desc' ? -statusComparison : statusComparison
    }

    return listGroupingDirection.value === 'desc'
      ? getRank(right[0]) - getRank(left[0]) || right[0].localeCompare(left[0])
      : getRank(left[0]) - getRank(right[0]) || left[0].localeCompare(right[0])
  }
  function getStatusCategoryForGroupLabel(label: string): string {
    return searchedTickets.value.find(ticket => (ticket.status || 'No status') === label)?.statusCategory ?? ''
  }
  function compareStatusGroupLabels(leftLabel: string, rightLabel: string): number {
    return compareStatusesByPreference(
      { status: leftLabel, statusCategory: getStatusCategoryForGroupLabel(leftLabel) },
      { status: rightLabel, statusCategory: getStatusCategoryForGroupLabel(rightLabel) },
      statusPreferences.value.order,
    )
  }
  function getIssueGroupingLabels(ticket: JiraTicket, fieldId: IssueGroupingFieldId): string[] {
    if (fieldId === 'status')
      return [ticket.status || 'No status']
    if (fieldId === 'assignee')
      return [ticket.assignee || 'Unassigned']
    if (fieldId === 'agent')
      return ['No agent']
    if (fieldId === 'project')
      return [ticket.parent?.summary ?? 'No project']
    if (fieldId === 'priority')
      return [ticket.priority || 'No priority']
    if (fieldId === 'label') {
      const labels = getTicketLabels(ticket)
      return labels.length > 0 ? labels : ['No labels']
    }
    return ['All issues']
  }
  function getIssueGroupingRank(label: string, fieldId: IssueGroupingFieldId): number {
    if (fieldId === 'priority')
      return getPriorityRank(label)
    if (fieldId === 'status')
      return 0
    return 0
  }
  function sortTickets(nextTickets: JiraTicket[]): JiraTicket[] {
    const direction = listOrderingDirection.value === 'desc' ? -1 : 1
    return [...nextTickets].sort((left, right) => {
      if (listOrdering.value === 'updated') {
        return (
          direction
          * (getTimeValue(right.updatedAt ?? right.createdAt)
            - getTimeValue(left.updatedAt ?? left.createdAt))
          || getPriorityRank(left.priority) - getPriorityRank(right.priority)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (listOrdering.value === 'created') {
        return (
          direction * (getTimeValue(right.createdAt) - getTimeValue(left.createdAt))
          || getPriorityRank(left.priority) - getPriorityRank(right.priority)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (listOrdering.value === 'due') {
        return (
          direction * (getTimeValue(left.dueDate) - getTimeValue(right.dueDate))
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (listOrdering.value === 'title') {
        return (
          direction * left.summary.localeCompare(right.summary)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (listOrdering.value === 'assignee') {
        return (
          direction
          * (left.assignee || 'Unassigned').localeCompare(right.assignee || 'Unassigned')
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (
        listOrdering.value === 'agent'
        || listOrdering.value === 'estimate'
        || listOrdering.value === 'linkCount'
        || listOrdering.value === 'timeInStatus'
      ) {
        return left.key.localeCompare(right.key, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      }
      if (listOrdering.value === 'priority') {
        return (
          direction * (getPriorityRank(left.priority) - getPriorityRank(right.priority))
          || compareStatusesByPreference(left, right, statusPreferences.value.order)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (listOrdering.value === 'manual') {
        return 0
      }
      return (
        direction * compareStatusesByPreference(left, right, statusPreferences.value.order)
        || getPriorityRank(left.priority) - getPriorityRank(right.priority)
        || left.key.localeCompare(right.key, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      )
    })
  }
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
    const section = currentTeamSection.value
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
  function isBacklogIssueTicket(ticket: JiraTicket): boolean {
    return ticket.status.trim().toLowerCase() === 'backlog'
  }
  function isCompletedIssueVisible(ticket: JiraTicket): boolean {
    if (getStatusGroup(ticket.statusCategory) !== 'done')
      return true
    return isDateVisibleInRange(completedRange.value, ticket.completedAt ?? ticket.updatedAt)
  }
  function getDisplayedIssueRowKey(ticket: JiraTicket): string {
    return ticket.key
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
    return isDateVisibleInRange(showSubIssuesRange.value, ticket.createdAt ?? ticket.updatedAt)
  }
  function isBacklogIssueVisible(ticket: JiraTicket): boolean {
    if (!isBacklogIssueTicket(ticket))
      return true
    return isDateVisibleInRange(showTriageIssuesRange.value, ticket.createdAt ?? ticket.updatedAt)
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
  function getTicketProject(ticket: JiraTicket): ProjectRow | null {
    const projectKey = getProjectKey(ticket)
    if (!projectKey)
      return null
    return projectRows.value.find(project => project.key === projectKey) ?? null
  }
  function getTicketInitiativeIds(ticket: JiraTicket): string[] {
    if (isInitiativeIssue(ticket)) {
      return [ticket.key]
    }

    const project = getTicketProject(ticket)
    return project?.initiativeKey ? [project.initiativeKey] : []
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
  function sortTicketsByActivity(nextTickets: JiraTicket[]): JiraTicket[] {
    return [...nextTickets].sort(
      (left, right) =>
        getTimeValue(right.updatedAt ?? right.createdAt)
        - getTimeValue(left.updatedAt ?? left.createdAt)
        || left.key.localeCompare(right.key, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
    )
  }
  function getProjectTeamFilterEntries(project: ProjectRow): Array<{ value: string, label: string, icon: string }> {
    const teamEntries = new Map<string, { value: string, label: string, icon: string }>()
    for (const ticket of enabledTickets.value) {
      if (getProjectKey(ticket) !== project.key) {
        continue
      }

      const value = ticket.team?.id ?? 'no-team'
      teamEntries.set(value, {
        value,
        label: ticket.team?.name ?? 'No team',
        icon: '◴',
      })
    }
    return [...teamEntries.values()]
  }

  function getProjectKey(ticket: JiraTicket): string | null {
    if (isInitiativeIssue(ticket))
      return null
    if (isEpicIssue(ticket))
      return ticket.key
    let currentParent = ticket.parent
    const visitedKeys = new Set<string>()
    while (currentParent?.key && !visitedKeys.has(currentParent.key)) {
      const parentKey = currentParent.key
      visitedKeys.add(parentKey)
      if (isEpicIssueType(currentParent.issueType)) {
        return parentKey
      }
      const parentTicket = enabledTickets.value.find(candidate => candidate.key === parentKey)
      currentParent = parentTicket?.parent
    }
    return null
  }
  function getProjectSourceTicket(ticket: JiraTicket, projectKey: string): JiraTicket | null {
    if (ticket.key === projectKey)
      return ticket
    return enabledTickets.value.find(candidate => candidate.key === projectKey) ?? null
  }
  function getInitiativeParent(ticket: JiraTicket): NonNullable<JiraTicket['parent']> | null {
    if (isInitiativeIssue(ticket)) {
      return {
        key: ticket.key,
        summary: ticket.summary,
        issueType: ticket.issueType,
      }
    }

    let currentParent = ticket.parent
    const visitedKeys = new Set<string>()
    while (currentParent?.key && !visitedKeys.has(currentParent.key)) {
      const parentKey = currentParent.key
      visitedKeys.add(parentKey)
      if (isInitiativeIssueType(currentParent.issueType)) {
        return currentParent
      }

      const parentTicket = enabledTickets.value.find(candidate => candidate.key === parentKey)
      if (parentTicket && isInitiativeIssue(parentTicket)) {
        return {
          key: parentTicket.key,
          summary: parentTicket.summary,
          issueType: parentTicket.issueType,
        }
      }
      currentParent = parentTicket?.parent
    }

    return null
  }
  function getInitiativeSourceTicket(initiativeKey: string): JiraTicket | null {
    return enabledTickets.value.find(
      ticket => ticket.key === initiativeKey && isInitiativeIssue(ticket),
    ) ?? null
  }
  function getInitiativeDescription(ticket: JiraTicket | null, projectCount: number): string {
    if (ticket) {
      return `${ticket.spaceName || ticket.spaceKey || 'Jira'} initiative`
    }

    return projectCount === 1
      ? 'Parent of 1 epic from Jira hierarchy'
      : `Parent of ${projectCount} epics from Jira hierarchy`
  }
  function getInitiativeHealth(
    ticket: JiraTicket | null,
    projects: ProjectRow[],
    progress: number,
  ): ProjectRow['health'] {
    if (ticket) {
      return getProjectHealth(ticket.status, progress)
    }
    if (projects.some(project => project.health === 'At risk')) {
      return 'At risk'
    }
    if (projects.length > 0 && projects.every(project => project.health === 'Completed')) {
      return 'Completed'
    }
    return 'On track'
  }
  function getProjectHealthRank(health: ProjectRow['health']): number {
    if (health === 'At risk')
      return 0
    if (health === 'On track')
      return 1
    return 2
  }
  function isIssueRowFieldVisible(fieldId: IssueRowFieldId): boolean {
    return visibleIssueRowFields.value.includes(fieldId)
  }
  function toggleIssueRowField(fieldId: IssueRowFieldId) {
    if (isIssueRowFieldVisible(fieldId)) {
      if (visibleIssueRowFields.value.length === 1)
        return
      visibleIssueRowFields.value = visibleIssueRowFields.value.filter(item => item !== fieldId)
      return
    }
    visibleIssueRowFields.value = [...visibleIssueRowFields.value, fieldId]
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
  function setCurrentIssueGroupOrder(groupIds: string[]) {
    issueGroupOrders.value = {
      ...issueGroupOrders.value,
      [listGrouping.value]: groupIds,
    }
  }
  function getCurrentHiddenIssueGroupIds(): string[] {
    return hiddenIssueGroupIds.value[listGrouping.value] ?? []
  }
  function setCurrentHiddenIssueGroupIds(groupIds: string[]) {
    hiddenIssueGroupIds.value = {
      ...hiddenIssueGroupIds.value,
      [listGrouping.value]: groupIds,
    }
  }
  function isIssueGroupHidden(groupId: string): boolean {
    return getCurrentHiddenIssueGroupIds().includes(groupId)
  }
  function toggleIssueGroupVisibility(groupId: string) {
    const hiddenIds = getCurrentHiddenIssueGroupIds()
    setCurrentHiddenIssueGroupIds(
      hiddenIds.includes(groupId)
        ? hiddenIds.filter(id => id !== groupId)
        : [...hiddenIds, groupId],
    )
  }
  function resetCurrentIssueGroupOrdering() {
    listGroupingDirection.value = 'asc'
    setCurrentIssueGroupOrder([])
    setCurrentHiddenIssueGroupIds([])
  }
  function startIssueGroupDrag(groupId: string) {
    draggedIssueGroupId.value = groupId
  }
  function finishIssueGroupDrag() {
    draggedIssueGroupId.value = null
  }
  function dropIssueGroup(targetGroupId: string) {
    const draggedGroupId = draggedIssueGroupId.value
    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      finishIssueGroupDrag()
      return
    }
    const currentIds = issueGroupOrderingRows.value.map(row => row.id)
    const nextIds = currentIds.filter(id => id !== draggedGroupId)
    const targetIndex = nextIds.indexOf(targetGroupId)
    if (targetIndex === -1) {
      finishIssueGroupDrag()
      return
    }
    nextIds.splice(targetIndex, 0, draggedGroupId)
    setCurrentIssueGroupOrder(nextIds)
    finishIssueGroupDrag()
  }
  function toggleOrderingDirection() {
    listOrderingDirection.value = listOrderingDirection.value === 'asc' ? 'desc' : 'asc'
  }
  function isProjectRowFieldVisible(fieldId: ProjectRowFieldId): boolean {
    return visibleProjectRowFields.value.includes(fieldId)
  }
  function toggleProjectRowField(fieldId: ProjectRowFieldId) {
    if (isProjectRowFieldVisible(fieldId)) {
      if (visibleProjectRowFields.value.length === 1)
        return
      visibleProjectRowFields.value = visibleProjectRowFields.value.filter(
        item => item !== fieldId,
      )
      return
    }
    visibleProjectRowFields.value = [...visibleProjectRowFields.value, fieldId]
  }
  function isInitiativeRowFieldVisible(fieldId: InitiativeRowFieldId): boolean {
    return visibleInitiativeRowFields.value.includes(fieldId)
  }
  function toggleInitiativeRowField(fieldId: InitiativeRowFieldId) {
    if (isInitiativeRowFieldVisible(fieldId)) {
      if (visibleInitiativeRowFields.value.length === 1)
        return
      visibleInitiativeRowFields.value = visibleInitiativeRowFields.value.filter(
        item => item !== fieldId,
      )
      return
    }
    visibleInitiativeRowFields.value = [...visibleInitiativeRowFields.value, fieldId]
  }
  function isSavedViewRowFieldVisible(fieldId: SavedViewRowFieldId): boolean {
    return visibleSavedViewRowFields.value.includes(fieldId)
  }
  function toggleSavedViewRowField(fieldId: SavedViewRowFieldId) {
    if (isSavedViewRowFieldVisible(fieldId)) {
      if (visibleSavedViewRowFields.value.length === 1)
        return
      visibleSavedViewRowFields.value = visibleSavedViewRowFields.value.filter(
        item => item !== fieldId,
      )
      return
    }
    visibleSavedViewRowFields.value = [...visibleSavedViewRowFields.value, fieldId]
  }
  function getProjectGridTemplate(): string {
    const columns = ['minmax(220px,1.4fr)']
    if (isProjectRowFieldVisible('health'))
      columns.push('108px')
    if (isProjectRowFieldVisible('priority'))
      columns.push('94px')
    if (isProjectRowFieldVisible('lead'))
      columns.push('130px')
    if (isProjectRowFieldVisible('targetDate'))
      columns.push('104px')
    if (isProjectRowFieldVisible('issues'))
      columns.push('150px')
    if (isProjectRowFieldVisible('status'))
      columns.push('116px')
    return columns.join(' ')
  }
  function getInitiativeGridTemplate(): string {
    const columns = ['minmax(260px,1.4fr)']
    if (isInitiativeRowFieldVisible('health'))
      columns.push('112px')
    if (isInitiativeRowFieldVisible('lead'))
      columns.push('124px')
    if (isInitiativeRowFieldVisible('projects'))
      columns.push('132px')
    if (isInitiativeRowFieldVisible('issues'))
      columns.push('156px')
    if (isInitiativeRowFieldVisible('updated'))
      columns.push('112px')
    return columns.join(' ')
  }
  function getSavedViewGridTemplate(): string {
    const columns = ['minmax(260px,1fr)']
    if (isSavedViewRowFieldVisible('type'))
      columns.push('112px')
    if (isSavedViewRowFieldVisible('items'))
      columns.push('88px')
    if (isSavedViewRowFieldVisible('owner'))
      columns.push('132px')
    if (isSavedViewRowFieldVisible('updated'))
      columns.push('112px')
    return columns.join(' ')
  }
  function clampSidebarWidth(nextWidth: number): number {
    return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, nextWidth))
  }
  function updateDragState(isActive: boolean) {
    isResizingSidebar.value = isActive
    document.body.style.cursor = isActive ? 'col-resize' : ''
    document.body.style.userSelect = isActive ? 'none' : ''
  }
  function stopSidebarResize(pointerId?: number) {
    if (pointerId !== undefined && activePointerId.value !== pointerId) {
      return
    }
    activePointerId.value = null
    updateDragState(false)
  }
  function handleSidebarResize(event: PointerEvent) {
    if (!isResizingSidebar.value || sidebarCollapsed.value) {
      return
    }
    sidebarWidth.value = clampSidebarWidth(event.clientX)
  }
  function handleSidebarResizeEnd(event: PointerEvent) {
    stopSidebarResize(event.pointerId)
  }
  function startSidebarResize(event: PointerEvent) {
    if (sidebarCollapsed.value) {
      return
    }
    activePointerId.value = event.pointerId
    updateDragState(true)
    event.preventDefault()
  }
  function prefetchTicket(ticketKey: string) {
    if (isLocalTicketKey(ticketKey)) {
      void queryClient.prefetchQuery({
        queryKey: localTicketQueryKey(ticketKey),
        queryFn: () => fetchLocalTicket(ticketKey),
      })
      return
    }
    void queryClient.prefetchQuery({
      queryKey: ticketQueryKey(ticketKey),
      queryFn: () => fetchTicket(ticketKey),
    })
  }
  function openTicket(ticketKey: string) {
    focusedIssueKey.value = ticketKey
    if (selectedKey.value === ticketKey)
      return
    selectedKey.value = ticketKey
  }
  function closeTicket() {
    if (selectedKey.value === null)
      return
    selectedKey.value = null
  }
  function toggleCheckedIssue(ticketKey: string) {
    checkedIssueKeys.value = checkedIssueKeySet.value.has(ticketKey)
      ? checkedIssueKeys.value.filter(key => key !== ticketKey)
      : [...checkedIssueKeys.value, ticketKey]
    selectionAnchorKey.value = ticketKey
  }
  function clearCheckedIssues() {
    checkedIssueKeys.value = []
    selectionAnchorKey.value = null
  }
  function getVisibleTicketRangeKeys(anchorKey: string, targetKey: string): string[] {
    const flatTickets = getFlatVisibleTickets()
    const anchorIndex = flatTickets.findIndex(
      ticket => getDisplayedIssueRowKey(ticket) === anchorKey,
    )
    const targetIndex = flatTickets.findIndex(
      ticket => getDisplayedIssueRowKey(ticket) === targetKey,
    )
    if (anchorIndex === -1 || targetIndex === -1)
      return targetKey ? [targetKey] : []
    const start = Math.min(anchorIndex, targetIndex)
    const end = Math.max(anchorIndex, targetIndex)
    return flatTickets.slice(start, end + 1).map(getDisplayedIssueRowKey)
  }
  function addCheckedIssueRange(anchorKey: string, targetKey: string) {
    const nextKeys = getVisibleTicketRangeKeys(anchorKey, targetKey)
    const merged = new Set(checkedIssueKeys.value)
    for (const key of nextKeys) {
      merged.add(key)
    }
    checkedIssueKeys.value = [...merged]
  }
  function openFirstCheckedIssue() {
    const firstIssue = checkedIssues.value[0]
    if (!firstIssue)
      return
    openTicket(firstIssue.key)
  }
  async function copyCheckedIssueKeys() {
    const text = checkedIssueKeys.value.join(', ')
    if (!text || !navigator.clipboard)
      return
    await navigator.clipboard.writeText(text)
  }
  function openSettings() {
    void navigateTo('/settings')
  }
  function generateCustomViewId(): string {
    return `custom-view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
  function startCreateView(): void {
    const contextKey = contextKeyForCurrentView.value
    if (!contextKey) {
      return
    }
    const display = captureDisplay()
    viewEditorPreviousViewId.value = currentView.value
    viewEditorPreviousDisplay.value = copyViewDisplay(display)
    viewEditorDraft.value = {
      id: generateCustomViewId(),
      name: '',
      description: '',
      contextKey,
      icon: DEFAULT_CUSTOM_VIEW_ICON,
      color: DEFAULT_CUSTOM_VIEW_COLOR,
      filters: clausesToCustomViewFilters(currentViewFilters.value),
      display: copyViewDisplay(display),
    }
    viewEditorMode.value = 'create'
    currentView.value = viewEditorDraft.value.id
    focusedIssueKey.value = null
    clearCheckedIssues()
    closeTicket()
  }
  function startEditView(viewId: string): void {
    const customView = getCustomView(viewId)
    if (!customView) {
      return
    }
    const display = currentView.value === viewId ? captureDisplay() : customView.display
    viewEditorPreviousViewId.value = currentView.value
    viewEditorPreviousDisplay.value = captureDisplay()
    viewEditorDraft.value = {
      ...copyCustomView(customView),
      display: copyViewDisplay(display),
    }
    viewEditorMode.value = 'edit'
    currentView.value = viewId
    focusedIssueKey.value = null
    clearCheckedIssues()
    closeTicket()
  }
  function finishViewEditor(): void {
    viewEditorMode.value = null
    viewEditorDraft.value = null
    viewEditorPreviousViewId.value = null
    viewEditorPreviousDisplay.value = null
  }
  function saveViewEditor(): void {
    const draft = viewEditorDraft.value
    if (!draft) {
      return
    }
    const name = draft.name.trim()
    if (!name) {
      return
    }
    const savedView: CustomView = {
      ...draft,
      name,
      description: draft.description.trim(),
      filters: clausesToCustomViewFilters(currentViewFilters.value),
      display: captureDisplay(),
    }
    saveCustomViewAndRemoveOverride(savedView)
    finishViewEditor()
    currentView.value = savedView.id
  }
  function cancelViewEditor(): void {
    const previousViewId = viewEditorPreviousViewId.value
    const previousDisplay = viewEditorPreviousDisplay.value
    withViewDisplaySyncSuppressed(() => {
      if (previousDisplay) {
        applyDisplay(previousDisplay)
      }
      finishViewEditor()
      if (previousViewId) {
        currentView.value = previousViewId
      }
    })
  }
  function discardViewEditorAndSwitch(viewId: string): void {
    withViewDisplaySyncSuppressed(() => {
      finishViewEditor()
      currentView.value = viewId
      applyDisplay(resolveDisplayForView(viewId))
    })
  }
  function activateCustomView(viewId: string): void {
    if (!getCustomView(viewId) && viewEditorDraft.value?.id !== viewId) {
      return
    }
    if (viewEditorMode.value && viewEditorDraft.value?.id !== viewId) {
      discardViewEditorAndSwitch(viewId)
      focusedIssueKey.value = null
      clearCheckedIssues()
      closeTicket()
      return
    }
    currentView.value = viewId
    focusedIssueKey.value = null
    clearCheckedIssues()
    closeTicket()
  }
  function updateViewEditorName(value: string): void {
    if (!viewEditorDraft.value) {
      return
    }
    viewEditorDraft.value = { ...viewEditorDraft.value, name: value }
  }
  function updateViewEditorDescription(value: string): void {
    if (!viewEditorDraft.value) {
      return
    }
    viewEditorDraft.value = { ...viewEditorDraft.value, description: value }
  }
  function updateViewEditorIcon(value: string): void {
    if (!viewEditorDraft.value) {
      return
    }
    viewEditorDraft.value = { ...viewEditorDraft.value, icon: value }
  }
  function updateViewEditorColor(value: string): void {
    if (!viewEditorDraft.value) {
      return
    }
    viewEditorDraft.value = { ...viewEditorDraft.value, color: value }
  }
  function openViewEditorFilters(): void {
    openFilterMenu()
  }
  function openViewEditorSettings(): void {
    displayOptionsOpen.value = true
    filterMenuOpen.value = false
  }
  function handleViewTabClick(tab: ViewTab): void {
    closeCustomViewContextMenu()
    if (tab.custom) {
      activateCustomView(tab.id)
      return
    }
    handleViewChange(tab.id)
  }
  function closeCustomViewContextMenu(): void {
    customViewContextMenu.value = {
      ...customViewContextMenu.value,
      open: false,
    }
  }
  function handleViewTabContextMenu(tab: ViewTab, event: MouseEvent): void {
    if (!tab.custom || tab.draft) {
      closeCustomViewContextMenu()
      return
    }
    customViewContextMenu.value = {
      open: true,
      viewId: tab.id,
      x: event.clientX,
      y: event.clientY,
    }
  }
  function editContextCustomView(): void {
    const viewId = customViewContextMenu.value.viewId
    closeCustomViewContextMenu()
    if (viewId) {
      startEditView(viewId)
    }
  }
  function deleteContextCustomView(): void {
    const viewId = customViewContextMenu.value.viewId
    const customView = getCustomView(viewId)
    closeCustomViewContextMenu()
    if (!customView) {
      return
    }
    if (isFavoriteView(viewId)) {
      toggleFavoriteView(viewId, [])
    }
    removeCustomViewAndOverride(viewId)
    if (viewEditorDraft.value?.id === viewId) {
      finishViewEditor()
    }
    if (currentView.value === viewId) {
      handleViewChange(getBaseViewIdForCustomContext(customView.contextKey))
    }
  }
  function focusSearchInputWhenReady(): void {
    nextTick(() => {
      if (currentView.value === 'search') {
        searchInputRef.value?.focus()
      }
    })
  }
  function closeSearchView(): void {
    if (currentView.value !== 'search')
      return
    handleViewChange(lastNonSearchView.value)
  }
  function handleViewChange(viewId: string) {
    if (viewId === 'command') {
      openCommandMenu()
      return
    }
    if (viewId === 'create') {
      openGlobalCreate()
      return
    }
    if (viewId === 'search') {
      searchResultTab.value = 'all'
      focusSearchInputWhenReady()
    }
    if (viewEditorMode.value) {
      discardViewEditorAndSwitch(viewId)
      focusedIssueKey.value = null
      clearCheckedIssues()
      closeTicket()
      return
    }
    currentView.value = viewId
    focusedIssueKey.value = null
    clearCheckedIssues()
    closeTicket()
  }
  function handleFavoriteViewChange(viewId: string) {
    restoreFavoriteViewFilters(viewId)
    handleViewChange(viewId)
  }
  function openAddSpaceModal(): void {
    isAddSpaceModalOpen.value = true
  }
  function closeAddSpaceModal(): void {
    isAddSpaceModalOpen.value = false
  }
  async function handleLeaveSpace(spaceKey: string): Promise<void> {
    await deleteSpace(spaceKey)
    if (currentView.value.startsWith(`team:${spaceKey}:`)) {
      handleViewChange('my-issues')
    }
  }
  function openGlobalCreate(issueType = 'Task') {
    createIssueType.value = issueType
    createParentKey.value = null
    issueTypeLocked.value = false
    parentLocked.value = false
    isCreateModalOpen.value = true
  }
  function openChildCreate(parentKey: string) {
    createIssueType.value = ''
    createParentKey.value = parentKey
    issueTypeLocked.value = false
    parentLocked.value = true
    isCreateModalOpen.value = true
  }
  function closeCreateModal() {
    isCreateModalOpen.value = false
  }
  function handleTicketCreated(ticketKey: string, keepOpen = false) {
    if (keepOpen) {
      prefetchTicket(ticketKey)
      return
    }
    isCreateModalOpen.value = false
    openTicket(ticketKey)
  }
  function openCommandMenu(initialQuery = '') {
    closeCustomViewContextMenu()
    commandQuery.value = initialQuery
    commandActiveIndex.value = 0
    commandMenuOpen.value = true
    displayOptionsOpen.value = false
    closeFilterMenu()
  }
  function closeCommandMenu() {
    commandMenuOpen.value = false
    commandQuery.value = ''
    commandActiveIndex.value = 0
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
  function runCommandItem(item: CommandMenuItem) {
    closeCommandMenu()
    item.execute()
  }
  function runActiveCommand() {
    const item = commandItems.value[commandActiveIndex.value]
    if (!item)
      return
    runCommandItem(item)
  }
  function moveCommandSelection(delta: number) {
    const itemCount = commandItems.value.length
    if (itemCount === 0)
      return
    commandActiveIndex.value = (commandActiveIndex.value + delta + itemCount) % itemCount
  }
  function getIssueSectionCollapseId(section: IssueSection): string {
    return `${currentView.value}:${listGrouping.value}:${section.id}`
  }
  function isIssueSectionCollapsed(section: IssueSection): boolean {
    if (!shouldShowIssueSectionHeader())
      return false
    return collapsedIssueSectionIds.value.includes(getIssueSectionCollapseId(section))
  }
  function shouldShowIssueSectionHeader(): boolean {
    return listGrouping.value !== 'none' && currentView.value !== 'search'
  }
  function toggleIssueSection(section: IssueSection) {
    const sectionId = getIssueSectionCollapseId(section)
    collapsedIssueSectionIds.value = isIssueSectionCollapsed(section)
      ? collapsedIssueSectionIds.value.filter(id => id !== sectionId)
      : [...collapsedIssueSectionIds.value, sectionId]
  }
  function getExpandedSectionTickets(section: IssueSection): JiraTicket[] {
    return isIssueSectionCollapsed(section) ? [] : section.tickets
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
  function getFlatVisibleTickets(): JiraTicket[] {
    return issueSections.value.flatMap(getExpandedSectionTickets)
  }
  function openRelativeVisibleTicket(delta: number, extendSelection = false) {
    const flatTickets = getFlatVisibleTickets()
    if (!flatTickets.length)
      return
    const currentKey = selectedKey.value || focusedIssueKey.value
    const currentIndex = currentKey
      ? flatTickets.findIndex(ticket => getDisplayedIssueRowKey(ticket) === currentKey)
      : -1
    const nextIndex
      = currentIndex === -1
        ? delta > 0
          ? 0
          : flatTickets.length - 1
        : Math.min(flatTickets.length - 1, Math.max(0, currentIndex + delta))
    const nextTicket = flatTickets[nextIndex]
    if (!nextTicket)
      return
    if (selectedKey.value) {
      openTicket(getDisplayedIssueRowKey(nextTicket))
      return
    }
    if (extendSelection) {
      const nextTicketKey = getDisplayedIssueRowKey(nextTicket)
      const anchorKey
        = selectionAnchorKey.value ?? focusedIssueKey.value ?? currentKey ?? nextTicketKey
      selectionAnchorKey.value = anchorKey
      addCheckedIssueRange(anchorKey, nextTicketKey)
    }
    focusedIssueKey.value = getDisplayedIssueRowKey(nextTicket)
  }
  function handleCommandMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveCommandSelection(1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveCommandSelection(-1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      runActiveCommand()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeCommandMenu()
    }
  }
  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented)
      return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      openCommandMenu()
      return
    }
    if (displayOptionsOpen.value && event.key === 'Escape') {
      event.preventDefault()
      if (groupOrderingOpen.value) {
        closeGroupOrdering()
        return
      }
      closeDisplayOptions()
      return
    }
    if (filterMenuOpen.value && event.key === 'Escape') {
      event.preventDefault()
      closeFilterMenu()
      return
    }
    if (commandMenuOpen.value) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeCommandMenu()
      }
      return
    }
    if (currentView.value === 'search' && event.key === 'Escape' && event.target === searchInputRef.value) {
      event.preventDefault()
      closeSearchView()
      return
    }
    if (isCreateModalOpen.value || isEditableTarget(event.target)) {
      return
    }
    const key = event.key.toLowerCase()
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
    if (key === 'g') {
      pendingGotoKey.value = true
      window.setTimeout(() => {
        pendingGotoKey.value = false
      }, 1200)
      return
    }
    if (key === '/') {
      event.preventDefault()
      handleViewChange('search')
      return
    }
    if (key === 'c') {
      event.preventDefault()
      openGlobalCreate()
      return
    }
    if (key === 'x') {
      const firstVisibleTicket = getFlatVisibleTickets()[0]
      const keyToToggle
        = selectedKey.value
          || focusedIssueKey.value
          || (firstVisibleTicket ? getDisplayedIssueRowKey(firstVisibleTicket) : null)
      if (!keyToToggle)
        return
      event.preventDefault()
      if (event.shiftKey) {
        const anchorKey = selectionAnchorKey.value ?? keyToToggle
        selectionAnchorKey.value = anchorKey
        addCheckedIssueRange(anchorKey, keyToToggle)
      }
      else {
        toggleCheckedIssue(keyToToggle)
      }
      return
    }
    if (key === 'j' || key === 'arrowdown') {
      event.preventDefault()
      openRelativeVisibleTicket(1, event.shiftKey)
      return
    }
    if (key === 'k' || key === 'arrowup') {
      event.preventDefault()
      openRelativeVisibleTicket(-1, event.shiftKey)
      return
    }
    if (key === 'enter' && !selectedKey.value) {
      const firstVisibleTicket = getFlatVisibleTickets()[0]
      const keyToOpen
        = focusedIssueKey.value
          ?? (firstVisibleTicket ? getDisplayedIssueRowKey(firstVisibleTicket) : null)
      if (!keyToOpen)
        return
      event.preventDefault()
      openTicket(keyToOpen)
      return
    }
    if (key === 'escape' && checkedIssueCount.value > 0) {
      event.preventDefault()
      clearCheckedIssues()
    }
  }
  async function handleRefresh() {
    await refresh()
    if (selectedKey.value) {
      queryClient.invalidateQueries({
        queryKey: ticketQueryKey(selectedKey.value),
      })
    }
  }
  watch(sidebarCollapsed, (isCollapsed) => {
    if (isCollapsed) {
      stopSidebarResize()
    }
  })
  watch(
    currentView,
    (view, previousView) => {
      if (previousView && previousView !== 'search') {
        lastNonSearchView.value = previousView
      }
      if (view !== 'search') {
        lastNonSearchView.value = view
        return
      }
      focusSearchInputWhenReady()
    },
    { flush: 'post' },
  )
  let stopNavigationHistoryAfterEach: (() => void) | null = null
  onMounted(() => {
    window.addEventListener('pointermove', handleSidebarResize)
    window.addEventListener('pointerup', handleSidebarResizeEnd)
    window.addEventListener('pointercancel', handleSidebarResizeEnd)
    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
    document.addEventListener('keydown', handleGlobalKeydown, true)
    window.addEventListener('popstate', syncNavigationHistoryState)
    stopNavigationHistoryAfterEach = router.afterEach(syncNavigationHistoryState)
    // Ensure the initial entry carries an explicit `?view=` so back/forward restore
    // the exact view rather than falling back to the latest persisted value.
    if (typeof route.query.view !== 'string' || route.query.view.length === 0) {
      void navigateTo(
        { path: route.path, query: { ...route.query, view: persistedView.value } },
        { replace: true },
      )
    }
    syncNavigationHistoryState()
  })
  onBeforeUnmount(() => {
    stopSidebarResize()
    window.removeEventListener('pointermove', handleSidebarResize)
    window.removeEventListener('pointerup', handleSidebarResizeEnd)
    window.removeEventListener('pointercancel', handleSidebarResizeEnd)
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
    document.removeEventListener('keydown', handleGlobalKeydown, true)
    window.removeEventListener('popstate', syncNavigationHistoryState)
    stopNavigationHistoryAfterEach?.()
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
