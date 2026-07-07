import type { FilterFieldId, ViewFilterClause } from './types'
import type { CustomViewFilter } from '~/shared/settings'

export function normalizeFilterFieldId(value: string): FilterFieldId | null {
  switch (value) {
    case 'status':
    case 'assignee':
    case 'reporter':
    case 'priority':
    case 'labels':
    case 'suggestedLabel':
    case 'dueDate':
    case 'createdDate':
    case 'updatedDate':
    case 'completedDate':
    case 'project':
    case 'team':
    case 'projectStatus':
    case 'projectPriority':
    case 'projectLead':
    case 'initiative':
    case 'subscribers':
    case 'shared':
    case 'sharedWith':
    case 'externalSource':
      return value
    default:
      return null
  }
}

export function isFilterFieldId(value: string): value is FilterFieldId {
  return normalizeFilterFieldId(value) !== null
}

export function getFilterFieldLabel(fieldId: FilterFieldId): string {
  if (fieldId === 'status')
    return 'Status'
  if (fieldId === 'assignee')
    return 'Assignee'
  if (fieldId === 'reporter')
    return 'Creator'
  if (fieldId === 'priority')
    return 'Priority'
  if (fieldId === 'labels')
    return 'Labels'
  if (fieldId === 'suggestedLabel')
    return 'Suggested label'
  if (fieldId === 'dueDate')
    return 'Due date'
  if (fieldId === 'createdDate')
    return 'Created date'
  if (fieldId === 'updatedDate')
    return 'Updated date'
  if (fieldId === 'completedDate')
    return 'Completed date'
  if (fieldId === 'project')
    return 'Project'
  if (fieldId === 'team')
    return 'Team'
  if (fieldId === 'projectStatus')
    return 'Project status'
  if (fieldId === 'projectPriority')
    return 'Project priority'
  if (fieldId === 'projectLead')
    return 'Project lead'
  if (fieldId === 'initiative')
    return 'Initiative'
  if (fieldId === 'subscribers')
    return 'Subscribers'
  if (fieldId === 'shared')
    return 'Shared'
  if (fieldId === 'sharedWith')
    return 'Shared with'
  return 'External source'
}

export function customViewFiltersToClauses(
  filters: readonly CustomViewFilter[],
): ViewFilterClause[] {
  const clauses: ViewFilterClause[] = []

  for (const filter of filters) {
    const fieldId = normalizeFilterFieldId(filter.fieldId)
    if (!fieldId) {
      continue
    }

    clauses.push({
      id: filter.id,
      fieldId,
      fieldLabel: filter.fieldLabel,
      value: filter.value,
      valueLabel: filter.valueLabel,
    })
  }

  return clauses
}

export function clausesToCustomViewFilters(
  filters: readonly ViewFilterClause[],
): CustomViewFilter[] {
  return filters.map(filter => ({
    id: filter.id,
    fieldId: filter.fieldId,
    fieldLabel: filter.fieldLabel,
    value: filter.value,
    valueLabel: filter.valueLabel,
  }))
}

export function createViewFilterClause(
  fieldId: FilterFieldId,
  value: string,
  valueLabel: string,
): ViewFilterClause {
  return {
    id: `default:${fieldId}:${value}`,
    fieldId,
    fieldLabel: getFilterFieldLabel(fieldId),
    value,
    valueLabel,
  }
}
