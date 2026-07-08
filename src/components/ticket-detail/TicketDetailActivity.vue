<script setup lang="ts">
import type { JiraActivityComment, JiraActivityItem, JiraTicket } from '@/types/jira'
import { computed, nextTick, ref } from 'vue'
import { useAddTicketMessage } from '@/composables/useAddTicketMessage'
import { useJiraActivity } from '@/composables/useJiraMessages'
import { useUpdateTicketWatching } from '@/composables/useUpdateTicketWatching'

const props = defineProps<{
  queryEnabled: boolean
  ticket: JiraTicket
  ticketKey: string
}>()

const activityQuery = useJiraActivity(
  computed(() => props.ticketKey),
  { queryEnabled: computed(() => props.queryEnabled) },
)
const updateWatchingMutation = useUpdateTicketWatching()
const addMessageMutation = useAddTicketMessage()

const messageDraft = ref('')
const messageError = ref<string | null>(null)
const watchError = ref<string | null>(null)
const messageTextareaRef = ref<HTMLTextAreaElement | null>(null)
const activityComposerOpen = ref(false)

const activityItems = computed(() => activityQuery.data.value ?? [])
const messageCanSubmit = computed(() => messageDraft.value.trim().length > 0)
const detailWatchActionLabel = computed(() => (props.ticket.isWatching ? 'Unsubscribe' : 'Subscribe'))
const detailWatchButtonLabel = computed(() => (
  updateWatchingMutation.isPending.value ? 'Saving...' : detailWatchActionLabel.value
))
const detailWatchCountLabel = computed(() => {
  const watchCount = props.ticket.watchCount
  if (typeof watchCount !== 'number')
    return null
  return `${watchCount} ${watchCount === 1 ? 'subscriber' : 'subscribers'}`
})

function addActivityParticipantName(names: string[], name: string | undefined): void {
  const nextName = name?.trim()
  if (!nextName || nextName === 'Unassigned' || names.includes(nextName))
    return
  names.push(nextName)
}

const detailActivityParticipantNames = computed(() => {
  const names: string[] = []

  for (const name of [props.ticket.reporter, props.ticket.assignee]) {
    addActivityParticipantName(names, name)
  }

  for (const item of activityItems.value) {
    addActivityParticipantName(names, item.author)
  }

  return names.slice(0, 4)
})

function getAssigneeAvatarColor(name: string | undefined) {
  if (!name || name === 'Unassigned')
    return 'bg-slate-500/15 text-slate-400 border-slate-500/15'
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const avatarColors = [
    'bg-white/[0.045] text-slate-300 border-white/[0.08]',
    'bg-amber-500/20 text-amber-300 border-amber-500/20',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
    'bg-rose-500/20 text-rose-300 border-rose-500/20',
    'bg-sky-500/20 text-sky-300 border-sky-500/20',
  ]
  return avatarColors[hash % avatarColors.length]
}

function getAssigneeInitials(name: string | undefined) {
  if (!name || name === 'Unassigned')
    return '?'
  const parts = name.split(/\s+/)
  const firstPart = parts[0]
  const secondPart = parts[1]
  if (firstPart && secondPart)
    return `${firstPart[0] ?? ''}${secondPart[0] ?? ''}`
  return name.slice(0, 2)
}

function getActivityCreatedAtMs(item: JiraActivityItem): number {
  const createdAtMs = Date.parse(item.createdAt)
  return Number.isNaN(createdAtMs) ? Number.MIN_SAFE_INTEGER : createdAtMs
}

const activityTimelineItems = computed(() => (
  [...activityItems.value].sort((left, right) => (
    getActivityCreatedAtMs(left) - getActivityCreatedAtMs(right)
    || left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' })
  ))
))

const activityCommentById = computed(() => {
  const comments = new Map<string, JiraActivityComment>()
  for (const item of activityItems.value) {
    if (item.kind === 'comment')
      comments.set(item.id, item)
  }
  return comments
})

function getActivityCommentParent(comment: JiraActivityComment): JiraActivityComment | null {
  const parentMessageId = comment.parentMessageId
  return parentMessageId ? activityCommentById.value.get(parentMessageId) ?? null : null
}

function getActivityCommentParentAuthor(item: JiraActivityItem): string | null {
  if (item.kind !== 'comment')
    return null
  return getActivityCommentParent(item)?.author ?? null
}

function getActivityHistoryMarkerClass(item: JiraActivityItem): string {
  if (item.kind !== 'history')
    return 'border-white/[0.14] text-slate-500'

  const field = item.field.trim().toLowerCase()
  if (field === 'created')
    return 'border-sky-400/35 text-sky-300'
  if (field === 'status')
    return 'border-amber-400/40 text-amber-300'
  if (field === 'assignee')
    return 'border-emerald-400/35 text-emerald-300'
  if (field === 'priority')
    return 'border-rose-400/35 text-rose-300'
  return 'border-white/[0.14] text-slate-500'
}

function getActivityHistoryDotClass(item: JiraActivityItem): string {
  if (item.kind !== 'history')
    return 'bg-slate-500'

  const field = item.field.trim().toLowerCase()
  if (field === 'created')
    return 'bg-sky-300'
  if (field === 'status')
    return 'bg-amber-300'
  if (field === 'assignee')
    return 'bg-emerald-300'
  if (field === 'priority')
    return 'bg-rose-300'
  return 'bg-slate-500'
}

const datePartFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function formatActivityTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return value

  const diffMs = Date.now() - parsed.getTime()
  const absDiffMs = Math.abs(diffMs)
  const isFuture = diffMs < 0
  const minutes = Math.floor(absDiffMs / 60000)
  const hours = Math.floor(absDiffMs / 3600000)
  const days = Math.floor(absDiffMs / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  let label: string
  if (minutes < 1)
    label = 'just now'
  else if (minutes < 60)
    label = `${minutes}m`
  else if (hours < 24)
    label = `${hours}h`
  else if (days < 7)
    label = `${days}d`
  else if (weeks < 5)
    label = `${weeks}w`
  else label = `${months}mo`

  if (label === 'just now')
    return label
  return isFuture ? `in ${label}` : `${label} ago`
}

async function toggleTicketWatching() {
  if (updateWatchingMutation.isPending.value)
    return

  try {
    await updateWatchingMutation.mutateAsync({
      key: props.ticket.key,
      watching: props.ticket.isWatching !== true,
    })
    watchError.value = null
  }
  catch (err) {
    watchError.value = err instanceof Error ? err.message : 'Failed to update subscription.'
  }
}

function focusMessageComposer(): void {
  activityComposerOpen.value = true
  nextTick(() => {
    messageTextareaRef.value?.focus()
  })
}

async function submitMessage() {
  if (addMessageMutation.isPending.value)
    return

  const nextMessage = messageDraft.value.trim()
  if (!nextMessage)
    return

  try {
    await addMessageMutation.mutateAsync({
      key: props.ticket.key,
      body: nextMessage,
    })
    messageDraft.value = ''
    messageError.value = null
    activityComposerOpen.value = false
  }
  catch (err) {
    messageError.value = err instanceof Error ? err.message : 'Failed to add message.'
  }
}

void datePartFormatter

defineExpose({
  focusMessageComposer,
})
</script>

<template>
  <section class="mb-8">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-2">
        <h2 class="text-[15px] font-semibold text-slate-100">
          Activity
        </h2>
        <span v-if="activityQuery.isFetching.value" class="text-[11px] text-slate-600">Loading...</span>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <button
          type="button"
          class="text-[12px] text-slate-600 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="updateWatchingMutation.isPending.value"
          @click="toggleTicketWatching"
        >
          {{ detailWatchButtonLabel }}
        </button>
        <span v-if="detailWatchCountLabel" class="text-[12px] text-slate-700">{{ detailWatchCountLabel }}</span>
        <div v-if="detailActivityParticipantNames.length" class="flex -space-x-1.5">
          <span
            v-for="name in detailActivityParticipantNames"
            :key="name"
            class="flex h-5 w-5 items-center justify-center rounded-full border border-surface-0 text-[9px] font-semibold"
            :class="getAssigneeAvatarColor(name)"
            :title="name"
          >
            {{ getAssigneeInitials(name) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="watchError" class="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
      {{ watchError }}
    </div>
    <div v-if="activityQuery.isError.value" class="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
      Failed to load activity.
    </div>
    <div v-else-if="activityQuery.isLoading.value" class="space-y-3 pl-4" aria-hidden="true">
      <div v-for="skeletonIndex in 4" :key="skeletonIndex" class="flex animate-pulse items-center gap-3 py-0.5">
        <span class="h-4 w-4 shrink-0 rounded-full border border-white/[0.1] bg-white/[0.04]" />
        <span class="h-3 rounded bg-white/[0.05]" :class="skeletonIndex % 2 ? 'w-2/3' : 'w-1/2'" />
      </div>
    </div>
    <div v-else-if="activityTimelineItems.length" class="animate-fade-in space-y-1.5 pl-4">
      <template v-for="(activityItem, activityIndex) in activityTimelineItems" :key="`${activityItem.kind}:${activityItem.id}`">
        <article v-if="activityItem.kind === 'history'" class="relative flex gap-3 py-0.5">
          <span
            v-if="activityTimelineItems[activityIndex + 1]?.kind === 'history'"
            class="absolute left-[7px] top-[18px] -bottom-[8px] border-l border-white/[0.08]"
            aria-hidden="true"
          />
          <div
            class="relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-surface-0"
            :class="getActivityHistoryMarkerClass(activityItem)"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="getActivityHistoryDotClass(activityItem)" />
          </div>
          <p class="min-w-0 flex-1 text-[13px] leading-5 text-slate-500">
            {{ activityItem.body }}
            <span v-if="formatActivityTime(activityItem.createdAt)" class="text-slate-600"> · {{ formatActivityTime(activityItem.createdAt) }}</span>
          </p>
        </article>

        <article v-else class="-ml-4 flex gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] p-4">
          <div
            class="-ml-1 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold"
            :class="getAssigneeAvatarColor(activityItem.author)"
          >
            {{ getAssigneeInitials(activityItem.author) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex flex-wrap items-baseline gap-2">
              <span class="text-sm font-medium text-slate-200">{{ activityItem.author }}</span>
              <span class="text-xs text-slate-600">{{ formatActivityTime(activityItem.createdAt) }}</span>
            </div>
            <div
              v-if="getActivityCommentParentAuthor(activityItem)"
              class="mb-2 inline-flex rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[11px] text-slate-500"
            >
              Reply to {{ getActivityCommentParentAuthor(activityItem) }}
            </div>
            <div class="whitespace-pre-wrap text-sm leading-6 text-slate-300">
              {{ activityItem.body || 'No comment body' }}
            </div>
          </div>
        </article>
      </template>
    </div>
    <div v-else class="animate-fade-in rounded-lg border border-dashed border-white/[0.08] px-4 py-3 text-sm text-slate-600">
      No activity yet.
    </div>

    <div v-if="activityComposerOpen" class="mt-5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-4">
      <textarea
        id="detail-message"
        ref="messageTextareaRef"
        v-model="messageDraft"
        class="min-h-[92px] w-full resize-none border border-transparent bg-transparent p-0 text-[15px] leading-6 text-slate-300 outline-none placeholder:text-slate-600"
        rows="4"
        placeholder="Leave a comment..."
        @keydown.meta.enter.prevent="submitMessage"
        @keydown.ctrl.enter.prevent="submitMessage"
      />
      <div class="mt-2 flex items-center justify-between gap-3">
        <span v-if="messageError" class="min-w-0 flex-1 truncate text-xs text-rose-300">{{ messageError }}</span>
        <span v-else class="min-w-0 flex-1" />
        <span class="flex shrink-0 items-center gap-3 text-slate-600">
          <button
            type="button"
            class="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md opacity-70"
            disabled
            aria-label="Attachments are not available yet"
            title="Attachments are not available yet"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="m20 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.5-9.5a3.4 3.4 0 0 1 4.8 4.8l-9.6 9.6a1.8 1.8 0 0 1-2.5-2.5l8.7-8.7" />
            </svg>
          </button>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-slate-400 transition hover:bg-white/[0.12] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="addMessageMutation.isPending.value || !messageCanSubmit"
            :aria-label="addMessageMutation.isPending.value ? 'Posting comment' : 'Post comment'"
            @click="submitMessage"
          >
            <svg v-if="!addMessageMutation.isPending.value" class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3.2 3.9 7.3l.9.9 2.6-2.6v7.2h1.2V5.6l2.6 2.6.9-.9L8 3.2Z" />
            </svg>
            <span v-else class="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
          </button>
        </span>
      </div>
    </div>
    <div
      v-else
      role="button"
      tabindex="0"
      class="mt-5 flex min-h-[92px] w-full items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-4 text-left transition hover:border-white/[0.1] hover:bg-white/[0.035]"
      @click="focusMessageComposer"
      @keydown.enter.prevent="focusMessageComposer"
      @keydown.space.prevent="focusMessageComposer"
    >
      <span class="text-[15px] text-slate-600">Leave a comment...</span>
      <span class="mt-auto flex shrink-0 items-center gap-3 text-slate-600">
        <button
          type="button"
          class="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md opacity-70"
          disabled
          aria-label="Attachments are not available yet"
          title="Attachments are not available yet"
          @click.stop
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="m20 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.5-9.5a3.4 3.4 0 0 1 4.8 4.8l-9.6 9.6a1.8 1.8 0 0 1-2.5-2.5l8.7-8.7" />
          </svg>
        </button>
        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-slate-400" aria-hidden="true">
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3.2 3.9 7.3l.9.9 2.6-2.6v7.2h1.2V5.6l2.6 2.6.9-.9L8 3.2Z" />
          </svg>
        </span>
      </span>
    </div>
  </section>
</template>
