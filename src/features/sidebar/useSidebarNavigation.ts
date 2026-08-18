import type { JiraTicket } from '@/types/jira'
import { useQueryClient } from '@tanstack/vue-query'
import { useLocalStorage } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { fetchTicket } from '@/api/jira'
import { fetchLocalTicket } from '@/api/localTickets'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { usePinnedTickets } from '@/composables/usePinnedTickets'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import {
  getTeamCycleViewId,
  getTeamViewId,
  isActiveIssueTicket,
  isBacklogIssueTicket,
  isEpicIssue,
  isInitiativeIssue,
  isSubIssueTicket,
  isTeamViewForTeam,
  parseTeamViewId,
} from '@/features/ticket-list/helpers'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import { isLocalTicketKey, LOCAL_SPACE_KEY } from '~/shared/localTickets'

export interface FavoriteViewNavItem {
  id: string
  label: string
  icon?: string
  color?: string
  count?: number
  showIssueCount: boolean
}

export interface PinnedTicketNavItem {
  key: string
  summary: string
  status: string
  statusCategory: string
  /** Set only for projects (epics), which render their custom icon instead of a status icon. */
  projectIcon: string | null
  projectColor: string | null
}

interface SidebarNavigationProps {
  tickets: JiraTicket[]
  selectedKey: string | null
  currentView: string
}

interface SidebarNavigationEmit {
  (event: 'view', viewId: string): void
  (event: 'leave-space', spaceKey: string): void
  (event: 'favorite-count-visibility', viewId: string, visible: boolean): void
}

interface NavItem {
  id: string
  label: string
  icon: string
  count?: number
}

interface TeamNavItem {
  key: string
  name: string
  triageCount: number
  icon: string | null
  color: string
  initial: string
}

interface TeamMenuState {
  open: boolean
  teamKey: string
  teamName: string
  x: number
  y: number
}

interface FavoriteMenuState {
  open: boolean
  viewId: string
  viewLabel: string
  showIssueCount: boolean
  x: number
  y: number
}

function getTeamKeyFromViewId(viewId: string): string | null {
  return parseTeamViewId(viewId)?.teamKey || null
}

export function useSidebarNavigation(
  props: SidebarNavigationProps,
  emit: SidebarNavigationEmit,
) {
  const { pinnedKeys } = usePinnedTickets()
  const { enabledSpaces } = useSpaceSettings()
  const { getProjectAppearance } = useProjectAppearances()
  const queryClient = useQueryClient()
  const fetchedPinnedTickets = ref<Record<string, JiraTicket>>({})

  const enabledSpaceKeys = computed(() => new Set(enabledSpaces.value.map(space => space.key)))
  const currentViewId = computed(() => props.currentView)
  const viewNavigationIsActive = computed(() => !props.selectedKey)
  const visibleTickets = computed(() => props.tickets.filter(ticket => enabledSpaceKeys.value.has(ticket.spaceKey)))
  const projectTicketKeySet = computed(() => {
    const keys = new Set<string>()
    for (const ticket of visibleTickets.value) {
      if (isEpicIssue(ticket)) {
        keys.add(ticket.key)
      }
    }
    return keys
  })
  const initiativeTicketKeySet = computed(() => {
    const keys = new Set<string>()
    for (const ticket of visibleTickets.value) {
      if (isInitiativeIssue(ticket)) {
        keys.add(ticket.key)
      }
    }
    return keys
  })
  const issueTickets = computed(() => visibleTickets.value.filter(
    ticket => !projectTicketKeySet.value.has(ticket.key) && !initiativeTicketKeySet.value.has(ticket.key),
  ))
  const activeTickets = computed(() => issueTickets.value.filter(isActiveIssueTicket))
  const workspaceExpanded = ref(true)
  const favoritesExpanded = ref(true)
  const expandedTeamKeys = useLocalStorage<string[]>('jira2.expandedTeams', [])
  const expandedCycleTeamKeys = useLocalStorage<string[]>('jira2.expandedCycleTeams', [])
  const expandedTeamKeySet = computed(() => new Set(expandedTeamKeys.value))
  const teamMenuElement = ref<HTMLElement | null>(null)
  const teamMenuState = ref<TeamMenuState>({
    open: false,
    teamKey: '',
    teamName: '',
    x: 0,
    y: 0,
  })
  const favoriteMenuElement = ref<HTMLElement | null>(null)
  const favoriteMenuState = ref<FavoriteMenuState>({
    open: false,
    viewId: '',
    viewLabel: '',
    showIssueCount: false,
    x: 0,
    y: 0,
  })
  const teamMenuStyle = computed(() => {
    const leftBoundary = typeof window === 'undefined' ? teamMenuState.value.x : window.innerWidth - 184
    const topBoundary = typeof window === 'undefined' ? teamMenuState.value.y : window.innerHeight - 72

    return {
      left: `${Math.max(8, Math.min(teamMenuState.value.x, leftBoundary))}px`,
      top: `${Math.max(8, Math.min(teamMenuState.value.y, topBoundary))}px`,
    }
  })
  const favoriteMenuStyle = computed(() => {
    const leftBoundary = typeof window === 'undefined' ? favoriteMenuState.value.x : window.innerWidth - 184
    const topBoundary = typeof window === 'undefined' ? favoriteMenuState.value.y : window.innerHeight - 96

    return {
      left: `${Math.max(8, Math.min(favoriteMenuState.value.x, leftBoundary))}px`,
      top: `${Math.max(8, Math.min(favoriteMenuState.value.y, topBoundary))}px`,
    }
  })

  const primaryItems = computed<NavItem[]>(() => [
    { id: 'my-issues', label: 'My issues', icon: 'target', count: activeTickets.value.length },
  ])

  const workspaceItems = computed<NavItem[]>(() => [
    { id: 'initiatives', label: 'Initiatives', icon: 'initiative' },
    { id: 'projects', label: 'Projects', icon: 'project' },
    { id: 'views', label: 'Views', icon: 'view' },
  ])

  const ticketByKey = computed(() => new Map(props.tickets.map<readonly [string, JiraTicket]>(ticket => [ticket.key, ticket])))
  const pinnedTickets = computed(() => pinnedKeys.value
    .map(key => ticketByKey.value.get(key) ?? fetchedPinnedTickets.value[key])
    .filter((ticket): ticket is JiraTicket => ticket !== undefined)
    .slice(0, 6))
  // A pinned epic is a favorited project, so it wears its custom project icon
  // rather than the status icon every other pinned issue gets.
  const pinnedTicketItems = computed<PinnedTicketNavItem[]>(() => pinnedTickets.value.map((ticket) => {
    const appearance = isEpicIssue(ticket) ? getProjectAppearance(ticket.key) : null

    return {
      key: ticket.key,
      summary: ticket.summary,
      status: ticket.status,
      statusCategory: ticket.statusCategory,
      projectIcon: appearance?.icon ?? null,
      projectColor: appearance?.color ?? null,
    }
  }))

  function getCachedPinnedTicket(key: string): JiraTicket | null {
    return isLocalTicketKey(key)
      ? queryClient.getQueryData<JiraTicket>(localTicketQueryKey(key)) ?? null
      : queryClient.getQueryData<JiraTicket>(ticketQueryKey(key)) ?? null
  }

  function storeFetchedPinnedTicket(pinnedKey: string, ticket: JiraTicket): void {
    fetchedPinnedTickets.value = {
      ...fetchedPinnedTickets.value,
      [pinnedKey]: ticket,
    }
  }

  // Jira keeps serving an issue under its old key after a project move, so a pinned key
  // can resolve to a ticket that now lives under a different key. Rewrite the stored key
  // so the sidebar row and the ticket detail's star agree on what is pinned — otherwise
  // the detail star stays unlit and the pin can never be removed.
  function renamePinnedKeys(renames: Map<string, string>): void {
    if (renames.size === 0) {
      return
    }

    pinnedKeys.value = [...new Set(pinnedKeys.value.map(key => renames.get(key) ?? key))]
  }

  function syncFetchedPinnedTicketsFromCache(keys = pinnedKeys.value): void {
    const nextFetchedPinnedTickets = { ...fetchedPinnedTickets.value }
    const renames = new Map<string, string>()
    let changed = false

    for (const key of keys) {
      const cachedTicket = getCachedPinnedTicket(key)
      if (!cachedTicket) {
        continue
      }

      if (cachedTicket.key !== key) {
        renames.set(key, cachedTicket.key)
        continue
      }

      if (nextFetchedPinnedTickets[key] === cachedTicket) {
        continue
      }

      nextFetchedPinnedTickets[key] = cachedTicket
      changed = true
    }

    if (changed) {
      fetchedPinnedTickets.value = nextFetchedPinnedTickets
    }

    renamePinnedKeys(renames)
  }

  function acceptFetchedPinnedTicket(pinnedKey: string, ticket: JiraTicket): void {
    if (ticket.key === pinnedKey) {
      storeFetchedPinnedTicket(pinnedKey, ticket)
      return
    }

    renamePinnedKeys(new Map([[pinnedKey, ticket.key]]))
  }

  function loadMissingPinnedTickets(keys: string[]): void {
    for (const key of keys) {
      if (ticketByKey.value.has(key) || fetchedPinnedTickets.value[key]) {
        continue
      }

      const cachedTicket = getCachedPinnedTicket(key)
      if (cachedTicket) {
        acceptFetchedPinnedTicket(key, cachedTicket)
        continue
      }

      const queryKey = isLocalTicketKey(key) ? localTicketQueryKey(key) : ticketQueryKey(key)
      const queryFn = () => isLocalTicketKey(key) ? fetchLocalTicket(key) : fetchTicket(key)
      void queryClient.fetchQuery({ queryKey, queryFn })
        .then(ticket => acceptFetchedPinnedTicket(key, ticket))
        .catch(() => {})
    }
  }

  watch(pinnedKeys, (keys) => {
    syncFetchedPinnedTicketsFromCache(keys)
    loadMissingPinnedTickets(keys)
  }, { immediate: true })

  let unsubscribeQueryCache: (() => void) | null = null

  const teamItems = computed<TeamNavItem[]>(() => enabledSpaces.value.map((space) => {
    const tickets = issueTickets.value.filter(ticket => ticket.spaceKey === space.key)
    const triageCount = tickets.filter(ticket => isBacklogIssueTicket(ticket) && !isSubIssueTicket(ticket)).length

    const appearance = resolveSpaceAppearance(space)

    return {
      key: space.key,
      name: space.name || space.key,
      triageCount,
      icon: appearance.icon,
      color: appearance.color,
      initial: appearance.initial,
    }
  }))

  function toggleWorkspace() {
    workspaceExpanded.value = !workspaceExpanded.value
  }

  function toggleFavorites() {
    favoritesExpanded.value = !favoritesExpanded.value
  }

  function isTeamExpanded(teamKey: string): boolean {
    return expandedTeamKeySet.value.has(teamKey)
  }

  function isCycleSectionExpanded(teamKey: string): boolean {
    if (isTeamCyclesView(teamKey)) {
      return true
    }
    return expandedCycleTeamKeys.value.includes(teamKey)
  }

  function toggleCycleSection(teamKey: string): void {
    if (expandedCycleTeamKeys.value.includes(teamKey)) {
      expandedCycleTeamKeys.value = expandedCycleTeamKeys.value.filter(key => key !== teamKey)
      return
    }
    expandedCycleTeamKeys.value = [...expandedCycleTeamKeys.value, teamKey]
  }

  function expandTeam(teamKey: string): void {
    if (isTeamExpanded(teamKey)) {
      return
    }

    expandedTeamKeys.value = [...expandedTeamKeys.value, teamKey]
  }

  function toggleTeam(teamKey: string): void {
    if (isTeamExpanded(teamKey)) {
      expandedTeamKeys.value = expandedTeamKeys.value.filter(key => key !== teamKey)
      return
    }

    expandedTeamKeys.value = [...expandedTeamKeys.value, teamKey]
  }

  function isActiveView(viewId: string): boolean {
    return viewNavigationIsActive.value && currentViewId.value === viewId
  }

  function selectView(viewId: string) {
    const teamKey = getTeamKeyFromViewId(viewId)
    if (teamKey !== null) {
      expandTeam(teamKey)
      const section = parseTeamViewId(viewId)?.section
      if (section === 'cycles' || section?.startsWith('cycle-')) {
        if (!expandedCycleTeamKeys.value.includes(teamKey)) {
          expandedCycleTeamKeys.value = [...expandedCycleTeamKeys.value, teamKey]
        }
      }
    }

    emit('view', viewId)
  }

  function openTeamMenu(team: TeamNavItem, event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    closeFavoriteMenu()

    if (team.key === LOCAL_SPACE_KEY) {
      closeTeamMenu()
      return
    }

    teamMenuState.value = {
      open: true,
      teamKey: team.key,
      teamName: team.name,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function closeTeamMenu(): void {
    teamMenuState.value = {
      ...teamMenuState.value,
      open: false,
    }
  }

  function openFavoriteMenu(favoriteView: FavoriteViewNavItem, event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    closeTeamMenu()

    favoriteMenuState.value = {
      open: true,
      viewId: favoriteView.id,
      viewLabel: favoriteView.label,
      showIssueCount: favoriteView.showIssueCount,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function closeFavoriteMenu(): void {
    favoriteMenuState.value = {
      ...favoriteMenuState.value,
      open: false,
    }
  }

  function setFavoriteIssueCountVisibility(visible: boolean): void {
    if (!favoriteMenuState.value.viewId) {
      return
    }

    emit('favorite-count-visibility', favoriteMenuState.value.viewId, visible)
    closeFavoriteMenu()
  }

  function leaveCurrentTeam(): void {
    if (!teamMenuState.value.teamKey) {
      return
    }

    emit('leave-space', teamMenuState.value.teamKey)
    closeTeamMenu()
  }

  function isTeamIssuesView(spaceKey: string): boolean {
    return viewNavigationIsActive.value && (
      currentViewId.value === getTeamViewId(spaceKey, 'all')
      || currentViewId.value === getTeamViewId(spaceKey, 'active')
      || currentViewId.value === getTeamViewId(spaceKey, 'backlog')
    )
  }

  function isTeamViewsView(spaceKey: string): boolean {
    return viewNavigationIsActive.value && (
      currentViewId.value === getTeamViewId(spaceKey, 'views')
      || currentViewId.value === getTeamViewId(spaceKey, 'project-views')
    )
  }

  function isTeamCyclesView(spaceKey: string): boolean {
    if (!viewNavigationIsActive.value) {
      return false
    }
    const parsed = parseTeamViewId(currentViewId.value)
    return parsed?.teamKey === spaceKey && Boolean(parsed.section && (
      parsed.section === 'cycles'
      || parsed.section.startsWith('cycle-')
    ))
  }

  function isCycleCurrentView(spaceKey: string): boolean {
    return viewNavigationIsActive.value && currentViewId.value === getTeamCycleViewId(spaceKey, 'current')
  }

  function isCycleUpcomingView(spaceKey: string): boolean {
    return viewNavigationIsActive.value && currentViewId.value === getTeamCycleViewId(spaceKey, 'upcoming')
  }

  function isCyclePreviousView(spaceKey: string): boolean {
    return viewNavigationIsActive.value && currentViewId.value === getTeamCycleViewId(spaceKey, 'previous')
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!teamMenuState.value.open && !favoriteMenuState.value.open) {
      return
    }

    const target = event.target
    if (target instanceof Node) {
      if (teamMenuElement.value?.contains(target)) {
        return
      }
      if (favoriteMenuElement.value?.contains(target)) {
        return
      }
    }

    closeTeamMenu()
    closeFavoriteMenu()
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeTeamMenu()
      closeFavoriteMenu()
    }
  }

  onMounted(() => {
    unsubscribeQueryCache = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated') {
        syncFetchedPinnedTicketsFromCache()
      }
    })
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    unsubscribeQueryCache?.()
    unsubscribeQueryCache = null
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    currentViewId,
    favoriteMenuElement,
    favoriteMenuState,
    favoriteMenuStyle,
    favoritesExpanded,
    getTeamCycleViewId,
    getTeamViewId,
    isActiveView,
    isCycleCurrentView,
    isCycleUpcomingView,
    isCyclePreviousView,
    isCycleSectionExpanded,
    isTeamExpanded,
    isTeamViewForTeam,
    isTeamIssuesView,
    isTeamViewsView,
    isTeamCyclesView,
    leaveCurrentTeam,
    openFavoriteMenu,
    openTeamMenu,
    pinnedTicketItems,
    primaryItems,
    selectView,
    teamItems,
    teamMenuElement,
    teamMenuState,
    teamMenuStyle,
    setFavoriteIssueCountVisibility,
    toggleFavorites,
    toggleTeam,
    toggleCycleSection,
    toggleWorkspace,
    viewNavigationIsActive,
    workspaceExpanded,
    workspaceItems,
  }
}
