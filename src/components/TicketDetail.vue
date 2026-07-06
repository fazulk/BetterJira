<script setup lang="ts">
import type { JiraTicket } from '@/types/jira'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { fetchTicket } from '@/api/jira'
import { fetchLocalTicket } from '@/api/localTickets'
import TicketDetailActivity from '@/components/ticket-detail/TicketDetailActivity.vue'
import TicketDetailChildren from '@/components/ticket-detail/TicketDetailChildren.vue'
import TicketDetailDescription from '@/components/ticket-detail/TicketDetailDescription.vue'
import TicketDetailHeader from '@/components/ticket-detail/TicketDetailHeader.vue'
import TicketDetailSidebar from '@/components/ticket-detail/TicketDetailSidebar.vue'
import ViewHeaderBreadcrumb from '@/components/ViewHeaderBreadcrumb.vue'
import { useAssistantPanel } from '@/composables/useAssistantPanel'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { ticketQueryKey, useJiraTicket } from '@/composables/useJiraTicket'
import { getCachedTickets } from '@/composables/useJiraTickets'
import { localTicketQueryKey, useLocalTicket } from '@/composables/useLocalTicket'
import { usePinnedTickets } from '@/composables/usePinnedTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { useToast } from '@/composables/useToast'
import { buildJiraIssueUrl } from '@/utils/jiraIssueUrl'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import { getAssistantActionLabel } from '~/shared/assistant'
import {
  isLocalTicketKey,
} from '~/shared/localTickets'

const props = withDefaults(defineProps<{
  ticketKey: string | null
  mode?: 'inline' | 'panel'
}>(), {
  mode: 'inline',
})
const emit = defineEmits<{
  close: []
  select: [key: string]
  navigateView: [viewId: string]
  createChild: [parentKey: string]
}>()

const { isPinned, togglePinnedTicket } = usePinnedTickets()
const { enabledSpaces, hasJiraCredentialsConfigured, jiraConnection } = useSpaceSettings()
const { settings: assistantSettings } = useAssistantSettings()
const { showError, showSuccess } = useToast()
const assistantPanel = useAssistantPanel()
const assistantActionLabel = computed(() => getAssistantActionLabel(assistantSettings.value.provider))
// The global panel docks in the same corner, so the launch button only shows
// while the panel is closed. Opening from any ticket (re-)pins the panel to it.
const showAssistantButton = computed(() => !assistantPanel.isOpen.value)
const ticketKey = computed(() => props.ticketKey)
const isLocalTicket = computed(() => isLocalTicketKey(ticketKey.value))
const jiraDataEnabled = computed(() => (
  Boolean(ticketKey.value && !isLocalTicketKey(ticketKey.value) && hasJiraCredentialsConfigured.value)
))

const ticketQuery = useJiraTicket(ticketKey, { queryEnabled: jiraDataEnabled })
const localTicketQuery = useLocalTicket(ticketKey)
const queryClient = useQueryClient()

const cachedTicket = computed<JiraTicket | null>(() => {
  const key = ticketKey.value
  if (!key)
    return null

  const tickets = getCachedTickets(queryClient)
  return tickets?.find(ticket => ticket.key === key) ?? null
})

const ticket = computed(() => {
  if (isLocalTicket.value) {
    return localTicketQuery.data.value ?? cachedTicket.value
  }

  return ticketQuery.data.value ?? cachedTicket.value
})
const jiraIssueUrl = computed(() => {
  const currentTicket = ticket.value
  if (!currentTicket || isLocalTicket.value) {
    return null
  }

  return buildJiraIssueUrl(jiraConnection.value.baseUrl, currentTicket.key)
})
const detailSpaceAppearance = computed(() => {
  const currentTicket = ticket.value
  if (!currentTicket)
    return null

  const space = enabledSpaces.value.find(entry => entry.key === currentTicket.spaceKey)
  return resolveSpaceAppearance(space ?? {
    key: currentTicket.spaceKey,
    name: currentTicket.spaceName || currentTicket.spaceKey,
  })
})
const ticketIsPinned = computed(() => (
  ticket.value ? isPinned(ticket.value.key) : false
))

const detailQueryError = computed(() => (
  isLocalTicket.value ? localTicketQuery.isError.value : ticketQuery.isError.value
))

const issueType = computed(() => ticket.value?.issueType?.toLowerCase() || 'task')

const childTickets = computed<JiraTicket[]>(() => {
  const key = ticketKey.value
  if (!key)
    return []
  const allTickets = getCachedTickets(queryClient)
  if (!allTickets)
    return []
  return allTickets.filter(t => t.parent?.key === key)
})

const isProjectDetail = computed(() => (
  issueType.value.includes('epic')
))
const isInitiativeDetail = computed(() => (
  issueType.value.includes('initiative')
))
const detailBreadcrumbRoot = computed(() => {
  if (isInitiativeDetail.value)
    return 'Initiatives'
  return isProjectDetail.value ? 'Projects' : 'Issues'
})
const detailBreadcrumbSpace = computed(() => (
  ticket.value?.spaceName || ticket.value?.spaceKey || 'Workspace'
))
const detailBreadcrumbViewId = computed(() => {
  if (isInitiativeDetail.value)
    return 'initiatives'

  const spaceKey = ticket.value?.spaceKey
  if (!spaceKey)
    return isProjectDetail.value ? 'projects' : 'my-issues'
  return isProjectDetail.value ? `team:${spaceKey}:projects` : `team:${spaceKey}:all`
})
const detailChildActionLabel = computed(() => {
  if (isInitiativeDetail.value)
    return 'Add epic'
  return isProjectDetail.value ? 'Add issue' : 'Add sub-issue'
})
const detailChildSectionLabel = computed(() => {
  if (isInitiativeDetail.value)
    return 'Epics'
  return isProjectDetail.value ? 'Issues' : 'Sub-issues'
})
const detailEmptyChildLabel = computed(() => {
  if (isInitiativeDetail.value)
    return 'No epics linked'
  return isProjectDetail.value ? 'No issues linked' : 'No sub-issues'
})

const imagePreview = ref<{ src: string, alt: string } | null>(null)

function openImagePreview(payload: { src: string, alt: string }): void {
  imagePreview.value = payload
}

function closeImagePreview(): void {
  imagePreview.value = null
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleDetailShortcut)
})

const ticketActivityRef = ref<InstanceType<typeof TicketDetailActivity> | null>(null)
const ticketDescriptionRef = ref<InstanceType<typeof TicketDetailDescription> | null>(null)
const ticketHeaderRef = ref<InstanceType<typeof TicketDetailHeader> | null>(null)
const ticketSidebarRef = ref<InstanceType<typeof TicketDetailSidebar> | null>(null)

function prefetchTicket(key: string) {
  if (isLocalTicketKey(key)) {
    queryClient.prefetchQuery({
      queryKey: localTicketQueryKey(key),
      queryFn: () => fetchLocalTicket(key),
    })
    return
  }

  queryClient.prefetchQuery({
    queryKey: ticketQueryKey(key),
    queryFn: () => fetchTicket(key),
  })
}

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

function isCopyJiraIssueUrlShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey)
    && event.shiftKey
    && !event.altKey
    && event.key.toLowerCase() === 'c'
}

async function copyActiveJiraIssueUrl(): Promise<void> {
  const currentTicket = ticket.value
  const currentJiraIssueUrl = jiraIssueUrl.value

  if (!currentTicket || !currentJiraIssueUrl || isLocalTicket.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(currentJiraIssueUrl)
    showSuccess(`Copied ${currentTicket.key} Jira link to clipboard.`)
  }
  catch (error) {
    console.error('Failed to copy Jira link', error)
    showError('Failed to copy Jira link.')
  }
}

function handleDetailShortcut(event: KeyboardEvent): void {
  if (imagePreview.value && event.key === 'Escape') {
    event.preventDefault()
    closeImagePreview()
    return
  }

  if (isCopyJiraIssueUrlShortcut(event)) {
    if (
      !ticket.value
      || props.mode !== 'inline'
      || !jiraIssueUrl.value
      || isLocalTicket.value
      || isEditableShortcutTarget(event.target)
    ) {
      return
    }

    event.preventDefault()
    void copyActiveJiraIssueUrl()
    return
  }

  if (!ticket.value || props.mode !== 'inline' || isEditableShortcutTarget(event.target)) {
    return
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return
  }

  if (event.key === 'Escape') {
    emit('close')
    return
  }

  const key = event.key.toLowerCase()
  if (key === 'a') {
    event.preventDefault()
    void ticketSidebarRef.value?.startEditingAssignee()
  }
  else if (key === 'p') {
    event.preventDefault()
    void ticketSidebarRef.value?.startEditingPriority()
  }
  else if (key === 'm') {
    event.preventDefault()
    void ticketSidebarRef.value?.startEditingStatus()
  }
  else if (key === 'c') {
    event.preventDefault()
    ticketActivityRef.value?.focusMessageComposer()
  }
  else if (key === 'd') {
    event.preventDefault()
    ticketDescriptionRef.value?.focusDescriptionEditor()
  }
  else if (key === 't') {
    event.preventDefault()
    ticketHeaderRef.value?.focusTitleInput()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleDetailShortcut)
})
</script>

<template>
  <div v-if="ticketKey && mode === 'inline'" class="min-h-full bg-issue-detail-bg lg:flex lg:h-full lg:min-h-0 lg:flex-col">
    <div v-if="ticket" class="min-h-full animate-fade-in bg-issue-detail-bg lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <div class="sticky top-0 z-20 border-b border-white/[0.06] bg-issue-detail-bg backdrop-blur lg:static lg:shrink-0">
        <div class="flex min-h-12 items-center justify-between gap-4 px-6 py-2">
          <ViewHeaderBreadcrumb
            v-if="detailSpaceAppearance"
            :icon="detailSpaceAppearance.icon"
            :icon-color="detailSpaceAppearance.color"
            :fallback="detailSpaceAppearance.initial"
          >
            <span class="min-w-0 truncate">{{ detailBreadcrumbSpace }}</span>
            <span class="shrink-0 text-[#6f727b]">›</span>
            <button
              type="button"
              class="shrink-0 rounded px-1 py-0.5 text-[#f0f1f4] transition hover:bg-white/[0.04]"
              @click="emit('navigateView', detailBreadcrumbViewId)"
            >
              {{ detailBreadcrumbRoot }}
            </button>
            <template v-if="ticket.parent">
              <span class="shrink-0 text-[#6f727b]">›</span>
              <button
                type="button"
                class="shrink-0 rounded px-1 py-0.5 text-[#f0f1f4] transition hover:bg-white/[0.04]"
                @click="$emit('select', ticket.parent.key)"
                @mouseenter="prefetchTicket(ticket.parent.key)"
              >
                {{ ticket.parent.key }}
              </button>
            </template>
            <span class="shrink-0 text-[#6f727b]">›</span>
            <button
              type="button"
              class="min-w-0 truncate rounded px-1 py-0.5 text-left text-[#f0f1f4] transition hover:bg-white/[0.04]"
              @click="$emit('select', ticket.key)"
            >
              {{ ticket.summary }}
            </button>
            <button
              type="button"
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition hover:bg-white/[0.04] hover:text-[#f0f1f4]"
              :class="ticketIsPinned ? 'text-[#d7a543] hover:text-[#d7a543]' : 'text-[#8f9198]'"
              :aria-label="ticketIsPinned ? `Unpin ${ticket.key}` : `Pin ${ticket.key}`"
              @click="togglePinnedTicket(ticket.key)"
            >
              <span class="text-[14px] leading-none">★</span>
            </button>
          </ViewHeaderBreadcrumb>
        </div>
      </div>

      <div class="grid min-h-[calc(100vh-3rem)] grid-cols-1 bg-issue-detail-bg lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_19rem] lg:overflow-hidden">
        <main class="scrollbar-gutter-stable min-w-0 px-6 py-8 lg:overflow-y-auto lg:px-10">
          <div class="mx-auto max-w-3xl">
            <TicketDetailHeader
              ref="ticketHeaderRef"
              :child-tickets="childTickets"
              :is-project-detail="isProjectDetail"
              :ticket="ticket"
              @prefetch="prefetchTicket"
              @select="$emit('select', $event)"
            />

            <TicketDetailDescription
              ref="ticketDescriptionRef"
              :is-local-ticket="isLocalTicket"
              :ticket="ticket"
              @preview-image="openImagePreview"
            />

            <TicketDetailChildren
              :action-label="detailChildActionLabel"
              :child-tickets="childTickets"
              :empty-label="detailEmptyChildLabel"
              :section-label="detailChildSectionLabel"
              :ticket-key="ticket.key"
              @create="emit('createChild', $event)"
              @prefetch="prefetchTicket"
              @select="$emit('select', $event)"
            />

            <TicketDetailActivity
              v-if="!isLocalTicket"
              ref="ticketActivityRef"
              :query-enabled="jiraDataEnabled"
              :ticket="ticket"
              :ticket-key="ticket.key"
            />
          </div>
        </main>

        <TicketDetailSidebar
          ref="ticketSidebarRef"
          :is-local-ticket="isLocalTicket"
          :is-project-detail="isProjectDetail"
          :jira-data-enabled="jiraDataEnabled"
          :ticket="ticket"
          @prefetch="prefetchTicket"
          @select="$emit('select', $event)"
        />
      </div>

      <button
        v-if="showAssistantButton"
        type="button"
        class="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#16171b] px-4 py-2.5 text-sm font-medium text-slate-100 shadow-2xl shadow-black/50 transition hover:border-white/[0.2] hover:bg-[#1c1d22]"
        @click="assistantPanel.openForTicket(ticket.key, ticket.summary)"
      >
        <Icon name="lucide:sparkles" class="h-4 w-4 text-accent-indigo" aria-hidden="true" />
        {{ assistantActionLabel }}
      </button>
    </div>

    <div
      v-else-if="detailQueryError"
      class="flex items-center justify-center py-20 text-sm text-rose-300"
    >
      Failed to load ticket details.
    </div>

    <div v-else class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-accent-indigo" />
        <span class="text-xs text-slate-600">Loading ticket</span>
      </div>
    </div>

    <div
      v-if="imagePreview"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      @click="closeImagePreview"
    >
      <button
        type="button"
        class="absolute right-5 top-5 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur transition hover:bg-white/[0.14] hover:text-white"
        @click.stop="closeImagePreview"
      >
        Close
      </button>
      <img
        :src="imagePreview.src"
        :alt="imagePreview.alt"
        class="h-auto w-auto rounded-lg shadow-2xl"
        style="max-width: calc(100vw - 4rem); max-height: calc(100vh - 5rem);"
        @click.stop
      >
    </div>
  </div>
</template>
