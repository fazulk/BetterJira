<script setup lang="ts">
import type { Cycle } from '~/shared/cycles'
import type { JiraTicket } from '@/types/jira'
import { computed, ref } from 'vue'
import { cycleDaysRemaining, cycleProgress, formatCycleDateRange } from '~/shared/cycles'

const props = defineProps<{
  cycle: Cycle | null
  kind: 'current' | 'upcoming' | 'previous' | 'sprint'
  tickets: JiraTicket[]
  addableTickets: JiraTicket[]
  isMutating: boolean
}>()

const emit = defineEmits<{
  add: [ticketKey: string]
}>()

const addOpen = ref(false)
const addQuery = ref('')

const progress = computed(() => cycleProgress(props.tickets))
const remaining = computed(() => (
  props.cycle && (props.kind === 'current' || props.kind === 'upcoming')
    ? cycleDaysRemaining(props.cycle)
    : null
))
const canAddIssues = computed(() => props.kind === 'current' || props.kind === 'upcoming')
const emptyTitle = computed(() => {
  if (props.kind === 'upcoming')
    return 'No upcoming cycle'
  if (props.kind === 'previous')
    return 'No previous cycle'
  return 'No active cycle'
})
const emptyDescription = computed(() => {
  if (props.kind === 'current')
    return 'Start the upcoming cycle when one exists.'
  if (props.kind === 'previous')
    return 'No completed sprint on this team’s board.'
  return 'No upcoming sprint on this team’s board.'
})
const filteredAddable = computed(() => {
  const query = addQuery.value.trim().toLowerCase()
  const tickets = props.addableTickets
  if (!query) {
    return tickets.slice(0, 8)
  }
  return tickets.filter(ticket =>
    ticket.key.toLowerCase().includes(query) || ticket.summary.toLowerCase().includes(query),
  ).slice(0, 8)
})

function addTicket(key: string): void {
  emit('add', key)
  addQuery.value = ''
  addOpen.value = false
}
</script>

<template>
  <div class="shrink-0 border-b border-white/[0.06] px-6 py-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="truncate text-[16px] font-semibold text-[#f0f1f4]">
          {{ cycle?.name ?? emptyTitle }}
        </h2>
        <p class="mt-1 text-[12px] text-[#8f9198]">
          <template v-if="cycle">
            {{ formatCycleDateRange(cycle) }}
            <span v-if="remaining !== null"> · {{ remaining }}d left</span>
          </template>
          <template v-else>
            {{ emptyDescription }}
          </template>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <div v-if="cycle && canAddIssues" class="relative">
          <button
            type="button"
            class="rounded-md border border-white/[0.08] bg-white/[0.045] px-2.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.07] disabled:opacity-50"
            :disabled="isMutating"
            @click="addOpen = !addOpen"
          >
            Add issue
          </button>
          <div
            v-if="addOpen"
            class="absolute top-9 right-0 z-30 w-72 overflow-hidden rounded-lg border border-white/[0.08] bg-[#15161a] p-2 shadow-xl shadow-black/40"
          >
            <input
              v-model="addQuery"
              class="mb-1 w-full rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-[12px] text-slate-200 outline-none"
              placeholder="Search issues"
            >
            <button
              v-for="ticket in filteredAddable"
              :key="ticket.key"
              type="button"
              class="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-white/[0.06]"
              @click="addTicket(ticket.key)"
            >
              <span class="text-[11px] text-[#8f9198]">{{ ticket.key }}</span>
              <span class="truncate text-[12px] text-[#e6e7ea]">{{ ticket.summary }}</span>
            </button>
            <p v-if="filteredAddable.length === 0" class="px-2 py-2 text-[12px] text-[#8f9198]">
              No matching issues
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="cycle" class="mt-3">
      <div class="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div class="h-full rounded-full bg-[#5b8def]" :style="{ width: `${progress.percent}%` }" />
      </div>
      <p class="mt-1.5 text-[11px] text-[#8f9198]">
        {{ progress.percent }}%
        ·
        {{ progress.usesPoints
          ? `${progress.completedPoints}/${progress.totalPoints} points`
          : `${progress.completedCount}/${progress.totalCount} issues` }}
      </p>
    </div>
  </div>
</template>
