import type { ComputedRef, Ref } from 'vue'
import type { ProjectRow, SavedViewRow, ViewFilterClause, ViewsDirectoryTabId, ViewTab } from './types'
import type { JiraTicket } from '@/types/jira'
import type { CustomView } from '~/shared/settings'
import { computed } from 'vue'
import { customViewFiltersToClauses } from './filterDisplay'
import { getBaseViewIdForCustomContext, getCustomViewKind, getTeamSectionLabel, getTimeValue, getViewsDirectoryTabFromViewId, parseTeamViewId } from './helpers'
import { filterGroupsMatch } from './viewDisplay'

interface EnabledSpace {
  key: string
  name: string
}

interface UseCustomViewDirectoryDeps {
  customViews: Ref<CustomView[]>
  getCustomView: (viewId: string) => CustomView | null
  customViewsForContext: (contextKey: string) => CustomView[]
  contextKeyForCurrentView: ComputedRef<string | null>
  activeViewsDirectoryTab: ComputedRef<ViewsDirectoryTabId>
  currentTeamKey: ComputedRef<string | null>
  currentUserName: ComputedRef<string>
  enabledSpaces: ComputedRef<EnabledSpace[]>
  viewEditorDraft: Ref<CustomView | null>
  issueTickets: ComputedRef<JiraTicket[]>
  projectRows: ComputedRef<ProjectRow[]>
  applyViewFiltersToSavedViews: (views: SavedViewRow[]) => SavedViewRow[]
  projectMatchesFilter: (project: ProjectRow, filter: ViewFilterClause) => boolean
  ticketMatchesFilter: (ticket: JiraTicket, filter: ViewFilterClause) => boolean
  sortTicketsByActivity: (tickets: JiraTicket[]) => JiraTicket[]
}

export function useCustomViewDirectory(deps: UseCustomViewDirectoryDeps) {
  const customViewTabs = computed<ViewTab[]>(() => {
    const contextKey = deps.contextKeyForCurrentView.value
    if (!contextKey) {
      return []
    }
    const draft = deps.viewEditorDraft.value
    const tabs: ViewTab[] = deps.customViewsForContext(contextKey)
      .filter(view => view.id !== draft?.id)
      .map(view => ({
        id: view.id,
        label: view.name,
        custom: true,
        icon: view.icon,
        color: view.color,
      }))
    if (draft && draft.contextKey === contextKey) {
      tabs.push({
        id: draft.id,
        label: draft.name.trim() || 'New view',
        custom: true,
        draft: true,
        icon: draft.icon,
        color: draft.color,
      })
    }
    return tabs
  })
  const savedViewRows = computed<SavedViewRow[]>(() =>
    deps.customViews.value
      .filter(view => customViewBelongsInCurrentViewsDirectory(view))
      .map(view => customViewToSavedViewRow(view)),
  )
  const baseDisplayedSavedViewRows = computed(() => savedViewRows.value)
  const displayedSavedViewRows = computed(() =>
    deps.applyViewFiltersToSavedViews(baseDisplayedSavedViewRows.value),
  )

  function customViewBelongsInFavoriteViewsDirectory(view: CustomView, viewId: string): boolean {
    const kind = getCustomViewKind(view.contextKey)
    const tab = getViewsDirectoryTabFromViewId(getFavoriteViewBaseId(viewId))
    if (kind === null || tab === null) {
      return false
    }
    if ((tab === 'project-views') !== (kind === 'projects')) {
      return false
    }
    const favoriteTeamKey = getFavoriteViewTeamKey(viewId)
    const viewTeamKey = getCustomViewTeamKey(view.contextKey)
    return favoriteTeamKey ? viewTeamKey === favoriteTeamKey : viewTeamKey === null
  }

  function customViewBelongsInCurrentViewsDirectory(view: CustomView): boolean {
    const kind = getCustomViewKind(view.contextKey)
    if (kind === null) {
      return false
    }
    if ((deps.activeViewsDirectoryTab.value === 'project-views') !== (kind === 'projects')) {
      return false
    }
    const activeTeamKey = deps.currentTeamKey.value
    const viewTeamKey = getCustomViewTeamKey(view.contextKey)
    return activeTeamKey ? viewTeamKey === activeTeamKey : viewTeamKey === null
  }
  function getCustomViewTeamKey(contextKey: string): string | null {
    return parseTeamViewId(contextKey)?.teamKey || null
  }
  function customViewToSavedViewRow(view: CustomView): SavedViewRow {
    const kind = getCustomViewKind(view.contextKey)
    const stats = getCustomViewStats(view)
    return {
      id: view.id,
      name: view.name,
      description: view.description,
      category: kind === 'projects' ? 'Projects' : 'Issues',
      owner: deps.currentUserName.value || 'Me',
      count: stats.count,
      updatedAt: stats.updatedAt,
      icon: view.icon,
      color: view.color,
      viewId: view.id,
    }
  }
  function getCustomViewStats(view: CustomView): {
    count: number
    updatedAt?: string
  } {
    const filters = customViewFiltersToClauses(view.filters)
    const kind = getCustomViewKind(view.contextKey)
    if (kind === 'projects') {
      const projects = getProjectRowsForCustomView(view.contextKey).filter(project =>
        filterGroupsMatch(project, filters, deps.projectMatchesFilter),
      )
      const updatedAt = [...projects].sort(
        (left, right) => getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt),
      )[0]?.updatedAt
      return { count: projects.length, updatedAt }
    }
    const tickets = getIssueTicketsForCustomView(view.contextKey).filter(ticket =>
      filterGroupsMatch(ticket, filters, deps.ticketMatchesFilter),
    )
    return {
      count: tickets.length,
      updatedAt: deps.sortTicketsByActivity(tickets)[0]?.updatedAt,
    }
  }
  function getIssueTicketsForCustomView(contextKey: string): JiraTicket[] {
    if (contextKey === 'my-issues') {
      return deps.issueTickets.value
    }
    const teamKey = getCustomViewTeamKey(contextKey)
    if (teamKey) {
      return deps.issueTickets.value.filter(ticket => ticket.spaceKey === teamKey)
    }
    return deps.issueTickets.value
  }
  function getProjectRowsForCustomView(contextKey: string): ProjectRow[] {
    const teamKey = getCustomViewTeamKey(contextKey)
    if (teamKey) {
      return deps.projectRows.value.filter(project => project.spaceKey === teamKey)
    }
    return deps.projectRows.value
  }
  function deriveViewLabel(viewId: string): string {
    const customView = deps.getCustomView(viewId)
    if (customView)
      return customView.name
    if (viewId === 'my-issues')
      return 'My issues · Assigned'
    if (viewId === 'my-created')
      return 'My issues · Created'
    if (viewId === 'initiatives')
      return 'Initiatives'
    if (viewId === 'projects')
      return 'Projects'
    if (viewId === 'views')
      return 'Views · Issues'
    if (viewId === 'project-views')
      return 'Views · Projects'
    const parsed = parseTeamViewId(viewId)
    if (parsed?.teamKey) {
      const { teamKey, section } = parsed
      const teamName = deps.enabledSpaces.value.find(space => space.key === teamKey)?.name || teamKey
      const sectionLabel = getTeamSectionLabel(section)
      const kind = section === 'projects' || section === 'project-views'
        ? 'projects'
        : section === 'views'
          ? null
          : 'issues'
      const parts = [sectionLabel]
      if (kind && !sectionLabel.toLowerCase().includes(kind)) {
        parts.push(kind)
      }
      parts.push(teamName)
      return parts.join(' ')
    }
    const savedView = savedViewRows.value.find(row => row.viewId === viewId)
    return savedView?.name ?? viewId
  }
  function getFavoriteViewBaseId(viewId: string): string {
    const customView = deps.getCustomView(viewId)
    return customView ? getBaseViewIdForCustomContext(customView.contextKey) : viewId
  }
  function getFavoriteViewTeamKey(viewId: string): string | null {
    return parseTeamViewId(getFavoriteViewBaseId(viewId))?.teamKey || null
  }

  return {
    customViewTabs,
    savedViewRows,
    baseDisplayedSavedViewRows,
    displayedSavedViewRows,
    customViewBelongsInFavoriteViewsDirectory,
    customViewBelongsInCurrentViewsDirectory,
    getCustomViewTeamKey,
    customViewToSavedViewRow,
    getCustomViewStats,
    getIssueTicketsForCustomView,
    getProjectRowsForCustomView,
    deriveViewLabel,
  }
}
