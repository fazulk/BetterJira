import type { ComputedRef, Ref } from 'vue'
import type { JiraTicket } from '@/types/jira'
import { onBeforeUnmount, onMounted } from 'vue'
import { getDisplayedIssueRowKey, isEditableTarget } from './helpers'

interface UseTicketListKeyboardDeps {
  currentView: Ref<string>
  selectedKey: ComputedRef<string | null>
  focusedIssueKey: Ref<string | null>
  selectionAnchorKey: Ref<string | null>
  checkedIssueCount: ComputedRef<number>
  pendingGotoKey: Ref<boolean>
  displayOptionsOpen: Ref<boolean>
  groupOrderingOpen: Ref<boolean>
  filterMenuOpen: Ref<boolean>
  commandMenuOpen: Ref<boolean>
  isCreateModalOpen: Ref<boolean>
  searchInputRef: Ref<HTMLInputElement | null>
  openCommandMenu: () => void
  closeGroupOrdering: () => void
  closeDisplayOptions: () => void
  closeFilterMenu: () => void
  closeCommandMenu: () => void
  closeSearchView: () => void
  closeTicket: () => void
  openSettings: () => void
  handleViewChange: (viewId: string) => void
  openGlobalCreate: () => void
  getFlatVisibleTickets: () => JiraTicket[]
  addCheckedIssueRange: (fromKey: string, toKey: string) => void
  toggleCheckedIssue: (issueKey: string) => void
  openRelativeVisibleTicket: (delta: number, extendSelection?: boolean) => void
  openTicket: (ticketKey: string) => void
  clearCheckedIssues: () => void
}

export function useTicketListKeyboard(deps: UseTicketListKeyboardDeps) {
  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented)
      return

    const key = event.key.toLowerCase()
    if ((event.metaKey || event.ctrlKey) && key === 'k') {
      event.preventDefault()
      deps.openCommandMenu()
      return
    }
    if (deps.displayOptionsOpen.value && key === 'escape') {
      event.preventDefault()
      if (deps.groupOrderingOpen.value) {
        deps.closeGroupOrdering()
        return
      }
      deps.closeDisplayOptions()
      return
    }
    if (deps.filterMenuOpen.value && key === 'escape') {
      event.preventDefault()
      deps.closeFilterMenu()
      return
    }
    if (deps.commandMenuOpen.value) {
      if (key === 'escape') {
        event.preventDefault()
        deps.closeCommandMenu()
      }
      return
    }
    if (deps.currentView.value === 'search' && key === 'escape' && event.target === deps.searchInputRef.value) {
      event.preventDefault()
      deps.closeSearchView()
      return
    }
    if (deps.isCreateModalOpen.value || isEditableTarget(event.target)) {
      return
    }
    if (deps.selectedKey.value) {
      if (key === 'escape') {
        event.preventDefault()
        deps.closeTicket()
      }
      return
    }
    if (deps.pendingGotoKey.value) {
      deps.pendingGotoKey.value = false
      if (key === 's') {
        event.preventDefault()
        deps.openSettings()
      }
      return
    }
    if (deps.currentView.value === 'search' && key === 'escape') {
      event.preventDefault()
      deps.closeSearchView()
      return
    }

    function getFallbackVisibleIssueKey(): string | null {
      const firstVisibleTicket = deps.getFlatVisibleTickets()[0]
      return firstVisibleTicket ? getDisplayedIssueRowKey(firstVisibleTicket) : null
    }

    const keyHandlers: Array<{ match: () => boolean, run: () => void }> = [
      {
        match: () => key === 'g',
        run: () => {
          deps.pendingGotoKey.value = true
          window.setTimeout(() => {
            deps.pendingGotoKey.value = false
          }, 1200)
        },
      },
      {
        match: () => key === '/',
        run: () => deps.handleViewChange('search'),
      },
      {
        match: () => key === 'c',
        run: () => deps.openGlobalCreate(),
      },
      {
        match: () => key === 'x' && (deps.selectedKey.value || deps.focusedIssueKey.value || getFallbackVisibleIssueKey()) !== null,
        run: () => {
          const keyToToggle = deps.selectedKey.value || deps.focusedIssueKey.value || getFallbackVisibleIssueKey()
          if (!keyToToggle)
            return
          if (event.shiftKey) {
            const anchorKey = deps.selectionAnchorKey.value ?? keyToToggle
            deps.selectionAnchorKey.value = anchorKey
            deps.addCheckedIssueRange(anchorKey, keyToToggle)
            return
          }
          deps.toggleCheckedIssue(keyToToggle)
        },
      },
      {
        match: () => key === 'j' || key === 'arrowdown',
        run: () => deps.openRelativeVisibleTicket(1, event.shiftKey),
      },
      {
        match: () => key === 'k' || key === 'arrowup',
        run: () => deps.openRelativeVisibleTicket(-1, event.shiftKey),
      },
      {
        match: () => key === 'enter' && (deps.focusedIssueKey.value ?? getFallbackVisibleIssueKey()) !== null,
        run: () => {
          const keyToOpen = deps.focusedIssueKey.value ?? getFallbackVisibleIssueKey()
          if (keyToOpen) {
            deps.openTicket(keyToOpen)
          }
        },
      },
      {
        match: () => key === 'escape' && deps.checkedIssueCount.value > 0,
        run: () => deps.clearCheckedIssues(),
      },
    ]

    const handler = keyHandlers.find(candidate => candidate.match())
    if (!handler)
      return
    event.preventDefault()
    handler.run()
  }

  onMounted(() => {
    document.addEventListener('keydown', handleGlobalKeydown, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleGlobalKeydown, true)
  })
}
