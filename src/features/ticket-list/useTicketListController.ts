import type { ComponentPublicInstance } from 'vue'
import type {
  IssueRowDisplayProps,
  SearchResultTab,
  ViewTab,
} from './types'
import type {
  CustomView,
  CustomViewDisplay,
} from '~/shared/settings'
import { useQueryClient } from '@tanstack/vue-query'
import { useLocalStorage } from '@vueuse/core'
import { computed, ref, watch, watchEffect } from 'vue'
import { ticketQueryKey, transitionsQueryKey } from '@/composables/queryKeys'
import { useCustomViews } from '@/composables/useCustomViews'
import { useFavoriteViews as usePersistedFavoriteViews } from '@/composables/useFavoriteViews'
import { useJiraCurrentUser } from '@/composables/useJiraCurrentUser'
import { ticketActivityQueryKey, ticketMessagesQueryKey } from '@/composables/useJiraMessages'
import { useJiraTickets } from '@/composables/useJiraTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { useStatusPreferences } from '@/composables/useStatusPreferences'
import { ticketDevStatusQueryKey } from '@/composables/useTicketDevStatus'
import { useViewOverrides } from '@/composables/useViewOverrides'
import { useCommandMenu } from '@/features/ticket-list/useCommandMenu'
import { useCustomViewDirectory } from '@/features/ticket-list/useCustomViewDirectory'
import { useFavoriteViews } from '@/features/ticket-list/useFavoriteViews'
import { useFilterMenu } from '@/features/ticket-list/useFilterMenu'
import { useIssueGrouping } from '@/features/ticket-list/useIssueGrouping'
import { useIssueSelection } from '@/features/ticket-list/useIssueSelection'
import { useProjectSections } from '@/features/ticket-list/useProjectSections'
import { useSidebarResize } from '@/features/ticket-list/useSidebarResize'
import { useTicketListKeyboard } from '@/features/ticket-list/useTicketListKeyboard'
import { useTicketListMenus } from '@/features/ticket-list/useTicketListMenus'
import { useTicketNavigation } from '@/features/ticket-list/useTicketNavigation'
import { useTicketRows } from '@/features/ticket-list/useTicketRows'
import { useTicketSearch } from '@/features/ticket-list/useTicketSearch'
import { useTicketVisibility } from '@/features/ticket-list/useTicketVisibility'
import { useViewContext } from '@/features/ticket-list/useViewContext'
import { useViewEditor } from '@/features/ticket-list/useViewEditor'
import { useViewFilters } from '@/features/ticket-list/useViewFilters'
import { useViewStatePersistence } from '@/features/ticket-list/useViewStatePersistence'
import {
  initiativeMatchesFilter,
  savedViewMatchesFilter,
} from './filterEngine'
import {
  createRowFieldVisibility,
  getDisplayedIssueRowKey,
  getInitiativeGridTemplate,
  getIssueGroupMarkerClass,
  getProgressBarClass,
  getProjectGridTemplate,
  getProjectHealthClass,
  getRelativeTimeLabel,
  getSavedViewGridTemplate,
  getTeamViewId,
  isEpicIssue,
  isInitiativeIssue,
  sortTicketsByActivity as sortTicketsByActivityHelper,
} from './helpers'
import {
  dateFilterFields,
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
  const displayOptionsOpen = ref(false)
  const groupOrderingOpen = ref(false)
  const hasFinishedInitialWorkspaceLoad = ref(false)
  const searchInputRef = ref<HTMLInputElement | null>(null)
  function setSearchInputRef(element: Element | ComponentPublicInstance | null): void {
    searchInputRef.value = element instanceof HTMLInputElement ? element : null
  }
  const pendingGotoKey = ref(false)
  const searchResultTab = useLocalStorage<SearchResultTab>('jira2.linear.searchTab', 'all')
  type ViewEditorMode = 'create' | 'edit'
  const viewEditorMode = ref<ViewEditorMode | null>(null)
  const viewEditorDraft = ref<CustomView | null>(null)
  const viewEditorPreviousViewId = ref<string | null>(null)
  const viewEditorPreviousDisplay = ref<CustomViewDisplay | null>(null)
  const customViewContextMenu = ref({ open: false, viewId: '', x: 0, y: 0 })
  function closeCustomViewContextMenu(): void {
    customViewContextMenu.value = {
      ...customViewContextMenu.value,
      open: false,
    }
  }
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
  const {
    activeBaseViewId,
    contextKeyForCurrentView,
    supportsCustomViews,
    currentTeamKey,
    currentTeamName,
    currentTeamSection,
    currentTeamAppearance,
    currentTeamSectionLabel,
    isViewsDirectory,
    activeViewsDirectoryTab,
    isProjectDisplayView,
    isInitiativeDisplayView,
    isTeamSettingsView,
    isIssueDisplayView,
    viewTitle,
    scopedTickets,
    isMyIssuesView,
  } = useViewContext({
    currentView,
    selectedTicket,
    viewEditorDraft,
    getCustomView,
    enabledSpaces,
    issueTickets,
  })
  const issueRowDisplayProps = computed<IssueRowDisplayProps>(() => ({
    showId: isIssueRowFieldVisible('id'),
    showStatus: isIssueRowFieldVisible('status'),
    showLabels: isIssueRowFieldVisible('labels'),
    showPriority: isIssueRowFieldVisible('priority'),
    showStoryPoints: isIssueRowFieldVisible('storyPoints'),
    showAssignee: isIssueRowFieldVisible('assignee'),
    showCreated: isIssueRowFieldVisible('created'),
    showUpdated: isIssueRowFieldVisible('updated'),
    showDue: isIssueRowFieldVisible('due'),
    showParent: isIssueRowFieldVisible('project'),
  }))
  const projectGridTemplate = computed(() => getProjectGridTemplate(isProjectRowFieldVisible))
  const initiativeGridTemplate = computed(() => getInitiativeGridTemplate(isInitiativeRowFieldVisible))
  const savedViewGridTemplate = computed(() => getSavedViewGridTemplate(isSavedViewRowFieldVisible))
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
  const {
    applyViewFiltersToTickets,
    ticketMatchesFilter,
    applyViewFiltersToProjects,
    projectMatchesFilter,
    applyProjectClosedRange,
    applyViewFiltersToInitiatives,
    applyViewFiltersToSavedViews,
    isFilterClauseSelected,
    toggleFilterClause,
    removeFilterClause,
    clearCurrentViewFilters,
  } = useViewFilters({
    currentView,
    currentViewFilters,
    currentUserName,
    getProjectKey,
    getTicketProject,
    getTicketInitiativeIds,
    getProjectTeamFilterEntries,
    projectClosedRange,
    isDateVisibleInRange,
    viewEditorDraft,
    getDefaultDisplayForView,
    persistViewStateForView,
    captureDisplay,
    applyDisplay,
    withViewDisplaySyncSuppressed,
    removeViewOverride,
  })
  const activeViewIsCustomView = computed(() => getCustomView(currentView.value) !== null)
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
  const {
    baseDisplayedProjectRows,
    projectSections,
    visibleProjectCount,
    resetProjectDisplayOptions,
    isProjectSectionCollapsed,
    toggleProjectSection,
  } = useProjectSections({
    projectRows,
    currentTeamKey,
    currentTeamSection,
    currentView,
    projectGrouping,
    projectOrdering,
    projectClosedRange,
    collapsedProjectSectionIds,
    visibleProjectRowFields,
    currentViewFilters,
    applyViewFiltersToProjects,
    applyProjectClosedRange,
    getDefaultDisplayForView,
    persistViewStateForView,
    captureDisplay,
  })
  const {
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
    activeFilterOptions,
    activeDateFilterOptions,
    removeActiveFilterChip,
    openFilterMenu,
    closeFilterMenu,
    toggleFilterMenu,
  } = useFilterMenu({
    currentView,
    currentViewFilters,
    isProjectDisplayView,
    isIssueDisplayView,
    isViewsDirectory,
    scopedTickets,
    projectRows,
    baseDisplayedProjectRows,
    baseInitiativeRows,
    baseDisplayedSavedViewRows,
    currentUserName,
    completedRange,
    showSubIssuesRange,
    showTriageIssuesRange,
    projectClosedRange,
    filterTicketsForCurrentView,
    getProjectKey,
    getProjectTeamFilterEntries,
    getDefaultFiltersForView,
    getDefaultDisplayForView,
    captureDisplay,
    removeFilterClause,
    closeCustomViewContextMenu,
    displayOptionsOpen,
  })
  const {
    openGroupOrdering,
    closeGroupOrdering,
    closeDisplayOptions,
    toggleDisplayOptions,
  } = useTicketListMenus({
    displayOptionsOpen,
    groupOrderingOpen,
    filterMenuOpen,
    customViewContextMenu,
    closeFilterMenu,
    closeCustomViewContextMenu,
  })
  const initiativeRows = computed(() => applyViewFiltersToInitiatives(baseInitiativeRows.value))
  const {
    issueSearch,
    normalizedIssueSearch,
    searchedTickets,
    searchedProjectRows,
    searchedInitiativeRows,
    searchTabs,
  } = useTicketSearch({
    currentView,
    scopedTickets,
    issueTickets,
    projectRows,
    initiativeRows,
    showSubIssues,
    filterTicketsForCurrentView,
    ticketMatchesQuery,
    applyViewFiltersToTickets,
    hideSubIssuesWithVisibleParents,
    applyViewFiltersToProjects,
    applyViewFiltersToInitiatives,
  })
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
    resetIssueDisplayOptions,
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
    visibleIssueRowFields,
    completedRange,
    currentViewFilters,
    statusPreferences,
    filterTicketsForCurrentViewWithoutCompletedRange,
    ticketMatchesQuery,
    applyViewFiltersToTickets,
    isCompletedIssueVisible,
    normalizedIssueSearch,
    getDefaultDisplayForView,
    persistViewStateForView,
    captureDisplay,
  })
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
    startCreateView,
    saveViewEditor,
    cancelViewEditor,
    discardViewEditorAndSwitch,
    updateViewEditorName,
    updateViewEditorDescription,
    updateViewEditorIcon,
    updateViewEditorColor,
    saveCurrentViewFilters,
    saveCurrentViewChangesToThisView,
    openViewEditorFilters,
    openViewEditorSettings,
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
  function openCommandMenu(initialQuery = '') {
    closeCustomViewContextMenu()
    commandQuery.value = initialQuery
    commandActiveIndex.value = 0
    commandMenuOpen.value = true
    displayOptionsOpen.value = false
    closeFilterMenu()
  }
  useTicketListKeyboard({
    currentView,
    selectedKey,
    focusedIssueKey,
    selectionAnchorKey,
    checkedIssueCount,
    pendingGotoKey,
    displayOptionsOpen,
    groupOrderingOpen,
    filterMenuOpen,
    commandMenuOpen,
    isCreateModalOpen,
    searchInputRef,
    openCommandMenu,
    closeGroupOrdering,
    closeDisplayOptions,
    closeFilterMenu,
    closeCommandMenu,
    closeSearchView,
    closeTicket,
    openSettings,
    handleViewChange,
    openGlobalCreate,
    getFlatVisibleTickets,
    addCheckedIssueRange,
    toggleCheckedIssue,
    openRelativeVisibleTicket,
    openTicket,
    clearCheckedIssues,
  })
  async function handleRefresh() {
    await refresh()
    const key = selectedKey.value
    if (key) {
      const ticketQueryKeys = [
        ticketQueryKey(key),
        ticketMessagesQueryKey(key),
        ticketActivityQueryKey(key),
        ticketDevStatusQueryKey(key),
        transitionsQueryKey(key),
      ]
      for (const queryKey of ticketQueryKeys) {
        void queryClient.invalidateQueries({ queryKey })
      }
    }
  }
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
    getSavedViewGridTemplate,
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
