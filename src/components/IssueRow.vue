<script setup lang="ts">
import type { JiraTicket } from '@/types/jira'
import type { ProjectAppearance } from '~/shared/settings'
import { computed } from 'vue'
import StatusIcon from '@/components/StatusIcon.vue'
import { isEpicIssueType } from '@/features/ticket-list/helpers'
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from '~/shared/settings'

const props = defineProps<{
  ticket: JiraTicket
  selected: boolean
  checked: boolean
  showId?: boolean
  showStatus?: boolean
  showLabels?: boolean
  showPriority?: boolean
  showStoryPoints?: boolean
  showAssignee?: boolean
  showCreated?: boolean
  showUpdated?: boolean
  showDue?: boolean
  showParent?: boolean
  /** Resolved appearance for `ticket.parent` when that parent is an epic. */
  projectAppearance?: ProjectAppearance | null
}>()

defineEmits<{
  select: [key: string]
  prefetch: [key: string]
  toggleCheck: [key: string]
}>()

const priorityClasses: Record<string, string> = {
  highest: 'text-[#f26d78]',
  high: 'text-[#e59356]',
  medium: 'text-[#d6a84b]',
  low: 'text-[#62a8d8]',
  lowest: 'text-[#8f9198]',
}

const MAX_VISIBLE_LABELS = 3

const priorityClass = computed(() => {
  const normalized = props.ticket.priority.trim().toLowerCase()
  return priorityClasses[normalized] ?? 'text-[#8f9198]'
})

const initials = computed(() => {
  const name = props.ticket.assignee
  if (!name || name === 'Unassigned')
    return ''
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const createdLabel = computed(() => formatDate(props.ticket.createdAt))
const updatedLabel = computed(() => formatDate(props.ticket.updatedAt))
const dueLabel = computed(() => formatDate(props.ticket.dueDate))
const visibleLabels = computed(() => {
  const labels: string[] = []
  const seen = new Set<string>()
  for (const label of props.ticket.labels ?? []) {
    const trimmed = label.trim()
    if (!trimmed || seen.has(trimmed))
      continue
    seen.add(trimmed)
    labels.push(trimmed)
  }
  return labels
})
const displayedLabels = computed(() => visibleLabels.value.slice(0, MAX_VISIBLE_LABELS))
const hiddenLabelCount = computed(() => Math.max(0, visibleLabels.value.length - displayedLabels.value.length))
const hiddenLabelSummary = computed(() => visibleLabels.value.slice(MAX_VISIBLE_LABELS).join(', '))
const rowIssueKey = computed(() => props.ticket.key)
const rowPrimarySummary = computed(() => props.ticket.summary)
// Only an epic parent counts as the issue's project, matching how the detail
// sidebar and the projects table resolve one.
const projectChip = computed(() => {
  const parent = props.ticket.parent
  if (props.showParent === false || !parent || !isEpicIssueType(parent.issueType)) {
    return null
  }

  return {
    name: parent.summary,
    icon: props.projectAppearance?.icon ?? DEFAULT_PROJECT_ICON,
    color: props.projectAppearance?.color ?? DEFAULT_PROJECT_COLOR,
  }
})

const rowGridTemplate = computed(() => {
  // Checkbox column hidden for now (selection still works via keyboard);
  // revisit whether row-level bulk selection earns its place.
  const columns: string[] = []
  if (props.showId !== false)
    columns.push('70px')
  if (props.showStatus !== false)
    columns.push('18px')
  columns.push('minmax(0,1fr)')
  if (projectChip.value)
    columns.push('auto')
  if (props.showLabels !== false && visibleLabels.value.length > 0)
    columns.push('auto')
  if (props.showPriority !== false)
    columns.push('auto')
  if (props.showStoryPoints === true)
    columns.push('auto')
  if (
    props.showAssignee !== false
    || props.showCreated !== false
    || props.showUpdated === true
    || props.showDue === true
  ) {
    columns.push('auto')
  }
  return columns.join(' ')
})

function formatDate(value: string | undefined): string {
  if (!value)
    return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return ''

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="linear-row group relative grid min-h-12 w-full cursor-default items-center gap-2 px-4 py-2.5 text-left transition"
    :class="selected ? 'linear-row-active text-[#f0f1f4]' : 'text-[#d6d7dc]'"
    :style="{ gridTemplateColumns: rowGridTemplate }"
    @mouseenter="$emit('prefetch', rowIssueKey)"
    @click="$emit('select', rowIssueKey)"
    @keydown.enter.prevent="$emit('select', rowIssueKey)"
    @keydown.space.prevent="$emit('select', rowIssueKey)"
  >
    <span v-if="showId !== false" class="truncate font-medium text-[#8f9198]">{{ rowIssueKey }}</span>

    <span v-if="showStatus !== false" class="flex h-4 w-4 items-center justify-center">
      <StatusIcon :status="ticket.status" :status-category="ticket.statusCategory" :size="16" />
    </span>

    <span class="min-w-0 truncate">
      <span class="font-medium">{{ rowPrimarySummary }}</span>
    </span>

    <span
      v-if="projectChip"
      class="hidden min-w-0 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-1.5 py-0.5 text-[11px] text-[#aeb0b7] lg:flex"
      :title="projectChip.name"
    >
      <Icon
        :name="`lucide:${projectChip.icon}`"
        class="h-3 w-3 shrink-0"
        :style="{ color: projectChip.color }"
        aria-hidden="true"
      />
      <span class="max-w-40 truncate">{{ projectChip.name }}</span>
    </span>

    <span v-if="showLabels !== false && visibleLabels.length > 0" class="hidden max-w-[28rem] flex-wrap items-center justify-end gap-1 md:flex">
      <LabelPill v-for="label in displayedLabels" :key="label" :label="label" dense show-dot />
      <span
        v-if="hiddenLabelCount > 0"
        class="inline-flex items-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[11px] font-medium leading-[1.25] text-slate-400"
        :title="hiddenLabelSummary"
      >
        +{{ hiddenLabelCount }}
      </span>
    </span>

    <span v-if="showPriority !== false" class="hidden min-w-0 items-center gap-1 text-[12px] text-[#8f9198] lg:flex">
      <span class="text-[13px]" :class="priorityClass">▮</span>
      <span class="max-w-24 truncate">{{ ticket.priority || 'No priority' }}</span>
    </span>

    <span v-if="showStoryPoints === true" class="hidden min-w-[34px] justify-end text-[12px] text-[#8f9198] lg:flex">
      {{ ticket.storyPoints !== undefined ? `${ticket.storyPoints} pts` : '–' }}
    </span>

    <span
      v-if="showAssignee !== false || showCreated !== false || showUpdated === true || showDue === true"
      class="flex min-w-[94px] items-center justify-end gap-2 text-[12px] text-[#8f9198]"
    >
      <span v-if="showAssignee !== false && initials" class="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-[#c7c9d0]">{{ initials }}</span>
      <span v-if="showCreated !== false && createdLabel" class="hidden sm:inline">{{ createdLabel }}</span>
      <span v-if="showUpdated === true && updatedLabel" class="hidden sm:inline">{{ updatedLabel }}</span>
      <span v-if="showDue === true && dueLabel" class="hidden sm:inline">Due {{ dueLabel }}</span>
    </span>
  </div>
</template>
