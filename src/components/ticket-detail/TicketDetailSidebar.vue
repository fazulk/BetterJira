<script setup lang="ts">
import type { JiraTicket } from '@/types/jira'
import type { TicketDevStatusPullRequestStatus } from '~/shared/devStatus'
import { computed, nextTick, ref, watch } from 'vue'
import TicketDetailPropertiesSection from '@/components/ticket-detail/TicketDetailPropertiesSection.vue'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { useTicketDevStatus } from '@/composables/useTicketDevStatus'
import { useUpdateTicketLabels } from '@/composables/useUpdateTicketLabels'
import { buildJiraIssueUrl } from '@/utils/jiraIssueUrl'

const props = defineProps<{
  isLocalTicket: boolean
  isProjectDetail: boolean
  jiraDataEnabled: boolean
  ticket: JiraTicket
}>()

const emit = defineEmits<{
  prefetch: [key: string]
  select: [key: string]
}>()

const { jiraConnection } = useSpaceSettings()
const { getProjectAppearance } = useProjectAppearances()

const copiedKey = ref(false)
const copiedUrl = ref(false)
const propertiesRef = ref<InstanceType<typeof TicketDetailPropertiesSection> | null>(null)
const collapsedSections = ref({
  properties: false,
  labels: false,
  project: false,
  development: false,
  jira: false,
})

const devStatusTicketKey = computed(() => (
  !props.isLocalTicket && props.jiraDataEnabled ? props.ticket.key : null
))
const { data: devStatus, isError: devStatusFailed, refetch: refetchDevStatus } = useTicketDevStatus(devStatusTicketKey)
const devStatusPullRequests = computed(() => devStatus.value?.pullRequests ?? [])
// A failed fetch with nothing cached would otherwise silently hide the
// Development section — indistinguishable from "no PRs".
const devStatusUnavailable = computed(() => devStatusFailed.value && devStatusPullRequests.value.length === 0)

const PULL_REQUEST_STATUS_CLASSES: Record<TicketDevStatusPullRequestStatus, string> = {
  OPEN: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  MERGED: 'border-purple-400/30 bg-purple-400/10 text-purple-300',
  DECLINED: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  DRAFT: 'border-white/[0.08] bg-white/[0.04] text-slate-400',
  UNKNOWN: 'border-white/[0.08] bg-white/[0.04] text-slate-400',
}

const jiraUrl = computed(() => buildJiraIssueUrl(jiraConnection.value.baseUrl, props.ticket.key))
const detailJiraTypeLabel = computed(() => (
  !props.isLocalTicket && props.ticket.issueType ? props.ticket.issueType : null
))
const detailProjectParent = computed(() => {
  const parent = props.ticket.parent
  if (!parent || !parent.issueType.toLowerCase().includes('epic'))
    return null
  return parent
})
const detailProjectParentLabel = computed(() => detailProjectParent.value?.summary ?? '')
const detailLabels = computed(() => normalizeLabels(props.ticket.labels ?? []))
const updateTicketLabelsMutation = useUpdateTicketLabels()
const isEditingLabels = ref(false)
const labelsDraft = ref<string[]>([])
const labelDraft = ref('')
const labelError = ref('')
const labelInputRef = ref<HTMLInputElement | null>(null)
const canEditLabels = computed(() => props.isLocalTicket || props.jiraDataEnabled)
const anyLabelsPending = computed(() => updateTicketLabelsMutation.isPending.value)

function normalizeLabels(labels: string[]): string[] {
  const nextLabels: string[] = []
  const seen = new Set<string>()

  for (const label of labels) {
    const trimmed = label.trim()
    const normalized = trimmed.toLowerCase()
    if (!trimmed || seen.has(normalized))
      continue

    seen.add(normalized)
    nextLabels.push(trimmed)
  }

  return nextLabels
}

function labelsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length)
    return false

  return left.every((label, index) => label === right[index])
}

function toggleSection(section: keyof typeof collapsedSections.value) {
  collapsedSections.value[section] = !collapsedSections.value[section]
}

async function copyJiraUrl() {
  const currentJiraUrl = jiraUrl.value
  if (!currentJiraUrl) {
    return
  }

  await navigator.clipboard.writeText(currentJiraUrl)
  copiedUrl.value = true
  setTimeout(() => {
    copiedUrl.value = false
  }, 1500)
}

async function copyTicketKey() {
  await navigator.clipboard.writeText(props.ticket.key)
  copiedKey.value = true
  setTimeout(() => {
    copiedKey.value = false
  }, 1500)
}

function startEditingLabels(): void {
  if (!canEditLabels.value) {
    return
  }

  labelsDraft.value = [...detailLabels.value]
  labelDraft.value = ''
  labelError.value = ''
  isEditingLabels.value = true
  nextTick(() => labelInputRef.value?.focus())
}

function cancelEditingLabels(): void {
  isEditingLabels.value = false
  labelsDraft.value = []
  labelDraft.value = ''
  labelError.value = ''
}

function addLabelDraft(): void {
  const label = labelDraft.value.trim()
  if (!label) {
    return
  }

  labelsDraft.value = normalizeLabels([...labelsDraft.value, label])
  labelDraft.value = ''
  labelError.value = ''
}

function removeLabelDraft(labelToRemove: string): void {
  const normalizedLabelToRemove = labelToRemove.toLowerCase()
  labelsDraft.value = labelsDraft.value.filter(label => label.toLowerCase() !== normalizedLabelToRemove)
}

function handleLabelInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addLabelDraft()
    return
  }

  if (event.key === 'Backspace' && !labelDraft.value && labelsDraft.value.length > 0) {
    labelsDraft.value = labelsDraft.value.slice(0, -1)
  }
}

async function saveLabels(): Promise<void> {
  if (!canEditLabels.value || anyLabelsPending.value) {
    return
  }

  addLabelDraft()
  const nextLabels = normalizeLabels(labelsDraft.value)
  labelsDraft.value = nextLabels

  if (labelsEqual(nextLabels, detailLabels.value)) {
    cancelEditingLabels()
    return
  }

  try {
    await updateTicketLabelsMutation.mutateAsync({ key: props.ticket.key, labels: nextLabels })
    isEditingLabels.value = false
    labelError.value = ''
  }
  catch (error) {
    labelError.value = error instanceof Error ? error.message : 'Failed to update labels.'
  }
}

watch(() => props.ticket.key, () => {
  cancelEditingLabels()
})

function startEditingAssignee() {
  return propertiesRef.value?.startEditingAssignee()
}

function startEditingPriority() {
  return propertiesRef.value?.startEditingPriority()
}

function startEditingStatus() {
  return propertiesRef.value?.startEditingStatus()
}

defineExpose({
  startEditingAssignee,
  startEditingPriority,
  startEditingStatus,
})
</script>

<template>
  <aside class="scrollbar-gutter-stable min-h-0 border-t border-white/[0.06] bg-issue-detail-bg px-4 py-4 lg:overflow-y-auto lg:border-t-0">
    <div class="space-y-3">
      <div v-if="!isLocalTicket" class="flex items-center justify-end gap-1.5">
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          :aria-label="`Copy Jira link for ${ticket.key}`"
          title="Copy Jira link"
          :disabled="!jiraUrl"
          @click="copyJiraUrl"
        >
          <svg v-if="!copiedUrl" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
          </svg>
          <svg v-else class="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          :aria-label="`Copy issue ID ${ticket.key}`"
          title="Copy issue ID"
          @click="copyTicketKey"
        >
          <svg v-if="!copiedKey" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
            <path stroke-linecap="round" d="M8 10h4.5M8 14h8" />
            <circle cx="16.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
          </svg>
          <svg v-else class="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <span class="ml-1 text-xs font-medium text-slate-500">{{ ticket.key }}</span>
      </div>

      <TicketDetailPropertiesSection
        ref="propertiesRef"
        :collapsed="collapsedSections.properties"
        :is-local-ticket="isLocalTicket"
        :jira-data-enabled="jiraDataEnabled"
        :ticket="ticket"
        :ticket-key="ticket.key"
        @toggle="toggleSection('properties')"
      />

      <section
        class="rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 transition-[padding]"
        :class="collapsedSections.labels ? 'py-3' : 'py-4'"
      >
        <button
          type="button"
          class="flex w-full items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          :class="{ 'mb-3': !collapsedSections.labels }"
          :aria-expanded="!collapsedSections.labels"
          @click="toggleSection('labels')"
        >
          <span>Labels</span>
          <span class="text-[10px] text-slate-600 transition-transform" :class="{ '-rotate-90': collapsedSections.labels }">▼</span>
        </button>

        <div v-show="!collapsedSections.labels" class="space-y-3">
          <div v-if="isEditingLabels" class="space-y-2">
            <div class="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 py-1.5">
              <span
                v-for="label in labelsDraft"
                :key="label"
                class="inline-flex max-w-full items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-200"
              >
                <span class="truncate">{{ label }}</span>
                <button
                  type="button"
                  class="text-slate-500 transition hover:text-slate-200"
                  :aria-label="`Remove label ${label}`"
                  @click="removeLabelDraft(label)"
                >
                  ×
                </button>
              </span>
              <input
                ref="labelInputRef"
                v-model="labelDraft"
                class="min-w-24 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
                placeholder="Add label..."
                :disabled="anyLabelsPending"
                @blur="addLabelDraft"
                @keydown="handleLabelInputKeydown"
              >
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                class="rounded-md bg-accent-indigo px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="anyLabelsPending"
                @click="saveLabels"
              >
                {{ anyLabelsPending ? '...' : 'Save' }}
              </button>
              <button
                type="button"
                class="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="anyLabelsPending"
                @click="cancelEditingLabels"
              >
                Cancel
              </button>
              <span v-if="labelError" class="text-[11px] text-rose-300">{{ labelError }}</span>
            </div>
          </div>
          <div v-else class="flex flex-wrap items-center gap-2">
            <LabelPill
              v-for="label in detailLabels"
              :key="label"
              :label="label"
              show-dot
            />
            <span v-if="detailLabels.length === 0" class="text-sm text-slate-600">No labels</span>
            <button
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
              :title="canEditLabels ? 'Edit labels' : 'Configure Jira credentials to edit labels'"
              aria-label="Edit labels"
              :disabled="!canEditLabels"
              @click="startEditingLabels"
            >
              +
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="!isProjectDetail"
        class="rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 transition-[padding]"
        :class="collapsedSections.project ? 'py-3' : 'py-4'"
      >
        <button
          type="button"
          class="flex w-full items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          :class="{ 'mb-3': !collapsedSections.project }"
          :aria-expanded="!collapsedSections.project"
          @click="toggleSection('project')"
        >
          <span>Project</span>
          <span class="text-[10px] text-slate-600 transition-transform" :class="{ '-rotate-90': collapsedSections.project }">▼</span>
        </button>

        <div v-show="!collapsedSections.project">
          <button
            v-if="detailProjectParent"
            type="button"
            class="flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1.5 text-left transition hover:bg-white/[0.04]"
            @click="emit('select', detailProjectParent.key)"
            @mouseenter="emit('prefetch', detailProjectParent.key)"
          >
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center"
              :style="{ color: getProjectAppearance(detailProjectParent.key).color }"
            >
              <Icon
                :name="`lucide:${getProjectAppearance(detailProjectParent.key).icon}`"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-slate-200">{{ detailProjectParentLabel }}</span>
            </span>
          </button>
          <button
            v-else
            type="button"
            class="flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1.5 text-left text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"
          >
            <span class="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500">
              <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                <path stroke-linejoin="round" d="m8 1.8 5.2 3v6L8 13.8l-5.2-3v-6L8 1.8Z" />
                <path stroke-linejoin="round" d="M2.9 4.9 8 7.8l5.1-2.9M8 7.8v5.8" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium">Add to project</span>
            </span>
          </button>
        </div>
      </section>

      <section
        v-if="devStatusPullRequests.length > 0 || devStatusUnavailable"
        class="animate-fade-in rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 transition-[padding]"
        :class="collapsedSections.development ? 'py-3' : 'py-4'"
      >
        <button
          type="button"
          class="flex w-full items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          :class="{ 'mb-3': !collapsedSections.development }"
          :aria-expanded="!collapsedSections.development"
          @click="toggleSection('development')"
        >
          <span>Development</span>
          <span class="text-[10px] text-slate-600 transition-transform" :class="{ '-rotate-90': collapsedSections.development }">▼</span>
        </button>

        <div v-show="!collapsedSections.development" class="space-y-2">
          <div v-if="devStatusUnavailable" class="flex items-center gap-2 px-1 py-1.5 text-xs text-slate-500">
            <span>Couldn't load development activity.</span>
            <button
              type="button"
              class="font-medium text-slate-300 underline-offset-2 transition hover:underline"
              @click="refetchDevStatus()"
            >
              Retry
            </button>
          </div>
          <a
            v-for="pullRequest in devStatusPullRequests"
            :key="pullRequest.url"
            :href="pullRequest.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-w-0 items-start gap-2 rounded-md px-1 py-1.5 transition hover:bg-white/[0.04]"
          >
            <span class="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500">
              <Icon name="lucide:git-pull-request" class="h-4 w-4" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1 space-y-1">
              <span class="block truncate text-sm font-medium text-slate-200">{{ pullRequest.name }}</span>
              <span v-if="pullRequest.sourceBranch" class="block truncate text-[11px] text-slate-500">{{ pullRequest.sourceBranch }}</span>
            </span>
            <span
              class="mt-0.5 inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              :class="PULL_REQUEST_STATUS_CLASSES[pullRequest.status]"
            >
              {{ pullRequest.status }}
            </span>
          </a>
        </div>
      </section>

      <section
        class="rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 transition-[padding]"
        :class="collapsedSections.jira ? 'py-3' : 'py-4'"
      >
        <button
          type="button"
          class="flex w-full items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          :class="{ 'mb-3': !collapsedSections.jira }"
          :aria-expanded="!collapsedSections.jira"
          @click="toggleSection('jira')"
        >
          <span>Jira</span>
          <span class="text-[10px] text-slate-600 transition-transform" :class="{ '-rotate-90': collapsedSections.jira }">▼</span>
        </button>

        <div v-show="!collapsedSections.jira" class="space-y-2 text-sm">
          <div v-if="detailJiraTypeLabel" class="flex items-center">
            <span class="inline-flex max-w-full justify-self-start rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-xs font-medium text-slate-400">
              <span class="truncate">{{ detailJiraTypeLabel }}</span>
            </span>
          </div>
          <a
            v-if="!isLocalTicket && jiraUrl"
            :href="jiraUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-7 items-center rounded-md border border-white/[0.08] px-2.5 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
          >
            Open in Jira
          </a>
        </div>
      </section>
    </div>
  </aside>
</template>
