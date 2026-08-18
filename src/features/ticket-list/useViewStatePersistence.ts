import type { Ref } from 'vue'
import type {
  InitiativeRowFieldId,
  IssueGroupConfigMap,
  IssueGroupingFieldId,
  IssueOrderingFieldId,
  IssueRowFieldId,
  IssueVisibilityRange,
  ProjectClosedRange,
  ProjectGroupingFieldId,
  ProjectOrderingFieldId,
  ProjectRowFieldId,
  SavedViewRowFieldId,
  ViewFilterClause,
} from './types'
import type { useCustomViews } from '@/composables/useCustomViews'
import type { useViewOverrides } from '@/composables/useViewOverrides'
import type { CustomView, CustomViewDisplay } from '~/shared/settings'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  clausesToCustomViewFilters,
  createViewFilterClause,
  customViewFiltersToClauses,
} from './filterDisplay'
import { parseTeamViewId } from './helpers'
import {
  copyIssueGroupConfigMap,
  copyViewDisplay,
  filterClausesMatch,
  getDefaultViewDisplay,
  normalizeDirection,
  normalizeInitiativeRowFields,
  normalizeIssueGroupConfigMap,
  normalizeIssueGroupingFieldId,
  normalizeIssueOrderingFieldId,
  normalizeIssueRowFields,
  normalizeIssueVisibilityRange,
  normalizeProjectClosedRange,
  normalizeProjectGroupingFieldId,
  normalizeProjectOrderingFieldId,
  normalizeProjectRowFields,
  normalizeSavedViewRowFields,
  viewDisplayMatches,
} from './viewDisplay'

interface ViewStatePersistenceDeps {
  currentView: Ref<string>
  viewEditorDraft: Ref<CustomView | null>
  customViews: ReturnType<typeof useCustomViews>['customViews']
  getCustomView: ReturnType<typeof useCustomViews>['getCustomView']
  viewOverrides: ReturnType<typeof useViewOverrides>['viewOverrides']
  getViewOverride: ReturnType<typeof useViewOverrides>['getViewOverride']
  upsertViewOverride: ReturnType<typeof useViewOverrides>['upsertViewOverride']
  removeViewOverride: ReturnType<typeof useViewOverrides>['removeViewOverride']
}

/**
 * Owns the per-view display state (grouping, ordering, visibility ranges,
 * visible row fields, section collapse, group orders) and its two-way sync
 * with persisted view overrides / custom views / the view-editor draft.
 *
 * Sync re-entrancy: applying a resolved display mutates the very refs the
 * persist watch observes, so applications run inside
 * `withViewDisplaySyncSuppressed`, which raises a flag released on the next
 * tick (after watchers have observed the writes).
 */
export function useViewStatePersistence(deps: ViewStatePersistenceDeps) {
  const {
    currentView,
    viewEditorDraft,
    customViews,
    getCustomView,
    viewOverrides,
    getViewOverride,
    upsertViewOverride,
    removeViewOverride,
  } = deps

  const listGrouping = ref<IssueGroupingFieldId>('none')
  const listOrdering = ref<IssueOrderingFieldId>('manual')
  const projectGrouping = ref<ProjectGroupingFieldId>('none')
  const projectOrdering = ref<ProjectOrderingFieldId>('manual')
  const projectClosedRange = ref<ProjectClosedRange>('hidden')
  const listGroupingDirection = ref<'asc' | 'desc'>('asc')
  const listOrderingDirection = ref<'asc' | 'desc'>('asc')
  const issueGroupOrders = ref<IssueGroupConfigMap>({})
  const hiddenIssueGroupIds = ref<IssueGroupConfigMap>({})
  const completedRange = ref<IssueVisibilityRange>('hidden')
  const showSubIssuesRange = ref<IssueVisibilityRange>('hidden')
  const showTriageIssuesRange = ref<IssueVisibilityRange>('hidden')
  const showSubIssues = computed({
    get: () => showSubIssuesRange.value !== 'hidden',
    set: (value: boolean) => {
      showSubIssuesRange.value = value ? 'all' : 'hidden'
    },
  })
  const showBacklogIssues = computed({
    get: () => showTriageIssuesRange.value !== 'hidden',
    set: (value: boolean) => {
      showTriageIssuesRange.value = value ? 'all' : 'hidden'
    },
  })
  const collapsedIssueSectionIds = ref<string[]>([])
  const collapsedProjectSectionIds = ref<string[]>([])
  const visibleIssueRowFields = ref<IssueRowFieldId[]>([
    'id',
    'status',
    'assignee',
    'priority',
    'project',
    'due',
    'labels',
    'created',
  ])
  const visibleProjectRowFields = ref<ProjectRowFieldId[]>([
    'health',
    'priority',
    'lead',
    'targetDate',
    'issues',
    'status',
  ])
  const visibleInitiativeRowFields = ref<InitiativeRowFieldId[]>([
    'health',
    'lead',
    'projects',
    'issues',
    'updated',
  ])
  const visibleSavedViewRowFields = ref<SavedViewRowFieldId[]>(['owner'])

  const suppressViewDisplaySync = ref(false)

  function withViewDisplaySyncSuppressed(fn: () => void): void {
    suppressViewDisplaySync.value = true
    fn()
    void nextTick(() => {
      suppressViewDisplaySync.value = false
    })
  }

  function captureDisplay(): CustomViewDisplay {
    return {
      grouping: listGrouping.value,
      ordering: listOrdering.value,
      groupingDirection: listGroupingDirection.value,
      orderingDirection: listOrderingDirection.value,
      completedRange: completedRange.value,
      showSubIssuesRange: showSubIssuesRange.value,
      showTriageIssuesRange: showTriageIssuesRange.value,
      issueGroupOrders: copyIssueGroupConfigMap(issueGroupOrders.value),
      hiddenIssueGroupIds: copyIssueGroupConfigMap(hiddenIssueGroupIds.value),
      collapsedIssueSectionIds: [...collapsedIssueSectionIds.value],
      visibleIssueRowFields: [...visibleIssueRowFields.value],
      visibleProjectRowFields: [...visibleProjectRowFields.value],
      projectGrouping: projectGrouping.value,
      projectOrdering: projectOrdering.value,
      projectClosedRange: projectClosedRange.value,
      collapsedProjectSectionIds: [...collapsedProjectSectionIds.value],
      visibleInitiativeRowFields: [...visibleInitiativeRowFields.value],
      visibleSavedViewRowFields: [...visibleSavedViewRowFields.value],
    }
  }

  function applyDisplay(display: CustomViewDisplay): void {
    listGrouping.value = normalizeIssueGroupingFieldId(display.grouping)
    listOrdering.value = normalizeIssueOrderingFieldId(display.ordering)
    listGroupingDirection.value = normalizeDirection(display.groupingDirection)
    listOrderingDirection.value = normalizeDirection(display.orderingDirection)
    completedRange.value = normalizeIssueVisibilityRange(display.completedRange)
    showSubIssuesRange.value = normalizeIssueVisibilityRange(display.showSubIssuesRange)
    showTriageIssuesRange.value = normalizeIssueVisibilityRange(display.showTriageIssuesRange)
    issueGroupOrders.value = normalizeIssueGroupConfigMap(display.issueGroupOrders)
    hiddenIssueGroupIds.value = normalizeIssueGroupConfigMap(display.hiddenIssueGroupIds)
    collapsedIssueSectionIds.value = [...display.collapsedIssueSectionIds]
    visibleIssueRowFields.value = normalizeIssueRowFields(display.visibleIssueRowFields)
    visibleProjectRowFields.value = normalizeProjectRowFields(display.visibleProjectRowFields)
    projectGrouping.value = normalizeProjectGroupingFieldId(display.projectGrouping)
    projectOrdering.value = normalizeProjectOrderingFieldId(display.projectOrdering)
    projectClosedRange.value = normalizeProjectClosedRange(display.projectClosedRange)
    collapsedProjectSectionIds.value = [...display.collapsedProjectSectionIds]
    visibleInitiativeRowFields.value = normalizeInitiativeRowFields(display.visibleInitiativeRowFields)
    visibleSavedViewRowFields.value = normalizeSavedViewRowFields(display.visibleSavedViewRowFields)
  }

  function getDefaultFiltersForView(viewId: string): ViewFilterClause[] {
    if (viewEditorDraft.value?.id === viewId) {
      return customViewFiltersToClauses(viewEditorDraft.value.filters)
    }
    const customView = getCustomView(viewId)
    if (customView) {
      return customViewFiltersToClauses(customView.filters)
    }
    if (viewId === 'my-issues') {
      return [createViewFilterClause('assignee', 'current-user', 'Current user')]
    }
    if (viewId === 'my-created') {
      return [createViewFilterClause('reporter', 'current-user', 'Current user')]
    }
    return []
  }

  function getDefaultDisplayForView(viewId: string): CustomViewDisplay {
    if (viewEditorDraft.value?.id === viewId) {
      return copyViewDisplay(viewEditorDraft.value.display)
    }
    const customView = getCustomView(viewId)
    if (customView) {
      return copyViewDisplay(customView.display)
    }
    const display = getDefaultViewDisplay()
    const parsed = parseTeamViewId(viewId)
    const section = parsed?.section
    if (parsed && (section === 'all' || section === 'active' || !section)) {
      return {
        ...display,
        grouping: 'status',
        completedRange: section === 'all' ? 'all' : display.completedRange,
        showTriageIssuesRange: section === 'all' ? 'all' : display.showTriageIssuesRange,
      }
    }
    if (section === 'backlog' || section === 'triage') {
      return {
        ...display,
        grouping: 'status',
        showTriageIssuesRange: 'all',
      }
    }
    if (section === 'cycle-current' || section === 'cycle-upcoming' || section?.startsWith('cycle-')) {
      return {
        ...display,
        grouping: 'status',
        completedRange: 'all',
        showTriageIssuesRange: 'all',
      }
    }
    return display
  }

  const currentViewFilters = computed(() => {
    if (viewEditorDraft.value && currentView.value === viewEditorDraft.value.id) {
      return customViewFiltersToClauses(viewEditorDraft.value.filters)
    }
    const override = getViewOverride(currentView.value)
    if (override) {
      return customViewFiltersToClauses(override.filters)
    }
    return getDefaultFiltersForView(currentView.value)
  })

  function resolveDisplayForView(viewId: string): CustomViewDisplay {
    if (viewEditorDraft.value?.id === viewId) {
      return copyViewDisplay(viewEditorDraft.value.display)
    }
    const override = getViewOverride(viewId)
    if (override) {
      return copyViewDisplay(override.display)
    }
    return getDefaultDisplayForView(viewId)
  }

  function persistViewStateForView(
    viewId: string,
    filters: readonly ViewFilterClause[],
    display: CustomViewDisplay,
  ): void {
    const normalizedDisplay = copyViewDisplay(display)
    const customFilters = clausesToCustomViewFilters(filters)

    if (viewEditorDraft.value?.id === viewId) {
      viewEditorDraft.value = {
        ...viewEditorDraft.value,
        filters: customFilters,
        display: normalizedDisplay,
      }
      return
    }

    const defaultFilters = getDefaultFiltersForView(viewId)
    const defaultDisplay = getDefaultDisplayForView(viewId)
    if (
      filterClausesMatch(filters, defaultFilters)
      && viewDisplayMatches(normalizedDisplay, defaultDisplay)
    ) {
      removeViewOverride(viewId)
      return
    }

    upsertViewOverride(viewId, {
      filters: customFilters,
      display: normalizedDisplay,
    })
  }

  watch(
    currentView,
    (nextViewId) => {
      if (suppressViewDisplaySync.value) {
        return
      }
      withViewDisplaySyncSuppressed(() => {
        applyDisplay(resolveDisplayForView(nextViewId))
      })
    },
    { immediate: true },
  )

  watch(
    [
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
      collapsedIssueSectionIds,
      collapsedProjectSectionIds,
      visibleIssueRowFields,
      visibleProjectRowFields,
      visibleInitiativeRowFields,
      visibleSavedViewRowFields,
    ],
    () => {
      if (suppressViewDisplaySync.value) {
        return
      }
      persistViewStateForView(currentView.value, currentViewFilters.value, captureDisplay())
    },
    { deep: true },
  )

  watch(
    [customViews, viewOverrides],
    () => {
      if (suppressViewDisplaySync.value) {
        return
      }
      withViewDisplaySyncSuppressed(() => {
        applyDisplay(resolveDisplayForView(currentView.value))
      })
    },
  )

  onBeforeUnmount(() => {
    if (!suppressViewDisplaySync.value) {
      persistViewStateForView(currentView.value, currentViewFilters.value, captureDisplay())
    }
  })

  return {
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
  }
}
