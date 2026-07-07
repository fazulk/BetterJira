import type { Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface SidebarResizeDeps {
  sidebarCollapsed: Ref<boolean>
}

/**
 * Sidebar width persistence + pointer-driven resize interaction. Owns the
 * persisted width ref (clamped on load), the drag state, and the window
 * pointer listeners used while dragging.
 */
export function useSidebarResize(deps: SidebarResizeDeps) {
  const { sidebarCollapsed } = deps
  const defaultSidebarWidth = 300
  const minSidebarWidth = 208
  const maxSidebarWidth = 360
  const sidebarWidth = useLocalStorage('jira2.sidebar.width', defaultSidebarWidth)
  const isResizingSidebar = ref(false)
  const activePointerId = ref<number | null>(null)
  if (typeof sidebarWidth.value !== 'number' || Number.isNaN(sidebarWidth.value)) {
    sidebarWidth.value = defaultSidebarWidth
  }
  sidebarWidth.value = Math.min(maxSidebarWidth, Math.max(minSidebarWidth, sidebarWidth.value))
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
  watch(sidebarCollapsed, (isCollapsed) => {
    if (isCollapsed) {
      stopSidebarResize()
    }
  })
  onMounted(() => {
    window.addEventListener('pointermove', handleSidebarResize)
    window.addEventListener('pointerup', handleSidebarResizeEnd)
    window.addEventListener('pointercancel', handleSidebarResizeEnd)
  })
  onBeforeUnmount(() => {
    stopSidebarResize()
    window.removeEventListener('pointermove', handleSidebarResize)
    window.removeEventListener('pointerup', handleSidebarResizeEnd)
    window.removeEventListener('pointercancel', handleSidebarResizeEnd)
  })
  return {
    sidebarWidth,
    startSidebarResize,
  }
}
