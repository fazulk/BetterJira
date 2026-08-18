<script setup lang="ts">
import type { Cycle, SpaceCyclesPayload } from '~/shared/cycles'
import type { JiraTicket } from '@/types/jira'
import { computed } from 'vue'
import { cycleProgress, formatCycleDateRange, ticketBelongsToCycle } from '~/shared/cycles'
import { getTeamCycleViewId } from '@/features/ticket-list/helpers'

const props = defineProps<{
  payload: SpaceCyclesPayload
  tickets: JiraTicket[]
  teamKey: string
  errorMessage: string | null
}>()

const emit = defineEmits<{
  open: [viewId: string]
  selectBoard: [boardId: number]
}>()

const currentTickets = computed(() => (
  props.payload.current
    ? props.tickets.filter(ticket => ticketBelongsToCycle(ticket, props.payload.current as Cycle))
    : []
))
const upcomingTickets = computed(() => (
  props.payload.upcoming
    ? props.tickets.filter(ticket => ticketBelongsToCycle(ticket, props.payload.upcoming as Cycle))
    : []
))
const previousTickets = computed(() => (
  props.payload.previous
    ? props.tickets.filter(ticket => ticketBelongsToCycle(ticket, props.payload.previous as Cycle))
    : []
))
const pastCycles = computed(() => props.payload.cycles.filter(cycle => (
  cycle.state === 'closed' && cycle.id !== props.payload.previous?.id
)))

function progressFor(cycle: Cycle, tickets: JiraTicket[]) {
  return cycleProgress(tickets.filter(ticket => ticketBelongsToCycle(ticket, cycle)))
}

function openCycle(cycle: Cycle): void {
  if (cycle.id === props.payload.current?.id) {
    emit('open', getTeamCycleViewId(props.teamKey, 'current'))
    return
  }
  if (cycle.id === props.payload.upcoming?.id) {
    emit('open', getTeamCycleViewId(props.teamKey, 'upcoming'))
    return
  }
  if (cycle.id === props.payload.previous?.id) {
    emit('open', getTeamCycleViewId(props.teamKey, 'previous'))
    return
  }
  emit('open', getTeamCycleViewId(props.teamKey, { sprintId: cycle.id }))
}
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
    <div class="mb-5">
      <p class="text-[13px] text-[#8f9198]">
        {{ payload.board ? `Board · ${payload.board.name}` : 'Jira sprints, presented as cycles.' }}
      </p>
      <p v-if="errorMessage" class="mt-1 text-[12px] text-rose-300">
        {{ errorMessage }}
      </p>
    </div>

    <div v-if="payload.needsBoardPicker" class="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
      <p class="text-[13px] font-medium text-[#e6e7ea]">
        Choose a Scrum board
      </p>
      <p class="mt-1 text-[12px] text-[#8f9198]">
        This project has more than one board. Cycles use the board’s sprint sequence.
      </p>
      <div class="mt-3 space-y-1">
        <button
          v-for="board in payload.boards"
          :key="board.id"
          type="button"
          class="flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-[13px] text-[#d7d8dc] hover:bg-white/[0.06]"
          @click="emit('selectBoard', board.id)"
        >
          <span>{{ board.name }}</span>
          <span class="text-[11px] text-[#6f727b]">{{ board.type }}</span>
        </button>
      </div>
    </div>

    <div v-else-if="!payload.board" class="flex min-h-64 items-center justify-center text-center">
      <div class="max-w-sm">
        <p class="text-[13px] font-medium text-[#d7d8dc]">
          No cycle board
        </p>
        <p class="mt-1 text-[12px] text-[#777a83]">
          This team has no Scrum board in Jira, so cycles are unavailable.
        </p>
      </div>
    </div>

    <div v-else class="space-y-6">
      <section>
        <h2 class="mb-2 text-[12px] font-medium uppercase tracking-wide text-[#6f727b]">
          Current
        </h2>
        <button
          v-if="payload.current"
          type="button"
          class="linear-row flex w-full items-center justify-between rounded-lg border border-white/[0.06] px-4 py-3 text-left"
          @click="openCycle(payload.current)"
        >
          <span>
            <span class="block text-[13px] font-medium text-[#e6e7ea]">{{ payload.current.name }}</span>
            <span class="mt-0.5 block text-[12px] text-[#8f9198]">{{ formatCycleDateRange(payload.current) }}</span>
          </span>
          <span class="text-[12px] text-[#8f9198]">
            {{ progressFor(payload.current, currentTickets).percent }}% · {{ currentTickets.length }}
          </span>
        </button>
        <p v-else class="rounded-lg border border-dashed border-white/[0.08] px-4 py-3 text-[12px] text-[#8f9198]">
          No active sprint in Jira.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-[12px] font-medium uppercase tracking-wide text-[#6f727b]">
          Upcoming
        </h2>
        <button
          v-if="payload.upcoming"
          type="button"
          class="linear-row flex w-full items-center justify-between rounded-lg border border-white/[0.06] px-4 py-3 text-left"
          @click="openCycle(payload.upcoming)"
        >
          <span>
            <span class="block text-[13px] font-medium text-[#e6e7ea]">{{ payload.upcoming.name }}</span>
            <span class="mt-0.5 block text-[12px] text-[#8f9198]">{{ formatCycleDateRange(payload.upcoming) }}</span>
          </span>
          <span class="text-[12px] text-[#8f9198]">{{ upcomingTickets.length }} issues</span>
        </button>
        <p v-else class="rounded-lg border border-dashed border-white/[0.08] px-4 py-3 text-[12px] text-[#8f9198]">
          No upcoming cycle yet.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-[12px] font-medium uppercase tracking-wide text-[#6f727b]">
          Previous
        </h2>
        <button
          v-if="payload.previous"
          type="button"
          class="linear-row flex w-full items-center justify-between rounded-lg border border-white/[0.06] px-4 py-3 text-left"
          @click="openCycle(payload.previous)"
        >
          <span>
            <span class="block text-[13px] font-medium text-[#e6e7ea]">{{ payload.previous.name }}</span>
            <span class="mt-0.5 block text-[12px] text-[#8f9198]">{{ formatCycleDateRange(payload.previous) }}</span>
          </span>
          <span class="text-[12px] text-[#8f9198]">
            {{ progressFor(payload.previous, previousTickets).percent }}% · {{ previousTickets.length }}
          </span>
        </button>
        <p v-else class="rounded-lg border border-dashed border-white/[0.08] px-4 py-3 text-[12px] text-[#8f9198]">
          No previous cycle yet.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-[12px] font-medium uppercase tracking-wide text-[#6f727b]">
          Past
        </h2>
        <div v-if="pastCycles.length" class="overflow-hidden rounded-lg border border-white/[0.06]">
          <button
            v-for="cycle in pastCycles"
            :key="cycle.id"
            type="button"
            class="linear-row flex w-full items-center justify-between border-b border-white/[0.06] px-4 py-3 text-left last:border-b-0"
            @click="openCycle(cycle)"
          >
            <span>
              <span class="block text-[13px] font-medium text-[#e6e7ea]">{{ cycle.name }}</span>
              <span class="mt-0.5 block text-[12px] text-[#8f9198]">{{ formatCycleDateRange(cycle) }}</span>
            </span>
            <span class="text-[12px] text-[#8f9198]">
              {{ progressFor(cycle, tickets).percent }}%
            </span>
          </button>
        </div>
        <p v-else class="text-[12px] text-[#8f9198]">
          No earlier cycles.
        </p>
      </section>
    </div>
  </div>
</template>
