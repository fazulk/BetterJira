import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

interface CustomViewContextMenuState {
  open: boolean
  viewId: string
  x: number
  y: number
}

interface UseTicketListMenusDeps {
  displayOptionsOpen: Ref<boolean>
  groupOrderingOpen: Ref<boolean>
  filterMenuOpen: Ref<boolean>
  customViewContextMenu: Ref<CustomViewContextMenuState>
  closeFilterMenu: () => void
  closeCustomViewContextMenu: () => void
}

export function useTicketListMenus(deps: UseTicketListMenusDeps) {
  function openGroupOrdering() {
    deps.groupOrderingOpen.value = true
  }
  function closeGroupOrdering() {
    deps.groupOrderingOpen.value = false
  }
  function closeDisplayOptions() {
    deps.displayOptionsOpen.value = false
    deps.groupOrderingOpen.value = false
  }
  function toggleDisplayOptions() {
    deps.closeCustomViewContextMenu()
    if (!deps.displayOptionsOpen.value) {
      deps.closeFilterMenu()
      deps.groupOrderingOpen.value = false
    }
    deps.displayOptionsOpen.value = !deps.displayOptionsOpen.value
  }
  function handleDocumentPointerDown(event: PointerEvent) {
    const target = event.target
    if (!(target instanceof Node))
      return
    const clickedMenu = target instanceof Element ? target.closest('[data-ticket-list-menu]') : null
    const clickedMenuName = clickedMenu?.getAttribute('data-ticket-list-menu')

    if (deps.customViewContextMenu.value.open && clickedMenuName !== 'custom-view-context') {
      deps.closeCustomViewContextMenu()
    }
    if (deps.displayOptionsOpen.value) {
      if (clickedMenuName === 'display-options') {
        return
      }
      closeDisplayOptions()
    }
    if (deps.filterMenuOpen.value) {
      if (clickedMenuName === 'filters') {
        return
      }
      deps.closeFilterMenu()
    }
  }

  onMounted(() => {
    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  })

  return {
    openGroupOrdering,
    closeGroupOrdering,
    closeDisplayOptions,
    toggleDisplayOptions,
  }
}
