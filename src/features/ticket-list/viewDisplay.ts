import type {
  FilterFieldId,
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
import type { CustomViewDisplay } from '~/shared/settings'

export function getDefaultViewDisplay(): CustomViewDisplay {
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
    visibleIssueRowFields: [
      'id',
      'status',
      'assignee',
      'priority',
      'project',
      'due',
      'labels',
      'created',
    ],
    visibleProjectRowFields: ['health', 'priority', 'lead', 'targetDate', 'issues', 'status'],
    projectGrouping: 'none',
    projectOrdering: 'manual',
    projectClosedRange: 'hidden',
    collapsedProjectSectionIds: [],
    visibleInitiativeRowFields: ['health', 'lead', 'projects', 'issues', 'updated'],
    visibleSavedViewRowFields: ['owner'],
  }
}

export function normalizeIssueGroupingFieldId(value: string): IssueGroupingFieldId {
  switch (value) {
    case 'none':
    case 'status':
    case 'assignee':
    case 'agent':
    case 'project':
    case 'priority':
    case 'label':
      return value
    default:
      return 'status'
  }
}

export function parseIssueGroupingFieldId(value: string): IssueGroupingFieldId | null {
  switch (value) {
    case 'none':
    case 'status':
    case 'assignee':
    case 'agent':
    case 'project':
    case 'priority':
    case 'label':
      return value
    default:
      return null
  }
}

export function normalizeIssueOrderingFieldId(value: string): IssueOrderingFieldId {
  switch (value) {
    case 'manual':
    case 'title':
    case 'status':
    case 'priority':
    case 'assignee':
    case 'agent':
    case 'estimate':
    case 'updated':
    case 'created':
    case 'due':
    case 'linkCount':
    case 'timeInStatus':
      return value
    default:
      return 'status'
  }
}

export function normalizeProjectGroupingFieldId(value: string): ProjectGroupingFieldId {
  switch (value) {
    case 'none':
    case 'health':
    case 'status':
    case 'priority':
    case 'lead':
      return value
    default:
      return 'none'
  }
}

export function normalizeProjectOrderingFieldId(value: string): ProjectOrderingFieldId {
  switch (value) {
    case 'manual':
    case 'name':
    case 'health':
    case 'priority':
    case 'lead':
    case 'targetDate':
    case 'updated':
    case 'progress':
      return value
    default:
      return 'manual'
  }
}

export function normalizeProjectClosedRange(value: string): ProjectClosedRange {
  switch (value) {
    case 'all':
    case 'day':
    case 'week':
      return value
    case 'hidden':
    default:
      return 'hidden'
  }
}

export function normalizeIssueVisibilityRange(value: string): IssueVisibilityRange {
  switch (value) {
    case 'day':
    case 'week':
    case 'month':
    case 'all':
      return value
    case 'hidden':
    default:
      return 'hidden'
  }
}

export function normalizeDirection(value: string): 'asc' | 'desc' {
  return value === 'desc' ? 'desc' : 'asc'
}

export function normalizeIssueRowFields(values: readonly string[]): IssueRowFieldId[] {
  const normalizedValues: IssueRowFieldId[] = []

  for (const value of values) {
    switch (value) {
      case 'id':
      case 'status':
      case 'assignee':
      case 'priority':
      case 'project':
      case 'due':
      case 'milestone':
      case 'release':
      case 'labels':
      case 'links':
      case 'timeInStatus':
      case 'created':
      case 'updated':
        if (!normalizedValues.includes(value)) {
          normalizedValues.push(value)
        }
        break
    }
  }

  return normalizedValues.length > 0
    ? normalizedValues
    : ['id', 'status', 'assignee', 'priority', 'project', 'due', 'labels', 'created']
}

export function normalizeProjectRowFields(values: readonly string[]): ProjectRowFieldId[] {
  const normalizedValues: ProjectRowFieldId[] = []

  for (const value of values) {
    switch (value) {
      case 'health':
      case 'priority':
      case 'lead':
      case 'targetDate':
      case 'issues':
      case 'status':
        if (!normalizedValues.includes(value)) {
          normalizedValues.push(value)
        }
        break
    }
  }

  return normalizedValues.length > 0
    ? normalizedValues
    : ['health', 'priority', 'lead', 'targetDate', 'issues', 'status']
}

export function normalizeInitiativeRowFields(values: readonly string[]): InitiativeRowFieldId[] {
  const normalizedValues: InitiativeRowFieldId[] = []

  for (const value of values) {
    switch (value) {
      case 'health':
      case 'lead':
      case 'projects':
      case 'issues':
      case 'updated':
        if (!normalizedValues.includes(value)) {
          normalizedValues.push(value)
        }
        break
    }
  }

  return normalizedValues.length > 0
    ? normalizedValues
    : ['health', 'lead', 'projects', 'issues', 'updated']
}

export function normalizeSavedViewRowFields(values: readonly string[]): SavedViewRowFieldId[] {
  const normalizedValues: SavedViewRowFieldId[] = []

  for (const value of values) {
    switch (value) {
      case 'type':
      case 'items':
      case 'owner':
      case 'updated':
        if (!normalizedValues.includes(value)) {
          normalizedValues.push(value)
        }
        break
    }
  }

  return normalizedValues.length > 0 ? normalizedValues : ['owner']
}

export function copyIssueGroupConfigMap(
  value: IssueGroupConfigMap | Record<string, string[]>,
): Record<string, string[]> {
  const copy: Record<string, string[]> = {}

  for (const [key, entries] of Object.entries(value)) {
    if (entries && entries.length > 0) {
      copy[key] = [...entries]
    }
  }

  return copy
}

export function normalizeIssueGroupConfigMap(value: Record<string, string[]>): IssueGroupConfigMap {
  const normalizedValue: IssueGroupConfigMap = {}

  for (const [key, entries] of Object.entries(value)) {
    const fieldId = parseIssueGroupingFieldId(key)
    if (!fieldId) {
      continue
    }

    if (entries.length > 0) {
      normalizedValue[fieldId] = [...entries]
    }
  }

  return normalizedValue
}

export function stringArraysMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function stringSetsMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every(value => right.includes(value))
}

export function filterClausesMatch(
  left: readonly ViewFilterClause[],
  right: readonly ViewFilterClause[],
): boolean {
  return (
    left.length === right.length
    && left.every(filter =>
      right.some(
        candidate => candidate.fieldId === filter.fieldId && candidate.value === filter.value,
      ),
    )
  )
}

export function filterGroupsMatch<Item>(
  item: Item,
  filters: readonly ViewFilterClause[],
  matchesFilter: (item: Item, filter: ViewFilterClause) => boolean,
): boolean {
  const filtersByField = new Map<FilterFieldId, ViewFilterClause[]>()

  for (const filter of filters) {
    const existingFilters = filtersByField.get(filter.fieldId)
    if (existingFilters) {
      existingFilters.push(filter)
      continue
    }

    filtersByField.set(filter.fieldId, [filter])
  }

  for (const filtersForField of filtersByField.values()) {
    if (!filtersForField.some(filter => matchesFilter(item, filter))) {
      return false
    }
  }

  return true
}

export function issueGroupConfigMapsMatch(
  left: IssueGroupConfigMap,
  right: IssueGroupConfigMap,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])

  for (const key of keys) {
    const fieldId = parseIssueGroupingFieldId(key)
    if (!fieldId) {
      continue
    }

    const leftEntries = left[fieldId] ?? []
    const rightEntries = right[fieldId] ?? []
    if (!stringArraysMatch(leftEntries, rightEntries)) {
      return false
    }
  }

  return true
}

export function viewDisplayMatches(left: CustomViewDisplay, right: CustomViewDisplay): boolean {
  return (
    left.grouping === right.grouping
    && left.ordering === right.ordering
    && left.groupingDirection === right.groupingDirection
    && left.orderingDirection === right.orderingDirection
    && left.completedRange === right.completedRange
    && left.showSubIssuesRange === right.showSubIssuesRange
    && left.showTriageIssuesRange === right.showTriageIssuesRange
    && issueGroupConfigMapsMatch(
      normalizeIssueGroupConfigMap(left.issueGroupOrders),
      normalizeIssueGroupConfigMap(right.issueGroupOrders),
    )
    && issueGroupConfigMapsMatch(
      normalizeIssueGroupConfigMap(left.hiddenIssueGroupIds),
      normalizeIssueGroupConfigMap(right.hiddenIssueGroupIds),
    )
    && stringArraysMatch(left.collapsedIssueSectionIds, right.collapsedIssueSectionIds)
    && stringSetsMatch(left.visibleIssueRowFields, right.visibleIssueRowFields)
    && stringSetsMatch(left.visibleProjectRowFields, right.visibleProjectRowFields)
    && left.projectGrouping === right.projectGrouping
    && left.projectOrdering === right.projectOrdering
    && left.projectClosedRange === right.projectClosedRange
    && stringArraysMatch(left.collapsedProjectSectionIds, right.collapsedProjectSectionIds)
    && stringSetsMatch(left.visibleInitiativeRowFields, right.visibleInitiativeRowFields)
    && stringSetsMatch(left.visibleSavedViewRowFields, right.visibleSavedViewRowFields)
  )
}

export function copyViewDisplay(display: CustomViewDisplay): CustomViewDisplay {
  const defaults = getDefaultViewDisplay()

  return {
    grouping: display.grouping ?? defaults.grouping,
    ordering: display.ordering ?? defaults.ordering,
    groupingDirection: display.groupingDirection ?? defaults.groupingDirection,
    orderingDirection: display.orderingDirection ?? defaults.orderingDirection,
    completedRange: display.completedRange ?? defaults.completedRange,
    showSubIssuesRange: display.showSubIssuesRange ?? defaults.showSubIssuesRange,
    showTriageIssuesRange: display.showTriageIssuesRange ?? defaults.showTriageIssuesRange,
    issueGroupOrders: copyIssueGroupConfigMap(
      display.issueGroupOrders ?? defaults.issueGroupOrders,
    ),
    hiddenIssueGroupIds: copyIssueGroupConfigMap(
      display.hiddenIssueGroupIds ?? defaults.hiddenIssueGroupIds,
    ),
    collapsedIssueSectionIds: [
      ...(display.collapsedIssueSectionIds ?? defaults.collapsedIssueSectionIds),
    ],
    visibleIssueRowFields: [...(display.visibleIssueRowFields ?? defaults.visibleIssueRowFields)],
    visibleProjectRowFields: [
      ...(display.visibleProjectRowFields ?? defaults.visibleProjectRowFields),
    ],
    projectGrouping: display.projectGrouping ?? defaults.projectGrouping,
    projectOrdering: display.projectOrdering ?? defaults.projectOrdering,
    projectClosedRange: display.projectClosedRange ?? defaults.projectClosedRange,
    collapsedProjectSectionIds: [
      ...(display.collapsedProjectSectionIds ?? defaults.collapsedProjectSectionIds),
    ],
    visibleInitiativeRowFields: [
      ...(display.visibleInitiativeRowFields ?? defaults.visibleInitiativeRowFields),
    ],
    visibleSavedViewRowFields: [
      ...(display.visibleSavedViewRowFields ?? defaults.visibleSavedViewRowFields),
    ],
  }
}
