<script setup lang="ts">
import type { JiraTicket } from '@/types/jira'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { refreshCache } from '@/api/jira'
import AskAssistantPanel from '@/components/AskAssistantPanel.vue'
import { useAssistantPanel } from '@/composables/useAssistantPanel'
import { useAvailableSpaces } from '@/composables/useAvailableSpaces'
import {
  applyTicketsPayloadToQueryCache,
  getLatestRemoteUpdatedAt,
  ticketsQueryKey,
} from '@/composables/useJiraTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

const FOCUS_REFRESH_DEBOUNCE_MS = 3_000

const queryClient = useQueryClient()
const assistantPanel = useAssistantPanel()
const { enabledSpaces, hasJiraCredentialsConfigured, isLoading } = useSpaceSettings()
const { ensureAvailableSpacesLoaded } = useAvailableSpaces(hasJiraCredentialsConfigured)
const enabledSpaceKeys = computed(() => [...enabledSpaces.value.map(space => space.key)].sort())
const activeTicketsQueryKey = computed(() => ticketsQueryKey(enabledSpaceKeys.value))
const refreshingTicketsOnFocus = ref(false)
const lastFocusRefreshAt = ref(0)

const showJiraSetupModal = computed(() => !isLoading.value && !hasJiraCredentialsConfigured.value)

watch(
  [isLoading, hasJiraCredentialsConfigured],
  ([settingsAreLoading, jiraIsConfigured]) => {
    if (settingsAreLoading || !jiraIsConfigured) {
      return
    }

    void ensureAvailableSpacesLoaded()
  },
  { immediate: true },
)

function shouldRefreshTicketsOnWindowFocus(): boolean {
  if (isLoading.value || !hasJiraCredentialsConfigured.value || refreshingTicketsOnFocus.value) {
    return false
  }

  if (document.visibilityState !== 'visible') {
    return false
  }

  const currentQueryState = queryClient.getQueryState(activeTicketsQueryKey.value)
  if (!currentQueryState?.dataUpdatedAt) {
    return false
  }

  return Date.now() - lastFocusRefreshAt.value >= FOCUS_REFRESH_DEBOUNCE_MS
}

async function refreshTicketsOnWindowFocus() {
  if (!shouldRefreshTicketsOnWindowFocus()) {
    return
  }

  refreshingTicketsOnFocus.value = true
  lastFocusRefreshAt.value = Date.now()

  try {
    const currentTickets = queryClient.getQueryData<JiraTicket[]>(activeTicketsQueryKey.value) ?? []
    const updatedSince = getLatestRemoteUpdatedAt(currentTickets)
    const payload = await refreshCache(updatedSince ? { updatedSince } : {})

    applyTicketsPayloadToQueryCache(
      queryClient,
      activeTicketsQueryKey.value,
      payload,
      enabledSpaceKeys.value.includes(LOCAL_SPACE_KEY),
    )
  }
  catch (error) {
    console.error('Focus refresh failed', error)
  }
  finally {
    refreshingTicketsOnFocus.value = false
  }
}

function handleWindowFocus() {
  void refreshTicketsOnWindowFocus()
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    return
  }

  void refreshTicketsOnWindowFocus()
}

onMounted(() => {
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <NuxtPage />
  <AskAssistantPanel v-if="assistantPanel.isOpen.value" />
  <JiraSetupModal :open="showJiraSetupModal" />
  <LabelColorMenu />
  <AppToastContainer />
</template>
