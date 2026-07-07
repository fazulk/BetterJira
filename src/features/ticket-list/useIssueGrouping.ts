import type { ComputedRef, Ref } from 'vue'
import type {
  IssueGroupConfigMap,
  IssueGroupingFieldId,
  IssueGroupOrderingRow,
  IssueOrderingFieldId,
  IssueRowFieldId,
  IssueSection,
  IssueVisibilityRange,
  MyIssuesViewId,
  ViewFilterClause,
} from './types'
import type { JiraTicket } from '@/types/jira'
import type { CustomViewDisplay, StatusPreferences } from '~/shared/settings'
import { computed, ref } from 'vue'
import { compareStatusesByPreference } from '@/composables/useStatusPreferences'
import { getPriorityRank, getTicketLabels, getTimeValue } from './helpers'
import {
  copyIssueGroupConfigMap,
  normalizeIssueGroupingFieldId,
  normalizeIssueOrderingFieldId,
  normalizeIssueRowFields,
} from './viewDisplay'

interface UseIssueGroupingDeps {
  searchedTickets: ComputedRef<JiraTicket[]>
  scopedTickets: ComputedRef<JiraTicket[]>
  issueTickets: ComputedRef<JiraTicket[]>
  currentView: ComputedRef<string>
  listGrouping: Ref<IssueGroupingFieldId>
  listOrdering: Ref<IssueOrderingFieldId>
  listGroupingDirection: Ref<'asc' | 'desc'>
  listOrderingDirection: Ref<'asc' | 'desc'>
  issueGroupOrders: Ref<IssueGroupConfigMap>
  hiddenIssueGroupIds: Ref<IssueGroupConfigMap>
  collapsedIssueSectionIds: Ref<string[]>
  visibleIssueRowFields: Ref<IssueRowFieldId[]>
  completedRange: Ref<IssueVisibilityRange>
  currentViewFilters: Ref<ViewFilterClause[]>
  statusPreferences: ComputedRef<StatusPreferences>
  filterTicketsForCurrentViewWithoutCompletedRange: (tickets: JiraTicket[]) => JiraTicket[]
  ticketMatchesQuery: (ticket: JiraTicket, query: string) => boolean
  applyViewFiltersToTickets: (tickets: JiraTicket[]) => JiraTicket[]
  isCompletedIssueVisible: (ticket: JiraTicket) => boolean
  normalizedIssueSearch: ComputedRef<string>
  getDefaultDisplayForView: (viewId: string) => CustomViewDisplay
  persistViewStateForView: (viewId: string, filters: ViewFilterClause[], display: CustomViewDisplay) => void
  captureDisplay: () => CustomViewDisplay
}

function isMyIssuesView(viewId: string): viewId is MyIssuesViewId {
  return viewId === 'my-issues' || viewId === 'my-created'
}

export function useIssueGrouping(deps: UseIssueGroupingDeps) {
  const draggedIssueGroupId = ref<string | null>(null)

  const baseIssueSections = computed<IssueSection[]>(() => {
    if (isMyIssuesView(deps.currentView.value) && deps.listGrouping.value === 'none') {
      const label = deps.currentView.value === 'my-created' ? 'Created by you' : 'Assigned to you'
      return [
        {
          id: deps.currentView.value,
          label,
          tickets: sortTickets(deps.searchedTickets.value),
        },
      ]
    }
    if (deps.listGrouping.value === 'none' || deps.currentView.value === 'search') {
      return [
        {
          id: 'all',
          label:
            deps.searchedTickets.value.length === 1
              ? '1 issue'
              : `${deps.searchedTickets.value.length} issues`,
          tickets: sortTickets(deps.searchedTickets.value),
        },
      ]
    }
    return groupTickets(
      deps.searchedTickets.value,
      ticket => getIssueGroupingLabels(ticket, deps.listGrouping.value),
      label => getIssueGroupingRank(label, deps.listGrouping.value),
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
    if (deps.completedRange.value === 'all')
      return 0
    const baseTickets
      = deps.currentView.value === 'search'
        ? deps.filterTicketsForCurrentViewWithoutCompletedRange(deps.issueTickets.value)
        : deps.filterTicketsForCurrentViewWithoutCompletedRange(deps.scopedTickets.value)
    const query = deps.currentView.value === 'search' ? deps.normalizedIssueSearch.value : ''
    const searchedTickets = query
      ? baseTickets.filter(ticket => deps.ticketMatchesQuery(ticket, query))
      : baseTickets
    return deps.applyViewFiltersToTickets(searchedTickets).filter(
      ticket => !deps.isCompletedIssueVisible(ticket),
    ).length
  })

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
    const manualOrder = deps.issueGroupOrders.value[deps.listGrouping.value] ?? []
    const leftManualIndex = manualOrder.indexOf(left[0])
    const rightManualIndex = manualOrder.indexOf(right[0])
    if (leftManualIndex !== -1 || rightManualIndex !== -1) {
      if (leftManualIndex === -1)
        return 1
      if (rightManualIndex === -1)
        return -1
      return leftManualIndex - rightManualIndex
    }
    if (deps.listGrouping.value === 'status') {
      const statusComparison = compareStatusGroupLabels(left[0], right[0])
      return deps.listGroupingDirection.value === 'desc' ? -statusComparison : statusComparison
    }

    return deps.listGroupingDirection.value === 'desc'
      ? getRank(right[0]) - getRank(left[0]) || right[0].localeCompare(left[0])
      : getRank(left[0]) - getRank(right[0]) || left[0].localeCompare(right[0])
  }
  function getStatusCategoryForGroupLabel(label: string): string {
    return deps.searchedTickets.value.find(ticket => (ticket.status || 'No status') === label)?.statusCategory ?? ''
  }
  function compareStatusGroupLabels(leftLabel: string, rightLabel: string): number {
    return compareStatusesByPreference(
      { status: leftLabel, statusCategory: getStatusCategoryForGroupLabel(leftLabel) },
      { status: rightLabel, statusCategory: getStatusCategoryForGroupLabel(rightLabel) },
      deps.statusPreferences.value.order,
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
    const direction = deps.listOrderingDirection.value === 'desc' ? -1 : 1
    return [...nextTickets].sort((left, right) => {
      if (deps.listOrdering.value === 'updated') {
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
      if (deps.listOrdering.value === 'created') {
        return (
          direction * (getTimeValue(right.createdAt) - getTimeValue(left.createdAt))
          || getPriorityRank(left.priority) - getPriorityRank(right.priority)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (deps.listOrdering.value === 'due') {
        return (
          direction * (getTimeValue(left.dueDate) - getTimeValue(right.dueDate))
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (deps.listOrdering.value === 'title') {
        return (
          direction * left.summary.localeCompare(right.summary)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (deps.listOrdering.value === 'assignee') {
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
        deps.listOrdering.value === 'agent'
        || deps.listOrdering.value === 'estimate'
        || deps.listOrdering.value === 'linkCount'
        || deps.listOrdering.value === 'timeInStatus'
      ) {
        return left.key.localeCompare(right.key, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      }
      if (deps.listOrdering.value === 'priority') {
        return (
          direction * (getPriorityRank(left.priority) - getPriorityRank(right.priority))
          || compareStatusesByPreference(left, right, deps.statusPreferences.value.order)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      }
      if (deps.listOrdering.value === 'manual') {
        return 0
      }
      return (
        direction * compareStatusesByPreference(left, right, deps.statusPreferences.value.order)
        || getPriorityRank(left.priority) - getPriorityRank(right.priority)
        || left.key.localeCompare(right.key, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      )
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
  function setCurrentIssueGroupOrder(groupIds: string[]) {
    deps.issueGroupOrders.value = {
      ...deps.issueGroupOrders.value,
      [deps.listGrouping.value]: groupIds,
    }
  }
  function getCurrentHiddenIssueGroupIds(): string[] {
    return deps.hiddenIssueGroupIds.value[deps.listGrouping.value] ?? []
  }
  function setCurrentHiddenIssueGroupIds(groupIds: string[]) {
    deps.hiddenIssueGroupIds.value = {
      ...deps.hiddenIssueGroupIds.value,
      [deps.listGrouping.value]: groupIds,
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
    deps.listGroupingDirection.value = 'asc'
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
    deps.listOrderingDirection.value = deps.listOrderingDirection.value === 'asc' ? 'desc' : 'asc'
  }
  function resetIssueDisplayOptions() {
    const defaults = deps.getDefaultDisplayForView(deps.currentView.value)
    deps.listGrouping.value = normalizeIssueGroupingFieldId(defaults.grouping)
    deps.listOrdering.value = normalizeIssueOrderingFieldId(defaults.ordering)
    deps.listGroupingDirection.value = defaults.groupingDirection
    deps.listOrderingDirection.value = defaults.orderingDirection
    deps.issueGroupOrders.value = copyIssueGroupConfigMap(defaults.issueGroupOrders)
    deps.hiddenIssueGroupIds.value = copyIssueGroupConfigMap(defaults.hiddenIssueGroupIds)
    deps.collapsedIssueSectionIds.value = [...defaults.collapsedIssueSectionIds]
    deps.visibleIssueRowFields.value = normalizeIssueRowFields(defaults.visibleIssueRowFields)
    deps.persistViewStateForView(deps.currentView.value, deps.currentViewFilters.value, deps.captureDisplay())
  }
  function getIssueSectionCollapseId(section: IssueSection): string {
    return `${deps.currentView.value}:${deps.listGrouping.value}:${section.id}`
  }
  function isIssueSectionCollapsed(section: IssueSection): boolean {
    if (!shouldShowIssueSectionHeader())
      return false
    return deps.collapsedIssueSectionIds.value.includes(getIssueSectionCollapseId(section))
  }
  function shouldShowIssueSectionHeader(): boolean {
    return deps.listGrouping.value !== 'none' && deps.currentView.value !== 'search'
  }
  function toggleIssueSection(section: IssueSection) {
    const sectionId = getIssueSectionCollapseId(section)
    deps.collapsedIssueSectionIds.value = isIssueSectionCollapsed(section)
      ? deps.collapsedIssueSectionIds.value.filter(id => id !== sectionId)
      : [...deps.collapsedIssueSectionIds.value, sectionId]
  }
  function getExpandedSectionTickets(section: IssueSection): JiraTicket[] {
    return isIssueSectionCollapsed(section) ? [] : section.tickets
  }
  function getFlatVisibleTickets(): JiraTicket[] {
    return issueSections.value.flatMap(getExpandedSectionTickets)
  }

  return {
    baseIssueSections,
    issueSections,
    issueGroupOrderingRows,
    visibleIssueCount,
    hiddenCompletedCount,
    draggedIssueGroupId,
    groupTickets,
    compareIssueGroupEntries,
    getStatusCategoryForGroupLabel,
    compareStatusGroupLabels,
    getIssueGroupingLabels,
    getIssueGroupingRank,
    sortTickets,
    sortTicketsByActivity,
    setCurrentIssueGroupOrder,
    getCurrentHiddenIssueGroupIds,
    setCurrentHiddenIssueGroupIds,
    isIssueGroupHidden,
    toggleIssueGroupVisibility,
    resetCurrentIssueGroupOrdering,
    startIssueGroupDrag,
    finishIssueGroupDrag,
    dropIssueGroup,
    toggleOrderingDirection,
    resetIssueDisplayOptions,
    getIssueSectionCollapseId,
    isIssueSectionCollapsed,
    shouldShowIssueSectionHeader,
    toggleIssueSection,
    getExpandedSectionTickets,
    getFlatVisibleTickets,
  }
}
