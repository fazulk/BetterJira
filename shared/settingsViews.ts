import type {
  CustomView,
  CustomViewDisplay,
  CustomViewFilter,
  FavoriteView,
  FavoriteViewFilter,
  ViewOverride,
} from './settingsTypes'
import {
  normalizeBoolean,
  normalizeStringList,
  normalizeStringListRecord,
} from './settingsNormalizers'
import { isRecord } from './typeGuards'

export const DEFAULT_CUSTOM_VIEW_ICON = 'layers'
export const DEFAULT_CUSTOM_VIEW_COLOR = '#8f9198'

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

export function normalizeFavoriteViews(value: unknown): FavoriteView[] {
  if (!Array.isArray(value)) {
    return []
  }

  const favoriteViewsById = new Map<string, FavoriteView>()

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const recordValue = entry
    const id = typeof recordValue.id === 'string' ? recordValue.id.trim() : ''

    if (!id || favoriteViewsById.has(id)) {
      continue
    }

    const filters = Array.isArray(recordValue.filters)
      ? recordValue.filters
          .map(normalizeFavoriteViewFilter)
          .filter((filter): filter is FavoriteViewFilter => filter !== null)
      : []

    favoriteViewsById.set(id, {
      id,
      filters,
      showIssueCount: normalizeBoolean(recordValue.showIssueCount, false),
    })
  }

  return [...favoriteViewsById.values()]
}

function getDefaultCustomViewDisplay(): CustomViewDisplay {
  return {
    grouping: 'none',
    ordering: 'manual',
    groupingDirection: 'asc',
    orderingDirection: 'asc',
    completedRange: 'hidden',
    showSubIssuesRange: 'hidden',
    showTriageIssuesRange: 'hidden',
    issueGroupOrders: {},
    hiddenIssueGroupIds: {},
    collapsedIssueSectionIds: [],
    visibleIssueRowFields: ['id', 'status', 'assignee', 'priority', 'project', 'due', 'labels', 'created'],
    visibleProjectRowFields: ['health', 'priority', 'lead', 'targetDate', 'issues', 'status'],
    projectGrouping: 'none',
    projectOrdering: 'manual',
    projectClosedRange: 'hidden',
    collapsedProjectSectionIds: [],
    visibleInitiativeRowFields: ['health', 'lead', 'projects', 'issues', 'updated'],
    visibleSavedViewRowFields: ['owner'],
  }
}

function normalizeDirectionValue(value: unknown): 'asc' | 'desc' {
  return value === 'desc' ? 'desc' : 'asc'
}

function normalizeIssueVisibilityRangeValue(
  value: unknown,
  legacyBooleanValue: unknown,
  defaultValue: string,
): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof legacyBooleanValue === 'boolean') {
    return legacyBooleanValue ? 'all' : 'hidden'
  }
  return defaultValue
}

function normalizeCustomViewDisplay(value: unknown): CustomViewDisplay {
  const defaults = getDefaultCustomViewDisplay()

  if (!isRecord(value)) {
    return defaults
  }

  const recordValue = value
  const visibleIssueRowFields = normalizeStringList(recordValue.visibleIssueRowFields)
  const visibleProjectRowFields = normalizeStringList(recordValue.visibleProjectRowFields)
  const collapsedProjectSectionIds = normalizeStringList(recordValue.collapsedProjectSectionIds)
  const visibleInitiativeRowFields = normalizeStringList(recordValue.visibleInitiativeRowFields)
  const visibleSavedViewRowFields = normalizeStringList(recordValue.visibleSavedViewRowFields)

  return {
    grouping: typeof recordValue.grouping === 'string' && recordValue.grouping.trim() ? recordValue.grouping.trim() : defaults.grouping,
    ordering: typeof recordValue.ordering === 'string' && recordValue.ordering.trim() ? recordValue.ordering.trim() : defaults.ordering,
    groupingDirection: normalizeDirectionValue(recordValue.groupingDirection),
    orderingDirection: normalizeDirectionValue(recordValue.orderingDirection),
    completedRange: typeof recordValue.completedRange === 'string' && recordValue.completedRange.trim() ? recordValue.completedRange.trim() : defaults.completedRange,
    showSubIssuesRange: normalizeIssueVisibilityRangeValue(
      recordValue.showSubIssuesRange,
      recordValue.showSubIssueContext,
      defaults.showSubIssuesRange,
    ),
    showTriageIssuesRange: typeof recordValue.showTriageIssuesRange === 'string' && recordValue.showTriageIssuesRange.trim() ? recordValue.showTriageIssuesRange.trim() : defaults.showTriageIssuesRange,
    issueGroupOrders: normalizeStringListRecord(recordValue.issueGroupOrders),
    hiddenIssueGroupIds: normalizeStringListRecord(recordValue.hiddenIssueGroupIds),
    collapsedIssueSectionIds: normalizeStringList(recordValue.collapsedIssueSectionIds),
    visibleIssueRowFields: visibleIssueRowFields.length > 0 ? visibleIssueRowFields : defaults.visibleIssueRowFields,
    visibleProjectRowFields: visibleProjectRowFields.length > 0 ? visibleProjectRowFields : defaults.visibleProjectRowFields,
    projectGrouping: typeof recordValue.projectGrouping === 'string' && recordValue.projectGrouping.trim() ? recordValue.projectGrouping.trim() : defaults.projectGrouping,
    projectOrdering: typeof recordValue.projectOrdering === 'string' && recordValue.projectOrdering.trim() ? recordValue.projectOrdering.trim() : defaults.projectOrdering,
    projectClosedRange: typeof recordValue.projectClosedRange === 'string' && recordValue.projectClosedRange.trim() ? recordValue.projectClosedRange.trim() : defaults.projectClosedRange,
    collapsedProjectSectionIds,
    visibleInitiativeRowFields: visibleInitiativeRowFields.length > 0 ? visibleInitiativeRowFields : defaults.visibleInitiativeRowFields,
    visibleSavedViewRowFields: visibleSavedViewRowFields.length > 0 ? visibleSavedViewRowFields : defaults.visibleSavedViewRowFields,
  }
}

function normalizeCustomViewFilter(value: unknown): CustomViewFilter | null {
  const filter = normalizeFavoriteViewFilter(value)
  if (!filter) {
    return null
  }

  return {
    id: filter.id,
    fieldId: filter.fieldId,
    fieldLabel: filter.fieldLabel,
    value: filter.value,
    valueLabel: filter.valueLabel,
  }
}

function normalizeCustomViewIcon(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_CUSTOM_VIEW_ICON
}

function normalizeCustomViewColor(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_CUSTOM_VIEW_COLOR
}

export function normalizeViewOverrides(value: unknown): Record<string, ViewOverride> {
  if (!isRecord(value)) {
    return {}
  }

  const recordValue = value
  const overrides: Record<string, ViewOverride> = {}

  for (const [rawViewId, entry] of Object.entries(recordValue)) {
    const viewId = rawViewId.trim()
    if (!viewId || !isRecord(entry)) {
      continue
    }

    const entryValue = entry
    const filters = Array.isArray(entryValue.filters)
      ? entryValue.filters
          .map(normalizeCustomViewFilter)
          .filter((filter): filter is CustomViewFilter => filter !== null)
      : []

    overrides[viewId] = {
      filters,
      display: normalizeCustomViewDisplay(entryValue.display),
    }
  }

  return overrides
}

export function normalizeCustomViews(value: unknown): CustomView[] {
  if (!Array.isArray(value)) {
    return []
  }

  const customViewsById = new Map<string, CustomView>()

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const recordValue = entry
    const id = typeof recordValue.id === 'string' ? recordValue.id.trim() : ''
    const name = typeof recordValue.name === 'string' ? recordValue.name.trim() : ''
    const contextKey = typeof recordValue.contextKey === 'string' ? recordValue.contextKey.trim() : ''

    if (!id || !name || !contextKey || customViewsById.has(id)) {
      continue
    }

    const filters = Array.isArray(recordValue.filters)
      ? recordValue.filters
          .map(normalizeCustomViewFilter)
          .filter((filter): filter is CustomViewFilter => filter !== null)
      : []

    customViewsById.set(id, {
      id,
      name,
      description: typeof recordValue.description === 'string' ? recordValue.description.trim() : '',
      contextKey,
      icon: normalizeCustomViewIcon(recordValue.icon),
      color: normalizeCustomViewColor(recordValue.color),
      filters,
      display: normalizeCustomViewDisplay(recordValue.display),
    })
  }

  return [...customViewsById.values()]
}
