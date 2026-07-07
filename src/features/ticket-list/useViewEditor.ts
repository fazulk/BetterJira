import type { Ref } from 'vue'
import type { ViewFilterClause, ViewTab } from './types'
import type { CustomView, CustomViewDisplay, FavoriteViewFilter, UpdateSidebarSettingsInput, ViewOverride } from '~/shared/settings'
import { DEFAULT_CUSTOM_VIEW_COLOR, DEFAULT_CUSTOM_VIEW_ICON } from '~/shared/settings'
import { clausesToCustomViewFilters } from './filterDisplay'
import { getBaseViewIdForCustomContext } from './helpers'
import { copyViewDisplay } from './viewDisplay'

type ViewEditorMode = 'create' | 'edit'

interface UseViewEditorDeps {
  viewEditorMode: Ref<ViewEditorMode | null>
  viewEditorDraft: Ref<CustomView | null>
  viewEditorPreviousViewId: Ref<string | null>
  viewEditorPreviousDisplay: Ref<CustomViewDisplay | null>
  customViewContextMenu: Ref<{ open: boolean, viewId: string, x: number, y: number }>
  customViews: Ref<CustomView[]>
  viewOverrides: Ref<Record<string, ViewOverride>>
  setSidebarSettings: (patch: UpdateSidebarSettingsInput) => void | Promise<void>
  currentView: Ref<string>
  contextKeyForCurrentView: Ref<string | null>
  currentViewFilters: Ref<ViewFilterClause[]>
  captureDisplay: () => CustomViewDisplay
  applyDisplay: (display: CustomViewDisplay) => void
  resolveDisplayForView: (viewId: string) => CustomViewDisplay
  withViewDisplaySyncSuppressed: (callback: () => void) => void
  getCustomView: (viewId: string) => CustomView | null
  isFavoriteView: (viewId: string) => boolean
  toggleFavoriteView: (viewId: string, filters: FavoriteViewFilter[]) => void
  focusedIssueKey: Ref<string | null>
  clearCheckedIssues: () => void
  closeTicket: () => void
  openFilterMenu: () => void
  displayOptionsOpen: Ref<boolean>
  filterMenuOpen: Ref<boolean>
  handleViewChange: (viewId: string) => void
}

export function useViewEditor(deps: UseViewEditorDeps) {
  function copyCustomView(view: CustomView): CustomView {
    return {
      ...view,
      filters: view.filters.map(filter => ({ ...filter })),
      display: copyViewDisplay(view.display),
    }
  }
  function saveCustomViewAndRemoveOverride(view: CustomView): void {
    const savedView = copyCustomView(view)
    const existingIndex = deps.customViews.value.findIndex(existingView => existingView.id === savedView.id)
    const nextCustomViews = existingIndex === -1
      ? [savedView, ...deps.customViews.value]
      : deps.customViews.value.map(existingView => (
          existingView.id === savedView.id ? savedView : existingView
        ))
    const nextViewOverrides = { ...deps.viewOverrides.value }
    delete nextViewOverrides[savedView.id]

    void deps.setSidebarSettings({
      customViews: nextCustomViews,
      viewOverrides: nextViewOverrides,
    })
  }
  function removeCustomViewAndOverride(viewId: string): void {
    const nextViewOverrides = { ...deps.viewOverrides.value }
    delete nextViewOverrides[viewId]

    void deps.setSidebarSettings({
      customViews: deps.customViews.value.filter(view => view.id !== viewId),
      viewOverrides: nextViewOverrides,
    })
  }
  function generateCustomViewId(): string {
    return `custom-view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
  function startCreateView(): void {
    const contextKey = deps.contextKeyForCurrentView.value
    if (!contextKey) {
      return
    }
    const display = deps.captureDisplay()
    deps.viewEditorPreviousViewId.value = deps.currentView.value
    deps.viewEditorPreviousDisplay.value = copyViewDisplay(display)
    deps.viewEditorDraft.value = {
      id: generateCustomViewId(),
      name: '',
      description: '',
      contextKey,
      icon: DEFAULT_CUSTOM_VIEW_ICON,
      color: DEFAULT_CUSTOM_VIEW_COLOR,
      filters: clausesToCustomViewFilters(deps.currentViewFilters.value),
      display: copyViewDisplay(display),
    }
    deps.viewEditorMode.value = 'create'
    deps.currentView.value = deps.viewEditorDraft.value.id
    deps.focusedIssueKey.value = null
    deps.clearCheckedIssues()
    deps.closeTicket()
  }
  function startEditView(viewId: string): void {
    const customView = deps.getCustomView(viewId)
    if (!customView) {
      return
    }
    const display = deps.currentView.value === viewId ? deps.captureDisplay() : customView.display
    deps.viewEditorPreviousViewId.value = deps.currentView.value
    deps.viewEditorPreviousDisplay.value = deps.captureDisplay()
    deps.viewEditorDraft.value = {
      ...copyCustomView(customView),
      display: copyViewDisplay(display),
    }
    deps.viewEditorMode.value = 'edit'
    deps.currentView.value = viewId
    deps.focusedIssueKey.value = null
    deps.clearCheckedIssues()
    deps.closeTicket()
  }
  function finishViewEditor(): void {
    deps.viewEditorMode.value = null
    deps.viewEditorDraft.value = null
    deps.viewEditorPreviousViewId.value = null
    deps.viewEditorPreviousDisplay.value = null
  }
  function saveViewEditor(): void {
    const draft = deps.viewEditorDraft.value
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
      filters: clausesToCustomViewFilters(deps.currentViewFilters.value),
      display: deps.captureDisplay(),
    }
    saveCustomViewAndRemoveOverride(savedView)
    finishViewEditor()
    deps.currentView.value = savedView.id
  }
  function cancelViewEditor(): void {
    const previousViewId = deps.viewEditorPreviousViewId.value
    const previousDisplay = deps.viewEditorPreviousDisplay.value
    deps.withViewDisplaySyncSuppressed(() => {
      if (previousDisplay) {
        deps.applyDisplay(previousDisplay)
      }
      finishViewEditor()
      if (previousViewId) {
        deps.currentView.value = previousViewId
      }
    })
  }
  function discardViewEditorAndSwitch(viewId: string): void {
    deps.withViewDisplaySyncSuppressed(() => {
      finishViewEditor()
      deps.currentView.value = viewId
      deps.applyDisplay(deps.resolveDisplayForView(viewId))
    })
  }
  function activateCustomView(viewId: string): void {
    if (!deps.getCustomView(viewId) && deps.viewEditorDraft.value?.id !== viewId) {
      return
    }
    if (deps.viewEditorMode.value && deps.viewEditorDraft.value?.id !== viewId) {
      discardViewEditorAndSwitch(viewId)
      deps.focusedIssueKey.value = null
      deps.clearCheckedIssues()
      deps.closeTicket()
      return
    }
    deps.currentView.value = viewId
    deps.focusedIssueKey.value = null
    deps.clearCheckedIssues()
    deps.closeTicket()
  }
  function updateViewEditorName(value: string): void {
    if (!deps.viewEditorDraft.value) {
      return
    }
    deps.viewEditorDraft.value = { ...deps.viewEditorDraft.value, name: value }
  }
  function updateViewEditorDescription(value: string): void {
    if (!deps.viewEditorDraft.value) {
      return
    }
    deps.viewEditorDraft.value = { ...deps.viewEditorDraft.value, description: value }
  }
  function updateViewEditorIcon(value: string): void {
    if (!deps.viewEditorDraft.value) {
      return
    }
    deps.viewEditorDraft.value = { ...deps.viewEditorDraft.value, icon: value }
  }
  function updateViewEditorColor(value: string): void {
    if (!deps.viewEditorDraft.value) {
      return
    }
    deps.viewEditorDraft.value = { ...deps.viewEditorDraft.value, color: value }
  }
  function saveCurrentViewFilters() {
    startCreateView()
  }
  function saveCurrentViewChangesToThisView(): void {
    const customView = deps.getCustomView(deps.currentView.value)
    if (!customView) {
      return
    }

    saveCustomViewAndRemoveOverride({
      ...copyCustomView(customView),
      filters: clausesToCustomViewFilters(deps.currentViewFilters.value),
      display: deps.captureDisplay(),
    })
  }
  function openViewEditorFilters(): void {
    deps.openFilterMenu()
  }
  function openViewEditorSettings(): void {
    deps.displayOptionsOpen.value = true
    deps.filterMenuOpen.value = false
  }
  function closeCustomViewContextMenu(): void {
    deps.customViewContextMenu.value = {
      ...deps.customViewContextMenu.value,
      open: false,
    }
  }
  function handleViewTabContextMenu(tab: ViewTab, event: MouseEvent): void {
    if (!tab.custom || tab.draft) {
      closeCustomViewContextMenu()
      return
    }
    deps.customViewContextMenu.value = {
      open: true,
      viewId: tab.id,
      x: event.clientX,
      y: event.clientY,
    }
  }
  function editContextCustomView(): void {
    const viewId = deps.customViewContextMenu.value.viewId
    closeCustomViewContextMenu()
    if (viewId) {
      startEditView(viewId)
    }
  }
  function deleteContextCustomView(): void {
    const viewId = deps.customViewContextMenu.value.viewId
    const customView = deps.getCustomView(viewId)
    closeCustomViewContextMenu()
    if (!customView) {
      return
    }
    if (deps.isFavoriteView(viewId)) {
      deps.toggleFavoriteView(viewId, [])
    }
    removeCustomViewAndOverride(viewId)
    if (deps.viewEditorDraft.value?.id === viewId) {
      finishViewEditor()
    }
    if (deps.currentView.value === viewId) {
      deps.handleViewChange(getBaseViewIdForCustomContext(customView.contextKey))
    }
  }

  return {
    copyCustomView,
    saveCustomViewAndRemoveOverride,
    removeCustomViewAndOverride,
    generateCustomViewId,
    startCreateView,
    startEditView,
    finishViewEditor,
    saveViewEditor,
    cancelViewEditor,
    discardViewEditorAndSwitch,
    activateCustomView,
    updateViewEditorName,
    updateViewEditorDescription,
    updateViewEditorIcon,
    updateViewEditorColor,
    saveCurrentViewFilters,
    saveCurrentViewChangesToThisView,
    openViewEditorFilters,
    openViewEditorSettings,
    closeCustomViewContextMenu,
    handleViewTabContextMenu,
    editContextCustomView,
    deleteContextCustomView,
  }
}
