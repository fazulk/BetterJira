<script setup lang="ts">
import type { JiraTicket } from '@/types/jira'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useUpdateTicketTitle } from '@/composables/useUpdateTicketTitle'
import { getStatusGroup } from '@/types/jira'

type ProjectDetailHealth = 'On track' | 'At risk' | 'Completed'

const props = defineProps<{
  childTickets: JiraTicket[]
  isProjectDetail: boolean
  ticket: JiraTicket
}>()

const emit = defineEmits<{
  prefetch: [key: string]
  select: [key: string]
}>()

const titleDraft = ref('')
const titleError = ref<string | null>(null)
const TITLE_SAVE_DEBOUNCE_MS = 3000
const titleInputRef = ref<HTMLTextAreaElement | null>(null)
const titleInputActive = ref(false)
const titleDraftTicketKey = ref<string | null>(null)
const titlePersistedValue = ref('')
const titleSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const titleSaveInFlight = ref(false)
const isSyncingTitleDraft = ref(false)

const updateTitleMutation = useUpdateTicketTitle()

const detailIssueParent = computed(() => {
  const parent = props.ticket.parent
  if (!parent || parent.issueType.toLowerCase().includes('epic'))
    return null
  return parent
})

const detailIssueParentRelationLabel = computed(() => {
  const parent = detailIssueParent.value
  if (!parent)
    return null

  const ticketIssueType = props.ticket.issueType.toLowerCase()
  const parentIssueType = parent.issueType.toLowerCase()
  if (ticketIssueType.includes('epic') && parentIssueType.includes('initiative'))
    return 'Epic of'

  return 'Sub-issue of'
})

const detailIssueParentProgressLabel = computed(() => {
  const parent = detailIssueParent.value
  if (!parent)
    return null

  const children = props.childTickets.filter(child => child.parent?.key === parent.key)
  const scopedChildren = children.length > 0 ? children : [props.ticket]
  const completedCount = scopedChildren.filter(child => getStatusGroup(child.statusCategory) === 'done').length
  return `${completedCount}/${scopedChildren.length}`
})

const projectCompletedIssueCount = computed(() => (
  props.childTickets.filter(child => getStatusGroup(child.statusCategory) === 'done').length
))
const projectProgress = computed(() => (
  props.childTickets.length > 0
    ? Math.round((projectCompletedIssueCount.value / props.childTickets.length) * 100)
    : 0
))
const projectDetailHealth = computed<ProjectDetailHealth>(() => {
  if (getStatusGroup(props.ticket.statusCategory) === 'done' || projectProgress.value === 100)
    return 'Completed'
  if (props.ticket.status.toLowerCase().includes('block') || projectProgress.value < 25)
    return 'At risk'
  return 'On track'
})
const projectTargetDateLabel = computed(() => formatDate(props.ticket.dueDate) ?? 'No target')
const projectLeadLabel = computed(() => {
  const lead = props.ticket.assignee
  return lead && lead !== 'Unassigned' ? lead : 'Unassigned'
})
const projectPriorityLabel = computed(() => props.ticket.priority || 'No priority')
const projectIssueProgressLabel = computed(() => `${projectCompletedIssueCount.value}/${props.childTickets.length}`)
const projectProgressToneClass = computed(() => {
  if (projectDetailHealth.value === 'At risk')
    return 'bg-rose-400/80'
  if (projectDetailHealth.value === 'Completed')
    return 'bg-emerald-400/80'
  return 'bg-sky-400/80'
})

const datePartFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function formatDate(value: string | undefined): string | null {
  if (!value)
    return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return value
  return datePartFormatter.format(parsed)
}

function getProjectDetailHealthClass(health: ProjectDetailHealth): string {
  if (health === 'At risk')
    return 'border-rose-500/20 bg-rose-500/10 text-rose-300'
  if (health === 'Completed')
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  return 'border-sky-500/20 bg-sky-500/10 text-sky-300'
}

function clearTitleSaveTimer(): void {
  if (!titleSaveTimer.value)
    return
  clearTimeout(titleSaveTimer.value)
  titleSaveTimer.value = null
}

function isTitleDraftDirty(): boolean {
  return titleDraft.value.trim() !== titlePersistedValue.value
}

function resizeTitleInput(): void {
  nextTick(() => {
    const input = titleInputRef.value
    if (!input)
      return
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
  })
}

function syncTitleDraftFromTicket(nextTicket: JiraTicket | null): void {
  clearTitleSaveTimer()
  isSyncingTitleDraft.value = true
  titleDraft.value = nextTicket?.summary ?? ''
  titleDraftTicketKey.value = nextTicket?.key ?? null
  titlePersistedValue.value = nextTicket?.summary.trim() ?? ''
  titleError.value = null
  resizeTitleInput()
  nextTick(() => {
    isSyncingTitleDraft.value = false
  })
}

function scheduleTitleAutosave(): void {
  clearTitleSaveTimer()
  titleSaveTimer.value = setTimeout(() => {
    void flushTitleAutosave()
  }, TITLE_SAVE_DEBOUNCE_MS)
}

function focusTitleInput(): void {
  titleInputActive.value = true
  nextTick(() => {
    titleInputRef.value?.focus()
  })
}

function blurTitleInput(): void {
  titleInputRef.value?.blur()
  titleInputActive.value = false
  void flushTitleAutosave()
}

function handleTitleFocusIn(): void {
  titleInputActive.value = true
}

function handleTitleFocusOut(): void {
  titleInputActive.value = false
  void flushTitleAutosave()
}

async function persistTitleDraft(key: string, title: string): Promise<void> {
  await updateTitleMutation.mutateAsync({ key, title })
}

async function flushTitleAutosave(): Promise<void> {
  const key = titleDraftTicketKey.value
  if (!key || titleSaveInFlight.value)
    return

  const nextTitle = titleDraft.value.trim()
  if (!nextTitle) {
    clearTitleSaveTimer()
    titleError.value = 'Title cannot be empty.'
    return
  }

  if (nextTitle === titlePersistedValue.value) {
    clearTitleSaveTimer()
    titleError.value = null
    return
  }

  clearTitleSaveTimer()
  titleSaveInFlight.value = true
  titleError.value = null

  try {
    await persistTitleDraft(key, nextTitle)
    if (titleDraftTicketKey.value !== key)
      return

    titlePersistedValue.value = nextTitle
    if (titleDraft.value.trim() !== nextTitle) {
      scheduleTitleAutosave()
    }
  }
  catch (err) {
    if (titleDraftTicketKey.value !== key)
      return
    titleError.value = err instanceof Error ? err.message : 'Failed to update title.'
  }
  finally {
    titleSaveInFlight.value = false
  }
}

watch(() => props.ticket, (nextTicket) => {
  const nextTicketKey = nextTicket?.key ?? null
  const titleTicketChanged = nextTicketKey !== titleDraftTicketKey.value
  if (titleTicketChanged) {
    void flushTitleAutosave()
    syncTitleDraftFromTicket(nextTicket)
  }
  else if (!titleInputActive.value && !isTitleDraftDirty()) {
    syncTitleDraftFromTicket(nextTicket)
  }
}, { immediate: true })

watch(titleDraft, () => {
  resizeTitleInput()
  if (isSyncingTitleDraft.value)
    return
  if (!titleDraftTicketKey.value)
    return

  const nextTitle = titleDraft.value.trim()
  if (!nextTitle) {
    clearTitleSaveTimer()
    titleError.value = 'Title cannot be empty.'
    return
  }

  titleError.value = null
  if (nextTitle === titlePersistedValue.value) {
    clearTitleSaveTimer()
    return
  }

  scheduleTitleAutosave()
})

onUnmounted(() => {
  clearTitleSaveTimer()
  void flushTitleAutosave()
})

defineExpose({
  focusTitleInput,
})
</script>

<template>
  <header>
    <div :class="isProjectDetail ? 'mb-5' : 'mb-0'">
      <div class="space-y-2">
        <div class="group/title flex items-start gap-3">
          <textarea
            id="detail-title"
            ref="titleInputRef"
            v-model="titleDraft"
            class="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 !text-[28px] !font-semibold !leading-tight text-slate-100 outline-none appearance-none placeholder:text-slate-700"
            maxlength="255"
            rows="1"
            placeholder="Issue title"
            spellcheck="false"
            autocorrect="off"
            autocapitalize="off"
            @focusin="handleTitleFocusIn"
            @focusout="handleTitleFocusOut"
            @keydown.enter.prevent="blurTitleInput"
            @keydown.esc.prevent="blurTitleInput"
          />
        </div>
        <span v-if="titleError" class="text-xs text-rose-300">{{ titleError }}</span>
      </div>
      <div v-if="detailIssueParent" class="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500">
        <span>{{ detailIssueParentRelationLabel }}</span>
        <button
          type="button"
          class="inline-flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left transition hover:bg-white/[0.04]"
          @click="emit('select', detailIssueParent.key)"
          @mouseenter="emit('prefetch', detailIssueParent.key)"
        >
          <span class="flex h-4 w-4 shrink-0 items-center justify-center text-cyan-400" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7">
              <circle cx="8" cy="8" r="5.2" />
              <path stroke-linecap="round" d="M5.7 10.3 10.3 5.7" />
            </svg>
          </span>
          <span class="shrink-0 font-medium text-slate-400">{{ detailIssueParent.key }}</span>
          <span class="min-w-0 truncate font-medium text-slate-200">{{ detailIssueParent.summary }}</span>
        </button>
        <span
          v-if="detailIssueParentProgressLabel"
          class="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 text-xs text-slate-500"
        >
          <span class="h-2 w-2 rounded-full border border-cyan-400/50" />
          {{ detailIssueParentProgressLabel }}
        </span>
      </div>
    </div>

    <div
      v-if="isProjectDetail"
      class="grid overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015] text-xs md:grid-cols-3 xl:grid-cols-6"
    >
      <div class="border-b border-white/[0.06] px-3 py-2.5 md:border-r xl:border-b-0">
        <p class="text-[11px] text-slate-600">
          Health
        </p>
        <span class="mt-1 inline-flex max-w-full rounded-md border px-2 py-0.5 font-medium" :class="getProjectDetailHealthClass(projectDetailHealth)">
          {{ projectDetailHealth }}
        </span>
      </div>
      <div class="border-b border-white/[0.06] px-3 py-2.5 md:border-r xl:border-b-0">
        <p class="text-[11px] text-slate-600">
          Lead
        </p>
        <p class="mt-1 truncate font-medium text-slate-300">
          {{ projectLeadLabel }}
        </p>
      </div>
      <div class="border-b border-white/[0.06] px-3 py-2.5 xl:border-b-0 xl:border-r">
        <p class="text-[11px] text-slate-600">
          Priority
        </p>
        <p class="mt-1 truncate font-medium text-slate-300">
          {{ projectPriorityLabel }}
        </p>
      </div>
      <div class="border-b border-white/[0.06] px-3 py-2.5 md:border-r md:border-b-0">
        <p class="text-[11px] text-slate-600">
          Target date
        </p>
        <p class="mt-1 truncate font-medium text-slate-300">
          {{ projectTargetDateLabel }}
        </p>
      </div>
      <div class="border-b border-white/[0.06] px-3 py-2.5 md:border-b-0 md:border-r">
        <p class="text-[11px] text-slate-600">
          Issues
        </p>
        <p class="mt-1 truncate font-medium text-slate-300">
          {{ projectIssueProgressLabel }}
        </p>
      </div>
      <div class="px-3 py-2.5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] text-slate-600">
            Progress
          </p>
          <span class="font-medium text-slate-300">{{ projectProgress }}%</span>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            class="h-full rounded-full transition-all"
            :class="projectProgressToneClass"
            :style="{ width: `${projectProgress}%` }"
          />
        </div>
      </div>
    </div>
  </header>
</template>
