import type { FavoriteView, FavoriteViewFilter } from '~/shared/settings'
import { computed } from 'vue'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { isRecord } from '~/shared/typeGuards'

function normalizeFavoriteViewList(value: unknown): FavoriteView[] {
  if (!Array.isArray(value)) {
    return []
  }

  const favoriteViewsById = new Map<string, FavoriteView>()

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }

    const recordValue: Record<string, unknown> = entry
    const id = typeof recordValue.id === 'string' ? recordValue.id.trim() : ''

    if (!id || favoriteViewsById.has(id)) {
      continue
    }

    favoriteViewsById.set(id, {
      id,
      filters: normalizeFavoriteViewFilters(recordValue.filters),
      showIssueCount: recordValue.showIssueCount === true,
    })
  }

  return [...favoriteViewsById.values()]
}

function normalizeFavoriteViewFilters(value: unknown): FavoriteViewFilter[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(normalizeFavoriteViewFilter)
    .filter((filter): filter is FavoriteViewFilter => filter !== null)
}

function normalizeFavoriteViewFilter(value: unknown): FavoriteViewFilter | null {
  if (!isRecord(value)) {
    return null
  }

  const recordValue = value
  const id = typeof recordValue.id === 'string' ? recordValue.id.trim() : ''
  const fieldId = typeof recordValue.fieldId === 'string' ? recordValue.fieldId.trim() : ''
  const fieldLabel = typeof recordValue.fieldLabel === 'string' ? recordValue.fieldLabel.trim() : ''
  const filterValue = typeof recordValue.value === 'string' ? recordValue.value.trim() : ''
  const valueLabel = typeof recordValue.valueLabel === 'string' ? recordValue.valueLabel.trim() : ''

  if (!id || !fieldId || !fieldLabel || !filterValue || !valueLabel) {
    return null
  }

  return {
    id,
    fieldId,
    fieldLabel,
    value: filterValue,
    valueLabel,
  }
}

export function useFavoriteViews() {
  const { settings, setSidebarSettings } = useSpaceSettings()
  const favoriteViews = computed<FavoriteView[]>({
    get: () => normalizeFavoriteViewList(settings.value.sidebar.favoriteViews),
    set: (value) => {
      void setSidebarSettings({
        favoriteViews: value,
      })
    },
  })

  const favoriteViewIdSet = computed(() => new Set(favoriteViews.value.map(view => view.id)))

  function isFavoriteView(id: string): boolean {
    return favoriteViewIdSet.value.has(id)
  }

  function getFavoriteView(id: string): FavoriteView | null {
    return favoriteViews.value.find(view => view.id === id) ?? null
  }

  function toggleFavoriteView(id: string, filters: FavoriteViewFilter[]) {
    favoriteViews.value = isFavoriteView(id)
      ? favoriteViews.value.filter(view => view.id !== id)
      : [{ id, filters, showIssueCount: false }, ...favoriteViews.value]
  }

  function setFavoriteViewIssueCountVisible(id: string, visible: boolean): void {
    favoriteViews.value = favoriteViews.value.map(view =>
      view.id === id ? { ...view, showIssueCount: visible } : view,
    )
  }

  return {
    favoriteViews,
    favoriteViewIdSet,
    isFavoriteView,
    getFavoriteView,
    toggleFavoriteView,
    setFavoriteViewIssueCountVisible,
  }
}
