import type { ComputedRef, Ref } from 'vue'
import type { MyIssuesViewId, ViewsDirectoryTabId } from './types'
import type { JiraTicket } from '@/types/jira'
import type { AppSpaceSetting, CustomView } from '~/shared/settings'
import { computed } from 'vue'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import {
  getBaseViewIdForCustomContext,
  getTeamViewId,
  getViewsDirectoryTabFromViewId,
  parseTeamViewId,
} from './helpers'

interface UseViewContextDeps {
  currentView: Ref<string>
  selectedTicket: ComputedRef<JiraTicket | null>
  viewEditorDraft: Ref<CustomView | null>
  getCustomView: (viewId: string) => CustomView | null
  enabledSpaces: ComputedRef<AppSpaceSetting[]>
  issueTickets: ComputedRef<JiraTicket[]>
}

export function useViewContext(deps: UseViewContextDeps) {
  const activeCustomView = computed(() => {
    if (deps.viewEditorDraft.value && deps.currentView.value === deps.viewEditorDraft.value.id) {
      return deps.viewEditorDraft.value
    }
    return deps.getCustomView(deps.currentView.value)
  })
  const activeBaseViewId = computed(() =>
    activeCustomView.value
      ? getBaseViewIdForCustomContext(activeCustomView.value.contextKey)
      : deps.currentView.value,
  )
  const activeCustomViewContextKey = computed(() => activeCustomView.value?.contextKey ?? null)
  const contextKeyForCurrentView = computed(
    () => activeCustomViewContextKey.value ?? getContextKeyForViewId(activeBaseViewId.value),
  )
  const supportsCustomViews = computed(() => contextKeyForCurrentView.value !== null)
  const currentTeamKey = computed(() => {
    const parsed = parseTeamViewId(activeBaseViewId.value)
    return parsed ? (parsed.teamKey ?? null) : null
  })
  const currentTeamName = computed(() => {
    const key = currentTeamKey.value
    if (!key)
      return null
    return deps.enabledSpaces.value.find(space => space.key === key)?.name ?? key
  })
  const currentTeamSection = computed(() => {
    const parsed = parseTeamViewId(activeBaseViewId.value)
    return parsed ? (parsed.section ?? 'active') : null
  })
  const currentTeamAppearance = computed(() => {
    const key = currentTeamKey.value
    if (!key)
      return null
    const space = deps.enabledSpaces.value.find(entry => entry.key === key)
    return resolveSpaceAppearance(space ?? { key, name: key })
  })
  const currentTeamSectionLabel = computed(() => {
    switch (currentTeamSection.value) {
      case 'triage':
        return 'Triage'
      case 'projects':
        return 'Projects'
      case 'views':
      case 'project-views':
        return 'Views'
      case 'settings':
        return 'Settings'
      case 'all':
      case 'active':
      case 'backlog':
        return 'Issues'
      default:
        return null
    }
  })
  const isViewsDirectory = computed(
    () => getViewsDirectoryTabFromViewId(deps.currentView.value) !== null,
  )
  const activeViewsDirectoryTab = computed<ViewsDirectoryTabId>(
    () => getViewsDirectoryTabFromViewId(deps.currentView.value) ?? 'views',
  )
  const isProjectDisplayView = computed(
    () => activeBaseViewId.value === 'projects' || currentTeamSection.value === 'projects',
  )
  const isInitiativeDisplayView = computed(() => deps.currentView.value === 'initiatives')
  const isTeamSettingsView = computed(() => currentTeamSection.value === 'settings')
  const isIssueDisplayView = computed(
    () =>
      !isProjectDisplayView.value
      && !isInitiativeDisplayView.value
      && !isViewsDirectory.value
      && !isTeamSettingsView.value,
  )
  const currentTeamTickets = computed(() => {
    const key = currentTeamKey.value
    if (!key)
      return []
    return deps.issueTickets.value.filter(ticket => ticket.spaceKey === key)
  })
  const viewTitle = computed(() => {
    if (deps.selectedTicket.value)
      return deps.selectedTicket.value.key
    if (activeCustomView.value)
      return activeCustomView.value.name
    if (isMyIssuesView(activeBaseViewId.value))
      return 'My issues'
    if (deps.currentView.value === 'initiatives')
      return 'Initiatives'
    if (activeBaseViewId.value === 'projects')
      return 'Projects'
    if (isViewsDirectory.value)
      return 'Views'
    if (deps.currentView.value === 'search')
      return 'Search'
    if (currentTeamName.value)
      return currentTeamName.value
    return 'Issues'
  })
  const scopedTickets = computed(() => {
    if (activeBaseViewId.value === 'my-created') {
      return deps.issueTickets.value
    }
    if (activeBaseViewId.value === 'my-issues') {
      return deps.issueTickets.value
    }
    if (currentTeamKey.value) {
      const teamTickets = currentTeamTickets.value
      return teamTickets
    }
    return deps.issueTickets.value
  })

  function getContextKeyForViewId(viewId: string): string | null {
    const parsed = parseTeamViewId(viewId)
    if (parsed?.teamKey) {
      const { teamKey, section } = parsed
      if (section === 'projects' || section === 'project-views') {
        return getTeamViewId(teamKey, 'projects')
      }
      if (section === 'views' || section === 'all' || section === 'active' || section === 'backlog') {
        return getTeamViewId(teamKey, 'issues')
      }
      return null
    }
    if (viewId === 'projects') {
      return 'projects'
    }
    if (viewId === 'views') {
      return 'my-issues'
    }
    if (viewId === 'project-views') {
      return 'projects'
    }
    if (isMyIssuesView(viewId)) {
      return 'my-issues'
    }
    return null
  }
  function isMyIssuesView(viewId: string): viewId is MyIssuesViewId {
    return viewId === 'my-issues' || viewId === 'my-created'
  }

  return {
    activeCustomView,
    activeBaseViewId,
    activeCustomViewContextKey,
    contextKeyForCurrentView,
    supportsCustomViews,
    currentTeamKey,
    currentTeamName,
    currentTeamSection,
    currentTeamAppearance,
    currentTeamSectionLabel,
    isViewsDirectory,
    activeViewsDirectoryTab,
    isProjectDisplayView,
    isInitiativeDisplayView,
    isTeamSettingsView,
    isIssueDisplayView,
    currentTeamTickets,
    viewTitle,
    scopedTickets,
    getContextKeyForViewId,
    isMyIssuesView,
  }
}
