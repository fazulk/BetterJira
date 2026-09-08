<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useJiraTickets } from '@/composables/useJiraTickets'
import { useSpaceCycles } from '@/composables/useSpaceCycles'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { ticketBelongsToCycle } from '~/shared/cycles'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

const { enabledSpaces } = useSpaceSettings()
const { tickets } = useJiraTickets()
const teams = computed(() => enabledSpaces.value.filter(space => space.key !== LOCAL_SPACE_KEY))
const selectedTeam = ref('')
watch(teams, (value) => {
  if (!value.some(team => team.key === selectedTeam.value))
    selectedTeam.value = value[0]?.key ?? ''
}, { immediate: true })
const cycles = useSpaceCycles(computed(() => selectedTeam.value || null))
const { payload, isLoading, isMutating, errorMessage } = cycles
const activeSprints = computed(() => payload.value.cycles.filter(cycle => cycle.state === 'active'))
const currentCount = computed(() => {
  const current = payload.value.current
  return current ? tickets.value.filter(ticket => ticket.spaceKey === selectedTeam.value && ticketBelongsToCycle(ticket, current)).length : 0
})
const saveError = ref('')
watch(selectedTeam, () => {
  saveError.value = ''
})
async function save(kind: 'board' | 'sprint', event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement))
    return
  const value = target.value
  saveError.value = ''
  try {
    if (kind === 'board')
      await cycles.setBoard(Number(value))
    else
      await cycles.setCurrentSprint(value || null)
  }
  catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Unable to save cycle settings.'
  }
  finally {
    target.value = kind === 'board' ? String(payload.value.board?.id ?? '') : payload.value.currentSprintId ?? ''
  }
}
</script>

<template>
  <div class="space-y-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
    <p v-if="teams.length === 0" class="text-sm text-slate-400">
      Enable a Jira team to configure cycles.
    </p>
    <template v-else>
      <label class="block space-y-2 text-sm text-slate-200">
        <span>Team</span>
        <select v-model="selectedTeam" :disabled="isMutating" class="block w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 disabled:opacity-50">
          <option v-for="team in teams" :key="team.key" :value="team.key">{{ team.name || team.key }}</option>
        </select>
      </label>
      <p v-if="isLoading" class="text-sm text-slate-400">
        Loading sprints…
      </p>
      <template v-else>
        <label class="block space-y-2 text-sm text-slate-200">
          <span>Jira board</span>
          <select :value="payload.board?.id ?? ''" :disabled="isMutating || !payload.boards.length" class="block w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 disabled:opacity-50" @change="save('board', $event)">
            <option value="" disabled>Select a board</option>
            <option v-if="payload.board && !payload.boards.some(board => board.id === payload.board?.id)" :value="payload.board.id">{{ payload.board.name }}</option>
            <option v-for="board in payload.boards" :key="board.id" :value="board.id">{{ board.name }}</option>
          </select>
        </label>
        <p v-if="!payload.boards.length && !errorMessage" class="text-sm text-slate-400">
          No sprint boards found for this team.
        </p>
        <label class="block space-y-2 text-sm text-slate-200">
          <span>Current sprint</span>
          <select :value="payload.currentSprintId ?? ''" :disabled="isMutating || !payload.board" class="block w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 disabled:opacity-50" @change="save('sprint', $event)">
            <option value="">Automatic from Jira</option>
            <option v-for="sprint in activeSprints" :key="sprint.id" :value="sprint.id">{{ sprint.name }}</option>
          </select>
        </label>
        <p class="text-xs leading-5 text-slate-500">
          Choose which active sprint this team follows in BetterJira. Automatic uses the board’s first active sprint. When a selected sprint closes, selection returns to automatic.
        </p>
        <p class="text-sm text-slate-400" aria-live="polite">
          {{ payload.current ? `${payload.current.name} · ${currentCount} issues` : 'No active sprint on this board.' }}
          <span v-if="isMutating">Saving…</span>
        </p>
      </template>
      <p v-if="saveError || errorMessage" role="alert" class="text-sm text-red-400">
        {{ saveError || errorMessage }}
      </p>
    </template>
  </div>
</template>
