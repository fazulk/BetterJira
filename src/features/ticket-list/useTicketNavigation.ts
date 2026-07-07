import type { QueryClient } from '@tanstack/vue-query'
import type { ComputedRef, Ref } from 'vue'
import type { JiraTicket } from '@/types/jira'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fetchTicket } from '@/api/jira'
import { fetchLocalTicket } from '@/api/localTickets'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { isLocalTicketKey } from '~/shared/localTickets'
import { getDisplayedIssueRowKey, isTeamViewForTeam } from './helpers'

interface RouterLike {
  back: () => void
  forward: () => void
  afterEach: (callback: () => void) => () => void
}

interface RouteLike {
  path: string
  query: Record<string, string | (string | null)[] | null | undefined>
}

interface UseTicketNavigationDeps {
  queryClient: QueryClient
  router: RouterLike
  route: RouteLike
  persistedView: Ref<string>
  currentView: Ref<string>
  selectedKey: Ref<string | null>
  focusedIssueKey: Ref<string | null>
  checkedIssues: ComputedRef<JiraTicket[]>
  clearCheckedIssues: () => void
  issueSections: ComputedRef<{ tickets: JiraTicket[] }[]>
  getFlatVisibleTickets: () => JiraTicket[]
  selectionAnchorKey: Ref<string | null>
  addCheckedIssueRange: (fromKey: string, toKey: string) => void
  viewEditorMode: Ref<string | null>
  discardViewEditorAndSwitch: (viewId: string) => void
  searchResultTab: Ref<string>
  searchInputRef: Ref<HTMLInputElement | null>
  openCommandMenu: () => void
  closeCustomViewContextMenu: () => void
  deleteSpace: (spaceKey: string) => Promise<void>
}

export function useTicketNavigation(deps: UseTicketNavigationDeps) {
  const canGoBack = ref(false)
  const canGoForward = ref(false)
  const isCreateModalOpen = ref(false)
  const isAddSpaceModalOpen = ref(false)
  const createIssueType = ref('Task')
  const createParentKey = ref<string | null>(null)
  const issueTypeLocked = ref(false)
  const parentLocked = ref(false)
  const lastNonSearchView = ref(deps.currentView.value === 'search' ? 'my-issues' : deps.currentView.value)

  function syncNavigationHistoryState(): void {
    const state: unknown = window.history.state
    canGoBack.value = typeof state === 'object' && state !== null && 'back' in state && state.back != null
    canGoForward.value = typeof state === 'object' && state !== null && 'forward' in state && state.forward != null
  }
  function goBack(): void {
    if (canGoBack.value) {
      deps.router.back()
    }
  }
  function goForward(): void {
    if (canGoForward.value) {
      deps.router.forward()
    }
  }
  function prefetchTicket(ticketKey: string) {
    if (isLocalTicketKey(ticketKey)) {
      void deps.queryClient.prefetchQuery({
        queryKey: localTicketQueryKey(ticketKey),
        queryFn: () => fetchLocalTicket(ticketKey),
      })
      return
    }
    void deps.queryClient.prefetchQuery({
      queryKey: ticketQueryKey(ticketKey),
      queryFn: () => fetchTicket(ticketKey),
    })
  }
  function openTicket(ticketKey: string) {
    deps.focusedIssueKey.value = ticketKey
    if (deps.selectedKey.value === ticketKey)
      return
    deps.selectedKey.value = ticketKey
  }
  function closeTicket() {
    if (deps.selectedKey.value === null)
      return
    deps.selectedKey.value = null
  }
  function openFirstCheckedIssue() {
    const firstIssue = deps.checkedIssues.value[0]
    if (!firstIssue)
      return
    openTicket(firstIssue.key)
  }
  function openSettings() {
    void navigateTo('/settings')
  }
  function focusSearchInputWhenReady(): void {
    nextTick(() => {
      if (deps.currentView.value === 'search') {
        deps.searchInputRef.value?.focus()
      }
    })
  }
  function closeSearchView(): void {
    if (deps.currentView.value !== 'search')
      return
    handleViewChange(lastNonSearchView.value)
  }
  function handleViewChange(viewId: string) {
    if (viewId === 'command') {
      deps.openCommandMenu()
      return
    }
    if (viewId === 'create') {
      openGlobalCreate()
      return
    }
    if (viewId === 'search') {
      deps.searchResultTab.value = 'all'
      focusSearchInputWhenReady()
    }
    if (deps.viewEditorMode.value) {
      deps.discardViewEditorAndSwitch(viewId)
      deps.focusedIssueKey.value = null
      deps.clearCheckedIssues()
      closeTicket()
      return
    }
    deps.currentView.value = viewId
    deps.focusedIssueKey.value = null
    deps.clearCheckedIssues()
    closeTicket()
  }
  function handleFavoriteViewChange(viewId: string) {
    // Restoring filters is owned by the caller; this function is patched by the controller wrapper.
    handleViewChange(viewId)
  }
  function openAddSpaceModal(): void {
    isAddSpaceModalOpen.value = true
  }
  function closeAddSpaceModal(): void {
    isAddSpaceModalOpen.value = false
  }
  async function handleLeaveSpace(spaceKey: string): Promise<void> {
    await deps.deleteSpace(spaceKey)
    if (isTeamViewForTeam(deps.currentView.value, spaceKey)) {
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
  function openRelativeVisibleTicket(delta: number, extendSelection = false) {
    const flatTickets = deps.getFlatVisibleTickets()
    if (!flatTickets.length)
      return
    const currentKey = deps.selectedKey.value || deps.focusedIssueKey.value
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
    if (deps.selectedKey.value) {
      openTicket(getDisplayedIssueRowKey(nextTicket))
      return
    }
    if (extendSelection) {
      const nextTicketKey = getDisplayedIssueRowKey(nextTicket)
      const anchorKey
        = deps.selectionAnchorKey.value ?? deps.focusedIssueKey.value ?? currentKey ?? nextTicketKey
      deps.selectionAnchorKey.value = anchorKey
      deps.addCheckedIssueRange(anchorKey, nextTicketKey)
    }
    deps.focusedIssueKey.value = getDisplayedIssueRowKey(nextTicket)
  }

  watch(
    deps.currentView,
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
    window.addEventListener('popstate', syncNavigationHistoryState)
    stopNavigationHistoryAfterEach = deps.router.afterEach(syncNavigationHistoryState)
    if (typeof deps.route.query.view !== 'string' || deps.route.query.view.length === 0) {
      void navigateTo(
        { path: deps.route.path, query: { ...deps.route.query, view: deps.persistedView.value } },
        { replace: true },
      )
    }
    syncNavigationHistoryState()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('popstate', syncNavigationHistoryState)
    stopNavigationHistoryAfterEach?.()
  })

  return {
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
    lastNonSearchView,
    prefetchTicket,
    openTicket,
    closeTicket,
    openFirstCheckedIssue,
    openSettings,
    focusSearchInputWhenReady,
    closeSearchView,
    handleViewChange,
    handleFavoriteViewChange,
    openAddSpaceModal,
    closeAddSpaceModal,
    handleLeaveSpace,
    openGlobalCreate,
    openChildCreate,
    closeCreateModal,
    handleTicketCreated,
    openRelativeVisibleTicket,
  }
}
