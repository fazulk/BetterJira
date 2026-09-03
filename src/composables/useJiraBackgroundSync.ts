import type { JiraTicket } from '@/types/jira'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { refreshCache } from '@/api/jira'
import { ticketQueryKey, ticketsQueryKey, transitionsQueryKey } from '@/composables/queryKeys'
import { useAvailableSpaces } from '@/composables/useAvailableSpaces'
import { ticketActivityQueryKey, ticketMessagesQueryKey } from '@/composables/useJiraMessages'
import { applyTicketsPayloadToQueryCache, getLatestRemoteUpdatedAt } from '@/composables/useJiraTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { ticketDevStatusQueryKey } from '@/composables/useTicketDevStatus'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

export const BACKGROUND_SYNC_INTERVAL_MS = 60_000
export const BACKGROUND_SYNC_FOCUS_DEBOUNCE_MS = 3_000
export const BACKGROUND_SYNC_STARTUP_STALE_MS = 20_000
export const BACKGROUND_SYNC_SPACES_INTERVAL_MS = 10 * 60_000

export type BackgroundSyncReason = 'startup' | 'interval' | 'focus' | 'online'

export interface BackgroundSyncGuardInput {
  now: number
  lastSyncAt: number
  dataUpdatedAt: number | undefined
  isSyncing: boolean
  settingsLoading: boolean
  hasCredentials: boolean
  visibilityState: string
  online: boolean
  reason: BackgroundSyncReason
}

export function shouldRunBackgroundSync(input: BackgroundSyncGuardInput): boolean {
  if (input.settingsLoading || !input.hasCredentials || input.isSyncing)
    return false
  if (input.visibilityState !== 'visible')
    return false
  if (!input.online)
    return false
  if (
    (input.reason === 'focus' || input.reason === 'online')
    && input.now - input.lastSyncAt < BACKGROUND_SYNC_FOCUS_DEBOUNCE_MS
  ) {
    return false
  }
  if (
    input.reason === 'startup'
    && input.dataUpdatedAt !== undefined
    && input.now - input.dataUpdatedAt < BACKGROUND_SYNC_STARTUP_STALE_MS
  ) {
    return false
  }
  return true
}

function readVisibilityState(): string {
  if (typeof document === 'undefined' || !document.visibilityState)
    return 'visible'
  return document.visibilityState
}

function readOnlineState(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean')
    return true
  return navigator.onLine
}

/**
 * Keeps Jira data fresh without manual "Sync Jira" clicks.
 *
 * - Startup sync when the restored cache is stale (persisted cache can be up
 *   to 2 days old with `refetchOnMount: false`).
 * - Interval polling (incremental `POST /refresh`) while the app is visible.
 * - Re-sync on window focus, visibility change, and reconnect.
 * - Invalidates the open ticket's detail queries plus cycle queries so the
 *   detail view, comments/activity, dev status, and sprints follow the list.
 */
export function useJiraBackgroundSync() {
  const queryClient = useQueryClient()
  const route = useRoute()
  const { enabledSpaces, hasJiraCredentialsConfigured, isLoading } = useSpaceSettings()
  const { ensureAvailableSpacesLoaded, refreshAvailableSpaces } = useAvailableSpaces(hasJiraCredentialsConfigured)

  const enabledSpaceKeys = computed(() => [...enabledSpaces.value.map(space => space.key)].sort())
  const activeTicketsQueryKey = computed(() => ticketsQueryKey(enabledSpaceKeys.value))
  const selectedKey = computed(() =>
    typeof route.params.key === 'string' && route.params.key.length > 0 ? route.params.key : null,
  )

  const isSyncing = ref(false)
  const lastSyncAt = ref(0)
  const lastSpacesSyncAt = ref(0)
  let intervalId: ReturnType<typeof setInterval> | null = null

  async function invalidateRelatedQueries(): Promise<void> {
    const key = selectedKey.value
    const invalidations: Promise<unknown>[] = [
      // Cycles live behind `['space-cycles', spaceKey]`; a prefix invalidate
      // only refetches mounted views and otherwise just marks them stale.
      queryClient.invalidateQueries({ queryKey: ['space-cycles'] }),
    ]

    if (key) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: ticketQueryKey(key) }),
        queryClient.invalidateQueries({ queryKey: ticketMessagesQueryKey(key) }),
        queryClient.invalidateQueries({ queryKey: ticketActivityQueryKey(key) }),
        queryClient.invalidateQueries({ queryKey: ticketDevStatusQueryKey(key) }),
        queryClient.invalidateQueries({ queryKey: transitionsQueryKey(key) }),
      )
    }

    await Promise.allSettled(invalidations)
  }

  async function maybeRefreshSpaces(): Promise<void> {
    if (Date.now() - lastSpacesSyncAt.value < BACKGROUND_SYNC_SPACES_INTERVAL_MS)
      return
    try {
      await refreshAvailableSpaces()
      lastSpacesSyncAt.value = Date.now()
    }
    catch (error) {
      console.warn('Background spaces refresh failed', error)
    }
  }

  async function syncTickets(reason: BackgroundSyncReason): Promise<void> {
    if (typeof window === 'undefined')
      return

    const now = Date.now()
    const currentState = queryClient.getQueryState(activeTicketsQueryKey.value)
    if (!shouldRunBackgroundSync({
      now,
      lastSyncAt: lastSyncAt.value,
      dataUpdatedAt: currentState?.dataUpdatedAt,
      isSyncing: isSyncing.value,
      settingsLoading: isLoading.value,
      hasCredentials: hasJiraCredentialsConfigured.value,
      visibilityState: readVisibilityState(),
      online: readOnlineState(),
      reason,
    })) {
      return
    }

    isSyncing.value = true
    try {
      const current = queryClient.getQueryData<JiraTicket[]>(activeTicketsQueryKey.value) ?? []
      const updatedSince = getLatestRemoteUpdatedAt(current)
      const payload = await refreshCache(updatedSince ? { updatedSince } : {})
      applyTicketsPayloadToQueryCache(
        queryClient,
        activeTicketsQueryKey.value,
        payload,
        enabledSpaceKeys.value.includes(LOCAL_SPACE_KEY),
      )
      lastSyncAt.value = Date.now()
      await invalidateRelatedQueries()
      await maybeRefreshSpaces()
    }
    catch (error) {
      console.error(`Background sync (${reason}) failed`, error)
    }
    finally {
      isSyncing.value = false
    }
  }

  function handleWindowFocus(): void {
    void syncTickets('focus')
  }

  function handleVisibilityChange(): void {
    if (readVisibilityState() !== 'visible')
      return
    void syncTickets('focus')
  }

  function handleOnline(): void {
    void syncTickets('online')
  }

  watch(
    [isLoading, hasJiraCredentialsConfigured],
    ([settingsAreLoading, jiraIsConfigured]) => {
      if (settingsAreLoading || !jiraIsConfigured)
        return
      void ensureAvailableSpacesLoaded()
        .then(() => {
          lastSpacesSyncAt.value = Date.now()
        })
        .catch((error: unknown) => {
          console.warn('Background spaces bootstrap failed', error)
        })
      void syncTickets('startup')
    },
    { immediate: true },
  )

  onMounted(() => {
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    intervalId = setInterval(() => {
      void syncTickets('interval')
    }, BACKGROUND_SYNC_INTERVAL_MS)
  })

  onUnmounted(() => {
    window.removeEventListener('focus', handleWindowFocus)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  return {
    isSyncing,
    lastSyncAt,
    hasJiraCredentialsConfigured,
    isLoading,
  }
}
