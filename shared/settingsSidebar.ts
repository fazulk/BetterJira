import type {
  SidebarGroupBy,
  SidebarSettings,
  SidebarSortBy,
  SidebarTicketScope,
  UpdateSidebarSettingsInput,
} from './settingsTypes'
import {
  normalizeBoolean,
  normalizeStringList,
} from './settingsNormalizers'
import {
  normalizeCustomViews,
  normalizeFavoriteViews,
  normalizeViewOverrides,
} from './settingsViews'
import { isRecord } from './typeGuards'

function normalizeSidebarSortBy(value: unknown): SidebarSortBy {
  switch (value) {
    case 'summary':
    case 'status':
    case 'priority':
    case 'assignee':
    case 'type':
    case 'createdAt':
    case 'updatedAt':
    case 'dueDate':
    case 'completedAt':
      return value
    case 'key':
    default:
      return 'key'
  }
}

function normalizeSidebarGroupBy(value: unknown): SidebarGroupBy {
  switch (value) {
    case 'summary':
    case 'status':
    case 'priority':
    case 'assignee':
    case 'type':
    case 'createdAt':
    case 'updatedAt':
    case 'dueDate':
    case 'completedAt':
    case 'none':
      return value
    case 'hierarchy':
    default:
      return 'hierarchy'
  }
}

function normalizeSidebarTicketScope(value: unknown): SidebarTicketScope {
  return value === 'currentSprint' ? 'currentSprint' : 'all'
}

export function getDefaultSidebarSettings(): SidebarSettings {
  return {
    pinnedTicketKeys: [],
    favoriteViews: [],
    customViews: [],
    viewOverrides: {},
    filterTypeKeys: [],
    filterStatuses: [],
    filterAssignees: [],
    showCompletedTickets: false,
    ticketScope: 'all',
    sortBy: 'key',
    groupBy: 'hierarchy',
    sortReversed: false,
  }
}

export function normalizeSidebarSettings(value: unknown): SidebarSettings {
  const defaults = getDefaultSidebarSettings()

  if (!isRecord(value)) {
    return defaults
  }

  const recordValue = value

  return {
    pinnedTicketKeys: normalizeStringList(recordValue.pinnedTicketKeys),
    favoriteViews: normalizeFavoriteViews(recordValue.favoriteViews),
    customViews: normalizeCustomViews(recordValue.customViews),
    viewOverrides: normalizeViewOverrides(recordValue.viewOverrides),
    filterTypeKeys: normalizeStringList(recordValue.filterTypeKeys),
    filterStatuses: normalizeStringList(recordValue.filterStatuses),
    filterAssignees: normalizeStringList(recordValue.filterAssignees),
    showCompletedTickets: normalizeBoolean(recordValue.showCompletedTickets, defaults.showCompletedTickets),
    ticketScope: normalizeSidebarTicketScope(recordValue.ticketScope),
    sortBy: normalizeSidebarSortBy(recordValue.sortBy),
    groupBy: normalizeSidebarGroupBy(recordValue.groupBy),
    sortReversed: normalizeBoolean(recordValue.sortReversed, defaults.sortReversed),
  }
}

export function normalizeSidebarSettingsUpdate(value: unknown): UpdateSidebarSettingsInput | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const recordValue = value
  const nextSidebar: UpdateSidebarSettingsInput = {}

  if ('pinnedTicketKeys' in recordValue)
    nextSidebar.pinnedTicketKeys = normalizeStringList(recordValue.pinnedTicketKeys)
  if ('favoriteViews' in recordValue)
    nextSidebar.favoriteViews = normalizeFavoriteViews(recordValue.favoriteViews)
  if ('customViews' in recordValue)
    nextSidebar.customViews = normalizeCustomViews(recordValue.customViews)
  if ('viewOverrides' in recordValue)
    nextSidebar.viewOverrides = normalizeViewOverrides(recordValue.viewOverrides)
  if ('filterTypeKeys' in recordValue)
    nextSidebar.filterTypeKeys = normalizeStringList(recordValue.filterTypeKeys)
  if ('filterStatuses' in recordValue)
    nextSidebar.filterStatuses = normalizeStringList(recordValue.filterStatuses)
  if ('filterAssignees' in recordValue)
    nextSidebar.filterAssignees = normalizeStringList(recordValue.filterAssignees)
  if ('showCompletedTickets' in recordValue)
    nextSidebar.showCompletedTickets = normalizeBoolean(recordValue.showCompletedTickets, false)
  if ('ticketScope' in recordValue)
    nextSidebar.ticketScope = normalizeSidebarTicketScope(recordValue.ticketScope)
  if ('sortBy' in recordValue)
    nextSidebar.sortBy = normalizeSidebarSortBy(recordValue.sortBy)
  if ('groupBy' in recordValue)
    nextSidebar.groupBy = normalizeSidebarGroupBy(recordValue.groupBy)
  if ('sortReversed' in recordValue)
    nextSidebar.sortReversed = normalizeBoolean(recordValue.sortReversed, false)

  return Object.keys(nextSidebar).length > 0 ? nextSidebar : undefined
}

export function reconcileSidebarSettings(sidebar: SidebarSettings): SidebarSettings {
  return {
    pinnedTicketKeys: normalizeStringList(sidebar.pinnedTicketKeys),
    favoriteViews: normalizeFavoriteViews(sidebar.favoriteViews),
    customViews: normalizeCustomViews(sidebar.customViews),
    viewOverrides: normalizeViewOverrides(sidebar.viewOverrides),
    filterTypeKeys: normalizeStringList(sidebar.filterTypeKeys),
    filterStatuses: normalizeStringList(sidebar.filterStatuses),
    filterAssignees: normalizeStringList(sidebar.filterAssignees),
    showCompletedTickets: sidebar.showCompletedTickets,
    ticketScope: normalizeSidebarTicketScope(sidebar.ticketScope),
    sortBy: normalizeSidebarSortBy(sidebar.sortBy),
    groupBy: normalizeSidebarGroupBy(sidebar.groupBy),
    sortReversed: sidebar.sortReversed,
  }
}
